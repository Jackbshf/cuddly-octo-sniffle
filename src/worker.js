const PROMPTS_PREFIX = "/prompts";
const PROMPT_ADMIN_PREFIX = "/prompts/admin";
const VIEW_LOGIN_PATH = "/prompts/login";
const PROMPT_ADMIN_LOGIN_PATH = "/prompts/admin/login";
const PROMPTS_API_PREFIX = "/api/prompts";
const PROMPTS_DATA_PREFIX = "/prompts-data";
const PROMPT_LIBRARY_PATH = "prompts-data/library.json";

const PORTFOLIO_ADMIN_PREFIX = "/admin";
const PORTFOLIO_ADMIN_LOGIN_PATH = "/admin/login";
const PORTFOLIO_API_PREFIX = "/api/portfolio-admin";
const PORTFOLIO_META_PATH = "data/meta.json";
const PORTFOLIO_CASES_DIR = "data/cases";
const PORTFOLIO_UPLOADS_DIR = "images/uploads";

const VIEW_COOKIE_NAME = "prompt_library_auth";
const PROMPT_ADMIN_COOKIE_NAME = "prompt_library_admin_auth";
const PORTFOLIO_ADMIN_COOKIE_NAME = "portfolio_admin_auth";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_ASSET_BYTES = 10 * 1024 * 1024;

const PROMPTS_TOKEN_ENV = "PROMPTS_GITHUB_TOKEN";
const PORTFOLIO_TOKEN_ENV = "PORTFOLIO_GITHUB_TOKEN";
const DEFAULT_GITHUB_OWNER = "Jackbshf";
const DEFAULT_GITHUB_REPO = "cuddly-octo-sniffle";
const DEFAULT_GITHUB_BRANCH = "main";

const encoder = new TextEncoder();
const decoder = new TextDecoder();

const SECRET_PATTERNS = [
  { label: "OpenAI project key", pattern: new RegExp("sk-" + "proj-", "i") },
  { label: "OpenAI API key", pattern: /\bsk-[A-Za-z0-9_-]{20,}\b/i },
  { label: "GitHub fine-grained token", pattern: new RegExp("github" + "_pat_", "i") },
  { label: "GitHub classic token", pattern: new RegExp("\\bgh" + "p_[A-Za-z0-9_]{20,}\\b", "i") }
];

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith(PROMPTS_API_PREFIX)) {
      return handlePromptsApi(request, env, url);
    }

    if (url.pathname.startsWith(PORTFOLIO_API_PREFIX)) {
      return handlePortfolioAdminApi(request, env, url);
    }

    if (url.pathname.startsWith(PROMPTS_DATA_PREFIX)) {
      return handleProtectedPromptDataAsset(request, env);
    }

    if (request.method === "POST" && url.pathname === VIEW_LOGIN_PATH) {
      return handleLogin(request, {
        password: env.PROMPT_LIBRARY_PASSWORD,
        cookieName: VIEW_COOKIE_NAME,
        redirectPath: PROMPTS_PREFIX,
        mode: "prompt-view"
      });
    }

    if (request.method === "POST" && url.pathname === PROMPT_ADMIN_LOGIN_PATH) {
      return handleLogin(request, {
        password: env.PROMPT_LIBRARY_ADMIN_PASSWORD,
        cookieName: PROMPT_ADMIN_COOKIE_NAME,
        redirectPath: PROMPT_ADMIN_PREFIX,
        mode: "prompt-admin"
      });
    }

    if (request.method === "POST" && url.pathname === PORTFOLIO_ADMIN_LOGIN_PATH) {
      return handleLogin(request, {
        password: env.PORTFOLIO_ADMIN_PASSWORD,
        cookieName: PORTFOLIO_ADMIN_COOKIE_NAME,
        redirectPath: PORTFOLIO_ADMIN_PREFIX,
        mode: "portfolio-admin"
      });
    }

    if (isPortfolioAdminPath(url.pathname)) {
      return handlePortfolioAdminPage(request, env, url);
    }

    if (!isPromptsPath(url.pathname)) {
      return env.ASSETS.fetch(request);
    }

    return handlePromptPage(request, env, url);
  }
};

function isPromptsPath(pathname) {
  return pathname === PROMPTS_PREFIX || pathname === VIEW_LOGIN_PATH || pathname.startsWith(`${PROMPTS_PREFIX}/`);
}

function isPromptAdminPath(pathname) {
  return pathname === PROMPT_ADMIN_PREFIX || pathname === PROMPT_ADMIN_LOGIN_PATH || pathname.startsWith(`${PROMPT_ADMIN_PREFIX}/`);
}

