import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");
const searchIndexPath = path.join(repoRoot, "prompts-data", "search-index.json");
const suggestionsPath = path.join(repoRoot, "prompts-data", "web-suggestions.json");

const OLD_PREFIX = "general-template-";
const V2_PREFIX = "v2-";
const EXPECTED_TOTAL = 1930;
const EXPECTED_V2 = 1800;
const EXPECTED_PRESERVED = 130;
const EXPECTED_CINEMATIC = 120;

const expectedModalityCounts = new Map([
  ["图像", 500],
  ["视频", 500],
  ["音频", 200],
  ["多模态", 150],
  ["文本", 250],
  ["代码", 150],
  ["元提示词", 50]
]);

const requiredSections = [
  "适用工具：",
  "适用场景：",
  "输入变量：",
  "复制即用提示词：",
  "质量标准：",
  "参数/设置建议：",
  "迭代方法：",
  "常见失败修正：",
  "边界提醒："
];

const highRiskPatterns = [
  /迪士尼|漫威|哈利波特|宝可梦|宫崎骏|吉卜力|任天堂|可口可乐|苹果公司|耐克|麦当劳/i,
  /周杰伦|成龙|刘德华|Taylor Swift|Elon Musk|特朗普|拜登/i,
  /换脸|深度伪造|绕过审核|破解|盗版|赌博|毒品|武器制作|保证收益|治疗承诺|诊断处方|伪造证件/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b|github_pat_|ghp_[A-Za-z0-9_]{20,}/i
];

function fail(message) {
  throw new Error(message);
}

function countBy(values) {
  const out = new Map();
  for (const value of values) out.set(value, (out.get(value) || 0) + 1);
  return out;
}

function duplicates(values) {
  return [...countBy(values)].filter(([, count]) => count > 1).map(([value]) => value);
}

function tagValue(prompt, prefix) {
  return (Array.isArray(prompt.tags) ? prompt.tags : [])
    .find((tag) => String(tag).startsWith(prefix))
    ?.slice(prefix.length);
}

