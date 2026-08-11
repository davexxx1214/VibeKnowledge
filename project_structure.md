# VibeKnowledge - VS Code 知识图谱插件

> 将代码库转化为智能知识网络，让 AI 编程更高效

---

## 📁 项目结构

```
VibeKnowledge/
│
├── 📄 package.json                  # 插件清单和依赖配置
├── 📄 package-lock.json             # 依赖锁定文件
├── 📄 tsconfig.json                 # TypeScript 编译配置
├── 📄 esbuild.js                    # 构建脚本（esbuild 打包）
├── 📄 .eslintrc.json                # ESLint 代码规范
├── 📄 .gitignore                    # Git 忽略配置
├── 📄 .vscodeignore                 # VSIX 打包忽略配置
│
├── 📂 .vscode/                      # VS Code 配置
│   ├── 📄 launch.json               # 调试配置
│   └── 📄 tasks.json                # 任务配置
│
├── 📂 resources/                    # 资源文件
│   └── 📄 icon.svg                  # 插件图标
│
├── 📂 src/                          # ⭐ 源代码目录
│   │
│   ├── 📄 extension.ts              # 🚀 插件入口文件
│   │
│   ├── 📂 services/                 # 🔧 核心服务层
│   │   ├── 📄 database.ts           # SQLite 数据库服务
│   │   ├── 📄 entityService.ts      # 实体管理服务
│   │   ├── 📄 relationService.ts    # 关系管理服务
│   │   ├── 📄 observationService.ts # 观察记录服务
│   │   ├── 📄 dependencyAnalyzer.ts # 依赖分析服务
│   │   ├── 📄 exportService.ts      # 图谱导出服务
│   │   ├── 📄 aiIntegrationService.ts # AI 集成服务
│   │   ├── 📄 geminiClient.ts       # Gemini API 客户端
│   │   ├── 📄 ragService.ts         # RAG 知识库服务
│   │   ├── 📄 scenarioManager.ts    # 场景管理器
│   │   └── 📂 rag/                  # RAG 具体实现
│   │       ├── 📄 cloudRagProvider.ts # 云端 RAG 提供者
│   │       ├── 📄 localRagProvider.ts # 本地 RAG 提供者
│   │       ├── 📄 ragProvider.ts    # RAG 接口定义
│   │       └── 📄 types.ts          # RAG 类型定义
│   │
│   ├── 📂 providers/                # 🎨 VS Code Providers
│   │   ├── 📄 hoverProvider.ts      # 悬浮提示提供者
│   │   ├── 📄 codeLensProvider.ts   # CodeLens 提供者
│   │   ├── 📄 treeDataProvider.ts   # 树视图提供者
│   │   └── 📄 ragTreeDataProvider.ts # RAG 树视图提供者
│   │
│   ├── 📂 commands/                 # 通用命令
│   │   └── 📄 scenarioCommands.ts   # 场景相关命令
│   │
│   ├── 📂 ui/                       # 🖥️ 用户界面层
│   │   ├── 📂 commands/             # UI 相关命令处理器
│   │   │   ├── 📄 entityCommands.ts # 实体相关命令
│   │   │   └── 📄 ragCommands.ts    # RAG 相关命令
│   │   │
│   │   └── 📂 webview/              # Webview 组件
│   │       ├── 📄 graphVisualization.ts # 图谱可视化（vis-network）
│   │       └── 📂 components/       # Webview 组件
│   │
│   ├── 📂 i18n/                     # 🌐 国际化
│   │   ├── 📄 i18nService.ts        # 国际化服务
│   │   ├── 📄 zh.ts                 # 中文语言包
│   │   ├── 📄 en.ts                 # 英文语言包
│   │   ├── 📄 index.ts              # 国际化入口
│   │   └── 📄 types.ts              # 国际化类型
│   │
│   └── 📂 utils/                    # 🛠️ 工具函数
│       ├── 📄 types.ts              # TypeScript 类型定义
│       └── 📄 codeParser.ts         # 代码解析工具
│
├── 📂 dist/                         # 📦 编译输出目录
│   ├── 📄 extension.js              # 打包后的插件代码
│   └── 📄 extension.js.map          # Source Map
│
├── 📂 node_modules/                 # 📚 依赖包（自动生成）
│
├── 📂 packages/                     # ✅ 子包
│   └── 📂 mcp-server/               # 🔌 MCP Server（独立工具）
│       ├── 📄 package.json          # MCP Server 包配置
│       ├── 📄 tsconfig.json         # TypeScript 配置
│       ├── 📂 src/
│       │   ├── 📄 index.ts          # 命令行入口
│       │   ├── 📄 server.ts         # MCP 服务器初始化
│       │   ├── 📄 config.ts         # 配置解析
│       │   ├── 📄 database.ts       # 读取 graph.sqlite
│       │   ├── 📂 resources/        # Resource 注册（knowledge://overview）
│       │   ├── 📂 tools/            # Tool 注册（search_entities 等）
│       │   ├── 📂 prompts/          # Prompt 注册（get_observations）
│       │   └── 📂 rag/              # RAG Engine（cloud/local）
│
└── 📄 文档文件
    ├── 📄 README.md                 # 📖 项目说明（英文）
    ├── 📄 README_ZH.md              # 📖 项目说明（中文）
    ├── 📄 README_en.md              # 旧英文文档兼容跳转
    ├── 📄 Demo.md                   # 🎬 演示指南（中文）
    ├── 📄 Demo_en.md                # 🎬 演示指南（英文）
    ├── 📄 project_structure.md      # 📁 中文项目结构（本文件）
    └── 📄 project_structure_en.md   # 📁 英文项目结构

图例：
  ✅ 已实现
  🔜 计划中
```

