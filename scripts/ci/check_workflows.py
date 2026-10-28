#!/usr/bin/env python3
"""Local guard for .github/workflows - runs offline, no third-party action needed.

Policy enforced:
  1. every workflow parses and declares an `on:` trigger and >=1 job
  2. every job declares `permissions` (either on the job or the workflow),
     because the default token is write-all in many repos
  3. every third-party `uses:` is pinned to a full 40-char commit SHA
  4. `pull_request_target` is rejected outright
  5. dependabot.yml must watch `github-actions`, otherwise pins rot

Warns (does not fail) on expression injection smells inside `run:`.

Usage:
    python scripts/check_workflows.py [repo-root]

Exit code 0 = clean, 1 = policy violation.
"""

from __future__ import annotations

import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError:  # pragma: no cover
    sys.exit("PyYAML is required: python -m pip install pyyaml")

SHA_RE = re.compile(r"^[0-9a-f]{40}$")
USES_RE = re.compile(
    r"^(?P<slug>[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+)(?P<subpath>/[^@\s]*)?@(?P<ref>\S+)$"
)
INJECTION_RE = re.compile(r"\$\{\{\s*(github\.event|github\.head_ref|inputs\.)")


def fail(problems: list[str], where: str, message: str) -> None:
    problems.append(f"{where}: {message}")


def check_workflow(path: Path, problems: list[str], notes: list[str]) -> int:
    """Return the number of steps inspected."""
    name = path.name
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        fail(problems, name, f"YAML parse error: {exc}")
        return 0

    if not isinstance(doc, dict):
        fail(problems, name, "workflow root must be a mapping")
        return 0

    # PyYAML follows YAML 1.1, where the bare key `on` becomes boolean True.
    trigger = doc.get("on", doc.get(True))
    if trigger is None:
        fail(problems, name, "missing `on:` trigger")
    elif "pull_request_target" in str(trigger):
        fail(problems, name, "`pull_request_target` is not allowed (untrusted code + secrets)")

    jobs = doc.get("jobs")
    if not isinstance(jobs, dict) or not jobs:
        fail(problems, name, "no `jobs:` defined")
        return 0

    top_permissions = doc.get("permissions")
    steps_seen = 0

    for job_name, job in jobs.items():
        where = f"{name}:{job_name}"
        if not isinstance(job, dict):
            fail(problems, where, "job must be a mapping")
            continue

        # A job is either a reusable-workflow call (uses:) or a normal job.
        if "uses" in job:
            if not str(job["uses"]).startswith("."):
                ref = str(job["uses"]).rsplit("@", 1)
                if len(ref) != 2 or not SHA_RE.match(ref[1]):
                    fail(problems, where, f"reusable workflow `{job['uses']}` is not SHA-pinned")
            continue

        if "runs-on" not in job:
            fail(problems, where, "missing `runs-on`")

        if top_permissions is None and "permissions" not in job:
            fail(problems, where, "no `permissions:` block (workflow or job level)")

        for index, step in enumerate(job.get("steps") or [], start=1):
            if not isinstance(step, dict):
                continue
            steps_seen += 1
            uses = step.get("uses")
            if uses:
                uses = str(uses)
                if uses.startswith("./") or uses.startswith("docker://"):
                    continue
                match = USES_RE.match(uses)
                if not match:
                    fail(problems, where, f"step {index}: unparseable `uses: {uses}`")
                    continue
                ref = match.group("ref")
                if not SHA_RE.match(ref):
                    fail(
                        problems,
                        where,
                        f"step {index}: `{uses}` is not pinned to a 40-char commit SHA",
                    )
                if ref in {"main", "master"}:
                    fail(problems, where, f"step {index}: `{uses}` tracks a mutable branch")

            script = step.get("run")
            if script and INJECTION_RE.search(str(script)):
                notes.append(
                    f"{where}: step {index}: `run:` interpolates untrusted context; "
                    "pass it through `env:` instead"
                )

    return steps_seen


def check_dependabot(root: Path, problems: list[str]) -> None:
    path = root / ".github" / "dependabot.yml"
    if not path.exists():
        fail(problems, "dependabot.yml", "missing; pinned SHAs will rot")
        return
    try:
        doc = yaml.safe_load(path.read_text(encoding="utf-8"))
    except yaml.YAMLError as exc:
        fail(problems, "dependabot.yml", f"YAML parse error: {exc}")
        return
    ecosystems = {
        update.get("package-ecosystem")
        for update in (doc or {}).get("updates", [])
        if isinstance(update, dict)
    }
    if "github-actions" not in ecosystems:
        fail(problems, "dependabot.yml", "does not watch `github-actions`")


def main(argv: list[str]) -> int:
    root = Path(argv[1]) if len(argv) > 1 else Path(".")
    workflows = root / ".github" / "workflows"
    if not workflows.is_dir():
        print(f"error: no workflow directory at {workflows}")
        return 1

    files = sorted(p for p in workflows.iterdir() if p.suffix in {".yml", ".yaml"})
    if not files:
        print(f"error: no workflow files in {workflows}")
        return 1

    problems: list[str] = []
    notes: list[str] = []
    total_steps = 0

    for path in files:
        steps = check_workflow(path, problems, notes)
        total_steps += steps
        status = "ok  " if not any(p.startswith(f"{path.name}:") for p in problems) else "FAIL"
        print(f"{status} {path.name:<28} {steps:>2} step(s)")

    check_dependabot(root, problems)

    print()
    for note in notes:
        print(f"warn  {note}")
    for problem in problems:
        print(f"error {problem}")

    if problems:
        print(f"\n{len(problems)} problem(s), {len(notes)} warning(s).")
        return 1

    print(f"PASS - {len(files)} workflow(s), {total_steps} step(s), {len(notes)} warning(s).")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv))
