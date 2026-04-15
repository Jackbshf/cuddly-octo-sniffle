import { createWriteStream, existsSync } from "node:fs";
import { copyFile, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..");
const DEFAULT_WARN_BYTES = 500 * 1024;
const DEFAULT_BLOCK_BYTES = 1024 * 1024;
const DEFAULT_PREFERRED_JSON = "F:\\Media\\Incoming\\Downloads\\portfolio.json";

const DEFAULT_SITE_META = {
  siteTitle: "ZHANG WEI - AIGC Portfolio",
  siteDescription: "AIGC 内容创意师作品集，专注商业视觉、短视频分镜与 AIGC 工具链。",
  siteKeywords: ["AIGC", "作品集", "商业视觉", "短视频分镜", "ComfyUI", "AI广告"],
  canonicalUrl: "https://www.zhangweivisual.cn/",
  ogTitle: "ZHANG WEI - AIGC Portfolio",
  ogDescription: "用 AIGC 重构商业视觉与叙事内容",
  ogImage: "images/微信图片_20260411183220_100_7.jpg",
  twitterCard: "summary_large_image",
  caseSectionTitle: "精选案例",
  caseSectionDesc: "用结构化案例说明创作链路、工具选择和最终结果。",
  contactSectionTitle: "合作咨询",
  contactSectionDesc: "留下项目类型、预算区间和联系方式，我会根据你的需求给出匹配方案。",
  formspreeEndpoint: "",
  contactCtaLabel: "提交需求"
};

const ensureString = (value, fallback = "") => typeof value === "string" ? value : fallback;
const ensureStringArray = (value) => Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
const uniq = (values) => Array.from(new Set(values.filter(Boolean)));
const toPosixPath = (value = "") => String(value || "").replace(/\\/g, "/");
const normalizeRepoMediaPath = (value = "") => {
  if (!value) return "";
  let normalized = String(value).trim();
  if (!normalized) return "";
  normalized = normalized.split(/[?#]/)[0].trim();
  normalized = normalized.replace(/^[./\\]+/, "");
  normalized = toPosixPath(normalized);
  return /^(images|videos)\//.test(normalized) ? normalized : "";
};

const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};

const inferMediaKind = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "image";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "youtube";
  if (normalized.includes("bilibili.com/video/") || normalized.includes("b23.tv/")) return "video";
  if (normalized.includes("douyin.com") || normalized.includes("iesdouyin.com") || normalized.includes("v.douyin.com")) return "video";
  if (normalized.includes("tiktok.com")) return "video";
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(normalized)) return "video";
  if (normalized.includes("/video/upload/") || normalized.includes("/video/authenticated/")) return "video";
  return "image";
};

const extractYouTubeId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "").trim();
    if (url.searchParams.has("v")) return url.searchParams.get("v") || "";
    const segments = url.pathname.split("/").filter(Boolean);
    const marker = segments.findIndex((segment) => segment === "embed" || segment === "shorts");
    if (marker >= 0 && segments[marker + 1]) return segments[marker + 1];
  } catch (error) {
    return "";
  }

  return "";
};

const createDefaultCases = () => ([
  {
    id: "controlnet-ecommerce",
    title: "ControlNet 电商产品精修",
    cover: "images/微信图片_20260411183220_100_7.jpg",
    category: "商业视觉",
    tags: ["AIGC", "电商", "ControlNet"],
    description: "围绕产品结构和光影一致性，完成线稿约束到高精渲染的电商主图升级。",
    results: {
      clickRate: "+32%",
      conversion: "+18%"
    },
    tools: ["ComfyUI", "ControlNet", "Photoshop"],
    slideIds: [4, 5]
  },
  {
    id: "future-brand-visuals",
    title: "未来感品牌海报与 VI 系统",
    cover: "images/微信图片_20260411183205_89_7.jpg",
    category: "品牌视觉",
    tags: ["品牌", "海报", "VI"],
    description: "统一未来感主视觉语言，扩展到海报、品牌应用和多风格商业物料。",
    results: {
      deliverables: "6 套物料",
      iteration: "3 轮迭代"
    },
    tools: ["Midjourney", "Photoshop", "Illustrator"],
    slideIds: [7, 8, 9]
  },
  {
    id: "ai-short-video-campaign",
    title: "AI 广告短视频与抖音系列内容",
    cover: "images/微信图片_20260411183234_116_7.png",
    category: "叙事内容",
    tags: ["短视频", "广告", "AIGC"],
    description: "用 AI 原生视频和后期剪辑构建电商广告和平台分发内容，形成系列化投放素材。",
    results: {
      videoLength: "30s+",
      outputs: "5 支短视频"
    },
    tools: ["Sora", "Kling", "剪映"],
    slideIds: [16, 17, 18]
  }
]);

