export const DEFAULT_PROMPT_SETTINGS = {
  publicAccessMode: "free-only",
  showPaidEntry: false,
  showProBadges: false,
  showPackBadges: false,
  showContactLead: false,
  allowLockedPreview: false,
  homepageFeaturedLimit: 12,
  categoryPromptLimit: 20
};

export const UNCLASSIFIED_CATEGORY = {
  departmentId: "dept-needs-review",
  scenarioId: "scenario-needs-review-needs-classification",
  taskId: "task-needs-review-needs-classification-manual-review"
};

const task = (slug, name, keywords = []) => ({ slug, name, keywords });

const scenario = (slug, name, tasks, keywords = []) => ({
  slug,
  name,
  keywords,
  tasks: tasks.map((item) => Array.isArray(item) ? task(item[0], item[1], item[2] || []) : item)
});

export const PROMPT_TAXONOMY = [
  {
    slug: "new-media-short-video",
    name: "新媒体 / 短视频运营",
    icon: "NM",
    description: "面向抖音、小红书、视频号、公众号等内容运营岗位，覆盖账号、选题、脚本、互动和复盘。",
    keywords: ["新媒体", "短视频", "抖音", "小红书", "视频号", "公众号", "口播", "爆款", "种草"],
    scenarios: [
      scenario("account-positioning", "账号定位", [
        ["account-diagnosis", "诊断账号定位", ["定位", "诊断"]],
        ["persona-positioning", "设计账号人设", ["人设"]],
        ["audience-profile", "生成目标用户画像", ["用户画像", "受众"]],
        ["content-pillars", "规划内容栏目", ["栏目", "内容矩阵"]],
        ["differentiation", "提炼差异化卖点", ["差异化", "卖点"]],
        ["bio-optimization", "优化账号简介", ["简介", "主页"]]
      ], ["账号定位", "账号诊断", "人设", "内容定位"]),
      scenario("topic-planning", "选题策划", [
        ["weekly-topic-list", "生成一周选题表", ["选题表"]],
        ["hot-topic-angle", "拆解热点选题角度", ["热点"]],
        ["evergreen-topics", "生成长期栏目选题", ["长期选题"]],
        ["audience-pain-points", "根据痛点生成选题", ["痛点"]],
        ["competitor-topic-remix", "根据竞品改写选题", ["竞品", "仿写"]],
        ["series-topic-plan", "规划系列化选题", ["系列"]]
      ], ["选题", "热点", "内容策划"]),
      scenario("viral-title", "爆款标题", [
        ["xiaohongshu-title", "生成小红书标题", ["小红书标题"]],
        ["douyin-title", "生成抖音标题", ["抖音标题"]],
        ["wechat-title", "生成公众号标题", ["公众号标题"]],
        ["number-title", "生成数字型标题", ["数字标题"]],
        ["contrast-title", "生成反差型标题", ["反差"]],
        ["title-ab-test", "生成标题 A/B 测试方案", ["A/B", "AB"]]
      ], ["标题", "爆款标题", "开头钩子"]),
      scenario("short-video-script", "短视频脚本", [
        ["sixty-second-talk-script", "生成 60 秒口播脚本", ["60 秒", "口播"]],
        ["three-minute-knowledge-script", "生成 3 分钟知识类视频脚本", ["知识类"]],
        ["douyin-reversal-script", "生成抖音剧情反转脚本", ["反转", "剧情"]],
        ["xiaohongshu-note", "生成小红书种草笔记", ["种草笔记"]],
        ["wechat-video-script", "生成视频号中年用户内容", ["视频号", "中年"]],
        ["title-cover-tags", "生成标题 + 封面文案 + 话题标签", ["封面文案", "话题标签"]],
        ["storyboard-from-materials", "根据素材生成分镜脚本", ["分镜", "素材"]],
        ["rewrite-viral-video", "根据爆款视频生成仿写脚本", ["仿写脚本"]]
      ], ["脚本", "短视频脚本", "口播", "分镜"]),
      scenario("spoken-copy", "口播文案", [
        ["hook-opening", "生成前三秒钩子", ["前三秒", "钩子"]],
        ["expert-tone", "生成专家型口播", ["专家"]],
        ["friendly-tone", "生成朋友聊天式口播", ["聊天式"]],
        ["product-review", "生成产品体验口播", ["体验"]],
        ["knowledge-explainer", "生成知识科普口播", ["科普"]],
        ["call-to-action", "生成关注转化口播", ["转化"]]
      ], ["口播", "文案", "钩子"]),
      scenario("storyboard", "分镜脚本", [
        ["shot-list", "生成镜头清单", ["镜头清单"]],
        ["scene-breakdown", "拆解场景分镜", ["场景"]],
        ["voiceover-storyboard", "生成旁白分镜", ["旁白"]],
        ["shooting-script", "生成拍摄执行脚本", ["拍摄"]],
        ["edit-rhythm", "规划剪辑节奏", ["剪辑节奏"]],
        ["b-roll-plan", "规划补充镜头", ["B-roll", "补充镜头"]]
      ], ["分镜", "镜头", "拍摄脚本"]),
      scenario("cover-design", "封面设计", [
        ["cover-title", "生成封面大字标题", ["封面"]],
        ["thumbnail-layout", "生成封面版式方案", ["版式"]],
        ["cover-image-prompt", "生成封面图像提示词", ["封面图"]],
        ["cover-ab-test", "生成封面 A/B 测试", ["A/B"]],
        ["cover-color-style", "生成封面配色建议", ["配色"]],
        ["cover-text-check", "检查封面文字可读性", ["可读性"]]
      ], ["封面", "缩略图", "封面设计"]),
      scenario("comment-ops", "评论区运营", [
        ["hot-comment-reply", "生成高赞评论回复", ["评论回复"]],
        ["negative-comment-response", "处理负面评论", ["负面评论"]],
        ["question-reply", "生成问答型回复", ["问答"]],
        ["pin-comment", "生成置顶评论", ["置顶"]],
        ["community-topic", "引导评论区话题", ["话题"]],
        ["private-domain-hook", "评论区私域引导", ["私域"]]
      ], ["评论", "互动", "社群"]),
      scenario("data-review", "数据复盘", [
        ["video-data-review", "复盘单条视频数据", ["数据复盘"]],
        ["account-weekly-review", "生成账号周报", ["周报"]],
        ["retention-analysis", "分析完播和停留", ["完播", "停留"]],
        ["conversion-review", "复盘转化数据", ["转化"]],
        ["content-iteration", "生成内容迭代建议", ["迭代"]],
        ["benchmark-review", "对标竞品数据", ["对标"]]
      ], ["数据复盘", "完播率", "互动率"]),
      scenario("private-domain", "私域转化", [
        ["lead-magnet", "设计引流福利", ["引流"]],
        ["group-welcome", "生成社群欢迎语", ["社群"]],
        ["dm-script", "生成私信转化话术", ["私信"]],
        ["community-calendar", "规划社群内容日历", ["社群日历"]],
        ["repeat-conversion", "生成复购转化文案", ["复购"]],
        ["lead-nurturing", "设计用户培育路径", ["培育"]]
      ], ["私域", "社群", "转化"])
    ]
  },
  {
    slug: "film-aigc-visual",
    name: "影视 / AIGC 视觉创作",
    icon: "FV",
    description: "面向 AI 图片、AI 视频、分镜、海报、短剧封面、角色定妆和镜头语言。",
    keywords: ["影视", "AIGC", "视觉", "图像", "图片", "视频", "分镜", "镜头", "Midjourney", "MJ", "Stable Diffusion", "Runway", "可灵", "海报"],
    scenarios: [
      scenario("single-person-image", "单人图片", [
        ["portrait-photo", "生成单人肖像图", ["肖像", "人像"]],
        ["character-action", "生成单人动作状态", ["动作"]],
        ["fashion-portrait", "生成时尚人像大片", ["时尚"]],
        ["business-portrait", "生成商务形象照", ["商务"]],
        ["profile-avatar", "生成头像视觉", ["头像"]],
        ["single-person-negative", "生成单人负面提示词", ["负面"]]
      ], ["单人", "人像", "肖像", "single person"]),
      scenario("multi-person-image", "多人图片", [
        ["two-person-scene", "生成双人互动画面", ["双人"]],
        ["group-photo", "生成多人合影画面", ["合影"]],
        ["team-scene", "生成团队场景", ["团队"]],
        ["crowd-atmosphere", "生成群像氛围图", ["群像"]],
        ["relationship-blocking", "安排人物站位关系", ["站位"]],
        ["multi-person-negative", "生成多人负面提示词", ["多人负面"]]
      ], ["多人", "合影", "群像"]),
      scenario("single-grid-image", "单宫格图片", [
        ["single-product-hero", "生成单张产品主视觉", ["产品主视觉"]],
        ["single-poster", "生成单张海报", ["海报"]],
        ["single-scene-render", "生成单场景渲染图", ["场景渲染"]],
        ["single-style-board", "生成单张风格图", ["风格图"]],
        ["single-cover", "生成单张封面图", ["封面"]],
        ["single-composition", "优化单图构图", ["构图"]]
      ], ["单宫格", "单张", "主视觉"]),
      scenario("multi-grid-image", "多宫格图片", [
        ["four-grid-story", "生成四宫格故事图", ["四宫格"]],
        ["nine-grid-xiaohongshu", "生成九宫格小红书图", ["九宫格"]],
        ["multi-angle-product", "生成产品多角度组图", ["多角度"]],
        ["process-grid", "生成步骤流程组图", ["流程"]],
        ["comparison-grid", "生成对比组图", ["对比"]],
        ["style-variation-grid", "生成风格变化组图", ["风格变化"]]
      ], ["多宫格", "九宫格", "组图"]),
      scenario("movie-poster", "电影海报", [
        ["cinematic-poster", "生成电影感海报", ["电影感"]],
        ["character-poster", "生成角色海报", ["角色海报"]],
        ["festival-poster", "生成影展海报", ["影展"]],
        ["concept-poster", "生成概念海报", ["概念"]],
        ["poster-typography", "生成海报字体说明", ["字体"]],
        ["poster-negative", "生成海报负面提示词", ["负面"]]
      ], ["电影海报", "海报", "电影感"]),
      scenario("short-drama-cover", "短剧封面", [
        ["drama-cover-hook", "生成短剧封面钩子", ["短剧封面"]],
        ["reversal-cover", "生成反转剧情封面", ["反转"]],
        ["emotion-cover", "生成强情绪封面", ["情绪"]],
        ["vertical-cover", "生成竖版短剧封面", ["竖版"]],
        ["episode-cover-set", "生成分集封面组", ["分集"]],
        ["cover-text-prompt", "生成封面文字提示", ["封面文字"]]
      ], ["短剧", "短剧封面", "剧集"]),
      scenario("character-design", "角色定妆", [
        ["character-profile", "生成角色设定卡", ["角色设定"]],
        ["costume-makeup", "生成服化道说明", ["服化道"]],
        ["consistent-character", "生成角色一致性提示词", ["一致性"]],
        ["character-expression", "生成表情动作变化", ["表情"]],
        ["character-turnaround", "生成角色三视图", ["三视图"]],
        ["character-reference", "生成角色参考图说明", ["参考图"]]
      ], ["角色", "定妆", "一致性"]),
      scenario("text-to-video", "文生视频", [
        ["general-video-prompt", "生成通用文生视频提示词", ["文生视频"]],
        ["camera-movement", "生成镜头运动提示词", ["运镜", "镜头运动"]],
        ["subject-motion", "生成主体运动提示词", ["主体运动"]],
        ["scene-transition", "生成场景变化提示词", ["场景变化"]],
        ["duration-rhythm", "生成时长和节奏约束", ["时长", "节奏"]],
        ["video-stability", "生成稳定性约束", ["稳定"]]
      ], ["文生视频", "视频提示词", "镜头运动"]),
      scenario("image-to-video", "图生视频", [
        ["animate-still-image", "让静态图动起来", ["图生视频"]],
        ["product-motion", "生成产品动态镜头", ["产品动态"]],
        ["portrait-motion", "生成人像动态镜头", ["人像动态"]],
        ["environment-motion", "生成环境运动提示", ["环境运动"]],
        ["loop-video", "生成循环动效提示", ["循环"]],
        ["image-to-video-negative", "生成图生视频负面约束", ["负面"]]
      ], ["图生视频", "以图生视频"]),
      scenario("shot-language", "镜头语言", [
        ["shot-size", "生成景别建议", ["景别"]],
        ["lens-choice", "生成镜头焦段建议", ["焦段"]],
        ["camera-angle", "生成机位角度建议", ["机位", "角度"]],
        ["lighting-plan", "生成光影方案", ["光影"]],
        ["color-mood", "生成色彩情绪方案", ["色彩", "情绪"]],
        ["negative-prompt", "生成负面提示词", ["负面提示词"]]
      ], ["镜头语言", "景别", "焦段", "光影", "负面提示词"])
    ]
  },
  {
    slug: "ecommerce-local-life",
    name: "电商 / 本地生活运营",
    icon: "EC",
    description: "面向商品详情、直播、团购、达人探店、评价回复、活动促销和复购。",
    keywords: ["电商", "本地生活", "商品", "详情页", "直播", "团购", "探店", "达人", "复购", "售后"],
    scenarios: [
      scenario("product-title", "商品标题", [["seo-title", "生成搜索型商品标题"], ["benefit-title", "生成卖点型商品标题"], ["platform-title", "改写平台标题"], ["title-keywords", "提炼标题关键词"], ["title-risk-check", "检查违规词"], ["title-ab-test", "生成标题测试组"]], ["商品标题", "标题优化"]),
      scenario("detail-page", "商品详情页", [["page-structure", "生成详情页结构"], ["selling-points", "提炼详情页卖点"], ["comparison-copy", "生成对比模块文案"], ["faq-section", "生成详情页 FAQ"], ["trust-proof", "生成信任背书文案"], ["detail-audit", "检查详情页缺口"]], ["详情页", "卖点"]),
      scenario("hero-image-selling", "主图卖点", [["main-image-copy", "生成主图文案"], ["feature-callout", "生成卖点标注"], ["scenario-visual", "生成场景主图提示词"], ["price-benefit", "生成价格利益点"], ["before-after", "生成前后对比图文案"], ["visual-risk-check", "检查主图合规风险"]], ["主图", "卖点", "商品图"]),
      scenario("live-stream-script", "直播话术", [["opening-script", "生成直播开场话术"], ["product-demo", "生成产品讲解话术"], ["limited-offer", "生成限时促单话术"], ["objection-live", "处理直播异议"], ["interaction-script", "生成互动提问"], ["closing-script", "生成收口转化话术"]], ["直播", "话术"]),
      scenario("influencer-store-visit", "达人探店", [["store-visit-script", "生成探店脚本"], ["store-selling-points", "提炼门店卖点"], ["short-note", "生成探店笔记"], ["photo-shot-list", "生成拍摄清单"], ["route-plan", "规划体验路线"], ["review-rewrite", "改写达人口吻"]], ["探店", "达人", "门店"]),
      scenario("group-buying-copy", "团购文案", [["deal-title", "生成团购标题"], ["deal-description", "生成团购详情"], ["urgency-copy", "生成限时稀缺文案"], ["package-copy", "生成套餐说明"], ["redeem-notice", "生成核销须知"], ["deal-risk-check", "检查团购合规"]], ["团购", "套餐"]),
      scenario("review-reply", "用户评价回复", [["positive-review", "回复好评"], ["neutral-review", "回复中评"], ["negative-review", "安抚差评"], ["question-review", "回复评价提问"], ["review-summary", "总结评价洞察"], ["review-invite", "引导用户追评"]], ["评价", "好评", "差评"]),
      scenario("promotion-campaign", "活动促销", [["campaign-theme", "生成活动主题"], ["campaign-page-copy", "生成活动页文案"], ["coupon-copy", "生成优惠券文案"], ["festival-promotion", "生成节日促销"], ["campaign-calendar", "规划促销节奏"], ["campaign-review", "复盘促销活动"]], ["活动", "促销", "优惠券"]),
      scenario("after-sales-script", "售后话术", [["refund-response", "处理退款咨询"], ["logistics-response", "处理物流问题"], ["quality-issue", "处理质量投诉"], ["appeasement-copy", "生成安抚补偿话术"], ["service-sop", "生成售后 SOP"], ["risk-escalation", "识别升级风险"]], ["售后", "退款", "投诉"]),
      scenario("private-repeat", "私域复购", [["member-welcome", "生成会员欢迎语"], ["repeat-offer", "生成复购优惠"], ["lifecycle-message", "生成生命周期触达"], ["community-sale", "生成社群成交文案"], ["winback-message", "召回沉睡用户"], ["repeat-review", "复盘复购路径"]], ["私域", "复购", "会员"])
    ]
  },
  {
    slug: "brand-marketing-content",
    name: "品牌 / 市场 / 内容营销",
    icon: "BM",
    description: "面向品牌定位、广告语、活动策划、内容日历、公关稿和竞品拆解。",
    keywords: ["品牌", "市场", "营销", "广告", "活动", "内容日历", "公关", "竞品", "发布会"],
    scenarios: [
      scenario("brand-positioning", "品牌定位", [["positioning-statement", "生成品牌定位语"], ["target-audience", "定义目标人群"], ["brand-values", "提炼品牌价值"], ["brand-differentiation", "分析品牌差异化"], ["brand-tone", "定义品牌语气"], ["positioning-audit", "检查定位一致性"]], ["品牌定位", "定位"]),
      scenario("slogan", "广告语", [["slogan-options", "生成广告语备选"], ["campaign-slogan", "生成活动广告语"], ["product-slogan", "生成产品广告语"], ["emotional-slogan", "生成情绪型广告语"], ["rational-slogan", "生成利益点广告语"], ["slogan-screening", "筛选广告语"]], ["广告语", "slogan"]),
      scenario("campaign-planning", "活动策划", [["campaign-brief", "生成活动 brief"], ["campaign-theme", "生成活动主题"], ["campaign-mechanics", "设计活动机制"], ["campaign-timeline", "规划活动排期"], ["campaign-materials", "列出活动物料"], ["campaign-risk", "检查活动风险"]], ["活动策划", "campaign"]),
      scenario("content-calendar", "内容日历", [["monthly-calendar", "生成月度内容日历"], ["channel-calendar", "生成分渠道日历"], ["festival-calendar", "生成节日节点日历"], ["column-calendar", "规划栏目日历"], ["content-repurpose", "规划内容复用"], ["calendar-review", "复盘内容日历"]], ["内容日历", "排期"]),
      scenario("brand-story", "品牌故事", [["founder-story", "生成创始人故事"], ["product-story", "生成产品故事"], ["user-story", "生成用户故事"], ["origin-story", "生成品牌起源"], ["mission-story", "生成使命愿景叙事"], ["story-polish", "润色品牌故事"]], ["品牌故事", "叙事"]),
      scenario("launch-copy", "发布会文案", [["launch-invite", "生成发布会邀请"], ["launch-agenda", "生成发布会议程"], ["opening-speech", "生成开场稿"], ["product-intro", "生成新品介绍"], ["media-qa", "生成媒体问答"], ["launch-recap", "生成发布会复盘"]], ["发布会", "新品"]),
      scenario("poster-copy", "海报文案", [["poster-headline", "生成海报主标题"], ["poster-subcopy", "生成海报副文案"], ["poster-cta", "生成行动按钮文案"], ["poster-layout-copy", "生成版式文案层级"], ["poster-series", "生成系列海报文案"], ["poster-check", "检查海报文案"]], ["海报文案", "KV"]),
      scenario("pr-release", "公关稿", [["press-release", "生成新闻稿"], ["crisis-response", "生成危机回应"], ["media-pitch", "生成媒体邀约"], ["executive-quote", "生成高管引语"], ["pr-faq", "生成公关 FAQ"], ["release-polish", "润色公关稿"]], ["公关稿", "新闻稿", "PR"]),
      scenario("brand-manual", "品牌手册", [["voice-guide", "生成品牌语气指南"], ["visual-principles", "生成视觉原则"], ["copy-rules", "生成文案规范"], ["dos-donts", "生成使用禁忌"], ["channel-guide", "生成渠道表达规范"], ["manual-audit", "检查品牌手册缺口"]], ["品牌手册", "规范"]),
      scenario("competitor-analysis", "竞品拆解", [["competitor-matrix", "生成竞品矩阵"], ["message-analysis", "拆解竞品话术"], ["campaign-analysis", "拆解竞品活动"], ["visual-analysis", "拆解竞品视觉"], ["positioning-gap", "分析定位机会"], ["competitor-report", "生成竞品报告"]], ["竞品", "竞品拆解"])
    ]
  },
  {
    slug: "product-ux",
    name: "产品经理 / 用户体验",
    icon: "PM",
    description: "面向 PRD、竞品、用户调研、用户画像、原型说明、埋点和上线复盘。",
    keywords: ["产品经理", "PRD", "需求", "竞品", "用户访谈", "用户画像", "原型", "埋点", "验收"],
    scenarios: [
      scenario("requirement-analysis", "需求分析", [["requirement-clarify", "澄清业务需求"], ["user-story", "生成用户故事"], ["problem-framing", "定义问题陈述"], ["scope-boundary", "划定需求边界"], ["priority-ranking", "排序需求优先级"], ["risk-assumption", "列出风险假设"]], ["需求分析", "需求"]),
      scenario("prd-writing", "PRD 撰写", [["prd-outline", "生成 PRD 大纲"], ["feature-description", "撰写功能说明"], ["business-rules", "整理业务规则"], ["interaction-rules", "撰写交互规则"], ["edge-cases", "补充异常场景"], ["prd-review", "检查 PRD 缺口"]], ["PRD", "产品需求文档"]),
      scenario("competitor-research", "竞品分析", [["competitor-list", "生成竞品清单"], ["feature-compare", "对比功能差异"], ["pricing-compare", "对比定价模式"], ["ux-compare", "分析体验差异"], ["opportunity-gap", "发现机会点"], ["competitor-report", "生成竞品报告"]], ["竞品分析", "竞品"]),
      scenario("user-persona", "用户画像", [["persona-basic", "生成用户画像"], ["user-segment", "划分用户分层"], ["pain-point-map", "梳理用户痛点"], ["scenario-map", "梳理使用场景"], ["motivation-map", "分析用户动机"], ["persona-check", "检查画像可信度"]], ["用户画像", "用户分层"]),
      scenario("user-interview", "用户访谈", [["interview-outline", "生成访谈提纲"], ["recruit-screening", "生成招募筛选问题"], ["probe-questions", "生成追问问题"], ["interview-notes", "整理访谈纪要"], ["insight-summary", "提炼访谈洞察"], ["bias-check", "检查问题诱导性"]], ["用户访谈", "调研"]),
      scenario("acceptance", "功能验收", [["acceptance-criteria", "生成验收标准"], ["test-scenarios", "生成测试场景"], ["edge-case-check", "补充边界条件"], ["bug-template", "生成缺陷描述"], ["release-checklist", "生成上线检查清单"], ["acceptance-report", "生成验收报告"]], ["验收", "测试场景"]),
      scenario("prototype-notes", "原型说明", [["prototype-copy", "撰写原型说明"], ["page-flow", "梳理页面流程"], ["state-description", "描述页面状态"], ["empty-error-state", "补充空态错误态"], ["handoff-note", "生成设计交付说明"], ["prototype-review", "检查原型遗漏"]], ["原型", "交互说明"]),
      scenario("tracking-design", "埋点设计", [["event-list", "生成埋点事件表"], ["property-design", "设计事件属性"], ["funnel-events", "设计漏斗埋点"], ["quality-check", "检查埋点质量"], ["tracking-doc", "生成埋点文档"], ["analysis-plan", "生成数据分析方案"]], ["埋点", "事件"]),
      scenario("roadmap", "版本规划", [["release-plan", "生成版本计划"], ["milestone-plan", "规划里程碑"], ["dependency-map", "梳理依赖关系"], ["resource-plan", "评估资源投入"], ["roadmap-brief", "生成路线图说明"], ["scope-cut", "生成范围裁剪建议"]], ["版本规划", "roadmap"]),
      scenario("launch-review", "上线复盘", [["launch-summary", "生成上线复盘"], ["metric-review", "复盘核心指标"], ["issue-review", "整理上线问题"], ["user-feedback", "分析用户反馈"], ["next-iteration", "生成后续迭代"], ["stakeholder-report", "生成汇报材料"]], ["上线复盘", "复盘"])
    ]
  },
  {
    slug: "growth-ads-data",
    name: "增长 / 投放 / 数据分析",
    icon: "GD",
    description: "面向广告投放、创意、A/B 测试、转化漏斗、留存、ROI 和周报月报。",
    keywords: ["增长", "投放", "广告", "数据分析", "A/B", "漏斗", "ROI", "留存", "转化"],
    scenarios: [
      scenario("ad-creative", "投放创意", [["creative-angles", "生成创意角度"], ["material-variants", "生成素材变量"], ["hook-test", "生成开头钩子测试"], ["landing-angle", "匹配落地页角度"], ["creative-brief", "生成创意 brief"], ["creative-review", "复盘投放创意"]], ["投放创意", "素材"]),
      scenario("ad-copy", "广告文案", [["search-ad-copy", "生成搜索广告文案"], ["feed-ad-copy", "生成信息流广告文案"], ["short-video-ad", "生成短视频广告脚本"], ["cta-copy", "生成 CTA 文案"], ["policy-check", "检查广告合规"], ["copy-ab-test", "生成文案测试组"]], ["广告文案", "CTA"]),
      scenario("ab-test", "A/B 测试", [["hypothesis", "生成测试假设"], ["variant-plan", "设计测试变量"], ["sample-size-note", "说明样本量需求"], ["experiment-plan", "生成实验方案"], ["result-analysis", "分析测试结果"], ["next-test", "生成下一轮测试"]], ["A/B", "AB", "实验"]),
      scenario("data-review", "数据复盘", [["daily-review", "生成日报复盘"], ["weekly-review", "生成周报复盘"], ["campaign-review", "复盘活动数据"], ["anomaly-analysis", "分析异常数据"], ["metric-commentary", "解释指标变化"], ["action-plan", "生成行动计划"]], ["数据复盘", "周报"]),
      scenario("conversion-funnel", "转化漏斗", [["funnel-map", "梳理漏斗路径"], ["dropoff-analysis", "分析流失节点"], ["conversion-hypothesis", "生成转化假设"], ["landing-review", "检查落地页转化"], ["funnel-report", "生成漏斗报告"], ["optimization-plan", "生成优化方案"]], ["漏斗", "转化"]),
      scenario("user-growth", "用户增长", [["growth-loop", "设计增长闭环"], ["activation-plan", "提升新用户激活"], ["referral-plan", "设计裂变推荐"], ["channel-analysis", "分析渠道质量"], ["growth-roadmap", "生成增长路线图"], ["growth-risk", "评估增长风险"]], ["用户增长", "增长闭环"]),
      scenario("campaign-growth", "活动增长", [["campaign-goal", "设定活动增长目标"], ["mechanism-design", "设计活动机制"], ["sharing-copy", "生成分享裂变文案"], ["task-system", "设计任务体系"], ["campaign-dashboard", "设计活动看板"], ["post-campaign-review", "复盘活动增长"]], ["活动增长", "裂变"]),
      scenario("retention-analysis", "留存分析", [["cohort-analysis", "生成 cohort 分析"], ["retention-driver", "分析留存驱动"], ["churn-reason", "分析流失原因"], ["winback-plan", "生成召回策略"], ["habit-loop", "设计习惯养成路径"], ["retention-report", "生成留存报告"]], ["留存", "流失"]),
      scenario("roi-analysis", "ROI 分析", [["roi-calculation", "计算 ROI 口径"], ["budget-allocation", "生成预算分配"], ["cost-analysis", "分析成本结构"], ["payback-period", "评估回收周期"], ["roi-report", "生成 ROI 报告"], ["roi-improvement", "生成 ROI 优化建议"]], ["ROI", "成本"]),
      scenario("weekly-monthly-report", "周报月报", [["weekly-summary", "生成增长周报"], ["monthly-summary", "生成增长月报"], ["executive-summary", "生成管理层摘要"], ["chart-commentary", "生成图表解读"], ["risk-next-step", "生成风险和下一步"], ["report-polish", "润色汇报文字"]], ["周报", "月报"])
    ]
  },
  {
    slug: "sales-business-service-private",
    name: "销售 / 商务 / 客服 / 私域",
    icon: "SS",
    description: "面向销售开场、客户跟进、异议处理、成交、商务邮件、客服和私域转化。",
    keywords: ["销售", "商务", "客服", "私域", "客户", "成交", "异议", "社群", "售后", "老客"],
    scenarios: [
      scenario("sales-opening", "销售开场", [["cold-open", "生成陌生客户开场"], ["warm-open", "生成转介绍开场"], ["pain-open", "痛点式开场"], ["value-open", "价值式开场"], ["meeting-open", "会议开场话术"], ["opening-ab-test", "生成开场话术测试"]], ["销售开场", "开场"]),
      scenario("customer-follow-up", "客户跟进", [["first-follow-up", "生成首次跟进"], ["proposal-follow-up", "跟进方案反馈"], ["no-response", "唤醒未回复客户"], ["decision-maker", "跟进决策人"], ["timeline-follow-up", "跟进时间节点"], ["crm-note", "生成 CRM 跟进记录"]], ["客户跟进", "跟进"]),
      scenario("objection-handling", "异议处理", [["price-objection", "处理价格异议"], ["trust-objection", "处理信任异议"], ["need-objection", "处理需求异议"], ["competitor-objection", "处理竞品对比"], ["timing-objection", "处理时机异议"], ["risk-objection", "处理风险顾虑"]], ["异议处理", "异议"]),
      scenario("closing-script", "成交话术", [["close-summary", "生成成交总结"], ["limited-close", "限时促成成交"], ["roi-close", "ROI 促单话术"], ["next-step-close", "推动下一步"], ["contract-close", "推动合同签署"], ["renewal-close", "推动续约"]], ["成交", "促单"]),
      scenario("business-email", "商务邮件", [["intro-email", "生成商务介绍邮件"], ["proposal-email", "生成方案邮件"], ["quotation-email", "生成报价邮件"], ["meeting-recap", "生成会议纪要邮件"], ["partnership-email", "生成合作邀约"], ["follow-up-email", "生成跟进邮件"]], ["商务邮件", "邮件"]),
      scenario("customer-service-reply", "客服回复", [["consult-reply", "回复售前咨询"], ["complaint-reply", "回复投诉"], ["refund-reply", "回复退款"], ["logistics-reply", "回复物流问题"], ["policy-reply", "解释规则政策"], ["service-summary", "总结客服工单"]], ["客服", "回复"]),
      scenario("community-ops", "社群运营", [["welcome-message", "生成入群欢迎语"], ["daily-topic", "生成社群话题"], ["activity-message", "生成社群活动"], ["group-rules", "生成群规"], ["silent-group", "激活沉默社群"], ["community-review", "复盘社群运营"]], ["社群运营", "社群"]),
      scenario("private-conversion", "私域转化", [["dm-conversion", "生成私信转化"], ["lead-nurture", "生成线索培育"], ["offer-message", "生成福利转化"], ["live-invite", "邀请私域直播"], ["member-upgrade", "推动会员升级"], ["conversion-sop", "生成私域 SOP"]], ["私域转化", "私域"]),
      scenario("after-sales-soothing", "售后安抚", [["delay-soothing", "安抚延期问题"], ["quality-soothing", "安抚质量问题"], ["refund-soothing", "安抚退款问题"], ["compensation-plan", "生成补偿方案"], ["escalation-response", "生成升级回应"], ["satisfaction-follow-up", "生成满意度回访"]], ["售后安抚", "安抚"]),
      scenario("repeat-purchase", "老客复购", [["repurchase-message", "生成复购触达"], ["cross-sell", "生成交叉销售"], ["upsell", "生成升级销售"], ["anniversary-message", "生成纪念日触达"], ["loyalty-plan", "设计老客权益"], ["winback-old-customer", "召回老客户"]], ["老客复购", "复购"])
    ]
  },
  {
    slug: "tech-rd-ai-agent",
    name: "技术 / 研发 / AI Agent",
    icon: "TA",
    description: "面向代码、测试、调试、接口、自动化、技术方案、Agent 工作流和安全检查。",
    keywords: ["技术", "研发", "代码", "Bug", "测试", "接口", "架构", "自动化", "Agent", "安全"],
    scenarios: [
      scenario("code-generation", "代码生成", [["feature-code", "生成业务功能代码"], ["utility-code", "生成工具函数"], ["refactor-code", "重构代码片段"], ["frontend-component", "生成前端组件"], ["backend-handler", "生成后端接口"], ["code-explain", "解释代码实现"]], ["代码生成", "代码"]),
      scenario("code-review", "代码审查", [["bug-risk-review", "审查潜在 bug"], ["security-review", "审查安全风险"], ["performance-review", "审查性能问题"], ["maintainability-review", "审查可维护性"], ["test-gap-review", "审查测试缺口"], ["pr-summary", "生成 PR 摘要"]], ["代码审查", "review"]),
      scenario("bug-debugging", "Bug 排查", [["repro-steps", "梳理复现步骤"], ["root-cause", "分析根因"], ["log-analysis", "分析日志"], ["fix-plan", "生成修复方案"], ["regression-risk", "评估回归风险"], ["debug-checklist", "生成排查清单"]], ["Bug", "调试", "排查"]),
      scenario("unit-testing", "单元测试", [["test-cases", "生成测试用例"], ["edge-tests", "补充边界测试"], ["mock-plan", "设计 mock 数据"], ["coverage-gap", "分析覆盖缺口"], ["test-refactor", "重构测试"], ["failure-triage", "分析失败测试"]], ["单元测试", "测试"]),
      scenario("api-docs", "接口文档", [["api-spec", "生成接口说明"], ["request-response", "生成请求响应示例"], ["error-codes", "整理错误码"], ["auth-doc", "撰写鉴权说明"], ["sdk-example", "生成 SDK 示例"], ["api-changelog", "生成接口变更说明"]], ["接口文档", "API"]),
      scenario("technical-plan", "技术方案", [["solution-outline", "生成技术方案大纲"], ["tradeoff-analysis", "分析技术取舍"], ["migration-plan", "生成迁移方案"], ["risk-plan", "生成风险预案"], ["implementation-plan", "生成实施计划"], ["review-questions", "生成评审问题"]], ["技术方案", "方案"]),
      scenario("architecture-design", "架构设计", [["system-architecture", "生成系统架构说明"], ["data-flow", "梳理数据流"], ["module-boundary", "划分模块边界"], ["scalability-plan", "设计扩展方案"], ["reliability-plan", "设计可靠性方案"], ["architecture-review", "检查架构风险"]], ["架构", "系统设计"]),
      scenario("automation-script", "自动化脚本", [["batch-script", "生成批处理脚本"], ["data-clean-script", "生成数据清洗脚本"], ["ci-script", "生成 CI 脚本"], ["ops-script", "生成运维脚本"], ["browser-automation", "生成浏览器自动化"], ["script-safety-check", "检查脚本安全"]], ["自动化脚本", "脚本"]),
      scenario("agent-workflow", "Agent 工作流", [["agent-role-design", "设计 Agent 角色"], ["tool-calling", "设计工具调用"], ["state-machine", "设计状态机"], ["memory-plan", "设计记忆策略"], ["evaluation-plan", "设计评估指标"], ["failure-recovery", "设计失败恢复"]], ["Agent", "工作流"]),
      scenario("security-check", "安全检查", [["threat-model", "生成威胁模型"], ["input-validation", "检查输入校验"], ["secret-scan", "检查敏感信息"], ["authz-review", "检查权限边界"], ["dependency-risk", "分析依赖风险"], ["security-fix-plan", "生成安全修复方案"]], ["安全", "权限", "漏洞"])
    ]
  },
  {
    slug: "hr-admin-finance-legal",
    name: "HR / 行政 / 财务 / 法务",
    icon: "HA",
    description: "面向招聘、制度、报销、合同初审、会议纪要、周报总结和跨部门沟通。",
    keywords: ["HR", "招聘", "行政", "财务", "法务", "合同", "报销", "会议纪要", "制度", "绩效"],
    scenarios: [
      scenario("job-description", "招聘 JD", [["jd-draft", "生成岗位 JD"], ["jd-polish", "润色 JD"], ["requirements-clarify", "澄清任职要求"], ["salary-benefits", "生成薪酬福利文案"], ["channel-version", "改写招聘渠道版本"], ["jd-risk-check", "检查 JD 风险"]], ["招聘", "JD"]),
      scenario("interview-questions", "面试问题", [["competency-questions", "生成胜任力问题"], ["behavioral-questions", "生成行为面试题"], ["technical-screen", "生成专业筛选题"], ["scorecard", "生成面试评分表"], ["follow-up-questions", "生成追问问题"], ["candidate-summary", "生成候选人总结"]], ["面试", "问题"]),
      scenario("onboarding-notice", "入职通知", [["offer-note", "生成 offer 沟通"], ["onboarding-email", "生成入职邮件"], ["materials-list", "生成入职材料清单"], ["first-day-plan", "生成首日安排"], ["mentor-note", "生成导师通知"], ["probation-plan", "生成试用期计划"]], ["入职", "offer"]),
      scenario("performance-comment", "绩效评语", [["positive-comment", "生成正向绩效评语"], ["improvement-comment", "生成改进建议"], ["manager-feedback", "生成主管反馈"], ["self-review-polish", "润色自评"], ["goal-setting", "生成绩效目标"], ["calibration-note", "生成校准说明"]], ["绩效", "评语"]),
      scenario("policy-notice", "制度通知", [["policy-announcement", "生成制度通知"], ["policy-faq", "生成制度 FAQ"], ["policy-summary", "总结制度要点"], ["change-notice", "生成制度变更说明"], ["compliance-reminder", "生成合规提醒"], ["policy-risk-check", "检查制度表述风险"]], ["制度", "通知"]),
      scenario("reimbursement-note", "报销说明", [["expense-rule", "生成报销规则说明"], ["expense-checklist", "生成报销清单"], ["rejection-reply", "生成报销驳回说明"], ["travel-expense", "生成差旅报销说明"], ["invoice-note", "生成发票要求"], ["expense-faq", "生成报销 FAQ"]], ["报销", "发票"]),
      scenario("contract-review", "合同初审", [["contract-summary", "总结合同要点"], ["risk-clauses", "识别风险条款"], ["missing-clauses", "检查缺失条款"], ["revision-suggestion", "生成修改建议"], ["negotiation-note", "生成谈判问题"], ["legal-disclaimer", "生成初审提醒"]], ["合同", "法务", "初审"]),
      scenario("meeting-minutes", "会议纪要", [["meeting-summary", "生成会议纪要"], ["action-items", "提取行动项"], ["decision-record", "整理决策记录"], ["follow-up-mail", "生成会后邮件"], ["weekly-meeting", "生成周会纪要"], ["minutes-polish", "润色纪要"]], ["会议纪要", "会议"]),
      scenario("weekly-summary", "周报总结", [["weekly-report", "生成个人周报"], ["team-weekly", "生成团队周报"], ["monthly-report", "生成月报"], ["project-progress", "总结项目进度"], ["risk-next", "生成风险和下周计划"], ["report-polish", "润色报告"]], ["周报", "月报"]),
      scenario("cross-functional", "跨部门沟通", [["alignment-message", "生成对齐沟通"], ["resource-request", "生成资源申请"], ["delay-notice", "生成延期说明"], ["conflict-resolution", "生成冲突沟通"], ["decision-request", "生成决策请求"], ["status-sync", "生成同步邮件"]], ["跨部门", "沟通"])
    ]
  }
];

