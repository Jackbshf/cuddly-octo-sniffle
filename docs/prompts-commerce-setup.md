# Prompt Workbench Cloudflare Setup

The `/prompts/` product now uses Cloudflare Worker + Assets with D1/KV bindings.
The public experience is an internet job-task prompt workbench:

```text
岗位部门 -> 工作场景 -> 具体任务 -> 可复制提示词
```

`prompts-data/library.json` remains the migration source and backup. It is not shipped as a full public static asset.

## Bindings

`wrangler.jsonc` declares:

- `PROMPTS_DB`: D1 database `zhangwei-prompts`
- `PROMPTS_KV`: site settings and cache
- `PROMPT_ENTITLEMENTS`: legacy commerce entitlement cache
- `ASSETS`: static `dist/` bundle

Remote D1/KV resources must be created and bound before a real preview or production deploy. Do not create or switch production resources without approval.

R2 is intentionally not bound in production until it is enabled for the Cloudflare account. Add a `PROMPTS_R2` binding only after R2 is available and the upload path is being shipped.

## Initialize Local D1

```powershell
npm run prompts:d1:migrate
npm run prompts:d1:seed
```

Or run both:

```powershell
npm run prompts:d1:init
```

The local D1 state is stored under `.wrangler/prompt-workbench-state` and ignored by git.

## Admin Auth

The admin page still supports the existing password cookie:

```powershell
wrangler secret put PROMPT_LIBRARY_ADMIN_PASSWORD --config wrangler.jsonc
```

Admin API automation can use a Bearer token:

```powershell
wrangler secret put ADMIN_TOKEN --config wrangler.jsonc
```

Do not put either value in source code. For local testing, use a temporary env file outside tracked source, for example under `output/`.

## Run Locally

```powershell
npm run build:app
npm run prepare:static
npm run prompts:dev
```

Local URL:

```text
http://127.0.0.1:8787/prompts/
```

Admin URL:

```text
http://127.0.0.1:8787/prompts/admin/
```

## Public API Contract

Public endpoints:

- `GET /api/public/settings`
- `GET /api/public/categories`
- `GET /api/public/prompts`
- `GET /api/public/prompts/:id`
- `GET /api/public/search`

When `publicAccessMode` is `free-only`, public API SQL always enforces:

```sql
access = 'free' AND status = 'published' AND copy_ready = 1
```

The compatibility endpoints `/api/prompts/library`, `/api/prompts/meta`, `/api/prompts/search`, and `/prompts-data/*` must not expose pro, pack, hidden, archived, or non-copyReady records to public users.

## Verify Free-Only

```powershell
npx wrangler d1 execute zhangwei-prompts --local --persist-to .wrangler/prompt-workbench-state --config wrangler.jsonc --json --command "SELECT COUNT(*) AS public_count FROM prompts WHERE access='free' AND status='published' AND copy_ready=1; SELECT COUNT(*) AS leak_count FROM prompts WHERE status='published' AND access <> 'free';"
```

Expected local seed result:

- `public_count = 800`
- `leak_count = 0`

HTTP smoke checks:

```powershell
Invoke-RestMethod http://127.0.0.1:8787/api/public/prompts?limit=20
Invoke-RestMethod http://127.0.0.1:8787/api/public/search?q=海报"&"limit=20
Invoke-RestMethod http://127.0.0.1:8787/api/prompts/library
```

Every returned prompt must be `access = free`, `status = published`, and `copyReady = true`.

## Deploy

Preview first:

```powershell
npm run prepare:static
npm run deploy:preview
```

Production remains the existing Worker release path:

```powershell
npm run deploy:worker
```

Production deploy requires separate confirmation plus the usual report: environment, URL, commit, deployment ID or Worker Version ID, verification result, and rollback method.

## Stripe Notes

Paid entry points are off by default:

```json
{
  "showPaidEntry": false,
  "showProBadges": false,
  "showPackBadges": false,
  "allowLockedPreview": false
}
```

Legacy Stripe checkout, portal, webhook, and entitlement routes are retained, but the free public workbench does not show paid cards unless settings are explicitly changed by an administrator.