function normalizeText(value) {
  return String(value || "")
    .replace(/[0-9０-９]+/g, "")
    .replace(/[{}【】「」“”"'`，。；：、,.!?！？\s-]+/g, "")
    .toLowerCase();
}

function shingles(value, size = 5) {
  const text = normalizeText(value);
  const out = new Set();
  for (let index = 0; index <= text.length - size; index += 1) {
    out.add(text.slice(index, index + size));
  }
  return out;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let overlap = 0;
  for (const item of a) if (b.has(item)) overlap += 1;
  return overlap / (a.size + b.size - overlap);
}

const library = JSON.parse(await readFile(libraryPath, "utf8"));
const searchIndex = JSON.parse(await readFile(searchIndexPath, "utf8"));
const webSuggestions = JSON.parse(await readFile(suggestionsPath, "utf8"));
const prompts = Array.isArray(library.prompts) ? library.prompts : fail("prompts must be an array");
const v2 = prompts.filter((item) => String(item?.id || "").startsWith(V2_PREFIX));
const old = prompts.filter((item) => String(item?.id || "").startsWith(OLD_PREFIX));
const preserved = prompts.filter((item) => {
  const id = String(item?.id || "");
  return !id.startsWith(V2_PREFIX) && !id.startsWith(OLD_PREFIX);
});
const cinematic = prompts.filter((item) => String(item?.id || "").startsWith("cinematic-"));

if (prompts.length !== EXPECTED_TOTAL) fail(`Expected ${EXPECTED_TOTAL} total prompts, got ${prompts.length}`);
if (v2.length !== EXPECTED_V2) fail(`Expected ${EXPECTED_V2} v2 prompts, got ${v2.length}`);
if (old.length !== 0) fail(`Expected 0 old ${OLD_PREFIX} prompts, got ${old.length}`);
if (preserved.length !== EXPECTED_PRESERVED) fail(`Expected ${EXPECTED_PRESERVED} preserved prompts, got ${preserved.length}`);
if (cinematic.length !== EXPECTED_CINEMATIC) fail(`Expected ${EXPECTED_CINEMATIC} cinematic prompts, got ${cinematic.length}`);

const duplicateIds = duplicates(prompts.map((item) => item.id));
const duplicateTitles = duplicates(prompts.map((item) => item.title));
if (duplicateIds.length) fail(`Duplicate prompt ids: ${duplicateIds.slice(0, 8).join(", ")}`);
if (duplicateTitles.length) fail(`Duplicate prompt titles: ${duplicateTitles.slice(0, 8).join(", ")}`);

for (const prompt of prompts) {
  if (!prompt.id || !prompt.title || !prompt.category || !prompt.body) {
    fail(`Prompt has required empty field: ${prompt.id || prompt.title || "(unknown)"}`);
  }
  if (!["free", "pro", "pack"].includes(String(prompt.access || ""))) {
    fail(`${prompt.id} has invalid access: ${prompt.access}`);
  }
  if (!Number.isFinite(Number(prompt.qualityScore)) || Number(prompt.qualityScore) < 1 || Number(prompt.qualityScore) > 100) {
    fail(`${prompt.id} has invalid qualityScore: ${prompt.qualityScore}`);
  }
  if (!prompt.sourceType) fail(`${prompt.id} missing sourceType`);
  if (!prompt.verifiedAt) fail(`${prompt.id} missing verifiedAt`);
  if (!Array.isArray(prompt.seoKeywords) || !prompt.seoKeywords.length) {
    fail(`${prompt.id} missing seoKeywords`);
  }
  const audit = prompt.qualityAudit;
  if (!audit || typeof audit !== "object") fail(`${prompt.id} missing qualityAudit`);
  if (typeof audit.copyReady !== "boolean") fail(`${prompt.id} qualityAudit.copyReady must be boolean`);
  if (!["basic", "usable", "professional"].includes(String(audit.qualityLevel || ""))) {
    fail(`${prompt.id} has invalid qualityAudit.qualityLevel: ${audit.qualityLevel}`);
  }
  if (!Array.isArray(audit.missingFields)) fail(`${prompt.id} qualityAudit.missingFields must be an array`);
  if (typeof audit.improvementSuggestion !== "string" || !audit.improvementSuggestion.trim()) {
    fail(`${prompt.id} missing qualityAudit.improvementSuggestion`);
  }
  if (audit.copyReady && audit.qualityLevel === "basic") {
    fail(`${prompt.id} is copyReady but still basic`);
  }
  if (!audit.copyReady && audit.missingFields.length === 0) {
    fail(`${prompt.id} is not copyReady but has no missingFields`);
  }
  if (prompt.access === "pack" && !prompt.packId) {
    fail(`${prompt.id} is pack-gated but missing packId`);
  }
}

const modalityCounts = countBy(v2.map((prompt) => tagValue(prompt, "模态:") || "(missing)"));
for (const [modality, expected] of expectedModalityCounts) {
  const actual = modalityCounts.get(modality) || 0;
  if (actual !== expected) fail(`Expected ${expected} ${modality} prompts, got ${actual}`);
}
if (modalityCounts.has("(missing)")) fail(`${modalityCounts.get("(missing)")} v2 prompts are missing modality tags`);

for (const prompt of v2) {
  const text = `${prompt.title}\n${prompt.summary}\n${prompt.body}`;
  for (const section of requiredSections) {
    if (!prompt.body.includes(section)) fail(`${prompt.id} missing section ${section}`);
  }
  if (prompt.body.length < 1050) fail(`${prompt.id} body is too short: ${prompt.body.length}`);
  if (!Array.isArray(prompt.variables) || prompt.variables.length < 5) fail(`${prompt.id} has too few variables`);
  for (const prefix of ["工具:", "模态:", "用途:", "难度:", "官方结构参考:"]) {
    if (!prompt.tags.some((tag) => String(tag).startsWith(prefix))) fail(`${prompt.id} missing tag prefix ${prefix}`);
  }
  const tool = tagValue(prompt, "工具:");
  if (tool && !prompt.body.includes(tool)) fail(`${prompt.id} tool tag does not match body: ${tool}`);
  for (const pattern of highRiskPatterns) {
    if (pattern.test(text)) fail(`${prompt.id} matched high-risk content pattern ${pattern}`);
  }
}

for (const [category, items] of countGrouped(v2, (prompt) => prompt.category)) {
  const shingleCache = items.map((prompt) => [prompt, shingles(prompt.body)]);
  for (let i = 0; i < shingleCache.length; i += 1) {
    for (let j = i + 1; j < shingleCache.length; j += 1) {
      const score = jaccard(shingleCache[i][1], shingleCache[j][1]);
      if (score > 0.94) {
        fail(`Near-duplicate prompts in ${category}: ${shingleCache[i][0].id} and ${shingleCache[j][0].id} (${score.toFixed(3)})`);
      }
    }
  }
}

const expectedCinematicCounts = new Map([
  ["single-person-image", 25],
  ["multi-person-image", 25],
  ["single-panel-image", 25],
  ["multi-panel-image", 25]
]);
const cinematicCounts = countBy(cinematic.map((prompt) => prompt.contentType));
for (const [contentType, expected] of expectedCinematicCounts) {
  const actual = cinematicCounts.get(contentType) || 0;
  if (actual !== expected) fail(`Expected ${expected} cinematic ${contentType} prompts, got ${actual}`);
}
const cinematicVideoCount = ["text-to-video", "image-to-video", "storyboard"]
  .reduce((sum, contentType) => sum + (cinematicCounts.get(contentType) || 0), 0);
if (cinematicVideoCount !== 20) fail(`Expected 20 cinematic video prompts, got ${cinematicVideoCount}`);

const allowedCinematicContentTypes = new Set([
  "single-person-image",
  "multi-person-image",
  "single-panel-image",
  "multi-panel-image",
  "text-to-video",
  "image-to-video",
  "storyboard"
]);
const allowedCinematicModels = new Set([
  "universal",
  "midjourney",
  "runway",
  "veo",
  "kling",
  "seedance",
  "stable-diffusion"
]);
const requiredCinematicTextFields = [
  "zhPrompt",
  "enPrompt",
  "mjPrompt",
  "videoPrompt",
  "negativePrompt",
  "copyPrompt",
  "usageTips"
];
const requiredCinematicArrayFields = [
  "shotSize",
  "cameraAngle",
  "cameraMovement",
  "lighting",
  "colorGrade",
  "mood",
  "styleTags",
  "failureReasons",
  "optimizationTips"
];
const cinematicRiskPatterns = [
  /王家卫|宫崎骏|吉卜力|迪士尼|漫威|哈利波特|宝可梦|任天堂/i,
  /周杰伦|成龙|刘德华|Taylor Swift|Elon Musk|特朗普|拜登/i,
  /色情|未成年人|血腥|真实商标|真实明星|公众人物脸/i,
  /\bundefined\b|\bnull\b|\bNaN\b/i
];

for (const prompt of cinematic) {
  if (!allowedCinematicContentTypes.has(String(prompt.contentType || ""))) {
    fail(`${prompt.id} has invalid cinematic contentType: ${prompt.contentType}`);
  }
  if (!allowedCinematicModels.has(String(prompt.model || ""))) {
    fail(`${prompt.id} has invalid cinematic model: ${prompt.model}`);
  }
  if (prompt.access !== "free") fail(`${prompt.id} cinematic prompt must be free`);
  if (!String(prompt.category || "").startsWith("影视提示词 / ")) {
    fail(`${prompt.id} cinematic category must start with 影视提示词 /`);
  }
  if (!Array.isArray(prompt.variables) || prompt.variables.length < 8) {
    fail(`${prompt.id} cinematic prompt has too few variables`);
  }
  for (const variable of prompt.variables) {
    if (!/^{{[a-zA-Z][a-zA-Z0-9]*}}$/.test(String(variable))) {
      fail(`${prompt.id} has invalid variable token: ${variable}`);
    }
  }
  for (const field of requiredCinematicTextFields) {
    if (!String(prompt[field] || "").trim()) fail(`${prompt.id} missing cinematic field ${field}`);
  }
  for (const field of requiredCinematicArrayFields) {
    if (!Array.isArray(prompt[field]) || !prompt[field].length) {
      fail(`${prompt.id} missing cinematic array field ${field}`);
    }
  }
  if (!prompt.variableDefaults || typeof prompt.variableDefaults !== "object") {
    fail(`${prompt.id} missing variableDefaults`);
  }
  for (const key of ["subject", "scene", "mood", "clothing", "lighting", "camera", "aspectRatio", "style"]) {
    if (!String(prompt.variableDefaults[key] || "").trim()) {
      fail(`${prompt.id} missing variableDefaults.${key}`);
    }
  }
  if (!prompt.mjPrompt.includes("--ar") || !/--ar\s+\S+/.test(prompt.mjPrompt)) {
    fail(`${prompt.id} missing Midjourney --ar parameter`);
  }
  if (prompt.copyPrompt !== prompt.zhPrompt) fail(`${prompt.id} copyPrompt must match zhPrompt`);
  const serialized = JSON.stringify(prompt);
  for (const pattern of cinematicRiskPatterns) {
    if (pattern.test(serialized)) fail(`${prompt.id} matched cinematic risk pattern ${pattern}`);
  }
}

if (!searchIndex || searchIndex.version !== 1) fail("search-index.json must have version 1");
if (!Array.isArray(searchIndex.prompts) || searchIndex.prompts.length !== prompts.length) {
  fail(`search-index.json prompt count mismatch: ${searchIndex.prompts?.length || 0}`);
}
if (!Array.isArray(searchIndex.packs) || searchIndex.packs.length < 3) {
  fail("search-index.json must define commerce packs");
}
const indexIds = new Set(searchIndex.prompts.map((prompt) => prompt.id));
for (const prompt of prompts) {
  if (!indexIds.has(prompt.id)) fail(`search-index.json missing prompt ${prompt.id}`);
}
const accessCounts = countBy(prompts.map((prompt) => prompt.access));
for (const access of ["free", "pro", "pack"]) {
  if (!accessCounts.get(access)) fail(`Expected at least one ${access} prompt`);
}
for (const entry of searchIndex.prompts) {
  if (Object.prototype.hasOwnProperty.call(entry, "body")) {
    fail(`search-index.json must not include prompt body: ${entry.id}`);
  }
  if (!entry.searchable || String(entry.searchable).length < 20) {
    fail(`search-index.json entry has weak searchable text: ${entry.id}`);
  }
  if (typeof entry.copyReady !== "boolean") fail(`search-index.json entry missing copyReady: ${entry.id}`);
  if (!["basic", "usable", "professional"].includes(String(entry.qualityLevel || ""))) {
    fail(`search-index.json entry has invalid qualityLevel: ${entry.id}`);
  }
  if (!Array.isArray(entry.missingFields)) fail(`search-index.json entry missing missingFields: ${entry.id}`);
}

if (!webSuggestions || webSuggestions.version !== 1) fail("web-suggestions.json must have version 1");
if (!Array.isArray(webSuggestions.suggestions) || webSuggestions.suggestions.length < 3) {
  fail("web-suggestions.json must contain reviewable suggestions");
}
for (const suggestion of webSuggestions.suggestions) {
  const serialized = JSON.stringify(suggestion);
  if (/"(body|promptBody|originalPrompt)"\s*:/.test(serialized)) {
    fail(`web suggestion must not store external prompt text: ${suggestion.id || suggestion.keyword}`);
  }
}

function countGrouped(values, keyFn) {
  const out = new Map();
  for (const value of values) {
    const key = keyFn(value);
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(value);
  }
  return out;
}

console.log("Prompt library validation passed");
console.log(`Total prompts: ${prompts.length}`);
console.log(`V2 prompts: ${v2.length}`);
console.log(`Preserved prompts: ${preserved.length}`);
console.log(`Cinematic prompts: ${cinematic.length}`);
console.log(`Old general-template prompts: ${old.length}`);
console.log(`Modalities: ${[...modalityCounts].map(([key, value]) => `${key}:${value}`).join(", ")}`);
console.log(`Access: ${[...accessCounts].map(([key, value]) => `${key}:${value}`).join(", ")}`);
console.log(`Search index prompts: ${searchIndex.prompts.length}`);
console.log(`Web suggestions: ${webSuggestions.suggestions.length}`);
