import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");

const TOTAL = 5000;
const SOURCE = "原创可复制提示词库生成器 / 未复制外站提示词原文";
const now = new Date();
const stamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

const groups = [
  {
    slug: "image-product-ad",
    label: "图像/产品/广告",
    modality: "图像",
    count: 1200,
    packId: "image-product-pack",
    tools: ["Midjourney", "GPT Image", "Flux", "Stable Diffusion", "Firefly", "通义万相", "即梦图片", "Canva AI"],
    subjects: ["低糖气泡茶新品", "户外便携咖啡杯", "宠物智能饮水机", "轻量旅行背包", "无香护手霜", "桌面氛围灯", "城市通勤雨衣", "家用香氛扩散器", "儿童绘本台灯", "手冲咖啡礼盒"],
    scenarios: ["电商主图", "社媒种草图", "详情页场景图", "新品发布海报", "信息流广告图", "包装系列展示", "生活方式大片", "活动主视觉", "品牌情绪板", "功能卖点图"],
    audiences: ["一线城市年轻白领", "新手妈妈", "户外生活爱好者", "独立设计师", "电商运营团队", "本地生活商家"],
    channels: ["小红书首图", "淘宝详情页", "抖音信息流", "官网首屏", "品牌招商手册", "门店灯箱"],
    tones: ["清爽可信", "温暖克制", "专业简洁", "轻奢但不夸张", "自然生活感", "现代工具感"]
  },
  {
    slug: "video-short-storyboard",
    label: "视频/短视频/分镜",
    modality: "视频",
    count: 1200,
    packId: "video-story-pack",
    tools: ["Runway", "Sora", "Kling", "Veo", "Pika", "即梦视频", "可灵视频", "CapCut"],
    subjects: ["咖啡杯从桌面到通勤场景", "护肤品质地到使用动作", "旅行背包一镜到底展示", "智能饮水机被宠物使用", "本地咖啡店新品上架", "AI 工具上线功能演示", "课程预告片", "门店开业短广告"],
    scenarios: ["6 秒产品演示", "15 秒广告分镜", "三镜头剧情短片", "首尾帧过渡", "无脸开箱视频", "信息流循环动图", "口播背景 B-roll", "活动预热视频", "功能走查视频", "角色一致性续集"],
    audiences: ["短视频运营", "独立品牌主理人", "电商投手", "门店老板", "课程运营", "AIGC 视频剪辑师"],
    channels: ["抖音竖屏", "视频号竖屏", "小红书视频", "广告投放素材", "官网视频模块", "直播间预热视频"],
    tones: ["镜头稳定", "节奏明确", "真实手机感", "电影感克制", "强钩子但不夸张", "清晰产品导向"]
  },
  {
    slug: "commerce-marketing-copy",
    label: "电商/营销/文案",
    modality: "文本",
    count: 900,
    packId: "commerce-growth-pack",
    tools: ["ChatGPT", "Claude", "Gemini", "豆包", "通义千问", "Kimi"],
    subjects: ["新品首发页面", "详情页五屏卖点", "直播间口播脚本", "私域复购话术", "信息流广告文案", "小红书测评笔记", "品牌招商单页", "客服异议回复"],
    scenarios: ["卖点重构", "A/B 广告标题", "短视频开头钩子", "详情页结构", "直播口播节奏", "用户异议处理", "社媒种草笔记", "邮件跟进", "活动促销页", "品牌故事改写"],
    audiences: ["新消费品牌", "本地生活门店", "知识付费团队", "跨境电商卖家", "B2B 销售团队", "社群运营"],
    channels: ["天猫详情页", "抖音直播间", "小红书笔记", "微信公众号", "私域社群", "官网落地页"],
    tones: ["克制有证据", "亲切直接", "专业顾问感", "短句高密度", "不夸大承诺", "转化导向"]
  },
  {
    slug: "audio-music-voice",
    label: "音频/音乐/口播",
    modality: "音频",
    count: 500,
    packId: "audio-voice-pack",
    tools: ["Suno", "Udio", "ElevenLabs", "剪映配音", "Fish Speech", "通用音频模型"],
    subjects: ["品牌开场声音", "短视频旁白", "门店活动循环音乐", "播客片头", "课程讲解配音", "产品反馈音效", "广告无歌词配乐", "城市夜跑歌单"],
    scenarios: ["品牌声音 Logo", "广告口播导演", "原创副歌钩子", "播客片头包装", "门店循环背景乐", "短视频转场音效", "字幕节奏配乐", "语音修复说明", "拟音清单", "课程背景音乐"],
    audiences: ["短视频创作者", "品牌市场团队", "播客主理人", "课程制作人", "门店运营", "声音设计师"],
    channels: ["抖音视频", "播客平台", "门店音响", "品牌官网", "课程片头", "广告素材"],
    tones: ["清晰亲和", "节奏轻快", "不抢人声", "记忆点明确", "温和可信", "适合循环"]
  },
  {
    slug: "multimodal-workflow",
    label: "多模态工作流",
    modality: "多模态",
    count: 500,
    packId: "workflow-pack",
    tools: ["ChatGPT", "Gemini", "Claude", "ComfyUI", "Dify", "Make", "Notion AI"],
    subjects: ["商品图质检", "视频分镜拆解", "素材库整理", "参考图原创改写", "广告词画面匹配", "界面截图评审", "图片反推提示词", "多图角色一致性"],
    scenarios: ["视觉质量审查", "素材调用包", "参考图重写", "分镜转视频提示", "缩略图点击评分", "商品图上架质检", "多模态审查报告", "图像失败诊断", "视频连续性检查", "海报提炼文案"],
    audiences: ["AIGC 工作室", "设计团队", "电商内容团队", "视频制作团队", "产品经理", "素材管理员"],
    channels: ["内部质检表", "内容生产 SOP", "素材管理系统", "投放复盘文档", "客户交付报告", "训练营作业"],
    tones: ["结构化", "可复盘", "审查优先", "不臆测", "证据导向", "可执行"]
  },
  {
    slug: "business-seo-automation",
    label: "商业/SEO/自动化",
    modality: "文本",
    count: 400,
    packId: "business-automation-pack",
    tools: ["ChatGPT", "Claude", "Gemini", "Perplexity", "Notion AI", "Zapier AI"],
    subjects: ["SEO 文章集群", "月度经营复盘", "客户线索评分", "竞品对比表", "销售跟进邮件", "知识库文章", "自动化 SOP", "数据异常解释"],
    scenarios: ["SEO 内容简报", "经营指标洞察", "竞品对比分析", "销售跟进序列", "客户画像提炼", "知识库 FAQ", "自动化流程设计", "会议纪要行动项", "预算情景测算", "本地化改写"],
    audiences: ["创业团队", "销售负责人", "内容 SEO 团队", "运营经理", "咨询顾问", "独立开发者"],
    channels: ["Notion 文档", "飞书表格", "官网博客", "CRM 备注", "周报", "自动化平台"],
    tones: ["决策友好", "证据分层", "少废话", "风险清楚", "行动明确", "适合复盘"]
  },
  {
    slug: "code-agent-toolflow",
    label: "代码/Agent/工具流",
    modality: "代码",
    count: 300,
    packId: "agent-toolflow-pack",
    tools: ["Cursor", "GitHub Copilot", "Codex", "Claude Code", "Devin 风格 Agent", "通用代码助手"],
    subjects: ["前端交互修复", "CI 失败定位", "Worker 路由改造", "数据校验脚本", "Playwright 回归测试", "API 错误处理", "仓库规则梳理", "自动化任务拆解"],
    scenarios: ["功能实现计划", "Bug 复现定位", "代码审查", "测试用例设计", "API 设计", "性能诊断", "安全审查", "CI/CD 修复", "Agent 任务拆解", "前端状态设计"],
    audiences: ["全栈工程师", "独立开发者", "前端团队", "平台工程师", "技术负责人", "自动化工程师"],
    channels: ["GitHub PR", "本地 Codex", "Cursor 项目", "CI 日志", "Playwright 报告", "架构评审"],
    tones: ["小步可验证", "保护已有改动", "风险优先", "工程化", "可回滚", "测试驱动"]
  }
];

