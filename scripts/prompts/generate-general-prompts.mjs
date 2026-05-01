import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, "../..");
const libraryPath = path.join(repoRoot, "prompts-data", "library.json");
const ID_PREFIX = "general-template-";
const SOURCE = "原创批量生成 / 通用提示词模板库";

const categories = [
  { name: "写作/长文与改写", slug: "writing-longform-rewrite", domain: "长文写作、结构改写、报告润色和观点表达", role: "资深中文写作编辑", object: "文章、报告、专栏、说明稿或深度内容", output: "结构清晰、语气稳定、可直接编辑的长文方案", metrics: "逻辑连贯、信息完整、段落节奏、读者理解成本", vars: ["{主题}", "{目标读者}", "{篇幅}", "{语气}", "{参考材料}"], tags: ["写作", "改写", "长文"] },
  { name: "写作/社媒短文案", slug: "writing-social-copy", domain: "社媒短内容、标题、开头钩子和多平台文案", role: "社媒内容策划", object: "短文案、帖子、标题、评论区引导或发布说明", output: "可发布、可拆分、适合快速测试的短内容组合", metrics: "开头吸引力、信息密度、平台语气、行动引导", vars: ["{主题}", "{平台}", "{目标人群}", "{语气}", "{字数限制}"], tags: ["社媒", "短文案", "标题"] },
  { name: "营销/品牌定位", slug: "marketing-brand-positioning", domain: "品牌定位、价值主张、差异化和传播策略", role: "品牌策略顾问", object: "虚构品牌、产品线、服务方案或品牌升级项目", output: "定位清晰、差异明显、可落地的品牌策略稿", metrics: "差异化、可信度、记忆点、目标客群匹配度", vars: ["{品牌或项目}", "{目标客群}", "{核心优势}", "{竞品背景}", "{传播语气}"], tags: ["营销", "品牌", "定位"] },
  { name: "营销/广告转化", slug: "marketing-ad-conversion", domain: "广告创意、转化路径、落地页信息和投放素材", role: "增长广告策划", object: "广告脚本、落地页模块、转化文案或素材测试方案", output: "以转化为目标的创意方案和测试清单", metrics: "卖点清晰、证据充分、行动明确、承诺克制", vars: ["{产品或服务}", "{目标受众}", "{核心卖点}", "{转化目标}", "{投放场景}"], tags: ["广告", "转化", "增长"] },
  { name: "电商/商品页与种草", slug: "ecommerce-product-seeding", domain: "商品详情页、种草内容、卖点表达和购买决策辅助", role: "电商内容经理", object: "商品页、种草笔记、产品对比或购买指南", output: "突出真实使用价值的电商内容框架", metrics: "卖点可信、场景具体、信息层级、购买阻力降低", vars: ["{商品类型}", "{目标用户}", "{使用场景}", "{价格带}", "{核心卖点}"], tags: ["电商", "商品页", "种草"] },
  { name: "销售/外联与谈判", slug: "sales-outreach-negotiation", domain: "销售外联、客户沟通、跟进节奏和谈判准备", role: "B2B 销售教练", object: "外联邮件、电话提纲、跟进话术或谈判计划", output: "尊重客户、目标明确、可执行的销售沟通稿", metrics: "客户相关性、下一步清晰、语气专业、信息不夸张", vars: ["{客户类型}", "{产品或服务}", "{沟通阶段}", "{客户痛点}", "{期望下一步}"], tags: ["销售", "外联", "谈判"] },
  { name: "客服/回复与知识库", slug: "support-replies-knowledge-base", domain: "客户回复、知识库文章、问题排查和服务一致性", role: "客户体验负责人", object: "客服回复、FAQ、工单处理说明或知识库条目", output: "友好、准确、可复用的服务沟通内容", metrics: "理解问题、步骤清晰、语气稳定、升级边界明确", vars: ["{用户问题}", "{产品背景}", "{处理规则}", "{可提供方案}", "{升级条件}"], tags: ["客服", "知识库", "FAQ"] },
  { name: "商务/战略分析", slug: "business-strategy-analysis", domain: "商业判断、竞争环境、机会评估和战略选择", role: "商业分析顾问", object: "市场机会、业务策略、竞争分析或管理层简报", output: "结构化、证据导向、便于决策的分析稿", metrics: "假设清楚、证据分层、取舍明确、风险可见", vars: ["{业务背景}", "{目标市场}", "{关键问题}", "{可用数据}", "{决策期限}"], tags: ["商务", "战略", "分析"] },
  { name: "创业/商业计划", slug: "startup-business-plan", domain: "创业构想、商业模式、MVP、融资材料和早期验证", role: "创业项目顾问", object: "商业计划、MVP 方案、验证实验或项目路演内容", output: "聚焦假设验证和资源约束的创业计划", metrics: "问题真实、客户明确、路径可测、资源节制", vars: ["{创业想法}", "{目标用户}", "{收入方式}", "{现有资源}", "{验证周期}"], tags: ["创业", "商业计划", "MVP"] },
  { name: "产品/需求路线图", slug: "product-roadmap-requirements", domain: "产品需求、用户场景、路线图、PRD 和优先级", role: "高级产品经理", object: "产品需求、功能规划、PRD、用户故事或路线图", output: "边界清楚、可研发评估的产品方案", metrics: "用户价值、范围控制、依赖识别、验收标准", vars: ["{产品目标}", "{用户群体}", "{核心场景}", "{约束条件}", "{上线时间}"], tags: ["产品", "需求", "路线图"] },
  { name: "项目管理/计划复盘", slug: "project-management-planning-retro", domain: "项目计划、进度跟踪、风险管理和复盘沉淀", role: "项目管理负责人", object: "项目计划、周报、复盘文档、里程碑或风险清单", output: "责任清晰、节奏明确、便于协作的项目材料", metrics: "任务可执行、责任明确、时间现实、复盘可复用", vars: ["{项目目标}", "{团队角色}", "{时间节点}", "{当前进度}", "{主要风险}"], tags: ["项目管理", "计划", "复盘"] },
  { name: "运营/SOP流程", slug: "operations-sop-process", domain: "运营流程、SOP、活动执行、指标监控和日常协作", role: "运营流程设计师", object: "SOP、运营手册、活动方案、检查表或交接文档", output: "步骤明确、可复制、便于新人执行的流程稿", metrics: "步骤完整、异常处理、责任边界、复用成本", vars: ["{运营目标}", "{执行角色}", "{触发条件}", "{工具资源}", "{成功标准}"], tags: ["运营", "SOP", "流程"] },
  { name: "人力/招聘绩效", slug: "hr-recruiting-performance", domain: "招聘、面试、绩效沟通、人才发展和组织协作", role: "人力资源业务伙伴", object: "岗位说明、面试题、绩效反馈或人才发展方案", output: "公平、清晰、可执行的人力材料", metrics: "标准一致、问题具体、反馈建设性、合规克制", vars: ["{岗位或团队}", "{能力要求}", "{候选人背景}", "{评价维度}", "{沟通目标}"], tags: ["人力", "招聘", "绩效"] },
  { name: "教育/课程学习", slug: "education-course-learning", domain: "课程设计、学习计划、讲解脚本、练习题和教学反馈", role: "课程设计专家", object: "课程大纲、学习路径、讲义、练习题或辅导方案", output: "循序渐进、目标明确、便于学习的教学内容", metrics: "难度梯度、示例质量、练习有效、反馈具体", vars: ["{学习主题}", "{学习者水平}", "{学习目标}", "{课时长度}", "{练习形式}"], tags: ["教育", "课程", "学习"] },
  { name: "研究/资料综述", slug: "research-literature-summary", domain: "资料整理、文献综述、观点比较和研究问题设计", role: "研究助理", object: "资料综述、研究备忘录、观点矩阵或问题清单", output: "来源分层、观点清楚、便于继续研究的综述", metrics: "信息可追溯、观点区分、空白识别、结论克制", vars: ["{研究主题}", "{资料范围}", "{问题清单}", "{输出深度}", "{引用要求}"], tags: ["研究", "资料", "综述"] },
  { name: "数据分析/指标洞察", slug: "data-analysis-insights", domain: "指标拆解、数据口径、分析结论和洞察表达", role: "数据分析师", object: "指标体系、分析报告、看板说明或实验解读", output: "口径清楚、结论有依据、行动可落地的数据分析稿", metrics: "口径一致、因果谨慎、异常解释、下一步明确", vars: ["{业务问题}", "{数据字段}", "{时间范围}", "{目标指标}", "{已知假设}"], tags: ["数据分析", "指标", "洞察"] },
  { name: "财务/预算经营", slug: "finance-budget-operations", domain: "预算规划、经营分析、成本结构和现金流管理", role: "经营财务分析师", object: "预算表说明、经营复盘、成本分析或情景测算", output: "假设透明、口径明确、非投资建议的财务分析", metrics: "数字口径、情景完整、假设可调、结论谨慎", vars: ["{业务模式}", "{收入成本数据}", "{预算周期}", "{经营目标}", "{限制条件}"], tags: ["财务", "预算", "经营"] },
  { name: "法务风险/合同阅读", slug: "legal-risk-contract-reading", domain: "合同阅读、条款解释、合规风险提示和沟通准备", role: "合同阅读助手", object: "合同条款、合作协议、风险备忘录或沟通问题清单", output: "非法律建议、条款清楚、便于咨询专业人士的梳理", metrics: "条款定位、责任边界、问题清单、措辞中立", vars: ["{合同类型}", "{条款文本}", "{关注问题}", "{业务背景}", "{谈判立场}"], tags: ["法务", "合同", "风险"] },
  { name: "个人效率/时间习惯", slug: "personal-productivity-habits", domain: "个人计划、时间管理、习惯养成和任务拆解", role: "效率教练", object: "日程计划、任务清单、习惯系统或复盘模板", output: "现实、轻量、可持续的个人执行方案", metrics: "负担可控、优先级清楚、反馈及时、可持续", vars: ["{目标}", "{可用时间}", "{当前习惯}", "{阻碍因素}", "{复盘频率}"], tags: ["效率", "时间管理", "习惯"] },
  { name: "职业发展/简历面试", slug: "career-resume-interview", domain: "职业定位、简历优化、面试准备和成长路径", role: "职业发展顾问", object: "简历、作品集说明、面试回答或职业规划", output: "真实可信、突出能力、便于行动的职业材料", metrics: "经历真实性、能力证据、岗位匹配、表达简洁", vars: ["{目标岗位}", "{个人经历}", "{核心能力}", "{项目成果}", "{面试场景}"], tags: ["职业", "简历", "面试"] },
  { name: "编程/代码生成", slug: "coding-code-generation", domain: "代码生成、接口设计、脚本编写和实现规划", role: "软件工程师", object: "函数、组件、脚本、接口或小型功能实现", output: "可读、可维护、边界清楚的代码方案", metrics: "需求覆盖、边界处理、可测试性、风格一致", vars: ["{技术栈}", "{功能需求}", "{输入输出}", "{限制条件}", "{现有代码风格}"], tags: ["编程", "代码生成", "实现"] },
  { name: "编程/调试重构", slug: "coding-debug-refactor", domain: "问题定位、调试思路、重构策略和技术债治理", role: "代码审查与调试专家", object: "错误日志、代码片段、性能问题或重构计划", output: "定位清楚、改动可控、验证明确的技术方案", metrics: "复现路径、根因假设、影响范围、回归验证", vars: ["{问题现象}", "{相关代码}", "{运行环境}", "{错误日志}", "{期望行为}"], tags: ["编程", "调试", "重构"] },
  { name: "编程/测试文档", slug: "coding-tests-docs", domain: "测试用例、技术文档、API说明和验收标准", role: "测试与文档工程师", object: "测试计划、用例清单、README、API 文档或验收说明", output: "覆盖关键路径、清楚可执行的测试与文档材料", metrics: "场景覆盖、边界条件、可复现、说明准确", vars: ["{功能模块}", "{用户路径}", "{接口或输入}", "{边界条件}", "{验收标准}"], tags: ["测试", "文档", "验收"] },
  { name: "DevOps/云与自动化", slug: "devops-cloud-automation", domain: "部署流程、自动化脚本、监控告警和云资源协作", role: "DevOps 工程师", object: "部署方案、CI 流程、运维脚本、监控规则或故障演练", output: "可回滚、可观测、权限边界清楚的自动化方案", metrics: "可重复执行、失败处理、日志可见、权限最小化", vars: ["{服务架构}", "{部署环境}", "{自动化目标}", "{限制条件}", "{回滚要求}"], tags: ["DevOps", "云", "自动化"] },
  { name: "安全/威胁建模", slug: "security-threat-modeling", domain: "防护视角的威胁建模、权限边界、资产识别和控制建议", role: "安全架构顾问", object: "系统边界、资产清单、权限设计或安全评审材料", output: "面向防护、便于整改的安全分析", metrics: "资产清楚、入口识别、控制合理、优先级明确", vars: ["{系统范围}", "{关键资产}", "{用户角色}", "{数据流}", "{已有控制}"], tags: ["安全", "威胁建模", "防护"] },
  { name: "设计/UX信息架构", slug: "design-ux-ia", domain: "用户体验、信息架构、流程设计和可用性评估", role: "UX 设计师", object: "页面结构、用户流程、导航、表单或功能信息架构", output: "层级清楚、任务路径短、可测试的 UX 方案", metrics: "任务效率、信息层级、可发现性、错误恢复", vars: ["{产品场景}", "{目标用户}", "{关键任务}", "{页面范围}", "{约束条件}"], tags: ["UX", "信息架构", "设计"] },
  { name: "设计/视觉品牌", slug: "design-visual-brand", domain: "视觉风格、品牌系统、版式、色彩和设计审查", role: "视觉设计总监", object: "品牌视觉、海报、界面风格、设计规范或审美评审", output: "克制、清晰、可执行的视觉方向", metrics: "层级清楚、色彩节制、品牌一致、可落地", vars: ["{品牌气质}", "{应用场景}", "{视觉元素}", "{色彩偏好}", "{交付物}"], tags: ["视觉设计", "品牌", "版式"] },
  { name: "图像生成/人像角色", slug: "image-character-portrait", domain: "原创角色、人像设定、姿态、服装和画面表达", role: "图像提示词导演", object: "原创成年人角色、头像、人像海报或角色设定图", output: "原创、稳定、可用于图像生成的人像提示词", metrics: "角色一致、镜头清楚、服装合理、风格原创", vars: ["{角色设定}", "{场景}", "{镜头景别}", "{服装风格}", "{画面比例}"], tags: ["图像生成", "角色", "人像"] },
  { name: "图像生成/产品场景", slug: "image-product-scene", domain: "产品视觉、场景图、材质表现和电商广告画面", role: "产品视觉提示词设计师", object: "虚构品牌产品、包装、场景图或电商素材", output: "产品清楚、画面可信、可直接生成的视觉提示词", metrics: "产品可见、材质准确、场景合理、宣传克制", vars: ["{产品类型}", "{使用场景}", "{材质}", "{灯光}", "{画面比例}"], tags: ["图像生成", "产品", "场景"] },
  { name: "图像生成/海报社媒", slug: "image-poster-social", domain: "海报、社媒封面、视觉标题和传播素材", role: "海报视觉策划", object: "社媒海报、活动封面、主题视觉或信息图草案", output: "主题鲜明、文字区域清楚、可生成的海报提示词", metrics: "视觉焦点、信息留白、比例适配、原创元素", vars: ["{主题}", "{平台比例}", "{核心文案}", "{视觉风格}", "{受众}"], tags: ["图像生成", "海报", "社媒"] },
  { name: "视频生成/分镜短片", slug: "video-storyboard-shortfilm", domain: "短片分镜、镜头节奏、角色动作和场景连续性", role: "短片分镜导演", object: "原创短片、分镜脚本、镜头列表或生成视频提示词", output: "镜头连续、动作自然、便于生成的视频分镜", metrics: "时长合理、镜头衔接、角色稳定、画面可执行", vars: ["{故事主题}", "{角色设定}", "{场景}", "{时长}", "{画面比例}"], tags: ["视频生成", "分镜", "短片"] },
  { name: "视频生成/广告演示", slug: "video-ad-demo", domain: "产品演示、广告短片、使用场景和镜头脚本", role: "广告视频导演", object: "虚构产品广告、演示视频、短视频脚本或镜头说明", output: "产品清楚、剧情合理、承诺克制的视频方案", metrics: "卖点可视化、镜头效率、场景真实、行动明确", vars: ["{产品或服务}", "{目标用户}", "{使用情境}", "{时长}", "{广告语气}"], tags: ["视频生成", "广告", "演示"] },
  { name: "音乐音频/歌曲配乐", slug: "audio-music-song-score", domain: "原创音乐、配乐说明、歌词方向和声音质感", role: "音乐创意制作人", object: "原创歌曲、配乐 brief、音频风格说明或歌词框架", output: "原创、可制作、适合场景的音乐提示词", metrics: "情绪准确、结构完整、声音层次、原创表达", vars: ["{使用场景}", "{曲风方向}", "{情绪}", "{时长}", "{语言}"], tags: ["音乐", "音频", "配乐"] },
  { name: "多模态/图片理解改图", slug: "multimodal-image-understanding-edit", domain: "图片理解、改图说明、视觉问题诊断和二次创作 brief", role: "多模态视觉分析师", object: "图片分析、改图需求、视觉优化说明或素材调用包", output: "观察准确、修改边界清楚的图像处理提示词", metrics: "识别准确、修改可控、保留重点、版权边界清楚", vars: ["{图片内容}", "{修改目标}", "{保留元素}", "{输出比例}", "{风格方向}"], tags: ["多模态", "图片理解", "改图"] },
  { name: "AI工作流/提示词优化", slug: "ai-workflow-prompt-optimization", domain: "提示词诊断、工作流设计、变量化模板和结果评审", role: "提示词工程顾问", object: "提示词、AI 工作流、变量模板或评估标准", output: "可复用、可评估、边界清楚的提示词方案", metrics: "目标清晰、变量完整、输出稳定、自检有效", vars: ["{原始提示词}", "{目标任务}", "{使用模型}", "{输出要求}", "{失败样例}"], tags: ["提示词", "AI工作流", "优化"] },
  { name: "AI Agent/工具自动化", slug: "ai-agent-tool-automation", domain: "Agent 任务拆解、工具调用计划、权限边界和自动化流程", role: "AI Agent 产品架构师", object: "自动化代理、工具调用流程、任务计划或运行日志", output: "步骤清楚、可监督、权限可控的 Agent 方案", metrics: "任务拆解、工具边界、失败恢复、人类确认点", vars: ["{任务目标}", "{可用工具}", "{权限范围}", "{输入数据}", "{验收条件}"], tags: ["AI Agent", "自动化", "工具"] },
  { name: "本地生活/旅行活动", slug: "local-life-travel-events", domain: "旅行计划、本地活动、路线安排和生活服务比较", role: "生活方式规划师", object: "旅行行程、周末活动、路线比较或体验清单", output: "时间现实、信息清楚、偏好匹配的生活计划", metrics: "路线顺畅、预算透明、备选方案、安全舒适", vars: ["{城市或区域}", "{出行人数}", "{时间}", "{预算}", "{偏好}"], tags: ["旅行", "本地生活", "活动"] },
  { name: "健康生活/运动饮食", slug: "wellness-fitness-nutrition", domain: "健康生活、运动计划、饮食记录和习惯改善", role: "健康生活教练", object: "运动计划、饮食记录、睡眠习惯或生活方式复盘", output: "非医疗建议、温和可持续的健康生活方案", metrics: "强度合适、计划可坚持、记录清楚、提醒求助边界", vars: ["{目标}", "{当前状态}", "{可用时间}", "{饮食偏好}", "{限制条件}"], tags: ["健康生活", "运动", "饮食"] },
  { name: "创意写作/故事世界观", slug: "creative-writing-worldbuilding", domain: "原创故事、角色弧光、世界观、剧情结构和设定整理", role: "原创故事策划", object: "故事设定、角色小传、剧情大纲或世界观文档", output: "原创、连贯、有情绪推进的创意写作方案", metrics: "角色动机、冲突清楚、设定一致、情节推进", vars: ["{故事类型}", "{主角设定}", "{核心冲突}", "{世界观规则}", "{篇幅}"], tags: ["创意写作", "故事", "世界观"] },
  { name: "知识管理/笔记个人库", slug: "knowledge-management-notes", domain: "笔记整理、知识库结构、卡片链接和个人资料沉淀", role: "知识管理顾问", object: "读书笔记、会议记录、资料库、标签体系或复盘卡片", output: "可检索、可复用、结构清楚的知识沉淀", metrics: "分类合理、链接明确、摘要可用、后续行动清楚", vars: ["{资料内容}", "{使用目标}", "{分类偏好}", "{输出格式}", "{复习周期}"], tags: ["知识管理", "笔记", "个人库"] }
];

