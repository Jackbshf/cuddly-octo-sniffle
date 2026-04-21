import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";

export const STREAM_MANIFEST_RELATIVE_PATH = "data/cloudflare-stream-manifest.json";
export const STREAM_MANIFEST_VERSION = 1;

export const toPosixPath = (value = "") => String(value || "").replace(/\\/g, "/");

export const isRemoteUrl = (value = "") => /^https?:\/\//i.test(String(value || "").trim());
export const isBlobUrl = (value = "") => String(value || "").trim().toLowerCase().startsWith("blob:");

const inferMediaKind = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "image";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "youtube";
  if (normalized.includes("bilibili.com/video/") || normalized.includes("b23.tv/")) return "video";
  if (normalized.includes("douyin.com") || normalized.includes("iesdouyin.com") || normalized.includes("v.douyin.com")) return "video";
  if (normalized.includes("tiktok.com")) return "video";
  if (/\.(mp4|webm|mov|m4v|ogg|m3u8)(\?|#|$)/.test(normalized)) return "video";
  if (normalized.includes("/video/upload/") || normalized.includes("/video/authenticated/")) return "video";
  return "image";
};

const normalizeMediaItem = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { kind: inferMediaKind(item), url: item, poster: "" };
  const rawUrl = typeof item.url === "string" ? item.url.trim() : "";
  return {
    kind: typeof item.kind === "string" && item.kind ? item.kind : inferMediaKind(rawUrl),
    url: rawUrl,
    poster: typeof item.poster === "string" ? item.poster.trim() : ""
  };
};

