# ZhangWei Portfolio

这是一个静态作品集站点，源码托管在 GitHub，GitHub Actions 构建 `dist/` 后部署到 Cloudflare Worker `floral-leaf-4e44`。

线上地址仍是：

- `https://www.zhangweivisual.cn/`
- `https://floral-leaf-4e44.2453193338.workers.dev/`

## 主要目录

- `index.html`：公开作品集入口。
- `app.jsx`：作品集前端和本地可视化编辑器逻辑。
- `embedded-data.js`：直接打开 `index.html` 时使用的本地备份数据。
- `data/meta.json`：站点 SEO、案例区和联系区配置源。
- `data/cases/*.json`：结构化案例源。
- `data/portfolio.json`：构建时合并后的公开数据入口。
- `admin/`：Portfolio CMS 密码后台，管理 `data/meta.json`、`data/cases/*.json` 和 `images/uploads/`。
- `prompts/`：提示词仓库前端，线上路径为 `/prompts/` 和 `/prompts/admin`。
- `prompts-data/library.json`：提示词仓库共享索引。
- `prompts-data/assets/`：提示词仓库图片素材目录。
- `src/worker.js`：Cloudflare Worker，负责密码保护、后台 API 和 GitHub 写入。
- `scripts/prepare-static.mjs`：生成 `dist/`，会先同步 portfolio 数据并复制静态资源。
- `scripts/sync-portfolio-json.mjs`：合并 `data/meta.json`、`data/cases/*.json` 和 slides 数据。

## Portfolio CMS

`/admin/` 现在不再依赖 Decap OAuth 外站，也不再使用 `/admin/config.yml`。

新的流程是：

1. 未登录访问 `/admin/` 时显示管理员密码页。
2. 登录成功后，后台读取 GitHub 仓库中的 `data/meta.json` 和 `data/cases/*.json`。
3. 保存 Meta、保存案例、删除案例、上传封面时，由 Worker 使用 `PORTFOLIO_GITHUB_TOKEN` 写回仓库。
4. GitHub 更新提交会触发 Actions，重新构建并部署站点。

后台 API：

- `GET /api/portfolio-admin/content`
- `POST /api/portfolio-admin/meta`
- `POST /api/portfolio-admin/cases`
- `DELETE /api/portfolio-admin/cases/:id`
- `POST /api/portfolio-admin/uploads`

所有 `/api/portfolio-admin/*` 写入接口都要求 `PORTFOLIO_ADMIN_PASSWORD` 登录 cookie。

## 提示词仓库

- `/prompts/`：查看端，需要 `PROMPT_LIBRARY_PASSWORD`。
- `/prompts/admin`：编辑端，需要 `PROMPT_LIBRARY_ADMIN_PASSWORD`。
- `prompts-data/library.json` 是共享提示词和素材索引。
- 上传到提示词仓库的图片写入 `prompts-data/assets/YYYY/MM/`。

## GitHub Secrets

在 GitHub 仓库 `Settings -> Secrets and variables -> Actions` 中配置：

- `CLOUDFLARE_API_TOKEN`
- `PROMPT_LIBRARY_PASSWORD`
- `PROMPT_LIBRARY_ADMIN_PASSWORD`
- `PROMPTS_GITHUB_TOKEN`
- `PORTFOLIO_ADMIN_PASSWORD`
- `PORTFOLIO_GITHUB_TOKEN`

`PROMPTS_GITHUB_TOKEN` 和 `PORTFOLIO_GITHUB_TOKEN` 应使用 fine-grained PAT，并授予目标仓库内容读写权限。不要把运行时写入凭据放进前端代码或公开 JSON。

## Cloudflare Worker Vars

`wrangler.jsonc` 当前使用：

- `PROMPTS_GITHUB_OWNER=Jackbshf`
- `PROMPTS_GITHUB_REPO=cuddly-octo-sniffle`
- `PROMPTS_GITHUB_BRANCH=main`

Portfolio CMS 默认复用同一组 owner/repo/branch。必要时也可以额外设置 `PORTFOLIO_GITHUB_OWNER`、`PORTFOLIO_GITHUB_REPO`、`PORTFOLIO_GITHUB_BRANCH`。

## 本地命令

```powershell
npm ci
npm run prepare:static
```

构建会生成 `dist/`，并复制 `admin/`、`prompts/`、`prompts-data/`、`data/`、`images/` 和 `videos/`。

## 发布流程

1. 修改内容或代码。
2. 提交并推送到 `main`。
3. GitHub Actions 安装依赖、同步 Stream manifest、生成静态包、写入 Worker secrets 并部署 Worker。
4. 部署后公开站点和两个后台入口都会读取最新代码。