PROMPT_TAXONOMY.push({
  slug: "needs-review",
  name: "未归类 / 待审核",
  icon: "QA",
  description: "迁移后仍需人工确认的后台内容，前台默认不展示。",
  keywords: [],
  isActive: false,
  adminOnly: true,
  scenarios: [
    scenario("needs-classification", "待人工归类", [
      ["manual-review", "待人工分类"],
      ["quality-review", "待质量复核"],
      ["access-review", "待权限确认"],
      ["field-completion", "待补充字段"],
      ["publish-review", "待发布审核"]
    ])
  ]
});

export function slugify(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[^\w\u4e00-\u9fff]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .toLowerCase() || "item";
}

export function categoryId(type, ...parts) {
  const prefix = type === "department" ? "dept" : type;
  return `${prefix}-${parts.map(slugify).filter(Boolean).join("-")}`;
}

export function flattenTaxonomy() {
  const rows = [];
  for (const [departmentIndex, department] of PROMPT_TAXONOMY.entries()) {
    const departmentId = categoryId("department", department.slug);
    const departmentActive = department.isActive === false ? 0 : 1;
    const departmentAccess = department.adminOnly ? "admin" : "public";
    rows.push({
      id: departmentId,
      parent_id: null,
      level: 1,
      type: "department",
      name: department.name,
      slug: department.slug,
      description: department.description,
      icon: department.icon,
      sort_order: (departmentIndex + 1) * 10000,
      is_active: departmentActive,
      access_scope: departmentAccess
    });
    for (const [scenarioIndex, item] of department.scenarios.entries()) {
      const scenarioId = categoryId("scenario", department.slug, item.slug);
      rows.push({
        id: scenarioId,
        parent_id: departmentId,
        level: 2,
        type: "scenario",
        name: item.name,
        slug: item.slug,
        description: `${department.name} - ${item.name}`,
        icon: department.icon,
        sort_order: (departmentIndex + 1) * 10000 + (scenarioIndex + 1) * 100,
        is_active: departmentActive,
        access_scope: departmentAccess
      });
      for (const [taskIndex, taskItem] of item.tasks.entries()) {
        rows.push({
          id: categoryId("task", department.slug, item.slug, taskItem.slug),
          parent_id: scenarioId,
          level: 3,
          type: "task",
          name: taskItem.name,
          slug: taskItem.slug,
          description: `${item.name} - ${taskItem.name}`,
          icon: department.icon,
          sort_order: (departmentIndex + 1) * 10000 + (scenarioIndex + 1) * 100 + taskIndex + 1,
          is_active: departmentActive,
          access_scope: departmentAccess
        });
      }
    }
  }
  return rows;
}

