const PUBLIC_API_PREFIX = "/api/public";
const ADMIN_API_PREFIX = "/api/admin";
const PROMPTS_DATA_PREFIX = "/prompts-data";
const LEGACY_LIBRARY_PATH = "prompts-data/library.json";
const LEGACY_SEARCH_INDEX_PATH = "prompts-data/search-index.json";
const ADMIN_COOKIE_NAME = "prompt_library_admin_auth";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;
const SETTINGS_KEY = "site";

const DEFAULT_SETTINGS = {
  publicAccessMode: "free-only",
  showPaidEntry: false,
  showProBadges: false,
  showPackBadges: false,
  showContactLead: false,
  allowLockedPreview: false,
  homepageFeaturedLimit: 12,
  categoryPromptLimit: 20
};

const UNCLASSIFIED_IDS = {
  department_id: "dept-needs-review",
  scenario_id: "scenario-needs-review-needs-classification",
  task_id: "task-needs-review-needs-classification-manual-review"
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

export function hasPromptWorkbench(env) {
  return Boolean(env?.PROMPTS_DB);
}

export async function handlePublicPromptsApi(request, env, url) {
  if (!hasPromptWorkbench(env)) {
    return jsonResponse({ ok: false, error: "Prompt database is not configured." }, 503);
  }

  if (request.method !== "GET") {
    return jsonResponse({ ok: false, error: "Method not allowed." }, 405, { Allow: "GET" });
  }

  const path = routePath(url.pathname, PUBLIC_API_PREFIX);
  if (path === "/settings") {
    return jsonResponse({ ok: true, settings: publicSettings(await readSettings(env)) });
  }
  if (path === "/categories") {
    return jsonResponse({ ok: true, categories: await readCategoryTree(env, { publicOnly: true }) });
  }
  if (path === "/prompts") {
    return jsonResponse(await readPublicPrompts(env, url));
  }
  if (path.startsWith("/prompts/")) {
    const id = decodeURIComponent(path.slice("/prompts/".length));
    const prompt = await readPublicPromptDetail(env, id);
    if (!prompt) return jsonResponse({ ok: false, error: "Not found." }, 404);
    return jsonResponse({ ok: true, prompt });
  }
  if (path === "/search") {
    return jsonResponse(await searchPublicPrompts(env, url));
  }

  return jsonResponse({ ok: false, error: "Not found." }, 404);
}

export async function handleAdminPromptsApi(request, env, url) {
  if (!hasPromptWorkbench(env)) {
    return jsonResponse({ ok: false, error: "Prompt database is not configured." }, 503);
  }

  const path = routePath(url.pathname, ADMIN_API_PREFIX);
  if (path === "/login" && request.method === "POST") {
    return handleAdminLogin(request, env);
  }

  const auth = await getAdminAuthState(request, env);
  if (!auth.admin) {
    return jsonResponse({ ok: false, error: "Administrator authentication required." }, 403);
  }

  if (path === "/settings") {
    if (request.method === "GET") return jsonResponse({ ok: true, settings: await readSettings(env) });
    if (request.method === "PUT") return updateSettings(request, env, auth);
  }

  if (path === "/categories") {
    if (request.method === "GET") return jsonResponse({ ok: true, categories: await readCategoryTree(env, { publicOnly: false }) });
    if (request.method === "POST") return createCategory(request, env, auth);
  }
  if (path.startsWith("/categories/")) {
    const id = decodeURIComponent(path.slice("/categories/".length));
    if (request.method === "PUT") return updateCategory(request, env, auth, id);
    if (request.method === "DELETE") return softDeleteCategory(env, auth, id);
  }

  if (path === "/prompts") {
    if (request.method === "GET") return jsonResponse(await readAdminPrompts(env, url));
    if (request.method === "POST") return createPrompt(request, env, auth);
  }
  if (path === "/prompts/import" && request.method === "POST") {
    return importPrompts(request, env, auth);
  }
  if (path === "/prompts/quality-audit" && request.method === "POST") {
    return auditPrompts(request, env, auth);
  }
  if (path.startsWith("/prompts/")) {
    const suffix = path.slice("/prompts/".length);
    const [rawId, action] = suffix.split("/");
    const id = decodeURIComponent(rawId);
    if (!action && request.method === "PUT") return updatePrompt(request, env, auth, id);
    if (!action && request.method === "DELETE") return archivePrompt(env, auth, id, "delete");
    if (action === "publish" && request.method === "POST") return publishPrompt(env, auth, id);
    if (action === "archive" && request.method === "POST") return archivePrompt(env, auth, id, "archive");
  }

  if (path === "/audit-logs" && request.method === "GET") {
    return jsonResponse({ ok: true, logs: await readAuditLogs(env, url) });
  }

  return jsonResponse({ ok: false, error: "Not found." }, 404);
}

export async function readWorkbenchCompatLibrary(request, env) {
  if (!hasPromptWorkbench(env)) return null;
  const auth = await getAdminAuthState(request, env);
  const rows = auth.admin
    ? await all(env, `${promptSelectSql()} ORDER BY p.updated_at DESC LIMIT 5000`)
    : await all(env, `${promptSelectSql()} WHERE ${publicPromptWhere()} ORDER BY p.featured DESC, p.quality_score DESC LIMIT 1000`);
  return jsonResponse({
    version: 3,
    source: "d1",
    updatedAt: new Date().toISOString(),
    prompts: rows.map((row) => legacyPromptFromRow(row, { includeBody: true })),
    assets: []
  });
}

export async function handlePromptDataAssetRequest(request, env) {
  if (!hasPromptWorkbench(env)) return null;
  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Method not allowed.", 405, { Allow: "GET, HEAD" });
  }

  const pathname = new URL(request.url).pathname.replace(/^\/+/, "");
  if (pathname === LEGACY_LIBRARY_PATH) return readWorkbenchCompatLibrary(request, env);
  if (pathname === LEGACY_SEARCH_INDEX_PATH) {
    const rows = await all(env, `${promptSelectSql()} WHERE ${publicPromptWhere()} ORDER BY p.featured DESC, p.quality_score DESC LIMIT 1000`);
    return jsonResponse({
      version: 3,
      source: "d1-public-only",
      generatedAt: new Date().toISOString(),
      promptCount: rows.length,
      packs: [],
      prompts: rows.map(searchIndexEntryFromRow)
    });
  }
  if (pathname === "prompts-data/library-manifest.json" || /^prompts-data\/library-prompts-\d+\.json$/.test(pathname)) {
    return jsonResponse({
      version: 3,
      source: "d1",
      promptCount: 0,
      chunks: [],
      staticLibraryDisabled: true
    });
  }
  if (pathname.startsWith("prompts-data/")) {
    return null;
  }
  return null;
}

