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
    stripeEnv: "PROMPTS_STRIPE_PRICE_PACK_VIDEO_COMMERCE",
    keywords: ["视频", "短视频", "电商", "商品", "口播", "分镜", "剧情", "带货", "投放", "广告"]
  },
  {
    id: "image-product-pro",
    title: "商品视觉与海报精选包",
    description: "覆盖产品图、海报、详情页主图、KV、材质表现和品牌视觉方向。",
    audience: "品牌视觉 / 设计师",
    stripeEnv: "PROMPTS_STRIPE_PRICE_PACK_IMAGE_PRODUCT",
    keywords: ["图像", "产品", "商品", "海报", "视觉", "KV", "材质", "品牌", "摄影", "主图"]
  },
  {
    id: "multi-modal-studio-pro",
    title: "多模态创作流程精选包",
    description: "用于图像、视频、音频和文本之间的跨模态创意生产与复用流程。",
    audience: "AIGC 创作工作室",
    stripeEnv: "PROMPTS_STRIPE_PRICE_PACK_MULTIMODAL",
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
const COPY_READY_BODY_MIN_LENGTH = 700;

function hasTerm(value, terms) {
  const haystack = text(value);
  return terms.some((term) => haystack.includes(term));
}

function isGenericOnlyPrompt(value) {
  const body = text(value);
  if (body.length >= 180) return false;
  const genericWords = ["高清", "电影感", "真实感", "8K", "氛围感", "镜头感", "高级感", "大片感"];
  return genericWords.filter((word) => body.includes(word)).length >= 3;
}

function shortBodyExpansion(prompt, tool, modality, use) {
  const body = text(prompt.body);
  if (body.length >= COPY_READY_BODY_MIN_LENGTH && !isGenericOnlyPrompt(body)) return body;

  const common = [
    "复制即用补强模块：",
    `请使用 ${tool} 完成「${use}」任务。`,
    "输入变量：{主体/项目目标}、{使用场景}、{目标受众}、{风格方向}、{交付格式}、{限制条件}。",
    "成品提示词结构：角色设定、任务背景、具体步骤、可见画面或可听结果、参数建议、负面约束、输出格式、检查清单。",
    "输出要求：先复述任务目标，再给出可直接复制的完整提示词，最后列出负面约束、失败修正建议和验收标准。",
    "质量标准：主体明确、场景具体、变量可替换、输出格式稳定、边界清晰，不能只堆砌高清、电影感、8K、真实感等空泛词。",
    "边界提醒：不仿冒真实品牌、名人、受保护 IP 或第三方提示词原文；不生成规避审核、欺诈、侵权或保证效果的内容。"
  ];

  if (modality.includes("视频")) {
    common.push(
      "视频补强：明确主体运动、环境运动、镜头运动、节奏、时长、画幅比例、首尾帧衔接和图生视频一致性要求；图生视频不要重复描述图片已有元素，重点描述运动和变化。",
      "镜头语言：包含景别、构图、角度、焦段感、运镜方式、转场方式、光影、色彩、情绪和负面词。"
    );
  } else if (modality.includes("图像")) {
    common.push(
      "图像补强：明确主体、人数关系、动作、场景、景别、构图、镜头角度、焦段、光影、色彩、情绪、画幅比例和负面词。",
      "模型参数：如用于 Midjourney，请补充 --ar、--style raw、--v、--no 等适配参数；如用于 SDXL，请补充正向提示词、负面提示词和尺寸建议。"
    );
  } else if (modality.includes("音频")) {
    common.push(
      "音频补强：明确曲风、BPM、情绪、乐器、人声、结构段落、时长、循环方式和禁止模仿真实歌手或已有歌曲。"
    );
  } else {
    common.push(
      "通用补强：明确角色、上下文、执行步骤、输出格式、判断依据、风险边界和下一步动作。"
    );
  }

  return [body, common.join("\n")].filter(Boolean).join("\n\n");
}

function structuredVisualExpansion(prompt, body) {
  const haystack = [
    prompt.title,
    prompt.category,
    prompt.summary,
    list(prompt.tags).join(" "),
    prompt.contentType,
    body
  ].join("\n");
  const additions = [];

  if (hasTerm(haystack, ["多宫格", "九宫格", "分镜", "multi-panel", "storyboard"]) && !hasTerm(haystack, ["逐格", "编号", "从左到右", "从上到下", "统一角色", "统一场景"])) {
    additions.push([
      "多宫格/分镜补强：",
      "- 逐格编号：按镜头 1、镜头 2、镜头 3 或从左到右、从上到下描述，不把多个画面混成一句。",
      "- 统一角色：每一格保持同一原创角色的身份、服装、脸部特征、道具和主次关系。",
      "- 统一场景：每一格保持同一空间逻辑、时间段、色彩、光影和镜头风格，只有动作和景别按编号变化。",
      "- 输出要求：每格都写清主体位置、动作、景别、构图、镜头角度、焦段感、光线方向、结尾状态和负面约束。"
    ].join("\n"));
  }

  if (hasTerm(haystack, ["多人", "群像", "对话", "multi-person"]) && !hasTerm(haystack, ["站位", "主次关系", "左侧", "右侧"])) {
    additions.push([
      "多人画面补强：",
      "- 明确每个人的位置、身份、动作、视线方向和主次关系。",
      "- 左侧、右侧、前景、中景、背景分别描述，避免脸部混乱、身体重叠或身份互换。"
    ].join("\n"));
  }

  return additions.length ? `${body}\n\n${additions.join("\n\n")}` : body;
}

function buildQualityAudit(prompt, tool, modality) {
  const body = text(prompt.body);
  const allText = [
    prompt.title,
    prompt.category,
    list(prompt.tags).join(" "),
    list(prompt.variables).join(" "),
    prompt.summary,
    body,
    prompt.copyPrompt,
    prompt.negativePrompt,
    prompt.zhPrompt,
    prompt.enPrompt,
    prompt.mjPrompt,
    prompt.videoPrompt,
    prompt.usageTips,
    prompt.parameterTips
  ].join("\n");
  const variables = list(prompt.variables);
  const missing = [];
  const addMissing = (label, ok) => {
    if (!ok) missing.push(label);
  };

  const genericOnly = isGenericOnlyPrompt(body);
  addMissing("正文过短或空泛", body.length >= COPY_READY_BODY_MIN_LENGTH && !genericOnly);
  addMissing("可替换输入变量", variables.length >= 3 || /[{<].{1,28}[}>]/.test(body) || hasTerm(body, ["输入变量", "变量"]));
  addMissing("输出格式或交付目标", hasTerm(body, ["输出", "交付", "格式", "结果", "目标"]));
  addMissing("质量标准或验收标准", hasTerm(body, ["质量标准", "验收", "标准", "失败修正", "常见失败", "迭代"]));
  addMissing("负面词或边界约束", hasTerm(body, ["负面", "不要", "避免", "排除", "--no", "边界", "限制", "禁止"]));

  if (modality.includes("图像")) {
    addMissing("图像主体/场景/动作", hasTerm(allText, ["主体", "人物", "产品", "角色", "场景", "动作", "姿态"]));
    addMissing("图像构图/景别/镜头", hasTerm(allText, ["构图", "景别", "镜头", "角度", "焦段", "视角"]));
    addMissing("图像光影/色彩/情绪", hasTerm(allText, ["光影", "光线", "色彩", "情绪", "氛围"]));
    addMissing("图像画幅比例", hasTerm(allText, ["画幅", "比例", "--ar", "9:16", "16:9", "1:1", "3:4", "4:5"]));
  }

  if (modality.includes("视频")) {
    addMissing("视频主体运动", hasTerm(allText, ["主体运动", "人物动作", "运动", "动作", "移动", "行走", "转身"]));
    addMissing("视频镜头运动", hasTerm(allText, ["镜头运动", "运镜", "推镜", "跟拍", "平移", "环绕", "转场"]));
    addMissing("视频节奏/时长", hasTerm(allText, ["节奏", "时长", "秒", "开头", "中段", "结尾", "首尾帧"]));
    addMissing("视频一致性约束", hasTerm(allText, ["一致性", "连续", "首尾帧", "图生视频", "不跳帧", "不换人", "不变脸"]));
  }

  if (/Midjourney/i.test(allText)) {
    addMissing("Midjourney 参数", /--ar\b/.test(allText) && (/--no\b/.test(allText) || hasTerm(allText, ["负面", "排除"])) && (/--v\b|--style\b/.test(allText)));
  }

  if (/Runway|Veo|可灵|即梦|Kling|Jimeng/i.test(allText)) {
    addMissing("视频模型运动重点", hasTerm(allText, ["运动", "变化", "镜头", "运镜", "节奏", "首尾帧"]));
  }

  if (hasTerm(allText, ["多人", "群像", "对话", "对白"])) {
    addMissing("多人位置/身份/关系", hasTerm(allText, ["位置", "站位", "身份", "角色", "关系", "主次"]));
  }

  if (hasTerm(allText, ["宫格", "多宫格", "九宫格", "分镜"])) {
    addMissing("多宫格逐格与统一性", hasTerm(allText, ["逐格", "编号", "从左到右", "从上到下", "统一", "连续"]));
  }

  const criticalFields = new Set([
    "正文过短或空泛",
    "Midjourney 参数",
    "视频模型运动重点",
    "视频一致性约束",
    "多人位置/身份/关系"
  ]);
  const hasCriticalGap = missing.some((field) => criticalFields.has(field));
  const copyReady = !hasCriticalGap && missing.length <= 2;
  const qualityLevel = copyReady && missing.length === 0 && body.length >= 1200 && variables.length >= 5
    ? "professional"
    : copyReady
      ? "usable"
      : "basic";
  const improvementSuggestion = copyReady
    ? "已具备直接复制使用的主要结构，建议继续用真实生成结果回填示例和失败修正。"
    : `优先补齐：${missing.slice(0, 5).join("、")}。不要把空泛风格词当成完整提示词。`;

  return {
    copyReady,
    qualityLevel,
    missingFields: missing,
    improvementSuggestion
  };
}

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
    ["音频", "音频"],
    ["音乐", "音频"],
    ["歌曲", "音频"],
    ["视频", "视频"],
    ["图像", "图像"],
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
  const body = structuredVisualExpansion(prompt, shortBodyExpansion(prompt, tool, modality, use));
  const bodyEnhancedPrompt = { ...prompt, body };
  const qualityAudit = buildQualityAudit(bodyEnhancedPrompt, tool, modality);
  const qualityScore = scorePrompt(bodyEnhancedPrompt);
  const packId = text(prompt.packId) || selectPack(prompt);
  const access = inferAccess(prompt, index, packId, qualityScore);
  return {
    ...prompt,
    body,
    access,
    packId: access === "pack" ? packId : text(prompt.packId),
    stripePriceId: text(prompt.stripePriceId),
    qualityScore,
    exampleOutput: exampleOutputFor(prompt, modality, use),
    sourceType: text(prompt.sourceType) || (String(prompt.id || "").startsWith("v2-") ? "generated-library" : "curated"),
    verifiedAt: text(prompt.verifiedAt) || text(prompt.updatedAt) || text(prompt.createdAt),
    seoKeywords: seoKeywords(prompt, tool, modality, use),
    qualityAudit
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
    prompt.contentType,
    prompt.promptKind,
    prompt.platform,
    prompt.model,
    prompt.language,
    prompt.subjectCount,
    prompt.gridType,
    prompt.aspectRatio,
    prompt.copyPrompt,
    prompt.negativePrompt,
    prompt.usageTips,
    prompt.parameterTips,
    ...Object.values(prompt.variableDefaults || {}),
    ...list(prompt.shotSize),
    ...list(prompt.cameraAngle),
    ...list(prompt.cameraMovement),
    ...list(prompt.lighting),
    ...list(prompt.colorGrade),
    ...list(prompt.mood),
    ...list(prompt.styleTags),
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
    copyReady: Boolean(prompt.qualityAudit?.copyReady),
    qualityLevel: prompt.qualityAudit?.qualityLevel || "basic",
    missingFields: list(prompt.qualityAudit?.missingFields),
    improvementSuggestion: text(prompt.qualityAudit?.improvementSuggestion),
    sourceType: prompt.sourceType,
    verifiedAt: prompt.verifiedAt,
    seoKeywords: list(prompt.seoKeywords),
    contentType: text(prompt.contentType),
    promptKind: text(prompt.promptKind),
    platform: text(prompt.platform),
    model: text(prompt.model),
    language: text(prompt.language),
    parameterTips: text(prompt.parameterTips),
    subjectCount: text(prompt.subjectCount),
    gridType: text(prompt.gridType),
    aspectRatio: text(prompt.aspectRatio),
    shotSize: list(prompt.shotSize),
    cameraAngle: list(prompt.cameraAngle),
    cameraMovement: list(prompt.cameraMovement),
    lighting: list(prompt.lighting),
    colorGrade: list(prompt.colorGrade),
    mood: list(prompt.mood),
    styleTags: list(prompt.styleTags),
    tool,
    modality,
    use,
    difficulty,
    archived: Boolean(prompt.archived),
    searchable
  };
}

