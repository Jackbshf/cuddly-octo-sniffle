import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");

const V2_PREFIX = "v2-";
const OLD_PREFIX = "general-template-";
const TARGET_IMAGE_PROMPTS = 2400;
const TARGET_VIDEO_PROMPTS = 2480;
const TARGET_GENERAL_PROMPTS = TARGET_IMAGE_PROMPTS + TARGET_VIDEO_PROMPTS;
const TARGET_TOTAL_WITH_CINEMATIC = 5000;
const SOURCE = "v2 5000 visual copy-ready templates / original platform-adapted library";

const imagePlatforms = [
  ["gpt-image", "ChatGPT / GPT Image", "图像提示词 / GPT Image", "自然语言长提示，适合商业视觉、图文混合输入、多轮修改和局部改图。", "用自然语言写完整画面；如需文字，只保留短句并要求清晰可读。"],
  ["midjourney", "Midjourney", "图像提示词 / Midjourney", "适合电影感、产品主视觉、海报、角色与风格化构图。", "把主体、构图、光线、材质写在前面，参数放末尾：--ar {比例} --style raw --v 6.1 --no watermark logo unreadable text。"],
  ["sdxl", "Stable Diffusion / SDXL", "图像提示词 / Stable Diffusion", "适合本地模型、LoRA、ControlNet、批量一致性和精细负面词控制。", "拆成正向提示词、负面提示词、尺寸、采样和参考控制；先锁主体，再迭代风格。"],
  ["flux", "FLUX", "图像提示词 / FLUX", "适合写实商业图、人物、产品、摄影质感和准确语义。", "使用短而具体的自然语言，减少互相冲突的风格词，突出主体和镜头。"],
  ["ideogram", "Ideogram", "图像提示词 / Ideogram", "适合海报、Logo 方向、包装文字和需要可读标题的图片。", "需要文字时把准确文本放入引号，并说明标题、副标题和留白层级。"],
  ["leonardo", "Leonardo AI", "图像提示词 / Leonardo AI", "适合角色、游戏资产、产品图、风格化场景和系列图。", "固定角色设定、材质、镜头距离和后续一致性线索。"],
  ["firefly", "Adobe Firefly", "图像提示词 / Adobe Firefly", "适合品牌安全的商业素材、海报背景、产品环境和设计草图。", "明确商业安全、版式留白、授权素材边界和后期可编辑空间。"],
  ["gemini-image", "Gemini Image", "图像提示词 / Gemini", "适合多轮视觉理解、图片改写、参考图抽象和中文需求转图像。", "先说明参考图只用于结构和用途，再写替换主体、替换场景和输出格式。"],
  ["dalle", "DALL-E", "图像提示词 / DALL-E", "适合清晰自然语言图片生成、插画、概念图和干净版式。", "少堆参数，多写主体关系、场景细节、视角和不需要出现的元素。"],
  ["canva", "Canva Magic Media", "图像提示词 / Canva", "适合社媒封面、广告图、活动图、轻量品牌视觉和营销素材。", "保留标题区、按钮区和后期排版空间，画面不要塞满装饰。"],
  ["recraft", "Recraft", "图像提示词 / Recraft", "适合矢量风格、图标、品牌插图、贴纸和一致性设计资产。", "明确线宽、边角、色板、背景透明或纯色，以及批量一致性要求。"],
  ["pixverse-image", "PixVerse Image", "图像提示词 / PixVerse", "适合为后续视频生成准备首帧、角色定妆和产品关键帧。", "把主体、场景、动作终点和可动画化元素写清楚，方便转为图生视频。"]
].map(([slug, tool, category, strength, settings]) => ({ slug, tool, category, strength, settings, count: 200 }));

const videoPlatforms = [
  ["sora", "Sora", "视频提示词 / Sora", "适合完整场景、电影感镜头、角色动作和自然语言叙事视频。", "写清主体运动、镜头运动、环境运动、时长、画幅和结尾状态。"],
  ["runway", "Runway", "视频提示词 / Runway", "适合广告镜头、图生视频、产品运动、人物动作和短片镜头控制。", "优先描述运动和变化；图生视频不要重复首帧已有内容。"],
  ["veo", "Google Veo", "视频提示词 / Veo", "适合电影级镜头、复杂场景、长镜头和视觉连续性。", "用镜头语言约束景别、焦段感、运镜、光线、节奏和稳定结尾。"],
  ["kling", "可灵 Kling", "视频提示词 / 可灵", "适合图生视频、人物动作、产品广告和中文短视频场景。", "明确首帧保持、动作幅度、背景运动、主体一致性和不要突然转场。"],
  ["pika", "Pika", "视频提示词 / Pika", "适合短循环、轻动画、社媒动效、产品动态和趣味镜头。", "保持单一动作目标，避免多个复杂动作叠加。"],
  ["luma", "Luma Dream Machine", "视频提示词 / Luma", "适合写实镜头、空间移动、场景漫游和自然环境运动。", "强调相机路径、环境层次、深度关系和运动终点。"],
  ["pixverse-video", "PixVerse Video", "视频提示词 / PixVerse", "适合短视频广告、图生视频、角色动作和社媒镜头。", "先写画面首帧，再写主体运动、镜头运动、背景变化和负面约束。"],
  ["jimeng-seedance", "即梦 / Seedance", "视频提示词 / 即梦 Seedance", "适合中文短视频、商业广告、国风镜头、产品展示和人物剧情。", "中文分镜更稳定：镜头、动作、场景、光线、字幕策略分开写。"]
].map(([slug, tool, category, strength, settings]) => ({ slug, tool, category, strength, settings, count: 310 }));

