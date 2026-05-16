import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");
const searchIndexPath = path.join(repoRoot, "prompts-data", "search-index.json");
const suggestionsPath = path.join(repoRoot, "prompts-data", "web-suggestions.json");

const EXPECTED_TOTAL = 5000;
const EXPECTED_GROUPS = new Map([
  ["图像/产品/广告", 1200],
  ["视频/短视频/分镜", 1200],
  ["电商/营销/文案", 900],
  ["音频/音乐/口播", 500],
  ["多模态工作流", 500],
  ["商业/SEO/自动化", 400],
  ["代码/Agent/工具流", 300]
]);

const requiredSections = [
  "角色定位：",
  "任务背景：",
  "直接复制使用：",
  "输出要求：",
  "质量标准：",
  "失败修正：",
  "边界提醒："
];

const highRiskPatterns = [
  /迪士尼|漫威|哈利波特|宝可梦|宫崎骏|吉卜力|任天堂|可口可乐|真实明星|Taylor Swift|Elon Musk|特朗普|拜登/i,
  /换脸|深度伪造|绕过审核|破解|盗版|赌博|毒品|武器制作|保证收益|治疗承诺|诊断处方|伪造证件/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b|github_pat_|ghp_[A-Za-z0-9_]{20,}/i
];

function fail(message) {
  throw new Error(message);
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
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
  return asArray(prompt.tags)
    .find((tag) => String(tag).startsWith(prefix))
    ?.slice(prefix.length)
    .trim() || "";
}

function assertNoMandatoryPlaceholders(prompt) {
  const body = String(prompt.body || "");
  const placeholderPatterns = [
    /\{[^}]{1,80}\}/,
    /\[[^\]]{1,80}\]/,
    /<[^>]{1,80}>/,
    /待填写|请补充|请提供更多信息|在此输入|变量一|变量二/
  ];
  for (const pattern of placeholderPatterns) {
    if (pattern.test(body)) fail(`${prompt.id} still contains mandatory placeholder-like text: ${pattern}`);
  }
}

const library = JSON.parse(await readFile(libraryPath, "utf8"));
const searchIndex = JSON.parse(await readFile(searchIndexPath, "utf8"));
const webSuggestions = JSON.parse(await readFile(suggestionsPath, "utf8"));
const prompts = asArray(library.prompts);

if (library.version < 3) fail(`Expected library version >= 3, got ${library.version}`);
if (prompts.length !== EXPECTED_TOTAL) fail(`Expected ${EXPECTED_TOTAL} total prompts, got ${prompts.length}`);
if (!library.siteSettings || typeof library.siteSettings !== "object") fail("library.siteSettings is required");
if (!asArray(library.siteSettings.hotKeywords).length) fail("library.siteSettings.hotKeywords is required");
if (asArray(library.plans).length < 2) fail("library.plans must contain contact/consulting plans");
if (!library.contact || typeof library.contact !== "object") fail("library.contact is required");

const duplicateIds = duplicates(prompts.map((item) => item.id));
const duplicateTitles = duplicates(prompts.map((item) => item.title));
if (duplicateIds.length) fail(`Duplicate prompt ids: ${duplicateIds.slice(0, 8).join(", ")}`);
if (duplicateTitles.length) fail(`Duplicate prompt titles: ${duplicateTitles.slice(0, 8).join(", ")}`);

const groupCounts = countBy(prompts.map((prompt) => prompt.useCase || tagValue(prompt, "库分类:") || "(missing)"));
for (const [group, expected] of EXPECTED_GROUPS) {
  const actual = groupCounts.get(group) || 0;
  if (actual !== expected) fail(`Expected ${expected} ${group} prompts, got ${actual}`);
}
if (groupCounts.has("(missing)")) fail(`${groupCounts.get("(missing)")} prompts are missing useCase`);

const accessCounts = countBy(prompts.map((prompt) => prompt.access));
for (const access of ["free", "pro", "pack"]) {
  if (!accessCounts.get(access)) fail(`Expected at least one semantic ${access} prompt`);
}

