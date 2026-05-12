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
const PORTFOLIO_JSON_PATH = "data/portfolio.json";
const PORTFOLIO_META_PATH = "data/meta.json";
const GALLERY_WORLDS_PATH = "data/gallery-worlds.json";
const GALLERY_IMAGE_LIBRARY_PATH = "data/gallery-image-library.json";
const PORTFOLIO_CASES_DIR = "data/cases";
const PORTFOLIO_IMAGE_UPLOADS_DIR = "images/uploads";
const PORTFOLIO_VIDEO_UPLOADS_DIR = "videos/uploads";
const PORTFOLIO_ASSET_ROOTS = [
  "images/uploads",
  "videos/uploads",
  "images/works",
  "images/curated",
  "images/generated",
  "images/_posters",
  "videos"
];
const PORTFOLIO_DELETABLE_ASSET_PREFIXES = [
  `${PORTFOLIO_IMAGE_UPLOADS_DIR}/`,
  `${PORTFOLIO_VIDEO_UPLOADS_DIR}/`
];
const PORTFOLIO_DEPLOY_WORKFLOW_ID = "deploy-cloudflare-worker.yml";

const VIEW_COOKIE_NAME = "prompt_library_auth";
const PROMPT_ADMIN_COOKIE_NAME = "prompt_library_admin_auth";
const PORTFOLIO_ADMIN_COOKIE_NAME = "portfolio_admin_auth";
const COOKIE_TTL_SECONDS = 60 * 60 * 24 * 7;
const MAX_IMAGE_ASSET_BYTES = 32 * 1024 * 1024;
const MAX_VIDEO_ASSET_BYTES = 95 * 1024 * 1024;

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
    if (url.pathname === PROMPT_ADMIN_PREFIX || url.pathname === PROMPT_ADMIN_LOGIN_PATH) {
      return Response.redirect(new URL(`${PROMPT_ADMIN_PREFIX}/`, url), 302);
    }

    if (!env.PROMPT_LIBRARY_ADMIN_PASSWORD) {
      return textResponse("Prompt library admin password is not configured.", 503);
    }

    const auth = await getPromptAuthState(request, env);
    if (!auth.admin) {
      return renderLoginPage({ mode: "prompt-admin", hasError: false });
    }

    return servePromptApp(request, env, url, true);
  }

  if (url.pathname === VIEW_LOGIN_PATH) {
    return Response.redirect(new URL(`${PROMPTS_PREFIX}/`, url), 302);
  }

  if (url.pathname === PROMPTS_PREFIX) {
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

  if (url.pathname === PORTFOLIO_ADMIN_PREFIX || url.pathname === PORTFOLIO_ADMIN_LOGIN_PATH) {
    return Response.redirect(new URL(`${PORTFOLIO_ADMIN_PREFIX}/`, url), 302);
  }

  if (!env.PORTFOLIO_ADMIN_PASSWORD) {
    return textResponse("Portfolio admin password is not configured.", 503);
  }

  const isAdmin = await hasValidAuthCookie(request, PORTFOLIO_ADMIN_COOKIE_NAME, env.PORTFOLIO_ADMIN_PASSWORD);
  if (!isAdmin) {
    return renderLoginPage({ mode: "portfolio-admin", hasError: false });
  }

  return servePortfolioEditorApp(request, env, url);
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

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/capabilities` && request.method === "GET") {
    return readPortfolioAdminCapabilities(env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/assets/diagnostics` && request.method === "GET") {
    return readPortfolioAssetDiagnostics(env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/deployment-status` && request.method === "GET") {
    return readPortfolioDeploymentStatus(url, env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/portfolio-json` && request.method === "POST") {
    return savePortfolioJson(request, env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/media-replacement` && request.method === "POST") {
    return savePortfolioMediaReplacement(request, env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/gallery-worlds` && request.method === "POST") {
    return saveGalleryWorlds(request, env);
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

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/assets` && request.method === "GET") {
    return listPortfolioAssets(env);
  }

  if (url.pathname === `${PORTFOLIO_API_PREFIX}/assets` && request.method === "DELETE") {
    return deletePortfolioAsset(request, env);
  }

  return jsonResponse({ ok: false, error: "Not found." }, 404);
}

async function servePortfolioEditorApp(request, env, url) {
  const assetUrl = new URL(url);
  assetUrl.pathname = "/";
  assetUrl.search = "";
  const response = await env.ASSETS.fetch(new Request(assetUrl, request));
  const contentType = response.headers.get("Content-Type") || "";
  if (!contentType.includes("text/html")) return withNoStore(response);

  const html = await response.text();
  const injection = [
    '<base href="/">',
    '<script>window.__PORTFOLIO_ADMIN_MODE__ = true;</script>'
  ].join("\n  ");
  const body = html.includes("<head>")
    ? html.replace("<head>", `<head>\n  ${injection}`)
    : `${injection}\n${html}`;
  const headers = new Headers(response.headers);
  headers.set("Content-Type", "text/html; charset=utf-8");
  headers.set("Cache-Control", "no-store");
  headers.set("CDN-Cache-Control", "no-store");
  return new Response(body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
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
    return jsonResponse({ ok: false, error: "Missing media file." }, 400);
  }

  const extension = getImageExtension(file.name, file.type);
  if (!extension) {
    return jsonResponse({ ok: false, error: "Only jpg, png, webp, gif, and svg images are supported." }, 415);
  }

  if (!file.size || file.size > MAX_IMAGE_ASSET_BYTES) {
    return jsonResponse({ ok: false, error: `Image must be between 1 byte and ${MAX_IMAGE_ASSET_BYTES} bytes.` }, 413);
  }

  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const now = new Date();
  const { year, month, timestamp } = timestampParts(now);
  const safeName = safeAssetFileName(file.name, extension);
  const relativePath = `${PROMPT_LIBRARY_PATH.replace(/\/library\.json$/, "")}/assets/${year}/${month}/${timestamp}-${hash.slice(0, 12)}-${safeName}`;
  const src = relativePath;
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

async function readPortfolioAdminCapabilities(env) {
  const report = await buildPortfolioAdminCapabilityReport(env, { includeAssets: false });
  return jsonResponse(report);
}

async function readPortfolioAssetDiagnostics(env) {
  const report = await buildPortfolioAdminCapabilityReport(env, { includeAssets: true });
  return jsonResponse(report);
}

async function buildPortfolioAdminCapabilityReport(env, options = {}) {
  const report = {
    ok: true,
    ready: false,
    checkedAt: new Date().toISOString(),
    repo: {
      owner: env.PORTFOLIO_GITHUB_OWNER || env.PROMPTS_GITHUB_OWNER || DEFAULT_GITHUB_OWNER,
      repo: env.PORTFOLIO_GITHUB_REPO || env.PROMPTS_GITHUB_REPO || DEFAULT_GITHUB_REPO,
      branch: env.PORTFOLIO_GITHUB_BRANCH || env.PROMPTS_GITHUB_BRANCH || DEFAULT_GITHUB_BRANCH
    },
    secrets: {
      portfolioAdminPassword: Boolean(env.PORTFOLIO_ADMIN_PASSWORD),
      portfolioGitHubToken: Boolean(env.PORTFOLIO_GITHUB_TOKEN)
    },
    capabilities: {
      assets: {
        list: false,
        upload: false,
        delete: false,
        replace: false,
        reason: ""
      },
      deployment: {
        status: false,
        reason: ""
      }
    },
    diagnostics: [],
    assets: null,
    deployment: null
  };

  if (!env.PORTFOLIO_GITHUB_TOKEN) {
    report.capabilities.assets.reason = `${PORTFOLIO_TOKEN_ENV} is not configured.`;
    report.capabilities.deployment.reason = `${PORTFOLIO_TOKEN_ENV} is not configured.`;
    report.diagnostics.push({ level: "error", code: "missing-token", message: report.capabilities.assets.reason });
    return report;
  }

  let config;
  try {
    config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
    report.repo = { owner: config.owner, repo: config.repo, branch: config.branch };
    const portfolioFile = await getGitHubFileContent(config, PORTFOLIO_JSON_PATH);
    report.capabilities.assets.list = true;
    report.capabilities.assets.upload = true;
    report.capabilities.assets.delete = true;
    report.capabilities.assets.replace = true;
    report.capabilities.assets.reason = "";
    report.ready = true;
    report.diagnostics.push({
      level: "info",
      code: "github-read-ok",
      message: `GitHub read OK for ${PORTFOLIO_JSON_PATH}.`,
      path: PORTFOLIO_JSON_PATH,
      sha: portfolioFile.sha || ""
    });
  } catch (error) {
    const message = error.message || "GitHub capability check failed.";
    report.capabilities.assets.reason = message;
    report.capabilities.deployment.reason = message;
    report.diagnostics.push({ level: "error", code: "github-read-failed", message });
    return report;
  }

  if (options.includeAssets) {
    try {
      const assets = await listPortfolioAssetFiles(config);
      report.assets = {
        count: assets.length,
        roots: PORTFOLIO_ASSET_ROOTS,
        deletablePrefixes: PORTFOLIO_DELETABLE_ASSET_PREFIXES,
        sample: assets.slice(0, 12).map((asset) => asset.path)
      };
      report.diagnostics.push({
        level: assets.length ? "info" : "warn",
        code: assets.length ? "assets-found" : "assets-empty",
        message: assets.length ? `Found ${assets.length} portfolio assets.` : "No portfolio assets were found under configured roots."
      });
    } catch (error) {
      const message = error.message || "Asset scan failed.";
      report.ready = false;
      report.capabilities.assets.list = false;
      report.capabilities.assets.reason = message;
      report.diagnostics.push({ level: "error", code: "asset-scan-failed", message });
    }
  }

  try {
    report.deployment = await getLatestPortfolioDeployment(config);
    report.capabilities.deployment.status = Boolean(report.deployment?.available);
    report.capabilities.deployment.reason = report.deployment?.available ? "" : (report.deployment?.error || "Deployment status is unavailable.");
  } catch (error) {
    report.capabilities.deployment.reason = error.message || "Deployment status is unavailable.";
    report.deployment = { available: false, error: report.capabilities.deployment.reason };
  }

  return report;
}

async function readPortfolioDeploymentStatus(url, env) {
  try {
    const config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
    const commit = cleanText(url.searchParams.get("commit"));
    const deployment = await getLatestPortfolioDeployment(config, commit);
    return jsonResponse({ ok: true, deployment });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "Deployment status is unavailable." }, 502);
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

async function savePortfolioJson(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const portfolio = normalizePortfolioJson(payload?.portfolio || payload);
  if (!portfolio.slides.length) {
    return jsonResponse({ ok: false, error: "Portfolio JSON must contain at least one slide." }, 400);
  }

  const json = `${JSON.stringify(portfolio, null, 2)}\n`;
  const secretMatch = findSecretLikeText(json);
  if (secretMatch) {
    return jsonResponse({ ok: false, error: `Refused to publish possible secret content: ${secretMatch.label}.` }, 400);
  }

  try {
    const message = cleanCommitMessage(payload?.message || "Update portfolio JSON", "Update portfolio JSON");
    const result = await putGitHubFile(env, PORTFOLIO_JSON_PATH, encoder.encode(json), message, PORTFOLIO_TOKEN_ENV);
    const deployment = await safeGetLatestPortfolioDeployment(env, result.commit?.sha || "");
    return jsonResponse({
      ok: true,
      path: PORTFOLIO_JSON_PATH,
      commit: result.commit?.sha || null,
      url: result.content?.html_url || null,
      deployment
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub portfolio publish failed." }, 502);
  }
}

async function savePortfolioMediaReplacement(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const target = payload?.target && typeof payload.target === "object" ? payload.target : null;
  const asset = payload?.asset && typeof payload.asset === "object" ? payload.asset : null;
  if (!target || !asset) {
    return jsonResponse({ ok: false, error: "A replacement target and asset are required." }, 400);
  }

  try {
    const config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
    const currentPortfolio = normalizePortfolioJson(await getGitHubJsonFile(config, PORTFOLIO_JSON_PATH));
    const replacement = buildPortfolioReplacementMedia(asset, target);
    const nextPortfolio = replacePortfolioMediaInModel(currentPortfolio, target, replacement);
    if (!nextPortfolio.slides.length) {
      return jsonResponse({ ok: false, error: "Portfolio JSON must contain at least one slide." }, 400);
    }

    const json = `${JSON.stringify(nextPortfolio, null, 2)}\n`;
    const secretMatch = findSecretLikeText(json);
    if (secretMatch) {
      return jsonResponse({ ok: false, error: `Refused to publish possible secret content: ${secretMatch.label}.` }, 400);
    }

    const label = cleanText(target.label) || cleanText(asset.name || asset.title) || "portfolio media";
    const message = cleanCommitMessage(payload?.message || `Replace portfolio media ${label}`, "Replace portfolio media");
    const result = await putGitHubFile(env, PORTFOLIO_JSON_PATH, encoder.encode(json), message, PORTFOLIO_TOKEN_ENV);
    const deployment = await safeGetLatestPortfolioDeployment(env, result.commit?.sha || "");
    return jsonResponse({
      ok: true,
      path: PORTFOLIO_JSON_PATH,
      commit: result.commit?.sha || null,
      url: result.content?.html_url || null,
      target: cleanPortfolioReplacementTarget(target),
      replacement,
      portfolio: nextPortfolio,
      deployment
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "Portfolio media replacement failed." }, 502);
  }
}

async function saveGalleryWorlds(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const galleryData = normalizeGalleryWorldsData(payload?.galleryWorldsData || payload?.galleryWorlds || payload);
  if (!galleryData.works.length) {
    return jsonResponse({ ok: false, error: "Gallery worlds JSON must contain at least one work." }, 400);
  }
  if (!galleryData.galleryWorlds.length) {
    return jsonResponse({ ok: false, error: "Gallery worlds JSON must contain at least one world." }, 400);
  }

  const draftOnlyPoster = galleryData.works.find((work) => {
    const poster = String(work.poster || "").trim();
    return poster.startsWith("blob:") || poster.startsWith("data:");
  });
  if (draftOnlyPoster) {
    return jsonResponse({ ok: false, error: `Work ${draftOnlyPoster.id || draftOnlyPoster.title || ""} still uses a local preview image.` }, 400);
  }

  const json = `${JSON.stringify(galleryData, null, 2)}\n`;
  const secretMatch = findSecretLikeText(json);
  if (secretMatch) {
    return jsonResponse({ ok: false, error: `Refused to publish possible secret content: ${secretMatch.label}.` }, 400);
  }

  try {
    const message = cleanCommitMessage(payload?.message || "Update immersive gallery worlds", "Update immersive gallery worlds");
    const result = await putGitHubFile(env, GALLERY_WORLDS_PATH, encoder.encode(json), message, PORTFOLIO_TOKEN_ENV);
    return jsonResponse({
      ok: true,
      path: GALLERY_WORLDS_PATH,
      commit: result.commit?.sha || null,
      url: result.content?.html_url || null
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub gallery worlds publish failed." }, 502);
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

async function listPortfolioAssets(env) {
  try {
    const config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
    const [files, usage] = await Promise.all([
      listPortfolioAssetFiles(config),
      collectPortfolioAssetUsage(config)
    ]);

    const assets = files
      .map((entry) => normalizePortfolioAssetEntry(entry, usage))
      .sort((a, b) => {
        if (a.isUploaded !== b.isUploaded) return a.isUploaded ? -1 : 1;
        if (a.used !== b.used) return a.used ? -1 : 1;
        return String(a.path).localeCompare(String(b.path), "zh-CN");
      });

    return jsonResponse({
      ok: true,
      branch: config.branch,
      assets,
      deletablePrefixes: PORTFOLIO_DELETABLE_ASSET_PREFIXES
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "Failed to read portfolio assets." }, 502);
  }
}

async function deletePortfolioAsset(request, env) {
  let payload;
  try {
    payload = await request.json();
  } catch {
    return jsonResponse({ ok: false, error: "Invalid JSON payload." }, 400);
  }

  const assetPath = cleanDeletablePortfolioAssetPath(payload?.path || payload?.assetPath);
  if (!assetPath) {
    return jsonResponse({ ok: false, error: "Only files under images/uploads/ or videos/uploads/ can be deleted from the admin asset library." }, 400);
  }

  try {
    const config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
    const usage = await collectPortfolioAssetUsage(config);
    const references = usage.referencesByPath.get(assetPath) || [];
    if (references.length) {
      return jsonResponse({
        ok: false,
        error: "This asset is still referenced by portfolio data. Remove or replace those references before deleting it.",
        references
      }, 409);
    }

    const catalogResult = usage.catalogPaths.has(assetPath)
      ? await removePortfolioAssetFromGalleryLibrary(env, assetPath)
      : null;
    const deleteResult = await deleteGitHubFile(env, assetPath, `Delete portfolio asset ${assetPath}`, PORTFOLIO_TOKEN_ENV);

    return jsonResponse({
      ok: true,
      path: assetPath,
      commit: deleteResult.commit?.sha || null,
      catalogCommit: catalogResult?.commit?.sha || null
    });
  } catch (error) {
    return jsonResponse({ ok: false, error: error.message || "GitHub asset delete failed." }, 502);
  }
}

async function listPortfolioAssetFiles(config) {
  const treeData = await getGitHubRecursiveTree(config);
  const seen = new Set();
  return asArray(treeData.tree)
    .filter((entry) => {
      if (entry?.type !== "blob") return false;
      const path = cleanPortfolioMediaPath(entry?.path || "");
      if (!path || seen.has(path) || !isPortfolioAssetFilePath(path)) return false;
      if (!PORTFOLIO_ASSET_ROOTS.some((root) => path === root || path.startsWith(`${root}/`))) return false;
      seen.add(path);
      return true;
    })
    .map((entry) => {
      const path = cleanPortfolioMediaPath(entry.path);
      return {
        type: "file",
        path,
        name: path.split("/").pop() || path,
        size: Number(entry.size) || 0,
        sha: cleanText(entry.sha),
        html_url: `https://github.com/${config.owner}/${config.repo}/blob/${encodeURIComponent(config.branch)}/${path.split("/").map(encodeURIComponent).join("/")}`,
        download_url: `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${encodeURIComponent(config.branch)}/${path.split("/").map(encodeURIComponent).join("/")}`
      };
    });
}

