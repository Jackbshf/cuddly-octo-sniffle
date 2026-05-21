import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PROMPT_SETTINGS,
  classifyPrompt,
  flattenTaxonomy
} from "./taxonomy.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");
const databaseName = "zhangwei-prompts";
const args = new Set(process.argv.slice(2));
const isRemote = args.has("--remote");
const writeOnly = args.has("--write-only");
const verbose = args.has("--verbose");
const persistToArg = process.argv.find((arg) => arg.startsWith("--persist-to="));
const localPersistTo = persistToArg
  ? persistToArg.slice("--persist-to=".length)
  : ".wrangler/prompt-workbench-state";
const sqlOutputArg = process.argv.find((arg) => arg.startsWith("--output="));
const sqlOutputPath = sqlOutputArg
  ? path.resolve(repoRoot, sqlOutputArg.slice("--output=".length))
  : path.join(os.tmpdir(), `zhangwei-prompts-seed-${Date.now().toString(36)}.sql`);

const text = (value = "") => String(value ?? "").trim();
const list = (value) => Array.isArray(value) ? value : [];
const now = new Date().toISOString();

const sql = (value) => {
  if (value === null || value === undefined) return "NULL";
  return `'${String(value).replace(/'/g, "''")}'`;
};

const json = (value) => JSON.stringify(value ?? null);

function tagValue(prompt, label) {
  const prefixes = [`${label}:`, `${label}：`];
  return list(prompt.tags).find((tag) => prefixes.some((prefix) => String(tag).startsWith(prefix)))
    ?.replace(new RegExp(`^${label}[:：]`), "")
    .trim() || "";
}

function inferModality(prompt) {
  return tagValue(prompt, "模态")
    || (text(prompt.promptKind) === "video" ? "视频" : "")
    || (text(prompt.promptKind) === "image" ? "图像" : "")
    || (text(prompt.category).includes("视频") ? "视频" : "")
    || (text(prompt.category).includes("图像") || text(prompt.category).includes("影视") ? "图像" : "文本");
}

function inferTool(prompt) {
  return tagValue(prompt, "工具") || text(prompt.platform) || text(prompt.model) || "通用 AI";
}

function inferUse(prompt) {
  return tagValue(prompt, "用途") || text(prompt.category).split(/[ /]/).filter(Boolean).at(-1) || "日常工作";
}

function inferOutputType(prompt, modality) {
  if (modality.includes("视频")) return "视频提示词 / 分镜";
  if (modality.includes("图像")) return "图像提示词 / 视觉方案";
  if (text(prompt.promptKind).includes("code")) return "代码 / 技术方案";
  return "结构化文本";
}

function normalizeAccess(value) {
  const access = text(value).toLowerCase();
  return ["free", "pro", "pack", "paid"].includes(access) ? access : "free";
}

function normalizeQualityLevel(value) {
  const level = text(value).toLowerCase();
  return ["basic", "usable", "professional"].includes(level) ? level : "basic";
}

function searchTextForPrompt(prompt, computed = {}) {
  return [
    prompt.title,
    prompt.category,
    prompt.summary,
    prompt.source,
    prompt.body,
    prompt.copyPrompt,
    prompt.negativePrompt,
    prompt.usageTips,
    prompt.parameterTips,
    prompt.zhPrompt,
    prompt.enPrompt,
    prompt.mjPrompt,
    prompt.videoPrompt,
    prompt.contentType,
    prompt.promptKind,
    prompt.platform,
    prompt.model,
    prompt.language,
    prompt.subjectCount,
    prompt.gridType,
    prompt.aspectRatio,
    computed.modality,
    computed.tool,
    computed.outputType,
    computed.useCase,
    ...list(prompt.tags),
    ...list(prompt.variables),
    ...list(prompt.seoKeywords),
    ...list(prompt.shotSize),
    ...list(prompt.cameraAngle),
    ...list(prompt.cameraMovement),
    ...list(prompt.lighting),
    ...list(prompt.colorGrade),
    ...list(prompt.mood),
    ...list(prompt.styleTags),
    ...Object.values(prompt.variableDefaults || {})
  ].map(text).filter(Boolean).join(" ").toLowerCase();
}

function qualityAudit(prompt) {
  const audit = prompt.qualityAudit && typeof prompt.qualityAudit === "object" ? prompt.qualityAudit : {};
  return {
    copyReady: Boolean(audit.copyReady),
    qualityLevel: normalizeQualityLevel(audit.qualityLevel),
    missingFields: list(audit.missingFields),
    riskFlags: list(audit.riskFlags),
    improvementSuggestion: text(audit.improvementSuggestion),
    lastCheckedAt: text(audit.lastCheckedAt || prompt.verifiedAt || prompt.updatedAt || prompt.createdAt || now)
  };
}

