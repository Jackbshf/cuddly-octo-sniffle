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
- SEO/social metadata, routing query states, accessibility flows, and resource-load monitoring scope when in release QA.

## Required steps

- Validate the real UI surface, not only build success.
- Check 390, 768, and 1440 viewport widths.
- Check `?gallery=1` when gallery world behavior is in scope.
- Capture screenshots or provide exact screenshot paths when validation is requested.
- Report console errors, page errors, horizontal overflow, and key interaction failures.
- Check broken images.
- Check video module presence and at least one video detail/player path when video is in scope.
- Save QA evidence under `output/playwright/` but do not stage it unless explicitly requested.
- Check keyboard Tab flow, focus visible, Esc close, 320px width, 200% text zoom, `prefers-reduced-motion`, and alt text when interaction or final release QA is in scope.
- Check `title`, `description`, Open Graph metadata, favicon, canonical URL, failed resources, 404s, and console/page errors for release QA.
- Check route/query behavior for `/`, `?gallery=1`, `?preview=1`, `?lang=en`, and `?qa=<hash>` when those surfaces are in scope.

## Validation checklist

- Commands or browser workflow used.
- Viewports checked.
- Console/page error counts.
- Screenshot paths or inline screenshots when available.
- Broken image count.
- Horizontal overflow result per viewport.
- Key interaction results for drawers, modals, filters, or video playback when in scope.
- Accessibility and interaction results, including keyboard, focus, Esc, reduced motion, and text zoom where applicable.
- SEO/social metadata and failed-resource results for release QA.
- Route/query-state results and fallback behavior.

## Failure conditions

- Browser QA cannot run and no fallback is documented.
- Any checked viewport has horizontal overflow.
- Console or page errors are ignored.
- Screenshots are missing for a requested visual acceptance task.
- Gallery-world route is in scope but `?gallery=1` is not checked.
- Release QA omits failed resource, metadata, accessibility, or route-state checks.

## What not to do

- Do not claim UI validation from static code inspection alone.
- Do not stage `output/playwright/` artifacts unless the user asks.
- Do not skip deployed verification when the task requires a public URL.
- Do not treat screenshots as sufficient when keyboard, routing, media, or metadata behavior is the risk.
