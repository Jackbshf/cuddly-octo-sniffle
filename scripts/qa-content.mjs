import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";

const root = process.cwd();
const outDir = path.join(root, "output", "qa");
const severities = ["PASS", "WARNING", "REVIEW_REQUIRED", "BLOCKER", "SKIPPED"];
const allowedStatus = new Set(["ready", "draft", "hidden", "needs-copy", "needs-cover", "missing-video", "archive"]);
const homepageStatus = new Set(["ready", "missing-video"]);
const allowedRights = new Set(["original", "licensed", "needs-review", "do-not-publish"]);
const productionRights = new Set(["original", "licensed"]);
const issues = [];

function addIssue(severity, file, id, field, message, suggestedFix) {
  if (!severities.includes(severity)) {
    throw new Error(`Invalid severity: ${severity}`);
  }
  issues.push({
    severity,
    file,
    id: id == null ? "" : String(id),
    field: field || "",
    message,
    suggestedFix: suggestedFix || ""
  });
}

async function readJson(relativeFile, required = true) {
  try {
    return JSON.parse(await readFile(path.join(root, relativeFile), "utf8"));
  } catch (error) {
    addIssue(required ? "BLOCKER" : "SKIPPED", relativeFile, "", "", `Unable to read JSON: ${error.message}`, "Fix the JSON file or remove the QA dependency on it.");
    return null;
  }
}

async function readCaseFiles() {
  const dir = path.join(root, "data", "cases");
  try {
    const files = (await readdir(dir)).filter((file) => file.endsWith(".json")).sort();
    const cases = [];
    for (const file of files) {
      const relativeFile = path.join("data", "cases", file).replace(/\\/g, "/");
      const data = await readJson(relativeFile);
      if (data) cases.push({ file: relativeFile, data });
    }
    return cases;
  } catch (error) {
    addIssue("SKIPPED", "data/cases", "", "", `Case directory unavailable: ${error.message}`, "Restore data/cases when commercial case QA is required.");
    return [];
  }
}

async function importHomeData() {
  const relativeFile = "src/portfolio-home-data.js";
  try {
    return await import(pathToFileURL(path.join(root, relativeFile)).href + `?qa=${Date.now()}`);
  } catch (error) {
    addIssue("BLOCKER", relativeFile, "", "", `Unable to import homepage curation data: ${error.message}`, "Fix the ESM data module so QA can inspect public homepage selections.");
    return {};
  }
}

function normalizeArray(value) {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") return Object.values(value);
  return [];
}