function routePath(pathname, prefix) {
  const path = pathname.slice(prefix.length) || "/";
  return path.endsWith("/") && path !== "/" ? path.slice(0, -1) : path;
}

function publicSettings(settings) {
  return {
    publicAccessMode: settings.publicAccessMode,
    showPaidEntry: Boolean(settings.showPaidEntry),
    showProBadges: Boolean(settings.showProBadges),
    showPackBadges: Boolean(settings.showPackBadges),
    showContactLead: Boolean(settings.showContactLead),
    allowLockedPreview: Boolean(settings.allowLockedPreview),
    homepageFeaturedLimit: clampNumber(settings.homepageFeaturedLimit, 1, 24, 12),
    categoryPromptLimit: clampNumber(settings.categoryPromptLimit, 1, 50, 20)
  };
}

async function readSettings(env) {
  let settings = null;
  const row = await first(env, "SELECT value_json FROM settings WHERE key = ?", [SETTINGS_KEY]).catch(() => null);
  if (row?.value_json) settings = parseJson(row.value_json, null);
  if (!settings && env.PROMPTS_KV) settings = await env.PROMPTS_KV.get("settings:site", "json").catch(() => null);
  return normalizeSettings({ ...DEFAULT_SETTINGS, ...(settings || {}) });
}

async function updateSettings(request, env, auth) {
  const payload = await readJson(request);
  const next = normalizeSettings({ ...DEFAULT_SETTINGS, ...(await readSettings(env)), ...(payload?.settings || payload || {}) });
  await run(env, "INSERT INTO settings (key, value_json, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value_json=excluded.value_json, updated_at=excluded.updated_at", [
    SETTINGS_KEY,
    JSON.stringify(next),
    new Date().toISOString()
  ]);
  if (env.PROMPTS_KV) await env.PROMPTS_KV.put("settings:site", JSON.stringify(next)).catch(() => null);
  await writeAuditLog(env, auth, "settings.update", "settings", SETTINGS_KEY, next);
  return jsonResponse({ ok: true, settings: next });
}

function normalizeSettings(value) {
  const source = value && typeof value === "object" ? value : {};
  return {
    publicAccessMode: cleanText(source.publicAccessMode) || "free-only",
    showPaidEntry: Boolean(source.showPaidEntry),
    showProBadges: Boolean(source.showProBadges),
    showPackBadges: Boolean(source.showPackBadges),
    showContactLead: Boolean(source.showContactLead),
    allowLockedPreview: Boolean(source.allowLockedPreview),
    homepageFeaturedLimit: clampNumber(source.homepageFeaturedLimit, 1, 24, 12),
    categoryPromptLimit: clampNumber(source.categoryPromptLimit, 1, 50, 20)
  };
}

async function readCategoryTree(env, { publicOnly }) {
  const rows = await all(env, [
    "SELECT id, parent_id, level, type, name, slug, description, icon, sort_order, is_active, access_scope, created_at, updated_at",
    "FROM categories",
    publicOnly ? "WHERE is_active = 1 AND access_scope = 'public'" : "",
    "ORDER BY sort_order ASC, name ASC"
  ].filter(Boolean).join(" "));
  const counts = publicOnly ? await readPublicCategoryCounts(env) : await readAdminCategoryCounts(env);
  const byId = new Map(rows.map((row) => [row.id, {
    ...categoryFromRow(row),
    promptCount: counts[row.id] || 0,
    children: []
  }]));
  const roots = [];
  for (const item of byId.values()) {
    if (item.parentId && byId.has(item.parentId)) byId.get(item.parentId).children.push(item);
    else roots.push(item);
  }
  return roots;
}

async function readPublicCategoryCounts(env) {
  const rows = await all(env, [
    "SELECT department_id, scenario_id, task_id, COUNT(*) AS count",
    "FROM prompts p",
    `WHERE ${publicPromptWhere()}`,
    "GROUP BY department_id, scenario_id, task_id"
  ].join(" "));
  const counts = {};
  for (const row of rows) {
    counts[row.department_id] = (counts[row.department_id] || 0) + Number(row.count || 0);
    counts[row.scenario_id] = (counts[row.scenario_id] || 0) + Number(row.count || 0);
    counts[row.task_id] = (counts[row.task_id] || 0) + Number(row.count || 0);
  }
  return counts;
}

async function readAdminCategoryCounts(env) {
  const rows = await all(env, "SELECT department_id, scenario_id, task_id, COUNT(*) AS count FROM prompts GROUP BY department_id, scenario_id, task_id");
  const counts = {};
  for (const row of rows) {
    counts[row.department_id] = (counts[row.department_id] || 0) + Number(row.count || 0);
    counts[row.scenario_id] = (counts[row.scenario_id] || 0) + Number(row.count || 0);
    counts[row.task_id] = (counts[row.task_id] || 0) + Number(row.count || 0);
  }
  return counts;
}

function categoryFromRow(row) {
  return {
    id: row.id,
    parentId: row.parent_id || "",
    level: Number(row.level || 0),
    type: row.type || "",
    name: row.name || "",
    slug: row.slug || "",
    description: row.description || "",
    icon: row.icon || "",
    sortOrder: Number(row.sort_order || 0),
    isActive: Boolean(row.is_active),
    accessScope: row.access_scope || "public",
    createdAt: row.created_at || "",
    updatedAt: row.updated_at || ""
  };
}

