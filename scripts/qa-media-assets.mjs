import { access, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = path.join(root, "output", "qa");
const severities = ["PASS", "WARNING", "REVIEW_REQUIRED", "BLOCKER", "SKIPPED"];
const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp", ".gif", ".svg"]);
const videoExtensions = new Set([".mp4", ".mov", ".webm", ".m3u8"]);
const issues = [];

function addIssue(severity, file, id, field, message, suggestedFix) {
  if (!severities.includes(severity)) throw new Error(`Invalid severity: ${severity}`);
  issues.push({
    severity,
    file,
    id: id == null ? "" : String(id),
    field: field || "",
    message,
    suggestedFix: suggestedFix || ""
  });
}

async function optionalImport(name) {
  try {
    return { name, module: await import(name), available: true };
  } catch (error) {
    addIssue("SKIPPED", "package.json", name, "dependency", `${name} is unavailable: ${error.message}`, "Install the optional QA dependency when this check is required.");
    return { name, module: null, available: false };
  }
}

function skippedCapability(name, reason, suggestedFix) {
  addIssue("SKIPPED", "package.json", name, "dependency", reason, suggestedFix);
  return { name, module: null, available: false };
}

async function readJson(relativeFile) {
  try {
    return JSON.parse(await readFile(path.join(root, relativeFile), "utf8"));
  } catch {
    return null;
  }
}

async function readCaseFiles() {
  try {
    const dir = path.join(root, "data", "cases");
    const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
    const entries = [];
    for (const file of files) {
      const relativeFile = path.join("data", "cases", file).replace(/\\/g, "/");
      entries.push({ file: relativeFile, data: await readJson(relativeFile) });
    }
    return entries.filter((entry) => entry.data);
  } catch {
    return [];
  }
}

async function importHomeData() {
  try {
    return await import(pathToFileURL(path.join(root, "src", "portfolio-home-data.js")).href + `?qa=${Date.now()}`);
  } catch (error) {
    addIssue("SKIPPED", "src/portfolio-home-data.js", "", "", `Unable to import homepage data: ${error.message}`, "Fix homepage data module to include it in media QA.");
    return {};
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function looksLikeMediaPath(value) {
  if (typeof value !== "string") return false;
  if (/^https?:\/\//i.test(value) || value.startsWith("data:")) return false;
  return /(?:^|\/)(images|videos|assets|prompts-data\/assets)\/.+\.(png|jpe?g|webp|gif|svg|mp4|mov|webm|m3u8)([?#].*)?$/i.test(value);
}

function cleanMediaPath(value) {
  return value.replace(/\\/g, "/").replace(/[?#].*$/, "").replace(/^\.\//, "");
}

function collectMediaRefs(value, sourceFile, trail = "", refs = []) {
  if (typeof value === "string") {
    if (looksLikeMediaPath(value)) refs.push({ path: cleanMediaPath(value), sourceFile, field: trail || "value" });
    return refs;
  }
  if (Array.isArray(value)) {
    value.forEach((entry, index) => collectMediaRefs(entry, sourceFile, `${trail}[${index}]`, refs));
    return refs;
  }
  if (value && typeof value === "object") {
    for (const [key, entry] of Object.entries(value)) {
      collectMediaRefs(entry, sourceFile, trail ? `${trail}.${key}` : key, refs);
    }
  }
  return refs;
}

async function collectDataRefs() {
  const refs = [];
  const files = ["data/portfolio.json", "data/gallery-worlds.json", "data/gallery-image-library.json", "data/cloudflare-stream-manifest.json"];
  for (const file of files) {
    const data = await readJson(file);
    if (data) collectMediaRefs(data, file, "", refs);
  }
  for (const entry of await readCaseFiles()) {
    collectMediaRefs(entry.data, entry.file, "", refs);
  }
  const homeData = await importHomeData();
  for (const [key, value] of Object.entries(homeData)) {
    if (key === "default") continue;
    collectMediaRefs(value, "src/portfolio-home-data.js", key, refs);
  }
  return refs;
}

async function exists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

function hammingDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let distance = 0;
  for (let index = 0; index < a.length; index += 1) {
    if (a[index] !== b[index]) distance += 1;
  }
  return distance;
}

async function inspectDimensions(relativePath, sizeOf) {
  try {
    const dimensions = await sizeOf(path.join(root, relativePath));
    const width = Number(dimensions.width || 0);
    const height = Number(dimensions.height || 0);
    const ratio = height ? width / height : 0;
    if (width && height && (width < 320 || height < 240)) {
      addIssue("WARNING", relativePath, "", "dimensions", `Small media dimensions: ${width}x${height}.`, "Use card-safe optimized assets for public covers/posters.");
    }
    if (ratio && (ratio < 0.35 || ratio > 3.5)) {
      addIssue("REVIEW_REQUIRED", relativePath, "", "aspectRatio", `Extreme image aspect ratio: ${ratio.toFixed(2)}.`, "Confirm the image is not an uncropped source/original used as a card asset.");
    }
    return { width, height, ratio };
  } catch (error) {
    addIssue("WARNING", relativePath, "", "dimensions", `Unable to read image dimensions: ${error.message}`, "Confirm the asset is valid and supported by image-size.");
    return null;
  }
}

async function inspectBrightness(relativePath, sharp) {
  try {
    const { data, info } = await sharp(path.join(root, relativePath))
      .resize({ width: 32, height: 32, fit: "inside", withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    const channels = info.channels || 3;
    let sum = 0;
    let pixels = 0;
    for (let index = 0; index < data.length; index += channels) {
      const r = data[index] || 0;
      const g = data[index + 1] || r;
      const b = data[index + 2] || r;
      sum += (r + g + b) / 3;
      pixels += 1;
    }
    const mean = pixels ? sum / pixels : 0;
    if (mean < 8) addIssue("REVIEW_REQUIRED", relativePath, "", "brightness", `Very dark image candidate, mean brightness ${mean.toFixed(1)}.`, "Review for black-card or non-rendering media.");
    return mean;
  } catch (error) {
    addIssue("WARNING", relativePath, "", "brightness", `Unable to inspect brightness: ${error.message}`, "Confirm sharp can decode this asset.");
    return null;
  }
}

async function inspectBlur(relativePath, BlurryDetector, fileSize) {
  if (!BlurryDetector) return null;
  if (fileSize > 3_000_000) {
    addIssue("SKIPPED", relativePath, "", "blur", "Blur check skipped for large image.", "Run targeted blur inspection if this asset is card-critical.");
    return null;
  }
  try {
    const detector = new BlurryDetector();
    const blurry = await detector.isImageBlurry(path.join(root, relativePath));
    if (blurry) addIssue("REVIEW_REQUIRED", relativePath, "", "blur", "Blur detector flagged this image.", "Review the source asset before production release.");
    return blurry;
  } catch (error) {
    addIssue("SKIPPED", relativePath, "", "blur", `Blur check unavailable for this image: ${error.message}`, "Treat blur detection as optional and rely on visual QA if needed.");
    return null;
  }
}

async function inspectHash(relativePath, phash) {
  if (!phash) return null;
  try {
    const value = await phash(path.join(root, relativePath));
    return typeof value === "string" ? value : JSON.stringify(value);
  } catch (error) {
    addIssue("SKIPPED", relativePath, "", "phash", `Perceptual hash unavailable: ${error.message}`, "Use manual duplicate review for this asset.");
    return null;
  }
}

function summarize() {
  const summary = Object.fromEntries(severities.map((severity) => [severity, 0]));
  for (const item of issues) summary[item.severity] += 1;
  return summary;
}

function markdownReport(report) {
  const lines = [
    `# ${report.reportName}`,
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "## Summary",
    "",
    ...severities.map((severity) => `- ${severity}: ${report.summary[severity]}`),
    "",
    "## Optional Capabilities",
    "",
    ...Object.entries(report.capabilities).map(([name, available]) => `- ${name}: ${available ? "available" : "skipped"}`),
    "",
    "## Issues",
    ""
  ];
  if (report.issues.length === 0) {
    lines.push("No issues found.");
  } else {
    for (const item of report.issues) {
      lines.push(`- **${item.severity}** ${item.file}${item.field ? ` [${item.field}]` : ""}: ${item.message}${item.suggestedFix ? ` Suggested fix: ${item.suggestedFix}` : ""}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

const refs = await collectDataRefs();
const uniqueRefs = [...new Map(refs.map((ref) => [ref.path, ref])).values()].sort((a, b) => a.path.localeCompare(b.path));
const imageSizeImport = await optionalImport("image-size");
const sharpImport = await optionalImport("sharp");
const blurImport = process.env.QA_ENABLE_BLURRY_DETECTOR === "1"
  ? await optionalImport("blurry-detector")
  : skippedCapability("blurry-detector", "Blur detection is disabled by default because the native dependency can terminate Node on this Windows host.", "Set QA_ENABLE_BLURRY_DETECTOR=1 for a targeted run after confirming the native dependency is stable.");
const phashImport = process.env.QA_ENABLE_SHARP_PHASH === "1"
  ? await optionalImport("sharp-phash")
  : skippedCapability("sharp-phash", "Perceptual hash duplicate detection is disabled by default because the native dependency can terminate Node on this Windows host.", "Set QA_ENABLE_SHARP_PHASH=1 for a targeted run after confirming the native dependency is stable.");
const sizeOf = imageSizeImport.module?.imageSize || imageSizeImport.module?.default;
const sharp = sharpImport.module?.default || sharpImport.module;
const BlurryDetector = blurImport.module?.default || blurImport.module;
const phash = phashImport.module?.default || phashImport.module;
const assets = [];
const hashes = [];

for (const ref of uniqueRefs) {
  const extension = path.extname(ref.path).toLowerCase();
  const present = await exists(ref.path);
  const asset = { path: ref.path, references: refs.filter((item) => item.path === ref.path).map((item) => ({ file: item.sourceFile, field: item.field })), exists: present };
  assets.push(asset);
  if (!present) {
    addIssue("BLOCKER", ref.path, "", "exists", "Referenced media file is missing.", "Restore the asset, update the reference, or remove it from the public surface.");
    continue;
  }
  const info = await stat(path.join(root, ref.path));
  asset.bytes = info.size;
  if (imageExtensions.has(extension) && extension !== ".svg") {
    if (sizeOf) asset.dimensions = await inspectDimensions(ref.path, sizeOf);
    if (sharp) asset.meanBrightness = await inspectBrightness(ref.path, sharp);
    if (BlurryDetector) asset.blurry = await inspectBlur(ref.path, BlurryDetector, info.size);
    if (phash) {
      const hash = await inspectHash(ref.path, phash);
      if (hash) hashes.push({ path: ref.path, hash });
    }
  } else if (videoExtensions.has(extension)) {
    if (info.size < 100_000) addIssue("WARNING", ref.path, "", "size", `Small video-like asset size: ${info.size} bytes.`, "Confirm this is not a broken placeholder.");
  }
}

for (let left = 0; left < hashes.length; left += 1) {
  for (let right = left + 1; right < hashes.length; right += 1) {
    const distance = hammingDistance(hashes[left].hash, hashes[right].hash);
    if (distance <= 4) {
      addIssue("WARNING", `${hashes[left].path} | ${hashes[right].path}`, "", "phash", `Near-duplicate media candidate, hash distance ${distance}.`, "Review whether repeated covers are intentional.");
    }
  }
}

await mkdir(outDir, { recursive: true });
const report = {
  reportName: "Portfolio Media Asset QA",
  generatedAt: new Date().toISOString(),
  summary: summarize(),
  capabilities: {
    "image-size": Boolean(sizeOf),
    sharp: Boolean(sharp),
    "blurry-detector": Boolean(BlurryDetector),
    "sharp-phash": Boolean(phash)
  },
  inspected: {
    references: refs.length,
    uniqueAssets: uniqueRefs.length
  },
  assets,
  issues
};
await writeFile(path.join(outDir, "qa-media-assets.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(outDir, "qa-media-assets.md"), markdownReport(report), "utf8");
console.log("qa-media: wrote output/qa/qa-media-assets.json and output/qa/qa-media-assets.md");
console.log(`qa-media: ${report.summary.BLOCKER} blocker(s), ${report.summary.REVIEW_REQUIRED} review item(s), ${report.summary.WARNING} warning(s), ${report.summary.SKIPPED} skipped check(s)`);
if (report.summary.BLOCKER > 0) process.exitCode = 1;
