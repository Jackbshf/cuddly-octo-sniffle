import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");
const searchIndexPath = path.join(repoRoot, "prompts-data", "search-index.json");
const suggestionsPath = path.join(repoRoot, "prompts-data", "web-suggestions.json");
const shouldWriteLibrary = process.argv.includes("--write-library");

const packDefinitions = [
  {
    id: "video-commerce-pro",
    title: "短视频电商转化精选包",
    description: "围绕商品卖点、口播、分镜、剧情短视频和投放素材的高转化提示词组合。",
    audience: "电商商家 / 短视频团队",
    contactIntent: "video-commerce",
    keywords: ["视频", "短视频", "电商", "商品", "口播", "分镜", "剧情", "带货", "投放", "广告"]
  },
  {
    id: "image-product-pro",
    title: "商品视觉与海报精选包",
    description: "覆盖产品图、海报、详情页主图、KV、材质表现和品牌视觉方向。",
    audience: "品牌视觉 / 设计师",
    contactIntent: "image-product",
    keywords: ["图像", "产品", "商品", "海报", "视觉", "KV", "材质", "品牌", "摄影", "主图"]
  },
  {
    id: "multi-modal-studio-pro",
    title: "多模态创作流程精选包",
    description: "用于图像、视频、音频和文本之间的跨模态创意生产与复用流程。",
    audience: "AIGC 创作工作室",
    contactIntent: "multimodal-studio",
    keywords: ["多模态", "工作流", "图像", "视频", "音频", "脚本", "批量", "复用", "创作流程"]
  }
];

const trendSuggestions = [
  {
    id: "trend-commerce-video-hooks",
    keyword: "电商短视频开头钩子",
    theme: "用 3 秒开场、痛点对比和产品场景快速提高完播率。",
    intent: "video-commerce",
    priority: 95,
    suggestedFilters: ["视频", "电商", "口播", "分镜"],
    notes: "生成自写提示词时只借鉴结构：开场冲突、使用场景、卖点验证、行动指令。"
  },
  {
    id: "trend-product-visual-consistency",
    keyword: "商品图多角度一致性",
    theme: "统一产品外观、材质、灯光和构图，适合详情页和广告组图。",
    intent: "image-product",
    priority: 90,
    suggestedFilters: ["图像", "产品", "摄影", "一致性"],
    notes: "重点沉淀变量：产品材质、镜头角度、光源、背景、禁用变形。"
  },
  {
    id: "trend-ai-video-character-continuity",
    keyword: "AI 视频角色一致性",
    theme: "控制角色脸部、服装、动作和镜头衔接，减少生成视频跳变。",
    intent: "video-character",
    priority: 88,
    suggestedFilters: ["视频", "角色一致性", "分镜", "连续剧情"],
    notes: "建议写成可复用检查清单，不复制外站提示词原文。"
  },
  {
    id: "trend-audio-brand-voice",
    keyword: "品牌声音与口播音色",
    theme: "为短视频、电商广告和播客片头建立稳定声音设定。",
    intent: "audio-brand",
    priority: 76,
    suggestedFilters: ["音频", "口播", "品牌", "广告"],
    notes: "关注语速、情绪、停顿、禁用词和交付格式。"
  }
];

const text = (value = "") => String(value ?? "").trim();
const list = (value) => Array.isArray(value) ? value : [];
const unique = (values) => [...new Set(values.map((item) => text(item)).filter(Boolean))];
const lower = (value = "") => text(value).toLowerCase();

function tagValue(prompt, prefixes) {
  const tags = list(prompt.tags);
  for (const prefix of prefixes) {
    const found = tags.find((tag) => text(tag).startsWith(prefix));
    if (found) return text(found).slice(prefix.length).trim();
  }
  return "";
}

function inferModality(prompt) {
  return tagValue(prompt, ["模态:", "模态："]) || firstMatch(prompt, [
    ["视频", "视频"],
    ["图像", "图像"],
    ["音频", "音频"],
    ["多模态", "多模态"],
    ["代码", "代码"],
    ["文本", "文本"]
  ]) || "AIGC";
}