const text = (value = "") => String(value ?? "").trim();
const list = (value) => Array.isArray(value) ? value : [];

function promptText(prompt) {
  return [
    prompt?.title,
    prompt?.category,
    prompt?.summary,
    prompt?.source,
    prompt?.body,
    prompt?.copyPrompt,
    prompt?.negativePrompt,
    prompt?.usageTips,
    prompt?.parameterTips,
    prompt?.zhPrompt,
    prompt?.enPrompt,
    prompt?.mjPrompt,
    prompt?.videoPrompt,
    prompt?.contentType,
    prompt?.promptKind,
    prompt?.platform,
    prompt?.model,
    prompt?.language,
    prompt?.subjectCount,
    prompt?.gridType,
    prompt?.aspectRatio,
    ...list(prompt?.tags),
    ...list(prompt?.variables),
    ...list(prompt?.seoKeywords),
    ...list(prompt?.shotSize),
    ...list(prompt?.cameraAngle),
    ...list(prompt?.cameraMovement),
    ...list(prompt?.lighting),
    ...list(prompt?.colorGrade),
    ...list(prompt?.mood),
    ...list(prompt?.styleTags),
    ...Object.values(prompt?.variableDefaults || {})
  ].map(text).filter(Boolean).join(" ").toLowerCase();
}

