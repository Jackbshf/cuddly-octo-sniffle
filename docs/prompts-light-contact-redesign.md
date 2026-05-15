# Prompts Light Contact Redesign

## Concept

Generated concept reference:

`C:\Users\24531\.codex\generated_images\019e2b1b-76ad-7bf0-b6c8-f3e14c1ebf27\ig_0ad886ffbe5c75b0016a06f5efb1c881918d6e54ed9185930e.png`

The direction is a light, product-workbench UI rather than a dark technology theme. The page should feel like a mature search and operations tool: white canvas, clear hierarchy, restrained borders, blue primary actions, coral contact CTAs, and mint success states.

## Design System

- Background: white to very light blue, no dark-grid treatment.
- Surfaces: white panels with `1px` blue-gray borders and soft shadows.
- Radius: `8px` default for cards, controls, dialogs, and media frames.
- Primary action: blue gradient for search and save.
- Contact action: coral gradient for "联系获取" actions.
- Semantic states: green success, blue focus, orange pack labels.
- Typography: system UI stack, strong title weight, compact dashboard labels, no negative letter spacing.
- Motion: hover lift, press compression, focus ring, toast slide, reduced-motion fallback.

## Information Architecture

- `/prompts/`: search-first prompt workbench.
- `/prompts/?tool=video`: video generation workbench, restyled into the same light system.
- `/prompts/admin/`: prompt editor plus contact settings.
- Prompt packs: browse by pack, then contact to request access.
- Locked prompts: show summary and contact CTA instead of checkout.

## Data Architecture

Contact settings live in `prompts-data/library.json`:

- `contact.title`
- `contact.description`
- `contact.ctaLabel`
- `contact.wechat`
- `contact.email`
- `contact.phone`
- `contact.qrImageUrl`
- `contact.consultationText`

The Worker normalizes this object during admin publish. Public reads include the contact object while locked prompt bodies remain redacted.

## Interaction Architecture

- Search input updates results immediately and supports Enter.
- Pack cards expose `查看内容` and `联系获取`.
- Locked prompt detail opens a contact CTA instead of payment.
- Contact dialog supports copyable contact information and QR preview.
- Admin settings dialog edits contact fields and saves to local draft before GitHub publish.
- All controls have hover, active, focus-visible, and disabled states.
- `prefers-reduced-motion` disables transform-based motion.

## Deployment Plan

1. Validate prompt data and generated search index.
2. Build React app bundle.
3. Prepare static assets.
4. Run Playwright QA at `1440x1000`, `768x1024`, and `390x844`.
5. Deploy to preview Worker first.
6. Production deploy only after preview acceptance.
