# VibeKnowledge 知识图谱改造计划

状态：Phase 1、Phase 2、Phase 3、Phase 4、Phase 5、Phase 6 已实施，准备进入 Phase 7
最后更新：2026-09-03

## 目标

把当前由 Agent 主导生成的分组知识图谱，改造成“确定性结构提取 + Agent 语义收敛 + 按需局部查询”的双层系统。

改造后的系统应当：

- 让 Coding Agent 默认查询与任务相关的局部子图，而不是加载完整报告；
- 用确定性程序提取代码事实，减少模型生成成本和不同运行之间的波动；
- 保留当前框架、模块、功能分组的高信号视图，避免把全量调用图直接展示给用户；
- 支持文件级增量更新，不因少量代码变化而重新分析整个工程；
- 保留关系 Evidence、完整人工审计报告和 SQLite 中的人工描述覆盖；
- 能用实际 Coding Agent 任务验证 token、耗时和正确率是否改善。

## 核心原则

1. **查询优先**：Agent 先查询局部子图，查询不足时才读取源码或完整审计报告。
2. **事实与语义分离**：AST/编译器提取代码事实；Agent 负责业务边界、命名、描述和歧义判断。
3. **原始图与视图图分离**：完整结构图用于检索和分析，精选分组图用于展示和上下文导航。
4. **兼容优先**：现有 `agent-graph.json` v2、人工描述覆盖和已生成分组继续可用。
5. **证据可审计**：Evidence 不删除；MCP 默认省略正文，用户或 Agent 可按需请求。
6. **增量且安全**：只更新受影响文件；解析异常时不得把正常大图静默覆盖为空图或明显缩小的图。

## 目标架构

```text
Workspace source
    │
    ├── Deterministic structural extractor
    │       ├── per-file nodes and edges
    │       ├── cross-file symbol resolution
    │       └── provenance and confidence
    │
    └── .vscode/.knowledge/structural-graph.json
                    │
                    ├── graph query and impact analysis
                    │
                    └── boundary reducer + Agent semantic pass
                                │
                                └── agent-graph.json v2
                                      ├── framework view
                                      ├── module/feature views
                                      ├── compact Agent context
                                      └── complete audit report

Coding Agent ──MCP query──> token-budgeted local subgraph
Human descriptions ──────> graph.sqlite overrides
```

### 数据产物

- `.vscode/.knowledge/structural-graph.json`
  - 新增的完整机器结构图；
  - 初始独立 schema 版本为 `1`；
  - 不默认进入 Webview，也不默认注入 Agent 上下文。
- `.vscode/.knowledge/agent-graph.json`
  - 继续作为精选框架/模块/功能视图的机器源；
  - 保持 v2 可读，新增字段先采用可选、向后兼容方式。
- `.vscode/.knowledge/knowledge-graph.md`
  - 保留完整人工审计报告，不默认注入 Agent 上下文。
- `.vscode/.knowledge/agent-context/`
  - 保留按分组的紧凑路由视图。
- `.vscode/.knowledge/cache/structural/`
  - 保存文件哈希、提取器版本和单文件提取结果。
- `.vscode/.knowledge/graph.sqlite`
  - 继续只保存人工描述覆盖等人工数据，不写入 Agent 生成的结构。

## 分阶段实施

### Phase 1：在现有图谱上实现局部图查询

目标：不等待 AST 提取器，先让当前 `agent-graph.json` 真正服务 Coding Agent，并建立 token 收益基线。

- [x] 在 MCP Server 中新增独立的图查询模块，基于现有 `AgentGraphStore` 构建邻接索引。
- [x] 实现 `query_graph`：
  - 支持自然语言关键词、`groupKey`、关系类型和路径过滤；
  - 默认选择不超过 3 个种子节点；
  - 默认深度为 2；
  - 默认 `tokenBudget` 为 2000；
  - 优先返回种子、较近节点和直接关系；
  - 默认 `includeEvidence=false`。