---

## 📊 统计信息

| 项目 | 数量 |
|------|------|
| **总文件数** | 35+ |
| **源代码文件** | 23 个 TypeScript 文件 |
| **配置文件** | 7 个 |
| **文档文件** | 3 个 |
| **代码行数** | 约 5000+ 行 |
| **Linter 错误** | 0 |

---

## 🗂️ 数据存储位置

### 运行时创建的数据目录

```
<工作区>/.vscode/.knowledge/
└── graph.sqlite              # SQLite 数据库（包含知识图谱和 RAG 索引）

<工作区>/Knowledge/           # RAG 文档知识库
├── *.md                      # Markdown 文档
├── *.pdf                     # PDF 文档
├── *.txt                     # 文本文档
└── ...                       # 支持 100+ 种格式
```

---

## 🎯 核心文件说明

### 入口文件
- **`extension.ts`** - ⭐ 插件激活入口，注册所有命令和提供者

### 核心服务层
- **`database.ts`** - SQLite 数据库服务（sql.js）
- **`entityService.ts`** - 实体 CRUD、查询、过滤
- **`relationService.ts`** - 关系 CRUD、图遍历
- **`observationService.ts`** - 观察记录 CRUD、全文搜索
- **`dependencyAnalyzer.ts`** - 依赖链分析、循环依赖检测
- **`exportService.ts`** - Markdown/JSON 导出服务
- **`aiIntegrationService.ts`** - AI 工具集成（Cursor、Copilot）、技术栈检测
- **`geminiClient.ts`** - Google Gemini API 客户端
- **`ragService.ts`** - RAG 知识库服务（File Search Store）

### UI 提供者层
- **`hoverProvider.ts`** - 悬浮提示（实体信息、观察记录、关系）
- **`codeLensProvider.ts`** - 代码透镜（实体统计、快速操作）
- **`treeDataProvider.ts`** - 侧边栏树视图（实体、关系、文档）

### 命令处理层
- **`entityCommands.ts`** - 实体、关系、观察记录相关命令
- **`exportCommands.ts`** - 图谱导出、AI 配置生成
- **`ragCommands.ts`** - RAG 问答、索引管理

### 可视化层
- **`graphVisualization.ts`** - 交互式图谱可视化（vis-network）

### 国际化层
- **`i18nService.ts`** - 国际化服务（中英文切换）
- **`zh.ts` / `en.ts`** - 中英文语言包

### 工具层
- **`types.ts`** - TypeScript 类型定义

---

## 🚀 构建产物

编译后生成：
- **`dist/extension.js`** - 打包后的插件代码（esbuild 打包，所有模块合并）
- **`dist/extension.js.map`** - Source Map（用于调试）

**打包体积**：约 2MB（包含 vis-network 和依赖）

---

## ✨ 核心功能模块

### 1️⃣ 知识图谱管理
- ✅ 实体、关系、观察记录的完整 CRUD
- ✅ SQLite 本地持久化存储
- ✅ 交互式可视化图谱（vis-network）
- ✅ 完整的 VS Code UI 集成

### 2️⃣ AI 协同功能
- ✅ Cursor 和 GitHub Copilot 深度集成
- ✅ 知识图谱导出（Markdown / JSON）
- ✅ 依赖链分析和循环依赖检测
- ✅ 技术栈自动检测（JS/TS、Java、Python）
- ✅ 快速上下文导出

### 3️⃣ 持久知识库（RAG）
- ✅ Google Gemini File Search 云端托管
- ✅ 自动索引文档到云端（增量）
- ✅ 智能问答（Ask Question）
- ✅ 多格式支持（100+ 种格式）
- ✅ 项目完全隔离

### 4️⃣ 国际化支持
- ✅ 完整的中英文双语支持
- ✅ 动态切换语言，无需重启
- ✅ 所有界面、命令、提示全面国际化

### 5️⃣ MCP Server（已完成）🆕
- ✅ 独立 MCP Server 包（`@vibeknowledge/mcp-server`）
- ✅ Resource：`knowledge://overview`（实体/关系/观察记录统计）
- ✅ Tools：
  - `search_entities`（实体模糊搜索）
  - `search_observations`（观察记录查询）
  - `knowledge://relations`（关系列表）
  - `ask_question`（RAG 问答）
- ✅ Prompt：`get_observations`（引导 AI 调用观察记录工具）
- ✅ 深度支持 Cursor 和 GitHub Copilot（MCP 协议）

---

## 🛠️ 技术栈

| 技术 | 说明 |
|------|------|
| **VS Code Extension API** | 插件框架 |
| **TypeScript (Strict)** | 开发语言 |
| **sql.js (SQLite)** | 本地数据库 |
| **vis-network** | 图谱可视化 |
| **@google/genai** | Gemini API |
| **esbuild** | 快速构建 |

---

## 📝 注意事项

1. `node_modules/` 和 `dist/` 不提交到版本控制
2. `.vscode/.knowledge/` 是用户数据，建议 `.gitignore`
3. `Knowledge/` 文档库可选择性提交（团队共享知识）
4. 源代码采用 TypeScript 严格模式
5. 所有代码通过 ESLint 检查（0 错误）

---

## 📦 依赖包

### 生产依赖
- **`@google/genai`** - Gemini API SDK
- **`sql.js`** - SQLite WebAssembly
- **`vis-network`** - 图谱可视化

### 开发依赖
- **`typescript`** - TypeScript 编译器
- **`esbuild`** - 打包工具
- **`eslint`** - 代码检查
- **`@types/*`** - 类型定义

---

## 📅 项目信息

- **版本**：0.1.0
- **状态**：✅ 所有核心功能已完成，生产可用