async function createCategory(request, env, auth) {
  const payload = await readJson(request);
  const category = normalizeCategoryPayload(payload);
  await upsertCategory(env, category);
  await writeAuditLog(env, auth, "category.create", "category", category.id, category);
  return jsonResponse({ ok: true, category });
}

async function updateCategory(request, env, auth, id) {
  const existing = await first(env, "SELECT * FROM categories WHERE id = ?", [id]);
  if (!existing) return jsonResponse({ ok: false, error: "Category not found." }, 404);
  const payload = await readJson(request);
  const category = normalizeCategoryPayload({ ...categoryFromRow(existing), ...payload, id });
  await upsertCategory(env, category);
  await writeAuditLog(env, auth, "category.update", "category", id, category);
  return jsonResponse({ ok: true, category });
}

async function softDeleteCategory(env, auth, id) {
  await run(env, "UPDATE categories SET is_active = 0, access_scope = 'admin', updated_at = ? WHERE id = ?", [new Date().toISOString(), id]);
  await writeAuditLog(env, auth, "category.delete", "category", id, { softDelete: true });
  return jsonResponse({ ok: true });
}

function normalizeCategoryPayload(payload) {
  const level = clampNumber(payload?.level, 1, 3, 1);
  const type = ["department", "scenario", "task"].includes(cleanText(payload?.type)) ? cleanText(payload.type) : level === 1 ? "department" : level === 2 ? "scenario" : "task";
  const slug = cleanSlug(payload?.slug || payload?.name || "category");
  const id = cleanText(payload?.id) || `${type}-${slug}`;
  return {
    id,
    parentId: cleanText(payload?.parentId || payload?.parent_id),
    level,
    type,
    name: cleanText(payload?.name) || "未命名分类",
    slug,
    description: cleanText(payload?.description),
    icon: cleanText(payload?.icon).slice(0, 8),
    sortOrder: clampNumber(payload?.sortOrder ?? payload?.sort_order, -999999, 999999, 0),
    isActive: payload?.isActive ?? payload?.is_active ?? true ? 1 : 0,
    accessScope: cleanText(payload?.accessScope || payload?.access_scope) || "public"
  };
}

async function upsertCategory(env, category) {
  await run(env, `INSERT INTO categories (id, parent_id, level, type, name, slug, description, icon, sort_order, is_active, access_scope, updated_at)
VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
ON CONFLICT(id) DO UPDATE SET parent_id=excluded.parent_id, level=excluded.level, type=excluded.type, name=excluded.name, slug=excluded.slug, description=excluded.description, icon=excluded.icon, sort_order=excluded.sort_order, is_active=excluded.is_active, access_scope=excluded.access_scope, updated_at=excluded.updated_at`, [
    category.id,
    category.parentId || null,
    category.level,
    category.type,
    category.name,
    category.slug,
    category.description,
    category.icon,
    category.sortOrder,
    category.isActive,
    category.accessScope,
    new Date().toISOString()
  ]);
}

async function readPublicPrompts(env, url) {
  const settings = await readSettings(env);
  const limit = getLimit(url, settings.categoryPromptLimit);
  const page = getPage(url);
  const bindings = [];
  const where = [publicPromptWhere()];
  addPublicFilters(url, where, bindings);
  if (!url.searchParams.has("department") && !url.searchParams.has("scenario") && !url.searchParams.has("task") && !url.searchParams.has("q")) {
    where.push("p.featured = 1");
  }
  const total = await countPrompts(env, where, bindings);
  const rows = await all(env, [
    promptSelectSql(),
    `WHERE ${where.join(" AND ")}`,
    "ORDER BY p.featured DESC, CASE p.quality_level WHEN 'professional' THEN 0 WHEN 'usable' THEN 1 ELSE 2 END, p.quality_score DESC, p.sort_order ASC",
    "LIMIT ? OFFSET ?"
  ].join(" "), [...bindings, limit, (page - 1) * limit]);
  return {
    ok: true,
    prompts: rows.map((row) => publicPromptFromRow(row)),
    pagination: pagination(total, page, limit)
  };
}

async function searchPublicPrompts(env, url) {
  const settings = await readSettings(env);
  const limit = getLimit(url, settings.categoryPromptLimit);
  const page = getPage(url);
  const q = cleanText(url.searchParams.get("q"));
  const bindings = [];
  const where = [publicPromptWhere()];
  addPublicFilters(url, where, bindings);
  if (q) {
    const like = `%${q}%`;
    where.push("(p.title LIKE ? OR p.summary LIKE ? OR p.prompt_zh LIKE ? OR p.tool LIKE ? OR p.modality LIKE ? OR p.seo_keywords_json LIKE ? OR c3.name LIKE ?)");
    bindings.push(like, like, like, like, like, like, like);
  }
  const total = await countPrompts(env, where, bindings);
  const exact = q ? `${q}` : "";
  const rows = await all(env, [
    promptSelectSql(),
    `WHERE ${where.join(" AND ")}`,
    "ORDER BY CASE WHEN c3.name = ? THEN 0 WHEN p.title LIKE ? THEN 1 ELSE 2 END, p.featured DESC, CASE p.quality_level WHEN 'professional' THEN 0 WHEN 'usable' THEN 1 ELSE 2 END, p.quality_score DESC, p.updated_at DESC",
    "LIMIT ? OFFSET ?"
  ].join(" "), [...bindings, exact, q ? `%${q}%` : "", limit, (page - 1) * limit]);
  return {
    ok: true,
    query: q,
    prompts: rows.map((row) => publicPromptFromRow(row)),
    pagination: pagination(total, page, limit)
  };
}

async function readPublicPromptDetail(env, id) {
  const row = await first(env, `${promptSelectSql()} WHERE ${publicPromptWhere()} AND p.id = ? LIMIT 1`, [id]);
  return row ? publicPromptFromRow(row, { detail: true }) : null;
}

