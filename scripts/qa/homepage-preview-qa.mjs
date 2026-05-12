import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { chromium } from "playwright";

const args = process.argv.slice(2);
const getArg = (name, fallback = "") => {
  const index = args.indexOf(name);
  return index >= 0 && args[index + 1] ? args[index + 1] : fallback;
};

const targetUrl = getArg("--url");
const outputDir = path.resolve(getArg("--output", "output/qa/homepage-visual-upgrade-preview"));

if (!targetUrl) {
  console.error("Usage: node scripts/qa/homepage-preview-qa.mjs --url <preview-url> [--output <dir>]");
  process.exit(1);
}

const viewports = [
  { name: "desktop-1440x1000", width: 1440, height: 1000 },
  { name: "tablet-768x1024", width: 768, height: 1024 },
  { name: "mobile-390x844", width: 390, height: 844 }
];

const isIgnorableRequestFailure = (request) => {
  const url = request.url();
  return url.startsWith("data:") || url.startsWith("blob:");
};

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const results = [];

try {
  for (const viewport of viewports) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      deviceScaleFactor: 1
    });
    const page = await context.newPage();
    const consoleErrors = [];
    const pageErrors = [];
    const requestFailures = [];

    page.on("console", (message) => {
      if (message.type() === "error") {
        consoleErrors.push({ text: message.text(), location: message.location() });
      }
    });
    page.on("pageerror", (error) => {
      pageErrors.push(error.message || String(error));
    });
    page.on("requestfailed", (request) => {
      if (!isIgnorableRequestFailure(request)) {
        requestFailures.push({
          url: request.url(),
          method: request.method(),
          failure: request.failure()?.errorText || "request failed"
        });
      }
    });

    const response = await page.goto(targetUrl, { waitUntil: "networkidle", timeout: 60000 });
    await page.waitForSelector("body", { timeout: 15000 });
    await page.waitForTimeout(900);

    const screenshotPath = path.join(outputDir, `${viewport.name}.png`);
    await page.screenshot({ path: screenshotPath, fullPage: true });

    const metrics = await page.evaluate(() => {
      const root = document.documentElement;
      const body = document.body;
      const scrollWidth = Math.max(root.scrollWidth, body?.scrollWidth || 0);
      const clientWidth = root.clientWidth;
      const brokenImages = Array.from(document.images)
        .filter((image) => image.currentSrc && (!image.complete || image.naturalWidth === 0))
        .map((image) => ({
          src: image.currentSrc,
          alt: image.getAttribute("alt") || ""
        }));
      return {
        title: document.title,
        scrollWidth,
        clientWidth,
        horizontalOverflow: Math.max(0, scrollWidth - clientWidth),
        brokenImages
      };
    });

    const result = {
      viewport,
      status: response?.status() || 0,
      url: page.url(),
      screenshotPath,
      consoleErrors,
      pageErrors,
      requestFailures,
      ...metrics
    };
    results.push(result);
    await context.close();
  }
} finally {
  await browser.close();
}

const summary = {
  targetUrl,
  checkedAt: new Date().toISOString(),
  results
};

const summaryPath = path.join(outputDir, "summary.json");
await writeFile(summaryPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");

const failures = results.flatMap((result) => {
  const items = [];
  if (result.status !== 200) items.push(`${result.viewport.name}: HTTP ${result.status}`);
  if (result.consoleErrors.length) items.push(`${result.viewport.name}: ${result.consoleErrors.length} console errors`);
  if (result.pageErrors.length) items.push(`${result.viewport.name}: ${result.pageErrors.length} page errors`);
  if (result.requestFailures.length) items.push(`${result.viewport.name}: ${result.requestFailures.length} request failures`);
  if (result.horizontalOverflow > 0) items.push(`${result.viewport.name}: horizontal overflow ${result.horizontalOverflow}px`);
  if (result.brokenImages.length) items.push(`${result.viewport.name}: ${result.brokenImages.length} broken images`);
  return items;
});

console.log(JSON.stringify({
  targetUrl,
  summaryPath,
  screenshots: results.map((result) => result.screenshotPath),
  status: failures.length ? "failed" : "passed",
  failures
}, null, 2));

if (failures.length) {
  process.exitCode = 1;
}
