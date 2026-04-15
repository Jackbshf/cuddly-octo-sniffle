const { useState, useEffect, useRef, startTransition } = React;

const DATA_FILE_PATH = "data/portfolio.json";
const DRAFT_STORAGE_KEY = "zhangwei_portfolio_draft_v1";
const EMBEDDED_PORTFOLIO = window.__EMBEDDED_PORTFOLIO__ ?? [];
const IS_EDITOR_MODE = window.location.protocol === "file:" || new URLSearchParams(window.location.search).get("editor") === "1";
const MOBILE_MODE_QUERY = new URLSearchParams(window.location.search).get("mobile");
const IS_QR_MOBILE_MODE = MOBILE_MODE_QUERY === "1";
const SLIDE_TRANSITION_OUT_MS = 120;
const SLIDE_TRANSITION_IN_MS = 180;
const PORTFOLIO_WARN_BYTES = 500 * 1024;
const PORTFOLIO_BLOCK_BYTES = 1024 * 1024;

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

const colorPalettes = [
  { id: "cyan", a: "bg-cyan-600/20", b: "bg-fuchsia-600/15", c: "bg-blue-600/20", line: "bg-cyan-500/50", text: "text-cyan-100/60" },
  { id: "emerald", a: "bg-emerald-600/20", b: "bg-teal-600/15", c: "bg-cyan-600/20", line: "bg-emerald-500/50", text: "text-emerald-100/60" },
  { id: "rose", a: "bg-rose-600/20", b: "bg-orange-600/15", c: "bg-pink-600/20", line: "bg-rose-500/50", text: "text-rose-100/60" },
  { id: "violet", a: "bg-violet-600/20", b: "bg-purple-600/15", c: "bg-indigo-600/20", line: "bg-violet-500/50", text: "text-violet-100/60" },
  { id: "amber", a: "bg-amber-600/20", b: "bg-red-600/15", c: "bg-orange-600/20", line: "bg-amber-500/50", text: "text-amber-100/60" }
];

const deepClone = (value) => JSON.parse(JSON.stringify(value));
const ensureString = (value, fallback = "") => typeof value === "string" ? value : fallback;
const ensureStringArray = (value) => Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
const getByteSize = (value) => new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value ?? null)).length;
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
const getPortfolioSizeTone = (bytes) => bytes > PORTFOLIO_BLOCK_BYTES ? "danger" : bytes >= PORTFOLIO_WARN_BYTES ? "warning" : "safe";
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
    if (url.searchParams.has("v")) return url.searchParams.get("v");
    const segments = url.pathname.split("/").filter(Boolean);
    const marker = segments.findIndex((segment) => segment === "embed" || segment === "shorts");
    if (marker >= 0 && segments[marker + 1]) return segments[marker + 1];
  } catch (error) {
    return "";
  }

  return "";
};

const getYouTubeEmbedUrl = (value = "") => {
  const id = extractYouTubeId(value);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : "";
};

const getYouTubeThumbnail = (value = "") => {
  const id = extractYouTubeId(value);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
};

const extractBilibiliId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const bvMatch = raw.match(/BV[a-zA-Z0-9]+/);
  if (bvMatch) return bvMatch[0];
  const avMatch = raw.match(/av\d+/i);
  if (avMatch) return avMatch[0].toLowerCase();

  try {
    const url = new URL(raw);
    const pathMatch = url.pathname.match(/\/video\/(BV[a-zA-Z0-9]+|av\d+)/i);
    if (pathMatch) return pathMatch[1];
  } catch (error) {
    return "";
  }

  return "";
};

const getBilibiliEmbedUrl = (value = "") => {
  const id = extractBilibiliId(value);
  return id ? `https://player.bilibili.com/player.html?bvid=${id.replace(/^av/i, "") === id ? id : ""}${id.toLowerCase().startsWith("av") ? `&aid=${id.slice(2)}` : ""}&page=1` : "";
};

const extractDouyinVideoId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const directMatch = raw.match(/(?:douyin\.com\/video\/|open\.douyin\.com\/player\/video\?vid=)(\d{10,})/i);
  if (directMatch) return directMatch[1];
  const numberMatch = raw.match(/\b(\d{10,})\b/);
  return numberMatch ? numberMatch[1] : "";
};

const getDouyinEmbedUrl = (value = "") => {
  const id = extractDouyinVideoId(value);
  return id ? `https://open.douyin.com/player/video?vid=${id}&autoplay=0` : "";
};

const isDirectVideoSource = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("blob:")) return true;
  if (/\.(mp4|webm|mov|m4v|ogg|m3u8)(\?|#|$)/.test(normalized)) return true;
  if (normalized.includes("/video/upload/") || normalized.includes("/video/authenticated/")) return true;
  return false;
};

const getVideoEmbedUrl = (value = "") => {
  return getYouTubeEmbedUrl(value) || getBilibiliEmbedUrl(value) || getDouyinEmbedUrl(value) || "";
};

const normalizeMediaItem = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { kind: inferMediaKind(item), url: item, poster: "", meta: "", draftPreviewUrl: "", label: "" };

  const rawUrl = typeof item.url === "string" ? item.url.trim() : "";
  const youtubeId = extractYouTubeId(item.youtubeId || rawUrl);
  const kind = item.kind || (youtubeId ? "youtube" : item.isVideo ? "video" : inferMediaKind(rawUrl));

  return {
    kind,
    url: kind === "youtube" && youtubeId ? youtubeId : rawUrl,
    poster: typeof item.poster === "string" ? item.poster.trim() : "",
    meta: typeof item.meta === "string" ? item.meta : "",
    draftPreviewUrl: item.draftPreviewUrl && item.draftPreviewUrl.startsWith("blob:") ? item.draftPreviewUrl : "",
    label: typeof item.label === "string" ? item.label : ""
  };
};

const applyMediaFieldChange = (current, field, value) => {
  const next = { ...current, [field]: value };
  if (field === "url" && String(value || "").trim()) {
    next.draftPreviewUrl = "";
  }
  return next;
};

const buildPublishedAssetPath = (file) => {
  if (!file) return "";
  const rawName = String(file.name || "").trim();
  if (!rawName) return "";
  const fileName = rawName.split(/[\\/]/).pop();
  if (!fileName) return "";

  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("video/")) return `videos/${fileName}`;
  if (mime.startsWith("image/")) return `images/${fileName}`;

  if (/\.(mp4|webm|mov|m4v|ogg|mkv)$/i.test(fileName)) return `videos/${fileName}`;
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName)) return `images/${fileName}`;

  return "";
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

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
    media: normalizeMediaItem({ kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" })
  };
};

const normalizeFreeLayoutElement = (element) => {
  const fallback = createFreeLayoutElement(element?.type === "media" ? "media" : "text");
  const normalized = {
    ...fallback,
    ...element,
    x: clamp(Number(element?.x ?? fallback.x) || fallback.x, 0, 88),
    y: clamp(Number(element?.y ?? fallback.y) || fallback.y, 0, 88),
    w: clamp(Number(element?.w ?? fallback.w) || fallback.w, 12, 100),
    h: clamp(Number(element?.h ?? fallback.h) || fallback.h, 10, 100),
    z: clamp(Number(element?.z ?? fallback.z) || fallback.z, 1, 999)
  };

  if (normalized.type === "media") {
    normalized.media = normalizeMediaItem(element?.media) || normalizeMediaItem(fallback.media);
  } else {
    normalized.text = typeof element?.text === "string" ? element.text : fallback.text;
    normalized.animation = ["none", "fade-up", "typewriter"].includes(element?.animation) ? element.animation : fallback.animation;
    normalized.animationDuration = clamp(Number(element?.animationDuration ?? fallback.animationDuration) || fallback.animationDuration, 0.2, 8);
    normalized.animationDelay = clamp(Number(element?.animationDelay ?? fallback.animationDelay) || fallback.animationDelay, 0, 8);
  }

  return normalized;
};

const normalizeSlide = (slide) => {
  const normalized = {
    ...slide,
    media: Array.isArray(slide.media) ? slide.media.map(normalizeMediaItem) : []
  };

  if (Array.isArray(slide.freeLayoutElements)) {
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

  if (Array.isArray(slide.textBlocks)) {
    normalized.textBlocks = slide.textBlocks.map((block) => String(block ?? ""));
  } else if (typeof slide.text === "string") {
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

const normalizeSlides = (slides) => (Array.isArray(slides) ? slides.map(normalizeSlide) : []);

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

const normalizeCaseItem = (item) => {
  const raw = item && typeof item === "object" ? item : {};
  const resultsSource = Array.isArray(raw.results) ? raw.results : Array.isArray(raw.resultItems) ? raw.resultItems : raw.results;
  const results = Array.isArray(resultsSource)
    ? Object.fromEntries(resultsSource.map((entry) => [ensureString(entry?.label), ensureString(entry?.value)]).filter(([key, value]) => key && value))
    : resultsSource && typeof resultsSource === "object" ? resultsSource : {};
  const normalizedId = ensureString(raw.id).trim();

  return {
    id: normalizedId,
    title: ensureString(raw.title, "未命名案例"),
    cover: ensureString(raw.cover),
    category: ensureString(raw.category, "未分类"),
    tags: ensureStringArray(raw.tags),
    description: ensureString(raw.description),
    results: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, String(value ?? "").trim()]).filter(([, value]) => value)),
    tools: ensureStringArray(raw.tools),
    slideIds: Array.isArray(raw.slideIds) ? raw.slideIds.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : []
  };
};

const normalizeCases = (cases, options = {}) => {
  const normalized = Array.isArray(cases) ? cases.map(normalizeCaseItem).filter((item) => item.id) : [];
  if (normalized.length) return normalized;
  return options.fallbackToDefaults ? createDefaultCases() : [];
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

const sanitizeCasesForExport = (cases) => normalizeCases(cases).map((item) => ({
  id: item.id,
  title: item.title,
  cover: item.cover,
  category: item.category,
  tags: item.tags,
  description: item.description,
  results: item.results,
  tools: item.tools,
  slideIds: item.slideIds
}));

const sanitizePortfolioModelForExport = (model) => {
  const normalized = createPortfolioModel(model);
  return {
    meta: normalizeSiteMeta(normalized.meta),
    cases: sanitizeCasesForExport(normalized.cases),
    slides: sanitizeSlidesForExport(normalized.slides)
  };
};

const collectDraftPreviewUrls = (slides) => {
  const urls = new Set();
  normalizeSlides(slides).forEach((slide) => {
    (Array.isArray(slide.media) ? slide.media : []).forEach((item) => {
      const normalized = normalizeMediaItem(item);
      if (normalized && normalized.draftPreviewUrl && normalized.draftPreviewUrl.startsWith("blob:")) {
        urls.add(normalized.draftPreviewUrl);
      }
    });
    (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : []).forEach((element) => {
      if (element.type !== "media") return;
      const normalized = normalizeMediaItem(element.media);
      if (normalized && normalized.draftPreviewUrl && normalized.draftPreviewUrl.startsWith("blob:")) {
        urls.add(normalized.draftPreviewUrl);
      }
    });
  });
  return urls;
};

const collectSlidePreloadTargets = (slide) => {
  const targets = [];
  const addMediaTarget = (item) => {
    const media = normalizeMediaItem(item);
    if (!media) return;

    if (media.kind === "image") {
      const src = getDisplayUrl(media);
      if (src && !src.startsWith("blob:")) targets.push({ kind: "image", src });
      return;
    }

    if (media.kind === "youtube") {
      const thumbnail = getYouTubeThumbnail(media.url);
      if (thumbnail) targets.push({ kind: "image", src: thumbnail });
      return;
    }

    if (media.kind === "video") {
      if (media.poster && !media.poster.startsWith("blob:")) {
        targets.push({ kind: "image", src: media.poster });
      }
    }
  };

  (Array.isArray(slide?.media) ? slide.media : []).forEach(addMediaTarget);
  (Array.isArray(slide?.freeLayoutElements) ? slide.freeLayoutElements : []).forEach((element) => {
    if (element?.type === "media") addMediaTarget(element.media);
  });

  return targets.filter((target, index, list) => list.findIndex((item) => item.kind === target.kind && item.src === target.src) === index);
};

const preloadMediaTarget = (target) => {
  if (!target?.src || target.kind !== "image") return;
  const image = new Image();
  image.decoding = "async";
  image.src = target.src;
};

const scheduleBrowserIdleTask = (callback) => {
  if (typeof window === "undefined") return () => {};
  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(() => callback(), { timeout: 800 });
    return () => window.cancelIdleCallback(idleId);
  }
  const timeoutId = window.setTimeout(callback, 120);
  return () => window.clearTimeout(timeoutId);
};

const getViewportOrientation = () => {
  const explicitOrientation = window.screen?.orientation?.type;
  if (typeof explicitOrientation === "string") {
    return explicitOrientation.startsWith("landscape") ? "landscape" : "portrait";
  }

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait";
  }

  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  return viewportWidth > viewportHeight ? "landscape" : "portrait";
};

const supportsHoverInteractions = () => {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

const resolveLayoutMode = () => {
  if (!IS_QR_MOBILE_MODE) return "desktop-feed";
  return getViewportOrientation() === "landscape" ? "mobile-landscape-feed" : "mobile-portrait-feed";
};

const attemptInlineVideoPlayback = (video, preferredMuted, onMutedChange) => {
  if (!video) return;
  video.muted = preferredMuted;
  if (typeof onMutedChange === "function") onMutedChange(preferredMuted);
  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.catch === "function") {
    playAttempt.catch(() => {
      video.muted = true;
      if (typeof onMutedChange === "function") onMutedChange(true);
      const mutedAttempt = video.play();
      if (mutedAttempt && typeof mutedAttempt.catch === "function") mutedAttempt.catch(() => {});
    });
  }
};

const stopInlineVideoPlayback = (video, options = {}) => {
  const shouldResetMuted = Boolean(options.resetMuted);
  if (!video) return;
  video.pause();
  if (shouldResetMuted) video.muted = true;
};

const withEmbedPlaybackParams = (embedUrl, autoplay = false) => {
  if (!embedUrl) return "";
  try {
    const url = new URL(embedUrl);
    const enabled = autoplay ? "1" : "0";
    if (url.hostname.includes("youtube.com")) {
      url.searchParams.set("autoplay", enabled);
      url.searchParams.set("mute", "1");
      url.searchParams.set("playsinline", "1");
    } else if (url.hostname.includes("player.bilibili.com")) {
      url.searchParams.set("autoplay", enabled);
    } else if (url.hostname.includes("open.douyin.com")) {
      url.searchParams.set("autoplay", enabled);
    }
    return url.toString();
  } catch (error) {
    return embedUrl;
  }
};

const isFileDragEvent = (event) => {
  const types = event?.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes("Files");
};

