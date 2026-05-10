---
name: progressive-interaction-ux
description: Design and validate progressive interaction layers for the Zhang Wei portfolio.
---

# Progressive Interaction UX

## When to use

Use this skill when changing detail surfaces, hover/focus states, video playback shells, immersive gallery entry points, 3D rooms, mobile interaction defaults, or motion behavior.

## Inputs to inspect

- `app.jsx`
- `styles/app.css`
- `src/components/Layered3DCard.jsx`
- Existing lightbox, drawer, modal, gallery, or 3D entry code.
- Current desktop and mobile screenshots.
- Reduced-motion and performance-related CSS/JS paths.

## Required steps

- Preserve a clear baseline: readable content, clean images, visible video states, and working navigation.
- Treat immersive 3D gallery, museum, corridor, or room experiences as progressive enhancement.
- Keep the homepage conversion-oriented for job and commercial inquiry use.
- Mobile defaults to the ordinary portfolio experience and offers immersive mode as an explicit choice.
- Respect `prefers-reduced-motion` and low-performance contexts by disabling heavy motion and particles.
- Do not hide essential content behind hover-only interactions.

## Validation checklist

- State the baseline path.
- State the enhanced path.
- State the mobile and reduced-motion behavior.
- Confirm keyboard and click/tap access to essential interactions.
- Confirm immersive entry does not replace the ordinary portfolio route.

## Failure conditions

- Essential content is reachable only through hover, heavy animation, or 3D mode.
- Mobile defaults to a fragile immersive experience instead of stable portfolio browsing.
- Reduced-motion users still receive large motion, particles, or auto camera movement.
- Detail interactions make videos look like static images or workflow evidence look like finished works.

## What not to do

- Do not add motion or 3D effects before baseline content quality is fixed.
- Do not build decorative interactions that make the site feel like a resource dump.
- Do not sacrifice readability for cinematic effects.
