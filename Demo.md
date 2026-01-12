# VibeKnowledge 演示指南

> 基于 [NestJS RealWorld Example App](https://github.com/lujakob/nestjs-realworld-example-app) 的完整演示

---

## 📋 目录

- [项目介绍](#项目介绍)
- [为什么选择这个项目](#为什么选择这个项目)
- [准备工作](#准备工作)
  - [设置语言](#步骤-4设置语言可选) 🌐
- [演示场景](#演示场景)
- [完整演示脚本](#完整演示脚本)
  - [第一部分：基础功能演示](#第一部分基础功能演示19-分钟)
    - [创建实体](#11-创建第一个实体2-分钟)
    - [添加观察](#12-添加观察记录2-分钟)
    - [建立关系](#14-建立关系3-分钟)
    - [树视图](#15-在树视图中查看1-分钟)
    - [**可视化图谱** 🌟](#16-可视化知识图谱10-分钟-核心功能)
  - [第二部分：自动图谱生成](#第二部分自动图谱生成3-分钟) 🆕
    - [分析工作区](#21-分析整个工作区1-分钟)
    - [切换视图](#22-切换到自动图谱视图1-分钟)
    - [查看统计](#23-查看自动图谱统计1-分钟)
  - [第三部分：RAG 持久知识库](#第三部分rag-持久知识库5-分钟) 🆕
    - [配置 API Key](#31-配置-gemini-api-key1-分钟)
    - [添加文档](#32-添加文档到-knowledge-文件夹1-分钟)
    - [智能问答](#33-使用-ask-question-进行智能问答2-分钟)
    - [查看 Store 信息](#34-查看-rag-store-信息1-分钟)
    - [切换到本地 RAG（可选）](#35-切换到本地-rag可选)
    - [本地问答与调试](#36-本地问答与调试可选)
- [最佳实践](#-最佳实践)
- [附录](#-附录)

---

## 🎯 项目介绍

### NestJS RealWorld Example App

这是一个遵循 [RealWorld](https://github.com/gothinkster/realworld) 规范的完整后端 API 实现，使用 NestJS + TypeORM 构建。

**项目地址**：https://github.com/lujakob/nestjs-realworld-example-app

**技术栈**：
- **框架**：NestJS（类似 Spring Boot 的 Node.js 框架）
- **数据库**：TypeORM + MySQL
- **语言**：TypeScript
- **架构**：分层架构（Controller → Service → Repository → Entity）

**功能模块**：
```
src/
├── user/                    # 用户模块
│   ├── user.controller.ts   # 用户控制器
│   ├── user.service.ts      # 用户服务
│   ├── user.entity.ts       # 用户实体
│   └── user.module.ts       # 用户模块
├── article/                 # 文章模块
│   ├── article.controller.ts
│   ├── article.service.ts
│   ├── article.entity.ts
│   └── article.module.ts
├── profile/                 # 个人资料模块
├── tag/                     # 标签模块
└── app.module.ts           # 根模块
```

**业务功能**：
- 用户注册、登录、认证（JWT）
- 文章 CRUD（创建、阅读、更新、删除）
- 文章点赞（Favorite）
- 评论系统
- 用户关注（Follow）
- 标签管理

---

## 💡 为什么选择这个项目

### 1. **清晰的分层架构**
```
API 层 (Controllers)
  ↓ uses
业务层 (Services)
  ↓ uses
数据层 (Repositories/Entities)
```

这种分层非常适合展示知识图谱的**关系追踪**能力。

### 2. **真实的业务逻辑**

不是简单的 CRUD，包含复杂的业务关系：
- User ← → Article（用户创建文章）
- Article ← → Comment（文章有评论）
- User ← → User（用户关注关系）
- Article ← → Tag（文章标签关系）

### 3. **适中的代码规模**

- 约 3000-5000 行代码
- 不会太简单（失去演示价值）
- 不会太复杂（难以理解）

### 4. **易于理解**

基于 Medium.com 克隆，业务逻辑容易理解：
- 用户发表文章
- 其他用户点赞、评论
- 用户互相关注

---

## 🛠️ 准备工作

### 步骤 1：Clone 项目

```bash
# 克隆项目
git clone https://github.com/lujakob/nestjs-realworld-example-app.git
cd nestjs-realworld-example-app

# 安装依赖
npm install

# 配置数据库（可选，仅用于演示代码结构）
cp src/config.ts.example src/config.ts
```

**注意**：演示 VibeKnowledge 插件不需要运行项目，只需要代码文件。

### 步骤 2：在 VS Code 中打开项目

```bash
code .
```

### 步骤 3：启动 VibeKnowledge 插件

1. 在你的 `vibecoding` 项目中按 `F5` 启动插件调试
2. 在新打开的 Extension Development Host 窗口中打开 `nestjs-realworld-example-app` 项目

### 步骤 4：设置语言（可选）🌐

VibeKnowledge 支持中英文双语界面：

**方式 1：通过设置**
```
1. 设置 → 搜索 "Knowledge Graph Language"
2. 选择 "zh"（中文）或 "en"（英文）
```

**方式 2：通过命令**
```
1. 命令面板（Ctrl+Shift+P）
2. 输入 "Knowledge: Switch Language"
3. 选择语言
```

**方式 3：快捷按钮**
```
点击知识图谱视图标题栏的 🌐 图标
```

💡 **提示**：语言切换立即生效，无需重启！

---

## 🎬 演示场景

### 场景 1：新人接手项目 👶

**背景**：一个新开发者刚加入团队，需要快速理解项目结构。

**问题**：
- 😵 不知道从哪里看起
- 😵 不知道 UserService 被哪些地方调用
- 😵 不知道修改 ArticleService 会影响哪些功能

**使用 VibeKnowledge 解决**：
1. 快速标记核心实体
2. 建立关系图谱
3. 导出给 AI 生成项目概览

---

### 场景 2：重构前的影响分析 🔧

**背景**：需要给 `ArticleService.create` 方法增加参数。

**问题**：
- 😵 不知道有多少地方调用了这个方法
- 😵 修改后可能破坏哪些功能

**使用 VibeKnowledge 解决**：
1. 查看 ArticleService 的依赖链
2. 显示所有调用点
3. 评估影响范围

---

### 场景 3：团队知识沉淀 📚

**背景**：团队在开发过程中积累了很多经验和教训。

**问题**：
- 😵 经验散落在 Slack 聊天记录中
- 😵 新人不知道哪些代码有坑
- 😵 性能优化经验无法传承

**使用 VibeKnowledge 解决**：
1. 添加观察记录到关键实体
2. 记录性能问题和优化方案
3. 知识图谱随代码提交到 Git

---

### 场景 4：AI 辅助开发 🤖

**背景**：使用 Cursor AI 开发新功能。

**问题**：
- 😵 AI 不了解项目结构
- 😵 每次都要重新解释上下文
- 😵 AI 不知道团队的编码规范

**使用 VibeKnowledge 解决**：
1. 导出知识图谱为 Markdown
2. 生成 `.cursorrules` 配置
3. AI 自动学习项目知识

---

### 场景 5：持久知识库（Cloud & Local RAG）☁️💾

**背景**：项目有详细的架构文档和设计决策文档。

**问题**：
- 😵 文档和代码脱节
- 😵 AI 无法访问文档内容
- 😵 搜索文档效率低
- 😵 多个项目的文档容易混淆

**使用 VibeKnowledge 解决**：
1. 在 `Knowledge/` 文件夹添加文档（支持 PDF、MD、TXT 等）
2. 可选择 **云端 RAG（Gemini File Search）** 或 **本地 RAG（OpenAI 兼容接口）**
3. 使用 **Ask Question** 进行智能问答，AI 基于文档回答并显示引用
4. **项目自动隔离**：每个项目拥有独立的 Store，无论 Cloud 还是 Local
5. **增量索引 + 重建索引**：避免重复上传，同时支持一键重建

**核心特性**：
- ✅ 向量语义搜索（Cloud 模式由 Gemini 完成，Local 模式由内置向量库完成）
- ✅ 智能问答（Ask Question）
- ✅ 来源可追溯（Grounding Metadata）
- ✅ 多格式支持（100+ 种）
- ✅ 项目完全隔离
- ✅ 增量索引（不重复上传）
- ✅ 索引重建（本地/云端都可完全同步）
- ✅ **Local RAG**：无需 Docker/外部服务，数据仅保存在 `.vscode/.knowledge/graph.sqlite`

---

## 📖 完整演示脚本

### VibeKnowledge 完整功能演示（约 28 分钟）

本演示包含三大核心功能：**知识图谱可视化**、**自动图谱生成** 和 **RAG 智能问答**！

#### 1.1 创建第一个实体（2 分钟）

**操作**：
```
1. 打开 src/user/user.service.ts
2. 选中 UserService 类（整个类定义）
3. 右键 → "Knowledge: Create Entity from Selection"
4. 插件自动识别：
   - 名称：UserService
   - 类型：Class
   - 位置：src/user/user.service.ts:15-120
5. 添加描述："用户管理核心服务"
6. 确认创建
```

**预期效果**：
- ✅ 侧边栏出现 "Classes (1)" 分组
- ✅ 显示 UserService 实体
- ✅ 鼠标悬停在代码上显示实体信息

---

#### 1.2 添加观察记录（2 分钟）

**操作**：
```
1. 鼠标悬停在 UserService 上
2. 点击 "Add Observation"
3. 输入观察记录：
   "⚠️ 注意：findOne 方法没有缓存，高并发场景可能有性能问题"
4. 保存
```

**预期效果**：
- ✅ 悬浮提示显示观察记录
- ✅ CodeLens 显示：`[KG: 1 observation]`

---

#### 1.3 批量创建实体（3 分钟）

**操作**：依次创建以下实体

| 实体 | 类型 | 文件 | 描述 |
|------|------|------|------|
| `UserController` | Class | src/user/user.controller.ts | 用户 API 端点 |
| `ArticleService` | Class | src/article/article.service.ts | 文章管理服务 |
| `ArticleController` | Class | src/article/article.controller.ts | 文章 API 端点 |
| `UserEntity` | Class | src/user/user.entity.ts | 用户数据模型 |
| `ArticleEntity` | Class | src/article/article.entity.ts | 文章数据模型 |

**技巧**：
- 可以快速选中类名 → 右键创建
- 描述可以留空，后续补充

**预期效果**：
- ✅ 侧边栏显示 6 个实体
- ✅ 按类型分组显示

---

#### 1.4 建立关系（3 分钟）

**方法：Link to Entity（从当前位置快速链接）**⭐

**触发方式**：右键菜单或命令面板

**场景**：你正在浏览 ArticleController，想快速标记它使用了 ArticleService

**操作**：
```
1. 打开 src/article/article.controller.ts
2. 光标放在 ArticleController 类内（任意位置）
3. 右键 → "Knowledge: Link Selection to Entity..."
4. 选择目标实体：ArticleService
5. 选择关系类型：uses
6. 完成！
```

**预期效果**：
- ✅ 显示成功消息：`✅ Linked: ArticleController uses ArticleService`
- ✅ 侧边栏自动刷新

---

**继续建立更多关系**

**使用快捷方式继续**：

```
关系 3：ArticleService → UserService
  1. 打开 src/article/article.service.ts
  2. 光标在 ArticleService 类内
  3. 右键 → "Link Selection to Entity..."
  4. 选择：UserService
  5. 类型：uses（需要获取文章作者信息）

关系 4：ArticleController → ArticleService（调用关系）
  1. 保持在 ArticleController 类内
  2. 右键 → "Link Selection to Entity..."
  3. 选择：ArticleService
  4. 类型：calls（调用服务方法）

关系 5：ArticleService → UserEntity（关联查询）
  1. 打开 src/article/article.service.ts
  2. 光标在 ArticleService 类内
  3. 右键 → "Link Selection to Entity..."
  4. 选择：UserEntity
  5. 类型：references（需要引用用户信息）

关系 6：ArticleService → ArticleEntity（数据模型关系）
  1. 保持在 ArticleService 类内
  2. 右键 → "Link Selection to Entity..."
  3. 选择：ArticleEntity
  4. 类型：uses（操作文章数据模型）

关系 7：UserService → UserEntity（数据模型关系）
  1. 打开 src/user/user.service.ts
  2. 光标在 UserService 类内
  3. 右键 → "Link Selection to Entity..."
  4. 选择：UserEntity
  5. 类型：uses（操作用户数据模型）
```

💡 **提示**：建立更多关系可以让可视化图谱更加丰富，更容易看出模块间的依赖关系！

**现在总共有 7 个关系**：
1. UserController → UserService (uses)
2. ArticleController → ArticleService (uses)
3. ArticleController → ArticleService (calls) ⚠️ 与关系2形成双边
4. ArticleService → UserService (uses)
5. ArticleService → UserEntity (references)
6. ArticleService → ArticleEntity (uses)
7. UserService → UserEntity (uses) ⚠️ UserEntity 同时被关系5和7指向

---

**验证关系**

**查看悬浮提示**：

```
鼠标悬停在 UserService 上：

📦 UserService (Class)
📄 src/user/user.service.ts:15-120

💭 观察记录 (1)
  • ⚠️ 注意：findOne 方法没有缓存，高并发场景可能有性能问题

🔗 关系 (2)
  ← uses ← UserController
  ← uses ← ArticleService

[查看详情] [添加观察]
```

**查看实体详情**：
```
1. 右键 UserService → "Knowledge: View Entity Details"
2. 或命令面板 → "Knowledge: View Entity Details"

输出面板显示：
Entity: UserService
Type: class
Location: src/user/user.service.ts:15-120

Description: 用户管理核心服务

Observations (1):
  1. ⚠️ 注意：findOne 方法没有缓存，高并发场景可能有性能问题

Relations (2):
  ← uses ← UserController
  ← uses ← ArticleService
```

---

#### 1.5 在树视图中查看（1 分钟）

**操作**：查看侧边栏 Knowledge Graph 视图

**预期效果**：
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
  ├─ ArticleController → ArticleService [calls]      ← 注意：2条边指向同一节点
  ├─ ArticleService → UserService [uses]
  ├─ ArticleService → UserEntity [references]
  ├─ ArticleService → ArticleEntity [uses]
  └─ UserService → UserEntity [uses]                ← 注意：UserEntity 有2条入边
```

💡 **提示**：点击实体或关系可以跳转到代码位置

---

#### 1.6 可视化知识图谱（10 分钟）🌟 核心功能

**为什么需要可视化？**

树视图以列表形式展示，而**可视化图谱**以图形化网络展示：
- 🕸️ 一眼看出整体架构
- 🔍 快速发现依赖关系
- 🐛 自动识别循环依赖
- ⚡ 双击节点直接跳转代码

---

##### 1.6.1 首次打开图谱（1 分钟）

**操作**：
```
1. 命令面板（Ctrl+Shift+P）
2. 输入 "visualize"
3. 选择 "Knowledge: Visualize Graph"
4. 等待图谱加载（约 2-3 秒）
```

**预期效果**：

新窗口打开，标题为 "Knowledge Graph Visualization"

**看到的内容**：

```
┌─────────────────────────────────────────────────┐
│                                    [⛶] [↻]     │
│                                                 │
│         UserEntity          UserController      │
│         (红色椭圆)           (红色椭圆)          │
│              ↑                   │ uses         │
│     references│                  ↓              │
│              │              UserService         │
│         ArticleEntity       (红色椭圆)          │
│         (红色椭圆)               ↑               │
│              ↑                  │ uses          │
│         uses │                  │               │
│              │             ArticleService        │
│              └────────────  (红色椭圆)          │
│                              ↑   ↑              │
│                         uses │   │ calls        │
│                              │   │              │
│                        ArticleController         │
│                        (红色椭圆)                │
│                                                 │
└─────────────────────────────────────────────────┘
```

💡 **说明**：右上角的两个按钮
- **⛶** - 适应窗口（自动调整缩放，显示所有节点）
- **↻** - 刷新图谱（重新加载数据）

✅ **视觉验证**：
- 6 个节点（实体）自动排列，全部显示为红色椭圆（Class 类型）
- **7 条带箭头的边（关系）**，全部清晰可见：
  - **2 条边**从 ArticleController 到 ArticleService（uses 和 calls）
    - ✨ 自动分离显示：一条向右弯，一条向左弯
  - **UserEntity 有 2 条入边**（自动分离）：
    - ArticleService → UserEntity (references)
    - UserService → UserEntity (uses)
  - 其他 3 条关系清晰可见
- 关系标签字体更大（16px），带黑色描边和背景，清晰可读
- 多重边自动以不同弧线分离，不会重叠 ⭐
- 节点自动避免重叠，布局合理
- 连接线明显（灰色线条 + 箭头）
- 右上角两个简洁的图标按钮（⛶ 适应窗口，↻ 刷新）

---

##### 1.6.2 测试交互功能（2 分钟）

✨ **多重关系自动分离显示**

图谱会自动检测并分离同方向的多条边：
- **ArticleController → ArticleService** 有 2 条关系（uses 和 calls），会以不同的弧线显示
- **UserEntity** 有 2 条入边，会清晰分离

**视觉效果**：
- 第 1 条边：向右弯曲（curvedCW）
- 第 2 条边：向左弯曲（curvedCCW）
- 两条边不会重叠，一目了然！

💡 **提示**：鼠标悬停在边上可以看到具体的关系类型

---

**操作 1：悬停查看详情**
```
鼠标悬停在 UserService 节点上
```

✅ **预期效果**：显示悬浮提示框
```
UserService
类型: class
文件: src/user/user.service.ts:15
描述: 用户管理核心服务
```

---

**操作 2：双击跳转到代码**
```
双击 UserService 节点
```

✅ **预期效果**：
- 自动打开 `src/user/user.service.ts` 文件
- 光标跳转到 UserService 类定义位置（第 15 行）
- 代码行高亮显示

💡 **提示**：这是查看代码最快的方式！

---

**操作 3：拖拽节点**
```
1. 拖动 ArticleController 节点
2. 观察 ArticleService 的 2 条弧形连线
3. 注意两条边的弯曲方向不同
```

✅ **预期效果**：
- 节点跟随鼠标移动
- 连接的边自动跟随
- **ArticleController → ArticleService 的 2 条边**清晰分离
  - 一条向右弯（uses）
  - 一条向左弯（calls）
- **UserEntity 的 2 条入边**也清晰分离
- 物理引擎会轻微调整周围节点
- 松开后节点保持在新位置

---

**操作 4：缩放和平移**
```
缩放：滚动鼠标滚轮
平移：拖拽空白区域
```

✅ **预期效果**：
- 向前滚动：放大图谱
- 向后滚动：缩小图谱
- 拖拽背景：整个图谱跟随移动

---

**操作 5：使用工具栏**
```
点击右上角 "⛶" 按钮（适应窗口）
```

✅ **预期效果**：图谱自动缩放并居中，所有节点可见

```
添加新实体后，点击 "↻" 按钮（刷新）
```

✅ **预期效果**：图谱重新加载，显示最新的实体和关系

---

##### 1.6.3 关系网络的价值（2 分钟）

**场景**：你已经创建了 6 个关系，现在可以看到丰富的关系网络！

**观察图谱中的关系网络**：

从可视化图谱中可以清晰地看到：

1. **Controller 层 → Service 层**
   - UserController → UserService (uses)
   - ArticleController → ArticleService (uses)
   - ArticleController → ArticleService (calls)

2. **Service 层 → Service 层**
   - ArticleService → UserService (uses)

3. **Service 层 → Entity 层**
   - UserService → UserEntity (uses)
   - ArticleService → ArticleEntity (uses)
   - ArticleService → UserEntity (references)

**分层架构一目了然**：
```
Controller 层
    ↓ uses
Service 层
    ↓ uses/references
Entity 层（数据模型）
```

💡 **价值体现**：
- ✅ 7 个关系形成了一个连贯的依赖网络
- ✅ 清晰展示三层架构（Controller → Service → Entity）
- ✅ **ArticleService 是核心节点**（连接最多）
- ✅ **UserEntity 被多个服务依赖**（2 条入边清晰分离显示）
- ✅ **ArticleController 对 ArticleService 有两种关系**（uses 和 calls）
  - ✨ 两条边自动以不同弧线分离，一眼看出
- ✅ **多重边自动分离**：不需要手动拖动，就能看清所有关系 ⭐
- ✅ 标签字体大（16px）+ 描边，清晰可读

---

**可选：添加更多实体（演示用）**

如果想让图谱更丰富，可以添加：

```
1. 创建 CommentService 实体（service 类型）
2. 创建 AuthService 实体（service 类型）
3. 建立关系：
   - ArticleService → CommentService (uses)
   - UserController → AuthService (depends_on)
4. 点击 🔄 刷新按钮查看更新
```

这样就会有 **8 个实体，8 个关系**，图谱更加丰富！

```
┌─────────────────────────────────────────────────┐
│                                    [⛶] [↻]     │
│                                                 │
│         UserController                          │
│              ↙        ↘                         │
│         uses        depends_on                  │
│           ↙              ↘                      │
│    UserService        AuthService               │
│         ↑                (青色矩形)              │
│         │ uses                                  │
│         │                                       │
│    ArticleController                            │
│         │ uses                                  │
│         ↓                                       │
│    ArticleService                               │
│         │ uses                                  │
│         ↓                                       │
│    CommentService                               │
│    (青色矩形)                                    │
│                                                 │
│    UserEntity      ArticleEntity                │
│                                                 │
└─────────────────────────────────────────────────┘
```

**观察图谱变化**：
- ✅ 新节点 CommentService 和 AuthService 出现
- ✅ 自动布局调整，避免重叠
- ✅ 新的关系箭头显示
- ✅ Service 类型的节点显示为青色矩形
- ✅ 统计数据自动更新

---

##### 1.6.4 使用图谱进行影响分析（1 分钟）

**场景**：准备修改 UserService，想知道会影响哪些组件。

**操作**：
```
在可视化图谱中观察 UserService 节点
```

**分析结果**：

从图谱中一眼看出：
- **UserService** 被 **2 个组件**依赖：
  1. ← UserController (uses)
  2. ← ArticleService (uses)

**影响评估**：
```
修改 UserService 的接口
  ↓
需要同步更新：
  1. UserController（直接调用方）
  2. ArticleService（间接调用方）
  3. ArticleController（ArticleService 的调用方，可能受影响）
```

💡 **价值体现**：
- 传统方式：需要全局搜索 + 人工分析（10+ 分钟）
- 使用图谱：一眼看出依赖关系（10 秒）
- **效率提升 60 倍！** 🚀

---

##### 1.6.5 自动检测循环依赖（可选）⭐

**场景**：从图谱中自动发现潜在的架构问题。

**智能检测**：
```
插件会自动检测循环依赖
  ↓
用醒目的视觉效果标记出来
  ↓
帮助你快速发现问题！
```

**示例**：
假设我们错误地创建了：
- ArticleService → UserService (uses)
- UserService → ArticleService (uses)

**图谱显示（增强效果）**：
```
    ArticleService ────⚠️ uses────⤴
                               ↓
                  ⤷────⚠️ uses──── UserService
         灰色线条 + ⚠️ 警告图标
         (自动检测到循环依赖！)
```

**视觉增强特性**：

1. **⚠️ 警告图标**
   - 正常关系：`uses`
   - 循环依赖：`⚠️ uses`（标签旁显示警告图标）

2. **🖱️ 悬停提示**
   - 鼠标悬停在循环依赖边上时，显示"循环依赖"提示

3. **🌊 弧形分离**
   - 循环依赖的两条边自动分离，避免重叠
   - 形成美观的弧形

4. **🎨 视觉统一**
   - 线条颜色、粗细、样式与普通关系保持一致
   - 仅通过 ⚠️ 图标识别循环依赖
   - 简洁、美观、不突兀

5. **💬 控制台警告**
   - 自动输出：`⚠️ 检测到 N 个循环依赖！`

**实际效果示例**：

```
正常关系：
ArticleService ───uses───→ CommentService
  灰色、2px、实线

循环依赖：
ArticleService ────⚠️ uses────⤴
                           ↓
              ⤷────⚠️ uses──── UserService
  灰色、2px、实线、仅带 ⚠️ 图标
  （鼠标悬停显示"循环依赖"提示）
```

💡 **价值**：
- ✅ **自动检测**：无需手动查找，插件自动识别
- ✅ **低调警示**：仅用 ⚠️ 图标标识，不影响整体美观
- ✅ **视觉统一**：与普通关系保持相同的线条样式
- ✅ **清晰提示**：鼠标悬停显示"循环依赖"详情
- ✅ **及时重构**：发现问题后立即重构，避免技术债务
- ✅ **架构审查**：Code Review 时快速发现架构问题

**如何触发演示**：
```
1. 创建 ArticleService → UserService 关系
2. 再创建 UserService → ArticleService 关系（反向）
3. 点击 ↻ 刷新按钮
4. 立即看到红色粗虚线 + ⚠️ 警告！
```

---

##### 1.6.6 与树视图对比

**树视图 vs 图形化视图**

| 特性 | 树视图 | 可视化图谱 |
|------|--------|-----------|
| **展示方式** | 📁 列表形式 | 🕸️ 图形网络 |
| **查看关系** | 需要展开查看 | 一眼看出 |
| **影响分析** | 逐个点击查看 | 整体全局视角 |
| **跳转代码** | 单击跳转 | 双击跳转 |
| **适用场景** | 浏览所有实体 | 理解依赖关系 |
| **视觉直观性** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

**最佳实践**：
- 📁 **日常浏览**：使用树视图
- 🔍 **影响分析**：使用可视化图谱
- 🔄 **两者结合**：达到最佳效果

---

##### 1.6.7 小结

**你已经学会了**：
- ✅ 打开可视化图谱
- ✅ 理解节点颜色和形状的含义
- ✅ 使用交互功能（悬停、双击、拖拽、缩放）
- ✅ 刷新图谱查看最新数据
- ✅ 使用图谱进行影响分析
- ✅ 发现潜在的架构问题

**关键收获**：

🎯 **一图胜千言**：图形化展示比文本更直观  
⚡ **快速导航**：双击节点直接跳转到代码  
🔍 **全局视角**：一眼看出整个项目的依赖关系  
🐛 **发现问题**：可视化帮助发现循环依赖等架构问题  

---

### 第二部分：自动图谱生成（3 分钟）🆕

> 无需手动创建实体和关系，插件自动分析代码依赖！

#### 2.1 分析整个工作区（1 分钟）

**操作**：
```
1. 命令面板（Ctrl+Shift+P）
2. 输入 "Analyze Workspace"
3. 选择 "Knowledge: Analyze Workspace (Auto Graph)"
4. 等待分析完成（会显示进度）
```

**预期效果**：
- ✅ 进度条显示分析状态
- ✅ 自动提取所有类、接口、函数
- ✅ 自动识别 extends、implements、uses 关系
- ✅ 完成后显示统计信息

**注意**：每次分析会自动清除旧数据，确保结果最新

---

#### 2.2 切换到自动图谱视图（1 分钟）

**操作**：
```
1. 命令面板 → "Knowledge: Visualize Graph"
2. 点击顶部 "⚡ 自动图谱" 按钮
```

**预期效果**：
```
┌─────────────────────────────────────────────────┐
│ 📝 手动图谱  | ⚡ 自动图谱 | 🔗 合并视图      │
├─────────────────────────────────────────────────┤
│                                                 │
│    UserController ──extends──→ BaseController   │
│         │                                       │
│        uses                                     │
│         ↓                                       │
│    UserService ────uses────→ UserEntity        │
│         ↑                                       │
│        uses                                     │
│         │                                       │
│    ArticleService ──uses──→ ArticleEntity      │
│                                                 │
└─────────────────────────────────────────────────┘
```

**自动检测的关系类型**：
- `extends` - 类继承（如 `UserController extends BaseController`）
- `implements` - 接口实现
- `uses` - 依赖使用（构造函数注入、成员变量、返回类型、@Module 装饰器等）

---

#### 2.3 查看自动图谱统计（1 分钟）

**操作**：
```
1. 命令面板 → "Knowledge: View Auto Graph Statistics"
```

**预期效果**：
```
📊 自动图谱统计

实体数量：45
  - class: 20
  - interface: 15
  - function: 8
  - variable: 2

关系数量：62
  - uses: 50
  - extends: 5
  - implements: 7
```

💡 **与手动图谱的区别**：
- 自动图谱：快速理解代码依赖，每次分析自动重建
- 手动图谱：记录设计决策、重构笔记，支持观察记录

---

### 第三部分：RAG 持久知识库（5 分钟）🆕

#### 3.1 配置 Gemini API Key（1 分钟）

**操作**：
```
1. 命令面板（Ctrl+Shift+P）
2. 输入 "Preferences: Open Settings (UI)"
3. 搜索 "Gemini API Key"
4. 找到 "Knowledge Graph > Gemini: Api Key"
5. 填入你的 Gemini API Key
6. 保存设置
```

**预期效果**：
- ✅ 弹出提示："✅ Knowledge Graph RAG 功能已启用！新增文档将自动索引到云端。"
- ✅ 侧边栏出现 "Documents (RAG)" 视图

**获取 API Key**：
- 访问 https://aistudio.google.com/apikey
- 登录 Google 账号
- 创建或复制 API Key

---

#### 3.2 添加文档到 Knowledge 文件夹（1 分钟）

**操作**：
```
1. 在项目根目录创建 Knowledge/ 文件夹
2. 添加一些文档：
   - architecture.md（架构文档）
   - database-design.pdf（数据库设计）
   - api-guide.txt（API 指南）
3. 保存文件
```

**预期效果**：
- ✅ 文件自动被检测到
- ✅ 后台自动上传到 Gemini File Search Store
- ✅ 侧边栏 "Documents (RAG)" 显示文档列表
- ✅ 控制台输出：`Indexing file: Knowledge/architecture.md`

💡 **支持的格式**：PDF、TXT、MD、DOCX、JSON、TS、JS 等 100+ 种格式

---

#### 3.3 使用 Ask Question 进行智能问答（2 分钟）

**操作**：
```
1. 点击侧边栏 "Documents (RAG)" 的问号图标 (?)
   或命令面板 → "Knowledge: Ask Question"
2. 输入问题，例如：
   "项目使用了哪些数据库？"
   "如何实现用户认证？"
   "文章模块的 API 有哪些？"
3. 等待 Gemini 分析（约 3-5 秒）
```

**预期效果**：

打开一个新的 Markdown 文档，显示：

```markdown
# 💬 RAG 问答结果

**问题**：项目使用了哪些数据库？

**回答时间**：2025/11/15 18:30:45

---

## 🤖 AI 回答

项目使用 **MySQL** 作为主数据库，通过 **TypeORM** 进行数据访问。
配置中还提到了使用连接池，大小设置为 20。

---

## 📚 来源引用（Grounding）

1. **architecture.md**
   - 提到了 TypeORM + MySQL 的技术栈

2. **database-design.pdf**
   - 包含完整的数据库表结构设计

---

_💡 点击文件名可以直接跳转查看原文档_
```

✅ **关键特性**：
- AI 基于文档内容回答
- 显示来源引用（Grounding Metadata）
- Markdown 格式，可复制内容
- 可以保存为文件

---

#### 3.4 查看 RAG Store 信息（1 分钟）

**操作**：
```
1. 点击侧边栏 "Documents (RAG)" 的信息图标 (ℹ️)
   或命令面板 → "Knowledge: View RAG Store Info"
```

**预期效果**：

打开一个新的 Markdown 文档，显示：

```markdown
# RAG Store 信息

**项目名称**：nestjs-realworld-example-app
**Store 名称**：`fileSearchStores/vibecodingnestjsrealworldex-xxx`
**工作区路径**：`d:\workspace\nestjs-realworld-example-app`

## 📊 文档统计（云端实时数据）
- **活跃文档数**：3
- **处理中文档数**：0
- **失败文档数**：0
- **总计**：3

## 📝 本地元数据
- **本地记录的文件数**：3
- **创建时间**：2025/11/15 18:25:30
- **最后同步**：2025/11/15 18:30:45

---

## 🔐 项目隔离说明
每个项目都有唯一的 **File Search Store**，确保文档不会与其他项目混淆。
```

💡 **项目隔离机制**：
- 每个项目自动生成唯一 Store ID（基于项目路径 hash）
- 多个项目使用同一 API Key 也完全隔离
- 文档索引不会混淆

---

#### 3.5 切换到本地 RAG（可选）

如果你的文档包含敏感信息，或需要离线演示，可以切换到本地 RAG 模式（基于 SQLite + 内存向量缓存）。

**操作**：
```
1. 设置 → 搜索 "Knowledge Graph RAG Mode" → 选择 "local"
2. 配置以下选项：
   - Knowledge Graph > Rag: Local Api Base  （例如 http://localhost:11434/v1 或其他 OpenAI 兼容接口）
   - Knowledge Graph > Rag: Local Api Key    （若接口需要鉴权则填写）
   - Knowledge Graph > Rag: Local Embedding Model  （如 text-embedding-3-small / nomic-embed-text）
   - Knowledge Graph > Rag: Local Inference Model  （如 gpt-4.1 / llama3）
3. 命令面板 → "Knowledge: Rebuild RAG Index"（第一次切换建议重建）
4. 重新触发 Ask Question，回答即来自本地向量库 + 本地推理接口
```

**提示**：
- 向量数据保存于 `.vscode/.knowledge/graph.sqlite` → 可随代码一起保存或清理
- 插件启动时会自动将向量加载到内存，使用余弦相似度进行检索
- 本地模式与云端模式共用相同的 UI（Ask Question / View Store Info / Rebuild Index）

#### 3.6 本地问答与调试（可选）

**演示建议**：
1. 在本地模式下运行一次 Ask Question，展示结果仍会列出来源文件（source = test1.txt 等）
2. 打开输出面板，可看到 “Using Local RAG Provider”、“Locally indexed: xxx”等日志
3. 如果需要重置本地向量库，可删除 `.vscode/.knowledge/graph.sqlite` 或执行 `Rebuild RAG Index`
4. Ask Question 失败时，先运行 `Knowledge: Test Connection` 检查本地 API 状态

---

#### 3.7 增量索引和重建索引（选读）

**增量索引**：
- ✅ 已索引的文档不会重复上传
- ✅ 只有新增或修改的文档会被上传
- ✅ 每次启动插件时自动检查

**重建索引**：

如果本地和云端不同步（例如删除了本地文件），可以：

```
1. 点击侧边栏 "Documents (RAG)" 的刷新图标 (🔄)
   或命令面板 → "Knowledge: Rebuild RAG Index"
2. 确认操作
3. 等待完成（会删除云端 Store 并重新上传所有文档）
```

⚠️ **注意**：Rebuild 会删除云端所有文档并重新上传，确保本地和云端完全一致。

---

## 🎉 演示完成

**恭喜！你已经掌握了 VibeKnowledge 的核心功能：**

### ✅ 学会的技能
1. 创建实体（Create Entity）
2. 添加观察记录（Add Observation）
3. 建立关系（Link to Entity）
4. 树视图查看
5. **可视化图谱** 🌟
6. **自动图谱生成** 🆕
7. **RAG 智能问答** 🆕

### 🌟 核心功能价值

**可视化图谱**：
- 🕸️ 图形化展示项目架构
- ⚡ 双击节点跳转代码
- 🔍 快速影响分析
- 🐛 自动检测循环依赖

**自动图谱生成** 🆕：
- 📊 静态分析自动提取实体和关系
- 🔗 支持 extends、implements、uses 等关系
- 🎯 NestJS @Module 装饰器分析
- 🏗️ TypeORM 实体关系检测
- 🔄 每次分析自动清理重建

**RAG 智能问答**：
- ☁️ 云端托管的语义搜索
- 🤖 基于文档的智能问答
- 📚 来源可追溯（Grounding）
- 🔐 多项目完全隔离
- ⚡ 增量索引，高效快速

### 📖 进一步学习

完整功能请查看：
- 📄 README.md - 完整功能说明
- 📚 docs/ - 详细文档

---

## 💡 最佳实践

### 日常开发工作流

1. **阅读代码时**
   ```
   遇到重要类 → 创建实体 → 添加描述
   发现调用关系 → Link to Entity
   有经验教训 → Add Observation
   ```

2. **重构前**
   ```
   运行自动图谱分析 → 切换到自动图谱视图 → 查看完整依赖关系
   或：打开手动图谱 → 查看标注的关键依赖 → 评估影响范围
   ```

3. **Code Review 时**
   ```
   发现重要模块 → 标记实体
   发现架构问题 → 添加观察
   查看图谱 → 检查循环依赖
   ```

4. **管理项目文档** 🆕
   ```
   写架构文档 → 放到 Knowledge/ 文件夹 → 自动索引
   需要查找信息 → Ask Question → AI 基于文档回答
   ```

5. **使用 AI 编程工具 / 本地 RAG** 🆕
   ```
   需要云端托管 → 配置 Gemini API Key
   需要离线/私有 → 切换 RAG Mode = local，配置本地接口
   使用 Cursor/Copilot → AI 可以访问最新的项目文档
   ```

### 团队协作

1. **知识图谱随代码提交**
   ```bash
   git add .vscode/.knowledge/
   git commit -m "Add knowledge graph for user module"
   ```

2. **项目文档共享** 🆕
   ```bash
   git add Knowledge/
   git commit -m "Add architecture documentation"
   # 团队成员 clone 后，文档自动索引到各自的云端 Store
   ```

3. **新人入职**
   ```
   打开项目 → 查看图谱 → 快速理解架构
   配置 API Key → 文档自动索引 → Ask Question 快速上手
   ```

4. **多项目开发** 🆕
   ```
   使用同一个 API Key 在多个项目中
   → 每个项目自动隔离到独立的 Store
   → 文档不会混淆；本地模式则各自拥有独立的 SQLite 向量库
```

---

## 🚀 开始使用

现在你可以：
1. 在你的项目中使用 VibeKnowledge
2. 标记核心实体和关系
3. 使用可视化图谱理解项目架构
4. 配置 Gemini API Key，启用 RAG 功能
5. 在 Knowledge/ 文件夹添加项目文档
6. 使用 Ask Question 进行智能问答
7. 让知识随代码一起演进

**Happy Coding!** 🎉

---

## 📚 附录

### 常用命令

| 命令 | 快捷键 | 说明 |
|------|--------|------|
| Create Entity | 右键菜单 | 创建实体 |
| Add Observation | Hover → 点击 | 添加观察 |
| Link to Entity | 右键菜单 | 建立关系 |
| Visualize Graph | Ctrl+Shift+P | 可视化图谱 |
| View Entity Details | 右键菜单 | 查看实体详情 |
| **Switch Language** 🌐 | 侧边栏 (🌐) / Ctrl+Shift+P | 切换中英文界面 |
| **Analyze Workspace** 🆕 | Ctrl+Shift+P | 自动分析工作区 |
| **View Auto Graph Stats** 🆕 | Ctrl+Shift+P | 查看自动图谱统计 |
| **Clear Auto Graph** 🆕 | Ctrl+Shift+P | 清空自动图谱 |
| **Ask Question** 🆕 | 侧边栏 (?) | RAG 智能问答 |
| **View Store Info** 🆕 | 侧边栏 (ℹ️) | 查看 RAG Store 信息 |
| **Rebuild RAG Index** 🆕 | 侧边栏 (🔄) | 重建云端索引 |
| **Test Gemini API** 🆕 | Ctrl+Shift+P | 测试 API 连接 |

### 实体类型

| 类型 | 图标 | 颜色 | 说明 |
|------|------|------|------|
| class | 椭圆 | 红色 | 类 |
| function | 方框 | 蓝色 | 函数 |
| service | 矩形 | 青色 | 服务 |
| component | 菱形 | 绿色 | 组件 |
| entity | 六边形 | 橙色 | 数据实体 |

### 关系类型

- `uses` - 使用关系
- `calls` - 调用关系
- `depends_on` - 依赖关系
- `implements` - 实现关系
- `extends` - 继承关系
- `references` - 引用关系

---

**更多问题？** 查看 README.md 或提交 Issue！

---

## 🔚 End of Demo

**感谢使用 VibeKnowledge！**
