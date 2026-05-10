---
name: playwright-visual-qa
description: Run browser-based visual QA for local and deployed Zhang Wei portfolio surfaces.
---

# Playwright Visual QA

## When to use

Use this skill for browser validation after frontend portfolio changes, deployment verification, visual regressions, responsive layout checks, gallery-world checks, video modal checks, or final acceptance evidence.

## Inputs to inspect

- `package.json`
- Existing Playwright scripts or ad-hoc QA scripts.
- Local dev/static server URL.
- Deployed URL.
- `output/playwright/` for generated screenshots and QA JSON.
- Browser runtime availability.

## Required steps

- Validate the real UI surface, not only build success.
- Check 390, 768, and 1440 viewport widths.
- Check `?gallery=1` when gallery world behavior is in scope.
- Capture screenshots or provide exact screenshot paths when validation is requested.
- Report console errors, page errors, horizontal overflow, and key interaction failures.
- Check broken images.
- Check video module presence and at least one video detail/player path when video is in scope.
- Save QA evidence under `output/playwright/` but do not stage it unless explicitly requested.

## Validation checklist

- Commands or browser workflow used.
- Viewports checked.
- Console/page error counts.
- Screenshot paths or inline screenshots when available.
- Broken image count.
- Horizontal overflow result per viewport.
- Key interaction results for drawers, modals, filters, or video playback when in scope.

## Failure conditions

- Browser QA cannot run and no fallback is documented.
- Any checked viewport has horizontal overflow.
- Console or page errors are ignored.
- Screenshots are missing for a requested visual acceptance task.
- Gallery-world route is in scope but `?gallery=1` is not checked.

## What not to do

- Do not claim UI validation from static code inspection alone.
- Do not stage `output/playwright/` artifacts unless the user asks.
- Do not skip deployed verification when the task requires a public URL.
