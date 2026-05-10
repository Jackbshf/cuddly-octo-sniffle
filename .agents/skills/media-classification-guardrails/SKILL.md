---
name: media-classification-guardrails
description: Enforce media type boundaries for video, visual image, and workflow evidence in the Zhang Wei portfolio.
---

# Media Classification Guardrails

## When to use

Use this skill before changing gallery, video, commercial case, workflow, Hero, immersive gallery, or media-detail rendering.

## Inputs to inspect

- `app.jsx`
- `data/portfolio.json`
- `data/cases/*.json`
- `data/gallery-worlds.json`
- `data/gallery-image-library.json`
- `data/cloudflare-stream-manifest.json`
- `images/`, `videos/`, and generated poster paths referenced by data.
- Existing classification helpers such as `classifyHomepageWork()` or validation guards.
- Media asset fields for `cover`, `source`, `original`, `poster`, `status`, and `rightsStatus` when present.

## Required steps

- Video work belongs in video modules, video case modules, video lightboxes, or immersive video rooms.
- Visual work belongs in image galleries, visual cases, image detail drawers, or immersive visual walls.
- Workflow evidence belongs in Workflow Lab, process sections, workflow detail panels, or immersive workflow rooms.
- Workflow screenshots, moodboards, stitched boards, and process images must not appear in the hero, normal Gallery, video posters, or commercial case covers.
- If media type is ambiguous, classify it conservatively and report the uncertainty.
- Classify every media item as `video`, `image`, `workflow`, `moodboard`, `case-board`, or `unknown`.
- Treat `unknown` as homepage-ineligible until manually reviewed.
- Keep videos out of ordinary image cards and keep workflow evidence out of commercial case covers.
- Distinguish card `cover`, detail `source`, and archival/download `original`; do not render oversized originals in card grids.
- Enforce `status` and `rightsStatus` eligibility before homepage or production rendering.
- Keep naming roles clear: covers, posters, source media, originals, and workflow evidence must not share ambiguous filenames.
- Run `npm.cmd run qa:portfolio` before production release or release-candidate reporting; use the media and reference reports to catch workflow leakage, missing assets, duplicate media, extreme aspect ratios, and unused/delete-candidate review lists.

## Validation checklist

- Report any filtered or blocked media.
- Report duplicate IDs or duplicate covers.
- Report video entries without posters or playback sources.
- Confirm Gallery contains only single visual images.
- Confirm Workflow Evidence contains workflow, moodboard, board, or process material only.
- Confirm Video Showcase contains video data only.
- Confirm homepage items are `status: ready` and `rightsStatus: original` or `licensed`, except intentional `missing-video` fallback entries.
- Confirm cards use optimized covers/posters instead of originals.
- Confirm `output/qa/qa-media-assets.json` and `output/qa/check-media-references.json` exist after release-candidate QA, or record why the toolkit could not run.

## Failure conditions

- Workflow, moodboard, stitched board, ComfyUI node, or process image appears in normal Gallery, Hero, or commercial case cover.
- Video item silently disappears because stream data is missing.
- The same cover is reused across primary homepage modules without explicit approval.
- `unknown` media is rendered on the homepage.
- `needs-review`, `do-not-publish`, `draft`, `hidden`, `needs-copy`, `needs-cover`, or `archive` appears in homepage production output.
- A workflow/source/original asset is used as an ordinary card cover without an explicit optimized cover.

## What not to do

- Do not use image dimensions alone as final truth when filenames, titles, or tags indicate workflow/process material.
- Do not use a workflow board as a poster for a video card.
- Do not coerce media into the nearest card component for layout convenience.
- Do not hide classification uncertainty; report it.
- Do not publish third-party IP, logos, celebrity/private faces, or client-sensitive material unless rights are marked `original` or `licensed`.