function isPortfolioAdminPath(pathname) {
  return pathname === PORTFOLIO_ADMIN_PREFIX || pathname === PORTFOLIO_ADMIN_LOGIN_PATH || pathname.startsWith(`${PORTFOLIO_ADMIN_PREFIX}/`);
}

async function handlePromptPage(request, env, url) {
  if (isPromptAdminPath(url.pathname)) {
    if (!env.PROMPT_LIBRARY_ADMIN_PASSWORD) {
      return textResponse("Prompt library admin password is not configured.", 503);
    }

    const auth = await getPromptAuthState(request, env);
    if (!auth.admin) {
      return renderLoginPage({ mode: "prompt-admin", hasError: false });
    }

    return servePromptApp(request, env, url, true);
  }

  if (url.pathname === PROMPTS_PREFIX || url.pathname === VIEW_LOGIN_PATH) {
    return Response.redirect(new URL(`${PROMPTS_PREFIX}/`, url), 302);
  }

  return servePromptApp(request, env, url, false);
}

async function servePromptApp(request, env, url, isAdmin) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Method not allowed.", 405, { Allow: "GET, HEAD" });
  }

  const assetUrl = new URL(url);
  if (isAdmin) {
    if (url.pathname === PROMPT_ADMIN_PREFIX) {
      return Response.redirect(new URL(`${PROMPT_ADMIN_PREFIX}/`, url), 302);
    }
    assetUrl.pathname = `${PROMPTS_PREFIX}/`;
  }

  const response = await env.ASSETS.fetch(new Request(assetUrl, request));
  return withNoStore(response);
}

async function handlePortfolioAdminPage(request, env, url) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Method not allowed.", 405, { Allow: "GET, HEAD" });
  }

  if (!env.PORTFOLIO_ADMIN_PASSWORD) {
    return textResponse("Portfolio admin password is not configured.", 503);
  }

  const isAdmin = await hasValidAuthCookie(request, PORTFOLIO_ADMIN_COOKIE_NAME, env.PORTFOLIO_ADMIN_PASSWORD);
  if (!isAdmin) {
    return renderLoginPage({ mode: "portfolio-admin", hasError: false });
  }

  if (url.pathname === PORTFOLIO_ADMIN_PREFIX || url.pathname === PORTFOLIO_ADMIN_LOGIN_PATH) {
    return Response.redirect(new URL(`${PORTFOLIO_ADMIN_PREFIX}/`, url), 302);
  }

  const assetUrl = new URL(url);
  assetUrl.pathname = `${PORTFOLIO_ADMIN_PREFIX}/`;
  const response = await env.ASSETS.fetch(new Request(assetUrl, request));
  return withNoStore(response);
}

async function handlePromptsApi(request, env, url) {
  if (url.pathname === `${PROMPTS_API_PREFIX}/library`) {
    if (request.method === "GET") {
      const assetUrl = new URL(url);
      assetUrl.pathname = `/${PROMPT_LIBRARY_PATH}`;
      const response = await env.ASSETS.fetch(new Request(assetUrl, request));
      return withNoStore(response);
    }

    if (request.method === "POST") {
      const auth = await getPromptAuthState(request, env);
      if (!auth.admin) {
        return jsonResponse({ ok: false, error: "Administrator authentication required." }, 403);
      }

      return savePromptLibrary(request, env);
    }
  }

  if (url.pathname === `${PROMPTS_API_PREFIX}/assets` && request.method === "POST") {
    const auth = await getPromptAuthState(request, env);
    if (!auth.admin) {
      return jsonResponse({ ok: false, error: "Administrator authentication required." }, 403);
    }

    return uploadPromptAsset(request, env);
  }

  return jsonResponse({ ok: false, error: "Not found." }, 404);
}

async function handlePortfolioAdminApi(request, env, url) {
  const isAdmin = await hasValidAuthCookie(request, PORTFOLIO_ADMIN_COOKIE_NAME, env.PORTFOLIO_ADMIN_PASSWORD);
  if (!isAdmin) {
    return jsonResponse({ ok: false, error: "Portfolio administrator authentication required." }, 403);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/content` && request.method === "GET") {
    return readPortfolioContent(env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/meta` && request.method === "POST") {
    return savePortfolioMeta(request, env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/cases` && request.method === "POST") {
    return savePortfolioCase(request, env);
  }

  if (url.pathname.startsWith(`${PORTFOLIO_API_PREFIX}/cases/`) && request.method === "DELETE") {
    const rawId = decodeURIComponent(url.pathname.slice(`${PORTFOLIO_API_PREFIX}/cases/`.length));
    return deletePortfolioCase(rawId, env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/uploads` && request.method === "POST") {
    return uploadPortfolioAsset(request, env);
  }

  return jsonResponse({ ok: false, error: "Not found." }, 404);
}

async function handleProtectedPromptDataAsset(request, env) {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return textResponse("Method not allowed.", 405, { Allow: "GET, HEAD" });
  }

  const response = await env.ASSETS.fetch(request);
  return withNoStore(response);
}

