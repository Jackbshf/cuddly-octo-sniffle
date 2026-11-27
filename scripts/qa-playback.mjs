import http from "node:http";
import path from "node:path";
import assert from "node:assert/strict";
import { readFile, mkdir, writeFile } from "node:fs/promises";
import { chromium } from "playwright";

const root = path.resolve("dist");
const output = path.resolve(process.env.QA_OUTPUT_DIR || "output/playwright/video-optimization/functional");
await mkdir(output, { recursive: true });
const remote = process.argv[2];
const mime = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".mp4": "video/mp4", ".m3u8": "application/vnd.apple.mpegurl", ".ts": "video/mp2t", ".jpg": "image/jpeg", ".webp": "image/webp", ".avif": "image/avif" };
const server = remote ? null : http.createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, "http://localhost").pathname);
    const file = path.resolve(root, `.${pathname === "/" ? "/index.html" : pathname}`);
    assert.ok(file.startsWith(`${root}${path.sep}`));
    const bytes = await readFile(file);
    const headers = { "Content-Type": mime[path.extname(file)] || "application/octet-stream", "Cache-Control": "public, max-age=3600" };
    const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || "");
    if (range) {
      const start = Number(range[1]);
      const end = Math.min(Number(range[2] || bytes.length - 1), bytes.length - 1);
      response.writeHead(206, { ...headers, "Accept-Ranges": "bytes", "Content-Range": `bytes ${start}-${end}/${bytes.length}`, "Content-Length": end - start + 1 });
      response.end(bytes.subarray(start, end + 1));
    } else { response.writeHead(200, headers); response.end(bytes); }
  } catch { response.writeHead(404).end(); }
});
if (server) await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const base = remote || `http://127.0.0.1:${server.address().port}/`;
const browser = await chromium.launch({ headless: true });
const results = [];
const isMedia = url => /\.(mp4|m3u8|ts)(\?|$)/.test(url);
async function ready(page) {
  const response = await page.goto(base, { waitUntil: "domcontentloaded", timeout: 45000 });
  assert.equal(response.status(), 200);
  await page.waitForFunction(() => window.__portfolioPlayback?.version === "hover-mp4-v2");
}
async function playing(page) {
  await page.waitForFunction(() => {
    const video = document.querySelector("#lb-video");
    return !video.paused && video.readyState >= 2 && video.currentTime > 0.1;
  }, undefined, { timeout: 30000 });
}
try {
  for (const width of [390, 768, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    const page = await context.newPage();
    const errors = [];
    const media = [];
    page.on("pageerror", error => errors.push(error.message));
    page.on("request", request => { if (isMedia(request.url())) media.push(request.url()); });
    await ready(page);
    for (const selector of ["#videos", "#pin-media", "#cases"]) await page.locator(selector).scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    assert.ok(media.every(url => /lunar-rover-(faststart|backdrop)\.mp4$/.test(url)), "Automatic loading should belong to the visible lunar screen");
    await page.locator("#pin-media").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => {
      const video = document.querySelector("#pin-video");
      return !video.paused && video.currentTime > .3;
    }, undefined, { timeout: 30000 });
    if (width > 640) await page.waitForFunction(() => !document.querySelector("#pin-backdrop").paused && document.querySelector("#pin-backdrop").currentTime > .1);
    const lunarStart = await page.locator("#pin-video").evaluate(video => video.currentTime);
    await page.waitForFunction(start => !document.querySelector("#pin-video").paused && Math.abs(document.querySelector("#pin-video").currentTime - start) > .15, lunarStart);
    const lunarEnd = await page.locator("#pin-video").evaluate(video => video.currentTime);
    await page.screenshot({ path: path.join(output, `lunar-autoplay-${width}.png`) });
    await page.locator("#pin-open").click();
    await playing(page);
    assert.equal(await page.locator("#pin-media video[src]").count(), 0, "Modal playback should suspend lunar previews");
    await page.locator("#lb-close").click();
    await page.waitForFunction(() => !document.querySelector("#pin-video").paused && document.querySelector("#pin-video").currentTime > .2);
    await page.locator("#contact").scrollIntoViewIfNeeded();
    await page.waitForFunction(() => [...document.querySelectorAll("#pin-media video")].every(video => video.paused && !video.getAttribute("src")));
    media.length = 0;
    const manifestUrl = await page.locator("script[data-portfolio-playback]").getAttribute("data-manifest");
    const manifestResponse = await page.request.get(new URL(manifestUrl, base).href);
    const manifest = await manifestResponse.json();
    assert.equal(Object.keys(manifest.videos).length, 15);
    assert.ok(!manifest.videos["commercial-animated-street-story"]);
    const entry = manifest.videos["01_air_fryer_wings_00001_"];
    const card = page.locator("#featured .feat").first();
    await card.scrollIntoViewIfNeeded();
    await page.locator(".feat-dot").first().click();
    await card.hover();
    await page.waitForFunction(() => {
      const preview = document.querySelector("#featured .feat video");
      return preview.muted && !preview.paused && preview.currentTime > .1;
    });
    const selectedSource = await card.locator("video").evaluate(video => video.currentSrc);
    assert.equal(await page.locator("video[src]").count(), 1);
    await card.click();
    await playing(page);
    assert.equal(await page.locator("#lb-video").evaluate(video => video.currentSrc), selectedSource);
    assert.equal(await page.locator("video[src]").count(), 1);
    assert.equal(await page.locator(".pl-quality").count(), 0);
    assert.equal(await page.getByText(/流畅版本|切换流畅档/).count(), 0);
    await page.screenshot({ path: path.join(output, `player-${width}.png`) });
    await page.locator("#lb-close").click();
    await page.mouse.move(0, 0);
    assert.equal(await page.locator("video[src]").count(), 0);
    assert.equal(await page.locator("#lb").getAttribute("aria-hidden"), "true");
    const range = await page.request.get(new URL(entry.variants[0].src, base).href, { headers: { Range: "bytes=0-1023" } });
    assert.equal(range.status(), 206);
    assert.equal((await range.body()).length, 1024);
    assert.ok(range.headers()["content-range"].startsWith("bytes 0-1023/"));
    if (remote) {
      const cacheControl = range.headers()["cache-control"];
      assert.equal((cacheControl.match(/max-age=/g) || []).length, 1);
      assert.ok(cacheControl.includes("max-age=31536000"));
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    assert.deepEqual(errors, []);
    results.push({ width, lunarAutoplay: true, lunarProgress: [lunarStart, lunarEnd], hoverPlaying: true, exclusivePlayback: true, unchangedSource: true, range206: true, pageErrors: errors });
    await context.close();
    console.log(`Passed viewport ${width}`);
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await ready(page);
  await page.route("**/480p.mp4", route => route.abort("failed"));
  await page.locator("#featured .feat").first().click();
  await playing(page);
  assert.ok((await page.locator("#lb-video").evaluate(video => video.currentSrc)).endsWith("/360p.mp4"));
  await page.locator("#lb-close").click();
  results.push({ automaticFallback: true });
  await context.close();

  const desktop = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: "no-preference" });
  const hoverPage = await desktop.newPage();
  await ready(hoverPage);
  for (const selector of ["#vg-portrait .vcard[role='button']", ".case-video"]) {
    const card = hoverPage.locator(selector).first();
    const started = Date.now();
    await card.hover();
    await hoverPage.waitForFunction(selector => {
      const preview = document.querySelector(selector).querySelector("video");
      return preview.muted && !preview.paused && preview.currentTime > .1;
    }, selector);
    const hoverPlayingMs = Date.now() - started;
    const continuesAfterNetworkChange = await card.locator("video").evaluate(video => {
      navigator.connection.dispatchEvent(new Event("change"));
      return !video.paused && video.hasAttribute("src");
    });
    assert.ok(continuesAfterNetworkChange, "Network estimate updates should not stop hover playback");
    await hoverPage.mouse.move(0, 0);
    assert.equal(await card.locator("video").evaluate(video => video.paused && !video.hasAttribute("src")), true);
    results.push({ selector, hoverPlayingMs, continuesAfterNetworkChange, releasedOnLeave: true });
  }
  await desktop.close();

  const mobile = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });
  const touchPage = await mobile.newPage();
  await ready(touchPage);
  const touchCard = touchPage.locator("#vg-portrait .vcard[role='button']").first();
  await touchCard.scrollIntoViewIfNeeded();
  assert.equal(await touchPage.locator("[data-preview-id] video[src]").count(), 0);
  await touchCard.tap();
  await playing(touchPage);
  results.push({ touchTapPlaying: true });
  await mobile.close();
  await writeFile(path.join(output, "report.json"), JSON.stringify({ base, passed: true, results }, null, 2));
  console.log(JSON.stringify({ passed: true, results }));
} catch (error) {
  await writeFile(path.join(output, "failure.json"), JSON.stringify({ base, error: error.stack, results }, null, 2));
  throw error;
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
