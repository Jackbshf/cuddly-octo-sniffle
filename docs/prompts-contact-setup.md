# Prompts Contact Setup

The prompt library now uses a contact-first conversion flow instead of online checkout.

## Public Flow

- `/prompts/` shows free search, professional content counts, and pack cards.
- Locked professional prompts and prompt packs show a contact CTA.
- The contact dialog exposes configured contact methods and optional QR code.
- `/api/prompts/checkout` and `/api/prompts/customer-portal` return `410` so hidden payment buttons cannot start checkout.

## Admin Configuration

Contact settings are stored in `prompts-data/library.json` under `contact`:

```json
{
  "title": "联系我获取精选包",
  "description": "告诉我你的创作任务、使用工具和交付平台，我会帮你匹配合适的提示词包或定制方案。",
  "ctaLabel": "联系获取方案",
  "wechat": "",
  "email": "2453193338@qq.com",
  "phone": "",
  "qrImageUrl": "",
  "consultationText": "咨询时建议附上：项目目标、内容类型、使用模型或工具、期望交付格式和时间要求。"
}
```

Use `/prompts/admin/` -> `联系方式设置` to edit these fields. The admin save button only updates the browser draft; click `发布到 GitHub` to publish the JSON change and wait for deployment.

## QR Code

Use a safe image URL:

- `/images/...`
- `/prompts-data/assets/...`
- `https://...`

Other URL schemes are stripped by the Worker normalizer and the browser UI.

## Notes

- Do not add payment secrets for this flow.
- Existing redaction still protects non-free prompt bodies.
- Public users receive contact instructions instead of a payment redirect.
- `/prompts-data/search-index.json` must not contain full prompt bodies.
