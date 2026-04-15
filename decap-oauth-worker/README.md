# Decap OAuth Worker

这个目录提供一个给 `Decap CMS` 使用的最小 GitHub OAuth Worker。它和公开站点分开部署，只负责：

- `/api/auth`
  发起 GitHub OAuth
- `/api/callback`
  接收 GitHub 回调，并把 token 通过 `postMessage` 回传给 Decap 弹窗
- `/api/health`
  返回当前配置状态

## 需要你补的内容

1. 在 GitHub 新建一个 OAuth App
2. 把 callback URL 设为你将要部署的 Worker 地址，例如：

```text
https://your-decap-oauth.your-subdomain.workers.dev/api/callback
```

3. 部署前写入 secrets：

```powershell
cd decap-oauth-worker
wrangler secret put GITHUB_CLIENT_ID
wrangler secret put GITHUB_CLIENT_SECRET
wrangler secret put STATE_SECRET
```

`STATE_SECRET` 建议使用随机长字符串，用来签名 OAuth state。

## 允许来源

默认允许这两个来源访问 OAuth：

- `https://www.zhangweivisual.cn`
- `https://zhangweivisual.cn`

如果后台地址变化，请同步修改 [wrangler.jsonc](/C:/Users/24531/Desktop/ZhangWei-Portfolio/decap-oauth-worker/wrangler.jsonc:1) 里的 `ALLOWED_ORIGINS`。

## 部署

```powershell
cd decap-oauth-worker
npx wrangler deploy --config wrangler.jsonc
```

部署完成后，把 Worker 域名填回：

- [admin/config.yml](/C:/Users/24531/Desktop/ZhangWei-Portfolio/admin/config.yml:1) 里的 `backend.base_url`

然后公开站里的 `/admin/` 就能使用 GitHub 登录。