function isPublishCandidate(prompt, classification, audit) {
  return normalizeAccess(prompt.access) === "free"
    && classification.confidence >= 0.55
    && audit.copyReady
    && audit.qualityLevel !== "basic"
    && !Boolean(prompt.archived);
}

function promptInsertSql(prompt, index, publishedState) {
  const classification = publishedState.classification;
  const audit = publishedState.audit;
  const modality = inferModality(prompt);
  const tool = inferTool(prompt);
  const outputType = inferOutputType(prompt, modality);
  const useCase = inferUse(prompt);
  const promptZh = text(prompt.zhPrompt || prompt.copyPrompt || prompt.body);
  const promptEn = text(prompt.enPrompt);
  const modelSpecific = {
    mjPrompt: text(prompt.mjPrompt),
    videoPrompt: text(prompt.videoPrompt),
    parameterTips: text(prompt.parameterTips)
  };
  const qualityScore = Math.max(1, Math.min(100, Number(prompt.qualityScore) || 60));
  const createdAt = text(prompt.createdAt) || now;
  const updatedAt = text(prompt.updatedAt) || now;
  const publishedAt = publishedState.status === "published" ? now : "";

  const columns = [
    "id", "title", "department_id", "scenario_id", "task_id", "access", "status", "featured",
    "model", "modality", "tool", "output_type", "language", "summary", "prompt_zh", "prompt_en",
    "prompt_model_specific", "negative_prompt", "variables_json", "output_format", "use_case",
    "expected_result", "usage_tips", "quality_score", "quality_level", "copy_ready",
    "missing_fields_json", "seo_keywords_json", "sort_order", "pack_id", "source_type",
    "original_category", "search_text", "original_json", "created_at", "updated_at", "published_at"
  ];

  const values = [
    text(prompt.id) || `prompt-${index}`,
    text(prompt.title) || "Untitled prompt",
    classification.department_id,
    classification.scenario_id,
    classification.task_id,
    normalizeAccess(prompt.access),
    publishedState.status,
    publishedState.featured ? 1 : 0,
    text(prompt.model),
    modality,
    tool,
    outputType,
    text(prompt.language || "zh-CN"),
    text(prompt.summary),
    promptZh,
    promptEn,
    json(modelSpecific),
    text(prompt.negativePrompt),
    json(list(prompt.variables)),
    outputType,
    useCase,
    text(prompt.exampleOutput),
    text(prompt.usageTips),
    qualityScore,
    audit.qualityLevel,
    audit.copyReady ? 1 : 0,
    json(audit.missingFields),
    json(list(prompt.seoKeywords)),
    publishedState.featured ? publishedState.publicIndex : 100000 + index,
    text(prompt.packId),
    text(prompt.sourceType),
    text(prompt.category),
    searchTextForPrompt(prompt, { modality, tool, outputType, useCase }),
    json(prompt),
    createdAt,
    updatedAt,
    publishedAt
  ];

  const updateColumns = columns.filter((column) => column !== "id");
  return `INSERT INTO prompts (${columns.join(", ")}) VALUES (${values.map(sql).join(", ")})
ON CONFLICT(id) DO UPDATE SET ${updateColumns.map((column) => `${column}=excluded.${column}`).join(", ")};`;
}

function categoryInsertSql(row) {
  return `INSERT INTO categories (id, parent_id, level, type, name, slug, description, icon, sort_order, is_active, access_scope, created_at, updated_at)
VALUES (${[
    row.id,
    row.parent_id || null,
    row.level,
    row.type,
    row.name,
    row.slug,
    row.description,
    row.icon,
    row.sort_order,
    row.is_active,
    row.access_scope,
    now,
    now
  ].map(sql).join(", ")})
ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id, level=excluded.level, type=excluded.type, name=excluded.name, slug=excluded.slug, description=excluded.description, icon=excluded.icon, sort_order=excluded.sort_order, is_active=excluded.is_active, access_scope=excluded.access_scope, updated_at=excluded.updated_at;`;
}

function settingInsertSql(key, value) {
  return `INSERT INTO settings (key, value_json, updated_at) VALUES (${sql(key)}, ${sql(json(value))}, ${sql(now)})
ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at;`;
}