async function savePromptLibrary(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const normalized = normalizeLibrary(payload?.library || payload);
  const libraryJson = `${JSON.stringify(normalized, null, 2)}\n`;
  const secretMatch = findSecretLikeText(libraryJson);

  if (secretMatch) {
    return jsonResponse({
      ok: false,
      error: `Refused to publish possible secret content: ${secretMatch.label}.`
    }, 400);
  }

  try {
    const message = cleanCommitMessage(payload?.message || "Update prompt library", "Update prompt library");
    const result = await putGitHubFile(env, PROMPT_LIBRARY_PATH, encoder.encode(libraryJson), message, PROMPTS_TOKEN_ENV);
    return jsonResponse({
      ok: true,
      path: PROMPT_LIBRARY_PATH,
      commit: result.commit?.sha || null,
      url: result.content?.html_url || null
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub publish failed." }, 502);
  }
}

async function uploadPromptAsset(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid multipart form data." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonResponse({ ok: false, error: "Missing image file." }, 400);
  }

  const extension = getImageExtension(file.name, file.type);
  if (!extension) {
    return jsonResponse({ ok: false, error: "Only jpg, png, webp, gif, and svg images are supported." }, 415);
  }

  if (!file.size || file.size > MAX_ASSET_BYTES) {
    return jsonResponse({ ok: false, error: `Image must be between 1 byte and ${MAX_ASSET_BYTES} bytes.` }, 413);
  }

  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const now = new Date();
  const { year, month, timestamp } = timestampParts(now);
  const safeName = safeAssetFileName(file.name, extension);
  const relativePath = `${PROMPT_LIBRARY_PATH.replace(/\/library\.json$/, "")}/assets/${year}/${month}/${timestamp}-${hash.slice(0, 12)}-${safeName}`;
  const src = `/${relativePath}`;
  const title = cleanText(form.get("title")) || stripExtension(file.name) || "Untitled asset";
  const category = cleanText(form.get("category")) || "Uncategorized";
  const width = cleanNumber(form.get("width"));
  const height = cleanNumber(form.get("height"));
  const updatedAt = formatLocalTimestamp(now);

  try {
    await putGitHubFile(env, relativePath, new Uint8Array(buffer), `Upload prompt asset ${safeName}`, PROMPTS_TOKEN_ENV);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub asset upload failed." }, 502);
  }

  return jsonResponse({
    ok: true,
    asset: {
      id: `asset-${now.getTime().toString(36)}-${hash.slice(0, 8)}`,
      title,
      category,
      tags: [],
      src,
      notes: cleanText(form.get("notes")),
      relatedPromptIds: [],
      createdAt: updatedAt,
      updatedAt,
      hash,
      relativePath,
      fileName: file.name || safeName,
      size: file.size,
      mime: file.type || mimeFromExtension(extension),
      width,
      height,
      importedAt: updatedAt
    }
  });
}

async function readPortfolioContent(env) {
  try {
    const config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
    const [meta, caseEntries] = await Promise.all([
      getGitHubJsonFile(config, PORTFOLIO_META_PATH),
      listGitHubDirectory(config, PORTFOLIO_CASES_DIR)
    ]);

    const caseFiles = caseEntries
      .filter((entry) => entry?.type === "file" && /\.json$/i.test(entry.name || ""))
      .sort((a, b) => String(a.name).localeCompare(String(b.name), "zh-CN"));

    const cases = await Promise.all(caseFiles.map((entry) => getGitHubJsonFile(config, `${PORTFOLIO_CASES_DIR}/${entry.name}`)));

    return jsonResponse({
      ok: true,
      meta: normalizePortfolioMeta(meta),
      cases: cases.map(normalizePortfolioCase).filter((item) => item.id)
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "Failed to read portfolio content." }, 502);
  }
}

async function savePortfolioMeta(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const meta = normalizePortfolioMeta(payload?.meta || payload);
  const json = `${JSON.stringify(meta, null, 2)}\n`;
  const secretMatch = findSecretLikeText(json);
  if (secretMatch) {
    return jsonResponse({ ok: false, error: `Refused to publish possible secret content: ${secretMatch.label}.` }, 400);
  }

  try {
    const message = cleanCommitMessage(payload?.message || "Update portfolio meta", "Update portfolio meta");
    const result = await putGitHubFile(env, PORTFOLIO_META_PATH, encoder.encode(json), message, PORTFOLIO_TOKEN_ENV);
    return jsonResponse({
      ok: true,
      path: PORTFOLIO_META_PATH,
      commit: result.commit?.sha || null,
      url: result.content?.html_url || null
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub meta publish failed." }, 502);
  }
}

async function savePortfolioCase(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const caseItem = normalizePortfolioCase(payload?.caseItem || payload?.case || payload);
  if (!caseItem.id) {
    return jsonResponse({ ok: false, error: "Case id is required." }, 400);
  }

  const json = `${JSON.stringify(caseItem, null, 2)}\n`;
  const secretMatch = findSecretLikeText(json);
  if (secretMatch) {
    return jsonResponse({ ok: false, error: `Refused to publish possible secret content: ${secretMatch.label}.` }, 400);
  }

  const previousId = cleanCaseId(payload?.previousId || payload?.oldId || "");
  const nextPath = portfolioCasePath(caseItem.id);
  const previousPath = previousId && previousId !== caseItem.id ? portfolioCasePath(previousId) : "";

  try {
    const message = cleanCommitMessage(payload?.message || `Update portfolio case ${caseItem.id}`, `Update portfolio case ${caseItem.id}`);
    const result = await putGitHubFile(env, nextPath, encoder.encode(json), message, PORTFOLIO_TOKEN_ENV);
    let deletedPrevious = false;

    if (previousPath) {
      try {
        await deleteGitHubFile(env, previousPath, `Remove renamed portfolio case ${previousId}`, PORTFOLIO_TOKEN_ENV);
        deletedPrevious = true;
      } catch (error) {
        if (!String(error.message || "").includes("not found")) throw error;
      }
    }

    return jsonResponse({
      ok: true,
      caseItem,
      path: nextPath,
      previousPath: deletedPrevious ? previousPath : null,
      commit: result.commit?.sha || null,
      url: result.content?.html_url || null
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub case publish failed." }, 502);
  }
}

async function deletePortfolioCase(rawId, env) {
  const id = cleanCaseId(rawId);
  if (!id) {
    return jsonResponse({ ok: false, error: "Case id is required." }, 400);
  }

  try {
    const path = portfolioCasePath(id);
    const result = await deleteGitHubFile(env, path, `Delete portfolio case ${id}`, PORTFOLIO_TOKEN_ENV);
    return jsonResponse({
      ok: true,
      id,
      path,
      commit: result.commit?.sha || null
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub case delete failed." }, 502);
  }
}

async function uploadPortfolioAsset(request, env) {
  let form;
  try {
    form = await request.formData();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid multipart form data." }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return jsonResponse({ ok: false, error: "Missing image file." }, 400);
  }

  const extension = getImageExtension(file.name, file.type);
  if (!extension) {
    return jsonResponse({ ok: false, error: "Only jpg, png, webp, gif, and svg images are supported." }, 415);
  }

  if (!file.size || file.size > MAX_ASSET_BYTES) {
    return jsonResponse({ ok: false, error: `Image must be between 1 byte and ${MAX_ASSET_BYTES} bytes.` }, 413);
  }

  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const now = new Date();
  const { year, month, timestamp } = timestampParts(now);
  const safeName = safeAssetFileName(file.name, extension);
  const relativePath = `${PORTFOLIO_UPLOADS_DIR}/${year}/${month}/${timestamp}-${hash.slice(0, 12)}-${safeName}`;
  const src = `/${relativePath}`;
  const updatedAt = formatLocalTimestamp(now);

  try {
    await putGitHubFile(env, relativePath, new Uint8Array(buffer), `Upload portfolio asset ${safeName}`, PORTFOLIO_TOKEN_ENV);
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub asset upload failed." }, 502);
  }

  return jsonResponse({
    ok: true,
    upload: {
      id: `upload-${now.getTime().toString(36)}-${hash.slice(0, 8)}`,
      title: cleanText(form.get("title")) || stripExtension(file.name) || "Untitled upload",
      category: cleanText(form.get("category")) || "portfolio-cover",
      tags: cleanTextArray(form.get("tags")),
      src,
      relativePath,
      path: relativePath,
      fileName: file.name || safeName,
      size: file.size,
      mime: file.type || mimeFromExtension(extension),
      width: cleanNumber(form.get("width")),
      height: cleanNumber(form.get("height")),
      hash,
      createdAt: updatedAt,
      updatedAt
    }
  });
}

async function handleLogin(request, options) {
  const { password, cookieName, redirectPath, mode } = options;
  if (!password) {
    return textResponse(`${loginCopy(mode).title} password is not configured.`, 503);
  }

  let submitted = "";
  try {
    const form = await request.formData();
    submitted = String(form.get("password") || "");
  } catch {
    return renderLoginPage({ mode, hasError: true, status: 400 });
  }

  if (!constantTimeEqual(submitted, password)) {
    return renderLoginPage({ mode, hasError: true, status: 401 });
  }

  const expiresAt = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const signature = await signAuthValue(String(expiresAt), password);
  const cookie = [
    `${cookieName}=${expiresAt}.${signature}`,
    `Max-Age=${COOKIE_TTL_SECONDS}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    new URL(request.url).protocol === "https:" ? "Secure" : ""
  ].filter(Boolean).join("; ");

  return new Response(null, {
    status: 303,
    headers: noStoreHeaders({
      Location: redirectPath.endsWith("/") ? redirectPath : `${redirectPath}/`,
      "Set-Cookie": cookie
    })
  });
}

async function getPromptAuthState(request, env) {
  const [viewer, admin] = await Promise.all([
    hasValidAuthCookie(request, VIEW_COOKIE_NAME, env.PROMPT_LIBRARY_PASSWORD),
    hasValidAuthCookie(request, PROMPT_ADMIN_COOKIE_NAME, env.PROMPT_LIBRARY_ADMIN_PASSWORD)
  ]);

  return { viewer, admin };
}

async function hasValidAuthCookie(request, cookieName, password) {
  if (!password) return false;

  const cookieHeader = request.headers.get("Cookie") || "";
  const cookie = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookie) return false;

  const value = cookie.slice(cookieName.length + 1);
  const [expiresAtText, signature] = value.split(".");
  const expiresAt = Number(expiresAtText);

  if (!Number.isFinite(expiresAt) || expiresAt <= Math.floor(Date.now() / 1000) || !signature) {
    return false;
  }

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

function normalizeLibrary(raw) {
  const now = formatLocalTimestamp(new Date());
  const prompts = asArray(raw?.prompts).map((prompt) => ({
    id: cleanId(prompt?.id, "prompt"),
    title: cleanText(prompt?.title) || "Untitled prompt",
    category: cleanText(prompt?.category) || "Uncategorized",
    tags: cleanTextArray(prompt?.tags),
    variables: cleanTextArray(prompt?.variables),
    status: cleanText(prompt?.status) || "Draft",
    summary: cleanText(prompt?.summary),
    body: cleanText(prompt?.body),
    source: cleanText(prompt?.source) || "Manual",
    createdAt: cleanText(prompt?.createdAt) || now,
    updatedAt: cleanText(prompt?.updatedAt) || now,
    archived: Boolean(prompt?.archived)
  }));
  const promptIds = new Set(prompts.map((prompt) => prompt.id));
  const assets = asArray(raw?.assets).map((asset) => ({
    id: cleanId(asset?.id, "asset"),
    title: cleanText(asset?.title) || "Untitled asset",
    category: cleanText(asset?.category) || "Uncategorized",
    tags: cleanTextArray(asset?.tags),
    src: cleanPromptAssetSrc(asset?.src),
    notes: cleanText(asset?.notes),
    relatedPromptIds: cleanTextArray(asset?.relatedPromptIds).filter((id) => promptIds.has(id)),
    createdAt: cleanText(asset?.createdAt) || now,
    updatedAt: cleanText(asset?.updatedAt) || now,
    hash: cleanText(asset?.hash),
    relativePath: cleanPromptRelativePath(asset?.relativePath || asset?.src),
    fileName: cleanText(asset?.fileName || asset?.title),
    size: cleanNumber(asset?.size),
    mime: cleanText(asset?.mime),
    width: cleanNumber(asset?.width),
    height: cleanNumber(asset?.height),
    importedAt: cleanText(asset?.importedAt || asset?.createdAt) || now
  }));

  return {
    version: 2,
    migratedAt: cleanText(raw?.migratedAt) || now,
    updatedAt: cleanText(raw?.updatedAt) || now,
    prompts,
    assets
  };
}

function normalizePortfolioMeta(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...source,
    siteTitle: cleanText(source.siteTitle),
    siteDescription: cleanText(source.siteDescription),
    siteKeywords: cleanTextArray(source.siteKeywords),
    canonicalUrl: cleanText(source.canonicalUrl),
    ogTitle: cleanText(source.ogTitle),
    ogDescription: cleanText(source.ogDescription),
    ogImage: cleanPortfolioMediaPath(source.ogImage),
    twitterCard: cleanText(source.twitterCard) || "summary_large_image",
    caseSectionTitle: cleanText(source.caseSectionTitle),
    caseSectionDesc: cleanText(source.caseSectionDesc),
    contactSectionTitle: cleanText(source.contactSectionTitle),
    contactSectionDesc: cleanText(source.contactSectionDesc),
    formspreeEndpoint: cleanText(source.formspreeEndpoint),
    contactCtaLabel: cleanText(source.contactCtaLabel)
  };
}

function normalizePortfolioCase(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  return {
    ...source,
    id: cleanCaseId(source.id),
    title: cleanText(source.title) || "Untitled case",
    cover: cleanPortfolioMediaPath(source.cover),
    category: cleanText(source.category) || "Uncategorized",
    tags: cleanTextArray(source.tags),
    description: cleanText(source.description),
    results: normalizePortfolioResults(source.results || source.resultItems),
    tools: cleanTextArray(source.tools),
    slideIds: normalizeNumberArray(source.slideIds)
  };
}

function normalizePortfolioResults(value) {
  if (Array.isArray(value)) {
    return value
      .map((item) => ({
        label: cleanText(item?.label),
        value: cleanText(item?.value)
      }))
      .filter((item) => item.label || item.value);
  }

  if (value && typeof value === "object") {
    return Object.entries(value)
      .map(([label, resultValue]) => ({ label: cleanText(label), value: cleanText(resultValue) }))
      .filter((item) => item.label || item.value);
  }

  return [];
}

function asArray(value) {
  return Array.isArray(value) ? value : [];
}

function cleanText(value) {
  return String(value ?? "").trim();
}

function cleanTextArray(value) {
  if (Array.isArray(value)) return value.map(cleanText).filter(Boolean);
  return String(value ?? "").split(/[,，\n]/).map(cleanText).filter(Boolean);
}

function normalizeNumberArray(value) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => Number(item))
    .filter((item) => Number.isFinite(item));
}

function cleanId(value, prefix) {
  const text = cleanText(value).replace(/[^A-Za-z0-9_-]/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return text || `${prefix}-${Date.now().toString(36)}`;
}

function cleanCaseId(value) {
  return cleanText(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function cleanNumber(value) {
  const number = Number(value || 0);
  return Number.isFinite(number) && number > 0 ? Math.round(number) : 0;
}

function cleanPromptAssetSrc(value) {
  const text = cleanText(value);
  if (!text) return "";
  if (text.startsWith("/prompts-data/assets/")) return text;
  if (text.startsWith("prompts-data/assets/")) return `/${text}`;
  return "";
}

function cleanPromptRelativePath(value) {
  const text = cleanText(value).replace(/^\/+/, "");
  return text.startsWith("prompts-data/assets/") ? text : "";
}

function cleanPortfolioMediaPath(value) {
  const text = cleanText(value);
  if (!text) return "";
  if (/^https?:\/\//i.test(text)) return text;
  const normalized = text.replace(/^[./\\]+/, "").replace(/\\/g, "/");
  if (!normalized || normalized.includes("..")) return "";
  return normalized;
}

function cleanCommitMessage(value, fallback = "Update content") {
  return cleanText(value).replace(/[\r\n]+/g, " ").slice(0, 120) || fallback;
}

function portfolioCasePath(id) {
  return `${PORTFOLIO_CASES_DIR}/${cleanCaseId(id)}.json`;
}

function findSecretLikeText(text) {
  return SECRET_PATTERNS.find(({ pattern }) => pattern.test(text)) || null;
}

async function putGitHubFile(env, filePath, bytes, message, tokenEnvName) {
  const config = getGitHubConfig(env, tokenEnvName);
  const encodedPath = encodeRepoPath(filePath);
  const existing = await getGitHubFileSha(config, encodedPath);
  const payload = {
    message,
    content: base64FromBytes(bytes),
    branch: config.branch,
    ...(existing ? { sha: existing } : {})
  };
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`, {
    method: "PUT",
    headers: githubHeaders(config.token),
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response, "GitHub write failed"));
  }

  return response.json();
}

async function deleteGitHubFile(env, filePath, message, tokenEnvName) {
  const config = getGitHubConfig(env, tokenEnvName);
  const encodedPath = encodeRepoPath(filePath);
  const existing = await getGitHubFileSha(config, encodedPath);
  if (!existing) {
    throw new Error(`GitHub file not found: ${filePath}`);
  }

  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}`, {
    method: "DELETE",
    headers: githubHeaders(config.token),
    body: JSON.stringify({
      message,
      sha: existing,
      branch: config.branch
    })
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response, "GitHub delete failed"));
  }

  return response.json();
}

async function getGitHubJsonFile(config, filePath) {
  const content = await getGitHubFileContent(config, filePath);
  try {
    return JSON.parse(content.text);
  } catch {
    throw new Error(`Invalid JSON in ${filePath}.`);
  }
}

async function getGitHubFileContent(config, filePath) {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeRepoPath(filePath)}?ref=${encodeURIComponent(config.branch)}`, {
    headers: githubHeaders(config.token)
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response, `GitHub read failed for ${filePath}`));
  }

  const data = await response.json();
  if (typeof data.content !== "string") {
    throw new Error(`GitHub file has no content: ${filePath}`);
  }

  return {
    text: utf8FromBase64(data.content.replace(/\s+/g, "")),
    sha: typeof data.sha === "string" ? data.sha : "",
    htmlUrl: data.html_url || ""
  };
}

async function listGitHubDirectory(config, dirPath) {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodeRepoPath(dirPath)}?ref=${encodeURIComponent(config.branch)}`, {
    headers: githubHeaders(config.token)
  });

  if (response.status === 404) return [];
  if (!response.ok) {
    throw new Error(await readGitHubError(response, `GitHub directory read failed for ${dirPath}`));
  }

  const data = await response.json();
  if (!Array.isArray(data)) {
    throw new Error(`GitHub path is not a directory: ${dirPath}`);
  }

  return data;
}

async function getGitHubFileSha(config, encodedPath) {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/contents/${encodedPath}?ref=${encodeURIComponent(config.branch)}`, {
    headers: githubHeaders(config.token)
  });

  if (response.status === 404) return null;
  if (!response.ok) {
    throw new Error(await readGitHubError(response, "GitHub read failed"));
  }

  const data = await response.json();
  return typeof data.sha === "string" ? data.sha : null;
}

function getGitHubConfig(env, tokenEnvName) {
  const token = env[tokenEnvName];
  if (!token) throw new Error(`${tokenEnvName} is not configured.`);

  const prefix = tokenEnvName === PORTFOLIO_TOKEN_ENV ? "PORTFOLIO" : "PROMPTS";
  return {
    token,
    owner: env[`${prefix}_GITHUB_OWNER`] || env.PROMPTS_GITHUB_OWNER || DEFAULT_GITHUB_OWNER,
    repo: env[`${prefix}_GITHUB_REPO`] || env.PROMPTS_GITHUB_REPO || DEFAULT_GITHUB_REPO,
    branch: env[`${prefix}_GITHUB_BRANCH`] || env.PROMPTS_GITHUB_BRANCH || DEFAULT_GITHUB_BRANCH
  };
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "User-Agent": "zhangwei-site-worker",
    "X-GitHub-Api-Version": "2022-11-28"
  };
}