const scenarios = [
  { name: "需求澄清与目标拆解", slug: "goal-brief", family: "澄清", when: "任务还比较模糊，需要先把目标、受众、约束和成功标准讲清楚", deliverable: "一份可继续执行的任务简报", extraVars: ["{现状描述}", "{成功标准}"], steps: ["先复述任务目标，标出不确定信息", "把目标拆成必须完成、可选增强和暂不处理三层", "列出最多 7 个澄清问题，并说明每个问题影响什么决策", "在信息不足时给出默认假设和可验证路径"] },
  { name: "快速诊断与优先级排序", slug: "diagnosis-priority", family: "诊断", when: "已有材料但问题很多，需要快速判断先处理哪几件事", deliverable: "诊断结论、优先级表和下一步动作", extraVars: ["{已有材料}", "{判断标准}"], steps: ["按影响、紧急度和实施成本建立排序维度", "识别 3 到 5 个最关键问题", "解释每个问题的证据、影响和处理方式", "输出先做、后做、暂缓的行动顺序"] },
  { name: "从零生成初稿", slug: "first-draft", family: "生成", when: "只有主题和目标，需要快速得到一个完整可改的初稿", deliverable: "第一版完整草稿和改进建议", extraVars: ["{素材要点}", "{禁止偏离点}"], steps: ["先确认主题、受众和使用场景", "设计整体结构和重点顺序", "生成完整初稿，保留可替换占位符", "最后列出 5 个最值得补充的信息"] },
  { name: "改写优化增强版", slug: "rewrite-upgrade", family: "改写", when: "已有内容可用但表达不够清晰、有说服力或不符合目标语气", deliverable: "改写稿、改写说明和保留点清单", extraVars: ["{原文}", "{改写方向}"], steps: ["保留原文事实和核心意图", "调整结构、语气和信息层级", "删除重复、模糊和过度承诺的表达", "说明每处关键改写的理由"] },
  { name: "对比评估与推荐", slug: "comparison-recommendation", family: "评估", when: "有多个选项，需要比较利弊并给出推荐路径", deliverable: "对比矩阵、推荐结论和取舍理由", extraVars: ["{方案A}", "{方案B}"], steps: ["建立公平的比较维度", "逐项比较优势、限制和适用条件", "指出结论依赖的关键假设", "给出推荐方案、备选方案和不推荐理由"] },
  { name: "方案框架与路线图", slug: "framework-roadmap", family: "规划", when: "需要从策略层到执行层形成清楚路线", deliverable: "阶段路线图、里程碑和资源清单", extraVars: ["{周期}", "{资源约束}"], steps: ["定义目标和阶段边界", "把路线拆成准备、执行、验证、迭代四段", "列出每段的交付物、负责人和风险", "给出最小可行版本和后续增强版本"] },
  { name: "清单化执行", slug: "execution-checklist", family: "执行", when: "方案已经确定，需要变成可逐项完成的操作清单", deliverable: "执行清单、检查点和异常处理方式", extraVars: ["{执行角色}", "{工具资源}"], steps: ["把任务拆成顺序步骤", "为每一步写明输入、动作、输出和验收标准", "标注容易遗漏的检查点", "补充异常情况和处理建议"] },
  { name: "用户或受众画像", slug: "audience-persona", family: "洞察", when: "需要理解目标人群的动机、阻力和沟通方式", deliverable: "画像卡片、需求层级和沟通建议", extraVars: ["{用户线索}", "{行为场景}"], steps: ["从任务材料中提炼目标人群", "拆解他们的目标、担忧、触发点和决策标准", "建立 2 到 3 个可操作画像", "说明每个画像对应的表达重点"] },
  { name: "反向审查与风险检查", slug: "review-risk-check", family: "审查", when: "内容或方案快交付前，需要从反方向检查问题", deliverable: "问题清单、修正建议和上线前检查表", extraVars: ["{待审内容}", "{审查重点}"], steps: ["先说明审查标准", "逐项检查事实、逻辑、语气、边界和可执行性", "标出高、中、低优先级问题", "给出最小修改方案和完整优化方案"] },
  { name: "三版本风格方案", slug: "three-style-versions", family: "变体", when: "需要同一目标下的不同表达风格，方便选择或测试", deliverable: "稳妥版、专业版、创意版三套结果", extraVars: ["{风格偏好}", "{限制词}"], steps: ["先抽象不变的核心信息", "生成三种风格但保持事实一致", "说明每种风格适合的场景", "给出最终推荐和组合使用方式"] },
  { name: "资料整合与证据提炼", slug: "evidence-synthesis", family: "整合", when: "有零散资料，需要整合成观点、证据和行动建议", deliverable: "证据表、结论摘要和待补资料清单", extraVars: ["{资料片段}", "{可信度要求}"], steps: ["先按主题归类资料", "区分事实、观点、假设和待验证信息", "提炼最可靠的结论", "列出需要进一步确认的缺口"] },
  { name: "会议访谈转成果", slug: "meeting-to-output", family: "整理", when: "已有会议记录、访谈文本或语音整理稿，需要转成正式成果", deliverable: "纪要、决策、行动项和后续问题", extraVars: ["{记录文本}", "{参会角色}"], steps: ["识别讨论主题和结论", "分离已决定、待决定和争议点", "把行动项写成负责人、截止时间和交付物", "补充下一次沟通要确认的问题"] },
  { name: "教学讲解版", slug: "teaching-explainer", family: "讲解", when: "需要把复杂内容讲给新手或跨部门对象听", deliverable: "讲解稿、例子和练习问题", extraVars: ["{学习水平}", "{讲解时长}"], steps: ["先给出一句话解释", "用类比或具体场景拆解概念", "提供步骤化示例", "设计 3 个检查理解的问题"] },
  { name: "复盘总结版", slug: "retro-summary", family: "复盘", when: "事情已经完成，需要沉淀经验、问题和下一轮改进", deliverable: "复盘报告和改进行动表", extraVars: ["{实际结果}", "{预期目标}"], steps: ["对比目标与结果", "识别做得好的做法和可复用经验", "分析偏差原因而不简单归责", "生成下一轮改进清单"] },
  { name: "标题钩子与开头优化", slug: "hook-title", family: "表达", when: "主体内容已有，需要增强开头、标题或第一屏吸引力", deliverable: "标题组、开头组和使用建议", extraVars: ["{核心信息}", "{发布场景}"], steps: ["提炼最值得先说的信息", "生成不同角度的标题或开头", "标注每个版本适合的人群和场景", "避免夸张承诺和误导式表达"] },
  { name: "模板化 SOP", slug: "template-sop", family: "模板", when: "需要把一次性做法沉淀成可复用模板", deliverable: "SOP 模板、填写说明和示例", extraVars: ["{流程目标}", "{复用对象}"], steps: ["抽象固定步骤和可变参数", "为每个参数写填写说明", "加入检查点和常见错误", "输出空白模板和示例模板"] },
  { name: "多渠道分发适配", slug: "multi-channel-adaptation", family: "分发", when: "同一内容要适配不同平台、对象或媒介", deliverable: "多渠道版本和改写规则", extraVars: ["{渠道列表}", "{核心素材}"], steps: ["提炼跨渠道不变的信息", "按渠道限制调整长度、语气和结构", "保留一致的核心观点", "给出发布顺序和复用建议"] },
  { name: "评审打分表", slug: "scorecard", family: "评审", when: "需要建立统一评审标准，让多人判断更一致", deliverable: "评分维度、权重、打分说明和示例", extraVars: ["{评审对象}", "{通过门槛}"], steps: ["定义 5 到 7 个评分维度", "说明每个维度的高分和低分表现", "给出权重或优先级", "输出可复制的评分表"] },
  { name: "故事化表达", slug: "storytelling", family: "叙事", when: "信息比较理性，需要转成更容易理解和记住的故事结构", deliverable: "故事框架、情节节奏和表达稿", extraVars: ["{主角或对象}", "{冲突变化}"], steps: ["确定主角、目标、阻力和转变", "把信息嵌入情节节点", "控制情绪和事实边界", "输出故事版和简洁版"] },
  { name: "专家质询与压力测试", slug: "expert-challenge", family: "质询", when: "方案看起来完整，但需要被专业问题检验", deliverable: "质询问题、可能回答和补强建议", extraVars: ["{方案摘要}", "{质询角色}"], steps: ["从专业审查角度提出尖锐但合理的问题", "判断哪些问题会影响结论", "给出建议回答或补充材料方向", "列出上线前必须补齐的证据"] },
  { name: "约束条件下的方案", slug: "constraint-solution", family: "约束", when: "时间、预算、人员或规则受限，需要找到现实可行版本", deliverable: "约束分析、最小方案和增强方案", extraVars: ["{硬性限制}", "{可调空间}"], steps: ["先区分不可改变和可协商条件", "设计最低可行交付", "列出取舍影响", "给出条件改善后的增强路径"] },
  { name: "国际化与本地化", slug: "localization", family: "本地化", when: "内容要面向不同地区、语言或文化语境，需要调整表达", deliverable: "本地化版本、注意事项和术语表", extraVars: ["{目标地区}", "{语言要求}"], steps: ["识别必须保留的核心含义", "调整语气、例子和格式", "列出容易误解的词句", "输出自然表达而不是逐字翻译"] },
  { name: "A/B 测试设计", slug: "ab-test", family: "实验", when: "需要验证不同方案效果，而不是凭感觉决定", deliverable: "实验假设、版本设计和观察指标", extraVars: ["{测试目标}", "{样本条件}"], steps: ["写清楚要验证的假设", "设计差异明确的版本", "定义主要指标和辅助指标", "说明如何判断结果和下一步动作"] },
  { name: "交付前自检", slug: "final-self-check", family: "自检", when: "内容或方案即将交付，需要快速检查质量和遗漏", deliverable: "自检结果、修订建议和最终交付稿", extraVars: ["{交付物}", "{验收标准}"], steps: ["按验收标准逐项检查", "指出必须修改和可选优化", "修订最影响质量的部分", "输出最终版与变更说明"] },
  { name: "迭代优化提问", slug: "iteration-questions", family: "迭代", when: "结果还不够好，需要通过高质量追问推动下一轮改进", deliverable: "追问清单、默认假设和下一轮优化方向", extraVars: ["{当前结果}", "{不满意点}"], steps: ["先判断当前结果的问题类型", "提出能显著改善结果的追问", "在没有回答时给出合理默认假设", "生成下一轮优化版本的提示词"] }
];

