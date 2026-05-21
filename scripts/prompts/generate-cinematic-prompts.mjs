import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");
const stamp = "2026-05-21";

const variableKeys = [
  "{{subject}}",
  "{{scene}}",
  "{{mood}}",
  "{{clothing}}",
  "{{lighting}}",
  "{{camera}}",
  "{{aspectRatio}}",
  "{{style}}"
];

const cinematicSeo = [
  "AI 影视提示词",
  "电影感提示词",
  "Midjourney 电影提示词",
  "Runway 视频提示词",
  "Veo 视频提示词",
  "可灵提示词",
  "即梦提示词",
  "图生视频提示词",
  "文生视频提示词",
  "单人图片提示词",
  "多人图片提示词",
  "九宫格提示词",
  "分镜提示词",
  "短剧封面提示词",
  "抖音 AI 视频提示词"
];

const negativePrompt = [
  "low quality",
  "blurry face",
  "distorted eyes",
  "extra fingers",
  "bad hands",
  "duplicate person",
  "plastic skin",
  "over-smoothed face",
  "cartoonish",
  "messy background",
  "unreadable text",
  "watermark",
  "logo",
  "deformed body",
  "unnatural expression",
  "inconsistent identity",
  "extra limbs",
  "protected IP character",
  "celebrity likeness"
].join(", ");

const contentMeta = {
  "single-person-image": {
    category: "影视提示词 / 单人图片",
    icon: "单人",
    modality: "图像",
    use: "电影感单人肖像",
    subjectCount: "single",
    gridType: "single"
  },
  "multi-person-image": {
    category: "影视提示词 / 多人图片",
    icon: "多人",
    modality: "图像",
    use: "影视多人关系画面",
    subjectCount: "group",
    gridType: "single"
  },
  "single-panel-image": {
    category: "影视提示词 / 单宫格图片",
    icon: "单格",
    modality: "图像",
    use: "单张电影海报与剧照",
    subjectCount: "single",
    gridType: "single"
  },
  "multi-panel-image": {
    category: "影视提示词 / 多宫格图片",
    icon: "宫格",
    modality: "图像",
    use: "多宫格分镜与角色海报",
    subjectCount: "group",
    gridType: "storyboard"
  },
  "text-to-video": {
    category: "影视提示词 / 文生视频",
    icon: "视频",
    modality: "视频",
    use: "文生视频电影镜头",
    subjectCount: "single",
    gridType: "single"
  },
  "image-to-video": {
    category: "影视提示词 / 图生视频",
    icon: "图生",
    modality: "视频",
    use: "图生视频运动控制",
    subjectCount: "single",
    gridType: "single"
  },
  storyboard: {
    category: "影视提示词 / 多镜头分镜",
    icon: "分镜",
    modality: "视频",
    use: "多镜头分镜脚本",
    subjectCount: "group",
    gridType: "storyboard"
  }
};

const models = [
  ["universal", "通用中文"],
  ["midjourney", "Midjourney"],
  ["stable-diffusion", "Stable Diffusion / SDXL"],
  ["runway", "Runway"],
  ["veo", "Google Veo"],
  ["kling", "可灵 Kling"],
  ["seedance", "即梦 / Seedance"]
];

const aspects = ["9:16", "16:9", "21:9", "3:4", "1:1", "2:3", "2.39:1"];
const shotSizes = ["半身近景", "中景", "近景", "特写", "全景", "大远景", "双人镜头 two-shot", "过肩镜头 over-the-shoulder"];
const angles = ["平视", "低角度", "高角度", "俯拍", "仰拍", "侧面轮廓", "背影", "镜中反射", "门框构图"];
const movements = ["静态镜头 locked camera", "缓慢推进 slow dolly in", "缓慢拉远 slow pull back", "横向跟拍 tracking shot", "手持纪实 handheld", "环绕镜头 orbit shot", "移焦 rack focus", "长镜头 one take"];
const lights = ["低调光", "霓虹灯", "黄金时刻", "蓝调时刻", "逆光", "侧逆光", "伦勃朗光", "烛光", "雨夜反光", "体积光"];
const colors = ["电影胶片", "35mm film", "冷暖对比", "低饱和", "复古港风", "暗黑悬疑", "暖色治愈", "日系清新", "赛博霓虹", "黑白电影"];
const moods = ["孤独", "紧张", "悬疑", "压迫", "浪漫", "治愈", "悲伤", "宏大", "梦幻", "疏离感", "重逢", "告别", "克制"];