async function listGitHubFilesRecursive(config, dirPath, depth) {
  if (depth < 0) return [];
  const entries = await listGitHubDirectory(config, dirPath);
  const files = [];

  for (const entry of entries) {
    const path = cleanPortfolioMediaPath(entry?.path || "");
    if (!path) continue;
    if (entry.type === "file") {
      files.push(entry);
    } else if (entry.type === "dir") {
      files.push(...await listGitHubFilesRecursive(config, path, depth - 1));
    }
  }

  return files;
}

async function collectPortfolioAssetUsage(config) {
  const referencesByPath = new Map();
  const catalogPaths = new Set();
  const [portfolioJson, metaJson, galleryWorlds, galleryImageLibrary, caseEntries] = await Promise.all([
    getOptionalGitHubJsonFile(config, PORTFOLIO_JSON_PATH),
    getOptionalGitHubJsonFile(config, PORTFOLIO_META_PATH),
    getOptionalGitHubJsonFile(config, GALLERY_WORLDS_PATH),
    getOptionalGitHubJsonFile(config, GALLERY_IMAGE_LIBRARY_PATH),
    listGitHubDirectory(config, PORTFOLIO_CASES_DIR)
  ]);

  collectPortfolioMediaReferences(portfolioJson, PORTFOLIO_JSON_PATH, referencesByPath);
  collectPortfolioMediaReferences(metaJson, PORTFOLIO_META_PATH, referencesByPath);
  collectPortfolioMediaReferences(galleryWorlds, GALLERY_WORLDS_PATH, referencesByPath);

  const caseFiles = caseEntries
    .filter((entry) => entry?.type === "file" && /\.json$/i.test(entry.name || ""))
    .sort((a, b) => String(a.name).localeCompare(String(b.name), "zh-CN"));
  const caseItems = await Promise.all(caseFiles.map((entry) => getOptionalGitHubJsonFile(config, `${PORTFOLIO_CASES_DIR}/${entry.name}`)));
  caseItems.forEach((caseItem, index) => {
    const source = caseFiles[index]?.name ? `${PORTFOLIO_CASES_DIR}/${caseFiles[index].name}` : PORTFOLIO_CASES_DIR;
    collectPortfolioMediaReferences(caseItem, source, referencesByPath);
  });

  asArray(galleryImageLibrary?.images).forEach((item) => {
    const path = normalizePortfolioReferencePath(item?.src || item?.url || "");
    if (path) catalogPaths.add(path);
  });

  return { referencesByPath, catalogPaths };
}

