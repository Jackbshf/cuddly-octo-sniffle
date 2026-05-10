---
name: i18n-cn-en-portfolio
description: Manage Chinese-default and English-toggle copy for the Zhang Wei portfolio.
---

# I18n CN EN Portfolio

## When to use

Use this skill when changing portfolio copy, navigation, hero text, identity labels, categories, card copy, case details, contact sections, language toggles, or any translatable public text.

## Inputs to inspect

- `app.jsx`
- `src/portfolio-home-data.js`
- Copy maps, translation objects, locale constants, or language-toggle state.
- Existing Chinese and English UI screenshots.
- Task-provided copy or brand positioning notes.
- URL/localStorage language behavior, especially `?lang=en` and persisted locale state.

## Required steps

- Default language is Chinese.
- English is available through an explicit toggle.
- English identity labels must preserve the positioning: `AIGC Visual Designer`, `AI Video & Commercial Visual`, and `ComfyUI Workflow`.
- Keep Chinese and English navigation, section titles, categories, and detail fields equivalent.
- Do not expose full prompts or complete private parameters; publish methodology and partial node/process notes only.
- Keep copy aligned to the actual visible media and case type.
- Prefer centralized copy maps over scattered JSX hard-coded strings when editing multiple surfaces.
- Short-term locale strategy is `?lang=en` plus localStorage persistence.
- Public Chinese/English copy must come from a unified copy map when a surface is being refactored for i18n.
- `?qa=<hash>` must not change language or content; it is only for validation/cache-busting.

## Validation checklist

- List changed copy surfaces.
- Confirm default language and toggle behavior.
- Note any untranslated or intentionally omitted fields.
- Confirm Chinese and English section/category/detail meanings are equivalent.
- Confirm no private prompt or complete parameter set is exposed.
- Confirm copy does not mislabel video, image, or workflow media.
- Confirm `?lang=en` and localStorage persistence behavior.
- Confirm no newly edited translatable surface gained scattered mixed-language JSX strings.

## Failure conditions

- Chinese and English versions diverge in meaning for key portfolio claims.
- English labels lose the required positioning terms.
- JSX gains large scattered hard-coded bilingual strings where a map already exists or is needed.
- Copy describes a different media type than the card displays.
- `?lang=en` fails to select English or preview/QA query state changes language unexpectedly.

## What not to do

- Do not use literal machine translation without editing for portfolio context.
- Do not expose full prompts, private workflow parameters, tokens, secrets, or client-sensitive details.
- Do not change the default language away from Chinese.
- Do not hard-code mixed Chinese/English public copy directly in JSX for newly internationalized surfaces.
