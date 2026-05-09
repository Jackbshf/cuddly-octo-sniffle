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

## Required steps

- Check visual hierarchy, spacing, alignment, repeated covers, mismatched captions, and card density.
- Keep UI work-focused and portfolio-oriented, not generic landing-page decoration.
- Avoid one-note color palettes and decorative effects that obscure actual work.
- Prefer real portfolio media over abstract decorative graphics.
- Check for repeated images, repeated subjects, and resource-dump behavior.
- Check that video cards have visible video signals and durations.

## Validation checklist

- Summarize visual issues found and fixed.
- Summarize any accepted residual risks.
- Include screenshot or browser QA references when available.
- Confirm Gallery does not contain workflow/moodboard/composite images.
- Confirm covers, titles, tags, and descriptions match.
- Confirm the page does not look like an automated asset dump.

## Failure conditions

- Duplicate or near-duplicate covers appear in primary modules.
- A card title or description conflicts with the visible image subject.
- Video work has no visible video marker.
- Commercial case cards look like generic Gallery cards.
- Section rhythm or alignment makes the page feel unfinished.

## What not to do

- Do not judge quality only by build success.
- Do not add decorative gradients, orbs, or generic landing-page chrome to mask weak content.
- Do not accept cramped microcopy as long as it technically fits.