function countKeywordHits(source, keywords) {
  let score = 0;
  for (const keyword of keywords) {
    const term = text(keyword).toLowerCase();
    if (term && source.includes(term)) score += 1;
  }
  return score;
}

function fallbackVisualClassification(prompt, source) {
  const kind = text(prompt?.promptKind).toLowerCase();
  const isVideo = kind === "video" || source.includes("视频") || source.includes("video");
  const isImage = kind === "image" || source.includes("图像") || source.includes("图片") || source.includes("midjourney") || source.includes("stable diffusion");
  if (!isVideo && !isImage) return null;

  const departmentSlug = "film-aigc-visual";
  let scenarioSlug = isVideo ? "text-to-video" : "single-grid-image";
  let taskSlug = isVideo ? "general-video-prompt" : "single-product-hero";
  if (source.includes("图生视频") || source.includes("image-to-video")) {
    scenarioSlug = "image-to-video";
    taskSlug = "animate-still-image";
  } else if (source.includes("分镜") || source.includes("镜头")) {
    scenarioSlug = "shot-language";
    taskSlug = "camera-movement";
  } else if (source.includes("多人") || source.includes("group") || source.includes("合影")) {
    scenarioSlug = "multi-person-image";
    taskSlug = "group-photo";
  } else if (source.includes("九宫格") || source.includes("四宫格") || source.includes("组图")) {
    scenarioSlug = "multi-grid-image";
    taskSlug = "nine-grid-xiaohongshu";
  } else if (source.includes("海报")) {
    scenarioSlug = "movie-poster";
    taskSlug = "cinematic-poster";
  } else if (source.includes("角色")) {
    scenarioSlug = "character-design";
    taskSlug = "character-profile";
  }
  return {
    department_id: categoryId("department", departmentSlug),
    scenario_id: categoryId("scenario", departmentSlug, scenarioSlug),
    task_id: categoryId("task", departmentSlug, scenarioSlug, taskSlug),
    confidence: 0.72
  };
}