function encodeRepoPath(filePath) {
  return cleanText(filePath).split("/").map(encodeURIComponent).join("/");
}

async function readGitHubError(response, fallback) {
  const text = await response.text();
  try {
    const data = JSON.parse(text);
    return `${fallback}: ${data.message || response.statusText}`;
  } catch {
    return `${fallback}: ${response.status} ${response.statusText}`;
  }
}

async function sha256Hex(buffer) {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getImageExtension(fileName, mime) {
  const extension = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  const mimeExtension = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/gif": "gif",
    "image/svg+xml": "svg"
  }[String(mime || "").toLowerCase()];
  const candidate = extension === "jpeg" ? "jpg" : extension;
  if (["jpg", "png", "webp", "gif", "svg"].includes(candidate)) return candidate;
  return mimeExtension || "";
}

function safeAssetFileName(fileName, extension) {
  const base = stripExtension(fileName)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72) || "asset";
  return `${base}.${extension}`;
}

function stripExtension(fileName) {
  return String(fileName || "").replace(/\.[^.]+$/, "").trim();
}

function mimeFromExtension(extension) {
  return {
    jpg: "image/jpeg",
    png: "image/png",
    webp: "image/webp",
    gif: "image/gif",
    svg: "image/svg+xml"
  }[extension] || "application/octet-stream";
}