const imageScenarios = [
  ["product-hero", "高端产品主视觉", "为虚构品牌新品制作首屏主视觉，突出产品形体、材质和核心卖点", ["产品类型", "使用场景", "材质", "核心卖点", "文案短句", "画面比例", "目标受众", "风格方向"]],
  ["product-flatlay", "桌面平铺种草图", "把单个商品放入真实生活桌面场景，适合社媒种草和电商卡片", ["商品类型", "桌面场景", "辅助物件", "季节", "色彩偏好", "画面比例", "目标平台", "真实感程度"]],
  ["packaging-system", "包装系列展示", "生成同一虚构品牌下多规格包装陈列，强调系列感和可读标签", ["品类", "包装规格", "品牌气质", "标签文字", "陈列方式", "画面比例", "主色", "材质"]],
  ["skincare-texture", "护肤质地微距图", "展示膏体、液体、凝胶或粉末质地，画面干净但不做疗效承诺", ["产品质地", "容器", "光线", "背景色", "卖点词", "画面比例", "镜头距离", "质感关键词"]],
  ["tech-gadget", "科技小设备广告图", "为虚构电子设备生成可发布的产品广告图，突出功能场景而非夸大承诺", ["设备类型", "功能", "用户场景", "材质", "光线", "画面比例", "界面文字", "动作"]],
  ["home-furniture", "家居家具场景图", "把家具放入可居住空间，强调尺寸关系、动线和温度", ["家具类型", "户型", "风格", "材质", "光线", "画面比例", "生活痕迹", "镜头角度"]],
  ["food-menu", "餐饮菜单主图", "生成菜单或外卖平台可用的食物主图，突出真实质感和份量", ["菜品", "摆盘", "餐具", "背景", "口味关键词", "画面比例", "热气或质感", "标题区"]],
  ["drink-campaign", "饮品季节广告图", "用虚构饮品做季节推广图，强调冷暖、气泡、水珠和场景", ["饮品类型", "季节", "包装", "场景", "文案位置", "画面比例", "温度感", "配料"]],
  ["fashion-accessory", "配饰穿搭大片", "为包袋、眼镜、帽子等配饰生成成人原创人物或无人物穿搭图", ["配饰", "穿搭风格", "人物设定", "姿态", "场景", "画面比例", "光线", "构图"]],
  ["jewelry-macro", "首饰珠宝微距图", "突出首饰反光、切面和佩戴细节，适合详情页或海报", ["首饰类型", "材质", "佩戴方式", "背景", "光线", "画面比例", "焦点", "反光控制"]],
  ["character-sheet", "原创角色设定三视图", "生成原创成年角色的正面、侧面、背面设定，便于后续保持一致", ["角色职业", "年龄段", "服装", "色彩", "道具", "画面比例", "姿态", "风格"]],
  ["single-character-ad", "原创3D单人剧情广告图", "用单个原创3D成年角色完成产品剧情画面，产品和广告语均为虚构", ["角色设定", "虚构产品", "剧情动作", "广告语", "场景", "画面比例", "镜头", "情绪"]],
  ["portrait-avatar", "专业头像与个人品牌照", "生成真实可信的成人头像或个人品牌图，用于简介页和社媒", ["人物身份", "服装", "背景", "表情", "光线", "画面比例", "镜头距离", "行业"]],
  ["team-headshot", "团队成员统一头像", "为虚构团队生成统一风格头像规范，强调一致性而非真实身份冒用", ["团队角色", "风格", "背景", "服装范围", "输出数量", "画面比例", "光线", "头像裁切"]],
  ["mascot-original", "原创品牌吉祥物", "设计不借用现有 IP 的原创品牌形象，适合包装、贴纸和导视", ["品牌性格", "品类", "形体关键词", "表情", "使用场景", "画面比例", "色彩", "动作"]],
  ["event-poster", "活动海报主视觉", "为课程、展览或社区活动生成主海报，预留清晰文字区", ["活动类型", "主题", "时间地点占位", "受众", "氛围", "画面比例", "主视觉", "标题区"]],
  ["social-cover", "社媒轮播封面", "生成可作为第一屏的社媒封面，标题区清晰、钩子明确", ["主题", "平台", "标题", "目标人群", "视觉风格", "画面比例", "冲突点", "留白"]],
  ["banner-ad", "横幅广告素材", "生成网页或信息流横幅，强调产品、利益点和行动按钮区域", ["产品", "利益点", "CTA", "品牌色", "背景元素", "画面比例", "按钮区", "目标人群"]],
  ["app-store-visual", "应用商店功能图", "为虚构应用生成应用商店截图风格图，清楚展示功能模块", ["应用类型", "核心功能", "界面风格", "文案", "设备框", "画面比例", "使用场景", "重点模块"]],
  ["landing-hero", "网站首屏背景图", "生成可放在网站首屏的背景或主视觉，主体明确且不遮挡文案", ["网站类型", "核心服务", "视觉物件", "留白位置", "光线", "画面比例", "受众", "风格"]],
  ["logo-moodboard", "Logo 方向情绪板", "输出品牌标志方向情绪板，不复刻现有商标", ["品牌名", "行业", "关键词", "禁用元素", "配色", "画面比例", "标志形态", "参考气质"]],
  ["brand-moodboard", "品牌视觉情绪板", "生成包含材质、色彩、摄影和版式线索的品牌情绪板", ["品牌气质", "用户群", "色彩", "材质", "参考方向", "画面比例", "摄影语言", "版式"]],
  ["typography-poster", "中文字体海报", "生成中文标题清晰的字体海报，并指定文字必须可读", ["标题", "辅助文案", "字体气质", "构图", "色彩", "画面比例", "文字层级", "背景"]],
  ["infographic", "信息图背景与图标", "为数据说明或流程说明生成清晰的信息图视觉底稿", ["主题", "信息层级", "图标风格", "色彩", "阅读顺序", "画面比例", "模块数量", "留白"]],
  ["editorial-illustration", "专栏配图插画", "为文章或报告生成原创概念插画，避免模仿特定艺术家", ["文章主题", "隐喻", "人物或物件", "风格", "版面", "画面比例", "情绪", "色彩"]],
  ["book-cover", "原创书封面", "生成原创图书封面视觉，标题区清晰且不使用真实书名冒用", ["书籍类型", "标题占位", "情绪", "主体", "字体方向", "画面比例", "读者", "材质"]],
  ["album-cover", "原创音乐封面", "生成原创歌曲或播客封面，匹配曲风和情绪", ["音乐风格", "情绪", "标题占位", "主体", "色彩", "画面比例", "纹理", "构图"]],
  ["thumbnail", "视频缩略图", "生成短视频或课程缩略图，强调一眼可懂的冲突和标题区", ["视频主题", "标题", "人物表情", "场景", "平台", "画面比例", "冲突点", "色彩"]],
  ["comparison-card", "电商对比卡片", "生成两个虚构方案的对比视觉，清晰展示差异点", ["对比对象", "维度", "胜出点", "背景", "文字区", "画面比例", "图标", "色彩"]],
  ["lifestyle-ugc", "生活方式 UGC 图", "用自然手机摄影感展示产品使用场景，避免过度广告感", ["产品", "用户场景", "手部动作", "环境", "真实感程度", "画面比例", "时间", "镜头"]],
  ["before-after", "前后变化示意图", "生成合规的前后变化示意，不做医疗或收益保证", ["变化主题", "前状态", "后状态", "说明文字", "背景", "画面比例", "对比方式", "边界"]],
  ["icon-set", "功能图标套组", "生成同一线宽和风格的功能图标套组", ["功能列表", "线宽", "圆角", "色彩", "背景", "输出数量", "图标尺寸", "风格"]],
  ["sticker-pack", "社媒贴纸套组", "生成原创表情或运营贴纸套组，适合社群传播", ["贴纸主题", "表情数量", "文字短句", "风格", "背景", "画面比例", "角色", "色彩"]],
  ["mockup-scene", "包装或屏幕样机场景", "把设计放入真实使用环境的样机图，保留可替换区域", ["样机类型", "放置环境", "视角", "材质", "画面比例", "替换区域", "光线", "背景"]],
  ["text-poster", "大字报传播图", "生成以清晰短句为中心的传播图，要求文字不变形", ["主标题", "副标题", "语气", "背景", "字体气质", "画面比例", "视觉符号", "留白"]],
  ["billboard", "户外大屏广告", "生成街区或展会大屏广告效果，突出远距离识别", ["产品", "城市氛围", "屏幕尺寸", "文案", "白天或夜晚", "画面比例", "距离", "环境"]],
  ["exhibition-booth", "展台空间概念图", "生成小型展台或快闪店视觉概念，展示动线和陈列", ["品牌类型", "展台面积", "展示物", "材料", "灯光", "画面比例", "动线", "人流"]],
  ["automotive-concept", "概念交通工具海报", "生成原创概念交通工具广告图，不使用真实车标", ["交通工具类型", "功能", "环境", "材质", "镜头", "画面比例", "速度感", "色彩"]],
  ["app-ui-hero", "应用界面宣传图", "生成包含设备界面和功能卖点的宣传图，界面为原创", ["应用场景", "功能模块", "设备", "文案区", "配色", "画面比例", "界面层级", "目标用户"]],
  ["course-poster", "课程招生视觉", "生成课程或训练营宣传图，强调学习结果但不夸大承诺", ["课程主题", "适合人群", "学习成果", "讲师占位", "画面比例", "标题", "视觉隐喻", "CTA"]],
  ["local-shop", "本地门店推广图", "生成餐饮、摄影、健身等本地门店宣传图", ["门店类型", "服务", "地址占位", "优惠描述", "场景", "画面比例", "顾客", "氛围"]],
  ["festival-card", "节日祝福卡片", "生成品牌节日卡片，表达克制、不使用受保护形象", ["节日", "品牌语气", "祝福语", "元素", "色彩", "画面比例", "版式", "目标人群"]],
  ["real-estate", "房产空间宣传图", "生成户型或空间宣传视觉，强调采光、收纳和生活方式", ["空间类型", "面积", "风格", "目标客户", "镜头", "画面比例", "窗景", "生活物件"]],
  ["training-diagram", "培训流程图视觉", "生成适合 PPT 或手册的流程图页面", ["培训主题", "步骤", "图标风格", "品牌色", "画面比例", "阅读顺序", "模块", "输出尺寸"]],
  ["data-dashboard", "数据看板宣传图", "生成虚构数据看板界面，用于产品介绍或汇报", ["业务场景", "指标", "界面风格", "重点模块", "画面比例", "设备", "图表类型", "色彩"]],
  ["newsletter-cover", "电子报封面", "生成每周简报或邮件头图，主题明确且留有标题区", ["简报主题", "读者", "主标题", "视觉隐喻", "画面比例", "色彩", "节奏", "品牌语气"]],
  ["storyboard-frame", "广告分镜关键帧", "生成一张广告分镜关键画面，用于视频前期确认", ["广告目标", "镜头编号", "角色", "动作", "场景", "画面比例", "镜头", "情绪"]],
  ["image-repair-brief", "图片修复改写指令", "把有瑕疵的图片转成清晰修复提示，保留主体身份边界", ["原图问题", "保留元素", "修复目标", "禁止改动", "比例", "工具", "输出要求", "边界"]],
  ["reference-remix", "参考图原创重构", "基于参考图提炼结构后重做原创画面，不复刻风格或受保护元素", ["参考图用途", "保留结构", "替换元素", "原创方向", "比例", "目标平台", "禁用元素", "输出格式"]],
  ["sales-onepager", "销售单页视觉", "生成适合销售材料首页的视觉，突出问题、方案和成果", ["客户类型", "解决方案", "证据点", "CTA", "比例", "场景", "主视觉", "标题区"]],
  ["clean-background", "产品白底与浅景深图", "生成电商白底或浅景深图，便于抠图和详情页使用", ["产品", "角度", "阴影", "背景色", "输出比例", "材质", "清洁程度", "后期用途"]]
].map(([slug, title, scene, variables]) => ({ slug, title, scene, variables }));

