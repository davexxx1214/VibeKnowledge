# VibeKnowledge

[English](./README.md) | 简体中文

VibeKnowledge 是一个 VS Code 插件，用来维护与代码一起演进的项目知识图谱。它把代码实体、关系和维护笔记存进工作区内的 SQLite 数据库，再通过 VS Code、AI 配置文件和可选的 MCP Server 提供给开发者与 AI 工具。

仓库当前版本是 `0.1.0`，已经支持源码开发、自动检查和可重复的 VSIX 打包。首次发布到 Marketplace 前，请创建或确认配置中的 `davexxx1214` publisher 账号。

## 演示

https://github.com/user-attachments/assets/33b3774a-a142-4cbb-93cc-6768732e0723

| 侧边栏与 RAG 文档 | AI 场景选择 |
| --- | --- |
| ![VibeKnowledge 侧边栏，包含手动图谱、自动图谱和 RAG 文档](presentation/snap1.png) | ![AI 场景选择](presentation/snap2.png) |

| 自动图谱 | 手动图谱 |
| --- | --- |
| ![自动生成的依赖图谱](presentation/snap3.png) | ![手动维护的知识图谱](presentation/snap4.png) |

## 主要功能

| 模块 | 当前能力 |
| --- | --- |
| 手动知识图谱 | 从选中的代码创建实体，维护关系，并记录设计决策、重构备注等观察记录。 |
| 自动图谱 | 分析 TypeScript 和 JavaScript 文件，提取类、接口、函数、变量、导入、继承和部分依赖关系。 |
| 图谱可视化 | 在 `vis-network` Webview 中查看手动、自动或合并图谱，并跳回源码位置。 |
| AI 上下文 | 导出 Markdown 或 JSON，生成 Cursor 规则和 GitHub Copilot 指令，并切换内置任务场景。 |
| RAG | 通过 Gemini File Search 或 OpenAI 兼容接口索引文档，在 VS Code 侧边栏中提问。 |
| MCP Server | 让 Cursor、GitHub Copilot 或其他 MCP 客户端读取同一份图谱数据库。 |
| 图谱音乐 | 根据图谱结构生成 Strudel 乐谱，并在内嵌播放器中打开。这个功能仍在实验阶段。 |

项目数据保存在：

```text
<workspace>/.vscode/.knowledge/graph.sqlite
```

自动分析目前支持 `.ts`、`.tsx`、`.js` 和 `.jsx` 文件。它采用静态模式分析，并不等同于完整的 TypeScript 编译器语义模型。自动图谱适合当作起点，重要的设计信息更适合写进手动观察记录。

## 从源码运行

### 环境要求

- 开发环境建议用 Node.js 20。
- VS Code 1.80 或更高版本。

### 安装

```bash
git clone https://github.com/davexxx1214/VibeKnowledge.git
cd VibeKnowledge
npm ci
npm run compile
code .
```

在 VS Code 中按 `F5`，选择 **Run Extension**。Extension Development Host 启动后，打开一个 TypeScript 或 JavaScript 项目，在命令面板中运行 **Knowledge: Analyze Workspace (Auto Graph)**。

开发时可以持续构建：

```bash
npm run watch
```

## 常用工作流

### 维护手动图谱

1. 在编辑器中选中一段代码。
2. 从右键菜单或命令面板运行 **Knowledge: Create Entity from Selection**。
3. 在 VibeKnowledge 侧边栏中添加关系和观察记录。
4. 运行 **Knowledge: Visualize Graph** 查看图谱。

手动观察记录适合保存静态分析拿不到的信息，比如架构决策、已知风险、迁移说明和重构约束。

### 生成自动图谱

命令面板提供以下命令：

- `Knowledge: Analyze Workspace (Auto Graph)`
- `Knowledge: Analyze Current File (Auto Graph)`
- `Knowledge: View Auto Graph Statistics`
- `Knowledge: Clear Auto Graph`

自动分析默认关闭。需要自动处理匹配文件时，可以启用 `knowledgeGraph.autoAnalyze.enabled`，再通过 `include` 和 `exclude` 设置控制扫描范围。

### 使用 RAG

在项目根目录创建 `Knowledge/` 文件夹，把需要索引的文档放进去，然后在 VS Code 设置中选择 RAG 模式：

| 设置 | 默认值 | 用途 |
| --- | --- | --- |
| `knowledgeGraph.rag.mode` | `cloud` | 选择 Gemini File Search 或配置好的 OpenAI 兼容接口。 |
| `knowledgeGraph.gemini.apiKey` | 空 | 启用 Gemini 云端 RAG。 |
| `knowledgeGraph.rag.local.apiBase` | `http://localhost:8000/v1` | 设置本地模式调用的嵌入与推理接口。 |
| `knowledgeGraph.rag.local.embeddingModel` | `text-embedding-3-small` | 选择接口提供的嵌入模型。 |
| `knowledgeGraph.rag.local.inferenceModel` | `gpt-4.1` | 选择接口提供的推理模型。 |

云端模式会把索引文档上传到 Gemini File Search。本地模式把文档分块和向量保存在工作区数据库中，但嵌入和推理请求仍会发送到你配置的接口。索引私有资料前，需要先确认该接口的数据处理方式，也不要把 API Key 提交到仓库。

### 连接 MCP Server

MCP 包位于 [`packages/mcp-server`](./packages/mcp-server)。在当前仓库中构建并运行：

```bash
cd packages/mcp-server
npm ci
npm run build
node dist/index.js --workspace /path/to/your/project
```

目标工作区中需要已有 VibeKnowledge 数据库。先在该工作区运行一次 VS Code 插件，再启动 Server。运行 `node dist/index.js --help` 可以查看数据库路径和 RAG 参数，Cursor 与 GitHub Copilot 的配置示例见 [MCP 使用指南](./MCP_USAGE.md)。

## 开发

### 常用命令

| 命令 | 用途 |
| --- | --- |
| `npm run compile` | 把插件打包到 `dist/extension.js`。 |
| `npm run watch` | 源文件变化后重新构建。 |
| `npm run lint` | 对 TypeScript 源码运行 ESLint。 |
| `npm run check` | 编译、lint 并运行根目录测试。 |
| `npm run package` | 使用 `@vscode/vsce` 构建 VSIX。 |
| `npm test` | 运行根目录的 Vitest 测试。 |
| `npm run test:coverage` | 运行测试并生成 V8 覆盖率。 |

MCP Server 有独立的依赖和脚本：

```bash
cd packages/mcp-server
npm ci
npm run build
npm test
```

### 仓库结构

```text
src/
  commands/              AI 场景命令
  i18n/                  中英文界面文本
  providers/             VS Code 树视图、悬浮提示和 CodeLens
  services/              图谱、RAG、导出和分析服务
  ui/                    命令处理与 Webview
packages/mcp-server/     独立 MCP Server
resources/scenarios/     内置 AI 任务模板
presentation/            演示素材
```

## 其他文档

- [English demo guide](./Demo_en.md)
- [中文演示指南](./Demo.md)
- [English project structure](./project_structure_en.md)
- [中文项目结构](./project_structure.md)
- [MCP 使用指南](./MCP_USAGE.md)
- [贡献指南](./CONTRIBUTING.md)
- [安全策略](./SECURITY.md)
- [变更日志](./CHANGELOG.md)

欢迎提交 issue 和 pull request。改动范围较大时，可以先开 issue 讨论功能行为和数据格式，再开始实现。

## 许可证

VibeKnowledge 使用 [MIT License](./LICENSE)。