async function getOptionalGitHubJsonFile(config, filePath) {
  try {
    return await getGitHubJsonFile(config, filePath);
  } catch (error) {
    if (String(error.message || "").toLowerCase().includes("not found")) return null;
    throw error;
  }
}

function collectPortfolioMediaReferences(value, source, referencesByPath) {
  if (typeof value === "string") {
    const path = normalizePortfolioReferencePath(value);
    if (path) {
      const references = referencesByPath.get(path) || [];
      if (!references.some((entry) => entry.source === source)) references.push({ source });
      referencesByPath.set(path, references);
    }
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectPortfolioMediaReferences(item, source, referencesByPath));
    return;
  }

  if (value && typeof value === "object") {
    Object.values(value).forEach((item) => collectPortfolioMediaReferences(item, source, referencesByPath));
  }
}

function normalizePortfolioAssetEntry(entry, usage) {
  const path = cleanPortfolioMediaPath(entry?.path || "");
  const references = usage.referencesByPath.get(path) || [];
  const isUploaded = PORTFOLIO_DELETABLE_ASSET_PREFIXES.some((prefix) => path.startsWith(prefix));
  const canDelete = isUploaded && references.length === 0;
  return {
    path,
    name: cleanText(entry?.name) || path.split("/").pop() || path,
    kind: inferPortfolioAssetKind(path),
    size: Number(entry?.size) || 0,
    sha: cleanText(entry?.sha),
    url: `/${path}`,
    htmlUrl: cleanText(entry?.html_url),
    downloadUrl: cleanText(entry?.download_url),
    used: references.length > 0,
    references,
    inGalleryLibrary: usage.catalogPaths.has(path),
    isUploaded,
    canDelete,
    deleteBlockedReason: canDelete ? "" : references.length ? "Asset is still referenced." : "Only uploaded assets can be deleted here."
  };
}