const sanitizeSlidesForExport = (slides) => normalizeSlides(slides).map((slide) => ({
  ...slide,
  textBlocks: Array.isArray(slide.textBlocks) ? slide.textBlocks.map((block) => String(block ?? "")) : undefined,
  freeLayoutElements: Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements.map((element) => {
    const normalized = normalizeFreeLayoutElement(element);
    if (normalized.type === "media") {
      const media = normalizeMediaItem(normalized.media);
      return {
        id: normalized.id,
        type: normalized.type,
        x: normalized.x,
        y: normalized.y,
        w: normalized.w,
        h: normalized.h,
        z: normalized.z,
        media: {
          kind: media.kind,
          url: media.kind === "youtube" ? extractYouTubeId(media.url) || media.url : media.url,
          poster: media.poster,
          meta: media.meta,
          label: media.label
        }
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
  }) : undefined,
  media: Array.isArray(slide.media) ? slide.media.map((item) => {
    const normalized = normalizeMediaItem(item);
    if (!normalized) return null;
    const cleaned = {
      kind: normalized.kind,
      url: normalized.kind === "youtube" ? extractYouTubeId(normalized.url) || normalized.url : normalized.url,
      poster: normalized.poster,
      meta: normalized.meta
    };
    if (!cleaned.poster) delete cleaned.poster;
    if (!cleaned.meta) delete cleaned.meta;
    if (!cleaned.url) delete cleaned.url;
    return cleaned;
  }).filter(Boolean) : []
})).map((slide) => {
  if (slide.textBlocks === undefined) return slide;
  slide.text = slide.textBlocks[0] || "";
  return slide;
});

const getStoredDraft = () => {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return createPortfolioModel(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to parse local draft", error);
    return null;
  }
};

const loadPortfolioModel = async () => {
  if (window.location.protocol === "file:") return createPortfolioModel(EMBEDDED_PORTFOLIO);

  const shouldBypassCache = new URLSearchParams(window.location.search).get("editor") === "1";
  const requestUrl = shouldBypassCache ? `${DATA_FILE_PATH}?t=${Date.now()}` : DATA_FILE_PATH;
  const response = await fetch(requestUrl, shouldBypassCache ? { cache: "no-store" } : undefined);
  if (!response.ok) throw new Error(`Unable to load ${DATA_FILE_PATH}`);
  return createPortfolioModel(await response.json());
};

const downloadJsonFile = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const getPrimaryMediaUrl = (item, options = {}) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem) return "";
  const preferDraftPreview = Boolean(options.preferDraftPreview);
  if (mediaItem.kind === "youtube") return mediaItem.url || mediaItem.draftPreviewUrl || "";
  return preferDraftPreview ? mediaItem.draftPreviewUrl || mediaItem.url || "" : mediaItem.url || mediaItem.draftPreviewUrl || "";
};

const getDisplayUrl = (item, options = {}) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem) return "";
  const preferDraftPreview = Boolean(options.preferDraftPreview);
  if (mediaItem.kind === "youtube") return mediaItem.poster || getYouTubeThumbnail(mediaItem.url) || mediaItem.draftPreviewUrl || "";
  if (mediaItem.kind === "video") return mediaItem.poster || "";
  return preferDraftPreview ? mediaItem.draftPreviewUrl || mediaItem.url || mediaItem.poster || "" : mediaItem.url || mediaItem.draftPreviewUrl || mediaItem.poster || "";
};

const getMediaBindingInfo = (item) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem) return null;

  const urlValue = String(mediaItem.url || "").trim();
  const previewValue = String(mediaItem.draftPreviewUrl || "").trim();

  if (urlValue) {
    const shortValue = urlValue.length > 42 ? `${urlValue.slice(0, 39)}...` : urlValue;
    return {
      state: "linked",
      text: `已绑定：${shortValue}`,
      detail: "这个媒体会随导出的 JSON 一起发布。"
    };
  }

  if (previewValue) {
    return {
      state: "draft-only",
      text: "仅本地预览，尚未绑定发布路径",
      detail: "现在导出只会保留媒体类型，不会带上这张图或这个视频。"
    };
  }

  return null;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
};

const isRemoteUrl = (value = "") => /^https?:\/\//i.test(String(value || "").trim());

const shouldCheckAssetPath = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("images/") || normalized.startsWith("videos/");
};

const resolveAssetUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isRemoteUrl(raw)) return raw;
  try {
    return new URL(raw, window.location.href).toString();
  } catch (error) {
    return "";
  }
};

const probeUrl = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (response.ok) return true;
  } catch (error) {}

  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const validateSlidesBeforeExport = async (slides) => {
  const issues = [];
  const checkedUrls = new Map();

  for (let slideIndex = 0; slideIndex < slides.length; slideIndex += 1) {
    const slide = normalizeSlide(slides[slideIndex]);
    const pageLabel = `第 ${slideIndex + 1} 页`;
    const mediaItems = Array.isArray(slide.media) ? slide.media : [];

    for (let mediaIndex = 0; mediaIndex < mediaItems.length; mediaIndex += 1) {
      const item = normalizeMediaItem(mediaItems[mediaIndex]);
      if (!item) continue;

      const slotLabel = `${pageLabel} 第 ${mediaIndex + 1} 个媒体框`;
      const urlValue = String(item.url || "").trim();

      if (!urlValue && item.draftPreviewUrl) {
        issues.push(`${slotLabel} 仍是本地预览，未绑定发布路径。请重新拖入正式素材，直到出现“已绑定：images/... / videos/...”后再导出。`);
        continue;
      }

      if (!urlValue && !item.draftPreviewUrl) {
        issues.push(`${slotLabel} 没有填写资源链接`);
        continue;
      }

      if (item.kind === "youtube" && !extractYouTubeId(urlValue)) {
        issues.push(`${slotLabel} 的 YouTube 链接或视频 ID 无效`);
        continue;
      }

      if (window.location.protocol !== "file:" && shouldCheckAssetPath(urlValue)) {
        const resolvedUrl = resolveAssetUrl(urlValue);
        if (!resolvedUrl) {
          issues.push(`${slotLabel} 的相对路径无效：${urlValue}`);
          continue;
        }
        if (!checkedUrls.has(resolvedUrl)) {
          checkedUrls.set(resolvedUrl, await probeUrl(resolvedUrl));
        }
        if (!checkedUrls.get(resolvedUrl)) {
          issues.push(`${slotLabel} 找不到资源：${urlValue}`);
        }
      }
    }

    const freeLayoutMedia = (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : []).filter((element) => element.type === "media");
    for (let elementIndex = 0; elementIndex < freeLayoutMedia.length; elementIndex += 1) {
      const item = normalizeMediaItem(freeLayoutMedia[elementIndex].media);
      if (!item) continue;
      const slotLabel = `${pageLabel} 自由布局媒体 ${elementIndex + 1}`;
      const urlValue = String(item.url || "").trim();

      if (!urlValue && item.draftPreviewUrl) {
        issues.push(`${slotLabel} 仍是本地预览，未绑定发布路径。请重新拖入正式素材，直到出现“已绑定：images/... / videos/...”后再导出。`);
        continue;
      }

      if (!urlValue && !item.draftPreviewUrl) {
        issues.push(`${slotLabel} 没有填写资源链接`);
        continue;
      }

      if (item.kind === "youtube" && !extractYouTubeId(urlValue)) {
        issues.push(`${slotLabel} 的 YouTube 链接或视频 ID 无效`);
        continue;
      }

      if (window.location.protocol !== "file:" && shouldCheckAssetPath(urlValue)) {
        const resolvedUrl = resolveAssetUrl(urlValue);
        if (!resolvedUrl) {
          issues.push(`${slotLabel} 的相对路径无效：${urlValue}`);
          continue;
        }
        if (!checkedUrls.has(resolvedUrl)) {
          checkedUrls.set(resolvedUrl, await probeUrl(resolvedUrl));
        }
        if (!checkedUrls.get(resolvedUrl)) {
          issues.push(`${slotLabel} 找不到资源：${urlValue}`);
        }
      }
    }
  }

  return issues;
};

const Icon = ({ name, size = 24, className = "" }) => {
  const icons = {
    ChevronLeft: <path d="m15 18-6-6 6-6" />,
    ChevronRight: <path d="m9 18 6-6-6-6" />,
    UploadCloud: <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9M8 17l4-4 4 4" />,
    Home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    Maximize: <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />,
    Minimize: <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />,
    ArrowUp: <path d="m12 19 0-14M5 12l7-7 7 7" />,
    ArrowDown: <path d="M12 5v14m7-7-7 7-7-7" />,
    Copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    Plus: <path d="M5 12h14M12 5v14" />,
    Trash2: <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />,
    LayoutTemplate: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 9h18M9 21V9" /></>,
    Grid: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>,
    Volume2: <><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>,
    VolumeX: <><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>,
    Play: <polygon points="6 4 20 12 6 20 6 4" />,
    Pause: <><line x1="8" y1="4" x2="8" y2="20" /><line x1="16" y1="4" x2="16" y2="20" /></>,
    Maximize2: <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>,
    Sliders: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
    Download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    FileJson: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M10 13H8" /></>,
    RotateCcw: <><path d="M3 2v6h6" /><path d="M3 8a9 9 0 1 0 2.6-4.4L3 8" /></>,
    Link2: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L11.8 5.1" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.66-1.66" /></>,
    Settings2: <><path d="M12 3v3" /><path d="M18.364 5.636 16.243 7.757" /><path d="M21 12h-3" /><path d="m18.364 18.364-2.121-2.121" /><path d="M12 18v3" /><path d="m7.757 16.243-2.121 2.121" /><path d="M6 12H3" /><path d="m7.757 7.757-2.121-2.121" /><circle cx="12" cy="12" r="3" /></>,
    ExternalLink: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>
  };
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>{icons[name]}</svg>;
};

