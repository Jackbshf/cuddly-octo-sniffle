import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  defaultGalleryWorldData,
  GALLERY_IMAGE_LIBRARY_PATH,
  GALLERY_WORLD_HISTORY_STORAGE_KEY,
  GALLERY_WORLD_DRAFT_STORAGE_KEY,
  GALLERY_WORLDS_DATA_PATH,
  getHeroWork,
  getWorldWorks,
  normalizeGalleryWorldData,
  sanitizeGalleryWorldDataForExport
} from "../gallery-world-data.js";
import GalleryCorridor from "./GalleryCorridor.jsx";
import MainExhibitionHall from "./MainExhibitionHall.jsx";
import TeleportTransition from "./TeleportTransition.jsx";
import WorldShell from "./WorldShell.jsx";

const clone = (value) => JSON.parse(JSON.stringify(value));
const stripLeadingSlash = (value = "") => String(value || "").replace(/^\/+/, "");
const splitTags = (value) => String(value || "").split(/[,，]/).map((item) => item.trim()).filter(Boolean);
const HISTORY_LIMIT = 12;

const downloadJson = (fileName, data) => {
  const blob = new Blob([`${JSON.stringify(data, null, 2)}\n`], { type: "application/json;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

const isDraftOnlyUrl = (value = "") => {
  const url = String(value || "").trim();
  return url.startsWith("blob:") || url.startsWith("data:");
};

const hasDraftOnlyPoster = (data) => data.works.some((work) => {
  return isDraftOnlyUrl(work.poster) || isDraftOnlyUrl(work.previewPoster);
});

const readHistoryEntries = () => {
  try {
    const raw = JSON.parse(localStorage.getItem(GALLERY_WORLD_HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((entry) => entry?.id && entry?.data).slice(0, HISTORY_LIMIT) : [];
  } catch {
    return [];
  }
};

const writeHistoryEntries = (entries) => {
  localStorage.setItem(GALLERY_WORLD_HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, HISTORY_LIMIT)));
};

const normalizeImageLibrary = (raw, data) => {
  const fromManifest = Array.isArray(raw?.images) ? raw.images : [];
  const fromWorks = (data?.works || []).map((work) => ({
    src: work.poster,
    title: work.title,
    group: "当前作品"
  }));
  const seen = new Set();
  return [...fromWorks, ...fromManifest].map((item) => ({
    src: stripLeadingSlash(item?.src || item?.path || ""),
    title: String(item?.title || item?.src || "").trim(),
    group: String(item?.group || "图片库").trim()
  })).filter((item) => {
    if (!item.src || seen.has(item.src)) return false;
    seen.add(item.src);
    return true;
  });
};

const formatHistoryTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "未知时间";
  return date.toLocaleString("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  });
};

export default function GalleryWorldHome({ admin = false }) {
  const [data, setData] = useState(() => normalizeGalleryWorldData(defaultGalleryWorldData));
  const [publishedData, setPublishedData] = useState(() => normalizeGalleryWorldData(defaultGalleryWorldData));
  const [scene, setScene] = useState("corridor");
  const [activeWorldId, setActiveWorldId] = useState("");
  const [editingWorldId, setEditingWorldId] = useState("");
  const [editingWorkId, setEditingWorkId] = useState("");
  const [motionEnabled, setMotionEnabled] = useState(true);
  const [transitionLabel, setTransitionLabel] = useState("");
  const [adminStatus, setAdminStatus] = useState(admin ? "正在读取画廊数据..." : "");
  const [isPublishing, setIsPublishing] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [historyEntries, setHistoryEntries] = useState([]);
  const [imageLibrary, setImageLibrary] = useState([]);
  const importInputRef = useRef(null);
  const previewUrlsRef = useRef(new Set());
  const historyTimerRef = useRef(0);
  const historySignatureRef = useRef("");

  const worksById = useMemo(() => new Map(data.works.map((work) => [work.id, work])), [data.works]);
  const activeWorld = data.galleryWorlds.find((world) => world.id === activeWorldId) || data.galleryWorlds[0];
  const editingWorld = data.galleryWorlds.find((world) => world.id === editingWorldId) || activeWorld || data.galleryWorlds[0];
  const editingWork = data.works.find((work) => work.id === editingWorkId) || getHeroWork(data, editingWorld);
  const worldWorks = getWorldWorks(data, activeWorld);
  const heroWork = getHeroWork(data, activeWorld);
  const publishBlockedByLocalPreview = hasDraftOnlyPoster(data);

  const rememberVersion = (label, snapshot = data, force = false) => {
    if (!admin) return;
    const cleanSnapshot = sanitizeGalleryWorldDataForExport(snapshot);
    const signature = JSON.stringify(cleanSnapshot);
    if (!force && signature === historySignatureRef.current) return;
    historySignatureRef.current = signature;
    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      label,
      createdAt: new Date().toISOString(),
      data: cleanSnapshot
    };
    setHistoryEntries((current) => {
      const next = [entry, ...current.filter((item) => JSON.stringify(item.data) !== signature)].slice(0, HISTORY_LIMIT);
      writeHistoryEntries(next);
      return next;
    });
  };

  useEffect(() => {
    const reduceMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) setMotionEnabled(false);
  }, []);

  useEffect(() => {
    let mounted = true;
    const loadData = async () => {
      try {
        const response = await fetch(`${GALLERY_WORLDS_DATA_PATH}?v=${encodeURIComponent(window.__APP_BUNDLE_VERSION__ || Date.now())}`, {
          cache: "no-store"
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const remote = normalizeGalleryWorldData(await response.json());
        if (!mounted) return;
        setPublishedData(remote);
        if (admin) setHistoryEntries(readHistoryEntries());
        const draft = admin ? localStorage.getItem(GALLERY_WORLD_DRAFT_STORAGE_KEY) : "";
        if (draft) {
          setData(normalizeGalleryWorldData(JSON.parse(draft)));
          setAdminStatus("已载入本地预览草稿，尚未发布上线。");
        } else {
          setData(remote);
          setAdminStatus(admin ? "已载入线上画廊数据，可直接预览和编辑。" : "");
        }
        if (admin) {
          try {
            const libraryResponse = await fetch(`${GALLERY_IMAGE_LIBRARY_PATH}?v=${encodeURIComponent(window.__APP_BUNDLE_VERSION__ || Date.now())}`, {
              cache: "no-store"
            });
            if (libraryResponse.ok && mounted) {
              setImageLibrary(normalizeImageLibrary(await libraryResponse.json(), remote));
            } else if (mounted) {
              setImageLibrary(normalizeImageLibrary(null, remote));
            }
          } catch {
            if (mounted) setImageLibrary(normalizeImageLibrary(null, remote));
          }
        }
      } catch (error) {
        if (!mounted) return;
        const fallback = normalizeGalleryWorldData(defaultGalleryWorldData);
        setPublishedData(fallback);
        setData(fallback);
        if (admin) setImageLibrary(normalizeImageLibrary(null, fallback));
        setAdminStatus(admin ? "线上 JSON 读取失败，已使用打包内默认画廊数据。" : "");
      } finally {
        if (mounted) setHydrated(true);
      }
    };
    loadData();
    return () => { mounted = false; };
  }, [admin]);

  useEffect(() => {
    if (!editingWorldId && data.galleryWorlds[0]) setEditingWorldId(data.galleryWorlds[0].id);
    if (!activeWorldId && data.galleryWorlds[0]) setActiveWorldId(data.galleryWorlds[0].id);
  }, [activeWorldId, data.galleryWorlds, editingWorldId]);

  useEffect(() => {
    if (editingWorld?.heroWorkId) setEditingWorkId((current) => current || editingWorld.heroWorkId);
  }, [editingWorld?.heroWorkId]);

  useEffect(() => {
    if (!admin || !hydrated) return;
    const cleanDraft = sanitizeGalleryWorldDataForExport(data);
    localStorage.setItem(GALLERY_WORLD_DRAFT_STORAGE_KEY, JSON.stringify(cleanDraft));
    window.clearTimeout(historyTimerRef.current);
    historyTimerRef.current = window.setTimeout(() => rememberVersion("自动保存草稿", cleanDraft), 900);
    return () => window.clearTimeout(historyTimerRef.current);
  }, [admin, data, hydrated]);

  useEffect(() => () => {
    previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    previewUrlsRef.current.clear();
  }, []);

  const runTransition = (nextScene, nextWorldId = activeWorldId, label = "正在进入作品世界") => {
    const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const update = () => {
      setScene(nextScene);
      if (nextWorldId) {
        setActiveWorldId(nextWorldId);
        setEditingWorldId(nextWorldId);
      }
    };
    setTransitionLabel(motionEnabled && !reduced ? label : "");
    if (document.startViewTransition && motionEnabled && !reduced) {
      document.startViewTransition(update);
    } else {
      update();
    }
    if (motionEnabled && !reduced) {
      window.setTimeout(() => setTransitionLabel(""), 760);
    }
  };

  const updateWorld = (worldId, patch) => {
    setData((current) => ({
      ...current,
      galleryWorlds: current.galleryWorlds.map((world) => world.id === worldId ? { ...world, ...patch } : world)
    }));
    setAdminStatus("已更新当前预览草稿，尚未发布上线。");
  };

  const updateWork = (workId, patch) => {
    setData((current) => ({
      ...current,
      works: current.works.map((work) => work.id === workId ? { ...work, ...patch } : work)
    }));
    setAdminStatus("已更新当前预览草稿，尚未发布上线。");
  };

  const moveWorld = (worldId, direction) => {
    setData((current) => {
      const index = current.galleryWorlds.findIndex((world) => world.id === worldId);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= current.galleryWorlds.length) return current;
      const galleryWorlds = [...current.galleryWorlds];
      const [world] = galleryWorlds.splice(index, 1);
      galleryWorlds.splice(nextIndex, 0, world);
      return { ...current, galleryWorlds };
    });
    setAdminStatus("世界顺序已更新到预览草稿。");
  };

  const toggleWorldWork = (worldId, workId) => {
    const world = data.galleryWorlds.find((item) => item.id === worldId);
    if (!world) return;
    const exists = world.workIds.includes(workId);
    const nextWorkIds = exists ? world.workIds.filter((id) => id !== workId) : [...world.workIds, workId];
    const heroWorkId = nextWorkIds.includes(world.heroWorkId) ? world.heroWorkId : nextWorkIds[0] || world.heroWorkId;
    updateWorld(worldId, { workIds: nextWorkIds, heroWorkId });
  };

  const uploadWorkPoster = async (workId, file) => {
    if (!file) return;
    const previewUrl = URL.createObjectURL(file);
    previewUrlsRef.current.add(previewUrl);
    updateWork(workId, { previewPoster: previewUrl });
    setAdminStatus("已先替换到本地预览，正在尝试上传并绑定素材路径...");

    try {
      const form = new FormData();
      form.append("file", file);
      form.append("category", "gallery-world");
      form.append("title", file.name || workId);
      const response = await fetch("/api/portfolio-admin/uploads", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok || !result.upload) {
        throw new Error(result.error || `上传失败：${response.status}`);
      }
      const nextPath = stripLeadingSlash(result.upload.relativePath || result.upload.src || "");
      updateWork(workId, { poster: nextPath, previewPoster: "" });
      URL.revokeObjectURL(previewUrl);
      previewUrlsRef.current.delete(previewUrl);
      setAdminStatus(`已上传并绑定到草稿：${nextPath}。尚未发布上线。`);
    } catch (error) {
      setAdminStatus(`${error?.message || "上传失败"}。当前只保留本地预览，发布前请重新上传绑定素材。`);
    }
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      rememberVersion("导入前检查点", data, true);
      setData(normalizeGalleryWorldData(JSON.parse(await file.text())));
      setScene("hall");
      setAdminStatus(`已导入 ${file.name} 到当前预览草稿，尚未发布上线。`);
    } catch (error) {
      window.alert("JSON 导入失败，请确认文件结构包含 works 和 galleryWorlds。");
    }
    event.target.value = "";
  };

  const exportDraft = () => {
    downloadJson("gallery-worlds.json", sanitizeGalleryWorldDataForExport(data));
    setAdminStatus("已下载当前预览草稿 JSON。");
  };

  const resetDraft = () => {
    rememberVersion("重置前检查点", data, true);
    localStorage.removeItem(GALLERY_WORLD_DRAFT_STORAGE_KEY);
    setData(clone(publishedData));
    setScene("hall");
    setAdminStatus("已重置为线上 JSON 数据。");
  };

  const pickLibraryImage = (workId, image) => {
    if (!image?.src) return;
    updateWork(workId, { poster: image.src, previewPoster: "" });
    setAdminStatus(`已从图片库替换到当前草稿：${image.title || image.src}。尚未发布上线。`);
  };

  const restoreHistoryEntry = (entryId) => {
    const entry = historyEntries.find((item) => item.id === entryId);
    if (!entry) return;
    rememberVersion("恢复前检查点", data, true);
    setData(normalizeGalleryWorldData(entry.data));
    setScene("hall");
    setEditingWorldId(entry.data.galleryWorlds?.[0]?.id || "");
    setActiveWorldId(entry.data.galleryWorlds?.[0]?.id || "");
    setAdminStatus(`已恢复 ${entry.label}（${formatHistoryTime(entry.createdAt)}）到预览草稿，尚未发布上线。`);
  };

  const publishDraft = async () => {
    if (hasDraftOnlyPoster(data)) {
      window.alert("当前仍有本地预览图片未上传绑定，不能发布。请先重新选择图片并等待上传成功。");
      return;
    }
    const shouldPublish = window.confirm("确认发布当前画廊 JSON 到 GitHub 并等待自动部署吗？");
    if (!shouldPublish) return;
    rememberVersion("发布前检查点", data, true);
    setIsPublishing(true);
    setAdminStatus("正在发布画廊 JSON 到 GitHub...");
    try {
      const galleryWorldsData = sanitizeGalleryWorldDataForExport(data);
      const response = await fetch("/api/portfolio-admin/gallery-worlds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          galleryWorldsData,
          message: "Update immersive gallery worlds"
        })
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result.ok) throw new Error(result.error || `发布失败：${response.status}`);
      localStorage.removeItem(GALLERY_WORLD_DRAFT_STORAGE_KEY);
      setPublishedData(galleryWorldsData);
      setData(galleryWorldsData);
      setAdminStatus(`已发布到 GitHub${result.commit ? `：${result.commit.slice(0, 7)}` : ""}，等待自动部署。`);
    } catch (error) {
      window.alert(error?.message || "发布失败。");
      setAdminStatus(error?.message || "发布失败。");
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <main className={`gallery-world-home${admin ? " is-admin" : ""}${motionEnabled ? " is-motion-enabled" : " is-motion-disabled"}`}>
      {scene === "corridor" && (
        <GalleryCorridor
          intro={data.intro}
          worlds={data.galleryWorlds}
          worksById={worksById}
          motionEnabled={motionEnabled}
          onEnter={() => runTransition("hall", data.galleryWorlds[0]?.id, "正在进入主展厅")}
        />
      )}
      {scene === "hall" && (
        <MainExhibitionHall
          worlds={data.galleryWorlds}
          worksById={worksById}
          onBackToCorridor={() => runTransition("corridor", activeWorldId, "正在返回入口走廊")}
          onOpenWorld={(worldId) => runTransition("world", worldId, "正在传送到作品世界")}
        />
      )}
      {scene === "world" && (
        <WorldShell
          world={activeWorld}
          works={worldWorks}
          heroWork={heroWork}
          motionEnabled={motionEnabled}
          onBack={() => runTransition("hall", activeWorldId, "正在返回主展厅")}
        />
      )}

      <button
        type="button"
        className="gallery-motion-toggle"
        aria-pressed={motionEnabled}
        onClick={() => setMotionEnabled((value) => !value)}
      >
        3D {motionEnabled ? "开" : "关"}
      </button>

      <TeleportTransition active={Boolean(transitionLabel)} label={transitionLabel} />

      {admin && (
        <GalleryAdminPanel
          data={data}
          status={adminStatus}
          isPublishing={isPublishing}
          editingWorld={editingWorld}
          editingWork={editingWork}
          editingWorkId={editingWorkId}
          onSelectWorld={(worldId) => {
            setEditingWorldId(worldId);
            setActiveWorldId(worldId);
          }}
          onSelectWork={setEditingWorkId}
          onUpdateWorld={updateWorld}
          onUpdateWork={updateWork}
          onMoveWorld={moveWorld}
          onToggleWorldWork={toggleWorldWork}
          onUploadWorkPoster={uploadWorkPoster}
          onPickLibraryImage={pickLibraryImage}
          onRestoreHistory={restoreHistoryEntry}
          onImportClick={() => importInputRef.current?.click()}
          onExport={exportDraft}
          onReset={resetDraft}
          onPublish={publishDraft}
          historyEntries={historyEntries}
          imageLibrary={imageLibrary}
          publishBlockedByLocalPreview={publishBlockedByLocalPreview}
        />
      )}
      {admin && <input ref={importInputRef} type="file" accept=".json,application/json" hidden onChange={handleImportJson} />}
    </main>
  );
}