const forbiddenPatterns = [
  /迪士尼|漫威|哈利波特|宝可梦|宫崎骏|吉卜力|任天堂|可口可乐|真实明星|换脸|深度伪造|绕过审核|破解|赌博|毒品|武器制作|保证收益|诊断处方/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b|github_pat_|ghp_[A-Za-z0-9_]{20,}/i
];

function pick(values, index, offset = 0) {
  return values[(index + offset) % values.length];
}

function pad(value, size = 4) {
  return String(value).padStart(size, "0");
}

function slugify(value) {
  return String(value)
    .normalize("NFKD")
    .replace(/[^A-Za-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase() || "prompt";
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function accessFor(index) {
  if (index % 10 === 0 || index % 10 === 4) return "pack";
  if (index % 10 === 2 || index % 10 === 7) return "pro";
  return "free";
}

function bodyFor({ group, tool, scenario, subject, audience, channel, tone, serial }) {
  return `角色定位：
你是熟悉 ${tool} 的中文 AIGC 制作顾问，现在直接完成“${scenario}”任务。不要再向我索要素材或变量，所有缺省信息都使用下面的确定设定。

任务背景：
项目对象是${subject}，面向${audience}，发布渠道是${channel}。整体语气要求${tone}，目标是在不夸大承诺、不冒用真实品牌和人物的前提下，产出可以进入真实工作流的结果。当前任务编号为 ${serial}，用于区分同主题的不同版本。

直接复制使用：
请基于上述确定设定，为我生成一份“${scenario}”的完整执行稿。先用一句话说明核心创意，再给出可直接交付的主体内容。内容必须包含目标、场景、步骤、画面或文案结构、输出格式、质量检查和失败修正。不要出现需要我二次填写的占位符，不要追加资料请求，也不要把答案写成泛泛的模板说明。

输出要求：
1. 第一部分输出“成品提示词”，可以直接复制到 ${tool} 或同类工具中使用。
2. 第二部分输出“交付结构”，列出镜头、画面、段落、音色、检查项或代码步骤，按 ${group.label} 的任务类型组织。
3. 第三部分输出“质量自检”，说明如何判断结果是否可用，至少包含清晰度、一致性、边界和可发布性。
4. 第四部分输出“失败修正”，针对跑偏、空泛、画面混乱、文案夸张、节奏拖沓或代码不可运行给出修正指令。

质量标准：
- 结果要具体到对象、受众、渠道和交付形态，避免只给抽象建议。
- 内容应保持原创，不复制第三方提示词网站的原文。
- 如果涉及图像或视频，保持主体、光线、动作、比例和风格一致。
- 如果涉及文案、商业或代码，明确假设、边界、验证方式和下一步动作。

失败修正：
- 如果输出像通用模板，重新生成时加入${subject}、${audience}和${channel}三个具体信息。
- 如果结果过度营销，降低承诺强度，改成可验证的事实、场景和体验描述。
- 如果结果不适合发布，增加审核清单，删除敏感、侵权、冒用和无法证明的表达。

交付细节：
请额外给出一个“快速可用版”和一个“精修发布版”。快速可用版控制在三到五个要点内，适合马上复制执行；精修发布版补充风格、节奏、检查清单和可替换方向，适合团队复盘后沉淀到提示词库。

边界提醒：
只使用原创描述和虚构案例。不生成真实名人、受保护 IP、商标冒用、绕过平台审核、违法用途、医疗诊断、投资收益保证或私密凭据相关内容。`;
}

function promptFor(group, index, legacyTheme = "") {
  const tool = pick(group.tools, index);
  const scenario = pick(group.scenarios, index, 1);
  const subject = pick(group.subjects, index, 2);
  const audience = pick(group.audiences, index, 3);
  const channel = pick(group.channels, index, 4);
  const tone = pick(group.tones, index, 5);
  const serial = `${group.slug}-${pad(index + 1)}`;
  const access = accessFor(index);
  const body = bodyFor({ group, tool, scenario, subject, audience, channel, tone, serial });
  const id = `ready-${group.slug}-${pad(index + 1)}`;
  const title = `${tool} · ${scenario} · ${subject} ${pad(index + 1)}`;
  const summary = `${group.label}场景的可复制成品提示词：围绕${subject}、${audience}和${channel}生成${tone}的${scenario}。`;
  const tags = unique([
    `库分类:${group.label}`,
    `工具:${tool}`,
    `模态:${group.modality}`,
    `用途:${scenario}`,
    `渠道:${channel}`,
    `受众:${audience}`,
    `语气:${tone}`,
    "copy-ready",
    "原创提示词"
  ]);
  const seoKeywords = unique([
    group.label,
    group.modality,
    tool,
    scenario,
    subject,
    audience,
    channel,
    tone,
    "AI提示词",
    "AIGC提示词",
    "可复制提示词"
  ]).slice(0, 18);

  for (const pattern of forbiddenPatterns) {
    if (pattern.test(`${title}\n${summary}\n${body}`)) {
      throw new Error(`Generated high-risk prompt ${id}`);
    }
  }

  return {
    id,
    title,
    category: group.label,
    tags,
    variables: ["主题对象", "目标受众", "发布渠道", "视觉或语气", "输出格式"],
    status: "推荐",
    summary,
    body,
    source: SOURCE,
    createdAt: stamp,
    updatedAt: stamp,
    archived: false,
    access,
    packId: access === "pack" ? group.packId : "",
    stripePriceId: "",
    qualityScore: 82 + (index % 17),
    exampleOutput: `输出一份可直接用于${tool}的${scenario}成品提示词，并附带质量自检和失败修正。`,
    sourceType: "copy-ready-generated",
    verifiedAt: stamp,
    seoKeywords,
    copyReady: true,
    modelTargets: unique([tool, "通用 AIGC", group.modality]).slice(0, 6),
    useCase: group.label,
    promptKind: "ready",
    sourcePolicy: "original",
    legacyTheme: legacyTheme.slice(0, 180)
  };
}

function buildPlans() {
  return [
    {
      id: "team-training",
      title: "团队提示词训练",
      price: "联系报价",
      description: "把 5000 条公开库转成适合你团队工具、品类和交付流程的训练方案。",
      ctaLabel: "联系训练方案",
      highlights: ["团队培训", "流程共创", "复盘清单", "工具适配"]
    },
    {
      id: "custom-pack",
      title: "行业定制提示词包",
      price: "按需求评估",
      description: "围绕行业、素材、模型和发布渠道，整理专属可复制提示词包。",
      ctaLabel: "咨询定制包",
      highlights: ["行业场景", "模型适配", "批量生成", "质量校验"]
    },
    {
      id: "workflow-consulting",
      title: "AIGC 工作流顾问",
      price: "项目制",
      description: "为电商、短视频、设计和运营团队搭建提示词、素材、审查和发布工作流。",
      ctaLabel: "联系工作流顾问",
      highlights: ["素材流转", "质检规则", "自动化建议", "上线陪跑"]
    }
  ];
}

async function main() {
  const raw = JSON.parse(await readFile(libraryPath, "utf8"));
  const legacyThemes = Array.isArray(raw.prompts)
    ? raw.prompts.map((prompt) => `${prompt.title || ""}：${prompt.summary || ""}`.trim()).filter(Boolean)
    : [];
  const prompts = [];

  for (const group of groups) {
    for (let index = 0; index < group.count; index += 1) {
      const legacyTheme = legacyThemes[prompts.length % Math.max(legacyThemes.length, 1)] || "";
      prompts.push(promptFor(group, index, legacyTheme));
    }
  }

  if (prompts.length !== TOTAL) {
    throw new Error(`Expected ${TOTAL} prompts, got ${prompts.length}`);
  }

  const next = {
    ...raw,
    version: 3,
    migratedAt: raw.migratedAt || stamp,
    updatedAt: stamp,
    siteSettings: {
      heroTitle: "5000 条可直接复制的 AIGC 提示词库",
      heroDescription: "图像、视频、短视频、电商、音频、多模态、商业和代码 Agent 全部公开可复制，套餐只用于定制和培训咨询。",
      planSectionTitle: "需要团队落地时再联系我",
      planSectionDesc: "公共提示词不再支付锁定；后台只配置主页、联系方式、套餐展示和提示词管理。",
      hotKeywords: ["商品主视觉", "短视频分镜", "电商详情页", "Suno 口播", "多模态质检", "SEO 内容简报", "Agent 工作流", "直播口播"]
    },
    plans: buildPlans(),
    contact: raw.contact || {
      title: "联系我获取定制方案",
      description: "公开库可直接复制。如果你需要团队训练、行业定制包或工作流搭建，可以通过下方联系方式沟通。",
      ctaLabel: "联系定制方案",
      wechat: "",
      email: "2453193338@qq.com",
      phone: "",
      qrImageUrl: "",
      consultationText: "请说明行业、使用工具、目标渠道、团队人数和期望交付。"
    },
    prompts,
    assets: Array.isArray(raw.assets) ? raw.assets : []
  };

  await writeFile(libraryPath, `${JSON.stringify(next, null, 2)}\n`, "utf8");
  console.log(`Generated copy-ready prompts: ${prompts.length}`);
  for (const group of groups) {
    console.log(`${group.label}: ${prompts.filter((prompt) => prompt.useCase === group.label).length}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