function firstMatch(prompt, pairs) {
  const haystack = lower(`${prompt.title} ${prompt.category} ${list(prompt.tags).join(" ")} ${prompt.summary}`);
  return pairs.find(([needle]) => haystack.includes(lower(needle)))?.[1] || "";
}

function inferTool(prompt) {
  return tagValue(prompt, ["工具:", "工具："]) || firstMatch(prompt, [
    ["Midjourney", "Midjourney"],
    ["Sora", "Sora"],
    ["Runway", "Runway"],
    ["Suno", "Suno"],
    ["ChatGPT", "ChatGPT"],
    ["GPT Image", "GPT Image"],
    ["Cursor", "Cursor"],
    ["Copilot", "GitHub Copilot"]
  ]) || "通用 AIGC";
}

function inferUse(prompt) {
  return tagValue(prompt, ["用途:", "用途："]) || prompt.category.split(/[ /｜|]/).filter(Boolean).slice(-1)[0] || "创作";
}

function inferDifficulty(prompt) {
  return tagValue(prompt, ["难度:", "难度："]) || (list(prompt.variables).length >= 7 ? "进阶" : "基础");
}

function scorePrompt(prompt) {
  let score = 56;
  const bodyLength = text(prompt.body).length;
  if (bodyLength >= 1000) score += 14;
  if (bodyLength >= 1600) score += 6;
  if (list(prompt.variables).length >= 5) score += 8;
  if (list(prompt.tags).length >= 5) score += 6;
  if (/推荐|精选|高质量|已验证/i.test(text(prompt.status))) score += 6;
  if (text(prompt.summary).length >= 24) score += 4;
  return Math.max(1, Math.min(100, Number(prompt.qualityScore) || score));
}

function selectPack(prompt) {
  const haystack = lower([
    prompt.title,
    prompt.category,
    prompt.summary,
    list(prompt.tags).join(" "),
    list(prompt.variables).join(" ")
  ].join(" "));
  let best = null;
  for (const pack of packDefinitions) {
    const hits = pack.keywords.filter((keyword) => haystack.includes(lower(keyword))).length;
    if (hits && (!best || hits > best.hits)) best = { pack, hits };
  }
  return best?.hits >= 2 ? best.pack.id : "";
}

function inferAccess(prompt, index, packId, qualityScore) {
  const current = text(prompt.access).toLowerCase();
  if (["free", "pro", "pack"].includes(current)) return current;
  if (packId && qualityScore >= 78 && index % 3 === 0) return "pack";
  if (qualityScore >= 86 && index % 5 === 0) return "pro";
  return "free";
}