function GalleryAdminPanel({
  data,
  status,
  isPublishing,
  editingWorld,
  editingWork,
  editingWorkId,
  onSelectWorld,
  onSelectWork,
  onUpdateWorld,
  onUpdateWork,
  onMoveWorld,
  onToggleWorldWork,
  onUploadWorkPoster,
  onPickLibraryImage,
  onRestoreHistory,
  onImportClick,
  onExport,
  onReset,
  onPublish,
  historyEntries,
  imageLibrary,
  publishBlockedByLocalPreview
}) {
  const [isDraggingPoster, setIsDraggingPoster] = useState(false);
  if (!editingWorld || !editingWork) return null;

  const handlePosterFile = (file) => {
    if (!file) return;
    onUploadWorkPoster(editingWork.id, file);
  };

  return (
    <aside className="gallery-admin-panel">
      <div className="gallery-admin-panel__head">
        <div>
          <span>后台预览工作台</span>
          <strong>只改草稿，不自动上线</strong>
        </div>
        <button type="button" onClick={onPublish} disabled={isPublishing || publishBlockedByLocalPreview}>
          {isPublishing ? "发布中..." : "确认发布上线"}
        </button>
      </div>
      <p className="gallery-admin-status">{status}</p>
      {publishBlockedByLocalPreview && (
        <p className="gallery-admin-status is-blocked">当前仍有本地预览图未上传绑定，发布已锁定。请重新拖入或选择图片并等待上传成功。</p>
      )}
      <div className="gallery-admin-actions">
        <button type="button" onClick={onImportClick}>导入 JSON</button>
        <button type="button" onClick={onExport}>下载 JSON</button>
        <button type="button" onClick={onReset}>重置草稿</button>
      </div>

      <div className="gallery-admin-history">
        <span>版本记忆与回溯</span>
        {historyEntries.length ? (
          <div>
            {historyEntries.slice(0, 5).map((entry) => (
              <button key={entry.id} type="button" onClick={() => onRestoreHistory(entry.id)}>
                <strong>{entry.label}</strong>
                <em>{formatHistoryTime(entry.createdAt)}</em>
              </button>
            ))}
          </div>
        ) : (
          <p>暂无本地检查点。编辑、导入、重置或发布前会自动记录。</p>
        )}
      </div>

      <label>
        <span>当前世界</span>
        <select value={editingWorld.id} onChange={(event) => onSelectWorld(event.target.value)}>
          {data.galleryWorlds.map((world) => <option key={world.id} value={world.id}>{world.name}</option>)}
        </select>
      </label>

      <div className="gallery-admin-inline">
        <button type="button" onClick={() => onMoveWorld(editingWorld.id, -1)}>上移世界</button>
        <button type="button" onClick={() => onMoveWorld(editingWorld.id, 1)}>下移世界</button>
      </div>

      <label>
        <span>世界名称</span>
        <input value={editingWorld.name} onChange={(event) => onUpdateWorld(editingWorld.id, { name: event.target.value })} />
      </label>
      <label>
        <span>英文标识</span>
        <input value={editingWorld.kicker} onChange={(event) => onUpdateWorld(editingWorld.id, { kicker: event.target.value })} />
      </label>
      <label>
        <span>世界标题</span>
        <input value={editingWorld.title} onChange={(event) => onUpdateWorld(editingWorld.id, { title: event.target.value })} />
      </label>
      <label>
        <span>世界说明</span>
        <textarea value={editingWorld.description} onChange={(event) => onUpdateWorld(editingWorld.id, { description: event.target.value })} />
      </label>
      <label>
        <span>主视觉作品</span>
        <select value={editingWorld.heroWorkId} onChange={(event) => onUpdateWorld(editingWorld.id, { heroWorkId: event.target.value })}>
          {data.works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}
        </select>
      </label>

      <div className="gallery-admin-worklist">
        <span>世界包含作品</span>
        {data.works.map((work) => (
          <label key={work.id}>
            <input
              type="checkbox"
              checked={editingWorld.workIds.includes(work.id)}
              onChange={() => onToggleWorldWork(editingWorld.id, work.id)}
            />
            {work.title}
          </label>
        ))}
      </div>

      <label>
        <span>编辑作品</span>
        <select value={editingWorkId || editingWork.id} onChange={(event) => onSelectWork(event.target.value)}>
          {data.works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}
        </select>
      </label>
      <label>
        <span>作品标题</span>
        <input value={editingWork.title} onChange={(event) => onUpdateWork(editingWork.id, { title: event.target.value })} />
      </label>
      <label>
        <span>分类</span>
        <input value={editingWork.category} onChange={(event) => onUpdateWork(editingWork.id, { category: event.target.value })} />
      </label>
      <label>
        <span>描述</span>
        <textarea value={editingWork.description} onChange={(event) => onUpdateWork(editingWork.id, { description: event.target.value })} />
      </label>
      <label>
        <span>标签，逗号分隔</span>
        <input value={(editingWork.tags || []).join("，")} onChange={(event) => onUpdateWork(editingWork.id, { tags: splitTags(event.target.value) })} />
      </label>
      <label>
        <span>图片路径</span>
        <input value={editingWork.poster} onChange={(event) => onUpdateWork(editingWork.id, { poster: event.target.value })} />
      </label>
      <label
        className={`gallery-admin-file gallery-admin-dropzone${isDraggingPoster ? " is-dragging" : ""}`}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDraggingPoster(true);
        }}
        onDragLeave={() => setIsDraggingPoster(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDraggingPoster(false);
          handlePosterFile(event.dataTransfer.files?.[0]);
        }}
      >
        <span>替换作品图片</span>
        <img src={editingWork.previewPoster || editingWork.poster} alt="" aria-hidden="true" />
        <strong>拖入图片到这张卡片，或点击选择文件</strong>
        <em>会先在当前卡片预览，上传成功后才允许发布上线。</em>
        <input type="file" accept="image/*" onChange={(event) => {
          handlePosterFile(event.target.files?.[0]);
          event.target.value = "";
        }} />
      </label>
      <div className="gallery-admin-library">
        <span>图片库可视化替换</span>
        <p>点击图片只替换当前草稿卡片；发布前请先预览确认。</p>
        <div>
          {imageLibrary.map((image) => (
            <button
              key={image.src}
              type="button"
              className={stripLeadingSlash(editingWork.poster) === image.src ? "is-selected" : ""}
              onClick={() => onPickLibraryImage(editingWork.id, image)}
              title={image.src}
            >
              <img src={image.src} alt="" aria-hidden="true" loading="lazy" />
              <strong>{image.title}</strong>
              <em>{image.group}</em>
            </button>
          ))}
        </div>
      </div>
    </aside>
  );
}
