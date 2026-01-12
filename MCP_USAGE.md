# VibeKnowledge MCP 使用指南

本指南记录了当前阶段（默认目录：`D:/workspace/vibecoding`）如何启动 VibeKnowledge MCP Server，并将其接入 Cursor 与 GitHub Copilot。随着功能迭代，文档会持续更新。

---

## 1. 启动 MCP Server

1. 进入仓库根目录：
   ```bash
   cd D:/workspace/vibecoding
   ```
2. 先构建一次（如尚未构建）：
   ```bash
   npm run --workspace packages/mcp-server build
   ```
3. （可选）手动启动服务器（一般用于本地调试；若通过 Cursor / Copilot 配置则无需手工保持进程）：
   ```bash
   node packages/mcp-server/dist/index.js --workspace "D:/workspace/nestjs-realworld-example-app"
   ```
   - `--workspace` 指向目标项目根目录（需已生成 `.vscode/.knowledge/graph.sqlite`）。
   - 日志全部输出到 `stderr`，`stdout` 专用于 MCP 协议通信。
   - **提示**：Cursor / Copilot 会按 `mcp.json` 自动启动 server，除非需要独立调试，一般无需在此手动运行。

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

> 需启用 Cursor MCP（Beta）功能。

1. 在 Cursor 按 `Ctrl + Shift + P`。
2. 输入并选择 **`View: Open MCP Settings`**。
3. 点击 **“New MCP Server”**。
4. 在弹出的 `mcp.json` 中添加条目（若已有则合并）：

   ```jsonc
   {
     "vibeknowledge": {
       "command": "node",
       "args": [
         "D:/workspace/vibecoding/packages/mcp-server/dist/index.js",
         "--workspace",
         "D:/workspace/nestjs-realworld-example-app"
       ]
     }
   }
   ```

5. 保存后，Cursor 会自动以子进程方式启动该 server，并在日志面板提示连接结果。
6. 测试：
   - 项目概览：`@mcp vibeknowledge resource knowledge://overview`
   - 查询实体：`@mcp vibeknowledge tool search_entities {"query": "UserService"}`
   - 查询观察记录：`@mcp vibeknowledge tool search_observations {"limit": 5}`
   - 查询关系：`@mcp vibeknowledge tool knowledge://relations {"verb": "uses", "limit": 5}`
   - RAG 问答：`@mcp vibeknowledge tool ask_question {"question": "项目的数据库连接数是多少？"}`

---

## 3. GitHub Copilot（VS Code）集成

1. 手动创建工作区配置文件
   在你的项目根目录下创建文件夹 .vscode（如果不存在）。
   在 .vscode 文件夹中新建 mcp.json 文件。

2. 在 mcp.json 中添加配置：

   ```jsonc
   {
     "vibeknowledge": {
       "command": "node",
       "args": [
         "D:/workspace/vibecoding/packages/mcp-server/dist/index.js",
         "--workspace",
         "D:/workspace/nestjs-realworld-example-app"
       ]
     }
   }
   ```

3. 重启 VS Code，Copilot 会自动连接该 MCP server。随后即可在 Copilot Chat 中直接请求项目概览、实体信息等。

---

## 4. 常见问题

| 问题 | 说明 |
|------|------|
| `graph.sqlite` 找不到 | 需先在对应项目中运行 VibeKnowledge VS Code 插件以生成 `.vscode/.knowledge/graph.sqlite` |
| 想切换到其他项目 | 停止当前 server，重新以新的 `--workspace` 路径启动 |
| 无法连接 | 检查 `mcp.json` 路径、命令参数及 Node.js 版本（≥ 18） |
| 想查看实时日志 | MCP Server 日志打印在启动终端的 `stderr`，不会污染协议输出 |

如需在多个项目间复用，可为每个项目同时运行一个 MCP 进程，并在 `mcp.json` 中配置不同的名称与工作区路径。

---

## 5. MCP 提供的接口

| 类型 | 名称 | 说明 |
|------|------|------|
| Resource | `knowledge://overview` | 返回实体/关系/观察记录统计及最后更新时间 |
| Tool | `search_entities` | 根据名称、类型、文件路径模糊搜索实体 |
| Tool | `search_observations` | 检索观察记录，可按关键字或实体 ID 过滤 |
| Tool | `knowledge://relations` | 列出实体之间的关系，可按动词、源/目标实体筛选 |
| Prompt | `get_observations` | 引导 AI 调用 `search_observations` 工具 |
| Tool | `ask_question` | 自动根据 `rag.mode` 调用本地或云端 RAG，并附带引用文件 |

### `ask_question` 使用示例

```jsonc
@mcp vibeknowledge tool ask_question {
  "question": "项目的数据库最大连接数是？"
}
```

返回格式：正文为回答内容，末尾列出引用文件（附相似度），方便进一步打开原文档。

