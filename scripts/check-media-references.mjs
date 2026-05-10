import { access, mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const outDir = path.join(root, "output", "qa");
const severities = ["PASS", "WARNING", "REVIEW_REQUIRED", "BLOCKER", "SKIPPED"];
const issues = [];
const mediaFilePattern = /\.(png|jpe?g|webp|gif|svg|mp4|mov|webm|m3u8)$/i;
const scanExtensions = new Set([".json", ".js", ".jsx", ".css", ".html", ".md"]);
const scanRoots = ["data", "src", "styles", "assets"];
const directFiles = ["app.jsx", "embedded-data.js"];
const mediaRoots = ["images", "videos", path.join("prompts-data", "assets")];

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

async function pathExists(relativePath) {
  try {
    await access(path.join(root, relativePath));
    return true;
  } catch {
    return false;
  }
}

async function walk(relativeDir, predicate, out = []) {
  const absoluteDir = path.join(root, relativeDir);
  let entries;
  try {
    entries = await readdir(absoluteDir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === "dist" || entry.name === "output") continue;
    const relativePath = path.join(relativeDir, entry.name).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      await walk(relativePath, predicate, out);
    } else if (!predicate || predicate(relativePath)) {
      out.push(relativePath);
    }
  }
  return out;
}

function cleanMediaPath(value) {
  return value.replace(/\\/g, "/").replace(/[?#].*$/, "").replace(/^\.\//, "");
}

function extractReferences(text, file) {
  const refs = [];
  const patterns = [
    /(?:["'`(=:\s])((?:images|videos|assets|prompts-data\/assets)\/[^"'`\s),;]+?\.(?:png|jpe?g|webp|gif|svg|mp4|mov|webm|m3u8)(?:[?#][^"'`\s),;]+)?)/gi,
    /workPoster\(["']([^"']+)["']\)/g
  ];
  for (const match of text.matchAll(patterns[0])) {
    const mediaPath = cleanMediaPath(match[1]);
    const contextStart = Math.max(0, (match.index || 0) - 120);
    const context = text.slice(contextStart, match.index || 0).toLowerCase();
    const isExample = context.includes("placeholder") || context.includes("例如") || context.includes("example");
    if (!mediaPath.includes("${") && !isExample) {
      refs.push({ path: mediaPath, file, index: match.index || 0, source: "literal" });
    }
  }
  if (file.endsWith("portfolio-home-data.js")) {
    for (const match of text.matchAll(patterns[1])) {
      refs.push({ path: `images/works/${match[1]}/poster.webp`, file, index: match.index || 0, source: "workPoster" });
    }
  }
  return refs;
}

async function collectScanFiles() {
  const files = [];
  for (const rootDir of scanRoots) {
    files.push(...await walk(rootDir, (file) => scanExtensions.has(path.extname(file).toLowerCase())));
  }
  for (const file of directFiles) {
    if (await pathExists(file)) files.push(file);
  }
  return [...new Set(files)].sort();
}

async function collectMediaFiles() {
  const files = [];
  for (const rootDir of mediaRoots) {
    files.push(...await walk(rootDir, (file) => mediaFilePattern.test(file)));
  }
  return [...new Set(files)].sort();
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
    `- Scan files: ${report.inspected.scanFiles}`,
    `- References: ${report.inspected.references}`,
    `- Existing media files: ${report.inspected.mediaFiles}`,
    `- Unused media candidates: ${report.unusedMedia.length}`,
    `- Delete candidates: ${report.deleteCandidates.length}`,
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
  lines.push("", "## Delete Candidates", "");
  for (const candidate of report.deleteCandidates.slice(0, 80)) {
    lines.push(`- ${candidate.path} (${candidate.reason})`);
  }
  if (report.deleteCandidates.length > 80) lines.push(`- ... ${report.deleteCandidates.length - 80} more in JSON report`);
  lines.push("");
  return lines.join("\n");
}

const scanFiles = await collectScanFiles();
const mediaFiles = await collectMediaFiles();
const references = [];

for (const file of scanFiles) {
  try {
    const text = await readFile(path.join(root, file), "utf8");
    references.push(...extractReferences(text, file));
  } catch (error) {
    addIssue("SKIPPED", file, "", "read", `Unable to scan file: ${error.message}`, "Run targeted reference review for this file.");
  }
}

const referencesByPath = new Map();
for (const ref of references) {
  if (!referencesByPath.has(ref.path)) referencesByPath.set(ref.path, []);
  referencesByPath.get(ref.path).push({ file: ref.file, source: ref.source, index: ref.index });
}

for (const [mediaPath, refs] of referencesByPath) {
  if (/^https?:\/\//i.test(mediaPath)) continue;
  if (!await pathExists(mediaPath)) {
    addIssue("BLOCKER", mediaPath, refs.map((ref) => ref.file).join(", "), "reference", "Referenced media file does not exist.", "Restore the file or update all references.");
  }
}

for (const [mediaPath, refs] of referencesByPath) {
  const homepageRefs = refs.filter((ref) => ref.file === "src/portfolio-home-data.js" || ref.file === "app.jsx");
  if (homepageRefs.length > 1) {
    addIssue("WARNING", mediaPath, homepageRefs.map((ref) => ref.file).join(", "), "homepageReference", "Media appears multiple times in homepage-facing code.", "Confirm repeated homepage use is intentional.");
  }
}

const referencedPaths = new Set(referencesByPath.keys());
const unusedMedia = [];
for (const file of mediaFiles) {
  if (!referencedPaths.has(file)) {
    const info = await stat(path.join(root, file));
    unusedMedia.push({ path: file, bytes: info.size });
  }
}

const deleteCandidates = unusedMedia
  .filter((item) => item.path.includes("/generated/") || item.path.includes("/workflows/") || item.path.includes("/tmp/") || item.path.includes("/backup/"))
  .map((item) => ({ ...item, reason: "unused generated/workflow-style asset; review before deleting" }));

if (deleteCandidates.length > 0) {
  addIssue("REVIEW_REQUIRED", "images/", String(deleteCandidates.length), "deleteCandidates", "Unused generated/workflow-style media candidates found.", "Review output/qa/check-media-references.json before any deletion.");
}

await mkdir(outDir, { recursive: true });
const report = {
  reportName: "Portfolio Media Reference QA",
  generatedAt: new Date().toISOString(),
  summary: summarize(),
  inspected: {
    scanFiles: scanFiles.length,
    references: references.length,
    uniqueReferences: referencesByPath.size,
    mediaFiles: mediaFiles.length
  },
  references: Object.fromEntries([...referencesByPath.entries()].sort(([a], [b]) => a.localeCompare(b))),
  unusedMedia,
  deleteCandidates,
  issues
};
await writeFile(path.join(outDir, "check-media-references.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
await writeFile(path.join(outDir, "check-media-references.md"), markdownReport(report), "utf8");
console.log("qa:refs: wrote output/qa/check-media-references.json and output/qa/check-media-references.md");
console.log(`qa:refs: ${report.summary.BLOCKER} blocker(s), ${report.summary.REVIEW_REQUIRED} review item(s), ${report.summary.WARNING} warning(s)`);
if (report.summary.BLOCKER > 0) process.exitCode = 1;
