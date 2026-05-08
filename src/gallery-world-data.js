export const GALLERY_WORLDS_DATA_PATH = "data/gallery-worlds.json";
export const GALLERY_IMAGE_LIBRARY_PATH = "data/gallery-image-library.json";
export const GALLERY_WORLD_DRAFT_STORAGE_KEY = "zhangwei_gallery_worlds_draft_v1";
export const GALLERY_WORLD_HISTORY_STORAGE_KEY = "zhangwei_gallery_worlds_history_v1";

const poster = (id) => `images/works/${id}/poster.webp`;

export const defaultGalleryWorldData = {
  version: 1,
  updatedAt: "2026-05-08",
  intro: {
    brand: "张玮 AIGC 视觉作品集",
    title: "走进 AIGC 画廊世界",
    subtitle: "入口走廊、主展厅与五个可探索的作品世界。",
    description: "把作品集做成一段可进入、可停留、可返回的空间体验。每个画框只通往一个主题世界，不再用组合拼贴讲作品。",
    cta: "进入画廊"
  },
  works: [
    {
      id: "earbuds",
      title: "未来之声",
      category: "产品广告",
      type: "video",
      duration: "00:45",
      description: "无线耳机产品动态视觉片。",
      poster: poster("earbuds"),
      alt: "无线耳机产品广告主视觉",
      tags: ["产品广告", "声学科技", "新品发布"]
    },
    {
      id: "drink",
      title: "极境冰爽",
      category: "饮品广告",
      type: "video",
      duration: "00:40",
      description: "冰川饮品的清爽视觉表达。",
      poster: poster("drink"),
      alt: "蓝色冰川饮品罐广告主视觉",
      tags: ["饮品广告", "包装视觉", "冰川能量"]
    },
    {
      id: "oriental",
      title: "东方之韵",
      category: "国风短片",
      type: "video",
      duration: "01:35",
      description: "东方角色与传统美学影像。",
      poster: poster("oriental"),
      alt: "东方人物国风短片主视觉",
      tags: ["国风东方", "角色影像", "传统美学"]
    },
    {
      id: "monkey",
      title: "悟空 · 新传",
      category: "剧情短片",
      type: "video",
      duration: "02:18",
      description: "东方神话角色的电影级重塑。",
      poster: poster("monkey"),
      alt: "悟空神话角色电影短片主视觉",
      tags: ["剧情短片", "神话角色", "电影感"]
    },
    {
      id: "portal",
      title: "时空之门",
      category: "科幻短片",
      type: "image",
      duration: "",
      description: "蓝色传送门的空间叙事。",
      poster: poster("portal"),
      alt: "蓝色传送门科幻视觉作品",
      tags: ["科幻未来", "空间视觉", "星门"]
    },
    {
      id: "cybercity",
      title: "赛博都市",
      category: "科幻短片",
      type: "video",
      duration: "01:52",
      description: "未来城市夜景与霓虹叙事。",
      poster: poster("cybercity"),
      alt: "未来城市科幻短片主视觉",
      tags: ["科幻未来", "城市夜景", "影像叙事"]
    },
    {
      id: "whale",
      title: "云鲸之城",
      category: "数字艺术",
      type: "image",
      duration: "",
      description: "云端巨鲸与未来城市想象。",
      poster: poster("whale"),
      alt: "云端巨鲸未来城市视觉作品",
      tags: ["数字艺术", "世界观", "未来叙事"]
    },
    {
      id: "hotel",
      title: "高端酒店视觉全案",
      category: "商业视觉",
      type: "case",
      duration: "",
      description: "东方空间氛围与品牌主视觉。",
      poster: poster("hotel"),
      alt: "高端酒店空间品牌视觉主视觉",
      tags: ["品牌主视觉", "空间氛围", "商业视觉"]
    },
    {
      id: "giftbox",
      title: "东方礼遇",
      category: "包装设计",
      type: "image",
      duration: "",
      description: "红金礼盒包装视觉设计。",
      poster: poster("giftbox"),
      alt: "红金礼盒包装设计主视觉",
      tags: ["包装设计", "品牌宣传", "东方礼盒"]
    },
    {
      id: "lipstick",
      title: "霓光唇色",
      category: "美妆广告",
      type: "image",
      duration: "",
      description: "高端唇膏产品视觉资产。",
      poster: poster("lipstick"),
      alt: "高端唇膏产品广告主视觉",
      tags: ["美妆广告", "产品视觉", "霓虹光影"]
    },
    {
      id: "foundation",
      title: "鎏金之肌",
      category: "美妆广告",
      type: "video",
      duration: "00:38",
      description: "粉底液质感与高端光影表达。",
      poster: poster("foundation"),
      alt: "粉底液美妆广告主视觉",
      tags: ["美妆广告", "产品质感", "高端光影"]
    },
    {
      id: "beauty-live",
      title: "美妆直播间",
      category: "商业视觉",
      type: "image",
      duration: "",
      description: "直播间人物与产品氛围图。",
      poster: poster("beauty-live"),
      alt: "美妆直播间人物商业视觉主图",
      tags: ["商业视觉", "直播间", "内容营销"]
    },
    {
      id: "portrait",
      title: "光影凝视",
      category: "角色设计",
      type: "image",
      duration: "",
      description: "人物肖像的电影光影塑造。",
      poster: poster("portrait"),
      alt: "电影光影人物肖像主视觉",
      tags: ["角色设计", "品牌宣传", "肖像视觉"]
    }
  ],
  galleryWorlds: [
    {
      id: "acoustic-lab",
      name: "声学实验室",
      kicker: "ACOUSTIC LAB",
      title: "未来之声",
      description: "用耳机产品主视觉进入一个可启动声场的声学空间。",
      heroWorkId: "earbuds",
      workIds: ["earbuds", "foundation"],
      interaction: "sound",
      accent: "#68B7FF",
      cta: "启动声场"
    },
    {
      id: "glacier-pod",
      name: "冰川能量舱",
      kicker: "GLACIER POD",
      title: "极境冰爽",
      description: "滑动冰点能量阀，观察冰环、冷雾与饮品光效的变化。",
      heroWorkId: "drink",
      workIds: ["drink"],
      interaction: "energy",
      accent: "#7EE7FF",
      cta: "调节冰点"
    },
    {
      id: "oriental-theater",
      name: "东方影像剧场",
      kicker: "ORIENTAL THEATER",
      title: "东方之韵",
      description: "用横向胶片轨道浏览角色、神话与国风影像。",
      heroWorkId: "oriental",
      workIds: ["oriental", "monkey", "portrait"],
      interaction: "film",
      accent: "#DFA85A",
      cta: "浏览胶片"
    },
    {
      id: "stargate-archive",
      name: "星门档案馆",
      kicker: "STARGATE ARCHIVE",
      title: "时空之门",
      description: "星门光环跟随鼠标产生轻微引力旋转，打开科幻视觉档案。",
      heroWorkId: "portal",
      workIds: ["portal", "cybercity", "whale"],
      interaction: "stargate",
      accent: "#2F7BFF",
      cta: "校准星门"
    },
    {
      id: "brand-showroom",
      name: "商业品牌展厅",
      kicker: "BRAND SHOWROOM",
      title: "商业品牌陈列",
      description: "把酒店、美妆、包装与产品广告放进独立陈列室，而不是拼成一张图。",
      heroWorkId: "hotel",
      workIds: ["hotel", "giftbox", "lipstick", "beauty-live", "foundation"],
      interaction: "showroom",
      accent: "#DFA85A",
      cta: "查看陈列"
    }
  ]
};