function addPublicFilters(url, where, bindings) {
  const map = [
    ["department", "p.department_id"],
    ["scenario", "p.scenario_id"],
    ["task", "p.task_id"],
    ["tool", "p.tool"],
    ["modality", "p.modality"]
  ];
  for (const [param, column] of map) {
    const value = cleanText(url.searchParams.get(param));
    if (value && value !== "all") {
      where.push(`${column} = ?`);
      bindings.push(value);
    }
  }
  if (url.searchParams.get("featured") === "1") where.push("p.featured = 1");
}

async function countPrompts(env, where, bindings) {
  const row = await first(env, `SELECT COUNT(*) AS count FROM prompts p LEFT JOIN categories c3 ON c3.id = p.task_id WHERE ${where.join(" AND ")}`, bindings);
  return Number(row?.count || 0);
}

function publicPromptWhere() {
  return "p.access = 'free' AND p.status = 'published' AND p.copy_ready = 1";
}

function promptSelectSql() {
  return `SELECT p.*,
    c1.name AS department_name, c1.slug AS department_slug,
    c2.name AS scenario_name, c2.slug AS scenario_slug,
    c3.name AS task_name, c3.slug AS task_slug
  FROM prompts p
  LEFT JOIN categories c1 ON c1.id = p.department_id
  LEFT JOIN categories c2 ON c2.id = p.scenario_id
  LEFT JOIN categories c3 ON c3.id = p.task_id`;
}

function publicPromptFromRow(row, { detail = false } = {}) {
  const base = {
    id: row.id,
    title: row.title,
    departmentId: row.department_id,
    department: row.department_name || "",
    scenarioId: row.scenario_id,
    scenario: row.scenario_name || "",
    taskId: row.task_id,
    task: row.task_name || "",
    access: row.access,
    status: row.status,
    featured: Boolean(row.featured),
    model: row.model || "",
    modality: row.modality || "",
    tool: row.tool || "",
    outputType: row.output_type || "",
    language: row.language || "",
    summary: row.summary || "",
    promptPreview: cleanText(row.prompt_zh).slice(0, 260),
    qualityScore: Number(row.quality_score || 0),
    qualityLevel: row.quality_level || "basic",
    copyReady: Boolean(row.copy_ready),
    missingFields: parseJson(row.missing_fields_json, []),
    seoKeywords: parseJson(row.seo_keywords_json, []),
    updatedAt: row.updated_at || "",
    publishedAt: row.published_at || ""
  };
  if (!detail) return base;
  const modelSpecific = parseJson(row.prompt_model_specific, {});
  const variables = parseJson(row.variables_json, []);
  return {
    ...base,
    useCase: row.use_case || "",
    suitableRoles: [row.department_name, row.scenario_name].filter(Boolean),
    variables,
    promptZh: row.prompt_zh || "",
    promptEn: row.prompt_en || "",
    promptModelSpecific: modelSpecific,
    midjourneyPrompt: modelSpecific.mjPrompt || "",
    videoPrompt: modelSpecific.videoPrompt || "",
    negativePrompt: row.negative_prompt || "",
    aspectRatio: originalField(row, "aspectRatio"),
    shotSize: originalField(row, "shotSize", []),
    cameraAngle: originalField(row, "cameraAngle", []),
    cameraMovement: originalField(row, "cameraMovement", []),
    lighting: originalField(row, "lighting", []),
    colorGrade: originalField(row, "colorGrade", []),
    mood: originalField(row, "mood", []),
    outputFormat: row.output_format || row.output_type || "",
    usageSteps: buildUsageSteps(row, variables),
    expectedResult: row.expected_result || "",
    commonErrors: originalField(row, "failureReasons", []),
    optimizationTips: originalField(row, "optimizationTips", []),
    usageTips: row.usage_tips || "",
    roleSetting: roleSettingForRow(row),
    constraints: buildConstraints(row),
    checklist: buildChecklist(row)
  };
}

function originalField(row, key, fallback = "") {
  const original = parseJson(row.original_json, {});
  return original && Object.prototype.hasOwnProperty.call(original, key) ? original[key] : fallback;
}

function buildUsageSteps(row, variables) {
  const names = Array.isArray(variables) ? variables : [];
  return [
    names.length ? `替换变量：${names.slice(0, 8).join("、")}` : "补充你的业务背景、目标用户和交付格式。",
    "复制完整提示词到对应 AI 工具。",
    "检查输出是否符合结构、约束和质量标准。",
    "根据结果继续补充素材、风格或边界条件。"
  ];
}

function roleSettingForRow(row) {
  if (String(row.modality || "").includes("视频") || String(row.modality || "").includes("图像")) return "你是具备商业审美和镜头语言能力的 AIGC 视觉导演。";
  if (String(row.department_name || "").includes("产品")) return "你是资深产品经理，擅长结构化拆解需求和输出可验收文档。";
  if (String(row.department_name || "").includes("技术")) return "你是资深工程师，优先给出可验证、可维护的方案。";
  return "你是熟悉互联网岗位日常交付的 AI 工作助手。";
}

function buildConstraints(row) {
  const constraints = [
    "输出必须结构清晰，可直接复制使用。",
    "不要只堆砌空泛形容词，要包含输入材料、任务目标、输出格式和检查标准。"
  ];
  if (String(row.modality || "").includes("图像") || String(row.modality || "").includes("视频")) {
    constraints.push("避免真实名人仿冒、受保护 IP、不可读文字、水印和明显变形。");
  }
  return constraints;
}

function buildChecklist(row) {
  const checklist = ["角色设定", "输入材料", "明确任务", "输出格式", "约束条件", "检查标准"];
  if (String(row.modality || "").includes("图像")) return ["主体", "场景", "动作或状态", "构图或景别", "镜头或焦段", "光影", "色彩", "情绪", "画幅", "负面提示词"];
  if (String(row.modality || "").includes("视频")) return ["主体", "主体运动", "镜头运动", "场景变化", "环境运动", "节奏", "时长或画幅", "稳定性约束"];
  return checklist;
}