const normalizeMediaItem = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { kind: inferMediaKind(item), url: item, poster: "", meta: "", label: "" };

  const rawUrl = ensureString(item.url).trim();
  const youtubeId = extractYouTubeId(item.youtubeId || rawUrl);
  const kind = ensureString(item.kind) || (youtubeId ? "youtube" : inferMediaKind(rawUrl));

  return {
    kind,
    url: kind === "youtube" && youtubeId ? youtubeId : rawUrl,
    poster: ensureString(item.poster).trim(),
    meta: ensureString(item.meta),
    label: ensureString(item.label)
  };
};

const createDefaultMediaItem = () => ({
  kind: "image",
  url: "",
  poster: "",
  meta: "",
  label: ""
});

const createFreeLayoutElement = (type) => {
  const base = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    x: 12,
    y: 12,
    w: type === "text" ? 28 : 36,
    h: type === "text" ? 18 : 32,
    z: 1
  };

  if (type === "text") {
    return {
      ...base,
      text: "双击编辑文字",
      animation: "none",
      animationDuration: 1.2,
      animationDelay: 0
    };
  }

  return {
    ...base,
    media: createDefaultMediaItem()
  };
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeFreeLayoutElement = (element) => {
  const fallback = createFreeLayoutElement(element?.type === "media" ? "media" : "text");
  const normalized = {
    ...fallback,
    ...(element && typeof element === "object" ? element : {}),
    x: clamp(Number(element?.x ?? fallback.x) || fallback.x, 0, 88),
    y: clamp(Number(element?.y ?? fallback.y) || fallback.y, 0, 88),
    w: clamp(Number(element?.w ?? fallback.w) || fallback.w, 12, 100),
    h: clamp(Number(element?.h ?? fallback.h) || fallback.h, 10, 100),
    z: clamp(Number(element?.z ?? fallback.z) || fallback.z, 1, 999)
  };

  if (normalized.type === "media") {
    normalized.media = normalizeMediaItem(element?.media) || createDefaultMediaItem();
  } else {
    normalized.text = ensureString(element?.text, fallback.text);
    normalized.animation = ["none", "fade-up", "typewriter"].includes(element?.animation) ? element.animation : fallback.animation;
    normalized.animationDuration = clamp(Number(element?.animationDuration ?? fallback.animationDuration) || fallback.animationDuration, 0.2, 8);
    normalized.animationDelay = clamp(Number(element?.animationDelay ?? fallback.animationDelay) || fallback.animationDelay, 0, 8);
  }

  return normalized;
};