const clone = (value) => JSON.parse(JSON.stringify(value));
const asArray = (value) => Array.isArray(value) ? value : [];
const cleanString = (value, fallback = "") => typeof value === "string" && value.trim() ? value.trim() : fallback;
const cleanTags = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item || "").trim()).filter(Boolean);
  if (typeof value === "string") return value.split(/[,，]/).map((item) => item.trim()).filter(Boolean);
  return [];
};

export function normalizeGalleryWorldData(raw) {
  const source = raw && typeof raw === "object" ? raw : defaultGalleryWorldData;
  const fallback = clone(defaultGalleryWorldData);
  const fallbackWorks = new Map(fallback.works.map((work) => [work.id, work]));

  const works = asArray(source.works).map((work, index) => {
    const id = cleanString(work?.id, fallback.works[index]?.id || `work-${index + 1}`);
    const base = fallbackWorks.get(id) || {};
    return {
      id,
      title: cleanString(work?.title, base.title || id),
      category: cleanString(work?.category, base.category || "AIGC 作品"),
      type: cleanString(work?.type, base.type || "image"),
      duration: cleanString(work?.duration, base.duration || ""),
      description: cleanString(work?.description, base.description || ""),
      poster: cleanString(work?.poster, base.poster || poster(id)),
      previewPoster: cleanString(work?.previewPoster, ""),
      alt: cleanString(work?.alt, base.alt || `${id} 作品主视觉`),
      tags: cleanTags(work?.tags).length ? cleanTags(work?.tags) : cleanTags(base.tags)
    };
  });

  const workIds = new Set(works.map((work) => work.id));
  const galleryWorlds = asArray(source.galleryWorlds).map((world, index) => {
    const base = fallback.galleryWorlds[index] || fallback.galleryWorlds[0];
    const id = cleanString(world?.id, base.id || `world-${index + 1}`);
    const rawWorkIds = cleanTags(world?.workIds).filter((workId) => workIds.has(workId));
    const heroWorkId = workIds.has(world?.heroWorkId) ? world.heroWorkId : rawWorkIds[0] || base.heroWorkId || works[0]?.id || "";
    const nextWorkIds = rawWorkIds.length ? rawWorkIds : [heroWorkId].filter(Boolean);
    return {
      id,
      name: cleanString(world?.name, base.name || id),
      kicker: cleanString(world?.kicker, base.kicker || "GALLERY WORLD"),
      title: cleanString(world?.title, base.title || id),
      description: cleanString(world?.description, base.description || ""),
      heroWorkId,
      workIds: nextWorkIds,
      interaction: cleanString(world?.interaction, base.interaction || "showroom"),
      accent: cleanString(world?.accent, base.accent || "#68B7FF"),
      cta: cleanString(world?.cta, base.cta || "进入世界")
    };
  }).filter((world) => world.id && world.heroWorkId);

  return {
    version: Number(source.version) || 1,
    updatedAt: cleanString(source.updatedAt, fallback.updatedAt),
    intro: {
      ...fallback.intro,
      ...(source.intro && typeof source.intro === "object" ? source.intro : {})
    },
    works,
    galleryWorlds: galleryWorlds.length ? galleryWorlds : fallback.galleryWorlds
  };
}

export function sanitizeGalleryWorldDataForExport(raw) {
  const normalized = normalizeGalleryWorldData(raw);
  return {
    ...normalized,
    updatedAt: new Date().toISOString(),
    works: normalized.works.map(({ previewPoster, ...work }) => work)
  };
}

export function getWorldWorks(data, world) {
  const byId = new Map((data?.works || []).map((work) => [work.id, work]));
  return (world?.workIds || []).map((id) => byId.get(id)).filter(Boolean);
}

export function getHeroWork(data, world) {
  const byId = new Map((data?.works || []).map((work) => [work.id, work]));
  return byId.get(world?.heroWorkId) || getWorldWorks(data, world)[0] || data?.works?.[0] || null;
}
