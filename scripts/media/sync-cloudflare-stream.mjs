import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { syncPortfolioArtifacts } from "../sync-portfolio-json.mjs";
import {
  STREAM_MANIFEST_RELATIVE_PATH,
  collectLocalVideoSourcePaths,
  computeFileSha256,
  getCanonicalSiteUrl,
  getFileSizeBytes,
  getStreamDeliveryUrls,
  getStreamDeliveryUrlsFromResult,
  isReadyStreamManifestEntry,
  loadRepoPortfolioModel,
  normalizeManifestEntry,
  normalizeStreamManifest,
  probeVideoDurationSeconds,
  readStreamManifest,
  resolveRepoAssetPath,
  resolveStreamEnv,
  toPosixPath,
  writeStreamManifest
} from "./lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_POLL_INTERVAL_MS = 5000;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1000;

const parseCliArgs = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : undefined;
    if (arg === "--repo-root" && nextValue) options.repoRoot = nextValue;
    if (arg === "--publish-file" && nextValue) options.publishFile = nextValue;
    if (arg === "--poll-interval-ms" && nextValue) options.pollIntervalMs = Number(nextValue);
    if (arg === "--timeout-ms" && nextValue) options.timeoutMs = Number(nextValue);
    if (nextValue !== undefined) index += 1;
  }
  return options;
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const requestCloudflareJson = async (config, endpoint, options = {}) => {
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.accountId}${endpoint}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${config.apiToken}`,
      ...(options.headers || {})
    },
    body: options.body
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || !payload?.success) {
    const message = payload?.errors?.map((entry) => entry?.message).filter(Boolean).join("; ")
      || payload?.messages?.map((entry) => entry?.message).filter(Boolean).join("; ")
      || `${response.status} ${response.statusText}`;
    throw new Error(`Cloudflare Stream API request failed (${endpoint}): ${message}`);
  }

  return payload.result;
};

const parseStreamStatus = (streamResult) => {
  const rawStatus = streamResult?.status;
  if (typeof rawStatus === "string") return rawStatus;
  if (rawStatus && typeof rawStatus === "object") {
    if (typeof rawStatus.state === "string" && rawStatus.state) return rawStatus.state;
    if (typeof rawStatus.status === "string" && rawStatus.status) return rawStatus.status;
  }
  return streamResult?.readyToStream ? "ready" : "processing";
};

const uploadVideoFile = async (config, filePath) => {
  const form = new FormData();
  const fileBuffer = await readFile(filePath);
  form.append("file", new Blob([fileBuffer]), path.basename(filePath));
  return requestCloudflareJson(config, "/stream", {
    method: "POST",
    body: form
  });
};

const waitForReadyStreamVideo = async (config, uid, options = {}) => {
  const pollIntervalMs = Number.isFinite(options.pollIntervalMs) ? options.pollIntervalMs : DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    const result = await requestCloudflareJson(config, `/stream/${uid}`);
    const status = parseStreamStatus(result);
    if (result.readyToStream) return result;
    if (status === "error") {
      throw new Error(`Cloudflare Stream processing failed for ${uid}${result.errorReasonText ? `: ${result.errorReasonText}` : ""}`);
    }
    await sleep(pollIntervalMs);
  }

  throw new Error(`Timed out waiting for Cloudflare Stream video ${uid} to become ready.`);
};

const mergePublishList = async (publishFile, extraPaths) => {
  if (!publishFile) return;
  const existingLines = (await readFile(publishFile, "utf8").catch(() => "")).split(/\r?\n/);
  const nextLines = new Set(existingLines.map((line) => line.trim()).filter(Boolean));
  extraPaths.forEach((entry) => {
    if (entry) nextLines.add(toPosixPath(entry));
  });
  await writeFile(publishFile, `${Array.from(nextLines).sort((left, right) => left.localeCompare(right, "zh-CN")).join("\n")}\n`, "utf8");
};

const markLocalFallback = (nextManifest, video) => {
  nextManifest.videos[video.sourcePath] = normalizeManifestEntry(video.sourcePath, {
    ...video.previousEntry,
    sha256: video.sha256,
    status: "local-fallback",
    readyToStream: false,
    durationSeconds: Number.isFinite(video.fileDuration) ? video.fileDuration : video.previousEntry?.durationSeconds ?? null,
    thumbnailUrl: video.previousEntry?.thumbnailUrl || "",
    updatedAt: new Date().toISOString()
  });
};

const buildNextManifestEntry = ({
  sourcePath,
  previousEntry,
  sha256,
  customerCode,
  streamResult,
  fallbackDuration,
  fallbackThumbnail,
  uploadedAt
}) => {
  const derivedUrls = getStreamDeliveryUrlsFromResult(streamResult, customerCode);
  const fallbackUrls = getStreamDeliveryUrls(streamResult?.uid || previousEntry?.uid, derivedUrls.customerCode || customerCode);
  const deliveryUrls = {
    iframeUrl: derivedUrls.iframeUrl || previousEntry?.iframeUrl || fallbackUrls.iframeUrl || "",
    hlsUrl: derivedUrls.hlsUrl || previousEntry?.hlsUrl || fallbackUrls.hlsUrl || "",
    thumbnailUrl: derivedUrls.thumbnailUrl || previousEntry?.thumbnailUrl || fallbackThumbnail || fallbackUrls.thumbnailUrl || ""
  };
  const nextUploadedAt = uploadedAt
    || (typeof streamResult?.created === "string" ? streamResult.created : "")
    || previousEntry?.uploadedAt
    || new Date().toISOString();

  return normalizeManifestEntry(sourcePath, {
    ...previousEntry,
    sha256,
    uid: typeof streamResult?.uid === "string" ? streamResult.uid : previousEntry?.uid || "",
    status: parseStreamStatus(streamResult || previousEntry),
    readyToStream: Boolean(streamResult?.readyToStream ?? previousEntry?.readyToStream),
    durationSeconds: Number.isFinite(Number(streamResult?.duration))
      ? Number(streamResult.duration)
      : Number.isFinite(Number(previousEntry?.durationSeconds))
        ? Number(previousEntry.durationSeconds)
        : fallbackDuration,
    iframeUrl: deliveryUrls.iframeUrl,
    hlsUrl: deliveryUrls.hlsUrl,
    thumbnailUrl: deliveryUrls.thumbnailUrl,
    uploadedAt: nextUploadedAt,
    updatedAt: new Date().toISOString()
  });
};

export async function syncCloudflareStream(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || DEFAULT_REPO_ROOT);
  const publishFile = options.publishFile ? path.resolve(repoRoot, options.publishFile) : "";
  const pollIntervalMs = Number.isFinite(options.pollIntervalMs) ? options.pollIntervalMs : DEFAULT_POLL_INTERVAL_MS;
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : DEFAULT_TIMEOUT_MS;
  const log = typeof options.log === "function" ? options.log : console.log;

  const portfolioModel = await loadRepoPortfolioModel(repoRoot);
  const manifest = await readStreamManifest(repoRoot);
  const sourcePaths = collectLocalVideoSourcePaths(portfolioModel);
  const referencedSet = new Set(sourcePaths);
  const nextManifest = normalizeStreamManifest({
    ...manifest,
    customerCode: manifest.customerCode,
    videos: {},
    stale: []
  });
  const pendingUploads = [];

  for (const sourcePath of sourcePaths) {
    const absolutePath = resolveRepoAssetPath(repoRoot, sourcePath);
    const previousEntry = manifest.videos[sourcePath] || null;
    const sha256 = await computeFileSha256(absolutePath);
    const fileDuration = await probeVideoDurationSeconds(absolutePath, repoRoot);
    const fileSizeBytes = await getFileSizeBytes(absolutePath);
    const unchangedReadyEntry = previousEntry && previousEntry.sha256 === sha256 && isReadyStreamManifestEntry(previousEntry);

    if (unchangedReadyEntry) {
      nextManifest.videos[sourcePath] = buildNextManifestEntry({
        sourcePath,
        previousEntry,
        sha256,
        customerCode: resolveStreamEnv(manifest).customerCode,
        streamResult: previousEntry,
        fallbackDuration: fileDuration,
        fallbackThumbnail: previousEntry.thumbnailUrl,
        uploadedAt: previousEntry.uploadedAt
      });
      continue;
    }

    nextManifest.videos[sourcePath] = normalizeManifestEntry(sourcePath, {
      ...previousEntry,
      sha256,
      status: previousEntry?.uid ? "outdated" : "missing",
      readyToStream: false,
      durationSeconds: Number.isFinite(fileDuration) ? fileDuration : previousEntry?.durationSeconds ?? null,
      thumbnailUrl: previousEntry?.thumbnailUrl || "",
      updatedAt: new Date().toISOString()
    });

    pendingUploads.push({
      sourcePath,
      absolutePath,
      sha256,
      previousEntry,
      fileDuration,
      fileSizeBytes
    });
  }

  nextManifest.stale = Object.values(manifest.videos)
    .filter((entry) => entry?.sourcePath && !referencedSet.has(entry.sourcePath))
    .map((entry) => normalizeManifestEntry(entry.sourcePath, {
      ...entry,
      status: "stale",
      updatedAt: new Date().toISOString()
    }));

  const streamConfig = resolveStreamEnv(manifest, { requireAuth: pendingUploads.length > 0 });
  nextManifest.customerCode = streamConfig.customerCode;
  let uploadFailureCount = 0;

  if (pendingUploads.length && streamConfig.missing.length) {
    pendingUploads.forEach((video) => markLocalFallback(nextManifest, video));
    uploadFailureCount += pendingUploads.length;
    log(`[stream-sync] Cloudflare Stream upload skipped: missing ${streamConfig.missing.join(", ")}. Local video fallback enabled for ${pendingUploads.length} video(s).`);
    pendingUploads.length = 0;
  }
  for (const video of pendingUploads) {
    try {
      log(`[stream-sync] Uploading ${video.sourcePath} (${(video.fileSizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
      const uploadResult = await uploadVideoFile(streamConfig, video.absolutePath);
      const readyResult = uploadResult.readyToStream
        ? uploadResult
        : await waitForReadyStreamVideo(streamConfig, uploadResult.uid, {
          pollIntervalMs,
          timeoutMs
        });

      nextManifest.videos[video.sourcePath] = buildNextManifestEntry({
        sourcePath: video.sourcePath,
        previousEntry: video.previousEntry,
        sha256: video.sha256,
        customerCode: streamConfig.customerCode,
        streamResult: readyResult,
        fallbackDuration: video.fileDuration,
        fallbackThumbnail: readyResult.thumbnail,
        uploadedAt: typeof uploadResult.created === "string" ? uploadResult.created : ""
      });
      if (!nextManifest.customerCode) {
        nextManifest.customerCode = getStreamDeliveryUrlsFromResult(readyResult, streamConfig.customerCode).customerCode;
      }
    } catch (error) {
      uploadFailureCount += 1;
      log(`[stream-sync] Stream upload skipped for ${video.sourcePath}: ${error.message || error}`);
      markLocalFallback(nextManifest, video);
    }
  }

  nextManifest.updatedAt = new Date().toISOString();
  const manifestPath = await writeStreamManifest(repoRoot, nextManifest);

  if (publishFile) {
    await syncPortfolioArtifacts({
      repoRoot,
      allowExternalImport: false,
      allowExternalAssetRecovery: false,
      outputFile: publishFile,
      log: (message) => log(`[stream-sync] ${message}`)
    });
    await mergePublishList(publishFile, [STREAM_MANIFEST_RELATIVE_PATH]);
  }

  const readyCount = Object.values(nextManifest.videos).filter((entry) => entry.readyToStream).length;
  const siteUrl = getCanonicalSiteUrl(portfolioModel);
  log(`[stream-sync] Synced Cloudflare Stream manifest: ${manifestPath}`);
  log(`[stream-sync] Ready videos: ${readyCount}/${sourcePaths.length}`);
  if (uploadFailureCount) {
    log(`[stream-sync] Local video fallback enabled for ${uploadFailureCount} video(s).`);
  }
  if (nextManifest.stale.length) {
    log(`[stream-sync] Stale manifest entries: ${nextManifest.stale.map((entry) => entry.sourcePath).join(", ")}`);
  }
  log(`[stream-sync] Canonical site: ${siteUrl}`);

  return {
    repoRoot,
    manifestPath,
    publishFile,
    manifest: nextManifest,
    sourcePaths
  };
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  syncCloudflareStream(cliOptions).catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
