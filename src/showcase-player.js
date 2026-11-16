const video = document.getElementById("lb-video");
const lightbox = document.getElementById("lb");
const caption = document.getElementById("lb-cap");
const script = document.querySelector("script[data-portfolio-playback]");
const manifestPromise = fetch(script.dataset.manifest)
  .then(response => {
    if (!response.ok) throw new Error(`Media manifest HTTP ${response.status}`);
    return response.json();
  })
  .catch(error => { console.warn("Playback manifest fallback", error.message); return { videos: {} }; });

let active = null;
let warmed = null;
let warmTimer = null;
let warmGeneration = 0;
let loadGeneration = 0;
let hls = null;
let statusTimer = null;
let measuredBandwidth = 0;
let previousFocus = null;
let restoringFocus = false;

const quality = document.createElement("select");
quality.className = "pl-quality";
quality.setAttribute("aria-label", "视频清晰度");
document.querySelector(".pl-row").appendChild(quality);
const feedback = document.createElement("div");
feedback.className = "video-feedback";
feedback.hidden = true;
const message = document.createElement("span");
message.setAttribute("role", "status");
const retry = document.createElement("button");
retry.type = "button";
retry.textContent = "重试播放";
retry.hidden = true;
const lowQuality = document.createElement("button");
lowQuality.type = "button";
lowQuality.textContent = "切换流畅档";
lowQuality.hidden = true;
feedback.append(message, lowQuality, retry);
document.querySelector(".vwrap").appendChild(feedback);

function canonical(id) { return id.replace(/-faststart$/, ""); }
function absolute(source) { return new URL(source, location.href).href; }

function release(element) {
  element.pause();
  element.removeAttribute("src");
  element.querySelectorAll("source").forEach(source => source.removeAttribute("src"));
  element.preload = "none";
  element.load();
}

function destroyHls() {
  if (hls) { hls.destroy(); hls = null; }
}

function showStatus(text, canRetry = false, canLower = false) {
  message.textContent = text;
  retry.hidden = !canRetry;
  lowQuality.hidden = !canLower;
  feedback.hidden = !text;
}

function cancelWarm() {
  clearTimeout(warmTimer);
  warmGeneration++;
  if (active) return;
  if (warmed || video.getAttribute("src")) release(video);
  warmed = null;
}

function selectVariant(entry) {
  const safeBandwidth = measuredBandwidth * 0.65;
  return [...entry.variants].reverse().find(variant => variant.bitrate <= safeBandwidth) || entry.variants[0];
}

