# BoomPilot 可视化 AI 工具目录

更新时间：2026-04-29

这份清单用于 BoomPilot AI Toolbox。默认优先推荐有网页界面、能本地部署、普通用户能直接看懂用途的工具。CLI-only 工具不放在首页。

## 优先推荐

| 分类 | 工具 | 仓库 | 能做什么 | 本地压力 | 安装提醒 |
| --- | --- | --- | --- | --- | --- |
| 工作流自动化 | n8n | https://github.com/n8n-io/n8n | 可视化自动化工作流，连接表格、网页、消息、AI 节点和业务系统 | 中 | 已接入工具箱，必须绑定 127.0.0.1 |
| 工作流自动化 | Flowise | https://github.com/FlowiseAI/Flowise | 拖拽式 LLM 工作流和 Agent 编排 | 中 | 常需要模型 API Key |
| 聊天/知识库 | Open WebUI | https://github.com/open-webui/open-webui | 本地 AI 聊天、Ollama/OpenAI 兼容入口、知识库界面 | 中 | 推荐 Docker，自托管常用 |
| 聊天/知识库 | AnythingLLM | https://github.com/Mintplex-Labs/anything-llm | 文档知识库问答，把资料变成可问答工作区 | 中 | 常需要 Docker 或官方本地方案 |
| 聊天/知识库 | LibreChat | https://github.com/danny-avila/LibreChat | 自托管 ChatGPT 风格多模型聊天平台 | 高 | 多服务，推荐 Docker |
| 可视化 Agent | Dify | https://github.com/langgenius/dify | 可视化 AI 应用、知识库问答、Agent 和工作流编排 | 高 | 服务较多，推荐 Docker Compose |
| 可视化 Agent | Langflow | https://github.com/langflow-ai/langflow | 图形化搭建 AI Agent、链路和知识库流程 | 中 | Python 依赖较多 |
| 浏览器自动化 | browser-use web-ui | https://github.com/browser-use/web-ui | 用网页界面让 AI 操作浏览器、抓资料、填表单 | 中 | 需要浏览器运行时和模型 API Key |
| 模型网关 | LiteLLM | https://github.com/BerriAI/litellm | 统一管理 OpenAI、Claude、Gemini、DeepSeek 等模型 API | 低 | 已接入工具箱，必须绑定 127.0.0.1 |
| 数据/内部工具 | NocoDB | https://github.com/nocodb/nocodb | 把数据库变成可视化表格和内部工具 | 中 | 需要确认数据目录和端口 |

## 可视化开发与内部工具

| 分类 | 工具 | 仓库 | 能做什么 | 本地压力 | 安装提醒 |
| --- | --- | --- | --- | --- | --- |
| 内部工具 | ToolJet | https://github.com/ToolJet/ToolJet | 构建内部工具、仪表盘、业务应用和 AI Agent | 中 | 安装前先安全审查 |
| 内部工具 | Appsmith | https://github.com/appsmithorg/appsmith | 低代码内部工具、运营后台、审批台和数据看板 | 高 | 推荐 Docker，服务较重 |
| 内部工具 | ILLA Builder | https://github.com/illacloud/illa-builder | 低代码业务应用和内部工具构建器 | 高 | 安装前先安全审查 |
| 工作流自动化 | Activepieces | https://github.com/activepieces/activepieces | 类 Zapier 的开源自动化平台 | 高 | 多服务，推荐 Docker |
| 可视化 Agent | PySpur | https://github.com/PySpur-Dev/pyspur | Agent 工作流 playground，用图形方式调试多步骤流程 | 中 | 较新项目，安装前先看审查结果 |
| 可视化 Agent | OpenHands | https://github.com/OpenHands/OpenHands | 面向软件任务的 AI Agent 工作台 | 高 | 涉及容器、沙箱和模型 API |
| 可视化 Agent | Inkeep Agents | https://github.com/inkeep/agents | No-code/TypeScript 同步的 Agent 工作流构建器 | 低-中 | 安装前先确认本地启动方式 |
| 可视化 Agent | Vercel Workflow Builder Template | https://github.com/vercel-labs/workflow-builder-template | 可视化 AI workflow 模板 | 低 | 模板项目，适合学习或二次开发 |

## 重型/GPU 工具

这些工具有网页界面，但通常需要 NVIDIA GPU、模型文件、大量磁盘空间或较长安装时间。默认不在 BoomPilot 首页自动安装。

| 分类 | 工具 | 仓库 | 能做什么 | 本地压力 | 安装提醒 |
| --- | --- | --- | --- | --- | --- |
| AI 创作 | ComfyUI | https://github.com/Comfy-Org/ComfyUI | 节点式图像生成工作流 | 高 | 需要 GPU、模型文件和磁盘空间 |
| AI 创作 | Stable Diffusion WebUI | https://github.com/AUTOMATIC1111/stable-diffusion-webui | 经典 Stable Diffusion 网页界面 | 高 | 需要 GPU、Python 依赖和模型权重 |
| AI 创作 | Fooocus | https://github.com/lllyasviel/Fooocus | 更偏开箱即用的本地图像生成 WebUI | 高 | 首次模型下载较大 |
| AI 创作 | InvokeAI | https://github.com/invoke-ai/InvokeAI | 面向创作生产的图像生成工作台 | 高 | 需要确认 GPU、模型和磁盘空间 |

## 轻量聊天入口

| 分类 | 工具 | 仓库 | 能做什么 | 本地压力 | 安装提醒 |
| --- | --- | --- | --- | --- | --- |
| 聊天/知识库 | NextChat | https://github.com/ChatGPTNextWeb/NextChat | 轻量多模型聊天网页，适合做本地 ChatGPT 风格入口 | 低 | 通常需要模型 API Key |
| 聊天/知识库 | LobeChat | https://github.com/lobehub/lobehub | 精致多模型聊天界面，统一管理多个云模型 | 中 | 通常需要模型 API Key |

## BoomPilot 接入规则

- 用户同意前不自动安装陌生仓库。
- 陌生仓库先进入 `D:\AI-Tools\staging`。
- 安装前生成 `SECURITY_REVIEW.md`。
- 安装目录固定为 `D:\AI-Tools\apps\<appName>`。
- 工具必须注册到 `D:\AI-Tools\registry\tools.json`。
- 启动脚本只绑定本地地址，默认 `127.0.0.1`。
- API Key、token、secret 只能放在本地 `.env`，不能写入代码或日志。