const videoScenarios = [
  ["product-demo-6s", "6秒产品演示", "用一个清晰动作展示产品从出现到完成使用的闭环", ["产品", "手部动作", "使用前后", "场景", "时长", "画面比例", "结尾状态", "光线"]],
  ["product-ad-15s", "15秒产品广告", "用问题、展示、结果、收尾四段结构做短广告", ["产品", "痛点", "卖点", "主角", "CTA", "画面比例", "镜头顺序", "字幕策略"]],
  ["app-walkthrough", "应用功能走查", "用镜头推进展示虚构应用的关键功能界面", ["应用类型", "功能流程", "设备", "用户目标", "时长", "画面比例", "界面重点", "手势"]],
  ["unboxing-hand", "无脸开箱展示", "只用手部和桌面完成开箱、展示、特写和收纳", ["产品", "包装", "桌面道具", "动作节奏", "镜头", "画面比例", "光线", "结尾"]],
  ["coffee-process", "饮品制作过程", "展示饮品从原料到成品的连续过程", ["饮品", "步骤", "器具", "光线", "音效", "画面比例", "时长", "成品状态"]],
  ["fashion-look", "单人穿搭展示", "原创成年人物完成转身、走近、细节展示", ["人物设定", "服装", "场景", "动作", "镜头", "画面比例", "光线", "节奏"]],
  ["skincare-routine", "护肤使用流程", "用合规语言展示质地和使用步骤，不暗示治疗效果", ["产品", "步骤", "人物或手部", "浴室或桌面", "画面比例", "质地", "镜头", "边界"]],
  ["kitchen-device", "厨房设备演示", "展示小家电或工具的准备、操作和结果", ["设备", "食材", "操作", "结果", "场景", "画面比例", "镜头", "节奏"]],
  ["travel-establishing", "旅行开场空镜", "为旅行短片生成环境开场镜头，建立地点氛围", ["地点类型", "时间", "天气", "镜头运动", "时长", "画面比例", "人流", "情绪"]],
  ["interior-tour", "室内空间漫游", "从入口到核心区域的连续空间展示", ["空间类型", "风格", "动线", "镜头高度", "光线", "画面比例", "家具", "结尾"]],
  ["real-estate-tour", "房源卖点短片", "用三段镜头展示采光、收纳和生活方式", ["房源类型", "卖点", "镜头顺序", "目标客户", "画面比例", "窗景", "动线", "字幕"]],
  ["event-promo", "活动预热视频", "用场地、人物、议程和收尾信息组成预热短片", ["活动", "场地", "观众", "亮点", "文字策略", "画面比例", "节奏", "CTA"]],
  ["training-explainer", "培训说明短片", "把复杂流程拆成可视化步骤，适合员工培训", ["培训主题", "步骤", "角色", "场景", "输出比例", "图标", "旁白", "节奏"]],
  ["onboarding-steps", "新用户引导视频", "用屏幕和生活场景解释从注册到完成任务的过程", ["产品", "用户目标", "步骤", "设备", "时长", "画面比例", "手势", "字幕"]],
  ["ugc-testimonial", "虚构用户体验口播", "原创成年人物用自然口吻介绍体验，避免真实背书冒用", ["人物设定", "产品", "体验点", "语气", "场景", "画面比例", "时长", "镜头"]],
  ["single-character-story", "单人微剧情", "单个原创角色经历发现问题、尝试、解决的短剧情", ["角色", "问题", "转折", "产品或方案", "对白", "画面比例", "情绪", "结尾"]],
  ["three-d-character-ad", "3D角色产品剧情", "原创3D成年角色与虚构产品互动形成广告画面", ["角色", "产品", "动作", "场景", "广告语", "画面比例", "镜头", "材质"]],
  ["before-after-video", "前后变化展示", "合规展示流程变化，不做医疗、收益或绝对效果承诺", ["变化主题", "前状态", "过程", "后状态", "文字", "画面比例", "镜头", "边界"]],
  ["object-to-scene", "物体引出场景", "从一个物件特写自然转场到完整使用场景", ["物件", "场景", "转场方式", "镜头运动", "画面比例", "光线", "动作", "结尾"]],
  ["logo-reveal", "原创品牌开场动画", "为虚构品牌做简洁片头，不使用真实商标", ["品牌名", "符号", "材质", "动画节奏", "比例", "背景", "声音", "结尾"]],
  ["weather-mood", "天气氛围短片", "用天气和光线表现产品或空间情绪", ["场景", "天气", "主体", "镜头", "音效", "画面比例", "时长", "情绪"]],
  ["cinematic-broll", "电影感 B-roll", "生成可插入广告或 Vlog 的质感空镜", ["主体", "环境", "镜头", "光线", "动作", "画面比例", "节奏", "结尾"]],
  ["social-hook", "前三秒钩子视频", "用强视觉动作在前三秒交代问题或结果", ["主题", "钩子", "主体动作", "字幕策略", "比例", "平台", "冲突点", "结尾"]],
  ["ecommerce-loop", "电商循环动图视频", "为商品卡片生成可循环的微动效", ["商品", "运动方式", "背景", "循环点", "比例", "光线", "质感", "时长"]],
  ["food-motion", "食物动态特写", "展示热气、拉丝、倒入、切开等食物动作", ["食物", "动作", "器具", "光线", "声音", "画面比例", "速度", "结尾"]],
  ["drink-pour", "饮品倒入镜头", "通过液体倒入、气泡和水珠体现清爽感", ["饮品", "杯型", "配料", "镜头", "光线", "比例", "动作速度", "背景"]],
  ["beauty-texture-motion", "美妆质地动态", "展示膏体、粉末、刷头、反光和轻微使用动作", ["产品", "质地", "工具", "动作", "镜头", "比例", "光线", "边界"]],
  ["tech-interface", "科技界面动效", "展示虚构界面、数据流和设备反馈", ["设备", "界面功能", "数据元素", "手势", "镜头", "比例", "色彩", "结尾"]],
  ["workspace-routine", "工作流场景短片", "展示创作者或团队从输入到输出的工作过程", ["角色", "工具", "输入材料", "输出成果", "镜头", "比例", "节奏", "字幕"]],
  ["education-short", "知识解释短视频", "用可视化场景解释一个概念", ["概念", "例子", "目标观众", "视觉隐喻", "时长", "比例", "字幕", "收尾"]],
  ["finance-explainer", "经营指标解释视频", "用图形和场景解释指标变化，不做投资建议", ["指标", "业务场景", "变化", "图表", "时长", "比例", "旁白", "边界"]],
  ["fitness-routine", "运动动作演示", "原创成年人展示安全的基础动作和节奏", ["动作", "人物", "场地", "镜头", "时长", "比例", "节奏", "注意事项"]],
  ["pet-product", "宠物用品展示", "展示虚构宠物用品的使用场景和产品细节", ["用品", "宠物类型", "场景", "动作", "镜头", "比例", "情绪", "结尾"]],
  ["kids-product-safe", "亲子用品场景", "用家长视角展示虚构亲子用品，避免敏感身份和过度承诺", ["用品", "成年人角色", "家庭场景", "动作", "镜头", "比例", "文字", "边界"]],
  ["festival-ad", "节日品牌短片", "生成克制的节日品牌问候或促销氛围短片", ["节日", "品牌气质", "主体", "场景", "镜头", "比例", "文案", "结尾"]],
  ["music-visualizer", "音乐视觉循环", "为原创音乐生成抽象或场景化循环视频", ["音乐情绪", "主体", "色彩", "运动", "循环点", "比例", "节奏", "材质"]],
  ["poster-to-video", "海报转动态视频", "把静态海报拆成前景、中景、背景的轻动画", ["海报主题", "前景", "中景", "背景", "运动幅度", "比例", "时长", "结尾"]],
  ["storyboard-sequence", "多镜头分镜脚本", "生成 3 到 5 个镜头的短片分镜", ["故事目标", "角色", "场景", "镜头数量", "时长", "比例", "情绪", "转场"]],
  ["image-to-video-subtle", "图片轻运动图生视频", "让上传图片产生细微运动，保持主体稳定", ["首帧内容", "主体", "允许运动", "禁止变化", "镜头", "比例", "时长", "背景运动"]],
  ["image-to-video-action", "图片动作增强图生视频", "在首帧基础上增加明确动作，但不改变主体身份", ["首帧内容", "动作", "幅度", "镜头", "环境变化", "比例", "时长", "结尾"]],
  ["character-continuity", "角色一致性视频", "保持原创角色在多个动作中身份稳定", ["角色设定", "服装", "动作", "场景", "镜头", "比例", "时长", "稳定要求"]],
  ["product-turntable", "产品转台视频", "展示产品 180 度或 360 度旋转及材质细节", ["产品", "角度范围", "材质", "背景", "灯光", "比例", "速度", "结尾"]],
  ["macro-motion", "微距动态镜头", "用微距展示材质、液体、颗粒或机械细节", ["主体", "材质", "动作", "镜头", "光线", "比例", "速度", "背景"]],
  ["city-night", "城市夜景氛围视频", "生成城市夜景、霓虹、雨水或车流的氛围镜头", ["城市类型", "天气", "主体", "镜头运动", "光线", "比例", "时长", "情绪"]],
  ["nature-loop", "自然环境循环视频", "生成风、雾、水、树影等自然轻运动循环", ["环境", "主体", "天气", "运动", "循环点", "比例", "时长", "声音"]],
  ["commercial-ending", "广告收尾定格", "生成适合放置产品名和行动按钮的收尾画面", ["产品", "收尾动作", "背景", "文字区", "镜头", "比例", "时长", "CTA"]],
  ["live-commerce", "直播间商品讲解片段", "生成虚构直播间产品展示镜头和字幕策略", ["商品", "讲解角色", "卖点", "桌面", "镜头", "比例", "字幕", "边界"]],
  ["shelf-display", "货架陈列短片", "展示商品在货架、展台或橱窗中的陈列", ["商品系列", "陈列环境", "镜头", "光线", "动作", "比例", "文字", "结尾"]],
  ["restaurant-promo", "餐厅菜品推广视频", "用厨房、上桌、特写和氛围完成餐厅宣传", ["菜品", "餐厅风格", "厨师或手部", "镜头", "光线", "比例", "声音", "收尾"]],
  ["hotel-room", "酒店空间短片", "展示客房、灯光、窗景和服务氛围", ["酒店类型", "空间", "镜头路径", "光线", "客群", "比例", "时长", "收尾"]],
  ["fashion-accessory-motion", "配饰动态展示", "展示包袋、眼镜、首饰等配饰的佩戴和细节", ["配饰", "人物或手部", "动作", "场景", "镜头", "比例", "光线", "结尾"]],
  ["cosmetic-swatch", "彩妆试色动态", "展示原创彩妆色块、刷头和质地变化", ["产品", "颜色", "动作", "肤色或背景", "镜头", "比例", "光线", "边界"]],
  ["toy-collectible", "原创玩具潮玩展示", "展示原创潮玩角色或摆件，不借用现有 IP", ["玩具设定", "动作", "场景", "镜头", "材质", "比例", "光线", "结尾"]],
  ["game-asset-preview", "原创游戏资产预览", "展示原创道具、场景或角色资产的短视频", ["资产类型", "风格", "展示角度", "动作", "灯光", "比例", "时长", "边界"]],
  ["architecture-concept", "建筑概念漫游", "展示原创建筑体量、入口、材质和空间体验", ["建筑类型", "场地", "材质", "镜头路径", "光线", "比例", "人流", "结尾"]],
  ["industrial-process", "工业流程展示", "用安全、抽象的方式展示制造或装配流程", ["流程", "设备", "材料", "动作", "镜头", "比例", "节奏", "安全边界"]],
  ["medical-visual-safe", "健康科普视觉短片", "用非诊断方式展示健康知识或生活方式提示", ["科普主题", "视觉隐喻", "角色", "动作", "镜头", "比例", "文字", "边界"]],
  ["public-service", "公益提示短片", "生成公益提醒或公共服务主题短片", ["主题", "受众", "场景", "行动", "镜头", "比例", "文案", "收尾"]],
  ["documentary-moment", "纪录片观察镜头", "生成克制的观察式镜头，强调真实氛围和人物动作", ["人物或场景", "事件", "环境", "镜头", "光线", "比例", "时长", "情绪"]],
  ["music-video-scene", "原创音乐短片场景", "为原创歌曲生成一段可剪辑的音乐视频镜头", ["歌曲情绪", "角色", "场景", "动作", "镜头", "比例", "色彩", "节奏"]],
  ["micro-drama-cover", "短剧封面动态", "生成短剧片头或封面动效，强化人物关系和冲突", ["短剧题材", "角色关系", "冲突", "场景", "镜头", "比例", "标题区", "结尾"]],
  ["museum-exhibit-teaser", "展览空间预告视频", "用展品、观众动线和灯光变化生成展览或快闪空间预热视频", ["展览主题", "展品", "观众", "动线", "镜头", "比例", "时长", "灯光"]]
].map(([slug, title, scene, variables]) => ({ slug, title, scene, variables }));

