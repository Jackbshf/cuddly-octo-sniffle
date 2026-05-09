# ZhangWei-Portfolio 基线约束

Codex must treat missing tools as a blocker, not as a warning.

## 产品基线

- 作品集默认 `dark-only`，保持暗色运行时，不主动引入亮色主题。
- 不新增主题切换，除非用户明确要求并确认会改变当前产品基线。
- 视觉方向以 Apple / Google 式极简、内容优先为准。
- 不默认加入 `3D tilt`、悬浮 `lift`、玻璃高光、炫技式卡片动效。

## 当前运行时约束

- `结构化案例区` 默认不在前端运行时挂载。
- `案例详情区` 默认不在前端运行时挂载。
- `合作咨询区` 默认不在前端运行时挂载。
- 如需恢复以上区域，必须得到用户显式确认，不得自行补回。

## 改版前自检

每次改版前，先做这 5 项基线比对：

1. 主题是否仍为 `dark-only`
2. 案例区 / 案例详情 / 咨询区是否仍保持关闭，不会误挂载回前端
3. hover 视频预览是否仍可工作
4. 项目 4 及其他媒体框是否都能正常显示图片或视频
5. 第 12 / 13 页滚动渲染是否稳定，没有偶发空白

## 部署完成标准

Deployment is mandatory.

本作品集项目中，任何代码修改、布局修复、内容更新或重构，只有完成公开可访问环境部署后才算完成。本地验证不能替代交付。

有效完成报告必须包含：

1. build 命令与结果
2. deploy 命令与结果
3. deployed URL
4. 环境类型：preview / staging / production
5. 线上截图或 Playwright 验证结果
6. 回滚方式

如果缺少部署凭据、平台配置或线上验证条件，必须明确报告缺失项，不得把任务标记为完成。

## Missing Skills / Plugins / MCP Installation Policy

For this project, Codex must not silently continue when a required skill, plugin, MCP server, CLI tool, browser automation tool, or deployment tool is missing.

Before any portfolio task, Codex must run a tool preflight:

1. Check available skills:
   - Run `/skills` when available.
   - Inspect `.agents/skills/`.
   - Inspect user-level skills if accessible.

2. Check available plugins:
   - Run `/plugins` when available.
   - Report installed plugins and missing required plugins.

3. Check available MCP servers:
   - Run `/mcp` when available.
   - Inspect `.codex/config.toml` and `~/.codex/config.toml` if accessible.
   - Do not modify user-level global config without explicit approval.

4. Check required CLI tools:
   - `node`
   - `npm.cmd`
   - `git`
   - `rg`
   - `wrangler`
   - `npx playwright`
   - browser runtime for Playwright

5. Check project scripts:
   - `npm.cmd run build:app`
   - `npm.cmd run prepare:static`
   - existing deploy / preview scripts
   - Cloudflare / Wrangler config

### Required Portfolio Repo Skills

This project requires the following repo skills before portfolio repair, redesign, validation, or deployment work:

- `portfolio-content-curation`
- `media-classification-guardrails`
- `progressive-interaction-ux`
- `video-pipeline-recovery`
- `responsive-layout-system`
- `visual-ui-quality-control`
- `playwright-visual-qa`
- `cloudflare-worker-deploy`
- `i18n-cn-en-portfolio`
- `rollback-release-management`

If these repo skills do not exist, Codex must create `.agents/skills/<skill-name>/SKILL.md` before continuing into implementation.

### If a required skill is missing

Codex must:

1. Search the web for the official installation method.
2. Prefer official OpenAI / vendor documentation.
3. If the skill exists in the OpenAI skills catalog, use `$skill-installer` when available.
4. If the skill is project-specific, create it under `.agents/skills/<skill-name>/SKILL.md`.
5. After installing or creating skills, report whether Codex must be restarted to load them.
6. Do not pretend the skill is active until it appears in `/skills` or the project skill file exists.

### If a required plugin is missing

Codex must:

1. Search the web for the official plugin installation method.
2. Report:
   - plugin name
   - why it is needed
   - official install method
   - whether it requires user login, OAuth, browser extension, or API key
3. Install it only when installation is available from the current Codex environment.
4. If user authorization is required, stop and tell the user exactly what to install or authorize.
5. Provide fallback using local CLI tools when possible.

### If a required MCP server is missing

Codex must:

1. Search the web for the official MCP server setup.
2. Prefer project-scoped `.codex/config.toml` over global config when possible.
3. Never hard-code secrets, API keys, tokens, or account credentials.
4. If the MCP requires OAuth or account login, ask the user to authorize it.
5. If MCP cannot be installed, use local CLI fallback and clearly report the limitation.

### If a required CLI tool is missing

Codex must:

1. Search official installation docs.
2. Prefer project-local installation where possible.
3. For npm packages, inspect `package.json` first.
4. Install dev tools as dev dependencies when appropriate.
5. Commit lockfile changes only when they are part of the task.
6. Do not globally install tools unless explicitly approved.
7. If installation requires admin permission, stop and give the user exact install steps.

### Required behavior

Codex must output a preflight report before editing:

- Available skills
- Missing skills
- Available plugins
- Missing plugins
- Available MCP servers
- Missing MCP servers
- Available CLI tools
- Missing CLI tools
- Which items Codex installed automatically
- Which items require user action
- Fallback plan

No task can be marked complete if a required tool is missing and no fallback was used.

## Codex Required Skills / Plugins / Tools

This project is not a normal static portfolio. It is a progressive interactive AIGC portfolio with strict media classification, content curation, video playback, immersive gallery mode, bilingual copy, and deployment requirements.

Codex must not treat portfolio tasks as simple React or CSS fixes. For every portfolio task, Codex must first decide which repo skills and tools are required, then inspect the relevant files before editing.

### Required Codex Repo Skills

Repo-level skills live under `.agents/skills/<skill-name>/SKILL.md`. The required skill set is:

1. `rollback-release-management`
   - Use before deployment, production push, release reporting, or large refactor.
   - Must record branch, dirty state, commit hash, deploy target, deploy ID/run ID, and rollback path.

2. `portfolio-content-curation`
   - Use for homepage content selection, duplicate removal, image/text matching, commercial case structure, and hiding low-quality or mismatched works.
   - Homepage content must be manually curated by ID or source. Do not use `slice(0, n)` style automatic selection for production portfolio sections.

3. `media-classification-guardrails`
   - Use for classifying each media item as `video`, `image`, `workflow`, `moodboard`, `case-board`, or `unknown`.
   - Video goes to video modules, visual images go to visual galleries, and workflow/moodboard/composite images are not allowed in normal public portfolio displays unless the user explicitly asks for a process section.

4. `video-pipeline-recovery`
   - Use whenever video cards, video sources, Cloudflare Stream mappings, HLS playback, fallback video paths, posters, durations, or video lightboxes are touched.
   - Video works must not silently disappear when Stream mapping is missing.

5. `progressive-interaction-ux`
   - Use for progressive portfolio experience design, detail surfaces, immersive 3D gallery entry points, mobile defaults, and reduced-motion behavior.
   - Immersive 3D gallery is progressive enhancement, not the only experience.

6. `responsive-layout-system`
   - Use for layout, section containers, grids, card density, breakpoints, and left/right alignment.
   - All homepage sections must use a unified centered container.

7. `visual-ui-quality-control`
   - Use for detecting repeated images, mismatched covers, cramped cards, over-small text, left-biased layout, inconsistent card systems, and gallery/resource-dump behavior.

8. `playwright-visual-qa`
   - Use for local and deployed browser validation.
   - Must check 390x844, 768x1024, and 1440x1000 when validating responsive homepage changes.

9. `cloudflare-worker-deploy`
   - Use for preview/production deployment and rollback reporting.
   - Every code change must be deployed to a public preview or production URL before it is considered complete.

10. `i18n-cn-en-portfolio`
   - Use when editing copy, navigation, hero, cards, cases, details, and contact sections.
   - Default language is Chinese, with an explicit English toggle when the surface supports it.

### Required Tools / Plugins / MCP

Before starting a portfolio task, Codex must check available tools and report any missing required tool with a fallback plan:

- Skills: inspect `.agents/skills/` and available user-level skills when accessible.
- Plugins/MCP: inspect available plugin/MCP surfaces when the environment exposes them.
- Local CLI: `rg`, `git`, `node`, `npm.cmd`, `npx`, and `wrangler` when deployment is in scope.
- Browser automation: Playwright or Browser MCP for UI QA, screenshots, layout validation, broken image checks, console errors, and video modal testing.
- Git/GitHub: required for branch, commit, push, Actions status, and rollback. Do not stage unrelated files such as `output/` unless explicitly requested.
- Cloudflare/Wrangler: required for Worker deployment and deployed URL verification when a code change ships.
- Figma MCP is optional and only used when a Figma source is provided.
- Documentation MCP is optional; use current official docs for platform-specific behavior when uncertainty matters.

### Mandatory Portfolio Workflow

For every portfolio task:

1. Identify task type: P0 production fix, preview refactor, UI redesign, content curation, video recovery, deployment, or QA only.
2. Select and read the required repo skills.
3. Inspect relevant files before editing.
4. Keep homepage media classes separate:
   - VideoWork -> Video Showcase / video lightbox / video room.
   - VisualWork -> Visual Gallery / image detail drawer.
   - WorkflowEvidence -> only process/workflow areas when explicitly allowed.
5. Do not auto-generate homepage content from raw arrays.
6. Do not allow composite, moodboard, case-board, stitched, or workflow screenshots into normal Gallery, Hero, commercial case covers, or video posters.
7. Run relevant validation:
   - `npm.cmd run build:app`
   - `npm.cmd run prepare:static`
   - Playwright local QA for frontend changes.
8. Deploy frontend code changes:
   - P0 stop-loss fix -> production when explicitly allowed or clearly required.
   - Large refactor -> preview first.
9. Verify deployed URL:
   - desktop/tablet/mobile screenshots or QA JSON.
   - console/page errors = 0.
   - broken images = 0.
   - video module visible when video is in scope.
   - Gallery has no workflow/moodboard/composite images.
   - layout centered.
   - rollback method documented.

A portfolio code task is not complete until a public preview or production URL is returned.