const MediaView = ({ mediaItem, muted, stopClick, onMediaSurfaceClick, videoRef, mediaClassName, onMediaLoad, onMediaError, onVideoMetadata, onMediaMeasure, onVideoPlay, onVideoPause, onVideoTimeUpdate, preferDraftPreview = false, shouldAutoPlay = false, showPoster = true, allowEmbeddedPlayback = false }) => {
  const item = normalizeMediaItem(mediaItem);
  if (!item) return null;
  const handleSurfaceClick = typeof onMediaSurfaceClick === "function" ? onMediaSurfaceClick : stopClick;
  const fallbackDisplayUrl = getDisplayUrl(item, { preferDraftPreview });
  const renderEmbeddedFallback = (label) => {
    if (fallbackDisplayUrl) {
      return <img
        src={fallbackDisplayUrl}
        alt={label}
        loading="lazy"
        decoding="async"
        fetchPriority="auto"
        className={mediaClassName}
        onLoad={(event) => {
          if (typeof onMediaLoad === "function") onMediaLoad(event);
          if (typeof onMediaMeasure === "function" && event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) {
            onMediaMeasure(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
          }
        }}
        onError={onMediaError}
        onClick={handleSurfaceClick}
      />;
    }

    if (typeof onMediaLoad === "function") window.setTimeout(() => onMediaLoad(), 0);
    return <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center" onClick={handleSurfaceClick}>
      <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/35 px-4 py-2 text-sm text-white/75">
        <Icon name="Play" size={14} className="translate-x-[1px]" /> {label}
      </div>
    </div>;
  };

  if (item.kind === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(item.url);
    if (!embedUrl) return null;
    if (!allowEmbeddedPlayback) return renderEmbeddedFallback("悬停播放视频");
    return <iframe src={withEmbedPlaybackParams(embedUrl, true)} title="YouTube preview" loading="lazy" className="relative z-10 w-full h-full rounded-xl border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={onMediaLoad} onClick={handleSurfaceClick} />;
  }

  if (item.kind === "video") {
    const src = getPrimaryMediaUrl(item, { preferDraftPreview });
    if (!src) return null;
    const embedUrl = getVideoEmbedUrl(src);
    if (embedUrl && !isDirectVideoSource(src)) {
      if (!allowEmbeddedPlayback) return renderEmbeddedFallback("悬停播放视频");
      return <iframe src={withEmbedPlaybackParams(embedUrl, true)} title="视频预览" loading="lazy" className="relative z-10 w-full h-full rounded-xl border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onLoad={onMediaLoad} onClick={handleSurfaceClick} />;
    }
    if (!isDirectVideoSource(src)) {
      if (typeof onMediaLoad === "function") window.setTimeout(() => onMediaLoad(), 0);
      return <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center">
        <a href={src} target="_blank" rel="noreferrer" onClick={handleSurfaceClick} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20">
          <Icon name="ExternalLink" size={14} /> 打开视频链接预览
        </a>
      </div>;
    }
    return <video
      ref={videoRef}
      src={src}
      loop
      muted={muted}
      playsInline
      preload={shouldAutoPlay ? "metadata" : item.poster && !preferDraftPreview ? "none" : "metadata"}
      poster={showPoster ? item.poster || undefined : undefined}
      className={mediaClassName}
      onLoadedData={onMediaLoad}
      onLoadedMetadata={(event) => {
        if (typeof onVideoMetadata === "function") onVideoMetadata(event.currentTarget.duration);
        if (typeof onMediaMeasure === "function" && event.currentTarget.videoWidth && event.currentTarget.videoHeight) {
          onMediaMeasure(event.currentTarget.videoWidth / event.currentTarget.videoHeight);
        }
      }}
      onError={onMediaError}
      onPlay={onVideoPlay}
      onPause={onVideoPause}
      onTimeUpdate={onVideoTimeUpdate}
      onClick={handleSurfaceClick}
    />;
  }

  const src = getDisplayUrl(item, { preferDraftPreview });
  if (!src) return null;
  return <img
    src={src}
    alt="asset"
    loading="lazy"
    decoding="async"
    fetchPriority="auto"
    className={mediaClassName}
    onLoad={(event) => {
      if (typeof onMediaLoad === "function") onMediaLoad(event);
      if (typeof onMediaMeasure === "function" && event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) {
        onMediaMeasure(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
      }
    }}
    onError={onMediaError}
    onClick={handleSurfaceClick}
  />;
};

const InlineMediaControls = ({ visible, showPlayToggle = false, isPlaying = false, isMuted = true, timeLabel = "", progressPercent = 0, onTogglePlay, onToggleMute, onToggleFullscreen }) => <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/78 via-black/28 to-transparent" />
  <div className="relative flex items-end justify-between gap-3 px-4 pb-4 pt-10">
    <div className="pointer-events-auto flex items-center gap-2">
      {showPlayToggle && <button onClick={onTogglePlay} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/85 backdrop-blur-sm transition hover:bg-black/70">
        <Icon name={isPlaying ? "Pause" : "Play"} size={16} className={isPlaying ? "" : "translate-x-[1px]"} />
      </button>}
      {showPlayToggle && <button onClick={onToggleMute} className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/85 backdrop-blur-sm transition hover:bg-black/70">
        <Icon name={isMuted ? "VolumeX" : "Volume2"} size={16} />
      </button>}
    </div>
    <button onClick={onToggleFullscreen} className="pointer-events-auto flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/85 backdrop-blur-sm transition hover:bg-black/70">
      <Icon name="Maximize2" size={16} />
    </button>
  </div>
  {showPlayToggle && <div className="relative flex items-center gap-3 px-4 pb-4">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
      <div className="h-full rounded-full bg-white/80 transition-[width] duration-150" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
    </div>
    <div className="min-w-[86px] text-right text-[10px] font-mono tracking-[0.18em] text-white/68">{timeLabel}</div>
  </div>}
</div>;

const CaseResultPills = ({ results }) => {
  const entries = Object.entries(results || {});
  if (!entries.length) return null;
  return <div className="flex flex-wrap gap-2">
    {entries.map(([key, value]) => <div key={key} className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/72">
      <span className="mr-2 text-white/40">{key}</span>
      <span className="font-medium text-white/88">{value}</span>
    </div>)}
  </div>;
};

const CaseList = ({ title, description, cases, activeCaseId, onSelectCase }) => {
  const categories = ["全部", ...Array.from(new Set(cases.map((item) => item.category).filter(Boolean)))];
  const [category, setCategory] = useState("全部");
  const filteredCases = category === "全部" ? cases : cases.filter((item) => item.category === category);

  return <div className="flex flex-col gap-6 px-2 py-4">
    <div className="flex flex-col gap-3 px-2">
      <div className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/65">Case Library</div>
      <h2 className="text-3xl font-semibold tracking-tight text-white/92">{title}</h2>
      <p className="max-w-3xl text-sm leading-7 text-white/60">{description}</p>
    </div>
    <div className="flex flex-wrap gap-2 px-2">
      {categories.map((item) => <button key={item} onClick={() => setCategory(item)} className={`rounded-full border px-3 py-1.5 text-xs transition ${category === item ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-50" : "border-white/10 bg-white/5 text-white/68 hover:bg-white/10"}`}>
        {item}
      </button>)}
    </div>
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {filteredCases.map((item) => <button key={item.id} onClick={() => onSelectCase(item.id)} className={`group overflow-hidden rounded-[28px] border text-left transition ${activeCaseId === item.id ? "border-cyan-300/30 bg-white/[0.08]" : "border-white/10 bg-white/[0.04] hover:bg-white/[0.07]"}`}>
        <div className="grid grid-cols-1 gap-0 md:grid-cols-[1.15fr_1fr]">
          <div className="relative min-h-[220px] overflow-hidden bg-black/30">
            {item.cover ? <img src={item.cover} alt={item.title} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.02]" /> : <div className="flex h-full items-center justify-center text-white/25">暂无封面</div>}
            <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/72 to-transparent" />
            <div className="absolute bottom-3 left-3 rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/75">{item.category}</div>
          </div>
          <div className="flex flex-col gap-4 p-5">
            <div className="space-y-2">
              <div className="text-xs uppercase tracking-[0.18em] text-white/40">{item.id}</div>
              <h3 className="text-xl font-semibold leading-tight text-white/92">{item.title}</h3>
              <p className="text-sm leading-7 text-white/62">{item.description}</p>
            </div>
            <CaseResultPills results={item.results} />
            <div className="mt-auto flex flex-wrap gap-2">
              {item.tags.map((tag) => <span key={tag} className="rounded-full bg-white/6 px-2.5 py-1 text-[11px] text-white/60">{tag}</span>)}
            </div>
          </div>
        </div>
      </button>)}
    </div>
  </div>;
};

const CaseDetail = ({ caseItem, onJumpToSlide, onOpenContact }) => {
  if (!caseItem) {
    return <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.03] p-8 text-center text-sm leading-7 text-white/45">
      从上方案例卡片进入详情，这里会显示项目说明、工具链、结果数据和关联作品跳转。
    </div>;
  }

  return <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05]">
    <div className="grid grid-cols-1 gap-0 xl:grid-cols-[1.1fr_0.9fr]">
      <div className="relative min-h-[280px] bg-black/30">
        {caseItem.cover ? <img src={caseItem.cover} alt={caseItem.title} loading="lazy" decoding="async" className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-white/25">暂无封面</div>}
        <div className="absolute inset-0 bg-gradient-to-t from-black/82 via-black/12 to-transparent" />
        <div className="absolute bottom-6 left-6 right-6 space-y-3">
          <div className="inline-flex rounded-full border border-white/10 bg-black/35 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-white/75">{caseItem.category}</div>
          <h3 className="text-3xl font-semibold tracking-tight text-white">{caseItem.title}</h3>
          <p className="max-w-2xl text-sm leading-7 text-white/72">{caseItem.description}</p>
        </div>
      </div>
      <div className="flex flex-col gap-6 p-6">
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/65">Results</div>
          <CaseResultPills results={caseItem.results} />
        </div>
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/65">Tools</div>
          <div className="flex flex-wrap gap-2">
            {caseItem.tools.map((tool) => <span key={tool} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/72">{tool}</span>)}
          </div>
        </div>
        <div className="space-y-3">
          <div className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/65">Linked Slides</div>
          <div className="flex flex-wrap gap-2">
            {caseItem.slideIds.map((slideId) => <button key={slideId} onClick={() => onJumpToSlide(slideId)} className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white/70 hover:bg-white/10">
              跳转到作品 {slideId}
            </button>)}
          </div>
        </div>
        <div className="mt-auto flex flex-wrap gap-3 pt-2">
          <button onClick={() => onOpenContact(caseItem, "consult")} className="rounded-full border border-cyan-300/20 bg-cyan-500/15 px-4 py-2 text-sm text-cyan-50 hover:bg-cyan-500/22">
            咨询同类项目
          </button>
          <button onClick={() => onOpenContact(caseItem, "workflow")} className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/72 hover:bg-white/10">
            复用此工作流
          </button>
        </div>
      </div>
    </div>
  </div>;
};

const ContactForm = ({ meta, activeCase, requestContext }) => {
  const hasEndpoint = Boolean(String(meta.formspreeEndpoint || "").trim());
  return <div className="overflow-hidden rounded-[28px] border border-white/10 bg-white/[0.05]">
    <div className="grid grid-cols-1 gap-0 xl:grid-cols-[0.92fr_1.08fr]">
      <div className="flex flex-col gap-4 p-6">
        <div className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/65">Contact</div>
        <h2 className="text-3xl font-semibold tracking-tight text-white/92">{meta.contactSectionTitle}</h2>
        <p className="text-sm leading-7 text-white/62">{meta.contactSectionDesc}</p>
        {activeCase && <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="text-[11px] uppercase tracking-[0.18em] text-white/38">当前案例上下文</div>
          <div className="mt-2 text-base font-medium text-white/88">{activeCase.title}</div>
          <div className="mt-1 text-sm leading-6 text-white/55">{requestContext === "workflow" ? "用户从“复用此工作流”进入表单。" : "用户从“咨询同类项目”进入表单。"}</div>
        </div>}
        {!hasEndpoint && <div className="rounded-2xl border border-amber-300/20 bg-amber-500/10 p-4 text-sm leading-7 text-amber-50/90">
          当前还没有配置 `Formspree Endpoint`。在编辑站的 `meta` 区填入 `https://formspree.io/f/...` 后，这个表单就会直接生效。
        </div>}
      </div>
      <form action={hasEndpoint ? meta.formspreeEndpoint : undefined} method="POST" className="flex flex-col gap-4 border-t border-white/8 p-6 xl:border-l xl:border-t-0">
        <label className="text-sm text-white/60">
          <span className="mb-2 block">项目类型</span>
          <input name="projectType" required className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/30 focus:bg-white/10" placeholder="商业视觉 / 短视频分镜 / AIGC 工具链" />
        </label>
        <label className="text-sm text-white/60">
          <span className="mb-2 block">预算区间</span>
          <input name="budgetRange" required className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/30 focus:bg-white/10" placeholder="例如 5000-20000 元" />
        </label>
        <label className="text-sm text-white/60">
          <span className="mb-2 block">联系方式</span>
          <input name="contact" required className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-white outline-none transition focus:border-cyan-300/30 focus:bg-white/10" placeholder="邮箱 / 微信 / 手机号" />
        </label>
        <input type="hidden" name="caseId" value={activeCase?.id || ""} />
        <input type="hidden" name="caseTitle" value={activeCase?.title || ""} />
        <input type="hidden" name="requestContext" value={requestContext || "general"} />
        <button type={hasEndpoint ? "submit" : "button"} disabled={!hasEndpoint} className={`mt-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${hasEndpoint ? "bg-cyan-500 text-black hover:bg-cyan-400" : "cursor-not-allowed bg-white/8 text-white/32"}`}>
          {meta.contactCtaLabel}
        </button>
      </form>
    </div>
  </div>;
};

const ensureMetaTag = (selector, createTag) => {
  let element = document.head.querySelector(selector);
  if (element) return element;
  element = createTag();
  document.head.appendChild(element);
  return element;
};

const toAbsoluteUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, window.location.href).toString();
  } catch (error) {
    return raw;
  }
};

const applyDocumentMeta = (meta, caseItem) => {
  const title = caseItem ? `${caseItem.title} - ${meta.siteTitle}` : meta.siteTitle;
  const description = caseItem ? caseItem.description || meta.siteDescription : meta.siteDescription;
  const ogTitle = caseItem ? `${caseItem.title} - ${meta.ogTitle}` : meta.ogTitle;
  const ogDescription = caseItem ? caseItem.description || meta.ogDescription : meta.ogDescription;
  const ogImage = toAbsoluteUrl(caseItem?.cover || meta.ogImage);
  const canonicalHref = (() => {
    try {
      const canonicalUrl = new URL(meta.canonicalUrl || window.location.href);
      canonicalUrl.search = "";
      return canonicalUrl.toString();
    } catch (error) {
      return window.location.href.split("?")[0];
    }
  })();

  document.title = title;
  ensureMetaTag('meta[name="description"]', () => {
    const tag = document.createElement("meta");
    tag.name = "description";
    return tag;
  }).setAttribute("content", description);
  ensureMetaTag('meta[name="keywords"]', () => {
    const tag = document.createElement("meta");
    tag.name = "keywords";
    return tag;
  }).setAttribute("content", meta.siteKeywords.join(", "));
  ensureMetaTag('meta[property="og:title"]', () => {
    const tag = document.createElement("meta");
    tag.setAttribute("property", "og:title");
    return tag;
  }).setAttribute("content", ogTitle);
  ensureMetaTag('meta[property="og:description"]', () => {
    const tag = document.createElement("meta");
    tag.setAttribute("property", "og:description");
    return tag;
  }).setAttribute("content", ogDescription);
  ensureMetaTag('meta[property="og:image"]', () => {
    const tag = document.createElement("meta");
    tag.setAttribute("property", "og:image");
    return tag;
  }).setAttribute("content", ogImage);
  ensureMetaTag('meta[name="twitter:card"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:card";
    return tag;
  }).setAttribute("content", meta.twitterCard);
  ensureMetaTag('meta[name="twitter:title"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:title";
    return tag;
  }).setAttribute("content", ogTitle);
  ensureMetaTag('meta[name="twitter:description"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:description";
    return tag;
  }).setAttribute("content", ogDescription);
  ensureMetaTag('meta[name="twitter:image"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:image";
    return tag;
  }).setAttribute("content", ogImage);
  ensureMetaTag('link[rel="canonical"]', () => {
    const link = document.createElement("link");
    link.rel = "canonical";
    return link;
  }).setAttribute("href", canonicalHref);
};

