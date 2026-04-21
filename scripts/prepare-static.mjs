import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";
import { buildAppAssets } from "./build-app.mjs";
import { syncPortfolioArtifacts } from "./sync-portfolio-json.mjs";
import {
  isReadyStreamManifestEntry,
  normalizeRepoVideoPath,
  readStreamManifest
} from "./media/lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, "..");
const distDir = path.join(root, "dist");
const sourceJsonPath = path.join(root, "data", "portfolio.json");
const distJsonPath = path.join(distDir, "data", "portfolio.json");
const optimizedImagesDir = path.join(distDir, "images", "_optimized");
const generatedPostersDir = path.join(distDir, "images", "_posters");
const LARGE_IMAGE_BYTES = 500 * 1024;
const MAX_IMAGE_WIDTH = 1600;
const IMAGE_QUALITY = 82;
const VIDEO_POSTER_WIDTH = 1280;
const VIDEO_POSTER_QUALITY = 80;
const VIDEO_POSTER_SECOND = 1;

const copyTargets = [
  "index.html",
  "assets",
  "embedded-data.js",
  "admin",
  "data",
  "images",
];

const isRemoteUrl = (value = "") => /^https?:\/\//i.test(String(value || "").trim());
const isBlobUrl = (value = "") => String(value || "").trim().toLowerCase().startsWith("blob:");
const isPreoptimizedImageUrl = (value = "") => toPosixPath(String(value || "").trim()).startsWith("images/_optimized/");
const isGeneratedPosterUrl = (value = "") => toPosixPath(String(value || "").trim()).startsWith("images/_posters/");
const isLocalAssetUrl = (value = "") => {
  const normalized = String(value || "").trim();
  return Boolean(normalized) && !isRemoteUrl(normalized) && !isBlobUrl(normalized) && !normalized.startsWith("data:");
};
const toPosixPath = (value = "") => String(value || "").replace(/\\/g, "/");
const getContentHash = (value) => createHash("sha256").update(value).digest("hex").slice(0, 10);

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

const normalizeMediaRecord = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { original: item, kind: inferMediaKind(item), url: item, poster: "" };

  const url = typeof item.url === "string" ? item.url.trim() : "";
  const kind = typeof item.kind === "string" && item.kind ? item.kind : inferMediaKind(url);
  return {
    original: item,
    kind,
    url,
    poster: typeof item.poster === "string" ? item.poster.trim() : ""
  };
};

