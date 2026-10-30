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
      pinControls: document.querySelector("#pin-video").controls,
      qrVisible: document.querySelector(".qr-window").getBoundingClientRect().width > 0,
      cases: [...document.querySelectorAll(".cases-rows .case")].map((caseElement) => ({ height: Math.round(caseElement.getBoundingClientRect().height), imageWidth: caseElement.querySelector("img")?.naturalWidth, opacity: getComputedStyle(caseElement).opacity })),
      heading: document.querySelector("h1")?.textContent.trim()
    }));
    await page.screenshot({ path: path.join(output, `${size.name}.png`), fullPage: true });
    await page.locator("#featured .feat").first().click();
    const lightboxOpen = await page.locator("#lb").getAttribute("data-open") === "1";
    await page.locator("#lb-close").click();
    results.push({ size: size.name, status: response.status(), ...metrics, lightboxOpen, errors });
    await context.close();
  }
} finally {
  await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
}
const passed = results.every((r) => r.status === 200 && r.width <= r.viewport && r.galleryCount >= 7 && !r.brokenImages.length && !r.emptyAlts && r.navVisible && r.pinPaused && r.pinControls && r.qrVisible && r.lightboxOpen && !r.errors.console.length && !r.errors.page.length && !r.errors.http.length);
await writeFile(path.join(output, "report.json"), JSON.stringify({ base, passed, results }, null, 2));
console.log(JSON.stringify({ base, passed, results }, null, 2));
if (!passed) process.exitCode = 1;
