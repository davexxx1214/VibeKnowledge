# VibeKnowledge MCP 使用指南

本指南记录了当前阶段（示例目录：`D:/workspace/VibeKnowledge`）如何启动 VibeKnowledge MCP Server，并将其接入 Cursor 与 GitHub Copilot。随着功能迭代，文档会持续更新。

---

## 1. 启动 MCP Server

项目默认版本及 CI 使用根目录 `.nvmrc` 中的 Node.js **26.1.0**；MCP 兼容范围为 `>=26.1.0 <27`，本机可保留 26.8.1。`.nvmrc` 不会自动切换系统 Node，需要复现 CI 时请通过版本管理器选择 26.1.0。更换 Node 后重新安装 MCP 原生依赖并重启客户端。

1. 进入仓库根目录：
   ```bash
   cd D:/workspace/VibeKnowledge
   ```
2. 安装独立 MCP 包的依赖并构建（首次使用、换机器或切换 Node.js 后先重新安装）：
   ```bash
   npm --prefix packages/mcp-server ci --no-audit
   npm --prefix packages/mcp-server run build
   ```
   仓库根目录和 MCP 包各自维护 `package-lock.json`，没有声明 npm workspaces。根目录的 `npm ci` 不会安装 MCP 包依赖，请使用 `--prefix` 或先进入 `packages/mcp-server` 再执行命令。

3. （可选）手动启动服务器（一般用于本地调试；若通过 Cursor / Copilot 配置则无需手工保持进程）：
   ```bash
   node packages/mcp-server/dist/index.js --workspace "D:/workspace/nestjs-realworld-example-app"
   ```

   - `--workspace` 指向目标项目根目录，MCP Server 启动前仍需存在 `.vscode/.knowledge/graph.sqlite`；精选局部图查询需要 `.vscode/.knowledge/agent-graph.json`，结构诊断需要 `.vscode/.knowledge/structural-graph.json`。SQLite 不再提供图结构，只提供人工描述覆盖、观察记录和 RAG 数据。
   - 日志全部输出到 `stderr`，`stdout` 专用于 MCP 协议通信。
   - **提示**：Cursor / Copilot 会按 `mcp.json` 自动启动 server，除非需要独立调试，一般无需在此手动运行。
   - `args[0]` 是 **VibeKnowledge 工具仓库**的构建入口，`--workspace` 后面是 **待分析项目**，两者不要混用。换目录后需要同步更新入口路径；不要复用其他工程副本的 `node_modules`。
   - `better-sqlite3` 是原生模块。安装依赖与 MCP 客户端启动时必须使用兼容的 Node.js 版本；必要时将配置中的 `command` 改为安装依赖所用的 Node 可执行文件绝对路径。

### RAG 配置来源（用于 Q&A）

- MCP 会优先读取 `项目/.vscode/settings.json` 中的 `knowledgeGraph.rag.*` 配置，与 VS Code 插件保持一致。
- 也可以通过 CLI 参数或环境变量覆盖：

  | 目的 | CLI 参数 | 环境变量 |
  |------|---------|----------|
  | 模式 | `--rag-mode local` / `none` | `VIBEKNOWLEDGE_RAG_MODE` |
  | API Base | `--rag-api-base http://localhost:11434/v1` | `VIBEKNOWLEDGE_RAG_API_BASE` |
  | API Key | `--rag-api-key sk-xxx` | `VIBEKNOWLEDGE_RAG_API_KEY` |
  | Embedding 模型 | `--rag-embedding-model text-embedding-3-small` | `VIBEKNOWLEDGE_RAG_EMBEDDING` |
  | 推理模型 | `--rag-inference-model gpt-4.1` | `VIBEKNOWLEDGE_RAG_INFERENCE` |
  | Gemini API Key（云端 RAG） | `--gemini-api-key AIza...` | `VIBEKNOWLEDGE_GEMINI_API_KEY` |
  | Gemini 模型 | `--gemini-model gemini-2.5-flash` | `VIBEKNOWLEDGE_GEMINI_MODEL` |