// ---------------------------------------------------------------- 资源库（音色 / 文本 / 音乐）
// 数据在 library-data/，媒体文件在 R2，索引里只放元数据 + 公网 URL。
const libraryDataDir = path.join(repoRoot, "library-data");

async function readLibraryJson(relativePath) {
  try {
    return JSON.parse(await readFile(path.join(libraryDataDir, relativePath), "utf8"));
  } catch (error) {
    console.warn(`[library-data] skipped ${relativePath}: ${error.message}`);
    return null;
  }
}

function librarySearchable(fields) {
  return fields.flat().map((item) => text(item)).filter(Boolean).join(" ").toLowerCase();
}

function voiceEntry(voice, mediaUrl) {
  return {
    id: text(voice.id),
    name: text(voice.name),
    sex: text(voice.sex),
    styles: list(voice.styles),
    uses: list(voice.uses),
    provider: text(voice.provider),
    status: text(voice.status) || "disabled",
    sampleUrl: mediaUrl || "",
    license: text(voice.license),
    searchable: librarySearchable([
      voice.name, voice.sex, voice.provider, voice.license,
      list(voice.styles), list(voice.uses), voice.id
    ])
  };
}

function bgmEntry(track, mediaUrl) {
  return {
    id: text(track.id),
    title: text(track.title),
    style: text(track.style),
    instruments: list(track.instruments),
    mood: list(track.mood),
    bpm: Number(track.bpm) || 0,
    key: text(track.key),
    loopable: Boolean(track.loopable),
    usage: text(track.usage),
    license: text(track.license),
    audioUrl: mediaUrl || "",
    searchable: librarySearchable([
      track.title, track.style, track.key, track.usage, track.license,
      list(track.instruments), list(track.mood), track.id, String(track.bpm || "")
    ])
  };
}

