---
name: portfolio-content-curation
description: Curate Zhang Wei portfolio homepage content and case selection before visual or deployment changes.
---

# Portfolio Content Curation

## When to use

Use this skill for homepage content selection, commercial case selection, gallery ordering, duplicate removal, image/text matching, and any task that changes which works appear on a public portfolio surface.

## Inputs to inspect

- `AGENTS.md`
- `app.jsx`
- `data/portfolio.json`
- `data/cases/*.json`
- `data/gallery-worlds.json`
- `data/gallery-image-library.json`
- `src/portfolio-home-data.js`
- Current screenshots or Playwright captures when the task is visual.
- Content fields for `status`, `rightsStatus`, language copy, contact paths, and content version IDs when present.

## Required steps

- Keep homepage selections manual and intentional; do not ship `slice(0, n)` style curation for production portfolio sections.
- Separate commercial cases, video works, visual works, and workflow evidence before editing UI.
- Prefer a small set of strong, clean works over broad automatic coverage.
- Check each selected item for title, category, media type, cover, detail copy, and intended proof value.
- Ensure homepage curation uses explicit IDs or source entries, not raw array order.
- Block duplicate covers across Hero, commercial cases, capability cards, and the first visible Gallery group.
- Hide low-quality, mismatched, repeated, or ambiguous material from the homepage without deleting source files.
- Homepage items must be `status: ready` and `rightsStatus: original` or `licensed`.
- Keep `draft`, `hidden`, `needs-copy`, `needs-cover`, `archive`, `needs-review`, and `do-not-publish` out of production homepage curation.
- Run `npm.cmd run qa:portfolio` before production release or release-candidate reporting; use the content report to catch invalid status, rights, duplicate covers, missing titles, missing alt text, missing bilingual copy, and incomplete commercial case fields.
- Verify contact surfaces support job/recruiting and commercial-collaboration paths, with email fallback if no working form backend exists.

## Validation checklist

- List selected IDs or sources.
- List excluded IDs or sources and the reason.
- Identify any unresolved content gaps before deployment.
- Confirm no homepage section uses first-N automatic selection.
- Confirm image subject, title, description, and tags match.
- Confirm commercial cases read like real cases, not generic asset cards.
- Confirm selected items include valid `status` and `rightsStatus`.
- Confirm `output/qa/qa-content.json` and `output/qa/qa-content.md` exist after release-candidate QA, or record why the toolkit could not run.
- Confirm any form-like contact UI has a working endpoint or visible email fallback.
- Record content version ID or the blocker when preparing release notes.

## Failure conditions

- Homepage selection depends on `slice(0, n)`, array index order, or broad tag fallback.
- A repeated cover appears in primary homepage modules without an explicit approved reason.
- A product image is labeled as portrait/digital human, or a landscape image is labeled as AI portrait.
- Static image work is presented as a playable video case.
- Homepage includes non-ready, unreviewed, or do-not-publish content.
- Contact UI pretends to submit without a backend or fallback.

## What not to do

- Do not invent portfolio works or claim delivery context that is not supported by local data.
- Do not delete media files to curate the homepage; remove them from public selections instead.
- Do not fill the Gallery with weak or dirty material just to reach a numeric count.
- Do not write generic AIGC copy that could apply to any card.
- Do not claim resume download, business inquiry, or form submission exists unless the actual route or fallback works.