export const normalizeRepoVideoPath = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw || isRemoteUrl(raw) || isBlobUrl(raw) || raw.startsWith("data:")) return "";
  const normalized = toPosixPath(raw.split(/[?#]/)[0].trim()).replace(/^[./]+/, "");
  if (!normalized.toLowerCase().startsWith("videos/")) return "";
  return normalized;
};

export const collectLocalVideoSourcePaths = (portfolioModel) => {
  const paths = new Set();
  const addMediaItem = (item) => {
    const normalized = normalizeMediaItem(item);
    if (!normalized || normalized.kind !== "video") return;
    const sourcePath = normalizeRepoVideoPath(normalized.url);
    if (sourcePath) paths.add(sourcePath);
  };

  for (const slide of Array.isArray(portfolioModel?.slides) ? portfolioModel.slides : []) {
    for (const item of Array.isArray(slide?.media) ? slide.media : []) addMediaItem(item);
    for (const element of Array.isArray(slide?.freeLayoutElements) ? slide.freeLayoutElements : []) {
      if (element?.type === "media") addMediaItem(element.media);
    }
  }

  return Array.from(paths).sort((left, right) => left.localeCompare(right, "zh-CN"));
};

export const readJsonIfExists = async (filePath, fallback = null) => {
  if (!existsSync(filePath)) return fallback;
  return JSON.parse(await readFile(filePath, "utf8"));
};

export const writeJsonFile = async (filePath, value) => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`, "utf8");
};

export const createEmptyStreamManifest = (customerCode = "") => ({
  version: STREAM_MANIFEST_VERSION,
  customerCode: String(customerCode || "").trim(),
  updatedAt: "",
  videos: {},
  stale: []
});

export const normalizeManifestEntry = (sourcePath, value = {}) => ({
  sourcePath,
  sha256: typeof value.sha256 === "string" ? value.sha256 : "",
  uid: typeof value.uid === "string" ? value.uid : "",
  status: typeof value.status === "string" && value.status ? value.status : "missing",
  readyToStream: Boolean(value.readyToStream),
  durationSeconds: Number.isFinite(Number(value.durationSeconds)) ? Number(value.durationSeconds) : null,
  iframeUrl: typeof value.iframeUrl === "string" ? value.iframeUrl : "",
  hlsUrl: typeof value.hlsUrl === "string" ? value.hlsUrl : "",
  thumbnailUrl: typeof value.thumbnailUrl === "string" ? value.thumbnailUrl : "",
  uploadedAt: typeof value.uploadedAt === "string" ? value.uploadedAt : "",
  updatedAt: typeof value.updatedAt === "string" ? value.updatedAt : ""
});

export const normalizeStreamManifest = (value) => {
  const source = value && typeof value === "object" ? value : {};
  const rawVideos = source.videos && typeof source.videos === "object" ? source.videos : {};
  const normalizedVideos = {};

  for (const sourcePath of Object.keys(rawVideos).sort((left, right) => left.localeCompare(right, "zh-CN"))) {
    normalizedVideos[sourcePath] = normalizeManifestEntry(sourcePath, rawVideos[sourcePath]);
  }

  const rawStale = Array.isArray(source.stale) ? source.stale : [];
  return {
    version: STREAM_MANIFEST_VERSION,
    customerCode: typeof source.customerCode === "string" ? source.customerCode.trim() : "",
    updatedAt: typeof source.updatedAt === "string" ? source.updatedAt : "",
    videos: normalizedVideos,
    stale: rawStale
      .map((entry) => normalizeManifestEntry(typeof entry?.sourcePath === "string" ? entry.sourcePath : "", entry))
      .filter((entry) => entry.sourcePath)
      .sort((left, right) => left.sourcePath.localeCompare(right.sourcePath, "zh-CN"))
  };
};

export const getStreamManifestPath = (repoRoot) => path.join(repoRoot, STREAM_MANIFEST_RELATIVE_PATH);

export const readStreamManifest = async (repoRoot) => {
  const manifestPath = getStreamManifestPath(repoRoot);
  const manifest = await readJsonIfExists(manifestPath, createEmptyStreamManifest());
  return normalizeStreamManifest(manifest);
};

export const writeStreamManifest = async (repoRoot, manifest) => {
  const manifestPath = getStreamManifestPath(repoRoot);
  await writeJsonFile(manifestPath, normalizeStreamManifest(manifest));
  return manifestPath;
};

export const isReadyStreamManifestEntry = (entry) => Boolean(
  entry
  && entry.readyToStream
  && entry.uid
  && entry.hlsUrl
  && entry.iframeUrl
);

export const getStreamDeliveryUrls = (uid, customerCode) => {
  const normalizedUid = String(uid || "").trim();
  const normalizedCustomerCode = String(customerCode || "").trim();
  if (!normalizedUid || !normalizedCustomerCode) {
    return {
      iframeUrl: "",
      hlsUrl: "",
      thumbnailUrl: ""
    };
  }

  const base = `https://customer-${normalizedCustomerCode}.cloudflarestream.com/${normalizedUid}`;
  return {
    iframeUrl: `${base}/iframe`,
    hlsUrl: `${base}/manifest/video.m3u8`,
    thumbnailUrl: `${base}/thumbnails/thumbnail.jpg`
  };
};

export const inferCustomerCodeFromUrl = (value = "") => {
  const candidate = String(value || "").trim();
  if (!candidate) return "";
  const match = candidate.match(/^https?:\/\/customer-([a-z0-9]+)\.cloudflarestream\.com\//i);
  return match?.[1] ? match[1].toLowerCase() : "";
};

export const getStreamDeliveryUrlsFromResult = (streamResult, customerCode = "") => {
  const playback = streamResult?.playback && typeof streamResult.playback === "object" ? streamResult.playback : {};
  const previewUrl = typeof streamResult?.preview === "string" ? streamResult.preview.trim() : "";
  const thumbnailUrl = typeof streamResult?.thumbnail === "string" ? streamResult.thumbnail.trim() : "";
  const hlsUrl = typeof playback?.hls === "string" ? playback.hls.trim() : "";
  const inferredCustomerCode = inferCustomerCodeFromUrl(hlsUrl)
    || inferCustomerCodeFromUrl(previewUrl)
    || inferCustomerCodeFromUrl(thumbnailUrl)
    || String(customerCode || "").trim();
  const fallbackUrls = getStreamDeliveryUrls(typeof streamResult?.uid === "string" ? streamResult.uid : "", inferredCustomerCode);
  return {
    customerCode: inferredCustomerCode,
    iframeUrl: previewUrl
      ? previewUrl.replace(/\/watch(?:[?#].*)?$/i, "/iframe")
      : fallbackUrls.iframeUrl,
    hlsUrl: hlsUrl || fallbackUrls.hlsUrl,
    thumbnailUrl: thumbnailUrl || fallbackUrls.thumbnailUrl
  };
};

export const computeFileSha256 = async (filePath) => {
  const buffer = await readFile(filePath);
  return createHash("sha256").update(buffer).digest("hex");
};

const runCommand = (command, args, cwd) => new Promise((resolve, reject) => {
  const child = spawn(command, args, {
    cwd,
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
    if (code === 0) {
      resolve(stdout.trim());
      return;
    }
    reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
  });
});

export const probeVideoDurationSeconds = async (filePath, cwd = process.cwd()) => {
  try {
    const output = await runCommand("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath
    ], cwd);
    const duration = Number.parseFloat(output);
    return Number.isFinite(duration) ? Number(duration.toFixed(3)) : null;
  } catch (error) {
    return null;
  }
};

export const loadRepoPortfolioModel = async (repoRoot) => {
  const portfolioPath = path.join(repoRoot, "data", "portfolio.json");
  return (await readJsonIfExists(portfolioPath, { meta: {}, cases: [], slides: [] })) || { meta: {}, cases: [], slides: [] };
};

export const getCanonicalSiteUrl = (portfolioModel) => {
  const candidate = typeof portfolioModel?.meta?.canonicalUrl === "string" ? portfolioModel.meta.canonicalUrl.trim() : "";
  return candidate || "https://www.zhangweivisual.cn/";
};

export const resolveStreamEnv = (manifest, options = {}) => {
  const requireAuth = Boolean(options.requireAuth);
  const apiToken = String(process.env.CLOUDFLARE_STREAM_API_TOKEN || process.env.CLOUDFLARE_API_TOKEN || "").trim();
  const accountId = String(process.env.CLOUDFLARE_STREAM_ACCOUNT_ID || process.env.CLOUDFLARE_ACCOUNT_ID || "").trim();
  const customerCode = String(process.env.CLOUDFLARE_STREAM_CUSTOMER_CODE || manifest?.customerCode || "").trim();
  const missing = [];

  if (requireAuth) {
    if (!apiToken) missing.push("CLOUDFLARE_STREAM_API_TOKEN or CLOUDFLARE_API_TOKEN");
    if (!accountId) missing.push("CLOUDFLARE_STREAM_ACCOUNT_ID or CLOUDFLARE_ACCOUNT_ID");
  }

  return {
    apiToken,
    accountId,
    customerCode,
    missing
  };
};

export const resolveRepoAssetPath = (repoRoot, relativePath) => {
  const resolvedPath = path.resolve(repoRoot, relativePath);
  const relativeToRoot = path.relative(repoRoot, resolvedPath);
  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    throw new Error(`Asset path escapes repo root: ${relativePath}`);
  }
  return resolvedPath;
};

export const getFileSizeBytes = async (filePath) => {
  const fileStat = await stat(filePath);
  return fileStat.size;
};
