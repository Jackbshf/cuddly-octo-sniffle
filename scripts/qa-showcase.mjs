import http from "node:http";
import path from "node:path";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const root = path.resolve("dist");
const output = path.resolve(process.env.QA_OUTPUT_DIR?.trim() || "output/playwright/showcase-release");
const remote = process.argv[2];
const types = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif", ".mp4": "video/mp4" };
const sizes = [{ name: "mobile-390", width: 390, height: 844 }, { name: "tablet-768", width: 768, height: 1024 }, { name: "desktop-1440", width: 1440, height: 1000 }];

const server = remote ? null : http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, "http://localhost");
    const relative = decodeURIComponent(url.pathname === "/" ? "/index.html" : url.pathname);
    const file = path.resolve(root, `.${relative}`);
    if (!file.startsWith(`${root}${path.sep}`)) throw new Error("Invalid path");
    await stat(file);
    response.writeHead(200, { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" });
    response.end(await readFile(file));
  } catch {
    response.writeHead(404);
    response.end();
  }
});

await mkdir(output, { recursive: true });
if (server) await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const base = remote || `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
const results = [];
let motionPolicy = {};
try {
  for (const size of sizes) {
    const context = await browser.newContext({ viewport: { width: size.width, height: size.height }, reducedMotion: "reduce" });
    const page = await context.newPage();
    const errors = { console: [], page: [], http: [] };
    page.on("console", (message) => { if (message.type() === "error") errors.console.push(message.text()); });
    page.on("pageerror", (error) => errors.page.push(error.message));
    page.on("response", (response) => { if (response.status() >= 400 && new URL(response.url()).origin === new URL(base).origin) errors.http.push(`${response.status()} ${response.url()}`); });
    const response = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.locator("#gallery-grid .gcard").first().waitFor();
    for (const selector of ["#videos", "#cases", "#gallery", "#workflow", "#contact"]) {
      await page.locator(selector).scrollIntoViewIfNeeded();
      await page.waitForTimeout(120);
    }
    for (const image of await page.locator("img").all()) {
      await image.scrollIntoViewIfNeeded();
      await image.evaluate((element) => element.decode().catch(() => {}));
    }
    await page.locator("#cases").screenshot({ path: path.join(output, `${size.name}-cases.png`) });
    await page.locator(".ccard-wechat").screenshot({ path: path.join(output, `${size.name}-wechat.png`) });
    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      galleryCount: document.querySelectorAll("#gallery-grid .gcard").length,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
      emptyAlts: [...document.images].filter((image) => !image.hasAttribute("alt") || !image.alt.trim()).length,
      navVisible: getComputedStyle(document.querySelector("header nav")).display !== "none",
      pinPaused: document.querySelector("#pin-video").paused,
      pinCopyGone: document.querySelectorAll(".pin-cap").length === 0 && !document.querySelector("#pin").textContent.includes("停在最亮的那一帧"),
      pinOpenVisible: document.querySelector("#pin-open").getBoundingClientRect().width > 0,
      qrVisible: document.querySelector(".qr-window").getBoundingClientRect().width > 0,
      cases: [...document.querySelectorAll(".cases-rows .case")].map((caseElement) => ({ height: Math.round(caseElement.getBoundingClientRect().height), imageWidth: caseElement.querySelector("img")?.naturalWidth, opacity: getComputedStyle(caseElement).opacity })),
      heading: document.querySelector("h1")?.textContent.trim()
    }));
    await page.screenshot({ path: path.join(output, `${size.name}.png`), fullPage: true });

    const galleryCard = page.locator("#gallery-grid .gcard").first();
    const gallerySource = await galleryCard.locator("img").getAttribute("src");
    await galleryCard.click();
    const imageViewer = await page.locator("#image-viewer").evaluate((dialog) => ({ open: dialog.open, title: dialog.querySelector("#image-viewer-title").textContent, source: dialog.querySelector("img")?.getAttribute("src"), imageFits: dialog.querySelector("img")?.getBoundingClientRect().width <= innerWidth && dialog.querySelector("img")?.getBoundingClientRect().height <= innerHeight }));
    await page.screenshot({ path: path.join(output, `${size.name}-image-viewer.png`) });
    await page.locator("#image-viewer-zoom").click();
    const zoomEnabled = await page.locator("#image-viewer").getAttribute("data-zoom") === "1";
    await page.locator("#image-viewer-close").click();
    const imageFocusRestored = await galleryCard.evaluate((card) => document.activeElement === card);

    await page.locator("#gallery-grid .gcard").nth(2).click();
    await page.locator("#image-viewer-zoom").click();
    const longImageScrollable = await page.locator("#image-viewer-scroll").evaluate((scroll) => scroll.scrollHeight > scroll.clientHeight);
    await page.keyboard.press("Escape");
    const escapeClosesImage = await page.locator("#image-viewer").evaluate((dialog) => !dialog.open);

    await page.locator(".cases-rows .case img").first().focus();
    await page.keyboard.press("Enter");
    const caseImageOpened = await page.locator("#image-viewer").evaluate((dialog) => dialog.open && dialog.querySelector("img")?.src.includes("case-product-earbuds"));
    await page.locator("#image-viewer-close").click();

    const shelf = page.locator("#gallery-grid");
    await shelf.scrollIntoViewIfNeeded();
    await shelf.evaluate((element) => { element.scrollLeft = 0; });
    const shelfBox = await shelf.boundingBox();
    await page.mouse.move(shelfBox.x + Math.min(shelfBox.width - 25, 250), shelfBox.y + 120);
    await page.mouse.down();
    await page.mouse.move(shelfBox.x + 25, shelfBox.y + 120, { steps: 8 });
    await page.mouse.up();
    const shelfDragWorks = await shelf.evaluate((element) => element.scrollLeft > 20);

    await page.locator("#featured .feat").first().click();
    const lightboxOpen = await page.locator("#lb").evaluate((modal) => modal.getAttribute("data-open") === "1" && modal.querySelector("video")?.src.endsWith(".mp4") && getComputedStyle(modal.querySelector("video")).objectFit === "contain");
    await page.locator("#lb-close").click();

    await page.locator("#vg-portrait .vcard[role='button']").first().click();
    const cardVideoOpen = await page.locator("#lb").getAttribute("data-open") === "1";
    await page.locator("#lb-close").click();

    await page.locator("#pin-open").click();
    const pinVideoOpen = await page.locator("#lb-video").evaluate((video) => video.src.includes("03_electric_suv_studio_2x.mp4") && getComputedStyle(video).objectFit === "contain");
    await page.screenshot({ path: path.join(output, `${size.name}-video-viewer.png`) });
    await page.locator("#lb-close").click();

    results.push({ size: size.name, status: response.status(), ...metrics, imageViewer, gallerySource, zoomEnabled, imageFocusRestored, longImageScrollable, escapeClosesImage, caseImageOpened, shelfDragWorks, lightboxOpen, cardVideoOpen, pinVideoOpen, errors });
    await context.close();
  }

  const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
  const offscreenPaused = await motionPage.locator("#pin-video").evaluate((video) => video.paused);
  await motionPage.locator("#pin-media").scrollIntoViewIfNeeded();
  const onscreenPlaying = await motionPage.waitForFunction(() => !document.querySelector("#pin-video").paused, undefined, { timeout: 10000 }).then(() => true).catch(() => false);
  await motionPage.locator("#contact").scrollIntoViewIfNeeded();
  const pausedAfterScroll = await motionPage.waitForFunction(() => document.querySelector("#pin-video").paused, undefined, { timeout: 3000 }).then(() => true).catch(() => false);
  await motionContext.close();

  const saveDataContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  await saveDataContext.addInitScript(() => { Object.defineProperty(navigator, "connection", { configurable: true, value: { saveData: true } }); });
  const saveDataPage = await saveDataContext.newPage();
  await saveDataPage.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
  await saveDataPage.locator("#pin-media").scrollIntoViewIfNeeded();
  await saveDataPage.waitForTimeout(400);
  const saveDataPaused = await saveDataPage.locator("#pin-video").evaluate((video) => navigator.connection?.saveData === true && video.paused);
  await saveDataPage.locator("#pin-open").click();
  const saveDataManualOpen = await saveDataPage.locator("#lb").getAttribute("data-open") === "1";
  await saveDataContext.close();
  motionPolicy = { offscreenPaused, onscreenPlaying, pausedAfterScroll, saveDataPaused, saveDataManualOpen };
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
const passed = results.every((r) => r.status === 200 && r.width <= r.viewport && r.galleryCount >= 7 && !r.brokenImages.length && !r.emptyAlts && r.navVisible && r.pinPaused && r.pinCopyGone && r.pinOpenVisible && r.qrVisible && r.imageViewer.open && r.imageViewer.imageFits && r.imageViewer.source === r.gallerySource && r.zoomEnabled && r.imageFocusRestored && r.longImageScrollable && r.escapeClosesImage && r.caseImageOpened && r.shelfDragWorks && r.lightboxOpen && r.cardVideoOpen && r.pinVideoOpen && !r.errors.console.length && !r.errors.page.length && !r.errors.http.length) && Object.values(motionPolicy).every(Boolean);
await writeFile(path.join(output, "report.json"), JSON.stringify({ base, passed, motionPolicy, results }, null, 2));
console.log(JSON.stringify({ base, passed, motionPolicy, results }, null, 2));
if (!passed) process.exitCode = 1;
