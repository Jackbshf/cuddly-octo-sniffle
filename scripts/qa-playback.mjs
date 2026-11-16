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
  await page.waitForFunction(() => window.__portfolioPlayback?.version === "exclusive-v1");
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
    assert.deepEqual(media, [], "Scrolling should load posters only");
    const manifestUrl = await page.locator("script[data-portfolio-playback]").getAttribute("data-manifest");
    const manifestResponse = await page.request.get(new URL(manifestUrl, base).href);
    const manifest = await manifestResponse.json();
    assert.equal(Object.keys(manifest.videos).length, 16);
    assert.ok(Object.values(manifest.videos).every(entry => entry.variants.length >= 2));
    const entry = manifest.videos["01_air_fryer_wings_00001_"];
    const card = page.locator("#featured .feat").first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForFunction(() => window.__portfolioPlayback.inspect().warmed === "01_air_fryer_wings_00001_");
    const warmedSource = await page.locator("#lb-video").getAttribute("src");
    await card.click();
    await playing(page);
    assert.equal(await page.locator("#lb-video").getAttribute("src"), warmedSource, "Click should reuse prewarmed source");
    assert.ok(media.every(url => url.includes(new URL(entry.variants[0].src, base).pathname)), "Only the selected video should load");
    assert.equal(await page.locator("video[src]").count(), 1);
    const beforeSwitch = await page.locator("#lb-video").evaluate(video => video.currentTime);
    await page.locator(".pl-quality").selectOption(entry.variants.at(-1).label);
    await playing(page);
    const afterSwitch = await page.locator("#lb-video").evaluate(video => ({ currentTime: video.currentTime, quality: video.dataset.quality, width: video.videoWidth, height: video.videoHeight }));
    assert.ok(afterSwitch.currentTime >= beforeSwitch - 0.1, "Quality change should retain playback position");
    assert.equal(afterSwitch.quality, entry.variants.at(-1).label);
    assert.equal(afterSwitch.width, entry.variants.at(-1).width);
    await page.screenshot({ path: path.join(output, `player-${width}.png`) });
    await page.locator("#lb-close").click();
    await page.mouse.move(0, 0);
    await page.waitForTimeout(800);
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
    results.push({ width, posterOnlyScrolling: true, exclusivePlayback: true, warmReuse: true, qualitySwitch: afterSwitch, range206: true, pageErrors: errors });
    await context.close();
    console.log(`Passed viewport ${width}`);
  }

  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  const page = await context.newPage();
  await ready(page);
  await page.locator('#vg-portrait .vcard[role="button"]').last().click();
  await playing(page);
  assert.equal(await page.evaluate(() => window.__portfolioPlayback.inspect().transport), "hls");
  assert.ok(await page.locator("#lb-video").evaluate(video => video.currentSrc.startsWith("blob:")), "Chromium should use the verified MSE HLS path");
  await page.locator("#lb-video").evaluate(video => { video.currentTime = 50; });
  await page.waitForFunction(() => document.querySelector("#lb-video").currentTime >= 50 && document.querySelector("#lb-video").readyState >= 2);
  await page.locator(".pl-quality").selectOption("480p");
  await playing(page);
  await page.screenshot({ path: path.join(output, "long-hls-seek.png") });
  await page.locator("#lb-close").click();
  await page.evaluate(() => {
    window.__openLightbox({ f: "commercial-skincare-elixir-water", title: "切换测试 A", meta: "QA" });
    window.__openLightbox({ f: "pet-cats-product-faststart", title: "切换测试 B", meta: "QA" });
    window.__portfolioPlayback.close();
  });
  await page.waitForTimeout(1000);
  assert.equal(await page.locator("video[src]").count(), 0);
  assert.equal(await page.evaluate(() => window.__portfolioPlayback.inspect().id), null);
  await page.route("**/master.m3u8", route => route.fulfill({ status: 503, contentType: "text/plain", body: "QA controlled HLS failure" }));
  await page.locator('#vg-portrait .vcard[role="button"]').last().click();
  await playing(page);
  assert.equal(await page.evaluate(() => window.__portfolioPlayback.inspect().transport), "mp4");
  await page.screenshot({ path: path.join(output, "hls-mp4-fallback.png") });
  results.push({ longHls: true, longSeek: true, rapidSwitchCleanup: true, hlsFailureFallback: true });
  await context.close();
  await writeFile(path.join(output, "report.json"), JSON.stringify({ base, passed: true, results }, null, 2));
  console.log(JSON.stringify({ passed: true, results }));
} catch (error) {
  await writeFile(path.join(output, "failure.json"), JSON.stringify({ base, error: error.stack, results }, null, 2));
  throw error;
} finally {
  await browser.close();
  if (server) await new Promise(resolve => server.close(resolve));
}
