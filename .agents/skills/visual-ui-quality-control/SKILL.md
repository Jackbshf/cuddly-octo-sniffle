---
name: visual-ui-quality-control
description: Check portfolio UI quality, visual consistency, and content-to-media matching before delivery.
---

# Visual UI Quality Control

## When to use

Use this skill before finalizing homepage, Gallery, case, detail, video, workflow, or immersive portfolio UI changes.

## Inputs to inspect

- Current local and deployed screenshots.
- `app.jsx`
- `styles/app.css`
- Curated media IDs and their covers/posters.
- Browser console and broken image checks from visual QA.
- Content QA results, black-card candidates, SEO/social preview assets, and contact conversion paths when in release QA.

## Required steps

- Check visual hierarchy, spacing, alignment, repeated covers, mismatched captions, and card density.
- Keep UI work-focused and portfolio-oriented, not generic landing-page decoration.
- Avoid one-note color palettes and decorative effects that obscure actual work.
- Prefer real portfolio media over abstract decorative graphics.
- Check for repeated images, repeated subjects, and resource-dump behavior.
- Check that video cards have visible video signals and durations.
- Use or plan `scripts/qa-content.mjs` for content gates before final release.
- Check black-card candidates, missing titles, missing alt text, missing sources/posters, incomplete case fields, and social preview quality when in scope.
- Confirm contact surfaces present real job/recruiting and commercial-collaboration paths.

## Validation checklist

- Summarize visual issues found and fixed.
- Summarize any accepted residual risks.
- Include screenshot or browser QA references when available.
- Confirm Gallery does not contain workflow/moodboard/composite images.
- Confirm covers, titles, tags, and descriptions match.
- Confirm the page does not look like an automated asset dump.
- Confirm content QA script output or explain why it is not implemented yet.
- Confirm social preview image/copy and contact conversion paths for final release QA.

## Failure conditions

- Duplicate or near-duplicate covers appear in primary modules.
- A card title or description conflicts with the visible image subject.
- Video work has no visible video marker.
- Commercial case cards look like generic Gallery cards.
- Section rhythm or alignment makes the page feel unfinished.
- Black-card candidates, fake forms, missing alt/source/poster, or incomplete case fields ship to production.

## What not to do

- Do not judge quality only by build success.
- Do not add decorative gradients, orbs, or generic landing-page chrome to mask weak content.
- Do not accept cramped microcopy as long as it technically fits.
- Do not rely on subjective screenshot review when a content QA script can catch the issue.