function legacyPromptFromRow(row, { includeBody }) {
  const original = parseJson(row.original_json, {});
  return {
    ...original,
    id: row.id,
    title: row.title,
    category: [row.department_name, row.scenario_name, row.task_name].filter(Boolean).join(" / "),
    departmentId: row.department_id,
    scenarioId: row.scenario_id,
    taskId: row.task_id,
    access: row.access,
    status: row.status,
    featured: Boolean(row.featured),
    summary: row.summary,
    body: includeBody ? row.prompt_zh : "",
    bodyRedacted: !includeBody,
    qualityScore: Number(row.quality_score || 0),
    qualityAudit: {
      copyReady: Boolean(row.copy_ready),
      qualityLevel: row.quality_level,
      missingFields: parseJson(row.missing_fields_json, []),
      improvementSuggestion: ""
    },
    tags: [
      ...(Array.isArray(original.tags) ? original.tags : []),
      `岗位:${row.department_name || ""}`,
      `场景:${row.scenario_name || ""}`,
      `任务:${row.task_name || ""}`
    ].filter(Boolean),
    seoKeywords: parseJson(row.seo_keywords_json, [])
  };
}

function searchIndexEntryFromRow(row) {
  return {
    id: row.id,
    title: row.title,
    department: row.department_name || "",
    scenario: row.scenario_name || "",
    task: row.task_name || "",
    category: [row.department_name, row.scenario_name, row.task_name].filter(Boolean).join(" / "),
    summary: row.summary || "",
    access: row.access,
    featured: Boolean(row.featured),
    qualityScore: Number(row.quality_score || 0),
    copyReady: Boolean(row.copy_ready),
    qualityLevel: row.quality_level || "basic",
    tool: row.tool || "",
    modality: row.modality || "",
    outputType: row.output_type || "",
    searchable: [
      row.title,
      row.summary,
      row.department_name,
      row.scenario_name,
      row.task_name,
      row.tool,
      row.modality,
      row.output_type,
      row.seo_keywords_json
    ].filter(Boolean).join(" ").toLowerCase()
  };
}

async function readAdminPrompts(env, url) {
  const limit = getLimit(url, 50, 200);
  const page = getPage(url);
  const bindings = [];
  const where = [];
  for (const [param, column] of [
    ["status", "p.status"],
    ["access", "p.access"],
    ["department", "p.department_id"],
    ["scenario", "p.scenario_id"],
    ["task", "p.task_id"]
  ]) {
    const value = cleanText(url.searchParams.get(param));
    if (value && value !== "all") {
      where.push(`${column} = ?`);
      bindings.push(value);
    }
  }
  const q = cleanText(url.searchParams.get("q"));
  if (q) {
    const like = `%${q}%`;
    where.push("(p.id LIKE ? OR p.title LIKE ? OR p.summary LIKE ? OR p.prompt_zh LIKE ? OR p.original_category LIKE ?)");
    bindings.push(like, like, like, like, like);
  }
  const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
  const total = await countAdminPrompts(env, whereSql, bindings);
  const rows = await all(env, [
    promptSelectSql(),
    whereSql,
    "ORDER BY p.updated_at DESC, p.quality_score DESC",
    "LIMIT ? OFFSET ?"
  ].filter(Boolean).join(" "), [...bindings, limit, (page - 1) * limit]);
  return {
    ok: true,
    prompts: rows.map((row) => adminPromptFromRow(row)),
    pagination: pagination(total, page, limit)
  };
}

async function countAdminPrompts(env, whereSql, bindings) {
  const row = await first(env, `SELECT COUNT(*) AS count FROM prompts p ${whereSql}`, bindings);
  return Number(row?.count || 0);
}

function adminPromptFromRow(row) {
  return {
    ...publicPromptFromRow(row, { detail: true }),
    status: row.status,
    access: row.access,
    packId: row.pack_id || "",
    sourceType: row.source_type || "",
    originalCategory: row.original_category || "",
    originalJson: parseJson(row.original_json, {})
  };
}

async function createPrompt(request, env, auth) {
  const payload = await readJson(request);
  const prompt = normalizePromptPayload(payload);
  await upsertPrompt(env, prompt);
  await writeAuditLog(env, auth, "prompt.create", "prompt", prompt.id, prompt);
  return jsonResponse({ ok: true, prompt: await readAdminPrompt(env, prompt.id) });
}

async function updatePrompt(request, env, auth, id) {
  const existing = await first(env, "SELECT * FROM prompts WHERE id = ?", [id]);
  if (!existing) return jsonResponse({ ok: false, error: "Prompt not found." }, 404);
  const payload = await readJson(request);
  await snapshotPromptVersion(env, id, existing, auth, "update");
  const prompt = normalizePromptPayload({ ...dbPromptToPayload(existing), ...payload, id });
  await upsertPrompt(env, prompt);
  await writeAuditLog(env, auth, "prompt.update", "prompt", id, prompt);
  return jsonResponse({ ok: true, prompt: await readAdminPrompt(env, id) });
}

async function publishPrompt(env, auth, id) {
  await run(env, "UPDATE prompts SET status = 'published', published_at = COALESCE(NULLIF(published_at, ''), ?), updated_at = ? WHERE id = ?", [new Date().toISOString(), new Date().toISOString(), id]);
  await writeAuditLog(env, auth, "prompt.publish", "prompt", id, {});
  return jsonResponse({ ok: true, prompt: await readAdminPrompt(env, id) });
}

async function archivePrompt(env, auth, id, action) {
  await run(env, "UPDATE prompts SET status = 'archived', featured = 0, updated_at = ? WHERE id = ?", [new Date().toISOString(), id]);
  await writeAuditLog(env, auth, `prompt.${action}`, "prompt", id, { archived: true });
  return jsonResponse({ ok: true, prompt: await readAdminPrompt(env, id) });
}

async function readAdminPrompt(env, id) {
  const row = await first(env, `${promptSelectSql()} WHERE p.id = ? LIMIT 1`, [id]);
  return row ? adminPromptFromRow(row) : null;
}