- [x] 实现 `get_entity`、`get_neighbors` 和 `shortest_path`。
- [x] 为高连接度节点增加遍历抑制，防止一个共享节点扩散出整个图。
- [x] 输出稳定排序的紧凑结果，避免相同查询产生无意义的顺序变化。
- [x] 更新 Copilot/Cursor/Agent 指令：已有图谱时先调用 MCP 局部查询；完整报告只用于架构审计。
- [x] 更新 `MCP_USAGE.md` 和工具测试。

验收标准：

- 相同输入产生稳定结果；
- `tokenBudget` 能实际限制输出，而不只是记录参数；
- Evidence 默认不出现，显式请求后能返回；
- 无路径、歧义种子、循环关系和空图均有测试；
- 现有 `search_entities`、关系查询和 RAG 工具保持兼容。

Phase 1 首轮测量结果：

- 样本：`D:/workspace/nestjs-realworld-example-app` 的四个现有分组；
- 完整 `knowledge-graph.md`：约 10,766 个内置估算 token；
- 4 个中文自然语言局部查询，预算均为 600 token：实际分别约为 550、567、566、542 token；
- 每个结果保留了 3–4 条实体详情和 4–5 条近距离关系；
- 相对完整报告，单次返回规模下降约 94.7%–95.0%；
- 该数字使用 VibeKnowledge 的混合中英文保守估算器，不代表特定模型 tokenizer 的精确账单值。后续 Phase 7 仍需用真实 Coding Agent 任务验证正确率和端到端 token。

### Phase 2：统一实体身份与关系来源

目标：避免不同生产者生成不一致的 key，并区分源码事实、解析推导和 Agent 判断。

- [x] 新增唯一的 `canonicalizeEntityKey` 实现，统一用于验证器、Extension 和 MCP。
- [x] 规范化需要处理路径分隔符、Unicode NFKC、大小写比较和冗余标点。
- [x] 首期只把 canonical key 用作匹配别名，不批量改写已有序列化 key，避免断开人工描述覆盖。
- [x] 为关系增加可选字段：
  - `origin`: `ast | resolver | agent`；
  - `confidence`: `extracted | inferred | review_required`。
- [x] 保留 Evidence 作为审计依据，不把 Evidence 与 confidence 混为一谈。
- [x] 更新 schema、Zod 解析、验证脚本、Markdown 渲染器和 Webview tooltip。
- [x] 为旧 v2 文件和缺少新字段的关系添加兼容测试。

验收标准：

- 旧 v1/v2 图谱仍可读取；
- 同一符号的路径和大小写变体可匹配到同一内部身份；
- 人工描述覆盖继续绑定原 stable key；
- 新字段不会强制触发 `agent-graph.json` 大版本升级。

Phase 2 实施结果：

- canonicalizer 的唯一可执行源位于 Skill 脚本目录；Extension 直接打包该实现，MCP 源码通过薄 re-export 使用它，发布构建将同一文件复制到 `dist`；
- validator 会拒绝同一分组内 canonical alias 冲突，但 stable ID、序列化 key 和 SQLite 人工覆盖仍保留原 key；
- Extension 聚合、MCP 查询和人工描述回绑都支持 canonical alias，歧义人工覆盖不会被自动猜选；
- `origin` 与 `confidence` 保持 v2 可选字段，旧 v1/v2 文件继续兼容，Evidence 仍为必填审计依据；
- 根项目 49 个测试和 MCP 80 个测试通过，Skill 校验、Extension 构建、MCP 构建和发布后 `dist` 模块加载均通过。

### Phase 3：实现 TypeScript/JavaScript 确定性结构提取

目标：让程序提取代码事实，Agent 不再承担全量源码事实抄录。

- [x] 定义 `structural-graph.json` schema 和验证器。
- [x] 第一阶段使用 TypeScript Compiler API 支持 `.ts`、`.tsx`、`.js`、`.jsx`。
- [x] 单文件第一遍提取：
  - 文件、类、函数、接口和重要变量；
  - imports/exports；
  - extends/implements；
  - 可直接确定的 calls/references；
  - NestJS module/controller/provider/decorator 信息。
