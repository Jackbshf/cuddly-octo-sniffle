# ZhangWei Portfolio Project Rules

Codex must treat missing required tools as blockers, not warnings. Project rules here override global defaults for this repository unless the action is destructive, security-sensitive, or production-impacting.

## Product Baseline

- The public portfolio is `dark-only`; do not add light mode or a theme switch unless the user explicitly asks.
- Keep the visual direction minimal, content-first, and portfolio-oriented.
- Do not add default 3D tilt, floating lift, glass highlight, or gimmick card motion unless it is part of the approved immersive gallery layer.
- Structured case sections, case-detail sections, and consultation/contact expansion are not restored to the public runtime unless the user explicitly asks.
- `old-offline-backup/` is historical reference only and must not be used as a runtime source.
- `output/` is QA/cache evidence only and must not be staged or shipped.

## Required Preflight

Before portfolio repair, redesign, QA, or deployment work, report:

- Current branch, commit, remote, and dirty state.
- Available and missing repo skills.
- Available and missing CLI tools: `rg`, `git`, `node`, `npm.cmd`, `npx.cmd`, `wrangler`.
- Available browser automation: Playwright or Browser MCP.
- Build, static, deploy, and workflow entrypoints from `package.json`, `wrangler.jsonc`, and `.github/workflows/`.
- Any missing item, fallback used, or user action required.

## Required Repo Skills

These skills must exist under `.agents/skills/<skill-name>/SKILL.md` before portfolio implementation:

- `rollback-release-management`
- `portfolio-content-curation`
- `media-classification-guardrails`
- `video-pipeline-recovery`
- `progressive-interaction-ux`
- `responsive-layout-system`
- `visual-ui-quality-control`
- `playwright-visual-qa`
- `cloudflare-worker-deploy`
- `i18n-cn-en-portfolio`

If a required project skill is missing, create the project-scoped skill file before implementation and report whether Codex must be restarted to load it.

## Media And Content Rules

- Homepage content must be manually curated by ID or explicit source, not selected with `slice(0, n)` or raw array order.
- Keep media classes separate:
  - Video work belongs in Video Showcase, video lightboxes, or video rooms.
  - Visual image work belongs in normal Gallery or image detail drawers.
  - Workflow evidence belongs only in workflow/process areas when explicitly allowed.
- Workflow screenshots, moodboards, stitched boards, black cards, unclear composites, and unknown media are homepage-ineligible.
- Video works must not disappear when Cloudflare Stream mappings are missing; use poster and local fallback when available.
- Gallery must not include workflow, moodboard, composite, black-card, or unknown items.
- Do not delete source media just to curate the homepage; remove it from public selections unless the user explicitly asks for cleanup.

## Runtime Guardrails

Before shipping portfolio changes, check:

1. Theme remains `dark-only`.
2. Closed runtime sections are not accidentally restored.
3. Hover/video preview behavior still works when in scope.
4. Project 4 and other media frames show valid image or video content.
5. Slides 12 and 13 scrolling/rendering remain stable with no intermittent blank state.
6. Public homepage uses centered containers and has no horizontal overflow.

## Validation And Deployment

For code changes, run the relevant local checks:

- `npm.cmd run validate:prompts`
- `npm.cmd run build:app`
- `npm.cmd run prepare:static`
- Playwright QA at `390x844`, `768x1024`, and `1440x1000` for frontend changes.

Deployment is required before marking a portfolio code task complete:

- Large refactors go to a Preview Worker first.
- Production deploys are allowed only for approved stop-loss fixes or after preview acceptance.
- Preserve the existing GitHub Actions to Cloudflare Worker release path unless the user explicitly asks to change deployment architecture.
- Do not modify secrets, account IDs, OAuth state, or user-level Cloudflare/GitHub config without explicit approval.

## Completion Report

No accessible URL means the task is not complete. If no public URL is available, do not write "complete" or "done"; write "local complete, not deployed" and explain the deployment blocker and the next step to obtain a public URL.

A valid completion report must include:

- Summary of changes.
- Important files changed.
- Validation commands and results.
- Deploy command or workflow result.
- Change type: preview, production, or local only.
- Accessible URL.
- QA URL, including a cache-busting marker such as `?qa=<commit>-<timestamp>`.
- Commit hash.
- Deployment platform.
- Deploy ID, GitHub Actions run ID, or Worker Version ID.
- Screenshot paths.
- Whether production is affected.
- Browser/Playwright verification result or exact blocker.
- Rollback method with branch, commit, and deploy/run ID when available.

For preview deployments, provide the Preview URL, a QA URL, and explicitly state that production was not affected.

For production deployments, provide the `https://www.zhangweivisual.cn/` QA URL, the Worker Version ID, and the rollback method.

Do not mark the task complete when required tooling, deployment credentials, or online verification are missing; report the blocker and the best local evidence instead.