async function warm(source) {
  if (active || document.hidden || navigator.connection?.saveData || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const id = canonical(source.split("/").pop().replace(/\.mp4$/, ""));
  const generation = ++warmGeneration;
  const manifest = await manifestPromise;
  const entry = manifest.videos[id];
  if (generation !== warmGeneration || active || !entry || entry.hls) return;
  const variant = selectVariant(entry);
  if (video.src !== absolute(variant.src)) {
    release(video);
    video.preload = "metadata";
    video.poster = entry.poster;
    video.src = variant.src;
  }
  warmed = { id, variant };
}

function fallbackEntry(record) {
  return {
    poster: "", hls: null,
    variants: [{ label: "原片", bitrate: 0, src: `showcase/videos/${record.item.srcFile || record.item.f}.mp4` }]
  };
}

function play(record) {
  if (active !== record) return;
  const promise = video.play();
  if (promise) promise.catch(error => {
    if (active !== record || error.name === "AbortError") return;
    showStatus(error.name === "NotAllowedError" ? "点击重试以开始播放" : "视频暂时无法播放", true, record.entry.variants.length > 1);
  });
}

function loadMp4(record, variant, position = 0, shouldPlay = true) {
  destroyHls();
  const generation = ++loadGeneration;
  record.variant = variant;
  record.transport = "mp4";
  video.dataset.quality = variant.label;
  video.preload = "auto";
  const sameSource = video.src === absolute(variant.src);
  if (!sameSource) video.src = variant.src;
  if (position > 0) {
    const restorePosition = () => {
      if (active !== record || generation !== loadGeneration) return;
      video.currentTime = Math.min(position, Math.max(0, video.duration - 0.05));
      if (shouldPlay) play(record);
    };
    if (sameSource && video.readyState >= 1) restorePosition();
    else video.addEventListener("loadedmetadata", restorePosition, { once: true });
  } else if (shouldPlay) play(record);
}

function useFallback(record) {
  if (active !== record) return;
  if (record.fallbackUsed) { showStatus("视频加载失败，请重试", true, true); return; }
  record.fallbackUsed = true;
  showStatus("正在切换流畅播放…");
  loadMp4(record, record.entry.variants[0], video.currentTime);
}

async function loadHls(record, position = 0, shouldPlay = true) {
  const generation = ++loadGeneration;
  record.transport = "hls";
  video.dataset.quality = "auto";
  video.preload = "auto";
  if (video.canPlayType("application/vnd.apple.mpegurl")) {
    video.src = record.entry.hls;
    video.addEventListener("loadedmetadata", () => {
      if (active !== record || generation !== loadGeneration) return;
      if (position > 0) video.currentTime = position;
      if (shouldPlay) play(record);
    }, { once: true });
    if (shouldPlay && position === 0) play(record);
    return;
  }
  try {
    const { default: Hls } = await import("hls.js");
    if (active !== record || generation !== loadGeneration) return;
    if (!Hls.isSupported()) { useFallback(record); return; }
    destroyHls();
    const instance = new Hls({
      startLevel: 0, startPosition: position, maxBufferLength: 8, maxMaxBufferLength: 16,
      backBufferLength: 4, maxBufferSize: 6 * 1024 * 1024,
      abrEwmaDefaultEstimate: measuredBandwidth || 400000,
      capLevelToPlayerSize: true
    });
    hls = instance;
    instance.on(Hls.Events.MANIFEST_PARSED, () => { if (active === record && shouldPlay) play(record); });
    instance.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      if (active === record) video.dataset.quality = record.entry.variants[data.level]?.label || "auto";
    });
    instance.on(Hls.Events.ERROR, (_, data) => { if (active === record && data.fatal) useFallback(record); });
    instance.attachMedia(video);
    instance.loadSource(record.entry.hls);
  } catch (error) {
    if (active === record && generation === loadGeneration) useFallback(record);
  }
}

async function open(item) {
  clearTimeout(warmTimer);
  warmGeneration++;
  clearTimeout(statusTimer);
  if (!active) previousFocus = document.activeElement;
  const record = { id: canonical(item.f), item, entry: null, selection: "auto", fallbackUsed: false, downgraded: false };
  active = record;
  destroyHls();
  document.querySelectorAll(".vcard video, .case-video video, #pin-video, #pin-backdrop").forEach(release);
  caption.textContent = `${item.title} · ${item.meta}`;
  lightbox.setAttribute("data-open", "1");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("media-viewer-open");
  video.dataset.playbackVersion = "exclusive-v1";
  video.muted = false;
  video.loop = false;
  quality.disabled = true;
  showStatus("正在加载视频…");
  document.getElementById("lb-close").focus();
  const manifest = await manifestPromise;
  if (active !== record) return;
  record.entry = manifest.videos[record.id] || fallbackEntry(record);
  video.poster = record.entry.poster;
  quality.replaceChildren(new Option("自动", "auto"), ...record.entry.variants.map(variant => new Option(variant.label, variant.label)));
  quality.disabled = false;
  if (record.entry.hls) {
    release(video);
    warmed = null;
    await loadHls(record);
  } else {
    const variant = warmed?.id === record.id ? warmed.variant : selectVariant(record.entry);
    warmed = null;
    loadMp4(record, variant);
  }
}