const normalizeSlide = (slide) => {
  const normalized = {
    ...(slide && typeof slide === "object" ? slide : {}),
    media: Array.isArray(slide?.media) ? slide.media.map(normalizeMediaItem).filter(Boolean) : []
  };

  if (Array.isArray(slide?.freeLayoutElements)) {
    normalized.freeLayoutElements = slide.freeLayoutElements
      .map((element, index) => normalizeFreeLayoutElement({
        ...element,
        z: Number.isFinite(Number(element?.z)) ? Number(element.z) : index + 1
      }))
      .sort((a, b) => a.z - b.z)
      .map((element, index) => ({ ...element, z: index + 1 }));
  } else if (normalized.type === "free-layout") {
    normalized.freeLayoutElements = [];
  }

  if (Array.isArray(slide?.textBlocks)) {
    normalized.textBlocks = slide.textBlocks.map((block) => String(block ?? ""));
  } else if (typeof slide?.text === "string") {
    normalized.textBlocks = [slide.text];
  } else if (normalized.type === "split") {
    normalized.textBlocks = [""];
  }

  if (typeof normalized.slots !== "number" && typeof normalized.type === "string" && normalized.type.startsWith("gallery-")) {
    normalized.slots = Number(normalized.type.split("-")[1]) || 1;
  }

  if (!normalized.slots && (normalized.type === "split" || normalized.type === "full-media")) {
    normalized.slots = 1;
  }

  return normalized;
};

const normalizeSlides = (slides) => Array.isArray(slides) ? slides.map(normalizeSlide) : [];

const normalizeSiteMeta = (meta) => ({
  ...DEFAULT_SITE_META,
  ...(meta && typeof meta === "object" ? meta : {}),
  siteTitle: ensureString(meta?.siteTitle, DEFAULT_SITE_META.siteTitle),
  siteDescription: ensureString(meta?.siteDescription, DEFAULT_SITE_META.siteDescription),
  siteKeywords: ensureStringArray(meta?.siteKeywords).length ? ensureStringArray(meta?.siteKeywords) : [...DEFAULT_SITE_META.siteKeywords],
  canonicalUrl: ensureString(meta?.canonicalUrl, DEFAULT_SITE_META.canonicalUrl),
  ogTitle: ensureString(meta?.ogTitle, DEFAULT_SITE_META.ogTitle),
  ogDescription: ensureString(meta?.ogDescription, DEFAULT_SITE_META.ogDescription),
  ogImage: ensureString(meta?.ogImage, DEFAULT_SITE_META.ogImage),
  twitterCard: ensureString(meta?.twitterCard, DEFAULT_SITE_META.twitterCard),
  caseSectionTitle: ensureString(meta?.caseSectionTitle, DEFAULT_SITE_META.caseSectionTitle),
  caseSectionDesc: ensureString(meta?.caseSectionDesc, DEFAULT_SITE_META.caseSectionDesc),
  contactSectionTitle: ensureString(meta?.contactSectionTitle, DEFAULT_SITE_META.contactSectionTitle),
  contactSectionDesc: ensureString(meta?.contactSectionDesc, DEFAULT_SITE_META.contactSectionDesc),
  formspreeEndpoint: ensureString(meta?.formspreeEndpoint, DEFAULT_SITE_META.formspreeEndpoint),
  contactCtaLabel: ensureString(meta?.contactCtaLabel, DEFAULT_SITE_META.contactCtaLabel)
});

const normalizeResults = (value) => {
  const source = Array.isArray(value) ? value : Array.isArray(value?.resultItems) ? value.resultItems : value;
  if (Array.isArray(source)) {
    return Object.fromEntries(source.map((entry) => [ensureString(entry?.label), ensureString(entry?.value)]).filter(([key, resultValue]) => key && resultValue));
  }
  if (source && typeof source === "object") {
    return Object.fromEntries(Object.entries(source).map(([key, resultValue]) => [key, String(resultValue ?? "").trim()]).filter(([, resultValue]) => resultValue));
  }
  return {};
};

const normalizeCaseItem = (item) => {
  const raw = item && typeof item === "object" ? item : {};
  const normalizedId = ensureString(raw.id).trim();
  const resultsSource = raw.results !== undefined ? raw.results : raw.resultItems;
  return {
    id: normalizedId,
    title: ensureString(raw.title, "未命名案例"),
    cover: ensureString(raw.cover),
    category: ensureString(raw.category, "未分类"),
    tags: ensureStringArray(raw.tags),
    description: ensureString(raw.description),
    results: normalizeResults(resultsSource),
    tools: ensureStringArray(raw.tools),
    slideIds: Array.isArray(raw.slideIds) ? raw.slideIds.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : []
  };
};