const singleTitles = [
  "电影剧照单人肖像",
  "女性角色定妆照",
  "男性角色定妆照",
  "古风人物",
  "武侠人物",
  "赛博朋克人物",
  "都市悬疑人物",
  "港风雨夜人物",
  "复古胶片人物",
  "商业大片人物",
  "纪实人物",
  "黑白电影人物",
  "角色海报",
  "半身近景",
  "全身海报",
  "特写情绪照",
  "低角度英雄感",
  "高角度脆弱感",
  "镜中人物",
  "背影人物",
  "雨中人物",
  "霓虹街头人物",
  "烛光室内人物",
  "窗边人物",
  "孤独车站人物"
];

const multiTitles = [
  "双人对峙",
  "双人告别",
  "双人重逢",
  "过肩对话",
  "三人关系张力",
  "家庭群像",
  "警匪审讯",
  "古风群像",
  "武侠门派群像",
  "职场会议群像",
  "医院走廊群像",
  "校园青春群像",
  "黑帮群像",
  "末日幸存者群像",
  "科幻飞船乘员",
  "复古婚礼",
  "餐桌冲突",
  "地铁车厢多人",
  "雨夜街头双人",
  "战场小队",
  "新闻纪实多人",
  "群像海报",
  "舞台剧照",
  "多人广告大片",
  "角色关系图"
];

const singlePanelTitles = [
  "单张电影海报",
  "单张短剧封面",
  "单张人物剧照",
  "单张场景剧照",
  "单张商业广告电影画面",
  "单张悬疑封面",
  "单张武侠封面",
  "单张古风虐恋封面",
  "单张都市情感封面",
  "单张科幻电影概念图",
  "单张恐怖氛围图",
  "单张治愈日系图",
  "单张港风霓虹图",
  "单张黑白电影图",
  "单张复古胶片图",
  "单张宽银幕电影图",
  "单张抖音竖版封面",
  "单张小红书封面",
  "单张 B 站横版封面",
  "单张预告片主视觉",
  "单张人物背影海报",
  "单张雨夜反光海报",
  "单张车内电影画面",
  "单张窗边情绪图",
  "单张电影标题留白图"
];

const multiPanelTitles = [
  "2 宫格前后对比",
  "3 宫格情绪递进",
  "4 宫格短剧分镜",
  "6 宫格电影故事板",
  "9 宫格角色海报",
  "9 宫格短剧封面",
  "4 宫格悬疑故事",
  "4 宫格恋爱重逢",
  "4 宫格古风虐恋",
  "4 宫格武侠打斗",
  "6 宫格追车戏",
  "6 宫格雨夜告别",
  "6 宫格广告片分镜",
  "9 宫格人物表情",
  "9 宫格镜头语言训练",
  "多宫格同一人物不同景别",
  "多宫格同一场景不同时间",
  "多宫格同一事件连续动作",
  "多宫格预告片视觉分镜",
  "多宫格漫画式叙事",
  "多宫格产品广告故事",
  "多宫格旅游电影感",
  "多宫格美食广告片",
  "多宫格城市纪录片",
  "多宫格情绪短片"
];

const videoTitles = [
  ["文生视频电影感", "text-to-video"],
  ["图生视频人物微表情", "image-to-video"],
  ["图生视频多人动作", "image-to-video"],
  ["推镜", "text-to-video"],
  ["拉远", "text-to-video"],
  ["环绕", "text-to-video"],
  ["跟拍", "text-to-video"],
  ["手持纪实", "text-to-video"],
  ["一镜到底", "storyboard"],
  ["雨夜街头", "text-to-video"],
  ["古风长镜头", "storyboard"],
  ["武侠打斗", "storyboard"],
  ["赛博朋克街头", "text-to-video"],
  ["产品广告", "text-to-video"],
  ["人物口播", "text-to-video"],
  ["对白短剧", "storyboard"],
  ["音效提示", "text-to-video"],
  ["环境运动", "text-to-video"],
  ["镜头转场", "storyboard"],
  ["首尾帧视频", "image-to-video"]
];

