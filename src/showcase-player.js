const video = document.getElementById("lb-video");
const lightbox = document.getElementById("lb");
const caption = document.getElementById("lb-cap");
const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
const hoverPointer = matchMedia("(any-hover: hover)");
const connection = navigator.connection;
const manifest = fetch(document.querySelector("script[data-portfolio-playback]").dataset.manifest)
  .then(response => {
    if (!response.ok) throw new Error(`Media manifest HTTP ${response.status}`);
    return response.json();
  })
  .catch(error => {
    console.warn("Playback manifest fallback", error.message);
    return { videos: {} };
  });

let active = null;
let preview = null;
let bufferTimer;
let previousFocus;

const feedback = document.createElement("div");
feedback.className = "video-feedback";
feedback.hidden = true;
const message = document.createElement("span");
message.setAttribute("role", "status");
const retry = document.createElement("button");
retry.type = "button";
retry.textContent = "重试播放";
retry.hidden = true;
feedback.append(message, retry);
document.querySelector(".vwrap").appendChild(feedback);

function canonical(id) { return id.replace(/-faststart$/, ""); }

function release(element) {
  element.pause();
  if (!element.hasAttribute("src")) return;
  element.removeAttribute("src");
  element.load();
}

function showStatus(text, canRetry = false) {
  message.textContent = text;
  retry.hidden = !canRetry;
  feedback.hidden = !text;
}

function initialVariant(entry) {
  if (connection?.saveData || /^(2g|slow-2g)$/.test(connection?.effectiveType)) return entry.variants[0];
  return entry.variants.find(variant => variant.label === "480p") || entry.variants[0];
}

function stopPreview() {
  if (!preview) return;
  const { element, timer } = preview;
  preview = null;
  clearTimeout(timer);
  element.removeAttribute("data-preview-playing");
  release(element);
}

function canPreview() {
  return hoverPointer.matches && !reduceMotion.matches && !connection?.saveData &&
    !document.hidden && !active && !document.body.classList.contains("media-viewer-open");
}

function startPreview(card) {
  if (!canPreview()) return;
  stopPreview();
  const element = card.querySelector("video");
  const request = { element, timer: setTimeout(async () => {
    const entry = (await manifest).videos[canonical(card.dataset.previewId)];
    if (preview !== request || !canPreview() || !card.matches(":hover")) return;
    const variant = entry && initialVariant(entry);
    if (!variant) return;
    if (element.dataset.poster && !element.hasAttribute("poster")) element.poster = element.dataset.poster;
    element.muted = true;
    element.src = variant.src;
    try {
      await element.play();
      if (preview === request) element.setAttribute("data-preview-playing", "");
    } catch {
      if (preview === request) stopPreview();
    }
  }, 140) };
  preview = request;
}

function play(record) {
  if (active !== record || document.hidden) return;
  const variant = record.variant;
  video.play().catch(error => {
    if (active !== record || record.variant !== variant || error.name === "AbortError") return;
    if (error.name === "NotAllowedError") showStatus("点击重试以开始播放", true);
    else recover(record);
  });
}

function load(record, variant, position = 0) {
  clearTimeout(bufferTimer);
  record.variant = variant;
  video.src = variant.src;
  if (position > 0) {
    video.addEventListener("loadedmetadata", () => {
      if (active === record && record.variant === variant) {
        video.currentTime = Math.min(position, Math.max(0, video.duration - 0.05));
      }
    }, { once: true });
  }
  play(record);
}

function recover(record) {
  if (active !== record) return;
  const lower = record.entry.variants[0];
  if (record.variant !== lower) {
    load(record, lower, video.currentTime);
  } else {
    showStatus("视频加载失败，请重试", true);
  }
}

async function open(item) {
  if (!active) previousFocus = document.activeElement;
  const record = { id: canonical(item.f), entry: null, variant: null };
  active = record;
  clearTimeout(bufferTimer);
  stopPreview();
  release(video);
  video.removeAttribute("poster");
  document.dispatchEvent(new Event("portfolio:video-viewer-opening"));
  caption.textContent = `${item.title} · ${item.meta}`;
  lightbox.setAttribute("data-open", "1");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("media-viewer-open");
  video.muted = false;
  video.preload = "auto";
  showStatus("正在加载视频…");
  document.getElementById("lb-close").focus();

  const data = await manifest;
  if (active !== record) return;
  record.entry = data.videos[record.id] || {
    variants: [{ src: `showcase/videos/${item.srcFile || item.f}.mp4` }]
  };
  if (record.entry.poster) video.poster = record.entry.poster;
  load(record, initialVariant(record.entry));
}

function close() {
  if (!active) return;
  active = null;
  clearTimeout(bufferTimer);
  release(video);
  lightbox.removeAttribute("data-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("media-viewer-open");
  showStatus("");
  if (previousFocus?.isConnected) previousFocus.focus();
  previousFocus = null;
  document.dispatchEvent(new Event("portfolio:video-viewer-closed"));
}

retry.addEventListener("click", () => {
  const record = active;
  if (!record?.entry) return;
  showStatus("正在重新加载…");
  const position = video.currentTime;
  release(video);
  load(record, record.variant, position);
});
video.addEventListener("playing", () => {
  clearTimeout(bufferTimer);
  showStatus("");
});
video.addEventListener("waiting", () => {
  const record = active;
  if (!record?.entry) return;
  clearTimeout(bufferTimer);
  bufferTimer = setTimeout(() => {
    if (active !== record || video.paused) return;
    showStatus("正在缓冲…");
    const lower = record.entry.variants[0];
    if (record.variant !== lower) load(record, lower, video.currentTime);
  }, 2500);
});
video.addEventListener("error", () => {
  if (!active?.entry || !video.error) return;
  clearTimeout(bufferTimer);
  recover(active);
});
video.addEventListener("ended", () => { clearTimeout(bufferTimer); showStatus(""); });

document.querySelectorAll("[data-preview-id]").forEach(card => {
  const element = card.querySelector("video");
  card.addEventListener("pointerenter", event => {
    if (event.pointerType === "mouse") startPreview(card);
  });
  card.addEventListener("pointerleave", () => {
    if (preview?.element === element) stopPreview();
  });
});
reduceMotion.addEventListener("change", stopPreview);
hoverPointer.addEventListener("change", stopPreview);
connection?.addEventListener?.("change", () => {
  if (connection.saveData) stopPreview();
});
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) return;
  stopPreview();
  if (active) video.pause();
});

window.__portfolioPlayback = {
  version: "hover-mp4-v2", open, close,
  inspect: () => ({ id: active?.id || null })
};
if (window.__pendingPortfolioVideo) {
  const pending = window.__pendingPortfolioVideo;
  window.__pendingPortfolioVideo = null;
  open(pending);
}