const normalizeCases = (cases, options = {}) => {
  const normalized = Array.isArray(cases) ? cases.map(normalizeCaseItem).filter((item) => item.id) : [];
  if (normalized.length) return normalized;
  return options.fallbackToDefaults ? createDefaultCases() : [];
};

const ensureUniqueCaseIds = (cases) => {
  const seen = new Set();
  for (const item of cases) {
    if (!item.id) throw new Error("Case id 不能为空。");
    if (seen.has(item.id)) throw new Error(`发现重复的 case id: ${item.id}`);
    seen.add(item.id);
  }
};

const createPortfolioModel = (value) => {
  if (Array.isArray(value)) {
    return {
      meta: normalizeSiteMeta(DEFAULT_SITE_META),
      cases: normalizeCases([], { fallbackToDefaults: true }),
      slides: normalizeSlides(value)
    };
  }

  if (value && typeof value === "object") {
    const hasCasesField = Object.prototype.hasOwnProperty.call(value, "cases");
    return {
      meta: normalizeSiteMeta(value.meta),
      cases: hasCasesField ? normalizeCases(value.cases) : normalizeCases([], { fallbackToDefaults: true }),
      slides: normalizeSlides(value.slides)
    };
  }

  return {
    meta: normalizeSiteMeta(DEFAULT_SITE_META),
    cases: normalizeCases([], { fallbackToDefaults: true }),
    slides: normalizeSlides([])
  };
};

const sanitizeMediaForWrite = (item) => {
  const normalized = normalizeMediaItem(item);
  if (!normalized) return null;
  const cleaned = {
    kind: normalized.kind,
    url: normalized.kind === "youtube" ? extractYouTubeId(normalized.url) || normalized.url : normalized.url,
    poster: normalized.poster,
    meta: normalized.meta,
    label: normalized.label
  };
  if (!cleaned.url) delete cleaned.url;
  if (!cleaned.poster) delete cleaned.poster;
  if (!cleaned.meta) delete cleaned.meta;
  if (!cleaned.label) delete cleaned.label;
  return cleaned;
};

const sanitizeSlidesForWrite = (slides) => normalizeSlides(slides).map((slide) => {
  const sanitized = {
    ...slide,
    media: Array.isArray(slide.media) ? slide.media.map(sanitizeMediaForWrite).filter(Boolean) : []
  };

  if (Array.isArray(slide.freeLayoutElements)) {
    sanitized.freeLayoutElements = slide.freeLayoutElements.map((element) => {
      const normalized = normalizeFreeLayoutElement(element);
      if (normalized.type === "media") {
        return {
          id: normalized.id,
          type: normalized.type,
          x: normalized.x,
          y: normalized.y,
          w: normalized.w,
          h: normalized.h,
          z: normalized.z,
          media: sanitizeMediaForWrite(normalized.media) || createDefaultMediaItem()
        };
      }
      return {
        id: normalized.id,
        type: normalized.type,
        x: normalized.x,
        y: normalized.y,
        w: normalized.w,
        h: normalized.h,
        z: normalized.z,
        text: normalized.text,
        animation: normalized.animation,
        animationDuration: normalized.animationDuration,
        animationDelay: normalized.animationDelay
      };
    });
  }

  if (Array.isArray(sanitized.textBlocks)) {
    sanitized.textBlocks = sanitized.textBlocks.map((block) => String(block ?? ""));
    sanitized.text = sanitized.textBlocks[0] || "";
  }

  return sanitized;
});

const sanitizePortfolioModelForWrite = (model) => {
  const normalized = createPortfolioModel(model);
  ensureUniqueCaseIds(normalized.cases);
  return {
    meta: normalizeSiteMeta(normalized.meta),
    cases: normalized.cases.map((item) => ({
      id: item.id,
      title: item.title,
      cover: item.cover,
      category: item.category,
      tags: item.tags,
      description: item.description,
      results: item.results,
      tools: item.tools,
      slideIds: item.slideIds
    })),
    slides: sanitizeSlidesForWrite(normalized.slides)
  };
};