const imageVariants = [
  ["hero", "主视觉版", "主体居中，第一眼识别产品或角色，适合首页和广告首图。"],
  ["detail", "详情页版", "增加材质、纹理、边缘和功能细节，适合商品详情和案例页。"],
  ["social", "社媒封面版", "保留标题区和安全边距，适合小红书、抖音、视频封面和轮播首图。"],
  ["campaign", "投放广告版", "突出利益点、行动区和品牌安全边界，适合信息流广告。"]
].map(([slug, label, focus]) => ({ slug, label, focus }));

const videoVariants = [
  ["single-shot", "单镜头版", "一个连续镜头完成动作，减少跳帧和身份漂移。"],
  ["three-act", "三段式版", "开头交代问题，中段展示变化，结尾形成可截图的稳定画面。"],
  ["image-to-video", "图生视频版", "把首帧作为构图和主体依据，只描述运动和环境变化。"],
  ["storyboard", "分镜版", "拆成 3 到 5 个镜头，每个镜头只承担一个动作目标。"],
  ["loop", "循环动效版", "首尾状态自然衔接，适合商品卡片、背景视频和社媒循环。"]
].map(([slug, label, focus]) => ({ slug, label, focus }));

const imageDefaults = {
  "产品类型": "虚构高端便携咖啡机",
  "商品类型": "低糖燕麦饮",
  "使用场景": "清晨厨房台面",
  "材质": "磨砂金属与半透明玻璃",
  "核心卖点": "快速、安静、易清洁",
  "文案短句": "Morning Ready",
  "画面比例": "4:5",
  "目标受众": "城市通勤人群",
  "风格方向": "现代商业摄影",
  "场景": "自然光工作台",
  "光线": "柔和侧逆光",
  "比例": "9:16",
  "标题区": "画面上方三分之一留白"
};