const defaults = [
  {
    subject: "年轻女性侦探",
    scene: "雨夜城市巷口",
    mood: "克制、警觉、孤独",
    clothing: "黑色风衣与旧式录音笔",
    lighting: "冷蓝阴影与暖橙街灯",
    camera: "85mm 半身近景",
    style: "低调电影胶片质感"
  },
  {
    subject: "中年警探与年轻嫌疑人",
    scene: "昏暗审讯室",
    mood: "紧张、压迫、心理博弈",
    clothing: "皱袖衬衫、深色夹克、简洁便装",
    lighting: "刺眼台灯切分明暗",
    camera: "过肩双人镜头",
    style: "黑色电影高对比光影"
  },
  {
    subject: "古风女侠",
    scene: "雾气中的古城门与山崖",
    mood: "克制、凌厉、宿命感",
    clothing: "红黑配色长衣、披风、长剑",
    lighting: "烛光、雨水反光与薄雾轮廓光",
    camera: "低角度英雄镜头",
    style: "古风电影海报质感"
  },
  {
    subject: "都市女企业家",
    scene: "高层办公室与城市夜景",
    mood: "冷静、决断、疏离",
    clothing: "白色衬衫、深色西装、银色腕表",
    lighting: "窗边柔光与城市霓虹边缘光",
    camera: "50mm 中近景",
    style: "商业大片质感"
  },
  {
    subject: "原创机甲骑手",
    scene: "赛博城市街头",
    mood: "速度感、孤勇、危险",
    clothing: "银色轻型机甲与黑色头盔",
    lighting: "霓虹逆光、雨夜反光、体积光",
    camera: "广角低角度",
    style: "赛博霓虹电影感"
  }
];

function pick(values, index) {
  return values[index % values.length];
}

function pad(index) {
  return String(index + 1).padStart(3, "0");
}

function gridTypeFor(title, contentType) {
  if (contentType === "multi-panel-image" || contentType === "storyboard") {
    if (title.includes("2 宫格")) return "2-grid";
    if (title.includes("3 宫格")) return "3-grid";
    if (title.includes("4 宫格")) return "4-grid";
    if (title.includes("6 宫格")) return "6-grid";
    if (title.includes("9 宫格") || title.includes("九宫格")) return "9-grid";
    return "storyboard";
  }
  return "single";
}

function subjectCountFor(title, contentType) {
  if (contentType === "multi-person-image" || title.includes("多人") || title.includes("群像") || title.includes("小队")) return "group";
  if (title.includes("双人") || title.includes("两人")) return "two";
  if (title.includes("场景") || title.includes("城市") || title.includes("空镜")) return "none";
  return "single";
}

function makeZhPrompt({ title, defaults, aspectRatio, shotSize, angle, movement, lighting, colorGrade, mood, contentType }) {
  const isMultiPanel = contentType === "multi-panel-image";
  const isVideo = contentType === "text-to-video" || contentType === "image-to-video" || contentType === "storyboard";
  if (isMultiPanel) {
    return `${title}，统一角色、统一场景、统一光影与统一色彩。主体为${defaults.subject}，场景设定在${defaults.scene}，服化道为${defaults.clothing}，整体情绪是${defaults.mood}。第 1 格用${shotSize}建立人物与环境关系；第 2 格让主体动作发生变化，保持脸部、服装和道具一致；第 3 格切到${angle}强化心理张力；第 4 格使用特写呈现关键道具或表情；若为 6 宫格或 9 宫格，后续画面继续按从左到右、从上到下编号，分别变化景别、动作、表情和环境细节。${movement}，${lighting}，${colorGrade}，画面不要生成文字、不要水印、不要漫画气泡，避免多余肢体和脸部混乱。输出为 ${aspectRatio}，电影故事板质感，适合短剧分镜、角色设定和 AI 视频前期视觉化。质量标准：每格主次清楚、人物身份稳定、色调一致、故事线连续、画面可直接用于后期拆分。`;
  }
  if (isVideo) {
    return `${title}，请生成一段电影感视频提示词。主体为${defaults.subject}，发生在${defaults.scene}，服化道为${defaults.clothing}，情绪为${defaults.mood}。镜头从${shotSize}开始，使用${movement}，主体动作清楚而克制，环境中有可见运动，例如雨滴、光影闪烁、烟雾流动、衣摆轻动或人群从背景经过。镜头角度为${angle}，光影使用${lighting}，色彩为${colorGrade}，画幅 ${aspectRatio}。如果是图生视频，请保持首帧人物身份、服装、脸部特征和构图稳定，不要重新描述图片已有内容，重点写主体如何移动、镜头如何移动、环境如何变化。输出要求：单镜头优先，节奏从安静到情绪加强，结尾停在可作为封面的稳定画面。负面约束：不要跳帧、不要变脸、不要换衣服、不要出现真实品牌或公众人物。`;
  }
  return `${title}，请生成一张可直接用于商业安全创作的电影感图像。主体为${defaults.subject}，位于${defaults.scene}，穿着或携带${defaults.clothing}，动作和表情保持克制但有明确戏剧动机。使用${shotSize}，${angle}，${defaults.camera}，构图有清晰视觉中心和前中后景层次。光影为${lighting}，色彩为${colorGrade}，情绪是${mood}，整体风格为${defaults.style}。背景只服务主体，不堆砌无关装饰；皮肤、布料、金属、雨水或玻璃反光要真实；眼神清晰，手部自然，身份稳定。输出为 ${aspectRatio}，画面不要文字、不要水印、不要可识别品牌标识、不要真人肖像冒用。质量标准：主体完整、景别准确、光线统一、色彩可控、情绪明确、可直接复制到图像模型使用。`;
}