function textEntry(doc, sourceFile) {
  const lines = list(doc.lines).map((line) => ({
    id: text(line.id),
    glyph: text(line.glyph),
    label: text(line.label),
    sub: text(line.sub),
    voice: text(line.voice),
    mode: text(line.mode)
  }));
  return {
    id: text(doc.id) || path.basename(sourceFile, ".json"),
    kind: text(doc.kind) || "copy",
    title: text(doc.title),
    topic: text(doc.topic),
    tone: text(doc.tone),
    lineCount: lines.length,
    lines,
    sourceFile,
    searchable: librarySearchable([
      doc.title, doc.topic, doc.tone, doc.kind,
      lines.map((line) => [line.glyph, line.label, line.sub, line.voice])
    ])
  };
}

const mediaManifest = (await readLibraryJson("media-manifest.json")) || { baseUrl: "", media: {} };
const mediaBaseUrl = text(mediaManifest.baseUrl).replace(/\/+$/, "");
const mediaUrl = (relativePath) => {
  const key = text(relativePath);
  if (!key) return "";
  const mapped = mediaManifest.media?.[key];
  if (mapped) return mapped;
  return mediaBaseUrl ? `${mediaBaseUrl}/${key}` : "";
};

const voicesDoc = await readLibraryJson("voices.json");
const bgmDoc = await readLibraryJson("bgm.json");
const textLibraryIndex = await readLibraryJson("text/index.json");
const textDocs = [];
for (const entry of list(textLibraryIndex?.files)) {
  const file = text(entry.file);
  if (!file) continue;
  const doc = await readLibraryJson(`text/${file}`);
  if (doc) textDocs.push(textEntry(doc, `text/${file}`));
}
const outOfLineTexts = await readLibraryJson("text/hooks.json");
const outOfLineEndings = await readLibraryJson("text/endings.json");
for (const [kind, doc, file] of [["hooks", outOfLineTexts, "text/hooks.json"], ["endings", outOfLineEndings, "text/endings.json"]]) {
  for (const item of list(doc?.items)) {
    textDocs.push(textEntry({ ...item, kind, title: item.text }, file));
  }
}

