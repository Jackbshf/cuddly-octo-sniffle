---
name: video-pipeline-recovery
description: Recover and validate video visibility, posters, playback state, and fallback messaging.
---

# Video Pipeline Recovery

## When to use

Use this skill when fixing or changing video cards, video case data, Cloudflare Stream mappings, HLS playback, local MP4 fallback, posters, durations, lightboxes, or fullscreen video shells.

## Inputs to inspect

- `app.jsx`
- `data/portfolio.json`
- `data/cloudflare-stream-manifest.json`
- `embedded-data.js`
- `videos/`
- `images/_posters/`
- Build output warnings from `npm.cmd run prepare:static`.
- Browser console, network, and media element state when validating playback.
- Desktop and mobile QA results, including HLS/MP4 source choice and lightbox close behavior.

## Required steps

- Videos must not silently disappear when playback sources are missing or broken.
- Show poster imagery when available.
- Show clear fallback copy such as `视频资源恢复中` when playback is unavailable.
- Prefer existing manifest and local video data before inventing new video records.
- Report Cloudflare Stream, local fallback, poster, and playback-source status separately.
- Keep homepage video works in an independent Video Showcase.
- Require at least three visible homepage video entries unless the task explicitly narrows scope.
- Open video details in a video player surface, not an image drawer.
- Validate desktop and mobile playback behavior; include Chrome/Edge and mobile Safari/Android Chrome coverage when available.
- Closing any VideoLightbox or video detail surface must pause playback.
- Report HLS and MP4 fallback state clearly.

## Validation checklist

- Count visible video cards.
- Count playable videos.
- List videos with fallback state.
- List missing poster or source issues.
- Confirm at least one deployed video can play, or record the exact blocker.
- Confirm video cards do not render non-video works.
- Confirm closing the video shell pauses playback.
- Confirm video failure displays fallback text rather than blank UI.
- Record browser/device coverage and any untested targets.

## Failure conditions

- Video module disappears from the homepage.
- Video data is rendered through an ordinary image card.
- A missing source causes the card to vanish without fallback copy.
- No visible video has poster, duration, or playback/fallback status.
- Video continues playing after its lightbox or detail shell closes.
- Video QA covers only desktop when mobile behavior changed.

## What not to do

- Do not invent video records when existing local video files and manifests can be reconciled.
- Do not treat `prepare:static` Stream fallback warnings as fatal unless the task is specifically about Stream completeness.
- Do not use workflow boards or static image works as fake video cases.
- Do not claim playback works without browser validation.
- Do not hide HLS or MP4 fallback failures behind a static poster.