function formatLocalTimestamp(date) {
  const pad = (value) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function unique(values) {
  return [...new Set(values.filter(Boolean))];
}

function topCategory(name) {
  return name.split("/")[0];
}

function makeBody(category, scenario) {
  const vars = unique([...category.vars, ...scenario.extraVars]);
  const variableLines = vars.map((item) => `- ${item}：请填写与“${category.object}”直接相关的信息。`).join("\n");
  const stepLines = scenario.steps.map((item, index) => `${index + 1}. ${item}。`).join("\n");
  return `请担任${category.role}，围绕【${category.object}】完成“${scenario.name}”任务。

适用场景：
当你处理${category.domain}，并且${scenario.when}时使用。目标是产出${scenario.deliverable}，最终形成${category.output}。

输入变量：
${variableLines}

执行步骤：
${stepLines}
${scenario.steps.length + 1}. 将结论拆成“立即可用、需要确认、后续迭代”三类，避免把假设写成事实。
${scenario.steps.length + 2}. 如果信息不足，先列出默认假设，再在结果中标注哪些部分需要人工确认。

输出格式：
1. 任务理解：用 3 句话说明你对目标、对象和限制的理解。
2. 核心产出：按标题、要点、正文或表格输出可直接使用的内容。
3. 决策依据：说明关键选择背后的理由，不要只给结论。
4. 下一步：给出 3 到 7 个可执行动作，并标注优先级。
5. 待确认问题：列出会明显影响质量的问题。

质量标准：
- ${category.metrics}必须清楚可检查。
- 表达要具体、克制、可执行，避免空泛形容词堆叠。
- 对不确定信息使用“可能、建议、需确认”等措辞，保持判断边界。
- 结果应适合复制到真实工作流中继续编辑。

边界提醒：
- 使用原创或已授权素材；涉及品牌时使用虚构品牌或明确授权信息。
- 涉及人物、角色或视觉内容时，使用原创成年人角色，不引用可识别公众人物或受保护角色。
- 涉及健康、财务、合同或安全议题时，仅做信息整理和决策辅助；请明确写出非医疗建议、非法律建议、非投资建议，并建议关键事项交由专业人士确认。
- 不输出平台规则外、误导性、夸大承诺或不可验证的内容。`;
}

function makePrompt(category, scenario, index, stamp) {
  const serial = String(index + 1).padStart(2, "0");
  return {
    id: `${ID_PREFIX}${category.slug}-${serial}`,
    title: `${category.name} - ${scenario.name}模板`,
    category: category.name,
    tags: unique([topCategory(category.name), ...category.tags, scenario.family, "原创模板", "通用"]),
    variables: unique([...category.vars, ...scenario.extraVars]),
    status: "推荐",
    summary: `用于${category.domain}场景下的${scenario.name}，帮助把${category.object}整理成${scenario.deliverable}。`,
    body: makeBody(category, scenario),
    source: SOURCE,
    createdAt: stamp,
    updatedAt: stamp,
    archived: false
  };
}

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    console.log("Usage: node scripts/prompts/generate-general-prompts.mjs");
    console.log("Regenerates the 1000 original general prompt templates in prompts-data/library.json.");
    return;
  }

  if (categories.length !== 40) {
    throw new Error(`Expected 40 categories, got ${categories.length}`);
  }
  if (scenarios.length !== 25) {
    throw new Error(`Expected 25 scenarios, got ${scenarios.length}`);
  }

  const raw = JSON.parse(await readFile(libraryPath, "utf8"));
  const stamp = formatLocalTimestamp(new Date());
  const existing = Array.isArray(raw.prompts) ? raw.prompts.filter((item) => !String(item?.id || "").startsWith(ID_PREFIX)) : [];
  const generated = categories.flatMap((category) => scenarios.map((scenario, index) => makePrompt(category, scenario, index, stamp)));

  raw.version = 2;
  raw.updatedAt = stamp;
  raw.prompts = [...existing, ...generated];
  raw.assets = Array.isArray(raw.assets) ? raw.assets : [];

  await writeFile(libraryPath, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  console.log(`Generated ${generated.length} prompts`);
  console.log(`Total prompts: ${raw.prompts.length}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
