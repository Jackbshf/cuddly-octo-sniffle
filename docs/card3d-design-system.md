# Card 3D Design Tokens

## Scope

This document defines the shared visual system for the portfolio's core interactive surfaces:

- `Card3D`
- `MediaCard3D`
- `ActionCard3D`
- `NavPill`

The intent is code-first consistency. These values can be copied into Figma variables and component properties without reinterpreting the motion or material rules.

## Theme Tokens

### Dark

- `page.bg`: `#05070b`
- `surface.primary`: `rgba(11, 16, 24, 0.82)`
- `surface.secondary`: `rgba(15, 21, 31, 0.68)`
- `surface.elevated`: `rgba(20, 28, 40, 0.88)`
- `border.soft`: `rgba(183, 230, 255, 0.11)`
- `border.strong`: `rgba(185, 236, 255, 0.22)`
- `text.primary`: `rgba(245, 250, 255, 0.96)`
- `text.secondary`: `rgba(209, 224, 240, 0.70)`
- `text.tertiary`: `rgba(158, 178, 196, 0.48)`
- `accent.base`: `#7fe6ff`
- `accent.strong`: `#2fc6ff`
- `accent.soft`: `rgba(93, 228, 255, 0.14)`

### Light

- `page.bg`: `#edf4fb`
- `surface.primary`: `rgba(255, 255, 255, 0.86)`
- `surface.secondary`: `rgba(255, 255, 255, 0.72)`
- `surface.elevated`: `rgba(251, 253, 255, 0.96)`
- `border.soft`: `rgba(48, 77, 108, 0.12)`
- `border.strong`: `rgba(52, 84, 116, 0.20)`
- `text.primary`: `rgba(23, 31, 43, 0.96)`
- `text.secondary`: `rgba(57, 73, 92, 0.74)`
- `text.tertiary`: `rgba(82, 95, 111, 0.52)`
- `accent.base`: `#0ea5e9`
- `accent.strong`: `#0284c7`
- `accent.soft`: `rgba(14, 165, 233, 0.12)`

## Shape

- `radius.card`: `18px`
- `radius.section`: `30px`
- `radius.pill`: `999px`
- `border.width`: `1px`

## Depth

- `perspective`: `1600px`
- `hover.rotateX.max`: `5deg`
- `hover.rotateY.max`: `5deg`
- `hover.translateY`: `-12px`
- `press.scale`: `0.992`
- `press.translateY`: `-4px`

## Shadows

- `shadow.soft`: `0 18px 48px rgba(0, 0, 0, 0.32)`
- `shadow.floating`: `0 24px 80px rgba(0, 0, 0, 0.44), 0 8px 24px rgba(7, 12, 18, 0.24)`
- `shadow.hover`: `0 34px 90px rgba(0, 0, 0, 0.44), 0 12px 30px rgba(8, 14, 22, 0.22)`

## Material Layers

- `card.outline`: gradient outline mask with a bright top-left bias
- `card.sheen`: radial pointer-following highlight
- `card.matte`: low-contrast base fill with subtle tonal compression

In Figma, model this as:

1. Base fill
2. Matte overlay
3. Highlight overlay
4. Outline stroke
5. Shadow stack

## Motion

- `reveal.duration`: `560ms`
- `reveal.easing`: `cubic-bezier(0.18, 0.88, 0.2, 1)`
- `card.hover.duration`: `260ms`
- `card.hover.easing`: `cubic-bezier(0.2, 0.8, 0.2, 1)`

## Component Rules

### Card3D

- Use for major interactive surfaces only.
- Desktop: enable pointer tilt and hover lift.
- Mobile/coarse pointer: disable live tilt, keep static depth.
- Reduced motion: disable tilt and reveal transitions.

### MediaCard3D

- Default to poster-first rendering.
- Keep chrome off the media unless it is actionable.
- Hover preview is allowed for direct videos only.
- External videos use cover-click-to-lightbox.

### ActionCard3D

- Use for consultation or workflow CTA modules.
- One primary action, one secondary action max.
- Preserve readable contrast over all theme variants.

### NavPill

- Keep dense and utility-focused.
- Avoid stacked shadows; use surface + border only.
- Hover should signal affordance without becoming visually louder than the content.

## Figma Mapping

- Create color variables from the theme tokens above.
- Create number variables for radius, depth, and motion values.
- Expose component properties:
  - `theme`: dark | light
  - `interactive`: true | false
  - `mediaKind`: image | directVideo | externalVideo
  - `state`: default | hover | active | disabled

## Performance Rules

- Do not use bitmap reflections to fake detail.
- Use gradients and shadow layers instead of oversized textures.
- On mobile, prefer static depth over live pointer transforms.
- Keep motion to `transform` and `opacity` only.