function classifyPath(value) {
  const text = String(value || "").toLowerCase();
  if (!text) return "unknown";
  if (/\.(mp4|mov|webm|m3u8)([?#].*)?$/.test(text) || text.includes("/videos/")) return "video";
  if (text.includes("/workflow") || text.includes("/comfyui") || text.includes("node-graph") || text.includes("outpainting") || text.includes("inpainting")) return "workflow";
  if (text.includes("moodboard") || text.includes("mood-board")) return "moodboard";
  if (text.includes("board") || text.includes("case-board") || text.includes("vi-board")) return "case-board";
  if (/\.(png|jpe?g|webp|gif|svg)([?#].*)?$/.test(text) || text.includes("/images/")) return "image";
  return "unknown";
}

function mediaRefs(item) {
  const refs = [];
  const fields = ["cover", "poster", "source", "original", "src", "video", "videoSrc", "image", "ogImage"];
  for (const field of fields) {
    if (typeof item?.[field] === "string" && item[field]) refs.push({ field, value: item[field], mediaClass: classifyPath(item[field]) });
  }
  if (Array.isArray(item?.media)) {
    item.media.forEach((entry, index) => {
      if (typeof entry === "string") refs.push({ field: `media[${index}]`, value: entry, mediaClass: classifyPath(entry) });
      if (entry && typeof entry === "object") refs.push(...mediaRefs(entry).map((ref) => ({ ...ref, field: `media[${index}].${ref.field}` })));
    });
  }
  return refs;
}

function checkDuplicateValues(items, file, field, severity, suggestedFix) {
  const seen = new Map();
  for (const item of items) {
    const value = item.value;
    if (!value) continue;
    if (!seen.has(value)) {
      seen.set(value, []);
    }
    seen.get(value).push(item.id);
  }
  for (const [value, ids] of seen) {
    if (ids.length > 1) {
      addIssue(severity, file, ids.join(", "), field, `Duplicate ${field} value: ${value}`, suggestedFix);
    }
  }
}

function checkPublicItem(item, file, context, options = {}) {
  const id = item?.id ?? item?.title ?? "";
  const type = String(item?.type || options.defaultType || "").toLowerCase();
  const productionSurface = Boolean(options.productionSurface);

  if (!item?.title) addIssue("BLOCKER", file, id, "title", `${context} item is missing title.`, "Add a clear Chinese title before publishing.");
  if (!item?.description && !item?.desc) addIssue(options.descriptionRequired ? "BLOCKER" : "WARNING", file, id, "description", `${context} item is missing description.`, "Add concise public-facing description copy.");

  const refs = mediaRefs(item);
  const hasVisualRef = refs.some((ref) => ["image", "video", "workflow", "moodboard", "case-board"].includes(ref.mediaClass));
  if (hasVisualRef && !item.alt && !item?.media?.some?.((entry) => entry?.alt)) {
    addIssue(productionSurface ? "BLOCKER" : "REVIEW_REQUIRED", file, id, "alt", `${context} item has media but no alt text.`, "Add accurate alt text for public media.");
  }

  if (type === "video") {
    if (!item.duration) addIssue("BLOCKER", file, id, "duration", "Video item is missing duration.", "Add visible duration or mark the item as missing-video with fallback copy.");
    if (!item.poster && !item.cover) addIssue("BLOCKER", file, id, "poster", "Video item is missing poster or cover.", "Add an optimized poster image.");
  }

  if ((type === "image" || type === "case") && !item.poster && !item.cover && !item.src) {
    addIssue(productionSurface ? "BLOCKER" : "REVIEW_REQUIRED", file, id, "poster", `${context} visual item is missing poster/cover/src.`, "Add a card-safe cover asset.");
  }

  if (item.status == null) {
    addIssue(productionSurface ? "BLOCKER" : "REVIEW_REQUIRED", file, id, "status", `${context} item is missing status.`, "Set status to ready, draft, hidden, needs-copy, needs-cover, missing-video, or archive.");
  } else if (!allowedStatus.has(item.status)) {
    addIssue("BLOCKER", file, id, "status", `Invalid status: ${item.status}`, "Use the allowed status vocabulary.");
  } else if (productionSurface && !homepageStatus.has(item.status)) {
    addIssue("BLOCKER", file, id, "status", `Status is not production-homepage eligible: ${item.status}`, "Hide from homepage or set status to ready after review.");
  }

  if (item.rightsStatus == null) {
    addIssue(productionSurface ? "BLOCKER" : "REVIEW_REQUIRED", file, id, "rightsStatus", `${context} item is missing rightsStatus.`, "Set rightsStatus to original, licensed, needs-review, or do-not-publish.");
  } else if (!allowedRights.has(item.rightsStatus)) {
    addIssue("BLOCKER", file, id, "rightsStatus", `Invalid rightsStatus: ${item.rightsStatus}`, "Use the allowed rightsStatus vocabulary.");
  } else if (productionSurface && !productionRights.has(item.rightsStatus)) {
    addIssue("BLOCKER", file, id, "rightsStatus", `Rights status blocks production: ${item.rightsStatus}`, "Keep the item hidden until rights are resolved.");
  }

  for (const ref of refs) {
    if (productionSurface && ["workflow", "moodboard", "case-board"].includes(ref.mediaClass)) {
      addIssue("BLOCKER", file, id, ref.field, `${context} uses ${ref.mediaClass} media on a normal public surface.`, "Move workflow/process/composite assets to a process-specific section.");
    }
  }
}

function checkCase(caseEntry) {
  const item = caseEntry.data;
  const id = item.id || path.basename(caseEntry.file, ".json");
  checkPublicItem(item, caseEntry.file, "Commercial case", { productionSurface: false, descriptionRequired: true, defaultType: "case" });
  for (const field of ["category", "tools", "results", "slideIds"]) {
    const value = item[field];
    const empty = Array.isArray(value) ? value.length === 0 : !value;
    if (empty) addIssue("BLOCKER", caseEntry.file, id, field, `Commercial case is missing ${field}.`, "Complete required case structure before release.");
  }
  for (const field of ["goal", "role", "deliverables", "commercialUse", "finalResult", "cta"]) {
    if (item[field] == null) addIssue("REVIEW_REQUIRED", caseEntry.file, id, field, `Commercial case is missing future release field ${field}.`, "Add this field before the full portfolio release gate.");
  }
}

function checkHomeCuration(homeData) {
  const works = normalizeArray(homeData.portfolioWorks);
  const videoIds = new Set(normalizeArray(homeData.videoWorkIds));
  const caseIds = new Set(normalizeArray(homeData.caseStudyIds));
  const ids = works.map((work) => ({ id: work.id, value: work.id }));
  checkDuplicateValues(ids, "src/portfolio-home-data.js", "portfolioWorks.id", "BLOCKER", "Keep homepage work IDs unique.");
  checkDuplicateValues(works.flatMap((work) => mediaRefs(work).filter((ref) => ["poster", "cover", "src"].includes(ref.field)).map((ref) => ({ id: work.id, value: ref.value }))), "src/portfolio-home-data.js", "cover/poster", "WARNING", "Confirm repeated covers are intentional or replace duplicates.");

  for (const work of works) {
    checkPublicItem(work, "src/portfolio-home-data.js", "Homepage", { productionSurface: true, descriptionRequired: true });
    if (videoIds.has(work.id) && work.type !== "video") {
      addIssue("BLOCKER", "src/portfolio-home-data.js", work.id, "type", "videoWorkIds includes a non-video item.", "Keep video IDs aligned with type: video.");
    }
    if (caseIds.has(work.id) && !["case", "video", "image"].includes(work.type)) {
      addIssue("REVIEW_REQUIRED", "src/portfolio-home-data.js", work.id, "type", "caseStudyIds includes an unsupported item type.", "Review commercial case selection.");
    }
  }

  const copy = homeData.portfolioHomeCopy || {};
  for (const field of ["brand", "title", "subtitle", "description"]) {
    if (!copy[field]) addIssue("BLOCKER", "src/portfolio-home-data.js", "portfolioHomeCopy", field, `Homepage copy is missing ${field}.`, "Add complete default Chinese homepage copy.");
  }
  if (!homeData.portfolioHomeCopyEn && !homeData.portfolioEnglishCopy && !homeData.i18nCopy) {
    addIssue("REVIEW_REQUIRED", "src/portfolio-home-data.js", "i18n", "englishCopy", "Unified English copy map was not detected.", "Add English copy through one map before bilingual release.");
  }
}

function checkGalleryWorlds(data) {
  const works = normalizeArray(data?.works);
  checkDuplicateValues(works.map((work) => ({ id: work.id, value: work.id })), "data/gallery-worlds.json", "works.id", "BLOCKER", "Keep gallery-world work IDs unique.");
  for (const work of works) {
    checkPublicItem(work, "data/gallery-worlds.json", "Gallery world", { productionSurface: true, descriptionRequired: true });
  }
}

function checkGalleryLibrary(data) {
  const images = normalizeArray(data?.images);
  checkDuplicateValues(images.map((image) => ({ id: image.title || image.src, value: image.src })), "data/gallery-image-library.json", "src", "WARNING", "Review repeated gallery image sources.");
  for (const image of images) {
    const id = image.title || image.src;
    if (!image.src) addIssue("BLOCKER", "data/gallery-image-library.json", id, "src", "Gallery image is missing src.", "Add a valid image source or remove it from the library.");
    if (!image.title) addIssue("WARNING", "data/gallery-image-library.json", id, "title", "Gallery image is missing title.", "Add a title that matches the visible subject.");
    if (!image.alt) addIssue("REVIEW_REQUIRED", "data/gallery-image-library.json", id, "alt", "Gallery image is missing alt text.", "Add alt text before using this item on public surfaces.");
    if (["workflow", "moodboard", "case-board"].includes(classifyPath(image.src))) {
      addIssue("BLOCKER", "data/gallery-image-library.json", id, "src", "Gallery library includes workflow/composite media.", "Move process media out of the normal gallery.");
    }
    if (image.status == null) addIssue("REVIEW_REQUIRED", "data/gallery-image-library.json", id, "status", "Gallery image is missing status.", "Set status before the production release gate.");
    if (image.rightsStatus == null) addIssue("REVIEW_REQUIRED", "data/gallery-image-library.json", id, "rightsStatus", "Gallery image is missing rightsStatus.", "Set rightsStatus before the production release gate.");
  }
}

function checkPortfolioJson(data) {
  const slides = normalizeArray(data?.slides);
  checkDuplicateValues(slides.map((slide) => ({ id: slide.id, value: slide.id })), "data/portfolio.json", "slides.id", "BLOCKER", "Keep slide IDs unique.");
  for (const slide of slides) {
    checkPublicItem(slide, "data/portfolio.json", `Slide ${slide.type || ""}`.trim(), { productionSurface: false });
  }
  const meta = data?.meta || {};
  for (const field of ["siteTitle", "siteDescription", "canonicalUrl", "ogTitle", "ogDescription", "ogImage"]) {
    if (!meta[field]) addIssue("REVIEW_REQUIRED", "data/portfolio.json", "meta", field, `SEO/social field is missing: ${field}`, "Complete public share metadata before release.");
  }
}

function checkStreamManifest(data, homeData) {
  const videos = normalizeArray(data?.videos);
  const streamIds = new Set(videos.flatMap((item) => [item.id, item.workId, item.slug, item.name]).filter(Boolean));
  for (const work of normalizeArray(homeData.portfolioWorks).filter((item) => item.type === "video")) {
    if (!streamIds.has(work.id)) {
      addIssue("WARNING", "data/cloudflare-stream-manifest.json", work.id, "videos", "Homepage video has no obvious Cloudflare Stream manifest entry.", "Confirm local MP4 fallback or add/update stream mapping.");
    }
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
    "## Issues",
    ""
  ];
  if (report.issues.length === 0) {
    lines.push("No issues found.");
  } else {
    for (const item of report.issues) {
      lines.push(`- **${item.severity}** ${item.file}${item.id ? ` (${item.id})` : ""}${item.field ? ` [${item.field}]` : ""}: ${item.message}${item.suggestedFix ? ` Suggested fix: ${item.suggestedFix}` : ""}`);
    }
  }
  lines.push("");
  return lines.join("\n");
}

async function writeReports(extra) {
  await mkdir(outDir, { recursive: true });
  const report = {
    reportName: "Portfolio Content QA",
    generatedAt: new Date().toISOString(),
    summary: summarize(),
    ...extra,
    issues
  };
  await writeFile(path.join(outDir, "qa-content.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await writeFile(path.join(outDir, "qa-content.md"), markdownReport(report), "utf8");
  console.log(`qa-content: wrote output/qa/qa-content.json and output/qa/qa-content.md`);
  console.log(`qa-content: ${report.summary.BLOCKER} blocker(s), ${report.summary.REVIEW_REQUIRED} review item(s), ${report.summary.WARNING} warning(s)`);
  if (report.summary.BLOCKER > 0) process.exitCode = 1;
}

const [portfolio, galleryWorlds, galleryLibrary, streamManifest, cases, homeData] = await Promise.all([
  readJson("data/portfolio.json"),
  readJson("data/gallery-worlds.json", false),
  readJson("data/gallery-image-library.json", false),
  readJson("data/cloudflare-stream-manifest.json", false),
  readCaseFiles(),
  importHomeData()
]);

if (homeData) checkHomeCuration(homeData);
if (portfolio) checkPortfolioJson(portfolio);
if (galleryWorlds) checkGalleryWorlds(galleryWorlds);
if (galleryLibrary) checkGalleryLibrary(galleryLibrary);
for (const item of cases) checkCase(item);
if (streamManifest && homeData) checkStreamManifest(streamManifest, homeData);

await writeReports({
  inspected: {
    homepageWorks: normalizeArray(homeData?.portfolioWorks).length,
    portfolioSlides: normalizeArray(portfolio?.slides).length,
    galleryWorldWorks: normalizeArray(galleryWorlds?.works).length,
    galleryImages: normalizeArray(galleryLibrary?.images).length,
    cases: cases.length
  }
});