const collectReferencedRepoAssets = (model) => {
  const refs = new Set();
  const addRef = (value) => {
    const normalized = normalizeRepoMediaPath(value);
    if (normalized) refs.add(normalized);
  };

  addRef(model?.meta?.ogImage);
  for (const caseItem of Array.isArray(model?.cases) ? model.cases : []) {
    addRef(caseItem.cover);
  }
  for (const slide of Array.isArray(model?.slides) ? model.slides : []) {
    for (const mediaItem of Array.isArray(slide.media) ? slide.media : []) {
      const normalized = normalizeMediaItem(mediaItem);
      addRef(normalized?.url);
      addRef(normalized?.poster);
    }
    for (const element of Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : []) {
      if (element?.type !== "media") continue;
      const normalized = normalizeMediaItem(element.media);
      addRef(normalized?.url);
      addRef(normalized?.poster);
    }
  }
  return Array.from(refs).sort();
};

const readJsonIfExists = async (filePath) => {
  if (!existsSync(filePath)) return null;
  return JSON.parse(await readFile(filePath, "utf8"));
};

const getJsonCandidatesFromRoot = async (rootPath) => {
  if (!rootPath || !existsSync(rootPath)) return [];
  const target = path.resolve(rootPath);
  const targetStat = await stat(target);

  if (!targetStat.isDirectory()) {
    return /portfolio.*\.json$/i.test(path.basename(target)) ? [target] : [];
  }

  const names = [];
  const directEntries = await readdir(target, { withFileTypes: true });
  for (const entry of directEntries) {
    const fullPath = path.join(target, entry.name);
    if (entry.isFile() && /portfolio.*\.json$/i.test(entry.name)) names.push(fullPath);
    if (!entry.isDirectory()) continue;
    const childEntries = await readdir(fullPath, { withFileTypes: true });
    for (const childEntry of childEntries) {
      if (childEntry.isFile() && /portfolio.*\.json$/i.test(childEntry.name)) {
        names.push(path.join(fullPath, childEntry.name));
      }
    }
  }

  return names;
};

const getSelectedJsonFile = async (preferredPath, searchRoots) => {
  if (preferredPath && existsSync(preferredPath)) {
    const preferredStat = await stat(preferredPath);
    if (!preferredStat.isDirectory()) return path.resolve(preferredPath);
  }

  const candidates = [];
  for (const rootPath of searchRoots) {
    for (const candidate of await getJsonCandidatesFromRoot(rootPath)) {
      candidates.push(candidate);
    }
  }

  if (!candidates.length) return null;

  const datedCandidates = await Promise.all(candidates.map(async (candidate) => ({
    path: candidate,
    mtimeMs: (await stat(candidate)).mtimeMs
  })));

  datedCandidates.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return datedCandidates[0].path;
};

const getLeafMatches = async (rootPath, leafName) => {
  if (!rootPath || !existsSync(rootPath)) return [];
  const entries = await readdir(rootPath, { withFileTypes: true });
  const matches = [];

  for (const entry of entries) {
    const fullPath = path.join(rootPath, entry.name);
    if (entry.isFile() && entry.name === leafName) matches.push(fullPath);
    if (!entry.isDirectory()) continue;
    const nestedPath = path.join(fullPath, leafName);
    if (existsSync(nestedPath)) matches.push(nestedPath);
  }

  return matches;
};

