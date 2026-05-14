import path from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir } from "node:fs/promises";
import sharp from "sharp";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const outputDir = path.join(repoRoot, "images", "curated", "ecommerce");

const suites = [
  {
    slug: "earbuds",
    source: "images/curated/case-product-earbuds-black-rock.webp",
    title: "黑色耳机",
    category: "产品广告详情套图",
    accent: "#66d9ff",
    warm: "#e3c979",
    pages: [
      ["主视觉", "黑色耳机英雄图", "暗调岩石场景强化产品结构、金属高光和新品发布气质。"],
      ["核心卖点", "清晰主体与高级光影", "用低饱和背景承托产品轮廓，适合电商首屏与品牌 KV。"],
      ["材质细节", "耳机曲面与光泽控制", "从主体图中提取局部细节，强调硬朗材质、边缘反光和科技感。"],
      ["场景氛围", "暗场景产品陈列", "保留原有黑金光影和岩石质感，形成可延展的产品页氛围。"],
      ["系列延展", "主图 / 详情 / 社媒统一", "同一商品图可拆分为首图、细节图和社媒封面，减少视觉跳变。"],
      ["收尾展示", "可交付电商视觉资产", "围绕产品主体输出一组可用于新品发布和详情页的视觉页面。"]
    ]
  },
  {
    slug: "beauty",
    source: "images/curated/case-beauty-foundation-live.webp",
    title: "美妆人像",
    category: "美妆产品海报套图",
    accent: "#ffd7e5",
    warm: "#bfefff",
    pages: [
      ["主视觉", "人像与产品同框", "保留直播补光场景，突出人物肤质、产品露出和干净广告氛围。"],
      ["核心卖点", "肤感、光泽与使用场景", "围绕美妆产品的真实使用语境组织卖点，而不是孤立展示单品。"],
      ["材质细节", "瓶身、妆面和补光层次", "通过局部裁切展示产品质感、肤质细节和画面洁净度。"],
      ["场景氛围", "直播与社媒转化画面", "适合直播封面、种草图和产品海报的多平台视觉延展。"],
      ["系列延展", "人像主图到产品卡片", "同一参考图拆解成主图、细节图和卖点图，保持人物与产品一致。"],
      ["收尾展示", "美妆广告视觉交付", "形成从主视觉到详情说明的完整美妆产品页面节奏。"]
    ]
  },
  {
    slug: "brand-space",
    source: "images/curated/case-brand-ice-city-space.webp",
    title: "冰蓝未来城市",
    category: "品牌空间视觉套图",
    accent: "#7bdcff",
    warm: "#d8f7ff",
    pages: [
      ["主视觉", "冰蓝未来城市空间", "以完整场景建立品牌调性，不伪装成具体 SKU 商品详情页。"],
      ["核心卖点", "科技感、空间感与品牌气质", "通过冷调建筑、玻璃材质和远景透视表达未来品牌空间。"],
      ["材质细节", "玻璃、冰晶与冷光结构", "从场景图中拆解空间材质和光影层次，服务品牌视觉延展。"],
      ["场景氛围", "沉浸式品牌空间", "保留城市远景与建筑入口，适合展览、发布会和空间海报。"],
      ["系列延展", "海报 / 展台 / KV 统一", "同一场景可以拆成品牌 KV、社媒封面和空间视觉说明页。"],
      ["收尾展示", "可复用的场景视觉资产", "以统一色彩和空间语言完成品牌世界观视觉整理。"]
    ]
  },
  {
    slug: "fragrance",
    source: "images/curated/case-fragrance-giftbox-set.webp",
    title: "香氛礼盒",
    category: "包装陈列详情套图",
    accent: "#f2c878",
    warm: "#ffd7a3",
    pages: [
      ["主视觉", "香氛礼盒包装陈列", "黑金礼盒、瓶身和道具组合形成高端礼赠主图。"],
      ["核心卖点", "礼赠感、层次与品牌调性", "用包装结构和环境光影表达节日礼盒的商业价值。"],
      ["材质细节", "瓶身、礼盒与金色反光", "从主体图中提取包装边缘、瓶身高光和道具层次。"],
      ["场景氛围", "高端香氛礼赠场景", "暗调背景和暖金灯光强化香氛产品的高级陈列感。"],
      ["系列延展", "主图 / 礼盒页 / 社媒封面", "同一礼盒视觉可拆分为产品页、节日海报和推广素材。"],
      ["收尾展示", "包装视觉交付能力", "形成从主视觉到详情说明的一组香氛礼盒视觉页面。"]
    ]
  }
];

const escapeXml = (value = "") => String(value)
  .replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;");

const splitText = (value, limit = 18) => {
  const chars = Array.from(String(value || ""));
  const lines = [];
  for (let index = 0; index < chars.length; index += limit) {
    lines.push(chars.slice(index, index + limit).join(""));
  }
  return lines;
};