const videoDefaults = {
  "产品": "虚构智能桌面灯",
  "主体": "原创成年角色与产品",
  "动作": "从关闭到点亮，再切到使用细节",
  "场景": "夜晚书桌",
  "镜头": "缓慢推进",
  "镜头运动": "slow dolly in",
  "时长": "8 秒",
  "画面比例": "9:16",
  "比例": "9:16",
  "结尾状态": "产品稳定居中，右侧留标题区",
  "光线": "暖色桌面灯与冷色环境对比"
};

const today = () => new Date().toISOString().slice(0, 10);
const pad = (value, size = 3) => String(value + 1).padStart(size, "0");
const unique = (values) => [...new Set(values.filter(Boolean))];
const variableToken = (name) => `{${name}}`;
const variableLine = (name, defaults) => `- {${name}}：填写${name}，默认可参考“${defaults[name] || "待定"}”；复制使用时只替换花括号内关键词。`;
const negativePrompt = "low quality, blurry, unreadable text, watermark, logo misuse, distorted hands, duplicate body parts, inconsistent identity, broken anatomy, random subtitles, noisy background";

function accessFor(index, modality) {
  if (index % 11 === 0) return { access: "pack", packId: modality === "图像" ? "image-product-pro" : "video-commerce-pro" };
  if (index % 7 === 0) return { access: "pro", packId: "" };
  return { access: "free", packId: "" };
}

