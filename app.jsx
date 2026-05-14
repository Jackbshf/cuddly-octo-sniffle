import React, { useEffect, useRef, useState, startTransition } from "react";
import { createRoot } from "react-dom/client";
import Hls from "hls.js";
import * as THREE from "three";
import GalleryWorldHome from "./src/components/GalleryWorldHome.jsx";

const DATA_FILE_PATH = "data/portfolio.json";
const DRAFT_STORAGE_KEY = "zhangwei_portfolio_draft_v1";
const EMBEDDED_PORTFOLIO = window.__EMBEDDED_PORTFOLIO__ ?? [];
const APP_BUNDLE_VERSION = window.__APP_BUNDLE_VERSION__ ?? "";
const SEARCH_PARAMS = new URLSearchParams(window.location.search);
const IS_PORTFOLIO_ADMIN_MODE = window.__PORTFOLIO_ADMIN_MODE__ === true;
const IS_TOOLS_MODE = SEARCH_PARAMS.get("tools") === "1" || IS_PORTFOLIO_ADMIN_MODE;
const USE_GALLERY_WORLD_HOME = SEARCH_PARAMS.get("gallery") === "1";
const shouldNormalizeEditorQuery = window.location.protocol !== "file:" && SEARCH_PARAMS.get("editor") === "1";
if (shouldNormalizeEditorQuery) {
  const normalizedParams = new URLSearchParams(window.location.search);
  normalizedParams.delete("editor");
  const normalizedSearch = normalizedParams.toString();
  window.history.replaceState(
    window.history.state,
    "",
    `${window.location.pathname}${normalizedSearch ? `?${normalizedSearch}` : ""}${window.location.hash}`
  );
}
const IS_EDITOR_MODE = window.location.protocol === "file:" || IS_TOOLS_MODE;
const MOBILE_MODE_QUERY = SEARCH_PARAMS.get("mobile");
const IS_QR_MOBILE_MODE = MOBILE_MODE_QUERY === "1";
const SLIDE_TRANSITION_OUT_MS = 120;
const SLIDE_TRANSITION_IN_MS = 180;
const PORTFOLIO_WARN_BYTES = 500 * 1024;
const PORTFOLIO_BLOCK_BYTES = 1024 * 1024;
const DEFAULT_STATIC_ASSET_UPLOAD_LIMIT_BYTES = 25 * 1024 * 1024;
const DEFAULT_STREAM_DIRECT_UPLOAD_LIMIT_BYTES = 200 * 1024 * 1024;
const STREAM_UPLOAD_POLL_INTERVAL_MS = 4000;
const STREAM_UPLOAD_MAX_POLLS = 90;
const INLINE_AUDIO_SESSION_KEY = "zhangwei_portfolio_inline_audio_unlocked_v1";
const INLINE_AUDIO_PREFERENCE_KEY = "zhangwei_portfolio_inline_audio_preference_v1";

const DEFAULT_SITE_META = {
  siteTitle: "张玮｜AIGC 视觉作品集",
  siteDescription: "张玮的 AIGC 视觉作品集，专注 AIGC 商业视觉、AI 视频短片与 ComfyUI 工作流搭建。",
  siteKeywords: ["AIGC", "作品集", "图像生成", "AI 视频创作", "商业视觉设计", "ComfyUI 工作流", "产品广告", "角色一致性"],
  canonicalUrl: "https://www.zhangweivisual.cn/",
  ogTitle: "张玮｜AIGC 视觉作品集",
  ogDescription: "AIGC Visual Designer 作品集，覆盖商业视觉、AI 视频短片与 ComfyUI 工作流搭建。",
  ogImage: "images/generated/celestial-whale-city.webp",
  twitterCard: "summary_large_image",
  caseSectionTitle: "商业视觉案例",
  caseSectionDesc: "覆盖产品广告、美妆人像、未来场景与包装陈列，展示商业审美、质感控制与视觉一致性。",
  contactSectionTitle: "联系我",
  contactSectionDesc: "目前专注 AIGC 商业视觉、AI 视频短片与 ComfyUI 工作流搭建。欢迎交流项目合作、岗位机会或作品集相关需求。",
  formspreeEndpoint: "",
  contactCtaLabel: "查看联系方式"
};

const PUBLIC_APPLICATION_META_OVERRIDES = {
  siteTitle: DEFAULT_SITE_META.siteTitle,
  siteDescription: DEFAULT_SITE_META.siteDescription,
  siteKeywords: DEFAULT_SITE_META.siteKeywords,
  ogTitle: DEFAULT_SITE_META.ogTitle,
  ogDescription: DEFAULT_SITE_META.ogDescription,
  contactSectionTitle: DEFAULT_SITE_META.contactSectionTitle,
  contactSectionDesc: DEFAULT_SITE_META.contactSectionDesc,
  contactCtaLabel: DEFAULT_SITE_META.contactCtaLabel
};

const HOMEPAGE_CURATED_WORKS = {
  "hero-main-visual": {
    id: "hero-main-visual",
    kind: "image",
    category: "world",
    label: "首页主视觉",
    title: "世界观视觉：云鲸未来城市主视觉",
    description: "用完整场景图建立首屏记忆点，展示场景概念、空间叙事和画面完成度。",
    tags: ["世界观视觉", "场景概念", "首页主视觉"],
    media: {
      kind: "image",
      url: "images/generated/celestial-whale-city.webp",
      fullUrl: "images/generated/celestial-whale-city.webp",
      alt: "云鲸未来城市单张世界观主视觉"
    },
    detailRows: [
      { label: "展示目的", value: "首页主视觉" },
      { label: "证明内容", value: "场景概念、空间叙事、完成度控制" },
      { label: "适用场景", value: "品牌视觉、概念海报、作品集首屏" }
    ]
  },
  "video-product-shot": {
    id: "video-product-shot",
    kind: "video",
    category: "video",
    duration: "00:35",
    label: "视频作品 01",
    title: "东方人物短片：古琴场景镜头",
    description: "围绕古风人物、庭院空间和烟雾氛围生成可剪辑的叙事镜头素材。",
    tags: ["东方人物短片", "场景镜头", "可播放"],
    media: {
      kind: "video",
      url: "videos/24eae46c0eba45f2f1176aa7847307fe.mp4",
      poster: "images/_posters/24eae46c0eba45f2f1176aa7847307fe.webp",
      alt: "古风人物古琴场景视频封面"
    },
    detailRows: [
      { label: "项目类型", value: "东方叙事短片" },
      { label: "我的职责", value: "人物场景设定、镜头提示词、视频生成与整理" },
      { label: "输出内容", value: "可播放人物场景片段与封面" }
    ]
  },
  "video-social-series": {
    id: "video-social-series",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频作品 02",
    title: "产品广告片：耳机开箱镜头",
    description: "以无线耳机主体、开盖展示和产品质感为核心，整理可播放广告片段。",
    tags: ["产品广告片", "耳机产品", "可播放"],
    media: {
      kind: "video",
      url: "videos/b6a39d08c7e48ae9e9604df1f825b8e5.mp4",
      poster: "images/_posters/b6a39d08c7e48ae9e9604df1f825b8e5.webp",
      alt: "无线耳机产品广告视频封面"
    },
    detailRows: [
      { label: "项目类型", value: "产品广告片" },
      { label: "我的职责", value: "产品镜头、生成筛选、封面整理" },
      { label: "输出内容", value: "耳机产品视频片段、封面和投放素材" }
    ]
  },
  "video-digital-human": {
    id: "video-digital-human",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频作品 03",
    title: "数字人视频：东方庭院角色镜头",
    description: "用东方庭院和白衣人物建立数字人角色视觉，突出人物形象与场景一致性。",
    tags: ["数字人视频", "角色镜头", "可播放"],
    media: {
      kind: "video",
      url: "videos/ffcffe00a999d24e399f2eeb2fc45b73.mp4",
      poster: "images/_posters/ffcffe00a999d24e399f2eeb2fc45b73.webp",
      alt: "东方庭院数字人角色视频封面"
    },
    detailRows: [
      { label: "项目类型", value: "数字人角色视频" },
      { label: "我的职责", value: "角色画面、场景氛围、视频生成与整理" },
      { label: "输出内容", value: "可播放数字人角色片段" }
    ]
  },
  "video-packaging-motion": {
    id: "video-packaging-motion",
    kind: "video",
    category: "video",
    duration: "00:08",
    label: "视频作品 04",
    title: "场景特效短片：荒漠爆破镜头",
    description: "以荒漠地貌、爆破火光和镜头运动展示生成式场景特效能力。",
    tags: ["场景特效", "动作镜头", "可播放"],
    media: {
      kind: "video",
      url: "videos/7210c7d10bf0f79baf3cfa2610af4fd7.mp4",
      poster: "images/_posters/7210c7d10bf0f79baf3cfa2610af4fd7.webp",
      alt: "荒漠爆破场景特效视频封面"
    },
    detailRows: [
      { label: "项目类型", value: "场景特效短片" },
      { label: "我的职责", value: "动态镜头设计、特效画面生成、封面整理" },
      { label: "输出内容", value: "荒漠爆破视频片段" }
    ]
  },
  "case-product-ad": {
    id: "case-product-ad",
    kind: "case",
    category: "product",
    label: "商业案例 01",
    title: "黑色耳机｜产品广告视觉",
    description: "强化产品质感、光影层次与高级感构图，适用于品牌 KV、电商主图与详情页视觉。",
    tags: ["产品广告", "品牌 KV", "材质光影"],
    tools: ["ComfyUI", "ControlNet", "Photoshop"],
    media: {
      kind: "image",
      url: "images/curated/case-product-earbuds-black-rock.webp",
      fullUrl: "images/curated/case-product-earbuds-black-rock.webp",
      alt: "黑色无线耳机岩石暗调产品广告主图"
    },
    detailRows: [
      { label: "项目类型", value: "产品广告视觉" },
      { label: "我的职责", value: "产品构图、材质光影、主图筛选" },
      { label: "工具链", value: "ComfyUI / ControlNet / Photoshop" },
      { label: "交付物", value: "产品英雄图、电商主图、广告封面" },
      { label: "商业价值", value: "直接展示产品结构、质感和卖点。" }
    ],
    results: [
      { label: "输出内容", value: "产品英雄图" },
      { label: "能力重点", value: "结构与材质" },
      { label: "使用场景", value: "电商 / 新品发布" }
    ]
  },
  "case-beauty-live": {
    id: "case-beauty-live",
    kind: "case",
    category: "beauty",
    label: "商业案例 02",
    title: "美妆人像｜产品海报视觉",
    description: "结合人物肤质、产品质感与画面氛围，呈现精致、干净的美妆广告风格。",
    tags: ["美妆人像", "产品海报", "肤质细节"],
    tools: ["Midjourney", "Photoshop", "版式整理"],
    media: {
      kind: "image",
      url: "images/curated/case-beauty-foundation-live.webp",
      fullUrl: "images/curated/case-beauty-foundation-live.webp",
      alt: "美妆达人在直播补光场景展示粉底液"
    },
    detailRows: [
      { label: "项目类型", value: "美妆产品视觉" },
      { label: "我的职责", value: "人物气质、产品露出、直播场景整理" },
      { label: "工具链", value: "Midjourney / Photoshop / 版式整理" },
      { label: "交付物", value: "直播封面、社媒主图、产品展示图" },
      { label: "商业价值", value: "让产品、人物和使用场景一眼对应。" }
    ],
    results: [
      { label: "输出内容", value: "美妆直播主图" },
      { label: "能力重点", value: "人物与产品匹配" },
      { label: "使用场景", value: "直播 / 社媒" }
    ]
  },
  "case-brand-space": {
    id: "case-brand-space",
    kind: "case",
    category: "brand",
    label: "商业案例 03",
    title: "冰蓝未来城市｜场景概念视觉",
    description: "通过空间透视、色彩氛围与建筑细节，构建具有科技感的未来城市画面。",
    tags: ["场景概念", "未来城市", "空间透视"],
    tools: ["Midjourney", "Photoshop", "版式整理"],
    media: {
      kind: "image",
      url: "images/curated/case-brand-ice-city-space.webp",
      fullUrl: "images/curated/case-brand-ice-city-space.webp",
      alt: "冰蓝未来城市与玻璃建筑品牌空间主视觉"
    },
    detailRows: [
      { label: "项目类型", value: "品牌空间 / 世界观视觉" },
      { label: "我的职责", value: "空间氛围、主视觉生成、品牌延展整理" },
      { label: "工具链", value: "Midjourney / Photoshop / 版式整理" },
      { label: "交付物", value: "空间主视觉、海报延展、场景概念图" },
      { label: "商业价值", value: "把完整场景图转成可用于品牌空间包装的视觉资产。" }
    ],
    results: [
      { label: "输出内容", value: "品牌空间主视觉" },
      { label: "能力重点", value: "场景与调性" },
      { label: "使用场景", value: "品牌海报 / 空间包装" }
    ]
  },
  "case-fragrance-packaging": {
    id: "case-fragrance-packaging",
    kind: "case",
    category: "packaging",
    label: "商业案例 04",
    title: "香氛礼盒｜包装陈列视觉",
    description: "以礼盒、香氛、道具和环境光影组合，呈现高端礼赠场景与品牌调性。",
    tags: ["包装陈列", "香氛礼盒", "品牌调性"],
    tools: ["Midjourney", "Photoshop", "版式整理"],
    media: {
      kind: "image",
      url: "images/curated/case-fragrance-giftbox-set.webp",
      fullUrl: "images/curated/case-fragrance-giftbox-set.webp",
      alt: "黑金香氛礼盒套装包装商业主图"
    },
    detailRows: [
      { label: "项目类型", value: "包装视觉 / 礼赠主图" },
      { label: "我的职责", value: "香氛套装陈列、礼盒结构、黑金光影气质整理" },
      { label: "工具链", value: "Midjourney / Photoshop / 版式整理" },
      { label: "交付物", value: "包装主图、节日礼盒海报、社媒封面" },
      { label: "商业价值", value: "让香氛产品层级、包装质感和礼赠氛围在首图中同时成立。" }
    ],
    results: [
      { label: "输出内容", value: "礼盒包装主图" },
      { label: "能力重点", value: "产品层级与材质" },
      { label: "使用场景", value: "礼赠海报 / 产品页" }
    ]
  },
  "capability-product-foundation": {
    id: "capability-product-foundation",
    kind: "image",
    category: "product",
    label: "产品广告视觉",
    title: "产品广告视觉：冰感饮品包装",
    description: "用冰块、水花和罐体结构展示饮品广告主图。",
    tags: ["产品广告", "包装视觉", "冰感材质"],
    media: {
      kind: "image",
      url: "images/curated/gpt-image2-ice-beverage-cans.webp",
      fullUrl: "images/curated/gpt-image2-ice-beverage-cans.webp",
      alt: "冰感饮品包装广告产品主图"
    },
    detailRows: [
      { label: "能力方向", value: "产品广告视觉" },
      { label: "证明内容", value: "罐体结构、冰感材质、卖点构图" },
      { label: "输出场景", value: "电商主图 / 商业海报" }
    ]
  },
  "capability-ad-keyframe": {
    id: "capability-ad-keyframe",
    kind: "image",
    category: "product",
    label: "广告关键帧视觉",
    title: "广告关键帧视觉：粉底液主图",
    description: "用单张产品画面确定广告前期的风格、光线和卖点。",
    tags: ["广告关键帧", "镜头参考", "产品主图"],
    media: {
      kind: "image",
      url: "images/curated/gpt-image2-foundation-silk.webp",
      fullUrl: "images/curated/gpt-image2-foundation-silk.webp",
      alt: "粉底液丝缎材质广告关键帧主图"
    },
    detailRows: [
      { label: "能力方向", value: "广告关键帧视觉" },
      { label: "证明内容", value: "产品卖点、光影气质、画面风格" },
      { label: "输出场景", value: "广告前期 / 主视觉提案" }
    ]
  },
  "capability-portrait": {
    id: "capability-portrait",
    kind: "image",
    category: "portrait",
    label: "AI 人像 / 数字人",
    title: "AI 人像 / 数字人：商业肖像视觉",
    description: "统一人物气质、妆发、服装和品牌化呈现。",
    tags: ["AI 人像", "数字人", "角色一致性"],
    media: {
      kind: "image",
      url: "images/curated/gpt-image2-black-portrait.webp",
      fullUrl: "images/curated/gpt-image2-black-portrait.webp",
      alt: "黑色西装女性商业肖像数字人主图"
    },
    detailRows: [
      { label: "能力方向", value: "AI 人像 / 数字人" },
      { label: "证明内容", value: "面部气质、妆发、服装统一" },
      { label: "输出场景", value: "数字人头像 / 角色海报" }
    ]
  },
  "capability-oriental-world": {
    id: "capability-oriental-world",
    kind: "image",
    category: "world",
    label: "东方美学 / 世界观视觉",
    title: "东方美学 / 世界观视觉：云海城邦",
    description: "用东方建筑、云海和幻想生物构建叙事场景。",
    tags: ["东方美学", "场景概念", "世界观"],
    media: {
      kind: "image",
      url: "images/curated/gpt-image2-whale-world.webp",
      fullUrl: "images/curated/gpt-image2-whale-world.webp",
      alt: "东方云海城邦与巨鲸世界观场景"
    },
    detailRows: [
      { label: "能力方向", value: "东方美学 / 世界观视觉" },
      { label: "证明内容", value: "建筑层次、气氛、叙事主体" },
      { label: "输出场景", value: "国风品牌 / 影视概念" }
    ]
  },
  "capability-brand-space": {
    id: "capability-brand-space",
    kind: "image",
    category: "brand",
    label: "品牌空间视觉",
    title: "品牌空间视觉：智能音箱展台",
    description: "用科技产品、光带展台和空间纵深包装品牌主视觉。",
    tags: ["品牌空间", "科技产品", "展台视觉"],
    media: {
      kind: "image",
      url: "images/curated/gpt-image2-smart-speaker-stage.webp",
      fullUrl: "images/curated/gpt-image2-smart-speaker-stage.webp",
      alt: "智能音箱科技展台品牌空间主视觉"
    },
    detailRows: [
      { label: "能力方向", value: "品牌空间视觉" },
      { label: "证明内容", value: "科技产品、展台光效、品牌场景" },
      { label: "输出场景", value: "新品发布 / 空间海报" }
    ]
  },
  "capability-retouch": {
    id: "capability-retouch",
    kind: "image",
    category: "product",
    label: "产品精修 / 材质控制",
    title: "产品精修视觉：红色唇膏质感",
    description: "用口红外壳、红色丝缎和高光控制表达美妆卖点。",
    tags: ["产品精修", "材质光影", "美妆主图"],
    media: {
      kind: "image",
      url: "images/curated/gpt-image2-red-lipstick-packshot.webp",
      fullUrl: "images/curated/gpt-image2-red-lipstick-packshot.webp",
      alt: "红色唇膏和丝缎材质产品精修主图"
    },
    detailRows: [
      { label: "能力方向", value: "产品精修 / 材质控制" },
      { label: "证明内容", value: "瓶身质感、柔光、膏体细节" },
      { label: "输出场景", value: "美妆主图 / 发布海报" }
    ]
  },
  "gallery-drink": {
    id: "gallery-drink",
    kind: "image",
    category: "product",
    label: "饮品产品视觉",
    title: "产品广告视觉：蓝色能量饮品",
    description: "蓝色罐体、水花和冷光环境共同突出清爽卖点。",
    tags: ["饮品广告", "冰感材质", "产品主图"],
    media: { kind: "image", url: "images/curated/gpt-image2-blue-can-energy.webp", fullUrl: "images/curated/gpt-image2-blue-can-energy.webp", alt: "蓝色能量饮品冰感产品广告主图" }
  },
  "gallery-portal": {
    id: "gallery-portal",
    kind: "image",
    category: "product",
    label: "香氛产品视觉",
    title: "产品广告视觉：琥珀香氛瓶",
    description: "暖色香氛瓶、金属装饰和暗调光影形成高端产品氛围。",
    tags: ["香氛广告", "暖调光影", "产品主图"],
    media: { kind: "image", url: "images/curated/gpt-image2-amber-bottle.webp", fullUrl: "images/curated/gpt-image2-amber-bottle.webp", alt: "琥珀香氛瓶高端产品广告主图" }
  },
  "gallery-lipstick": {
    id: "gallery-lipstick",
    kind: "image",
    category: "product",
    label: "户外饮品视觉",
    title: "产品广告视觉：山景饮品海报",
    description: "饮品罐与山景日落结合，适合户外生活方式广告。",
    tags: ["饮品广告", "户外场景", "商业海报"],
    media: { kind: "image", url: "images/curated/gpt-image2-mountain-can.webp", fullUrl: "images/curated/gpt-image2-mountain-can.webp", alt: "山景饮品罐户外商业广告海报" }
  },
  "gallery-beauty-live": {
    id: "gallery-beauty-live",
    kind: "image",
    category: "product",
    label: "瓶装水产品视觉",
    title: "产品广告视觉：城市水瓶主图",
    description: "透明瓶身、城市天际线和清透光感对应饮品广告场景。",
    tags: ["饮品广告", "城市场景", "产品主图"],
    media: { kind: "image", url: "images/curated/gpt-image2-skyline-water-bottle.webp", fullUrl: "images/curated/gpt-image2-skyline-water-bottle.webp", alt: "城市天际线瓶装水产品广告主图" }
  },
  "gallery-giftbox": {
    id: "gallery-giftbox",
    kind: "image",
    category: "product",
    label: "清爽饮品视觉",
    title: "产品广告视觉：青柠气泡水",
    description: "青柠、水花和透明瓶身组合，突出清爽口味和轻盈质感。",
    tags: ["饮品广告", "青柠风味", "产品主图"],
    media: { kind: "image", url: "images/curated/gpt-image2-lime-sparkling-bottle.webp", fullUrl: "images/curated/gpt-image2-lime-sparkling-bottle.webp", alt: "青柠气泡水清爽产品广告主图" }
  },
  "gallery-whale": {
    id: "gallery-whale",
    kind: "image",
    category: "portrait",
    label: "商业人像视觉",
    title: "AI 人像视觉：黑裙礼服海报",
    description: "黑色礼服、酒店走廊和暖色光源形成商务活动人像。",
    tags: ["AI 人像", "礼服海报", "商业肖像"],
    media: { kind: "image", url: "images/curated/gpt-image2-black-dress-portrait.webp", fullUrl: "images/curated/gpt-image2-black-dress-portrait.webp", alt: "黑裙礼服女性商业人像海报" }
  },
  "gallery-monkey": {
    id: "gallery-monkey",
    kind: "image",
    category: "portrait",
    label: "角色视觉",
    title: "角色视觉：月夜城市人物",
    description: "月夜、城市灯火和披风人物形成电影感角色主视觉。",
    tags: ["角色视觉", "电影感", "夜景海报"],
    media: { kind: "image", url: "images/curated/gpt-image2-moonlit-character-scene.webp", fullUrl: "images/curated/gpt-image2-moonlit-character-scene.webp", alt: "月夜城市人物电影感角色主视觉" }
  },
  "gallery-cybercity": {
    id: "gallery-cybercity",
    kind: "image",
    category: "portrait",
    label: "商业人像视觉",
    title: "AI 人像视觉：白色礼服海报",
    description: "白色礼服、干净背景和高挑姿态适合作为时尚人像展示。",
    tags: ["AI 人像", "时尚海报", "商业肖像"],
    media: { kind: "image", url: "images/curated/gpt-image2-white-dress-portrait.webp", fullUrl: "images/curated/gpt-image2-white-dress-portrait.webp", alt: "白色礼服女性商业人像海报" }
  },
  "gallery-beverage-packshot": {
    id: "gallery-beverage-packshot",
    kind: "image",
    category: "product",
    label: "饮品产品视觉",
    title: "产品广告视觉：冰感饮品主图",
    description: "罐体、冰块和冷光环境强化产品清爽感，适合饮品广告和电商主图。",
    tags: ["饮品广告", "冰感包装", "产品主图"],
    media: { kind: "image", url: "images/curated/beverage-ice-packshot.webp", fullUrl: "images/curated/beverage-ice-packshot.webp", alt: "冰感饮品包装产品广告主图" }
  },
  "gallery-brand-city": {
    id: "gallery-brand-city",
    kind: "image",
    category: "brand",
    label: "品牌空间视觉",
    title: "品牌空间视觉：未来城市远景",
    description: "城市尺度、冷光建筑和空间纵深适合品牌视觉、展览海报和场景包装。",
    tags: ["品牌空间", "未来城市", "场景海报"],
    media: { kind: "image", url: "images/curated/brand-city-panorama.webp", fullUrl: "images/curated/brand-city-panorama.webp", alt: "未来城市品牌空间远景海报" }
  },
  "gallery-cosmetic-silk": {
    id: "gallery-cosmetic-silk",
    kind: "image",
    category: "product",
    label: "美妆产品视觉",
    title: "产品广告视觉：丝缎粉底液",
    description: "柔光、丝缎和瓶身高光突出美妆产品的质感和精致度。",
    tags: ["美妆广告", "粉底液", "材质光影"],
    media: { kind: "image", url: "images/curated/cosmetic-foundation-silk.webp", fullUrl: "images/curated/cosmetic-foundation-silk.webp", alt: "丝缎粉底液美妆产品广告主图" }
  },
  "gallery-earbuds-launch": {
    id: "gallery-earbuds-launch",
    kind: "image",
    category: "product",
    label: "科技产品视觉",
    title: "产品广告视觉：耳机新品发布",
    description: "深色背景和产品高光突出科技新品的结构、质感和发布氛围。",
    tags: ["科技产品", "耳机广告", "新品发布"],
    media: { kind: "image", url: "images/curated/commercial-earbuds-launch.webp", fullUrl: "images/curated/commercial-earbuds-launch.webp", alt: "黑色无线耳机新品发布广告主图" }
  },
  "workflow-proof-overview": {
    id: "workflow-proof-overview",
    kind: "workflow",
    category: "workflow",
    label: "工作流证明 01",
    title: "基础生成流程",
    description: "通过文生图 / 图生图完成构图、风格与基础画面生成。",
    tags: ["ComfyUI Workflow", "节点编排", "流程总览"],
    media: {
      kind: "image",
      url: "images/curated/workflow-proof-01-overview.webp",
      fullUrl: "images/curated/workflow-proof-01-overview.webp",
      alt: "ComfyUI 节点工作流总览截图"
    },
    detailRows: [
      { label: "流程路径", value: "输入素材 -> 节点编排 -> 多版本输出" },
      { label: "能力体现", value: "把参考图、控制节点和输出结果组织成可复用链路。" },
      { label: "最终用途", value: "用于面试说明生成流程、节点控制和作品整理方式。" }
    ],
    workflowSteps: ["输入素材", "节点编排", "多版本输出"]
  },
  "workflow-proof-control-chain": {
    id: "workflow-proof-control-chain",
    kind: "workflow",
    category: "workflow",
    label: "工作流证明 02",
    title: "角色一致性控制",
    description: "使用参考图、LoRA、IP-Adapter 等方式稳定人物特征与风格。",
    tags: ["人物控制", "Mask", "局部修正"],
    media: {
      kind: "image",
      url: "images/curated/workflow-proof-02-control-chain.webp",
      fullUrl: "images/curated/workflow-proof-02-control-chain.webp",
      alt: "人物参考和遮罩控制 ComfyUI 工作流截图"
    },
    detailRows: [
      { label: "流程路径", value: "人物参考 -> 遮罩控制 -> 局部修正" },
      { label: "能力体现", value: "通过分区处理保持人物主体、服装和背景关系稳定。" },
      { label: "最终用途", value: "用于人像、数字人和角色视觉的可控生成说明。" }
    ],
    workflowSteps: ["人物参考", "遮罩控制", "局部修正"]
  },
  "workflow-proof-style-variation": {
    id: "workflow-proof-style-variation",
    kind: "workflow",
    category: "workflow",
    label: "工作流证明 03",
    title: "产品与场景优化",
    description: "结合局部重绘、遮罩控制与细节修复，提升画面完成度。",
    tags: ["风格控制", "场景参考", "结果对照"],
    media: {
      kind: "image",
      url: "images/curated/workflow-proof-03-style-variation.webp",
      fullUrl: "images/curated/workflow-proof-03-style-variation.webp",
      alt: "场景参考和风格变化 ComfyUI 工作流截图"
    },
    detailRows: [
      { label: "流程路径", value: "场景参考 -> 参数调节 -> 结果对照" },
      { label: "能力体现", value: "通过多版本对照判断构图、光影和风格稳定性。" },
      { label: "最终用途", value: "用于品牌空间、世界观视觉和海报风格探索。" }
    ],
    workflowSteps: ["场景参考", "参数调节", "结果对照"]
  },
  "workflow-proof-delivery-review": {
    id: "workflow-proof-delivery-review",
    kind: "workflow",
    category: "workflow",
    label: "工作流证明 04",
    title: "视频动态输出",
    description: "基于分镜、关键帧和运动控制，完成 AI 视频片段生成。",
    tags: ["结果筛选", "交付整理", "复盘说明"],
    media: {
      kind: "image",
      url: "images/curated/workflow-proof-04-delivery-review.webp",
      fullUrl: "images/curated/workflow-proof-04-delivery-review.webp",
      alt: "多版本生成结果筛选与交付整理工作流截图"
    },
    detailRows: [
      { label: "流程路径", value: "多版本生成 -> 筛选标记 -> 输出整理" },
      { label: "能力体现", value: "把生成结果转化为能解释决策过程的面试作品证据。" },
      { label: "最终用途", value: "用于说明从过程到作品集展示的整理能力。" }
    ],
    workflowSteps: ["多版本生成", "筛选标记", "输出整理"]
  },
  "gallery-video-d9": {
    id: "gallery-video-d9",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "美妆产品短片：粉底液质感镜头",
    description: "粉底液瓶身在大理石台面上的近景展示，重点呈现产品材质和柔光质感。",
    tags: ["美妆产品", "粉底液", "可播放"],
    media: { kind: "video", url: "videos/d9c14d8520e106a0803087b55aaea7ad.mp4", poster: "images/_posters/d9c14d8520e106a0803087b55aaea7ad.webp", alt: "粉底液产品质感短视频封面" }
  },
  "gallery-video-a6537": {
    id: "gallery-video-a6537",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "直播短视频：饮品带货口播",
    description: "主播出镜展示桌面饮品，适合作为直播切片和社媒转化素材。",
    tags: ["直播口播", "饮品展示", "可播放"],
    media: { kind: "video", url: "videos/a6537e213935b778ba57eade8bbf142a.mp4", poster: "images/_posters/a6537e213935b778ba57eade8bbf142a.webp", alt: "饮品直播带货口播短视频封面" }
  },
  "gallery-video-a0": {
    id: "gallery-video-a0",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "美妆产品短片：粉底液瓶身展示",
    description: "粉底液瓶身横向近景，适合产品详情页、开屏短片和信息流素材。",
    tags: ["粉底液", "产品展示", "可播放"],
    media: { kind: "video", url: "videos/a0e8e242e241cb0c0033bddea568b644.mp4", poster: "images/_posters/a0e8e242e241cb0c0033bddea568b644.webp", alt: "粉底液瓶身展示短视频封面" }
  },
  "gallery-video-voice": {
    id: "gallery-video-voice",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "萌系角色短片：庭院美食镜头",
    description: "卡通角色在庭院餐桌前用餐，适合作为轻剧情、表情和生活方式短视频素材。",
    tags: ["角色短片", "美食场景", "可播放"],
    media: { kind: "video", url: "videos/1774080806307.mp4", poster: "images/_posters/1774080806307.webp", alt: "萌系角色庭院美食短视频封面" }
  },
  "gallery-video-prompt": {
    id: "gallery-video-prompt",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "国风细节短片：发饰近景镜头",
    description: "玉石发饰与发丝细节的近景展示，适合古风角色、饰品和材质细节素材。",
    tags: ["国风发饰", "细节镜头", "可播放"],
    media: { kind: "video", url: "videos/10s AIGC视频提示词方案.mp4", poster: "images/_posters/10s AIGC视频提示词方案.webp", alt: "国风发饰细节短视频封面" }
  },
  "gallery-video-51339": {
    id: "gallery-video-51339",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "珠宝香氛短片：蓝发人物海报",
    description: "蓝发人物与金色饰品的高端广告画面，适合珠宝、香氛和时尚海报动效。",
    tags: ["珠宝香氛", "时尚海报", "可播放"],
    media: { kind: "video", url: "videos/51339bc463f2bb227aef56406ae9f0ac.mp4", poster: "images/_posters/51339bc463f2bb227aef56406ae9f0ac.webp", alt: "蓝发人物珠宝香氛短视频封面" }
  },
  "gallery-video-food": {
    id: "gallery-video-food",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "空气炸锅鸡翅｜食品广告短片",
    description: "基于分镜脚本、画面生成、动态控制与后期剪辑，完成从视觉概念到成片输出的完整流程。",
    tags: ["食品广告", "AI 视频", "商业短片", "镜头控制"],
    media: { kind: "video", url: "videos/commercial-air-fryer-wings.mp4", poster: "images/_posters/commercial-air-fryer-wings.webp", alt: "空气炸锅食物广告视频封面" }
  },
  "video-skincare-elixir-water": {
    id: "video-skincare-elixir-water",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "美妆广告短片：精华液水感主视觉",
    description: "用银色精华瓶、液滴肌理和冷调水感画面建立护肤产品广告气质，适合美妆电商与社媒短片。",
    tags: ["美妆护肤", "精华液", "可播放"],
    media: { kind: "video", url: "videos/commercial-skincare-elixir-water.mp4", poster: "images/_posters/commercial-skincare-elixir-water.webp", alt: "银色精华液水感美妆广告短视频封面" },
    detailRows: [
      { label: "项目类型", value: "美妆产品广告短片" },
      { label: "我的职责", value: "产品氛围、镜头筛选、封面与短片整理" },
      { label: "输出内容", value: "精华液广告短视频、封面和社媒素材" }
    ]
  },
  "video-ev-studio-lighting": {
    id: "video-ev-studio-lighting",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "汽车产品短片：暗棚电动车光影",
    description: "用低调棚拍、车身反光和内饰切换呈现新能源车型的科技感，适合汽车广告关键帧和发布短片。",
    tags: ["汽车广告", "科技光影", "可播放"],
    media: { kind: "video", url: "videos/commercial-ev-studio-lighting.mp4", poster: "images/_posters/commercial-ev-studio-lighting.webp", alt: "暗棚电动车光影产品广告短视频封面" },
    detailRows: [
      { label: "项目类型", value: "汽车产品广告短片" },
      { label: "我的职责", value: "棚拍光影、车身质感、动态镜头整理" },
      { label: "输出内容", value: "电动车产品短视频、广告关键帧和封面" }
    ]
  },
  "video-ice-maker-cubes": {
    id: "video-ice-maker-cubes",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "小家电短片：制冰机冰感演示",
    description: "通过冰块、倒水和制冰机机身近景呈现清爽功能卖点，适合厨房小家电和夏季饮品广告素材。",
    tags: ["小家电", "冰感饮品", "可播放"],
    media: { kind: "video", url: "videos/commercial-ice-maker-cubes.mp4", poster: "images/_posters/commercial-ice-maker-cubes.webp", alt: "制冰机冰感功能演示短视频封面" },
    detailRows: [
      { label: "项目类型", value: "小家电功能广告短片" },
      { label: "我的职责", value: "功能镜头筛选、冰感卖点整理、封面输出" },
      { label: "输出内容", value: "制冰机产品短视频、详情页动效素材" }
    ]
  },
  "video-mattress-healing-bedroom": {
    id: "video-mattress-healing-bedroom",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "家居广告短片：床垫治愈风场景",
    description: "用柔和卧室、织物细节和床垫陈列表现舒适睡眠氛围，适合家居产品广告与详情页视频。",
    tags: ["家居产品", "床垫广告", "可播放"],
    media: { kind: "video", url: "videos/commercial-mattress-healing-bedroom.mp4", poster: "images/_posters/commercial-mattress-healing-bedroom.webp", alt: "柔和卧室床垫家居广告短视频封面" },
    detailRows: [
      { label: "项目类型", value: "家居产品广告短片" },
      { label: "我的职责", value: "卧室场景、材质细节、生活方式镜头整理" },
      { label: "输出内容", value: "床垫宣传短视频、详情页封面和社媒素材" }
    ]
  },
  "video-animated-street-story": {
    id: "video-animated-street-story",
    kind: "video",
    category: "video",
    duration: "01:48",
    label: "视频入口",
    title: "动画街景短片：商业场景叙事镜头",
    description: "横版动画街区与角色运动镜头，适合展示场景调度、镜头节奏和连续叙事画面组织能力。",
    tags: ["场景短片", "动画街景", "镜头调度"],
    media: { kind: "video", url: "videos/commercial-animated-street-story.mp4", poster: "images/_posters/commercial-animated-street-story.webp", alt: "动画街景商业场景叙事短片封面" },
    detailRows: [
      { label: "项目类型", value: "横版场景叙事短片" },
      { label: "我的职责", value: "场景镜头筛选、节奏整理、封面输出" },
      { label: "输出内容", value: "可播放横版场景短片和视频封面" }
    ]
  },
  "video-mirror-beauty-routine": {
    id: "video-mirror-beauty-routine",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "镜前美妆短片：护肤氛围镜头",
    description: "竖屏镜前人物、美妆瓶身和柔和卧室光影组合，适合美妆氛围广告与社媒短片。",
    tags: ["美妆氛围", "竖屏短片", "人物场景"],
    media: { kind: "video", url: "videos/commercial-mirror-beauty-routine.mp4", poster: "images/_posters/commercial-mirror-beauty-routine.webp", alt: "镜前美妆护肤氛围竖屏短片封面" },
    detailRows: [
      { label: "项目类型", value: "美妆氛围广告短片" },
      { label: "我的职责", value: "人物场景、产品露出、竖屏节奏整理" },
      { label: "输出内容", value: "可用于社媒投放的 9:16 美妆短片" }
    ]
  },
  "video-sereni-story-product": {
    id: "video-sereni-story-product",
    kind: "video",
    category: "video",
    duration: "00:10",
    label: "视频入口",
    title: "连续剧情短片：舒缓产品细节镜头",
    description: "竖屏产品细节与生活方式氛围结合，展示短剧情视频里商品露出、细节推进和情绪节奏。",
    tags: ["连续剧情", "产品细节", "竖屏短片"],
    media: { kind: "video", url: "videos/commercial-sereni-story-product.mp4", poster: "images/_posters/commercial-sereni-story-product.webp", alt: "舒缓产品连续剧情竖屏短片封面" },
    detailRows: [
      { label: "项目类型", value: "产品剧情广告短片" },
      { label: "我的职责", value: "商品细节、镜头节奏、剧情切片整理" },
      { label: "输出内容", value: "可播放竖屏剧情短片和详情页视频素材" }
    ]
  },
};

const DETAIL_PAGE_SHOWCASE_ITEMS = [
  {
    id: "detail-electric-toothbrush",
    label: "详情图 01",
    title: "声波电动牙刷详情图",
    shortTitle: "电动牙刷",
    category: "口腔护理详情页",
    image: "images/curated/detail-pages/detail-electric-toothbrush.webp",
    description: "用清洁场景、刷头细节、模式说明和参数表组织完整电商详情页，强调清新、温和和日常护理感。",
    tags: ["口腔护理", "产品详情", "清新质感"]
  },
  {
    id: "detail-handheld-vacuum",
    label: "详情图 02",
    title: "轻巧无线手持吸尘器详情图",
    shortTitle: "手持吸尘器",
    category: "清洁电器详情页",
    image: "images/curated/detail-pages/detail-handheld-vacuum.webp",
    description: "围绕吸力、过滤、续航、刷头和生活场景拆解卖点，适合展示家电类产品的详情页节奏。",
    tags: ["清洁电器", "卖点拆解", "生活场景"]
  },
  {
    id: "detail-hair-dryer",
    label: "详情图 03",
    title: "轻音吹风机详情图",
    shortTitle: "吹风机",
    category: "个护电器详情页",
    image: "images/curated/detail-pages/detail-hair-dryer.webp",
    description: "用柔和风感、护发场景、出风结构和包装参数表达个护产品的温柔质感与功能可信度。",
    tags: ["个护电器", "护发场景", "功能说明"]
  },
  {
    id: "detail-eye-care-desk-lamp",
    label: "详情图 04",
    title: "全光谱护眼台灯详情图",
    shortTitle: "护眼台灯",
    category: "学习办公详情页",
    image: "images/curated/detail-pages/detail-eye-care-desk-lamp.webp",
    description: "以桌面主视觉、光源对比、调节结构和认证信息建立护眼台灯的功能层级。",
    tags: ["护眼台灯", "学习办公", "认证信息"]
  },
  {
    id: "detail-travel-suitcase",
    label: "详情图 05",
    title: "轻奢质感旅行箱详情图",
    shortTitle: "旅行箱",
    category: "旅行用品详情页",
    image: "images/curated/detail-pages/detail-travel-suitcase.webp",
    description: "通过箱体、万向轮、收纳结构、拉杆细节和旅行场景，完整呈现出行产品的使用价值。",
    tags: ["旅行用品", "结构细节", "出行场景"]
  },
  {
    id: "detail-aroma-diffuser",
    label: "详情图 06",
    title: "便携香薰机详情图",
    shortTitle: "香薰机",
    category: "生活方式详情页",
    image: "images/curated/detail-pages/detail-aroma-diffuser.webp",
    description: "用香氛、雾化、灯光氛围和供电方式组织小家电详情页，突出舒缓生活方式。",
    tags: ["香薰机", "生活方式", "氛围灯光"]
  },
  {
    id: "detail-thermal-cup",
    label: "详情图 07",
    title: "便携保温杯详情图",
    shortTitle: "保温杯",
    category: "杯壶详情页",
    image: "images/curated/detail-pages/detail-thermal-cup.webp",
    description: "以保温保冷、密封防漏、材质安全和出行场景构建日用杯壶产品的信任感。",
    tags: ["杯壶", "出行场景", "材质安全"]
  },
  {
    id: "detail-aurora-earbuds",
    label: "详情图 08",
    title: "AURORA 真无线降噪耳机详情图",
    shortTitle: "降噪耳机",
    category: "数码音频详情页",
    image: "images/curated/detail-pages/detail-aurora-earbuds.webp",
    description: "将降噪、音质、芯片、续航、防水和认证组合成数码产品详情页，突出专业与轻便。",
    tags: ["数码音频", "降噪耳机", "参数说明"]
  },
  {
    id: "detail-memory-foam-seat-cushion",
    label: "详情图 09",
    title: "慢回弹记忆棉坐垫详情图",
    shortTitle: "记忆棉坐垫",
    category: "家居健康详情页",
    image: "images/curated/detail-pages/detail-memory-foam-seat-cushion.webp",
    description: "围绕坐姿支撑、材质触感、防滑底部、收纳细节和多场景使用呈现家居健康卖点。",
    tags: ["家居健康", "人体工学", "材质细节"]
  },
  {
    id: "detail-laptop-stand",
    label: "详情图 10",
    title: "轻薄笔记本支架详情图",
    shortTitle: "笔记本支架",
    category: "办公配件详情页",
    image: "images/curated/detail-pages/detail-laptop-stand.webp",
    description: "以抬高视角、散热结构、折叠便携和金属工艺说明办公配件的实用性。",
    tags: ["办公配件", "结构设计", "便携收纳"]
  },
  {
    id: "detail-zero-pressure-pillow",
    label: "详情图 11",
    title: "慢回弹 0 压枕详情图",
    shortTitle: "0 压枕",
    category: "睡眠家居详情页",
    image: "images/curated/detail-pages/detail-zero-pressure-pillow.webp",
    description: "通过颈椎支撑、透气网孔、双向高度和认证参数，表达睡眠产品的舒适与安全。",
    tags: ["睡眠家居", "颈椎支撑", "安全认证"]
  },
  {
    id: "detail-bath-gift-set",
    label: "详情图 12",
    title: "植萃润养洗护沐浴礼盒详情图",
    shortTitle: "洗护礼盒",
    category: "洗护礼盒详情页",
    image: "images/curated/detail-pages/detail-bath-gift-set.webp",
    description: "用植萃成分、泡沫清洁、香气层次、礼盒包装和送礼场景体现洗护套装的礼赠感。",
    tags: ["洗护礼盒", "植萃配方", "礼赠场景"]
  },
  {
    id: "detail-nonstick-pan",
    label: "详情图 13",
    title: "不粘煎锅详情图",
    shortTitle: "不粘煎锅",
    category: "厨房用品详情页",
    image: "images/curated/detail-pages/detail-nonstick-pan.webp",
    description: "以烹饪主图、不粘涂层、均匀导热、适配炉具和包装参数组织厨房用品详情页。",
    tags: ["厨房用品", "不粘锅", "烹饪场景"]
  }
];

const HOMEPAGE_CURATION = {
  hero: {
    featuredId: "hero-main-visual"
  },
  videoFeaturedIds: [
    "gallery-video-food",
    "video-skincare-elixir-water",
    "video-ev-studio-lighting",
    "video-ice-maker-cubes",
    "video-mattress-healing-bedroom",
    "gallery-video-d9",
    "video-social-series",
    "video-digital-human",
    "video-mirror-beauty-routine",
    "video-sereni-story-product",
    "video-animated-street-story"
  ],
  commercialImageCaseIds: [
    "case-product-ad",
    "case-beauty-live",
    "case-brand-space",
    "case-fragrance-packaging"
  ],
  commercialVideoCaseIds: [],
  capabilityCards: [
    {
      key: "product-ad",
      title: "产品广告视觉",
      workId: "capability-product-foundation",
      description: "冰感饮品包装、电商主图和商业海报主视觉。",
      tags: ["产品广告", "包装视觉", "冰感材质"]
    },
    {
      key: "ad-keyframe",
      title: "广告关键帧视觉",
      workId: "capability-ad-keyframe",
      description: "用单张产品画面确定广告前期的风格和卖点。",
      tags: ["广告关键帧", "镜头参考", "产品主图"]
    },
    {
      key: "portrait-digital-human",
      title: "AI 人像 / 数字人",
      workId: "capability-portrait",
      description: "统一人物气质、妆发、服装和商业呈现。",
      tags: ["AI 人像", "数字人", "角色一致性"]
    },
    {
      key: "oriental-world",
      title: "东方美学 / 世界观视觉",
      workId: "capability-oriental-world",
      description: "用东方建筑、云海和幻想生物构建叙事场景。",
      tags: ["东方美学", "场景概念", "世界观"]
    },
    {
      key: "brand-space",
      title: "品牌空间视觉",
      workId: "capability-brand-space",
      description: "用科技展台和产品光效包装品牌主视觉。",
      tags: ["品牌空间", "科技产品", "展台视觉"]
    },
    {
      key: "product-retouch",
      title: "产品精修 / 材质控制",
      workId: "capability-retouch",
      description: "用口红外壳、红色丝缎和高光控制表达美妆卖点。",
      tags: ["产品精修", "材质光影", "美妆主图"]
    }
  ],
  visualGalleryIds: [
    "gallery-drink",
    "gallery-portal",
    "gallery-lipstick",
    "gallery-beauty-live",
    "gallery-giftbox",
    "gallery-whale",
    "gallery-monkey",
    "gallery-cybercity",
    "gallery-beverage-packshot",
    "gallery-brand-city",
    "gallery-cosmetic-silk",
    "gallery-earbuds-launch"
  ],
  workflowEvidenceIds: [
    "workflow-proof-overview",
    "workflow-proof-control-chain",
    "workflow-proof-style-variation",
    "workflow-proof-delivery-review"
  ]
};

const WORKFLOW_EVIDENCE_NOTES = {
  "workflow-proof-overview": "基础生成流程｜通过文生图 / 图生图完成构图、风格与基础画面生成。",
  "workflow-proof-control-chain": "角色一致性控制｜使用参考图、LoRA、IP-Adapter 等方式稳定人物特征与风格。",
  "workflow-proof-style-variation": "产品与场景优化｜结合局部重绘、遮罩控制与细节修复，提升画面完成度。",
  "workflow-proof-delivery-review": "视频动态输出｜基于分镜、关键帧和运动控制，完成 AI 视频片段生成。"
};

const colorPalettes = [
  { id: "cyan", a: "bg-cyan-600/20", b: "bg-fuchsia-600/15", c: "bg-blue-600/20", line: "bg-cyan-500/50", text: "text-cyan-100/60" },
  { id: "emerald", a: "bg-emerald-600/20", b: "bg-teal-600/15", c: "bg-cyan-600/20", line: "bg-emerald-500/50", text: "text-emerald-100/60" },
  { id: "rose", a: "bg-rose-600/20", b: "bg-orange-600/15", c: "bg-pink-600/20", line: "bg-rose-500/50", text: "text-rose-100/60" },
  { id: "violet", a: "bg-violet-600/20", b: "bg-purple-600/15", c: "bg-indigo-600/20", line: "bg-violet-500/50", text: "text-violet-100/60" },
  { id: "amber", a: "bg-amber-600/20", b: "bg-red-600/15", c: "bg-orange-600/20", line: "bg-amber-500/50", text: "text-amber-100/60" }
];

const HOMEPAGE_FONT_PRESETS = [
  { id: "system", label: "系统清爽", css: 'Inter, "PingFang SC", "Microsoft YaHei", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' },
  { id: "editorial", label: "杂志标题", css: 'Georgia, "Songti SC", "SimSun", "PingFang SC", serif' },
  { id: "condensed", label: "窄体展览", css: '"Arial Narrow", "Roboto Condensed", "PingFang SC", "Microsoft YaHei", sans-serif' },
  { id: "mono", label: "工业等宽", css: '"SFMono-Regular", Consolas, "Liberation Mono", "PingFang SC", monospace' }
];

const HOMEPAGE_COLOR_PRESETS = [
  {
    id: "cyan-amber",
    label: "冷青 / 金色",
    swatches: ["#66d9ff", "#e3c979", "#07121b"],
    style: {
      "--portfolio-accent": "#66d9ff",
      "--portfolio-border": "rgba(120, 210, 255, 0.14)",
      "--curated-accent": "#66d9ff",
      "--curated-accent-2": "#e3c979",
      "--curated-border": "rgba(120, 210, 255, 0.14)",
      "--curated-cyan": "#8ee8ff",
      "--curated-gold": "#e3c979",
      "--curated-line-strong": "rgba(120, 210, 255, 0.28)",
      "--curated-card-bg": "linear-gradient(180deg, rgba(12, 30, 44, 0.94), rgba(5, 14, 22, 0.96))",
      "--curated-card-bg-strong": "linear-gradient(180deg, rgba(15, 38, 54, 0.96), rgba(7, 18, 28, 0.98))"
    }
  },
  {
    id: "jade-crimson",
    label: "青玉 / 绯红",
    swatches: ["#48d8c6", "#b94131", "#09120f"],
    style: {
      "--portfolio-accent": "#48d8c6",
      "--portfolio-border": "rgba(72, 216, 198, 0.16)",
      "--curated-accent": "#48d8c6",
      "--curated-accent-2": "#b94131",
      "--curated-border": "rgba(72, 216, 198, 0.16)",
      "--curated-cyan": "#82f1e3",
      "--curated-gold": "#e0b277",
      "--curated-line-strong": "rgba(72, 216, 198, 0.3)",
      "--curated-card-bg": "linear-gradient(180deg, rgba(13, 32, 29, 0.94), rgba(6, 14, 13, 0.96))",
      "--curated-card-bg-strong": "linear-gradient(180deg, rgba(18, 45, 40, 0.96), rgba(7, 18, 16, 0.98))"
    }
  },
  {
    id: "white-coral",
    label: "白光 / 珊瑚",
    swatches: ["#f8fbff", "#ff8a7a", "#111318"],
    style: {
      "--portfolio-accent": "#f8fbff",
      "--portfolio-border": "rgba(255, 138, 122, 0.16)",
      "--curated-accent": "#f8fbff",
      "--curated-accent-2": "#ff8a7a",
      "--curated-border": "rgba(255, 138, 122, 0.16)",
      "--curated-cyan": "#bfefff",
      "--curated-gold": "#ffbd8a",
      "--curated-line-strong": "rgba(255, 138, 122, 0.3)",
      "--curated-card-bg": "linear-gradient(180deg, rgba(29, 31, 38, 0.94), rgba(10, 12, 16, 0.97))",
      "--curated-card-bg-strong": "linear-gradient(180deg, rgba(38, 40, 48, 0.96), rgba(15, 17, 22, 0.98))"
    }
  },
  {
    id: "ink-lime",
    label: "墨黑 / 荧绿",
    swatches: ["#b8ff6d", "#5bd8ff", "#050806"],
    style: {
      "--portfolio-accent": "#b8ff6d",
      "--portfolio-border": "rgba(184, 255, 109, 0.15)",
      "--curated-accent": "#b8ff6d",
      "--curated-accent-2": "#5bd8ff",
      "--curated-border": "rgba(184, 255, 109, 0.15)",
      "--curated-cyan": "#8ee8ff",
      "--curated-gold": "#d4ff8a",
      "--curated-line-strong": "rgba(184, 255, 109, 0.26)",
      "--curated-card-bg": "linear-gradient(180deg, rgba(18, 31, 18, 0.94), rgba(6, 10, 7, 0.97))",
      "--curated-card-bg-strong": "linear-gradient(180deg, rgba(25, 44, 24, 0.96), rgba(8, 14, 9, 0.98))"
    }
  }
];

const HOMEPAGE_RADIUS_PRESETS = [
  { id: "sharp", label: "硬朗", value: "8px" },
  { id: "soft", label: "柔和", value: "14px" },
  { id: "poster", label: "海报", value: "22px" }
];

const HOMEPAGE_DENSITY_PRESETS = [
  { id: "compact", label: "紧凑", sectionPadding: "clamp(48px, 5.6vw, 78px)", headingGap: "18px", cardGap: "12px" },
  { id: "comfortable", label: "常规", sectionPadding: "clamp(62px, 7vw, 104px)", headingGap: "26px", cardGap: "18px" },
  { id: "spacious", label: "留白", sectionPadding: "clamp(78px, 8.4vw, 126px)", headingGap: "34px", cardGap: "24px" }
];

const HOMEPAGE_ELEMENT_STYLE_PRESETS = [
  { id: "default", label: "默认" },
  { id: "featured", label: "重点" },
  { id: "quiet", label: "低调" },
  { id: "compact", label: "紧凑" }
];

const HOMEPAGE_SECTION_VISIBILITY_OPTIONS = [
  { id: "featured", label: "精选入口" },
  { id: "videos", label: "视频精选" },
  { id: "cases", label: "精选案例" },
  { id: "details", label: "详情图展示" },
  { id: "capabilities", label: "能力矩阵" },
  { id: "process", label: "工作流模块" },
  { id: "contact", label: "联系模块" }
];

const HOMEPAGE_PROCESS_BLOCKS = [
  { id: "process.workflowEvidence", label: "工作流证明" },
  { id: "process.workflowLab", label: "三步流程卡" },
  { id: "process.steps", label: "流程步骤" },
  { id: "process.skills", label: "技能标签" }
];

const HOMEPAGE_BLOCK_DEFAULTS = {
  "process.workflowEvidence": { hidden: false },
  "process.workflowLab": { hidden: true },
  "process.steps": { hidden: true },
  "process.skills": { hidden: true }
};

const getPresetById = (presets, presetId, fallbackId) => presets.find((preset) => preset.id === presetId) || presets.find((preset) => preset.id === fallbackId) || presets[0];

const normalizeHomepageDesignerTheme = (theme = {}) => ({
  fontPreset: getPresetById(HOMEPAGE_FONT_PRESETS, theme?.fontPreset, "system").id,
  colorPreset: getPresetById(HOMEPAGE_COLOR_PRESETS, theme?.colorPreset, "cyan-amber").id,
  radiusPreset: getPresetById(HOMEPAGE_RADIUS_PRESETS, theme?.radiusPreset, "soft").id,
  densityPreset: getPresetById(HOMEPAGE_DENSITY_PRESETS, theme?.densityPreset, "comfortable").id
});

const getHomepageDesignerThemeStyle = (theme = {}) => {
  const normalized = normalizeHomepageDesignerTheme(theme);
  const font = getPresetById(HOMEPAGE_FONT_PRESETS, normalized.fontPreset, "system");
  const color = getPresetById(HOMEPAGE_COLOR_PRESETS, normalized.colorPreset, "cyan-amber");
  const radius = getPresetById(HOMEPAGE_RADIUS_PRESETS, normalized.radiusPreset, "soft");
  const density = getPresetById(HOMEPAGE_DENSITY_PRESETS, normalized.densityPreset, "comfortable");
  return {
    "--curated-font-family": font.css,
    "--portfolio-radius-card": radius.value,
    "--curated-radius": radius.value,
    "--curated-section-padding": density.sectionPadding,
    "--curated-heading-gap": density.headingGap,
    "--curated-card-gap": density.cardGap,
    ...color.style
  };
};

const normalizeHomepageDesignerBlocks = (blocks = {}) => {
  const source = blocks && typeof blocks === "object" ? blocks : {};
  const normalized = {};
  Object.entries(HOMEPAGE_BLOCK_DEFAULTS).forEach(([blockId, defaults]) => {
    const current = source[blockId] && typeof source[blockId] === "object" ? source[blockId] : {};
    normalized[blockId] = {
      ...defaults,
      ...current,
      hidden: current.hidden === undefined ? defaults.hidden === true : current.hidden === true
    };
  });
  Object.entries(source).forEach(([blockId, block]) => {
    if (normalized[blockId]) return;
    normalized[blockId] = {
      ...(block && typeof block === "object" ? block : {}),
      hidden: block?.hidden === true
    };
  });
  return normalized;
};

const normalizeHomepageDesignerConfig = (designer = {}) => {
  const source = designer && typeof designer === "object" ? designer : {};
  return {
    ...source,
    sections: source.sections && typeof source.sections === "object" ? source.sections : {},
    works: source.works && typeof source.works === "object" ? source.works : {},
    blocks: normalizeHomepageDesignerBlocks(source.blocks),
    theme: normalizeHomepageDesignerTheme(source.theme)
  };
};

const cx = (...classNames) => classNames.filter(Boolean).join(" ");

const normalizeRepoMediaPath = (value = "") => String(value || "")
  .trim()
  .replace(/^https?:\/\/www\.zhangweivisual\.cn\//i, "")
  .replace(/^\/+/, "")
  .replace(/\\/g, "/")
  .split(/[?#]/)[0];

const parseDesignerTags = (value = "") => String(value || "")
  .split(/[,，、/]/)
  .map((item) => item.trim())
  .filter(Boolean);
const reportIgnoredError = (error) => {
  if (error && typeof console !== "undefined") console.warn("[portfolio-nonblocking]", error);
};
const parseDesignerDetailRows = (value = "") => String(value || "")
  .split(/\r?\n/)
  .map((line) => {
    const [label, ...rest] = line.split(/[:：]/);
    return { label: String(label || "").trim(), value: rest.join("：").trim() };
  })
  .filter((row) => row.label || row.value);
const formatDesignerDetailRows = (rows = []) => (Array.isArray(rows) ? rows : [])
  .map((row) => `${row?.label || ""}：${row?.value || ""}`.trim())
  .filter(Boolean)
  .join("\n");
const deepClone = (value) => JSON.parse(JSON.stringify(value));
const ensureString = (value, fallback = "") => typeof value === "string" ? value : fallback;
const ensureStringArray = (value) => Array.isArray(value) ? value.map((item) => String(item ?? "").trim()).filter(Boolean) : [];
const getByteSize = (value) => new TextEncoder().encode(typeof value === "string" ? value : JSON.stringify(value ?? null)).length;
const formatBytes = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 KB";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};
const getPortfolioSizeTone = (bytes) => bytes > PORTFOLIO_BLOCK_BYTES ? "danger" : bytes >= PORTFOLIO_WARN_BYTES ? "warning" : "safe";
const inferMediaKind = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return "image";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "youtube";
  if (normalized.includes("bilibili.com/video/") || normalized.includes("b23.tv/")) return "video";
  if (normalized.includes("douyin.com") || normalized.includes("iesdouyin.com") || normalized.includes("v.douyin.com")) return "video";
  if (normalized.includes("tiktok.com")) return "video";
  if (/\.(mp4|webm|mov|m4v|ogg)(\?|#|$)/.test(normalized)) return "video";
  if (normalized.includes("/video/upload/") || normalized.includes("/video/authenticated/")) return "video";
  return "image";
};

const extractYouTubeId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (/^[a-zA-Z0-9_-]{11}$/.test(raw)) return raw;

  try {
    const url = new URL(raw);
    if (url.hostname.includes("youtu.be")) return url.pathname.replace("/", "").trim();
    if (url.searchParams.has("v")) return url.searchParams.get("v");
    const segments = url.pathname.split("/").filter(Boolean);
    const marker = segments.findIndex((segment) => segment === "embed" || segment === "shorts");
    if (marker >= 0 && segments[marker + 1]) return segments[marker + 1];
  } catch (error) {
    return "";
  }

  return "";
};

const getYouTubeEmbedUrl = (value = "") => {
  const id = extractYouTubeId(value);
  return id ? `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1` : "";
};

const getYouTubeThumbnail = (value = "") => {
  const id = extractYouTubeId(value);
  return id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : "";
};

const extractBilibiliId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const bvMatch = raw.match(/BV[a-zA-Z0-9]+/);
  if (bvMatch) return bvMatch[0];
  const avMatch = raw.match(/av\d+/i);
  if (avMatch) return avMatch[0].toLowerCase();

  try {
    const url = new URL(raw);
    const pathMatch = url.pathname.match(/\/video\/(BV[a-zA-Z0-9]+|av\d+)/i);
    if (pathMatch) return pathMatch[1];
  } catch (error) {
    return "";
  }

  return "";
};

const getBilibiliEmbedUrl = (value = "") => {
  const id = extractBilibiliId(value);
  return id ? `https://player.bilibili.com/player.html?bvid=${id.replace(/^av/i, "") === id ? id : ""}${id.toLowerCase().startsWith("av") ? `&aid=${id.slice(2)}` : ""}&page=1` : "";
};

const isBilibiliVideoUrl = (value = "") => /(?:bilibili\.com|b23\.tv|player\.bilibili\.com)/i.test(String(value || "").trim());

const extractDouyinVideoId = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  const directMatch = raw.match(/(?:douyin\.com\/video\/|open\.douyin\.com\/player\/video\?vid=)(\d{10,})/i);
  if (directMatch) return directMatch[1];
  const numberMatch = raw.match(/\b(\d{10,})\b/);
  return numberMatch ? numberMatch[1] : "";
};

const getDouyinEmbedUrl = (value = "") => {
  const id = extractDouyinVideoId(value);
  return id ? `https://open.douyin.com/player/video?vid=${id}&autoplay=0` : "";
};

const isDirectVideoSource = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  if (!normalized) return false;
  if (normalized.startsWith("blob:")) return true;
  if (/\.(mp4|webm|mov|m4v|ogg|m3u8)(\?|#|$)/.test(normalized)) return true;
  if (normalized.includes("/video/upload/") || normalized.includes("/video/authenticated/")) return true;
  return false;
};

const getVideoEmbedUrl = (value = "") => {
  return getYouTubeEmbedUrl(value) || getBilibiliEmbedUrl(value) || getDouyinEmbedUrl(value) || "";
};

const normalizeStreamDelivery = (value) => {
  if (!value || typeof value !== "object") return null;
  return {
    provider: typeof value.provider === "string" ? value.provider.trim() : "",
    uid: typeof value.uid === "string" ? value.uid.trim() : "",
    hlsUrl: typeof value.hlsUrl === "string" ? value.hlsUrl.trim() : "",
    iframeUrl: typeof value.iframeUrl === "string" ? value.iframeUrl.trim() : "",
    thumbnailUrl: typeof value.thumbnailUrl === "string" ? value.thumbnailUrl.trim() : ""
  };
};

const toPositiveNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : 0;
};

const normalizeMediaItem = (item) => {
  if (!item) return null;
  if (typeof item === "string") return { kind: inferMediaKind(item), url: item, poster: "", meta: "", draftPreviewUrl: "", label: "", fullUrl: "", width: 0, height: 0, alt: "", externalProvider: "", delivery: null };

  const rawUrl = typeof item.url === "string" ? item.url.trim() : "";
  const youtubeId = extractYouTubeId(item.youtubeId || rawUrl);
  const kind = item.kind || (youtubeId ? "youtube" : item.isVideo ? "video" : inferMediaKind(rawUrl));

  return {
    kind,
    url: kind === "youtube" && youtubeId ? youtubeId : rawUrl,
    poster: typeof item.poster === "string" ? item.poster.trim() : "",
    meta: typeof item.meta === "string" ? item.meta : "",
    draftPreviewUrl: item.draftPreviewUrl && item.draftPreviewUrl.startsWith("blob:") ? item.draftPreviewUrl : "",
    label: typeof item.label === "string" ? item.label : "",
    fullUrl: typeof item.fullUrl === "string" ? item.fullUrl.trim() : "",
    width: toPositiveNumber(item.width),
    height: toPositiveNumber(item.height),
    alt: typeof item.alt === "string" ? item.alt.trim() : "",
    externalProvider: typeof item.externalProvider === "string" ? item.externalProvider.trim() : "",
    curatedHidden: item.curatedHidden === true,
    curatedCategory: typeof item.curatedCategory === "string" ? item.curatedCategory.trim() : "",
    workflowSteps: Array.isArray(item.workflowSteps) ? item.workflowSteps.map((step) => String(step ?? "").trim()).filter(Boolean) : [],
    workflowAbility: typeof item.workflowAbility === "string" ? item.workflowAbility.trim() : "",
    workflowOutcome: typeof item.workflowOutcome === "string" ? item.workflowOutcome.trim() : "",
    delivery: normalizeStreamDelivery(item.delivery)
  };
};

const applyMediaFieldChange = (current, field, value) => {
  const next = { ...current, [field]: value };
  if (field === "url" && String(value || "").trim()) {
    next.draftPreviewUrl = "";
  }
  return next;
};

const buildPublishedAssetPath = (file) => {
  if (!file) return "";
  const rawName = String(file.name || "").trim();
  if (!rawName) return "";
  const fileName = rawName.split(/[\\/]/).pop();
  if (!fileName) return "";

  const mime = String(file.type || "").toLowerCase();
  if (mime.startsWith("video/")) return `videos/${fileName}`;
  if (mime.startsWith("image/")) return `images/${fileName}`;

  if (/\.(mp4|webm|mov|m4v|ogg|mkv)$/i.test(fileName)) return `videos/${fileName}`;
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/i.test(fileName)) return `images/${fileName}`;

  return "";
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const createFreeLayoutElement = (type) => {
  const base = {
    id: `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    type,
    x: 12,
    y: 12,
    w: type === "text" ? 28 : 36,
    h: type === "text" ? 18 : 32,
    z: 1
  };

  if (type === "text") {
    return {
      ...base,
      text: "输入展示文字",
      animation: "none",
      animationDuration: 1.2,
      animationDelay: 0
    };
  }

  return {
    ...base,
    media: normalizeMediaItem({ kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" })
  };
};

const normalizeFreeLayoutElement = (element) => {
  const fallback = createFreeLayoutElement(element?.type === "media" ? "media" : "text");
  const normalized = {
    ...fallback,
    ...element,
    x: clamp(Number(element?.x ?? fallback.x) || fallback.x, 0, 88),
    y: clamp(Number(element?.y ?? fallback.y) || fallback.y, 0, 88),
    w: clamp(Number(element?.w ?? fallback.w) || fallback.w, 12, 100),
    h: clamp(Number(element?.h ?? fallback.h) || fallback.h, 10, 100),
    z: clamp(Number(element?.z ?? fallback.z) || fallback.z, 1, 999)
  };

  if (normalized.type === "media") {
    normalized.media = normalizeMediaItem(element?.media) || normalizeMediaItem(fallback.media);
  } else {
    normalized.text = typeof element?.text === "string" ? element.text : fallback.text;
    normalized.animation = ["none", "fade-up", "typewriter"].includes(element?.animation) ? element.animation : fallback.animation;
    normalized.animationDuration = clamp(Number(element?.animationDuration ?? fallback.animationDuration) || fallback.animationDuration, 0.2, 8);
    normalized.animationDelay = clamp(Number(element?.animationDelay ?? fallback.animationDelay) || fallback.animationDelay, 0, 8);
  }

  return normalized;
};

const normalizeSlide = (slide) => {
  const normalized = {
    ...slide,
    media: Array.isArray(slide.media) ? slide.media.map(normalizeMediaItem) : []
  };

  if (Array.isArray(slide.freeLayoutElements)) {
    normalized.freeLayoutElements = slide.freeLayoutElements
      .map((element, index) => normalizeFreeLayoutElement({
        ...element,
        z: Number.isFinite(Number(element?.z)) ? Number(element.z) : index + 1
      }))
      .sort((a, b) => a.z - b.z)
      .map((element, index) => ({ ...element, z: index + 1 }));
  } else if (normalized.type === "free-layout") {
    normalized.freeLayoutElements = [];
  }

  if (Array.isArray(slide.textBlocks)) {
    normalized.textBlocks = slide.textBlocks.map((block) => String(block ?? ""));
  } else if (typeof slide.text === "string") {
    normalized.textBlocks = [slide.text];
  } else if (normalized.type === "split") {
    normalized.textBlocks = [""];
  }

  if (typeof normalized.slots !== "number" && typeof normalized.type === "string" && normalized.type.startsWith("gallery-")) {
    normalized.slots = Number(normalized.type.split("-")[1]) || 1;
  }

  if (!normalized.slots && (normalized.type === "split" || normalized.type === "full-media")) {
    normalized.slots = 1;
  }

  return normalized;
};

const normalizeSlides = (slides) => (Array.isArray(slides) ? slides.map(normalizeSlide) : []);

const createDefaultCases = () => ([
  {
    id: "controlnet-ecommerce",
    title: "可控电商产品精修",
    cover: "images/works/foundation/poster.webp",
    category: "商业视觉",
    tags: ["生成内容", "电商", "结构控制"],
    description: "围绕产品结构和光影一致性，完成结构控制到高精渲染的电商主图升级。",
    results: {
      输出内容: "电商主图与产品视觉",
      能力重点: "结构控制、光影和质感统一"
    },
    tools: ["节点工作流", "结构控制", "图像后期"],
    slideIds: [4, 5]
  },
  {
    id: "future-brand-visuals",
    title: "未来感品牌海报与识别系统",
    cover: "images/works/foundation/poster.webp",
    category: "品牌视觉",
    tags: ["品牌", "海报", "视觉识别"],
    description: "统一未来感主视觉语言，扩展到海报、品牌应用和多风格商业物料。",
    results: {
      输出内容: "海报与品牌延展视觉",
      能力重点: "风格设定与视觉统一"
    },
    tools: ["图像生成", "图像后期", "矢量设计"],
    slideIds: [7, 8, 9]
  },
  {
    id: "ai-short-video-campaign",
    title: "广告短视频与平台系列内容",
    cover: "images/works/cybercity/poster.webp",
    category: "叙事内容",
    tags: ["短视频", "广告", "生成内容"],
    description: "用原生视频生成和后期剪辑构建电商广告与平台分发内容，形成系列化投放素材。",
    results: {
      输出内容: "短视频片段与封面",
      能力重点: "视频生成与系列化整理"
    },
    tools: ["视频生成", "国产视频生成", "剪映"],
    slideIds: [16, 17, 18]
  }
]);

const normalizeSiteMeta = (meta) => ({
  ...DEFAULT_SITE_META,
  ...(meta && typeof meta === "object" ? meta : {}),
  siteTitle: ensureString(meta?.siteTitle, DEFAULT_SITE_META.siteTitle),
  siteDescription: ensureString(meta?.siteDescription, DEFAULT_SITE_META.siteDescription),
  siteKeywords: ensureStringArray(meta?.siteKeywords).length ? ensureStringArray(meta?.siteKeywords) : [...DEFAULT_SITE_META.siteKeywords],
  canonicalUrl: ensureString(meta?.canonicalUrl, DEFAULT_SITE_META.canonicalUrl),
  ogTitle: ensureString(meta?.ogTitle, DEFAULT_SITE_META.ogTitle),
  ogDescription: ensureString(meta?.ogDescription, DEFAULT_SITE_META.ogDescription),
  ogImage: ensureString(meta?.ogImage, DEFAULT_SITE_META.ogImage),
  twitterCard: ensureString(meta?.twitterCard, DEFAULT_SITE_META.twitterCard),
  caseSectionTitle: ensureString(meta?.caseSectionTitle, DEFAULT_SITE_META.caseSectionTitle),
  caseSectionDesc: ensureString(meta?.caseSectionDesc, DEFAULT_SITE_META.caseSectionDesc),
  contactSectionTitle: ensureString(meta?.contactSectionTitle, DEFAULT_SITE_META.contactSectionTitle),
  contactSectionDesc: ensureString(meta?.contactSectionDesc, DEFAULT_SITE_META.contactSectionDesc),
  formspreeEndpoint: ensureString(meta?.formspreeEndpoint, DEFAULT_SITE_META.formspreeEndpoint),
  contactCtaLabel: ensureString(meta?.contactCtaLabel, DEFAULT_SITE_META.contactCtaLabel),
  homepageDesigner: normalizeHomepageDesignerConfig(meta?.homepageDesigner)
});

const normalizeCaseItem = (item) => {
  const raw = item && typeof item === "object" ? item : {};
  const resultsSource = Array.isArray(raw.results) ? raw.results : Array.isArray(raw.resultItems) ? raw.resultItems : raw.results;
  const results = Array.isArray(resultsSource)
    ? Object.fromEntries(resultsSource.map((entry) => [ensureString(entry?.label), ensureString(entry?.value)]).filter(([key, value]) => key && value))
    : resultsSource && typeof resultsSource === "object" ? resultsSource : {};
  const normalizedId = ensureString(raw.id).trim();

  return {
    id: normalizedId,
    title: ensureString(raw.title, "未命名案例"),
    cover: ensureString(raw.cover),
    category: ensureString(raw.category, "未分类"),
    tags: ensureStringArray(raw.tags),
    description: ensureString(raw.description),
    results: Object.fromEntries(Object.entries(results).map(([key, value]) => [key, String(value ?? "").trim()]).filter(([, value]) => value)),
    tools: ensureStringArray(raw.tools),
    slideIds: Array.isArray(raw.slideIds) ? raw.slideIds.map((value) => Number(value)).filter((value) => Number.isFinite(value)) : []
  };
};

const normalizeCases = (cases, options = {}) => {
  const normalized = Array.isArray(cases) ? cases.map(normalizeCaseItem).filter((item) => item.id) : [];
  if (normalized.length) return normalized;
  return options.fallbackToDefaults ? createDefaultCases() : [];
};

const createPortfolioModel = (value) => {
  if (Array.isArray(value)) {
    return {
      meta: normalizeSiteMeta(DEFAULT_SITE_META),
      cases: normalizeCases([], { fallbackToDefaults: true }),
      slides: normalizeSlides(value)
    };
  }

  if (value && typeof value === "object") {
    const hasCasesField = Object.prototype.hasOwnProperty.call(value, "cases");
    return {
      meta: normalizeSiteMeta(value.meta),
      cases: hasCasesField ? normalizeCases(value.cases) : normalizeCases([], { fallbackToDefaults: true }),
      slides: normalizeSlides(value.slides)
    };
  }

  return {
    meta: normalizeSiteMeta(DEFAULT_SITE_META),
    cases: normalizeCases([], { fallbackToDefaults: true }),
    slides: normalizeSlides([])
  };
};

const sanitizeCasesForExport = (cases) => normalizeCases(cases).map((item) => ({
  id: item.id,
  title: item.title,
  cover: item.cover,
  category: item.category,
  tags: item.tags,
  description: item.description,
  results: item.results,
  tools: item.tools,
  slideIds: item.slideIds
}));

const sanitizePortfolioModelForExport = (model) => {
  const normalized = createPortfolioModel(model);
  return {
    meta: normalizeSiteMeta(normalized.meta),
    cases: sanitizeCasesForExport(normalized.cases),
    slides: sanitizeSlidesForExport(normalized.slides)
  };
};

const collectDraftPreviewUrls = (slides) => {
  const urls = new Set();
  normalizeSlides(slides).forEach((slide) => {
    (Array.isArray(slide.media) ? slide.media : []).forEach((item) => {
      const normalized = normalizeMediaItem(item);
      if (normalized && normalized.draftPreviewUrl && normalized.draftPreviewUrl.startsWith("blob:")) {
        urls.add(normalized.draftPreviewUrl);
      }
    });
    (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : []).forEach((element) => {
      if (element.type !== "media") return;
      const normalized = normalizeMediaItem(element.media);
      if (normalized && normalized.draftPreviewUrl && normalized.draftPreviewUrl.startsWith("blob:")) {
        urls.add(normalized.draftPreviewUrl);
      }
    });
  });
  return urls;
};

const collectSlidePreloadTargets = (slide) => {
  const targets = [];
  const addMediaTarget = (item) => {
    const media = normalizeMediaItem(item);
    if (!media) return;

    if (media.kind === "image") {
      const src = getDisplayUrl(media);
      if (src && !src.startsWith("blob:")) targets.push({ kind: "image", src });
      return;
    }

    if (media.kind === "youtube") {
      const thumbnail = getYouTubeThumbnail(media.url);
      if (thumbnail) targets.push({ kind: "image", src: thumbnail });
      return;
    }

    if (media.kind === "video") {
      if (media.poster && !media.poster.startsWith("blob:")) {
        targets.push({ kind: "image", src: media.poster });
      }
    }
  };

  (Array.isArray(slide?.media) ? slide.media : []).forEach(addMediaTarget);
  (Array.isArray(slide?.freeLayoutElements) ? slide.freeLayoutElements : []).forEach((element) => {
    if (element?.type === "media") addMediaTarget(element.media);
  });

  return targets.filter((target, index, list) => list.findIndex((item) => item.kind === target.kind && item.src === target.src) === index);
};

const collectDirectVideoPreloadTargets = (slides) => {
  const sources = [];
  const addMediaTarget = (item) => {
    const media = normalizeMediaItem(item);
    if (!media || media.kind !== "video") return;
    const src = getPrimaryMediaUrl(media);
    if (!src || src.startsWith("blob:") || !isDirectVideoSource(src)) return;
    sources.push(src);
  };

  (Array.isArray(slides) ? slides : []).forEach((slide) => {
    (Array.isArray(slide?.media) ? slide.media : []).forEach(addMediaTarget);
    (Array.isArray(slide?.freeLayoutElements) ? slide.freeLayoutElements : []).forEach((element) => {
      if (element?.type === "media") addMediaTarget(element.media);
    });
  });

  return sources.filter((src, index, list) => list.indexOf(src) === index);
};

const preloadMediaTarget = (target) => {
  if (!target?.src) return;
  if (target.kind === "image") {
    const image = new Image();
    image.decoding = "async";
    image.src = target.src;
    return;
  }
};

const scheduleBrowserIdleTask = (callback) => {
  if (typeof window === "undefined") return () => {};
  if (typeof window.requestIdleCallback === "function") {
    const idleId = window.requestIdleCallback(() => callback(), { timeout: 800 });
    return () => window.cancelIdleCallback(idleId);
  }
  const timeoutId = window.setTimeout(callback, 120);
  return () => window.clearTimeout(timeoutId);
};

const warmVideoSourceInBackground = async (src, signal) => {
  if (!src || signal?.aborted) return;
  try {
    if (isHlsManifestUrl(src)) {
      await fetch(src, {
        cache: "force-cache",
        credentials: "omit",
        mode: "cors",
        signal
      });
      return;
    }
    const response = await fetch(src, {
      cache: "force-cache",
      credentials: "same-origin",
      signal
    });
    if (!response.ok || !response.body) return;
    const reader = response.body.getReader();
    try {
      while (!signal?.aborted) {
        const { done } = await reader.read();
        if (done) break;
      }
    } finally {
      reader.releaseLock?.();
    }
  } catch (error) { reportIgnoredError(error); }
};

const getViewportOrientation = () => {
  const viewportWidth = window.visualViewport?.width || window.innerWidth;
  const viewportHeight = window.visualViewport?.height || window.innerHeight;
  if (Number.isFinite(viewportWidth) && Number.isFinite(viewportHeight) && viewportWidth > 0 && viewportHeight > 0) {
    return viewportWidth > viewportHeight ? "landscape" : "portrait";
  }

  if (typeof window.matchMedia === "function") {
    return window.matchMedia("(orientation: landscape)").matches ? "landscape" : "portrait";
  }

  const explicitOrientation = window.screen?.orientation?.type;
  if (typeof explicitOrientation === "string") {
    return explicitOrientation.startsWith("landscape") ? "landscape" : "portrait";
  }

  return "portrait";
};

const supportsHoverInteractions = () => {
  if (typeof window.matchMedia !== "function") return true;
  return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
};

const getViewportSize = () => ({
  width: window.visualViewport?.width || window.innerWidth || 0,
  height: window.visualViewport?.height || window.innerHeight || 0
});

const usesCoarsePointer = () => {
  if (typeof window.matchMedia !== "function") return false;
  return window.matchMedia("(pointer: coarse)").matches;
};

const isMobileViewport = () => {
  const { width, height } = getViewportSize();
  const shortSide = Math.min(width, height);
  const longSide = Math.max(width, height);
  return IS_QR_MOBILE_MODE || width <= 720 || (usesCoarsePointer() && shortSide <= 820 && longSide <= 1180);
};

const readInlineAudioPreference = () => {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(INLINE_AUDIO_PREFERENCE_KEY) || "";
  } catch (error) {
    return "";
  }
};

const rememberInlineAudioPreference = (nextMuted) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(INLINE_AUDIO_PREFERENCE_KEY, nextMuted ? "muted" : "audible");
  } catch (error) { reportIgnoredError(error); }
};

const markInlineAudioUnlocked = () => {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(INLINE_AUDIO_SESSION_KEY, "1");
  } catch (error) { reportIgnoredError(error); }
};

const hasUnlockedInlineAudio = () => {
  if (typeof window === "undefined") return false;
  try {
    return sessionStorage.getItem(INLINE_AUDIO_SESSION_KEY) === "1";
  } catch (error) {
    return false;
  }
};

const canUseAudibleInlinePlayback = () => {
  if (typeof navigator === "undefined") return hasUnlockedInlineAudio();
  const activation = navigator.userActivation;
  return Boolean(activation?.hasBeenActive || activation?.isActive || hasUnlockedInlineAudio());
};

const resolveLayoutMode = () => {
  if (!isMobileViewport()) return "desktop-feed";
  return getViewportOrientation() === "landscape" ? "mobile-landscape-feed" : "mobile-portrait-feed";
};

const setInlineVideoMutedState = (video, nextMuted, onMutedChange) => {
  if (!video) return;
  try {
    video.defaultMuted = nextMuted;
    video.muted = nextMuted;
    if (!nextMuted) video.volume = 1;
  } catch (error) { reportIgnoredError(error); }
  if (typeof onMutedChange === "function") onMutedChange(nextMuted);
};

const playInlineVideoAudible = (video, onMutedChange) => {
  if (!video) return Promise.resolve(false);
  const keepAudibleWhilePlaying = () => {
    if (!video || video.paused) return;
    setInlineVideoMutedState(video, false, onMutedChange);
  };
  setInlineVideoMutedState(video, false, onMutedChange);
  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.then === "function") {
    return playAttempt.then(() => {
      keepAudibleWhilePlaying();
      [0, 80, 240, 520].forEach((delay) => {
        window.setTimeout(keepAudibleWhilePlaying, delay);
      });
      rememberInlineAudioPreference(false);
      return true;
    }).catch(() => {
      return false;
    });
  }
  rememberInlineAudioPreference(false);
  return Promise.resolve(true);
};

const playInlineVideoMuted = (video, onMutedChange) => {
  if (!video) return Promise.resolve(false);
  setInlineVideoMutedState(video, true, onMutedChange);
  const playAttempt = video.play();
  if (playAttempt && typeof playAttempt.then === "function") {
    return playAttempt.then(() => {
      setInlineVideoMutedState(video, true, onMutedChange);
      return true;
    }).catch(() => false);
  }
  setInlineVideoMutedState(video, true, onMutedChange);
  return Promise.resolve(true);
};

const isManagedHlsVideo = (video) => video?.dataset?.hlsManaged === "1";

const attemptInlineVideoPlayback = (video, options = {}) => {
  if (!video) return Promise.resolve(false);
  const preferAudible = Boolean(options.preferAudible);
  const onMutedChange = options.onMutedChange;
  video.preload = "auto";
  if (video.readyState < 2 && !isManagedHlsVideo(video)) {
    try {
      video.load();
    } catch (error) { reportIgnoredError(error); }
  }
  if (preferAudible) {
    return playInlineVideoAudible(video, onMutedChange).then((playedAudible) => {
      if (playedAudible) return true;
      return playInlineVideoMuted(video, onMutedChange).then(() => false);
    });
  }
  return playInlineVideoMuted(video, onMutedChange).then(() => false);
};

const stopInlineVideoPlayback = (video, options = {}) => {
  const shouldResetMuted = Boolean(options.resetMuted);
  const shouldResetTime = Boolean(options.resetTime);
  if (!video) return;
  if (!video.paused) video.pause();
  if (shouldResetTime) {
    const resetTime = () => {
      try {
        video.currentTime = 0;
      } catch (error) { reportIgnoredError(error); }
    };
    if (video.readyState >= 1) resetTime();
    else video.addEventListener("loadedmetadata", resetTime, { once: true });
  }
  if (shouldResetMuted) {
    video.defaultMuted = true;
    video.muted = true;
  }
};

const withEmbedPlaybackParams = (embedUrl, autoplay = false) => {
  if (!embedUrl) return "";
  try {
    const url = new URL(embedUrl);
    const enabled = autoplay ? "1" : "0";
    if (url.hostname.includes("youtube.com")) {
      url.searchParams.set("autoplay", enabled);
      url.searchParams.set("mute", "1");
      url.searchParams.set("playsinline", "1");
    } else if (url.hostname.includes("player.bilibili.com")) {
      url.searchParams.set("autoplay", enabled);
    } else if (url.hostname.includes("open.douyin.com")) {
      url.searchParams.set("autoplay", enabled);
    }
    return url.toString();
  } catch (error) {
    return embedUrl;
  }
};

const videoPreloadHintMap = new Map();
const videoPreconnectHintMap = new Map();

const ensureVideoPreloadHint = (src, priority = "auto") => {
  if (typeof document === "undefined" || !src || !isDirectVideoSource(src)) return;
  let absoluteUrl = src;
  try {
    absoluteUrl = new URL(src, window.location.href).toString();
  } catch (error) { reportIgnoredError(error); }
  if (!isHlsManifestUrl(absoluteUrl)) return;
  try {
    const origin = new URL(absoluteUrl).origin;
    if (!videoPreconnectHintMap.has(origin)) {
      const preconnectLink = document.createElement("link");
      preconnectLink.rel = "preconnect";
      preconnectLink.href = origin;
      preconnectLink.crossOrigin = "anonymous";
      document.head.appendChild(preconnectLink);
      videoPreconnectHintMap.set(origin, preconnectLink);
    }
  } catch (error) { reportIgnoredError(error); }
  let link = videoPreloadHintMap.get(absoluteUrl);
  if (!link) {
    link = document.createElement("link");
    link.rel = "preload";
    link.as = "fetch";
    link.href = absoluteUrl;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
    videoPreloadHintMap.set(absoluteUrl, link);
  }
  link.as = "fetch";
  link.setAttribute("fetchpriority", priority);
};

const isFileDragEvent = (event) => {
  const types = event?.dataTransfer?.types;
  if (!types) return false;
  return Array.from(types).includes("Files");
};

const getFileMediaKind = (file) => {
  const publishedPath = buildPublishedAssetPath(file);
  return String(file?.type || "").startsWith("video/") || publishedPath.startsWith("videos/") ? "video" : "image";
};

const getMediaAcceptFromKind = (kind) => kind === "video" ? "video" : kind === "image" ? "image" : "";
const getUploadAcceptAttr = (accept) => accept === "video" ? "video/*" : accept === "image" ? "image/*" : "image/*,video/*";

const getReplacementFileSummary = (file) => {
  if (!file) return "";
  const kind = getFileMediaKind(file) === "video" ? "视频" : "图片";
  return `${kind} · ${formatBytes(file.size || 0)}`;
};

const measureImageFile = (file, previewUrl) => new Promise((resolve) => {
  if (!file || !String(file.type || "").startsWith("image/") || typeof Image === "undefined") {
    resolve({ width: 0, height: 0 });
    return;
  }
  const image = new Image();
  image.onload = () => resolve({ width: image.naturalWidth || 0, height: image.naturalHeight || 0 });
  image.onerror = () => resolve({ width: 0, height: 0 });
  image.src = previewUrl || URL.createObjectURL(file);
});

const sanitizeSlidesForExport = (slides) => normalizeSlides(slides).map((slide) => ({
  ...slide,
  textBlocks: Array.isArray(slide.textBlocks) ? slide.textBlocks.map((block) => String(block ?? "")) : undefined,
  freeLayoutElements: Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements.map((element) => {
    const normalized = normalizeFreeLayoutElement(element);
    if (normalized.type === "media") {
      const media = normalizeMediaItem(normalized.media);
      return {
        id: normalized.id,
        type: normalized.type,
        x: normalized.x,
        y: normalized.y,
        w: normalized.w,
        h: normalized.h,
        z: normalized.z,
        media: {
          kind: media.kind,
          url: media.kind === "youtube" ? extractYouTubeId(media.url) || media.url : media.url,
          poster: media.poster,
          meta: media.meta,
          label: media.label,
          fullUrl: media.fullUrl,
          width: media.width,
          height: media.height,
          alt: media.alt,
          externalProvider: media.externalProvider,
          curatedHidden: media.curatedHidden,
          curatedCategory: media.curatedCategory,
          workflowSteps: media.workflowSteps,
          workflowAbility: media.workflowAbility,
          workflowOutcome: media.workflowOutcome,
          delivery: media.delivery
        }
      };
    }
    return {
      id: normalized.id,
      type: normalized.type,
      x: normalized.x,
      y: normalized.y,
      w: normalized.w,
      h: normalized.h,
      z: normalized.z,
      text: normalized.text,
      animation: normalized.animation,
      animationDuration: normalized.animationDuration,
      animationDelay: normalized.animationDelay
    };
  }) : undefined,
  media: Array.isArray(slide.media) ? slide.media.map((item) => {
    const normalized = normalizeMediaItem(item);
    if (!normalized) return null;
    const cleaned = {
      kind: normalized.kind,
      url: normalized.kind === "youtube" ? extractYouTubeId(normalized.url) || normalized.url : normalized.url,
      poster: normalized.poster,
      meta: normalized.meta,
      label: normalized.label,
      fullUrl: normalized.fullUrl,
      width: normalized.width,
      height: normalized.height,
      alt: normalized.alt,
      externalProvider: normalized.externalProvider,
      curatedHidden: normalized.curatedHidden,
      curatedCategory: normalized.curatedCategory,
      workflowSteps: normalized.workflowSteps,
      workflowAbility: normalized.workflowAbility,
      workflowOutcome: normalized.workflowOutcome,
      delivery: normalized.delivery
    };
    if (!cleaned.poster) delete cleaned.poster;
    if (!cleaned.meta) delete cleaned.meta;
    if (!cleaned.label) delete cleaned.label;
    if (!cleaned.fullUrl) delete cleaned.fullUrl;
    if (!cleaned.width) delete cleaned.width;
    if (!cleaned.height) delete cleaned.height;
    if (!cleaned.alt) delete cleaned.alt;
    if (!cleaned.externalProvider) delete cleaned.externalProvider;
    if (!cleaned.curatedHidden) delete cleaned.curatedHidden;
    if (!cleaned.curatedCategory) delete cleaned.curatedCategory;
    if (!cleaned.workflowSteps?.length) delete cleaned.workflowSteps;
    if (!cleaned.workflowAbility) delete cleaned.workflowAbility;
    if (!cleaned.workflowOutcome) delete cleaned.workflowOutcome;
    if (!cleaned.delivery?.provider || (!cleaned.delivery?.uid && !cleaned.delivery?.hlsUrl && !cleaned.delivery?.iframeUrl)) delete cleaned.delivery;
    if (!cleaned.url) delete cleaned.url;
    return cleaned;
  }).filter(Boolean) : []
})).map((slide) => {
  if (slide.textBlocks === undefined) return slide;
  slide.text = slide.textBlocks[0] || "";
  return slide;
});

const getStoredDraft = () => {
  const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
  if (!raw) return null;

  try {
    return createPortfolioModel(JSON.parse(raw));
  } catch (error) {
    console.error("Failed to parse local draft", error);
    return null;
  }
};

const loadPortfolioModel = async () => {
  if (window.location.protocol === "file:" || IS_EDITOR_MODE) return createPortfolioModel(EMBEDDED_PORTFOLIO);

  const params = new URLSearchParams();
  if (APP_BUNDLE_VERSION) params.set("v", APP_BUNDLE_VERSION);
  const requestUrl = params.size ? `${DATA_FILE_PATH}?${params.toString()}` : DATA_FILE_PATH;
  const response = await fetch(requestUrl, { cache: "no-store" });
  if (!response.ok) throw new Error(`Unable to load ${DATA_FILE_PATH}`);
  return createPortfolioModel(await response.json());
};

const downloadJsonFile = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};

const getSourceMediaUrl = (item, options = {}) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem) return "";
  const preferDraftPreview = Boolean(options.preferDraftPreview);
  if (mediaItem.kind === "youtube") return mediaItem.url || mediaItem.draftPreviewUrl || "";
  return preferDraftPreview ? mediaItem.draftPreviewUrl || mediaItem.url || "" : mediaItem.url || mediaItem.draftPreviewUrl || "";
};

const getStreamDelivery = (item) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem || mediaItem.kind !== "video") return null;
  if (mediaItem.delivery?.provider !== "cloudflare-stream") return null;
  return mediaItem.delivery;
};

const getPrimaryMediaUrl = (item, options = {}) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem) return "";
  const preferDraftPreview = Boolean(options.preferDraftPreview);
  const preferSource = Boolean(options.preferSource);
  if (mediaItem.kind === "youtube") return mediaItem.url || mediaItem.draftPreviewUrl || "";
  if (!preferDraftPreview && !preferSource) {
    const delivery = getStreamDelivery(mediaItem);
    if (delivery?.hlsUrl) return delivery.hlsUrl;
  }
  return getSourceMediaUrl(mediaItem, { preferDraftPreview });
};

const getDisplayUrl = (item, options = {}) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem) return "";
  const preferDraftPreview = Boolean(options.preferDraftPreview);
  if (mediaItem.kind === "youtube") return mediaItem.poster || getYouTubeThumbnail(mediaItem.url) || mediaItem.draftPreviewUrl || "";
  if (mediaItem.kind === "video") return mediaItem.poster || mediaItem.delivery?.thumbnailUrl || "";
  return preferDraftPreview ? mediaItem.draftPreviewUrl || mediaItem.url || mediaItem.poster || "" : mediaItem.url || mediaItem.draftPreviewUrl || mediaItem.poster || "";
};

const getHighResolutionImageUrl = (item, options = {}) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem || mediaItem.kind !== "image") return "";
  if (Boolean(options.preferDraftPreview) && mediaItem.draftPreviewUrl) return mediaItem.draftPreviewUrl;
  return mediaItem.fullUrl || mediaItem.url || mediaItem.poster || "";
};

const getMediaResolutionLabel = (item) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem || !mediaItem.width || !mediaItem.height) return "";
  return `${mediaItem.width} × ${mediaItem.height}`;
};

const hasFourKSource = (item) => {
  const mediaItem = normalizeMediaItem(item);
  return Boolean(mediaItem && Math.max(mediaItem.width || 0, mediaItem.height || 0) >= 3840);
};

const getLightboxVideoPlayerUrl = (item, options = {}) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem || mediaItem.kind !== "video") return "";
  if (Boolean(options.preferDraftPreview)) return "";
  return mediaItem.delivery?.provider === "cloudflare-stream" ? mediaItem.delivery.iframeUrl || "" : "";
};

const getMediaBindingInfo = (item) => {
  const mediaItem = normalizeMediaItem(item);
  if (!mediaItem) return null;

  const urlValue = String(mediaItem.url || "").trim();
  const previewValue = String(mediaItem.draftPreviewUrl || "").trim();
  const streamDelivery = mediaItem.kind === "video" && mediaItem.delivery?.provider === "cloudflare-stream" ? mediaItem.delivery : null;

  if (streamDelivery?.hlsUrl || streamDelivery?.iframeUrl) {
    const shortValue = streamDelivery.uid || streamDelivery.hlsUrl || streamDelivery.iframeUrl;
    return {
      state: "linked",
      text: `已绑定：Cloudflare Stream ${shortValue.length > 24 ? `${shortValue.slice(0, 21)}...` : shortValue}`,
      detail: "这个视频会通过 Cloudflare Stream 播放，并随导出的 JSON 一起发布。"
    };
  }

  if (urlValue) {
    const shortValue = urlValue.length > 42 ? `${urlValue.slice(0, 39)}...` : urlValue;
    return {
      state: "linked",
      text: `已绑定：${shortValue}`,
      detail: "这个媒体会随导出的 JSON 一起发布。"
    };
  }

  if (previewValue) {
    return {
      state: "draft-only",
      text: "仅本地预览，尚未绑定发布路径",
      detail: "现在导出只会保留媒体类型，不会带上这张图或这个视频。"
    };
  }

  return null;
};

const formatDuration = (seconds) => {
  if (!Number.isFinite(seconds) || seconds <= 0) return "";
  const total = Math.round(seconds);
  const minutes = Math.floor(total / 60);
  const remaining = total % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
};

const isRemoteUrl = (value = "") => /^https?:\/\//i.test(String(value || "").trim());

const shouldCheckAssetPath = (value = "") => {
  const normalized = String(value || "").trim().toLowerCase();
  return normalized.startsWith("images/") || normalized.startsWith("videos/");
};

const resolveAssetUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  if (isRemoteUrl(raw)) return raw;
  try {
    return new URL(raw, window.location.href).toString();
  } catch (error) {
    return "";
  }
};

const probeUrl = async (url) => {
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store" });
    if (response.ok) return true;
  } catch (error) { reportIgnoredError(error); }

  try {
    const response = await fetch(url, { cache: "no-store" });
    return response.ok;
  } catch (error) {
    return false;
  }
};

const validateSlidesBeforeExport = async (slides) => {
  const issues = [];
  const checkedUrls = new Map();

  for (let slideIndex = 0; slideIndex < slides.length; slideIndex += 1) {
    const slide = normalizeSlide(slides[slideIndex]);
    const pageLabel = `第 ${slideIndex + 1} 页`;
    const mediaItems = Array.isArray(slide.media) ? slide.media : [];

    for (let mediaIndex = 0; mediaIndex < mediaItems.length; mediaIndex += 1) {
      const item = normalizeMediaItem(mediaItems[mediaIndex]);
      if (!item) continue;

      const slotLabel = `${pageLabel} 第 ${mediaIndex + 1} 个媒体框`;
      const urlValue = String(item.url || "").trim();
      const hasStreamDelivery = item.kind === "video" && item.delivery?.provider === "cloudflare-stream" && Boolean(item.delivery.hlsUrl || item.delivery.iframeUrl);

      if (!urlValue && !hasStreamDelivery && item.draftPreviewUrl) {
        issues.push(`${slotLabel} 仍是本地预览，未绑定发布路径。请重新拖入正式素材，直到出现“已绑定：images/... / videos/...”后再导出。`);
        continue;
      }

      if (!urlValue && !hasStreamDelivery && !item.draftPreviewUrl) {
        issues.push(`${slotLabel} 没有填写资源链接`);
        continue;
      }

      if (item.kind === "youtube" && !extractYouTubeId(urlValue)) {
        issues.push(`${slotLabel} 的 YouTube 链接或视频 ID 无效`);
        continue;
      }

      if (window.location.protocol !== "file:" && shouldCheckAssetPath(urlValue)) {
        const resolvedUrl = resolveAssetUrl(urlValue);
        if (!resolvedUrl) {
          issues.push(`${slotLabel} 的相对路径无效：${urlValue}`);
          continue;
        }
        if (!checkedUrls.has(resolvedUrl)) {
          checkedUrls.set(resolvedUrl, await probeUrl(resolvedUrl));
        }
        if (!checkedUrls.get(resolvedUrl)) {
          issues.push(`${slotLabel} 找不到资源：${urlValue}`);
        }
      }
    }

    const freeLayoutMedia = (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : []).filter((element) => element.type === "media");
    for (let elementIndex = 0; elementIndex < freeLayoutMedia.length; elementIndex += 1) {
      const item = normalizeMediaItem(freeLayoutMedia[elementIndex].media);
      if (!item) continue;
      const slotLabel = `${pageLabel} 自由布局媒体 ${elementIndex + 1}`;
      const urlValue = String(item.url || "").trim();
      const hasStreamDelivery = item.kind === "video" && item.delivery?.provider === "cloudflare-stream" && Boolean(item.delivery.hlsUrl || item.delivery.iframeUrl);

      if (!urlValue && !hasStreamDelivery && item.draftPreviewUrl) {
        issues.push(`${slotLabel} 仍是本地预览，未绑定发布路径。请重新拖入正式素材，直到出现“已绑定：images/... / videos/...”后再导出。`);
        continue;
      }

      if (!urlValue && !hasStreamDelivery && !item.draftPreviewUrl) {
        issues.push(`${slotLabel} 没有填写资源链接`);
        continue;
      }

      if (item.kind === "youtube" && !extractYouTubeId(urlValue)) {
        issues.push(`${slotLabel} 的 YouTube 链接或视频 ID 无效`);
        continue;
      }

      if (window.location.protocol !== "file:" && shouldCheckAssetPath(urlValue)) {
        const resolvedUrl = resolveAssetUrl(urlValue);
        if (!resolvedUrl) {
          issues.push(`${slotLabel} 的相对路径无效：${urlValue}`);
          continue;
        }
        if (!checkedUrls.has(resolvedUrl)) {
          checkedUrls.set(resolvedUrl, await probeUrl(resolvedUrl));
        }
        if (!checkedUrls.get(resolvedUrl)) {
          issues.push(`${slotLabel} 找不到资源：${urlValue}`);
        }
      }
    }
  }

  return issues;
};

const Icon = ({ name, size = 24, className = "" }) => {
  const icons = {
    ChevronLeft: <path d="m15 18-6-6 6-6" />,
    ChevronRight: <path d="m9 18 6-6-6-6" />,
    UploadCloud: <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242M12 12v9M8 17l4-4 4 4" />,
    Home: <><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
    Maximize: <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />,
    Minimize: <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" />,
    ArrowUp: <path d="m12 19 0-14M5 12l7-7 7 7" />,
    ArrowDown: <path d="M12 5v14m7-7-7 7-7-7" />,
    Copy: <><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></>,
    Plus: <path d="M5 12h14M12 5v14" />,
    Trash2: <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2M10 11v6M14 11v6" />,
    MoreHorizontal: <><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></>,
    LayoutTemplate: <><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><path d="M3 9h18M9 21V9" /></>,
    Grid: <><rect width="7" height="7" x="3" y="3" rx="1" /><rect width="7" height="7" x="14" y="3" rx="1" /><rect width="7" height="7" x="14" y="14" rx="1" /><rect width="7" height="7" x="3" y="14" rx="1" /></>,
    Volume2: <><path d="M11 5L6 9H2v6h4l5 4V5z" /><path d="M15.54 8.46a5 5 0 0 1 0 7.07" /><path d="M19.07 4.93a10 10 0 0 1 0 14.14" /></>,
    VolumeX: <><path d="M11 5L6 9H2v6h4l5 4V5z" /><line x1="23" y1="9" x2="17" y2="15" /><line x1="17" y1="9" x2="23" y2="15" /></>,
    Play: <polygon points="6 4 20 12 6 20 6 4" />,
    Pause: <><line x1="8" y1="4" x2="8" y2="20" /><line x1="16" y1="4" x2="16" y2="20" /></>,
    Maximize2: <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>,
    Sliders: <><line x1="4" y1="21" x2="4" y2="14" /><line x1="4" y1="10" x2="4" y2="3" /><line x1="12" y1="21" x2="12" y2="12" /><line x1="12" y1="8" x2="12" y2="3" /><line x1="20" y1="21" x2="20" y2="16" /><line x1="20" y1="12" x2="20" y2="3" /><line x1="1" y1="14" x2="7" y2="14" /><line x1="9" y1="8" x2="15" y2="8" /><line x1="17" y1="16" x2="23" y2="16" /></>,
    Download: <><path d="M12 3v12" /><path d="m7 10 5 5 5-5" /><path d="M5 21h14" /></>,
    Save: <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>,
    FileJson: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M10 13H8" /></>,
    RotateCcw: <><path d="M3 2v6h6" /><path d="M3 8a9 9 0 1 0 2.6-4.4L3 8" /></>,
    Link2: <><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07L11.8 5.1" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.66-1.66" /></>,
    Settings2: <><path d="M12 3v3" /><path d="M18.364 5.636 16.243 7.757" /><path d="M21 12h-3" /><path d="m18.364 18.364-2.121-2.121" /><path d="M12 18v3" /><path d="m7.757 16.243-2.121 2.121" /><path d="M6 12H3" /><path d="m7.757 7.757-2.121-2.121" /><circle cx="12" cy="12" r="3" /></>,
    ExternalLink: <><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></>,
    Sparkles: <><path d="M12 3l1.9 4.8L19 10l-5.1 2.2L12 17l-1.9-4.8L5 10l5.1-2.2L12 3Z" /><path d="M5 3v2" /><path d="M19 19v2" /><path d="M3 5h2" /><path d="M19 3h2" /></>,
    Sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2.5" /><path d="M12 19.5V22" /><path d="M4.93 4.93l1.77 1.77" /><path d="M17.3 17.3l1.77 1.77" /><path d="M2 12h2.5" /><path d="M19.5 12H22" /><path d="M4.93 19.07l1.77-1.77" /><path d="M17.3 6.7l1.77-1.77" /></>,
    Moon: <path d="M21 12.8A9 9 0 1 1 11.2 3c-.1.48-.15.98-.15 1.5a7.5 7.5 0 0 0 9.95 7.1Z" />
  };
  return <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>{icons[name]}</svg>;
};

const isHlsManifestUrl = (value = "") => /\.m3u8(\?|#|$)/i.test(String(value || "").trim());

const assignMediaRef = (refTarget, value) => {
  if (!refTarget) return;
  if (typeof refTarget === "function") {
    refTarget(value);
    return;
  }
  refTarget.current = value;
};

const StreamVideoElement = ({
  playbackUrl,
  sourceUrl,
  videoRef,
  mediaClassName,
  muted,
  showNativeVideoControls,
  videoPreloadMode,
  poster,
  onMediaLoad,
  onMediaError,
  onVideoMetadata,
  onMediaMeasure,
  onVideoPlay,
  onVideoPause,
  onVideoTimeUpdate,
  handleSurfaceClick,
  audiblePreviewActive = false,
  loop = true
}) => {
  const internalVideoRef = useRef(null);
  const [nativeVideoSrc, setNativeVideoSrc] = useState("");

  useEffect(() => {
    assignMediaRef(videoRef, internalVideoRef.current);
    return () => assignMediaRef(videoRef, null);
  }, [videoRef]);

  useEffect(() => {
    const video = internalVideoRef.current;
    if (!video) return;
    const nextMuted = audiblePreviewActive ? false : Boolean(muted);
    video.defaultMuted = nextMuted;
    video.muted = nextMuted;
  }, [audiblePreviewActive, muted, nativeVideoSrc]);

  useEffect(() => {
    const video = internalVideoRef.current;
    if (!video) return undefined;

    let hls = null;
    const canUseNativeHls = isHlsManifestUrl(playbackUrl) && typeof video.canPlayType === "function" && Boolean(video.canPlayType("application/vnd.apple.mpegurl"));

    delete video.dataset.hlsManaged;
    video.crossOrigin = "anonymous";

    if (playbackUrl && isHlsManifestUrl(playbackUrl) && !canUseNativeHls && Hls.isSupported()) {
      setNativeVideoSrc("");
      video.removeAttribute("src");
      video.dataset.hlsManaged = "1";
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 90
      });
      hls.loadSource(playbackUrl);
      hls.attachMedia(video);
    } else {
      setNativeVideoSrc(playbackUrl || sourceUrl || "");
    }

    return () => {
      if (hls) {
        hls.destroy();
      }
      delete video.dataset.hlsManaged;
    };
  }, [playbackUrl, sourceUrl]);

  return <video
    ref={internalVideoRef}
    src={nativeVideoSrc || undefined}
    data-media-source={sourceUrl || playbackUrl || ""}
    loop={loop}
    controls={showNativeVideoControls}
    data-audible-preview-active={audiblePreviewActive ? "true" : "false"}
    playsInline
    preload={videoPreloadMode}
    poster={poster || undefined}
    className={mediaClassName}
    onLoadedData={onMediaLoad}
    onLoadedMetadata={(event) => {
      if (typeof onVideoMetadata === "function") onVideoMetadata(event.currentTarget.duration);
      if (typeof onMediaMeasure === "function" && event.currentTarget.videoWidth && event.currentTarget.videoHeight) {
        onMediaMeasure(event.currentTarget.videoWidth / event.currentTarget.videoHeight);
      }
    }}
    onError={onMediaError}
    onPlay={onVideoPlay}
    onPause={onVideoPause}
    onTimeUpdate={onVideoTimeUpdate}
    onClick={handleSurfaceClick}
  />;
};

const MediaView = ({ mediaItem, muted, stopClick, onMediaSurfaceClick, videoRef, mediaClassName, onMediaLoad, onMediaError, onVideoMetadata, onMediaMeasure, onVideoPlay, onVideoPause, onVideoTimeUpdate, preferDraftPreview = false, showPoster = true, videoPreloadMode = "metadata", showNativeVideoControls = false, audiblePreviewActive = false }) => {
  const item = normalizeMediaItem(mediaItem);
  if (!item) return null;
  const handleSurfaceClick = typeof onMediaSurfaceClick === "function" ? onMediaSurfaceClick : stopClick;
  const fallbackDisplayUrl = getDisplayUrl(item, { preferDraftPreview });
  const shouldRenderInlineEmbed = !IS_EDITOR_MODE;
  const embedFrameClassName = "relative z-10 h-full w-full rounded-[inherit] border-0 bg-black";
  const renderEmbeddedFallback = (label, providerLabel = "") => {
    if (fallbackDisplayUrl) {
      return <img
        src={fallbackDisplayUrl}
        alt={label}
        loading="lazy"
        decoding="async"
        fetchPriority="auto"
        className={mediaClassName}
        onLoad={(event) => {
          if (typeof onMediaLoad === "function") onMediaLoad(event);
          if (typeof onMediaMeasure === "function" && event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) {
            onMediaMeasure(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
          }
        }}
        onError={onMediaError}
        onClick={handleSurfaceClick}
      />;
    }

    if (typeof onMediaLoad === "function") window.setTimeout(() => onMediaLoad(), 0);
    return <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center" onClick={handleSurfaceClick}>
      <div className="media-fallback-badge flex min-h-[48%] w-full max-w-md flex-col items-center justify-center gap-4 rounded-[28px] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.24)]">
        {providerLabel && <div className="text-[11px] font-mono uppercase tracking-[0.28em] text-white/42">{providerLabel}</div>}
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/12 bg-white/10 text-white/82">
          <Icon name="Play" size={18} className="translate-x-[1px]" />
        </div>
        <div className="text-sm text-white/78">{label}</div>
      </div>
    </div>;
  };

  if (item.kind === "youtube") {
    const embedUrl = getYouTubeEmbedUrl(item.url);
    if (!embedUrl) return null;
    if (shouldRenderInlineEmbed) {
      return <iframe
        src={withEmbedPlaybackParams(embedUrl, false)}
        title="YouTube player"
        className={embedFrameClassName}
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
        referrerPolicy="strict-origin-when-cross-origin"
        allowFullScreen
        onLoad={onMediaLoad}
        onClick={stopClick}
      />;
    }
    return renderEmbeddedFallback("点击放大播放视频", "YouTube");
  }

  if (item.kind === "video") {
    const playbackUrl = getPrimaryMediaUrl(item, { preferDraftPreview });
    const sourceUrl = getSourceMediaUrl(item, { preferDraftPreview });
    if (!playbackUrl && !sourceUrl) return null;
    const embedUrl = getVideoEmbedUrl(sourceUrl);
    const isBilibiliEmbed = isBilibiliVideoUrl(sourceUrl) || isBilibiliVideoUrl(embedUrl);
    if (embedUrl && !isDirectVideoSource(sourceUrl)) {
      if (shouldRenderInlineEmbed && !isBilibiliEmbed) {
        return <iframe
          src={withEmbedPlaybackParams(embedUrl, false)}
          title="Embedded video player"
          className={embedFrameClassName}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={onMediaLoad}
          onClick={stopClick}
        />;
      }
      return renderEmbeddedFallback(isBilibiliEmbed ? "打开外部视频链接" : "点击放大播放视频", isBilibiliEmbed ? "外部视频" : "Video");
    }
    if (!isDirectVideoSource(playbackUrl)) {
      if (typeof onMediaLoad === "function") window.setTimeout(() => onMediaLoad(), 0);
      return <div className="relative z-10 flex h-full w-full items-center justify-center p-6 text-center">
        <a href={sourceUrl || playbackUrl} target="_blank" rel="noreferrer" onClick={handleSurfaceClick} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-4 py-2 text-sm text-cyan-100 hover:bg-cyan-500/20">
          <Icon name="ExternalLink" size={14} /> 打开视频链接预览
        </a>
      </div>;
    }
    return <StreamVideoElement
      playbackUrl={playbackUrl}
      sourceUrl={sourceUrl}
      videoRef={videoRef}
      mediaClassName={mediaClassName}
      muted={muted}
      showNativeVideoControls={showNativeVideoControls}
      videoPreloadMode={videoPreloadMode}
      poster={showPoster ? item.poster || item.delivery?.thumbnailUrl || undefined : undefined}
      onMediaLoad={onMediaLoad}
      onMediaError={onMediaError}
      onVideoMetadata={onVideoMetadata}
      onMediaMeasure={onMediaMeasure}
      onVideoPlay={onVideoPlay}
      onVideoPause={onVideoPause}
      onVideoTimeUpdate={onVideoTimeUpdate}
      handleSurfaceClick={handleSurfaceClick}
      audiblePreviewActive={audiblePreviewActive}
    />;
  }

  const src = getDisplayUrl(item, { preferDraftPreview });
  if (!src) return null;
  return <img
    src={src}
    alt="asset"
    loading="lazy"
    decoding="async"
    fetchPriority="auto"
    className={mediaClassName}
    onLoad={(event) => {
      if (typeof onMediaLoad === "function") onMediaLoad(event);
      if (typeof onMediaMeasure === "function" && event.currentTarget.naturalWidth && event.currentTarget.naturalHeight) {
        onMediaMeasure(event.currentTarget.naturalWidth / event.currentTarget.naturalHeight);
      }
    }}
    onError={onMediaError}
    onClick={handleSurfaceClick}
  />;
};

const InlineMediaControls = ({ visible, showPlayToggle = false, isPlaying = false, isMuted = true, timeLabel = "", progressPercent = 0, onTogglePlay, onToggleMute, onToggleFullscreen }) => <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}>
  <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/78 via-black/28 to-transparent" />
  <div className="relative flex items-end justify-between gap-3 px-4 pb-4 pt-10">
    <div className="pointer-events-auto flex items-center gap-2">
      {showPlayToggle && <button onClick={onTogglePlay} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/85 backdrop-blur-sm transition hover:bg-black/70">
        <Icon name={isPlaying ? "Pause" : "Play"} size={16} className={isPlaying ? "" : "translate-x-[1px]"} />
      </button>}
      {showPlayToggle && <button onClick={onToggleMute} className="flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/85 backdrop-blur-sm transition hover:bg-black/70">
        <Icon name={isMuted ? "VolumeX" : "Volume2"} size={16} />
      </button>}
    </div>
    <button onClick={onToggleFullscreen} className="pointer-events-auto flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-black/45 text-white/85 backdrop-blur-sm transition hover:bg-black/70">
      <Icon name="Maximize2" size={16} />
    </button>
  </div>
  {showPlayToggle && <div className="relative flex items-center gap-3 px-4 pb-4">
    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/12">
      <div className="h-full rounded-full bg-white/80 transition-[width] duration-150" style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }} />
    </div>
    <div className="min-w-[86px] text-right text-[10px] font-mono tracking-[0.18em] text-white/68">{timeLabel}</div>
  </div>}
</div>;

const ThreeHeroStage = ({ items = [], onOpen }) => {
  const mountRef = useRef(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;
    const reducedMotion = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 1.15, 6.4);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const group = new THREE.Group();
    scene.add(group);

    const ringMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x5bd8ff, transparent: true, opacity: 0.72 }),
      new THREE.MeshBasicMaterial({ color: 0x44d8ff, transparent: true, opacity: 0.5 }),
      new THREE.MeshBasicMaterial({ color: 0x8b9cff, transparent: true, opacity: 0.42 })
    ];

    const rings = [2.05, 2.58, 3.12].map((radius, index) => {
      const torus = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.008, 8, 180), ringMaterials[index]);
      torus.rotation.x = Math.PI / 2.55;
      torus.rotation.z = index * 0.42;
      torus.position.y = -0.66 + index * 0.08;
      group.add(torus);
      return torus;
    });

    const panelMaterial = new THREE.MeshBasicMaterial({ color: 0x9ddcff, transparent: true, opacity: 0.12, side: THREE.DoubleSide });
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(3.25, 1.92), panelMaterial);
    panel.position.set(0, 0.46, -0.28);
    group.add(panel);

    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x68e6ff, transparent: true, opacity: 0.5 });
    const framePoints = [
      new THREE.Vector3(-1.76, -0.58, -0.18),
      new THREE.Vector3(1.76, -0.58, -0.18),
      new THREE.Vector3(1.76, 1.5, -0.18),
      new THREE.Vector3(-1.76, 1.5, -0.18),
      new THREE.Vector3(-1.76, -0.58, -0.18)
    ];
    const frame = new THREE.Line(new THREE.BufferGeometry().setFromPoints(framePoints), lineMaterial);
    group.add(frame);

    const particleCount = 180;
    const positions = new Float32Array(particleCount * 3);
    for (let index = 0; index < particleCount; index += 1) {
      const angle = Math.random() * Math.PI * 2;
      const radius = 1.6 + Math.random() * 2.8;
      positions[index * 3] = Math.cos(angle) * radius;
      positions[index * 3 + 1] = -0.9 + Math.random() * 2.7;
      positions[index * 3 + 2] = Math.sin(angle) * radius - 0.8;
    }
    const particlesGeometry = new THREE.BufferGeometry();
    particlesGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particles = new THREE.Points(
      particlesGeometry,
      new THREE.PointsMaterial({ color: 0x8be7ff, size: 0.018, transparent: true, opacity: 0.74 })
    );
    scene.add(particles);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth || 1);
      const height = Math.max(1, mount.clientHeight || 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.render(scene, camera);
    };
    resize();
    const resizeObserver = typeof ResizeObserver !== "undefined" ? new ResizeObserver(resize) : null;
    resizeObserver?.observe(mount);

    let frameId = 0;
    const animate = (time = 0) => {
      const seconds = time * 0.001;
      group.rotation.y = Math.sin(seconds * 0.28) * 0.15;
      panel.rotation.y = Math.sin(seconds * 0.44) * 0.08;
      rings.forEach((ring, index) => {
        ring.rotation.z += 0.0025 + index * 0.0014;
        ring.position.y = -0.66 + index * 0.08 + Math.sin(seconds + index) * 0.018;
      });
      particles.rotation.y += 0.0009;
      renderer.render(scene, camera);
      if (!reducedMotion) frameId = window.requestAnimationFrame(animate);
    };
    animate(0);

    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      resizeObserver?.disconnect();
      mount.removeChild(renderer.domElement);
      renderer.dispose();
      particlesGeometry.dispose();
      frame.geometry.dispose();
      panel.geometry.dispose();
      panelMaterial.dispose();
      lineMaterial.dispose();
      ringMaterials.forEach((material) => material.dispose());
      rings.forEach((ring) => ring.geometry.dispose());
    };
  }, []);

  const stageItems = items.slice(0, 7);

  return <div className="curated-hero-stage curated-three-stage">
    <div ref={mountRef} className="curated-three-canvas" aria-hidden="true" />
    <div className="curated-three-core">
      <span>AI GENERATIVE STAGE</span>
      <strong>实时视觉生成场</strong>
    </div>
    <div className="curated-three-timeline" aria-hidden="true">
      <Icon name="Play" size={14} />
      <span />
      <em>00:12 / 01:24</em>
    </div>
    <div className="curated-orbit-stack">
      {stageItems.map((item, index) => {
        const media = normalizeMediaItem(item.media);
        const thumbnail = getDisplayUrl(media);
        return <button
          key={`${item.id}-${index}`}
          type="button"
          className={`curated-orbit-card curated-orbit-card-${index + 1}`}
          onClick={() => typeof onOpen === "function" && onOpen(item.detail)}
          aria-label={`查看作品：${item.title}`}
        >
          {thumbnail ? <img src={thumbnail} alt="" aria-hidden="true" loading={index < 3 ? "eager" : "lazy"} decoding="async" /> : <span />}
          <strong>{item.shortTitle}</strong>
        </button>;
      })}
    </div>
  </div>;
};

const ensureMetaTag = (selector, createTag) => {
  let element = document.head.querySelector(selector);
  if (element) return element;
  element = createTag();
  document.head.appendChild(element);
  return element;
};

const toAbsoluteUrl = (value = "") => {
  const raw = String(value || "").trim();
  if (!raw) return "";
  try {
    return new URL(raw, window.location.href).toString();
  } catch (error) {
    return raw;
  }
};

const applyDocumentMeta = (meta, caseItem) => {
  const title = caseItem ? `${caseItem.title} - ${meta.siteTitle}` : meta.siteTitle;
  const description = caseItem ? caseItem.description || meta.siteDescription : meta.siteDescription;
  const ogTitle = caseItem ? `${caseItem.title} - ${meta.ogTitle}` : meta.ogTitle;
  const ogDescription = caseItem ? caseItem.description || meta.ogDescription : meta.ogDescription;
  const ogImage = toAbsoluteUrl(caseItem?.cover || meta.ogImage);
  const canonicalHref = (() => {
    try {
      const canonicalUrl = new URL(meta.canonicalUrl || window.location.href);
      canonicalUrl.search = "";
      return canonicalUrl.toString();
    } catch (error) {
      return window.location.href.split("?")[0];
    }
  })();

  document.title = title;
  ensureMetaTag('meta[name="description"]', () => {
    const tag = document.createElement("meta");
    tag.name = "description";
    return tag;
  }).setAttribute("content", description);
  ensureMetaTag('meta[name="keywords"]', () => {
    const tag = document.createElement("meta");
    tag.name = "keywords";
    return tag;
  }).setAttribute("content", meta.siteKeywords.join(", "));
  ensureMetaTag('meta[property="og:title"]', () => {
    const tag = document.createElement("meta");
    tag.setAttribute("property", "og:title");
    return tag;
  }).setAttribute("content", ogTitle);
  ensureMetaTag('meta[property="og:description"]', () => {
    const tag = document.createElement("meta");
    tag.setAttribute("property", "og:description");
    return tag;
  }).setAttribute("content", ogDescription);
  ensureMetaTag('meta[property="og:image"]', () => {
    const tag = document.createElement("meta");
    tag.setAttribute("property", "og:image");
    return tag;
  }).setAttribute("content", ogImage);
  ensureMetaTag('meta[name="twitter:card"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:card";
    return tag;
  }).setAttribute("content", meta.twitterCard);
  ensureMetaTag('meta[name="twitter:title"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:title";
    return tag;
  }).setAttribute("content", ogTitle);
  ensureMetaTag('meta[name="twitter:description"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:description";
    return tag;
  }).setAttribute("content", ogDescription);
  ensureMetaTag('meta[name="twitter:image"]', () => {
    const tag = document.createElement("meta");
    tag.name = "twitter:image";
    return tag;
  }).setAttribute("content", ogImage);
  ensureMetaTag('link[rel="canonical"]', () => {
    const link = document.createElement("link");
    link.rel = "canonical";
    return link;
  }).setAttribute("href", canonicalHref);
};

function App() {
  const [portfolioData, setPortfolioData] = useState(() => createPortfolioModel(EMBEDDED_PORTFOLIO));
  const [publishedPortfolioData, setPublishedPortfolioData] = useState(() => createPortfolioModel(EMBEDDED_PORTFOLIO));
  const [currentSlide, setCurrentSlide] = useState(0);
  const [layoutMode, setLayoutMode] = useState(() => resolveLayoutMode());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const [showMobileMoreMenu, setShowMobileMoreMenu] = useState(false);
  const [lightboxData, setLightboxData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadSource, setLoadSource] = useState("loading");
  const [statusMessage, setStatusMessage] = useState("正在载入发布数据...");
  const [visualFilter, setVisualFilter] = useState("all");
  const [visibleVideoCount, setVisibleVideoCount] = useState(6);
  const [activeVideoIndex, setActiveVideoIndex] = useState(0);
  const featuredVideoRef = useRef(null);
  const [featuredVideoPlayback, setFeaturedVideoPlayback] = useState({ id: "", status: "poster", hasPlayed: false });
  const [visibleVisualCount, setVisibleVisualCount] = useState(24);
  const [activeCuratedSection, setActiveCuratedSection] = useState("home");
  const [activeDetailPageIndex, setActiveDetailPageIndex] = useState(0);
  const [selectedWorkItem, setSelectedWorkItem] = useState(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isPageJumpEditing, setIsPageJumpEditing] = useState(false);
  const [pageJumpValue, setPageJumpValue] = useState("1");
  const [showStructureEditor, setShowStructureEditor] = useState(false);
  const [showCuratedManager, setShowCuratedManager] = useState(false);
  const [selectedDesignerId, setSelectedDesignerId] = useState("section:home");
  const [showAssetManager, setShowAssetManager] = useState(false);
  const [assetManagerTarget, setAssetManagerTarget] = useState(null);
  const [assetLibrary, setAssetLibrary] = useState([]);
  const [assetLibraryBranch, setAssetLibraryBranch] = useState("");
  const [assetLibraryStatus, setAssetLibraryStatus] = useState("");
  const [assetFilter, setAssetFilter] = useState("uploaded");
  const [assetSearch, setAssetSearch] = useState("");
  const [isAssetLibraryLoading, setIsAssetLibraryLoading] = useState(false);
  const [deletingAssetPath, setDeletingAssetPath] = useState("");
  const [adminCapabilities, setAdminCapabilities] = useState(null);
  const [adminCapabilityStatus, setAdminCapabilityStatus] = useState("");
  const [isCapabilitiesLoading, setIsCapabilitiesLoading] = useState(false);
  const [assetDiagnostics, setAssetDiagnostics] = useState(null);
  const [isApplyingAsset, setIsApplyingAsset] = useState(false);
  const [deploymentStatus, setDeploymentStatus] = useState(null);
  const [metaEditorValue, setMetaEditorValue] = useState("");
  const [metaEditorError, setMetaEditorError] = useState("");
  const [casesEditorValue, setCasesEditorValue] = useState("");
  const [casesEditorError, setCasesEditorError] = useState("");
  const [isPublishingPortfolio, setIsPublishingPortfolio] = useState(false);
  const [activeCuratedDropTarget, setActiveCuratedDropTarget] = useState("");
  const [pendingMediaReplacement, setPendingMediaReplacement] = useState(null);
  const [isReplacingMedia, setIsReplacingMedia] = useState(false);
  const lightboxVideoRef = useRef(null);
  const heroCanvasRef = useRef(null);
  const importInputRef = useRef(null);
  const pageJumpInputRef = useRef(null);
  const touchStartX = useRef(null);
  const touchEndX = useRef(null);
  const hasHydrated = useRef(false);
  const draftPreviewUrlsRef = useRef(new Set());
  const slideTransitionTimeoutRef = useRef(null);
  const preloadedMediaRef = useRef(new Set());
  const slideSectionRefs = useRef(new Map());
  const activeSlideRatiosRef = useRef(new Map());
  const activeSlideFrameRef = useRef(null);
  const currentSlideRef = useRef(0);
  const inlinePreviewRegistryRef = useRef(new Map());
  const activeInlinePreviewOwnerRef = useRef("");
  const deploymentPollTimerRef = useRef(null);
  const currentTheme = colorPalettes[currentSlide % colorPalettes.length] || colorPalettes[0];
  const slidesData = portfolioData.slides;
  const casesData = portfolioData.cases;
  const siteMeta = IS_EDITOR_MODE ? portfolioData.meta : normalizeSiteMeta({ ...portfolioData.meta, ...PUBLIC_APPLICATION_META_OVERRIDES });
  const publishedSlidesData = publishedPortfolioData.slides;
  const tocSlideIndex = slidesData.findIndex((slide) => slide && slide.type === "toc");
  const hasTocSlide = tocSlideIndex >= 0;
  const isMobileFeedMode = true;
  const isMobilePreviewMode = layoutMode !== "desktop-feed";
  const isMobilePortraitMode = layoutMode === "mobile-portrait-feed";
  const isMobileLandscapeMode = layoutMode === "mobile-landscape-feed";
  const prefersHoverControls = supportsHoverInteractions();
  const sectionScrollOffset = IS_EDITOR_MODE ? 132 : 92;
  const portfolioExportModel = sanitizePortfolioModelForExport(portfolioData);
  const portfolioByteSize = getByteSize(portfolioExportModel);
  const portfolioSizeTone = getPortfolioSizeTone(portfolioByteSize);
  const useGalleryWorldHome = false;
  const assetCapabilities = adminCapabilities?.capabilities?.assets || {};
  const deploymentCapabilities = adminCapabilities?.capabilities?.deployment || {};
  const streamCapabilities = adminCapabilities?.capabilities?.stream || {};
  const uploadLimits = adminCapabilities?.limits || {};
  const canListAssets = IS_PORTFOLIO_ADMIN_MODE && assetCapabilities.list === true;
  const canWriteAssets = IS_PORTFOLIO_ADMIN_MODE && assetCapabilities.upload === true && assetCapabilities.replace === true;
  const canDeleteAssets = IS_PORTFOLIO_ADMIN_MODE && assetCapabilities.delete === true;
  const canUseStreamUploads = IS_PORTFOLIO_ADMIN_MODE && streamCapabilities.directUpload === true && streamCapabilities.status === true;
  const assetCapabilityReason = assetCapabilities.reason || adminCapabilityStatus || "Asset tools are not ready yet.";
  const streamCapabilityReason = streamCapabilities.reason || "Cloudflare Stream upload is not configured.";
  const staticAssetUploadLimitBytes = Number(uploadLimits.staticAssetBytes || uploadLimits.videoUploadBytes || DEFAULT_STATIC_ASSET_UPLOAD_LIMIT_BYTES);
  const streamDirectUploadLimitBytes = Number(uploadLimits.streamDirectUploadBytes || streamCapabilities.maxUploadBytes || DEFAULT_STREAM_DIRECT_UPLOAD_LIMIT_BYTES);
  const homepageDesignerState = normalizeHomepageDesignerConfig(normalizeSiteMeta(portfolioData?.meta).homepageDesigner);
  const isHomepageSectionHidden = (sectionId) => sectionId !== "home" && homepageDesignerState.sections?.[sectionId]?.hidden === true;
  const isHomepageBlockHidden = (blockId) => homepageDesignerState.blocks?.[blockId]?.hidden === true;

  const curatedNavItems = [
    { id: "home", label: "首页" },
    { id: "featured", label: "入口" },
    { id: "videos", label: "视频" },
    { id: "cases", label: "案例" },
    { id: "details", label: "详情图" },
    { id: "process", label: "流程" },
    { id: "capabilities", label: "能力" },
    { id: "contact", label: "联系" }
  ].filter((item) => !isHomepageSectionHidden(item.id));
  const curatedSectionIds = curatedNavItems.map((item) => item.id);

  const closeMediaLightbox = () => setLightboxData(null);
  const closeWorkDetail = () => setSelectedWorkItem(null);
  const scrollToCuratedElement = (elementId, options = {}) => {
    const target = document.getElementById(elementId);
    if (!target) return;
    const behavior = options.behavior || "auto";
    const targetTop = window.scrollY + target.getBoundingClientRect().top - sectionScrollOffset;
    if (options.replace) {
      window.history.replaceState(window.history.state, "", `#${elementId}`);
    } else {
      window.history.pushState(window.history.state, "", `#${elementId}`);
    }
    window.scrollTo({ top: Math.max(0, targetTop), behavior });
  };
  const scrollToCuratedSection = (sectionId, options = {}) => {
    scrollToCuratedElement(sectionId, options);
    setActiveCuratedSection(sectionId);
  };
  const handleCuratedAnchorClick = (event, sectionId) => {
    event.preventDefault();
    scrollToCuratedSection(sectionId);
  };
  const openMediaLightbox = (item, options = {}) => {
    if (!item) return;
    setLightboxData({
      ...item,
      requestFullscreen: Boolean(options.requestFullscreen)
    });
  };

  const setSlidesData = (updater) => setPortfolioData((prev) => ({
    ...prev,
    slides: typeof updater === "function" ? updater(prev.slides) : updater
  }));
  const setCasesData = (updater) => setPortfolioData((prev) => ({
    ...prev,
    cases: typeof updater === "function" ? updater(prev.cases) : updater
  }));
  const setSiteMetaData = (updater) => setPortfolioData((prev) => ({
    ...prev,
    meta: typeof updater === "function" ? updater(prev.meta) : updater
  }));

  const describeDeployment = (deployment) => {
    if (!deployment) return "";
    if (deployment.available === false) return deployment.error || "Deployment status is unavailable.";
    if (deployment.status === "completed") {
      return deployment.conclusion === "success"
        ? `Deployment succeeded${deployment.runNumber ? `: #${deployment.runNumber}` : ""}.`
        : `Deployment finished with ${deployment.conclusion || "unknown result"}${deployment.runNumber ? `: #${deployment.runNumber}` : ""}.`;
    }
    if (deployment.status === "not_found") return deployment.message || "Deployment run has not appeared yet.";
    return `Deployment ${deployment.status || "pending"}${deployment.runNumber ? `: #${deployment.runNumber}` : ""}.`;
  };

  const pollDeploymentStatus = (commit, attempt = 0) => {
    if (!commit || !deploymentCapabilities.status) return;
    if (deploymentPollTimerRef.current) {
      window.clearTimeout(deploymentPollTimerRef.current);
      deploymentPollTimerRef.current = null;
    }
    const delay = attempt === 0 ? 2500 : Math.min(12000, 3500 + attempt * 1500);
    deploymentPollTimerRef.current = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/portfolio-admin/deployment-status?commit=${encodeURIComponent(commit)}`, { cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.ok) throw new Error(data.error || `Deployment status failed: ${response.status}`);
        setDeploymentStatus(data.deployment || null);
        const description = describeDeployment(data.deployment);
        if (description) setStatusMessage(description);
        const finished = data.deployment?.status === "completed" || attempt >= 10;
        if (!finished) pollDeploymentStatus(commit, attempt + 1);
      } catch (error) {
        const message = error?.message || "Deployment status failed.";
        setDeploymentStatus({ available: false, error: message, commit });
        setStatusMessage(message);
      }
    }, delay);
  };

  const applyPublishResult = (data, model) => {
    if (!data?.ok || !data.commit) {
      throw new Error(data?.error || "GitHub save did not return a commit.");
    }
    if (model) {
      const normalized = createPortfolioModel(model);
      setPublishedPortfolioData(deepClone(normalized));
      setPortfolioData(deepClone(normalized));
    }
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setLoadSource("published");
    setDeploymentStatus(data.deployment || { commit: data.commit, status: "queued" });
    const deploymentText = describeDeployment(data.deployment);
    setStatusMessage(`Saved to GitHub: ${data.commit.slice(0, 7)}${deploymentText ? `; ${deploymentText}` : "; waiting for deployment."}`);
    pollDeploymentStatus(data.commit);
  };

  const loadAdminCapabilities = async (options = {}) => {
    if (!IS_PORTFOLIO_ADMIN_MODE || isCapabilitiesLoading) return null;
    setIsCapabilitiesLoading(true);
    setAdminCapabilityStatus("Checking admin capabilities...");
    try {
      const endpoint = options.diagnostics ? "/api/portfolio-admin/assets/diagnostics" : "/api/portfolio-admin/capabilities";
      const response = await fetch(endpoint, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `Capability check failed: ${response.status}`);
      setAdminCapabilities(data);
      if (options.diagnostics) setAssetDiagnostics(data);
      const assetReason = data.capabilities?.assets?.reason || "";
      setAdminCapabilityStatus(data.ready ? "Admin tools ready." : (assetReason || "Admin tools are not ready."));
      return data;
    } catch (error) {
      const message = error?.message || "Capability check failed.";
      setAdminCapabilityStatus(message);
      setAdminCapabilities({
        ok: false,
        ready: false,
        capabilities: {
          assets: { list: false, upload: false, delete: false, replace: false, reason: message },
          deployment: { status: false, reason: message },
          stream: { directUpload: false, status: false, reason: message }
        },
        limits: {
          staticAssetBytes: DEFAULT_STATIC_ASSET_UPLOAD_LIMIT_BYTES,
          streamDirectUploadBytes: DEFAULT_STREAM_DIRECT_UPLOAD_LIMIT_BYTES
        }
      });
      return null;
    } finally {
      setIsCapabilitiesLoading(false);
    }
  };

  useEffect(() => {
    if (!IS_PORTFOLIO_ADMIN_MODE) return undefined;
    loadAdminCapabilities();
    return () => {
      if (deploymentPollTimerRef.current) window.clearTimeout(deploymentPollTimerRef.current);
    };
  }, []);

  const setSlideSectionRef = (index, node) => {
    if (node) slideSectionRefs.current.set(index, node);
    else slideSectionRefs.current.delete(index);
  };

  const registerInlinePreviewController = (ownerId, controller) => {
    inlinePreviewRegistryRef.current.set(ownerId, controller);
    return () => {
      inlinePreviewRegistryRef.current.delete(ownerId);
      if (activeInlinePreviewOwnerRef.current === ownerId) {
        activeInlinePreviewOwnerRef.current = "";
      }
    };
  };

  const stopActiveInlinePreview = (exceptOwnerId = "") => {
    const activeOwnerId = activeInlinePreviewOwnerRef.current;
    if (!activeOwnerId || activeOwnerId === exceptOwnerId) return;
    const controller = inlinePreviewRegistryRef.current.get(activeOwnerId);
    if (typeof controller?.stop === "function") controller.stop();
    if (activeInlinePreviewOwnerRef.current === activeOwnerId) {
      activeInlinePreviewOwnerRef.current = "";
    }
  };

  const activateInlinePreview = (ownerId) => {
    if (!ownerId) return;
    if (activeInlinePreviewOwnerRef.current !== ownerId) {
      stopActiveInlinePreview(ownerId);
      activeInlinePreviewOwnerRef.current = ownerId;
    }
  };

  const clearActiveInlinePreview = (ownerId) => {
    if (activeInlinePreviewOwnerRef.current === ownerId) {
      activeInlinePreviewOwnerRef.current = "";
    }
  };

  useEffect(() => {
    currentSlideRef.current = currentSlide;
  }, [currentSlide]);

  useEffect(() => {
    if (IS_EDITOR_MODE) return undefined;
    const updateScrollProgress = () => {
      const scrollable = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
      setScrollProgress(clamp(window.scrollY / scrollable, 0, 1));
    };
    updateScrollProgress();
    window.addEventListener("scroll", updateScrollProgress, { passive: true });
    window.addEventListener("resize", updateScrollProgress);
    return () => {
      window.removeEventListener("scroll", updateScrollProgress);
      window.removeEventListener("resize", updateScrollProgress);
    };
  }, []);

  useEffect(() => {
    if (!selectedWorkItem) return undefined;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") closeWorkDetail();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedWorkItem]);

  useEffect(() => {
    setVisibleVisualCount(curatedGalleryMaxCount);
  }, [visualFilter]);

  useEffect(() => {
    if (IS_EDITOR_MODE) return undefined;
    let frameId = 0;
    const updateActiveSection = () => {
      frameId = 0;
      const scrollBottom = window.scrollY + window.innerHeight;
      const pageBottom = document.documentElement.scrollHeight;
      if (pageBottom - scrollBottom < 24) {
        setActiveCuratedSection("contact");
        return;
      }
      const markerY = window.scrollY + sectionScrollOffset + Math.max(140, window.innerHeight * 0.56);
      let nextActive = "home";
      curatedSectionIds.forEach((sectionId) => {
        const section = document.getElementById(sectionId);
        if (section && section.offsetTop <= markerY) nextActive = sectionId;
      });
      setActiveCuratedSection(nextActive);
    };
    const requestUpdate = () => {
      if (frameId) return;
      frameId = window.requestAnimationFrame(updateActiveSection);
    };
    requestUpdate();
    window.addEventListener("scroll", requestUpdate, { passive: true });
    window.addEventListener("resize", requestUpdate);
    window.addEventListener("hashchange", requestUpdate);
    return () => {
      if (frameId) window.cancelAnimationFrame(frameId);
      window.removeEventListener("scroll", requestUpdate);
      window.removeEventListener("resize", requestUpdate);
      window.removeEventListener("hashchange", requestUpdate);
    };
  }, []);

  useEffect(() => {
    if (IS_EDITOR_MODE || isLoading) return undefined;
    const hashSection = window.location.hash.replace("#", "");
    if (!curatedSectionIds.includes(hashSection)) return undefined;
    const timeoutId = window.setTimeout(() => {
      scrollToCuratedSection(hashSection, { behavior: "auto", replace: true });
    }, 40);
    return () => window.clearTimeout(timeoutId);
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return undefined;

    const revealTargets = Array.from(document.querySelectorAll([
      ".curated-page .curated-hero-copy",
      ".curated-page .curated-hero-stage-wrap",
      ".curated-page .curated-hero-proof"
    ].join(",")));
    if (!revealTargets.length) return undefined;

    const reducedMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || typeof IntersectionObserver !== "function") {
      revealTargets.forEach((target) => target.classList.add("is-motion-visible"));
      return () => revealTargets.forEach((target) => target.classList.remove("is-motion-visible"));
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-motion-visible");
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.12 });

    revealTargets.forEach((target, index) => {
      target.style.setProperty("--reveal-delay", `${Math.min(index * 45, 180)}ms`);
      observer.observe(target);
    });

    return () => {
      observer.disconnect();
      revealTargets.forEach((target) => {
        target.classList.remove("is-motion-visible");
        target.style.removeProperty("--reveal-delay");
      });
    };
  }, [isLoading]);

  useEffect(() => {
    if (isLoading) return undefined;
    if (typeof window.matchMedia !== "function") return undefined;
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    if (reducedMotion || !finePointer) return undefined;

    const cardSelector = [
      ".curated-page .curated-video-card",
      ".curated-page .curated-case-card",
      ".curated-page .curated-visual-card",
      ".curated-page .curated-feature-grid article",
      ".curated-page .curated-process-card",
      ".curated-page .curated-skill-card"
    ].join(",");
    const motionTargets = Array.from(document.querySelectorAll(cardSelector));
    const heroStage = document.querySelector(".curated-page .curated-hero-stage-wrap");
    const disposers = [];

    const resetCardMotion = (target) => {
      target.style.setProperty("--card-rx", "0deg");
      target.style.setProperty("--card-ry", "0deg");
      target.style.setProperty("--spot-x", "50%");
      target.style.setProperty("--spot-y", "50%");
      target.style.setProperty("--media-shift-x", "0px");
      target.style.setProperty("--media-shift-y", "0px");
    };

    motionTargets.forEach((target) => {
      resetCardMotion(target);
      const handlePointerMove = (event) => {
        const rect = target.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        const x = px - 0.5;
        const y = py - 0.5;
        target.style.setProperty("--card-ry", `${x * 7.5}deg`);
        target.style.setProperty("--card-rx", `${-y * 5.5}deg`);
        target.style.setProperty("--spot-x", `${px * 100}%`);
        target.style.setProperty("--spot-y", `${py * 100}%`);
        target.style.setProperty("--media-shift-x", `${-x * 10}px`);
        target.style.setProperty("--media-shift-y", `${-y * 8}px`);
      };
      target.addEventListener("pointermove", handlePointerMove);
      const handlePointerLeave = () => resetCardMotion(target);
      target.addEventListener("pointerleave", handlePointerLeave);
      disposers.push(() => {
        target.removeEventListener("pointermove", handlePointerMove);
        target.removeEventListener("pointerleave", handlePointerLeave);
        resetCardMotion(target);
      });
    });

    if (heroStage) {
      const resetStageMotion = () => {
        heroStage.style.setProperty("--hero-rx", "0deg");
        heroStage.style.setProperty("--hero-ry", "0deg");
        heroStage.style.setProperty("--stage-shift-x", "0px");
        heroStage.style.setProperty("--stage-shift-y", "0px");
        heroStage.style.setProperty("--stage-spot-x", "50%");
        heroStage.style.setProperty("--stage-spot-y", "48%");
      };
      const handleStagePointerMove = (event) => {
        const rect = heroStage.getBoundingClientRect();
        if (!rect.width || !rect.height) return;
        const px = clamp((event.clientX - rect.left) / rect.width, 0, 1);
        const py = clamp((event.clientY - rect.top) / rect.height, 0, 1);
        const x = px - 0.5;
        const y = py - 0.5;
        heroStage.style.setProperty("--hero-ry", `${x * 3.2}deg`);
        heroStage.style.setProperty("--hero-rx", `${-y * 2.4}deg`);
        heroStage.style.setProperty("--stage-shift-x", `${x * 12}px`);
        heroStage.style.setProperty("--stage-shift-y", `${y * 10}px`);
        heroStage.style.setProperty("--stage-spot-x", `${px * 100}%`);
        heroStage.style.setProperty("--stage-spot-y", `${py * 100}%`);
      };
      resetStageMotion();
      heroStage.addEventListener("pointermove", handleStagePointerMove);
      heroStage.addEventListener("pointerleave", resetStageMotion);
      disposers.push(() => {
        heroStage.removeEventListener("pointermove", handleStagePointerMove);
        heroStage.removeEventListener("pointerleave", resetStageMotion);
        resetStageMotion();
      });
    }

    return () => disposers.forEach((dispose) => dispose());
  }, [isLoading, visualFilter, visibleVideoCount, visibleVisualCount]);

  useEffect(() => {
    if (IS_EDITOR_MODE) return undefined;
    const canvas = heroCanvasRef.current;
    if (!canvas) return undefined;
    const context = canvas.getContext("2d");
    if (!context) return undefined;

    const reduceMotion = typeof window.matchMedia === "function" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let animationId = 0;
    let startTime = performance.now();

    const resizeCanvas = () => {
      const rect = canvas.getBoundingClientRect();
      const ratio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.floor(rect.width * ratio));
      canvas.height = Math.max(1, Math.floor(rect.height * ratio));
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    };

    const draw = (timestamp) => {
      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const elapsed = (timestamp - startTime) / 1000;
      context.clearRect(0, 0, width, height);

      const gradient = context.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, "rgba(5,10,18,0.18)");
      gradient.addColorStop(0.44, "rgba(91,216,255,0.16)");
      gradient.addColorStop(1, "rgba(93,116,255,0.14)");
      context.fillStyle = gradient;
      context.fillRect(0, 0, width, height);

      context.lineWidth = 1;
      for (let i = 0; i < 12; i += 1) {
        const orbit = i / 12;
        const x = width * (0.2 + orbit * 0.68);
        const y = height * (0.52 + Math.sin(elapsed * 0.24 + i) * 0.16);
        const radius = Math.min(width, height) * (0.18 + (i % 4) * 0.045);
        context.strokeStyle = i % 3 === 0 ? "rgba(139,156,255,0.38)" : "rgba(91,216,255,0.3)";
        context.beginPath();
        context.arc(x, y, radius, elapsed * 0.12 + i, elapsed * 0.12 + i + Math.PI * (0.42 + orbit));
        context.stroke();
      }

      context.lineWidth = 1;
      for (let i = 0; i < 18; i += 1) {
        const y = (height * ((i * 89) % 100)) / 100;
        const offset = reduceMotion ? 0 : ((elapsed * 18 + i * 29) % Math.max(width, 1));
        context.strokeStyle = i % 4 === 0 ? "rgba(93,116,255,0.26)" : "rgba(218,236,255,0.12)";
        context.beginPath();
        context.moveTo(Math.max(0, offset - width * 0.22), y);
        context.lineTo(Math.min(width, offset + width * 0.2), y + Math.sin(i) * 18);
        context.stroke();
      }

      if (!reduceMotion) animationId = window.requestAnimationFrame(draw);
    };

    resizeCanvas();
    const resizeObserver = typeof ResizeObserver === "function" ? new ResizeObserver(resizeCanvas) : null;
    resizeObserver?.observe(canvas);
    draw(startTime);

    return () => {
      if (animationId) window.cancelAnimationFrame(animationId);
      resizeObserver?.disconnect();
    };
  }, [isLoading]);

  useEffect(() => {
    const unlockInlineAudio = () => {
      markInlineAudioUnlocked();
    };
    window.addEventListener("pointerdown", unlockInlineAudio, { passive: true });
    window.addEventListener("wheel", unlockInlineAudio, { passive: true });
    window.addEventListener("touchstart", unlockInlineAudio, { passive: true });
    window.addEventListener("keydown", unlockInlineAudio);
    return () => {
      window.removeEventListener("pointerdown", unlockInlineAudio);
      window.removeEventListener("wheel", unlockInlineAudio);
      window.removeEventListener("touchstart", unlockInlineAudio);
      window.removeEventListener("keydown", unlockInlineAudio);
    };
  }, []);

  useEffect(() => {
    if (!lightboxData?.requestFullscreen) return undefined;
    const node = lightboxVideoRef.current;
    if (!node) return undefined;
    const requestFullscreen = node.requestFullscreen?.bind(node)
      || node.webkitRequestFullscreen?.bind(node)
      || node.msRequestFullscreen?.bind(node);
    if (typeof requestFullscreen !== "function") return undefined;
    const timeoutId = window.setTimeout(() => {
      Promise.resolve(requestFullscreen()).catch(() => {});
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [lightboxData]);

  useEffect(() => {
    const handleWindowBlur = () => stopActiveInlinePreview();
    const handleVisibilityChange = () => {
      if (document.visibilityState !== "visible") stopActiveInlinePreview();
    };

    window.addEventListener("blur", handleWindowBlur);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      window.removeEventListener("blur", handleWindowBlur);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  const scrollToSlide = (nextIndex) => {
    const target = slideSectionRefs.current.get(nextIndex);
    if (!target) return;
    target.dataset.revealed = "true";
    const targetTop = window.scrollY + target.getBoundingClientRect().top - sectionScrollOffset;
    window.scrollTo({ top: Math.max(0, targetTop), behavior: "smooth" });
    setCurrentSlide(nextIndex);
  };

  const applyMetaEditorValue = () => {
    try {
      const parsed = JSON.parse(metaEditorValue);
      setSiteMetaData(normalizeSiteMeta(parsed));
      setMetaEditorError("");
      setStatusMessage("已更新站点 meta 配置。");
    } catch (error) {
      setMetaEditorError("meta JSON 解析失败，请检查逗号和引号。");
    }
  };

  const applyCasesEditorValue = () => {
    try {
      const parsed = JSON.parse(casesEditorValue);
      setCasesData(sanitizeCasesForExport(parsed));
      setCasesEditorError("");
      setStatusMessage("已更新结构化案例数据。");
    } catch (error) {
      setCasesEditorError("cases JSON 解析失败，请检查数组和字段格式。");
    }
  };

  useEffect(() => {
    let mounted = true;

    loadPortfolioModel().then((published) => {
      if (!mounted) return;
      const draft = IS_EDITOR_MODE ? getStoredDraft() : null;
      setPublishedPortfolioData(deepClone(published));
      setPortfolioData(draft ? draft : deepClone(published));
      setLoadSource(draft ? "draft" : "published");
      setStatusMessage(draft ? "已载入本地草稿，可继续编辑后保存 JSON。" : IS_EDITOR_MODE ? "已载入源数据快照，可继续编辑后保存 JSON。" : `已载入发布数据：${DATA_FILE_PATH}`);
    }).catch(() => {
      if (!mounted) return;
      const fallback = createPortfolioModel(EMBEDDED_PORTFOLIO);
      const draft = IS_EDITOR_MODE ? getStoredDraft() : null;
      setPublishedPortfolioData(deepClone(fallback));
      setPortfolioData(draft ? draft : deepClone(fallback));
      setLoadSource(draft ? "draft-fallback" : "embedded");
      setStatusMessage(draft ? "发布文件读取失败，已改用本地草稿。" : "发布文件读取失败，已改用本地备份数据。");
    }).finally(() => {
      if (!mounted) return;
      setIsLoading(false);
      hasHydrated.current = true;
    });

    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    if (!IS_EDITOR_MODE || !hasHydrated.current || !slidesData.length) return;
    localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(portfolioExportModel));
  }, [portfolioExportModel, slidesData.length]);

  useEffect(() => {
    if (!showStructureEditor) return;
    setMetaEditorValue(JSON.stringify(siteMeta, null, 2));
    setCasesEditorValue(JSON.stringify(casesData, null, 2));
  }, [showStructureEditor, siteMeta, casesData]);

  useEffect(() => {
    const nextUrls = collectDraftPreviewUrls(slidesData);
    draftPreviewUrlsRef.current.forEach((url) => {
      if (!nextUrls.has(url)) URL.revokeObjectURL(url);
    });
    draftPreviewUrlsRef.current = nextUrls;
  }, [slidesData]);

  useEffect(() => () => {
    draftPreviewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
    draftPreviewUrlsRef.current = new Set();
  }, []);

  useEffect(() => () => {
    if (slideTransitionTimeoutRef.current) {
      window.clearTimeout(slideTransitionTimeoutRef.current);
    }
  }, []);

  useEffect(() => {
    const updateLayoutMode = () => setLayoutMode(resolveLayoutMode());
    updateLayoutMode();
    window.addEventListener("resize", updateLayoutMode);
    window.addEventListener("orientationchange", updateLayoutMode);
    window.visualViewport?.addEventListener("resize", updateLayoutMode);
    window.screen?.orientation?.addEventListener?.("change", updateLayoutMode);
    return () => {
      window.removeEventListener("resize", updateLayoutMode);
      window.removeEventListener("orientationchange", updateLayoutMode);
      window.visualViewport?.removeEventListener("resize", updateLayoutMode);
      window.screen?.orientation?.removeEventListener?.("change", updateLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (!slidesData.length) return;
    setCurrentSlide((value) => Math.min(value, slidesData.length - 1));
  }, [slidesData.length]);

  useEffect(() => {
    if (!slidesData.length) return;
    const preloadSlides = [slidesData[currentSlide], slidesData[currentSlide + 1]].filter(Boolean);
    if (!preloadSlides.length) return;

    let cancelIdleTask = () => {};
    const delayId = window.setTimeout(() => {
      cancelIdleTask = scheduleBrowserIdleTask(() => {
        preloadSlides.forEach((slide) => {
          collectSlidePreloadTargets(slide).forEach((target) => {
            const key = `${target.kind}:${target.src}`;
            if (preloadedMediaRef.current.has(key)) return;
            preloadedMediaRef.current.add(key);
            preloadMediaTarget(target);
          });
        });
      });
    }, SLIDE_TRANSITION_IN_MS + 40);

    return () => {
      window.clearTimeout(delayId);
      cancelIdleTask();
    };
  }, [currentSlide, slidesData]);

  useEffect(() => {
    if (!IS_EDITOR_MODE) return undefined;
    const videoSources = collectDirectVideoPreloadTargets(slidesData).filter((src) => !preloadedMediaRef.current.has(`video:${src}`));
    if (!videoSources.length) return undefined;

    const abortController = new AbortController();
    let cancelled = false;
    let cancelIdleTask = () => {};
    const queue = [...videoSources];

    const runWarmup = async () => {
      const workerCount = Math.min(2, queue.length);
      const warmNextSource = async () => {
        while (!cancelled && !abortController.signal.aborted) {
          const src = queue.shift();
          if (!src) return;
          preloadedMediaRef.current.add(`video:${src}`);
          await warmVideoSourceInBackground(src, abortController.signal);
        }
      };
      await Promise.all(Array.from({ length: workerCount }, () => warmNextSource()));
    };

    const delayId = window.setTimeout(() => {
      cancelIdleTask = scheduleBrowserIdleTask(() => {
        void runWarmup();
      });
    }, SLIDE_TRANSITION_IN_MS + 160);

    return () => {
      cancelled = true;
      abortController.abort();
      window.clearTimeout(delayId);
      cancelIdleTask();
    };
  }, [slidesData]);

  useEffect(() => () => {
    if (activeSlideFrameRef.current) {
      window.cancelAnimationFrame(activeSlideFrameRef.current);
      activeSlideFrameRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (!slidesData.length || typeof IntersectionObserver === "undefined") return;
    activeSlideRatiosRef.current.clear();

    const scheduleActiveSlideUpdate = () => {
      if (activeSlideFrameRef.current) return;
      activeSlideFrameRef.current = window.requestAnimationFrame(() => {
        activeSlideFrameRef.current = null;
        let nextIndex = currentSlideRef.current;
        let bestRatio = 0;
        activeSlideRatiosRef.current.forEach((ratio, index) => {
          if (ratio > bestRatio) {
            bestRatio = ratio;
            nextIndex = index;
          }
        });
        if (bestRatio > 0) {
          setCurrentSlide((value) => value === nextIndex ? value : nextIndex);
        }
      });
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        const nextIndex = Number(entry.target.dataset.slideIndex);
        if (!Number.isFinite(nextIndex)) return;
        activeSlideRatiosRef.current.set(nextIndex, entry.isIntersecting ? entry.intersectionRatio : 0);
        if (isMobileFeedMode || (entry.isIntersecting && entry.intersectionRatio >= 0.12)) {
          entry.target.dataset.revealed = "true";
        }
      });
      scheduleActiveSlideUpdate();
    }, {
      root: null,
      rootMargin: "-10% 0px -48% 0px",
      threshold: [0, 0.12, 0.28]
    });

    slideSectionRefs.current.forEach((node) => {
      node.dataset.revealed = isMobileFeedMode ? "true" : (node.dataset.slideIndex === "0" ? "true" : "false");
      observer.observe(node);
    });
    return () => {
      observer.disconnect();
      activeSlideRatiosRef.current.clear();
      if (activeSlideFrameRef.current) {
        window.cancelAnimationFrame(activeSlideFrameRef.current);
        activeSlideFrameRef.current = null;
      }
    };
  }, [isMobileFeedMode, slidesData]);

  useEffect(() => {
    setPageJumpValue(String(currentSlide + 1));
  }, [currentSlide]);

  useEffect(() => {
    if (!isPageJumpEditing || !pageJumpInputRef.current) return;
    pageJumpInputRef.current.focus();
    pageJumpInputRef.current.select();
  }, [isPageJumpEditing]);

  useEffect(() => {
    applyDocumentMeta(siteMeta, null);
  }, [siteMeta]);

  useEffect(() => {
    if (isMobileFeedMode) return;
    const handleKeyDown = (event) => {
      const tag = event.target.tagName;
      if (event.target.isContentEditable || tag === "TEXTAREA" || tag === "INPUT" || tag === "SELECT") return;
      if (event.key === "ArrowRight" || event.key === " ") {
        event.preventDefault();
        changeSlide(Math.min(slidesData.length - 1, currentSlide + 1));
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        changeSlide(Math.max(0, currentSlide - 1));
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentSlide, slidesData.length, isTransitioning, isMobileFeedMode]);

  useEffect(() => {
    if (!IS_EDITOR_MODE) return undefined;

    const blockFileDrop = (event) => {
      if (!isFileDragEvent(event)) return;
      event.preventDefault();
    };

    window.addEventListener("dragover", blockFileDrop);
    window.addEventListener("drop", blockFileDrop);
    return () => {
      window.removeEventListener("dragover", blockFileDrop);
      window.removeEventListener("drop", blockFileDrop);
    };
  }, []);

  const changeSlide = (nextIndex) => {
    if (nextIndex === currentSlide || isTransitioning || nextIndex < 0 || nextIndex >= slidesData.length) return;
    if (slideTransitionTimeoutRef.current) {
      window.clearTimeout(slideTransitionTimeoutRef.current);
    }
    setShowAddMenu(false);
    setIsTransitioning(true);
    slideTransitionTimeoutRef.current = window.setTimeout(() => {
      if (typeof startTransition === "function") {
        startTransition(() => setCurrentSlide(nextIndex));
      } else {
        setCurrentSlide(nextIndex);
      }
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setIsTransitioning(false));
      });
    }, SLIDE_TRANSITION_OUT_MS);
  };

  const goToSlide = (nextIndex) => {
    if (nextIndex < 0 || nextIndex >= slidesData.length) return;
    if (isMobileFeedMode) {
      scrollToSlide(nextIndex);
      return;
    }
    changeSlide(nextIndex);
  };

  const goToTocSlide = () => {
    if (hasTocSlide) goToSlide(tocSlideIndex);
  };

  const updateSlide = (slideIndex, updater) => {
    setSlidesData((prev) => {
      const next = [...prev];
      next[slideIndex] = updater({ ...next[slideIndex] });
      return next;
    });
  };

  const updateSlideText = (slideIndex, field, value) => updateSlide(slideIndex, (slide) => ({ ...slide, [field]: value }));
  const updateTextBlock = (slideIndex, blockIndex, value) => updateSlide(slideIndex, (slide) => {
    const textBlocks = Array.isArray(slide.textBlocks) ? [...slide.textBlocks] : [slide.text || ""];
    textBlocks[blockIndex] = value;
    return { ...slide, textBlocks, text: textBlocks[0] || "" };
  });

  const updateMediaItem = (slideIndex, slotIndex, updater) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      const media = Array.isArray(slide.media) ? [...slide.media] : [];
      const current = normalizeMediaItem(media[slotIndex]) || { kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" };
      media[slotIndex] = normalizeMediaItem(updater(current));
      slide.media = media;
      next[slideIndex] = slide;
      return next;
    });
  };

  const updateCuratedCardHidden = (item, hidden) => {
    if (!item?.entry || !item?.mediaEntry) return;
    updateMediaItem(item.entry.slideIndex, item.mediaEntry.slotIndex, (current) => ({
      ...current,
      curatedHidden: hidden
    }));
    setStatusMessage(hidden ? "已从首页隐藏该卡片，可在卡片管理中恢复。" : "已恢复该卡片到首页展示。");
  };

  const addCuratedPlaceholderCard = (groupId) => {
    const nextId = Date.now();
    const baseMedia = {
      kind: groupId === "videos" ? "video" : "image",
      url: "",
      poster: "",
      label: groupId === "workflows" ? "新 ComfyUI 工作流" : groupId === "videos" ? "新视频作品" : "新视觉作品",
      alt: groupId === "workflows" ? "ComfyUI 工作流占位图" : "作品占位图",
      curatedCategory: groupId === "workflows" ? "workflow" : groupId === "videos" ? "video" : "visual",
      workflowSteps: groupId === "workflows" ? ["输入素材", "节点处理", "结果输出"] : [],
      workflowAbility: groupId === "workflows" ? "补充这个工作流对应的能力说明。" : "",
      workflowOutcome: groupId === "workflows" ? "补充最终输出内容。" : ""
    };

    setSlidesData((prev) => {
      const next = [...prev];
      if (groupId === "workflows") {
        const workflowIndex = next.findIndex((slide) => slide?.type === "workflow-diagram");
        const workflowMedia = normalizeMediaItem(baseMedia);
        if (workflowIndex >= 0) {
          const slide = { ...next[workflowIndex] };
          slide.media = [...(Array.isArray(slide.media) ? slide.media : []), workflowMedia];
          slide.slots = slide.media.length;
          next[workflowIndex] = slide;
          return next;
        }
        next.push(normalizeSlide({
          id: nextId,
          type: "workflow-diagram",
          title: "ComfyUI 工作流",
          desc: "用节点图说明从输入、控制、生成到后期输出的图像处理能力。",
          slots: 1,
          slotType: "image",
          media: [workflowMedia]
        }));
        return next;
      }

      next.push(normalizeSlide({
        id: nextId,
        type: groupId === "videos" ? "full-media" : "gallery-1",
        title: groupId === "videos" ? "新视频作品" : "新视觉作品",
        desc: "在后台替换媒体并补充说明。",
        slots: 1,
        slotType: groupId === "videos" ? "video" : "image",
        media: [normalizeMediaItem(baseMedia)]
      }));
      return next;
    });

    setShowCuratedManager(true);
    setStatusMessage("已新增占位卡片，请替换媒体并补充说明。");
  };

  const getHomepageDesignerState = (model = portfolioData) => {
    const meta = normalizeSiteMeta(model?.meta);
    return normalizeHomepageDesignerConfig(meta.homepageDesigner);
  };

  const cleanDesignerWorkPatch = (patch = {}) => {
    const next = { ...patch };
    if (next.media) next.media = normalizeMediaItem(next.media);
    if (next.tags !== undefined) next.tags = ensureStringArray(next.tags);
    if (next.detailRows !== undefined) {
      next.detailRows = Array.isArray(next.detailRows)
        ? next.detailRows.map((row) => ({ label: ensureString(row?.label), value: ensureString(row?.value) })).filter((row) => row.label || row.value)
        : [];
    }
    Object.keys(next).forEach((key) => {
      if (next[key] === undefined) delete next[key];
    });
    return next;
  };

  const replaceHomepageWorkInPortfolioModel = (model, workId, patch) => {
    const next = createPortfolioModel(model);
    const meta = normalizeSiteMeta(next.meta);
    const designer = getHomepageDesignerState(next);
    const works = { ...designer.works };
    works[workId] = cleanDesignerWorkPatch({
      ...(works[workId] && typeof works[workId] === "object" ? works[workId] : {}),
      ...patch
    });
    next.meta = {
      ...meta,
      homepageDesigner: {
        ...designer,
        works
      }
    };
    return next;
  };

  const updateHomepageDesignerWork = (workId, patch) => {
    if (!workId) return;
    setPortfolioData((current) => replaceHomepageWorkInPortfolioModel(current, workId, patch));
    setLoadSource("draft");
    setStatusMessage("已更新后台设计器草稿，保存后才会上线。");
  };

  const updateHomepageDesignerSection = (sectionId, patch) => {
    if (!sectionId) return;
    setPortfolioData((current) => {
      const next = createPortfolioModel(current);
      const meta = normalizeSiteMeta(next.meta);
      const designer = getHomepageDesignerState(next);
      const sections = { ...designer.sections };
      sections[sectionId] = {
        ...(sections[sectionId] && typeof sections[sectionId] === "object" ? sections[sectionId] : {}),
        ...patch
      };
      next.meta = {
        ...meta,
        homepageDesigner: {
          ...designer,
          sections
        }
      };
      return next;
    });
    setLoadSource("draft");
    setStatusMessage("已更新页面文案草稿，保存后才会上线。");
  };

  const updateHomepageDesignerBlock = (blockId, patch) => {
    if (!blockId) return;
    setPortfolioData((current) => {
      const next = createPortfolioModel(current);
      const meta = normalizeSiteMeta(next.meta);
      const designer = getHomepageDesignerState(next);
      const blocks = { ...designer.blocks };
      blocks[blockId] = {
        ...(blocks[blockId] && typeof blocks[blockId] === "object" ? blocks[blockId] : {}),
        hidden: patch?.hidden === true
      };
      next.meta = {
        ...meta,
        homepageDesigner: {
          ...designer,
          blocks
        }
      };
      return next;
    });
    setLoadSource("draft");
    setStatusMessage("已更新页面模块显示草稿，保存后才会上线。");
  };

  const updateHomepageDesignerTheme = (patch) => {
    setPortfolioData((current) => {
      const next = createPortfolioModel(current);
      const meta = normalizeSiteMeta(next.meta);
      const designer = getHomepageDesignerState(next);
      next.meta = {
        ...meta,
        homepageDesigner: {
          ...designer,
          theme: normalizeHomepageDesignerTheme({
            ...designer.theme,
            ...patch
          })
        }
      };
      return next;
    });
    setLoadSource("draft");
    setStatusMessage("已更新全站设计预设，保存后才会上线。");
  };

  const getCuratedDropTargetKey = (target = {}) => [
    target.type,
    target.slideId || "",
    target.workId || "",
    target.slotIndex ?? "",
    target.caseId || "",
    target.elementId || ""
  ].join(":");

  const replaceMediaInPortfolioModel = (model, target, replacement) => {
    const next = createPortfolioModel(model);
    if (target.type === "homepage-work") {
      return replaceHomepageWorkInPortfolioModel(next, target.workId, { media: replacement });
    }
    if (target.type === "case-cover") {
      next.cases = next.cases.map((caseItem) => caseItem.id === target.caseId
        ? { ...caseItem, cover: replacement.url || replacement.fullUrl || caseItem.cover }
        : caseItem);
      return next;
    }

    const slideIndex = next.slides.findIndex((slide) => slide.id === target.slideId);
    if (slideIndex < 0) throw new Error("没有找到要替换的作品页。");
    const slide = { ...next.slides[slideIndex] };

    if (target.type === "free-layout-media") {
      const elements = Array.isArray(slide.freeLayoutElements) ? [...slide.freeLayoutElements] : [];
      const elementIndex = elements.findIndex((element) => element.id === target.elementId);
      if (elementIndex < 0) throw new Error("没有找到要替换的自由布局媒体。");
      elements[elementIndex] = {
        ...elements[elementIndex],
        media: normalizeMediaItem(replacement)
      };
      slide.freeLayoutElements = elements;
      next.slides[slideIndex] = slide;
      return next;
    }

    const media = Array.isArray(slide.media) ? [...slide.media] : [];
    if (!Number.isInteger(target.slotIndex) || target.slotIndex < 0) throw new Error("媒体槽位无效。");
    const current = normalizeMediaItem(media[target.slotIndex]) || {};
    media[target.slotIndex] = normalizeMediaItem({
      ...current,
      ...replacement,
      label: replacement.label || current.label,
      meta: replacement.meta || current.meta,
      alt: replacement.alt || current.alt,
      curatedHidden: current.curatedHidden === true,
      curatedCategory: current.curatedCategory || replacement.curatedCategory,
      workflowSteps: Array.isArray(current.workflowSteps) && current.workflowSteps.length ? current.workflowSteps : replacement.workflowSteps,
      workflowAbility: current.workflowAbility || replacement.workflowAbility,
      workflowOutcome: current.workflowOutcome || replacement.workflowOutcome
    });
    slide.media = media;
    next.slides[slideIndex] = slide;
    return next;
  };

  const publishPortfolioModel = async (model, message = "Update portfolio JSON") => {
    if (!IS_PORTFOLIO_ADMIN_MODE || isPublishingPortfolio) return null;

    const exportModel = sanitizePortfolioModelForExport(model);
    const issues = await validateSlidesBeforeExport(exportModel.slides);
    const blockingIssues = issues.filter((issue) => issue.includes("未绑定发布路径"));

    if (blockingIssues.length) {
      const preview = blockingIssues.slice(0, 6).join("\n");
      window.alert(`当前有 ${blockingIssues.length} 个媒体仍然只是本地预览，暂时不能保存发布文件：\n\n${preview}${blockingIssues.length > 6 ? "\n..." : ""}`);
      setStatusMessage(`保存已拦截：有 ${blockingIssues.length} 个媒体仍未绑定发布路径。`);
      return null;
    }

    if (issues.length) {
      const preview = issues.slice(0, 6).join("\n");
      const shouldContinue = window.confirm(`保存前检查发现 ${issues.length} 个问题：\n\n${preview}${issues.length > 6 ? "\n..." : ""}\n\n仍然保存到 GitHub 吗？`);
      setStatusMessage(`保存检查发现 ${issues.length} 个问题，请先修复或确认后继续。`);
      if (!shouldContinue) return null;
    }

    setIsPublishingPortfolio(true);
    setStatusMessage("正在保存 data/portfolio.json 到 GitHub...");

    try {
      const response = await fetch("/api/portfolio-admin/portfolio-json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          portfolio: exportModel,
          message
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) {
        throw new Error(data.error || `保存失败：${response.status}`);
      }

      applyPublishResult(data, exportModel);
      return data;
    } catch (error) {
      const messageText = error?.message || "GitHub 保存失败。";
      window.alert(messageText);
      setStatusMessage(messageText);
      throw error;
    } finally {
      setIsPublishingPortfolio(false);
    }
  };

  const buildReplacementMediaFromUpload = (upload, file, measured = {}) => {
    const src = String(upload.relativePath || upload.src || "").replace(/^\/+/, "");
    const kind = upload.kind === "video" ? "video" : "image";
    const width = toPositiveNumber(upload.width) || toPositiveNumber(measured.width);
    const height = toPositiveNumber(upload.height) || toPositiveNumber(measured.height);
    return {
      kind,
      url: src,
      poster: kind === "video" ? "" : "",
      fullUrl: kind === "image" ? src : "",
      width,
      height,
      alt: upload.title || file?.name || "作品媒体",
      label: upload.title || file?.name || ""
    };
  };

  const replacePortfolioMediaOnServer = async (target, asset, options = {}) => {
    if (!IS_PORTFOLIO_ADMIN_MODE) throw new Error("Portfolio admin mode is required.");
    if (!canWriteAssets) throw new Error(assetCapabilityReason || "Asset replacement is not available.");
    if (!target || !asset) throw new Error("Replacement target and asset are required.");
    setIsApplyingAsset(true);
    setAssetLibraryStatus("Saving replacement to GitHub...");
    try {
      const response = await fetch("/api/portfolio-admin/media-replacement", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          target,
          asset,
          message: options.message || `Replace portfolio media ${target.label || ""}`.trim()
        })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `Replacement failed: ${response.status}`);
      applyPublishResult(data, data.portfolio);
      setAssetLibraryStatus(`Saved replacement: ${data.commit ? data.commit.slice(0, 7) : "no commit"}`);
      return data;
    } finally {
      setIsApplyingAsset(false);
    }
  };

  const getMediaReplacementUploadMode = (file, kind) => {
    const size = Number(file?.size || 0);
    if (kind === "video" && size > staticAssetUploadLimitBytes) return "stream";
    return "github";
  };

  const validateMediaReplacementFile = (file, target, kind, uploadMode) => {
    const path = buildPublishedAssetPath(file);
    if (!path || !/^(images|videos)\//.test(path)) {
      return "Only image and video files can be uploaded here.";
    }
    if (target.accept === "image" && kind !== "image") {
      return "This target only accepts image files.";
    }
    if (target.accept === "video" && kind !== "video") {
      return "This target only accepts video files.";
    }
    if (kind === "image" && Number(file.size || 0) > staticAssetUploadLimitBytes) {
      return `Image is larger than ${formatBytes(staticAssetUploadLimitBytes)}. Compress it before uploading.`;
    }
    if (uploadMode === "stream") {
      if (Number(file.size || 0) > streamDirectUploadLimitBytes) {
        return `Video is larger than ${formatBytes(streamDirectUploadLimitBytes)}.`;
      }
      if (!canUseStreamUploads) {
        return streamCapabilityReason;
      }
    }
    return "";
  };

  const waitForStreamUploadReady = async (uid) => {
    for (let attempt = 0; attempt < STREAM_UPLOAD_MAX_POLLS; attempt += 1) {
      const response = await fetch(`/api/portfolio-admin/stream-status?uid=${encodeURIComponent(uid)}`, { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `Cloudflare Stream status failed: ${response.status}`);
      if (data.status === "error") {
        throw new Error(data.errorReasonText || "Cloudflare Stream processing failed.");
      }
      if (data.ready && data.delivery?.hlsUrl) return data;
      setStatusMessage(`Cloudflare Stream is processing video... ${attempt + 1}/${STREAM_UPLOAD_MAX_POLLS}`);
      await new Promise((resolve) => window.setTimeout(resolve, STREAM_UPLOAD_POLL_INTERVAL_MS));
    }
    throw new Error("Cloudflare Stream processing did not finish in time. The upload may still be processing; retry replacement after it is ready.");
  };

  const uploadPortfolioVideoToStream = async (file) => {
    const setupResponse = await fetch("/api/portfolio-admin/stream-upload-url", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fileName: file.name || "portfolio-video",
        mime: file.type || "video/mp4",
        size: file.size || 0
      })
    });
    const setup = await setupResponse.json().catch(() => ({}));
    if (!setupResponse.ok || !setup.ok || !setup.uploadURL) {
      throw new Error(setup.error || `Cloudflare Stream upload setup failed: ${setupResponse.status}`);
    }
    if (!setup.uid) {
      throw new Error("Cloudflare Stream upload setup did not return a video uid.");
    }

    const form = new FormData();
    form.append("file", file);
    const uploadResponse = await fetch(setup.uploadURL, {
      method: "POST",
      body: form
    });
    if (!uploadResponse.ok) {
      throw new Error(`Cloudflare Stream upload failed: ${uploadResponse.status}`);
    }

    const status = await waitForStreamUploadReady(setup.uid);
    return {
      kind: "video",
      title: file.name || "Cloudflare Stream video",
      name: file.name || "Cloudflare Stream video",
      fileName: file.name || "stream-video",
      size: file.size || 0,
      poster: status.delivery?.thumbnailUrl || "",
      delivery: status.delivery
    };
  };

  const requestMediaReplacement = (file, target) => {
    if (!file) return;
    if (!IS_PORTFOLIO_ADMIN_MODE) {
      setStatusMessage("请在 /admin 登录后拖拽上传，公开页不会启用上传。");
      return;
    }
    if (!canWriteAssets) {
      const message = assetCapabilityReason || "Upload replacement is not available.";
      window.alert(message);
      setStatusMessage(message);
      loadAdminCapabilities({ diagnostics: true });
      return;
    }
    const kind = getFileMediaKind(file);
    const uploadMode = getMediaReplacementUploadMode(file, kind);
    const validationMessage = validateMediaReplacementFile(file, target, kind, uploadMode);
    if (validationMessage) {
      window.alert(validationMessage);
      setStatusMessage(validationMessage);
      return;
    }
    if (target.accept === "image" && kind !== "image") {
      window.alert("这个位置只能替换为图片。视频请拖到视频作品媒体位。");
      return;
    }
    const previewUrl = URL.createObjectURL(file);
    setPendingMediaReplacement({
      file,
      target,
      previewUrl,
      kind,
      uploadMode,
      summary: getReplacementFileSummary(file)
    });
  };

  const cancelPendingMediaReplacement = () => {
    if (pendingMediaReplacement?.previewUrl) URL.revokeObjectURL(pendingMediaReplacement.previewUrl);
    setPendingMediaReplacement(null);
    setIsReplacingMedia(false);
  };

  const confirmPendingMediaReplacement = async () => {
    const pending = pendingMediaReplacement;
    if (!pending || isReplacingMedia) return;
    setIsReplacingMedia(true);
    try {
      const measured = await measureImageFile(pending.file, pending.previewUrl);
      setStatusMessage(`正在上传并替换：${pending.target.label || pending.file.name}...`);
      const upload = pending.uploadMode === "stream"
        ? await uploadPortfolioVideoToStream(pending.file)
        : await uploadPortfolioFile(pending.file, {
          category: pending.target.type === "case-cover" ? "portfolio-case-cover" : "portfolio-media",
          title: pending.file.name,
          width: measured.width,
          height: measured.height
        });
      await replacePortfolioMediaOnServer(pending.target, upload, {
        message: `Upload and replace portfolio media ${pending.target.label || pending.file.name}`
      });
      setPendingMediaReplacement(null);
      loadPortfolioAssets();
      if (pending.previewUrl) URL.revokeObjectURL(pending.previewUrl);
    } catch (error) {
      setStatusMessage(error?.message || "媒体替换失败，已保留原作品数据。");
    } finally {
      setIsReplacingMedia(false);
    }
  };

  const requestExternalVideoReplacement = async (target, currentMedia) => {
    if (!IS_PORTFOLIO_ADMIN_MODE) return;
    const current = normalizeMediaItem(currentMedia) || {};
    const value = window.prompt("粘贴外站视频链接（支持 YouTube、B 站、抖音；保存后等待自动部署）：", current.url || "");
    if (!value) return;
    const trimmed = value.trim();
    const kind = inferMediaKind(trimmed);
    if (kind !== "video" && kind !== "youtube") {
      window.alert("请输入视频链接或视频 ID。");
      return;
    }
    const provider = extractYouTubeId(trimmed) ? "youtube" : isBilibiliVideoUrl(trimmed) ? "bilibili" : extractDouyinVideoId(trimmed) ? "douyin" : "external";
    const shouldSave = window.confirm(`确认把「${target.label || "当前媒体"}」替换为外站视频链接吗？\n\n${trimmed}`);
    if (!shouldSave) return;
    const replacement = normalizeMediaItem({
      ...current,
      kind: provider === "youtube" ? "youtube" : "video",
      url: trimmed,
      poster: current.poster || "",
      draftPreviewUrl: "",
      externalProvider: provider,
      label: target.label || current.label || ""
    });
    try {
      const nextModel = replaceMediaInPortfolioModel(portfolioData, target, replacement);
      setPortfolioData(deepClone(nextModel));
      setLoadSource("draft");
      setStatusMessage(`已替换到本地草稿：${target.label || "当前媒体"}。确认无误后再点击保存到代码仓库发布。`);
    } catch (error) {
      setStatusMessage(error?.message || "外链视频保存失败，已保留原作品数据。");
    }
  };

  const getCuratedDropHandlers = (target) => {
    if (!IS_PORTFOLIO_ADMIN_MODE) return {};
    const key = getCuratedDropTargetKey(target);
    return {
      onDragEnter: (event) => {
        if (!isFileDragEvent(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setActiveCuratedDropTarget(key);
      },
      onDragOver: (event) => {
        if (!isFileDragEvent(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "copy";
        setActiveCuratedDropTarget(key);
      },
      onDragLeave: (event) => {
        if (!isFileDragEvent(event)) return;
        event.preventDefault();
        event.stopPropagation();
        if (!event.currentTarget.contains(event.relatedTarget)) setActiveCuratedDropTarget("");
      },
      onDrop: (event) => {
        if (!isFileDragEvent(event)) return;
        event.preventDefault();
        event.stopPropagation();
        setActiveCuratedDropTarget("");
        const file = event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) requestMediaReplacement(file, target);
      }
    };
  };

  const resetDraft = () => {
    setPortfolioData(deepClone(publishedSlidesData.length ? publishedPortfolioData : createPortfolioModel(EMBEDDED_PORTFOLIO)));
    localStorage.removeItem(DRAFT_STORAGE_KEY);
    setLoadSource("published");
    setStatusMessage(`草稿已重置为 ${DATA_FILE_PATH} 的发布内容。`);
  };

  const exportDraft = async () => {
    const issues = await validateSlidesBeforeExport(slidesData);
    const blockingIssues = issues.filter((issue) => issue.includes("未绑定发布路径"));

    if (blockingIssues.length) {
      const preview = blockingIssues.slice(0, 6).join("\n");
      window.alert(`当前有 ${blockingIssues.length} 个媒体仍然只是本地预览，暂时不能导出发布文件：\n\n${preview}${blockingIssues.length > 6 ? "\n..." : ""}`);
      setStatusMessage(`导出已拦截：有 ${blockingIssues.length} 个媒体仍未绑定发布路径。`);
      return;
    }

    if (issues.length) {
      const preview = issues.slice(0, 6).join("\n");
      const shouldContinue = window.confirm(`导出前检查发现 ${issues.length} 个问题：\n\n${preview}${issues.length > 6 ? "\n..." : ""}\n\n仍然继续导出吗？`);
      setStatusMessage(`导出检查发现 ${issues.length} 个问题，请先修复或确认后继续。`);
      if (!shouldContinue) return;
    }

    downloadJsonFile("portfolio.json", portfolioExportModel);
    setStatusMessage(issues.length ? `已导出 portfolio.json，但仍有 ${issues.length} 个待修复问题。` : "当前草稿已导出为 portfolio.json，可覆盖 data/portfolio.json 后提交到 GitHub。");
  };

  const publishPortfolioJson = async () => {
    if (!IS_PORTFOLIO_ADMIN_MODE || isPublishingPortfolio) return;
    try {
      await publishPortfolioModel(portfolioData, "Update portfolio JSON");
    } catch (error) {
      setStatusMessage(error?.message || "Portfolio publish failed.");
    }
  };

  const uploadPortfolioFile = async (file, options = {}) => {
    if (!IS_PORTFOLIO_ADMIN_MODE) {
      throw new Error("只有 /admin 登录后的后台可以上传并写入仓库。");
    }
    if (!canWriteAssets) {
      await loadAdminCapabilities({ diagnostics: true });
      throw new Error(assetCapabilityReason || "Upload is not available.");
    }
    if (!file) throw new Error("请选择要上传的媒体文件。");

    const form = new FormData();
    form.append("file", file);
    form.append("category", options.category || "portfolio-media");
    form.append("title", options.title || file.name || "Portfolio media");
    if (options.width) form.append("width", String(options.width));
    if (options.height) form.append("height", String(options.height));

    const response = await fetch("/api/portfolio-admin/uploads", {
      method: "POST",
      body: form
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok || !data.ok || !data.upload?.src) {
      throw new Error(data.error || `上传失败：${response.status}`);
    }
    return data.upload;
  };

  const loadPortfolioAssets = async () => {
    if (!IS_PORTFOLIO_ADMIN_MODE || isAssetLibraryLoading) return;
    if (!canListAssets) {
      const diagnostics = await loadAdminCapabilities({ diagnostics: true });
      const reason = diagnostics?.capabilities?.assets?.reason || assetCapabilityReason;
      setAssetLibraryStatus(`Asset library unavailable: ${reason}`);
      setAssetDiagnostics(diagnostics);
      return;
    }
    setIsAssetLibraryLoading(true);
    setAssetLibraryStatus("正在读取 GitHub 素材库...");
    try {
      const response = await fetch("/api/portfolio-admin/assets", { cache: "no-store" });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `读取失败：${response.status}`);
      const assets = Array.isArray(data.assets) ? data.assets : [];
      setAssetLibrary(assets);
      setAssetLibraryBranch(data.branch || "");
      setAssetLibraryStatus(`已载入 ${assets.length} 个素材，可直接选择替换。`);
    } catch (error) {
      const diagnostics = await loadAdminCapabilities({ diagnostics: true });
      setAssetDiagnostics(diagnostics);
      setAssetLibraryStatus(error?.message || "素材库读取失败。");
    } finally {
      setIsAssetLibraryLoading(false);
    }
  };

  const openAssetManager = (target = null) => {
    if (!IS_PORTFOLIO_ADMIN_MODE) return;
    setAssetManagerTarget(target);
    setShowAssetManager(true);
    setAssetFilter(target?.accept === "image" ? "image" : "uploaded");
    if (!canListAssets) {
      loadAdminCapabilities({ diagnostics: true });
      setAssetLibraryStatus(`Asset library unavailable: ${assetCapabilityReason}`);
      return;
    }
    if (!assetLibrary.length) loadPortfolioAssets();
  };

  const closeAssetManager = () => {
    setShowAssetManager(false);
    setAssetManagerTarget(null);
  };

  const copyAssetPath = async (asset) => {
    const path = normalizeRepoMediaPath(asset?.path || asset?.url || "");
    if (!path) return;
    try {
      await navigator.clipboard?.writeText(path);
      setAssetLibraryStatus(`已复制素材路径：${path}`);
    } catch {
      window.prompt("复制素材路径", path);
    }
  };

  const findPosterForVideoAsset = (assetPath) => {
    const fileName = assetPath.split("/").pop() || "";
    const baseName = fileName.replace(/\.[^.]+$/, "");
    const posterPath = `images/_posters/${baseName}.webp`;
    return assetLibrary.some((asset) => normalizeRepoMediaPath(asset.path) === posterPath) ? posterPath : "";
  };

  const buildReplacementMediaFromAsset = (asset, target) => {
    const path = normalizeRepoMediaPath(asset?.path || "");
    if (!path) throw new Error("素材路径无效。");
    const kind = asset?.kind === "video" ? "video" : "image";
    if (target?.accept === "image" && kind !== "image") {
      throw new Error("这个位置只能使用图片素材。");
    }
    return {
      kind,
      url: path,
      fullUrl: kind === "image" ? path : "",
      poster: kind === "video" ? findPosterForVideoAsset(path) : "",
      alt: asset?.name || target?.label || "作品素材",
      label: asset?.name || path
    };
  };

  const useAssetForTarget = async (asset) => {
    if (!assetManagerTarget) {
      copyAssetPath(asset);
      return;
    }

    try {
      await replacePortfolioMediaOnServer(assetManagerTarget, asset);
      closeAssetManager();
    } catch (error) {
      window.alert(error?.message || "素材应用失败。");
      setAssetLibraryStatus(error?.message || "素材应用失败。");
    }
  };

  const deletePortfolioAsset = async (asset) => {
    const path = normalizeRepoMediaPath(asset?.path || "");
    if (!path || deletingAssetPath) return;
    if (!canDeleteAssets) {
      const message = assetCapabilityReason || "Asset deletion is not available.";
      window.alert(message);
      setAssetLibraryStatus(message);
      return;
    }
    if (!asset?.canDelete) {
      const references = Array.isArray(asset?.references) ? asset.references.map((item) => item.source).filter(Boolean) : [];
      const reason = references.length
        ? `这个素材仍被引用：\n${references.join("\n")}`
        : "这里只允许删除 images/uploads/ 或 videos/uploads/ 下的未引用上传素材。";
      window.alert(reason);
      return;
    }

    const confirmed = window.confirm(`确认从代码仓库删除这个上传素材吗？\n\n${path}\n\n删除后无法在后台直接恢复。`);
    if (!confirmed) return;

    setDeletingAssetPath(path);
    setAssetLibraryStatus(`正在删除 ${path}...`);
    try {
      const response = await fetch("/api/portfolio-admin/assets", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path })
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.ok) throw new Error(data.error || `删除失败：${response.status}`);
      setAssetLibrary((items) => items.filter((item) => normalizeRepoMediaPath(item.path) !== path));
      setAssetLibraryStatus(`已删除 ${path}${data.commit ? `：${data.commit.slice(0, 7)}` : ""}`);
      setStatusMessage(`已删除上传素材：${path}。`);
    } catch (error) {
      window.alert(error?.message || "素材删除失败。");
      setAssetLibraryStatus(error?.message || "素材删除失败。");
    } finally {
      setDeletingAssetPath("");
    }
  };

  const importDraft = async (event) => {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    try {
      const imported = createPortfolioModel(JSON.parse(await file.text()));
      setPortfolioData(imported);
      setLoadSource("draft");
      setStatusMessage(`已导入 ${file.name}，现在显示的是本地草稿。`);
    } catch (error) {
      alert("JSON 导入失败，请确认文件格式正确。");
    }
    event.target.value = "";
  };

  const addSlide = (layoutType) => {
    const nextSlide = normalizeSlide({
      id: Date.now(),
      type: layoutType,
      title: "自定义页面",
      desc: "在这里输入说明",
      slots: layoutType === "compare-slider" ? 2 : 1,
      slotType: "mix",
      media: [],
      text: layoutType === "split" ? "输入段落文字..." : undefined,
      freeLayoutElements: layoutType === "free-layout" ? [{ ...createFreeLayoutElement("text"), z: 1 }, { ...createFreeLayoutElement("media"), z: 2 }] : undefined
    });
    if (layoutType.startsWith("gallery-")) nextSlide.slots = Number(layoutType.split("-")[1]) || 1;

    setSlidesData((prev) => {
      const next = [...prev];
      next.splice(currentSlide + 1, 0, nextSlide);
      return next;
    });
    setShowAddMenu(false);
    setShowMobileMoreMenu(false);
  };

  const adjustCurrentSlideSlots = (delta) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[currentSlide] };
      if (!slide || slide.type === "cover" || slide.type === "toc" || slide.type === "chapter" || slide.type === "compare-slider") return prev;
      const currentSlots = Math.max(1, Number(slide.slots) || 1);
      const nextSlots = Math.max(1, Math.min(12, currentSlots + delta));
      if (nextSlots === currentSlots) return prev;
      slide.slots = nextSlots;
      if (typeof slide.type === "string" && slide.type.startsWith("gallery-")) slide.type = `gallery-${nextSlots}`;
      slide.media = Array.isArray(slide.media) ? slide.media.slice(0, nextSlots) : [];
      next[currentSlide] = slide;
      return next;
    });
  };

  const updateFreeLayoutElement = (slideIndex, elementId, updater) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      const elements = Array.isArray(slide.freeLayoutElements) ? [...slide.freeLayoutElements] : [];
      const elementIndex = elements.findIndex((element) => element.id === elementId);
      if (elementIndex < 0) return prev;
      elements[elementIndex] = normalizeFreeLayoutElement(updater({ ...elements[elementIndex] }));
      slide.freeLayoutElements = elements;
      next[slideIndex] = slide;
      return next;
    });
  };

  const moveFreeLayoutElementLayer = (slideIndex, elementId, direction) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      if (!slide || slide.type !== "free-layout") return prev;
      const elements = (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : [])
        .map((element, index) => normalizeFreeLayoutElement({
          ...element,
          z: Number.isFinite(Number(element?.z)) ? Number(element.z) : index + 1
        }))
        .sort((a, b) => a.z - b.z);
      const elementIndex = elements.findIndex((element) => element.id === elementId);
      if (elementIndex < 0) return prev;
      const swapIndex = direction === "forward" ? elementIndex + 1 : elementIndex - 1;
      if (swapIndex < 0 || swapIndex >= elements.length) return prev;
      [elements[elementIndex], elements[swapIndex]] = [elements[swapIndex], elements[elementIndex]];
      slide.freeLayoutElements = elements.map((element, index) => normalizeFreeLayoutElement({
        ...element,
        z: index + 1
      }));
      next[slideIndex] = slide;
      return next;
    });
  };

  const addFreeLayoutElement = (type) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[currentSlide] };
      if (!slide || slide.type !== "free-layout") return prev;
      const elements = Array.isArray(slide.freeLayoutElements) ? [...slide.freeLayoutElements] : [];
      const nextZ = elements.reduce((max, element) => Math.max(max, Number(element?.z) || 1), 0) + 1;
      elements.push({ ...createFreeLayoutElement(type), z: nextZ });
      slide.freeLayoutElements = elements.map(normalizeFreeLayoutElement);
      next[currentSlide] = slide;
      return next;
    });
    setShowAddMenu(false);
  };

  const removeFreeLayoutElement = (slideIndex, elementId) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[slideIndex] };
      if (!slide || slide.type !== "free-layout") return prev;
      slide.freeLayoutElements = (Array.isArray(slide.freeLayoutElements) ? slide.freeLayoutElements : []).filter((element) => element.id !== elementId);
      next[slideIndex] = slide;
      return next;
    });
  };

  const adjustCurrentTextBlocks = (delta) => {
    setSlidesData((prev) => {
      const next = [...prev];
      const slide = { ...next[currentSlide] };
      if (!slide || slide.type !== "split") return prev;
      const textBlocks = Array.isArray(slide.textBlocks) ? [...slide.textBlocks] : [slide.text || ""];
      if (delta > 0) {
        textBlocks.push("");
      } else if (delta < 0 && textBlocks.length > 1) {
        textBlocks.pop();
      }
      slide.textBlocks = textBlocks;
      slide.text = textBlocks[0] || "";
      next[currentSlide] = slide;
      return next;
    });
  };

  const moveCurrentSlide = (delta) => {
    const targetIndex = currentSlide + delta;
    if (targetIndex < 0 || targetIndex >= slidesData.length) return;
    setSlidesData((prev) => {
      const next = [...prev];
      const [moved] = next.splice(currentSlide, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
    setCurrentSlide(targetIndex);
    setShowAddMenu(false);
    setShowMobileMoreMenu(false);
  };

  const deleteCurrentSlide = () => {
    if (slidesData.length <= 1) return;
    setSlidesData((prev) => prev.filter((_, index) => index !== currentSlide));
    setCurrentSlide(Math.max(0, Math.min(currentSlide - 1, slidesData.length - 2)));
    setShowAddMenu(false);
    setShowMobileMoreMenu(false);
  };

  const submitPageJump = () => {
    const parsed = Number(pageJumpValue);
    setIsPageJumpEditing(false);
    if (!Number.isFinite(parsed)) {
      setPageJumpValue(String(currentSlide + 1));
      return;
    }
    const nextIndex = Math.max(0, Math.min(slidesData.length - 1, Math.round(parsed) - 1));
    setPageJumpValue(String(nextIndex + 1));
    goToSlide(nextIndex);
  };

  const CompareSliderContainer = ({ slideIndex }) => {
    const [position, setPosition] = useState(50);
    const sliderRef = useRef(null);

    const handleDrag = (event) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      let clientX = event.clientX;
      if (event.touches && event.touches.length > 0) clientX = event.touches[0].clientX;
      let percent = ((clientX - rect.left) / rect.width) * 100;
      if (percent < 0) percent = 0;
      if (percent > 100) percent = 100;
      setPosition(percent);
    };

    const overlayWidth = position > 0 ? `${100 * (100 / position)}%` : "100%";

    return <div className="relative w-full h-full rounded-3xl overflow-hidden shadow-2xl border border-white/10" ref={sliderRef} onMouseMove={(event) => { if (event.buttons === 1) handleDrag(event); }} onTouchMove={handleDrag}>
      <div className="absolute inset-0"><MediaSlot slideIndex={slideIndex} slotIndex={1} label="上传对比素材" /></div>
      <div className="absolute inset-y-0 left-0 overflow-hidden border-r-2 border-cyan-400 shadow-[2px_0_15px_rgba(34,211,238,0.5)] z-20 pointer-events-none" style={{ width: `${position}%` }}>
        <div className="absolute inset-y-0 left-0 pointer-events-auto" style={{ width: overlayWidth }}><MediaSlot slideIndex={slideIndex} slotIndex={0} label="上传对比素材" /></div>
      </div>
      <div className="absolute inset-y-0 w-8 -ml-4 flex items-center justify-center z-30 cursor-ew-resize slider-handle" style={{ left: `${position}%` }}>
        <div className="w-8 h-8 bg-cyan-400 rounded-full flex items-center justify-center text-black shadow-[0_0_15px_rgba(34,211,238,0.6)]"><Icon name="ChevronLeft" size={14} className="-mr-2" /><Icon name="ChevronRight" size={14} /></div>
      </div>
    </div>;
  };

  const EditableText = ({ text, field, slideIndex, className, tagName = "div", placeholder = "输入文本...", onBlurValue }) => {
    const Tag = tagName;
    if (!IS_EDITOR_MODE) return <Tag className={className}>{text}</Tag>;
    return <Tag
      data-editable="true"
      data-placeholder={placeholder}
      contentEditable
      suppressContentEditableWarning
      onBlur={(event) => {
        if (typeof onBlurValue === "function") onBlurValue(event.target.innerText);
        else updateSlideText(slideIndex, field, event.target.innerText);
      }}
      onKeyDown={(event) => {
        event.stopPropagation();
        if (event.key === "Enter" && tagName !== "div") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className={`outline-none hover:bg-white/10 focus:bg-white/20 focus:ring-1 focus:ring-white/50 rounded px-2 py-1 -ml-2 transition-all cursor-text min-h-[1.8em] min-w-[4ch] border border-dashed border-white/10 ${className}`}
      title="点击直接修改文字"
    >{text}</Tag>;
  };

  const FreeLayoutElement = ({ slideIndex, element, containerRef }) => {
    const interactionRef = useRef(null);
    const [showTextSettings, setShowTextSettings] = useState(false);

    useEffect(() => () => {
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopPointerInteraction);
    }, []);

    const stopPointerInteraction = () => {
      interactionRef.current = null;
      window.removeEventListener("mousemove", handlePointerMove);
      window.removeEventListener("mouseup", stopPointerInteraction);
    };

    const handlePointerMove = (event) => {
      const state = interactionRef.current;
      if (!state) return;
      const dx = ((event.clientX - state.startX) / state.rect.width) * 100;
      const dy = ((event.clientY - state.startY) / state.rect.height) * 100;

      updateFreeLayoutElement(slideIndex, element.id, (current) => {
        if (state.mode === "drag") {
          return {
            ...current,
            x: clamp(state.originX + dx, 0, 100 - current.w),
            y: clamp(state.originY + dy, 0, 100 - current.h)
          };
        }
        return {
          ...current,
          w: clamp(state.originW + dx, 12, 100 - current.x),
          h: clamp(state.originH + dy, 10, 100 - current.y)
        };
      });
    };

    const beginPointerInteraction = (mode, event) => {
      if (!IS_EDITOR_MODE || !containerRef.current) return;
      event.preventDefault();
      event.stopPropagation();
      const rect = containerRef.current.getBoundingClientRect();
      interactionRef.current = {
        mode,
        startX: event.clientX,
        startY: event.clientY,
        originX: element.x,
        originY: element.y,
        originW: element.w,
        originH: element.h,
        rect
      };
      window.addEventListener("mousemove", handlePointerMove);
      window.addEventListener("mouseup", stopPointerInteraction);
    };

    return <div
      className="absolute rounded-2xl border border-white/10 bg-black/20 shadow-2xl backdrop-blur-xl overflow-hidden"
      style={{ left: `${element.x}%`, top: `${element.y}%`, width: `${element.w}%`, height: `${element.h}%`, zIndex: element.z }}
    >
      <div className="absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/70 to-transparent">
        <button onMouseDown={(event) => beginPointerInteraction("drag", event)} className="cursor-move rounded-full bg-white/10 px-2 py-1 text-[10px] tracking-[0.2em] text-white/60 uppercase">
          {element.type === "text" ? "文字" : "媒体"}
        </button>
        <div className="flex items-center gap-1.5">
          {IS_EDITOR_MODE && <button onClick={() => moveFreeLayoutElementLayer(slideIndex, element.id, "backward")} className="rounded-full bg-black/60 p-1.5 text-white/75 hover:bg-black/90">
            <Icon name="ArrowDown" size={12} />
          </button>}
          {IS_EDITOR_MODE && <button onClick={() => moveFreeLayoutElementLayer(slideIndex, element.id, "forward")} className="rounded-full bg-black/60 p-1.5 text-white/75 hover:bg-black/90">
            <Icon name="ArrowUp" size={12} />
          </button>}
          {IS_EDITOR_MODE && element.type === "text" && <button onClick={() => setShowTextSettings((value) => !value)} className={`rounded-full p-1.5 text-white/75 transition-all ${showTextSettings ? "bg-cyan-500/90" : "bg-black/60 hover:bg-black/90"}`}>
            <Icon name="Sparkles" size={12} />
          </button>}
          <button onClick={() => removeFreeLayoutElement(slideIndex, element.id)} className="rounded-full bg-black/60 p-1.5 text-white/70 hover:bg-red-500/20 hover:text-red-200">
            <Icon name="Trash2" size={12} />
          </button>
        </div>
      </div>
      {IS_EDITOR_MODE && element.type === "text" && showTextSettings && <div className="absolute top-12 right-3 z-40 w-[220px] rounded-2xl border border-white/10 bg-black/80 p-3 shadow-2xl backdrop-blur-xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mb-3 flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] text-cyan-300 uppercase">
          <Icon name="Sparkles" size={12} />
          文字动效
        </div>
        <label className="mb-3 flex flex-col gap-1 text-xs text-white/60">
          动画类型
          <select value={element.animation || "none"} onChange={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, animation: event.target.value }))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none">
            <option value="none">无</option>
            <option value="fade-up">淡入上浮</option>
            <option value="typewriter">逐字出现</option>
          </select>
        </label>
        <label className="mb-3 flex flex-col gap-1 text-xs text-white/60">
          动画时长
          <input type="number" min="0.2" max="8" step="0.1" value={element.animationDuration ?? 1.2} onChange={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, animationDuration: Number(event.target.value) || 1.2 }))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="flex flex-col gap-1 text-xs text-white/60">
          延迟时间
          <input type="number" min="0" max="8" step="0.1" value={element.animationDelay ?? 0} onChange={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, animationDelay: Number(event.target.value) || 0 }))} className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none" />
        </label>
      </div>}
      {element.type === "text" ? <div className="h-full w-full px-5 pt-12 pb-5">
        {IS_EDITOR_MODE ? <div
          contentEditable
          suppressContentEditableWarning
          onMouseDown={(event) => event.stopPropagation()}
          onBlur={(event) => updateFreeLayoutElement(slideIndex, element.id, (current) => ({ ...current, text: event.currentTarget.innerText }))}
          className="h-full w-full overflow-auto outline-none text-white/90 text-lg leading-relaxed whitespace-pre-wrap"
        >
          {element.text}
        </div> : <FreeLayoutAnimatedText
          text={element.text}
          animation={element.animation}
          duration={element.animationDuration}
          delay={element.animationDelay}
        />}
    </div> : <FreeLayoutMediaBox slideIndex={slideIndex} element={element} />}
      {IS_EDITOR_MODE && <button onMouseDown={(event) => beginPointerInteraction("resize", event)} className="absolute bottom-2 right-2 z-30 flex h-7 w-7 items-center justify-center rounded-full bg-black/65 text-white/75 cursor-se-resize">
        <Icon name="Maximize2" size={12} />
      </button>}
    </div>;
  };

  const FreeLayoutAnimatedText = ({ text, animation = "none", duration = 1.2, delay = 0 }) => {
    const [visibleText, setVisibleText] = useState(animation === "typewriter" ? "" : text);

    useEffect(() => {
      if (animation !== "typewriter") {
        setVisibleText(text);
        return;
      }

      setVisibleText("");
      const fullText = String(text || "");
      const totalChars = Math.max(fullText.length, 1);
      const stepMs = Math.max((duration * 1000) / totalChars, 16);
      let index = 0;
      let intervalId = null;

      const startTimer = window.setTimeout(() => {
        intervalId = window.setInterval(() => {
          index += 1;
          setVisibleText(fullText.slice(0, index));
          if (index >= fullText.length) {
            window.clearInterval(intervalId);
          }
        }, stepMs);
      }, delay * 1000);

      return () => {
        window.clearTimeout(startTimer);
        if (intervalId) window.clearInterval(intervalId);
      };
    }, [text, animation, duration, delay]);

    const style = animation === "fade-up" ? {
      animation: `freeLayoutFadeUp ${duration}s ease ${delay}s both`
    } : undefined;

    return <>
      <style>{`
        @keyframes freeLayoutFadeUp {
          from {
            opacity: 0;
            transform: translateY(18px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
      <div style={style} className="h-full w-full overflow-auto text-white/90 text-lg leading-relaxed whitespace-pre-wrap">
        {animation === "typewriter" ? visibleText : text}
        {animation === "typewriter" && <span className="ml-0.5 inline-block h-[1em] w-[1px] animate-pulse bg-white/70 align-[-0.1em]" />}
      </div>
    </>;
  };

  const FreeLayoutMediaBox = ({ slideIndex, element }) => {
    const item = normalizeMediaItem(element.media);
    const bindingInfo = getMediaBindingInfo(item);
    const rootRef = useRef(null);
    const preferDraftPreview = IS_EDITOR_MODE && Boolean(item?.draftPreviewUrl);
    const hasUsableMedia = Boolean(item && (item.draftPreviewUrl || item.url || item.poster || item.delivery?.hlsUrl || item.delivery?.iframeUrl));
    const [isMuted, setIsMuted] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [isInViewport, setIsInViewport] = useState(false);
    const [isNearViewport, setIsNearViewport] = useState(false);
    const [isMediaLoading, setIsMediaLoading] = useState(Boolean(item));
    const [hasMediaError, setHasMediaError] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [mediaDuration, setMediaDuration] = useState("");
    const [currentTimeLabel, setCurrentTimeLabel] = useState("00:00");
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlaybackOverlay, setShowPlaybackOverlay] = useState(false);
    const [isDragTarget, setIsDragTarget] = useState(false);
    const videoRef = useRef(null);
    const overlayTimerRef = useRef(null);
    const playAttemptRef = useRef(null);
    const userPausedRef = useRef(false);
    const fileInputId = `free-upload-${slideIndex}-${element.id}`;
    const videoSource = item && item.kind === "video" ? getPrimaryMediaUrl(item, { preferDraftPreview }) : "";
    const directVideo = item && item.kind === "video" && isDirectVideoSource(videoSource);
    const inlinePreviewOwnerId = `free:${slideIndex}:${element.id}`;
    const shouldInlinePreviewPlay = directVideo && isInViewport && !showEditor && (prefersHoverControls ? isHovered : true);
    const mediaClassName = "relative z-10 h-full w-full object-cover object-center";

    const resetInlinePreview = (options = {}) => {
      const preserveOverlay = Boolean(options.preserveOverlay);
      userPausedRef.current = false;
      clearControlsTimer();
      if (!preserveOverlay) setShowPlaybackOverlay(false);
      setIsMuted(true);
      setIsPlaying(false);
      setCurrentTimeLabel("00:00");
      setPlaybackProgress(0);
      playAttemptRef.current = null;
      if (videoRef.current) stopInlineVideoPlayback(videoRef.current, { resetMuted: true, resetTime: true });
    };

    const stopOwnInlinePreview = (options = {}) => {
      clearActiveInlinePreview(inlinePreviewOwnerId);
      resetInlinePreview(options);
    };

    const clearControlsTimer = () => {
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };

    const scheduleControlsHide = () => {
      clearControlsTimer();
    };

    const revealControls = () => {
      if (showEditor) return;
      clearControlsTimer();
      setShowPlaybackOverlay(true);
    };

    const shouldPreferAudiblePreview = () => prefersHoverControls;

    const updatePlaybackState = (video) => {
      const safeCurrentTime = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
      const safeDuration = Number.isFinite(video?.duration) ? video.duration : 0;
      setCurrentTimeLabel(formatDuration(safeCurrentTime) || "00:00");
      setMediaDuration(formatDuration(safeDuration));
      setPlaybackProgress(safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0);
    };

    const retryOwnInlineAudio = () => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      void playInlineVideoAudible(video, setIsMuted);
    };

    const startInlinePreview = (options = {}) => {
      const forceDesktop = Boolean(options.forceDesktop);
      const video = videoRef.current;
      if (!video || !directVideo || showEditor || (!isInViewport && !forceDesktop)) return;
      if (prefersHoverControls && !forceDesktop && !isHovered) return;
      if (userPausedRef.current) return;
      if (playAttemptRef.current) return;
      if (!video.paused && video.readyState >= 2) {
        setShowPlaybackOverlay(true);
        return;
      }
      const preferAudible = shouldPreferAudiblePreview();
      activateInlinePreview(inlinePreviewOwnerId);
      setShowPlaybackOverlay(true);
      const playAttempt = attemptInlineVideoPlayback(video, { preferAudible, onMutedChange: setIsMuted }).finally(() => {
        if (playAttemptRef.current === playAttempt) {
          playAttemptRef.current = null;
        }
      });
      playAttemptRef.current = playAttempt;
    };

    const toggleInlinePlayback = (event) => {
      if (event) event.stopPropagation();
      const video = videoRef.current;
      if (!video) return;
      revealControls();
      if (video.paused) {
        userPausedRef.current = false;
        activateInlinePreview(inlinePreviewOwnerId);
        const playAttempt = attemptInlineVideoPlayback(video, { preferAudible: !isMuted, onMutedChange: setIsMuted }).finally(() => {
          if (playAttemptRef.current === playAttempt) {
            playAttemptRef.current = null;
          }
        });
        playAttemptRef.current = playAttempt;
      } else {
        userPausedRef.current = true;
        clearActiveInlinePreview(inlinePreviewOwnerId);
        stopInlineVideoPlayback(video);
      }
    };

    const toggleInlineMuted = (event) => {
      if (event) event.stopPropagation();
      const nextMuted = !isMuted;
      if (!nextMuted) markInlineAudioUnlocked();
      rememberInlineAudioPreference(nextMuted);
      if (videoRef.current) {
        setInlineVideoMutedState(videoRef.current, nextMuted, setIsMuted);
        if (!nextMuted) {
          activateInlinePreview(inlinePreviewOwnerId);
          retryOwnInlineAudio();
        }
      } else {
        setIsMuted(nextMuted);
      }
      revealControls();
    };

    const openInlineFullscreen = async (event) => {
      if (event) event.stopPropagation();
      revealControls(3200);
      clearActiveInlinePreview(inlinePreviewOwnerId);
      if (videoRef.current) stopInlineVideoPlayback(videoRef.current, { resetMuted: true, resetTime: true });
      openMediaLightbox(item, { requestFullscreen: true });
    };

    const handleMediaSurfaceClick = (event) => {
      event.stopPropagation();
      if (showEditor) return;
      if (directVideo) {
        revealControls(3200);
        return;
      }
      const sourceUrl = item && item.kind === "video" ? getSourceMediaUrl(item, { preferDraftPreview }) : "";
      const canOpenEmbeddedMedia = item && (item.kind === "youtube" || (item.kind === "video" && Boolean(getVideoEmbedUrl(sourceUrl))));
      if (!IS_EDITOR_MODE || canOpenEmbeddedMedia) {
        openMediaLightbox(item);
      }
    };

    const updateElementMedia = (updater) => {
      updateFreeLayoutElement(slideIndex, element.id, (current) => ({
        ...current,
        media: normalizeMediaItem(updater(normalizeMediaItem(current.media) || { kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" }))
      }));
    };

    const applyLocalFile = async (file) => {
      if (!file) return;
      if (IS_PORTFOLIO_ADMIN_MODE) {
        requestMediaReplacement(file, {
          type: "free-layout-media",
          slideId: slidesData[slideIndex]?.id,
          elementId: element.id,
          accept: getMediaAcceptFromKind(item?.kind),
          label: element.media?.label || `自由布局媒体 ${element.id}`
        });
        setIsDragTarget(false);
        setShowEditor(false);
        return;
      }
      const publishedPath = buildPublishedAssetPath(file);
      const nextKind = String(file.type || "").startsWith("video/") || publishedPath.startsWith("videos/") ? "video" : "image";
      const draftPreviewUrl = URL.createObjectURL(file);
      updateElementMedia((current) => ({
        ...current,
        kind: nextKind,
        url: publishedPath || "",
        poster: "",
        draftPreviewUrl,
        label: file.name
      }));
      setIsDragTarget(false);
      setShowEditor(false);
      setStatusMessage(publishedPath ? `已将 ${file.name} 绑定为 ${publishedPath}，并生成本地预览。` : `已将 ${file.name} 添加到自由布局媒体框作为本地预览。`);

      if (!IS_PORTFOLIO_ADMIN_MODE) return;
      try {
        const upload = await uploadPortfolioFile(file, { category: "portfolio-free-media", title: file.name });
        updateElementMedia((current) => ({
          ...current,
          kind: upload.kind === "video" ? "video" : "image",
          url: upload.src,
          poster: current.poster || "",
          draftPreviewUrl,
          label: upload.title || file.name
        }));
        setStatusMessage(`已上传并绑定媒体：${upload.src}。点击保存到代码仓库后部署生效。`);
      } catch (error) {
        setStatusMessage(error?.message || "媒体上传失败，本地预览仍可用。");
      }
    };

    useEffect(() => {
      if (!item) {
        setIsMediaLoading(false);
        setHasMediaError(false);
        setIsVideoReady(false);
        setMediaDuration("");
        setCurrentTimeLabel("00:00");
        setPlaybackProgress(0);
        setIsPlaying(false);
        setShowPlaybackOverlay(false);
        setIsMuted(true);
        userPausedRef.current = false;
        return;
      }
      const src = videoSource || getDisplayUrl(item, { preferDraftPreview });
      const directVideoItem = item.kind === "video" && isDirectVideoSource(src);
      const embeddable = item.kind === "youtube" || (item.kind === "video" && !!getVideoEmbedUrl(src));
      const externalLinkOnly = item.kind === "video" && !directVideoItem && !embeddable;
      const hasDeferredPoster = item.kind === "video" && directVideoItem && Boolean(item.poster) && !preferDraftPreview;
      setIsMediaLoading(!externalLinkOnly && !!src && !hasDeferredPoster);
      setHasMediaError(false);
      setIsVideoReady(false);
      setMediaDuration("");
      setCurrentTimeLabel("00:00");
      setPlaybackProgress(0);
      setIsPlaying(false);
      setShowPlaybackOverlay(false);
      setIsMuted(true);
      userPausedRef.current = false;
      clearControlsTimer();
      clearActiveInlinePreview(inlinePreviewOwnerId);
    }, [item, preferDraftPreview, videoSource]);

    useEffect(() => {
      if (!directVideo) return undefined;
      return registerInlinePreviewController(inlinePreviewOwnerId, {
        stop: () => {
          resetInlinePreview();
        },
        retryAudible: retryOwnInlineAudio
      });
    }, [directVideo, inlinePreviewOwnerId]);

    useEffect(() => {
      const node = rootRef.current;
      if (!node) return undefined;
      if (typeof IntersectionObserver === "undefined") {
        setIsNearViewport(true);
        setIsInViewport(true);
        return undefined;
      }
      const observer = new IntersectionObserver(([entry]) => {
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
        const nextNearViewport = Boolean(entry?.isIntersecting);
        const nextInViewport = Boolean(entry?.intersectionRatio > 0.08 && entry?.boundingClientRect?.bottom > 0 && entry?.boundingClientRect?.top < viewportHeight);
        setIsNearViewport(nextNearViewport);
        setIsInViewport(nextInViewport);
        if (!nextNearViewport) {
          setIsHovered(false);
        }
      }, {
        root: null,
        threshold: [0, 0.08, 0.22],
        rootMargin: "140% 0px 140% 0px"
      });
      observer.observe(node);
      return () => observer.disconnect();
    }, [element.id, slideIndex]);

    useEffect(() => {
      if (!directVideo || !videoSource || showEditor) return;
      const video = videoRef.current;
      if (!video) return;
      const nextPreload = shouldInlinePreviewPlay || isInViewport || isNearViewport ? "auto" : "metadata";
      video.preload = nextPreload;
      if (nextPreload === "auto") {
        ensureVideoPreloadHint(videoSource, "high");
      }
      if (nextPreload === "auto" && video.readyState < 1) {
        try {
          video.load();
        } catch (error) { reportIgnoredError(error); }
      }
    }, [directVideo, isInViewport, isNearViewport, shouldInlinePreviewPlay, showEditor, videoSource]);

    useEffect(() => {
      if (!directVideo) return undefined;
      if (!shouldInlinePreviewPlay) {
        stopOwnInlinePreview();
        return undefined;
      }
      if (!prefersHoverControls) startInlinePreview();
      return undefined;
    }, [directVideo, prefersHoverControls, shouldInlinePreviewPlay]);

    useEffect(() => () => {
      clearControlsTimer();
      clearActiveInlinePreview(inlinePreviewOwnerId);
    }, []);

    const handleDragEnter = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragTarget(true);
    };

    const handleDragOver = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setIsDragTarget(true);
    };

    const handleDragLeave = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.currentTarget.contains(event.relatedTarget)) setIsDragTarget(false);
    };

    const handleDrop = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) applyLocalFile(file);
      else setIsDragTarget(false);
    };

    return <div
        ref={rootRef}
        className="relative h-full w-full overflow-hidden rounded-[26px] border border-white/10 bg-black/25"
      onMouseEnter={() => {
          if (!prefersHoverControls) return;
          setIsHovered(true);
          setShowPlaybackOverlay(true);
          if (directVideo) startInlinePreview({ forceDesktop: true });
        }}
      onMouseLeave={() => {
        if (!prefersHoverControls) return;
        setIsHovered(false);
        setShowPlaybackOverlay(false);
        if (directVideo) stopOwnInlinePreview();
      }}
      onDoubleClick={(event) => { event.stopPropagation(); setShowEditor((value) => !value); }}
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="h-full w-full">
      {IS_EDITOR_MODE && isDragTarget && <div className="absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-cyan-300/70 bg-cyan-400/10 text-center text-xs tracking-[0.18em] text-cyan-100 backdrop-blur-sm pointer-events-none">拖到这里替换媒体</div>}
      {IS_EDITOR_MODE && bindingInfo && !showEditor && <div className={`absolute top-3 left-3 z-30 max-w-[70%] rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] backdrop-blur-md pointer-events-none ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/15 text-emerald-50" : "border-amber-300/20 bg-amber-500/15 text-amber-50"}`}>{bindingInfo.text}</div>}
      {IS_EDITOR_MODE && <div className="portfolio-media-tools absolute top-12 right-3 z-30 flex flex-wrap justify-end gap-1.5">
        <button onClick={(event) => { event.stopPropagation(); setShowEditor((value) => !value); }} className={`p-1.5 rounded-full text-white/80 transition-all ${showEditor ? "bg-cyan-500" : "bg-black/60 hover:bg-black/90"}`}><Icon name="Settings2" size={12} /></button>
        {hasUsableMedia && <button onClick={(event) => { event.stopPropagation(); openMediaLightbox(item); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white/80"><Icon name="Maximize2" size={12} /></button>}
        <button onClick={(event) => { event.stopPropagation(); document.getElementById(fileInputId).click(); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-yellow-300"><Icon name="UploadCloud" size={12} /></button>
      </div>}
      {IS_EDITOR_MODE && showEditor && <div className="portfolio-media-editor-panel absolute inset-0 z-40 p-4 bg-black/80 backdrop-blur-md flex flex-col gap-3 cursor-auto" onClick={(event) => event.stopPropagation()}>
        <div className="text-xs text-cyan-300 font-mono uppercase tracking-widest flex items-center gap-2"><Icon name="Link2" size={14} /> 自由布局媒体设置</div>
        {bindingInfo && <div className={`rounded-xl border px-3 py-2 text-xs leading-6 ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-50/90" : "border-amber-300/20 bg-amber-500/10 text-amber-50/90"}`}>
          <div className="font-medium">{bindingInfo.text}</div>
          <div className="text-white/70">{bindingInfo.detail}</div>
        </div>}
        <label className="text-xs text-white/60 flex flex-col gap-1">类型
          <select value={item?.kind || "image"} onChange={(event) => updateElementMedia((current) => ({ ...current, kind: event.target.value }))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="youtube">YouTube</option>
          </select>
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">本地文件
          <button type="button" onClick={() => document.getElementById(fileInputId).click()} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10 transition-colors">上传本地图片或视频，并尝试绑定到 images/ 或 videos/</button>
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">资源链接
          <input type="text" value={item?.url || ""} placeholder="例如 images/work-01.jpg、videos/demo.mp4、B站/抖音链接" onChange={(event) => updateElementMedia((current) => applyMediaFieldChange(current, "url", event.target.value))} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">补充说明
          <textarea value={item?.meta || ""} onChange={(event) => updateElementMedia((current) => ({ ...current, meta: event.target.value }))} className="w-full flex-1 min-h-[100px] bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 font-mono outline-none resize-none" />
        </label>
      </div>}
      {hasUsableMedia ? <>
        {directVideo && item?.poster && !showEditor && !shouldInlinePreviewPlay && <img src={item.poster} alt="" aria-hidden="true" className="pointer-events-none absolute inset-0 z-[11] h-full w-full object-cover object-center" />}
        <div className="relative z-10 flex h-full w-full items-center justify-center">
          <MediaView mediaItem={item} muted={isMuted} onMediaSurfaceClick={handleMediaSurfaceClick} videoRef={videoRef} mediaClassName={mediaClassName} videoPreloadMode={directVideo && (isNearViewport || shouldInlinePreviewPlay || isPlaying) ? "auto" : "metadata"} showNativeVideoControls={directVideo && !showEditor} audiblePreviewActive={directVideo && prefersHoverControls && isHovered && shouldInlinePreviewPlay} onMediaLoad={() => {
            setIsMediaLoading(false);
            if (directVideo) {
              setIsVideoReady(true);
              updatePlaybackState(videoRef.current);
            }
          }} onMediaError={() => {
            setIsMediaLoading(false);
            setHasMediaError(true);
            setIsVideoReady(false);
            playAttemptRef.current = null;
            }} onVideoMetadata={() => updatePlaybackState(videoRef.current)} onMediaMeasure={() => {}} onVideoPlay={() => {
              playAttemptRef.current = null;
              setIsPlaying(true);
              revealControls();
            }} onVideoPause={() => {
            playAttemptRef.current = null;
            setIsPlaying(false);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} onVideoTimeUpdate={(event) => {
            updatePlaybackState(event.currentTarget);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} stopClick={(event) => event.stopPropagation()} preferDraftPreview={preferDraftPreview} showPoster={!directVideo || !shouldInlinePreviewPlay || !isVideoReady} />
        </div>
        {isMediaLoading && <div className="absolute inset-0 z-20 animate-pulse bg-gradient-to-br from-white/8 via-white/4 to-transparent pointer-events-none" />}
        {hasMediaError && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 text-xs tracking-[0.2em] text-rose-100/80 uppercase pointer-events-none">资源加载失败</div>}
      </> : <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center text-white/35 text-sm">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5"><Icon name="UploadCloud" size={20} className="text-white/45" /></div>
        <div>拖入媒体，或点击右上角上传/填写链接</div>
        <div className="text-[11px] text-white/25">拖入本地文件后，会尝试绑定到 images/ 或 videos/ 同名路径</div>
      </div>}
      <input id={fileInputId} type="file" accept={getUploadAcceptAttr(getMediaAcceptFromKind(item?.kind))} className="hidden" onChange={(event) => {
        const file = event.target.files && event.target.files[0];
        if (file) applyLocalFile(file);
        event.target.value = "";
      }} />
      </div>
    </div>;
  };

  const FreeLayoutSlide = ({ slide, index }) => {
    const surfaceRef = useRef(null);
    const slideTheme = colorPalettes[index % colorPalettes.length] || colorPalettes[0];
    const elements = Array.isArray(slide.freeLayoutElements)
      ? slide.freeLayoutElements.map(normalizeFreeLayoutElement).sort((a, b) => a.z - b.z)
      : [];

    return <div className={`flex relative z-10 w-full max-w-[1920px] mx-auto flex-col ${isMobileFeedMode ? "gap-4 px-2 py-2" : "h-full p-10"}`}>
      <div className={`flex ${isMobileFeedMode ? "flex-col gap-2 px-2" : "justify-between items-end mb-4 px-4"}`}>
        <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl font-light tracking-wide text-white/90" />
        <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-sm tracking-widest uppercase font-mono ${slideTheme.text}`} />
      </div>
      <div ref={surfaceRef} className={`portfolio-free-surface relative overflow-hidden rounded-[32px] border border-white/10 bg-black/20 shadow-2xl backdrop-blur-2xl ${isMobileFeedMode ? "min-h-[70svh]" : "flex-1"}`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.06),transparent_60%)] pointer-events-none" />
        {elements.length ? elements.map((element) => <FreeLayoutElement key={element.id} slideIndex={index} element={element} containerRef={surfaceRef} />) : <div className="absolute inset-0 flex items-center justify-center text-sm tracking-[0.22em] text-white/35">点击底部 + 添加文本框或媒体框</div>}
      </div>
    </div>;
  };

  const MediaSlot = ({ slideIndex, slotIndex, label, forceContain = false, disableInlinePreview = false }) => {
    const slide = slidesData[slideIndex];
    const item = normalizeMediaItem(slide.media && slide.media[slotIndex]);
    const bindingInfo = getMediaBindingInfo(item);
    const rootRef = useRef(null);
    const preferDraftPreview = IS_EDITOR_MODE && Boolean(item?.draftPreviewUrl);
    const [isMuted, setIsMuted] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isDragTarget, setIsDragTarget] = useState(false);
    const [showEditor, setShowEditor] = useState(false);
    const [isInViewport, setIsInViewport] = useState(false);
    const [isNearViewport, setIsNearViewport] = useState(false);
    const [isMediaLoading, setIsMediaLoading] = useState(Boolean(item));
    const [hasMediaError, setHasMediaError] = useState(false);
    const [isVideoReady, setIsVideoReady] = useState(false);
    const [mediaDuration, setMediaDuration] = useState("");
    const [currentTimeLabel, setCurrentTimeLabel] = useState("00:00");
    const [playbackProgress, setPlaybackProgress] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [showPlaybackOverlay, setShowPlaybackOverlay] = useState(false);
    const videoRef = useRef(null);
    const overlayTimerRef = useRef(null);
    const playAttemptRef = useRef(null);
    const userPausedRef = useRef(false);
    const fileInputId = `upload-${slide.id}-${slotIndex}`;
    const videoSource = item && item.kind === "video" ? getPrimaryMediaUrl(item, { preferDraftPreview }) : "";
    const directVideo = item && item.kind === "video" && isDirectVideoSource(videoSource);
    const inlinePreviewOwnerId = `slot:${slideIndex}:${slotIndex}`;
    const shouldInlinePreviewPlay = !disableInlinePreview && directVideo && isInViewport && !showEditor && (prefersHoverControls ? isHovered : true);
    const shouldContainMedia = forceContain || slide?.id === 2 || slide?.title?.includes("个人简介");
    const mediaClassName = shouldContainMedia
      ? "relative z-10 max-h-full max-w-full h-auto w-auto object-contain object-center"
      : "relative z-10 h-full w-full object-cover object-center";

    const resetInlinePreview = (options = {}) => {
      const preserveOverlay = Boolean(options.preserveOverlay);
      userPausedRef.current = false;
      clearControlsTimer();
      if (!preserveOverlay) setShowPlaybackOverlay(false);
      setIsMuted(true);
      setIsPlaying(false);
      setCurrentTimeLabel("00:00");
      setPlaybackProgress(0);
      playAttemptRef.current = null;
      if (videoRef.current) stopInlineVideoPlayback(videoRef.current, { resetMuted: true, resetTime: true });
    };

    const stopOwnInlinePreview = (options = {}) => {
      clearActiveInlinePreview(inlinePreviewOwnerId);
      resetInlinePreview(options);
    };

    const clearControlsTimer = () => {
      if (overlayTimerRef.current) {
        window.clearTimeout(overlayTimerRef.current);
        overlayTimerRef.current = null;
      }
    };

    const scheduleControlsHide = () => {
      clearControlsTimer();
    };

    const revealControls = () => {
      if (showEditor) return;
      clearControlsTimer();
      setShowPlaybackOverlay(true);
    };

    const shouldPreferAudiblePreview = () => prefersHoverControls;

    const updatePlaybackState = (video) => {
      const safeCurrentTime = Number.isFinite(video?.currentTime) ? video.currentTime : 0;
      const safeDuration = Number.isFinite(video?.duration) ? video.duration : 0;
      setCurrentTimeLabel(formatDuration(safeCurrentTime) || "00:00");
      setMediaDuration(formatDuration(safeDuration));
      setPlaybackProgress(safeDuration > 0 ? (safeCurrentTime / safeDuration) * 100 : 0);
    };

    const retryOwnInlineAudio = () => {
      const video = videoRef.current;
      if (!video || video.paused) return;
      void playInlineVideoAudible(video, setIsMuted);
    };

    const startInlinePreview = (options = {}) => {
      const forceDesktop = Boolean(options.forceDesktop);
      const video = videoRef.current;
      if (!video || !directVideo || showEditor || (!isInViewport && !forceDesktop)) return;
      if (prefersHoverControls && !forceDesktop && !isHovered) return;
      if (userPausedRef.current) return;
      if (playAttemptRef.current) return;
      if (!video.paused && video.readyState >= 2) {
        setShowPlaybackOverlay(true);
        return;
      }
      const preferAudible = shouldPreferAudiblePreview();
      activateInlinePreview(inlinePreviewOwnerId);
      setShowPlaybackOverlay(true);
      const playAttempt = attemptInlineVideoPlayback(video, { preferAudible, onMutedChange: setIsMuted }).finally(() => {
        if (playAttemptRef.current === playAttempt) {
          playAttemptRef.current = null;
        }
      });
      playAttemptRef.current = playAttempt;
    };

    const toggleInlinePlayback = (event) => {
      if (event) event.stopPropagation();
      const video = videoRef.current;
      if (!video) return;
      revealControls();
      if (video.paused) {
        userPausedRef.current = false;
        activateInlinePreview(inlinePreviewOwnerId);
        const playAttempt = attemptInlineVideoPlayback(video, { preferAudible: !isMuted, onMutedChange: setIsMuted }).finally(() => {
          if (playAttemptRef.current === playAttempt) {
            playAttemptRef.current = null;
          }
        });
        playAttemptRef.current = playAttempt;
      } else {
        userPausedRef.current = true;
        clearActiveInlinePreview(inlinePreviewOwnerId);
        stopInlineVideoPlayback(video);
      }
    };

    const toggleInlineMuted = (event) => {
      if (event) event.stopPropagation();
      const nextMuted = !isMuted;
      if (!nextMuted) markInlineAudioUnlocked();
      rememberInlineAudioPreference(nextMuted);
      if (videoRef.current) {
        setInlineVideoMutedState(videoRef.current, nextMuted, setIsMuted);
        if (!nextMuted) {
          activateInlinePreview(inlinePreviewOwnerId);
          retryOwnInlineAudio();
        }
      } else {
        setIsMuted(nextMuted);
      }
      revealControls();
    };

    const openInlineFullscreen = async (event) => {
      if (event) event.stopPropagation();
      revealControls(3200);
      clearActiveInlinePreview(inlinePreviewOwnerId);
      if (videoRef.current) stopInlineVideoPlayback(videoRef.current, { resetMuted: true, resetTime: true });
      openMediaLightbox(item, { requestFullscreen: true });
    };

    const handleMediaSurfaceClick = (event) => {
      event.stopPropagation();
      if (showEditor) return;
      if (directVideo) {
        revealControls(3200);
        return;
      }
      const sourceUrl = item && item.kind === "video" ? getSourceMediaUrl(item, { preferDraftPreview }) : "";
      const canOpenEmbeddedMedia = item && (item.kind === "youtube" || (item.kind === "video" && Boolean(getVideoEmbedUrl(sourceUrl))));
      if (!IS_EDITOR_MODE || canOpenEmbeddedMedia) {
        openMediaLightbox(item);
      }
    };

    const changeField = (field, value) => updateMediaItem(slideIndex, slotIndex, (current) => applyMediaFieldChange(current, field, value));
    const openEmptyEditor = () => {
      if (!item) updateMediaItem(slideIndex, slotIndex, () => ({ kind: "image", url: "", poster: "", meta: "", draftPreviewUrl: "", label: "" }));
      setShowEditor(true);
    };

    const applyLocalFile = async (file) => {
      if (!file) return;
      if (IS_PORTFOLIO_ADMIN_MODE) {
        requestMediaReplacement(file, {
          type: "slide-media",
          slideId: slide.id,
          slotIndex,
          accept: getMediaAcceptFromKind(item?.kind),
          label: slide.title || label || `媒体 ${slotIndex + 1}`
        });
        setIsDragTarget(false);
        setShowEditor(false);
        return;
      }
      const publishedPath = buildPublishedAssetPath(file);
      const nextKind = String(file.type || "").startsWith("video/") || publishedPath.startsWith("videos/") ? "video" : "image";
      const draftPreviewUrl = URL.createObjectURL(file);
      updateMediaItem(slideIndex, slotIndex, (current) => ({
        ...current,
        kind: nextKind,
        url: publishedPath || "",
        poster: "",
        draftPreviewUrl,
        label: file.name
      }));
      setIsDragTarget(false);
      setShowEditor(false);
      setStatusMessage(publishedPath ? `已将 ${file.name} 绑定为 ${publishedPath}，导出后可直接发布。` : `已将 ${file.name} 添加到当前媒体框作为本地预览。发布前请把正式文件放进 images/ 或 videos/，再导出并运行一键发布。`);

      if (!IS_PORTFOLIO_ADMIN_MODE) return;
      try {
        const upload = await uploadPortfolioFile(file, { category: "portfolio-slide-media", title: file.name });
        updateMediaItem(slideIndex, slotIndex, (current) => ({
          ...current,
          kind: upload.kind === "video" ? "video" : "image",
          url: upload.src,
          poster: current.poster || "",
          draftPreviewUrl,
          label: upload.title || file.name
        }));
        setStatusMessage(`已上传并绑定媒体：${upload.src}。点击保存到代码仓库后部署生效。`);
      } catch (error) {
        setStatusMessage(error?.message || "媒体上传失败，本地预览仍可用。");
      }
    };

    const handleUpload = (event) => {
      const file = event.target.files && event.target.files[0];
      if (!file) return;
      applyLocalFile(file);
      event.target.value = "";
    };

    useEffect(() => {
      if (!item) {
        setIsMediaLoading(false);
        setHasMediaError(false);
        setIsVideoReady(false);
        setMediaDuration("");
        setCurrentTimeLabel("00:00");
        setPlaybackProgress(0);
        setIsPlaying(false);
        setShowPlaybackOverlay(false);
        setIsMuted(true);
        userPausedRef.current = false;
        return;
      }
      const src = videoSource || getDisplayUrl(item, { preferDraftPreview });
      const directVideoItem = item.kind === "video" && isDirectVideoSource(src);
      const embeddable = item.kind === "youtube" || (item.kind === "video" && !!getVideoEmbedUrl(src));
      const externalLinkOnly = item.kind === "video" && !directVideoItem && !embeddable;
      const hasDeferredPoster = item.kind === "video" && directVideoItem && Boolean(item.poster) && !preferDraftPreview;
      setIsMediaLoading(!externalLinkOnly && !!src && !hasDeferredPoster);
      setHasMediaError(false);
      setIsVideoReady(false);
      setMediaDuration("");
      setCurrentTimeLabel("00:00");
      setPlaybackProgress(0);
      setIsPlaying(false);
      setShowPlaybackOverlay(false);
      setIsMuted(true);
      userPausedRef.current = false;
      clearControlsTimer();
      clearActiveInlinePreview(inlinePreviewOwnerId);
    }, [item, preferDraftPreview, videoSource]);

    useEffect(() => {
      if (!directVideo) return undefined;
      return registerInlinePreviewController(inlinePreviewOwnerId, {
        stop: () => {
          resetInlinePreview();
        },
        retryAudible: retryOwnInlineAudio
      });
    }, [directVideo, inlinePreviewOwnerId]);

    useEffect(() => {
      const node = rootRef.current;
      if (!node) return undefined;
      if (typeof IntersectionObserver === "undefined") {
        setIsNearViewport(true);
        setIsInViewport(true);
        return undefined;
      }
      const observer = new IntersectionObserver(([entry]) => {
        const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 0;
        const nextNearViewport = Boolean(entry?.isIntersecting);
        const nextInViewport = Boolean(entry?.intersectionRatio > 0.08 && entry?.boundingClientRect?.bottom > 0 && entry?.boundingClientRect?.top < viewportHeight);
        setIsNearViewport(nextNearViewport);
        setIsInViewport(nextInViewport);
        if (!nextNearViewport) {
          setIsHovered(false);
        }
      }, {
        root: null,
        threshold: [0, 0.08, 0.22],
        rootMargin: "140% 0px 140% 0px"
      });
      observer.observe(node);
      return () => observer.disconnect();
    }, [slide.id, slotIndex]);

    useEffect(() => {
      if (!directVideo || !videoSource || showEditor) return;
      const video = videoRef.current;
      if (!video) return;
      const nextPreload = shouldInlinePreviewPlay || isInViewport || isNearViewport ? "auto" : "metadata";
      video.preload = nextPreload;
      if (nextPreload === "auto") {
        ensureVideoPreloadHint(videoSource, "high");
      }
      if (nextPreload === "auto" && video.readyState < 1) {
        try {
          video.load();
        } catch (error) { reportIgnoredError(error); }
      }
    }, [directVideo, isInViewport, isNearViewport, shouldInlinePreviewPlay, showEditor, videoSource]);

    useEffect(() => {
      if (!directVideo) return undefined;
      if (!shouldInlinePreviewPlay) {
        stopOwnInlinePreview();
        return undefined;
      }
      if (!prefersHoverControls) startInlinePreview();
      return undefined;
    }, [directVideo, prefersHoverControls, shouldInlinePreviewPlay]);

    useEffect(() => () => {
      clearControlsTimer();
      clearActiveInlinePreview(inlinePreviewOwnerId);
    }, []);

    const handleDragEnter = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      setIsDragTarget(true);
    };

    const handleDragOver = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = "copy";
      setIsDragTarget(true);
    };

    const handleDragLeave = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      if (!event.currentTarget.contains(event.relatedTarget)) setIsDragTarget(false);
    };

    const handleDrop = (event) => {
      if (!IS_EDITOR_MODE || !isFileDragEvent(event)) return;
      event.preventDefault();
      event.stopPropagation();
      const file = event.dataTransfer.files && event.dataTransfer.files[0];
      if (file) applyLocalFile(file);
      else setIsDragTarget(false);
    };

    return <div
      ref={rootRef}
        className={cx("portfolio-media-slot relative w-full h-full overflow-hidden rounded-[26px] border border-white/10 bg-black/25 group cursor-pointer", isMobilePortraitMode ? "min-h-[260px]" : isMobileLandscapeMode ? "min-h-[240px]" : "min-h-[320px]")}
      onMouseEnter={() => {
          if (!prefersHoverControls) return;
          setIsHovered(true);
          setShowPlaybackOverlay(true);
          if (directVideo) startInlinePreview({ forceDesktop: true });
        }}
      onMouseLeave={() => {
        if (!prefersHoverControls) return;
        setIsHovered(false);
        setShowPlaybackOverlay(false);
        if (directVideo) stopOwnInlinePreview();
      }}
      onDragEnterCapture={handleDragEnter}
      onDragOverCapture={handleDragOver}
      onDragLeaveCapture={handleDragLeave}
      onDropCapture={handleDrop}
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onDoubleClick={(event) => { if (!IS_EDITOR_MODE) return; event.stopPropagation(); openEmptyEditor(); }}
    >
      <div className="h-full w-full">
      {IS_EDITOR_MODE && isDragTarget && <div className="absolute inset-0 z-40 flex items-center justify-center border-2 border-dashed border-cyan-300/70 bg-cyan-400/10 text-center text-sm tracking-[0.18em] text-cyan-100 backdrop-blur-sm pointer-events-none">
        拖到这里即可替换当前媒体
      </div>}
      {IS_EDITOR_MODE && bindingInfo && !showEditor && <div className={`absolute top-2 left-2 z-50 max-w-[70%] rounded-full border px-3 py-1 text-[10px] tracking-[0.16em] backdrop-blur-md pointer-events-none ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/15 text-emerald-50" : "border-amber-300/20 bg-amber-500/15 text-amber-50"}`}>{bindingInfo.text}</div>}
      {IS_EDITOR_MODE && item && <div className={cx("portfolio-media-tools absolute top-2 right-2 z-50 transition-opacity duration-300 flex flex-wrap justify-end gap-1.5 w-3/4", prefersHoverControls ? "opacity-0 group-hover:opacity-100" : "opacity-100")}>
        {item.kind === "youtube" && item.url && <a href={`https://www.youtube.com/watch?v=${extractYouTubeId(item.url)}`} target="_blank" rel="noreferrer" onClick={(event) => event.stopPropagation()} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white/80"><Icon name="ExternalLink" size={12} /></a>}
        <button onClick={(event) => { event.stopPropagation(); setShowEditor(!showEditor); }} className={`p-1.5 rounded-full text-white/80 transition-all ${showEditor ? "bg-cyan-500" : "bg-black/60 hover:bg-black/90"}`}><Icon name="Settings2" size={12} /></button>
        <button onClick={(event) => { event.stopPropagation(); openMediaLightbox(item); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-white/80"><Icon name="Maximize2" size={12} /></button>
        <button onClick={(event) => { event.stopPropagation(); document.getElementById(fileInputId).click(); }} className="p-1.5 bg-black/60 hover:bg-black/90 rounded-full text-yellow-300"><Icon name="UploadCloud" size={12} /></button>
      </div>}
      {IS_EDITOR_MODE && item && showEditor && <div className="portfolio-media-editor-panel absolute inset-0 z-40 p-4 bg-black/80 backdrop-blur-md flex flex-col gap-3 cursor-auto" onClick={(event) => event.stopPropagation()}>
        <div className="text-xs text-cyan-300 font-mono uppercase tracking-widest flex items-center gap-2"><Icon name="Link2" size={14} /> 资源链接设置</div>
        {bindingInfo && <div className={`rounded-xl border px-3 py-2 text-xs leading-6 ${bindingInfo.state === "linked" ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-50/90" : "border-amber-300/20 bg-amber-500/10 text-amber-50/90"}`}>
          <div className="font-medium">{bindingInfo.text}</div>
          <div className="text-white/70">{bindingInfo.detail}</div>
        </div>}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <label className="text-xs text-white/60 flex flex-col gap-1">类型
            <select value={item.kind} onChange={(event) => changeField("kind", event.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none">
              <option value="image">图片 / 仓库图片</option>
              <option value="video">视频 / Cloudinary 或视频页链接</option>
              <option value="youtube">YouTube / 视频 ID 或链接</option>
            </select>
          </label>
          <label className="text-xs text-white/60 flex flex-col gap-1">本地文件
            <button type="button" onClick={() => document.getElementById(fileInputId).click()} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-left text-white/80 hover:bg-white/10 transition-colors">上传本地图片或视频，并尝试绑定到 images/ 或 videos/</button>
          </label>
        </div>
          <label className="text-xs text-white/60 flex flex-col gap-1">{item.kind === "youtube" ? "YouTube 视频 ID / 链接" : "稳定资源链接"}
          <input type="text" value={item.url} placeholder={item.kind === "youtube" ? "例如 dQw4w9WgXcQ 或 https://youtu.be/..." : "例如 images/work-01.jpg、videos/demo.mp4、B站链接、抖音 https://www.douyin.com/video/..."} onChange={(event) => changeField("url", event.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">封面链接（可选）
          <input type="text" value={item.poster || ""} placeholder="例如 images/video-cover.jpg" onChange={(event) => changeField("poster", event.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none" />
        </label>
        <label className="text-xs text-white/60 flex flex-col gap-1">生成说明 / 参数
          <textarea value={item.meta || ""} onChange={(event) => changeField("meta", event.target.value)} placeholder="记录提示词、工作流节点、镜头说明等" className="w-full flex-1 min-h-[100px] bg-white/5 border border-white/10 rounded-lg p-3 text-sm text-white/80 font-mono outline-none resize-none" />
        </label>
      </div>}
      {item ? <>
        {directVideo && item?.poster && !showEditor && !shouldInlinePreviewPlay && <img src={item.poster} alt="" aria-hidden="true" className={`pointer-events-none absolute inset-0 z-[11] ${shouldContainMedia ? "object-contain p-4" : "object-cover"} h-full w-full object-center`} />}
        <div className={`relative z-10 flex h-full w-full items-center justify-center ${shouldContainMedia ? "p-4" : ""}`}>
          <MediaView mediaItem={item} muted={isMuted} onMediaSurfaceClick={handleMediaSurfaceClick} videoRef={videoRef} mediaClassName={mediaClassName} videoPreloadMode={directVideo && (isNearViewport || shouldInlinePreviewPlay || isPlaying) ? "auto" : "metadata"} showNativeVideoControls={directVideo && !showEditor} audiblePreviewActive={directVideo && prefersHoverControls && isHovered && shouldInlinePreviewPlay} onMediaLoad={() => {
            setIsMediaLoading(false);
            if (directVideo) {
              setIsVideoReady(true);
              updatePlaybackState(videoRef.current);
            }
            }} onMediaError={() => {
              setIsMediaLoading(false);
              setHasMediaError(true);
              setIsVideoReady(false);
              playAttemptRef.current = null;
            }} onVideoMetadata={() => updatePlaybackState(videoRef.current)} onMediaMeasure={() => {}} onVideoPlay={() => {
              playAttemptRef.current = null;
              setIsPlaying(true);
              revealControls();
            }} onVideoPause={() => {
            playAttemptRef.current = null;
            setIsPlaying(false);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} onVideoTimeUpdate={(event) => {
            updatePlaybackState(event.currentTarget);
            if (!prefersHoverControls) scheduleControlsHide(2400);
          }} stopClick={(event) => event.stopPropagation()} preferDraftPreview={preferDraftPreview} showPoster={!directVideo || !shouldInlinePreviewPlay || !isVideoReady} />
        </div>
        {isMediaLoading && <div className="absolute inset-0 z-20 animate-pulse bg-gradient-to-br from-white/8 via-white/4 to-transparent pointer-events-none" />}
        {hasMediaError && <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 text-xs tracking-[0.2em] text-rose-100/80 uppercase pointer-events-none">资源加载失败</div>}
      </> : <div className="flex flex-col items-center justify-center p-2 text-center w-full h-full">
        <div className="w-10 h-10 rounded-full flex items-center justify-center mb-2 border border-white/5 group-hover:bg-white/10"><Icon name="UploadCloud" size={18} className="text-white/40" /></div>
        <span className="text-[10px] tracking-widest text-white/40 uppercase">{label || "Upload"}</span>
        <span className="mt-2 text-[11px] text-white/25">拖入本地文件后，会尝试绑定到 images/ 或 videos/ 同名路径</span>
        {IS_EDITOR_MODE && <div className="mt-3 flex gap-2">
          <button onClick={() => document.getElementById(fileInputId).click()} className="px-3 py-1.5 rounded-full bg-white/10 text-xs text-white/70 hover:bg-white/15">上传并绑定</button>
          <button onClick={openEmptyEditor} className="px-3 py-1.5 rounded-full bg-cyan-500/15 text-xs text-cyan-100 hover:bg-cyan-500/25">填写链接</button>
        </div>}
      </div>}
      {IS_EDITOR_MODE && <input id={fileInputId} type="file" accept={getUploadAcceptAttr(getMediaAcceptFromKind(item?.kind))} className="hidden" onChange={handleUpload} />}
      </div>
    </div>;
  };

  const renderPills = (items, options = {}) => {
    const values = ensureStringArray(items);
    if (!values.length) return null;
    return <div className={cx("portfolio-chip-list", options.compact && "portfolio-chip-list-compact", options.className)}>
      {values.map((item) => <span key={item} className="portfolio-chip">{item}</span>)}
    </div>;
  };

  const renderFitPoints = (points) => {
    const values = Array.isArray(points)
      ? points.map((point) => ({
        label: ensureString(point?.label),
        value: ensureString(point?.value)
      })).filter((point) => point.label || point.value)
      : [];
    if (!values.length) return null;
    return <div className="portfolio-fit-grid">
      {values.map((point, pointIndex) => <div key={`${point.label}-${pointIndex}`} className="portfolio-fit-item">
        {point.label && <span>{point.label}</span>}
        {point.value && <strong>{point.value}</strong>}
      </div>)}
    </div>;
  };

  const getChapterRange = (chapterIndex) => {
    const nextChapterIndex = slidesData.findIndex((candidate, candidateIndex) => candidateIndex > chapterIndex && candidate?.type === "chapter");
    return slidesData.slice(chapterIndex + 1, nextChapterIndex === -1 ? slidesData.length : nextChapterIndex)
      .filter((candidate) => candidate && candidate.type !== "cover" && candidate.type !== "toc");
  };

  const getChapterStats = (chapterIndex) => {
    const range = getChapterRange(chapterIndex);
    const mediaItems = range.flatMap((candidate) => Array.isArray(candidate.media) ? candidate.media : []);
    const videoCount = mediaItems.filter((item) => item?.kind === "video" || item?.kind === "youtube").length;
    return {
      pages: range.length,
      media: mediaItems.length,
      videos: videoCount
    };
  };

  const renderSlideInsight = (slide, options = {}) => {
    const tags = ensureStringArray(slide.toolchain || slide.capabilities || slide.roleTags);
    if (!slide.viewerNote && !slide.deliverable && !tags.length) return null;
    return <div className={cx("portfolio-slide-insight", options.compact && "portfolio-slide-insight-compact", options.className)}>
      {slide.viewerNote && <p className="portfolio-slide-note">{slide.viewerNote}</p>}
      <div className="portfolio-slide-meta">
        {slide.deliverable && <span className="portfolio-deliverable">{slide.deliverable}</span>}
        {renderPills(tags, { compact: true })}
      </div>
    </div>;
  };

  const isImageMedia = (item) => item?.kind === "image";
  const isVideoMedia = (item) => item?.kind === "video" || item?.kind === "youtube";
  const portraitMediaPatterns = [
    "a6537e213935b778ba57eade8bbf142a",
    "1774080806307",
    "51339bc463f2bb227aef56406ae9f0ac",
  ];

  const isLikelyPortraitMedia = (item) => {
    const value = `${item?.url || ""} ${item?.poster || ""}`;
    return portraitMediaPatterns.some((pattern) => value.includes(pattern));
  };

  const getSlideText = (slide) => ensureStringArray(slide?.textBlocks).join("\n");

  const normalizeResultItems = (value) => {
    const source = Array.isArray(value) ? value : Array.isArray(value?.resultItems) ? value.resultItems : value;
    if (Array.isArray(source)) {
      return source
        .map((entry) => ({
          label: ensureString(entry?.label),
          value: ensureString(entry?.value)
        }))
        .filter((entry) => entry.label || entry.value);
    }
    if (source && typeof source === "object") {
      return Object.entries(source)
        .map(([label, resultValue]) => ({
          label: ensureString(label),
          value: String(resultValue ?? "").trim()
        }))
        .filter((entry) => entry.label || entry.value);
    }
    return [];
  };

  const caseOrder = ["ai-short-video-campaign", "controlnet-ecommerce", "future-brand-visuals"];
  const getCaseById = (id) => casesData.find((caseItem) => caseItem?.id === id);
  const getSlidesForCase = (caseItem) => {
    const orderedIds = Array.isArray(caseItem?.slideIds) ? caseItem.slideIds : [];
    return orderedIds.map((id) => slidesData.find((slide) => slide?.id === id)).filter(Boolean);
  };
  const getSlideMediaItems = (slide) => [
    ...(Array.isArray(slide?.media) ? slide.media : []),
    ...(Array.isArray(slide?.freeLayoutElements) ? slide.freeLayoutElements.filter((element) => element?.type === "media").map((element) => element.media) : [])
  ].map(normalizeMediaItem).filter(Boolean);
  const getCaseMediaStats = (caseItem) => {
    const mediaItems = getSlidesForCase(caseItem).flatMap(getSlideMediaItems);
    return {
      images: mediaItems.filter(isImageMedia).length,
      videos: mediaItems.filter(isVideoMedia).length,
      total: mediaItems.length
    };
  };
  const getCaseForSlide = (slide) => caseOrder.map(getCaseById).find((caseItem) => Array.isArray(caseItem?.slideIds) && caseItem.slideIds.includes(slide?.id));

  const casePresentationDefinitions = [
    {
      id: "ai-short-video-campaign",
      direction: "AI 短视频、广告内容、社媒素材",
      responsibility: "创意方向、提示词设计、图像生成、视频生成、素材筛选与后期整理",
      ability: "展示视频生成、系列化内容制作和广告视觉方向控制能力。"
    },
    {
      id: "controlnet-ecommerce",
      direction: "电商产品图、结构控制、产品视觉优化",
      responsibility: "产品视觉风格设定、结构控制、图像生成、精修与统一输出",
      ability: "展示对商品结构、光影、质感和商业展示效果的控制能力。"
    },
    {
      id: "future-brand-visuals",
      direction: "品牌视觉、海报设计、概念视觉系统",
      responsibility: "风格设定、视觉关键词设计、主视觉生成、版式整理",
      ability: "展示 AIGC 辅助品牌视觉设计和统一视觉语言构建能力。"
    }
  ];

  const featuredCases = casePresentationDefinitions.map((definition) => ({
    ...definition,
    caseItem: getCaseById(definition.id)
  })).filter((item) => item.caseItem);

  const formatMediaStats = (stats) => {
    const parts = [];
    if (stats.videos) parts.push(`${stats.videos} 条视频素材`);
    if (stats.images) parts.push(`${stats.images} 张视觉图像`);
    return parts.length ? parts.join(" / ") : `${stats.total} 组视觉素材`;
  };

  const heroRoleTags = ["AI 视频生成", "商业视觉设计", "ComfyUI 工作流", "产品广告", "角色一致性", "场景概念"];
  const processSteps = [
    { title: "需求理解", description: "明确项目目标、使用场景、受众和画面比例。" },
    { title: "风格设定", description: "确定关键词、参考方向、色彩、构图和视觉气质。" },
    { title: "提示词与视觉控制", description: "通过提示词、参考图、结构控制等方式控制画面结果。" },
    { title: "生成与筛选", description: "批量生成不同版本，筛选出风格统一、完成度高的结果。" },
    { title: "后期修正", description: "使用设计和剪辑工具进行画面修正、排版、调色和视频整理。" },
    { title: "交付输出", description: "根据使用场景输出海报、产品图、短视频和社媒素材。" }
  ];
  const contactItems = [
    { label: "职业方向", value: "AIGC 视觉设计师 / AI 视频创作者 / ComfyUI 工作流设计" },
    { label: "邮箱", value: "2453193338@qq.com", href: "mailto:2453193338@qq.com" },
    { label: "所在地", value: "广东" },
    { label: "作品集", value: "www.zhangweivisual.cn", href: "https://www.zhangweivisual.cn/" }
  ];
  const capabilityHighlights = HOMEPAGE_CURATION.capabilityCards;

  const isWorkflowSlide = (slide) => slide?.type === "workflow-diagram";
  const isMediaCuratedHidden = (media) => normalizeMediaItem(media)?.curatedHidden === true;
  const homepageGalleryExcludedSources = [
    "images/uploads/2026/05/20260508T065718Z-10ab0bfabb84-ChatGPT-Image-2026-5-8-00_28_13-6",
    "images/works/monkey/poster",
    "images/works/cybercity/poster",
    "images/generated/celestial-whale-city",
    "images/works/portal/poster"
  ];
  const homepageGalleryExcludedSlots = new Set(["15:1", "24:0", "24:1", "24:3", "26:1"]);
  const normalizeCuratedSourceForCompare = (source) => String(source || "")
    .replace(/\\/g, "/")
    .replace("/images/_optimized/", "/images/")
    .replace(/\.(webp|png|jpe?g)$/i, "");
  const getMediaPreviewSource = (media) => {
    const normalized = normalizeMediaItem(media);
    return normalizeCuratedSourceForCompare(normalized?.poster || normalized?.draftPreviewUrl || normalized?.url || normalized?.fullUrl);
  };
  const homepageWorkflowKinds = new Set(["workflow", "moodboard", "case-board"]);
  const homepageWorkflowKeywords = [
    "workflow",
    "moodboard",
    "process",
    "storyboard",
    "comfyui",
    "node",
    "board",
    "流程",
    "节点",
    "分镜",
    "拼图",
    "看板",
    "工作流",
    "对照",
    "制作过程"
  ];
  const getHomepageWorkSourceText = (work, media = normalizeMediaItem(work?.media)) => [
    work?.id,
    work?.kind,
    work?.category,
    work?.label,
    work?.title,
    work?.description,
    ensureStringArray(work?.tags).join(" "),
    media?.url,
    media?.fullUrl,
    media?.poster,
    media?.alt
  ].join(" ").toLowerCase();
  const classifyHomepageWork = (value) => {
    const work = value?.curation || value || {};
    const media = normalizeMediaItem(value?.mediaEntry?.media || work.media);
    const sourceText = getHomepageWorkSourceText(work, media);
    const normalizedSource = [
      media?.url,
      media?.fullUrl,
      media?.poster
    ].join(" ").replace(/\\/g, "/").toLowerCase();
    const mediaIsVideo = media?.kind === "video" || media?.kind === "youtube";
    const hasVideoSignal = work.kind === "video" || mediaIsVideo || Boolean(work.duration && media?.url);
    const hasWorkflowSignal = homepageWorkflowKinds.has(work.kind) ||
      work.category === "workflow" ||
      normalizedSource.includes("/comfyui/") ||
      homepageWorkflowKeywords.some((keyword) => sourceText.includes(keyword));
    const isCompositeImage = !hasVideoSignal && hasWorkflowSignal;
    const kind = hasVideoSignal
      ? "video"
      : homepageWorkflowKinds.has(work.kind)
        ? work.kind
        : hasWorkflowSignal
          ? normalizedSource.includes("moodboard") || sourceText.includes("moodboard")
            ? "moodboard"
            : sourceText.includes("board") || sourceText.includes("看板") || sourceText.includes("分镜")
              ? "case-board"
              : "workflow"
          : media?.kind === "image"
            ? "image"
            : "unknown";
    const isSingleVisual = kind === "image" && !isCompositeImage;
    const hasVideoSource = hasVideoSignal && Boolean(media?.url || media?.delivery?.hlsUrl || media?.delivery?.iframeUrl);
    return {
      kind,
      isPlayableVideo: kind === "video" && hasVideoSource,
      needsVideoRecovery: kind === "video" && !hasVideoSource,
      isSingleVisual,
      isCompositeImage,
      canUseAsCover: (kind === "image" && isSingleVisual) || kind === "video",
      canUseInGallery: kind === "image" && isSingleVisual,
      canUseInHero: kind === "image" && isSingleVisual,
      canUseInCommercialCase: (kind === "image" && isSingleVisual) || kind === "video",
      canUseInWorkflow: homepageWorkflowKinds.has(kind) || isCompositeImage || work.category === "workflow",
      source: getMediaPreviewSource(media),
      hasCover: Boolean(media?.poster || media?.url || media?.fullUrl),
      hasVideoSource
    };
  };
  const reportHomepageCurationGuard = (level, message, payload) => {
    if (typeof window === "undefined") return;
    const logger = level === "error" ? console.error : console.warn;
    logger("[homepage-curation]", message, payload || "");
  };
  const getHomepageWork = (workId) => {
    const base = HOMEPAGE_CURATED_WORKS[workId];
    if (!base) return null;
    const override = getHomepageDesignerState().works?.[workId];
    if (!override || typeof override !== "object") return base;
    return {
      ...base,
      ...override,
      tags: override.tags !== undefined ? ensureStringArray(override.tags) : base.tags,
      detailRows: Array.isArray(override.detailRows) ? override.detailRows : base.detailRows,
      results: override.results || base.results,
      tools: override.tools || base.tools,
      media: normalizeMediaItem(override.media || base.media) || normalizeMediaItem(base.media)
    };
  };
  const getHomepageWorkCover = (work) => getDisplayUrl(work?.media) || work?.media?.url || work?.media?.poster || "";
  const getHomepageDetailValue = (work, label, fallback = "") => {
    const found = Array.isArray(work?.detailRows) ? work.detailRows.find((item) => item?.label === label) : null;
    return ensureString(found?.value, fallback);
  };
  const buildHomepageCuratedItem = (workId, section, index = 0) => {
    const work = getHomepageWork(workId);
    if (!work) return null;
    const media = normalizeMediaItem(work.media);
    if (!media) return null;
    const slide = {
      id: `homepage-${section}-${work.id}`,
      type: "homepage-curation",
      title: work.title,
      desc: work.description,
      viewerNote: work.description,
      deliverable: getHomepageDetailValue(work, "交付物", getHomepageDetailValue(work, "输出内容", work.label)),
      toolchain: work.tags,
      media: [media]
    };
    return {
      entry: {
        slide,
        slideIndex: -1,
        homepageSection: section,
        manualCuration: true
      },
      mediaEntry: { media, slotIndex: 0 },
      caseItem: null,
      category: work.category || "brand",
      curation: work,
      classification: classifyHomepageWork(work),
      homepageSection: section,
      homepageIndex: index
    };
  };
  const buildHomepageCuratedItems = (ids, section) => ids
    .map((workId, index) => buildHomepageCuratedItem(workId, section, index))
    .filter(Boolean);
  const getHomepageItemSource = (item) => getMediaPreviewSource(item?.mediaEntry?.media);
  const homepageCurationErrors = [];
  const homepageCurationWarnings = [];
  const pushHomepageCurationError = (message) => {
    homepageCurationErrors.push(message);
  };
  const pushHomepageCurationWarning = (message) => {
    homepageCurationWarnings.push(message);
  };
  const warnDuplicateHomepageItems = (items, sectionLabel) => {
    const seenIds = new Set();
    const seenSources = new Set();
    items.forEach((item) => {
      const id = item?.curation?.id;
      const source = getHomepageItemSource(item);
      if (id && seenIds.has(id)) pushHomepageCurationError(`${sectionLabel} 重复 workId: ${id}`);
      if (source && seenSources.has(source)) pushHomepageCurationError(`${sectionLabel} 重复封面: ${source}`);
      if (id) seenIds.add(id);
      if (source) seenSources.add(source);
    });
  };
  const heroVisualEntry = buildHomepageCuratedItem(HOMEPAGE_CURATION.hero.featuredId, "hero", 0);
  if (heroVisualEntry && !heroVisualEntry.classification?.canUseInHero) {
    pushHomepageCurationError(`Hero 使用了不可作为主视觉的素材: ${heroVisualEntry.curation.id}`);
  }
  const homepageVideoEntries = buildHomepageCuratedItems(HOMEPAGE_CURATION.videoFeaturedIds, "video-featured")
    .filter((item) => {
      if (item.classification?.kind === "video") {
        if (item.classification?.needsVideoRecovery) {
          pushHomepageCurationWarning(`视频精选保留恢复中视频: ${item.curation.id}`);
        }
        return true;
      }
      pushHomepageCurationError(`视频精选自动移除非视频素材: ${item.curation.id}`);
      return false;
    });
  if (homepageVideoEntries.length < 3) {
    pushHomepageCurationError(`视频精选少于 3 个: ${homepageVideoEntries.length}`);
  }
  const homepageCommercialCaseIds = [
    ...ensureStringArray(HOMEPAGE_CURATION.commercialImageCaseIds),
    ...ensureStringArray(HOMEPAGE_CURATION.commercialVideoCaseIds)
  ];
  const buildHomepageCommercialCase = (workId, index) => {
    const item = buildHomepageCuratedItem(workId, "commercial-case", index);
    const work = item?.curation;
    if (!item || !work) return null;
    const isExpectedVideoCase = HOMEPAGE_CURATION.commercialVideoCaseIds.includes(workId);
    if (isExpectedVideoCase && item.classification?.kind !== "video") {
      pushHomepageCurationError(`商业视频案例不是视频素材: ${workId}`);
      return null;
    }
    if (isExpectedVideoCase && item.classification?.needsVideoRecovery) {
      pushHomepageCurationWarning(`商业视频案例保留恢复中视频: ${workId}`);
    }
    if (!isExpectedVideoCase && !item.classification?.canUseInCommercialCase) {
      pushHomepageCurationError(`商业案例使用了无效封面素材: ${workId}`);
      return null;
    }
    return {
      id: work.id,
      direction: getHomepageDetailValue(work, "项目类型", work.label),
      responsibility: getHomepageDetailValue(work, "我的职责", ""),
      ability: getHomepageDetailValue(work, "商业价值", work.description),
      output: getHomepageDetailValue(work, "交付物", ""),
      curation: work,
      curatedItem: item,
      caseItem: {
        id: work.id,
        title: work.title,
        cover: getHomepageWorkCover(work),
        category: getHomepageDetailValue(work, "项目类型", work.label),
        tags: work.tags || [],
        description: work.description,
        results: work.results || [],
        tools: work.tools || [],
        slideIds: []
      }
    };
  };
  const homepageCommercialCases = homepageCommercialCaseIds
    .map(buildHomepageCommercialCase)
    .filter(Boolean);
  const homepageCapabilityCards = HOMEPAGE_CURATION.capabilityCards
    .map((card, index) => ({
      ...card,
      previewItem: buildHomepageCuratedItem(card.workId, "capability", index)
    }))
    .filter((card) => card.previewItem);
  const homepagePrimaryEntries = [
    heroVisualEntry,
    ...homepageVideoEntries,
    ...homepageCommercialCases.map((item) => item.curatedItem),
    ...homepageCapabilityCards.map((item) => item.previewItem)
  ].filter(Boolean);
  warnDuplicateHomepageItems(homepagePrimaryEntries, "首页主模块");
  const homepagePrimarySources = new Set(homepagePrimaryEntries.map(getHomepageItemSource).filter(Boolean));
  const homepageGallerySeenIds = new Set();
  const homepageGallerySeenSources = new Set();
  const homepageGalleryEntries = HOMEPAGE_CURATION.visualGalleryIds
    .map((workId, index) => buildHomepageCuratedItem(workId, "gallery", index))
    .filter((item) => {
      const id = item?.curation?.id;
      const source = getHomepageItemSource(item);
      if (!id || !source) return false;
      if (!item.classification?.canUseInGallery) {
        pushHomepageCurationError(`Gallery 自动移除非单张视觉作品: ${id}`);
        return false;
      }
      if (homepageGallerySeenIds.has(id)) {
        pushHomepageCurationError(`Gallery 自动移除重复 workId: ${id}`);
        return false;
      }
      if (homepageGallerySeenSources.has(source)) {
        pushHomepageCurationError(`Gallery 自动移除重复封面: ${source}`);
        return false;
      }
      if (homepagePrimarySources.has(source)) {
        pushHomepageCurationWarning(`Gallery 自动移除主模块已使用封面: ${source}`);
        return false;
      }
      homepageGallerySeenIds.add(id);
      homepageGallerySeenSources.add(source);
      return true;
    });
  const homepageWorkflowEvidenceEntries = buildHomepageCuratedItems(HOMEPAGE_CURATION.workflowEvidenceIds, "workflow-evidence")
    .filter((item) => {
      if (item.classification?.canUseInWorkflow) return true;
      pushHomepageCurationError(`工作流证明使用了非流程素材: ${item.curation.id}`);
      return false;
    });
  const homepageWorkflowLabCards = [
    {
      key: "input-reference",
      label: "INPUT",
      title: "输入图 / 参考素材",
      description: "用产品结构、风格参考和商业目标锁定画面方向，避免生成结果失焦。",
      item: buildHomepageCuratedItem("case-product-ad", "workflow-lab", 0),
      tags: ["Reference", "ControlNet", "Brief"]
    },
    {
      key: "node-flow",
      label: "COMFYUI",
      title: "节点流程 / 批量控制",
      description: "把结构控制、批量出图、局部重绘和后期筛选拆成可复用链路。",
      nodes: ["Input", "ControlNet", "Batch", "Inpaint", "Output"],
      tags: ["Node Flow", "Inpaint", "Batch"]
    },
    {
      key: "output-result",
      label: "OUTPUT",
      title: "输出结果 / 精修交付",
      description: "将可用版本收敛为电商主图、广告关键帧或可继续剪辑的视频素材。",
      item: buildHomepageCuratedItem("capability-ad-keyframe", "workflow-lab", 2),
      tags: ["Retouch", "Delivery", "Gallery Ready"]
    }
  ].filter((card) => card.nodes || card.item);
  if (typeof window !== "undefined" && (homepageCurationErrors.length || homepageCurationWarnings.length) && window.__ZHANGWEI_HOMEPAGE_CURATION_WARNED__ !== APP_BUNDLE_VERSION) {
    if (homepageCurationErrors.length) console.error("[homepage-curation]", homepageCurationErrors);
    if (homepageCurationWarnings.length) console.warn("[homepage-curation]", homepageCurationWarnings);
    window.__ZHANGWEI_HOMEPAGE_CURATION_WARNED__ = APP_BUNDLE_VERSION;
  }
  const isHomepageGalleryEligible = (item) => {
    if (homepageGalleryExcludedSlots.has(`${item.entry.slide.id}:${item.mediaEntry.slotIndex}`)) return false;
    const previewSource = getMediaPreviewSource(item.mediaEntry.media);
    return previewSource && !homepageGalleryExcludedSources.some((source) => previewSource.includes(source));
  };
  const getMediaEntriesBySlide = (predicate, options = {}) => slidesData
    .map((slide, slideIndex) => ({ slide, slideIndex }))
    .filter(({ slide }) => slide?.id !== 2 && (options.includeWorkflow || !isWorkflowSlide(slide)))
    .map(({ slide, slideIndex }) => ({
      slide,
      slideIndex,
      mediaItems: (Array.isArray(slide?.media) ? slide.media : [])
        .map((media, slotIndex) => ({ media, slotIndex }))
        .filter(({ media }) => predicate(normalizeMediaItem(media)))
    }))
    .filter((entry) => entry.slide && entry.mediaItems.length);

  const sortEntriesBySlideId = (entries, order) => {
    const rank = new Map(order.map((id, index) => [id, index]));
    return [...entries].sort((a, b) => (rank.get(a.slide.id) ?? 999) - (rank.get(b.slide.id) ?? 999));
  };

  const imageEntries = sortEntriesBySlideId(getMediaEntriesBySlide(isImageMedia), [8, 9, 11, 14, 15, 26, 5, 24]);
  const videoEntries = sortEntriesBySlideId(getMediaEntriesBySlide(isVideoMedia), [17, 18, 23, 20, 21, 12, 27]);
  const workflowEntries = slidesData
    .map((slide, slideIndex) => ({ slide, slideIndex }))
    .filter(({ slide }) => isWorkflowSlide(slide))
    .flatMap((entry) => (Array.isArray(entry.slide.media) ? entry.slide.media : []).map((media, slotIndex) => ({
      entry,
      mediaEntry: { media, slotIndex },
      category: "workflow"
    })));
  const chapterSlides = slidesData.filter((slide) => slide?.type === "chapter");
  const contactSlide = slidesData.find((slide) => slide?.id === 30);
  const homepageStaticVisualCount = [
    heroVisualEntry,
    ...homepageCommercialCases.map((item) => item.curatedItem),
    ...homepageCapabilityCards.map((item) => item.previewItem),
    ...homepageGalleryEntries
  ].filter(Boolean).length;
  const curatedStats = [
    { label: "AI 视频", value: `${homepageVideoEntries.length} 条` },
    { label: "商业视觉", value: `${homepageStaticVisualCount} 张` },
    { label: "能力方向", value: "4 类" }
  ];
  const capabilityMatrixItems = [
    { title: "产品广告视觉", description: "卖点表达、材质塑造、光影控制、商业构图。" },
    { title: "美妆产品视觉", description: "肤质细节、产品质感、色彩统一、海报氛围。" },
    { title: "角色与人像视觉", description: "角色一致性、面部控制、服装造型、批量延展。" },
    { title: "场景概念设计", description: "世界观设定、环境氛围、空间透视、镜头感构图。" },
    { title: "产品动态视频", description: "分镜规划、运镜设计、动态控制、成片输出。" },
    { title: "品牌视觉延展", description: "KV 主视觉、社媒物料、包装展示、系列化输出。" }
  ];
  const capabilityProcessFlow = "需求拆解 → 参考收集 → Prompt 设计 → 工作流搭建 → 批量生成 → 局部优化 → 视频输出 → 商业交付";
  const caseToolValues = [...new Set(homepageCommercialCases.flatMap(({ caseItem }) => ensureStringArray(caseItem?.tools)))];
  const pickTools = (...keywords) => caseToolValues.filter((tool) => keywords.some((keyword) => tool.includes(keyword)));
  const skillGroups = [
    {
      title: "图像生成与控制",
      items: pickTools("ComfyUI", "ControlNet", "Midjourney"),
      description: "围绕商品结构、品牌视觉和画面一致性做生成与控制。"
    },
    {
      title: "视频生成与剪辑",
      items: pickTools("Sora", "Kling", "剪映", "Cloudflare"),
      description: "结合视频生成、剪辑整理和短视频节奏输出可展示的动态素材。"
    },
    {
      title: "设计与后期",
      items: pickTools("Photoshop", "版式", "剪映"),
      description: "用后期修正、版式整理和剪辑流程提升生成结果的可交付程度。"
    },
    {
      title: "创意能力",
      items: ["短视频分镜", "品牌视觉识别", "电商主图", "结构控制", "图像后期"],
      description: "关注生成结果是否能服务于岗位中的商业视觉、短视频和内容资产需求。"
    }
  ].map((group) => ({ ...group, items: ensureStringArray(group.items) }));

  const visualEntries = [...imageEntries, ...videoEntries]
    .flatMap((entry) => entry.mediaItems.map((mediaEntry) => {
      const caseItem = getCaseForSlide(entry.slide);
      const category = caseItem?.id === "ai-short-video-campaign" || isVideoMedia(normalizeMediaItem(mediaEntry.media))
        ? "short-video"
        : caseItem?.id === "controlnet-ecommerce"
          ? "product"
          : caseItem?.id === "future-brand-visuals"
            ? "brand"
            : "experiment";
      return {
        entry,
        mediaEntry,
        caseItem,
        category
      };
    }))
    .sort((left, right) => {
      const leftRank = caseOrder.indexOf(left.caseItem?.id);
      const rightRank = caseOrder.indexOf(right.caseItem?.id);
      return (leftRank < 0 ? 99 : leftRank) - (rightRank < 0 ? 99 : rightRank) || (left.entry.slide.id ?? 999) - (right.entry.slide.id ?? 999);
    });
  const curatedGalleryMaxCount = 24;
  const videoWorks = videoEntries
    .flatMap((entry) => entry.mediaItems.map((mediaEntry) => ({
      entry,
      mediaEntry,
      caseItem: getCaseForSlide(entry.slide)
    })));
  const visibleVisualEntriesForDisplay = visualEntries.filter((item) => !isMediaCuratedHidden(item.mediaEntry.media));
  const eligibleVisualEntriesForDisplay = visibleVisualEntriesForDisplay.filter(isHomepageGalleryEligible);
  const visibleVideoEntriesForDisplay = videoWorks.filter((item) => !isMediaCuratedHidden(item.mediaEntry.media));
  const visibleWorkflowEntriesForDisplay = homepageWorkflowEvidenceEntries;

  const visualFilters = [
    { id: "all", label: "全部" },
    { id: "product", label: "产品广告" },
    { id: "portrait", label: "人像角色" },
    { id: "world", label: "场景世界观" },
    { id: "brand", label: "品牌延展" }
  ];
  const displayVisualEntries = visualFilter === "all" ? homepageGalleryEntries : homepageGalleryEntries.filter((item) => item.category === visualFilter);
  const filteredVisualEntries = displayVisualEntries;
  const homepageEntryCards = [
    {
      key: "video-entry",
      target: "videos",
      eyebrow: "VIDEO",
      title: "AI 视频作品",
      description: "食品广告、产品展示、场景短片等生成式视频精选。",
      item: homepageVideoEntries[0]
    },
    {
      key: "case-entry",
      target: "cases",
      eyebrow: "CASE",
      title: "商业视觉案例",
      description: "产品 KV、电商海报、包装视觉与品牌物料展示。",
      item: homepageCommercialCases[0]?.curatedItem
    },
    {
      key: "capability-entry",
      target: "capabilities",
      eyebrow: "SKILL",
      title: "能力矩阵",
      description: "拆解产品、角色、场景、视频与工作流等核心能力。",
      item: homepageCapabilityCards[0]?.previewItem
    },
    {
      key: "gallery-entry",
      target: "gallery",
      eyebrow: "VISUAL",
      title: "视觉精选",
      description: `${homepageGalleryEntries.length} 张单图作品，按产品、人像、场景和品牌方向归类。`,
      item: homepageGalleryEntries[0]
    },
    {
      key: "workflow-entry",
      target: "process",
      eyebrow: "WORKFLOW",
      title: "ComfyUI 工作流",
      description: "展示节点搭建、角色一致性、局部重绘与视频流程实践。",
      item: homepageWorkflowEvidenceEntries[0]
    }
  ].filter((card) => card.item && card.key !== "gallery-entry");

  const renderCuratedLayoutStyles = () => null;

  const renderCuratedEyebrow = (index, label) => <div className="curated-section-eyebrow">
    <span>{String(index).padStart(2, "0")}</span>
    <strong>{label}</strong>
  </div>;

  const openWorkDetail = (item) => setSelectedWorkItem(item);
  const openWorkDetailFromKeyboard = (event, item) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    openWorkDetail(item);
  };

  const renderHomepageEntryCard = (card, index) => {
    const detail = card.item ? buildHomepageCuratedDetail(card.item, index) : null;
    return <article
      key={card.key}
      className="curated-entry-card"
      role="button"
      tabIndex={0}
      onClick={() => scrollToCuratedSection(card.target)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        scrollToCuratedSection(card.target);
      }}
    >
      {card.item && renderCuratedMediaBox(card.item.entry, card.item.mediaEntry, {
        compact: true,
        disableInlinePreview: true,
        label: card.title,
        variant: card.item.classification?.kind === "video" ? "video" : card.item.classification?.canUseInWorkflow ? "workflow" : "gallery",
        workId: card.item.curation?.id
      })}
      <span>{card.eyebrow}</span>
      <strong>{card.title}</strong>
      <p>{card.description || detail?.description}</p>
    </article>;
  };

  const buildDetailPageShowcaseDetail = (item, index) => ({
    id: item.id,
    kind: "image",
    label: `${item.label} · ${item.category}`,
    title: item.title,
    description: item.description,
    cover: item.image,
    tags: ensureStringArray(item.tags),
    detailRows: [
      { label: "展示类型", value: item.category },
      { label: "页面编号", value: `${String(index + 1).padStart(2, "0")} / ${String(DETAIL_PAGE_SHOWCASE_ITEMS.length).padStart(2, "0")}` },
      { label: "能力重点", value: "详情页版式、卖点拆解、产品一致性与参数组织" }
    ]
  });

  const renderDetailPageShowcase = (items, section) => {
    const showcaseItems = (Array.isArray(items) ? items : []).filter((item) => item?.image);
    if (!showcaseItems.length) return null;
    const normalizedIndex = ((activeDetailPageIndex % showcaseItems.length) + showcaseItems.length) % showcaseItems.length;
    const activeItem = showcaseItems[normalizedIndex];
    const activeDetail = buildDetailPageShowcaseDetail(activeItem, normalizedIndex);
    const selectItem = (index) => setActiveDetailPageIndex(((index % showcaseItems.length) + showcaseItems.length) % showcaseItems.length);
    const moveItem = (offset) => selectItem(normalizedIndex + offset);

    return <div className="curated-detail-page-showcase" data-detail-page-count={showcaseItems.length}>
      <div className="curated-detail-page-tabs" role="tablist" aria-label="选择详情图">
        {showcaseItems.map((item, index) => {
          const isActive = index === normalizedIndex;
          return <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={isActive ? "is-active" : ""}
            onClick={() => selectItem(index)}
          >
            <img src={item.image} alt="" loading="eager" decoding="async" />
            <span>{item.label}</span>
            <strong>{item.shortTitle}</strong>
            <em>{item.category}</em>
          </button>;
        })}
      </div>
      <article className="curated-detail-page-reader" data-detail-page-active={activeItem.id}>
        <div className="curated-detail-page-media">
          <img src={activeItem.image} alt={activeItem.title} loading="eager" decoding="async" />
        </div>
        <div className="curated-detail-page-copy" {...getDesignerSectionProps("details", "详情图展示")}>
          <span>{activeItem.category}</span>
          <h3>{activeItem.title}</h3>
          <p>{activeItem.description || section.description}</p>
          <div className="curated-detail-page-meta">
            <span>{activeItem.label}</span>
            <span>{String(normalizedIndex + 1).padStart(2, "0")} / {String(showcaseItems.length).padStart(2, "0")}</span>
          </div>
          <div className="curated-detail-page-actions">
            <button type="button" onClick={() => moveItem(-1)} aria-label="上一张详情图"><Icon name="ChevronLeft" size={15} />上一张</button>
            <button type="button" onClick={() => openWorkDetail(activeDetail)}>查看大图</button>
            <button type="button" onClick={() => moveItem(1)} aria-label="下一张详情图">下一张<Icon name="ChevronRight" size={15} /></button>
          </div>
          <div className="curated-detail-page-thumbs" aria-label="详情图缩略图">
            {showcaseItems.map((item, index) => <button
              key={item.id + "-thumb"}
              type="button"
              className={index === normalizedIndex ? "is-active" : ""}
              onClick={() => selectItem(index)}
              title={item.title}
            >
              <img src={item.image} alt="" loading="eager" decoding="async" />
            </button>)}
          </div>
        </div>
      </article>
    </div>;
  };

  const selectDesignerNode = (nodeId, status = "已选中可编辑元素。") => {
    if (!IS_PORTFOLIO_ADMIN_MODE) return false;
    setSelectedDesignerId(nodeId);
    setStatusMessage(status);
    return true;
  };

  const selectDesignerWork = (workId, label = "作品元素") => {
    if (!workId) return false;
    return selectDesignerNode(`work:${workId}`, `已选中「${label}」，可在右侧修改文字、素材和显示状态。`);
  };

  const selectDesignerSection = (sectionId, label = "页面模块") => {
    if (!sectionId) return false;
    return selectDesignerNode(`section:${sectionId}`, `已选中「${label}」模块，可在右侧修改标题和说明。`);
  };

  const getDesignerWorkProps = (workId, label) => {
    if (!IS_PORTFOLIO_ADMIN_MODE || !workId) return {};
    const nodeId = `work:${workId}`;
    const stylePreset = getHomepageDesignerState().works?.[workId]?.stylePreset;
    return {
      "data-designer-node": nodeId,
      "data-designer-selected": selectedDesignerId === nodeId ? "true" : undefined,
      "data-designer-style": stylePreset && stylePreset !== "default" ? stylePreset : undefined,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectDesignerWork(workId, label);
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        selectDesignerWork(workId, label);
      }
    };
  };

  const getDesignerSectionProps = (sectionId, label = "页面模块") => {
    if (!IS_PORTFOLIO_ADMIN_MODE || !sectionId) return {};
    const nodeId = `section:${sectionId}`;
    const stylePreset = getHomepageDesignerState().sections?.[sectionId]?.stylePreset;
    return {
      "data-designer-node": nodeId,
      "data-designer-selected": selectedDesignerId === nodeId ? "true" : undefined,
      "data-designer-style": stylePreset && stylePreset !== "default" ? stylePreset : undefined,
      tabIndex: 0,
      onClick: (event) => {
        event.preventDefault();
        event.stopPropagation();
        selectDesignerSection(sectionId, label);
      },
      onKeyDown: (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        event.stopPropagation();
        selectDesignerSection(sectionId, label);
      }
    };
  };

  const getDesignerSection = (sectionId, fallback = {}) => {
    const section = getHomepageDesignerState().sections?.[sectionId];
    return { ...fallback, ...(section && typeof section === "object" ? section : {}) };
  };

  const renderCuratedMediaBox = (entry, mediaEntry, options = {}) => {
    const { media, slotIndex } = mediaEntry;
    const normalizedMedia = normalizeMediaItem(media);
    const isManualEntry = entry?.manualCuration === true;
    const portrait = isLikelyPortraitMedia(media);
    const isVideoCard = normalizedMedia?.kind === "video" || normalizedMedia?.kind === "youtube";
    const displayUrl = getDisplayUrl(normalizedMedia);
    const videoSourceUrl = isVideoCard ? getSourceMediaUrl(normalizedMedia) : "";
    const hasVideoSource = isVideoCard && Boolean(videoSourceUrl || normalizedMedia?.delivery?.hlsUrl || normalizedMedia?.delivery?.iframeUrl);
    const showVideoRecovery = isVideoCard && !hasVideoSource;
    const videoDuration = options.duration || normalizedMedia?.duration || "";
    const label = normalizedMedia?.alt || options.label || "素材 " + String(slotIndex + 1).padStart(2, "0");
    const designerWorkId = options.workId || "";
    const canEditMedia = !isManualEntry || Boolean(designerWorkId);
    const replaceTarget = isManualEntry ? {
      type: "homepage-work",
      workId: designerWorkId,
      label,
      accept: options.accept || getMediaAcceptFromKind(normalizedMedia?.kind)
    } : {
      type: "slide-media",
      slideId: entry.slide.id,
      slotIndex,
      label,
      accept: options.accept || getMediaAcceptFromKind(normalizedMedia?.kind)
    };
    const replaceTargetKey = getCuratedDropTargetKey(replaceTarget);
    const uploadInputId = `curated-upload-${entry.slide.id}-${slotIndex}`;
    return <div
      key={options.key || entry.slide.id + "-" + slotIndex}
      className={cx(
        "curated-media-box",
        options.large && "curated-media-box-large",
        options.compact && "curated-media-box-compact",
        options.variant && `curated-media-box-${options.variant}`,
        portrait && "curated-media-box-portrait",
        IS_PORTFOLIO_ADMIN_MODE && canEditMedia && "curated-admin-drop-target",
        activeCuratedDropTarget === replaceTargetKey && "is-drag-active"
      )}
      {...(canEditMedia ? getCuratedDropHandlers(replaceTarget) : {})}
      data-media-card="true"
      data-media-kind={isVideoCard ? "video" : "image"}
      data-media-source={displayUrl}
      data-media-count="1"
      data-video-state={showVideoRecovery ? "recovering" : isVideoCard ? "ready" : undefined}
    >
      {displayUrl ? <img
        src={displayUrl}
        alt={label}
        loading={options.eager || isManualEntry ? "eager" : "lazy"}
        decoding={options.eager || isManualEntry ? "sync" : "async"}
        fetchPriority={options.eager || isManualEntry ? "high" : "auto"}
        className={cx("curated-static-media", portrait && "curated-static-media-contain")}
      /> : <div className="curated-static-fallback">
        <Icon name={isVideoCard ? "Play" : "Grid"} size={22} />
        <span>{showVideoRecovery ? "视频资源恢复中" : isVideoCard ? "视频封面生成中" : "视觉素材"}</span>
      </div>}
      {isVideoCard && <span className="curated-video-badge">VIDEO</span>}
      {isVideoCard && videoDuration && <span className="curated-video-duration">{videoDuration}</span>}
      {showVideoRecovery ? <div className="curated-media-recovery" aria-hidden="true">
        <Icon name="Play" size={14} />
        <span>视频资源恢复中</span>
      </div> : isVideoCard && <div className="curated-media-play curated-media-play-center" aria-hidden="true">
        <Icon name="Play" size={20} />
      </div>}
      {IS_PORTFOLIO_ADMIN_MODE && canEditMedia && <div className="curated-admin-media-tools">
        <button type="button" disabled={!canListAssets || isCapabilitiesLoading} title={canListAssets ? "素材库" : assetCapabilityReason} onClick={(event) => { event.stopPropagation(); openAssetManager(replaceTarget); }}><Icon name="Grid" size={14} /> 素材库</button>
        <button type="button" disabled={!canWriteAssets || isApplyingAsset} title={canWriteAssets ? "上传并替换" : assetCapabilityReason} onClick={(event) => { event.stopPropagation(); document.getElementById(uploadInputId).click(); }}><Icon name="UploadCloud" size={14} /> 替换</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); requestExternalVideoReplacement(replaceTarget, normalizedMedia); }}><Icon name="Link2" size={14} /> 外链</button>
      </div>}
      {IS_PORTFOLIO_ADMIN_MODE && canEditMedia && <input id={uploadInputId} type="file" accept={getUploadAcceptAttr(replaceTarget.accept)} className="hidden" onChange={(event) => {
        const file = event.target.files && event.target.files[0];
        if (file) requestMediaReplacement(file, replaceTarget);
        event.target.value = "";
      }} />}
    </div>;
  };

  const buildHomepageCuratedDetail = (item, index) => {
    const work = item?.curation || {};
    const media = normalizeMediaItem(item?.mediaEntry?.media);
    const fallbackKind = isVideoMedia(media) ? "video" : "image";
    const baseRows = Array.isArray(work.detailRows) ? work.detailRows : [
      { label: "作品类型", value: work.label || "首页精选" },
      { label: "输出内容", value: work.description || "商业视觉素材" }
    ];
    const detailRows = work.duration && !baseRows.some((row) => row?.label === "时长")
      ? [{ label: "时长", value: work.duration }, ...baseRows]
      : baseRows;
    return {
      id: "homepage-curated-" + (work.id || index),
      kind: work.kind || fallbackKind,
      label: work.label || "首页精选",
      title: work.title || "AIGC 视觉作品",
      description: work.description || "",
      tags: ensureStringArray(work.tags).slice(0, 5),
      duration: work.duration || "",
      entry: item.entry,
      mediaEntry: item.mediaEntry,
      caseItem: item.caseItem || null,
      cover: getHomepageWorkCover(work),
      curation: work,
      detailRows
    };
  };

  const buildVisualWorkDetail = (item, index) => {
    if (item?.curation) return buildHomepageCuratedDetail(item, index);
    const { entry, mediaEntry, caseItem } = item;
    const normalizedMedia = normalizeMediaItem(mediaEntry.media);
    const categoryLabel = visualFilters.find((filter) => filter.id === item.category)?.label || "视觉作品";
    const tags = ensureStringArray(caseItem?.tags || entry.slide.roleTags || entry.slide.toolchain).slice(0, 5);
    return {
      id: "visual-" + entry.slide.id + "-" + mediaEntry.slotIndex + "-" + index,
      kind: normalizedMedia?.kind === "video" ? "video" : "image",
      label: categoryLabel,
      title: entry.slide.title || caseItem?.title || "AIGC 视觉作品",
      description: entry.slide.viewerNote || getSlideText(entry.slide) || entry.slide.desc || caseItem?.description || "",
      tags,
      entry,
      mediaEntry,
      caseItem,
      detailRows: [
        { label: "作品类型", value: categoryLabel },
        { label: "输出内容", value: entry.slide.deliverable || caseItem?.category || "视觉素材" },
        { label: "所属案例", value: caseItem?.title || "独立视觉探索" }
      ]
    };
  };

  const buildVideoWorkDetail = (item, index) => {
    if (item?.curation) return buildHomepageCuratedDetail(item, index);
    const { entry, mediaEntry, caseItem } = item;
    const presentation = featuredCases.find((candidate) => candidate.caseItem.id === caseItem?.id);
    return {
      id: "video-" + entry.slide.id + "-" + mediaEntry.slotIndex + "-" + index,
      kind: "video",
      label: "视频作品 " + String(index + 1).padStart(2, "0"),
      title: entry.slide.title || caseItem?.title || "AI 视频作品",
      description: entry.slide.viewerNote || getSlideText(entry.slide) || caseItem?.description || "展示视频生成、素材整理和短视频内容输出能力。",
      tags: ensureStringArray(entry.slide.toolchain || caseItem?.tools || caseItem?.tags).slice(0, 5),
      entry,
      mediaEntry,
      caseItem,
      detailRows: [
        { label: "项目类型", value: presentation?.direction || caseItem?.category || "AI 视频素材" },
        { label: "我的职责", value: presentation?.responsibility || "生成、筛选与后期整理" },
        { label: "输出内容", value: entry.slide.deliverable || "短视频素材" }
      ]
    };
  };

  const buildCaseWorkDetail = (service, index) => {
    const { caseItem } = service;
    if (service?.curation) {
      const classification = service.curatedItem?.classification || classifyHomepageWork(service.curation);
      const isVideoCase = classification.kind === "video";
      return {
        id: "case-" + caseItem.id + "-" + index,
        kind: isVideoCase ? "video" : "case",
        label: service.curation.label || "项目案例 " + String(index + 1).padStart(2, "0"),
        title: caseItem.title,
        description: caseItem.description || service.ability,
        tags: ensureStringArray(caseItem.tags || caseItem.tools).slice(0, 6),
        duration: service.curation.duration || "",
        entry: service.curatedItem?.entry,
        mediaEntry: service.curatedItem?.mediaEntry,
        cover: caseItem.cover,
        caseItem,
        curation: service.curation,
        detailRows: Array.isArray(service.curation.detailRows) ? service.curation.detailRows : [
          { label: "项目方向", value: service.direction },
          { label: "我的职责", value: service.responsibility },
          { label: "能力体现", value: service.ability }
        ]
      };
    }
    const stats = getCaseMediaStats(caseItem);
    return {
      id: "case-" + caseItem.id + "-" + index,
      kind: "case",
      label: "项目案例 " + String(index + 1).padStart(2, "0"),
      title: caseItem.title,
      description: caseItem.description || service.ability,
      tags: ensureStringArray(caseItem.tags || caseItem.tools).slice(0, 6),
      cover: caseItem.cover,
      caseItem,
      detailRows: [
        { label: "项目方向", value: service.direction },
        { label: "我的职责", value: service.responsibility },
        { label: "输出内容", value: formatMediaStats(stats) },
        { label: "能力体现", value: service.ability }
      ]
    };
  };

  const buildWorkflowWorkDetail = (item, index) => {
    const media = normalizeMediaItem(item.mediaEntry.media) || {};
    const steps = Array.isArray(media.workflowSteps) ? media.workflowSteps : [];
    const title = media.label || item.entry.slide.title || "ComfyUI 工作流";
    return {
      id: "workflow-" + item.entry.slide.id + "-" + item.mediaEntry.slotIndex + "-" + index,
      kind: "workflow",
      label: "ComfyUI 工作流 " + String(index + 1).padStart(2, "0"),
      title,
      description: media.meta || item.entry.slide.desc || "展示 ComfyUI 节点流程、控制能力和最终输出方式。",
      tags: ["ComfyUI", "节点流程", media.curatedCategory || "workflow"].filter(Boolean),
      entry: item.entry,
      mediaEntry: item.mediaEntry,
      workflowSteps: steps,
      detailRows: [
        { label: "流程路径", value: steps.join(" -> ") || "输入素材 -> 节点处理 -> 结果输出" },
        { label: "能力体现", value: media.workflowAbility || "节点编排、条件控制与画面修正。" },
        { label: "最终用途", value: media.workflowOutcome || "可交付的图像处理或生成结果。" }
      ]
    };
  };
  const buildWorkflowEvidenceDetail = (item, index) => {
    if (item?.curation) {
      const detail = buildHomepageCuratedDetail(item, index);
      const rows = Array.isArray(detail.detailRows) ? detail.detailRows : [];
      return {
        ...detail,
        kind: item.classification?.kind || detail.kind || "workflow",
        workflowSteps: rows.slice(0, 5).map((row) => `${row.label}: ${row.value}`)
      };
    }
    return buildWorkflowWorkDetail(item, index);
  };

  const renderCaseResultItems = (caseItem) => {
    const results = normalizeResultItems(caseItem?.results).slice(0, 3);
    if (!results.length) return null;
    return <div className="curated-result-grid">
      {results.map((item) => <div key={caseItem.id + "-" + item.label}>
        <span>{item.label}</span>
        <strong>{item.value}</strong>
      </div>)}
    </div>;
  };

  const renderSkillGroupCard = (group) => <article key={group.title} className="curated-skill-card">
    <h3>{group.title}</h3>
    <p>{group.description}</p>
    <div>
      {group.items.map((item) => <span key={group.title + "-" + item}>{item}</span>)}
    </div>
  </article>;

  const renderCapabilityCard = (item, index) => {
    const relatedEntry = item.previewItem || buildHomepageCuratedItem(item.workId, "capability", index);
    const preview = relatedEntry ? buildVisualWorkDetail(relatedEntry, index) : null;
    const displayTitle = preview?.title || item.title;
    const displayDescription = preview?.description || item.description;
    const displayTags = preview?.tags?.length ? preview.tags : item.tags;
    return <article key={item.title} className="curated-capability-card" data-curation-section="capability" data-curation-id={preview?.curation?.id || item.workId} data-curation-category={preview?.curation?.category || ""} data-curation-kind={preview?.kind || ""} tabIndex={preview ? 0 : -1} onClick={() => preview && openWorkDetail(preview)} onKeyDown={(event) => preview && openWorkDetailFromKeyboard(event, preview)} {...getDesignerWorkProps(preview?.curation?.id || item.workId, preview?.title || item.title)}>
      {preview ? renderCuratedMediaBox(preview.entry, preview.mediaEntry, { compact: true, disableInlinePreview: true, label: preview.title, key: item.title, variant: "capability", workId: preview.curation?.id }) : <div className="curated-capability-placeholder"><Icon name="Sparkles" size={22} /></div>}
      <div className="curated-capability-copy">
        <span>{String(index + 1).padStart(2, "0")}</span>
        <h3>{displayTitle}</h3>
        <p>{displayDescription}</p>
        <div className="curated-card-tags">
          {displayTags.map((tag) => <span key={item.title + "-" + tag}>{tag}</span>)}
        </div>
      </div>
    </article>;
  };

  const renderVideoWorkCard = (item, index) => {
    const classification = item?.classification || classifyHomepageWork(item);
    if (!classification?.isPlayableVideo) {
      reportHomepageCurationGuard("error", "VideoWorkCard received non-video work", item?.curation || item);
      return null;
    }
    const detail = buildVideoWorkDetail(item, index);
    return <article key={detail.id} className="curated-video-card" data-curation-section="video-featured" data-curation-id={detail.curation?.id || detail.id} data-curation-category={detail.curation?.category || ""} data-curation-kind={detail.kind} tabIndex={0} onClick={() => openWorkDetail(detail)} onKeyDown={(event) => openWorkDetailFromKeyboard(event, detail)} {...getDesignerWorkProps(detail.curation?.id, detail.title)}>
      {renderCuratedMediaBox(item.entry, item.mediaEntry, { compact: true, disableInlinePreview: true, label: detail.title, duration: detail.duration, variant: "video", workId: detail.curation?.id })}
      <div className="curated-video-copy">
        <span>{detail.label}</span>
        <h3>{detail.title}</h3>
        <p>{detail.description}</p>
        <div className="curated-card-tags">
          <span>视频</span>
          {detail.duration && <span>{detail.duration}</span>}
          <span>可播放</span>
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); openWorkDetail(detail); }}>查看详情</button>
      </div>
    </article>;
  };

  const getFeaturedVideoPlaybackState = (id) => featuredVideoPlayback.id === id
    ? featuredVideoPlayback
    : { id, status: "poster", hasPlayed: false };

  const updateFeaturedVideoPlayback = (id, patch = {}) => {
    setFeaturedVideoPlayback((current) => {
      const isSameVideo = current.id === id;
      return {
        id,
        status: patch.status || (isSameVideo ? current.status : "poster"),
        hasPlayed: patch.hasPlayed ?? (isSameVideo ? current.hasPlayed : false)
      };
    });
  };

  const resetFeaturedVideoPlayback = (id = "") => {
    if (featuredVideoRef.current) {
      stopInlineVideoPlayback(featuredVideoRef.current, { resetTime: true });
    }
    setFeaturedVideoPlayback({ id, status: "poster", hasPlayed: false });
  };

  const playFeaturedVideo = (event, id) => {
    if (event) event.stopPropagation();
    const video = featuredVideoRef.current;
    if (!video) return;
    updateFeaturedVideoPlayback(id, { status: "loading" });
    video.preload = "auto";
    if (video.readyState < 2 && !isManagedHlsVideo(video)) {
      try {
        video.load();
      } catch (error) { reportIgnoredError(error); }
    }
    video.play().then(() => {
      updateFeaturedVideoPlayback(id, { status: "playing", hasPlayed: true });
    }).catch(() => {
      updateFeaturedVideoPlayback(id, { status: "error", hasPlayed: false });
    });
  };

  const handleFeaturedVideoSurfaceClick = (event, id) => {
    event.stopPropagation();
    const video = featuredVideoRef.current;
    if (video && video.paused) playFeaturedVideo(event, id);
  };

  const renderFeaturedInlineVideoPlayer = (item, detail) => {
    const media = normalizeMediaItem(item?.mediaEntry?.media);
    const posterUrl = getDisplayUrl(media);
    const sourceUrl = getSourceMediaUrl(media);
    const playbackUrl = getPrimaryMediaUrl(media);
    const streamPlayerUrl = getLightboxVideoPlayerUrl(media);
    const embedUrl = getVideoEmbedUrl(sourceUrl);
    const isBilibiliEmbed = isBilibiliVideoUrl(sourceUrl) || isBilibiliVideoUrl(embedUrl);
    const playbackState = getFeaturedVideoPlaybackState(detail.id);
    const hasDirectPlayback = isDirectVideoSource(playbackUrl) || isDirectVideoSource(sourceUrl);
    const playerState = playbackState.status || "poster";
    const showPlayButton = hasDirectPlayback && !playbackState.hasPlayed && playerState !== "error";

    if (streamPlayerUrl) {
      return <div className="curated-video-inline-player" data-video-inline-player="true" data-video-inline-state="ready">
        {posterUrl && <img className="curated-video-inline-poster-preload" src={posterUrl} alt="" aria-hidden="true" loading="eager" decoding="sync" fetchPriority="high" />}
        <iframe
          src={`${streamPlayerUrl}?autoplay=false`}
          title={detail.title}
          className="curated-video-inline-frame"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <span className="curated-video-badge">VIDEO</span>
        {detail.duration && <span className="curated-video-duration">{detail.duration}</span>}
      </div>;
    }

    if (embedUrl && !isBilibiliEmbed && !hasDirectPlayback) {
      return <div className="curated-video-inline-player" data-video-inline-player="true" data-video-inline-state="ready">
        {posterUrl && <img className="curated-video-inline-poster-preload" src={posterUrl} alt="" aria-hidden="true" loading="eager" decoding="sync" fetchPriority="high" />}
        <iframe
          src={withEmbedPlaybackParams(embedUrl, false)}
          title={detail.title}
          className="curated-video-inline-frame"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
        <span className="curated-video-badge">VIDEO</span>
        {detail.duration && <span className="curated-video-duration">{detail.duration}</span>}
      </div>;
    }

    if (!hasDirectPlayback) {
      return <div className="curated-video-inline-player curated-video-inline-fallback" data-video-inline-player="true" data-video-inline-state="error">
        {posterUrl && <img src={posterUrl} alt="" aria-hidden="true" loading="eager" decoding="sync" fetchPriority="high" />}
        <span className="curated-video-badge">VIDEO</span>
        {detail.duration && <span className="curated-video-duration">{detail.duration}</span>}
        <div>
          <Icon name="Play" size={18} />
          <span>视频资源恢复中</span>
          {(sourceUrl || playbackUrl) && <a href={sourceUrl || playbackUrl} target="_blank" rel="noreferrer">打开视频链接</a>}
        </div>
      </div>;
    }

    return <div className="curated-video-inline-player" data-video-inline-player="true" data-video-inline-state={playerState} data-video-inline-played={playbackState.hasPlayed ? "true" : "false"}>
      {posterUrl && <img className="curated-video-inline-poster-preload" src={posterUrl} alt="" aria-hidden="true" loading="eager" decoding="sync" fetchPriority="high" />}
      <StreamVideoElement
        playbackUrl={playbackUrl || sourceUrl}
        sourceUrl={sourceUrl}
        videoRef={featuredVideoRef}
        mediaClassName="curated-video-inline-video"
        muted={false}
        showNativeVideoControls
        videoPreloadMode="metadata"
        poster={posterUrl || undefined}
        onMediaLoad={() => setFeaturedVideoPlayback((current) => current.id === detail.id && current.hasPlayed
          ? current
          : { id: detail.id, status: "ready", hasPlayed: false })}
        onMediaError={() => updateFeaturedVideoPlayback(detail.id, { status: "error", hasPlayed: false })}
        onVideoPlay={() => updateFeaturedVideoPlayback(detail.id, { status: "playing", hasPlayed: true })}
        onVideoPause={(event) => updateFeaturedVideoPlayback(detail.id, {
          status: event.currentTarget.currentTime > 0 ? "paused" : "ready",
          hasPlayed: event.currentTarget.currentTime > 0
        })}
        handleSurfaceClick={(event) => handleFeaturedVideoSurfaceClick(event, detail.id)}
        loop={false}
      />
      <span className="curated-video-badge">VIDEO</span>
      {detail.duration && <span className="curated-video-duration">{detail.duration}</span>}
      {showPlayButton && <button type="button" className="curated-video-inline-play" onClick={(event) => playFeaturedVideo(event, detail.id)} aria-label={`播放视频：${detail.title}`}>
        <Icon name="Play" size={22} />
        <span>{playerState === "loading" ? "加载中" : "播放"}</span>
      </button>}
      {playerState === "error" && <div className="curated-video-inline-error">
        <Icon name="Play" size={16} />
        <span>视频暂时无法播放，已保留封面</span>
      </div>}
    </div>;
  };

  const renderVideoSelectorPreview = (item, detail, options = {}) => {
    const media = normalizeMediaItem(item?.mediaEntry?.media);
    const previewSource = getDisplayUrl(media);
    const label = detail?.title || media?.alt || "视频预览";
    return <div className={cx("curated-video-selector-preview", options.compact && "is-compact")}>
      {previewSource ? <img src={previewSource} alt={label} loading={options.eager ? "eager" : "lazy"} decoding={options.eager ? "sync" : "async"} fetchPriority={options.eager ? "high" : "auto"} /> : <div className="curated-static-fallback">
        <Icon name="Play" size={18} />
        <span>视频预览</span>
      </div>}
      <span className="curated-video-badge">VIDEO</span>
      {detail?.duration && <span className="curated-video-duration">{detail.duration}</span>}
    </div>;
  };

  const renderVideoWheelSelector = (items) => {
    const videoItems = items.filter((item) => {
      const classification = item?.classification || classifyHomepageWork(item);
      if (classification?.isPlayableVideo) return true;
      reportHomepageCurationGuard("error", "VideoWheelSelector received non-video work", item?.curation || item);
      return false;
    });
    const itemCount = videoItems.length;
    if (!itemCount) return null;
    const normalizedActiveIndex = ((activeVideoIndex % itemCount) + itemCount) % itemCount;
    const details = videoItems.map((item, index) => buildVideoWorkDetail(item, index));
    const activeItem = videoItems[normalizedActiveIndex];
    const activeDetail = details[normalizedActiveIndex];
    const selectVideoIndex = (index) => {
      const nextIndex = ((index % itemCount) + itemCount) % itemCount;
      if (nextIndex !== normalizedActiveIndex) {
        resetFeaturedVideoPlayback(details[nextIndex]?.id || "");
      }
      setActiveVideoIndex(nextIndex);
    };
    const moveVideoIndex = (offset) => selectVideoIndex(normalizedActiveIndex + offset);
    const getWheelOffset = (index) => {
      let offset = index - normalizedActiveIndex;
      if (offset > itemCount / 2) offset -= itemCount;
      if (offset < -itemCount / 2) offset += itemCount;
      return offset;
    };
    const handleWheelCardKeyDown = (event, index) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectVideoIndex(index);
      } else if (event.key === "ArrowRight" || event.key === "ArrowDown") {
        event.preventDefault();
        moveVideoIndex(1);
      } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
        event.preventDefault();
        moveVideoIndex(-1);
      }
    };

    return <div className="curated-video-wheel" data-video-count={itemCount}>
      <article
        key={activeDetail.id}
        className="curated-video-feature"
        data-curation-section="video-featured"
        data-curation-id={activeDetail.curation?.id || activeDetail.id}
        data-curation-category={activeDetail.curation?.category || ""}
        data-curation-kind={activeDetail.kind}
        {...getDesignerWorkProps(activeDetail.curation?.id, activeDetail.title)}
      >
        {renderFeaturedInlineVideoPlayer(activeItem, activeDetail)}
        <div className="curated-video-copy curated-video-feature-copy">
          <span>{activeDetail.label}</span>
          <h3>{activeDetail.title}</h3>
          <p>{activeDetail.description}</p>
          <div className="curated-card-tags">
            {(activeDetail.tags.length ? activeDetail.tags.slice(0, 4) : ["AI 视频", "商业短片", "可播放"]).map((tag) => <span key={activeDetail.id + "-" + tag}>{tag}</span>)}
          </div>
          <button type="button" onClick={(event) => { event.stopPropagation(); openWorkDetail(activeDetail); }}>查看详情</button>
        </div>
      </article>
      <div className="curated-video-wheel-panel" aria-label="视频选择器">
        <div className="curated-video-wheel-controls">
          <button type="button" onClick={() => moveVideoIndex(-1)} aria-label="上一个视频"><Icon name="ChevronLeft" size={15} />上一个</button>
          <strong>{String(normalizedActiveIndex + 1).padStart(2, "0")} / {String(itemCount).padStart(2, "0")}</strong>
          <button type="button" onClick={() => moveVideoIndex(1)} aria-label="下一个视频">下一个<Icon name="ChevronRight" size={15} /></button>
        </div>
        <div className="curated-video-stage" aria-label="3D 视频滚轮">
          {videoItems.map((item, index) => {
            const detail = details[index];
            const offset = getWheelOffset(index);
            const distance = Math.abs(offset);
            const isActive = index === normalizedActiveIndex;
            const isDistant = distance > 3;
            const style = {
              "--video-wheel-x": `${offset * 60}px`,
              "--video-wheel-z": `${-distance * 62}px`,
              "--video-wheel-rotate": `${offset * -14}deg`,
              "--video-wheel-scale": Math.max(0.68, 1 - distance * 0.08),
              "--video-wheel-opacity": isDistant ? 0 : Math.max(0.28, 1 - distance * 0.18),
              "--video-wheel-layer": String(20 - distance)
            };
            return <article
              key={detail.id}
              className={cx("curated-video-wheel-card", isActive && "is-active", isDistant && "is-distant")}
              style={style}
              tabIndex={isDistant ? -1 : 0}
              aria-hidden={isDistant ? "true" : undefined}
              aria-label={`选择视频：${detail.title}`}
              onClick={() => selectVideoIndex(index)}
              onKeyDown={(event) => handleWheelCardKeyDown(event, index)}
            >
              {renderVideoSelectorPreview(item, detail)}
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{detail.title}</strong>
            </article>;
          })}
        </div>
      </div>
      <div className="curated-video-strip" role="listbox" aria-label="选择视频">
        {videoItems.map((item, index) => {
          const detail = details[index];
          const isActive = index === normalizedActiveIndex;
          return <button
            key={detail.id}
            type="button"
            role="option"
            aria-selected={isActive}
            aria-label={`选择视频：${detail.title}`}
            title={detail.title}
            className={isActive ? "is-active" : ""}
            onClick={() => selectVideoIndex(index)}
          >
            {renderVideoSelectorPreview(item, detail, { compact: true })}
            <span>{String(index + 1).padStart(2, "0")}</span>
          </button>;
        })}
      </div>
    </div>;
  };

  const renderFeaturedCaseCard = (service, index) => {
    const { caseItem } = service;
    const caseClassification = service.curatedItem?.classification || classifyHomepageWork(service.curation);
    const caseSlides = getSlidesForCase(caseItem);
    const stats = getCaseMediaStats(caseItem);
    const detail = buildCaseWorkDetail(service, index);
    const coverTarget = { type: "case-cover", caseId: caseItem.id, label: `${caseItem.title} 封面`, accept: "image" };
    const coverTargetKey = getCuratedDropTargetKey(coverTarget);
    const coverInputId = `curated-case-cover-${caseItem.id}`;
    return <article key={caseItem.id} id={"case-" + caseItem.id} className="curated-case-card" data-curation-section="commercial-case" data-curation-id={caseItem.id} data-curation-category={service.curation?.category || caseItem.category} data-curation-kind={caseClassification.kind === "video" ? "video" : "case"} tabIndex={0} onClick={() => openWorkDetail(detail)} onKeyDown={(event) => openWorkDetailFromKeyboard(event, detail)} {...getDesignerWorkProps(service.curation?.id || caseItem.id, caseItem.title)}>
      <div
        className={cx(
          "curated-case-cover",
          IS_PORTFOLIO_ADMIN_MODE && "curated-admin-drop-target",
          activeCuratedDropTarget === coverTargetKey && "is-drag-active"
        )}
        {...getCuratedDropHandlers(coverTarget)}
      >
        {caseClassification.kind === "video" && service.curatedItem ? <>
          {renderCuratedMediaBox(service.curatedItem.entry, service.curatedItem.mediaEntry, { compact: true, disableInlinePreview: true, label: caseItem.title, duration: service.curation?.duration || "", variant: "case", workId: service.curation?.id })}
          <span className="curated-case-video-badge">视频{service.curation?.duration ? ` · ${service.curation.duration}` : ""} · 可播放</span>
        </> : caseItem.cover ? <img src={caseItem.cover} alt={caseItem.title} loading="eager" decoding="async" fetchPriority={index < 4 ? "high" : "auto"} /> : <div>暂无封面</div>}
        {IS_PORTFOLIO_ADMIN_MODE && <div className="curated-admin-media-tools">
          <button type="button" disabled={!canWriteAssets || isApplyingAsset} title={canWriteAssets ? "上传并替换封面" : assetCapabilityReason} onClick={(event) => { event.stopPropagation(); document.getElementById(coverInputId).click(); }}><Icon name="UploadCloud" size={14} /> 替换封面</button>
        </div>}
        {IS_PORTFOLIO_ADMIN_MODE && <input id={coverInputId} type="file" accept="image/*" className="hidden" onChange={(event) => {
          const file = event.target.files && event.target.files[0];
          if (file) requestMediaReplacement(file, coverTarget);
          event.target.value = "";
        }} />}
      </div>
      <div className="curated-case-copy">
        <span>项目案例 {String(index + 1).padStart(2, "0")}</span>
        <h3>{caseItem.title}</h3>
        <p>{caseItem.description || service.ability}</p>
        <div className="curated-case-meta">
          {service.curation ? <>
            <span>{caseItem.category}</span>
            <span>{ensureStringArray(caseItem.tools).slice(0, 2).join(" / ") || "工具链已整理"}</span>
            <span>{service.output || "商业交付"}</span>
          </> : <>
            <span>{caseSlides.length} 组关联页面</span>
            <span>{stats.images} 张图像</span>
            <span>{stats.videos} 条视频</span>
          </>}
          <button type="button" onClick={(event) => { event.stopPropagation(); openWorkDetail(detail); }}>查看案例</button>
        </div>
      </div>
    </article>;
  };

  const renderVisualIndexCard = (item, index) => {
    const classification = item?.classification || classifyHomepageWork(item);
    if (!classification?.canUseInGallery) {
      reportHomepageCurationGuard("error", "VisualWorkCard received invalid visual work", item?.curation || item);
      return null;
    }
    const detail = buildVisualWorkDetail(item, index);
    return <article key={detail.id} className="curated-visual-card" data-curation-section="gallery" data-curation-id={detail.curation?.id || detail.id} data-curation-category={detail.curation?.category || ""} data-curation-kind={detail.kind} tabIndex={0} onClick={() => openWorkDetail(detail)} onKeyDown={(event) => openWorkDetailFromKeyboard(event, detail)} {...getDesignerWorkProps(detail.curation?.id, detail.title)}>
      {renderCuratedMediaBox(item.entry, item.mediaEntry, { compact: true, disableInlinePreview: true, label: detail.title, variant: "gallery", workId: detail.curation?.id })}
      <div className="curated-visual-copy">
        <span>{detail.label}</span>
        <h3>{detail.title}</h3>
        <p>{detail.description}</p>
        <div className="curated-card-tags">
          {detail.tags.slice(0, 3).map((tag) => <span key={detail.id + "-" + tag}>{tag}</span>)}
        </div>
        <button type="button" onClick={(event) => { event.stopPropagation(); openWorkDetail(detail); }}>查看详情</button>
      </div>
    </article>;
  };

  const renderWorkflowEvidenceCard = (item, index) => {
    const classification = item?.classification || classifyHomepageWork(item);
    if (!classification?.canUseInWorkflow) {
      reportHomepageCurationGuard("warn", "WorkflowEvidenceCard received non-workflow item", item?.curation || item);
      return null;
    }
    const detail = buildWorkflowEvidenceDetail(item, index);
    const workflowNote = WORKFLOW_EVIDENCE_NOTES[detail.curation?.id || detail.id] || detail.description;
    return <article key={detail.id} className="curated-workflow-card curated-workflow-card-image-only" data-curation-section="workflow-evidence" data-curation-id={detail.curation?.id || detail.id} data-curation-category={detail.curation?.category || "workflow"} data-curation-kind={classification.kind} tabIndex={0} aria-label={detail.title} onClick={() => openWorkDetail(detail)} onKeyDown={(event) => openWorkDetailFromKeyboard(event, detail)} {...getDesignerWorkProps(detail.curation?.id, detail.title)}>
      {renderCuratedMediaBox(item.entry, item.mediaEntry, { compact: true, disableInlinePreview: true, label: detail.title, variant: "workflow", workId: detail.curation?.id })}
      {workflowNote && <p className="curated-workflow-note">{workflowNote}</p>}
    </article>;
  };

  const renderWorkflowLabCard = (card, index) => {
    const detail = card.item ? buildHomepageCuratedDetail(card.item, index) : null;
    const commonProps = detail ? {
      tabIndex: 0,
      onClick: () => openWorkDetail(detail),
      onKeyDown: (event) => openWorkDetailFromKeyboard(event, detail)
    } : {};
    return <article key={card.key} className="curated-workflow-card curated-workflow-lab-card" data-curation-section="workflow-lab" data-curation-id={card.key} data-curation-kind={detail?.kind || "workflow"} {...commonProps}>
      {card.item ? renderCuratedMediaBox(card.item.entry, card.item.mediaEntry, { compact: true, disableInlinePreview: true, label: card.title, variant: "workflow", workId: card.item.curation?.id }) : <div className="curated-workflow-node-frame" aria-label="ComfyUI node flow">
        {card.nodes.map((node, nodeIndex) => <span key={card.key + "-" + node} data-node-index={nodeIndex + 1}>{node}</span>)}
      </div>}
      <div className="curated-workflow-copy">
        <span>{card.label}</span>
        <h3>{card.title}</h3>
        <p>{card.description}</p>
        <div className="curated-card-tags">
          {card.tags.slice(0, 3).map((tag) => <span key={card.key + "-" + tag}>{tag}</span>)}
        </div>
      </div>
    </article>;
  };

  const renderDetailMedia = (item) => {
    if (!item) return null;
    if (item.entry && item.mediaEntry) {
      const media = normalizeMediaItem(item.mediaEntry.media);
      if (!media) return null;
      const displayUrl = getDisplayUrl(media);
      if (media.kind === "image") {
        const highResolutionUrl = getHighResolutionImageUrl(media) || displayUrl;
        return <div className="curated-detail-cover curated-detail-cover-image">
          <img src={highResolutionUrl} alt={media.alt || item.title} loading="eager" decoding="async" />
        </div>;
      }
      if (media.kind === "youtube") {
        const embedUrl = getYouTubeEmbedUrl(media.url);
        return embedUrl ? <iframe
          ref={lightboxVideoRef}
          src={withEmbedPlaybackParams(embedUrl, true)}
          title={item.title}
          className="curated-detail-player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        /> : null;
      }
      if (media.kind === "video") {
        const sourceUrl = getSourceMediaUrl(media);
        const streamPlayerUrl = getLightboxVideoPlayerUrl(media);
        const embedUrl = getVideoEmbedUrl(sourceUrl);
        const isBilibiliEmbed = isBilibiliVideoUrl(sourceUrl) || isBilibiliVideoUrl(embedUrl);
        if (streamPlayerUrl) {
          return <iframe
            ref={lightboxVideoRef}
            src={`${streamPlayerUrl}?autoplay=true`}
            title={item.title}
            className="curated-detail-player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />;
        }
        if (embedUrl && !isDirectVideoSource(sourceUrl) && !isBilibiliEmbed) {
          return <iframe
            ref={lightboxVideoRef}
            src={withEmbedPlaybackParams(embedUrl, true)}
            title={item.title}
            className="curated-detail-player"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />;
        }
        if (isDirectVideoSource(sourceUrl)) {
          return <video
            ref={lightboxVideoRef}
            src={sourceUrl}
            poster={displayUrl || undefined}
            controls
            autoPlay
            playsInline
            preload="auto"
            className="curated-detail-player"
          />;
        }
        if (!sourceUrl) {
          return <div className="curated-detail-external curated-detail-recovery">
            {displayUrl && <img src={displayUrl} alt="" aria-hidden="true" />}
            <span><Icon name="Play" size={16} /> 视频资源恢复中</span>
          </div>;
        }
        return <div className="curated-detail-external">
          {displayUrl && <img src={displayUrl} alt="" aria-hidden="true" />}
          <a href={sourceUrl} target="_blank" rel="noreferrer"><Icon name="ExternalLink" size={16} /> 打开外部视频</a>
        </div>;
      }
    }
    if (item.cover) return <div className="curated-detail-cover"><img src={item.cover} alt={item.title} /></div>;
    return null;
  };

  const renderWorkDetailDrawer = () => {
    if (!selectedWorkItem) return null;
    const detailTarget = selectedWorkItem.entry && selectedWorkItem.mediaEntry ? {
      type: "slide-media",
      slideId: selectedWorkItem.entry.slide.id,
      slotIndex: selectedWorkItem.mediaEntry.slotIndex,
      label: selectedWorkItem.title,
      accept: getMediaAcceptFromKind(selectedWorkItem.mediaEntry.media?.kind)
    } : selectedWorkItem.caseItem ? {
      type: "case-cover",
      caseId: selectedWorkItem.caseItem.id,
      label: `${selectedWorkItem.caseItem.title} 封面`,
      accept: "image"
    } : null;
    const detailTargetKey = detailTarget ? getCuratedDropTargetKey(detailTarget) : "";
    const detailUploadInputId = selectedWorkItem ? `curated-detail-upload-${selectedWorkItem.id}` : "";
    return <div className="curated-detail-layer" onClick={closeWorkDetail}>
      <aside className="curated-detail-drawer" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="curated-detail-close" onClick={closeWorkDetail}>关闭</button>
        <div
          className={cx(
            "curated-detail-media",
            IS_PORTFOLIO_ADMIN_MODE && detailTarget && "curated-admin-drop-target",
            activeCuratedDropTarget === detailTargetKey && "is-drag-active"
          )}
          {...(detailTarget ? getCuratedDropHandlers(detailTarget) : {})}
        >
          {renderDetailMedia(selectedWorkItem)}
          {IS_PORTFOLIO_ADMIN_MODE && detailTarget && <div className="curated-admin-media-tools">
            <button type="button" disabled={!canWriteAssets || isApplyingAsset} title={canWriteAssets ? "上传并替换当前媒体" : assetCapabilityReason} onClick={(event) => { event.stopPropagation(); document.getElementById(detailUploadInputId).click(); }}><Icon name="UploadCloud" size={14} /> 替换当前媒体</button>
            {detailTarget.type !== "case-cover" && <button type="button" onClick={(event) => { event.stopPropagation(); requestExternalVideoReplacement(detailTarget, selectedWorkItem.mediaEntry?.media); }}><Icon name="Link2" size={14} /> 外链视频</button>}
          </div>}
          {IS_PORTFOLIO_ADMIN_MODE && detailTarget && <input id={detailUploadInputId} type="file" accept={getUploadAcceptAttr(detailTarget.accept)} className="hidden" onChange={(event) => {
            const file = event.target.files && event.target.files[0];
            if (file) requestMediaReplacement(file, detailTarget);
            event.target.value = "";
          }} />}
        </div>
        <div className="curated-detail-body">
          <span>{selectedWorkItem.label}</span>
          <h2>{selectedWorkItem.title}</h2>
          <p>{selectedWorkItem.description}</p>
          <div className="curated-info-rows curated-info-rows-detail">
            {selectedWorkItem.detailRows?.map((row) => <div key={row.label}><span>{row.label}</span><strong>{row.value}</strong></div>)}
          </div>
          {selectedWorkItem.kind === "workflow" && selectedWorkItem.workflowSteps?.length > 0 && <div className="curated-workflow-detail-steps">
            {selectedWorkItem.workflowSteps.map((step, stepIndex) => <div key={selectedWorkItem.id + "-step-" + stepIndex}>
              <span>{String(stepIndex + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>)}
          </div>}
          <div className="curated-card-tags">
            {ensureStringArray(selectedWorkItem.tags).map((tag) => <span key={selectedWorkItem.id + "-" + tag}>{tag}</span>)}
          </div>
          {selectedWorkItem.caseItem && <a href={"#case-" + selectedWorkItem.caseItem.id} onClick={(event) => {
            event.preventDefault();
            const targetId = "case-" + selectedWorkItem.caseItem.id;
            closeWorkDetail();
            window.setTimeout(() => scrollToCuratedElement(targetId), 0);
          }}>定位到所属案例</a>}
        </div>
      </aside>
    </div>;
  };

  const renderMediaReplacementDialog = () => {
    if (!pendingMediaReplacement) return null;
    const { file, previewUrl, kind, target, summary, uploadMode } = pendingMediaReplacement;
    const targetPath = uploadMode === "stream"
      ? "Cloudflare Stream"
      : kind === "video" ? "videos/uploads/YYYY/MM/" : "images/uploads/YYYY/MM/";
    const replacementFields = uploadMode === "stream"
      ? "delivery / poster / label"
      : kind === "video" ? "url / poster" : "url / fullUrl / width / height / alt";
    return <div className="curated-upload-confirm-layer" onClick={cancelPendingMediaReplacement}>
      <aside className="curated-upload-confirm" onClick={(event) => event.stopPropagation()}>
        <div className="curated-upload-preview">
          {kind === "video"
            ? <video src={previewUrl} muted playsInline preload="metadata" />
            : <img src={previewUrl} alt="" />}
        </div>
        <div className="curated-upload-copy">
          <span>确认后保存并触发生产部署</span>
          <h2>{target.label || "当前作品媒体"}</h2>
          <p>确认后会上传文件、写入作品集 JSON 到 GitHub，并等待生产部署 workflow 处理。请确认目标位置和媒体类型无误。</p>
          <div className="curated-upload-rows">
            <div><span>文件</span><strong>{file.name}</strong></div>
            <div><span>类型 / 大小</span><strong>{summary}</strong></div>
            <div><span>存储方式</span><strong>{targetPath}</strong></div>
            <div><span>替换字段</span><strong>{replacementFields}</strong></div>
          </div>
          <div className="curated-upload-actions">
            <button type="button" onClick={cancelPendingMediaReplacement} disabled={isReplacingMedia}>取消</button>
            <button type="button" onClick={confirmPendingMediaReplacement} disabled={isReplacingMedia}>{isReplacingMedia ? "正在保存..." : "确认保存并部署"}</button>
          </div>
        </div>
      </aside>
    </div>;
  };

  const renderCuratedCardManager = () => {
    if (!IS_PORTFOLIO_ADMIN_MODE || !showCuratedManager) return null;
    const buildManagerEntry = (item, index, groupId) => {
      const detail = groupId === "videos"
        ? buildVideoWorkDetail(item, index)
        : groupId === "workflows"
          ? buildWorkflowWorkDetail(item, index)
          : buildVisualWorkDetail(item, index);
      const media = normalizeMediaItem(item.mediaEntry.media) || {};
      return {
        ...detail,
        groupId,
        source: item,
        hidden: media.curatedHidden === true,
        media,
        target: {
          type: "slide-media",
          slideId: item.entry.slide.id,
          slotIndex: item.mediaEntry.slotIndex,
          label: detail.title,
          accept: getMediaAcceptFromKind(media.kind)
        }
      };
    };
    const managerGroups = [
      { id: "videos", label: "视频", items: videoWorks.map((item, index) => buildManagerEntry(item, index, "videos")) },
      { id: "works", label: "作品", items: visualEntries.filter((item) => !isVideoMedia(normalizeMediaItem(item.mediaEntry.media))).map((item, index) => buildManagerEntry(item, index, "works")) },
      { id: "workflows", label: "ComfyUI 工作流", items: workflowEntries.map((item, index) => buildManagerEntry(item, index, "workflows")) }
    ];

    return <aside className="curated-card-manager-panel" aria-label="首页卡片数量管理">
      <div className="curated-card-manager-head">
        <div>
          <span>首页卡片管理</span>
          <strong>隐藏可恢复，不删除底层素材</strong>
        </div>
        <button type="button" onClick={() => setShowCuratedManager(false)}>关闭</button>
      </div>
      <div className="curated-card-manager-groups">
        {managerGroups.map((group) => {
          const visibleCount = group.items.filter((item) => !item.hidden).length;
          const hiddenCount = group.items.length - visibleCount;
          return <section key={group.id} className="curated-card-manager-group">
            <div className="curated-card-manager-group-head">
              <div>
                <h3>{group.label}</h3>
                <p>总数 {group.items.length} / 可见 {visibleCount} / 隐藏 {hiddenCount}</p>
              </div>
              <button type="button" onClick={() => addCuratedPlaceholderCard(group.id)}>新增占位卡</button>
            </div>
            <div className="curated-card-manager-list">
              {group.items.map((item) => {
                const inputId = `curated-manager-upload-${item.groupId}-${item.id}`.replace(/[^a-zA-Z0-9_-]/g, "-");
                const previewUrl = getDisplayUrl(item.media);
                return <article key={item.id} className={cx("curated-card-manager-item", item.hidden && "is-hidden")}>
                  <button type="button" className="curated-card-manager-thumb" onClick={() => openWorkDetail(item)}>
                    {previewUrl ? <img src={previewUrl} alt="" loading="lazy" decoding="async" /> : <span>待替换</span>}
                  </button>
                  <div>
                    <span>{item.label}</span>
                    <strong>{item.title}</strong>
                    <em>{item.hidden ? "已隐藏" : "首页可见"}</em>
                  </div>
                  <div className="curated-card-manager-actions">
                    <button type="button" onClick={() => updateCuratedCardHidden(item.source, !item.hidden)}>{item.hidden ? "恢复" : "隐藏"}</button>
                    <button type="button" disabled={!canWriteAssets || isApplyingAsset} title={canWriteAssets ? "上传并替换图片" : assetCapabilityReason} onClick={() => document.getElementById(inputId)?.click()}>替换图片</button>
                    <input id={inputId} type="file" accept={getUploadAcceptAttr(item.target.accept)} className="hidden" onChange={(event) => {
                      const file = event.target.files && event.target.files[0];
                      if (file) requestMediaReplacement(file, item.target);
                      event.target.value = "";
                    }} />
                  </div>
                </article>;
              })}
              {!group.items.length && <p className="curated-card-manager-empty">暂无卡片，先新增占位卡。</p>}
            </div>
          </section>;
        })}
      </div>
      </aside>;
  };

  const renderHomepageDesignInspector = (sectionDefaults) => {
    if (!IS_PORTFOLIO_ADMIN_MODE) return null;
    const [nodeType, ...nodeRest] = String(selectedDesignerId || "section:home").split(":");
    const nodeId = nodeRest.join(":");
    const designer = getHomepageDesignerState();
    const theme = designer.theme;
    const selectedSectionDefaults = nodeType === "section" ? sectionDefaults?.[nodeId] : null;
    const selectedSection = selectedSectionDefaults ? getDesignerSection(nodeId, selectedSectionDefaults) : null;
    const selectedWork = nodeType === "work" ? getHomepageWork(nodeId) : null;
    const selectedWorkMedia = selectedWork ? normalizeMediaItem(selectedWork.media) || normalizeMediaItem({ kind: "image", url: "", poster: "", label: "" }) : null;
    const stylePreset = selectedWork?.stylePreset || selectedSection?.stylePreset || "default";
    const selectedTitle = selectedWork?.title || selectedSection?.title || selectedSection?.label || "未选择元素";
    const uploadInputId = selectedWork ? `designer-inspector-upload-${selectedWork.id}`.replace(/[^a-zA-Z0-9_-]/g, "-") : "";
    const mediaTarget = selectedWork ? { type: "homepage-work", workId: selectedWork.id, label: selectedWork.title || selectedWork.label || selectedWork.id, accept: getMediaAcceptFromKind(selectedWorkMedia?.kind) } : null;

    const renderPresetGroup = (label, presets, value, field, options = {}) => <div className="curated-inspector-group">
      <span>{label}</span>
      <div className={cx("curated-preset-row", options.colors && "curated-preset-row-colors")}>
        {presets.map((preset) => <button
          key={preset.id}
          type="button"
          className={cx("curated-preset-button", value === preset.id && "is-active")}
          onClick={() => updateHomepageDesignerTheme({ [field]: preset.id })}
        >
          {options.colors && <i>{preset.swatches.map((color) => <b key={preset.id + color} style={{ background: color }} />)}</i>}
          <em>{preset.label}</em>
        </button>)}
      </div>
    </div>;

    const renderStylePresetGroup = (onChange) => <div className="curated-inspector-group">
      <span>元素强调</span>
      <div className="curated-preset-row">
        {HOMEPAGE_ELEMENT_STYLE_PRESETS.map((preset) => <button
          key={preset.id}
          type="button"
          className={cx("curated-preset-button", stylePreset === preset.id && "is-active")}
          onClick={() => onChange(preset.id)}
        >
          <em>{preset.label}</em>
        </button>)}
      </div>
    </div>;

    const renderVisibilityToggle = (label, isVisible, onToggle) => <div className="curated-inspector-group">
      <span>{label}</span>
      <div className="curated-preset-row">
        <button type="button" className={cx("curated-preset-button", isVisible && "is-active")} onClick={() => onToggle(!isVisible)}>
          <em>{isVisible ? "显示中" : "已隐藏"}</em>
        </button>
      </div>
    </div>;

    const renderSectionVisibilityGroup = () => <div className="curated-inspector-group">
      <span>页面模块显示</span>
      <div className="curated-preset-row">
        {HOMEPAGE_SECTION_VISIBILITY_OPTIONS.map((section) => {
          const visible = !isHomepageSectionHidden(section.id);
          return <button
            key={section.id}
            type="button"
            className={cx("curated-preset-button", visible && "is-active")}
            onClick={() => updateHomepageDesignerSection(section.id, { hidden: visible })}
          >
            <em>{section.label} / {visible ? "显示" : "隐藏"}</em>
          </button>;
        })}
      </div>
    </div>;

    const renderProcessBlockVisibilityGroup = () => <div className="curated-inspector-group">
      <span>流程子模块显示</span>
      <div className="curated-preset-row">
        {HOMEPAGE_PROCESS_BLOCKS.map((block) => {
          const visible = !isHomepageBlockHidden(block.id);
          return <button
            key={block.id}
            type="button"
            className={cx("curated-preset-button", visible && "is-active")}
            onClick={() => updateHomepageDesignerBlock(block.id, { hidden: visible })}
          >
            <em>{block.label} / {visible ? "显示" : "隐藏"}</em>
          </button>;
        })}
      </div>
    </div>;

    const updateSelectedWorkMedia = (patch) => {
      if (!selectedWork || !selectedWorkMedia) return;
      updateHomepageDesignerWork(selectedWork.id, {
        media: normalizeMediaItem({
          ...selectedWorkMedia,
          ...patch
        })
      });
    };

    return <aside className="curated-designer-inspector" aria-label="页面元素属性面板">
      <header>
        <div>
          <span>Inspector</span>
          <strong>{selectedTitle}</strong>
        </div>
        <button type="button" onClick={() => setSelectedDesignerId("section:home")} title="回到首页设置"><Icon name="Home" size={16} /></button>
      </header>

      <section className="curated-inspector-section">
        <h3>全站预设</h3>
        {renderPresetGroup("字体", HOMEPAGE_FONT_PRESETS, theme.fontPreset, "fontPreset")}
        {renderPresetGroup("颜色", HOMEPAGE_COLOR_PRESETS, theme.colorPreset, "colorPreset", { colors: true })}
        {renderPresetGroup("圆角", HOMEPAGE_RADIUS_PRESETS, theme.radiusPreset, "radiusPreset")}
        {renderPresetGroup("密度", HOMEPAGE_DENSITY_PRESETS, theme.densityPreset, "densityPreset")}
        {renderSectionVisibilityGroup()}
      </section>

      {selectedSection && <section className="curated-inspector-section">
        <h3>模块内容</h3>
        {nodeId !== "home" && renderVisibilityToggle("当前模块显示", !isHomepageSectionHidden(nodeId), (visible) => updateHomepageDesignerSection(nodeId, { hidden: !visible }))}
        {selectedSection.eyebrow !== undefined && <label>眉标
          <input value={selectedSection.eyebrow || ""} onChange={(event) => updateHomepageDesignerSection(nodeId, { eyebrow: event.target.value })} />
        </label>}
        <label>标题
          <input value={selectedSection.title || ""} onChange={(event) => updateHomepageDesignerSection(nodeId, { title: event.target.value })} />
        </label>
        {selectedSection.subtitle !== undefined && <label>副标题
          <input value={selectedSection.subtitle || ""} onChange={(event) => updateHomepageDesignerSection(nodeId, { subtitle: event.target.value })} />
        </label>}
        <label>描述
          <textarea value={selectedSection.description || ""} onChange={(event) => updateHomepageDesignerSection(nodeId, { description: event.target.value })} />
        </label>
        {selectedSection.tags !== undefined && <label>标签预设
          <input value={ensureStringArray(selectedSection.tags).join("，")} onChange={(event) => updateHomepageDesignerSection(nodeId, { tags: parseDesignerTags(event.target.value) })} />
        </label>}
        {renderStylePresetGroup((presetId) => updateHomepageDesignerSection(nodeId, { stylePreset: presetId }))}
        {nodeId === "process" && renderProcessBlockVisibilityGroup()}
      </section>}

      {selectedWork && <section className="curated-inspector-section">
        <h3>作品元素</h3>
        <label>标签
          <input value={selectedWork.label || ""} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { label: event.target.value })} />
        </label>
        <label>标题
          <input value={selectedWork.title || ""} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { title: event.target.value })} />
        </label>
        <label>描述
          <textarea value={selectedWork.description || ""} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { description: event.target.value })} />
        </label>
        <label>标签预设
          <input value={ensureStringArray(selectedWork.tags).join("，")} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { tags: parseDesignerTags(event.target.value) })} />
        </label>
        <div className="curated-inspector-two">
          <label>类型
            <select value={selectedWork.kind || "image"} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { kind: event.target.value })}>
              <option value="image">图片</option>
              <option value="video">视频</option>
              <option value="case">案例</option>
              <option value="workflow">流程</option>
            </select>
          </label>
          <label>分类
            <select value={selectedWork.category || "brand"} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { category: event.target.value })}>
              <option value="product">产品</option>
              <option value="portrait">人像</option>
              <option value="world">世界观</option>
              <option value="brand">品牌</option>
              <option value="video">视频</option>
              <option value="workflow">流程</option>
            </select>
          </label>
        </div>
        {(selectedWork.kind === "video" || selectedWorkMedia?.kind === "video") && <label>时长
          <input value={selectedWork.duration || ""} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { duration: event.target.value })} placeholder="00:10" />
        </label>}
        {renderStylePresetGroup((presetId) => updateHomepageDesignerWork(selectedWork.id, { stylePreset: presetId }))}
      </section>}

      {selectedWork && selectedWorkMedia && <section className="curated-inspector-section">
        <h3>素材</h3>
        <div className="curated-inspector-media-actions">
          <button type="button" disabled={!canListAssets || isCapabilitiesLoading} title={canListAssets ? "素材库" : assetCapabilityReason} onClick={() => openAssetManager(mediaTarget)}><Icon name="Grid" size={14} /> 素材库</button>
          <button type="button" disabled={!canWriteAssets || isApplyingAsset} title={canWriteAssets ? "上传并替换" : assetCapabilityReason} onClick={() => document.getElementById(uploadInputId)?.click()}><Icon name="UploadCloud" size={14} /> 上传替换</button>
          <button type="button" onClick={() => requestExternalVideoReplacement(mediaTarget, selectedWorkMedia)}><Icon name="Link2" size={14} /> 外链视频</button>
        </div>
        <input id={uploadInputId} type="file" accept={getUploadAcceptAttr(mediaTarget?.accept)} className="hidden" onChange={(event) => {
          const file = event.target.files && event.target.files[0];
          if (file) requestMediaReplacement(file, mediaTarget);
          event.target.value = "";
        }} />
        <label>素材类型
          <select value={selectedWorkMedia.kind || "image"} onChange={(event) => updateSelectedWorkMedia({ kind: event.target.value })}>
            <option value="image">图片</option>
            <option value="video">视频</option>
            <option value="youtube">YouTube</option>
          </select>
        </label>
        <label>资源链接
          <input value={selectedWorkMedia.url || ""} onChange={(event) => updateSelectedWorkMedia(applyMediaFieldChange(selectedWorkMedia, "url", event.target.value))} />
        </label>
        <label>封面 / 海报
          <input value={selectedWorkMedia.poster || ""} onChange={(event) => updateSelectedWorkMedia({ poster: event.target.value })} />
        </label>
        <label>替代文本
          <input value={selectedWorkMedia.alt || ""} onChange={(event) => updateSelectedWorkMedia({ alt: event.target.value })} />
        </label>
        <label>详情行
          <textarea value={formatDesignerDetailRows(selectedWork.detailRows)} onChange={(event) => updateHomepageDesignerWork(selectedWork.id, { detailRows: parseDesignerDetailRows(event.target.value) })} />
        </label>
      </section>}
    </aside>;
  };

  const renderCuratedTopbar = () => {
    const progressWidth = Math.round(scrollProgress * 100) + "%";
    return <div className="curated-topbar">
      <div className="curated-topbar-inner">
        <a href="#home" className="curated-brand" onClick={(event) => handleCuratedAnchorClick(event, "home")}>张玮<span /></a>
        <nav>
          {curatedNavItems.map((item) => <a
            key={item.id}
            href={"#" + item.id}
            className={activeCuratedSection === item.id ? "is-active" : ""}
            onClick={(event) => handleCuratedAnchorClick(event, item.id)}
          >{item.label}</a>)}
        </nav>
      </div>
      <div className="curated-scroll-progress"><span style={{ width: progressWidth }} /></div>
    </div>;
  };

  const renderHeroKineticStage = (heroDetail, stageItems) => {
    const heroItem = heroDetail || stageItems?.[0]?.detail || null;
    const isManualHero = heroItem?.entry?.manualCuration === true;
    const target = heroItem && !isManualHero ? {
      type: "slide-media",
      slideId: heroItem.entry.slide.id,
      slotIndex: heroItem.mediaEntry.slotIndex,
      accept: getMediaAcceptFromKind(heroItem.mediaEntry.media?.kind),
      label: "首页动态舞台"
    } : null;
    const targetKey = target ? getCuratedDropTargetKey(target) : "";
    const handlers = target ? getCuratedDropHandlers(target) : {};
    return <div
      className={cx(
        "curated-hero-stage-wrap",
        IS_PORTFOLIO_ADMIN_MODE && "curated-admin-drop-target",
        activeCuratedDropTarget === targetKey && "is-drag-active"
      )}
      {...handlers}
    >
      {heroItem ? <article
        className="curated-hero-single-stage"
        role="button"
        tabIndex={0}
        onClick={() => openWorkDetail(heroItem)}
        onKeyDown={(event) => openWorkDetailFromKeyboard(event, heroItem)}
        aria-label={`查看作品：${heroItem.title}`}
      >
        {renderCuratedMediaBox(heroItem.entry, heroItem.mediaEntry, {
          large: true,
          eager: true,
          variant: "hero",
          key: "curated-hero-single",
          label: heroItem.title || "首页主视觉",
          workId: heroItem.curation?.id
        })}
        <div className="curated-hero-single-copy">
          <span>{heroItem.label}</span>
          <strong>{heroItem.title}</strong>
          {heroItem.description && <p>{heroItem.description}</p>}
        </div>
      </article> : <div className="curated-hero-single-empty">
        <Icon name="Image" size={26} />
        <span>等待添加首页主视觉</span>
      </div>}
      {IS_PORTFOLIO_ADMIN_MODE && target && <div className="curated-admin-media-tools">
        <button type="button" disabled={!canWriteAssets || isApplyingAsset} title={canWriteAssets ? "上传并替换舞台作品" : assetCapabilityReason} onClick={(event) => { event.stopPropagation(); document.getElementById("curated-hero-upload").click(); }}><Icon name="UploadCloud" size={14} /> 替换舞台作品</button>
      </div>}
      {IS_PORTFOLIO_ADMIN_MODE && target && <input id="curated-hero-upload" type="file" accept={getUploadAcceptAttr(target.accept)} className="hidden" onChange={(event) => {
        const file = event.target.files && event.target.files[0];
        if (file) requestMediaReplacement(file, target);
        event.target.value = "";
      }} />}
    </div>;
  };

  const renderCuratedAdminDock = () => {
    if (!IS_PORTFOLIO_ADMIN_MODE) return null;
    return <>
      <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importDraft} />
      <div className="curated-admin-preview-dock" role="toolbar" aria-label="作品集后台可视化编辑工具">
        <div className="curated-admin-preview-status">
          <span className={loadSource.includes("draft") ? "is-draft" : "is-published"} />
          <div>
            <strong>后台可视化编辑</strong>
            <em>{statusMessage || "当前画面与公开首页使用同一套布局。"}</em>
          </div>
        </div>
        <div className="curated-admin-preview-actions">
          <button type="button" onClick={() => setShowCuratedManager((value) => !value)} title="管理首页卡片数量">
            <Icon name="Grid" size={16} />
            <span>管理卡片</span>
          </button>
          <button type="button" onClick={() => importInputRef.current && importInputRef.current.click()} title="导入 JSON">
            <Icon name="UploadCloud" size={16} />
            <span>导入 JSON</span>
          </button>
          <button type="button" onClick={resetDraft} title="重置草稿">
            <Icon name="RotateCcw" size={16} />
            <span>重置草稿</span>
          </button>
          <button type="button" onClick={exportDraft} title="下载当前 JSON">
            <Icon name="Download" size={16} />
            <span>下载 JSON</span>
          </button>
          <button type="button" onClick={publishPortfolioJson} disabled={isPublishingPortfolio || !canWriteAssets} className="is-primary" title={!canWriteAssets ? assetCapabilityReason : isPublishingPortfolio ? "正在保存到代码仓库" : "确认发布上线"}>
            <Icon name="Save" size={16} />
            <span>{isPublishingPortfolio ? "保存中..." : "确认发布上线"}</span>
          </button>
        </div>
      </div>
      {renderCuratedCardManager()}
    </>;
  };

  const renderCuratedExperience = () => {
    const coverSlide = slidesData.find((slide) => slide?.type === "cover") || slidesData[0] || {};
    const heroTitle = coverSlide.title || "张玮";
    const heroSubtitle = "AIGC Visual Designer\nAI Video Creator / Commercial Visual Designer / ComfyUI Workflow Builder";
    const heroDescription = "专注 AIGC 商业视觉、AI 视频短片与 ComfyUI 工作流搭建，覆盖产品广告、品牌视觉、角色一致性与场景概念设计。";
    const heroDetail = heroVisualEntry ? buildVisualWorkDetail(heroVisualEntry, 0) : null;
    const heroStageItems = (heroVisualEntry ? [heroVisualEntry] : []).map((item, index) => {
      const media = normalizeMediaItem(item.mediaEntry.media);
      const detail = isVideoMedia(media) ? buildVideoWorkDetail(item, index) : buildVisualWorkDetail(item, index);
      return {
        id: detail.id,
        title: detail.title,
        shortTitle: detail.kind === "video" ? "视频作品" : detail.label,
        media: item.mediaEntry.media,
        detail
      };
    });
    const visibleVideoEntries = homepageVideoEntries;
    const visibleVisualEntries = filteredVisualEntries;
    const visibleWorkflowEntries = visibleWorkflowEntriesForDisplay;
    const visibleDetailPages = DETAIL_PAGE_SHOWCASE_ITEMS;
    const sectionDefaults = {
      home: { label: "首页首屏", title: heroTitle, subtitle: heroSubtitle, description: heroDescription, tags: heroRoleTags },
      featured: { label: "精选入口", eyebrow: "精选入口", title: "核心能力快速入口", description: "从视频、商业视觉、能力矩阵到 ComfyUI 工作流，快速了解我的 AIGC 视觉生产能力。" },
      videos: { label: "视频精选", eyebrow: "视频精选", title: "生成式视频与商业短片精选", description: "精选 AI 视频案例，覆盖食品广告、产品展示、场景氛围与镜头运动控制。" },
      cases: { label: "精选案例", eyebrow: "精选案例", title: siteMeta.caseSectionTitle || "商业视觉案例", description: siteMeta.caseSectionDesc || "覆盖产品广告、美妆人像、未来场景与包装陈列，展示商业审美、质感控制与视觉一致性。" },
      details: { label: "详情图展示", eyebrow: "详情图展示", title: "产品详情图展示", description: "集中展示多品类电商详情页长图，覆盖口腔护理、个护电器、旅行用品、数码音频、家居健康和厨房用品。" },
      capabilities: { label: "能力矩阵", eyebrow: "能力矩阵", title: "核心能力矩阵", description: "以商业项目流程为核心，拆解从需求分析、视觉生成、局部优化到视频输出的完整 AIGC 生产能力。" },
      gallery: { label: "视觉精选", eyebrow: "视觉精选", title: "视觉作品精选", description: "12 张单图作品覆盖产品广告、人像角色、场景世界观和品牌延展，标题、描述和标签都对应画面主体。" },
      process: { label: "工作流证明", eyebrow: "工作流证明", title: "ComfyUI 工作流 / 创作流程", description: "通过节点化流程搭建，实现从图像生成、角色一致性、局部重绘到视频输出的可复用生产流程。" },
      contact: { label: "联系", title: siteMeta.contactSectionTitle || "联系我", description: siteMeta.contactSectionDesc || "面向 AIGC 视觉设计、AI 视频制作和生成式内容设计岗位，欢迎通过邮箱或招聘平台联系。" }
    };
    const homeSection = getDesignerSection("home", sectionDefaults.home);
    const featuredSection = getDesignerSection("featured", sectionDefaults.featured);
    const videoSection = getDesignerSection("videos", sectionDefaults.videos);
    const caseSection = getDesignerSection("cases", sectionDefaults.cases);
    const detailSection = getDesignerSection("details", sectionDefaults.details);
    const capabilitySection = getDesignerSection("capabilities", sectionDefaults.capabilities);
    const gallerySection = getDesignerSection("gallery", sectionDefaults.gallery);
    const processSection = getDesignerSection("process", sectionDefaults.process);
    const contactSection = getDesignerSection("contact", sectionDefaults.contact);
    const homeTags = ensureStringArray(homeSection.tags).length ? ensureStringArray(homeSection.tags) : heroRoleTags;
    const designerThemeStyle = getHomepageDesignerThemeStyle(getHomepageDesignerState().theme);

    return <div className={cx("curated-page curated-shell", IS_PORTFOLIO_ADMIN_MODE && "curated-admin-preview")} style={designerThemeStyle}>
      {renderCuratedLayoutStyles()}
      <section id="home" className="curated-hero" style={publishedSectionStyle}>
        <div className="portfolio-container curated-hero-container">
          <div className="curated-hero-copy">
            <div className="curated-hero-copy-editable" {...getDesignerSectionProps("home", "首页首屏")}>
              <h1>{homeSection.title}</h1>
              <h2>{String(homeSection.subtitle || "").split("\n").map((line) => <span key={line}>{line}</span>)}</h2>
              <p>{homeSection.description}</p>
              <div className="curated-hero-tags">
                {homeTags.map((tag) => <span key={tag}>{tag}</span>)}
              </div>
            </div>
            <div className="curated-hero-actions">
              <a href="#featured" onClick={(event) => handleCuratedAnchorClick(event, "featured")}>查看作品集</a>
              <a href="#capabilities" onClick={(event) => handleCuratedAnchorClick(event, "capabilities")}>核心能力</a>
              <a href="#contact" onClick={(event) => handleCuratedAnchorClick(event, "contact")}>联系我</a>
            </div>
          </div>
          {renderHeroKineticStage(heroDetail, heroStageItems)}
          <div className="curated-hero-proof">
            {curatedStats.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.value}</strong></div>)}
          </div>
        </div>
      </section>

      {!isHomepageSectionHidden("featured") && <section id="featured" className="curated-section curated-section-entry" style={publishedSectionStyle}>
        <div className="portfolio-container">
          {renderCuratedEyebrow(1, featuredSection.eyebrow)}
          <div className="curated-section-heading" {...getDesignerSectionProps("featured", "精选入口")}>
            <h2>{featuredSection.title}</h2>
            <p>{featuredSection.description}</p>
          </div>
          <div className="curated-feature-grid">{homepageEntryCards.map(renderHomepageEntryCard)}</div>
        </div>
      </section>}

      {!isHomepageSectionHidden("videos") && <section id="videos" className="curated-section curated-section-videos" style={publishedSectionStyle}>
        <div className="portfolio-container">
          {renderCuratedEyebrow(2, videoSection.eyebrow)}
          <div className="curated-section-heading" {...getDesignerSectionProps("videos", "视频精选")}>
            <h2>{videoSection.title}</h2>
            <p>{videoSection.description}</p>
          </div>
          {renderVideoWheelSelector(visibleVideoEntries)}
        </div>
      </section>}

      {!isHomepageSectionHidden("cases") && <section id="cases" className="curated-section" style={publishedSectionStyle}>
        <div className="portfolio-container">
          {renderCuratedEyebrow(3, caseSection.eyebrow)}
          <div className="curated-section-heading" {...getDesignerSectionProps("cases", "精选案例")}>
            <h2>{caseSection.title}</h2>
            <p>{caseSection.description}</p>
          </div>
          <div className="curated-case-stack">{homepageCommercialCases.map(renderFeaturedCaseCard)}</div>
        </div>
      </section>}

      {!isHomepageSectionHidden("details") && <section id="details" className="curated-section curated-section-details" style={publishedSectionStyle}>
        <div className="portfolio-container">
          {renderCuratedEyebrow(4, detailSection.eyebrow)}
          <div className="curated-section-heading" {...getDesignerSectionProps("details", "详情图展示")}>
            <h2>{detailSection.title}</h2>
            <p>{detailSection.description}</p>
          </div>
          {renderDetailPageShowcase(visibleDetailPages, detailSection)}
        </div>
      </section>}

      {!isHomepageSectionHidden("process") && <section id="process" className="curated-section curated-section-process curated-section-workflows" style={publishedSectionStyle}>
        <div className="portfolio-container">
          {renderCuratedEyebrow(5, processSection.eyebrow)}
          <div className="curated-section-heading" {...getDesignerSectionProps("process", "工作流证明")}>
            <h2>{processSection.title}</h2>
            <p>{processSection.description}</p>
          </div>
          {!isHomepageBlockHidden("process.workflowEvidence") && <div className="curated-workflow-grid curated-workflow-evidence-grid">{visibleWorkflowEntries.map(renderWorkflowEvidenceCard)}</div>}
          {!isHomepageBlockHidden("process.workflowLab") && <div className="curated-workflow-grid">{homepageWorkflowLabCards.map(renderWorkflowLabCard)}</div>}
          {!isHomepageBlockHidden("process.steps") && <div className="curated-process-grid">
            {processSteps.map((step, stepIndex) => <article key={step.title} className="curated-process-card"><span>{String(stepIndex + 1).padStart(2, "0")}</span><h3>{step.title}</h3><p>{step.description}</p></article>)}
          </div>}
          {!isHomepageBlockHidden("process.skills") && <div className="curated-skill-grid">{skillGroups.map(renderSkillGroupCard)}</div>}
        </div>
      </section>}

      {!isHomepageSectionHidden("capabilities") && <section id="capabilities" className="curated-section curated-section-capabilities" style={publishedSectionStyle}>
        <div className="portfolio-container">
          {renderCuratedEyebrow(6, capabilitySection.eyebrow)}
          <div className="curated-section-heading" {...getDesignerSectionProps("capabilities", "能力矩阵")}>
            <h2>{capabilitySection.title}</h2>
            <p>{capabilitySection.description}</p>
          </div>
          <div className="curated-capability-matrix" aria-label="核心能力矩阵">
            {capabilityMatrixItems.map((item, index) => <article key={item.title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>)}
            <div className="curated-capability-flow">
              <span>商业项目流程</span>
              <strong>{capabilityProcessFlow}</strong>
            </div>
          </div>
        </div>
      </section>}

      {!isHomepageSectionHidden("contact") && <section id="contact" className="curated-contact" style={publishedSectionStyle}>
        <div className="portfolio-container curated-contact-container">
          <div {...getDesignerSectionProps("contact", "联系")}>
            <h2>{contactSection.title}</h2>
            <p>{contactSection.description}</p>
          </div>
          <div className="curated-contact-grid">
            {contactItems.map((item) => {
              const content = <div><span>{item.label}</span><strong>{item.value}</strong></div>;
              return item.href ? <a key={item.label} href={item.href}>{content}</a> : <div key={item.label}>{content}</div>;
            })}
          </div>
        </div>
      </section>}
      {renderWorkDetailDrawer()}
      {renderMediaReplacementDialog()}
      {renderCuratedAdminDock()}
      {renderHomepageDesignInspector(sectionDefaults)}
    </div>;
  };

  const renderSlide = (slide, index) => {
    if (!slide) return null;
    const slideTheme = colorPalettes[index % colorPalettes.length] || colorPalettes[0];
    const isFeedLayout = isMobileFeedMode;

    if (slide.type === "cover") {
      return <div className={`flex flex-col items-center justify-center text-center relative z-10 ${isFeedLayout ? "min-h-[58svh] gap-6 px-5 py-14" : "h-full space-y-8 px-10"}`}>
        <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 ${isFeedLayout ? "w-56 h-56" : "w-80 h-80"} ${slideTheme.a} blur-[120px] rounded-full`} />
        <EditableText text={slide.title} field="title" slideIndex={index} tagName="h1" className="text-5xl md:text-[8rem] font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-white to-white/50 pb-4" />
        <EditableText text={slide.subtitle} field="subtitle" slideIndex={index} tagName="h2" className={`text-sm md:text-2xl font-light ${slideTheme.text} tracking-[0.28em] md:tracking-[0.4em] uppercase`} />
        <div className={`w-12 h-[2px] ${slideTheme.line} my-2 md:my-8`} />
        <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className="text-white/40 tracking-[0.2em] text-sm uppercase font-mono" />
        {renderFitPoints(slide.fitPoints)}
        {renderPills(slide.roleTags, { className: "justify-center" })}
      </div>;
    }

    if (slide.type === "toc") {
      return <div className={`flex flex-col max-w-6xl mx-auto relative z-10 w-full ${isFeedLayout ? "px-2 py-2 gap-4" : "justify-center h-full px-12"}`}>
        <div className={`flex items-center gap-4 ${isFeedLayout ? "mb-2" : "mb-16"}`}>
          <div className={`w-8 h-[1px] ${slideTheme.line}`} />
          <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className={`text-sm font-medium tracking-[0.3em] ${slideTheme.text} uppercase`} />
        </div>
        <div className={`grid grid-cols-1 ${isFeedLayout ? "gap-4" : "md:grid-cols-2 gap-x-10 gap-y-6"}`}>{slidesData.filter((item) => item.type === "chapter").map((item) => {
          const chapterIndex = slidesData.findIndex((candidate) => candidate.id === item.id);
          const chapterStats = getChapterStats(chapterIndex);
          return <div key={item.id} onClick={() => { if (!IS_EDITOR_MODE) goToSlide(chapterIndex); }} className={`portfolio-toc-card group flex items-start ${isFeedLayout ? "gap-4 p-4" : "gap-6 p-4"} rounded-2xl hover:bg-white/[0.04] transition-colors ${IS_EDITOR_MODE ? "" : "cursor-pointer"}`}>
            <EditableText text={item.chapter} field="chapter" slideIndex={chapterIndex} tagName="div" className="text-white/20 text-2xl md:text-3xl font-light font-mono" placeholder="章节编号" />
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <EditableText text={item.title} field="title" slideIndex={chapterIndex} tagName="h3" className="text-xl font-light text-white/90 group-hover:text-white" placeholder="章节标题" />
                {item.priority && <span className="portfolio-priority">{item.priority}</span>}
              </div>
              <EditableText text={item.desc} field="desc" slideIndex={chapterIndex} tagName="p" className="text-white/40 text-sm" placeholder="章节说明" />
              {item.roleFit && <div className="portfolio-toc-fit">{item.roleFit}</div>}
              <div className="portfolio-toc-meta">
                <span>{chapterStats.pages} 页</span>
                <span>{chapterStats.media} 个素材</span>
                {chapterStats.videos > 0 && <span>{chapterStats.videos} 个视频</span>}
              </div>
            </div>
            {IS_EDITOR_MODE && <button onClick={(event) => { event.stopPropagation(); goToSlide(chapterIndex); }} className="ml-auto rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100 hover:bg-cyan-500/20">跳转</button>}
          </div>;
        })}</div>
      </div>;
    }

    if (slide.type === "chapter") {
      return <div className={`flex flex-col justify-center relative z-10 ${isFeedLayout ? "px-4 py-10 gap-3" : "h-full px-24"}`}>
        <div className={`absolute ${isFeedLayout ? "left-4 top-10 w-32 h-32" : "left-24 top-1/2 -translate-y-1/2 w-64 h-64"} ${slideTheme.a} blur-[120px] rounded-full pointer-events-none`} />
        <EditableText text={slide.chapter} field="chapter" slideIndex={index} tagName="span" className="text-6xl md:text-[12rem] font-bold text-white/5 tracking-tighter leading-none mb-2 md:mb-6 ml-[-4px] md:ml-[-10px] block w-max" />
        <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-5xl md:text-7xl font-semibold tracking-tight text-white/90 mb-6" />
        <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-base md:text-xl ${slideTheme.text} tracking-[0.2em] font-light uppercase`} />
        {slide.roleFit && <p className="portfolio-chapter-fit">{slide.roleFit}</p>}
        {renderPills(slide.capabilities)}
      </div>;
    }

    if (slide.type === "free-layout") {
      return <FreeLayoutSlide slide={slide} index={index} />;
    }

    if (slide.type === "compare-slider") {
      return <div className={`flex flex-col relative z-10 w-full max-w-[1920px] mx-auto ${isFeedLayout ? "gap-4 px-1 py-2" : "h-full p-12"}`}>
        <div className={`portfolio-slide-header flex ${isFeedLayout ? "flex-col gap-2 px-2" : "justify-between items-end mb-6 px-4"}`}>
          <div className="min-w-0">
            <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl font-light tracking-wide text-white/90" />
            {renderSlideInsight(slide, { compact: true })}
          </div>
          <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-sm tracking-widest uppercase font-mono ${slideTheme.text}`} />
        </div>
        <div className={`w-full relative ${isFeedLayout ? "h-[52svh]" : "flex-1 h-full"}`}>
          <CompareSliderContainer slideIndex={index} />
        </div>
      </div>;
    }

    let colsClass = "grid-cols-2";
    if (isFeedLayout) {
      colsClass = slide.slots === 1 && slide.type !== "split" ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2";
    } else {
      if (slide.slots === 1 && slide.type !== "split") colsClass = "grid-cols-1";
      if (slide.slots === 3) colsClass = "grid-cols-3";
      if (slide.slots === 4) colsClass = "grid-cols-2 lg:grid-cols-4";
      if (slide.slots === 6) colsClass = "grid-cols-3";
      if (slide.slots === 8) colsClass = "grid-cols-4";
      if (slide.slots === 9) colsClass = "grid-cols-3";
    }

    return <div className={`flex relative z-10 w-full max-w-[1920px] mx-auto flex-col ${isFeedLayout ? "gap-5 px-1 py-2" : "h-full p-10"}`}>
      {slide.type !== "split" && <div className={`portfolio-slide-header flex ${isFeedLayout ? "flex-col gap-2 px-2" : "justify-between items-end mb-4 px-4"}`}>
        <div className="min-w-0">
          <EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl font-light tracking-wide text-white/90" />
          {renderSlideInsight(slide, { compact: true })}
        </div>
        <EditableText text={slide.desc} field="desc" slideIndex={index} tagName="p" className={`text-sm tracking-widest uppercase font-mono ${slideTheme.text}`} />
      </div>}
      <div className={slide.type === "split" ? (isFeedLayout ? "flex flex-col gap-5" : "flex-1 flex items-center gap-16 p-4") : `grid ${colsClass} gap-4`}>
        {slide.type === "split" && <div className={`${isFeedLayout ? "w-full flex flex-col relative gap-3 px-2" : "w-1/3 flex flex-col relative gap-4"}`}><div className={`absolute ${isFeedLayout ? "-left-1 top-0 h-14" : "-left-10 top-0 h-20"} w-1 bg-gradient-to-b from-white/40 to-transparent opacity-60`} /><EditableText text={slide.title} field="title" slideIndex={index} tagName="h2" className="text-3xl md:text-4xl font-light mb-2 md:mb-4 leading-tight tracking-wide text-white/90" />{renderSlideInsight(slide)}<div className="flex flex-col gap-3">{(Array.isArray(slide.textBlocks) ? slide.textBlocks : [slide.text || ""]).map((block, blockIndex) => <EditableText key={`${slide.id}-text-${blockIndex}`} text={block} field="text" slideIndex={index} tagName="p" placeholder={`文本框 ${blockIndex + 1}`} className="text-base md:text-lg text-white/70 leading-relaxed font-light whitespace-pre-line" onBlurValue={(value) => updateTextBlock(index, blockIndex, value)} />)}</div></div>}
            <div className={slide.type === "split" ? (isFeedLayout ? "w-full grid grid-cols-1 gap-3" : "w-2/3 h-[80vh] flex gap-6") : "contents"}>{Array.from({ length: slide.slots || 1 }).map((_, slotIndex) => <div key={slotIndex} className={slide.type === "split" ? (isFeedLayout ? "min-h-[320px]" : "flex-1 h-full") : ""}><MediaSlot slideIndex={index} slotIndex={slotIndex} label={slide.customLabels ? slide.customLabels[slotIndex] : `素材 ${String(slotIndex + 1).padStart(2, "0")}`} /></div>)}</div>
      </div>
    </div>;
  };

  if (isLoading && !useGalleryWorldHome) {
    return <div className="w-full h-screen flex items-center justify-center bg-[#030305] text-white">
      <div className="text-center space-y-4">
        <div className="text-sm uppercase tracking-[0.4em] text-white/40">作品集加载中</div>
        <div className="text-xl text-white/80">{statusMessage}</div>
      </div>
    </div>;
  }

  const touchHandlers = isMobileFeedMode ? {} : {
    onTouchStart: (event) => {
      touchEndX.current = null;
      touchStartX.current = event.targetTouches[0].clientX;
    },
    onTouchMove: (event) => {
      touchEndX.current = event.targetTouches[0].clientX;
    },
    onTouchEnd: () => {
      if (!touchStartX.current || !touchEndX.current) return;
      const distance = touchStartX.current - touchEndX.current;
      if (distance > 50) changeSlide(Math.min(slidesData.length - 1, currentSlide + 1));
      if (distance < -50) changeSlide(Math.max(0, currentSlide - 1));
    }
  };

  const publishedSectionStyle = {
    scrollMarginTop: `${sectionScrollOffset}px`
  };
  const portfolioSizeToneClass = portfolioSizeTone === "danger" ? "text-rose-200 bg-rose-500/15 border-rose-300/20" : portfolioSizeTone === "warning" ? "text-amber-100 bg-amber-500/12 border-amber-300/20" : "text-emerald-100 bg-emerald-500/12 border-emerald-300/20";

  if (!IS_EDITOR_MODE || IS_PORTFOLIO_ADMIN_MODE) {
    return renderCuratedExperience();
  }

  return <div className={cx("relative min-h-screen w-full font-sans selection:bg-white/20", !useGalleryWorldHome && "select-none", isMobilePreviewMode && "portfolio-mobile", isMobilePortraitMode && "portfolio-mobile-portrait", isMobileLandscapeMode && "portfolio-mobile-landscape", IS_EDITOR_MODE && !useGalleryWorldHome && "portfolio-editor")} {...touchHandlers}>
    {!useGalleryWorldHome && <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className={`absolute -top-[16%] -left-[8%] h-[44%] w-[44%] ${currentTheme.a} rounded-full blur-[120px] opacity-90 transition-colors duration-700`} style={{ animation: isMobilePreviewMode ? "none" : "pulse-slow 10s infinite" }} />
      <div className={`absolute top-[24%] -right-[8%] h-[38%] w-[38%] ${currentTheme.b} rounded-full blur-[130px] opacity-85 transition-colors duration-700`} style={{ animation: isMobilePreviewMode ? "none" : "pulse-slow 13s infinite 1.8s" }} />
      <div className={`absolute -bottom-[22%] left-[24%] h-[46%] w-[46%] ${currentTheme.c} rounded-full blur-[120px] opacity-80 transition-colors duration-700`} style={{ animation: isMobilePreviewMode ? "none" : "pulse-slow 11s infinite 3.4s" }} />
    </div>}
    <div className="relative z-10">
      {useGalleryWorldHome ? null : <div className="portfolio-topbar sticky top-3 z-40 px-3">
        <div className={`portfolio-topbar-inner mx-auto flex w-full items-center justify-between gap-3 rounded-full border border-white/10 bg-[#111214]/82 px-4 py-2 text-xs text-white/75 shadow-2xl backdrop-blur-xl ${isMobileLandscapeMode ? "max-w-[1400px]" : "max-w-6xl"}`}>
          <div className="portfolio-topbar-actions flex flex-wrap items-center gap-2">
            <button onClick={() => goToSlide(0)} className="portfolio-touch-button rounded-full border border-white/10 px-3 py-1 hover:bg-white/10">首页</button>
            {hasTocSlide && <button onClick={goToTocSlide} className="portfolio-touch-button rounded-full border border-white/10 px-3 py-1 hover:bg-white/10">目录</button>}
          </div>
          <div className="portfolio-page-indicator hidden items-center gap-2 lg:flex">
            <span className="text-white/38">{siteMeta.siteTitle}</span>
            <span className="font-mono tracking-widest text-white/70">{String(currentSlide + 1).padStart(2, "0")}/{String(slidesData.length).padStart(2, "0")}</span>
          </div>
        </div>
      </div>}
      {IS_EDITOR_MODE && !useGalleryWorldHome && showStructureEditor && <div className="portfolio-structure-panel fixed right-4 top-20 z-[70] w-[min(92vw,440px)] overflow-hidden rounded-[28px] border border-white/10 bg-[#101114]/92 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
          <div>
            <div className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-200/65">作品集数据模型</div>
            <div className="mt-1 text-sm text-white/78">编辑 `meta` / `cases`，slide 可视化编辑保持不变。</div>
          </div>
          <button onClick={() => setShowStructureEditor(false)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/60 hover:bg-white/10">收起</button>
        </div>
        <div className="space-y-4 px-5 py-4">
          <div className={`rounded-2xl border px-4 py-3 text-sm ${portfolioSizeToneClass}`}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>运行时 JSON 估算体积：{formatBytes(portfolioByteSize)}</span>
              <span className="text-xs text-white/55">slides {slidesData.length} / cases {casesData.length}</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-white/45">meta.json</div>
              <button onClick={applyMetaEditorValue} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">应用</button>
            </div>
            <textarea value={metaEditorValue} onChange={(event) => { setMetaEditorValue(event.target.value); setMetaEditorError(""); }} className="min-h-[150px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-mono leading-6 text-white/82 outline-none" spellCheck={false} />
            {metaEditorError && <div className="text-xs text-rose-300">{metaEditorError}</div>}
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-xs font-mono uppercase tracking-[0.18em] text-white/45">cases.json</div>
              <button onClick={applyCasesEditorValue} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70 hover:bg-white/10">应用</button>
            </div>
            <textarea value={casesEditorValue} onChange={(event) => { setCasesEditorValue(event.target.value); setCasesEditorError(""); }} className="min-h-[240px] w-full rounded-2xl border border-white/10 bg-white/5 p-4 text-xs font-mono leading-6 text-white/82 outline-none" spellCheck={false} />
            {casesEditorError && <div className="text-xs text-rose-300">{casesEditorError}</div>}
          </div>
        </div>
      </div>}
      <div className={`portfolio-feed mx-auto flex w-full flex-col gap-4 px-3 pt-4 ${isMobileLandscapeMode ? "max-w-[1400px]" : "max-w-6xl"} ${IS_EDITOR_MODE ? "pb-28" : "pb-12"}`}>
        {slidesData.map((slide, index) => <section
          key={slide.id ?? index}
          ref={(node) => setSlideSectionRef(index, node)}
          data-slide-index={index}
          className="portfolio-section reveal-section relative overflow-hidden rounded-[28px] border border-white/10 bg-black/20 shadow-2xl backdrop-blur-md"
          style={publishedSectionStyle}
        >
          <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.035),transparent_18%,transparent_82%,rgba(255,255,255,0.025))] pointer-events-none" />
          {renderSlide(slide, index)}
        </section>)}
      </div>
    </div>
    {!useGalleryWorldHome && lightboxData && <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={closeMediaLightbox}>
      <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2 rounded-full hover:bg-white/10" onClick={closeMediaLightbox}>✕ 关闭</button>
      {lightboxData.meta && <div className="portfolio-lightbox-meta absolute bottom-6 left-1/2 -translate-x-1/2 max-w-3xl w-[90%] p-4 bg-black/60 border border-white/10 rounded-xl backdrop-blur text-sm text-cyan-200/80 font-mono" onClick={(event) => event.stopPropagation()}><span className="text-white/40 block mb-1 uppercase tracking-widest text-xs">生成说明 / 参数</span>{lightboxData.meta}</div>}
      {lightboxData.kind === "youtube" ? <iframe ref={lightboxVideoRef} src={withEmbedPlaybackParams(getYouTubeEmbedUrl(lightboxData.url), true)} title="YouTube player" className="w-full max-w-5xl aspect-video rounded-lg shadow-2xl border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onClick={(event) => event.stopPropagation()} /> : lightboxData.kind === "video" ? (() => {
        const preferDraftPreview = IS_EDITOR_MODE && Boolean(lightboxData.draftPreviewUrl);
        const streamPlayerUrl = getLightboxVideoPlayerUrl(lightboxData, { preferDraftPreview });
        if (streamPlayerUrl) return <iframe ref={lightboxVideoRef} src={`${streamPlayerUrl}?autoplay=true`} title="Cloudflare Stream player" className="w-full max-w-5xl aspect-video rounded-lg shadow-2xl border-0 bg-black" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onClick={(event) => event.stopPropagation()} />;
        const sourceVideoUrl = getSourceMediaUrl(lightboxData, { preferDraftPreview });
        const embedUrl = getVideoEmbedUrl(sourceVideoUrl);
        if (embedUrl && !isDirectVideoSource(sourceVideoUrl) && !isBilibiliVideoUrl(sourceVideoUrl) && !isBilibiliVideoUrl(embedUrl)) return <iframe ref={lightboxVideoRef} src={withEmbedPlaybackParams(embedUrl, true)} title="视频播放器" className="w-full max-w-5xl aspect-video rounded-lg shadow-2xl border-0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen onClick={(event) => event.stopPropagation()} />;
        if (!isDirectVideoSource(sourceVideoUrl)) return <a href={sourceVideoUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-sm text-cyan-100 hover:bg-cyan-500/20" onClick={(event) => event.stopPropagation()}><Icon name="ExternalLink" size={16} /> 打开视频链接</a>;
        return <video ref={lightboxVideoRef} src={sourceVideoUrl} poster={lightboxData.poster || lightboxData.delivery?.thumbnailUrl || undefined} controls autoPlay playsInline preload="auto" className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(event) => event.stopPropagation()} />;
      })() : <img src={getDisplayUrl(lightboxData, { preferDraftPreview: IS_EDITOR_MODE && Boolean(lightboxData.draftPreviewUrl) })} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" onClick={(event) => event.stopPropagation()} />}
    </div>}
    {IS_EDITOR_MODE && !useGalleryWorldHome && (isMobilePreviewMode ? <>
      <div className="portfolio-editor-dock portfolio-editor-dock-mobile fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1A]/84 px-4 py-3 shadow-2xl backdrop-blur-3xl">
        {hasTocSlide && <button onClick={goToTocSlide} className="p-2 text-white/55 hover:text-white hover:bg-white/10 rounded-full transition-all" title="目录"><Icon name="Home" size={18} /></button>}
        <button onClick={() => goToSlide(Math.max(0, currentSlide - 1))} className={`p-2 rounded-full transition-all ${currentSlide === 0 ? "text-white/20" : "text-white/70 hover:text-white hover:bg-white/10"}`} title="上一页"><Icon name="ChevronLeft" size={20} /></button>
        {isPageJumpEditing ? <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
          <input ref={pageJumpInputRef} type="text" inputMode="numeric" value={pageJumpValue} onChange={(event) => setPageJumpValue(event.target.value.replace(/[^\d]/g, "").slice(0, 3))} onBlur={submitPageJump} onKeyDown={(event) => {
            if (event.key === "Enter") { event.preventDefault(); submitPageJump(); }
            if (event.key === "Escape") { event.preventDefault(); setIsPageJumpEditing(false); setPageJumpValue(String(currentSlide + 1)); }
          }} className="w-9 bg-transparent text-center text-xs font-mono font-bold tracking-widest text-white outline-none" />
          <span className="text-[11px] font-mono tracking-widest text-white/35">/ {String(slidesData.length).padStart(2, "0")}</span>
        </div> : <button onClick={() => setIsPageJumpEditing(true)} className="rounded-full px-2 py-1 text-xs font-mono tracking-widest text-white/80 font-bold hover:bg-white/10" title="点击输入页码跳转">
          {String(currentSlide + 1).padStart(2, "0")}<span className="text-white/20 mx-1">/</span>{String(slidesData.length).padStart(2, "0")}
        </button>}
        <button onClick={() => goToSlide(Math.min(slidesData.length - 1, currentSlide + 1))} className={`p-2 rounded-full transition-all ${currentSlide === slidesData.length - 1 ? "text-white/20" : "text-white/70 hover:text-white hover:bg-white/10"}`} title="下一页"><Icon name="ChevronRight" size={20} /></button>
        <button onClick={() => setShowMobileMoreMenu((value) => !value)} className={`p-2 rounded-full transition ${showMobileMoreMenu ? "bg-white text-black" : "text-white/70 hover:bg-white/10 hover:text-white"}`} title="更多操作"><Icon name="MoreHorizontal" size={20} /></button>
        <div className={`h-2.5 w-2.5 shrink-0 rounded-full ${loadSource.includes("draft") ? "bg-emerald-400" : "bg-cyan-400"}`} title={statusMessage} />
      </div>
      {showMobileMoreMenu && <div className="portfolio-mobile-more-panel fixed z-[60] border border-white/10 bg-[#111214]/94 shadow-2xl backdrop-blur-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <span className="text-xs font-mono uppercase tracking-[0.22em] text-cyan-100/70">编辑操作</span>
          <button onClick={() => setShowMobileMoreMenu(false)} className="rounded-full border border-white/10 px-3 py-1 text-xs text-white/70">关闭</button>
        </div>
        <div className="grid gap-2 p-3">
          <button onClick={() => { setShowStructureEditor((value) => !value); setShowMobileMoreMenu(false); }} className="portfolio-mobile-menu-button"><Icon name="FileJson" size={16} /> 编辑 meta / cases</button>
          <button onClick={() => moveCurrentSlide(-1)} disabled={currentSlide <= 0} className="portfolio-mobile-menu-button"><Icon name="ArrowUp" size={16} /> 上移当前页</button>
          <button onClick={() => moveCurrentSlide(1)} disabled={currentSlide >= slidesData.length - 1} className="portfolio-mobile-menu-button"><Icon name="ArrowDown" size={16} /> 下移当前页</button>
          {slidesData[currentSlide]?.type !== "free-layout" && <button onClick={() => adjustCurrentSlideSlots(1)} className="portfolio-mobile-menu-button"><Icon name="Plus" size={16} /> 增加媒体框</button>}
          {slidesData[currentSlide]?.type !== "free-layout" && <button onClick={() => adjustCurrentSlideSlots(-1)} className="portfolio-mobile-menu-button"><Icon name="Trash2" size={16} /> 减少媒体框</button>}
          {slidesData[currentSlide]?.type === "split" && <button onClick={() => adjustCurrentTextBlocks(1)} className="portfolio-mobile-menu-button"><Icon name="Plus" size={16} /> 增加文本框</button>}
          {slidesData[currentSlide]?.type === "split" && <button onClick={() => adjustCurrentTextBlocks(-1)} className="portfolio-mobile-menu-button"><Icon name="Trash2" size={16} /> 减少文本框</button>}
          {slidesData[currentSlide]?.type === "free-layout" && <button onClick={() => addFreeLayoutElement("text")} className="portfolio-mobile-menu-button"><Icon name="Plus" size={16} /> 添加文本框</button>}
          {slidesData[currentSlide]?.type === "free-layout" && <button onClick={() => addFreeLayoutElement("media")} className="portfolio-mobile-menu-button"><Icon name="UploadCloud" size={16} /> 添加媒体框</button>}
          <div className="my-1 h-px bg-white/10" />
          {[
            ["split", "左文右图", "LayoutTemplate"],
            ["free-layout", "自由布局", "Maximize2"],
            ["full-media", "全屏巨幕", "Maximize"],
            ["compare-slider", "双栏对比", "Sliders"],
            ["gallery-2", "双图展示", "Grid"],
            ["gallery-3", "三图展示", "Grid"],
            ["gallery-4", "四图展示", "Grid"]
          ].map(([layout, label, icon]) => <button key={layout} onClick={() => addSlide(layout)} className="portfolio-mobile-menu-button"><Icon name={icon} size={16} /> {label}</button>)}
          <div className="my-1 h-px bg-white/10" />
          <button onClick={() => { importInputRef.current && importInputRef.current.click(); setShowMobileMoreMenu(false); }} className="portfolio-mobile-menu-button"><Icon name="UploadCloud" size={16} /> 导入 JSON</button>
          <button onClick={() => { resetDraft(); setShowMobileMoreMenu(false); }} className="portfolio-mobile-menu-button"><Icon name="RotateCcw" size={16} /> 重置草稿</button>
          <button onClick={() => { exportDraft(); setShowMobileMoreMenu(false); }} className="portfolio-mobile-menu-button"><Icon name="Download" size={16} /> 导出 JSON</button>
          {IS_PORTFOLIO_ADMIN_MODE && <button onClick={() => { publishPortfolioJson(); setShowMobileMoreMenu(false); }} disabled={isPublishingPortfolio || !canWriteAssets} title={!canWriteAssets ? assetCapabilityReason : ""} className="portfolio-mobile-menu-button text-emerald-100"><Icon name="Save" size={16} /> {isPublishingPortfolio ? "保存中..." : "保存到代码仓库"}</button>}
          <button onClick={deleteCurrentSlide} className="portfolio-mobile-menu-button text-red-200"><Icon name="Trash2" size={16} /> 删除当前页</button>
        </div>
      </div>}
    </> : <div className="portfolio-editor-dock fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full border border-white/10 bg-[#1A1A1A]/84 px-4 py-3 shadow-2xl backdrop-blur-3xl">
      {hasTocSlide && <button onClick={goToTocSlide} className="p-2 text-white/40 hover:text-white hover:bg-white/10 rounded-full transition-all"><Icon name="Home" size={18} /></button>}
      {hasTocSlide && <div className="w-[1px] h-4 bg-white/10 mx-1" />}
      <button onClick={() => goToSlide(Math.max(0, currentSlide - 1))} className={`p-2 rounded-full transition-all ${currentSlide === 0 ? "text-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}><Icon name="ChevronLeft" size={20} /></button>
      {isPageJumpEditing ? <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1">
        <input
          ref={pageJumpInputRef}
          type="text"
          inputMode="numeric"
          value={pageJumpValue}
          onChange={(event) => setPageJumpValue(event.target.value.replace(/[^\d]/g, "").slice(0, 3))}
          onBlur={submitPageJump}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              submitPageJump();
            }
            if (event.key === "Escape") {
              event.preventDefault();
              setIsPageJumpEditing(false);
              setPageJumpValue(String(currentSlide + 1));
            }
          }}
          className="w-9 bg-transparent text-center text-xs font-mono font-bold tracking-widest text-white outline-none"
        />
        <span className="text-[11px] font-mono tracking-widest text-white/35">/ {String(slidesData.length).padStart(2, "0")}</span>
      </div> : <button onClick={() => setIsPageJumpEditing(true)} className="rounded-full px-2 py-1 text-xs font-mono tracking-widest text-white/80 font-bold hover:bg-white/10" title="点击输入页码跳转">
        {String(currentSlide + 1).padStart(2, "0")}<span className="text-white/20 mx-1">/</span>{String(slidesData.length).padStart(2, "0")}
      </button>}
      <button onClick={() => goToSlide(Math.min(slidesData.length - 1, currentSlide + 1))} className={`p-2 rounded-full transition-all ${currentSlide === slidesData.length - 1 ? "text-white/10" : "text-white/60 hover:text-white hover:bg-white/10"}`}><Icon name="ChevronRight" size={20} /></button>
      <div className="w-[1px] h-4 bg-white/10 mx-1" />
      <button onClick={() => setShowStructureEditor((value) => !value)} className={`rounded-full p-2 transition ${showStructureEditor ? "bg-cyan-500 text-black" : "text-white/65 hover:bg-white/10 hover:text-white"}`} title="编辑 meta / cases"><Icon name="FileJson" size={16} /></button>
      <button onClick={deleteCurrentSlide} className={`p-2 rounded-full ${slidesData.length <= 1 ? "text-red-400/20" : "text-red-400/40 hover:text-red-400 hover:bg-red-400/10"}`}><Icon name="Trash2" size={16} /></button>
      <div className="relative">
        <button onClick={() => setShowAddMenu(!showAddMenu)} className={`p-2 rounded-full ${showAddMenu ? "bg-white text-black" : "text-white/60 hover:text-white hover:bg-white/20"}`}><Icon name="Plus" size={18} /></button>
        {showAddMenu && <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-4 w-52 bg-[#1A1A1A]/90 backdrop-blur-xl border border-white/10 rounded-xl flex flex-col p-1.5 z-50 h-[24rem] overflow-y-auto">
          <span className="text-[10px] text-white/30 px-3 py-1 uppercase tracking-widest text-center">当前页面</span>
          <button onClick={() => moveCurrentSlide(-1)} disabled={currentSlide <= 0} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${currentSlide <= 0 ? "text-white/20 cursor-not-allowed" : "text-white/70 hover:bg-white/10"}`}><Icon name="ArrowUp" size={14} /> 上移当前页</button>
          <button onClick={() => moveCurrentSlide(1)} disabled={currentSlide >= slidesData.length - 1} className={`flex items-center gap-3 px-3 py-2 text-sm rounded-lg ${currentSlide >= slidesData.length - 1 ? "text-white/20 cursor-not-allowed" : "text-white/70 hover:bg-white/10"}`}><Icon name="ArrowDown" size={14} /> 下移当前页</button>
          {slidesData[currentSlide]?.type !== "free-layout" && <button onClick={() => adjustCurrentSlideSlots(1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Plus" size={14} /> 增加媒体框</button>}
          {slidesData[currentSlide]?.type !== "free-layout" && <button onClick={() => adjustCurrentSlideSlots(-1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Trash2" size={14} /> 减少媒体框</button>}
          {slidesData[currentSlide]?.type === "split" && <button onClick={() => adjustCurrentTextBlocks(1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Plus" size={14} /> 增加文本框</button>}
          {slidesData[currentSlide]?.type === "split" && <button onClick={() => adjustCurrentTextBlocks(-1)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Trash2" size={14} /> 减少文本框</button>}
          {slidesData[currentSlide]?.type === "free-layout" && <button onClick={() => addFreeLayoutElement("text")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Plus" size={14} /> 添加文本框</button>}
          {slidesData[currentSlide]?.type === "free-layout" && <button onClick={() => addFreeLayoutElement("media")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="UploadCloud" size={14} /> 添加媒体框</button>}
          <div className="w-full h-[1px] bg-white/10 my-1" />
          <span className="text-[10px] text-white/30 px-3 py-1 uppercase tracking-widest text-center">选择模板</span>
          <button onClick={() => addSlide("split")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="LayoutTemplate" size={14} /> 左文右图</button>
          <button onClick={() => addSlide("free-layout")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Maximize2" size={14} /> 自由布局</button>
          <button onClick={() => addSlide("full-media")} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Maximize" size={14} /> 全屏巨幕</button>
          <button onClick={() => addSlide("compare-slider")} className="flex items-center gap-3 px-3 py-2 text-sm text-cyan-400 hover:bg-cyan-500/20 rounded-lg font-bold"><Icon name="Sliders" size={14} /> 双栏对比</button>
          <div className="w-full h-[1px] bg-white/10 my-1" />
          {[
            ["gallery-2", "双图展示"],
            ["gallery-3", "三图展示"],
            ["gallery-4", "四图展示"],
            ["gallery-6", "六图展示"],
            ["gallery-8", "八图展示"],
            ["gallery-9", "九宫格展示"]
          ].map(([layout, label]) => <button key={layout} onClick={() => addSlide(layout)} className="flex items-center gap-3 px-3 py-2 text-sm text-white/70 hover:bg-white/10 rounded-lg"><Icon name="Grid" size={14} /> {label}</button>)}
        </div>}
      </div>
      <button onClick={() => importInputRef.current && importInputRef.current.click()} className="p-2 text-white/65 hover:text-white hover:bg-white/10 rounded-full" title="导入 JSON"><Icon name="UploadCloud" size={16} /></button>
      <button onClick={resetDraft} className="p-2 text-white/65 hover:text-white hover:bg-white/10 rounded-full" title="重置草稿"><Icon name="RotateCcw" size={16} /></button>
      <button onClick={exportDraft} className="p-2 text-cyan-300/80 hover:text-cyan-200 hover:bg-cyan-500/20 rounded-full" title="导出 JSON"><Icon name="Download" size={16} /></button>
      {IS_PORTFOLIO_ADMIN_MODE && <button onClick={publishPortfolioJson} disabled={isPublishingPortfolio || !canWriteAssets} className={`p-2 rounded-full transition ${isPublishingPortfolio || !canWriteAssets ? "text-emerald-100/35" : "text-emerald-200/85 hover:bg-emerald-500/20 hover:text-emerald-100"}`} title={!canWriteAssets ? assetCapabilityReason : isPublishingPortfolio ? "正在保存到代码仓库" : "保存作品集数据到代码仓库"}><Icon name="Save" size={16} /></button>}
      <div className={`h-2.5 w-2.5 rounded-full ${loadSource.includes("draft") ? "bg-emerald-400" : "bg-cyan-400"}`} title={statusMessage} />
    </div>)}
    {IS_EDITOR_MODE && !useGalleryWorldHome && <input ref={importInputRef} type="file" accept=".json,application/json" className="hidden" onChange={importDraft} />}
    {IS_EDITOR_MODE && !useGalleryWorldHome && <div className="fixed top-0 left-0 w-full h-[2px] bg-white/[0.02] z-50"><div className={`h-full ${currentTheme.line} transition-all duration-500 ease-out`} style={{ width: `${((currentSlide + 1) / slidesData.length) * 100}%` }} /></div>}
    {showAssetManager && IS_EDITOR_MODE && !useGalleryWorldHome && (() => {
      const searchKeyword = String(assetSearch || "").trim().toLowerCase();
      const visibleAssets = assetLibrary
        .filter((item) => {
          if (assetFilter === "all") return true;
          if (assetFilter === "uploaded" && !item?.isUploaded) return false;
          if (assetFilter === "image" && item?.kind !== "image") return false;
          if (assetFilter === "video" && item?.kind !== "video") return false;
          return true;
        })
        .filter((item) => {
          if (!searchKeyword) return true;
          const value = `${item?.name || ""} ${item?.path || ""} ${item?.url || ""}`.toLowerCase();
          return value.includes(searchKeyword);
        });
      const readableSize = (value) => {
        const size = Number(value || 0);
        if (!Number.isFinite(size) || size <= 0) return "0 B";
        if (size >= 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
        if (size >= 1024) return `${(size / 1024).toFixed(1)} KB`;
        return `${size} B`;
      };
      return <div className="fixed inset-0 z-[65] flex items-start justify-center bg-black/85 backdrop-blur-lg p-4 sm:p-6 overflow-y-auto" onClick={closeAssetManager}>
        <div className="relative w-full max-w-5xl bg-[#0d1116] border border-white/10 rounded-2xl shadow-2xl" onClick={(event) => event.stopPropagation()}>
          <div className="sticky top-0 z-10 border-b border-white/10 bg-[#0d1116]/95 rounded-t-2xl px-4 py-3 sm:px-6">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white">素材库管理</h3>
                <p className="text-xs text-white/55">选择素材后可直接替换当前媒体位，或复制路径用于手工粘贴。</p>
              </div>
              <button type="button" onClick={closeAssetManager} className="rounded-full border border-white/10 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10">关闭</button>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/70">
              <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-1">当前分支：{assetLibraryBranch || "unknown"}</span>
              <span className="inline-flex items-center rounded-full border border-white/15 px-2.5 py-1">目标：{assetManagerTarget ? `${assetManagerTarget.label || "媒体位"}` : "仅复制路径"}</span>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input value={assetSearch} onChange={(event) => setAssetSearch(event.target.value)} placeholder="搜索文件名/路径" className="w-full sm:w-64 rounded-xl border border-white/15 bg-white/5 text-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-cyan-300/40" />
              <button type="button" onClick={loadPortfolioAssets} disabled={!canListAssets || isAssetLibraryLoading} title={canListAssets ? "刷新素材库" : assetCapabilityReason} className="rounded-xl border border-cyan-300/20 bg-cyan-500/10 text-cyan-100 px-3 py-2 hover:bg-cyan-500/20 text-sm disabled:opacity-60">刷新</button>
              <div className="ml-auto flex items-center gap-2">
                {["all", "uploaded", "image", "video"].map((filter) => <button
                  type="button"
                  key={filter}
                  onClick={() => setAssetFilter(filter)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${assetFilter === filter ? "border-cyan-300/40 bg-cyan-500/20 text-cyan-100" : "border-white/15 text-white/70 hover:bg-white/10"}`}>
                  {filter === "all" ? "全部" : filter === "uploaded" ? "仅可删" : filter === "image" ? "图片" : "视频"}
                </button>)}
              </div>
            </div>
            <div className="mt-2 text-[11px] text-white/50">{assetLibraryStatus || adminCapabilityStatus || "已就绪"}，共 {visibleAssets.length} 项</div>
            {assetDiagnostics?.diagnostics?.length ? <div className="mt-2 grid gap-1 text-[11px] text-white/45">
              {assetDiagnostics.diagnostics.slice(0, 4).map((item) => <span key={`${item.code}-${item.message}`} className={item.level === "error" ? "text-rose-300/80" : item.level === "warn" ? "text-amber-200/80" : "text-cyan-100/65"}>{item.message}</span>)}
            </div> : null}
          </div>
          <div className="max-h-[62vh] overflow-auto divide-y divide-white/10">
            {visibleAssets.length === 0 && <div className="p-6 text-sm text-white/60">当前过滤条件下暂无素材。</div>}
            {visibleAssets.map((asset, assetIndex) => {
              const assetPath = normalizeRepoMediaPath(asset?.path || asset?.url || "");
              const references = Array.isArray(asset?.references) ? asset.references : [];
              const hasReferences = references.length > 0;
              return <div key={assetPath || `asset-${assetIndex}`} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-start gap-3">
                  <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-cyan-400/80" />
                  <div className="min-w-0">
                    <div className="text-sm text-white font-mono break-all">{asset?.name || assetPath || "未命名素材"}</div>
                    <div className="text-xs text-white/55 break-all">
                      {assetPath || "路径为空"}
                      <span className="ml-2 inline-flex rounded-full border border-white/15 px-2 py-0.5">{asset?.kind || "image"}</span>
                      <span className="ml-2 text-white/45">{readableSize(asset?.size)}</span>
                      {asset?.isUploaded ? <span className="ml-2 text-emerald-200/80">可删除</span> : <span className="ml-2 text-white/35">仅预览</span>}
                      {asset?.inGalleryLibrary ? <span className="ml-2 text-cyan-200/80">素材库引用</span> : null}
                    </div>
                    {hasReferences && <div className="text-[11px] text-white/45">引用来源：{references.map((entry) => entry?.source).filter(Boolean).slice(0, 3).join("；")}{references.length > 3 ? `；等 ${references.length - 3} 项` : ""}</div>}
                    {asset?.deleteBlockedReason ? <div className="text-[11px] text-rose-300/80">{asset.deleteBlockedReason}</div> : null}
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button type="button" onClick={() => copyAssetPath(asset)} className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-white/75 hover:bg-white/10"><Icon name="Copy" size={12} /> 复制</button>
                  <button type="button" onClick={() => useAssetForTarget(asset)} disabled={assetManagerTarget ? (!canWriteAssets || isApplyingAsset) : false} title={assetManagerTarget && !canWriteAssets ? assetCapabilityReason : ""} className={`rounded-full border px-3 py-1.5 text-xs disabled:opacity-60 ${assetManagerTarget ? "border-cyan-300/30 bg-cyan-500/15 text-cyan-100 hover:bg-cyan-500/25" : "border-white/15 text-white/75 hover:bg-white/10"}`}>
                    <Icon name="UploadCloud" size={12} /> {assetManagerTarget ? (isApplyingAsset ? "保存中..." : "替换上线") : "复制路径"}
                  </button>
                  {asset?.canDelete && <button type="button" onClick={() => deletePortfolioAsset(asset)} disabled={!canDeleteAssets || deletingAssetPath === assetPath} title={canDeleteAssets ? "删除未引用上传素材" : assetCapabilityReason} className="rounded-full border border-rose-300/25 bg-rose-500/10 px-3 py-1.5 text-xs text-rose-100 hover:bg-rose-500/20 disabled:opacity-60">{deletingAssetPath === assetPath ? "删除中..." : "删除"}</button>}
                </div>
              </div>;
            })}
          </div>
        </div>
      </div>;
    })()}
  </div>;
}

const root = createRoot(document.getElementById("root"));
root.render(
  USE_GALLERY_WORLD_HOME && (!IS_EDITOR_MODE || IS_PORTFOLIO_ADMIN_MODE)
    ? <GalleryWorldHome admin={IS_PORTFOLIO_ADMIN_MODE} />
    : <App />
);
