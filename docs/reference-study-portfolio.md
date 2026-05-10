# 张玮 AIGC 作品集 Reference Study

检查日期：2026-05-10  
任务边界：本文件只做参考研究和重构建议，不复制视觉设计、作品内容、文案、品牌元素或资产，不修改运行时代码、数据结构、部署配置或业务路由。

## 研究原则

- 学习对象是交互架构、页面节奏、组件拆分、WebGL 渐进增强、性能策略、媒体展示和部署流程。
- 禁止复制参考项目的作品图、真实案例、个人品牌、角色设定、logo、声音、场景美术、叙事文案、项目内容和任何未授权素材。
- 张玮站点的默认路线仍应是稳定、清晰、求职/商业转化优先的普通作品集；3D 数字美术馆只作为 `?gallery=1` 或显式入口的渐进增强。
- 视频、图片、工作流证据必须严格分类，Workflow Lab 只承载 ComfyUI/process/moodboard/case-board 等过程材料。
- 任何后续实现都必须继续遵守 dark-only、移动端普通首页优先、中英双语、Cloudflare Worker 交付和项目 QA 门禁。

## 参考项目结论

### 1. HamishMW/portfolio

来源：[GitHub](https://github.com/HamishMW/portfolio) / [Live](https://hamishw.com/) / [Storybook](https://storybook.hamishw.com/)

技术栈与交付：

- Remix、React、Three.js、Framer Motion、MDX、Storybook。
- Cloudflare Pages 部署，package script 中 `deploy` 会先 build 再 `wrangler pages deploy`。
- README 明确允许学习和改造代码，但不允许把作者真实项目呈现为自己的项目。

值得学习：

- 设计师作品集的节奏不是满屏炫技，而是先建立身份、精选项目和可读叙事，再用 3D/动效加强记忆点。
- Storybook 独立维护组件，有利于把导航、项目卡、媒体容器、按钮和动效状态拆开验证。
- 联系表单和部署环境变量分离，适合参考到张玮站点的联系路径和 Cloudflare 交付说明。
- 3D 背景/场景是品牌氛围层，不替代项目内容；这点适合张玮站点把电影感 Hero 当作舞台，而不是把所有作品塞进 3D。
- README 对许可和项目内容的边界写得清楚，适合本项目文档也明确“只学方法，不拿内容”。

不适合直接照搬：

- 不能复制其真实设计项目、项目图、案例文案、站点主题和个人品牌语气。
- Remix/Storybook 体系不应在当前阶段强行迁移；张玮站点现在是 React + 静态构建 + Cloudflare Worker。
- 其联系表单方案依赖 AWS SES/环境变量，不应在没有明确后端任务时照搬。

### 2. brunosimon/folio-2025

来源：[GitHub](https://github.com/brunosimon/folio-2025) / [Live](https://bruno-simon.com/)

技术栈与交付：

- Vite、Three.js、Rapier 3D、GSAP、Howler、camera-controls、Tweakpane、stats-gl、Sharp、gltf-transform/KTX 工具链。
- README 给出清晰 game loop：输入、物理、玩家、视角、天气、区域、音频、渲染、监控按阶段排布。
- 静态资产有压缩流程：GLB、模型纹理、UI 图片分别处理，并保留原始文件。
- GitHub `license.md` 是 MIT；`package.json` 的 license 字段显示 ISC，后续复用应按更保守的署名和许可核对处理。
- Live 页面有质量、声音、控制、性能等体验设置，说明高负载 3D 需要用户可控降级。

值得学习：

- 复杂 3D 体验要有明确循环和系统边界，不能把物理、输入、摄像机、音频、UI 和监控混在 React 页面里。
- 资产压缩和原始资产分层值得借鉴到 `cover/source/original/poster`，但只作为治理思路，不复制其资源。
- 用户可控质量/声音/控制提示适合 `GalleryWorldHome` 的沉浸模式，而不是默认首页。
- 作品集可以用交互叙事形成个人品牌，但核心要服务识别和探索，不应牺牲可读性。
- 性能监控属于 3D 路线的内建能力，张玮站点后续可在 `?gallery=1` 检查 WebGL、帧率、资源失败和 reduced-motion。

不适合直接照搬：

- Bruno 的车辆、地图、物理世界、天气、音效、UI 语言和品牌叙事都不能复制。
- 这种全站游戏化路线成本高，不适合作为张玮默认首页；它只适合启发 3D 数字美术馆的增强层。
- Rapier/Howler/Tweakpane 等依赖不应作为 reference study 阶段新增，也不应无目标引入生产包。

### 3. jotyy/r3f-portfolio

来源：[GitHub](https://github.com/jotyy/r3f-portfolio) / [Live README 链接](https://jotyy.vercel.app/)

技术栈与交付：

- Next.js、React Three Fiber、Drei、Three.js、Framer Motion、Lenis、Tailwind、PWA、tunnel-rat。
- README 强调 Canvas 不随页面导航反复卸载，3D 组件可插入任意 DOM 区块。
- README 记录首屏 JS 约 88kb、Lighthouse 四项 100 的性能目标。
- 2026-05-10 检查时，`https://jotyy.vercel.app/` 通过本机请求返回 404/不可用；仓库架构仍有参考价值。

值得学习：

- 3D Canvas 生命周期应稳定，普通页面区块通过 portal/view 插入 3D 内容，避免路由切换反复创建 WebGL 上下文。
- 3D 不必整页独占；可作为 Hero、项目卡、能力区或 GalleryWorld 的局部增强。
- 性能预算写进架构目标，而不是等视觉完成后再补救。
- PWA、bundle analyzer、lint 等脚本有助于把“沉浸效果”和“可交付性能”同时纳入检查。
- 对张玮站点，最可借鉴的是 `GalleryWorldHome` 与普通首页之间共享底层媒体数据，但保持 Canvas/沉浸入口独立。

不适合直接照搬：

- Next.js App Router、PWA 和 tunnel-rat 架构不应强行迁移到当前静态 Worker 站点。
- 其 demo 当前不可达，不能把 live 体验作为已验证的线上效果复用。
- 其通用博客/开发者 portfolio 信息结构不适合直接映射到 AIGC 商业视觉作品集。

### 4. 0xFloyd/Portfolio_2020

来源：[GitHub](https://github.com/0xFloyd/Portfolio_2020) / [Live](https://0xfloyd.com/)

技术栈与交付：

- Three.js、Ammo.js、Webpack、Express、stats.js、dat.gui。
- README 描述物理引擎、键盘/触控控制、raycasting、FPS tracker 和资源压缩。
- README 写的是 Heroku 托管；2026-05-10 检查 `www.0xfloyd.com` 会重定向到 `0xfloyd.com`，响应头显示当前由 Vercel 提供。
- package 标记 MIT。

值得学习：

- 漫游/展厅类体验必须同时设计桌面键盘和移动触控控制。
- Raycasting 与可点击热点适合 `GalleryWorldHome` 的展品入口，不适合普通作品卡的基础交互。
- FPS tracker 和压缩插件说明 3D 展厅必须有性能兜底。
- “世界式作品集”适合启发数字美术馆入口、展墙、房间和热点信息层。
- 对张玮站点可借鉴的是技术兜底：移动控制、性能显示、加载提示、非 3D fallback。

不适合直接照搬：

- 其 3D 世界、美术资源、交互设定和旧式 Webpack/Express 结构不适合直接迁移。
- Ammo.js 物理对作品集转化价值有限，不应在没有具体展厅交互目标时引入。
- 全站漫游会降低招聘/商业访客获取关键信息的速度，不能成为默认首页。

### 5. adrianhajdin/threejs-portfolio

来源：[GitHub](https://github.com/adrianhajdin/threejs-portfolio) / [Live](https://threejscc-portfolio.vercel.app/)

技术栈与交付：

- Vite、React、React Three Fiber、Drei、Three.js、GSAP、Leva、Tailwind、EmailJS、react-globe.gl、react-responsive。
- README 定位为教程项目，技术栈和 feature 说明清晰，适合快速理解标准 R3F portfolio 结构。
- Live 页面 2026-05-10 可访问，构建产物为 Vite asset。

值得学习：

- 适合作为 R3F 基础结构参考：Canvas、Drei helpers、3D model section、GSAP scroll/entrance 动效、联系模块。
- 教程型结构清晰，便于拆出 Hero、Project、Experience、Contact 等模块职责。
- `react-responsive` 思路可启发移动端普通模式和桌面增强模式分流。
- EmailJS 联系模块可作为“有后端/无后端”边界的反例和参考：若没有真实提交后端，张玮站点必须提供明确邮箱 fallback。

不适合直接照搬：

- 教程模板常见的技能、时间线、地球、联系表单和通用开发者项目卡不适合 AIGC 视觉设计师定位。
- 不能复制其教程资产、模型、文案或表单流程。
- Leva/GSAP/EmailJS 等不应在没有明确实现任务时新增。

### 6. sunnypatell/react-threejs-portfolio

来源：[GitHub](https://github.com/sunnypatell/react-threejs-portfolio) / [Live](https://www.sunnypatel.net/)

技术栈与交付：

- Vite、React、React Three Fiber、Drei、Three.js、Framer Motion、EmailJS、React Router、Swiper、Vercel Analytics/Speed Insights。
- Live 页面 2026-05-10 可访问，标题为 Sunny's Portfolio。
- 仓库包含自定义 Sunny Patel License：允许个人/组织使用、再分发需要保留署名，禁止修改、营利销售或商业产品包含；商业使用/修改需联系作者。

值得学习：

- 常规 3D portfolio 的响应式结构、作品区、联系区、动画和路由分层可作为“不要过度工程化”的参考。
- Vercel Analytics/Speed Insights 的存在提醒：上线后要观察真实性能，但张玮站点不能无批准新增监控 SDK。
- Swiper 和 Motion 说明项目展示可以用轻量连续浏览，但要避免移动端卡顿和 hover-only。
- 许可证非常适合提醒本项目：不能拿别人模板直接改成商业 portfolio。

不适合直接照搬：

- 许可证限制比 MIT 更严格，不能修改后用于商业站点，不能复制其模型、布局成品或资产。
- 通用开发者 portfolio 的技能/时间线/联系结构不应替代张玮的 AIGC 视频、商业视觉、Workflow Lab 分类。
- Vercel 监控和部署流程不适合直接替换当前 Cloudflare Worker 交付。

## 对 zhangwei-site 的重构建议

### 首页结构

- 默认首页继续服务求职和商业转化：清晰身份、精选 Hero、视频作品、商业案例、视觉 Gallery、Workflow Lab、联系入口。
- 电影感 Hero 应使用真实精选作品作为第一视觉信号，避免抽象装饰背景；3D 只作为舞台层或显式沉浸入口。
- 首页 curation 必须继续使用显式 ID，不用 `slice(0, n)` 或宽泛标签自动填充。
- 首屏应让招聘/商业访客在 5 秒内理解：张玮是谁、做什么、能交付什么、如何联系。

### 3D / 沉浸增强

- `GalleryWorldHome` 保持为渐进增强路线，入口建议放在首页 Hero 或 Gallery 末尾，用“进入数字美术馆”表达为可选体验。
- `?gallery=1` 加载失败、低性能、移动端、`prefers-reduced-motion` 时必须退回普通首页或展示普通作品列表。
- 3D 展厅只展示已分类、已授权、已准备好的作品；工作流证据进入 workflow room，不进入普通视觉墙。
- 如果后续加入更复杂漫游，应先定义输入、相机、热点、资产加载、性能监控、音频和 fallback 边界，不能把它们混在首页组件里。

### 媒体分类与展示

- 视频进入 `VideoShowcase` / `VideoLightbox` / 沉浸视频房间；必须有 poster、duration、HLS/MP4 fallback 和失败提示。
- 单张视觉进入 `VisualGallery` / `ImageDetailDrawer` / 展墙；卡片用 `cover`，详情用 `source`。
- ComfyUI workflow、moodboard、节点图、过程拼图进入 `WorkflowLab` / `WorkflowDetailPanel` / workflow room；不得出现在 Hero、普通 Gallery、视频 poster 或商业案例封面。
- 媒体卡需要统一 `MediaFrame`，集中处理 alt、loading、poster、video badge、fallback、hover preview、keyboard open。

### i18n 与文案

- 默认中文，英文通过显式 toggle 或 `?lang=en`；新增可翻译界面应进入统一 copy map。
- 英文定位保留：`AIGC Visual Designer`、`AI Video & Commercial Visual`、`ComfyUI Workflow`。
- 不公开完整 prompt、完整参数、私密节点配置、客户敏感信息或未授权品牌素材。

## 建议组件列表

- `MediaFrame`：统一 image/video/workflow cover 渲染、poster、badge、fallback、alt、keyboard open。
- `VideoShowcase`：只接收 `kind: "video"`，展示精选视频、duration、播放状态和恢复中提示。
- `VisualGallery`：只接收单张视觉图片，支持筛选、加载更多、详情打开和重复封面检测。
- `WorkflowLab`：只接收 `workflow`、`moodboard`、`case-board`、`process` 类证据，展示步骤、能力、输出和方法摘要。
- `VideoLightbox`：播放视频，Esc/关闭时暂停，显示 HLS/MP4 fallback 状态。
- `ImageDetailDrawer`：展示高质量 source 图、创作目标、工具、交付物和版权状态。
- `WorkflowDetailPanel`：展示过程图、节点摘要、输入/处理/输出，不暴露完整私密参数。
- `GalleryWorldHome` entry：普通首页到 `?gallery=1` 的显式入口，失败时回到 `/`。

## 建议数据结构

这些是后续实现建议，不在本次 reference study 中落库：

- `media.cover`：卡片和首屏使用的优化封面。
- `media.source`：详情、lightbox、drawer 使用的清晰资源。
- `media.original`：归档或下载引用，不直接用于卡片。
- `media.poster`：视频和动态内容的静态 poster。
- `kind`：`video`、`image`、`workflow`、`moodboard`、`case-board`、`unknown`。
- `status`：`ready`、`draft`、`hidden`、`needs-copy`、`needs-cover`、`missing-video`、`archive`。
- `rightsStatus`：`original`、`licensed`、`needs-review`、`do-not-publish`。
- `homepageCuration`：Hero、video featured、commercial cases、visual gallery、workflow evidence 都用显式 ID。
- `galleryWorlds`：世界、房间、展墙、热点、作品引用和 fallback 文案与普通媒体库共享。
- `copyMap`：中文默认、英文 toggle 的导航、标题、卡片、详情和联系文案。

## 建议实施顺序

1. 研究文档：保留本文件作为方法和禁复制边界。
2. 媒体治理：补齐 `cover/source/original/poster`、`status`、`rightsStatus`、`kind`，先做 QA 脚本和报告。
3. 首页清晰转化：整理 Hero、视频、商业案例、视觉 Gallery、Workflow Lab 的显式 curation。
4. 详情体验：补 `VideoLightbox`、`ImageDetailDrawer`、`WorkflowDetailPanel` 的一致交互和可访问性。
5. Workflow Lab：把 ComfyUI 证据从普通 Gallery 中隔离出来，形成方法展示而非资源堆。
6. 3D 数字美术馆：将 `GalleryWorldHome` 作为 `?gallery=1` 渐进增强，先保证失败退回普通首页。
7. QA/部署门禁：执行 clean build、Playwright visual QA、内容 QA、Cloudflare cache freshness、线上 smoke test 和 rollback 记录。

## 明确禁止复制

- Hamish、Bruno、Jotyy、0xFloyd、Adrian Hajdin、Sunny Patel 的作品图、视频、真实项目、logo、角色、模型、贴图、声音、案例、文案和个人品牌表达。
- 教程项目中的模型、地球、机器人、时间线、联系表单、技能卡等成品布局不能直接替换张玮站点。
- 第三方 3D 模型、纹理、音频、字体、图标、客户 logo、名人/私人肖像和品牌素材，除非已确认授权并写入 `rightsStatus: "licensed"`。
- 任何把参考站点真实项目包装成张玮项目的行为。

## 当前站点落点

- `PublicPortfolioHome`：保留为默认首页基线；后续重构应强化招聘/商业转化、媒体分区和中英双语，而不是换模板。
- `GalleryWorldHome`：保留为沉浸增强入口；后续吸收 Bruno/0xFloyd 的系统边界和性能兜底，不复制其世界内容。
- `homepageCuration`：继续作为首页显式策展核心；后续应加入状态、版权和媒体角色校验。
- 媒体分类：沿用现有 `classifyHomepageWork` 思路，但后续应从运行时推断逐步升级为数据字段 + QA 脚本双保险。
- Cloudflare Worker：继续作为当前交付基线；参考项目的 Vercel、Heroku、EmailJS、AWS SES 只作为对比，不改变部署方案。

## 资料来源

- HamishMW Portfolio GitHub: https://github.com/HamishMW/portfolio
- HamishMW live site: https://hamishw.com/
- Bruno Simon Folio 2025 GitHub: https://github.com/brunosimon/folio-2025
- Bruno Simon live site: https://bruno-simon.com/
- jotyy/r3f-portfolio GitHub: https://github.com/jotyy/r3f-portfolio
- jotyy demo URL from README: https://jotyy.vercel.app/
- 0xFloyd Portfolio 2020 GitHub: https://github.com/0xFloyd/Portfolio_2020
- 0xFloyd live site: https://0xfloyd.com/
- Adrian Hajdin Three.js Portfolio GitHub: https://github.com/adrianhajdin/threejs-portfolio
- Adrian Hajdin live demo: https://threejscc-portfolio.vercel.app/
- Sunny Patel 3D Portfolio GitHub: https://github.com/sunnypatell/react-threejs-portfolio
- Sunny Patel live site: https://www.sunnypatel.net/