function parameterLine(platform, modality) {
  if (platform.slug === "midjourney") return "--ar {画面比例} --style raw --v 6.1 --no watermark logo unreadable text extra fingers";
  if (platform.slug === "sdxl") return "正向提示词 + negative prompt；尺寸 {画面比例} 对应 1024x1024、1024x1536 或 1536x1024；必要时使用 ControlNet 锁构图。";
  if (platform.slug === "ideogram") return "将需要出现的文字放在英文引号中；其余文字保持不生成。";
  if (modality === "视频") return "时长 {时长}；画幅 {画面比例}；单镜头优先；图生视频先锁首帧，再控制主体运动、镜头运动和环境运动。";
  return platform.settings;
}

function makeVariableDefaults(variables, defaults) {
  return Object.fromEntries(variables.map((name) => [name, defaults[name] || "待定"]));
}

function makeCopyPrompt({ platform, scenario, variant, modality, variables }) {
  const defaults = modality === "图像" ? imageDefaults : videoDefaults;
  const get = (name) => variableToken(name || "关键词");
  const subject = get(variables[0]);
  const scene = get(variables[1] || "场景");
  const third = get(variables[2] || "风格方向");
  const fourth = get(variables[3] || "光线");
  const ratio = get(variables.find((item) => item.includes("比例")) || "画面比例");

  if (modality === "图像") {
    return `请使用 ${platform.tool} 生成一张「${scenario.title}」图片。画面主体是 ${subject}，使用场景为 ${scene}，重点呈现 ${third}，整体风格、情绪和色彩氛围为 ${fourth}，采用 ${ratio} 构图。${variant.focus} 构图需要有清晰视觉中心、前中后景层次、可见材质细节、可控光影和后期排版留白。文字只允许出现用户明确填写的短句，其他区域保持无文字。输出必须商业安全、原创、可直接用于图片生成。`;
  }

  return `请使用 ${platform.tool} 生成一段「${scenario.title}」视频。主体是 ${subject}，发生在 ${scene}，核心动作围绕 ${third} 展开，镜头使用 ${fourth} 或同等稳定运镜，画幅为 ${ratio}。${variant.focus} 前 3 秒交代主体和目标，中段展示动作变化，结尾停在可作为封面的稳定画面。保持主体、服装、道具、产品外观、光线和空间方向一致；不要突然切换场景、不要身份漂移、不要生成随机文字。`;
}