function timestampParts(date) {
  return {
    year: String(date.getUTCFullYear()),
    month: String(date.getUTCMonth() + 1).padStart(2, "0"),
    timestamp: date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")
  };
}

function formatLocalTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
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
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return decoder.decode(bytes);
}

function constantTimeEqual(left, right) {
  const a = encoder.encode(String(left || ""));
  const b = encoder.encode(String(right || ""));
  const maxLength = Math.max(a.length, b.length);
  let result = a.length ^ b.length;
  for (let index = 0; index < maxLength; index += 1) {
    result |= (a[index] || 0) ^ (b[index] || 0);
  }
  return result === 0;
}

function loginCopy(mode) {
  if (mode === "portfolio-admin") {
    return {
      title: "Portfolio CMS",
      heading: "Portfolio CMS 管理后台",
      intro: "输入管理员密码后，可以管理 data/meta.json 和 data/cases/*.json。",
      label: "管理员密码",
      action: PORTFOLIO_ADMIN_LOGIN_PATH,
      button: "进入后台",
      error: "管理员密码不正确，请重试。"
    };
  }

  if (mode === "prompt-admin") {
    return {
      title: "提示词仓库管理员入口",
      heading: "提示词仓库管理员入口",
      intro: "请输入管理员密码。",
      label: "管理员密码",
      action: PROMPT_ADMIN_LOGIN_PATH,
      button: "进入管理后台",
      error: "管理员密码不正确，请重试。"
    };
  }

  return {
    title: "提示词仓库访问验证",
    heading: "提示词仓库",
    intro: "请输入访问密码。",
    label: "访问密码",
    action: VIEW_LOGIN_PATH,
    button: "进入仓库",
    error: "密码不正确，请重试。"
  };
}

