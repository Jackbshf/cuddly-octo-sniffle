import http from "node:http";
import path from "node:path";
import process from "node:process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const cliUrl = process.argv.find((argument) => /^https?:\/\//i.test(argument));
const requestedUrl = process.env.QA_URL?.trim() || cliUrl || "";
const outputDir = path.resolve(process.env.QA_OUTPUT_DIR?.trim() || "output/preview-qa");
const reportPath = path.join(outputDir, "preview-qa-report.json");
const staticRoot = path.resolve("dist");
const viewports = [
  { name: "mobile-390", width: 390, height: 844 },
  { name: "tablet-768", width: 768, height: 1024 },
  { name: "desktop-1440", width: 1440, height: 1000 }
];

const mimeTypes = new Map([
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".css", "text/css; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".xml", "application/xml; charset=utf-8"],
  [".webp", "image/webp"],
  [".avif", "image/avif"],
  [".png", "image/png"],
  [".jpg", "image/jpeg"],
  [".jpeg", "image/jpeg"],
  [".svg", "image/svg+xml"],
  [".mp4", "video/mp4"],
  [".woff2", "font/woff2"]
]);

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

const createStaticServer = () => http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    let filePath = path.resolve(staticRoot, `.${pathname}`);
    if (!filePath.startsWith(staticRoot)) throw new Error("Path outside dist");
    try {
      const info = await stat(filePath);
      if (info.isDirectory()) filePath = path.join(filePath, "index.html");
    } catch {
      filePath = path.join(staticRoot, "index.html");
    }
    const body = await readFile(filePath);
    response.writeHead(200, {
      "Content-Type": mimeTypes.get(path.extname(filePath).toLowerCase()) || "application/octet-stream",
      "Cache-Control": "no-store"
    });
    response.end(body);
  } catch (error) {
    response.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    response.end(String(error));
  }
});

const collectBrowserErrors = (page) => {
  const consoleErrors = [];
  const pageErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => pageErrors.push(error.message));
  return { consoleErrors, pageErrors };
};

const navigateToApp = async (page, baseUrl) => {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      await page.goto(baseUrl, { waitUntil: "domcontentloaded", timeout: 45_000 });
      await page.waitForSelector("#main-content.curated-page", { state: "attached", timeout: 20_000 });
      await page.waitForTimeout(1_200);
      return attempt;
    } catch (error) {
      lastError = error;
      if (attempt < 3) await sleep(attempt * 3_000);
    }
  }
  throw new Error(`navigation failed after 3 attempts: ${lastError?.message || lastError}`);
};

const readInlineVideoState = (page) => page.evaluate(() => {
  const video = document.querySelector(".curated-video-inline-video");
  if (!video) return null;
  const rect = video.getBoundingClientRect();
  return {
    muted: video.muted,
    paused: video.paused,
    currentTime: Number(video.currentTime.toFixed(3)),
    readyState: video.readyState,
    source: video.currentSrc || video.src,
    inViewport: rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth
  };
});

const measurePlayback = async (page, delay = 1_200) => {
  const before = await readInlineVideoState(page);
  await page.waitForTimeout(delay);
  const after = await readInlineVideoState(page);
  return {
    before,
    after,
    delta: before && after ? Number((after.currentTime - before.currentTime).toFixed(3)) : null
  };
};

const scrollVideoIntoView = async (page) => {
  const videoSection = page.locator("#videos");
  if (!(await videoSection.count())) throw new Error("#videos section is missing");
  await videoSection.scrollIntoViewIfNeeded();
  await page.waitForTimeout(1_800);
};

const scrollThroughPage = async (page) => {
  await page.evaluate(async () => {
    const step = Math.max(480, Math.floor(window.innerHeight * 0.75));
    for (let top = 0; top < document.documentElement.scrollHeight; top += step) {
      window.scrollTo(0, top);
      await new Promise((resolve) => setTimeout(resolve, 80));
    }
    window.scrollTo(0, document.documentElement.scrollHeight);
  });
  await page.waitForTimeout(1_000);
};

