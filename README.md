# ZhangWei Portfolio

这是一个纯静态作品集站点，推荐部署方式是：

- 源码托管：GitHub
- 自动部署：GitHub Actions -> Cloudflare Workers
- 图片资源：仓库内 `images/`
- 本地视频资源：仓库内 `videos/`
- 短视频：Cloudinary 公开直链
- 长视频：YouTube 非公开嵌入

## 当前结构

- `index.html`
  页面入口
- `app.jsx`
  前端逻辑与本地可视化编辑器
- `embedded-data.js`
  直接双击打开 `index.html` 时使用的本地备份数据，会和运行时模型同步
- `data/meta.json`
  站点级 SEO、案例区和表单配置源文件
- `data/cases/`
  结构化案例源文件，给 `/admin/` 和同步脚本使用
- `data/portfolio.json`
  运行时合并后的公开数据入口
- `images/`
  站内静态图片资源
- `videos/`
  站内本地视频资源，适合直接随仓库发布的小体积 mp4/webm
- `admin/`
  Decap CMS 后台入口与配置
- `scripts/prepare-static.mjs`
  自动整理发布目录到 `dist/`
- `scripts/sync-portfolio-json.mjs`
  跨平台同步脚本，负责合并 `meta/cases/slides`、更新 `embedded-data.js` 并检查体积与资源引用
- `decap-oauth-worker/`
  给 Decap CMS 使用的独立 GitHub OAuth Worker 脚手架
- `wrangler.jsonc`
  Cloudflare Worker 静态资源部署配置
- `.github/workflows/deploy-cloudflare-worker.yml`
  GitHub Actions 自动发布工作流

## 内容更新流程

1. 日常内容编辑有两条路：
   - 打开站点并加上 `?editor=1`，继续使用现有可视化编辑器维护 `slides`
   - 打开 `/admin/`，用 Decap CMS 管理 `data/meta.json` 和 `data/cases/*.json`
2. 文本可以直接点页面编辑。
3. 每个媒体卡片支持三种稳定资源方式：
   - 图片：填写 `images/xxx.jpg`
   - 本地视频：填写 `videos/xxx.mp4`
   - 短视频：填写 Cloudinary mp4/webm 直链
   - 长视频：填写 YouTube 视频 ID 或完整链接
4. 如果从编辑器导出了 `portfolio.json`，直接运行 [一键发布.bat](C:/Users/24531/Desktop/ZhangWei-Portfolio/一键发布.bat)。
5. 同步脚本会自动：
   - 拆出并更新 `data/meta.json`
   - 拆出并更新 `data/cases/*.json`
   - 重建 `data/portfolio.json`
   - 更新 `embedded-data.js`
   - 检查引用资源和 JSON 体积
6. 如果有新图片，把文件放进 `images/`；如果有本地视频，把文件放进 `videos/`。
7. 提交并推送到 GitHub。
8. GitHub Actions 会自动构建并更新 Cloudflare Worker 站点。

## 一键发布

- 直接双击 [一键发布.bat](C:/Users/24531/Desktop/ZhangWei-Portfolio/一键发布.bat)
- 或双击 [publish.bat](C:/Users/24531/Desktop/ZhangWei-Portfolio/publish.bat)
- 或在终端运行：

```powershell
.\publish.bat
```

- 自定义提交说明：

```powershell
.\publish.bat update videos
```

## 本地预览说明

- 直接双击打开 `index.html` 时，页面会优先使用 `embedded-data.js` 的备份数据做预览。
- 通过本地静态服务器或部署环境访问时，页面会优先读取运行时入口 `data/portfolio.json`。
- 本地上传图片或视频仅用于当前预览，不会作为最终发布资源写进导出的 JSON。
- 如果要长期保存视频，请把视频文件手动放进 `videos/`，然后在页面里填写相对路径，例如 `videos/demo.mp4`。
- 结构化案例与 SEO 配置优先落在 `data/meta.json` 和 `data/cases/*.json`，公开站读取的是同步后的合并结果。

## Git 初始化

在这个目录执行：

```powershell
git init
git branch -M main
git add .
git commit -m "Prepare portfolio for GitHub and Cloudflare Pages"
```

## 推送到 GitHub

先创建一个空仓库，例如 `ZhangWei-Portfolio`，然后执行：

```powershell
git remote add origin https://github.com/<your-account>/ZhangWei-Portfolio.git
git push -u origin main
```

## Cloudflare Pages 配置

这部分已经废弃。当前线上站点不再使用 Cloudflare Pages Git 绑定，而是统一走：

- GitHub 仓库作为源码源头
- GitHub Actions 构建 `dist/`
- Cloudflare Worker `floral-leaf-4e44` 作为公开站点

## 当前推荐的自动同步方案

由于你当前在线地址是 `workers.dev`，并且原站点不是通过 Git 绑定创建的，所以推荐直接改用：

- GitHub 仓库作为源码源头
- GitHub Actions 自动执行部署
- Cloudflare Worker `floral-leaf-4e44` 继续作为线上站点

这样不需要继续卡在 Cloudflare 的“连接 Git 仓库”界面。

## 一次性配置 GitHub Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 里添加：

- `CLOUDFLARE_API_TOKEN`
  值填一个 Cloudflare API Token

Cloudflare 官方建议给 GitHub Actions 使用 `API token + account ID`，并通过 `wrangler-action@v3` 执行 `wrangler deploy`。

当前仓库已经把 `accountId` 固定写入 workflow，所以你只需要手动配置一个 Secret：

- `CLOUDFLARE_API_TOKEN`

- GitHub Actions 文档：
  [Cloudflare GitHub Actions](https://developers.cloudflare.com/workers/ci-cd/external-cicd/github-actions/)
- Static Assets 文档：
  [Cloudflare Static Assets](https://developers.cloudflare.com/workers/static-assets/)

## 如何创建 Cloudflare API Token

在 Cloudflare Dashboard 中：

1. 进入 `Manage Account -> Account API Tokens`
2. 选择 `Create Token`
3. 选择 `Edit Cloudflare Workers` 模板
4. 将权限范围限制到你当前使用的账号
5. 创建后，把 Token 保存到 GitHub Secret `CLOUDFLARE_API_TOKEN`

## 自动发布流程

配置好 GitHub Secrets 后：

1. 修改站点内容
2. `git add .`
3. `git commit -m "update portfolio"`
4. `git push origin main`
5. GitHub Actions 会自动执行：
   - 运行 `scripts/prepare-static.mjs`
   - 生成 `dist/`
   - 使用 `wrangler-action@v3` 自动部署到 `floral-leaf-4e44`

完成后，线上地址仍然是：

- `https://floral-leaf-4e44.2453193338.workers.dev/`