function normalizePromptPayload(payload) {
  const id = cleanText(payload?.id) || `prompt-${Date.now().toString(36)}`;
  const qualityAudit = normalizeQualityAudit(payload?.qualityAudit || payload);
  const qualityScore = clampNumber(payload?.qualityScore ?? payload?.quality_score, 1, 100, qualityAudit.copyReady ? 80 : 55);
  const access = normalizeAccess(payload?.access);
  const status = normalizeStatus(payload?.status);
  const now = new Date().toISOString();
  return {
    id,
    title: cleanText(payload?.title) || "未命名提示词",
    departmentId: cleanText(payload?.departmentId || payload?.department_id) || UNCLASSIFIED_IDS.department_id,
    scenarioId: cleanText(payload?.scenarioId || payload?.scenario_id) || UNCLASSIFIED_IDS.scenario_id,
    taskId: cleanText(payload?.taskId || payload?.task_id) || UNCLASSIFIED_IDS.task_id,
    access,
    status,
    featured: Boolean(payload?.featured),
    model: cleanText(payload?.model),
    modality: cleanText(payload?.modality),
    tool: cleanText(payload?.tool),
    outputType: cleanText(payload?.outputType || payload?.output_type),
    language: cleanText(payload?.language || "zh-CN"),
    summary: cleanText(payload?.summary),
    promptZh: cleanText(payload?.promptZh || payload?.prompt_zh || payload?.body),
    promptEn: cleanText(payload?.promptEn || payload?.prompt_en),
    promptModelSpecific: typeof payload?.promptModelSpecific === "object" ? payload.promptModelSpecific : parseJson(payload?.prompt_model_specific, {}),
    negativePrompt: cleanText(payload?.negativePrompt || payload?.negative_prompt),
    variables: normalizeArray(payload?.variables || payload?.variables_json),
    outputFormat: cleanText(payload?.outputFormat || payload?.output_format),
    useCase: cleanText(payload?.useCase || payload?.use_case),
    expectedResult: cleanText(payload?.expectedResult || payload?.expected_result),
    usageTips: cleanText(payload?.usageTips || payload?.usage_tips),
    qualityScore,
    qualityLevel: qualityAudit.qualityLevel,
    copyReady: qualityAudit.copyReady,
    missingFields: qualityAudit.missingFields,
    seoKeywords: normalizeArray(payload?.seoKeywords || payload?.seo_keywords_json),
    sortOrder: clampNumber(payload?.sortOrder ?? payload?.sort_order, -999999, 999999, 0),
    packId: cleanText(payload?.packId || payload?.pack_id),
    sourceType: cleanText(payload?.sourceType || payload?.source_type || "admin"),
    originalCategory: cleanText(payload?.originalCategory || payload?.original_category),
    originalJson: payload?.originalJson || payload?.original_json || {},
    createdAt: cleanText(payload?.createdAt || payload?.created_at) || now,
    updatedAt: now,
    publishedAt: status === "published" ? cleanText(payload?.publishedAt || payload?.published_at) || now : cleanText(payload?.publishedAt || payload?.published_at)
  };
}

function normalizeQualityAudit(value) {
  const source = value && typeof value === "object" ? value : {};
  const qualityLevel = normalizeQualityLevel(source.qualityLevel || source.quality_level);
  return {
    copyReady: Boolean(source.copyReady ?? source.copy_ready),
    qualityLevel,
    missingFields: normalizeArray(source.missingFields || source.missing_fields_json),
    riskFlags: normalizeArray(source.riskFlags),
    improvementSuggestion: cleanText(source.improvementSuggestion || source.improvement_suggestion),
    lastCheckedAt: cleanText(source.lastCheckedAt || source.last_checked_at)
  };
}

async function upsertPrompt(env, prompt) {
  await run(env, `INSERT INTO prompts (
    id, title, department_id, scenario_id, task_id, access, status, featured,
    model, modality, tool, output_type, language, summary, prompt_zh, prompt_en,
    prompt_model_specific, negative_prompt, variables_json, output_format, use_case,
    expected_result, usage_tips, quality_score, quality_level, copy_ready, missing_fields_json,
    seo_keywords_json, sort_order, pack_id, source_type, original_category, original_json,
    created_at, updated_at, published_at
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    title=excluded.title, department_id=excluded.department_id, scenario_id=excluded.scenario_id,
    task_id=excluded.task_id, access=excluded.access, status=excluded.status, featured=excluded.featured,
    model=excluded.model, modality=excluded.modality, tool=excluded.tool, output_type=excluded.output_type,
    language=excluded.language, summary=excluded.summary, prompt_zh=excluded.prompt_zh, prompt_en=excluded.prompt_en,
    prompt_model_specific=excluded.prompt_model_specific, negative_prompt=excluded.negative_prompt,
    variables_json=excluded.variables_json, output_format=excluded.output_format, use_case=excluded.use_case,
    expected_result=excluded.expected_result, usage_tips=excluded.usage_tips, quality_score=excluded.quality_score,
    quality_level=excluded.quality_level, copy_ready=excluded.copy_ready, missing_fields_json=excluded.missing_fields_json,
    seo_keywords_json=excluded.seo_keywords_json, sort_order=excluded.sort_order, pack_id=excluded.pack_id,
    source_type=excluded.source_type, original_category=excluded.original_category, original_json=excluded.original_json,
    updated_at=excluded.updated_at, published_at=excluded.published_at`, [
    prompt.id, prompt.title, prompt.departmentId, prompt.scenarioId, prompt.taskId, prompt.access, prompt.status, prompt.featured ? 1 : 0,
    prompt.model, prompt.modality, prompt.tool, prompt.outputType, prompt.language, prompt.summary, prompt.promptZh, prompt.promptEn,
    JSON.stringify(prompt.promptModelSpecific || {}), prompt.negativePrompt, JSON.stringify(prompt.variables || []), prompt.outputFormat, prompt.useCase,
    prompt.expectedResult, prompt.usageTips, prompt.qualityScore, prompt.qualityLevel, prompt.copyReady ? 1 : 0, JSON.stringify(prompt.missingFields || []),
    JSON.stringify(prompt.seoKeywords || []), prompt.sortOrder, prompt.packId, prompt.sourceType, prompt.originalCategory, JSON.stringify(prompt.originalJson || {}),
    prompt.createdAt, prompt.updatedAt, prompt.publishedAt || ""
  ]);
}