function App() {
  const [portfolioData, setPortfolioData] = useState(() => createPortfolioModel(EMBEDDED_PORTFOLIO));
  const [publishedPortfolioData, setPublishedPortfolioData] = useState(() => createPortfolioModel(EMBEDDED_PORTFOLIO));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [layoutMode, setLayoutMode] = useState(() => resolveLayoutMode());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadSource, setLoadSource] = useState("loading");
  const [statusMessage, setStatusMessage] = useState("正在载入发布数据...");
  const [isPageJumpEditing, setIsPageJumpEditing] = useState(false);
  const [pageJumpValue, setPageJumpValue] = useState("1");
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [metaEditorValue, setMetaEditorValue] = useState("");
  const [metaEditorError, setMetaEditorError] = useState("");
  const [casesEditorValue, setCasesEditorValue] = useState("");
  const [casesEditorError, setCasesEditorError] = useState("");
  const importInputRef = useRef(null);
  const pageJumpInputRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const hasHydrated = useRef(false);
  const draftPreviewUrlsRef = useRef(new Set());
  const slideTransitionTimeoutRef = useRef(null);
  const preloadedMediaRef = useRef(new Set());
  const slideSectionRefs = useRef(new Map());
  const activeSlideRatiosRef = useRef(new Map());
  const activeSlideFrameRef = useRef(null);
  const currentTheme = colorPalettes[currentSlide % colorPalettes.length] || colorPalettes[0];
  const slidesData = portfolioData.slides;
  const casesData = portfolioData.cases;
  const siteMeta = portfolioData.meta;
  const publishedSlidesData = publishedPortfolioData.slides;
  const tocSlideIndex = Math.max(0, slidesData.findIndex((slide) => slide && slide.type === "toc"));
  const isMobileFeedMode = true;
  const isMobilePreviewMode = layoutMode !== "desktop-feed";
  const isMobilePortraitMode = layoutMode === "mobile-portrait-feed";
  const isMobileLandscapeMode = layoutMode === "mobile-landscape-feed";
  const prefersHoverControls = supportsHoverInteractions();
  const sectionScrollOffset = IS_EDITOR_MODE ? 132 : 92;
  const portfolioExportModel = sanitizePortfolioModelForExport(portfolioData);
  const portfolioByteSize = getByteSize(portfolioExportModel);
  const portfolioSizeTone = getPortfolioSizeTone(portfolioByteSize);

  const setSlidesData = (updater) => setPortfolioData((prev) => ({
    ...prev,
    slides: typeof updater === "function" ? updater(prev.slides) : updater
  }));
  const setCasesData = (updater) => setPortfolioData((prev) => ({
    ...prev,
    cases: typeof updater === "function" ? updater(prev.cases) : updater
  }));
  const setSiteMetaData = (updater) => setPortfolioData((prev) => ({
    ...prev,
    meta: typeof updater === "function" ? updater(prev.meta) : updater
  }));

  const setSlideSectionRef = (index, node) => {
    if (node) slideSectionRefs.current.set(index, node);
    else slideSectionRefs.current.delete(index);
  };

  const scrollToElementRef = (targetRef) => {
    const node = targetRef?.current;
    if (!node) return;
    const targetTop = window.scrollY + node.getBoundingClientRect().top - sectionScrollOffset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
  };

  const scrollToSlide = (nextIndex) => {
    const target = slideSectionRefs.current.get(nextIndex);
    if (!target) return;
    const targetTop = window.scrollY + target.getBoundingClientRect().top - sectionScrollOffset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    setCurrentSlide(nextIndex);
  };

  const applyMetaEditorValue = () => {
    try {
      const parsed = JSON.parse(metaEditorValue);
      setSiteMetaData(normalizeSiteMeta(parsed));
      setMetaEditorError("");
      setStatusMessage("已更新站点 meta 配置。");
    } catch (error) {
      setMetaEditorError("meta JSON 解析失败，请检查逗号和引号。");
    }
  };

  const applyCasesEditorValue = () => {
    try {
      const parsed = JSON.parse(casesEditorValue);
      setCasesData(sanitizeCasesForExport(parsed));
      setCasesEditorError("");
      setStatusMessage("已更新结构化案例数据。");
    } catch (error) {
      setCasesEditorError("cases JSON 解析失败，请检查数组和字段格式。");
    }
  };

  useEffect(() => {
    let mounted = true;

    loadPortfolioModel().then((published) => {
      if (!mounted) return;
      const draft = IS_EDITOR_MODE ? getStoredDraft() : null;
      setPublishedPortfolioData(deepClone(published));
      setPortfolioData(draft ? draft : deepClone(published));
      setLoadSource(draft ? "draft" : "published");
      setStatusMessage(draft ? "已载入本地草稿，可继续编辑后导出 JSON。" : `已载入发布数据：${DATA_FILE_PATH}`);
    }).catch(() => {
      if (!mounted) return;
      const fallback = createPortfolioModel(EMBEDDED_PORTFOLIO);
      const draft = IS_EDITOR_MODE ? getStoredDraft() : null;
      setPublishedPortfolioData(deepClone(fallback));
      setPortfolioData(draft ? draft : deepClone(fallback));
      setLoadSource(draft ? "draft-fallback" : "embedded");
      setStatusMessage(draft ? "发布文件读取失败，已改用本地草稿。" : "发布文件读取失败，已改用本地备份数据。");
    }).finally(() => {
      if (!mounted) return;
      setIsLoading(false);
      hasHydrated.current = true;
    });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!IS_EDITOR_MODE || !hasHydrated.current || !slidesData.length) return;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(portfolioExportModel));
  }, [portfolioExportModel, slidesData.length]);

  useEffect(() => {
    if (!showStructureEditor) return;
    setMetaEditorValue(JSON.stringify(siteMeta, null, 2));
    setCasesEditorValue(JSON.stringify(casesData, null, 2));
  }, [showStructureEditor, siteMeta, casesData]);

  useEffect(() => {
    const nextUrls = collectDraftPreviewUrls(slidesData);
    draftPreviewUrlsRef.current.forEach((url) => {
      if (!nextUrls.has(url)) URL.revokeObjectURL(url);
    });
    draftPreviewUrlsRef.current = nextUrls;
  }, [slidesData]);

  useEffect(() => () => {
    draftPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    draftPreviewUrlsRef.current = new Set();
  }, []);

  useEffect(() => () => {
    if (slideTransitionTimeoutRef.current) {
      window.clearTimeout(slideTransitionTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const updateLayoutMode = () => setLayoutMode(resolveLayoutMode());
    updateLayoutMode();
    window.addEventListener("resize", updateLayoutMode);
    window.addEventListener("orientationchange", updateLayoutMode);
    window.visualViewport?.addEventListener("resize", updateLayoutMode);
    window.screen?.orientation?.addEventListener?.("change", updateLayoutMode);
    return () => {
      window.removeEventListener("resize", updateLayoutMode);
      window.removeEventListener("orientationchange", updateLayoutMode);
      window.visualViewport?.removeEventListener("resize", updateLayoutMode);
      window.screen?.orientation?.removeEventListener?.("change", updateLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (!slidesData.length) return;
    setCurrentSlide((value) => Math.min(value, slidesData.length - 1));
  }, [slidesData.length]);

  useEffect(() => {
    if (!slidesData.length) return;
    const nextSlide = slidesData[currentSlide + 1];
    if (!nextSlide) return;

    let cancelIdleTask = () => {};
    const delayId = window.setTimeout(() => {
      cancelIdleTask = scheduleBrowserIdleTask(() => {
        collectSlidePreloadTargets(nextSlide).forEach((target) => {
          const key = `${target.kind}:${target.src}`;
          if (preloadedMediaRef.current.has(key)) return;
          preloadedMediaRef.current.add(key);
          preloadMediaTarget(target);
        });
      });
    }, SLIDE_TRANSITION_IN_MS + 40);

    return () => {
      window.clearTimeout(delayId);
      cancelIdleTask();
    };
  }, [currentSlide, slidesData]);

  useEffect(() => () => {
    if (activeSlideFrameRef.current) {
      window.cancelAnimationFrame(activeSlideFrameRef.current);
      activeSlideFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!slidesData.length || typeof IntersectionObserver === "undefined") return;
    activeSlideRatiosRef.current.clear();

    const scheduleActiveSlideUpdate = () => {
      if (activeSlideFrameRef.current) return;
      activeSlideFrameRef.current = window.requestAnimationFrame(() => {
        activeSlideFrameRef.current = null;
        let nextIndex = currentSlide;
        let bestRatio = 0;
        activeSlideRatiosRef.current.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            nextIndex = index;
          }
        });
        if (bestRatio > 0) {
          setCurrentSlide((value) => value === nextIndex ? value : nextIndex);
        }
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const nextIndex = Number(entry.target.dataset.slideIndex);
        if (!Number.isFinite(nextIndex)) return;
        activeSlideRatiosRef.current.set(nextIndex, entry.isIntersecting ? entry.intersectionRatio : 0);
      });
      scheduleActiveSlideUpdate();
    }, {
      root: null,
      rootMargin: "-14% 0px -48% 0px",
      threshold: [0, 0.18, 0.42]
    });

    slideSectionRefs.current.forEach((node) => observer.observe(node));
    return () => {
      observer.disconnect();
      activeSlideRatiosRef.current.clear();
      if (activeSlideFrameRef.current) {
        window.cancelAnimationFrame(activeSlideFrameRef.current);
        activeSlideFrameRef.current = null;
      }
    };
  }, [slidesData, currentSlide]);

  useEffect(() => {
    setPageJumpValue(String(currentSlide + 1));
  }, [currentSlide]);

  useEffect(() => {
    if (!isPageJumpEditing || !pageJumpInputRef.current) return;
    pageJumpInputRef.current.focus();
    pageJumpInputRef.current.select();
  }, [isPageJumpEditing]);

  useEffect(() => {
    applyDocumentMeta(siteMeta);
  }, [siteMeta]);

  useEffect(() => {
    if (isMobileFeedMode) return;
    const handleKeyDown = (event) => {
      const tag = event.target.tagName;
      if (event.target.isContentEditable || tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        changeSlide(Math.min(slidesData.length - 1, currentSlide + 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeSlide(Math.max(0, currentSlide - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, slidesData.length, isTransitioning, isMobileFeedMode]);

  useEffect(() => {
    if (!IS_EDITOR_MODE) return undefined;

    const blockFileDrop = (event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
    };

    window.addEventListener("dragover", blockFileDrop);
    window.addEventListener("drop", blockFileDrop);
    return () => {
      window.removeEventListener("dragover", blockFileDrop);
      window.removeEventListener("drop", blockFileDrop);
    };
  }, []);

  const changeSlide = (nextIndex) => {
    if (nextIndex === currentSlide || isTransitioning || nextIndex < 0 || nextIndex >= slidesData.length) return;
    if (slideTransitionTimeoutRef.current) {
      window.clearTimeout(slideTransitionTimeoutRef.current);
    }
    setShowAddMenu(false);
    setIsTransitioning(true);
    slideTransitionTimeoutRef.current = window.setTimeout(() => {
      if (typeof startTransition === "function") {
        startTransition(() => setCurrentSlide(nextIndex));
      } else {
        setCurrentSlide(nextIndex);
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsTransitioning(false));
      });
    }, SLIDE_TRANSITION_OUT_MS);
  };

  const goToSlide = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= slidesData.length) return;
    if (isMobileFeedMode) {
      scrollToSlide(nextIndex);
      return;
    }
    changeSlide(nextIndex);
  };

  const updateSlide = (slideIndex, updater) => {
    setSlidesData((prev) => {
      const next = [...prev];
      next[slideIndex] = updater({ ...next[slideIndex] });
      return next;
    });
  };

  const updateSlideText = (slideIndex, field, value) => updateSlide(slideIndex, (slide) => ({ ...slide, [field]: value }));
  const updateTextBlock = (slideIndex, blockIndex, value) => updateSlide(slideIndex, (slide) => {
    const textBlocks = Array.isArray(slide.textBlocks) ? [...slide.textBlocks] : [slide.text || ""];
    textBlocks[blockIndex] = value;
    return { ...slide, textBlocks, text: textBlocks[0] || "" };
  });

  const updateMediaItem = (slideIndex, slotIndex, updater) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      const media = Array.isArray(slide.media) ? [...slide.media] : [];
      const current = normalizeMediaItem(media[slotIndex]) || { kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" };
      media[slotIndex] = normalizeMediaItem(updater(current));
      slide.media = media;
      next[slideIndex] = slide;
      return next;
    });
  };

  const resetDraft = () => {
    setPortfolioData(deepClone(publishedSlidesData.length ? publishedPortfolioData : createPortfolioModel(EMBEDDED_PORTFOLIO)));
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setLoadSource("published");
    setStatusMessage(`草稿已重置为 ${DATA_FILE_PATH} 的发布内容。`);
  };

  const exportDraft = async () => {
    const issues = await validateSlidesBeforeExport(slidesData);
    const blockingIssues = issues.filter((issue) => issue.includes("未绑定发布路径"));

    if (blockingIssues.length) {
      const preview = blockingIssues.slice(0, 6).join("\n");
      window.alert(`当前有 ${blockingIssues.length} 个媒体仍然只是本地预览，暂时不能导出发布文件：\n\n${preview}${blockingIssues.length > 6 ? "\n..." : ""}`);
      setStatusMessage(`导出已拦截：有 ${blockingIssues.length} 个媒体仍未绑定发布路径。`);
      return;
    }

    if (issues.length) {
      const preview = issues.slice(0, 6).join("\n");
      const shouldContinue = window.confirm(`导出前检查发现 ${issues.length} 个问题：\n\n${preview}${issues.length > 6 ? "\n..." : ""}\n\n仍然继续导出吗？`);
      setStatusMessage(`导出检查发现 ${issues.length} 个问题，请先修复或确认后继续。`);
      if (!shouldContinue) return;
    }

    downloadJsonFile("portfolio.json", portfolioExportModel);
    setStatusMessage(issues.length ? `已导出 portfolio.json，但仍有 ${issues.length} 个待修复问题。` : "当前草稿已导出为 portfolio.json，可覆盖 data/portfolio.json 后提交到 GitHub。");
  };

  const importDraft = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const imported = createPortfolioModel(JSON.parse(await file.text()));
      setPortfolioData(imported);
      setLoadSource("draft");
      setStatusMessage(`已导入 ${file.name}，现在显示的是本地草稿。`);
    } catch (error) {
      alert("JSON 导入失败，请确认文件格式正确。");
    }
    event.target.value = "";
  };

  const addSlide = (layoutType) => {
    const nextSlide = normalizeSlide({
      id: Date.now(),
      type: layoutType,
      title: "自定义页面",
      desc: "在这里输入说明",
      slots: layoutType === "compare-slider" ? 2 : 1,
      slotType: "mix",
      media: [],
      text: layoutType === "split" ? "输入段落文字..." : undefined,
      freeLayoutElements: layoutType === "free-layout" ? [{ ...createFreeLayoutElement("text"), z: 1 }, { ...createFreeLayoutElement("media"), z: 2 }] : undefined
    });
    if (layoutType.startsWith("gallery-")) nextSlide.slots = Number(layoutType.split("-")[1]) || 1;

    setSlidesData((prev) => {
      const next = [...prev];
      next.splice(currentSlide + 1, 0, nextSlide);
      return next;
    });
    setShowAddMenu(false);
  };

  const adjustCurrentSlideSlots = (delta) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[currentSlide] };
      if (!slide || slide.type === "cover" || slide.type === "toc" || slide.type === "chapter" || slide.type === "compare-slider") return prev;
      const currentSlots = Math.max(1, Number(slide.slots) || 1);
      const nextSlots = Math.max(1, Math.min(12, currentSlots + delta));
      if (nextSlots === currentSlots) return prev;
      slide.slots = nextSlots;
      if (typeof slide.type === "string" && slide.type.startsWith("gallery-")) slide.type = `gallery-${nextSlots}`;
      slide.media = Array.isArray(slide.media) ? slide.media.slice(0, nextSlots) : [];
      next[currentSlide] = slide;
      return next;
    });
  };

  const updateFreeLayoutElement = (slideIndex, elementId, updater) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      const elements = Array.isArray(slide.freeLayoutElements) ? [...slide.freeLayoutElements] : [];
      const elementIndex = elements.findIndex((element) => element.id === elementId);
      if (elementIndex < 0) return prev;
      elements[elementIndex] = normalizeFreeLayoutElement(updater({ ...elements[elementIndex] }));
      slide.freeLayoutElements = elements;
      next[slideIndex] = slide;
      return next;
    });
  };

  const moveFreeLayoutElementLayer = (slideIndex, elementId, direction) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      if (!slide || slide.type !== "free-layout") return prev;
      const elements = (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : [])
        .map((element, index) => normalizeFreeLayoutElement({
          ...element,
          z: Number.isFinite(Number(element?.z)) ? Number(element.z) : index + 1
        }))
        .sort((a, b) => a.z - b.z);
      const elementIndex = elements.findIndex((element) => element.id === elementId);
      if (elementIndex < 0) return prev;
      const swapIndex = direction === "forward" ? elementIndex + 1 : elementIndex - 1;
      if (swapIndex < 0 || swapIndex >= elements.length) return prev;
      [elements[elementIndex], elements[swapIndex]] = [elements[swapIndex], elements[elementIndex]];
      slide.freeLayoutElements = elements.map((element, index) => normalizeFreeLayoutElement({
        ...element,
        z: index + 1
      }));
      next[slideIndex] = slide;
      return next;
    });
  };

  const addFreeLayoutElement = (type) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[currentSlide] };
      if (!slide || slide.type !== "free-layout") return prev;
      const elements = Array.isArray(slide.freeLayoutElements) ? [...slide.freeLayoutElements] : [];
      const nextZ = elements.reduce((max, element) => Math.max(max, Number(element?.z) || 1), 0) + 1;
      elements.push({ ...createFreeLayoutElement(type), z: nextZ });
      slide.freeLayoutElements = elements.map(normalizeFreeLayoutElement);
      next[currentSlide] = slide;
      return next;
    });
    setShowAddMenu(false);
  };

  const removeFreeLayoutElement = (slideIndex, elementId) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      if (!slide || slide.type !== "free-layout") return prev;
      slide.freeLayoutElements = (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : []).filter((element) => element.id !== elementId);
      next[slideIndex] = slide;
      return next;
    });
  };

  const adjustCurrentTextBlocks = (delta) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[currentSlide] };
      if (!slide || slide.type !== "split") return prev;
      const textBlocks = Array.isArray(slide.textBlocks) ? [...slide.textBlocks] : [slide.text || ""];
      if (delta > 0) {
        textBlocks.push("");
      } else if (delta < 0 && textBlocks.length > 1) {
        textBlocks.pop();
      }
      slide.textBlocks = textBlocks;
      slide.text = textBlocks[0] || "";
      next[currentSlide] = slide;
      return next;
    });
  };

  const moveCurrentSlide = (delta) => {
    const targetIndex = currentSlide + delta;
    if (targetIndex < 0 || targetIndex >= slidesData.length) return;
    setSlidesData((prev) => {
      const next = [...prev];
      const [moved] = next.splice(currentSlide, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setCurrentSlide(targetIndex);
    setShowAddMenu(false);
  };

  const deleteCurrentSlide = () => {
    if (slidesData.length <= 1) return;
    setSlidesData((prev) => prev.filter((_, index) => index !== currentSlide));
    setCurrentSlide(Math.max(0, Math.min(currentSlide - 1, slidesData.length - 2)));
    setShowAddMenu(false);
  };

  const submitPageJump = () => {
    const parsed = Number(pageJumpValue);
    setIsPageJumpEditing(false);
    if (!Number.isFinite(parsed)) {
      setPageJumpValue(String(currentSlide + 1));
      return;
    }
    const nextIndex = Math.max(0, Math.min(slidesData.length - 1, Math.round(parsed) - 1));
    setPageJumpValue(String(nextIndex + 1));
    goToSlide(nextIndex);
  };

  const CompareSliderContainer = ({ slideIndex }) => {
    const [position, setPosition] = useState(50);
    const sliderRef = useRef(null);

    const handleDrag = (event) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      let clientX = event.clientX;
      if (event.touches && event.touches.length > 0) clientX = event.touches[0].clientX;
      let percent = ((clientX - rect.left) / rect.width) * 100;
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      setPosition(percent);
    };

    const overlayWidth = position > 0 ? `${100 * (100 / position)}%` : "100%";

    return <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10" ref={sliderRef} onMouseMove={(event) => { if (event.buttons === 1) handleDrag(event); }} onTouchMove={handleDrag}>
      <div className="absolute inset-0"><MediaSlot slideIndex={slideIndex} slotIndex={1} label="上传原图 (Before)" /></div>
      <div className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-cyan-400 shadow-[2px_0_15px_rgba(34,211,238,0.5)] z-20 pointer-events-none" style={{ width: `${position}%` }}>
        <div className="absolute inset-y-0 left-0 pointer-events-auto" style={{ width: overlayWidth }}><MediaSlot slideIndex={slideIndex} slotIndex={0} label="上传成品 (After)" /></div>
      </div>
      <div className="absolute inset-y-0 w-8 -ml-4 flex items-center justify-center z-30 cursor-ew-resize slider-handle" style={{ left: `${position}%` }}>
        <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(34,211,238,0.6)]"><Icon name="ChevronLeft" size={14} className="-mr-2" /><Icon name="ChevronRight" size={14} /></div>
      </div>
      <div className="absolute bottom-4 right-4 z-10 px-3 py-1 bg-black/60 backdrop-blur rounded text-xs font-mono text-white/50 tracking-widest pointer-events-none">BEFORE</div>
      <div className="absolute bottom-4 left-4 z-30 px-3 py-1 bg-cyan-500/80 backdrop-blur rounded text-xs font-mono text-black font-bold tracking-widest pointer-events-none">AFTER</div>
    </div>;
  };

  const EditableText = ({ text, field, slideIndex, className, tagName = "div", placeholder = "输入文本...", onBlurValue }) => {
    const Tag = tagName;
    if (!IS_EDITOR_MODE) return <Tag className={className}>{text}</Tag>;
    return <Tag
      data-editable="true"
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      onBlur={(event) => {
        if (typeof onBlurValue === "function") onBlurValue(event.target.innerText);
        else updateSlideText(slideIndex, field, event.target.innerText);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter" && tagName !== "div") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`outline-none hover:bg-white/10 focus:bg-white/20 focus:ring-1 focus:ring-white/50 rounded px-2 py-1 -ml-2 transition-all cursor-text min-h-[1.8em] min-w-[4ch] border border-dashed border-white/10 ${className}`}
      title="点击直接修改文字"
    >{text}</Tag>;
  };

  const FreeLayoutElement = ({ slideIndex, element, containerRef }) => {
    const interactionRef = useRef(null);
    const [showTextSettings, setShowTextSettings] = useState(false);

    useEffect(() => () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopPointerInteraction);
    }, []);

    const stopPointerInteraction = () => {
      interactionRef.current = null;
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopPointerInteraction);
    };

    const handlePointerMove = (event) => {
      const state = interactionRef.current;
      if (!state) return;
      const dx = ((event.clientX - state.startX) / state.rect.width) * 100;
      const dy = ((event.clientY - state.startY) / state.rect.height) * 100;

      updateFreeLayoutElement(slideIndex, element.id, (current) => {
        if (state.mode === "drag") {
          return {
            ...current,
            x: clamp(state.originX + dx, 0, 100 - current.w),
            y: clamp(state.originY + dy, 0, 100 - current.h)
          };
        }
        return {
          ...current,
          w: clamp(state.originW + dx, 12, 100 - current.x),
          h: clamp(state.originH + dy, 10, 100 - current.y)
        };
      });
    };

    const beginPointerInteraction = (mode, event) => {
      if (!IS_EDITOR_MODE || !containerRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current.getBoundingClientRect();
      interactionRef.current = {
        mode,
        startX: event.clientX,
        startY: event.clientY,
        originX: element.x,
        originY: element.y,
        originW: element.w,
        originH: element.h,
        rect
      };
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", stopPointerInteraction);
    };

    return <div
      className="absolute rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-xl overflow-hidden"
      style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.w}%`, height: `${element.h}%`, zIndex: element.z }}
    >
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
        <button onMouseDown={(event) => beginPointerInteraction("drag", event)} className="cursor-move rounded-full bg-white/10 px-2 py-1 text-[10px] tracking-[0.2em] text-white/60 uppercase">
          {element.type === "text" ? "文字" : "媒体"}
        </button>
        <div className="flex items-center gap-1.5">
          {IS_EDITOR_MODE && <button onClick={() => moveFreeLayoutElementLayer(slideIndex, element.id, "backward")} className="rounded-full bg-black/60 p-1.5 text-white/75 hover:bg-black/90">
            <Icon name="ArrowDown" size={12} />
          </button>}
          {IS_EDITOR_MODE && <button onClick={() => moveFreeLayoutElementLayer(slideIndex, element.id, "forward")} className="rounded-full bg-black/60 p-1.5 text-white/75 hover:bg-black/90">
            <Icon name="ArrowUp" size={12} />
          </button>}
          {IS_EDITOR_MODE && element.type === "text" && <button onClick={() => setShowTextSettings((value) => !value)} className={`rounded-full p-1.5 text-white/75 transition-all ${showTextSettings ? "bg-cyan-500/90" : "bg-black/60 hover:bg-black/90"}`}>
            <Icon name="Sparkles" size={12} />
          </button>}
          <button onClick={() => removeFreeLayoutElement(slideIndex, element.id)} className="rounded-full bg-black/60 p-1.5 text-white/70 hover:bg-red-500/20 hover:text-red-200">
            <Icon name="Trash2" size={12} />
          </button>
        </div>
      </div>
      {IS_EDITOR_MODE && element.type === "text" && showTextSettings && <div className="absolute top-12 right-3 z-40 w-[220px] rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] text-cyan-300 uppercase">
          <Icon name="Sparkles" size={12} />
          文字动效
        </div>
        <label className="mb-3 flex flex-col gap-1 text-xs text-white/60">
          动画类型
          <select value={element.animation || "none"} onChange={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, animation: event.target.value }))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
            <option value="none">无</option>
            <option value="fade-up">淡入上浮</option>
            <option value="typewriter">逐字出现</option>
          </select>
        </label>
        <label className="mb-3 flex flex-col gap-1 text-xs text-white/60">
          动画时长
          <input type="number" min="0.2" max="8" step="0.1" value={element.animationDuration ?? 1.2} onChange={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, animationDuration: Number(event.target.value) || 1.2 }))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          延迟时间
          <input type="number" min="0" max="8" step="0.1" value={element.animationDelay ?? 0} onChange={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, animationDelay: Number(event.target.value) || 0 }))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
        </label>
      </div>}
      {element.type === "text" ? <div className="h-full w-full px-5 pt-12 pb-5">
        {IS_EDITOR_MODE ? <div
          contentEditable
          suppressContentEditableWarning
          onMouseDown={(event) => event.stopPropagation()}
          onBlur={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, text: event.currentTarget.innerText }))}
          className="h-full w-full overflow-auto outline-none text-white/90 text-lg leading-relaxed whitespace-pre-wrap"
        >
          {element.text}
        </div> : <FreeLayoutAnimatedText
          text={element.text}
          animation={element.animation}
          duration={element.animationDuration}
          delay={element.animationDelay}
        />}
      </div> : <FreeLayoutMediaBox slideIndex={slideIndex} element={element} />}
      {IS_EDITOR_MODE && <button onMouseDown={(event) => beginPointerInteraction("resize", event)} className="absolute bottom-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white/75 cursor-se-resize">
        <Icon name="Maximize2" size={12} />
      </button>}
    </div>;
  };

  const FreeLayoutAnimatedText = ({ text, animation = "none", duration = 1.2, delay = 0 }) => {
    const [visibleText, setVisibleText] = useState(animation === "typewriter" ? "" : text);

    useEffect(() => {
      if (animation !== "typewriter") {
        setVisibleText(text);
        return;
      }

      setVisibleText("");
      const fullText = String(text || "");
      const totalChars = Math.max(fullText.length, 1);
      const stepMs = Math.max((duration * 1000) / totalChars, 16);
      let index = 0;
      let intervalId = null;

      const startTimer = window.setTimeout(() => {
        intervalId = window.setInterval(() => {
          index += 1;
          setVisibleText(fullText.slice(0, index));
          if (index >= fullText.length) {
            window.clearInterval(intervalId);
          }
        }, stepMs);
      }, delay * 1000);

      return () => {
        window.clearTimeout(startTimer);
        if (intervalId) window.clearInterval(intervalId);
      };
    }, [text, animation, duration, delay]);

    const style = animation === "fade-up" ? {
      animation: `freeLayoutFadeUp ${duration}s ease ${delay}s both`
    } : undefined;

    return <>
      <style>{`
        @keyframes freeLayoutFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div style={style} className="h-full w-full overflow-auto text-white/90 text-lg leading-relaxed whitespace-pre-wrap">
        {animation === "typewriter" ? visibleText : text}
        {animation === "typewriter" && <span className="ml-0.5 inline-block h-[1em] w-[1px] animate-pulse bg-white/70 align-[-0.1em]" />}
      </div>
    </>;
  };

  const FreeLayoutMediaBox = ({ slideIndex, element }) => {
    const item = normalizeMediaItem(element.media);
    const bindingInfo = getMediaBindingInfo(item);
    const preferDraftPreview = IS_EDITOR_MODE && Boolean(item?.draftPreviewUrl);
    const hasUsableMedia = Boolean(item && (item.draftPreviewUrl || item.url || item.poster));
    const [isMuted, setIsMuted] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [isMediaLoading, setIsMediaLoading] = useState(Boolean(item));
    const [hasMediaError, setHasMediaError] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [mediaDuration, setMediaDuration] = useState("");
    const [currentTimeLabel, setCurrentTimeLabel] = useState("00:00");
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlaybackOverlay, setShowPlaybackOverlay] = useState(false);
    const [isDragTarget, setIsDragTarget] = useState(false);
    const videoRef = useRef(null);
    const overlayTimerRef = useRef(null);
    const hoverPlaybackPendingRef = useRef(false);
    const userPausedRef = useRef(false);
    const fileInputId = `free-upload-${slideIndex}-${element.id}`;
    const directVideo = item && item.kind === "video" && isDirectVideoSource(getPrimaryMediaUrl(item, { preferDraftPreview }));
    const embeddedVideo = item && (item.kind === "youtube" || (item.kind === "video" && !directVideo && Boolean(getVideoEmbedUrl(getPrimaryMediaUrl(item, { preferDraftPreview })))));
    const isInlinePlaybackActive = prefersHoverControls && isHovered && currentSlide === slideIndex;
    const mediaClassName = "relative z-10 h-full w-full object-cover object-center";

    const clearControlsTimer = () => {
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };

    const scheduleControlsHide = (delay = 2200) => {
      if (prefersHoverControls || showEditor) return;
      clearControlsTimer();
      overlayTimerRef.current = window.setTimeout(() => setShowPlaybackOverlay(false), delay);
    };

    const revealControls = (delay = 2200) => {
      if (showEditor) return;
      setShowPlaybackOverlay(true);
      if (!prefersHoverControls) scheduleControlsHide(delay);
    };

    const updatePlaybackState = (video) => {
      const safeCurrentTime = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
      const safeDuration = Number.isFinite(video?.duration) ? video.duration : 0;
      setCurrentTimeLabel(formatDuration(safeCurrentTime) || "00:00");
      setMediaDuration(formatDuration(safeDuration));
      setPlaybackProgress(safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0);
    };

    const toggleInlinePlayback = (event) => {
      if (event) event.stopPropagation();
      const video = videoRef.current;
      if (!video) return;
      revealControls();
      if (video.paused) {
        userPausedRef.current = false;
        attemptInlineVideoPlayback(video, isMuted);
      } else {
        userPausedRef.current = true;
        stopInlineVideoPlayback(video);
      }
    };

    const toggleInlineMuted = (event) => {
      if (event) event.stopPropagation();
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      if (videoRef.current) videoRef.current.muted = nextMuted;
      revealControls();
    };

    const openInlineFullscreen = async (event) => {
      if (event) event.stopPropagation();
      revealControls(3200);
      hoverPlaybackPendingRef.current = false;
      if (videoRef.current) stopInlineVideoPlayback(videoRef.current, { resetMuted: true });
      setLightboxData(item);
    };

    const handleMediaSurfaceClick = (event) => {
      event.stopPropagation();
      if (showEditor) return;
      if (directVideo) {
        revealControls(3200);
        return;
      }
      if (!IS_EDITOR_MODE) {
        setLightboxData(item);
      }
    };

    const updateElementMedia = (updater) => {
      updateFreeLayoutElement(slideIndex, element.id, (current) => ({
        ...current,
        media: normalizeMediaItem(updater(normalizeMediaItem(current.media) || { kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" }))
      }));
    };

    const applyLocalFile = (file) => {
      if (!file) return;
      const publishedPath = buildPublishedAssetPath(file);
      const nextKind = String(file.type || "").startsWith("video/") || publishedPath.startsWith("videos/") ? "video" : "image";
      updateElementMedia((current) => ({
        ...current,
        kind: nextKind,
        url: publishedPath || "",
        poster: "",
        draftPreviewUrl: URL.createObjectURL(file),
        label: file.name
      }));
      setIsDragTarget(false);
      setShowEditor(false);
      setStatusMessage(publishedPath ? `已将 ${file.name} 绑定为 ${publishedPath}，并生成本地预览。` : `已将 ${file.name} 添加到自由布局媒体框作为本地预览。`);
    };

    useEffect(() => {
      if (!item) {
        setIsMediaLoading(false);
        setHasMediaError(false);
        setIsVideoReady(false);
        setMediaDuration("");
        setCurrentTimeLabel("00:00");
        setPlaybackProgress(0);
        setIsPlaying(false);
        setShowPlaybackOverlay(false);
        setIsMuted(true);
        hoverPlaybackPendingRef.current = false;
        userPausedRef.current = false;
        return;
      }
      const src = getPrimaryMediaUrl(item, { preferDraftPreview }) || getDisplayUrl(item, { preferDraftPreview });
      const directVideoItem = item.kind === "video" && isDirectVideoSource(src);
      const embeddable = item.kind === "youtube" || (item.kind === "video" && !!getVideoEmbedUrl(src));
      const externalLinkOnly = item.kind === "video" && !directVideoItem && !embeddable;
      const hasDeferredPoster = item.kind === "video" && directVideoItem && Boolean(item.poster) && !preferDraftPreview;
      setIsMediaLoading(!externalLinkOnly && !!src && !hasDeferredPoster);
      setHasMediaError(false);
      setIsVideoReady(false);
      setMediaDuration("");
      setCurrentTimeLabel("00:00");
      setPlaybackProgress(0);
      setIsPlaying(false);
      setShowPlaybackOverlay(false);
      setIsMuted(true);
      hoverPlaybackPendingRef.current = false;
      userPausedRef.current = false;
      clearControlsTimer();
    }, [item, preferDraftPreview]);

    useEffect(() => {
      if (!item || item.kind !== "video") return;
      const src = getPrimaryMediaUrl(item, { preferDraftPreview });
      if (!isDirectVideoSource(src)) return;
      const video = videoRef.current;
      if (!video) return;
      if (showEditor || !isInlinePlaybackActive) {
        hoverPlaybackPendingRef.current = false;
        userPausedRef.current = false;
        clearControlsTimer();
        setShowPlaybackOverlay(false);
        stopInlineVideoPlayback(video, { resetMuted: true });
        setIsMuted(true);
        return;
      }
      hoverPlaybackPendingRef.current = true;
      setShowPlaybackOverlay(true);
      video.preload = "metadata";
      setIsMuted(true);
      if (!userPausedRef.current) attemptInlineVideoPlayback(video, true, setIsMuted);
    }, [item, isInlinePlaybackActive, preferDraftPreview, showEditor]);

    useEffect(() => () => {
      clearControlsTimer();
    }, []);

    const handleDragEnter = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragTarget(true);
    };

    const handleDragOver = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setIsDragTarget(true);
    };

    const handleDragLeave = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.currentTarget.contains(event.relatedTarget)) setIsDragTarget(false);
    };

    const handleDrop = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) applyLocalFile(file);
      else setIsDragTarget(false);
    };

    return <div
      className="relative h-full w-full overflow-hidden"
      onMouseEnter={() => { setIsHovered(true); if (prefersHoverControls) setShowPlaybackOverlay(true); }}
      onMouseMove={() => { if (prefersHoverControls) setShowPlaybackOverlay(true); }}
      onMouseLeave={() => { setIsHovered(false); if (prefersHoverControls) setShowPlaybackOverlay(false); }}
      onDoubleClick={(event) => { event.stopPropagation(); setShowEditor((value) => !value); }}
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {IS_EDITOR_MODE && isDragTarget && <div className="absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-cyan-300/70 bg-cyan-400/10 text-center text-xs tracking-[0.18em] text-cyan-100 backdrop-blur-sm pointer-events-none">拖到这里替换媒体</div>}
      {IS_EDITOR_MODE && bindingInfo && !showEditor && <div className={`absolute top-3 left-3 z-30 max-w-[70%] rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] backdrop-blur-md pointer-events-none ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/15 text-emerald-50" : "border-amber-300/20 bg-amber-500/15 text-amber-50"}`}>{bindingInfo.text}</div>}
      {IS_EDITOR_MODE && <div className="absolute top-12 right-3 z-30 flex flex-wrap justify-end gap-1.5">
        <button onClick={(event) => { event.stopPropagation(); setShowEditor((value) => !value); }} className={`p-1.5 rounded-full text-white/80 transition-all ${showEditor ? "bg-cyan-500" : "bg-black/60 hover:bg-black/90"}`}><Icon name="Settings2" size={12} /></button>
        {hasUsableMedia && <button onClick={(event) => { event.stopPropagation(); setLightboxData(item); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white/80"><Icon name="Maximize2" size={12} /></button>}
        <button onClick={(event) => { event.stopPropagation(); document.getElementById(fileInputId).click(); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-yellow-300"><Icon name="UploadCloud" size={12} /></button>
      </div>}
      {IS_EDITOR_MODE && showEditor && <div className="absolute inset-0 z-40 p-4 bg-black/80 backdrop-blur-md flex flex-col gap-3 cursor-auto" onClick={(event) => event.stopPropagation()}>
        <div className="text-xs text-cyan-300 font-mono uppercase tracking-widest flex items-center gap-2"><Icon name="Link2" size={14} /> 自由布局媒体设置</div>
        {bindingInfo && <div className={`rounded-xl border px-3 py-2 text-xs leading-6 ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-50/90" : "border-amber-300/20 bg-amber-500/10 text-amber-50/90"}`}>
          <div className="font-medium">{bindingInfo.text}</div>
          <div className="text-white/70">{bindingInfo.detail}</div>
        </div>}
        <label className="text-xs text-white/60 flex flex-col gap-1">类型
          <select value={item?.kind || "image"} onChange={(event) => updateElementMedia((current) => ({ ...current, kind: event.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="youtube">YouTube</option>
          </select>
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">本地文件
          <button type="button" onClick={() => document.getElementById(fileInputId).click()} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10 transition-colors">上传本地图片或视频，并尝试绑定到 images/ 或 videos/</button>
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">资源链接
          <input type="text" value={item?.url || ""} placeholder="例如 images/work-01.jpg、videos/demo.mp4、B站/抖音链接" onChange={(event) => updateElementMedia((current) => applyMediaFieldChange(current, "url", event.target.value))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">补充说明
          <textarea value={item?.meta || ""} onChange={(event) => updateElementMedia((current) => ({ ...current, meta: event.target.value }))} className="w-full flex-1 min-h-[100px] bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 font-mono outline-none resize-none" />
        </label>
      </div>}
      {hasUsableMedia ? <>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_52%),linear-gradient(140deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02)_45%,transparent_78%)] pointer-events-none" />
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <MediaView mediaItem={item} muted={isMuted} onMediaSurfaceClick={handleMediaSurfaceClick} videoRef={videoRef} mediaClassName={mediaClassName} onMediaLoad={() => {
            setIsMediaLoading(false);
            if (directVideo) {
              setIsVideoReady(true);
              updatePlaybackState(videoRef.current);
              if (hoverPlaybackPendingRef.current) attemptInlineVideoPlayback(videoRef.current, true, setIsMuted);
            }
          }} onMediaError={() => {
            setIsMediaLoading(false);
            setHasMediaError(true);
            setIsVideoReady(false);
          }} onVideoMetadata={() => updatePlaybackState(videoRef.current)} onMediaMeasure={() => {}} onVideoPlay={() => {
            setIsPlaying(true);
            revealControls();
          }} onVideoPause={() => {
            setIsPlaying(false);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} onVideoTimeUpdate={(event) => {
            updatePlaybackState(event.currentTarget);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} stopClick={(event) => event.stopPropagation()} preferDraftPreview={preferDraftPreview} shouldAutoPlay={directVideo && isInlinePlaybackActive} showPoster={!directVideo || !isInlinePlaybackActive || !isVideoReady || !prefersHoverControls} allowEmbeddedPlayback={embeddedVideo && isInlinePlaybackActive} />
        </div>
        {isMediaLoading && <div className="absolute inset-0 z-20 animate-pulse bg-gradient-to-br from-white/8 via-white/4 to-transparent pointer-events-none" />}
        {hasMediaError && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 text-xs tracking-[0.2em] text-rose-100/80 uppercase pointer-events-none">资源加载失败</div>}
        {directVideo && !showEditor && <InlineMediaControls visible={prefersHoverControls ? showPlaybackOverlay : true} onToggleFullscreen={openInlineFullscreen} />}
      </> : <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white/35 text-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5"><Icon name="UploadCloud" size={20} className="text-white/45" /></div>
        <div>拖入媒体，或点击右上角上传/填写链接</div>
        <div className="text-[11px] text-white/25">拖入本地文件后，会尝试绑定到 images/ 或 videos/ 同名路径</div>
      </div>}
      <input id={fileInputId} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => {
        const file = event.target.files && event.target.files[0];
        if (file) applyLocalFile(file);
        event.target.value = "";
      }} />
    </div>;
  };

  const FreeLayoutSlide = ({ slide, index }) => {
    const surfaceRef = useRef(null);
    const slideTheme = colorPalettes[index % colorPalettes.length] || colorPalettes[0];
    const elements = Array.isArray(slide.freeLayoutElements)
      ? slide.freeLayoutElements.map(normalizeFreeLayoutElement).sort((a, b) => a.z - b.z)
      : [];

    return <div className={`flex relative z-10 w-full max-w-[1920px] mx-auto flex-col ${isMobileFeedMode ? "gap-4 px-2 py-2" : "h-full p-10"}`}>
      <div className={`flex ${isMobileFeedMode ? "flex-col gap-2 px-2" : "justify-between items-end mb-4 px-4"}`}>
        <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl font-light tracking-wide text-white/90" />
        <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-sm tracking-widest uppercase font-mono ${slideTheme.text}`} />
      </div>
      <div ref={surfaceRef} className={`relative overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-2xl backdrop-blur-2xl ${isMobileFeedMode ? "min-h-[70svh]" : "flex-1"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
        {elements.length ? elements.map((element) => <FreeLayoutElement key={element.id} slideIndex={index} element={element} containerRef={surfaceRef} />) : <div className="absolute inset-0 flex items-center justify-center text-sm tracking-[0.22em] text-white/35">点击底部 + 添加文本框或媒体框</div>}
      </div>
    </div>;
  };

  const MediaSlot = ({ slideIndex, slotIndex, label }) => {
    const slide = slidesData[slideIndex];
    const item = normalizeMediaItem(slide.media && slide.media[slotIndex]);
    const bindingInfo = getMediaBindingInfo(item);
    const preferDraftPreview = IS_EDITOR_MODE && Boolean(item?.draftPreviewUrl);
    const [isMuted, setIsMuted] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragTarget, setIsDragTarget] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [isMediaLoading, setIsMediaLoading] = useState(Boolean(item));
    const [hasMediaError, setHasMediaError] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [mediaDuration, setMediaDuration] = useState("");
    const [currentTimeLabel, setCurrentTimeLabel] = useState("00:00");
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlaybackOverlay, setShowPlaybackOverlay] = useState(false);
    const videoRef = useRef(null);
    const overlayTimerRef = useRef(null);
    const hoverPlaybackPendingRef = useRef(false);
    const userPausedRef = useRef(false);
    const fileInputId = `upload-${slide.id}-${slotIndex}`;
    const directVideo = item && item.kind === "video" && isDirectVideoSource(getPrimaryMediaUrl(item, { preferDraftPreview }));
    const embeddedVideo = item && (item.kind === "youtube" || (item.kind === "video" && !directVideo && Boolean(getVideoEmbedUrl(getPrimaryMediaUrl(item, { preferDraftPreview })))));
    const isInlinePlaybackActive = prefersHoverControls && isHovered && currentSlide === slideIndex;
    const shouldContainMedia = slide?.id === 2 || slide?.title?.includes("个人简介");
    const mediaClassName = shouldContainMedia
      ? "relative z-10 max-h-full max-w-full h-auto w-auto object-contain object-center"
      : "relative z-10 h-full w-full object-cover object-center";

    const clearControlsTimer = () => {
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };

    const scheduleControlsHide = (delay = 2200) => {
      if (prefersHoverControls || showEditor) return;
      clearControlsTimer();
      overlayTimerRef.current = window.setTimeout(() => setShowPlaybackOverlay(false), delay);
    };

    const revealControls = (delay = 2200) => {
      if (showEditor) return;
      setShowPlaybackOverlay(true);
      if (!prefersHoverControls) scheduleControlsHide(delay);
    };

    const updatePlaybackState = (video) => {
      const safeCurrentTime = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
      const safeDuration = Number.isFinite(video?.duration) ? video.duration : 0;
      setCurrentTimeLabel(formatDuration(safeCurrentTime) || "00:00");
      setMediaDuration(formatDuration(safeDuration));
      setPlaybackProgress(safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0);
    };

    const toggleInlinePlayback = (event) => {
      if (event) event.stopPropagation();
      const video = videoRef.current;
      if (!video) return;
      revealControls();
      if (video.paused) {
        userPausedRef.current = false;
        attemptInlineVideoPlayback(video, isMuted);
      } else {
        userPausedRef.current = true;
        stopInlineVideoPlayback(video);
      }
    };

    const toggleInlineMuted = (event) => {
      if (event) event.stopPropagation();
      const nextMuted = !isMuted;
      setIsMuted(nextMuted);
      if (videoRef.current) videoRef.current.muted = nextMuted;
      revealControls();
    };

    const openInlineFullscreen = async (event) => {
      if (event) event.stopPropagation();
      revealControls(3200);
      hoverPlaybackPendingRef.current = false;
      if (videoRef.current) stopInlineVideoPlayback(videoRef.current, { resetMuted: true });
      setLightboxData(item);
    };

    const handleMediaSurfaceClick = (event) => {
      event.stopPropagation();
      if (showEditor) return;
      if (directVideo) {
        revealControls(3200);
        return;
      }
      if (!IS_EDITOR_MODE) {
        setLightboxData(item);
      }
    };

    const changeField = (field, value) => updateMediaItem(slideIndex, slotIndex, (current) => applyMediaFieldChange(current, field, value));
    const openEmptyEditor = () => {
      if (!item) updateMediaItem(slideIndex, slotIndex, () => ({ kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" }));
      setShowEditor(true);
    };

    const applyLocalFile = (file) => {
      if (!file) return;
      const publishedPath = buildPublishedAssetPath(file);
      const nextKind = String(file.type || "").startsWith("video/") || publishedPath.startsWith("videos/") ? "video" : "image";
      updateMediaItem(slideIndex, slotIndex, (current) => ({
        ...current,
        kind: nextKind,
        url: publishedPath || "",
        poster: "",
        draftPreviewUrl: URL.createObjectURL(file),
        label: file.name
      }));
      setIsDragTarget(false);
      setShowEditor(false);
      setStatusMessage(publishedPath ? `已将 ${file.name} 绑定为 ${publishedPath}，导出后可直接发布。` : `已将 ${file.name} 添加到当前媒体框作为本地预览。发布前请把正式文件放进 images/ 或 videos/，再导出并运行一键发布。`);
    };

    const handleUpload = (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      applyLocalFile(file);
      event.target.value = "";
    };

    useEffect(() => {
      if (!item) {
        setIsMediaLoading(false);
        setHasMediaError(false);
        setIsVideoReady(false);
        setMediaDuration("");
        setCurrentTimeLabel("00:00");
        setPlaybackProgress(0);
        setIsPlaying(false);
        setShowPlaybackOverlay(false);
        setIsMuted(true);
        hoverPlaybackPendingRef.current = false;
        userPausedRef.current = false;
        return;
      }
      const src = getPrimaryMediaUrl(item, { preferDraftPreview }) || getDisplayUrl(item, { preferDraftPreview });
      const directVideoItem = item.kind === "video" && isDirectVideoSource(src);
      const embeddable = item.kind === "youtube" || (item.kind === "video" && !!getVideoEmbedUrl(src));
      const externalLinkOnly = item.kind === "video" && !directVideoItem && !embeddable;
      const hasDeferredPoster = item.kind === "video" && directVideoItem && Boolean(item.poster) && !preferDraftPreview;
      setIsMediaLoading(!externalLinkOnly && !!src && !hasDeferredPoster);
      setHasMediaError(false);
      setIsVideoReady(false);
      setMediaDuration("");
      setCurrentTimeLabel("00:00");
      setPlaybackProgress(0);
      setIsPlaying(false);
      setShowPlaybackOverlay(false);
      setIsMuted(true);
      hoverPlaybackPendingRef.current = false;
      userPausedRef.current = false;
      clearControlsTimer();
    }, [item, preferDraftPreview]);

    useEffect(() => {
      if (!item || item.kind !== "video") return;
      const src = getPrimaryMediaUrl(item, { preferDraftPreview });
      if (!isDirectVideoSource(src)) return;
      const video = videoRef.current;
      if (!video) return;

      if (showEditor || !isInlinePlaybackActive) {
        hoverPlaybackPendingRef.current = false;
        userPausedRef.current = false;
        clearControlsTimer();
        setShowPlaybackOverlay(false);
        stopInlineVideoPlayback(video, { resetMuted: true });
        setIsMuted(true);
        return;
      }

      hoverPlaybackPendingRef.current = true;
      setShowPlaybackOverlay(true);
      video.preload = "metadata";
      setIsMuted(true);
      if (!userPausedRef.current) attemptInlineVideoPlayback(video, true, setIsMuted);
    }, [item, isInlinePlaybackActive, preferDraftPreview, showEditor]);

    useEffect(() => () => {
      clearControlsTimer();
    }, []);

    const handleDragEnter = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragTarget(true);
    };

    const handleDragOver = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setIsDragTarget(true);
    };

    const handleDragLeave = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.currentTarget.contains(event.relatedTarget)) setIsDragTarget(false);
    };

    const handleDrop = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) applyLocalFile(file);
      else setIsDragTarget(false);
    };

    return <div
      className={`relative w-full h-full rounded-2xl overflow-hidden group cursor-pointer bg-[#0a0a0c]/80 border border-white/[0.06] transition-all duration-500 ${isMobilePortraitMode ? "min-h-[260px]" : isMobileLandscapeMode ? "min-h-[240px]" : "min-h-[320px]"} shadow-xl`}
      onMouseEnter={() => { setIsHovered(true); if (prefersHoverControls) setShowPlaybackOverlay(true); }}
      onMouseMove={() => { if (prefersHoverControls) setShowPlaybackOverlay(true); }}
      onMouseLeave={() => { setIsHovered(false); if (prefersHoverControls) setShowPlaybackOverlay(false); }}
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDoubleClick={(event) => { if (!IS_EDITOR_MODE) return; event.stopPropagation(); openEmptyEditor(); }}
    >
      {IS_EDITOR_MODE && isDragTarget && <div className="absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-cyan-300/70 bg-cyan-400/10 text-center text-sm tracking-[0.18em] text-cyan-100 backdrop-blur-sm pointer-events-none">
        拖到这里即可替换当前媒体
      </div>}
      {IS_EDITOR_MODE && bindingInfo && !showEditor && <div className={`absolute top-2 left-2 z-50 max-w-[70%] rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] backdrop-blur-md pointer-events-none ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/15 text-emerald-50" : "border-amber-300/20 bg-amber-500/15 text-amber-50"}`}>{bindingInfo.text}</div>}
      {IS_EDITOR_MODE && item && <div className="absolute top-2 right-2 z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-wrap justify-end gap-1.5 w-3/4">
        {item.kind === "youtube" && item.url && <a href={`https://www.youtube.com/watch?v=${extractYouTubeId(item.url)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white/80"><Icon name="ExternalLink" size={12} /></a>}
        <button onClick={(event) => { event.stopPropagation(); setShowEditor(!showEditor); }} className={`p-1.5 rounded-full text-white/80 transition-all ${showEditor ? "bg-cyan-500" : "bg-black/60 hover:bg-black/90"}`}><Icon name="Settings2" size={12} /></button>
        <button onClick={(event) => { event.stopPropagation(); setLightboxData(item); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white/80"><Icon name="Maximize2" size={12} /></button>
        <button onClick={(event) => { event.stopPropagation(); document.getElementById(fileInputId).click(); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-yellow-300"><Icon name="UploadCloud" size={12} /></button>
      </div>}
      {IS_EDITOR_MODE && item && showEditor && <div className="absolute inset-0 z-40 p-4 bg-black/80 backdrop-blur-md flex flex-col gap-3 cursor-auto" onClick={(event) => event.stopPropagation()}>
        <div className="text-xs text-cyan-300 font-mono uppercase tracking-widest flex items-center gap-2"><Icon name="Link2" size={14} /> 资源链接设置</div>
        {bindingInfo && <div className={`rounded-xl border px-3 py-2 text-xs leading-6 ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-50/90" : "border-amber-300/20 bg-amber-500/10 text-amber-50/90"}`}>
          <div className="font-medium">{bindingInfo.text}</div>
          <div className="text-white/70">{bindingInfo.detail}</div>
        </div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-white/60 flex flex-col gap-1">类型
            <select value={item.kind} onChange={(event) => changeField("kind", event.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              <option value="image">图片 / 仓库图片</option>
              <option value="video">视频 / Cloudinary 或视频页链接</option>
              <option value="youtube">YouTube / 视频 ID 或链接</option>
            </select>
          </label>
          <label className="text-xs text-white/60 flex flex-col gap-1">本地文件
            <button type="button" onClick={() => document.getElementById(fileInputId).click()} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10 transition-colors">上传本地图片或视频，并尝试绑定到 images/ 或 videos/</button>
          </label>
        </div>
          <label className="text-xs text-white/60 flex flex-col gap-1">{item.kind === "youtube" ? "YouTube 视频 ID / 链接" : "稳定资源链接"}
          <input type="text" value={item.url} placeholder={item.kind === "youtube" ? "例如 dQw4w9WgXcQ 或 https://youtu.be/..." : "例如 images/work-01.jpg、videos/demo.mp4、B站链接、抖音 https://www.douyin.com/video/..."} onChange={(event) => changeField("url", event.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">封面链接（可选）
          <input type="text" value={item.poster || ""} placeholder="例如 images/video-cover.jpg" onChange={(event) => changeField("poster", event.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">Prompt / Metadata
          <textarea value={item.meta || ""} onChange={(event) => changeField("meta", event.target.value)} placeholder="记录提示词、工作流节点、镜头说明等" className="w-full flex-1 min-h-[100px] bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 font-mono outline-none resize-none" />
        </label>
      </div>}
      {item ? <>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.08),transparent_52%),linear-gradient(140deg,rgba(255,255,255,0.05),rgba(255,255,255,0.02)_45%,transparent_78%)] pointer-events-none" />
        <div className={`relative z-10 flex h-full w-full items-center justify-center ${shouldContainMedia ? "p-4" : ""}`}>
          <MediaView mediaItem={item} muted={isMuted} onMediaSurfaceClick={handleMediaSurfaceClick} videoRef={videoRef} mediaClassName={mediaClassName} onMediaLoad={() => {
            setIsMediaLoading(false);
            if (directVideo) {
              setIsVideoReady(true);
              updatePlaybackState(videoRef.current);
              if (hoverPlaybackPendingRef.current) attemptInlineVideoPlayback(videoRef.current, true, setIsMuted);
            }
          }} onMediaError={() => {
            setIsMediaLoading(false);
            setHasMediaError(true);
            setIsVideoReady(false);
          }} onVideoMetadata={() => updatePlaybackState(videoRef.current)} onMediaMeasure={() => {}} onVideoPlay={() => {
            setIsPlaying(true);
            revealControls();
          }} onVideoPause={() => {
            setIsPlaying(false);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} onVideoTimeUpdate={(event) => {
            updatePlaybackState(event.currentTarget);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} stopClick={(event) => event.stopPropagation()} preferDraftPreview={preferDraftPreview} shouldAutoPlay={directVideo && isInlinePlaybackActive} showPoster={!directVideo || !isInlinePlaybackActive || !isVideoReady || !prefersHoverControls} allowEmbeddedPlayback={embeddedVideo && isInlinePlaybackActive} />
        </div>
        {isMediaLoading && <div className="absolute inset-0 z-20 animate-pulse bg-gradient-to-br from-white/8 via-white/4 to-transparent pointer-events-none" />}
        {hasMediaError && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 text-xs tracking-[0.2em] text-rose-100/80 uppercase pointer-events-none">资源加载失败</div>}
        {directVideo && !showEditor && <InlineMediaControls visible={prefersHoverControls ? showPlaybackOverlay : true} onToggleFullscreen={openInlineFullscreen} />}
      </> : <div className="flex flex-col items-center justify-center p-2 text-center w-full h-full">
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 border border-white/5 group-hover:bg-white/10"><Icon name="UploadCloud" size={18} className="text-white/40" /></div>
        <span className="text-[10px] tracking-widest text-white/40 uppercase">{label || "Upload"}</span>
        <span className="mt-2 text-[11px] text-white/25">拖入本地文件后，会尝试绑定到 images/ 或 videos/ 同名路径</span>
        {IS_EDITOR_MODE && <div className="mt-3 flex gap-2">
          <button onClick={() => document.getElementById(fileInputId).click()} className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/70 hover:bg-white/15">上传并绑定</button>
          <button onClick={openEmptyEditor} className="px-3 py-1.5 rounded-full bg-cyan-500/15 text-xs text-cyan-100 hover:bg-cyan-500/25">填写链接</button>
        </div>}
      </div>}
      {IS_EDITOR_MODE && <input id={fileInputId} type="file" accept="image/*,video/*" className="hidden" onChange={handleUpload} />}
    </div>;
  };

  const renderSlide = (slide, index) => {
    if (!slide) return null;
    const slideTheme = colorPalettes[index % colorPalettes.length] || colorPalettes[0];
    const isFeedLayout = isMobileFeedMode;

    if (slide.type === "cover") {
      return <div className={`flex flex-col items-center justify-center text-center relative z-10 ${isFeedLayout ? "min-h-[58svh] gap-6 px-5 py-14" : "h-full space-y-8"}`}>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isFeedLayout ? "w-56 h-56" : "w-80 h-80"} ${slideTheme.a} blur-[120px] rounded-full`} />
        <EditableText text={slide.title} field="title" slideIndex={index} tagName="h1" className="text-5xl md:text-[8rem] font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 pb-4" />
        <EditableText text={slide.subtitle} field="subtitle" slideIndex={index} tagName="h2" className={`text-sm md:text-2xl font-light ${slideTheme.text} tracking-[0.28em] md:tracking-[0.4em] uppercase`} />
        <div className={`w-12 h-[2px] ${slideTheme.line} my-2 md:my-8`} />
        <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className="text-white/40 tracking-[0.2em] text-sm uppercase font-mono" />
      </div>;
    }

    if (slide.type === "toc") {
      return <div className={`flex flex-col max-w-6xl mx-auto relative z-10 w-full ${isFeedLayout ? "px-2 py-2 gap-4" : "justify-center h-full px-12"}`}>
        <div className={`flex items-center gap-4 ${isFeedLayout ? "mb-2" : "mb-16"}`}>
          <div className={`w-8 h-[1px] ${slideTheme.line}`} />
          <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className={`text-sm font-medium tracking-[0.3em] ${slideTheme.text} uppercase`} />
        </div>
        <div className={`grid grid-cols-1 ${isFeedLayout ? "gap-4" : "md:grid-cols-2 gap-x-16 gap-y-8"}`}>{slidesData.filter((item) => item.type === "chapter").map((item) => {
          const chapterIndex = slidesData.findIndex((candidate) => candidate.id === item.id);
          return <div key={item.id} onClick={() => { if (!IS_EDITOR_MODE) goToSlide(chapterIndex); }} className={`group flex items-start ${isFeedLayout ? "gap-4 p-4" : "gap-8 p-4"} rounded-2xl hover:bg-white/[0.04] transition-colors ${IS_EDITOR_MODE ? "" : "cursor-pointer"}`}>
            <EditableText text={item.chapter} field="chapter" slideIndex={chapterIndex} tagName="div" className="text-white/20 text-2xl md:text-3xl font-light font-mono" placeholder="章节编号" />
            <div>
              <EditableText text={item.title} field="title" slideIndex={chapterIndex} tagName="h3" className="text-xl font-light mb-2 text-white/90 group-hover:text-white" placeholder="章节标题" />
              <EditableText text={item.desc} field="desc" slideIndex={chapterIndex} tagName="p" className="text-white/40 text-sm" placeholder="章节说明" />
            </div>
            {IS_EDITOR_MODE && <button onClick={(event) => { event.stopPropagation(); goToSlide(chapterIndex); }} className="ml-auto rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-500/20">跳转</button>}
          </div>;
        })}</div>
      </div>;
    }

    if (slide.type === "chapter") {
      return <div className={`flex flex-col justify-center relative z-10 ${isFeedLayout ? "px-4 py-10 gap-3" : "h-full px-24"}`}>
        <div className={`absolute ${isFeedLayout ? "left-4 top-10 w-32 h-32" : "left-24 top-1/2 -translate-y-1/2 w-64 h-64"} ${slideTheme.a} blur-[120px] rounded-full pointer-events-none`} />
        <EditableText text={slide.chapter} field="chapter" slideIndex={index} tagName="span" className="text-6xl md:text-[12rem] font-bold text-white/5 tracking-tighter leading-none mb-2 md:mb-6 ml-[-4px] md:ml-[-10px] block w-max" />
        <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-5xl md:text-7xl font-semibold tracking-tight text-white/90 mb-6" />
        <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-base md:text-xl ${slideTheme.text} tracking-[0.2em] font-light uppercase`} />
      </div>;
    }

    if (slide.type === "free-layout") {
      return <FreeLayoutSlide slide={slide} index={index} />;
    }

    if (slide.type === "compare-slider") {
      return <div className={`flex flex-col relative z-10 w-full max-w-[1920px] mx-auto ${isFeedLayout ? "gap-4 px-1 py-2" : "h-full p-12"}`}>
        <div className={`flex ${isFeedLayout ? "flex-col gap-2 px-2" : "justify-between items-end mb-6 px-4"}`}>
          <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl font-light tracking-wide text-white/90" />
          <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-sm tracking-widest uppercase font-mono ${slideTheme.text}`} />
        </div>
        <div className={`w-full relative ${isFeedLayout ? "h-[52svh]" : "flex-1 h-full"}`}>
          <CompareSliderContainer slideIndex={index} />
        </div>
      </div>;
    }

    let colsClass = "grid-cols-2";
    if (isFeedLayout) {
      colsClass = slide.slots === 1 && slide.type !== "split" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
    } else {
      if (slide.slots === 1 && slide.type !== "split") colsClass = "grid-cols-1";
      if (slide.slots === 3) colsClass = "grid-cols-3";
      if (slide.slots === 4) colsClass = "grid-cols-2 lg:grid-cols-4";
      if (slide.slots === 6) colsClass = "grid-cols-3";
      if (slide.slots === 8) colsClass = "grid-cols-4";
      if (slide.slots === 9) colsClass = "grid-cols-3";
    }

    return <div className={`flex relative z-10 w-full max-w-[1920px] mx-auto flex-col ${isFeedLayout ? "gap-5 px-1 py-2" : "h-full p-10"}`}>
      {slide.type !== "split" && <div className={`flex ${isFeedLayout ? "flex-col gap-2 px-2" : "justify-between items-end mb-4 px-4"}`}><EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl font-light tracking-wide text-white/90" /><EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-sm tracking-widest uppercase font-mono ${slideTheme.text}`} /></div>}
      <div className={slide.type === "split" ? (isFeedLayout ? "flex flex-col gap-5" : "flex-1 flex items-center gap-16 p-4") : `grid ${colsClass} gap-4`}>
        {slide.type === "split" && <div className={`${isFeedLayout ? "w-full flex flex-col relative gap-3 px-2" : "w-1/3 flex flex-col relative gap-4"}`}><div className={`absolute ${isFeedLayout ? "-left-1 top-0 h-14" : "-left-10 top-0 h-20"} w-1 bg-gradient-to-b from-white/40 to-transparent opacity-60`} /><EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl md:text-4xl font-light mb-2 md:mb-4 leading-tight tracking-wide text-white/90" /><div className="flex flex-col gap-3">{(Array.isArray(slide.textBlocks) ? slide.textBlocks : [slide.text || ""]).map((block, blockIndex) => <EditableText key={`${slide.id}-text-${blockIndex}`} text={block} field="text" slideIndex={index} tagName="p" placeholder={`文本框 ${blockIndex + 1}`} className="text-base md:text-lg text-white/70 leading-relaxed font-light whitespace-pre-line" onBlurValue={(value) => updateTextBlock(index, blockIndex, value)} />)}</div></div>}
        <div className={slide.type === "split" ? (isFeedLayout ? "w-full grid grid-cols-1 gap-3" : "w-2/3 h-[80vh] flex gap-6") : "contents"}>{Array.from({ length: slide.slots || 1 }).map((_, slotIndex) => <div key={slotIndex} className={slide.type === "split" ? (isFeedLayout ? "min-h-[320px]" : "flex-1 h-full") : ""}><MediaSlot slideIndex={index} slotIndex={slotIndex} label={slide.customLabels ? slide.customLabels[slotIndex] : `素材 ${String(slotIndex + 1).padStart(2, "0")}`} /></div>)}</div>
      </div>
    </div>;
  };

  if (isLoading) {
    return <div className="w-full h-screen flex items-center justify-center bg-[#030305] text-white">
      <div className="text-center space-y-4">
        <div className="text-sm uppercase tracking-[0.4em] text-white/40">作品集加载中</div>
        <div className="text-xl text-white/80">{statusMessage}</div>
      </div>
    </div>;
  }

  const touchHandlers = isMobileFeedMode ? {} : {
    onTouchStart: (event) => {
      touchEndX.current = null;
      touchStartX.current = event.targetTouches[0].clientX;
    },
    onTouchMove: (event) => {
      touchEndX.current = event.targetTouches[0].clientX;
    },
    onTouchEnd: () => {
      if (!touchStartX.current || !touchEndX.current) return;
      const distance = touchStartX.current - touchEndX.current;
      if (distance > 50) changeSlide(Math.min(slidesData.length - 1, currentSlide + 1));
      if (distance < -50) changeSlide(Math.max(0, currentSlide - 1));
    }
  };

  const publishedSectionStyle = {
    contentVisibility: "auto",
    contain: "layout paint style",
    containIntrinsicSize: isMobileLandscapeMode ? "1280px 780px" : "1120px 860px",
    scrollMarginTop: `${sectionScrollOffset}px`
  };
  const portfolioSizeToneClass = portfolioSizeTone === "danger" ? "text-rose-200 bg-rose-500/15 border-rose-300/20" : portfolioSizeTone === "warning" ? "text-amber-100 bg-amber-500/12 border-amber-300/20" : "text-emerald-100 bg-emerald-500/12 border-emerald-300/20";

  return <div className="relative min-h-screen w-full font-sans select-none selection:bg-white/20" {...touchHandlers}>
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-[16%] -left-[8%] h-[44%] w-[44%] ${currentTheme.a} rounded-full blur-[120px] opacity-90 transition-colors duration-700`} style={{ animation: isMobilePreviewMode ? "none" : "pulse-slow 10s infinite" }} />
      <div className={`absolute top-[24%] -right-[8%] h-[38%] w-[38%] ${currentTheme.b} rounded-full blur-[130px] opacity-85 transition-colors duration-700`} style={{ animation: isMobilePreviewMode ? "none" : "pulse-slow 13s infinite 1.8s" }} />
      <div className={`absolute -bottom-[22%] left-[24%] h-[46%] w-[46%] ${currentTheme.c} rounded-full blur-[120px] opacity-80 transition-colors duration-700`} style={{ animation: isMobilePreviewMode ? "none" : "pulse-slow 11s infinite 3.4s" }} />
    </div>
    <div className="relative z-10">
      <div className="sticky top-3 z-40 px-3">
        <div className={`mx-auto flex w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-[#111214]/82 px-4 py-2 text-xs text-white/75 shadow-2xl backdrop-blur-xl ${isMobileLandscapeMode ? "max-w-[1400px]" : "max-w-6xl"}`}>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => goToSlide(0)} className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10">首页</button>
            <button onClick={() => goToSlide(tocSlideIndex)} className="rounded-full border border-white/10 px-3 py-1 hover:bg-white/10">目录</button>
          </div>
          <div className="hidden items-center gap-2 lg:flex">
            <span className="text-white/38">{siteMeta.siteTitle}</span>
            <span className="font-mono tracking-widest text-white/70">{String(currentSlide + 1).padStart(2, "0")}/{String(slidesData.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>
      {IS_EDITOR_MODE && showStructureEditor && <div className="fixed right-4 top-20 z-[70] w-[min(92vw,440px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#101114]/92 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/65">Portfolio Model</div>
            <div className="mt-1 text-sm text-white/78">编辑 `meta` / `cases`，slide 可视化编辑保持不变。</div>
          </div>
          <button onClick={() => setShowStructureEditor(false)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/10">收起</button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className={`rounded-2xl border px-4 py-3 text-sm ${portfolioSizeToneClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>运行时 JSON 估算体积：{formatBytes(portfolioByteSize)}</span>
              <span className="text-xs text-white/55">slides {slidesData.length} / cases {casesData.length}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-white/45">meta.json</div>
              <button onClick={applyMetaEditorValue} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">应用</button>
            </div>
            <textarea value={metaEditorValue} onChange={(event) => { setMetaEditorValue(event.target.value); setMetaEditorError(""); }} className="min-h-[150px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-mono leading-6 text-white/82 outline-none" spellCheck={false} />
            {metaEditorError && <div className="text-xs text-rose-300">{metaEditorError}</div>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-white/45">cases.json</div>
              <button onClick={applyCasesEditorValue} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">应用</button>
            </div>
            <textarea value={casesEditorValue} onChange={(event) => { setCasesEditorValue(event.target.value); setCasesEditorError(""); }} className="min-h-[240px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-mono leading-6 text-white/82 outline-none" spellCheck={false} />
            {casesEditorError && <div className="text-xs text-rose-300">{casesEditorError}</div>}
          </div>
        </div>
      </div>}
      <div className={`mx-auto flex w-full flex-col gap-4 px-3 pt-4 ${isMobileLandscapeMode ? "max-w-[1400px]" : "max-w-6xl"} ${IS_EDITOR_MODE ? "pb-28" : "pb-12"}`}>
        {slidesData.map((slide, index) => <section
          key={slide.id ?? index}
          ref={(node) => setSlideSectionRef(index, node)}
          data-slide-index={index}
          className="relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20 shadow-2xl backdrop-blur-md"
          style={publishedSectionStyle}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_18%,transparent_82%,rgba(255,255,255,0.025))] pointer-events-none" />
          {renderSlide(slide, index)}
        </section>)}
      </div>
    </div>
    {lightboxData && <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={() => setLightboxData(null)}>
      <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10" onClick={() => setLightboxData(null)}>✕ 关闭</button>
      {lightboxData.meta && <div className="absolute bottom-6 left-1/2 -translate-x-1/2 max-w-3xl w-[90%] p-4 bg-black/60 border border-white/10 rounded-xl backdrop-blur text-sm text-cyan-200/80 font-mono" onClick={(event) => event.stopPropagation()}><span className="text-white/40 block mb-1 uppercase tracking-widest text-xs">Prompt / Metadata</span>{lightboxData.meta}</div>}
      {lightboxData.kind === "youtube" ? <iframe src={getYouTubeEmbedUrl(lightboxData.url)} title="YouTube player" className="w-full max-w-5xl aspect-video rounded-lg shadow-2xl border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onClick={(event) => event.stopPropagation()} /> : lightboxData.kind === "video" ? (() => {
        const videoSrc = getPrimaryMediaUrl(lightboxData, { preferDraftPreview: IS_EDITOR_MODE && Boolean(lightboxData.draftPreviewUrl) });
        const embedUrl = getVideoEmbedUrl(videoSrc);
        if (embedUrl && !isDirectVideoSource(videoSrc)) return <iframe src={embedUrl} title="视频播放器" className="w-full max-w-5xl aspect-video rounded-lg shadow-2xl border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onClick={(event) => event.stopPropagation()} />;
        if (!isDirectVideoSource(videoSrc)) return <a href={videoSrc} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-100 hover:bg-cyan-500/20" onClick={(event) => event.stopPropagation()}><Icon name="ExternalLink" size={16} /> 打开视频链接</a>;
        return <video src={videoSrc} poster={lightboxData.poster || undefined} controls autoPlay preload="metadata" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(event) => event.stopPropagation()} />;
      })() : <img src={getDisplayUrl(lightboxData, { preferDraftPreview: IS_EDITOR_MODE && Boolean(lightboxData.draftPreviewUrl) })} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(event) => event.stopPropagation()} />}
    </div>}
    {IS_EDITOR_MODE && <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1A]/84 px-4 py-3 shadow-2xl backdrop-blur-3xl">
      <button onClick={() => goToSlide(tocSlideIndex)} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"><Icon name="Home" size={18} /></button>
      <div className="w-[1px] h-4 bg-white/10 mx-1" />
      <button onClick={() => goToSlide(Math.max(0, currentSlide - 1))} className={`p-2 rounded-full transition-all ${currentSlide === 0 ? "text-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}><Icon name="ChevronLeft" size={20} /></button>
      {isPageJumpEditing ? <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
        <input
          ref={pageJumpInputRef}
          type="text"
          inputMode="numeric"
          value={pageJumpValue}
          onChange={(event) => setPageJumpValue(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          onBlur={submitPageJump}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitPageJump();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setIsPageJumpEditing(false);
              setPageJumpValue(String(currentSlide + 1));
            }
          }}
          className="w-9 bg-transparent text-center text-xs font-mono font-bold tracking-widest text-white outline-none"
        />
        <span className="text-[11px] font-mono tracking-widest text-white/35">/ {String(slidesData.length).padStart(2, "0")}</span>
      </div> : <button onClick={() => setIsPageJumpEditing(true)} className="rounded-full px-2 py-1 text-xs font-mono tracking-widest text-white/80 font-bold hover:bg-white/10" title="点击输入页码跳转">
        {String(currentSlide + 1).padStart(2, "0")}<span className="text-white/20 mx-1">/</span>{String(slidesData.length).padStart(2, "0")}
      </button>}
      <button onClick={() => goToSlide(Math.min(slidesData.length - 1, currentSlide + 1))} className={`p-2 rounded-full transition-all ${currentSlide === slidesData.length - 1 ? "text-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}><Icon name="ChevronRight" size={20} /></button>
      <div className="w-[1px] h-4 bg-white/10 mx-1" />
      <button onClick={() => setShowStructureEditor((value) => !value)} className={`rounded-full p-2 transition ${showStructureEditor ? "bg-cyan-500 text-black" : "text-white/65 hover:bg-white/10 hover:text-white"}`} title="编辑 meta / cases"><Icon name="FileJson" size={16} /></button>
      <button onClick={deleteCurrentSlide} className={`p-2 rounded-full ${slidesData.length <= 1 ? "text-red-400/20" : "text-red-400/40 hover:text-red-400 hover:bg-red-400/10"}`}><Icon name="Trash2" size={16} /></button>
      <div className="relative">
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`p-2 rounded-full ${showAddMenu ? "bg-white text-black" : "text-white/60 hover:text-white hover:bg-white/20"}`}><Icon name="Plus" size={18} /></button>
        {showAddMenu && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-52 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col p-1.5 z-50 h-[24rem] overflow-y-auto">
          <span className="text-[10px] text-white/30 px-3 py-1 uppercase tracking-widest text-center">当前页面</span>
          <button onClick={() => moveCurrentSlide(-1)} disabled={currentSlide <= 0} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${currentSlide <= 0 ? "text-white/20 cursor-not-allowed" : "text-white/70 hover:bg-white/10"}`}><Icon name="ArrowUp" size={14} /> 上移当前页</button>
          <button onClick={() => moveCurrentSlide(1)} disabled={currentSlide >= slidesData.length - 1} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${currentSlide >= slidesData.length - 1 ? "text-white/20 cursor-not-allowed" : "text-white/70 hover:bg-white/10"}`}><Icon name="ArrowDown" size={14} /> 下移当前页</button>
          {slidesData[currentSlide]?.type !== "free-layout" && <button onClick={() => adjustCurrentSlideSlots(1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Plus" size={14} /> 增加媒体框</button>}
          {slidesData[currentSlide]?.type !== "free-layout" && <button onClick={() => adjustCurrentSlideSlots(-1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Trash2" size={14} /> 减少媒体框</button>}
          {slidesData[currentSlide]?.type === "split" && <button onClick={() => adjustCurrentTextBlocks(1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Plus" size={14} /> 增加文本框</button>}
          {slidesData[currentSlide]?.type === "split" && <button onClick={() => adjustCurrentTextBlocks(-1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Trash2" size={14} /> 减少文本框</button>}
          {slidesData[currentSlide]?.type === "free-layout" && <button onClick={() => addFreeLayoutElement("text")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Plus" size={14} /> 添加文本框</button>}
          {slidesData[currentSlide]?.type === "free-layout" && <button onClick={() => addFreeLayoutElement("media")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="UploadCloud" size={14} /> 添加媒体框</button>}
          <div className="w-full h-[1px] bg-white/10 my-1" />
          <span className="text-[10px] text-white/30 px-3 py-1 uppercase tracking-widest text-center">选择模板</span>
          <button onClick={() => addSlide("split")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="LayoutTemplate" size={14} /> 左文右图</button>
          <button onClick={() => addSlide("free-layout")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Maximize2" size={14} /> 自由布局</button>
          <button onClick={() => addSlide("full-media")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Maximize" size={14} /> 全屏巨幕</button>
          <button onClick={() => addSlide("compare-slider")} className="flex items-center gap-3 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/20 rounded-lg font-bold"><Icon name="Sliders" size={14} /> 双栏对比</button>
          <div className="w-full h-[1px] bg-white/10 my-1" />
          {[
            ["gallery-2", "双图展示"],
            ["gallery-3", "三图展示"],
            ["gallery-4", "四图展示"],
            ["gallery-6", "六图展示"],
            ["gallery-8", "八图展示"],
            ["gallery-9", "九宫格展示"]
          ].map(([layout, label]) => <button key={layout} onClick={() => addSlide(layout)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Grid" size={14} /> {label}</button>)}
        </div>}
      </div>
      <button onClick={() => importInputRef.current && importInputRef.current.click()} className="p-2 text-white/65 hover:text-white hover:bg-white/10 rounded-full" title="导入 JSON"><Icon name="UploadCloud" size={16} /></button>
      <button onClick={resetDraft} className="p-2 text-white/65 hover:text-white hover:bg-white/10 rounded-full" title="重置草稿"><Icon name="RotateCcw" size={16} /></button>
      <button onClick={exportDraft} className="p-2 text-cyan-300/80 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full" title="导出 JSON"><Icon name="Download" size={16} /></button>
      <div className={`h-2.5 w-2.5 rounded-full ${loadSource.includes("draft") ? "bg-emerald-400" : "bg-cyan-400"}`} title={statusMessage} />
    </div>}
    {IS_EDITOR_MODE && <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importDraft} />}
    <div className="fixed top-0 left-0 w-full h-[2px] bg-white/[0.02] z-50"><div className={`h-full ${currentTheme.line} transition-all duration-500 ease-out`} style={{ width: `${((currentSlide + 1) / slidesData.length) * 100}%` }} /></div>
  </div>;
}

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