- [x] 第二遍使用 import 和类型信息解析跨文件引用；只在唯一且有来源依据时生成解析关系。
- [x] 每条边写入 source location、origin 和 confidence。
- [x] 单文件解析失败时记录诊断并继续其他文件，不生成伪造关系。
- [x] 为 NestJS、普通 TypeScript、重导出、路径别名、同名符号和循环 import 建立 fixtures。
- [x] 预留语言适配器接口，后续可以接入 tree-sitter，但首期不引入 Python 运行时。

验收标准：

- 相同源码可生成字节级稳定或语义级稳定的结果；
- imports/exports 和明确类型关系不调用 LLM；
- 跨文件关系存在歧义时标记或省略，不猜测目标；
- 提取输出经过 schema 验证后才能落盘。

实施结果：

- `structural-graph.json` 使用独立的 version 1 schema；独立 validator 同时检查 schema、文件边界、内容 SHA-256 和源码行号；
- Extension 命令与安装后的 Skill CLI 复用同一份 `.mjs` 提取核心，输出在 schema 断言后原子替换；
- 两遍提取覆盖 TS/TSX/JS/JSX、NestJS 装饰器、imports/exports/extends/implements/calls/references，并为每条关系记录来源、置信度和源码位置；
- 解析错误按文件记录并跳过该文件的内部关系；同名通配重导出等歧义目标被省略且记录诊断；
- fixtures 覆盖 NestJS、普通 TS、JS/JSX、重导出、路径别名、同名符号、循环 import 和损坏源码；
- 根项目 54 个测试、MCP 80 个测试、Extension/MCP 构建、Lint（0 error）和 Skill 校验均通过。

### Phase 4：文件级缓存与增量合并

目标：代码小改动只更新受影响的结构和精选分组。

- [x] 缓存键包含文件内容 SHA-256、workspace 相对路径、extractorVersion 和 schemaVersion。
- [x] 缓存单文件节点、边和符号导入导出摘要。
- [x] 更新文件时先删除该文件贡献的旧结构，再合并新结构。
- [x] 删除文件时清理其节点、边和指向失效节点的解析关系。
- [x] 仅对可能受影响的 importers 重新执行跨文件解析。
- [x] 使用临时文件加原子替换写入图谱和缓存索引。
- [x] 增加异常缩小保护、损坏文件保护和显式 `--force`/确认恢复路径。
- [x] 文件监听采用 debounce，并合并短时间内的重复事件。

验收标准：

- 修改一个叶子文件时不会重新解析整个工程；
- 文件删除、重命名和解析失败不会留下悬空关系；
- 复制到不同绝对路径的 checkout 后缓存仍可复用；
- 增量结果与全量重建结果语义一致。

实施结果：

- 缓存位于 `.vscode/.knowledge/cache/structural/`，文件 entry 使用 cache/schema/extractor 版本、workspace 相对路径和内容 SHA-256 生成可迁移 key；
- entry 保存单文件实体、第一遍与解析后关系/诊断、外部端点以及 import、re-export、export、dependency 摘要；
- 更新时重新提取变更文件，并使用新旧依赖摘要的反向闭包仅重算可能受影响的 importer；删除与重命名按“旧文件删除 + 新文件加入”处理；
- 每次合并仍执行完整 schema 断言，确保删除文件不会留下悬空边；增量结果通过 fixture 与全量提取结果做深度语义一致性比较；
- 图谱、cache entry 和 active index 均使用临时文件原子替换；缓存损坏、已有源码突然解析失败或图谱异常缩小时保留旧图；
- CLI 提供显式 `--force`，VS Code 命令在人工确认后才执行强制全量重建；后台监听采用 500ms debounce，合并重复事件并串行更新；
- 根项目 61 个测试、MCP 80 个测试、Extension/MCP 构建、Lint（0 error）、Skill 校验和 VSIX 文件清单检查均通过。

### Phase 5：从结构图生成精选分组视图

目标：用完整结构图提高可靠性，同时继续保持当前视图简洁。