const readPageMetrics = (page) => page.evaluate(() => {
  const visible = (element) => Boolean(element && (element.offsetWidth || element.offsetHeight || element.getClientRects().length));
  const navLabels = [...document.querySelectorAll(".curated-topbar a, .curated-topbar button")]
    .map((item) => item.textContent.trim())
    .filter(Boolean);
  const images = [...document.images];
  const brokenImages = images
    .filter((image) => image.complete && image.naturalWidth === 0)
    .map((image) => image.currentSrc || image.src);
  const incompleteImages = images
    .filter((image) => !image.complete)
    .map((image) => image.currentSrc || image.src);
  const imagePreload = document.querySelector('link[rel="preload"][as="image"][type="image/avif"]');
  const heroAvifSource = document.querySelector('.curated-hero-stage-wrap picture source[type="image/avif"]');
  const heroImage = document.querySelector(".curated-hero-stage-wrap picture img");
  const imagePreloadHref = imagePreload?.getAttribute("href") || "";
  const heroAvifSrcSet = heroAvifSource?.getAttribute("srcset") || "";
  const heroCurrentSrc = heroImage?.currentSrc || "";
  return {
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    brokenImages,
    incompleteImages,
    missingAlt: document.querySelectorAll("img:not([alt])").length,
    emptyAltWithoutAriaHidden: [...document.querySelectorAll('img[alt=""]')]
      .filter((image) => image.getAttribute("aria-hidden") !== "true").length,
    imagePreloadHref,
    heroAvifSrcSet,
    heroCurrentSrc,
    preloadMatchesHeroAvif: Boolean(
      imagePreloadHref
      && heroAvifSrcSet
      && new URL(imagePreloadHref, location.href).href === new URL(heroAvifSrcSet, location.href).href
    ),
    heroAvifSelected: /\.avif(?:$|[?#])/i.test(heroCurrentSrc),
    phoneVisible: [...document.querySelectorAll('a[href^="tel:"]')].some(visible),
    availabilityVisible: [...document.querySelectorAll(".curated-contact-card")]
      .some((item) => item.textContent.includes("1 周内可到岗") && visible(item)),
    ecommerceSectionPresent: Boolean(document.querySelector("#ecommerce")),
    ecommerceNavPresent: navLabels.some((label) => label.includes("套图") || label.includes("电商")),
    patchNoticePresent: document.body.innerText.includes("本页已应用 4 处改动")
      || document.body.innerText.includes("本页已应用")
  };
});

const runPolicyScenario = async (browser, baseUrl, viewport, policy) => {
  const context = await browser.newContext({ viewport });
  if (policy === "save-data") {
    await context.addInitScript(() => {
      const listeners = new Set();
      const connection = {
        saveData: true,
        effectiveType: "2g",
        downlink: 0.3,
        rtt: 1_400,
        addEventListener(type, listener) {
          if (type === "change") listeners.add(listener);
        },
        removeEventListener(type, listener) {
          if (type === "change") listeners.delete(listener);
        }
      };
      Object.defineProperty(navigator, "connection", { configurable: true, get: () => connection });
    });
  }
  const page = await context.newPage();
  if (policy === "reduced-motion") await page.emulateMedia({ reducedMotion: "reduce" });
  const browserErrors = collectBrowserErrors(page);
  try {
    const navigationAttempts = await navigateToApp(page, baseUrl);
    await scrollVideoIntoView(page);
    const automatic = await measurePlayback(page);
    const autoPlaybackBlocked = Boolean(automatic.after?.paused && Math.abs(automatic.delta || 0) <= 0.05);
    const playButton = page.locator(".curated-video-inline-play");
    let manualPlayback = { attempted: false, possible: false, before: null, after: null, delta: null };
    if (await playButton.count() && await playButton.isVisible()) {
      const before = await readInlineVideoState(page);
      await playButton.click();
      await page.waitForTimeout(1_200);
      const after = await readInlineVideoState(page);
      const delta = before && after ? Number((after.currentTime - before.currentTime).toFixed(3)) : null;
      manualPlayback = {
        attempted: true,
        possible: Boolean(after && !after.paused && delta > 0.2),
        before,
        after,
        delta
      };
    }
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    const offscreen = await measurePlayback(page, 900);
    const offscreenPaused = Boolean(offscreen.after?.paused && Math.abs(offscreen.delta || 0) <= 0.05);
    return {
      policy,
      navigationAttempts,
      autoPlaybackBlocked,
      automatic,
      manualPlayback,
      offscreenPaused,
      offscreen,
      ...browserErrors
    };
  } finally {
    await context.close();
  }
};

const runViewport = async (browser, baseUrl, viewport) => {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  const browserErrors = collectBrowserErrors(page);
  try {
    const navigationAttempts = await navigateToApp(page, baseUrl);
    await scrollVideoIntoView(page);
    const enteredViewport = await measurePlayback(page);
    const enteredViewportPlayback = Boolean(
      enteredViewport.after
      && !enteredViewport.after.paused
      && enteredViewport.delta > 0.2
    );
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(700);
    const offscreen = await measurePlayback(page, 900);
    const offscreenPaused = Boolean(offscreen.after?.paused && Math.abs(offscreen.delta || 0) <= 0.05);
    await scrollThroughPage(page);
    const metrics = await readPageMetrics(page);
    const screenshotName = `${viewport.name}.png`;
    await page.screenshot({ path: path.join(outputDir, screenshotName), fullPage: true });
    const reducedMotion = await runPolicyScenario(browser, baseUrl, viewport, "reduced-motion");
    const saveData = await runPolicyScenario(browser, baseUrl, viewport, "save-data");
    return {
      ...viewport,
      navigationAttempts,
      screenshot: screenshotName,
      ...metrics,
      enteredViewportPlayback,
      enteredViewport,
      offscreenPaused,
      offscreen,
      reducedMotion,
      saveData,
      ...browserErrors
    };
  } finally {
    await context.close();
  }
};

const addViewportFailures = (failures, viewport) => {
  const prefix = viewport.name;
  if (viewport.error) {
    failures.push(`${prefix}: ${viewport.error}`);
    return;
  }
  if (viewport.horizontalOverflow) failures.push(`${prefix}: horizontal overflow (${viewport.scrollWidth} > ${viewport.width})`);
  if (viewport.brokenImages.length) failures.push(`${prefix}: ${viewport.brokenImages.length} broken image(s)`);
  if (viewport.missingAlt !== 0) failures.push(`${prefix}: ${viewport.missingAlt} image(s) missing alt`);
  if (viewport.emptyAltWithoutAriaHidden !== 0) failures.push(`${prefix}: ${viewport.emptyAltWithoutAriaHidden} invalid empty alt image(s)`);
  if (!viewport.phoneVisible) failures.push(`${prefix}: phone contact is not visible`);
  if (!viewport.availabilityVisible) failures.push(`${prefix}: availability is not visible`);
  if (viewport.ecommerceSectionPresent) failures.push(`${prefix}: ecommerce section is present`);
  if (viewport.ecommerceNavPresent) failures.push(`${prefix}: ecommerce navigation is present`);
  if (viewport.patchNoticePresent) failures.push(`${prefix}: patch notice is present`);
  if (!viewport.preloadMatchesHeroAvif) failures.push(`${prefix}: hero AVIF preload does not match the picture source`);
  if (!viewport.heroAvifSelected) failures.push(`${prefix}: browser did not select the hero AVIF source`);
  if (!viewport.enteredViewportPlayback) failures.push(`${prefix}/normal: in-viewport autoplay did not advance`);
  if (!viewport.offscreenPaused) failures.push(`${prefix}/normal: playback continued offscreen`);
  if (viewport.consoleErrors.length) failures.push(`${prefix}/normal: ${viewport.consoleErrors.length} console error(s)`);
  if (viewport.pageErrors.length) failures.push(`${prefix}/normal: ${viewport.pageErrors.length} page error(s)`);
  for (const scenario of [viewport.reducedMotion, viewport.saveData]) {
    const scenarioPrefix = `${prefix}/${scenario.policy}`;
    if (!scenario.autoPlaybackBlocked) failures.push(`${scenarioPrefix}: autoplay was not blocked`);
    if (!scenario.manualPlayback.attempted || !scenario.manualPlayback.possible) failures.push(`${scenarioPrefix}: manual playback did not advance`);
    if (!scenario.offscreenPaused) failures.push(`${scenarioPrefix}: manual playback continued offscreen`);
    if (scenario.consoleErrors.length) failures.push(`${scenarioPrefix}: ${scenario.consoleErrors.length} console error(s)`);
    if (scenario.pageErrors.length) failures.push(`${scenarioPrefix}: ${scenario.pageErrors.length} page error(s)`);
  }
};

await mkdir(outputDir, { recursive: true });
let server;
let baseUrl = requestedUrl;
if (!baseUrl) {
  server = createStaticServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}/`;
}

const report = {
  baseUrl,
  mode: requestedUrl ? "remote" : "local-static",
  createdAt: new Date().toISOString(),
  viewports: [],
  failures: []
};
const browser = await chromium.launch({ headless: true });
try {
  for (const viewport of viewports) {
    try {
      report.viewports.push(await runViewport(browser, baseUrl, viewport));
    } catch (error) {
      report.viewports.push({ ...viewport, error: error?.stack || String(error) });
    }
  }
  for (const viewport of report.viewports) addViewportFailures(report.failures, viewport);
  report.passed = report.failures.length === 0;
  await writeFile(reportPath, JSON.stringify(report, null, 2), "utf8");
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}

console.log(JSON.stringify({
  passed: report.passed,
  baseUrl: report.baseUrl,
  reportPath,
  screenshots: report.viewports.map((viewport) => viewport.screenshot).filter(Boolean),
  failures: report.failures
}, null, 2));
if (!report.passed) {
  for (const failure of report.failures) console.error(`QA_FAIL ${failure}`);
  process.exit(1);
}