for (const prompt of prompts) {
  if (!String(prompt.id || "").startsWith("ready-")) fail(`${prompt.id} must use ready- id prefix`);
  if (!prompt.title || !prompt.category || !prompt.summary || !prompt.body) {
    fail(`Prompt has required empty field: ${prompt.id || prompt.title || "(unknown)"}`);
  }
  if (!["free", "pro", "pack"].includes(String(prompt.access || ""))) {
    fail(`${prompt.id} has invalid access: ${prompt.access}`);
  }
  if (prompt.access === "pack" && !prompt.packId) fail(`${prompt.id} is pack-themed but missing packId`);
  if (prompt.copyReady !== true) fail(`${prompt.id} must set copyReady: true`);
  if (prompt.promptKind !== "ready") fail(`${prompt.id} must set promptKind: ready`);
  if (prompt.sourcePolicy !== "original") fail(`${prompt.id} must set sourcePolicy: original`);
  if (!asArray(prompt.modelTargets).length) fail(`${prompt.id} missing modelTargets`);
  if (!prompt.useCase) fail(`${prompt.id} missing useCase`);
  if (!Number.isFinite(Number(prompt.qualityScore)) || Number(prompt.qualityScore) < 1 || Number(prompt.qualityScore) > 100) {
    fail(`${prompt.id} has invalid qualityScore: ${prompt.qualityScore}`);
  }
  if (!Array.isArray(prompt.seoKeywords) || prompt.seoKeywords.length < 5) {
    fail(`${prompt.id} missing seoKeywords`);
  }
  if (String(prompt.body).length < 900) fail(`${prompt.id} body is too short: ${String(prompt.body).length}`);
  for (const section of requiredSections) {
    if (!String(prompt.body).includes(section)) fail(`${prompt.id} missing section ${section}`);
  }
  for (const prefix of ["工具:", "模态:", "用途:", "库分类:"]) {
    if (!asArray(prompt.tags).some((tag) => String(tag).startsWith(prefix))) {
      fail(`${prompt.id} missing tag prefix ${prefix}`);
    }
  }
  assertNoMandatoryPlaceholders(prompt);
  const text = `${prompt.title}\n${prompt.summary}\n${prompt.body}`;
  for (const pattern of highRiskPatterns) {
    if (pattern.test(text)) fail(`${prompt.id} matched high-risk content pattern ${pattern}`);
  }
}

if (!searchIndex || searchIndex.version !== 1) fail("search-index.json must have version 1");
if (!Array.isArray(searchIndex.prompts) || searchIndex.prompts.length !== prompts.length) {
  fail(`search-index.json prompt count mismatch: ${searchIndex.prompts?.length || 0}`);
}
if (!Array.isArray(searchIndex.packs) || searchIndex.packs.length < EXPECTED_GROUPS.size) {
  fail("search-index.json must define package cards for all major prompt groups");
}
const indexIds = new Set(searchIndex.prompts.map((prompt) => prompt.id));
for (const prompt of prompts) {
  if (!indexIds.has(prompt.id)) fail(`search-index.json missing prompt ${prompt.id}`);
}
for (const entry of searchIndex.prompts) {
  if (Object.prototype.hasOwnProperty.call(entry, "body")) {
    fail(`search-index.json must not include prompt body: ${entry.id}`);
  }
  if (entry.copyReady !== true) fail(`search-index entry must remain copy-ready: ${entry.id}`);
  if (entry.sourcePolicy !== "original") fail(`search-index sourcePolicy mismatch: ${entry.id}`);
  if (!entry.searchable || String(entry.searchable).length < 40) {
    fail(`search-index.json entry has weak searchable text: ${entry.id}`);
  }
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

console.log("Copy-ready prompt library validation passed");
console.log(`Total prompts: ${prompts.length}`);
console.log(`Groups: ${[...groupCounts].map(([key, value]) => `${key}:${value}`).join(", ")}`);
console.log(`Access labels: ${[...accessCounts].map(([key, value]) => `${key}:${value}`).join(", ")}`);
console.log(`Search index prompts: ${searchIndex.prompts.length}`);
console.log(`Web suggestions: ${webSuggestions.suggestions.length}`);
