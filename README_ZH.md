# VibeKnowledge

[English](./README.md) | 简体中文

VibeKnowledge 是一个 VS Code 插件，用来维护与代码一起演进、由 Agent 生成的项目知识图谱。Agent Skill 负责生成带证据的框架、模块和功能图谱，人工只需补充或修改实体描述。

VibeKnowledge 以源码形式提供。你可以 Fork 本仓库进行定制、本地运行，或自行打包 VSIX 使用。

## 演示

https://github.com/user-attachments/assets/33b3774a-a142-4cbb-93cc-6768732e0723

| 知识图谱 | AI 场景选择 |
| --- | --- |
| ![知识图谱](presentation/snap4.png) | ![AI 场景选择](presentation/snap2.png) |

## 主要功能

| 模块 | 当前能力 |
| --- | --- |
| 知识图谱 | Agent 负责实体与关系结构，人工只编辑描述。 |
| 分组生成 | 先生成聚焦系统边界的框架图，再按需增量添加平行的模块或功能图谱。 |
| 图谱可视化 | 从左侧竖向列表切换分组，只渲染当前选中的 D3/SVG 图谱，并可跳回源码。 |
| AI 上下文 | 保留完整人工审计报告，让 Coding Agent 按需加载紧凑的分组视图。 |
| RAG | 通过 Gemini File Search 或 OpenAI 兼容接口索引文档，在 VS Code 侧边栏中提问。 |
| MCP Server | 让 Cursor、GitHub Copilot 或其他 MCP 客户端查询同一份统一知识图谱。 |
| 图谱音乐 | 根据图谱结构生成 Strudel 乐谱，并在内嵌播放器中打开。这个功能仍在实验阶段。 |

项目数据保存在：

```text
<workspace>/.vscode/.knowledge/graph.sqlite
<workspace>/.vscode/.knowledge/agent-graph.json
<workspace>/.vscode/.knowledge/knowledge-graph.md
<workspace>/.vscode/.knowledge/agent-context/index.md
<workspace>/.vscode/.knowledge/agent-context/<group-key>.md
```

`agent-graph.json` 是包含独立分组的 v2 结构源，`knowledge-graph.md` 是完整的人工审计报告，`agent-context/` 则提供仅包含实体、路径和关系的紧凑视图，供 Agent 按需导航。`graph.sqlite` 保存人工描述覆盖与 RAG 数据，不再作为第二份结构图谱。人工描述始终优先，因此 Agent 再次生成时不会覆盖已经编辑的描述。

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

在 VS Code 中按 `F5`，选择 **Run Extension**。Extension Development Host 启动后打开目标项目，在命令面板中运行 **Knowledge: Install Dependency Graph Agent Skill**。

开发时可以持续构建：

```bash
npm run watch
```

## 常用工作流

### 生成并维护知识图谱

1. 运行 **Knowledge: Install Dependency Graph Agent Skill**。扩展会把 Skill 安装到项目的 `.agents/skills/vibeknowledge-dependency-graph/`。
2. 第一次让支持 Agent Skills 的编码 Agent “生成项目知识图谱”，或显式调用 `$vibeknowledge-dependency-graph`。没有指定范围时，Skill 会先生成聚焦系统边界的 `framework` 框架图。
3. 后续点名某个模块或功能。Agent 会自动生成名称，新增或刷新这个平行分组，并完整保留其他分组。同一个稳定实体 key 可以正常出现在多个分组中。
4. Agent 校验 `.vscode/.knowledge/agent-graph.json` 后，会重新生成完整的 `.vscode/.knowledge/knowledge-graph.md` 审计报告，以及 `.vscode/.knowledge/agent-context/` 下的紧凑分组视图。
5. 运行 **Knowledge: Visualize Graph**，从左侧选择分组；界面只模拟和渲染当前分组。

Agent 每次只替换目标分组的生成内容，并且绝不修改 `graph.sqlite`。稳定实体 `key` 会让人工描述在每次生成后重新关联到该实体的所有分组实例。旧版 v1 清单仍可读取，并会被视为一个框架层分组。格式见 [分组 schema](./resources/skills/vibeknowledge-dependency-graph/references/graph-schema.md)。

具有源码位置的实体会在对应代码上方显示当前描述，例如 `🧠 KG: 负责用户认证……`。点击提示即可人工编辑；Agent 后续运行 Skill 时也可以更新生成描述。一旦人工编辑，这份覆盖会在所有分组中优先，直到执行 **Knowledge: Restore Agent Description**。

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

目标工作区应已有生成清单；若要使用人工描述覆盖或 RAG，还需要 VibeKnowledge 数据库。先在该工作区运行扩展并安装 Skill，再启动 Server。运行 `node dist/index.js --help` 可以查看数据库路径和 RAG 参数，Cursor 与 GitHub Copilot 的配置示例见 [MCP 使用指南](./MCP_USAGE.md)。

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
  services/              统一知识图谱、Agent 生成层、RAG 和导出服务
  ui/                    命令处理与 Webview
packages/mcp-server/     独立 MCP Server
resources/scenarios/     内置 AI 任务模板
resources/skills/        可安装的项目级 Agent Skills
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
