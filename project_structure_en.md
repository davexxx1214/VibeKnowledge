# VibeKnowledge - VS Code Knowledge Graph Extension

> Turn your codebase into an intelligent knowledge network and supercharge AI workflows

---

## 📁 Project Layout

```
vibecoding/
│
├── 📄 package.json                  # Extension manifest & dependencies
├── 📄 package-lock.json             # Dependency lock
├── 📄 tsconfig.json                 # TypeScript compiler config
├── 📄 esbuild.js                    # Build script (esbuild bundling)
├── 📄 .eslintrc.json                # ESLint rules
├── 📄 .gitignore / .vscodeignore    # Git & VSIX ignore lists
│
├── 📂 .vscode/                      # VS Code workspace configs
│   ├── 📄 launch.json               # Debug configuration
│   └── 📄 tasks.json                # Task runner definitions
│
├── 📂 resources/                    # Static assets
│   └── 📄 icon.svg                  # Extension icon
│
├── 📂 src/                          # ⭐ Extension source
│   │
│   ├── 📄 extension.ts              # 🚀 Activation entry
│   │
│   ├── 📂 services/                 # 🔧 Core services
│   │   ├── 📄 database.ts           # SQLite access (sql.js)
│   │   ├── 📄 entityService.ts      # Entity CRUD
│   │   ├── 📄 relationService.ts    # Relation CRUD
│   │   ├── 📄 observationService.ts # Observation CRUD / search
│   │   ├── 📄 dependencyAnalyzer.ts # Dependency graph & cycle detection
│   │   ├── 📄 exportService.ts      # Markdown / JSON export
│   │   ├── 📄 aiIntegrationService.ts # Cursor / Copilot integration
│   │   ├── 📄 geminiClient.ts       # Google Gemini SDK wrapper
│   │   ├── 📄 ragService.ts         # RAG store orchestration
│   │   ├── 📄 scenarioManager.ts    # AI scenario presets
│   │   └── 📂 rag/                  # RAG provider implementations
│   │       ├── 📄 cloudRagProvider.ts
│   │       ├── 📄 localRagProvider.ts
│   │       ├── 📄 ragProvider.ts
│   │       └── 📄 types.ts
│   │
│   ├── 📂 providers/                # 🎨 VS Code providers
│   │   ├── 📄 hoverProvider.ts
│   │   ├── 📄 codeLensProvider.ts
│   │   ├── 📄 treeDataProvider.ts
│   │   └── 📄 ragTreeDataProvider.ts
│   │
│   ├── 📂 commands/                 # Workspace-level commands
│   │   └── 📄 scenarioCommands.ts
│   │
│   ├── 📂 ui/                       # 🖥️ UI-facing commands & webviews
│   │   ├── 📂 commands/
│   │   │   ├── 📄 entityCommands.ts
│   │   │   └── 📄 ragCommands.ts
│   │   └── 📂 webview/
│   │       ├── 📄 graphVisualization.ts
│   │       └── 📂 components/
│   │
│   ├── 📂 i18n/                     # 🌐 Localization
│   │   ├── 📄 i18nService.ts
│   │   ├── 📄 zh.ts / en.ts
│   │   ├── 📄 index.ts
│   │   └── 📄 types.ts
│   │
│   └── 📂 utils/                    # 🛠️ Helpers
│       ├── 📄 types.ts
│       └── 📄 codeParser.ts
│
├── 📂 dist/                         # 📦 Build artifacts
│   ├── 📄 extension.js
│   └── 📄 extension.js.map
│
├── 📂 packages/                     # ✅ Additional packages
│   └── 📂 mcp-server/               # 🔌 Standalone MCP Server
│       ├── 📄 package.json
│       ├── 📄 tsconfig.json
│       ├── 📂 src/
│       │   ├── 📄 index.ts          # CLI entry
│       │   ├── 📄 server.ts         # MCP bootstrap
│       │   ├── 📄 config.ts         # Config loader
│       │   ├── 📄 database.ts       # graph.sqlite reader
│       │   ├── 📂 resources/        # `knowledge://overview`
│       │   ├── 📂 tools/            # search_entities / ask_question ...
│       │   ├── 📂 prompts/          # get_observations prompt
│       │   └── 📂 rag/              # Cloud & local RAG engines
│       └── 📄 README.md
│
└── 📄 Docs
    ├── 📄 README.md / README_EN.md
    ├── 📄 Demo.md / Demo_en.md
    ├── 📄 project_structure.md      # Chinese version
    └── 📄 project_structure_en.md   # This document