- [x] 实现边界收敛器，将底层符号折叠到稳定的模块或业务边界。
- [x] 框架层只保留：启动链路、根模块、顶层业务模块、跨模块直接依赖、共享基础设施和外部系统。
- [x] 模块/功能层按需展开 controller、service、repository、entity、API 和关键调用路径。
- [x] Agent 只负责边界命名、责任描述、歧义处理和无法由 AST 得出的业务语义。
- [x] 刷新单个分组时保留其他分组、顺序、stable key 和人工描述覆盖。
- [x] 记录精选关系对应的原始结构路径，支持从视图边追溯到底层证据。
- [x] 保留现有 Skill 的纯 Agent 模式作为提取器不可用时的降级路径。

验收标准：

- 框架图不会退化成全项目调用图；
- 普通项目的框架层仍以约 8–15 个实体、10–20 条关系为可读性目标；
- 每条精选关系可以追溯到源码 Evidence 或底层结构路径；
- 刷新目标分组不会改写无关分组。

实施结果：

- 新增确定性 `structural-condenser` 和 `curate-structural-graph` CLI；框架视图按启动、根模块、顶层边界、共享基础设施和重要外部系统收敛，同一方向的重复底层边被折叠为一条边界关系；
- NestJS 验收 fixture 从 36 个结构实体、100 条结构关系收敛为 9 个框架实体、10 条框架关系，未把 Controller、Service 或 Entity 泄漏到框架层；
- module/feature 范围会展开 NestJS Controller、路由、Service、Entity 和直接跨范围调用，并补全跨范围方法的所属容器；
- 单组合并保留其他分组、分组顺序、canonical 匹配后的原 stable key、Agent 维护的名称/描述，以及仍有端点的 Agent-only 业务关系；
- 每条确定性策展关系记录 Evidence 和 `structuralPath`；多跳路径带正反向 traversal，validator 会检查原始边匹配、路径连续性和起止端点；完整审计报告与显式 MCP Evidence 请求可展示路径，紧凑 Agent 视图继续省略 Evidence 和路径正文；
- Extension 新增 **Knowledge: Curate Graph from Structure**，可交互生成框架、模块或功能视图；Skill 主流程改为“确定性收敛 → Agent 语义审查 → 校验渲染”，并保留明确的纯 Agent 降级流程；
- 根项目 68 个测试、MCP 80 个测试、Extension/MCP 生产构建、Lint（0 error）、Skill 校验和 VSIX 文件清单检查均通过。

### Phase 6：图分析与 UI 增强

目标：把图用于架构诊断和变更分析，而不只是可视化。

- [x] 增加循环依赖检测。
- [x] 增加上游/下游影响分析和跨模块路径分析。
- [x] 增加高耦合节点和跨边界连接报告。
- [x] 增加结构图 diff：新增、删除和变化的节点/关系。
- [x] 自动社区检测仅作为“建议新增分组”的依据，不直接替换业务分组。
- [x] Webview 默认继续显示精选分组；原始结构图通过高级模式或节点下钻访问。
- [x] 大图按社区、模块或文件聚合，避免一次渲染全部底层节点。

验收标准：

- 用户可以从精选节点下钻到底层关系；
- 大图不会阻塞 Webview 或把框架视图重新变得杂乱；
- 分析结果都能链接到节点、关系或代码位置。

实施结果：

- 新增共享的确定性结构分析内核，Extension 与 MCP 共用循环、影响、路径、耦合、跨边界、diff、候选社区和聚合算法；默认忽略 `contains`/`exports` 这类非运行依赖边，减少结构噪声；
- 结构图发生实体或关系变化时自动保留上一份有效快照，无变化刷新不会覆盖 diff 基线；
- MCP 新增 `analyze_structure`、`analyze_impact` 和 `find_structural_path`，所有文本结果都受 token budget 限制，并携带 stable key、关系方向与源码位置；
- Webview 默认仍只加载精选分组；高级入口按 boundary/community/file 聚合且最多渲染 80 个节点，节点或关系下钻最多加载一个受限原始邻域；
- 社区检测只返回建议 key、scope 与文件集合，不修改 `agent-graph.json` 或人工业务分组；
- 根项目 74 个测试、MCP 83 个测试、Extension/MCP 生产构建、Lint（0 error）、深链非递归分析、发布后 MCP 模块加载和 VSIX 文件清单检查均通过。

