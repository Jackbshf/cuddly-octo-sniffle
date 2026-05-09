---
name: responsive-layout-system
description: Maintain unified centered layout and responsive behavior for portfolio sections.
---

# Responsive Layout System

## When to use

Use this skill when changing layout, section widths, containers, grids, card density, breakpoints, nav wrapping, mobile/tablet/desktop layout, or alignment.

## Inputs to inspect

- `styles/app.css`
- `app.jsx`
- Current section wrappers and grid classes.
- Playwright screenshots at 390, 768, and 1440 widths.
- Existing CSS variables for portfolio width, gutters, and dark-only theme.

## Required steps

- Use a shared centered portfolio container instead of per-section left offsets or ad hoc viewport widths.
- Keep the primary max width between 1180px and 1240px unless a task explicitly changes the system.
- Use `margin-inline: auto` for centered section containers.
- Use one-column mobile, two-column tablet, and three/four-column desktop grids where content density supports it.
- Prevent section-specific `left`, `margin-left`, or transform hacks from defining the page layout.
- Preserve the project dark-only visual baseline.

## Validation checklist

- Confirm centered layout at 1440, 768, and 390 widths.
- Report any remaining overflow or section width exceptions.
- Confirm card text does not overflow.
- Confirm section title, grid, and contact areas share the same centered container when in scope.

## Failure conditions

- Main content appears left-biased at desktop widths.
- Any checked viewport has horizontal overflow.
- A section uses one-off offsets to compensate for container mismatch.
- Text escapes cards, buttons, nav, or panels.

## What not to do

- Do not solve alignment by adding arbitrary left margins.
- Do not change the project to a light theme.
- Do not run a broad CSS cleanup unrelated to the requested portfolio surface.