function makeEnPrompt({ defaults, aspectRatio, shotSize, angle, movement, lighting, colorGrade, mood, contentType }) {
  const action = contentType.includes("video") || contentType === "storyboard"
    ? "The subject moves with restrained, readable motion while the camera keeps identity, clothing, facial features and composition stable."
    : "The subject holds a restrained cinematic pose with a clear dramatic intention.";
  return `Create a cinematic prompt featuring ${defaults.subject} in ${defaults.scene}, wearing or carrying ${defaults.clothing}. ${action} Use ${shotSize}, ${angle}, ${defaults.camera}, ${movement}, layered foreground, midground and background, ${lighting}, ${colorGrade}, realistic texture, sharp eyes, natural hands, stable identity, ${mood} mood, ${defaults.style}, ${aspectRatio} composition. Keep the image or video commercially safe, original, and free of celebrity likeness, protected characters, real logos, unreadable text, watermarks, deformed bodies, extra limbs, face drift or inconsistent clothing.`;
}

function makeMjPrompt({ defaults, aspectRatio, shotSize, angle, lighting, colorGrade, mood }) {
  return `${defaults.subject} in ${defaults.scene}, ${defaults.clothing}, restrained cinematic expression, ${shotSize}, ${angle}, ${defaults.camera}, layered composition, ${lighting}, ${colorGrade}, realistic texture, sharp eyes, natural hands, ${mood} mood, ${defaults.style}, original commercial-safe cinematic still --ar ${aspectRatio} --style raw --v 6.1 --no watermark logo unreadable text celebrity likeness extra fingers deformed body`;
}

function makeVideoPrompt({ defaults, shotSize, movement, lighting, colorGrade, mood }) {
  return `${movement}: ${defaults.subject} is in ${defaults.scene}. The subject moves subtly with readable intention while ${lighting} changes across the scene. Clothing and props stay consistent: ${defaults.clothing}. Environmental motion includes drifting haze, reflections, distant lights and small fabric movement. The camera begins from ${shotSize} and slowly tightens emotional focus. ${colorGrade}, ${mood} mood, cinematic realism. Keep identity, face, clothing, hands and composition stable; no sudden cuts, no face drift, no random text.`;
}

function makeUsageTips(contentType) {
  if (contentType === "image-to-video") return "图生视频时先锁定首帧构图，再只改主体运动、镜头运动和环境变化。";
  if (contentType === "multi-panel-image") return "多宫格先检查统一角色和统一色彩，再检查逐格动作是否连续。";
  if (contentType === "storyboard") return "多镜头分镜建议逐镜头生成，先跑关键帧，再做视频延展。";
  return "先复制中文版本获得主体画面，再用 MJ 或视频版做模型适配。";
}