const libraryIndex = {
  version: 1,
  generatedAt: new Date().toISOString(),
  mediaBaseUrl,
  voices: list(voicesDoc?.voices).map((voice) => voiceEntry(voice, mediaUrl(voice.sample))),
  bgm: list(bgmDoc?.tracks).map((track) => bgmEntry(track, mediaUrl(track.file))),
  text: textDocs
};
const libraryItemCount = libraryIndex.voices.length + libraryIndex.bgm.length + libraryIndex.text.length;

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
  prompts: prompts.map(indexEntry),
  library: libraryIndex,
  libraryCount: {
    voices: libraryIndex.voices.length,
    bgm: libraryIndex.bgm.length,
    text: libraryIndex.text.length,
    total: libraryItemCount
  }
};

const suggestions = {
  version: 1,
  generatedAt: new Date().toISOString(),
  reviewPolicy: "Use these as topic and structure inspiration only. Do not copy external prompt text.",
  sources: [
    { name: "PromptHero", url: "https://prompthero.com/", usage: "Search/filter interaction pattern reference" },
    { name: "PromptBase", url: "https://promptbase.com/", usage: "Paid prompt card and pack commerce pattern reference" },
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
console.log(`Library index included: ${libraryIndex.voices.length} voices, ${libraryIndex.bgm.length} bgm, ${libraryIndex.text.length} texts`);
console.log(`Access counts: free=${counts.free || 0}, pro=${counts.pro || 0}, pack=${counts.pack || 0}`);