function dbPromptToPayload(row) {
  return {
    id: row.id,
    title: row.title,
    departmentId: row.department_id,
    scenarioId: row.scenario_id,
    taskId: row.task_id,
    access: row.access,
    status: row.status,
    featured: Boolean(row.featured),
    model: row.model,
    modality: row.modality,
    tool: row.tool,
    outputType: row.output_type,
    language: row.language,
    summary: row.summary,
    promptZh: row.prompt_zh,
    promptEn: row.prompt_en,
    promptModelSpecific: parseJson(row.prompt_model_specific, {}),
    negativePrompt: row.negative_prompt,
    variables: parseJson(row.variables_json, []),
    outputFormat: row.output_format,
    useCase: row.use_case,
    expectedResult: row.expected_result,
    usageTips: row.usage_tips,
    qualityScore: row.quality_score,
    qualityAudit: {
      copyReady: Boolean(row.copy_ready),
      qualityLevel: row.quality_level,
      missingFields: parseJson(row.missing_fields_json, [])
    },
    seoKeywords: parseJson(row.seo_keywords_json, []),
    sortOrder: row.sort_order,
    packId: row.pack_id,
    sourceType: row.source_type,
    originalCategory: row.original_category,
    originalJson: parseJson(row.original_json, {}),
    createdAt: row.created_at,
    publishedAt: row.published_at
  };
}

async function snapshotPromptVersion(env, promptId, row, auth, note) {
  const last = await first(env, "SELECT MAX(version) AS version FROM prompt_versions WHERE prompt_id = ?", [promptId]);
  await run(env, "INSERT INTO prompt_versions (id, prompt_id, version, content_json, changed_by, change_note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)", [
    `version-${promptId}-${Date.now().toString(36)}`,
    promptId,
    Number(last?.version || 0) + 1,
    JSON.stringify(dbPromptToPayload(row)),
    auth.source || "admin",
    note,
    new Date().toISOString()
  ]);
}

async function importPrompts(request, env, auth) {
  const payload = await readJson(request);
  const prompts = Array.isArray(payload?.prompts) ? payload.prompts : Array.isArray(payload?.library?.prompts) ? payload.library.prompts : [];
  let imported = 0;
  for (const item of prompts.slice(0, 500)) {
    const prompt = normalizePromptPayload(item);
    await upsertPrompt(env, prompt);
    imported += 1;
  }
  await writeAuditLog(env, auth, "prompt.import", "prompt", "bulk", { imported, truncated: prompts.length > imported });
  return jsonResponse({ ok: true, imported, total: prompts.length, truncated: prompts.length > imported });
}

async function auditPrompts(request, env, auth) {
  const payload = await readJson(request).catch(() => ({}));
  const ids = normalizeArray(payload?.ids || payload?.id).slice(0, 500);
  const rows = ids.length
    ? await all(env, `SELECT * FROM prompts WHERE id IN (${ids.map(() => "?").join(",")})`, ids)
    : await all(env, "SELECT * FROM prompts ORDER BY updated_at DESC LIMIT 500");
  let updated = 0;
  for (const row of rows) {
    const audit = qualityAuditForPromptRow(row);
    await run(env, "UPDATE prompts SET copy_ready = ?, quality_level = ?, missing_fields_json = ?, updated_at = ? WHERE id = ?", [
      audit.copyReady ? 1 : 0,
      audit.qualityLevel,
      JSON.stringify(audit.missingFields),
      new Date().toISOString(),
      row.id
    ]);
    updated += 1;
  }
  await writeAuditLog(env, auth, "prompt.quality-audit", "prompt", ids.length ? "selected" : "recent", { updated });
  return jsonResponse({ ok: true, updated });
}

function qualityAuditForPromptRow(row) {
  const text = [row.prompt_zh, row.summary, row.negative_prompt, row.output_format, row.use_case, row.expected_result, row.usage_tips].join("\n");
  const missing = [];
  const has = (...terms) => terms.some((term) => text.includes(term));
  const genericHits = ["高清", "电影感", "8K", "真实感", "氛围感", "爆款", "专业"].filter((term) => text.includes(term)).length;
  if (cleanText(row.prompt_zh).length < 180 || (genericHits >= 3 && cleanText(row.prompt_zh).length < 260)) missing.push("可直接复制正文");
  if (!parseJson(row.variables_json, []).length && !/[{<].{1,40}[}>]/.test(text)) missing.push("输入材料");
  if (!has("输出", "格式", "结构", "交付")) missing.push("输出格式");
  if (!has("约束", "不要", "避免", "检查", "标准")) missing.push("约束条件和检查标准");
  if (String(row.modality || "").includes("图像")) {
    for (const [label, terms] of [
      ["主体", ["主体", "人物", "产品", "角色"]],
      ["场景", ["场景", "背景"]],
      ["构图或景别", ["构图", "景别", "镜头", "焦段"]],
      ["光影色彩", ["光影", "光线", "色彩", "情绪"]],
      ["负面提示词", ["负面", "避免", "--no"]]
    ]) if (!terms.some((term) => text.includes(term))) missing.push(label);
  }
  if (String(row.modality || "").includes("视频")) {
    for (const [label, terms] of [
      ["主体运动", ["主体运动", "动作", "移动"]],
      ["镜头运动", ["镜头运动", "运镜", "推镜", "跟拍"]],
      ["节奏时长", ["节奏", "时长", "秒"]],
      ["稳定性约束", ["稳定", "一致", "不跳帧", "不变形"]]
    ]) if (!terms.some((term) => text.includes(term))) missing.push(label);
  }
  const copyReady = missing.length === 0;
  return {
    copyReady,
    qualityLevel: copyReady && Number(row.quality_score || 0) >= 86 ? "professional" : copyReady ? "usable" : "basic",
    missingFields: [...new Set(missing)]
  };
}

async function readAuditLogs(env, url) {
  const limit = getLimit(url, 50, 200);
  return all(env, "SELECT id, action, entity_type, entity_id, detail_json, created_at FROM audit_logs ORDER BY created_at DESC LIMIT ?", [limit]);
}

