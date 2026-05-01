import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");

const OLD_PREFIX = "general-template-";
const V2_PREFIX = "v2-";
const EXPECTED_TOTAL = 1810;
const EXPECTED_V2 = 1800;
const EXPECTED_PRESERVED = 10;

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
const prompts = Array.isArray(library.prompts) ? library.prompts : fail("prompts must be an array");
const v2 = prompts.filter((item) => String(item?.id || "").startsWith(V2_PREFIX));
const old = prompts.filter((item) => String(item?.id || "").startsWith(OLD_PREFIX));
const preserved = prompts.filter((item) => {
  const id = String(item?.id || "");
  return !id.startsWith(V2_PREFIX) && !id.startsWith(OLD_PREFIX);
});

if (prompts.length !== EXPECTED_TOTAL) fail(`Expected ${EXPECTED_TOTAL} total prompts, got ${prompts.length}`);
if (v2.length !== EXPECTED_V2) fail(`Expected ${EXPECTED_V2} v2 prompts, got ${v2.length}`);
if (old.length !== 0) fail(`Expected 0 old ${OLD_PREFIX} prompts, got ${old.length}`);
if (preserved.length !== EXPECTED_PRESERVED) fail(`Expected ${EXPECTED_PRESERVED} preserved prompts, got ${preserved.length}`);

const duplicateIds = duplicates(prompts.map((item) => item.id));
const duplicateTitles = duplicates(prompts.map((item) => item.title));
if (duplicateIds.length) fail(`Duplicate prompt ids: ${duplicateIds.slice(0, 8).join(", ")}`);
if (duplicateTitles.length) fail(`Duplicate prompt titles: ${duplicateTitles.slice(0, 8).join(", ")}`);

for (const prompt of prompts) {
  if (!prompt.id || !prompt.title || !prompt.category || !prompt.body) {
    fail(`Prompt has required empty field: ${prompt.id || prompt.title || "(unknown)"}`);
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
console.log(`Old general-template prompts: ${old.length}`);
console.log(`Modalities: ${[...modalityCounts].map(([key, value]) => `${key}:${value}`).join(", ")}`);
