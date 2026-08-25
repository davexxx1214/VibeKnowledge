# VibeKnowledge

[English](./README.md) | [简体中文](./README_ZH.md)

VibeKnowledge is a VS Code extension for maintaining an Agent-generated project knowledge graph alongside the code it describes. An Agent Skill creates evidence-backed framework, module, and feature graphs; maintainers can refine entity descriptions without manually rebuilding graph structure.

VibeKnowledge is distributed as source code. Fork the repository to customize it, run it locally, or package your own VSIX.

## Demo

https://github.com/user-attachments/assets/33b3774a-a142-4cbb-93cc-6768732e0723

| Knowledge Graph | AI scenario selection |
| --- | --- |
| ![Knowledge graph](presentation/snap4.png) | ![AI scenario selection](presentation/snap2.png) |

## What it does

| Area | Current capabilities |
| --- | --- |
| Knowledge Graph | Let the Agent own entity and relation structure while maintainers edit descriptions. |
| Grouped generation | Generate a boundary-focused framework graph first, then add parallel module or feature groups incrementally. |
| Visualization | Switch groups from a vertical list and render only the selected D3/SVG graph, then jump back to source locations. |
| AI context | Keep the full audit report for humans and route Coding Agents to compact, on-demand group views. |
| RAG | Index documents with Gemini File Search or a configurable OpenAI-compatible endpoint, then ask questions from the VS Code sidebar. |
| MCP server | Query the same unified Knowledge Graph from Cursor, GitHub Copilot, or another MCP client. |
| Graph sonification | Generate a Strudel pattern from graph structure and open it in an embedded Strudel player. This feature is experimental. |

VibeKnowledge stores its project data in:

```text
<workspace>/.vscode/.knowledge/graph.sqlite
<workspace>/.vscode/.knowledge/agent-graph.json
<workspace>/.vscode/.knowledge/knowledge-graph.md
<workspace>/.vscode/.knowledge/agent-context/index.md
<workspace>/.vscode/.knowledge/agent-context/<group-key>.md
```

`agent-graph.json` is the version-2 generated source containing independent groups. `knowledge-graph.md` is the complete human audit report, while `agent-context/` contains compact entity/path/relation views for on-demand Agent navigation. `graph.sqlite` stores human description overrides and RAG data; it is not a second structural graph. Human descriptions always win, so rerunning the Agent cannot overwrite edited prose.

## Run from source

### Requirements

- Node.js 20 is recommended for development.
- VS Code 1.80 or newer.

### Setup

```bash
git clone https://github.com/davexxx1214/VibeKnowledge.git
cd VibeKnowledge
npm ci
npm run compile
code .
```

Press `F5` in VS Code and select **Run Extension**. In the Extension Development Host, open a target project and run **Knowledge: Install Dependency Graph Agent Skill** from the Command Palette.

You can also build continuously while editing:

```bash
npm run watch
```

## Main workflows

### Generate and refine the Knowledge Graph

1. Run **Knowledge: Install Dependency Graph Agent Skill**. The extension installs the skill under `.agents/skills/vibeknowledge-dependency-graph/` in the project.
2. First ask an Agent Skills-compatible coding agent to generate the project Knowledge Graph, or invoke `$vibeknowledge-dependency-graph` explicitly. With no narrower request, the Skill creates the boundary-focused `framework` graph.
3. Ask for a specific module or feature later. The Agent automatically names it, appends or refreshes that parallel group, and preserves every unrelated group. The same stable entity key may intentionally occur in several groups.
4. The Agent validates `.vscode/.knowledge/agent-graph.json`, then regenerates the complete `.vscode/.knowledge/knowledge-graph.md` audit report and compact views under `.vscode/.knowledge/agent-context/`.
5. Run **Knowledge: Visualize Graph**. Select a group on the left; only that group is simulated and rendered.

The Agent replaces only the requested group's generated contents and never edits `graph.sqlite`. Stable entity keys reconnect human descriptions to every occurrence after each run. Legacy version-1 manifests remain readable and are treated as one framework group. See the [grouped schema](./resources/skills/vibeknowledge-dependency-graph/references/graph-schema.md).

File-backed entities display their current description in a `🧠 KG` CodeLens above the source location. Click the hint to edit it manually. The Agent can update generated prose on later Skill runs; once a human edits it, that override wins in every group until **Knowledge: Restore Agent Description** is used.

### Use RAG

Create a `Knowledge/` directory at the project root and place the documents you want to index inside it. Then select a RAG mode in VS Code settings:

| Setting | Default | Purpose |
| --- | --- | --- |
| `knowledgeGraph.rag.mode` | `cloud` | Selects Gemini File Search or a configured OpenAI-compatible endpoint. |
| `knowledgeGraph.gemini.apiKey` | empty | Enables cloud RAG with Gemini. |
| `knowledgeGraph.rag.local.apiBase` | `http://localhost:8000/v1` | Sets the endpoint for local-mode embeddings and inference. |
| `knowledgeGraph.rag.local.embeddingModel` | `text-embedding-3-small` | Selects the embedding model exposed by the configured endpoint. |
| `knowledgeGraph.rag.local.inferenceModel` | `gpt-4.1` | Selects the inference model exposed by the configured endpoint. |

Cloud mode uploads indexed documents to Gemini File Search. Local mode stores chunks and vectors in the workspace database, but it still sends embedding and inference requests to the endpoint you configure. Review that endpoint's data policy before indexing private material, and do not commit API keys.

### Connect the MCP server

The MCP package lives in [`packages/mcp-server`](./packages/mcp-server). To build and run it from this checkout:

```bash
cd packages/mcp-server
npm ci
npm run build
node dist/index.js --workspace /path/to/your/project
```

The target workspace should contain the generated manifest and a VibeKnowledge database for description overrides or RAG. Run the VS Code extension and install the Skill in that workspace first. Use `node dist/index.js --help` for the available database and RAG options. The [MCP guide](./MCP_USAGE.md) contains Cursor and GitHub Copilot configuration examples in Chinese.

## Development

### Commands

| Command | Purpose |
| --- | --- |
| `npm run compile` | Bundle the extension into `dist/extension.js`. |
| `npm run watch` | Rebuild when source files change. |
| `npm run lint` | Run ESLint against the TypeScript source. |
| `npm run check` | Compile, lint, and run the root test suite. |
| `npm run package` | Build a VSIX with `@vscode/vsce`. |
| `npm test` | Run the root Vitest suite. |
| `npm run test:coverage` | Run tests with V8 coverage. |

The MCP server has its own dependencies and scripts:

```bash
cd packages/mcp-server
npm ci
npm run build
npm test
```

### Repository layout

```text
src/
  commands/              AI scenario commands
  i18n/                  English and Chinese UI strings
  providers/             VS Code tree, hover, and CodeLens providers
  services/              Unified Knowledge Graph, Agent generation, RAG, and export services
  ui/                    Command handlers and webviews
packages/mcp-server/     Standalone MCP server
resources/scenarios/     Built-in AI task templates
resources/skills/        Installable project Agent Skills
presentation/            Demo media
```

## Documentation

- [English demo guide](./Demo_en.md)
- [中文演示指南](./Demo.md)
- [English project structure](./project_structure_en.md)
- [中文项目结构](./project_structure.md)
- [MCP 使用指南](./MCP_USAGE.md)
- [Contributing guide](./CONTRIBUTING.md)
- [Security policy](./SECURITY.md)
- [Changelog](./CHANGELOG.md)

Issues and pull requests are welcome. For a large change, open an issue first so the behavior and storage format can be discussed before implementation.

## License

VibeKnowledge is available under the [MIT License](./LICENSE).