export function classifyPrompt(prompt) {
  const source = promptText(prompt);
  const visualFallback = fallbackVisualClassification(prompt, source);
  let best = null;

  for (const department of PROMPT_TAXONOMY.filter((item) => !item.adminOnly)) {
    const departmentScore = countKeywordHits(source, [department.name, department.slug, ...(department.keywords || [])]) * 3;
    for (const scenarioItem of department.scenarios) {
      const scenarioScore = countKeywordHits(source, [scenarioItem.name, scenarioItem.slug, ...(scenarioItem.keywords || [])]) * 5;
      for (const taskItem of scenarioItem.tasks) {
        const taskScore = countKeywordHits(source, [taskItem.name, taskItem.slug, ...(taskItem.keywords || [])]) * 7;
        const total = departmentScore + scenarioScore + taskScore;
        if (!best || total > best.score) {
          best = {
            score: total,
            departmentSlug: department.slug,
            scenarioSlug: scenarioItem.slug,
            taskSlug: taskItem.slug
          };
        }
      }
    }
  }

  if ((!best || best.score < 3) && visualFallback) return visualFallback;
  if (!best || best.score < 3) {
    return {
      department_id: UNCLASSIFIED_CATEGORY.departmentId,
      scenario_id: UNCLASSIFIED_CATEGORY.scenarioId,
      task_id: UNCLASSIFIED_CATEGORY.taskId,
      confidence: 0
    };
  }

  return {
    department_id: categoryId("department", best.departmentSlug),
    scenario_id: categoryId("scenario", best.departmentSlug, best.scenarioSlug),
    task_id: categoryId("task", best.departmentSlug, best.scenarioSlug, best.taskSlug),
    confidence: Math.min(0.96, best.score >= 12 ? 0.9 : best.score >= 7 ? 0.75 : 0.58)
  };
}
