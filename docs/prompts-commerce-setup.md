# Prompts Commerce Setup

This phase keeps production on Cloudflare Workers and uses Docker only for local search relevance experiments.

## Local search sandbox

Docker Desktop must be running before this command works:

```powershell
docker compose --profile search up -d meilisearch
```

Meilisearch listens on `http://localhost:7700`. The production `/prompts/` page does not depend on this service; it uses `prompts-data/search-index.json`.

## Stripe test mode

The Worker uses Stripe-hosted Checkout Sessions. It does not collect card data directly.

Required Worker secrets before checkout can work:

```powershell
wrangler secret put STRIPE_SECRET_KEY --config wrangler.jsonc
wrangler secret put STRIPE_WEBHOOK_SECRET --config wrangler.jsonc
wrangler secret put PROMPT_ENTITLEMENT_SECRET --config wrangler.jsonc
wrangler secret put PROMPTS_STRIPE_PRICE_PRO_MONTHLY --config wrangler.jsonc
```

For one-time prompt packs, configure either a JSON map:

```powershell
wrangler secret put PROMPTS_STRIPE_PACK_PRICE_MAP --config wrangler.jsonc
```

Example map shape:

```json
{
  "video-commerce-pro": "price_...",
  "image-product-pro": "price_...",
  "multi-modal-studio-pro": "price_..."
}
```

or individual secrets:

```powershell
wrangler secret put PROMPTS_STRIPE_PRICE_PACK_VIDEO_COMMERCE --config wrangler.jsonc
wrangler secret put PROMPTS_STRIPE_PRICE_PACK_IMAGE_PRODUCT --config wrangler.jsonc
wrangler secret put PROMPTS_STRIPE_PRICE_PACK_MULTIMODAL --config wrangler.jsonc
```

## Cloudflare KV

Entitlements need a KV binding named `PROMPT_ENTITLEMENTS`. This binding is intentionally not added in this phase because it changes production configuration.

After confirmation, add a KV namespace and bind it in `wrangler.jsonc`, then deploy to Preview first.

## Webhook route

Configure the Stripe webhook endpoint to:

```text
https://www.zhangweivisual.cn/api/prompts/stripe-webhook
```

Recommended events:

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

## Safety notes

- Do not paste live Stripe keys into source files.
- Do not copy external prompt text into `web-suggestions.json`.
- Public users receive redacted paid prompt bodies from `/api/prompts/library` until entitlement is active.
- `/prompts-data/search-index.json` must not contain full prompt bodies.