### Phase 7：效果评测与发布

目标：证明知识图谱确实提升 Coding Agent 效率，而不是只增加维护成本。

- [ ] 建立固定任务集：定位功能、补测试、修改 API、评估变更影响、追踪循环依赖。
- [ ] 比较三种模式：
  1. 不使用知识图谱；
  2. 加载紧凑分组 Markdown；
  3. 使用 MCP 局部子图查询。
- [ ] 记录指标：输入/输出 token、读取文件数、工具调用数、完成耗时、答案正确率和遗漏率。
- [ ] 增加陈旧图谱场景，验证 Agent 是否能识别图谱时间戳并回退到源码。
- [ ] 根据评测调整种子数量、遍历深度、hub 阈值和 token budget。
- [ ] 补齐迁移文档、CHANGELOG 和版本发布检查。

发布门槛：

- 局部图查询相对完整 Markdown 在多数任务上减少上下文 token；
- 正确率不得因裁剪明显下降；
- 图谱过期或不完整时有明确提示和源码回退路径；
- 新功能不破坏人工描述覆盖和现有分组展示。

## 兼容与迁移策略

- `agent-graph.json` 保持 v2；关系的新 provenance 字段先作为可选字段加入。
- `structural-graph.json` 使用独立 schema 版本，避免与精选视图版本混淆。
- 不自动重写已有 entity key；内部 canonical key 用于匹配和迁移别名。
- MCP 新工具为增量新增，现有工具名和响应继续保留。
- 没有结构图时，查询引擎直接使用现有 `agent-graph.json`。
- 结构提取失败时，保留上一份有效图并显示诊断，不输出半成品覆盖它。
- Agent Skill 在新引擎稳定前保留当前人工分析路径。

## 主要风险

### 符号解析错误

对无法唯一定位的跨文件符号不建立高可信边；使用 `review_required` 或直接省略，并保留诊断。

### stable key 迁移断开人工描述

首期只增加内部 canonical alias，不改写现有 key；后续迁移必须生成旧 key 到新 key 的映射并经过显式验证。

### 原始图重新造成界面噪声

原始图不进入默认 Webview；默认视图始终是经过边界收敛的 framework/module/feature 图。

### 查询裁剪遗漏关键上下文

结果中返回截断标记和候选节点数量；允许 Agent 增加深度、预算或请求 Evidence，并保留源码回退路径。

### Extension 与 MCP 实现漂移

schema、canonical key 规则和查询响应契约必须有共享 fixtures；在能够稳定共享运行时代码前，用契约测试防止两端行为分叉。

## 第一实施切片

第一轮改造只实施 Phase 1，暂不引入新图谱格式：

1. [x] 在 `packages/mcp-server/src/` 新建图查询模块；
2. [x] 从 `AgentGraphStore` 构建分组感知的邻接索引；
3. [x] 注册 `query_graph`、`get_entity`、`get_neighbors`、`shortest_path`；
4. [x] 默认输出不含 Evidence 的紧凑子图，并严格执行 token budget；
5. [x] 增加单元测试和 MCP 使用文档；
6. [x] 用现有示例图谱完成第一轮 A/B token 测试。

完成这一切片后，再决定 Phase 2 和 Phase 3 是否并行推进。

## Definition of Done

- 所有阶段对应的自动化测试通过；
- 构建、Lint、Extension 测试和 MCP 测试通过；
- 新旧图谱文件和人工覆盖数据兼容；
- 默认 Agent 工作流不加载完整 `knowledge-graph.md`；
- 查询结果受 token budget 控制，并能按需返回 Evidence；
- 增量结果和全量重建结果通过一致性测试；
- A/B 评测证明至少在主要 Coding Agent 任务上有可量化收益。