async function handleAdminLogin(request, env) {
  const payload = await readJson(request).catch(() => ({}));
  const password = cleanText(payload?.password);
  const token = cleanText(payload?.token);
  if (token && env.ADMIN_TOKEN && constantTimeEqual(token, env.ADMIN_TOKEN)) {
    return jsonResponse({ ok: true, mode: "token" });
  }
  if (!env.PROMPT_LIBRARY_ADMIN_PASSWORD || !password || !constantTimeEqual(password, env.PROMPT_LIBRARY_ADMIN_PASSWORD)) {
    return jsonResponse({ ok: false, error: "Invalid administrator credentials." }, 401);
  }
  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const signature = await signAuthValue(String(expiresAt), env.PROMPT_LIBRARY_ADMIN_PASSWORD);
  const cookie = [
    `${ADMIN_COOKIE_NAME}=${expiresAt}.${signature}`,
    `Max-Age=${COOKIE_TTL_SECONDS}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    new URL(request.url).protocol === "https:" ? "Secure" : ""
  ].filter(Boolean).join("; ");
  return jsonResponse({ ok: true, mode: "cookie" }, 200, { "Set-Cookie": cookie });
}

async function getAdminAuthState(request, env) {
  const header = request.headers.get("Authorization") || "";
  const bearer = header.match(/^Bearer\s+(.+)$/i)?.[1] || "";
  if (bearer && env.ADMIN_TOKEN && constantTimeEqual(bearer, env.ADMIN_TOKEN)) {
    return { admin: true, source: "admin-token" };
  }
  if (await hasValidAuthCookie(request, ADMIN_COOKIE_NAME, env.PROMPT_LIBRARY_ADMIN_PASSWORD)) {
    return { admin: true, source: "admin-cookie" };
  }
  return { admin: false, source: "none" };
}

async function hasValidAuthCookie(request, cookieName, password) {
  if (!password) return false;
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookie = cookieHeader.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${cookieName}=`));
  if (!cookie) return false;
  const value = cookie.slice(cookieName.length + 1);
  const [expiresAtText, signature] = value.split(".");
  const expiresAt = Number(expiresAtText);
  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) return false;
  const expected = await signAuthValue(expiresAtText, password);
  return constantTimeEqual(signature, expected);
}

async function signAuthValue(value, secret) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(value));
  return base64Url(signature);
}

function base64Url(buffer) {
  return base64FromBytes(new Uint8Array(buffer)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64FromBytes(bytes) {
  let binary = "";
  const chunkSize = 0x8000;
  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize));
  }
  return btoa(binary);
}

function utf8FromBase64(value) {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return decoder.decode(bytes);
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  const maxLength = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let index = 0; index < maxLength; index += 1) result |= (a[index] || 0) ^ (b[index] || 0);
  return result === 0;
}

async function writeAuditLog(env, auth, action, entityType, entityId, detail) {
  await run(env, "INSERT INTO audit_logs (id, action, entity_type, entity_id, detail_json, created_at) VALUES (?, ?, ?, ?, ?, ?)", [
    `audit-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
    action,
    entityType,
    entityId,
    JSON.stringify({ ...(detail || {}), actor: auth.source || "admin" }),
    new Date().toISOString()
  ]).catch(() => null);
}

async function all(env, sql, bindings = []) {
  const statement = env.PROMPTS_DB.prepare(sql);
  const result = bindings.length ? await statement.bind(...bindings).all() : await statement.all();
  return result.results || [];
}

async function first(env, sql, bindings = []) {
  const statement = env.PROMPTS_DB.prepare(sql);
  return bindings.length ? statement.bind(...bindings).first() : statement.first();
}

async function run(env, sql, bindings = []) {
  const statement = env.PROMPTS_DB.prepare(sql);
  return bindings.length ? statement.bind(...bindings).run() : statement.run();
}

async function readJson(request) {
  return request.json();
}

function jsonResponse(payload, status = 200, headers = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: noStoreHeaders({ "Content-Type": "application/json; charset=utf-8", ...headers })
  });
}

function textResponse(message, status = 200, headers = {}) {
  return new Response(message, {
    status,
    headers: noStoreHeaders({ "Content-Type": "text/plain; charset=utf-8", ...headers })
  });
}

function noStoreHeaders(headers = {}) {
  return {
    ...headers,
    "Cache-Control": "no-store",
    "CDN-Cache-Control": "no-store"
  };
}

function parseJson(value, fallback) {
  if (Array.isArray(value) || (value && typeof value === "object")) return value;
  try {
    return JSON.parse(String(value || ""));
  } catch {
    return fallback;
  }
}

function cleanText(value = "") {
  return String(value ?? "").trim();
}

function cleanSlug(value = "") {
  return cleanText(value)
    .normalize("NFKD")
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "category";
}

function normalizeAccess(value) {
  const access = cleanText(value).toLowerCase();
  return ["free", "pro", "pack", "paid"].includes(access) ? access : "free";
}

function normalizeStatus(value) {
  const status = cleanText(value).toLowerCase();
  return ["draft", "published", "hidden", "archived", "needs_classification"].includes(status) ? status : "draft";
}

function normalizeQualityLevel(value) {
  const level = cleanText(value).toLowerCase();
  return ["basic", "usable", "professional"].includes(level) ? level : "basic";
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  const parsed = parseJson(value, null);
  if (Array.isArray(parsed)) return parsed.map(cleanText).filter(Boolean);
  return cleanText(value).split(/[,，、\n]/).map(cleanText).filter(Boolean);
}

function clampNumber(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(number)));
}

function getLimit(url, fallback, max = 50) {
  return clampNumber(url.searchParams.get("limit"), 1, max, fallback);
}

function getPage(url) {
  return clampNumber(url.searchParams.get("page"), 1, 100000, 1);
}

function pagination(total, page, limit) {
  return {
    total,
    page,
    limit,
    pages: Math.max(1, Math.ceil(total / limit)),
    hasMore: page * limit < total
  };
}
