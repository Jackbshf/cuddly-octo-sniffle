const image = (path) => path;

export const contactContent = {
  title: "GET IN TOUCH",
  subtitle: "合作咨询",
  description: "留下项目类型、预算区间和联系方式，我会根据你的需求给出匹配方案。",
  ctaLabel: "提交需求"
};

export const heroBoard = {
  primary: image("images/_optimized/微信图片_20260411183205_89_7.webp"),
  secondary: [
    image("images/_optimized/ref-look-202604131510.webp"),
    image("images/_optimized/微信图片_20260411183234_116_7.webp"),
    image("images/_posters/24eae46c0eba45f2f1176aa7847307fe.webp"),
    image("images/_optimized/微信图片_20260411183200_84_7.webp")
  ]
};

export const works = [
  {
    id: "ecommerce-content-package",
    index: "01",
    title: "E-Commerce Content Package",
    subtitle: "电商内容包案例板",
    description: "围绕产品主视觉、细节、卖点、视频封面和缩略素材建立一套可投放的电商内容包。",
    heroImage: image("images/_optimized/微信图片_20260411183205_89_7.webp"),
    galleryImages: [
      image("images/_optimized/微信图片_20260411183200_84_7.webp"),
      image("images/_optimized/微信图片_20260411183210_92_7.webp"),
      image("images/_optimized/微信图片_20260411183217_97_7.webp"),
      image("images/_posters/24eae46c0eba45f2f1176aa7847307fe.webp"),
      image("images/_optimized/微信图片_20260411183221_101_7.webp"),
      image("images/_optimized/微信图片_20260411183158_81_7.webp")
    ],
    tags: ["Product Hero", "Detail Visual", "Video Cover", "Selling Point"],
    labels: ["Main Visual", "Product Detail", "Benefit Frame", "Video Cover", "Texture", "Scenario"]
  },
  {
    id: "commercial-poster-design",
    index: "02",
    title: "Commercial Poster Design",
    subtitle: "商业海报合集",
    description: "用强光影、明确产品占位和克制排版构建可延展的商业海报系统。",
    heroImage: image("images/_optimized/微信图片_20260411183205_89_7.webp"),
    galleryImages: [
      image("images/_optimized/微信图片_20260411183205_89_7.webp"),
      image("images/_optimized/微信图片_20260411183204_88_7.webp"),
      image("images/_optimized/微信图片_20260411183221_101_7.webp"),
      image("images/_optimized/微信图片_20260411183312_154_7.webp")
    ],
    tags: ["Poster", "Campaign Key Visual", "Layout System", "Commercial"],
    labels: ["Launch Poster", "Brand Texture", "Visual Extension", "Talent Poster"]
  },
  {
    id: "ai-3d-product-visuals",
    index: "03",
    title: "AI + 3D Product Visuals",
    subtitle: "AI + 3D 产品视觉流程",
    description: "从形体草模、材质探索、灯光场景到最终视觉，建立可复用的产品视觉流程。",
    heroImage: image("images/_optimized/微信图片_20260411183205_89_7.webp"),
    galleryImages: [
      image("images/_optimized/微信图片_20260411183210_92_7.webp"),
      image("images/_optimized/微信图片_20260411183217_97_7.webp"),
      image("images/_optimized/微信图片_20260411183200_84_7.webp"),
      image("images/_optimized/微信图片_20260411183205_89_7.webp")
    ],
    tags: ["Clay Render", "Material", "Lighting", "Final Visual"],
    processSteps: [
      { title: "Clay Render", image: image("images/_optimized/微信图片_20260411183210_92_7.webp") },
      { title: "Material", image: image("images/_optimized/微信图片_20260411183217_97_7.webp") },
      { title: "Lighting", image: image("images/_optimized/微信图片_20260411183200_84_7.webp") },
      { title: "Final Visual", image: image("images/_optimized/微信图片_20260411183205_89_7.webp") }
    ]
  },
  {
    id: "ai-model-fashion-styling",
    index: "04",
    title: "AI Model & Fashion Styling",
    subtitle: "Character Consistency / Lookbook Visuals",
    description: "保持同一 AI 模特在不同服装、场景与商业镜头中的一致性，并延展面部、面料和配饰细节。",
    heroImage: image("images/_optimized/ref-look-202604131510.webp"),
    galleryImages: [
      image("images/_optimized/ref-look-202604131510.webp"),
      image("images/_optimized/ref-look-202604131510-2.webp"),
      image("images/_optimized/微信图片_20260411183312_154_7.webp"),
      image("images/_optimized/删掉图片中已毕业和右下角白色文字，可立即到岗改成薪资面议，其他内容不变_2K_202604131852.webp"),
      image("images/IMG_20260323_133305.jpg"),
      image("images/IMG_20260323_133345.jpg"),
      image("images/IMG_20260323_133415.jpg"),
      image("images/IMG_20260323_133645.jpg")
    ],
    tags: ["Character Consistency", "Lookbook", "Fashion Styling", "Detail Set"],
    labels: ["Look 01", "Look 02", "Portrait", "Campaign", "Face", "Fabric", "Accessory", "Scene"]
  },
  {
    id: "ai-commercial-video",
    index: "05",
    title: "AI Commercial Video",
    subtitle: "广告视频关键帧",
    description: "以静态广告分镜板展示视频封面、关键帧节奏和镜头调性；当前不实现播放器。",
    heroImage: image("images/_posters/24eae46c0eba45f2f1176aa7847307fe.webp"),
    galleryImages: [
      image("images/_posters/b6a39d08c7e48ae9e9604df1f825b8e5.webp"),
      image("images/_posters/d9c14d8520e106a0803087b55aaea7ad.webp"),
      image("images/_posters/a6537e213935b778ba57eade8bbf142a.webp"),
      image("images/_posters/a0e8e242e241cb0c0033bddea568b644.webp"),
      image("images/_posters/51339bc463f2bb227aef56406ae9f0ac.webp")
    ],
    tags: ["Storyboard", "Video Cover", "Keyframe", "Short-form Ads"]
  },
  {
    id: "digital-art-direction",
    index: "06",
    title: "Digital Art Direction",
    subtitle: "原创数字艺术方向",
    description: "面向原创角色、氛围场景、音乐视觉封面和世界观设定的数字艺术方向探索。",
    heroImage: image("images/_optimized/微信图片_20260411183234_116_7.webp"),
    galleryImages: [
      image("images/_optimized/微信图片_20260411183234_116_7.webp"),
      image("images/Gemini_Generated_Image_3zk3hz3zk3hz3zk3.png"),
      image("images/_optimized/a3855ba84a066337e5a3c0ab2d555dee.webp"),
      image("images/v2_mnr9v4ax_c4177d8db447350a.jpg_.webp")
    ],
    tags: ["Original Character", "Mood Scene", "Music Visual", "Worldbuilding"],
    labels: ["Character", "Atmosphere", "Cover", "World"]
  },
  {
    id: "ai-short-drama-development",
    index: "07",
    title: "AI Short Drama Development",
    subtitle: "AI 短剧开发板",
    description: "以原创东方幻想或未来城市为基调，组织角色主视觉、场景图和分镜关键帧。",
    heroImage: image("images/_optimized/微信图片_20260411183234_116_7.webp"),
    galleryImages: [
      image("images/_optimized/微信图片_20260411183234_116_7.webp"),
      image("images/_optimized/a3855ba84a066337e5a3c0ab2d555dee.webp"),
      image("images/_optimized/v2_mnr9v465_c5c783ec9dba146b (2).webp"),
      image("images/v2_mnr9tx74_15aadd9d1b8db9c3.png_.webp"),
      image("images/v2_mnr9v4ax_c4177d8db447350a.jpg_.webp"),
      image("images/v2_mntugcis_84d653d28b55c585.jpg_.jpg")
    ],
    tags: ["Character", "Scene", "Storyboard", "Cinematic Mood"],
    labels: ["Character Key", "Hero Scene", "Frame 01", "Frame 02", "Frame 03", "Frame 04"]
  },
  {
    id: "integrated-campaign-case-study",
    index: "08",
    title: "Integrated Campaign Case Study",
    subtitle: "完整 Campaign 视觉系统",
    description: "把产品主海报、电商主图、社媒方图、视频封面、分镜帧、AI 模特生活方式图和色彩板整合成一套提案板。",
    heroImage: image("images/_optimized/微信图片_20260411183205_89_7.webp"),
    galleryImages: [
      image("images/_optimized/微信图片_20260411183205_89_7.webp"),
      image("images/_optimized/微信图片_20260411183200_84_7.webp"),
      image("images/_posters/24eae46c0eba45f2f1176aa7847307fe.webp"),
      image("images/_optimized/ref-look-202604131510.webp"),
      image("images/_optimized/微信图片_20260411183221_101_7.webp"),
      image("images/_optimized/微信图片_20260411183158_81_7.webp")
    ],
    tags: ["Hero Poster", "E-Commerce", "Social", "Video Cover", "Lifestyle"],
    palette: ["#050B12", "#07131C", "#0B5D69", "#00E5D4", "#E8F8FF", "#B7C7D8"]
  }
];

export const replacementSlots = [
  "Hero main collage board",
  "AI + 3D process: clay render / material / lighting / final visual",
  "Digital Art Direction original character and worldbuilding frames",
  "Integrated Campaign complete visual system board"
];
