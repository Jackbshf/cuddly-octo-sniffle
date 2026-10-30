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
    const data = await readFile(file);
    const headers = { "Content-Type": types[path.extname(file)] || "application/octet-stream", "Cache-Control": "no-store" };
    const range = path.extname(file) === ".mp4" && /^bytes=(\d*)-(\d*)$/.exec(request.headers.range || "");
    if (range) {
      const start = range[1] ? Number(range[1]) : Math.max(0, data.length - Number(range[2]));
      const end = range[2] && range[1] ? Math.min(Number(range[2]), data.length - 1) : data.length - 1;
      if (start < data.length && start <= end) {
        response.writeHead(206, { ...headers, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${data.length}`, "Content-Length": end - start + 1 });
        response.end(data.subarray(start, end + 1));
        return;
      }
    }
    response.writeHead(200, headers);
    response.end(data);
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
    await page.locator("#pin-media").screenshot({ path: path.join(output, `${size.name}-lunar-rover.png`) });
    await page.locator(".ccard-wechat").screenshot({ path: path.join(output, `${size.name}-wechat.png`) });
    const metrics = await page.evaluate(() => ({
      width: document.documentElement.scrollWidth,
      viewport: innerWidth,
      galleryCount: document.querySelectorAll("#gallery-grid .gcard").length,
      brokenImages: [...document.images].filter((image) => image.complete && image.naturalWidth === 0).map((image) => image.src),
      emptyAlts: [...document.images].filter((image) => !image.hasAttribute("alt") || !image.alt.trim()).length,
      navVisible: getComputedStyle(document.querySelector("header nav")).display !== "none",
      contactLinkGone: !document.querySelector('header nav a[href="#contact"]') && document.querySelector("header .cta")?.textContent.trim() === "聊聊合作",
      pinPaused: document.querySelector("#pin-video").paused,
      pinCopyGone: document.querySelectorAll(".pin-cap").length === 0 && !document.querySelector("#pin").textContent.includes("停在最亮的那一帧"),
      pinOpenVisible: document.querySelector("#pin-open").getBoundingClientRect().width > 0,
      qrVisible: document.querySelector(".qr-window").getBoundingClientRect().width > 0,
      cases: [...document.querySelectorAll(".cases-rows .case")].map((caseElement) => ({ height: Math.round(caseElement.getBoundingClientRect().height), videoWidth: caseElement.querySelector("video")?.getBoundingClientRect().width, poster: caseElement.querySelector("video")?.getAttribute("poster"), opacity: getComputedStyle(caseElement).opacity })),
      caseSourcesUnloaded: [...document.querySelectorAll(".case-video video")].every((video) => !video.currentSrc),
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

    const caseVideoOpened = [];
    for (const name of ["pet-cats-product", "pet-golden-product", "pet-orange-cat-product", "pet-dogs-product"]) {
      const button = page.locator(`.case-video[data-video="${name}-faststart"]`);
      await button.click();
      const caseVideoReady = await page.waitForFunction(() => {
        const video = document.querySelector("#lb-video");
        return video.videoWidth === 720 && video.videoHeight === 1280 && video.readyState >= 2;
      }, undefined, { timeout: 12000 }).then(() => true).catch(() => false);
      caseVideoOpened.push(caseVideoReady && await page.locator("#lb-video").evaluate((video, expected) => video.src.endsWith(`${expected}-faststart.mp4`) && getComputedStyle(video).objectFit === "contain", name));
      await page.locator("#lb-close").click();
    }

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
    const pinVideoOpen = await page.locator("#lb-video").evaluate((video) => video.src.includes("lunar-rover-faststart.mp4") && getComputedStyle(video).objectFit === "contain");
    const pinVideoPlaying = await page.waitForFunction(() => {
      const video = document.querySelector("#lb-video");
      return video.videoWidth > 0 && video.readyState >= 2 && video.currentTime > 0;
    }, undefined, { timeout: 20000 }).then(() => true).catch(() => false);
    const playerIconGone = await page.locator("#lb .pl-play").count() === 0;
    await page.locator("#lb-video").click({ position: { x: 30, y: 30 } });
    const playerTapWorks = await page.locator("#lb-video").evaluate((video) => video.paused);
    await page.locator("#lb-video").click({ position: { x: 30, y: 30 } });
    await page.screenshot({ path: path.join(output, `${size.name}-video-viewer.png`) });
    await page.locator("#lb-close").click();

    await page.locator("#vg-portrait .vcard[role='button']").last().click();
    const longVideoOpen = await page.locator("#lb-video").evaluate((video) => video.src.includes("commercial-animated-street-story-faststart.mp4"));
    const longVideoPlaying = await page.waitForFunction(() => {
      const video = document.querySelector("#lb-video");
      return video.videoWidth > 0 && video.readyState >= 2 && video.currentTime > 0;
    }, undefined, { timeout: 20000 }).then(() => true).catch(() => false);
    await page.locator("#lb-video").hover({ position: { x: 30, y: 30 } });
    await page.locator("#lb .bar").click();
    const longVideoSeek = await page.waitForFunction(() => {
      const video = document.querySelector("#lb-video");
      return video.duration > 0 && video.currentTime >= video.duration * 0.45 && video.readyState >= 2;
    }, undefined, { timeout: 10000 }).then(() => true).catch(() => false);
    const longVideoSeekState = await page.locator("#lb-video").evaluate((video) => ({ currentTime: video.currentTime, duration: video.duration, readyState: video.readyState, seeking: video.seeking }));
    await page.locator("#lb-close").click();

    results.push({ size: size.name, status: response.status(), ...metrics, imageViewer, gallerySource, zoomEnabled, imageFocusRestored, longImageScrollable, escapeClosesImage, caseVideoOpened, shelfDragWorks, lightboxOpen, cardVideoOpen, pinVideoOpen, pinVideoPlaying, playerIconGone, playerTapWorks, longVideoOpen, longVideoPlaying, longVideoSeek, longVideoSeekState, errors });
    await context.close();
  }

  const motionContext = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const motionPage = await motionContext.newPage();
  await motionPage.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
  const offscreenPaused = await motionPage.locator("#pin-video").evaluate((video) => video.paused);
  const offscreenUnloaded = await motionPage.locator("#pin-video").evaluate((video) => !video.currentSrc && !video.poster);
  await motionPage.locator("#pin-media").scrollIntoViewIfNeeded();
  const onscreenPlaying = await motionPage.waitForFunction(() => !document.querySelector("#pin-video").paused, undefined, { timeout: 10000 }).then(() => true).catch(() => false);
  const previewSourceCorrect = await motionPage.locator("#pin-video").evaluate((video) => video.currentSrc.includes("lunar-rover-faststart.mp4") && getComputedStyle(video).objectFit === "contain");
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
  motionPolicy = { offscreenPaused, offscreenUnloaded, onscreenPlaying, previewSourceCorrect, pausedAfterScroll, saveDataPaused, saveDataManualOpen };
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
let rangeDelivery = null;
if (remote) {
  rangeDelivery = {};
  for (const [name, filename] of Object.entries({ cats: "pet-cats-product-faststart.mp4", golden: "pet-golden-product-faststart.mp4", orangeCat: "pet-orange-cat-product-faststart.mp4", dogs: "pet-dogs-product-faststart.mp4", rover: "lunar-rover-faststart.mp4", long: "commercial-animated-street-story-faststart.mp4" })) {
    try {
      const response = await fetch(new URL(`showcase/videos/${filename}`, base), {
        headers: { Range: "bytes=0-1023" }, signal: AbortSignal.timeout(20000)
      });
      rangeDelivery[name] = response.status === 206 && (await response.arrayBuffer()).byteLength === 1024 && response.headers.get("content-range")?.startsWith("bytes 0-1023/");
    } catch {
      rangeDelivery[name] = false;
    }
  }
}
const passed = results.every((r) => r.status === 200 && r.width <= r.viewport && r.galleryCount >= 7 && !r.brokenImages.length && !r.emptyAlts && r.navVisible && r.contactLinkGone && r.pinPaused && r.pinCopyGone && r.pinOpenVisible && r.qrVisible && r.cases.length === 4 && r.caseSourcesUnloaded && r.cases.every((item) => item.height > 0 && item.videoWidth > 0 && item.poster) && r.imageViewer.open && r.imageViewer.imageFits && r.imageViewer.source === r.gallerySource && r.zoomEnabled && r.imageFocusRestored && r.longImageScrollable && r.escapeClosesImage && r.caseVideoOpened.length === 4 && r.caseVideoOpened.every(Boolean) && r.shelfDragWorks && r.lightboxOpen && r.cardVideoOpen && r.pinVideoOpen && r.pinVideoPlaying && r.playerIconGone && r.playerTapWorks && r.longVideoOpen && r.longVideoPlaying && r.longVideoSeek && !r.errors.console.length && !r.errors.page.length && !r.errors.http.length) && Object.values(motionPolicy).every(Boolean) && (!remote || Object.values(rangeDelivery).every(Boolean));
await writeFile(path.join(output, "report.json"), JSON.stringify({ base, passed, motionPolicy, rangeDelivery, results }, null, 2));
console.log(JSON.stringify({ base, passed, motionPolicy, rangeDelivery, results }, null, 2));
if (!passed) process.exitCode = 1;