const findSourceFile = async (relativePath, searchRoots) => {
  const leafName = path.basename(relativePath);
  const matches = [];

  for (const rootPath of searchRoots) {
    if (!rootPath || !existsSync(rootPath)) continue;
    const directPath = path.join(rootPath, relativePath.replace(/\//g, path.sep));
    if (existsSync(directPath)) matches.push(directPath);
    for (const match of await getLeafMatches(rootPath, leafName)) {
      matches.push(match);
    }
  }

  if (!matches.length) return null;
  const datedMatches = await Promise.all(uniq(matches).map(async (match) => ({
    path: match,
    mtimeMs: (await stat(match)).mtimeMs
  })));
  datedMatches.sort((a, b) => b.mtimeMs - a.mtimeMs);
  return datedMatches[0].path;
};

const ensureInsideRepo = (repoRoot, relativePath) => {
  const resolved = path.resolve(repoRoot, relativePath);
  const repoRelative = path.relative(repoRoot, resolved);
  if (repoRelative.startsWith("..") || path.isAbsolute(repoRelative)) {
    throw new Error(`Asset path escapes repo root: ${relativePath}`);
  }
  return resolved;
};

const restoreFileFromGitHistory = async (repoRoot, relativePath, targetPath) => {
  const commitHash = await new Promise((resolve, reject) => {
    const child = spawn("git", ["log", "--diff-filter=AM", "--format=%H", "-n", "1", "--all", "--", relativePath], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk) => {
      stdout += String(chunk || "");
    });
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(stderr.trim() || `git log exited with code ${code}`));
        return;
      }
      resolve(stdout.trim());
    });
  }).catch(() => "");

  if (!commitHash) return false;

  await mkdir(path.dirname(targetPath), { recursive: true });

  return new Promise((resolve) => {
    const child = spawn("git", ["show", `${commitHash}:${relativePath}`], {
      cwd: repoRoot,
      stdio: ["ignore", "pipe", "pipe"]
    });
    const fileStream = createWriteStream(targetPath);
    let stderr = "";

    child.stdout.pipe(fileStream);
    child.stderr.on("data", (chunk) => {
      stderr += String(chunk || "");
    });

    const finalize = async (ok) => {
      if (ok) {
        resolve(true);
        return;
      }
      try {
        await rm(targetPath, { force: true });
      } catch (error) {}
      if (stderr.trim()) console.warn(stderr.trim());
      resolve(false);
    };

    child.on("error", () => finalize(false));
    fileStream.on("error", () => finalize(false));
    child.on("close", (code) => finalize(code === 0));
  });
};

const writeJsonFile = async (filePath, value) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

const writeEmbeddedPortfolio = async (filePath, model) => {
  const source = `window.__EMBEDDED_PORTFOLIO__ = ${JSON.stringify(model, null, 2)};\n`;
  await writeFile(filePath, source, "utf8");
};

const collectCaseSourceFiles = async (casesDir) => {
  if (!existsSync(casesDir)) return { hasDirectory: false, cases: [] };
  const entries = await readdir(casesDir, { withFileTypes: true });
  const caseFiles = entries.filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".json"));
  const cases = [];
  for (const entry of caseFiles.sort((a, b) => a.name.localeCompare(b.name, "zh-CN"))) {
    const caseValue = JSON.parse(await readFile(path.join(casesDir, entry.name), "utf8"));
    cases.push(caseValue);
  }
  return { hasDirectory: true, cases };
};

const writeCaseSourceFiles = async (casesDir, cases) => {
  await mkdir(casesDir, { recursive: true });
  const existingEntries = await readdir(casesDir, { withFileTypes: true });
  const nextFileNames = new Set(cases.map((item) => `${item.id}.json`));

  await Promise.all(existingEntries.map(async (entry) => {
    if (!entry.isFile() || !entry.name.toLowerCase().endsWith(".json")) return;
    if (nextFileNames.has(entry.name)) return;
    await rm(path.join(casesDir, entry.name), { force: true });
  }));

  for (const caseItem of cases) {
    await writeJsonFile(path.join(casesDir, `${caseItem.id}.json`), {
      id: caseItem.id,
      title: caseItem.title,
      cover: caseItem.cover,
      category: caseItem.category,
      tags: caseItem.tags,
      description: caseItem.description,
      results: Object.entries(caseItem.results).map(([label, value]) => ({ label, value })),
      tools: caseItem.tools,
      slideIds: caseItem.slideIds
    });
  }
};