function cleanKeyword(value) {
  return text(value)
    .replace(/[{}[\]【】"'`]/g, "")
    .replace(/\s+/g, " ")
    .slice(0, 48);
}

function seoKeywords(prompt, tool, modality, use) {
  const categoryParts = text(prompt.category).split(/[ /｜|,，、]/);
  const variableParts = list(prompt.variables).map(cleanKeyword);
  return unique([
    modality,
    tool,
    use,
    ...categoryParts,
    ...list(prompt.tags).map(cleanKeyword),
    ...variableParts
  ]).slice(0, 18);
}

function exampleOutputFor(prompt, modality, use) {
  if (text(prompt.exampleOutput)) return text(prompt.exampleOutput);
  if (modality.includes("视频")) return `输出一份可直接提交给视频模型的 ${use} 分镜、镜头运动、节奏和负面约束说明。`;
  if (modality.includes("图像")) return `输出一组适合 ${use} 的画面描述、构图、材质、光线和风格控制词。`;
  if (modality.includes("音频")) return `输出一份包含音色、情绪、节奏、停顿和交付格式的 ${use} 音频提示词。`;
  if (modality.includes("代码")) return `输出一份包含目标、约束、验收标准和边界条件的 ${use} 开发提示词。`;
  return `输出一份结构清晰、变量可替换、可直接复用的 ${use} AIGC 提示词。`;
}

function enhancedPrompt(prompt, index) {
  const tool = inferTool(prompt);
  const modality = inferModality(prompt);
  const use = inferUse(prompt);
  const difficulty = inferDifficulty(prompt);
  const qualityScore = scorePrompt(prompt);
  const packId = text(prompt.packId) || selectPack(prompt);
  const access = inferAccess(prompt, index, packId, qualityScore);
  return {
    ...prompt,
    access,
    packId: access === "pack" ? packId : text(prompt.packId),
    stripePriceId: text(prompt.stripePriceId),
    qualityScore,
    exampleOutput: exampleOutputFor(prompt, modality, use),
    sourceType: text(prompt.sourceType) || (String(prompt.id || "").startsWith("v2-") ? "generated-library" : "curated"),
    verifiedAt: text(prompt.verifiedAt) || text(prompt.updatedAt) || text(prompt.createdAt),
    seoKeywords: seoKeywords(prompt, tool, modality, use)
  };
}

function indexEntry(prompt) {
  const tool = inferTool(prompt);
  const modality = inferModality(prompt);
  const use = inferUse(prompt);
  const difficulty = inferDifficulty(prompt);
  const searchable = unique([
    prompt.title,
    prompt.category,
    prompt.summary,
    prompt.source,
    tool,
    modality,
    use,
    difficulty,
    ...list(prompt.tags),
    ...list(prompt.variables),
    ...list(prompt.seoKeywords)
  ]).join(" ").toLowerCase();

  return {
    id: prompt.id,
    title: prompt.title,
    category: prompt.category,
    summary: prompt.summary,
    tags: list(prompt.tags),
    variablesCount: list(prompt.variables).length,
    access: prompt.access,
    packId: prompt.packId || "",
    qualityScore: prompt.qualityScore,
    sourceType: prompt.sourceType,
    verifiedAt: prompt.verifiedAt,
    seoKeywords: list(prompt.seoKeywords),
    tool,
    modality,
    use,
    difficulty,
    archived: Boolean(prompt.archived),
    searchable
  };
}

const library = JSON.parse(await readFile(libraryPath, "utf8"));
const prompts = list(library.prompts).map(enhancedPrompt);
const enhancedLibrary = {
  ...library,
  version: Number(library.version) || 2,
  updatedAt: library.updatedAt || new Date().toISOString(),
  prompts
};

const activePrompts = prompts.filter((prompt) => !prompt.archived);
const counts = activePrompts.reduce((out, prompt) => {
  out[prompt.access] = (out[prompt.access] || 0) + 1;
  if (prompt.packId) out[prompt.packId] = (out[prompt.packId] || 0) + 1;
  return out;
}, {});

const searchIndex = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sourceVersion: enhancedLibrary.version,
  promptCount: prompts.length,
  activePromptCount: activePrompts.length,
  counts,
  packs: packDefinitions.map((pack) => ({
    ...pack,
    promptCount: activePrompts.filter((prompt) => prompt.packId === pack.id).length
  })),
  prompts: prompts.map(indexEntry)
};

const suggestions = {
  version: 1,
  generatedAt: new Date().toISOString(),
  reviewPolicy: "Use these as topic and structure inspiration only. Do not copy external prompt text.",
  sources: [
    { name: "PromptHero", url: "https://prompthero.com/", usage: "Search/filter interaction pattern reference" },
    { name: "PromptBase", url: "https://promptbase.com/", usage: "Prompt card and pack browsing pattern reference" },
    { name: "AIPRM Private Prompts", url: "https://www.aiprm.com/en-gb/features/private-team-prompts/", usage: "Private reuse and team prompt organization reference" }
  ],
  suggestions: trendSuggestions
};

if (shouldWriteLibrary) {
  await writeFile(libraryPath, `${JSON.stringify(enhancedLibrary, null, 2)}\n`, "utf8");
}
await writeFile(searchIndexPath, `${JSON.stringify(searchIndex, null, 2)}\n`, "utf8");
await writeFile(suggestionsPath, `${JSON.stringify(suggestions, null, 2)}\n`, "utf8");

console.log(`Prompt search index written: ${searchIndex.prompts.length} prompts`);
console.log(`Access counts: free=${counts.free || 0}, pro=${counts.pro || 0}, pack=${counts.pack || 0}`);