- 目前 `ask_question` 使用 **local RAG**，请确保 `Knowledge/` 目录已在 VS Code 中完成索引，并且本地推理接口可用。
- 当 `knowledgeGraph.rag.mode` 设为 `cloud` 时，会自动切换至 **Gemini File Search**，并使用 `knowledgeGraph.gemini.*` 配置。

示例 `settings.json`：

```jsonc
{
  "knowledgeGraph.gemini.apiKey": "AIxxxxxx",
  "knowledgeGraph.gemini.model": "gemini-2.5-flash",
  "knowledgeGraph.rag.mode": "cloud",
  "knowledgeGraph.rag.local.apiBase": "http://xx.xx.xx.xx:3000/v1",
  "knowledgeGraph.rag.local.apiKey": "sk-xxxxxx",
  "knowledgeGraph.rag.local.embeddingModel": "text-embedding-3-small",
  "knowledgeGraph.rag.local.inferenceModel": "gpt-4.1"
}
```

---

## 2. Cursor 集成步骤

Cursor 的项目配置文件是 `.cursor/mcp.json`，顶层键为 `mcpServers`，与 VS Code 的配置格式不同。参见 [Cursor MCP 文档](https://cursor.com/docs/mcp)。

1. 在待分析项目中打开或创建 `.cursor/mcp.json`。
2. 在 `mcpServers` 中添加条目（已有配置请合并，不要覆盖其他服务器）：

   ```jsonc
   {
     "mcpServers": {
       "vibeknowledge": {
         "type": "stdio",
         "command": "node",
         "args": [
           "D:/workspace/VibeKnowledge/packages/mcp-server/dist/index.js",
           "--workspace",
           "D:/workspace/nestjs-realworld-example-app"
         ]
       }
     }
   }
   ```

3. 在 Cursor 的 MCP 设置中确认服务器已启用，并查看连接日志；根据客户端提示授权使用工具。
4. 可请求 Agent 调用以下资源和工具。下列 `@mcp ...` 是调用意图示例，不是终端命令，具体交互以客户端界面为准：

   - 项目概览：`@mcp vibeknowledge resource knowledge://overview`
   - 查询实体：`@mcp vibeknowledge tool search_entities {"query": "UserService"}`（查询统一知识图谱）
   - 查询局部子图：`@mcp vibeknowledge tool query_graph {"query": "用户认证依赖哪些组件", "depth": 2, "tokenBudget": 2000}`
   - 查询实体邻居：`@mcp vibeknowledge tool get_neighbors {"selector": "UserService", "direction": "both"}`
   - 查询最短路径：`@mcp vibeknowledge tool shortest_path {"source": "UserController", "target": "UserEntity"}`
   - 检测循环依赖：`@mcp vibeknowledge tool analyze_structure {"analysis": "cycles", "tokenBudget": 2000}`
   - 查看高耦合节点：`@mcp vibeknowledge tool analyze_structure {"analysis": "coupling", "limit": 20}`
   - 查看结构变更：`@mcp vibeknowledge tool analyze_structure {"analysis": "diff"}`
   - 分析底层影响：`@mcp vibeknowledge tool analyze_impact {"selector": "UserService", "direction": "both", "maxDepth": 3}`
   - 查找底层跨模块路径：`@mcp vibeknowledge tool find_structural_path {"source": "UserController", "target": "ArticleEntity"}`
   - 查询观察记录：`@mcp vibeknowledge tool search_observations {"limit": 5}`
   - 查询关系：`@mcp vibeknowledge tool list_relations {"verb": "depends_on", "limit": 5}`（返回数据来源与 Agent 证据）
   - RAG 问答：`@mcp vibeknowledge tool ask_question {"question": "项目的数据库连接数是多少？"}`

---

## 3. GitHub Copilot（VS Code）集成

1. 手动创建工作区配置文件
   在你的项目根目录下创建文件夹 .vscode（如果不存在）。
   在 .vscode 文件夹中新建 mcp.json 文件。

2. 在 `.vscode/mcp.json` 的 `servers` 中添加配置（不要使用 Cursor 的 `mcpServers`）：

   ```jsonc
   {
     "servers": {
       "vibeknowledge": {
         "type": "stdio",
         "command": "node",
         "args": [
           "D:/workspace/VibeKnowledge/packages/mcp-server/dist/index.js",
           "--workspace",
           "D:/workspace/nestjs-realworld-example-app"
         ]
       }
     }
   }
   ```

3. 执行 **MCP: List Servers**，选择 `vibeknowledge` 并启动或重启，按提示确认信任。工具更名后可执行 **MCP: Reset Cached Tools** 刷新工具列表。随后在 Copilot Chat 中请求项目概览、实体信息等；优先调用 `query_graph`，再用 `get_entity`、`get_neighbors` 或 `shortest_path` 扩展结果。参见 [VS Code MCP 配置说明](https://code.visualstudio.com/docs/agents/reference/mcp-configuration)。

---

## 4. 常见问题

| 问题 | 说明 |
|------|------|
| `graph.sqlite` 找不到 | 需先在对应项目中运行 VibeKnowledge VS Code 插件以生成 `.vscode/.knowledge/graph.sqlite` |
| 想切换到其他项目 | 停止当前 server，重新以新的 `--workspace` 路径启动 |
| 无法连接 | 检查 `mcp.json` 路径、命令参数及 Node.js 版本（`>=26.1.0 <27`；默认 26.1.0） |
| `No workspaces found` | 根目录没有 npm workspaces 声明；使用 `npm --prefix packages/mcp-server run build` |
| `NODE_MODULE_VERSION` 不一致 / `ERR_DLOPEN_FAILED` | 确认入口指向当前 VibeKnowledge 仓库，使用与客户端相同的 Node.js 执行 `npm --prefix packages/mcp-server ci` 后重新构建，再重启 MCP；不要复制别台机器的 `node_modules` |
| VS Code 找不到已配置的服务器 | `.vscode/mcp.json` 使用 `servers`；Cursor 的 `.cursor/mcp.json` 使用 `mcpServers` |
| 仍显示旧关系查询工具 | 重新构建并重启 MCP、清理客户端工具缓存；关系工具名为 `list_relations` |
| 想查看实时日志 | MCP Server 日志打印在启动终端的 `stderr`，不会污染协议输出 |

如需在多个项目间复用，可为每个项目同时运行一个 MCP 进程，并在 `mcp.json` 中配置不同的名称与工作区路径。

---

## 5. MCP 提供的接口

| 类型 | 名称 | 说明 |
|------|------|------|
| Resource | `knowledge://overview` | 返回知识图谱去重后的实体/关系统计、生成时间，以及框架/模块/功能分组摘要 |
| Tool | `query_graph` | 根据自然语言问题选择最多 3 个种子，并返回受深度和 token budget 限制的局部子图 |
| Tool | `get_entity` | 按 stable key、实体名或内部 ID 获取实体；可限定分组 |
| Tool | `get_neighbors` | 按 incoming/outgoing/both 方向、关系类型和深度查询实体邻居 |
| Tool | `shortest_path` | 查询两个实体之间的最短路径，并保留关系的原始方向 |
| Tool | `analyze_structure` | 对完整结构图执行循环、高耦合、跨边界、diff 或候选社区分析；候选社区不会自动改写精选分组 |
| Tool | `analyze_impact` | 查询一个底层符号的上游依赖方和下游依赖，结果带源码位置 |
| Tool | `find_structural_path` | 在完整结构图中查询跨文件或跨模块最短路径 |
| Tool | `search_entities` | 根据名称、类型、文件路径或描述搜索统一知识图谱中的实体 |
| Tool | `search_observations` | 检索观察记录，可按关键字或实体 ID 过滤 |
| Tool | `list_relations` | 列出统一知识图谱关系，可按动词、源/目标实体筛选；Agent 生成关系附带代码证据 |
| Prompt | `get_observations` | 引导 AI 调用 `search_observations` 工具 |
| Tool | `ask_question` | 自动根据 `rag.mode` 调用本地或云端 RAG，并附带引用文件 |

知识图谱结构来自目标工作区的 `.vscode/.knowledge/agent-graph.json`。可以先在 VS Code 中运行 **Knowledge: Install Dependency Graph Agent Skill**，再由 Agent 或 **Knowledge: Curate Graph from Structure** 先生成框架层、后按模块或功能追加平行分组；Skill 同时生成 `.vscode/.knowledge/knowledge-graph.md` 汇总文档。同一实体可以出现在多个分组中，MCP 搜索结果会标明所属分组，而总览统计会按稳定实体去重。实体匹配会使用 canonical alias 兼容路径分隔符、Unicode NFKC、大小写和冗余标点。关系必须携带 `origin`（`ast | resolver | agent`）和 `confidence`（`extracted | inferred | review_required`）；确定性关系还包含底层 `structuralPath`。仅支持 version-1 分组清单。SQLite 只提供人工描述覆盖和 RAG 数据，不提供实体或关系结构；人工描述在 MCP 查询时始终优先。MCP Server 全程只读，因此不会与扩展的 SQL.js 保存流程争抢数据库写入。

### 局部图查询

`query_graph` 是 Coding Agent 理解工程结构时的首选入口。它不会把完整 `knowledge-graph.md` 返回给 Agent，而是先匹配少量种子实体，再沿关系图向外遍历。

```jsonc
@mcp vibeknowledge tool query_graph {
  "query": "修改用户登录会影响哪些模块？",
  "groupKey": "user-management",
  "depth": 2,
  "tokenBudget": 2000
}
```

- `depth` 默认为 `2`，范围为 `0–5`。
- `tokenBudget` 默认为 `2000`，范围为 `200–12000`；返回内容会按该预算实际截断。
- 默认不返回 Evidence 正文或 `structuralPath`。审计某条关系时显式设置 `"includeEvidence": true`，同时取得源码证据和底层结构路径。
- 可以使用 `relationVerbs` 只遍历指定关系，例如 `["calls", "depends_on"]`。
- 非种子的高连接度节点不会继续扩散，避免共享基础设施把局部结果扩大成整个图。
- 输出中的 `状态: 已截断` 表示应提高预算、缩小查询范围或继续调用邻居/实体工具。

推荐工作流：

1. 用 `query_graph` 获取任务相关的局部结构。
2. 用 `get_entity` 确认 stable key 和源码位置。
3. 用 `get_neighbors` 扩展一个关键节点，或用 `shortest_path` 验证两个节点如何连接。
4. 只有需要审计关系时请求 Evidence，然后打开对应源码验证当前行为。

### 结构诊断

精选图用于任务导航，完整结构图用于诊断。不要把 `structural-graph.json` 整体注入 Agent 上下文；按问题调用下列入口：

- `analyze_structure` 的 `cycles`、`coupling`、`cross_boundary`、`diff` 和 `communities` 分别检查循环、高连接热点、越界依赖、最近结构变化和候选分组。`communities` 只给建议，不会替换人工定义的 framework/module/feature 分组。
- `analyze_impact` 中，`upstream` 表示依赖当前实体的调用方，`downstream` 表示当前实体依赖的实现。
- `find_structural_path` 在精选图没有足够细节时追踪原始代码关系。
- 三个工具都接受 `tokenBudget`，并返回 stable key、关系方向和 `file:line`，方便继续打开源码验证。
- `diff` 读取自动维护的 `structural-graph.previous.json`。只有结构实体或关系确实变化时才更新这份快照，普通无变化刷新不会覆盖它。

### `ask_question` 使用示例

```jsonc
@mcp vibeknowledge tool ask_question {
  "question": "项目的数据库最大连接数是？"
}
```

返回格式：正文为回答内容，末尾列出引用文件（附相似度），方便进一步打开原文档。