const buildSearchRoots = (repoRoot, preferredJsonPath, allowExternal) => {
  const userProfile = process.env.USERPROFILE || "";
  const sharedRoots = [
    path.join(repoRoot, "data"),
    repoRoot
  ];
  if (!allowExternal) return uniq(sharedRoots.map((item) => item && path.resolve(item)));
  return uniq([
    preferredJsonPath,
    userProfile && path.join(userProfile, "Downloads"),
    userProfile && path.join(userProfile, "Desktop"),
    userProfile && path.join(userProfile, "Documents"),
    "F:\\Media\\Incoming\\Downloads",
    "F:\\TP",
    ...sharedRoots
  ].map((item) => item && path.resolve(item)));
};

const buildAssetSearchRoots = (repoRoot, allowExternal) => {
  const userProfile = process.env.USERPROFILE || "";
  const sharedRoots = [
    path.join(repoRoot, "images"),
    path.join(repoRoot, "videos"),
    path.join(repoRoot, "dist"),
    repoRoot
  ];
  if (!allowExternal) return uniq(sharedRoots.map((item) => path.resolve(item)));
  return uniq([
    "F:\\Media\\Incoming\\Downloads",
    "F:\\TP",
    userProfile && path.join(userProfile, "Downloads"),
    userProfile && path.join(userProfile, "Desktop"),
    userProfile && path.join(userProfile, "Documents"),
    ...sharedRoots
  ].map((item) => item && path.resolve(item)));
};

const parseCliArgs = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg.startsWith("--")) continue;
    const nextValue = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : undefined;
    if (arg === "--repo-root" && nextValue) options.repoRoot = nextValue;
    if (arg === "--preferred-json-path" && nextValue !== undefined) options.preferredJsonPath = nextValue;
    if (arg === "--output-file" && nextValue !== undefined) options.outputFile = nextValue;
    if (arg === "--no-external-import") options.allowExternalImport = false;
    if (arg === "--no-asset-recovery") options.allowExternalAssetRecovery = false;
    if (arg === "--no-publish-list") options.outputFile = null;
    if (nextValue !== undefined) index += 1;
  }
  return options;
};