const textLines = (value, x, y, options = {}) => {
  const {
    className = "body",
    limit = 18,
    lineHeight = 34,
    maxLines = 3
  } = options;
  return splitText(value, limit).slice(0, maxLines).map((line, index) =>
    `<text x="${x}" y="${y + index * lineHeight}" class="${className}">${escapeXml(line)}</text>`
  ).join("");
};

const svgOverlay = (suite, page, pageNumber) => {
  const [kicker, title, body] = page;
  const footer = `${String(pageNumber).padStart(2, "0")} / 06`;
  return Buffer.from(`
    <svg width="1200" height="1600" viewBox="0 0 1200 1600" xmlns="http://www.w3.org/2000/svg">
      <style>
        .eyebrow { fill: ${suite.accent}; font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; font-size: 24px; font-weight: 800; letter-spacing: 3px; }
        .title { fill: #f6fbff; font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; font-size: 54px; font-weight: 900; letter-spacing: 0; }
        .body { fill: rgba(230, 242, 250, 0.86); font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; font-size: 29px; font-weight: 600; letter-spacing: 0; }
        .small { fill: rgba(198, 218, 232, 0.72); font-family: "Microsoft YaHei", "PingFang SC", Arial, sans-serif; font-size: 22px; font-weight: 700; letter-spacing: 2px; }
      </style>
      <rect x="54" y="54" width="1092" height="1492" rx="34" fill="rgba(3, 8, 13, 0.38)" stroke="rgba(255,255,255,0.14)" stroke-width="2"/>
      <rect x="88" y="1048" width="1024" height="344" rx="26" fill="rgba(3, 8, 13, 0.76)" stroke="${suite.accent}" stroke-opacity="0.32"/>
      <text x="118" y="1116" class="eyebrow">${escapeXml(suite.category)} · ${escapeXml(kicker)}</text>
      ${textLines(title, 118, 1194, { className: "title", limit: 14, lineHeight: 64, maxLines: 2 })}
      ${textLines(body, 118, 1320, { className: "body", limit: 23, lineHeight: 42, maxLines: 3 })}
      <text x="960" y="1490" class="small">${escapeXml(footer)}</text>
      <text x="88" y="1490" class="small">${escapeXml(suite.title)}</text>
    </svg>
  `);
};

const makeImage = async (suite, page, pageNumber) => {
  const sourcePath = path.join(repoRoot, suite.source);
  const outputPath = path.join(outputDir, `suite-${suite.slug}-${String(pageNumber).padStart(2, "0")}.webp`);
  const topImage = await sharp(sourcePath)
    .resize(1024, 900, { fit: "cover", position: pageNumber === 3 ? "centre" : "attention" })
    .webp({ quality: 90 })
    .toBuffer();
  const blurred = await sharp(sourcePath)
    .resize(1200, 1600, { fit: "cover", position: "attention" })
    .blur(18)
    .modulate({ brightness: 0.48, saturation: 0.8 })
    .webp({ quality: 80 })
    .toBuffer();
  const leftDetail = await sharp(sourcePath).resize(310, 380, { fit: "cover", position: "left" }).webp({ quality: 88 }).toBuffer();
  const centerDetail = await sharp(sourcePath).resize(310, 380, { fit: "cover", position: "centre" }).webp({ quality: 88 }).toBuffer();
  const rightDetail = await sharp(sourcePath).resize(310, 380, { fit: "cover", position: "right" }).webp({ quality: 88 }).toBuffer();

  const composites = [
    { input: blurred, left: 0, top: 0 },
    { input: Buffer.from(`<svg width="1200" height="1600"><rect width="1200" height="1600" fill="rgba(3,8,13,0.44)"/><rect x="64" y="76" width="1072" height="942" rx="34" fill="rgba(255,255,255,0.045)" stroke="rgba(255,255,255,0.12)" stroke-width="2"/></svg>`), left: 0, top: 0 }
  ];

  if (pageNumber === 3 || pageNumber === 5) {
    composites.push(
      { input: leftDetail, left: 96, top: 170 },
      { input: centerDetail, left: 445, top: 170 },
      { input: rightDetail, left: 794, top: 170 },
      { input: topImage, left: 88, top: 590 }
    );
  } else {
    composites.push({ input: topImage, left: 88, top: 112 });
  }

  composites.push({ input: svgOverlay(suite, page, pageNumber), left: 0, top: 0 });

  await sharp({
    create: {
      width: 1200,
      height: 1600,
      channels: 4,
      background: "#03080d"
    }
  })
    .composite(composites)
    .webp({ quality: 88 })
    .toFile(outputPath);
};

await mkdir(outputDir, { recursive: true });

for (const suite of suites) {
  for (let index = 0; index < suite.pages.length; index += 1) {
    await makeImage(suite, suite.pages[index], index + 1);
  }
}

console.log(`[ecommerce-suite-assets] Generated ${suites.length * 6} images in ${path.relative(repoRoot, outputDir)}`);
