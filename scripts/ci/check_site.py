#!/usr/bin/env python3
"""Offline checks for a static site. No dependencies outside the stdlib.

Catches the things that actually break a hand-built one-pager:

  - HTML that is not valid UTF-8, or declares a charset it does not match
  - local assets (css/img/js/video) referenced but missing from the tree
  - in-page anchors (#id) that point at an id that does not exist
  - duplicate ids, which silently break the second anchor
  - <img> without alt
  - a page over the weight budget

Usage:
    python check_site.py [root] [--max-kb 300]

Exit 1 on error, 0 when only warnings.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

CHARSET_RE = re.compile(r'<meta[^>]+charset\s*=\s*["\']?([\w-]+)', re.I)
BASE_RE = re.compile(r'<base[^>]+href\s*=\s*"([^"]+)"', re.I)
REF_RE = re.compile(r'(?:src|href)\s*=\s*"([^"]+)"')
ID_RE = re.compile(r'\bid\s*=\s*"([^"]+)"')
ANCHOR_RE = re.compile(r'href\s*=\s*"#([^"]+)"')
IMG_RE = re.compile(r"<img\b[^>]*>", re.I)
EXTERNAL = re.compile(r"^(https?:|//|data:|mailto:|tel:|javascript:)")


def read_args(argv: list[str]) -> tuple[Path, int]:
    root = Path(".")
    max_kb = 300
    rest = [a for a in argv[1:]]
    if rest and not rest[0].startswith("--"):
        root = Path(rest.pop(0))
    for index, arg in enumerate(rest):
        if arg == "--max-kb" and index + 1 < len(rest):
            max_kb = int(rest[index + 1])
    return root, max_kb


def main(argv: list[str]) -> int:
    root, max_kb = read_args(argv)
    pages = sorted(root.glob("*.html"))
    if not pages:
        print(f"error: no .html files under {root.resolve()}")
        return 1

    errors: list[str] = []
    warns: list[str] = []

    for page in pages:
        raw = page.read_bytes()
        rel = page.name
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError as exc:
            errors.append(f"{rel}: not valid UTF-8 (byte {exc.start})")
            text = raw.decode("utf-8", "replace")

        declared = CHARSET_RE.search(text)
        if not declared:
            errors.append(f"{rel}: no <meta charset>")
        elif declared.group(1).lower().replace("-", "") != "utf8":
            errors.append(f"{rel}: declares charset {declared.group(1)}, file is UTF-8")

        size_kb = len(raw) / 1024
        if size_kb > max_kb:
            errors.append(f"{rel}: {size_kb:.0f} KB exceeds the {max_kb} KB budget")
        elif size_kb > max_kb * 0.8:
            warns.append(f"{rel}: {size_kb:.0f} KB is close to the {max_kb} KB budget")

        base = BASE_RE.search(text)
        local = [
            ref
            for ref in REF_RE.findall(text)
            if not EXTERNAL.match(ref) and not ref.startswith("#")
        ]
        missing = sorted(
            {ref for ref in local if not (page.parent / ref.split("?")[0].split("#")[0]).exists()}
        )
        note = f" (base href {base.group(1)})" if base else ""
        if missing:
            shown = ", ".join(missing[:3])
            more = f" +{len(missing) - 3} more" if len(missing) > 3 else ""
            errors.append(f"{rel}: {len(missing)} missing local asset(s){note}: {shown}{more}")

        ids = ID_RE.findall(text)
        duplicated = {i for i in ids if ids.count(i) > 1}
        if duplicated:
            warns.append(f"{rel}: duplicate id(s): {', '.join(sorted(duplicated)[:5])}")

        dead = sorted({a for a in ANCHOR_RE.findall(text) if a not in set(ids) and a != ""})
        if dead:
            errors.append(f"{rel}: {len(dead)} dead anchor(s): {', '.join(dead[:5])}")

        no_alt = [tag for tag in IMG_RE.findall(text) if " alt=" not in tag.lower()]
        if no_alt:
            warns.append(f"{rel}: {len(no_alt)} <img> without alt")

        print(f"checked {rel:<24} {size_kb:6.1f} KB  ids={len(ids):<4} refs={len(local)}")

    print()
    for warn in warns:
        print(f"warn  {warn}")
    for error in errors:
        print(f"error {error}")

    if errors:
        print(f"\n{len(errors)} error(s), {len(warns)} warning(s).")
        return 1
    print(f"PASS - {len(pages)} page(s), {len(warns)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