function imageBody({ platform, scenario, variant, variables, copyPrompt }) {
  const variableLines = variables.map((name) => variableLine(name, imageDefaults)).join("\n");
  const parameter = parameterLine(platform, "图像");
  return `适用工具：${platform.tool}。${platform.strength}
适用平台：${platform.tool}
适用场景：${scenario.scene}。本模板为「${variant.label}」，目标是让使用者复制后只替换变量即可生成图片。

输入变量：
${variableLines}

可替换关键词：
${variables.map((name) => `- ${variableToken(name)}`).join("\n")}

复制即用提示词：
${copyPrompt}

平台适配写法：
- ${platform.tool} 的重点设置：${platform.settings}
- 参数建议：${parameter}
- 如果需要批量生成同系列图片，请固定主体名称、材质、主色、镜头距离和画面比例，只替换场景、动作或文案。

图像结构要求：
- 主体：必须清楚、完整、无遮挡，轮廓和材质可辨认。
- 场景：背景服务主体，不堆砌无关装饰，不抢标题区。
- 构图：包含景别、镜头角度、焦段感、前景/中景/背景层次和安全留白。
- 光影：写清主光、辅助光、反光、阴影方向、色彩氛围和画面情绪。
- 文案：如需要画面文字，只出现变量中填写的短句；如不需要文字，明确保持无文字。
- 负面词：${negativePrompt}

质量标准：
- 主体、场景、动作、构图、镜头、光线、色彩、情绪、画面比例和输出格式都能被直接检查。
- 输出结果要能进入真实发布、设计提案或视频首帧工作流，不只停留在概念描述。
- 每条提示词必须复制即用，变量必须可替换，平台参数必须与 ${platform.tool} 匹配。

参数/设置建议：
- 先生成无文字版本，再单独处理标题和卖点文字。
- 人物必须是原创成年人；产品、包装、标志和广告语使用虚构或已授权内容。
- 需要参考图时，只抽象构图、材质和用途，不复刻受保护元素或具体风格。

迭代方法：
1. 第一轮只检查主体、构图、画面比例和可读性。
2. 第二轮锁定主体，微调光线、材质、文字区、背景层次和风格强度。
3. 第三轮输出发布版：边缘干净、无多余文字、无结构错误、无未授权标识。

常见失败修正：
- 如果主体变形：减少附加元素，重写主体形状、材质、颜色和镜头距离。
- 如果文字不可读：缩短文字，只保留一句准确短句，并增加留白。
- 如果风格跑偏：删除抽象形容词，改用可见的摄影、材质、光线和构图描述。
- 如果像某个现成品牌：替换包装、标识、配色和口号，改成虚构品牌。

边界提醒：
- 只使用原创或已授权素材，不冒用可识别商业标识、公众人物肖像、受保护角色或第三方提示词原文。
- 涉及健康、财务、法律效果时只做视觉表达，不写保证性承诺。
- 不生成误导用户、虚假背书、侵权或规避平台规则的内容。`;
}

function videoBody({ platform, scenario, variant, variables, copyPrompt }) {
  const variableLines = variables.map((name) => variableLine(name, videoDefaults)).join("\n");
  const parameter = parameterLine(platform, "视频");
  return `适用工具：${platform.tool}。${platform.strength}
适用平台：${platform.tool}
适用场景：${scenario.scene}。本模板为「${variant.label}」，目标是让使用者复制后只替换变量即可生成视频。

输入变量：
${variableLines}

可替换关键词：
${variables.map((name) => `- ${variableToken(name)}`).join("\n")}

复制即用提示词：
${copyPrompt}

平台适配写法：
- ${platform.tool} 的重点设置：${platform.settings}
- 参数建议：${parameter}
- 图生视频时，把参考图作为首帧构图和主体外观依据，只描述主体运动、镜头运动和环境运动。

视频镜头要求：
- 主体运动：写清主体如何移动、停顿、转身、使用产品或完成动作。
- 镜头运动：写清推近、拉远、跟拍、环绕、俯拍、平移或固定机位，只保留一个主运镜。
- 环境运动：写清灯光闪动、雨滴、蒸汽、布料、屏幕反馈或背景人流等细节。
- 节奏/时长：前 3 秒交代主体和目标，中段展示变化，结尾停在稳定画面；总时长使用 {时长}。
- 一致性约束：保持主体身份、服装、道具、产品外观、空间方向、光线和色彩连续。
- 负面词：${negativePrompt}, jump cut, face drift, identity drift, random scene change, flickering text

质量标准：
- 每个镜头都必须包含主体、动作、场景、镜头运动、时间进展、结尾状态和画面比例。
- 画面与广告词、字幕、口播或声音必须对应，不能只靠文案解释卖点。
- 输出要能进入短视频、广告分镜、图生视频或后期剪辑工作流。
- 每条提示词必须复制即用，变量必须可替换，平台参数必须与 ${platform.tool} 匹配。

参数/设置建议：
- 一个提示词优先只描述一个核心镜头；多镜头广告拆成镜头 1、镜头 2、镜头 3 分别生成。
- 动作失败时先缩短时长，再降低动作幅度，最后拆分为多段镜头。
- 需要字幕时只写字幕策略，不要求模型在画面中生成大量小字。

迭代方法：
1. 第一轮检查主体是否稳定、动作是否完整、镜头是否过快。
2. 第二轮只改一个变量：动作幅度、镜头方向、光线或结尾状态。
3. 第三轮补齐音频、字幕策略、封面帧和可发布版本。

常见失败修正：
- 如果主体漂移：强调保持首帧主体外观完全一致，并缩短视频时长。
- 如果动作混乱：把多个动作拆成连续步骤，每步只保留一个动词。
- 如果镜头跳变：要求单镜头、无切换、无突然转场。
- 如果广告词和画面不对应：把卖点拆成可见动作，让每句话都有画面证据。

边界提醒：
- 使用虚构品牌、原创角色和授权素材；不冒用真实代言、影视桥段或现有广告语。
- 不生成欺骗性新闻、虚假背书、医疗疗效保证、金融收益保证或规避平台规则的内容。
- 人物对白应自然克制，避免攻击、歧视或诱导性表达。`;
}

