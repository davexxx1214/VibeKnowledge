# VibeKnowledge Demo Guide

> Complete demo based on [NestJS RealWorld Example App](https://github.com/lujakob/nestjs-realworld-example-app)

---

## 📋 Table of Contents

- [Project Introduction](#project-introduction)
- [Why This Project](#why-this-project)
- [Preparation](#preparation)
  - [Set Language](#step-4-set-language-optional) 🌐
- [Demo Scenarios](#demo-scenarios)
- [Complete Demo Script](#complete-demo-script)
  - [Part 1: Basic Features Demo](#part-1-basic-features-demo-19-minutes)
    - [Create Entity](#11-create-first-entity-2-minutes)
    - [Add Observation](#12-add-observation-2-minutes)
    - [Create Relations](#14-create-relations-3-minutes)
    - [Tree View](#15-view-in-tree-view-1-minute)
    - [**Visualize Graph** 🌟](#16-visualize-knowledge-graph-10-minutes-core-feature)
  - [Part 2: Agent Dependency Graph](#part-2-agent-dependency-graph-3-minutes) 🆕
    - [Install the Skill](#21-install-the-dependency-graph-skill-1-minute)
    - [Ask an Agent to Generate Relations](#22-ask-an-agent-to-generate-relations-1-minute)
    - [Review and Edit the Knowledge Graph](#23-review-and-edit-the-knowledge-graph-1-minute)
  - [Part 3: RAG Persistent Knowledge Base](#part-3-rag-persistent-knowledge-base-5-minutes) 🆕
    - [Configure API Key](#31-configure-gemini-api-key-1-minute)
    - [Add Documents](#32-add-documents-to-knowledge-folder-1-minute)
    - [Intelligent Q&A](#33-use-ask-question-for-intelligent-qa-2-minutes)
    - [View Store Info](#34-view-rag-store-info-1-minute)
    - [Switch to Local RAG (Optional)](#35-switch-to-local-rag-optional)
    - [Local Q&A and Debugging](#36-local-qa-and-debugging-optional)
- [Best Practices](#-best-practices)
- [Appendix](#-appendix)

---

## 🎯 Project Introduction

### NestJS RealWorld Example App

A complete backend API implementation following the [RealWorld](https://github.com/gothinkster/realworld) spec, built with NestJS + TypeORM.

**Project URL**: https://github.com/lujakob/nestjs-realworld-example-app

**Tech Stack**:
- **Framework**: NestJS (Node.js framework similar to Spring Boot)
- **Database**: TypeORM + MySQL
- **Language**: TypeScript
- **Architecture**: Layered architecture (Controller → Service → Repository → Entity)

**Functional Modules**:
```
src/
├── user/                    # User module
│   ├── user.controller.ts   # User controller
│   ├── user.service.ts      # User service
│   ├── user.entity.ts       # User entity
│   └── user.module.ts       # User module
├── article/                 # Article module
│   ├── article.controller.ts
│   ├── article.service.ts
│   ├── article.entity.ts
│   └── article.module.ts
├── profile/                 # Profile module
├── tag/                     # Tag module
└── app.module.ts           # Root module
```

**Business Features**:
- User registration, login, authentication (JWT)
- Article CRUD (Create, Read, Update, Delete)
- Article favorites
- Comment system
- User follow
- Tag management

---

## 💡 Why This Project

### 1. **Clear Layered Architecture**
```
API Layer (Controllers)
  ↓ uses
Business Layer (Services)
  ↓ uses
Data Layer (Repositories/Entities)
```

This layering is perfect for demonstrating the knowledge graph's **relationship tracking** capabilities.

### 2. **Real Business Logic**

Not just simple CRUD, includes complex business relationships:
- User ← → Article (users create articles)
- Article ← → Comment (articles have comments)
- User ← → User (user follow relationship)
- Article ← → Tag (article tag relationship)

### 3. **Moderate Code Size**

- About 3000-5000 lines of code
- Not too simple (loses demo value)
- Not too complex (hard to understand)

### 4. **Easy to Understand**

Based on Medium.com clone, business logic is easy to understand:
- Users publish articles
- Other users like and comment
- Users follow each other

---

## 🛠️ Preparation

### Step 1: Clone Project

```bash
# Clone project
git clone https://github.com/lujakob/nestjs-realworld-example-app.git
cd nestjs-realworld-example-app

# Install dependencies
npm install

# Configure database (optional, only for demo code structure)
cp src/config.ts.example src/config.ts
```

**Note**: Demonstrating VibeKnowledge extension doesn't require running the project, just the code files.

### Step 2: Open Project in VS Code

```bash
code .
```

### Step 3: Start VibeKnowledge Extension

1. Press `F5` in the `VibeKnowledge` project to start extension debugging
2. Open `nestjs-realworld-example-app` project in the newly opened Extension Development Host window

### Step 4: Set Language (Optional) 🌐

VibeKnowledge supports Chinese and English interfaces:

**Method 1: Through Settings**
```
1. Settings → Search "Knowledge Graph Language"
2. Select "zh" (Chinese) or "en" (English)
```

**Method 2: Through Command**
```
1. Command Palette (Ctrl+Shift+P)
2. Type "Knowledge: Switch Language"
3. Select language
```

**Method 3: Quick Button**
```
Click the 🌐 icon in Knowledge Graph view title bar
```

💡 **Tip**: Language switching takes effect immediately, no restart required!

---

## 🎬 Demo Scenarios

### Scenario 1: New Developer Joins Team 👶

**Background**: A new developer just joined the team and needs to quickly understand the project structure.

**Problems**:
- 😵 Don't know where to start
- 😵 Don't know where UserService is called
- 😵 Don't know what modifying ArticleService will affect

**Solution with VibeKnowledge**:
1. Quickly mark core entities
2. Build relationship graph
3. Export to AI to generate project overview

---

### Scenario 2: Impact Analysis Before Refactoring 🔧

**Background**: Need to add parameters to `ArticleService.create` method.

**Problems**:
- 😵 Don't know how many places call this method
- 😵 Don't know what features might break after modification

**Solution with VibeKnowledge**:
1. View ArticleService dependency chain
2. Show all call sites
3. Assess impact scope

---

### Scenario 3: Team Knowledge Accumulation 📚

**Background**: Team has accumulated lots of experience and lessons during development.

**Problems**:
- 😵 Experience scattered in Slack chat history
- 😵 New developers don't know which code has pitfalls
- 😵 Performance optimization experience can't be passed down

**Solution with VibeKnowledge**:
1. Add observations to key entities
2. Record performance issues and optimization plans
3. Knowledge graph committed to Git with code

---

### Scenario 4: AI-Assisted Development 🤖

**Background**: Using Cursor AI to develop new features.

**Problems**:
- 😵 AI doesn't understand project structure
- 😵 Need to re-explain context every time
- 😵 AI doesn't know team's coding standards

**Solution with VibeKnowledge**:
1. Export knowledge graph as Markdown
2. Generate `.cursorrules` configuration
3. AI automatically learns project knowledge

---

### Scenario 5: Persistent Knowledge Base (Cloud & Local RAG) ☁️💾

**Background**: Project has detailed architecture docs and design decision documents.

**Problems**:
- 😵 Documentation and code are disconnected
- 😵 AI can't access document content
- 😵 Searching documents is inefficient
- 😵 Documents from multiple projects easily get confused

**Solution with VibeKnowledge**:
1. Add documents to `Knowledge/` folder (supports PDF, MD, TXT, etc.)
2. Choose **Cloud RAG (Gemini File Search)** or **Local RAG (OpenAI-compatible endpoint)**
3. Use **Ask Question** for intelligent Q&A. AI answers based on docs and shows citations
4. **Automatic Project Isolation**: Each project owns an independent Store in both modes
5. **Incremental Indexing + Rebuild**: Avoid duplicate uploads and fully resync when needed

**Core Features**:
- ✅ Vector semantic search (Gemini handles in Cloud mode; built-in SQLite + memory store handles Local mode)
- ✅ Intelligent Q&A (Ask Question)
- ✅ Traceable sources (Grounding Metadata)
- ✅ Multi-format support (100+ formats)
- ✅ Complete project isolation
- ✅ Incremental indexing (no duplicate uploads)
- ✅ Index rebuild (cloud/local full sync)
- ✅ **Local RAG**: Zero extra dependencies, data stays in `.vscode/.knowledge/graph.sqlite`

---

## 📖 Complete Demo Script

### VibeKnowledge Complete Features Demo (About 28 minutes)

This demo includes three core features: **Knowledge Graph Visualization**, **Agent Dependency Graph**, and **RAG Intelligent Q&A**!

#### 1.1 Create First Entity (2 minutes)

**Operations**:
```
1. Open src/user/user.service.ts
2. Select UserService class (entire class definition)
3. Right-click → "Knowledge: Create Entity from Selection"
4. Extension auto-detects:
   - Name: UserService
   - Type: Class
   - Location: src/user/user.service.ts:15-120
5. Add description: "Core user management service"
6. Confirm creation
```

**Expected Result**:
- ✅ "Classes (1)" group appears in sidebar
- ✅ Shows UserService entity
- ✅ Hovering over code shows entity info

---

#### 1.2 Add Observation (2 minutes)

**Operations**:
```
1. Hover over UserService
2. Click "Add Observation"
3. Enter observation:
   "⚠️ Note: findOne method has no cache, may have performance issues in high concurrency scenarios"
4. Save
```

**Expected Result**:
- ✅ Hover tip shows observation
- ✅ CodeLens shows the description and counts: `🧠 KG: Core user management service · 📝 1 · 🔗 0`

---

#### 1.3 Batch Create Entities (3 minutes)

**Operations**: Create following entities in sequence

| Entity | Type | File | Description |
|--------|------|------|-------------|
| `UserController` | Class | src/user/user.controller.ts | User API endpoints |
| `ArticleService` | Class | src/article/article.service.ts | Article management service |
| `ArticleController` | Class | src/article/article.controller.ts | Article API endpoints |
| `UserEntity` | Class | src/user/user.entity.ts | User data model |
| `ArticleEntity` | Class | src/article/article.entity.ts | Article data model |

**Tips**:
- Can quickly select class name → right-click to create
- Description can be left blank, add later

**Expected Result**:
- ✅ Sidebar shows 6 entities
- ✅ Grouped by type

---

#### 1.4 Create Relations (3 minutes)

**Method: Link to Entity (Quick link from current location)** ⭐

**Trigger**: Right-click menu or command palette

**Scenario**: You're browsing ArticleController and want to quickly mark that it uses ArticleService

**Operations**:
```
1. Open src/article/article.controller.ts
2. Place cursor inside ArticleController class (anywhere)
3. Right-click → "Knowledge: Link Selection to Entity..."
4. Select target entity: ArticleService
5. Select relation type: uses
6. Done!
```

**Expected Result**:
- ✅ Success message: `✅ Linked: ArticleController uses ArticleService`
- ✅ Sidebar auto-refreshes

---

**Continue Creating More Relations**

**Use Quick Method to Continue**:

```
Relation 3: ArticleService → UserService
  1. Open src/article/article.service.ts
  2. Cursor inside ArticleService class
  3. Right-click → "Link Selection to Entity..."
  4. Select: UserService
  5. Type: uses (needs to get article author info)

Relation 4: ArticleController → ArticleService (call relation)
  1. Stay inside ArticleController class
  2. Right-click → "Link Selection to Entity..."
  3. Select: ArticleService
  4. Type: calls (calls service methods)

Relation 5: ArticleService → UserEntity (association query)
  1. Open src/article/article.service.ts
  2. Cursor inside ArticleService class
  3. Right-click → "Link Selection to Entity..."
  4. Select: UserEntity
  5. Type: references (needs to reference user info)

Relation 6: ArticleService → ArticleEntity (data model relation)
  1. Stay inside ArticleService class
  2. Right-click → "Link Selection to Entity..."
  3. Select: ArticleEntity
  4. Type: uses (operates article data model)

Relation 7: UserService → UserEntity (data model relation)
  1. Open src/user/user.service.ts
  2. Cursor inside UserService class
  3. Right-click → "Link Selection to Entity..."
  4. Select: UserEntity
  5. Type: uses (operates user data model)
```

💡 **Tip**: Creating more relations makes the visualization graph richer and easier to see dependencies between modules!

**Now we have 7 relations total**:
1. UserController → UserService (uses)
2. ArticleController → ArticleService (uses)
3. ArticleController → ArticleService (calls) ⚠️ Forms multi-edge with relation 2
4. ArticleService → UserService (uses)
5. ArticleService → UserEntity (references)
6. ArticleService → ArticleEntity (uses)
7. UserService → UserEntity (uses) ⚠️ UserEntity has 2 incoming edges from relations 5 and 7

---

**Verify Relations**

**Check Hover Tip**:

```
Hover over UserService:

📦 UserService (Class)
📄 src/user/user.service.ts:15-120

💭 Observations (1)
  • ⚠️ Note: findOne method has no cache, may have performance issues in high concurrency scenarios

🔗 Relations (2)
  ← uses ← UserController
  ← uses ← ArticleService

[View Details] [Add Observation]
```

**View Entity Details**:
```
1. Right-click UserService → "Knowledge: View Entity Details"
2. Or Command Palette → "Knowledge: View Entity Details"

Output panel shows:
Entity: UserService
Type: class
Location: src/user/user.service.ts:15-120

Description: Core user management service

Observations (1):
  1. ⚠️ Note: findOne method has no cache, may have performance issues in high concurrency scenarios

Relations (2):
  ← uses ← UserController
  ← uses ← ArticleService
```

---

#### 1.5 View in Tree View (1 minute)

**Operations**: Check Knowledge Graph view in sidebar

**Expected Result**:
```
📦 Entities (6)
  ├─ 📁 Classes (6)
     │   ├─ UserService
     │   ├─ UserController
     │   ├─ ArticleService
  │   ├─ ArticleController
  │   ├─ UserEntity
  │   └─ ArticleEntity

🔗 Relations (7)
  ├─ UserController → UserService [uses]
  ├─ ArticleController → ArticleService [uses]
  ├─ ArticleController → ArticleService [calls]      ← Note: 2 edges to same node
  ├─ ArticleService → UserService [uses]
  ├─ ArticleService → UserEntity [references]
  ├─ ArticleService → ArticleEntity [uses]
  └─ UserService → UserEntity [uses]                ← Note: UserEntity has 2 incoming edges
```

💡 **Tip**: Click entity or relation to jump to code location

---

#### 1.6 Visualize Knowledge Graph (10 minutes) 🌟 Core Feature

**Why Visualization?**

Tree view displays in list form, while **visualization graph** displays as graphical network:
- 🕸️ See overall architecture at a glance
- 🔍 Quickly discover dependency relationships
- 🐛 Automatically identify circular dependencies
- ⚡ Double-click node to jump directly to code

---

##### 1.6.1 First Time Opening Graph (1 minute)

**Operations**:
```
1. Command Palette (Ctrl+Shift+P)
2. Type "visualize"
3. Select "Knowledge: Visualize Graph"
4. Wait for graph to load (about 2-3 seconds)
```

**Expected Result**:

New window opens, titled "Knowledge Graph Visualization"

**What You See**:

```
┌─────────────────────────────────────────────────┐
│                                    [⛶] [↻]     │
│                                                 │
│         UserEntity          UserController      │
│         (red ellipse)        (red ellipse)      │
│              ↑                   │ uses         │
│     references│                  ↓              │
│              │              UserService         │
│         ArticleEntity       (red ellipse)       │
│         (red ellipse)            ↑              │
│              ↑                  │ uses          │
│         uses │                  │               │
│              │             ArticleService       │
│              └────────────  (red ellipse)       │
│                              ↑   ↑              │
│                         uses │   │ calls        │
│                              │   │              │
│                        ArticleController        │
│                        (red ellipse)            │
│                                                 │
└─────────────────────────────────────────────────┘
```

💡 **Note**: Two buttons in top-right corner
- **⛶** - Fit to window (auto-adjust zoom, show all nodes)
- **↻** - Refresh graph (reload data)

✅ **Visual Verification**:
- 6 nodes (entities) auto-arranged, all shown as red ellipses (Class type)
- **7 arrows edges (relations)**, all clearly visible:
  - **2 edges** from ArticleController to ArticleService (uses and calls)
    - ✨ Auto-separated display: one curves right, one curves left
  - **UserEntity has 2 incoming edges** (auto-separated):
    - ArticleService → UserEntity (references)
    - UserService → UserEntity (uses)
  - Other 3 relations clearly visible
- Relation labels are larger font (16px), with black stroke and background, clearly readable
- Multi-edges automatically separated with different arcs, no overlap ⭐
- Nodes automatically avoid overlap, reasonable layout
- Connection lines obvious (gray lines + arrows)
- Two simple icon buttons in top-right (⛶ fit window, ↻ refresh)

---

##### 1.6.2 Test Interactive Features (2 minutes)

✨ **Multi-relation Auto-separation Display**

Graph automatically detects and separates multiple edges in same direction:
- **ArticleController → ArticleService** has 2 relations (uses and calls), shown with different arcs
- **UserEntity** has 2 incoming edges, clearly separated

**Visual Effect**:
- 1st edge: Curves right (curvedCW)
- 2nd edge: Curves left (curvedCCW)
- Two edges don't overlap, crystal clear!

💡 **Tip**: Hover over edge to see specific relation type

---

**Operation 1: Hover to View Details**
```
Hover over UserService node
```

✅ **Expected Result**: Shows hover tooltip
```
UserService
Type: class
File: src/user/user.service.ts:15
Description: Core user management service
```

---

**Operation 2: Double-click to Jump to Code**
```
Double-click UserService node
```

✅ **Expected Result**:
- Auto-opens `src/user/user.service.ts` file
- Cursor jumps to UserService class definition (line 15)
- Code line is highlighted

💡 **Tip**: This is the fastest way to view code!

---

**Operation 3: Drag Nodes**
```
1. Drag ArticleController node
2. Observe ArticleService's 2 curved connections
3. Note the two edges curve in different directions
```

✅ **Expected Result**:
- Node follows mouse movement
- Connected edges automatically follow
- **ArticleController → ArticleService's 2 edges** clearly separated
  - One curves right (uses)
  - One curves left (calls)
- **UserEntity's 2 incoming edges** also clearly separated
- Physics engine slightly adjusts surrounding nodes
- After release, node stays in new position

---

**Operation 4: Zoom and Pan**
```
Zoom: Scroll mouse wheel
Pan: Drag blank area
```

✅ **Expected Result**:
- Scroll forward: Zoom in on graph
- Scroll backward: Zoom out on graph
- Drag background: Entire graph follows movement

---

**Operation 5: Use Toolbar**
```
Click top-right "⛶" button (fit window)
```

✅ **Expected Result**: Graph auto-zooms and centers, all nodes visible

```
After adding new entity, click "↻" button (refresh)
```

✅ **Expected Result**: Graph reloads, shows latest entities and relations

---

##### 1.6.3 Value of Relation Network (2 minutes)

**Scenario**: You've created 6 relations, now you can see a rich relation network!

**Observe Relation Network in Graph**:

From visualization graph, you can clearly see:

1. **Controller Layer → Service Layer**
   - UserController → UserService (uses)
   - ArticleController → ArticleService (uses)
   - ArticleController → ArticleService (calls)

2. **Service Layer → Service Layer**
   - ArticleService → UserService (uses)

3. **Service Layer → Entity Layer**
   - UserService → UserEntity (uses)
   - ArticleService → ArticleEntity (uses)
   - ArticleService → UserEntity (references)

**Layered Architecture at a Glance**:
```
Controller Layer
    ↓ uses
Service Layer
    ↓ uses/references
Entity Layer (Data Models)
```

💡 **Value Demonstrated**:
- ✅ 7 relations form a coherent dependency network
- ✅ Clearly shows three-tier architecture (Controller → Service → Entity)
- ✅ **ArticleService is core node** (most connections)
- ✅ **UserEntity is depended on by multiple services** (2 incoming edges clearly separated)
- ✅ **ArticleController has two types of relations to ArticleService** (uses and calls)
  - ✨ Two edges auto-separated with different arcs, see at a glance
- ✅ **Multi-edges auto-separated**: Don't need manual dragging to see all relations ⭐
- ✅ Label font large (16px) + stroke, clearly readable

---

**Optional: Add More Entities (Demo Purpose)**

If you want to make graph richer, can add:

```
1. Create CommentService entity (service type)
2. Create AuthService entity (service type)
3. Create relations:
   - ArticleService → CommentService (uses)
   - UserController → AuthService (depends_on)
4. Click 🔄 refresh button to view update
```

This gives **8 entities, 8 relations**, much richer graph!

```
┌─────────────────────────────────────────────────┐
│                                    [⛶] [↻]     │
│                                                 │
│         UserController                          │
│              ↙        ↘                         │
│         uses        depends_on                  │
│           ↙              ↘                      │
│    UserService        AuthService               │
│         ↑                (cyan rectangle)       │
│         │ uses                                  │
│         │                                       │
│    ArticleController                            │
│         │ uses                                  │
│         ↓                                       │
│    ArticleService                               │
│         │ uses                                  │
│         ↓                                       │
│    CommentService                               │
│    (cyan rectangle)                             │
│                                                 │
│    UserEntity      ArticleEntity                │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Observe Graph Changes**:
- ✅ New nodes CommentService and AuthService appear
- ✅ Auto-layout adjusts, avoiding overlap
- ✅ New relation arrows displayed
- ✅ Service type nodes shown as cyan rectangles
- ✅ Statistics auto-update

---

##### 1.6.4 Impact Analysis Using Graph (1 minute)

**Scenario**: Preparing to modify UserService, want to know what components will be affected.

**Operations**:
```
Observe UserService node in visualization graph
```

**Analysis Result**:

See at a glance from graph:
- **UserService** is depended on by **2 components**:
  1. ← UserController (uses)
  2. ← ArticleService (uses)

**Impact Assessment**:
```
Modifying UserService interface
  ↓
Need to update synchronously:
  1. UserController (direct caller)
  2. ArticleService (indirect caller)
  3. ArticleController (caller of ArticleService, may be affected)
```

💡 **Value Demonstrated**:
- Traditional way: Need global search + manual analysis (10+ minutes)
- Using graph: See dependency relationships at a glance (10 seconds)
- **60x efficiency improvement!** 🚀

---

##### 1.6.5 Auto-detect Circular Dependencies (Optional) ⭐

**Scenario**: Automatically discover potential architecture issues from graph.

**Smart Detection**:
```
Extension automatically detects circular dependencies
  ↓
Marks them with prominent visual effects
  ↓
Helps you quickly find problems!
```

**Example**:
Suppose we mistakenly created:
- ArticleService → UserService (uses)
- UserService → ArticleService (uses)

**Graph Display (Enhanced Effect)**:
```
    ArticleService ────⚠️ uses────⤴
                               ↓
                  ⤷────⚠️ uses──── UserService
         Gray lines + ⚠️ warning icon
         (Circular dependency auto-detected!)
```

**Visual Enhancement Features**:

1. **⚠️ Warning Icon**
   - Normal relation: `uses`
   - Circular dependency: `⚠️ uses` (warning icon shown next to label)

2. **🖱️ Hover Tip**
   - When hovering over circular dependency edge, shows "Circular Dependency" tip

3. **🌊 Arc Separation**
   - Two edges of circular dependency auto-separated, avoiding overlap
   - Forms beautiful arc shape

4. **🎨 Visual Consistency**
   - Line color, thickness, style consistent with normal relations
   - Only identified by ⚠️ icon
   - Simple, beautiful, not obtrusive

5. **💬 Console Warning**
   - Auto-outputs: `⚠️ Detected N circular dependencies!`

**Actual Effect Example**:

```
Normal relation:
ArticleService ───uses───→ CommentService
  Gray, 2px, solid line

Circular dependency:
ArticleService ────⚠️ uses────⤴
                           ↓
              ⤷────⚠️ uses──── UserService
  Gray, 2px, solid line, only with ⚠️ icon
  (Hover shows "Circular Dependency" tip)
```

💡 **Value**:
- ✅ **Auto-detection**: No manual search needed, extension auto-identifies
- ✅ **Subtle Alert**: Only ⚠️ icon marks, doesn't affect overall aesthetics
- ✅ **Visual Consistency**: Same line style as normal relations
- ✅ **Clear Tip**: Hover shows "Circular Dependency" details
- ✅ **Timely Refactor**: Refactor immediately after finding issue, avoid technical debt
- ✅ **Architecture Review**: Quickly find architecture issues during Code Review

**How to Trigger Demo**:
```
1. Create ArticleService → UserService relation
2. Create UserService → ArticleService relation (reverse)
3. Click ↻ refresh button
4. Immediately see red thick dashed line + ⚠️ warning!
```

---

##### 1.6.6 Compare with Tree View

**Tree View vs Graphical View**

| Feature | Tree View | Visualization Graph |
|---------|-----------|-------------------|
| **Display** | 📁 List form | 🕸️ Graph network |
| **View Relations** | Need to expand to view | See at a glance |
| **Impact Analysis** | Click one by one to view | Overall global view |
| **Jump to Code** | Single click jump | Double-click jump |
| **Use Case** | Browse all entities | Understand dependencies |
| **Visual Intuitiveness** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**Best Practice**:
- 📁 **Daily Browse**: Use tree view
- 🔍 **Impact Analysis**: Use visualization graph
- 🔄 **Combine Both**: Achieve best results

---

##### 1.6.7 Summary

**What You've Learned**:
- ✅ Open visualization graph
- ✅ Understand meaning of node colors and shapes
- ✅ Use interactive features (hover, double-click, drag, zoom)
- ✅ Refresh graph to see latest data
- ✅ Use graph for impact analysis
- ✅ Discover potential architecture issues

**Key Takeaways**:

🎯 **A Picture is Worth a Thousand Words**: Graphical display is more intuitive than text  
⚡ **Quick Navigation**: Double-click node to jump directly to code  
🔍 **Global View**: See entire project's dependency relationships at a glance  
🐛 **Find Problems**: Visualization helps discover circular dependencies and other architecture issues  

---

### Part 2: Agent Generation, Then Human Editing (3 minutes) 🆕

> Let a coding Agent understand implementation semantics, select high-value direct dependencies, and cite precise code evidence.

#### 2.1 Install the Dependency Graph Skill (1 minute)

```text
1. Open the Command Palette (Ctrl+Shift+P)
2. Run "Knowledge: Install Dependency Graph Agent Skill"
3. Confirm .agents/skills/vibeknowledge-dependency-graph/ exists
```

The command installs the Skill bundled with VibeKnowledge. It generates only the refreshable structure and does not modify human-authored data.

#### 2.2 Ask an Agent to Generate Relations (1 minute)

In an Agent Skills-compatible coding agent, ask:

```text
$vibeknowledge-dependency-graph generate the dependency knowledge graph for this project
```

The Agent reads the code and writes `.vscode/.knowledge/agent-graph.json`. Every relation must have a supported direction, verb, and at least one source-file evidence location. The bundled validator also rejects missing files and out-of-range evidence lines.

#### 2.3 Review and Edit the Knowledge Graph (1 minute)

```text
1. Run "Knowledge: Visualize Graph"
2. Review the single unified Knowledge Graph
3. Hover generated edges to inspect descriptions and evidence; double-click nodes to open source
4. Agent entities show their descriptions in `🧠 KG` above the source; click the hint to edit it manually
5. You can also right-click an entity and choose "Knowledge: Edit Entity Description" to add human prose
```

Rerunning the Skill replaces only the generated structure, removing stale relationships while preserving human entities, relations, observations, and description overrides.

---

### Part 3: RAG Persistent Knowledge Base (5 minutes) 🆕

#### 3.1 Configure Gemini API Key (1 minute)

**Operations**:
```
1. Command Palette (Ctrl+Shift+P)
2. Type "Preferences: Open Settings (UI)"
3. Search "Gemini API Key"
4. Find "Knowledge Graph > Gemini: Api Key"
5. Enter your Gemini API Key
6. Save settings
```

**Expected Result**:
- ✅ Popup message: "✅ Knowledge Graph RAG enabled! New documents will be automatically indexed to cloud."
- ✅ "Documents (RAG)" view appears in sidebar

**Get API Key**:
- Visit https://aistudio.google.com/apikey
- Login with Google account
- Create or copy API Key

---

#### 3.2 Add Documents to Knowledge Folder (1 minute)

**Operations**:
```
1. Create Knowledge/ folder in project root
2. Add some documents:
   - architecture.md (architecture docs)
   - database-design.pdf (database design)
   - api-guide.txt (API guide)
3. Save files
```

**Expected Result**:
- ✅ Files automatically detected
- ✅ Background auto-uploads to Gemini File Search Store
- ✅ Sidebar "Documents (RAG)" shows document list
- ✅ Console outputs: `Indexing file: Knowledge/architecture.md`

💡 **Supported Formats**: PDF, TXT, MD, DOCX, JSON, TS, JS, etc. (100+ formats)

---

#### 3.3 Use Ask Question for Intelligent Q&A (2 minutes)

**Operations**:
```
1. Click question mark icon (?) in sidebar "Documents (RAG)"
   Or Command Palette → "Knowledge: Ask Question"
2. Enter question, e.g.:
   "What databases does the project use?"
   "How is user authentication implemented?"
   "What APIs does the article module have?"
3. Wait for Gemini analysis (about 3-5 seconds)
```

**Expected Result**:

Opens a new Markdown document showing:

```markdown
# 💬 Question & Answer Result

**Question**: What databases does the project use?

**Answer Time**: 11/15/2025, 6:30:45 PM

---

## 🤖 Answer

The project uses **MySQL** as the main database, accessed through **TypeORM**.
The configuration also mentions using a connection pool with size set to 20.

---

## 📚 References (Grounding)

1. **architecture.md**
   - Mentions TypeORM + MySQL tech stack

2. **database-design.pdf**
   - Contains complete database table structure design

---

_💡 Click filename to jump directly to original document_
```

✅ **Key Features**:
- AI answers based on document content
- Shows source citations (Grounding Metadata)
- Markdown format, can copy content
- Can save as file

---

#### 3.4 View RAG Store Info (1 minute)

**Operations**:
```
1. Click info icon (ℹ️) in sidebar "Documents (RAG)"
   Or Command Palette → "Knowledge: View RAG Store Info"
```

**Expected Result**:

Opens a new Markdown document showing:

```markdown
# RAG Store Information

**Project Name**: nestjs-realworld-example-app
**Store Name**: `fileSearchStores/vibeknowledgenestjsrealworldex-xxx`
**Workspace Path**: `d:\workspace\nestjs-realworld-example-app`

## 📊 Document Statistics (Cloud Real-time Data)
- **Active Documents**: 3
- **Processing Documents**: 0
- **Failed Documents**: 0
- **Total**: 3

## 📝 Local Metadata
- **Local Recorded Files**: 3
- **Created**: 11/15/2025, 6:25:30 PM
- **Last Sync**: 11/15/2025, 6:30:45 PM

---

## 🔐 Project Isolation
Each project has a unique **File Search Store** to ensure documents are not confused with other projects.
```

💡 **Project Isolation Mechanism**:
- Each project auto-generates unique Store ID (based on project path hash)
- Multiple projects using same API Key are completely isolated
- Document indexes not confused

---

#### 3.5 Switch to Local RAG (Optional)

When documents are confidential or you need an offline demo, switch to the built-in local RAG mode (SQLite persistence + in-memory vectors).

**Operations**:
```
1. Settings → Search "Knowledge Graph RAG Mode" → Select "local"
2. Configure:
   - Knowledge Graph > Rag: Local Api Base  (e.g., http://localhost:11434/v1 or any OpenAI-compatible endpoint)
   - Knowledge Graph > Rag: Local Api Key   (if your endpoint requires auth)
   - Knowledge Graph > Rag: Local Embedding Model  (e.g., text-embedding-3-small / nomic-embed-text)
   - Knowledge Graph > Rag: Local Inference Model  (e.g., gpt-4.1 / llama3)
3. Command Palette → "Knowledge: Rebuild RAG Index" (recommended when switching)
4. Run Ask Question again – answers now come from local vectors + your local inference endpoint
```

**Tips**:
- Vector data lives in `.vscode/.knowledge/graph.sqlite` → easy to back up or reset
- Extension loads vectors into memory on startup and uses cosine similarity for retrieval
- Local mode uses the same UI buttons (Ask Question / View Store Info / Rebuild Index)

#### 3.6 Local Q&A and Debugging (Optional)

**Demo Suggestions**:
1. Run Ask Question in local mode and highlight that references still point to files (e.g., `test1.txt`)
2. Open Output panel to show logs such as “Using Local RAG Provider” or “✅ Locally indexed …”
3. To reset, delete `.vscode/.knowledge/graph.sqlite` or run `Rebuild RAG Index`
4. If Ask Question fails, run `Knowledge: Test Connection` to verify the local API endpoint

---

#### 3.7 Incremental Indexing and Index Rebuild (Further Reading)

**Incremental Indexing**:
- ✅ Already indexed documents won't be re-uploaded
- ✅ Only new or modified documents uploaded
- ✅ Auto-checks every time extension starts

**Index Rebuild**:

If local and cloud are out of sync (e.g., deleted local file), can:

```
1. Click refresh icon (🔄) in sidebar "Documents (RAG)"
   Or Command Palette → "Knowledge: Rebuild RAG Index"
2. Confirm operation
3. Wait for completion (cloud mode deletes Store + re-uploads; local mode clears SQLite entries and re-chunks files)
```

⚠️ **Note**: Rebuild keeps both cloud and local vector stores fully consistent.

---

## 🎉 Demo Complete

**Congratulations! You've mastered VibeKnowledge's core features:**

### ✅ Skills Learned
1. Create Entity
2. Add Observation
3. Link to Entity
4. Tree View
5. **Visualize Graph** 🌟
6. **Agent Dependency Graph** 🆕
7. **RAG Intelligent Q&A** 🆕

### 🌟 Core Feature Value

**Visualization Graph**:
- 🕸️ Graphically display project architecture
- ⚡ Double-click node to jump to code
- 🔍 Quick impact analysis
- 🐛 Auto-detect circular dependencies

**Agent Dependency Graph**:
- 🤖 Uses Agent code understanding instead of regex-only extraction
- 🔎 Gives every relation auditable file-and-line evidence
- 🧭 Keeps Agent and human knowledge separate or displays them together
- 🔄 Full refresh removes stale Agent relationships

**RAG Intelligent Q&A**:
- ☁️ Cloud-hosted semantic search
- 🤖 Document-based intelligent Q&A
- 📚 Traceable sources (Grounding)
- 🔐 Complete multi-project isolation
- ⚡ Incremental indexing, efficient and fast

### 📖 Further Learning

For complete features see:
- 📄 README.md - Complete feature documentation
- 📚 docs/ - Detailed documentation

---

## 💡 Best Practices

### Daily Development Workflow

1. **When Reading Code**
   ```
   Important class → Create entity → Add description
   Find call relation → Link to Entity
   Experience/lesson → Add Observation
   ```

2. **Before Refactoring**
   ```
   Run the dependency graph Skill → Open the Knowledge Graph → Review dependencies → Add human descriptions → Assess impact scope
   ```

3. **During Code Review**
   ```
   Find important module → Mark entity
   Find architecture issue → Add observation
   View graph → Check circular dependencies
   ```

4. **Manage Project Documentation** 🆕
   ```
   Write architecture docs → Put in Knowledge/ folder → Auto-indexes (cloud or local)
   Need to find info → Ask Question → AI answers based on docs
   ```

5. **Use AI Programming Tools / Local RAG** 🆕
   ```
   Need cloud hosting → Configure Gemini API Key
   Need offline/privacy → Switch RAG Mode = local and configure local endpoint
   Use Cursor/Copilot → AI can access the latest project docs
   ```

### Team Collaboration

1. **Commit Knowledge Graph with Code**
   ```bash
   git add .vscode/.knowledge/
   git commit -m "Add knowledge graph for user module"
   ```

2. **Share Project Documentation** 🆕
   ```bash
   git add Knowledge/
   git commit -m "Add architecture documentation"
   # After team members clone, docs auto-index to their own cloud Stores
   ```

3. **New Developer Onboarding**
   ```
   Open project → View graph → Quickly understand architecture
   Configure API Key → Docs auto-index → Ask Question to quickly get started
   ```

4. **Multi-project Development** 🆕
   ```
   Use same API Key in multiple projects
   → Each project auto-isolated to independent Store
   → Documents won't get confused; local mode keeps its own SQLite vector store per project
```

---

## 🚀 Get Started

Now you can:
1. Use VibeKnowledge in your projects
2. Mark core entities and relations
3. Use visualization graph to understand project architecture
4. Install the dependency graph Skill and ask an Agent to refresh relationships
5. Configure Gemini API Key to enable RAG features
6. Add project documents to Knowledge/ folder
7. Use Ask Question for intelligent Q&A
8. Let knowledge evolve with code

**Happy Coding!** 🎉

---

## 📚 Appendix

### Common Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| Create Entity | Right-click menu | Create entity |
| Add Observation | Hover → Click | Add observation |
| Link to Entity | Right-click menu | Create relation |
| Visualize Graph | Ctrl+Shift+P | Visualize graph |
| View Entity Details | Right-click menu | View entity details |
| **Switch Language** 🌐 | Sidebar (🌐) / Ctrl+Shift+P | Switch Chinese/English interface |
| **Install Dependency Graph Agent Skill** 🆕 | Ctrl+Shift+P | Install the project Skill used to generate dependencies |
| **Ask Question** 🆕 | Sidebar (?) | RAG intelligent Q&A |
| **View Store Info** 🆕 | Sidebar (ℹ️) | View RAG Store info |
| **Rebuild RAG Index** 🆕 | Sidebar (🔄) | Rebuild cloud index |
| **Test Gemini API** 🆕 | Ctrl+Shift+P | Test API connection |

### Entity Types

| Type | Icon | Color | Description |
|------|------|-------|-------------|
| class | Ellipse | Red | Class |
| function | Rectangle | Blue | Function |
| service | Rectangle | Cyan | Service |
| component | Diamond | Green | Component |
| entity | Hexagon | Orange | Data entity |

### Relation Types

- `uses` - Usage relationship
- `calls` - Call relationship
- `depends_on` - Dependency relationship
- `implements` - Implementation relationship
- `extends` - Inheritance relationship
- `references` - Reference relationship

---

**More Questions?** Check README.md or submit an Issue!

---

## 🔚 End of Demo

**Thank you for using VibeKnowledge!**