function renderLoginPage({ mode, hasError, status = 200 }) {
  const copy = loginCopy(mode);
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${copy.title}</title>
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f5f6f3;
      color: #202421;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
    }
    main {
      width: min(420px, calc(100vw - 32px));
      border: 1px solid #d8dfda;
      border-radius: 8px;
      background: #fff;
      box-shadow: 0 18px 60px rgba(22, 31, 27, 0.12);
      padding: 24px;
    }
    h1 { margin: 0 0 6px; font-size: 22px; line-height: 1.25; }
    p { margin: 0 0 18px; color: #657067; font-size: 14px; line-height: 1.7; }
    label { display: grid; gap: 8px; color: #657067; font-size: 13px; font-weight: 700; }
    input {
      width: 100%;
      height: 42px;
      border: 1px solid #d8dfda;
      border-radius: 8px;
      padding: 0 12px;
      font: 15px inherit;
    }
    input:focus { outline: 0; border-color: #0f766e; box-shadow: 0 0 0 3px rgba(15, 118, 110, 0.14); }
    button {
      width: 100%;
      height: 42px;
      margin-top: 14px;
      border: 1px solid #0f766e;
      border-radius: 8px;
      background: #0f766e;
      color: #fff;
      font: 700 14px inherit;
      cursor: pointer;
    }
    .error {
      margin: 0 0 12px;
      padding: 10px;
      border: 1px solid rgba(185, 28, 28, 0.25);
      border-radius: 8px;
      color: #991b1b;
      background: #fef2f2;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <main>
    <h1>${copy.heading}</h1>
    <p>${copy.intro}</p>
    ${hasError ? `<div class="error">${copy.error}</div>` : ""}
    <form method="post" action="${copy.action}">
      <label>${copy.label}
        <input name="password" type="password" autocomplete="current-password" autofocus required>
      </label>
      <button type="submit">${copy.button}</button>
    </form>
  </main>
</body>
</html>`;

  return new Response(html, {
    status,
    headers: noStoreHeaders({ "Content-Type": "text/html; charset=utf-8" })
  });
}

function jsonResponse(payload, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: noStoreHeaders({ "Content-Type": "application/json; charset=utf-8" })
  });
}

function textResponse(message, status = 200, headers = {}) {
  return new Response(message, {
    status,
    headers: noStoreHeaders({ "Content-Type": "text/plain; charset=utf-8", ...headers })
  });
}

function withNoStore(response) {
  const next = new Response(response.body, response);
  next.headers.set("Cache-Control", "no-store");
  next.headers.set("CDN-Cache-Control", "no-store");
  return next;
}

function noStoreHeaders(headers = {}) {
  return {
    ...headers,
    "Cache-Control": "no-store",
    "CDN-Cache-Control": "no-store"
  };
}