const getAssetOutputUrl = (inputUrl, targetDirName) => {
  const normalizedInput = toPosixPath(String(inputUrl || "").trim()).replace(/^[./]+/, "");
  const ext = path.posix.extname(normalizedInput);
  const withoutExt = ext ? normalizedInput.slice(0, -ext.length) : normalizedInput;
  const relativeInsideImages = withoutExt.replace(/^(images|videos)\//, "");
  return `images/${targetDirName}/${relativeInsideImages}.webp`;
};

const ensureInsideRepo = (assetUrl) => {
  const resolved = path.resolve(root, assetUrl);
  const relative = path.relative(root, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Asset path escapes repo root: ${assetUrl}`);
  }
  return resolved;
};

const ensureDirectory = async (filePath) => {
  await mkdir(path.dirname(filePath), { recursive: true });
};

const fingerprintDistFile = async (absoluteFilePath) => {
  const fileBuffer = await readFile(absoluteFilePath);
  const parsed = path.parse(absoluteFilePath);
  const hash = getContentHash(fileBuffer);
  const hashedAbsolutePath = path.join(parsed.dir, `${parsed.name}.${hash}${parsed.ext}`);
  await writeFile(hashedAbsolutePath, fileBuffer);
  await rm(absoluteFilePath, { force: true });
  return {
    hash,
    relativePath: toPosixPath(path.relative(distDir, hashedAbsolutePath))
  };
};

const getReadyStreamEntry = (manifest, assetUrl) => {
  const sourcePath = normalizeRepoVideoPath(assetUrl);
  if (!sourcePath) return null;
  const entry = manifest?.videos?.[sourcePath];
  return isReadyStreamManifestEntry(entry) ? entry : null;
};

const rewriteDistIndexHtml = async (versionedAssets) => {
  const distIndexPath = path.join(distDir, "index.html");
  let html = await readFile(distIndexPath, "utf8");

  html = html.replace(/href="assets\/app\.css"/, `href="${versionedAssets.css.relativePath}"`);
  html = html.replace(
    /<script src="embedded-data\.js"><\/script>/,
    `<script>window.__APP_BUNDLE_VERSION__ = ${JSON.stringify(versionedAssets.version)};</script>\n  <script src="${versionedAssets.embedded.relativePath}"></script>`
  );
  html = html.replace(/src="assets\/app\.js"/, `src="${versionedAssets.js.relativePath}"`);

  await writeFile(distIndexPath, html, "utf8");
};

const writeDistHeaders = async () => {
  const headersPath = path.join(distDir, "_headers");
  const headersContent = [
    "/",
    "  Cache-Control: no-store",
    "  CDN-Cache-Control: no-store",
    "/index.html",
    "  Cache-Control: no-store",
    "  CDN-Cache-Control: no-store",
    "/data/*",
    "  Cache-Control: no-store",
    "  CDN-Cache-Control: no-store",
    "/assets/*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "  CDN-Cache-Control: public, max-age=31536000, immutable",
    "/embedded-data*",
    "  Cache-Control: public, max-age=31536000, immutable",
    "  CDN-Cache-Control: public, max-age=31536000, immutable",
    ""
  ].join("\n");

  await writeFile(headersPath, headersContent, "utf8");
};

const runCommand = (command, args) => new Promise((resolve, reject) => {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"] });
  let stderr = "";

  child.stderr.on("data", (chunk) => {
    stderr += String(chunk || "");
  });

  child.on("error", reject);
  child.on("close", (code) => {
    if (code === 0) {
      resolve();
      return;
    }
    reject(new Error(stderr.trim() || `${command} exited with code ${code}`));
  });
});

const optimizeImageAsset = async (assetUrl, cache) => {
  if (cache.has(assetUrl)) return cache.get(assetUrl);

  const sourcePath = ensureInsideRepo(assetUrl);
  const outputUrl = getAssetOutputUrl(assetUrl, "_optimized");
  const outputPath = path.join(distDir, outputUrl);
  const metadata = await sharp(sourcePath, { animated: true }).metadata();
  const sourceStats = await stat(sourcePath);
  const shouldResize = sourceStats.size > LARGE_IMAGE_BYTES || Number(metadata.width || 0) > MAX_IMAGE_WIDTH;

  await ensureDirectory(outputPath);

  let pipeline = sharp(sourcePath, { animated: true, sequentialRead: true });
  if (shouldResize && Number(metadata.width || 0) > MAX_IMAGE_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_IMAGE_WIDTH, withoutEnlargement: true });
  }
  await pipeline.webp({ quality: IMAGE_QUALITY }).toFile(outputPath);

  const result = { sourceUrl: assetUrl, outputUrl };
  cache.set(assetUrl, result);
  return result;
};

const createVideoPosterAsset = async (assetUrl, cache) => {
  if (cache.has(assetUrl)) return cache.get(assetUrl);

  const sourcePath = ensureInsideRepo(assetUrl);
  const outputUrl = getAssetOutputUrl(assetUrl, "_posters");
  const outputPath = path.join(distDir, outputUrl);
  await ensureDirectory(outputPath);

  const scaleFilter = `scale='min(${VIDEO_POSTER_WIDTH},iw)':-2`;
  await runCommand("ffmpeg", [
    "-hide_banner",
    "-loglevel", "error",
    "-y",
    "-ss", String(VIDEO_POSTER_SECOND),
    "-i", sourcePath,
    "-frames:v", "1",
    "-vf", scaleFilter,
    "-c:v", "libwebp",
    "-quality", String(VIDEO_POSTER_QUALITY),
    outputPath
  ]);

  const result = { sourceUrl: assetUrl, outputUrl };
  cache.set(assetUrl, result);
  return result;
};

const transformMediaItem = async (item, caches, streamManifest) => {
  const normalized = normalizeMediaRecord(item);
  if (!normalized) return item;

  if (normalized.kind === "image" && isLocalAssetUrl(normalized.url)) {
    if (isPreoptimizedImageUrl(normalized.url)) {
      if (typeof item === "string") return normalized.url;
      return { ...item, url: normalized.url };
    }
    const optimized = await optimizeImageAsset(normalized.url, caches.images);
    if (typeof item === "string") return optimized.outputUrl;
    return { ...item, url: optimized.outputUrl };
  }

  if (normalized.kind === "video" && isLocalAssetUrl(normalized.url)) {
    let posterUrl = normalized.poster;
    if (!isGeneratedPosterUrl(posterUrl)) {
      try {
        const generatedPoster = await createVideoPosterAsset(normalized.url, caches.posters);
        posterUrl = posterUrl || generatedPoster.outputUrl;
      } catch (error) {
        console.warn(`[prepare-static] Skipped poster generation for ${normalized.url}: ${error.message}`);
      }
    }

    const streamEntry = getReadyStreamEntry(streamManifest, normalized.url);
    if (!streamEntry) {
      throw new Error(`Missing ready Cloudflare Stream mapping for ${normalized.url}. Run scripts/media/sync-cloudflare-stream.mjs before prepare-static.`);
    }

    const delivery = {
      provider: "cloudflare-stream",
      uid: streamEntry.uid,
      hlsUrl: streamEntry.hlsUrl,
      iframeUrl: streamEntry.iframeUrl,
      thumbnailUrl: streamEntry.thumbnailUrl || posterUrl || ""
    };

    if (typeof item === "string") {
      return {
        kind: "video",
        url: normalized.url,
        ...(posterUrl ? { poster: posterUrl } : {}),
        delivery
      };
    }

    return {
      ...item,
      ...(posterUrl ? { poster: posterUrl } : {}),
      delivery
    };
  }

  return item;
};

const transformCaseCover = async (caseItem, caches) => {
  if (!caseItem || typeof caseItem !== "object") return caseItem;
  if (!isLocalAssetUrl(caseItem.cover)) return caseItem;
  if (isPreoptimizedImageUrl(caseItem.cover)) return caseItem;
  const optimized = await optimizeImageAsset(caseItem.cover, caches.images);
  return {
    ...caseItem,
    cover: optimized.outputUrl
  };
};

const transformMetaForDist = async (meta, caches) => {
  if (!meta || typeof meta !== "object") return meta;
  if (!isLocalAssetUrl(meta.ogImage)) return meta;
  if (isPreoptimizedImageUrl(meta.ogImage)) return meta;
  const optimized = await optimizeImageAsset(meta.ogImage, caches.images);
  return {
    ...meta,
    ogImage: optimized.outputUrl
  };
};

const transformPortfolioForDist = async (portfolioModel, streamManifest) => {
  const caches = {
    images: new Map(),
    posters: new Map()
  };

  const transformedSlides = await Promise.all((Array.isArray(portfolioModel?.slides) ? portfolioModel.slides : []).map(async (slide) => {
    const nextSlide = { ...slide };

    if (Array.isArray(slide.media)) {
      nextSlide.media = await Promise.all(slide.media.map((item) => transformMediaItem(item, caches, streamManifest)));
    }

    if (Array.isArray(slide.freeLayoutElements)) {
      nextSlide.freeLayoutElements = await Promise.all(slide.freeLayoutElements.map(async (element) => {
        if (element?.type !== "media") return element;
        return {
          ...element,
          media: await transformMediaItem(element.media, caches, streamManifest)
        };
      }));
    }

    return nextSlide;
  }));

  const transformedCases = await Promise.all((Array.isArray(portfolioModel?.cases) ? portfolioModel.cases : []).map((caseItem) => transformCaseCover(caseItem, caches)));
  const transformedMeta = await transformMetaForDist(portfolioModel?.meta || {}, caches);

  return {
    transformed: {
      ...(portfolioModel && typeof portfolioModel === "object" ? portfolioModel : {}),
      meta: transformedMeta,
      cases: transformedCases,
      slides: transformedSlides
    },
    optimizedImageCount: caches.images.size,
    posterCount: caches.posters.size
  };
};

const resetDistDirectory = async () => {
  try {
    await rm(distDir, { recursive: true, force: true });
  } catch (error) {
    if (!error || (error.code !== "EBUSY" && error.code !== "EPERM")) throw error;
    console.warn(`[prepare-static] Dist root is busy (${error.code}), falling back to child cleanup.`);
    if (existsSync(distDir)) {
      const entries = await readdir(distDir);
      for (const entry of entries) {
        await rm(path.join(distDir, entry), { recursive: true, force: true });
      }
    }
  }

  await mkdir(distDir, { recursive: true });
};

async function main() {
  await syncPortfolioArtifacts({
    repoRoot: root,
    allowExternalImport: false,
    allowExternalAssetRecovery: false,
    outputFile: null,
    log: (message) => console.log(`[prepare-static] ${message}`)
  });
  await buildAppAssets();

  await resetDistDirectory();

  for (const target of copyTargets) {
    const source = path.join(root, target);
    const destination = path.join(distDir, target);

    if (!existsSync(source)) {
      throw new Error(`Missing publish target: ${target}`);
    }

    await mkdir(path.dirname(destination), { recursive: true });
    await cp(source, destination, { recursive: true });
  }

  await mkdir(optimizedImagesDir, { recursive: true });
  await mkdir(generatedPostersDir, { recursive: true });

  const sourcePortfolio = JSON.parse(await readFile(sourceJsonPath, "utf8"));
  const normalizedPortfolio = Array.isArray(sourcePortfolio)
    ? { meta: {}, cases: [], slides: sourcePortfolio }
    : sourcePortfolio;
  const streamManifest = await readStreamManifest(root);
  const { transformed, optimizedImageCount, posterCount } = await transformPortfolioForDist(normalizedPortfolio, streamManifest);
  await ensureDirectory(distJsonPath);
  await writeFile(distJsonPath, `${JSON.stringify(transformed, null, 2)}\n`, "utf8");

  const versionedAssets = {
    css: await fingerprintDistFile(path.join(distDir, "assets", "app.css")),
    js: await fingerprintDistFile(path.join(distDir, "assets", "app.js")),
    embedded: await fingerprintDistFile(path.join(distDir, "embedded-data.js"))
  };
  versionedAssets.version = versionedAssets.js.hash;

  await rewriteDistIndexHtml(versionedAssets);
  await writeDistHeaders();

  console.log(`Prepared static bundle in ${distDir}`);
  console.log(`Optimized referenced images: ${optimizedImageCount}`);
  console.log(`Generated video posters: ${posterCount}`);
  console.log(`Resolved Cloudflare Stream mappings: ${Object.values(streamManifest.videos || {}).filter((entry) => isReadyStreamManifestEntry(entry)).length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
