import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  collectLocalVideoSourcePaths,
  getCanonicalSiteUrl,
  getStreamManifestPath,
  isReadyStreamManifestEntry,
  loadRepoPortfolioModel,
  normalizeRepoVideoPath,
  readStreamManifest,
  resolveRepoAssetPath
} from "./lib.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_REPO_ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_OUTPUT_RELATIVE_PATH = "dist/stream-audit-summary.json";
const TARGET_SECTIONS = [
  { label: "项目5", title: "30s E-commerce Ad | 30秒电商创意广告" },
  { label: "项目6", title: "AI Spokesperson | 虚拟代言人系统" },
  { label: "项目8", title: "Free Topic Commercial | 自由选题" }
];

const parseCliArgs = (argv) => {
  const options = {};
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const nextValue = argv[index + 1] && !argv[index + 1].startsWith("--") ? argv[index + 1] : undefined;
    if (arg === "--repo-root" && nextValue) options.repoRoot = nextValue;
    if (arg === "--site-url" && nextValue) options.siteUrl = nextValue;
    if (arg === "--output-file" && nextValue) options.outputFile = nextValue;
    if (nextValue !== undefined) index += 1;
  }
  return options;
};

const fetchJson = async (url) => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to fetch ${url}: ${response.status} ${response.statusText}`);
  return response.json();
};

const chooseSuggestion = (entries, portfolioModel, consoleErrors, hasMp4Requests) => {
  const suggestions = [];
  const highBitrateCandidates = entries.filter((entry) => Number(entry.approxMegabytesPerSecond || 0) > 0.45);
  if (highBitrateCandidates.length) {
    suggestions.push({
      category: "码率与分辨率",
      summary: `这些视频单位时长体积偏高，建议补一版更轻的上传源：${highBitrateCandidates.map((entry) => entry.sourcePath).join(", ")}`
    });
  }

  const autoplayCandidates = (Array.isArray(portfolioModel?.slides) ? portfolioModel.slides : []).filter((slide) => [17, 18, 20, 21, 27].includes(Number(slide?.id)));
  if (autoplayCandidates.length) {
    suggestions.push({
      category: "自动播策略",
      summary: `全幅展示和讲解类视频可继续保留 hover/进入可视区触发，优先关注这些区块：${autoplayCandidates.map((slide) => `${slide.id}:${slide.title}`).join(" | ")}`
    });
  }

  const posterCandidates = entries.filter((entry) => !entry.thumbnailUrl);
  if (posterCandidates.length) {
    suggestions.push({
      category: "封面与预告片",
      summary: `以下 Stream 交付项还缺稳定 thumbnailUrl，建议补轻量封面：${posterCandidates.map((entry) => entry.sourcePath).join(", ")}`
    });
  }

  if (hasMp4Requests || consoleErrors.some((entry) => /iframe|cross-origin|bilibili/i.test(entry.text))) {
    suggestions.push({
      category: "第三方 iframe 噪音",
      summary: "外部 iframe 仍可能产生可忽略噪音，建议继续把外链播放器隔离到更低优先级区块，并保持主站本地视频全部走 Stream。"
    });
  }

  return suggestions;
};

const inspectSectionPlayback = async (page, title) => {
  const section = page.locator("section").filter({ hasText: title }).first();
  if (!await section.count()) {
    return {
      title,
      located: false,
      readyBeforeView: false,
      hoverPlayWorks: false,
      hoverStopWorks: false,
      fullscreenWorks: false
    };
  }

  await section.scrollIntoViewIfNeeded();
  await page.waitForTimeout(800);
  const video = section.locator("video").first();
  const located = await video.count() > 0;
  if (!located) {
    return {
      title,
      located: true,
      readyBeforeView: false,
      hoverPlayWorks: false,
      hoverStopWorks: false,
      fullscreenWorks: false
    };
  }

  const readyBeforeView = await video.evaluate((node) => Number(node.readyState || 0) >= 1);
  const box = await video.boundingBox();
  if (box) {
    await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2));
    await page.waitForTimeout(1200);
  }
  const hoverPlayWorks = await video.evaluate((node) => !node.paused);

  let fullscreenWorks = false;
  try {
    const actionResult = await section.evaluate((sectionNode) => {
      const buttons = Array.from(sectionNode.querySelectorAll("button"));
      const target = buttons[buttons.length - 1];
      if (!target) return false;
      target.click();
      return true;
    });
    if (actionResult) {
      await page.waitForTimeout(600);
      fullscreenWorks = await page.locator("button", { hasText: "关闭" }).count() > 0;
      if (fullscreenWorks) {
        await page.locator("button", { hasText: "关闭" }).first().click();
        await page.waitForTimeout(300);
      }
    }
  } catch (error) {
    fullscreenWorks = false;
  }

  await page.mouse.move(2, 2);
  await page.waitForTimeout(500);
  const hoverStopWorks = await video.evaluate((node) => node.paused);

  return {
    title,
    located: true,
    readyBeforeView,
    hoverPlayWorks,
    hoverStopWorks,
    fullscreenWorks
  };
};

export async function auditStreamDelivery(options = {}) {
  const repoRoot = path.resolve(options.repoRoot || DEFAULT_REPO_ROOT);
  const portfolioModel = await loadRepoPortfolioModel(repoRoot);
  const manifest = await readStreamManifest(repoRoot);
  const siteUrl = String(options.siteUrl || getCanonicalSiteUrl(portfolioModel) || "https://www.zhangweivisual.cn/").trim();
  const outputFile = path.resolve(repoRoot, options.outputFile || DEFAULT_OUTPUT_RELATIVE_PATH);
  const referencedVideos = collectLocalVideoSourcePaths(portfolioModel);
  const manifestEntries = referencedVideos.map((sourcePath) => {
    const entry = manifest.videos[sourcePath] || {};
    return {
      sourcePath,
      ...entry
    };
  });

  const deliveredPortfolio = await fetchJson(new URL("data/portfolio.json", siteUrl).toString());
  const deliveryCoverage = [];
  for (const sourcePath of referencedVideos) {
    const referencedItem = (Array.isArray(deliveredPortfolio?.slides) ? deliveredPortfolio.slides : [])
      .flatMap((slide) => [
        ...(Array.isArray(slide?.media) ? slide.media : []),
        ...(Array.isArray(slide?.freeLayoutElements) ? slide.freeLayoutElements.filter((element) => element?.type === "media").map((element) => element.media) : [])
      ])
      .find((item) => normalizeRepoVideoPath(item?.url) === sourcePath);

    deliveryCoverage.push({
      sourcePath,
      hasStreamDelivery: referencedItem?.delivery?.provider === "cloudflare-stream",
      hlsUrl: referencedItem?.delivery?.hlsUrl || "",
      iframeUrl: referencedItem?.delivery?.iframeUrl || "",
      thumbnailUrl: referencedItem?.delivery?.thumbnailUrl || ""
    });
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 960 }
  });
  const consoleErrors = [];
  const requests = [];
  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push({
        type: message.type(),
        text: message.text()
      });
    }
  });
  page.on("request", (request) => {
    requests.push(request.url());
  });

  await page.goto(siteUrl, { waitUntil: "networkidle", timeout: 180000 });
  const sectionChecks = [];
  for (const section of TARGET_SECTIONS) {
    sectionChecks.push({
      label: section.label,
      ...(await inspectSectionPlayback(page, section.title))
    });
  }

  await browser.close();

  const mp4Requests = requests.filter((requestUrl) => {
    try {
      const parsed = new URL(requestUrl);
      return parsed.pathname.includes("/videos/") && parsed.pathname.toLowerCase().endsWith(".mp4");
    } catch (error) {
      return false;
    }
  });

  const measuredManifestEntries = [];
  for (const entry of manifestEntries) {
    const absolutePath = resolveRepoAssetPath(repoRoot, entry.sourcePath);
    const fileStat = await import("node:fs/promises").then(({ stat }) => stat(absolutePath));
    const durationSeconds = Number(entry.durationSeconds || 0);
    measuredManifestEntries.push({
      ...entry,
      fileSizeBytes: fileStat.size,
      approxMegabytesPerSecond: durationSeconds > 0 ? Number(((fileStat.size / (1024 * 1024)) / durationSeconds).toFixed(3)) : null
    });
  }

  const summary = {
    generatedAt: new Date().toISOString(),
    siteUrl,
    manifestPath: getStreamManifestPath(repoRoot),
    referencedVideoCount: referencedVideos.length,
    readyManifestCount: manifestEntries.filter((entry) => isReadyStreamManifestEntry(entry)).length,
    deliveryCoverage,
    mp4Requests,
    sectionChecks,
    consoleErrors,
    suggestions: chooseSuggestion(measuredManifestEntries, portfolioModel, consoleErrors, mp4Requests.length > 0)
  };

  await mkdir(path.dirname(outputFile), { recursive: true });
  await writeFile(outputFile, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
  return summary;
}

const isDirectExecution = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isDirectExecution) {
  const cliOptions = parseCliArgs(process.argv.slice(2));
  auditStreamDelivery(cliOptions).then((summary) => {
    console.log(JSON.stringify(summary, null, 2));
  }).catch((error) => {
    console.error(error.message || error);
    process.exitCode = 1;
  });
}