function close() {
  if (!active) return;
  active = null;
  loadGeneration++;
  clearTimeout(statusTimer);
  cancelWarm();
  destroyHls();
  release(video);
  lightbox.removeAttribute("data-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("media-viewer-open");
  showStatus("");
  restoringFocus = true;
  if (previousFocus?.isConnected) previousFocus.focus();
  restoringFocus = false;
  previousFocus = null;
  document.dispatchEvent(new Event("portfolio:video-viewer-closed"));
}

quality.addEventListener("change", () => {
  const record = active;
  if (!record?.entry) return;
  record.selection = quality.value;
  if (hls) {
    hls.nextLevel = quality.value === "auto" ? -1 : record.entry.variants.findIndex(variant => variant.label === quality.value);
    return;
  }
  if (record.entry.hls && quality.value === "auto") {
    const position = video.currentTime;
    const shouldPlay = !video.paused;
    release(video);
    loadHls(record, position, shouldPlay);
    return;
  }
  const variant = quality.value === "auto" ? selectVariant(record.entry) : record.entry.variants.find(item => item.label === quality.value);
  showStatus("正在切换清晰度…");
  loadMp4(record, variant, video.currentTime, !video.paused);
});

retry.addEventListener("click", () => {
  if (!active?.entry) return;
  showStatus("正在重新加载…");
  const position = video.currentTime;
  active.fallbackUsed = false;
  destroyHls();
  release(video);
  loadMp4(active, active.variant || active.entry.variants[0], position);
});
lowQuality.addEventListener("click", () => {
  if (!active?.entry) return;
  const record = active;
  record.selection = record.entry.variants[0].label;
  quality.value = record.selection;
  showStatus("正在切换流畅档…");
  if (hls) hls.currentLevel = 0;
  else loadMp4(record, record.entry.variants[0], video.currentTime);
});
video.addEventListener("playing", () => {
  clearTimeout(statusTimer);
  if (active) { video.dataset.playbackState = "playing"; showStatus(""); }
});
video.addEventListener("waiting", () => {
  if (!active?.entry) return;
  video.dataset.playbackState = "buffering";
  const record = active;
  clearTimeout(statusTimer);
  statusTimer = setTimeout(() => {
    if (active !== record || video.paused) return;
    if (!hls && record.selection === "auto" && !record.downgraded && record.variant !== record.entry.variants[0]) {
      record.downgraded = true;
      loadMp4(record, record.entry.variants[0], video.currentTime);
    }
    showStatus("正在缓冲…", false, record.entry.variants.length > 1);
  }, 1500);
});
video.addEventListener("error", () => {
  if (!active?.entry) return;
  clearTimeout(statusTimer);
  if (active.entry.hls && !active.fallbackUsed) useFallback(active);
  else showStatus("视频加载失败，请重试", true, active.entry.variants.length > 1);
});
video.addEventListener("ended", () => { clearTimeout(statusTimer); showStatus(""); });
video.addEventListener("progress", () => {
  const resource = performance.getEntriesByName(video.currentSrc).filter(entry => entry.responseEnd > entry.responseStart && entry.transferSize > 0).pop();
  if (resource) measuredBandwidth = resource.transferSize * 8 * 1000 / (resource.responseEnd - resource.responseStart);
});

document.querySelectorAll("[data-warm-src]").forEach(element => {
  const schedule = () => {
    if (active || restoringFocus) return;
    cancelWarm();
    warmTimer = setTimeout(() => warm(element.dataset.warmSrc), 600);
  };
  element.addEventListener("pointerenter", event => { if (event.pointerType === "mouse") schedule(); });
  element.addEventListener("pointerleave", cancelWarm);
  element.addEventListener("focusin", schedule);
  element.addEventListener("focusout", cancelWarm);
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  cancelWarm();
  if (active) video.pause();
});
window.__portfolioPlayback = {
  version: "exclusive-v1", open, close, warm, cancelWarm,
  inspect: () => ({ id: active?.id || null, transport: active?.transport || null, quality: video.dataset.quality || null, warmed: warmed?.id || null, measuredBandwidth })
};
if (window.__pendingPortfolioVideo) {
  const pending = window.__pendingPortfolioVideo;
  window.__pendingPortfolioVideo = null;
  open(pending);
}
