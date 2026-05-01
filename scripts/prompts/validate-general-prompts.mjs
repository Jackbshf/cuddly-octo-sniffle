import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");
const ID_PREFIX = "general-template-";

const expectedCategories = [
  "写作/长文与改写",
  "写作/社媒短文案",
  "营销/品牌定位",
  "营销/广告转化",
  "电商/商品页与种草",
  "销售/外联与谈判",
  "客服/回复与知识库",
  "商务/战略分析",
  "创业/商业计划",
  "产品/需求路线图",
  "项目管理/计划复盘",
  "运营/SOP流程",
  "人力/招聘绩效",
  "教育/课程学习",
  "研究/资料综述",
  "数据分析/指标洞察",
  "财务/预算经营",
  "法务风险/合同阅读",
  "个人效率/时间习惯",
  "职业发展/简历面试",
  "编程/代码生成",
  "编程/调试重构",
  "编程/测试文档",
  "DevOps/云与自动化",
  "安全/威胁建模",
  "设计/UX信息架构",
  "设计/视觉品牌",
  "图像生成/人像角色",
  "图像生成/产品场景",
  "图像生成/海报社媒",
  "视频生成/分镜短片",
  "视频生成/广告演示",
  "音乐音频/歌曲配乐",
  "多模态/图片理解改图",
  "AI工作流/提示词优化",
  "AI Agent/工具自动化",
  "本地生活/旅行活动",
  "健康生活/运动饮食",
  "创意写作/故事世界观",
  "知识管理/笔记个人库"
];

const requiredHeadings = ["适用场景：", "输入变量：", "执行步骤：", "输出格式：", "质量标准：", "边界提醒："];
const highRiskPatterns = [
  /迪士尼|漫威|哈利波特|宝可梦|宫崎骏|吉卜力|任天堂|可口可乐|苹果公司|耐克|麦当劳/i,
  /周杰伦|成龙|刘德华|Taylor Swift|Elon Musk|特朗普/i,
  /换脸|深度伪造|绕过审核|破解|盗版|赌博|毒品|武器制作|保证收益|治疗承诺|诊断处方|伪造证件/i,
  /\bsk-[A-Za-z0-9_-]{20,}\b|github_pat_|ghp_[A-Za-z0-9_]{20,}/i
];

function fail(message) {
  throw new Error(message);
}

function countBy(values) {
  const out = new Map();
  values.forEach((value) => out.set(value, (out.get(value) || 0) + 1));
  return out;
}

const library = JSON.parse(await readFile(libraryPath, "utf8"));
const prompts = Array.isArray(library.prompts) ? library.prompts : fail("prompts must be an array");
const generated = prompts.filter((item) => String(item?.id || "").startsWith(ID_PREFIX));
const ids = prompts.map((item) => item.id);
const duplicateIds = [...countBy(ids)].filter(([, count]) => count > 1).map(([id]) => id);

if (generated.length !== 1000) fail(`Expected 1000 generated prompts, got ${generated.length}`);
if (prompts.length !== 1010) fail(`Expected 1010 total prompts, got ${prompts.length}`);
if (duplicateIds.length) fail(`Duplicate prompt ids: ${duplicateIds.join(", ")}`);

for (const prompt of prompts) {
  if (!prompt.id || !prompt.title || !prompt.category || !prompt.body) {
    fail(`Prompt has required empty field: ${prompt.id || prompt.title || "(unknown)"}`);
  }
}

const generatedCategoryCounts = countBy(generated.map((item) => item.category));
for (const category of expectedCategories) {
  const count = generatedCategoryCounts.get(category) || 0;
  if (count !== 25) fail(`Expected 25 generated prompts in ${category}, got ${count}`);
}

for (const prompt of generated) {
  for (const heading of requiredHeadings) {
    if (!prompt.body.includes(heading)) fail(`${prompt.id} missing heading ${heading}`);
  }
  for (const pattern of highRiskPatterns) {
    if (pattern.test(`${prompt.title}\n${prompt.summary}\n${prompt.body}`)) {
      fail(`${prompt.id} matched high-risk content pattern ${pattern}`);
    }
  }
  if (!Array.isArray(prompt.variables) || prompt.variables.length < 5) {
    fail(`${prompt.id} has too few variables`);
  }
}

const samples = expectedCategories.map((category) => generated.filter((item) => item.category === category).slice(0, 2).map((item) => item.id));

console.log("Prompt library validation passed");
console.log(`Generated prompts: ${generated.length}`);
console.log(`Total prompts: ${prompts.length}`);
console.log(`Categories: ${expectedCategories.length}`);
console.log(`Sampled ids: ${samples.flat().join(", ")}`);