Legend:
  ✅ Implemented
  🔌 Cross-editor integrations
```

---

## 📊 Stats Snapshot

| Item | Count |
|------|-------|
| Total files | 35+ |
| TypeScript source files | 23 |
| Config files | 7 |
| Documentation | 6 |
| Lines of code | ~5,000+ |
| ESLint errors | 0 |

---

## 🗂️ Runtime Data Locations

```
<workspace>/.vscode/.knowledge/
└── graph.sqlite          # Knowledge graph + local RAG index

<workspace>/Knowledge/    # RAG document corpus
├── *.md / *.pdf / *.txt  # 100+ supported formats
└── ...
```

---

## 🎯 Key Files

- `extension.ts` — activation entry, registers commands/providers
- `services/database.ts` — sql.js wrapper & persistence
- `services/entityService.ts` — entity CRUD / filters
- `services/relationService.ts` — relation CRUD / traversal
- `services/observationService.ts` — observation CRUD / LIKE search
- `services/aiIntegrationService.ts` — Cursor / Copilot config generation
- `services/ragService.ts` — orchestrates cloud/local RAG flows
- `ui/webview/graphVisualization.ts` — vis-network graph view
- `packages/mcp-server/src/server.ts` — MCP bootstrap & transport

---

## 🚀 Build Outputs

- `dist/extension.js` — bundled VSIX payload (≈2 MB with vis-network)
- `dist/extension.js.map` — source map for debugging

---

## ✨ Feature Modules

1. **Knowledge Graph Management**
   - Entity / relation / observation CRUD
   - Interactive visualization, CodeLens, hover, tree view
2. **AI Collaboration**
   - Cursor & Copilot instructions, tech stack inspector
   - Markdown / JSON export, dependency chain insights
3. **Persistent RAG**
   - Gemini File Search (cloud) + local OpenAI-compatible mode
   - `ask_question` command with citation tracing
4. **Localization**
   - Full zh-CN / en-US coverage with runtime switching
5. **MCP Server (completed)**
   - Resource: `knowledge://overview`
   - Tools: `search_entities`, `search_observations`, `knowledge://relations`, `ask_question`
   - Prompt: `get_observations`
   - Tested with Cursor MCP beta & Copilot MCP

---

## 🛠️ Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Extension API | VS Code Extension API | Official framework |
| Language | TypeScript (strict) | Strong typing |
| Database | sql.js (SQLite) | Zero native deps |
| Visualization | vis-network | Interactive graph |
| RAG | Google Gemini File Search / custom local engine | Dual mode |
| Build | esbuild | Fast bundling |

---

## 📝 Notes

1. Do not commit `node_modules/` or `dist/`
2. User data (`.vscode/.knowledge/` and `Knowledge/`) should stay in `.gitignore`
3. Keep TypeScript strict and run `npm run lint` before commits
4. MCP Server consumes `.vscode/.knowledge/graph.sqlite`; ensure the VS Code extension has generated it

---

## 📦 Dependencies

- **Runtime**: `sql.js`, `vis-network`, `@google/generative-ai`, `@modelcontextprotocol/sdk`
- **Dev**: `typescript`, `esbuild`, `eslint`, `@types/node`

---

## 📅 Project Info

- **Version**: 0.1.0
- **Status**: ✅ Production-ready, all announced goals shipped


