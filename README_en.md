# VibeKnowledge - VS Code Knowledge Graph Extension

> Transform your codebase into an intelligent knowledge network for more efficient AI programming

A VS Code extension based on Knowledge Graph and SQLite that helps developers understand and manage complex relationships in codebases, while providing persistent project context for AI programming.

| Product Preview | Highlights |
| --- | --- |
| ![Cover slide: transform codebase into intelligent network](presentation/blue/1.png) | ![Feature overview: knowledge graph + AI collaboration + RAG](presentation/blue/2.png) |
| ![Command palette integration screenshot](presentation/blue/10.png) | ![MCP service diagram showing deployment/protocol/data sharing](presentation/blue/11.png) |

## 📋 Table of Contents

- [Core Philosophy](#core-philosophy)
- [Current Status](#current-status)
  - [Internationalization Support](#internationalization-support-completed)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [Core Features](#core-features)
- [Technical Architecture](#technical-architecture)
- [Development Guide](#development-guide)
- [Demo Documentation](#demo-documentation)

---

## 🎯 Core Philosophy

VibeKnowledge transforms your VS Code workspace into an **intelligent knowledge graph** through three core concepts:

### 1. Entities
Elements in your codebase with precise code locations:
- Code elements: Function, Class, Interface, Variable
- File system: File, Directory
- Business concepts: API, Service, Component, Database

### 2. Relations
Connections between entities:
- `uses` - Usage relationship
- `calls` - Call relationship
- `extends` - Inheritance relationship
- `implements` - Implementation relationship
- `depends_on` - Dependency relationship

### 3. Observations
Notes and comments about entities - the core value of knowledge graph:
- Performance warnings and optimization suggestions
- Design decision documentation
- Bug records and fix history
- Refactoring todos
- Team collaboration notes

**Core Value**:
- 🧠 **Code Understanding Assistant** - Visualize code relationships, quickly understand complex systems
- 📝 **Project Memory System** - Persistently save design decisions, refactoring notes, performance warnings
- 🤖 **AI Programming Accelerator** - Deep integration with Cursor and GitHub Copilot, providing project context to AI
- 👥 **Team Knowledge Sharing** - Knowledge graph can be tracked by Git for seamless team collaboration

---

## ✅ Current Status

**All core features completed!** 🎉

VibeKnowledge is a fully functional VS Code knowledge graph extension with four core modules:

### 1️⃣ Knowledge Graph Management (Manual)
- ✅ Complete CRUD for entities, relations, and observations
- ✅ SQLite local persistent storage
- ✅ Interactive graph visualization (D3.js)
- ✅ Full VS Code UI integration

### 2️⃣ Auto Graph Generation 🆕
- ✅ **Static Code Analysis**: Regex-based TypeScript/JavaScript parsing, no AI required
- ✅ **Auto Entity Extraction**: Class, Interface, Function, Variable
- ✅ **Auto Relation Detection**: extends, implements, uses, imports
- ✅ **Dependency Injection Detection**: Constructor parameters, @Inject decorator, member variable types
- ✅ **Method Signature Analysis**: Return types, parameter types, generic parameters
- ✅ **Interface Property Analysis**: Property type dependencies within interfaces
- ✅ **Function Body Dependencies**: Detect class instantiation, static method calls inside function bodies
- ✅ **NestJS Decorators**: @Module decorator imports/controllers/providers analysis
- ✅ **TypeORM Relations**: @ManyToOne/@OneToMany decorator entity references
- ✅ **Observation Support**: Auto graph entities support observations, preserved during re-analysis
- ✅ **Dual Graph Architecture**: Manual and auto graphs completely isolated
- ✅ **View Switching**: One-click switch between Manual / Auto / Merged views
- ✅ **Incremental Updates**: Smart entity comparison during re-analysis, preserving observations for unchanged entities

### 3️⃣ AI Collaboration Features
- ✅ Deep integration with Cursor and GitHub Copilot
- ✅ **Graph Source Selection**: Choose Manual/Auto/Merged graph when generating configs 🆕
- ✅ Knowledge graph export (Markdown / JSON)
- ✅ Dependency chain analysis and circular dependency detection
- ✅ Automatic tech stack detection (JS/TS projects)
- ✅ Quick context export

### 4️⃣ Persistent Knowledge Base (RAG)
- ✅ Google Gemini File Search cloud hosting
- ✅ Automatic document indexing to cloud (incremental)
- ✅ Intelligent Q&A (Ask Question)
- ✅ Multi-format support (100+ formats)
- ✅ Complete project isolation

**Codebase**: ~5000+ lines TypeScript

### 🌐 Internationalization Support (Completed) ✨

VibeKnowledge has completed a full multi-language support system:

- ✅ **Language Switching Framework**: Complete i18n service and type system
- ✅ **Chinese & English**: Full support for UI, commands, and prompts in both languages
- ✅ **Dynamic Switching**: Runtime language switching, no restart required
- ✅ **Date Localization**: Date/time automatically formatted based on language (zh-CN / en-US)
- ✅ **Quick Switch**: Language switch button added to view title bars

**Switching Methods**:
1. **Settings**: Settings → Search "Knowledge Graph Language" → Select `zh` or `en`
2. **Command**: Command Palette → "Knowledge: Switch Language" → Select language
3. **Quick Button**: Knowledge Graph/RAG view title bar → Click language icon 🌐

**Internationalized Modules**:
- ✅ All commands and menus (entities, relations, observations, RAG, export, etc.)
- ✅ UI providers (tree view, hover, CodeLens)
- ✅ Export service (Markdown/JSON export content)
- ✅ RAG features (Q&A, indexing, Store management)
- ✅ Extension activation and error messages
- ✅ Progress indicators and success messages

### 🔌 MCP Server (Completed) 🆕

> **Model Context Protocol (MCP)** is an open protocol that enables AI models to securely access external tools and data sources.

We ship a standalone MCP Server so **Cursor** and **GitHub Copilot** can directly consume the knowledge graph and RAG answers. The production version now covers all planned capabilities for this phase.

#### Current Capabilities
- ✅ Standalone deployment via `npx @vibeknowledge/mcp-server --workspace <project>`
- ✅ Reuse project data: reads `.vscode/.knowledge/graph.sqlite` and cloud/local RAG indexes
- ✅ Graph query tools: `search_entities` (entities) & `search_observations` (observations)
- ✅ Relation query tool: `knowledge://relations` (filter by verb / source / target)
- ✅ Overview resource: `knowledge://overview` for instant entity/relation/observation stats
- ✅ Tool: `ask_question` (automatically chooses cloud/local RAG, returns referenced documents)
- ✅ Documentation: see the [MCP Usage Guide](./MCP_USAGE.md) for Cursor / Copilot setup

#### Architecture

```
┌─────────────────────────────────────────────────────────┐
│            AI Client (Cursor / GitHub Copilot)          │
└─────────────────────────┬───────────────────────────────┘
                          │ MCP Protocol (stdio)
                          ▼
┌─────────────────────────────────────────────────────────┐
│                 VibeKnowledge MCP Server                │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │  Resources  │  │    Tools    │  │     Prompts     │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
└─────────┼────────────────┼──────────────────┼───────────┘
          ▼                ▼                  ▼
┌─────────────────────────────────────────────────────────┐
│        graph.sqlite + Knowledge/ docs + RAG index        │
└─────────────────────────────────────────────────────────┘
```

#### Resources (Shipped)

| Resource URI | Description |
|--------------|-------------|
| `knowledge://overview` | Knowledge graph overview (entity, relation, observation stats, last updated time) |

#### Tools (Shipped)

| Tool Name | Description | Parameters |
|-----------|-------------|------------|
| `search_entities` | Fuzzy search entities | `query?: string, type?: string, filePath?: string, limit?: number` |
| `search_observations` | Query observation notes | `query?: string, entityId?: string, limit?: number` |
| `knowledge://relations` | List relations | `verb?: string, source?: string, target?: string, limit?: number` |
| `ask_question` | RAG intelligent Q&A | `question: string` |

#### Usage Example (Today)

After configuring MCP, in Cursor:

```
User: Help me analyze dependencies of UserService

AI: (auto-invokes search_entities + knowledge://relations)
   
   Lists the uses/depends_on graph so you can immediately see the impacted components.
```

> 📘 **Usage Guide**: see [MCP Usage Guide](./MCP_USAGE.md) for Cursor / Copilot configuration details

---

## 🚀 Quick Start

### Installation

```bash
# 1. Clone repository
git clone https://github.com/yourusername/vibecoding.git
cd vibecoding

# 2. Install dependencies
npm install

# 3. Compile
npm run compile

# 4. Press F5 in VS Code to start debugging
```

### Basic Usage

#### Knowledge Graph Features
1. **Create Entity**: Select code → Right-click → "Knowledge: Create Entity from Selection"
2. **Add Observation**: Hover over entity → Click "Add Observation"
3. **View Knowledge Graph**: Click "Knowledge Graph" icon in sidebar
4. **Search**: Command Palette → "Knowledge: Search Graph"

#### RAG Knowledge Base Features 🆕
**Cloud Mode (Gemini)**:
1. **Configure API Key**: Settings → Search "Gemini API Key" → Enter your key
2. **Add Documents**: Create `Knowledge/` folder in project root, add documents
3. **Auto-indexing**: Documents automatically uploaded to Gemini, no manual action required

**Local Mode (OpenAI Compatible)** 🆕:
1. **Switch Mode**: Settings → Search "RAG Mode" → Select `local`
2. **Configure API**: Set `Local: Api Base` (e.g., `http://localhost:11434/v1` or other OpenAI-compatible endpoint)
3. **Configure Models**:
   - `Local: Embedding Model` (e.g., `text-embedding-3-small` or `nomic-embed-text`)
   - `Local: Inference Model` (e.g., `gpt-4.1` or `llama3`)
4. **Rebuild Index**: After switching configuration, run `Knowledge: Rebuild RAG Index`

#### AI Scenario Switching 🆕
The extension includes 8 different AI scenario templates for quick switching based on current work:

| Scenario | When to Use | Content |
|----------|-------------|---------|
| 🔹 **Basic Standards** | Daily development (default) | Code standards, naming conventions, error handling, security |
| 🎨 **Frontend Dev** | Frontend features | UI components, styling, state management, performance |
| ⚙️ **Backend Dev** | Backend features | Database, middleware, service integration, security |
| 🔌 **API Dev** | API focused | Route design, parameter validation, error handling, API docs |
| 🧪 **Testing** | Writing tests | Test cases, TDD, coverage, mocking |
| 🐛 **Debug & Optimize** | Fixing/optimizing | Error diagnosis, performance optimization, code review, refactoring |
| 📚 **Documentation** | Writing docs | API docs, code comments, README |
| 🚀 **DevOps** | Environment/deployment | Environment config, CI/CD, Docker, deployment |

**Usage**:
1. **Quick Switch**: Click scenario icon in status bar, or run `Knowledge: Switch AI Scenario`
2. **View Current**: Run `Knowledge: Show Current AI Scenario`
3. **Auto Apply**: After switching, prompted to regenerate AI config files
4. **Customize**: Add project-specific rules in `.vscode/.knowledge/ai-template.md`
5. **Bilingual**: Built-in Chinese & English templates (8 scenarios × 2 languages = 16 templates)

---

## 📁 Project Structure

```
vibecoding/
├── src/
│   ├── extension.ts                  # ✅ Extension entry point
│   ├── services/                     # ✅ Core service layer
│   │   ├── database.ts               # Database service
│   │   ├── entityService.ts          # Entity management (manual graph)
│   │   ├── relationService.ts        # Relation management (manual graph)
│   │   ├── observationService.ts     # Observation management
│   │   └── autoGraph/                # 🆕 Auto graph module
│   │       ├── index.ts              # Module exports
│   │       ├── types.ts              # Type definitions
│   │       ├── autoGraphService.ts   # Auto graph data service
│   │       └── codeAnalyzer.ts       # Static code analyzer
│   ├── providers/                    # ✅ VS Code UI providers
│   │   ├── hoverProvider.ts          # Hover provider
│   │   ├── codeLensProvider.ts       # CodeLens
│   │   └── treeDataProvider.ts       # Tree view
│   ├── ui/                          # ✅ Command handlers
│   │   ├── commands/
│   │   │   ├── entityCommands.ts     # Entity commands
│   │   │   └── autoGraphCommands.ts  # 🆕 Auto graph commands
│   │   └── webview/
│   │       └── graphView.ts          # Graph visualization (mode switching)
│   └── utils/                       # ✅ Utilities
│       └── types.ts                 # Type definitions
├── package.json                      # Extension configuration
├── tsconfig.json                     # TypeScript config
├── README.md                         # Project documentation (Chinese)
├── README_en.md                      # Project documentation (English)
├── Demo.md                           # Demo guide (Chinese)
└── Demo_en.md                        # Demo guide (English)

Legend:
  ✅ Implemented
  🔜 Planned
```

### Data Storage

```
Project Root/
├── .vscode/
│   └── .knowledge/
│       └── graph.sqlite              # Knowledge graph database (includes RAG index)
└── Knowledge/                        # ✅ RAG document knowledge base
    ├── architecture.md               # Architecture docs
    ├── api-guide.md                  # API guide
    └── decisions/                    # Design decisions
        └── adr-001.md
```

**RAG Store Isolation Mechanism**:
- Each project automatically generates a unique Store ID (based on project path hash)
- Multiple projects can use the same Gemini API Key
- Document indexes are completely isolated, no confusion
- Store information stored in local SQLite database

---

## ✨ Core Features

### 🗂️ Knowledge Graph Management

#### Basic Graph Features
- ✅ **Entity Management**: Manually create and manage code entities (Function, Class, Interface, Variable, etc.)
- ✅ **Relation Management**: Establish relations between entities (uses, calls, extends, implements, depends_on)
- ✅ **Observations**: Add notes, warnings, TODOs, design decisions to entities (multi-line editor from entity context menu; automatically creates the first note when none exists)
- ✅ **Fuzzy Search**: Quickly search entities and observations
- ✅ **Data Persistence**: Local SQLite database storage

#### UI Integration
- ✅ **Sidebar Tree View**: Display all entities and relations grouped by type
- ✅ **Hover Tips**: Show entity info, observations, relation network on hover
- ✅ **CodeLens**: Display entity statistics above code
- ✅ **Context Menu**: Quick create entity, add observation, establish relation
- ✅ **Command Palette**: Complete command set for quick access to all features

#### Visualization
- ✅ **Interactive Graph**: Force-directed graphical display based on D3.js
- ✅ **Auto Layout**: Nodes automatically arranged to avoid overlap
- ✅ **Multi-edge Separation**: Multiple relations in same direction automatically shown with different arcs
- ✅ **Circular Dependency Detection**: Automatically identify and mark circular dependencies
- ✅ **Double-click Navigation**: Double-click node to jump to code location
- ✅ **Drag Interaction**: Support node dragging, zoom, pan
- ✅ **Node Tooltip Details**: Hover tooltip shows observation previews with remaining-count indicator for quick risk scanning
- ✅ **Graph Mode Switching**: One-click switch between Manual / Auto / Merged views

---

### ⚡ Auto Graph Generation 🆕

Static code analysis to automatically generate dependency graphs, no AI required, deterministic analysis.

#### Supported Languages
- ✅ TypeScript (.ts, .tsx)
- ✅ JavaScript (.js, .jsx)

#### Auto-extracted Entity Types

| Type | Description | Example |
|------|-------------|---------|
| `class` | Class definition | `class UserService {}` |
| `interface` | Interface definition | `interface UserData {}` |
| `function` | Function definition | `function createUser() {}` |
| `variable` | Exported variable | `export const config = {}` |

> 💡 **Note**: Only analyzes code within workspace, external dependencies (e.g., @nestjs, typeorm) won't generate nodes

#### Auto-detected Relation Types

| Relation | Description | Example |
|----------|-------------|---------|
| `extends` | Class inheritance | `class A extends B` |
| `implements` | Interface implementation | `class A implements B` |
| `uses` | Dependency usage | Constructor injection, member variables, return types |
| `imports` | Module import | `import { X } from './x'` |

#### Dependency Detection Scenarios

```typescript
// ✅ Class inheritance
class UserController extends BaseController {}

// ✅ Interface implementation (workspace interfaces only)
class ProfileModule implements LocalInterface {}

// ✅ Constructor dependency injection
class ArticleController {
  constructor(private articleService: ArticleService) {}
}

// ✅ Method return type
async getProfile(): Promise<ProfileRO> {}

// ✅ Method parameter type
createArticle(@Body() dto: CreateArticleDto) {}

// ✅ Interface property type
interface ArticleData {
  author?: UserData;  // ArticleData --uses--> UserData
}

// ✅ @Inject decorator
@Inject(ConfigService) private config: ConfigService

// ✅ @Module decorator (NestJS)
@Module({
  imports: [UserModule, ArticleModule],  // --uses--> UserModule, ArticleModule
  controllers: [AppController],
  providers: [AppService],
})
class ApplicationModule {}

// ✅ TypeORM relation decorators
@ManyToOne(type => UserEntity, user => user.articles)
author: UserEntity;  // --uses--> UserEntity

// ✅ Function body dependencies (new instantiation, static method calls)
async function bootstrap() {
  const app = await NestFactory.create(ApplicationModule);  // --uses--> ApplicationModule
  const builder = new DocumentBuilder();  // --uses--> DocumentBuilder (if in workspace)
}
```

#### Usage

1. **Analyze Entire Workspace**: Command Palette → `Knowledge: Analyze Workspace (Auto Graph)`
2. **Analyze Current File**: Command Palette → `Knowledge: Analyze Current File (Auto Graph)`
3. **View Statistics**: Command Palette → `Knowledge: View Auto Graph Statistics`
4. **Clear Auto Graph**: Command Palette → `Knowledge: Clear Auto Graph`
5. **Switch View**: Click top buttons in graph view to switch 📝Manual / ⚡Auto / 🔗Merged
6. **Add Observation**: Right-click auto graph entity in Explorer sidebar → `Add Observation`
7. **Edit Observation**: Right-click observation → `Edit Observation` (multi-line editor)
8. **Delete Observation**: Right-click observation → `Delete Observation`

#### Configuration Options

| Option | Description | Default |
|--------|-------------|---------|
| `knowledgeGraph.autoAnalyze.enabled` | Enable auto analysis | `true` |
| `knowledgeGraph.autoAnalyze.onSave` | Auto analyze on save | `false` |
| `knowledgeGraph.autoAnalyze.include` | Include file patterns | `["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"]` |
| `knowledgeGraph.autoAnalyze.exclude` | Exclude file patterns | `["**/node_modules/**", "**/dist/**", "**/*.d.ts", "**/*.test.ts"]` |
| `knowledgeGraph.aiConfig.maxRelationsDisplay` | Max relations to display in AI config files | `50` |

#### Manual vs Auto Graph Comparison

| Feature | Manual Graph | Auto Graph |
|---------|--------------|------------|
| Creation | User manually creates | Static analysis auto-generates |
| Observations | ✅ Supported | ✅ Supported (preserved during re-analysis) |
| Data Isolation | `entities` / `observations` tables | `auto_entities` / `auto_observations` tables |
| Data Updates | Manual CRUD | Incremental: deleted entities removed, preserved entities keep observations |
| External Dependencies | Can add manually | Workspace code only |
| Use Cases | Design decisions, refactoring notes | Quick dependency understanding + key node annotation |

---

### 🤖 AI Collaboration Features

#### Knowledge Graph Export
- ✅ **Markdown Export**: Generate AI-readable formatted documents
- ✅ **JSON Export**: Structured data export
- ✅ **Dependency Chain Analysis**: Recursively build dependency tree, detect circular dependencies, count transitive dependencies
- ✅ **Grouped by Type**: Entities, relations, observations categorized

#### AI Tool Integration
- ✅ **Cursor Integration**: Auto-generate `.cursorrules` configuration file
- ✅ **GitHub Copilot Integration**: Auto-generate `.github/copilot-instructions.md`
- ✅ **Graph Source Selection** 🆕: Choose data source when generating AI configs
  - 📝 **Manual Graph**: Design decisions, observations, manually maintained relations
  - ⚡ **Auto Graph**: Static analysis generated code structure and dependencies
  - 🔗 **Merged Graph**: Manual + Auto, most complete context
- ✅ **Entity Relationship Graph** 🆕: Generated AI configs include complete entity relationship info
  - Relationship type distribution (uses, calls, extends, implements, etc.)
  - Dependency details (source entity → target entity)
  - Hierarchy analysis (Entry Layer Controllers / Foundation Layer Entities)
- ✅ **Tech Stack Detection**: Automatically extract dependency info
  - JavaScript/TypeScript projects (`package.json`)
  - Java Maven projects (`pom.xml`)
  - Python projects (`requirements.txt`, `pyproject.toml`, `setup.py`)
- ✅ **Scenario Switching**: 8 built-in scenario templates for different development tasks (frontend/backend/testing/debugging etc.)
- ✅ **One-click Generation**: Generate all AI config files at once
- ✅ **Smart Categorization**: Automatically categorize warnings, TODOs, known issues

#### Quick Context Export
- ✅ **Entity Context**: Copy complete context of single entity to clipboard
- ✅ **File Context**: Export all entities and relations of current file
- ✅ **AI Summary**: Generate project overview for AI understanding

---

### ☁️ Persistent Knowledge Base (RAG)

#### RAG Modes
The extension supports two RAG modes for flexible privacy control:

1. **Cloud RAG (Google Gemini)**
   - ✅ **Managed Service**: Use Gemini File Search API, no local compute required
   - ✅ **Multi-format Support**: Native support for PDF, Word, code, etc. (100+ formats)
   - ✅ **Semantic Search**: Gemini automatically chunks and retrieves

2. **Local RAG (Local Mode)** 🆕
   - ✅ **Data Privacy**: All documents and vectors stored locally in SQLite only, never uploaded
   - ✅ **Flexible Models**: Supports Ollama, LocalAI, vLLM, or any OpenAI-compatible endpoint
   - ✅ **Custom Configuration**: Customizable Embedding and Inference models
   - ✅ **Multi-format Parsing**: Beyond plain text, built-in PDF / DOC / DOCX parsing
   - ✅ **Lightweight Implementation**:
     - **SQLite (persistence) + Memory (compute)** architecture, no extra dependencies across Win/macOS/Linux
     - Vectors loaded to memory at startup, cosine similarity brute-force search for typical VS Code scale
     - No Docker, Python/Rust dependencies, or extra services needed - works out of box
     - Data stored with project in `.vscode/.knowledge/graph.sqlite`, easy to backup and audit

#### Intelligent Q&A
- ✅ **Ask Question**: Intelligent Q&A based on document content
- ✅ **Source Tracing**: Show source documents of answers (Grounding Metadata)
- ✅ **Markdown Display**: Q&A results displayed as formatted Markdown documents
- ✅ **Copy & Save**: Support copying content or saving as file

#### Project Management
- ✅ **Project Isolation**: Each project has independent File Search Store, completely isolated
- ✅ **API Key Configuration**: Manage Gemini API Key through VS Code settings
- ✅ **Auto-reconnect**: Auto re-initialize when API Key is updated
- ✅ **View Store Info**: Cloud mode shows live cloud stats; local mode hides cloud notices, shows local metadata only
- ✅ **Index Rebuild**: Rebuild RAG Index command for complete sync between local and cloud

#### Sidebar Management
- ✅ **Documents (RAG) View**: Display list of indexed documents
- ✅ **Quick Actions**: Question mark (Ask Question), info icon (View Store Info), refresh icon (Rebuild Index)
- ✅ **Connection Test**: Test Gemini API connection status

---

## 🏗️ Technical Architecture

### Tech Stack

| Layer | Technology | Description |
|-------|-----------|-------------|
| **Extension Framework** | VS Code Extension API | Official extension development framework |
| **Language** | TypeScript | Type-safe, great developer experience |
| **Database** | sql.js | WebAssembly SQLite, cross-platform compatible |
| **Search** | LIKE fuzzy query | Simple and efficient, suitable for small/medium projects |
| **Visualization** | vis-network | Interactive graph visualization |
| **RAG System** | Google Gemini File Search API | Managed vector search and intelligent Q&A |
| **Code Parsing** | Regex + XML parsing | Support multiple project config files |

### Core Data Flow

```
User Action
  ↓
VS Code UI (TreeView / Hover / CodeLens / Menu)
  ↓
Commands (entityCommands.ts)
  ↓
Services (entityService / relationService / observationService)
  ↓
Database (database.ts → SQLite)
  ↓
Stored in .vscode/.knowledge/graph.sqlite
```

### Database Schema

```sql
-- ========== Manual Graph Tables ==========

-- Entities table (manual)
CREATE TABLE entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    file_path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- Relations table (manual)
CREATE TABLE relations (
    id TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    verb TEXT NOT NULL,
    created_at INTEGER NOT NULL
);

-- Observations table
CREATE TABLE observations (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
);

-- ========== Auto Graph Tables 🆕 ==========

-- Auto-generated entities table
CREATE TABLE auto_entities (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,           -- class/interface/function/variable
    file_path TEXT NOT NULL,
    start_line INTEGER NOT NULL,
    end_line INTEGER NOT NULL,
    description TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    metadata TEXT                 -- JSON format extra info
);

-- Auto-generated relations table
CREATE TABLE auto_relations (
    id TEXT PRIMARY KEY,
    source_entity_id TEXT NOT NULL,
    target_entity_id TEXT NOT NULL,
    verb TEXT NOT NULL,           -- extends/implements/uses/imports
    created_at INTEGER NOT NULL,
    metadata TEXT,
    FOREIGN KEY (source_entity_id) REFERENCES auto_entities(id) ON DELETE CASCADE,
    FOREIGN KEY (target_entity_id) REFERENCES auto_entities(id) ON DELETE CASCADE
);

-- File analysis cache table (for incremental analysis)
CREATE TABLE auto_file_cache (
    file_path TEXT PRIMARY KEY,
    content_hash TEXT NOT NULL,   -- MD5 hash
    analyzed_at INTEGER NOT NULL
);

-- Auto graph observations table 🆕
CREATE TABLE auto_observations (
    id TEXT PRIMARY KEY,
    entity_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    FOREIGN KEY (entity_id) REFERENCES auto_entities(id) ON DELETE CASCADE
);

-- Index optimization
CREATE INDEX idx_entities_type ON entities(type);
CREATE INDEX idx_entities_file_path ON entities(file_path);
CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_auto_entities_type ON auto_entities(type);
CREATE INDEX idx_auto_entities_file_path ON auto_entities(file_path);
CREATE INDEX idx_auto_entities_name ON auto_entities(name);
CREATE INDEX idx_auto_relations_source ON auto_relations(source_entity_id);
CREATE INDEX idx_auto_relations_target ON auto_relations(target_entity_id);
CREATE INDEX idx_auto_observations_entity ON auto_observations(entity_id);
```

---

## 🛠️ Development Guide

### Requirements

- Node.js >= 16.x
- VS Code >= 1.80.0
- TypeScript >= 4.9.0

### Development Commands

```bash
# Install dependencies
npm install

# Compile
npm run compile

# Watch mode (for development)
npm run watch

# Run tests
npm test

# Package extension
npm run package

# Code lint
npm run lint
```

### Debugging

1. Open project in VS Code
2. Press `F5` to start debugging
3. A new VS Code window will open (Extension Development Host)
4. Test extension features in the new window

### Code Standards

- Use TypeScript strict mode
- Use async/await instead of callbacks
- Error handling with try/catch
- Naming conventions:
  - File names: camelCase.ts
  - Class names: PascalCase
  - Functions/variables: camelCase
  - Constants: UPPER_SNAKE_CASE

---

## 📖 Demo Documentation

For detailed demo guide and usage scenarios, see:

- **[Demo_en.md](./Demo_en.md)** - Complete demo guide
  - Demo based on NestJS RealWorld Example App
  - Includes 5 practical usage scenarios
  - Complete demo script from basic features to AI collaboration
  - Persistent knowledge base and document conversion demo

---

## 📚 References

### Official Documentation
- [VS Code Extension API](https://code.visualstudio.com/api)
- [sql.js Documentation](https://sql.js.org/)
- [vis-network Documentation](https://visjs.github.io/vis-network/)
- [TypeScript Compiler API](https://github.com/Microsoft/TypeScript/wiki/Using-the-Compiler-API)
- [Google File Search Tool](https://ai.google.dev/gemini-api/docs/file-search)