function makePrompt({ title, contentType, index, globalIndex }) {
  const meta = contentMeta[contentType];
  const defaultsForPrompt = pick(defaults, globalIndex);
  const model = pick(models, globalIndex);
  const aspectRatio = pick(aspects, globalIndex);
  const shotSize = pick(shotSizes, globalIndex);
  const angle = pick(angles, globalIndex);
  const movement = pick(movements, globalIndex);
  const lighting = pick(lights, globalIndex);
  const colorGrade = pick(colors, globalIndex);
  const mood = pick(moods, globalIndex);
  const gridType = gridTypeFor(title, contentType);
  const zhPrompt = makeZhPrompt({ title, defaults: defaultsForPrompt, aspectRatio, shotSize, angle, movement, lighting, colorGrade, mood, contentType });
  const enPrompt = makeEnPrompt({ defaults: defaultsForPrompt, aspectRatio, shotSize, angle, movement, lighting, colorGrade, mood, contentType });
  const mjPrompt = makeMjPrompt({ defaults: defaultsForPrompt, aspectRatio, shotSize, angle, lighting, colorGrade, mood });
  const videoPrompt = makeVideoPrompt({ defaults: defaultsForPrompt, shotSize, movement, lighting, colorGrade, mood });

  return {
    id: `cinematic-${contentType}-${pad(index)}`,
    title: `影视导演工作台 · ${title}`,
    category: meta.category,
    tags: [
      `工具:${model[1]}`,
      `模态:${meta.modality}`,
      `用途:${meta.use}`,
      "难度:进阶",
      "影视提示词",
      "电影感",
      "变量替换",
      "一键复制",
      contentType
    ],
    variables: variableKeys,
    status: "推荐",
    summary: `${title}模板，覆盖主体、场景、镜头、光影、色彩、情绪、画幅和负面约束，可复制中文、英文、Midjourney、视频版和负面词。`,
    body: zhPrompt,
    source: "原创影视提示词导演工作台 / 官方结构参考",
    createdAt: stamp,
    updatedAt: stamp,
    archived: false,
    access: "free",
    packId: "",
    stripePriceId: "",
    qualityScore: 92,
    exampleOutput: `${title}成片方向：一张或一段可用于影视预演、短剧封面、AI 视频镜头或商业安全视觉提案的成品提示词。`,
    sourceType: "official-doc-inspired",
    verifiedAt: stamp,
    seoKeywords: [
      ...cinematicSeo,
      title,
      meta.use,
      model[1],
      aspectRatio,
      shotSize,
      lighting,
      colorGrade,
      mood
    ].slice(0, 24),
    qualityAudit: {
      copyReady: true,
      qualityLevel: "professional",
      missingFields: [],
      improvementSuggestion: "已包含主体、场景、镜头、光影、色彩、情绪、画幅、负面词和多版本复制结构。"
    },
    contentType,
    model: model[0],
    language: "bilingual",
    subjectCount: subjectCountFor(title, contentType),
    gridType,
    aspectRatio,
    shotSize: [shotSize],
    cameraAngle: [angle],
    cameraMovement: [movement],
    lighting: [lighting],
    colorGrade: [colorGrade],
    mood: [mood],
    styleTags: [defaultsForPrompt.style, meta.use, title],
    variableDefaults: { ...defaultsForPrompt, aspectRatio, style: defaultsForPrompt.style },
    zhPrompt,
    enPrompt,
    mjPrompt,
    videoPrompt,
    negativePrompt,
    copyPrompt: zhPrompt,
    usageTips: makeUsageTips(contentType),
    failureReasons: [
      "主体身份漂移或脸部不稳定",
      "镜头语言过于笼统导致画面像普通写真",
      "多人物站位不清导致关系混乱",
      "画面生成多余文字、水印或真实品牌标识"
    ],
    optimizationTips: [
      "先固定主体、服装、场景和画幅，再调整光影与运镜。",
      "多人画面使用左侧、右侧、前景、背景等明确位置语言。",
      "Midjourney 参数保持在提示词末尾，画幅优先用 --ar 控制。",
      "视频模型优先描述运动、节奏和一致性，不重复首帧已有内容。"
    ]
  };
}

function makeMany(titles, contentType, offset) {
  return titles.map((title, index) => makePrompt({
    title,
    contentType,
    index,
    globalIndex: offset + index
  }));
}

const generated = [
  ...makeMany(singleTitles, "single-person-image", 0),
  ...makeMany(multiTitles, "multi-person-image", 25),
  ...makeMany(singlePanelTitles, "single-panel-image", 50),
  ...makeMany(multiPanelTitles, "multi-panel-image", 75),
  ...videoTitles.map(([title, contentType], index) => makePrompt({
    title,
    contentType,
    index,
    globalIndex: 100 + index
  }))
];

if (generated.length !== 120) {
  throw new Error(`Expected 120 cinematic prompts, got ${generated.length}`);
}

const library = JSON.parse(await readFile(libraryPath, "utf8"));
const existingPrompts = Array.isArray(library.prompts) ? library.prompts : [];
library.prompts = [
  ...existingPrompts.filter((prompt) => !String(prompt?.id || "").startsWith("cinematic-")),
  ...generated
];
library.updatedAt = stamp;
library.version = Number(library.version) || 2;
library.assets = Array.isArray(library.assets) ? library.assets : [];

await writeFile(libraryPath, `${JSON.stringify(library, null, 2)}\n`, "utf8");
console.log(`Generated cinematic prompts: ${generated.length}`);
console.log(`Total prompts: ${library.prompts.length}`);