function makePrompt({ platform, scenario, variant, index, globalIndex, modality }) {
  const variables = unique([...scenario.variables, modality === "图像" ? "目标平台" : "时长", "输出格式"]).slice(0, 10);
  const copyPrompt = makeCopyPrompt({ platform, scenario, variant, modality, variables });
  const body = modality === "图像"
    ? imageBody({ platform, scenario, variant, variables, copyPrompt })
    : videoBody({ platform, scenario, variant, variables, copyPrompt });
  const { access, packId } = accessFor(globalIndex, modality);
  const stamp = today();

  return {
    id: `${V2_PREFIX}${modality === "图像" ? "image" : "video"}-${platform.slug}-${scenario.slug}-${variant.slug}`,
    title: `${platform.tool} · ${scenario.title} · ${variant.label}`,
    category: platform.category,
    tags: unique([
      `工具:${platform.tool}`,
      `模态:${modality}`,
      `用途:${scenario.title}`,
      index % 3 === 0 ? "难度:入门" : index % 3 === 1 ? "难度:中级" : "难度:进阶",
      "官方结构参考:否",
      "一键复制模板",
      "可替换关键词",
      "图片视频生成",
      platform.slug,
      scenario.slug,
      variant.slug
    ]),
    variables: variables.map(variableToken),
    status: "推荐",
    summary: `${platform.tool} 适用的「${scenario.title}」${variant.label}：${scenario.scene}，包含复制即用正文、可替换关键词、平台参数、失败修正和安全边界。`,
    body,
    source: SOURCE,
    createdAt: stamp,
    updatedAt: stamp,
    archived: false,
    access,
    packId,
    stripePriceId: "",
    qualityScore: modality === "图像" ? 90 : 92,
    exampleOutput: modality === "图像"
      ? `输出一张可用于 ${scenario.title} 的完整图片生成提示词，已适配 ${platform.tool}。`
      : `输出一段可用于 ${scenario.title} 的完整视频生成提示词，已适配 ${platform.tool}。`,
    sourceType: "generated-visual-library",
    verifiedAt: stamp,
    seoKeywords: unique([
      platform.tool,
      modality,
      scenario.title,
      variant.label,
      "AI提示词",
      modality === "图像" ? "图像生成提示词" : "视频生成提示词",
      "一键复制",
      "可替换关键词",
      "商业视觉",
      "AIGC"
    ]).slice(0, 20),
    qualityAudit: {
      copyReady: true,
      qualityLevel: "professional",
      missingFields: [],
      improvementSuggestion: "已包含适用平台、可替换关键词、复制即用正文、参数建议、质量标准、失败修正和安全边界。"
    },
    contentType: modality === "图像" ? "image-template" : "video-template",
    promptKind: modality === "图像" ? "image" : "video",
    platform: platform.tool,
    model: platform.slug,
    language: "zh-CN",
    aspectRatio: modality === "图像" ? "{画面比例}" : "{画面比例}",
    variableDefaults: makeVariableDefaults(variables, modality === "图像" ? imageDefaults : videoDefaults),
    copyPrompt,
    negativePrompt,
    usageTips: modality === "图像"
      ? "先替换关键词，再复制完整提示词；首轮确认构图和主体，第二轮再调材质、光线和文字区。"
      : "先替换关键词，再复制完整提示词；图生视频先锁首帧，文生视频先锁主体运动和镜头运动。",
    parameterTips: parameterLine(platform, modality)
  };
}

function buildGeneratedPrompts() {
  const prompts = [];
  let globalIndex = 0;
  for (const platform of imagePlatforms) {
    for (let index = 0; index < platform.count; index += 1) {
      const scenario = imageScenarios[index % imageScenarios.length];
      const variant = imageVariants[Math.floor(index / imageScenarios.length) % imageVariants.length];
      prompts.push(makePrompt({ platform, scenario, variant, index, globalIndex, modality: "图像" }));
      globalIndex += 1;
    }
  }
  for (const platform of videoPlatforms) {
    for (let index = 0; index < platform.count; index += 1) {
      const scenario = videoScenarios[index % videoScenarios.length];
      const variant = videoVariants[Math.floor(index / videoScenarios.length) % videoVariants.length];
      prompts.push(makePrompt({ platform, scenario, variant, index, globalIndex, modality: "视频" }));
      globalIndex += 1;
    }
  }
  return prompts;
}

async function main() {
  const generated = buildGeneratedPrompts();
  const imageCount = generated.filter((prompt) => prompt.promptKind === "image").length;
  const videoCount = generated.filter((prompt) => prompt.promptKind === "video").length;
  if (generated.length !== TARGET_GENERAL_PROMPTS) throw new Error(`Expected ${TARGET_GENERAL_PROMPTS} visual prompts, got ${generated.length}`);
  if (imageCount !== TARGET_IMAGE_PROMPTS) throw new Error(`Expected ${TARGET_IMAGE_PROMPTS} image prompts, got ${imageCount}`);
  if (videoCount !== TARGET_VIDEO_PROMPTS) throw new Error(`Expected ${TARGET_VIDEO_PROMPTS} video prompts, got ${videoCount}`);

  const raw = JSON.parse(await readFile(libraryPath, "utf8"));
  const cinematic = Array.isArray(raw.prompts)
    ? raw.prompts.filter((prompt) => String(prompt?.id || "").startsWith("cinematic-"))
    : [];
  if (cinematic.length !== 120) {
    throw new Error(`Expected 120 cinematic prompts before visual generation, got ${cinematic.length}. Run generate:cinematic-prompts first.`);
  }

  raw.version = 2;
  raw.updatedAt = today();
  raw.prompts = [
    ...cinematic,
    ...generated
  ].filter((prompt) => {
    const id = String(prompt?.id || "");
    return !id.startsWith(OLD_PREFIX) || id.startsWith("cinematic-");
  });
  raw.assets = Array.isArray(raw.assets) ? raw.assets : [];

  if (raw.prompts.length !== TARGET_TOTAL_WITH_CINEMATIC) {
    throw new Error(`Expected ${TARGET_TOTAL_WITH_CINEMATIC} total prompts, got ${raw.prompts.length}`);
  }

  await writeFile(libraryPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  console.log(`Kept cinematic prompts: ${cinematic.length}`);
  console.log(`Generated image prompts: ${imageCount}`);
  console.log(`Generated video prompts: ${videoCount}`);
  console.log(`Total prompts: ${raw.prompts.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