function auditLogSql(detail) {
  return `INSERT INTO audit_logs (id, action, entity_type, entity_id, detail_json, created_at)
VALUES (${sql(`seed-${Date.now().toString(36)}`)}, 'seed', 'prompt_workbench', 'all', ${sql(json(detail))}, ${sql(now)});`;
}

function buildSeedSql(library, { useTransaction = true } = {}) {
  const prompts = list(library.prompts);
  const lines = ["PRAGMA foreign_keys = ON;"];
  if (useTransaction) lines.push("BEGIN TRANSACTION;");

  for (const row of flattenTaxonomy()) {
    lines.push(categoryInsertSql(row));
  }
  lines.push(settingInsertSql("site", DEFAULT_PROMPT_SETTINGS));

  let publicIndex = 0;
  let featuredCount = 0;
  let classifiedCount = 0;
  let needsReviewCount = 0;
  let hiddenCount = 0;
  for (const [index, prompt] of prompts.entries()) {
    const classification = classifyPrompt(prompt);
    const audit = qualityAudit(prompt);
    const clear = classification.confidence >= 0.55;
    if (clear) classifiedCount += 1;
    else needsReviewCount += 1;
    const publish = isPublishCandidate(prompt, classification, audit) && featuredCount < 800;
    if (publish) featuredCount += 1;
    else hiddenCount += 1;
    publicIndex += publish ? 1 : 0;

    lines.push(promptInsertSql(prompt, index, {
      classification,
      audit,
      status: publish ? "published" : (clear ? "hidden" : "needs_classification"),
      featured: publish,
      publicIndex
    }));
  }

  lines.push(auditLogSql({
    promptCount: prompts.length,
    featuredCount,
    classifiedCount,
    needsReviewCount,
    hiddenCount,
    source: "prompts-data/library.json"
  }));
  if (useTransaction) lines.push("COMMIT;");
  return {
    sql: `${lines.join("\n")}\n`,
    summary: {
      promptCount: prompts.length,
      featuredCount,
      classifiedCount,
      needsReviewCount,
      hiddenCount,
      categoryCount: flattenTaxonomy().length
    }
  };
}

function run(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const quiet = Boolean(options.quiet);
    const spawnOptions = {
      cwd: repoRoot,
      stdio: quiet ? ["ignore", "pipe", "pipe"] : "inherit",
      shell: false
    };
    const child = process.platform === "win32"
      ? spawn(process.env.ComSpec || "cmd.exe", ["/d", "/c", [command, ...args].map(quoteWindowsArg).join(" ")], {
        ...spawnOptions,
        ...withoutQuiet(options)
      })
      : spawn(command, args, {
      ...spawnOptions,
      ...withoutQuiet(options)
    });
    let output = "";
    if (quiet) {
      child.stdout?.on("data", (chunk) => { output += chunk.toString(); });
      child.stderr?.on("data", (chunk) => { output += chunk.toString(); });
    }
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else {
        if (quiet && output) console.error(output.split(/\r?\n/).slice(-80).join("\n"));
        reject(new Error(`${command} ${args.join(" ")} exited with code ${code}`));
      }
    });
  });
}

function withoutQuiet(options) {
  const { quiet, ...rest } = options;
  return rest;
}

function quoteWindowsArg(value) {
  const textValue = String(value);
  if (!/[ \t&()^=;!'+,`~]/.test(textValue)) return textValue;
  return `"${textValue.replace(/"/g, '""')}"`;
}

const library = JSON.parse(await readFile(libraryPath, "utf8"));
const built = buildSeedSql(library, { useTransaction: !isRemote });
await mkdir(path.dirname(sqlOutputPath), { recursive: true });
await writeFile(sqlOutputPath, built.sql, "utf8");

console.log(`[seed-d1] SQL written: ${sqlOutputPath}`);
console.log(`[seed-d1] ${JSON.stringify(built.summary)}`);

if (!writeOnly) {
  const npx = process.platform === "win32" ? "npx.cmd" : "npx";
  const wranglerArgs = [
    "wrangler",
    "d1",
    "execute",
    databaseName,
    isRemote ? "--remote" : "--local",
    "--file",
    sqlOutputPath,
    "--config",
    "wrangler.jsonc"
  ];
  if (!isRemote) {
    wranglerArgs.splice(5, 0, "--persist-to", localPersistTo);
  }
  await run(npx, wranglerArgs, { quiet: !verbose });
  console.log("[seed-d1] D1 seed applied.");
  if (!sqlOutputArg) {
    await rm(sqlOutputPath, { force: true });
  }
}