async function removePortfolioAssetFromGalleryLibrary(env, assetPath) {
  const config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
  const library = await getOptionalGitHubJsonFile(config, GALLERY_IMAGE_LIBRARY_PATH);
  if (!library || !Array.isArray(library.images)) return null;

  const nextImages = library.images.filter((item) => normalizePortfolioReferencePath(item?.src || item?.url || "") !== assetPath);
  if (nextImages.length === library.images.length) return null;

  const nextLibrary = {
    ...library,
    updatedAt: new Date().toISOString().slice(0, 10),
    images: nextImages
  };
  return putGitHubFile(
    env,
    GALLERY_IMAGE_LIBRARY_PATH,
    encoder.encode(`${JSON.stringify(nextLibrary, null, 2)}\n`),
    `Remove deleted portfolio asset ${assetPath} from gallery library`,
    PORTFOLIO_TOKEN_ENV
  );
}

function normalizePortfolioReferencePath(value) {
  const normalized = cleanPortfolioMediaPath(value).split(/[?#]/)[0];
  if (normalized.startsWith("images/") || normalized.startsWith("videos/")) return normalized;
  return "";
}

function isPortfolioAssetFilePath(path) {
  return /\.(png|jpe?g|webp|gif|svg|mp4|webm|mov|m4v)$/i.test(String(path || ""));
}

function inferPortfolioAssetKind(path) {
  return /\.(mp4|webm|mov|m4v)$/i.test(String(path || "")) ? "video" : "image";
}

function cleanDeletablePortfolioAssetPath(value) {
  const path = cleanPortfolioMediaPath(value);
  if (!path || !isPortfolioAssetFilePath(path)) return "";
  if (!PORTFOLIO_DELETABLE_ASSET_PREFIXES.some((prefix) => path.startsWith(prefix))) return "";
  return path;
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
    return jsonResponse({ ok: false, error: "Missing media file." }, 400);
  }

  const assetType = getPortfolioAssetType(file.name, file.type);
  if (!assetType) {
    return jsonResponse({ ok: false, error: "Only jpg, png, webp, gif, svg, mp4, webm, mov, and m4v files are supported." }, 415);
  }

  const maxBytes = assetType.kind === "video" ? MAX_VIDEO_ASSET_BYTES : MAX_IMAGE_ASSET_BYTES;
  if (!file.size || file.size > maxBytes) {
    return jsonResponse({ ok: false, error: `${assetType.kind === "video" ? "Video" : "Image"} must be between 1 byte and ${maxBytes} bytes.` }, 413);
  }

  const buffer = await file.arrayBuffer();
  const hash = await sha256Hex(buffer);
  const now = new Date();
  const { year, month, timestamp } = timestampParts(now);
  const safeName = safeAssetFileName(file.name, assetType.extension);
  const uploadDir = assetType.kind === "video" ? PORTFOLIO_VIDEO_UPLOADS_DIR : PORTFOLIO_IMAGE_UPLOADS_DIR;
  const relativePath = `${uploadDir}/${year}/${month}/${timestamp}-${hash.slice(0, 12)}-${safeName}`;
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
      kind: assetType.kind,
      src,
      relativePath,
      path: relativePath,
      fileName: file.name || safeName,
      size: file.size,
      mime: file.type || mimeFromExtension(assetType.extension),
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

function normalizePortfolioJson(raw) {
  const source = Array.isArray(raw) ? { slides: raw } : raw && typeof raw === "object" ? raw : {};
  return {
    meta: source.meta && typeof source.meta === "object" ? source.meta : {},
    cases: Array.isArray(source.cases) ? source.cases : [],
    slides: Array.isArray(source.slides) ? source.slides : []
  };
}

function cleanPortfolioReplacementTarget(target = {}) {
  return {
    type: cleanText(target.type),
    slideId: cleanText(target.slideId),
    workId: cleanText(target.workId),
    caseId: cleanCaseId(target.caseId),
    elementId: cleanText(target.elementId),
    slotIndex: Number.isInteger(Number(target.slotIndex)) ? Number(target.slotIndex) : null,
    label: cleanText(target.label),
    accept: cleanText(target.accept)
  };
}

function buildPortfolioReplacementMedia(asset = {}, target = {}) {
  const rawPath = asset.path || asset.relativePath || asset.src || asset.url || "";
  const path = normalizePortfolioReferencePath(rawPath);
  if (!path) throw new Error("Replacement asset must be under images/ or videos/.");
  const kind = cleanText(asset.kind) === "video" || inferPortfolioAssetKind(path) === "video" ? "video" : "image";
  if (cleanText(target.accept) === "image" && kind !== "image") {
    throw new Error("This target only accepts image assets.");
  }
  const name = cleanText(asset.name || asset.title || asset.fileName) || path.split("/").pop() || path;
  return {
    kind,
    url: path,
    fullUrl: kind === "image" ? path : "",
    poster: kind === "video" ? cleanPortfolioMediaPath(asset.poster) : "",
    alt: cleanText(asset.alt) || name,
    label: name,
    width: cleanNumber(asset.width),
    height: cleanNumber(asset.height)
  };
}

function mergePortfolioMedia(current = {}, replacement = {}) {
  return {
    ...current,
    ...replacement,
    curatedHidden: current.curatedHidden === true,
    curatedCategory: cleanText(current.curatedCategory || replacement.curatedCategory),
    workflowSteps: Array.isArray(current.workflowSteps) && current.workflowSteps.length ? current.workflowSteps : replacement.workflowSteps,
    workflowAbility: cleanText(current.workflowAbility || replacement.workflowAbility),
    workflowOutcome: cleanText(current.workflowOutcome || replacement.workflowOutcome)
  };
}

function replacePortfolioMediaInModel(model, rawTarget, replacement) {
  const target = cleanPortfolioReplacementTarget(rawTarget);
  const next = normalizePortfolioJson(model);

  if (target.type === "homepage-work") {
    if (!target.workId) throw new Error("Homepage work target is missing workId.");
    const meta = next.meta && typeof next.meta === "object" ? next.meta : {};
    const designer = meta.homepageDesigner && typeof meta.homepageDesigner === "object" ? meta.homepageDesigner : {};
    const works = designer.works && typeof designer.works === "object" ? designer.works : {};
    const currentWork = works[target.workId] && typeof works[target.workId] === "object" ? works[target.workId] : {};
    next.meta = {
      ...meta,
      homepageDesigner: {
        ...designer,
        works: {
          ...works,
          [target.workId]: {
            ...currentWork,
            media: mergePortfolioMedia(currentWork.media || {}, replacement)
          }
        }
      }
    };
    return next;
  }

  if (target.type === "case-cover") {
    if (!target.caseId) throw new Error("Case cover target is missing caseId.");
    let replaced = false;
    next.cases = next.cases.map((caseItem) => {
      if (cleanCaseId(caseItem?.id) !== target.caseId) return caseItem;
      replaced = true;
      return { ...caseItem, cover: replacement.url || replacement.fullUrl || caseItem.cover };
    });
    if (!replaced) throw new Error(`Case not found: ${target.caseId}.`);
    return next;
  }

  const slideIndex = next.slides.findIndex((slide) => String(slide?.id) === String(target.slideId));
  if (slideIndex < 0) throw new Error(`Slide not found: ${target.slideId}.`);
  const slide = { ...next.slides[slideIndex] };

  if (target.type === "free-layout-media") {
    if (!target.elementId) throw new Error("Free-layout media target is missing elementId.");
    const elements = Array.isArray(slide.freeLayoutElements) ? [...slide.freeLayoutElements] : [];
    const elementIndex = elements.findIndex((element) => String(element?.id) === String(target.elementId));
    if (elementIndex < 0) throw new Error(`Free-layout media not found: ${target.elementId}.`);
    const element = { ...elements[elementIndex] };
    element.media = mergePortfolioMedia(element.media || {}, replacement);
    elements[elementIndex] = element;
    slide.freeLayoutElements = elements;
    next.slides[slideIndex] = slide;
    return next;
  }

  if (target.type !== "slide-media") {
    throw new Error(`Unsupported replacement target type: ${target.type}.`);
  }

  if (!Number.isInteger(target.slotIndex) || target.slotIndex < 0) {
    throw new Error("Slide media target has an invalid slotIndex.");
  }
  const media = Array.isArray(slide.media) ? [...slide.media] : [];
  if (target.slotIndex >= media.length) {
    throw new Error(`Slide media slot not found: ${target.slotIndex}.`);
  }
  media[target.slotIndex] = mergePortfolioMedia(media[target.slotIndex] || {}, replacement);
  slide.media = media;
  next.slides[slideIndex] = slide;
  return next;
}

function normalizeGalleryWorldsData(raw) {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? raw : {};
  const works = asArray(source.works).map((work, index) => {
    const id = cleanId(work?.id, `work-${index + 1}`);
    const layers = work?.layers && typeof work.layers === "object" ? {
      bg: cleanPortfolioMediaPath(work.layers.bg),
      subject: cleanPortfolioMediaPath(work.layers.subject),
      foreground: cleanPortfolioMediaPath(work.layers.foreground),
      light: cleanPortfolioMediaPath(work.layers.light)
    } : null;

    return {
      id,
      title: cleanText(work?.title) || id,
      category: cleanText(work?.category) || "AIGC",
      type: cleanText(work?.type) || "image",
      duration: cleanText(work?.duration),
      description: cleanText(work?.description),
      poster: cleanPortfolioMediaPath(work?.poster),
      alt: cleanText(work?.alt) || `${id} poster`,
      tags: cleanTextArray(work?.tags),
      ...(layers && Object.values(layers).some(Boolean) ? { layers } : {})
    };
  }).filter((work) => work.id && work.poster);

  const workIds = new Set(works.map((work) => work.id));
  const galleryWorlds = asArray(source.galleryWorlds).map((world, index) => {
    const rawWorkIds = cleanTextArray(world?.workIds).filter((id) => workIds.has(id));
    const heroWorkId = workIds.has(cleanText(world?.heroWorkId)) ? cleanText(world?.heroWorkId) : rawWorkIds[0] || "";
    const workIdList = rawWorkIds.length ? rawWorkIds : [heroWorkId].filter(Boolean);

    return {
      id: cleanId(world?.id, `world-${index + 1}`),
      name: cleanText(world?.name) || `Gallery World ${index + 1}`,
      kicker: cleanText(world?.kicker) || "GALLERY WORLD",
      title: cleanText(world?.title) || cleanText(world?.name) || `Gallery World ${index + 1}`,
      description: cleanText(world?.description),
      heroWorkId,
      workIds: workIdList,
      interaction: cleanText(world?.interaction) || "showroom",
      accent: cleanText(world?.accent) || "#68B7FF",
      cta: cleanText(world?.cta) || "Enter world"
    };
  }).filter((world) => world.id && world.heroWorkId && world.workIds.length);

  return {
    version: Number(source.version) || 1,
    updatedAt: new Date().toISOString(),
    intro: source.intro && typeof source.intro === "object" ? {
      brand: cleanText(source.intro.brand),
      kicker: cleanText(source.intro.kicker),
      title: cleanText(source.intro.title),
      subtitle: cleanText(source.intro.subtitle),
      description: cleanText(source.intro.description),
      cta: cleanText(source.intro.cta)
    } : {},
    works,
    galleryWorlds
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

async function safeGetLatestPortfolioDeployment(env, commit = "") {
  try {
    const config = getGitHubConfig(env, PORTFOLIO_TOKEN_ENV);
    return await getLatestPortfolioDeployment(config, commit);
  } catch (error) {
    return { available: false, error: error.message || "Deployment status is unavailable." };
  }
}

async function getLatestPortfolioDeployment(config, commit = "") {
  const params = new URLSearchParams({
    branch: config.branch,
    per_page: "20"
  });
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/actions/workflows/${encodeURIComponent(PORTFOLIO_DEPLOY_WORKFLOW_ID)}/runs?${params.toString()}`, {
    headers: githubHeaders(config.token)
  });

  if (!response.ok) {
    return {
      available: false,
      error: await readGitHubError(response, "GitHub Actions status read failed")
    };
  }

  const data = await response.json();
  const runs = Array.isArray(data.workflow_runs) ? data.workflow_runs : [];
  const requestedCommit = cleanText(commit);
  const matched = requestedCommit ? runs.find((run) => run?.head_sha === requestedCommit) : runs[0];
  const latest = matched || runs[0] || null;
  if (!latest) {
    return {
      available: true,
      matched: false,
      status: "not_found",
      conclusion: "",
      commit: requestedCommit,
      message: requestedCommit ? "No deployment run has appeared for this commit yet." : "No deployment runs found."
    };
  }

  return {
    available: true,
    matched: requestedCommit ? latest.head_sha === requestedCommit : true,
    status: cleanText(latest.status) || "unknown",
    conclusion: cleanText(latest.conclusion),
    runId: latest.id || null,
    runNumber: latest.run_number || null,
    htmlUrl: cleanText(latest.html_url),
    commit: cleanText(latest.head_sha),
    createdAt: cleanText(latest.created_at),
    updatedAt: cleanText(latest.updated_at),
    message: requestedCommit && latest.head_sha !== requestedCommit
      ? "Deployment run for this commit has not appeared yet; showing latest run."
      : ""
  };
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

async function getGitHubRecursiveTree(config) {
  const response = await fetch(`https://api.github.com/repos/${config.owner}/${config.repo}/git/trees/${encodeURIComponent(config.branch)}?recursive=1`, {
    headers: githubHeaders(config.token)
  });

  if (!response.ok) {
    throw new Error(await readGitHubError(response, "GitHub tree read failed"));
  }

  const data = await response.json();
  if (!Array.isArray(data.tree)) {
    throw new Error("GitHub tree response did not include a tree array.");
  }
  if (data.truncated) {
    throw new Error("GitHub tree response was truncated; asset library cannot be trusted.");
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

function getVideoExtension(fileName, mime) {
  const extension = String(fileName || "").toLowerCase().match(/\.([a-z0-9]+)$/)?.[1] || "";
  const mimeExtension = {
    "video/mp4": "mp4",
    "video/webm": "webm",
    "video/quicktime": "mov",
    "video/x-m4v": "m4v"
  }[String(mime || "").toLowerCase()];
  if (["mp4", "webm", "mov", "m4v"].includes(extension)) return extension;
  return mimeExtension || "";
}

function getPortfolioAssetType(fileName, mime) {
  const imageExtension = getImageExtension(fileName, mime);
  if (imageExtension) return { kind: "image", extension: imageExtension };
  const videoExtension = getVideoExtension(fileName, mime);
  if (videoExtension) return { kind: "video", extension: videoExtension };
  return null;
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
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    m4v: "video/x-m4v"
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
      title: "作品集编辑后台",
      heading: "作品集编辑后台",
      intro: "输入管理员密码后，可以打开前端式作品集编辑器，直接保存 data/portfolio.json 到 GitHub。",
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
      background:
        linear-gradient(180deg, rgba(5, 11, 19, 0.16), rgba(5, 11, 19, 0.94) 62%, #06101b),
        url("/images/generated/celestial-whale-city.webp") center top / cover fixed no-repeat,
        #07111d;
      color: rgba(250, 253, 255, 0.96);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", Arial, sans-serif;
    }
    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      background:
        linear-gradient(90deg, rgba(2, 8, 15, 0.72), rgba(2, 8, 15, 0.2) 48%, rgba(239, 210, 153, 0.08)),
        linear-gradient(180deg, rgba(232, 201, 121, 0.16), transparent 34%, rgba(6, 16, 27, 0.82) 88%);
    }
    main {
      position: relative;
      width: min(420px, calc(100vw - 32px));
      border: 1px solid rgba(236, 214, 160, 0.24);
      border-radius: 8px;
      background:
        linear-gradient(145deg, rgba(245, 249, 255, 0.1), rgba(5, 15, 26, 0.42)),
        rgba(5, 15, 26, 0.58);
      box-shadow: 0 26px 90px rgba(0, 0, 0, 0.34), inset 0 1px 0 rgba(255, 255, 255, 0.065);
      backdrop-filter: blur(20px);
      padding: 24px;
    }
    h1 { margin: 0 0 6px; color: rgba(252, 247, 234, 0.98); font-size: 22px; line-height: 1.25; text-shadow: 0 18px 60px rgba(0, 0, 0, 0.36); }
    p { margin: 0 0 18px; color: rgba(219, 231, 242, 0.72); font-size: 14px; line-height: 1.7; }
    label { display: grid; gap: 8px; color: rgba(219, 231, 242, 0.72); font-size: 13px; font-weight: 700; }
    input {
      width: 100%;
      height: 42px;
      border: 1px solid rgba(236, 214, 160, 0.22);
      border-radius: 8px;
      background: rgba(7, 18, 30, 0.54);
      color: rgba(250, 253, 255, 0.96);
      padding: 0 12px;
      font: 15px inherit;
    }
    input:focus { outline: 0; border-color: rgba(232, 201, 121, 0.52); box-shadow: 0 0 0 3px rgba(110, 231, 255, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.08); }
    button {
      width: 100%;
      height: 42px;
      margin-top: 14px;
      border: 1px solid rgba(232, 201, 121, 0.58);
      border-radius: 8px;
      background: linear-gradient(135deg, rgba(232, 201, 121, 0.24), rgba(110, 231, 255, 0.11));
      color: rgba(255, 249, 232, 0.98);
      font: 700 14px inherit;
      cursor: pointer;
    }
    .error {
      margin: 0 0 12px;
      padding: 10px;
      border: 1px solid rgba(251, 113, 133, 0.36);
      border-radius: 8px;
      color: #fecdd3;
      background: rgba(127, 29, 29, 0.36);
      font-size: 13px;
    }
    @media (max-width: 620px) {
      body {
        background-image:
          linear-gradient(180deg, rgba(5, 11, 19, 0.18), rgba(5, 11, 19, 0.96) 60%, #06101b),
          url("/images/generated/celestial-whale-city-small.webp");
        background-attachment: scroll;
      }
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
