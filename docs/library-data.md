# library-data 资源库数据说明

提示词库之外的第二类共享素材：**音色、台词稿、背景音乐**。结构与 `prompts-data/` 平行，元数据进仓库，音频文件放 R2。

```
library-data/
├── voices.json            音色元数据（8 个中文神经语音）
├── bgm.json               BGM 元数据（bpm / 调性 / 乐器 / 情绪 / 许可）
├── text/
│   ├── index.json         文本库目录
│   ├── copy/              成稿（按题材一份 JSON）
│   ├── hooks.json         开场钩子
│   └── endings.json       收尾 / CTA
└── media-manifest.json    媒体 id → 公网 URL 映射
```

## 三条规矩

1. **仓库只放元数据。** 音频、试听 mp3、成片一律走 R2 / Stream，仓库里只留 URL。
2. **每条都要有 `license`。** 自产写 `CC0（自产，可商用）`；外购写清授权方与有效期；来源不明的不许入库。
3. **不许放真人音色克隆素材。** 声音权益受《民法典》第 1023 条保护，只接受本人或书面授权。

## 字段

### voices.json

| 字段 | 说明 |
|---|---|
| `id` | 语音标识，如 `zh-CN-YunjianNeural` |
| `name` / `sex` | 中文名、性别（male/female） |
| `styles` | 听感标签，如 `["沉稳","磁性","男中音"]` |
| `uses` | 适用题材，用于搜索与选型 |
| `provider` | 服务方（当前为 `microsoft-edge-tts`） |
| `rateDefault` | 建议语速，古风常用 `-4%` 至 `-12%` |
| `sample` | 试听文件相对路径 → 经 media-manifest 换成 URL |
| `status` | `active` 可选用 / `disabled` 保留但停用 |
| `license` | 授权说明 |

`policy` 段规定默认音色：目前男声只放行 `zh-CN-YunjianNeural`（云健）。

### bgm.json

`bpm` 用于卡点；`instruments` / `mood` / `key` 用于检索；`loopable` 表示能否无缝循环；`usage` 写清混音建议（例如"压到人声 25–30%"）。

### text/

- `text/index.json` 列出成稿文件；每份成稿是 `lines[]`，一条一行口播：
  `glyph`（1–3 字画面主体）、`label`（古风小注）、`sub`（字幕，建议 ≤24 字）、`voice`（口播文本）、`mode`（表现方式）。
- `hooks.json` / `endings.json` 是通用件，按手法/目的分类，可跨题材复用。

## 索引生成

`scripts/prompts/build-search-index.mjs` 会把三个库合并进 `prompts-data/search-index.json` 的 `library` 节点：

```bash
npm run build:prompt-index      # 只重建索引，不动 library.json
```

前端读取方式：

```js
const index = await fetch("/prompts-data/search-index.json").then((r) => r.json());
index.library.voices   // [{ id, name, styles, uses, sampleUrl, ... }]
index.library.bgm      // [{ id, title, bpm, style, audioUrl, ... }]
index.library.text     // [{ id, kind, title, lines[], searchable }]
```

每条都带 `searchable` 字段（小写拼接），可直接做前端模糊搜索，和提示词共用同一个搜索框。

## 媒体落地

`media-manifest.json` 把相对路径换成公网地址：

```json
{
  "baseUrl": "https://cdn.zhangweivisual.cn/lib",
  "media": {
    "samples/zh-CN-YunjianNeural.mp3": "https://cdn.zhangweivisual.cn/lib/samples/zh-CN-YunjianNeural.mp3"
  }
}
```

未配置时 `sampleUrl` / `audioUrl` 为空，索引照常生成，只是没有试听。

## 部署

`scripts/prepare-static.mjs` 的 `copyTargets` 已加入 `library-data`，`npm run prepare:static` 会把整个目录带进 `dist/`。单文件都很小（< 10 KB），不触发分片逻辑。