export async function syncPortfolioArtifacts(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || DEFAULT_REPO_ROOT);
  const dataDir = path.join(repoRoot, "data");
  const casesDir = path.join(dataDir, "cases");
  const runtimeJsonPath = path.join(dataDir, "portfolio.json");
  const metaJsonPath = path.join(dataDir, "meta.json");
  const embeddedDataPath = path.join(repoRoot, "embedded-data.js");
  const outputFile = options.outputFile === undefined ? path.join(repoRoot, ".publish-files.txt") : options.outputFile;
  const preferredJsonPath = options.preferredJsonPath === undefined ? DEFAULT_PREFERRED_JSON : options.preferredJsonPath;
  const allowExternalImport = options.allowExternalImport !== false;
  const allowExternalAssetRecovery = options.allowExternalAssetRecovery !== false;
  const warnBytes = Number.isFinite(options.warnBytes) ? options.warnBytes : DEFAULT_WARN_BYTES;
  const blockBytes = Number.isFinite(options.blockBytes) ? options.blockBytes : DEFAULT_BLOCK_BYTES;
  const log = typeof options.log === "function" ? options.log : console.log;

  const repoPortfolioRaw = await readJsonIfExists(runtimeJsonPath);
  const repoPortfolioModel = createPortfolioModel(repoPortfolioRaw);
  const metaSource = await readJsonIfExists(metaJsonPath);
  const caseSource = await collectCaseSourceFiles(casesDir);

  let importedJsonPath = null;
  let importedModel = null;
  if (allowExternalImport) {
    const jsonSearchRoots = buildSearchRoots(repoRoot, preferredJsonPath, true);
    importedJsonPath = await getSelectedJsonFile(preferredJsonPath, jsonSearchRoots);
    const repoRuntimeResolved = path.resolve(runtimeJsonPath);
    if (importedJsonPath && path.resolve(importedJsonPath) !== repoRuntimeResolved) {
      importedModel = createPortfolioModel(JSON.parse(await readFile(importedJsonPath, "utf8")));
    }
  }

  const sourceMeta = importedModel
    ? importedModel.meta
    : metaSource
      ? normalizeSiteMeta(metaSource)
      : repoPortfolioModel.meta;
  const sourceCases = importedModel
    ? importedModel.cases
    : caseSource.hasDirectory
      ? normalizeCases(caseSource.cases)
      : repoPortfolioModel.cases;
  const sourceSlides = importedModel ? importedModel.slides : repoPortfolioModel.slides;

  const nextPortfolioModel = sanitizePortfolioModelForWrite({
    meta: sourceMeta,
    cases: sourceCases,
    slides: sourceSlides
  });

  await writeJsonFile(metaJsonPath, nextPortfolioModel.meta);
  await writeCaseSourceFiles(casesDir, nextPortfolioModel.cases);
  await writeJsonFile(runtimeJsonPath, nextPortfolioModel);
  await writeEmbeddedPortfolio(embeddedDataPath, nextPortfolioModel);

  const referencedAssets = collectReferencedRepoAssets(nextPortfolioModel);
  const publishPaths = [
    "data/meta.json",
    "data/portfolio.json",
    "embedded-data.js",
    ...nextPortfolioModel.cases.map((item) => `data/cases/${item.id}.json`),
    ...referencedAssets
  ];

  const assetSearchRoots = buildAssetSearchRoots(repoRoot, allowExternalAssetRecovery);
  const missingAssets = [];
  for (const relativePath of referencedAssets) {
    const repoAssetPath = ensureInsideRepo(repoRoot, relativePath);
    if (existsSync(repoAssetPath)) continue;

    let restored = false;
    if (allowExternalAssetRecovery) {
      const sourceFile = await findSourceFile(relativePath, assetSearchRoots);
      if (sourceFile) {
        await mkdir(path.dirname(repoAssetPath), { recursive: true });
        await copyFile(sourceFile, repoAssetPath);
        log(`Recovered asset: ${relativePath}`);
        restored = true;
      }
    }

    if (!restored) {
      restored = await restoreFileFromGitHistory(repoRoot, relativePath, repoAssetPath);
      if (restored) log(`Restored asset from git history: ${relativePath}`);
    }

    if (!restored) missingAssets.push(relativePath);
  }

  if (missingAssets.length) {
    if (outputFile) await rm(outputFile, { force: true });
    throw new Error(`Missing referenced assets; publish stopped: ${missingAssets.join(", ")}`);
  }

  const runtimeBytes = Buffer.byteLength(JSON.stringify(nextPortfolioModel), "utf8");
  if (runtimeBytes >= warnBytes) {
    log(`Portfolio size warning: ${formatBytes(runtimeBytes)}${runtimeBytes > blockBytes ? " (blocked)" : ""}`);
  } else {
    log(`Portfolio size: ${formatBytes(runtimeBytes)}`);
  }

  if (runtimeBytes > blockBytes) {
    if (outputFile) await rm(outputFile, { force: true });
    throw new Error(`Portfolio JSON exceeds ${formatBytes(blockBytes)} and publish was blocked.`);
  }

  if (outputFile) {
    await writeFile(outputFile, `${uniq(publishPaths).sort().join("\n")}\n`, "utf8");
  }

  if (importedModel && importedJsonPath) {
    log(`Imported external portfolio source: ${importedJsonPath}`);
  } else {
    log(`Synced portfolio model from repo sources in ${dataDir}`);
  }

  return {
    repoRoot,
    importedJsonPath,
    runtimeJsonPath,
    metaJsonPath,
    embeddedDataPath,
    outputFile,
    runtimeBytes,
    referencedAssets
  };
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  syncPortfolioArtifacts(cliOptions).catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
