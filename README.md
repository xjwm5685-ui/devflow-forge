<div align="center">

# 🌌 DevFlow Forge

**自托管的多智能体 DevOps 工作台**

把 GitHub 仓库接进来 · 在可视化画布里拖出工作流 · 让本地 AI 编程 CLI 自动重构、测试、写文档、做部署

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%E2%89%A520-43853d.svg)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-%E2%89%A59-f69220.svg)](https://pnpm.io)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000.svg)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev)

</div>

---

## 📑 目录

- [✨ 项目介绍](#-项目介绍)
- [🎯 核心特性](#-核心特性)
- [🧭 三种运行模式](#-三种运行模式)
- [🏗️ 架构总览](#️-架构总览)
- [🚀 快速开始](#-快速开始)
- [⚙️ 详细配置](#️-详细配置)
- [📚 使用教程](#-使用教程)
  - [1. 登录与初始化](#1-登录与初始化)
  - [2. 创建第一个项目](#2-创建第一个项目)
  - [3. 设计你的工作流](#3-设计你的工作流)
  - [4. 运行任务并查看流式输出](#4-运行任务并查看流式输出)
  - [5. 部署容器到本地 Docker](#5-部署容器到本地-docker)
  - [6. 生成多模态文档](#6-生成多模态文档)
- [🤖 AI 智能体说明](#-ai-智能体说明)
- [🛠️ 本地 CLI 桥接](#️-本地-cli-桥接)
- [🔐 GitHub 集成](#-github-集成)
- [🐳 Docker 部署](#-docker-部署)
- [🔒 安全模型](#-安全模型)
- [🧪 开发与调试](#-开发与调试)
- [❓ 常见问题](#-常见问题)
- [🤝 参与贡献](#-参与贡献)
- [📄 许可证](#-许可证)

---

## ✨ 项目介绍

**DevFlow Forge** 是一个完全运行在本机的 AI 编程工作台。它把 n8n 风格的可视化工作流编辑器、多智能体协作框架和本地 CLI 编程工具（Claude Code、opencode、Codex、Gemini CLI、aider 等）粘合起来，让你像拖节点一样组合 AI 流程，自动完成「重构 → 写测试 → 生成文档 → 构建镜像 → 本地部署」这一整条 DevOps 链路。

它解决的问题：

- **手动调度多个 AI CLI 太烦**：每个 CLI 的命令、权限、模型参数都不一样，一个流程要切换 5 次终端。
- **API 成本不可控**：直接 chat 模式跑全仓库重构往往烧掉几美金。CLI 模式让你用本地订阅（Claude Code Max / Cursor Pro / GitHub Copilot CLI）按月付费跑无限工作流。
- **信息散落各处**：代码、PR、测试、文档、部署日志分布在 GitHub、IDE、终端、Slack。DevFlow Forge 把它们汇总到一个面板。
- **想要本地隐私**：所有数据落在 SQLite + 本地文件系统。除非你显式指向远程 API，**任何代码不会离开你的网络**。

> 一句话总结：**它把"AI Agent 工作流编排器"做成了一个像 n8n 一样可拖拽，但驱动的不是 HTTP 节点，而是真正会改你代码的 CLI 工具。**

---

## 🎯 核心特性

| 模块 | 说明 |
| --- | --- |
| 🎨 **液态玻璃 UI** | 自研设计系统，基于 `next/font` 加载 Instrument Serif × Manrope × JetBrains Mono，配合 aurora 动效背景、refraction 边缘、自制下拉组件，告别 Bootstrap 风。 |
| 🧩 **可视化工作流编辑器** | 基于 React Flow（@xyflow/react）。支持 Trigger / Agent / Condition / Deploy 节点，分支、循环、条件跳转，画布缩放视口持久化。 |
| 🧠 **多智能体协作** | 内置 `architect / coder / qa / devops` 四个角色，可以串成「架构 → 编码 → 测试反馈循环 → 部署」。支持自定义 prompt agent。 |
| 🔌 **三种 AI 运行时** | Demo（无密钥可跑） / API（OpenAI 兼容） / CLI（本地 8 种 AI 编程工具） 一键切换。 |
| 🐙 **真实 GitHub 集成** | OAuth + Device Flow（无密钥也能跑）/ Redirect Flow（hosted 部署）双模式。AES-256-GCM 加密 access token 落盘。支持仓库导入、文件快照、PR 创建。 |
| 🛡️ **CLI 沙箱化** | 每个任务都会在 `storage/cli-workspaces/<taskId>/` 物化一份只属于这个任务的工作区，CLI 无法写到 DevFlow 自己的源码里。 |
| 🐳 **本地 Docker 部署** | 自动检测语言（Node / Next.js / Python / Go），生成多阶段 Dockerfile，调本地 Docker socket 构建镜像、跑容器、流式回传日志。 |
| 📊 **多模态文档** | 自动生成 Mermaid 架构图、TTS 音频解说、HTML 幻灯片视频。 |
| 🔐 **企业级安全** | JWT 会话、CSRF state、加密静态密钥、路径穿越防护、生产环境强制 Secure Cookie。 |
| 📈 **Token 用量统计** | 每次 API/CLI 调用都会记录到 `TokenUsage`，可以按用户、模型、任务聚合。 |

---

## 🧭 三种运行模式

DevFlow Forge 支持三种 AI 运行模式，**可以在 `/dashboard/settings` 里随时切换**，不需要重启：

| 模式 | 工作方式 | 需要什么 | 适合场景 |
| --- | --- | --- | --- |
| 🎭 **Demo** | 返回预录制的智能体响应，所有 UI 都能渲染、动画都能跑 | 什么都不要 | 第一次试用、做演示、贡献 UI |
| 🌐 **API** | 调用任何 OpenAI 兼容的 HTTP 接口 | API Key 或 本地 Ollama / vLLM 地址 | 快速集成、无 CLI 环境、远程模型 |
| 💻 **CLI** | 在本机生成进程，调用真实 AI 编程 CLI | claude / opencode / codex / gemini / aider 之一 | **强烈推荐**：用月付订阅跑无限任务，且智能体真的会读写文件 |

> 💡 **建议**：先用 Demo 模式熟悉 UI，再换 CLI 模式跑真实任务。API 模式适合接 DeepSeek、Qwen 等 OpenAI 兼容的国内模型。

---

## 🏗️ 架构总览

```
devflow-forge/
├── apps/
│   └── web/                            # Next.js 16 App Router 前后端一体
│       ├── app/
│       │   ├── (auth)/                 # 登录路由组
│       │   ├── api/                    # REST 路由 + tRPC 端点
│       │   │   ├── auth/github/        # OAuth 回调 + Device Flow
│       │   │   ├── tasks/[id]/stream/  # SSE 流式输出
│       │   │   ├── webhooks/github/    # GitHub webhook 接收
│       │   │   ├── generated/          # 多模态产物
│       │   │   ├── settings/           # 运行时配置
│       │   │   └── trpc/[trpc]/        # tRPC 入口
│       │   └── dashboard/              # 主面板
│       │       ├── projects/           # 项目列表 + 详情
│       │       ├── templates/          # 工作流模板市场
│       │       ├── agents/             # 智能体配置
│       │       └── settings/           # 全局设置
│       ├── components/                 # 共享 UI（包括自制 GlassSelect）
│       ├── lib/
│       │   ├── ai/
│       │   │   ├── agents/             # BaseAgent + architect/coder/qa/devops
│       │   │   ├── cli/                # CLI runner、provider 定义、工作区物化
│       │   │   ├── client.ts           # OpenAI 兼容 HTTP 客户端
│       │   │   ├── context-manager.ts  # token 感知的文件选择
│       │   │   └── token-meter.ts      # 用量记账
│       │   ├── auth/                   # JWT 会话、GitHub OAuth、Secure Cookie
│       │   ├── deploy/                 # Dockerfile 生成 + 容器构建器
│       │   ├── github/                 # GitHub API 客户端 + 加密 token 存储
│       │   ├── multimodal/             # 音频 / 视频 / 文档生成
│       │   ├── queue/                  # 后台 worker
│       │   ├── trpc/                   # 类型化 API 路由器
│       │   └── settings.ts             # 持久化运行时配置
│       └── storage/                    # 运行期产物（CLI 工作区、上传文件）
├── packages/
│   ├── db/                             # Prisma schema + 迁移 + seed
│   └── shared/                         # Zod schema + 跨 app 共享类型
├── scripts/                            # setup.sh / setup.ps1 / docker-entrypoint.sh
├── .github/                            # CI workflow + issue/PR 模板
├── Dockerfile                          # 多阶段构建（生产镜像）
├── docker-compose.yml                  # 一键自托管编排
└── README.md                           # 你正在看
```

### 核心技术栈

| 层 | 选型 |
| --- | --- |
| 前端 | Next.js 16 App Router · React 19 · Tailwind v4 · React Flow |
| API | tRPC v11（类型安全） · Next.js Route Handlers · Server Actions |
| 数据库 | Prisma 6 + SQLite（默认） · 可换 Postgres/MySQL |
| 鉴权 | jose（JWT HS256） · GitHub OAuth · Device Flow |
| AI 客户端 | 自研 OpenAI 兼容 fetch 包装器 + SSE 流式解析 |
| 后台任务 | 内置内存队列（无外部依赖） |
| 加密 | Node `crypto` AES-256-GCM |
| 包管理 | pnpm 10 + monorepo workspace |

---

## 🚀 快速开始

### 0. 前置要求

| 工具 | 版本 | 必需吗 |
| --- | --- | --- |
| Node.js | ≥ 20 | ✅ |
| pnpm | ≥ 9 | ✅ |
| Git | 任意 | ✅ |
| Docker | 任意 | 仅本地容器部署需要 |
| AI 编程 CLI | 看下方表格 | 仅 CLI 模式需要 |

### 1. 克隆仓库

```bash
git clone https://github.com/<your-org>/devflow-forge.git
cd devflow-forge
```

### 2. 一键安装

**Linux / macOS：**

```bash
./scripts/setup.sh
```

**Windows（PowerShell）：**

```powershell
./scripts/setup.ps1
```

`setup` 脚本会做这些事：

1. 检查 Node 20+ / pnpm
2. `pnpm install` 安装所有 workspace 依赖
3. 复制 `.env.example` → `apps/web/.env.local`
4. `prisma db push` 初始化 SQLite
5. `prisma db seed` 注入演示工作流、智能体、任务

### 3. 启动开发服务器

```bash
pnpm dev
```

打开浏览器访问 **<http://localhost:3000>**。

> 默认 Demo 模式即开即用，**不需要任何密钥**。看完动画想跑真实任务，再去 `/dashboard/settings` 切换模式。

---

## ⚙️ 详细配置

所有配置都在 `apps/web/.env.local`。下面按重要程度分组：

### 🔑 必填（生产环境）

```env
# 32+ 位随机字符串。用 openssl rand -hex 32 生成。
SESSION_SECRET="..."

# 应用对外可访问的 URL（影响 OAuth 回调和 cookie 域）
NEXTAUTH_URL="http://localhost:3000"

# SQLite 文件路径（相对 apps/web/）
DATABASE_URL="file:./devflow.db"
```

> ⚠️ **生产环境如果不设 `SESSION_SECRET`，服务器会拒绝启动**——这是故意的。

### 🐙 GitHub OAuth（要登录就需要）

到 <https://github.com/settings/developers> 创建一个 OAuth App。两种玩法：

#### 方案 A：Device Flow（推荐自托管）

只需要 Client ID（公开值），不需要 secret，省掉了 callback URL 配置：

```env
GITHUB_CLIENT_ID="Iv1.xxxxxxxxxxxxxxxx"
GITHUB_CLIENT_SECRET=          # 留空
GITHUB_OAUTH_MODE="auto"       # 自动检测，secret 为空就用 device flow
```

> 在 GitHub OAuth App 设置里**勾选 "Enable Device Flow"**。

#### 方案 B：Redirect Flow（适合公网托管）

```env
GITHUB_CLIENT_ID="Iv1.xxxx"
GITHUB_CLIENT_SECRET="xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
GITHUB_OAUTH_MODE="redirect"
```

GitHub OAuth App 的 **Authorization callback URL** 填：

```
${NEXTAUTH_URL}/api/auth/github/callback
```

#### Scope 设置

```env
GITHUB_OAUTH_SCOPE="repo read:org"   # 默认包含私有仓库读写
# 如果只读公开仓库：
# GITHUB_OAUTH_SCOPE="read:user"
```

### 🌐 API 模式（OpenAI 兼容）

```env
AI_RUNTIME="api"
OPENAI_API_KEY="sk-..."                          # 留空+本地 baseUrl 不需要
OPENAI_BASE_URL="https://api.openai.com/v1"
OPENAI_MODEL="gpt-4o"
```

**常用替代供应商配置：**

| 供应商 | OPENAI_BASE_URL | OPENAI_MODEL |
| --- | --- | --- |
| OpenAI | `https://api.openai.com/v1` | `gpt-4o` / `gpt-4o-mini` |
| DeepSeek | `https://api.deepseek.com/v1` | `deepseek-chat` |
| Qwen (DashScope) | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `qwen-max` |
| MiMo | `https://api.mimo.ai/v1` | `mimo-coder` |
| Ollama 本地 | `http://localhost:11434/v1` | `llama3.1:70b`（**不需要 key**） |
| LM Studio | `http://localhost:1234/v1` | 任意（**不需要 key**） |
| vLLM | `http://localhost:8000/v1` | 任意（**不需要 key**） |

> 🪄 当 `OPENAI_BASE_URL` 是 `localhost / 127.0.0.1` 时，`OPENAI_API_KEY` 可以留空。

### 💻 CLI 模式

```env
AI_RUNTIME="cli"
AI_CLI_PROVIDER="claude-code"                # 或 opencode / openai-codex / gemini-cli / aider / ...
AI_CLI_MODEL=""                              # 可选，覆盖 CLI 默认模型
AI_CLI_MODE="read-only"                      # read-only | workspace-write
AI_CLI_WORKDIR=""                            # 留空 = 自动每任务隔离工作区
AI_CLI_TIMEOUT_SECONDS="300"                 # 单次调用硬超时（15..1800）
AI_CLI_FALLBACK="fail"                       # CLI 失败时：fail | api | demo
```

详见下方[本地 CLI 桥接](#️-本地-cli-桥接)章节。

### 🔒 加密（可选但推荐）

```env
# 32 字节 hex。如果不设，会从 SESSION_SECRET 派生
TOKEN_ENCRYPTION_KEY=""
SETTINGS_ENCRYPTION_KEY=""
```

> 🎯 设置独立的密钥可以让你在轮换 SESSION_SECRET 时**不丢失已存储的 GitHub token / API key**。

---

## 📚 使用教程

下面是从零到第一次跑通工作流的完整指南。

### 1. 登录与初始化

启动后访问 <http://localhost:3000>，会跳转到登录页：

- **Demo 模式**：可以点 "Continue as guest" 直接进入（数据存在 demo user 下）。
- **GitHub 模式**：点 "Sign in with GitHub"。
  - **Device Flow**：会弹出一个 8 位 code 和 GitHub 链接，去 <https://github.com/login/device> 输入 code 即可。
  - **Redirect Flow**：直接跳转到 GitHub 授权页。

登录成功后落到 `/dashboard`。第一次进入会显示 onboarding 卡片，引导你：

1. 配置 AI 运行模式（推荐先在 Demo 跑一遍）
2. 创建第一个项目（手动或从 GitHub 导入）
3. 选择一个工作流模板

### 2. 创建第一个项目

进入 **侧边栏 → Projects**，有两种创建方式：

#### A. 从 GitHub 导入（推荐）

1. 点击 "Import from GitHub"
2. 选择仓库（会拉取你的所有 repo）
3. 选择分支（默认 main，可以切换到 develop / feature 分支）
4. 系统自动拉取代码快照存入 `Project.githubRepo` + `Project.githubBranch`

#### B. 手动创建空项目

1. 点击 "New Project"
2. 填名字 + 描述（描述会作为 architect agent 的上下文）
3. 后续可以在项目详情页上传文件

### 3. 设计你的工作流

进入项目 → "Workflows" 标签 → "New Workflow"。

打开工作流编辑器后你会看到：

```
┌──────────────────────────────────────────────────────────────┐
│ 顶部：工作流名称 / Run / Save / Export 按钮                  │
├──────────────────┬─────────────────────────────────┬─────────┤
│ 左侧节点面板     │       中央 React Flow 画布      │  右侧   │
│ - Trigger        │                                 │ Inspector│
│ - Agent          │     [拖拽节点到这里]            │  面板   │
│ - Condition      │                                 │         │
│ - Deploy         │     节点之间画线连接            │         │
└──────────────────┴─────────────────────────────────┴─────────┘
```

#### 节点类型

| 节点 | 作用 | 配置项 |
| --- | --- | --- |
| **Trigger** | 工作流入口，永远是第一个节点 | 触发方式（手动 / webhook） |
| **Agent** | 执行一个 AI 智能体 | `agentName`（架构师/编码/QA/DevOps/自定义）、`prompt`（节点级覆盖指令）、`model`、`maxIterations` |
| **Condition** | 二分支跳转 | `expression`（JS 表达式，访问 `env.NODE_ENV` 等） |
| **Deploy** | 部署到本地 Docker | 由 DevOps agent 自动接管 |

#### 一个典型工作流：

```
Trigger ──→ Architect ──→ Coder ──→ QA ──┬→ Deploy（QA 通过）
                                          └→ Coder（循环修复，最多 3 次）
```

#### Inspector 面板技巧

- 选中 Agent 节点，可以在 prompt 框里写**节点专属指令**：例如 "只修复登录相关代码"。
- 这个 prompt 会和工作流主输入一起拼接成最终 prompt：
  ```
  Node instruction:
  只修复登录相关代码

  Workflow input:
  <用户在 Run 时填的输入>
  ```

### 4. 运行任务并查看流式输出

设计完工作流后：

1. 点右上角 **Run** 按钮
2. 弹窗里填**任务输入**（自然语言描述你想做什么），例如：
   ```
   把 src/lib/db.ts 中所有 prisma raw query 改成类型安全的查询，
   并补上单元测试。
   ```
3. 点击 "Start"

任务页 `/dashboard/projects/<id>/tasks/<taskId>` 会打开，你能实时看到：

- **左侧**：消息流（每个 agent 的 status、response、error 都会以聊天气泡形式逐字流式输出）
- **右侧**：节点执行进度图，当前活动节点高亮闪烁
- **底部**：token 用量统计（API 模式）/ CLI 命令日志（CLI 模式）

任务完成后会生成一份 **PR Description**，可以直接 "Create PR" 推到 GitHub。

### 5. 部署容器到本地 Docker

在项目详情页 → "Deployments" → "New Deployment"：

1. 选择环境（staging / production）
2. 系统调用 `lib/deploy/dockerfile-gen.ts` 自动检测语言：
   - 看到 `package.json` 里有 `next` → Next.js 模板（多阶段构建 + standalone 输出 + 端口 3000 + 非 root 用户）
   - 看到 `package.json` 但没 `next` → 通用 Node 模板
   - 看到 `requirements.txt` / `pyproject.toml` → Python 3.12-slim 模板
   - 看到 `go.mod` → Go 1.22-alpine 模板
   - 否则 → Ubuntu 22.04 通用模板（你需要手动改）
3. 后台执行 `docker build` + `docker run`，日志流式回传到面板
4. 部署成功后给一个 `http://localhost:<port>` 链接

> ⚠️ **DevOps Agent 通过 Docker socket 操作宿主机的 Docker daemon**。treat it as a CI runner，不要给不可信用户访问。

### 6. 生成多模态文档

侧边栏 → "Documents" → "Generate"：

- **Mermaid 架构图**：分析项目代码生成 `flowchart` / `sequenceDiagram`
- **TTS 音频解说**：把架构说明转成语音讲解（需要配置 TTS provider）
- **HTML 幻灯片视频**：导出可播放的 reveal.js 风格幻灯片

产物保存在 `apps/web/storage/generated/<type>/<docId>/`，URL 通过 `/api/generated/...` 路由暴露（带路径穿越防护）。

---

## 🤖 AI 智能体说明

DevFlow Forge 内置 4 个智能体，每个都是 `BaseAgent` 的子类（`apps/web/lib/ai/agents/`）：

| 智能体 | 职责 | 系统 prompt 重点 | 典型输出 |
| --- | --- | --- | --- |
| 🏛 **Architect** | 拆解任务、规划改动文件 | 分析模式 + 边界识别 | "需要修改 5 个文件：..." |
| 🔨 **Coder** | 实际写代码 / 改文件 | 严格遵循已有风格、不引入额外抽象 | 完整的 diff / 新文件内容 |
| 🧪 **QA** | 写测试、找 bug、回归审查 | 输出 `PASS` 或 `NEEDS_CHANGES` 关键词 | 测试代码 + 审查意见 |
| 🚀 **DevOps** | 生成 Dockerfile、CI 配置、部署 | 多阶段构建 + 非 root + 健康检查 | Dockerfile 文本 |

### QA 反馈循环

QA 是工作流里特殊的存在：当它的输出包含 `needs_changes` 或 `fail` 时，orchestrator 会自动把反馈丢给 Coder 重试，最多 `MAX_AGENT_RETRIES`（默认 3）次。

```
Architect ──→ Coder ──→ QA ──┬→（PASS）→ Deploy
                              └→（FAIL）→ Coder（带反馈）→ QA（再审）...
```

这一段在 `apps/web/lib/ai/agents/orchestrator.ts:115-165`。

### 自定义智能体

侧边栏 → "Agents" → "New Agent"：

- 设置名字、描述、icon
- 写一段 system prompt（这就是它的角色定义）
- 选择默认模型 / 温度
- 保存后会出现在工作流编辑器的 Agent 节点选择器里（`custom:<id>` 格式）

底层走 `CustomPromptAgent` 类（`apps/web/lib/ai/agents/custom-agent.ts`）。

---

## 🛠️ 本地 CLI 桥接

这是 DevFlow Forge **最与众不同**的能力——把每个 Agent 的执行后端从 HTTP API 换成本机的 AI 编程 CLI。

### 支持的 CLI

只装**一个**就能用 CLI 模式，下面是各家的安装命令和支持的权限模式：

| Provider id | 名字 | 安装 | 只读模式 | 写入模式 |
| --- | --- | --- | --- | --- |
| `claude-code` | Claude Code | `npm i -g @anthropic-ai/claude-code` | `--permission-mode plan` | `--permission-mode acceptEdits` |
| `opencode` | opencode | `npm i -g opencode-ai` | （仅 prompt） | `--dangerously-skip-permissions` |
| `openai-codex` | OpenAI Codex | `npm i -g @openai/codex` | `--sandbox read-only` | `--sandbox workspace-write` |
| `gemini-cli` | Gemini CLI | `npm i -g @google/gemini-cli` | （仅 prompt） | `--yolo` |
| `aider` | aider | `pip install aider-chat` | `--chat-mode ask` | （默认） |
| `github-copilot` | Copilot CLI | `npm i -g @github/copilot` | （仅 prompt） | （Provider 控制） |
| `qwen-code` | Qwen Code | `npm i -g @qwen-code/qwen-code` | （仅 prompt） | `--yolo` |
| `cursor-agent` | Cursor Agent | [docs.cursor.com/cli](https://docs.cursor.com/cli) | （Provider 控制） | （Provider 控制） |
| `custom` | 自定义命令 | 任意可执行二进制 | — | — |

### 工作流程

```
DevFlow Worker
    ↓
1. 物化任务工作区到 storage/cli-workspaces/<taskId>/
   (复制项目文件，每任务隔离)
    ↓
2. 解析 cliMode → 拼出对应 provider 的命令行参数
    ↓
3. 把 prompt 写到临时文件 promptRef
    ↓
4. spawn CLI 进程，cwd = 工作区目录
    ↓
5. 解析输出（claude 用 JSON 格式提取 token 用量；其他用 stdout）
    ↓
6. 任务结束自动清理 storage/cli-workspaces/<taskId>/
```

代码入口：

- 命令拼装：`apps/web/lib/ai/cli/providers.ts` — 8 个 provider 的 `buildArgs`
- 进程执行：`apps/web/lib/ai/cli/runner.ts` — `runAiCli`、JSON 解析、cwd 安全检查
- 工作区物化：`apps/web/lib/ai/cli/workspace.ts` — `prepareCliWorkspace`、`isSafeWritableCwd`

### 关键安全约束

🛡️ **DevFlow 永远不会让 CLI 写到自己源码目录里**。`isSafeWritableCwd` 检查：

- 拒绝 cwd 等于或位于 DevFlow 项目根目录
- 拒绝 cwd 在系统目录（`/`、`/usr`、`/etc`、`C:\Windows` 等）
- 推荐用默认值（让 DevFlow 自动物化每任务工作区）

如果 CLI 失败（命令找不到 / 超时 / 非零退出），按 `AI_CLI_FALLBACK` 设置：

- `fail` （默认）→ 任务失败
- `api` → 静默回退到 API 模式
- `demo` → 静默回退到 Demo 模式（适合演示场景）

### 自定义 CLI

如果要接入 DevFlow 不认识的 CLI，选 `AI_CLI_PROVIDER=custom`：

```env
AI_CLI_CUSTOM_COMMAND="my-agent"
AI_CLI_CUSTOM_ARGS='run "{{prompt}}" --mode {{mode}} --model {{model}}'
```

模板变量：

| 变量 | 含义 |
| --- | --- |
| `{{prompt}}` | 完整的 prompt 字符串（注意 escape） |
| `{{promptFile}}` | prompt 写入的临时文件绝对路径（适合长 prompt） |
| `{{mode}}` | `read-only` / `workspace-write` |
| `{{model}}` | 用户在 Settings 里设的 `cliModel` |

---

## 🔐 GitHub 集成

### OAuth 流程

```
用户点 "Sign in with GitHub"
    ↓
Device Flow 分支：
  - 调 https://github.com/login/device/code
  - 显示 user_code（如 "ABCD-1234"）
  - 轮询 /login/oauth/access_token 直到用户完成授权
  - 把 access_token 放进 Cookie
Redirect Flow 分支：
  - 生成 CSRF state（随机 32 字节）存 cookie
  - 重定向到 https://github.com/login/oauth/authorize?...&state=...
  - 用户授权后回调 /api/auth/github/callback
  - 验证 state（防 CSRF）
  - 用 code 换 access_token
    ↓
把 access_token 用 AES-256-GCM 加密存到 User.accessToken
    ↓
JWT session token 写 cookie（HttpOnly + Secure + SameSite=lax）
```

### Token 加密

入口：`apps/web/lib/github/token-store.ts`

- `encryptToken(plain)` → 返回 `enc:v1:<base64(IV + ct + GCM tag)>`
- `decryptToken(stored)` → 透明解密，支持懒迁移（旧的明文 token 自动加密）
- `getUserAccessToken(userId)` → 业务代码唯一入口，从不暴露明文

加密密钥来自 `TOKEN_ENCRYPTION_KEY` env，否则从 `SESSION_SECRET` 派生（SHA-256）。

### GitHub API 调用

`apps/web/lib/github/client.ts` 封装：

- `listRepositories(token)` — 用户全部 repo（含私有）
- `getRepoTree(token, owner, repo, ref)` — 拉取文件树
- `getFileContent(token, owner, repo, path, ref)` — 单文件内容
- `createPullRequest(token, ...)` — 在指定分支创建 PR

所有调用都加了限流和错误重试。

---

## 🐳 Docker 部署

### 开发-生产一体的 docker-compose

```bash
docker compose up --build -d
```

`docker-compose.yml` 做了什么：

```yaml
services:
  devflow:
    build: .                            # 多阶段构建（apps/web 的 Next.js standalone）
    ports: ["3000:3000"]
    environment:
      - NODE_ENV=production
      - DATABASE_URL=file:/app/data/devflow.db
      - SESSION_SECRET=${SESSION_SECRET}
      - GITHUB_CLIENT_ID=${GITHUB_CLIENT_ID}
    volumes:
      - devflow-db:/app/data            # SQLite 数据
      - devflow-storage:/app/storage    # 上传 / CLI 工作区 / 多模态产物
      - devflow-config:/app/.settings   # 加密的运行时配置
      - /var/run/docker.sock:/var/run/docker.sock  # 让 DevOps agent 能调宿主 Docker
volumes:
  devflow-db:
  devflow-storage:
  devflow-config:
```

> ⚠️ **挂载 docker.sock 等于把宿主机的 docker 权限给了容器内进程**。仅限单用户、自托管。

### 不用 Docker 的部署

```bash
pnpm install --frozen-lockfile
pnpm db:push
pnpm db:seed                             # 可选
pnpm build
SESSION_SECRET=xxx pnpm start
```

需要 reverse proxy（nginx / caddy）做 HTTPS 和域名收敛：

```nginx
server {
  server_name devflow.example.com;
  listen 443 ssl http2;
  ssl_certificate     /etc/letsencrypt/live/devflow.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/devflow.example.com/privkey.pem;

  location / {
    proxy_pass         http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header   Host             $host;
    proxy_set_header   X-Real-IP        $remote_addr;
    proxy_set_header   X-Forwarded-For  $proxy_add_x_forwarded_for;
    proxy_set_header   X-Forwarded-Proto https;
  }
}
```

---

## 🔒 安全模型

DevFlow Forge 设计为 **单用户、自托管** 工具。如果你打算给团队用，先读 [SECURITY.md](./SECURITY.md)。

### 信任边界

| 边界 | 谁可信 | 保护措施 |
| --- | --- | --- |
| 浏览器 ↔ 服务端 | 用户 = 自己 | JWT session、CSRF state、SameSite cookie |
| 服务端 ↔ GitHub | 用户 access token | AES-256-GCM 静态加密 |
| 服务端 ↔ AI API | OPENAI_API_KEY | AES-256-GCM 静态加密（设置文件） |
| 服务端 ↔ CLI 子进程 | 等同于运行 DevFlow 的 OS 用户 | 工作区物化 + 路径穿越检查 |
| 服务端 ↔ Docker daemon | 完全信任 | （由你的 Docker socket ACL 控制） |

### 已知的"故意危险"

- **Custom CLI bridge 可以执行宿主机任意二进制**——这就是它的本意，但不要部署到多租户环境。
- **DevOps agent 操作 Docker daemon**——和上面同理。
- **Workflow 中的 Condition 节点会 eval JavaScript 表达式**——只在你信任的 prompt 上跑。

### 加固建议（生产环境）

1. 设置 `SESSION_SECRET`、`TOKEN_ENCRYPTION_KEY`、`SETTINGS_ENCRYPTION_KEY` 三把独立密钥
2. 把 DevFlow 跑在专用 OS 用户下，限制其 sudo 权限
3. 反向代理后挂 IP allow list（甚至 mTLS）
4. 定期 `pnpm audit` 检查依赖 CVE
5. 关闭 `AI_CLI_PROVIDER=custom` 如果不需要

---

## 🧪 开发与调试

### 常用命令

```bash
pnpm dev                  # 启动 dev server（热重载）
pnpm build                # 生产构建
pnpm start                # 启动生产 server
pnpm typecheck            # 全 monorepo TypeScript 检查
pnpm lint                 # ESLint
pnpm db:generate          # 重新生成 Prisma client
pnpm db:push              # 同步 schema 到 SQLite
pnpm db:seed              # 重新跑 seed
pnpm db:reset             # 删库重建（小心）
pnpm clean                # 删除所有 node_modules / .next / dist
```

### 关键调试入口

| 想看什么 | 看这里 |
| --- | --- |
| 任务执行流 | `apps/web/lib/ai/agents/orchestrator.ts` |
| Agent 系统 prompt | `apps/web/lib/ai/agents/<agent>-agent.ts` 的 `buildSystemPrompt()` |
| CLI 命令拼装 | `apps/web/lib/ai/cli/providers.ts` |
| 数据库表结构 | `packages/db/prisma/schema.prisma` |
| tRPC 路由表 | `apps/web/lib/trpc/routers/` |
| SSE 流式输出 | `apps/web/app/api/tasks/[id]/stream/route.ts` |
| 设计 token | `apps/web/app/globals.css` 顶部 CSS 变量 |

### 添加一个新的智能体

1. 复制 `apps/web/lib/ai/agents/coder-agent.ts` → `your-agent.ts`
2. 修改 `buildSystemPrompt()` 写你的角色定义
3. 在 `apps/web/lib/ai/agents/orchestrator.ts` 的 `AGENTS` 注册：
   ```ts
   const AGENTS: Record<BuiltInAgentName, BaseAgent> = {
     architect: architectAgent,
     coder: coderAgent,
     qa: qaAgent,
     devops: devopsAgent,
     yourAgent: yourAgent,  // 新增
   }
   ```
4. 在 `packages/shared/src/types/agent.ts` 把 `"yourAgent"` 加到 `BuiltInAgentName` 联合类型
5. `pnpm typecheck`

### 添加一个新的 CLI provider

1. 在 `apps/web/lib/ai/cli/providers.ts` 的 `CLI_PROVIDERS` 数组追加：
   ```ts
   {
     id: "my-cli",
     label: "My Custom CLI",
     command: "my-cli",
     installHint: "npm i -g my-cli",
     enforcesReadOnly: true,
     enforcesWriteMode: true,
     buildArgs: (promptRef, { mode, model }) => [
       "exec",
       mode === "workspace-write" ? "--write" : "--readonly",
       ...(model ? ["--model", model] : []),
       "--prompt-file", promptRef.path,
     ],
   }
   ```
2. 把 id 加到 settings UI 的 dropdown 选项里（`apps/web/app/dashboard/settings/page.tsx`）
3. 完事。

---

## ❓ 常见问题

### Q1: Demo 模式下生成的代码不是真实的？

对，Demo 模式只返回预录制的内容，所有动画都能跑但不会真正调 AI。这是为了让贡献者无密钥也能开发 UI。要跑真实任务，去 Settings 切到 API 或 CLI 模式。

### Q2: CLI 模式跑不起来，怎么排查？

按顺序检查：

1. CLI 二进制在 PATH 里吗？终端跑一次 `claude --version` / `opencode --version`。
2. 在 DevFlow Settings 里点 "Test CLI" 按钮，会调 `/api/settings/cli/check` 实测 spawn。
3. `AI_CLI_WORKDIR` 留空，让 DevFlow 自动用每任务工作区。
4. 看任务页右下角的 CLI command log，把命令拷贝到终端手动跑一次。

### Q3: `SESSION_SECRET` 改了，已登录用户会怎样？

JWT 立即作废，所有用户被踢回登录页。**已存储的 GitHub access token 也会变成无法解密的乱码**，除非提前设了独立的 `TOKEN_ENCRYPTION_KEY`。

### Q4: 数据库放在哪？怎么备份？

默认 `apps/web/devflow.db`（SQLite 文件）。Docker 部署放在 `devflow-db` 命名卷里。备份就直接拷文件：

```bash
cp apps/web/devflow.db apps/web/devflow.db.bak
```

### Q5: 想改用 Postgres？

1. 装 Postgres，建库 `devflow`
2. 改 `packages/db/prisma/schema.prisma`：
   ```prisma
   datasource db {
     provider = "postgresql"
     url      = env("DATABASE_URL")
   }
   ```
3. 改 `.env.local`：
   ```env
   DATABASE_URL="postgresql://user:pass@localhost:5432/devflow"
   ```
4. `pnpm db:push` 重建 schema

### Q6: GitHub OAuth 一直跳 "redirect_uri mismatch"？

OAuth App 的 callback URL 必须**完全匹配** `${NEXTAUTH_URL}/api/auth/github/callback`。包括端口号和协议。

### Q7: Docker 部署后 DevOps agent 报 "docker: not found"？

容器里默认带了 docker-cli，并挂载了宿主 socket。如果还是报错：

```bash
docker compose exec devflow which docker
docker compose exec devflow docker ps
```

如果第二个命令失败，说明 socket 挂载有问题，确认 `/var/run/docker.sock` 在宿主存在。

### Q8: 工作流跑到一半挂掉，重试是从头开始还是接着跑？

当前是**从头开始**。每个 Task 是独立的执行单元。如果你需要中断恢复，可以把工作流拆成多个 task，前一个的 output 作为下一个的 input。

### Q9: Token 用量在哪看？

侧边栏 "Settings" → "Usage" 标签。也能在每个 Task 页底部看到本次任务的 token 消耗。

### Q10: 我能让 DevFlow 自动 push 到我的 fork 吗？

可以。Coder agent 输出的 patch 会被 orchestrator 收集，最后 DevOps agent 调 GitHub API 创建 PR。需要 OAuth scope 包含 `repo`。

---

## 🤝 参与贡献

欢迎 PR！请先读 [CONTRIBUTING.md](./CONTRIBUTING.md)，里面写了：

- 提交 PR 前的 checklist（`pnpm typecheck`、ESLint 必须过）
- 哪些 PR 会接收（bug 修复、新 CLI provider、UI 优化、文档）
- 哪些 PR 会拒绝（增加新外部依赖、引入 backend-only 状态、未通过 typecheck 的代码）

### 报 bug

在 [Issues](../../issues) 里用 "Bug Report" 模板。请提供：

- DevFlow 版本（`package.json` 里的 version）
- Node / pnpm 版本
- AI 运行模式（Demo / API / CLI）
- 复现步骤
- 服务端日志（去掉 secret）

### 新功能建议

用 "Feature Request" 模板。优先考虑：

- 新 AI CLI provider 适配
- 新工作流节点类型
- 多模态文档增强
- 性能优化

---

## 📄 许可证

[MIT License](./LICENSE) · © 2026 DevFlow Forge contributors

> 这意味着：你可以把它用在商业项目里、修改它、卖它、闭源 fork 它，**只要保留版权声明**。我们不为任何使用造成的损失负责。

---

<div align="center">

### 如果这个项目对你有帮助，欢迎 ⭐ Star

**[报告 Bug](../../issues/new?template=bug_report.yml)** ·
**[提交建议](../../issues/new?template=feature_request.yml)** ·
**[加入讨论](../../discussions)**

Made with 🧊 liquid glass aesthetic and 🤖 way too many AI agents.

</div>
