# 两项改动前影响分析（Arm A）

分析范围：仅检查分配工作区源码与现有测试；未运行测试、构建、MCP 或联网，也未修改产品代码。以下路径均相对于 `D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-ab-jzyaQm/pair-1/A`；`路径:行号` 为源码证据。未标为“推论/缺口”的行为描述均来自实现；测试条目表示测试代码的断言范围，不表示本次已执行或验证通过。

## 1. Visualization：当前视图、响应性与动画

### 1.1 从用户命令到浏览器页面

`knowledge.visualizeGraph` 同时有命令贡献和 Knowledge Graph Explorer 标题栏入口（`package.json:57`、`package.json:244`）。扩展注册处理器，调用 `GraphView.createOrShow(context.extensionUri)`，同步打开失败会记录日志并显示 `Error opening graph`（`src/extension.ts:643`）。扩展初始化时注入 `KnowledgeGraphService` 和 `StructuralGraphService`（`src/extension.ts:242`）。

`GraphView.currentPanel` 是单例。已有面板先 reveal；标题与当前翻译相同就只发图谱数据，不重建 HTML；标题不同则 `_update()` 重建 HTML。新面板启用脚本和 `retainContextWhenHidden`，构造时生成页面并注册消息、销毁及配置监听（`src/ui/webview/graphView.ts:128`、`:157`、`:199`）。页面通过 `asWebviewUri` 加载本地 `dist/d3.min.js`，使用 CSP 和随机 nonce；将性能辅助脚本内嵌到实际页面（同文件 `:718`、`:751`、`:1137`）。

浏览器 `load` 先 `initGraph()`，再发送 `ready`；宿主依次发送有效性能模式和 `graphData`。前端收到后调用 `applyPerformanceMode()`、`setGraphGroups()`（同文件 `:205`、`:263`、`:1205`、`:1280`）。因此，配置初始化、D3 初始化、分组选择和渲染不是一回事，不能仅修改命令处理器就实现页面视图恢复。

### 1.2 普通分组与高级结构视图

普通视图使用 `KnowledgeGraphService.getGroups()`，不是去重后的 `getSnapshot()`。各组保留相同符号在不同模块/功能中的独立出现与 ID；宿主把实体、关系、来源、描述、结构键、证据和 structuralPath 转成页面模型（`src/services/knowledgeGraphService.ts:147`；`src/ui/webview/graphView.ts:456`）。当前 `getObservations()` 返回空数组，因此观察记录 UI 字段存在不等于当前服务提供了观察记录（`src/services/knowledgeGraphService.ts:256`）。

页面按 `order`、然后 `name` 排序；侧栏每组显示名称、类别及实体/关系数量。优先选已保存 key，找不到则选排序后第一组；点击只渲染该组，并写 `vscode.setState({ selectedGroupKey })`。没有把全部组叠加进一个力导图（`src/ui/webview/graphView.ts:1372`、`:1423`、`:1449`）。空分组集合会停止旧布局/动画，清空画布及布局缓存，并显示空状态（`:1378`）。

高级入口是结构层级选择器（boundary / community / file）加独立按钮；仅改变选择器不会请求新图，要点击按钮才发送 `requestStructuralOverview`（`:1101`、`:2091`、`:2173`）。宿主读取已有结构图并调用共享 `aggregateStructuralGraph(..., { level, limit: 80 })`，不在此操作中生成结构图（`:324`）。结构图来自 `.vscode/.knowledge/structural-graph.json`，读取会解析并校验 schema；文件缺失、JSON/读取错误或 schema 错误可失败（`src/services/structuralGraph/structuralGraphService.ts:25`、`:63`、`:101`）。

聚合算法按层级分组、按实体数排名截断、只保留包含节点之间的跨组依赖边；边的 `count` 是总数，但每条聚合边最多附带 8 条原始关系样本（`resources/skills/vibeknowledge-dependency-graph/scripts/structural-analysis.mjs:391`）。转换后的概览 key 是 `__structural_<level>`；描述说明 80 节点截断，节点带 aggregateId/level/files，边带样本 structuralPath（`src/ui/webview/graphView.ts:518`）。**推论：双击聚合关系展示的是携带的原始关系样本，并不保证展开 count 对应的所有关系。**

高级结果与普通结果共用同一个侧栏、渲染器、缓存与性能模式。`upsertStructuralGroup()` 删除旧的所有 `__structural_` 组，再插入并选中新结果；一次只保留一个高级组，不是历史栈（`:1401`）。交互继续分流：

- 普通节点双击跳源码；Shift+双击有结构键的普通节点，或其右键菜单，请求结构邻居。
- 聚合节点双击请求原始切片；原始结构节点双击跳结构实体源码。
- 关系线及关系标签双击非空 structuralPath 请求原始关系切片。

证据：同文件 `:1601`、`:1685`、`:1761`。宿主普通跳转通过 KnowledgeGraphService 查 ID（包含独立组 ID 的后备查找），结构跳转通过结构键解析；外部节点/无工作区不会正常跳本地文件，位置从 1-based 转为编辑器 0-based（`src/services/knowledgeGraphService.ts:192`；`src/ui/webview/graphView.ts:647`、`:687`、`:705`）。

邻居查询使用双向、深度 1 的结构影响分析，去重后限制 120 关系、80 实体，并再次去除端点未包含的关系。聚合切片优先使用所选 files，限制 80 实体、120 关系；关系切片按 source/target/verb/文件/行号的完整身份匹配当前结构图。原始切片实体使用稳定哈希 ID，但组 key 带 `Date.now()`（同文件 `:340`、`:365`、`:407`、`:564`、`:627`）。**推论：陈旧 structuralPath 可能匹配不到当前关系而产生空切片；重复请求同一原始切片也通常不是同一个布局缓存 key。**

### 1.3 性能模式的实际影响

配置 `knowledgeGraph.visualization.performanceMode` 的 enum 为 low/high、默认 low、scope 为 machine；说明明确仅改变显示（`package.json:325`）。前端选择时立即应用并重绘当前组，然后禁用选择器、发 `setPerformanceMode`。宿主只接受这两个值，以 `ConfigurationTarget.Global` 保存；失败显示错误，成功或失败都在 finally 回发实际有效配置。页面收到回发后纠正模式并重新启用选择器；外部设置变化也会推送（`src/ui/webview/graphView.ts:150`、`:300`、`:2077`、`:2176`）。因此这是乐观 UI 加宿主确认/回滚，不是修改图谱内容，也不是用 webview state 存模式。

两种模式使用同样节点、关系、箭头、主要关系文字、来源样式、tooltip、分组与跳转能力。它们的差别是：

| 模式 | 布局和交互 | 视觉与预算 |
| --- | --- | --- |
| low | D3 自动模拟停止；未完成布局用 RAF 分批手动 tick。拖动停止布局、只移动被拖节点并更新相关几何，不让全图重新受力。fit 立即执行。 | 每批约 6ms，最多 120 tick 或累计计算约 600ms，或冷却即结束；批后显式 render（D3 手动 tick 不发 tick/end）。不创建粒子、流动虚线 class、发光或重复标签光晕；CSS 禁用动画/transition。 |
| high | 通常启动 D3 自动模拟；已完成缓存布局不重新模拟，拖动会升高 alphaTarget 并 restart。允许自动 fit 时 1 秒后开始，fit 用 750ms transition。 | 有粒子、虚线动画、glow、文字阴影、hover 动画；当前组选用一个约 30fps 的粒子 RAF 循环，即使物理模拟冷却后粒子也可继续；模拟结束缓存路径长度。 |

证据：`src/ui/webview/graphView.ts:1080`、`:1552`、`:1594`、`:1618`、`:1630`、`:1668`、`:1727`、`:1823`、`:1920`、`:2053`；`src/ui/webview/graphPerformanceScript.ts:46`、`:91`。**边界：600ms 是分批累计的计算预算，不是总墙钟时间保证；单次昂贵 tick/render 不能被该循环抢占。**

模式重绘先保存旧组几何，再尝试恢复，因此 low/high 切换不必重新打乱已稳定布局。用户缩放/平移的 sourceEvent 或开始拖动会关闭自动 fit；低模式完成布局后只在仍允许时 fit（`src/ui/webview/graphView.ts:1360`、`:1479`、`:1556`、`:1933`、`:1950`）。窗口尺寸变化 debounce 120ms；low 会直接 fit，high 在页面可见时轻微重新启动模拟（`:1210`）。**推论：用户关闭 auto-fit 不阻止 low 模式的 resize fit；如果改动目标是严格保留手动镜头，必须明确处理这个现存例外。**

### 1.4 哪些状态能够留下

| 场景 | 当前实现保存/恢复的状态 | 限制或会丢失的状态 |
| --- | --- | --- |
| 普通组 A → B → A，或性能模式重绘 | 前一个 render 的闭包按原 data.key 保存 x/y、zoom transform、alpha、settled、autoFit；匹配缓存后恢复。selectedGroupKey 写入 VS Code webview state。 | 缓存仅在当前 JS 页面内，受容量与拓扑签名约束；不存速度 vx/vy、固定 fx/fy 或整份实体/证据。 |
| 调命令 reveal 已有面板，标题未变 | HTML 保持；收到普通 graphData 后，仍存在的普通 key 会重选，缓存可恢复。 | graphData 完整替换 graphGroups，所以当前高级组会被删除并回退第一普通组；不是只把旧高级画布 reveal 出来。 |
| 隐藏后再显示同一页面 | retainContextWhenHidden 留下页面对象；visibilitychange 停止粒子、静态 RAF、simulation、D3 transitions、fit/resize timer，并保存布局。显示后恢复未完 low 布局，或尚未冷却的 high 模拟，再恢复 high 粒子。 | 已清除的 high 自动 fit timer 与 resize timer 在 visibility 恢复分支没有重建；不能声称所有待办行为都会恢复。CSS `graph-paused` 禁用动画。 |
| `_update()` 重建 HTML（如标题/语言改变） | 新脚本读取 `vscode.getState()?.selectedGroupKey`，再次收数据时尝试选它；模式重新读设置。 | Map 缓存和临时高级组属于旧 JS 页面，不会随 HTML 重建。 |
| 关闭后重新打开新面板 | dispose 清除 currentPanel 和监听器；新面板重新读全局性能设置。 | 没有在此生命周期把选择/布局写入持久化扩展存储或重建关闭面板的机制；不应把同一 webview 的 getState 当作跨关闭恢复。新面板无旧状态时选择首组。 |

证据：`src/ui/webview/graphView.ts:157`、`:186`、`:1141`、`:1254`、`:1272`、`:1372`、`:1449`、`:1479`、`:1556`；`src/ui/webview/graphPerformanceScript.ts:7`。上述关闭后行为的跨面板结论是基于实现缺少恢复路径的推论，并非本次真实 VS Code 生命周期实验。

缓存默认最多 8 组、总计 2000 节点，LRU 淘汰；拒绝超过单组节点/关系预算及非有限坐标。签名是排序后的节点 ID 和 sourceId/targetId/verb 元组，忽略描述、证据、关系 ID；所以文案/证据更新可复用几何，但拓扑变化不可复用旧几何。空组集合直接清缓存；空分支只把内存 selectedGroupKey 设 null，没有把 null 回写 webview state（`src/ui/webview/graphPerformanceScript.ts:8`；`src/ui/webview/graphView.ts:1378`）。

### 1.5 改动必须维护的边界与对应测试

- **视图身份与数据身份不能混合。** 必须保留独立分组 ID、单组渲染、结构/聚合 provenance 和跳转分流；缓存只存几何，不能恢复旧描述/证据。`src/services/knowledgeGraphService.test.ts:60` 检查重复符号留在独立组且 group ID 可定位；`src/ui/webview/graphPerformanceScript.test.ts:105` 检查文案变更可复用、节点/关系 verb 变化使缓存失效，`:119` 检查 LRU/节点预算，`:133` 检查未完成 alpha/autoFit 状态保存。后者只断言缓存字段，不是实际快速切组集成测试。
- **布局取消、冷却与后台暂停。** 新 render 必须停止旧 RAF/simulation/timers/transition，否则旧闭包可能继续改当前画布或耗 CPU；不能把尚未完成布局误标已完成。`graphPerformanceScript.test.ts:49`、`:65` 测批次/tick/时间/冷却预算，`:81` 测 hidden/pause/resume/stop 去重，`:95` 测 render 回调异常后无残留 RAF，`:142` 测 low 单节点移动和 high physics。这些通过 VM、假 RAF/clock/模拟器检查“实际嵌入的辅助脚本”，不是完整 D3 页面。
- **宿主确认/失败回滚。** `src/ui/webview/graphView.test.ts:58` 检查 manifest、双选项及生成 JavaScript 能编译；`:79` 检查 global 写入、已有 HTML 不重载以及重新创建读取模式；`:96` 检查设置事件、失败回发和非法值忽略。它们用 mock webview/配置，不执行前端选择器 change/message 交互，也不检查真实拖动、zoom 或隐藏后动画。
- **结构切片不是完整架构快照。** 80/120 上限、边端点一致性、关系证据样本和陈旧键错误需要保留/说明。`src/services/structuralGraph/structuralAnalysis.test.ts:15` 测源码支持的影响与路径，`:60` 测 community 建议/聚合截断与 count，`:113` 测 containment 导航桥；没有覆盖 GraphView 消息适配、结构组替换、节点/边双击、按 files 下钻或上述上限的页面结果。
- **错误必须终止合适的工作且可见。** `selectGraphGroup()` 捕获同步 render 错误，静态布局 failed 回调同样进 `showRenderError()`，该函数停止主要布局工作并显示 alert；结构错误则发 structuralError、warning，并由页面停止 loading、显示状态，保留旧视图（`graphView.ts:1449`、`:1465`、`:450`、`:1296`）。`src/ui/webview/graphWebviewClientScript.test.ts:6` 回归检查关系 tooltip 格式化不抛错、证据和 raw-path 提示；不能代表整个渲染错误路径。D3 未加载导致 `initGraph()` 抛错发生在 selectGraphGroup 的 try/catch 之外，可能连 ready 都不发送（`:1205`）。

**重要覆盖缺口/推论：** 检查到的现有测试不足以证明整个页面中的 selectedGroupKey 恢复、普通/高级组来回切换、HTML 语言重建、真实 close/reopen、真实 visibility 事件下的粒子取消、手动镜头与 auto-fit 竞争、连续 resize、旧布局不得污染新布局、D3 资源/CSP 加载、异步粒子/自动模拟错误处理。特别是“performance reopened”测试只验证设置重读，不能扩张解释为选组和几何跨关闭恢复。以上关注页面交互，没有分析后台源文件刷新流程。

## 2. Generate Copilot Instructions：输入、内容与写入合同

### 2.1 UI → 数据准备 → 写文件 → 完成通知

命令贡献是 `knowledge.generateCopilotInstructions`（`package.json:86`）；扩展注册 async 处理器并 await `entityCommands.generateCopilotInstructions()`，外层有日志与英文错误兜底（`src/extension.ts:680`）。EntityCommands 被注入实体/关系/观察记录与统一 KnowledgeGraphService，并在构造时创建 AIIntegrationService（`src/extension.ts:246`；`src/ui/commands/entityCommands.ts:23`）。

实际命令先取 `workspaceFolders?.[0]`，没有工作区就显示本地化错误并返回；它不选择当前编辑文件所在根，也没有工作区选择框。进入 try 后调用 `getGraphData()`：取统一 snapshot，再逐实体调用 `getObservations()`，封装 entities/relations/observations/sourceType=`knowledge`，然后把第一工作区 fsPath 和 graphData 交给 service（`src/ui/commands/entityCommands.ts:43`、`:1255`）。当前观察记录服务回传空数组（`src/services/knowledgeGraphService.ts:256`）。

service 只检查 `<root>/.github` 是否存在，不存在就 `mkdirSync(..., { recursive: true })`；固定目标为 `<root>/.github/copilot-instructions.md`，从 builder 得到字符串，`fs.writeFileSync(..., 'utf-8')`，返回路径（`src/services/aiIntegrationService.ts:71`）。命令收到路径后显示成功通知，供选择 Open file 或 Show in folder；选择后分别 open/show document 或 execute `revealFileInOS`；关闭通知不会撤销生成（`src/ui/commands/entityCommands.ts:1269`）。

**现存可直接推导的通知问题：** 调用方把 `.github/` 加在 basename 前，英/中 success 模板又加 `.github/`，因此单项成功通知会显示 `.github/.github/copilot-instructions.md`。真实写入路径没有重复目录（`src/ui/commands/entityCommands.ts:1271`；`src/i18n/en.ts:293`；`src/i18n/zh.ts:294`）。

### 2.2 哪些“输入/依赖”实际改变内容

当前产物不是项目摘要，而是固定英文的 agent 查询导航说明。`generateCopilotInstructions(workspaceRoot, _graphData?)` 明确不使用 graphData；builder 固定调用共享 router，locale=`en`、title=`# VibeKnowledge Agent Instructions`；router 从固定文本数组 join 换行（`src/services/aiIntegrationService.ts:71`、`:404`、`:411`）。

| 看起来可能影响输出的项目 | 实际效应 |
| --- | --- |
| workspaceRoot / 工作区名称 | root 决定写到哪里及文件系统是否允许；Copilot 内容不使用项目名/root。两个可写工作区会获得相同正文。 |
| entities、relations、descriptions、observations、sourceType | UI 确实收集和传入，但 Copilot builder 不读取；缺省 graphData 也不会在此方法回退调用数据库。空图仍可生成同样正文。 |
| EntityService / RelationService / ObservationService / DependencyAnalyzer | AIIntegrationService 构造保存依赖并 new DependencyAnalyzer；后者构造只保存服务。没有在当前 Copilot builder 做统计或依赖分析。 |
| UI 语言 / getLocale | Copilot 固定英文；本地化影响 UI 提示。Cursor 的入口才调用 getLocale，决定 zh 或 en。 |
| package.json、pom.xml、Python 清单、版本、aiConfig.maxRelationsDisplay | 类里存在读取/提取/展示代码，但它们不在当前 Copilot 或当前 Cursor router 的调用链上。 |
| 自定义 AI 模板、当前 scenario | 当前 router 不调用模板读取器。切换场景后可提示重新生成所有配置，但不会因此使当前两份 router 的内容带场景信息。 |
| MCP 是否已安装、索引/审计文件是否存在、LLM/API key/RAG | 它们在正文中被引用或在系统别处存在，但生成器没有查询 MCP、读取导航索引、执行模型或验证这些资源。 |

证据：`src/services/aiIntegrationService.ts:45`、`:101`、`:404`、`:411`；`src/services/dependencyAnalyzer.ts:50`。类里保留的旧 `buildCursorRulesContentCN/EN` 会用工作区名、图数据、统计、技术栈和模板（`aiIntegrationService.ts:114`、`:259`），但当前 `buildCursorRulesContent()` 直接走 router，没有调用这两者。模板辅助方法会读 ScenarioManager，maxRelationsDisplay 读配置，技术栈辅助函数会探测项目清单（`:691`、`:718`、`:857`）；这些函数的存在/导入不能作为当前 Copilot 输出的数据依赖证明。

**重要因果区别：** graphData 对正文无影响，不代表 UI 命令不依赖图数据路径。`getGraphData()` 在写文件前执行，所以其中抛错仍会阻止这份固定文件生成；直接调用 AIIntegrationService 则不需要它。当前多余数据准备也有遍历成本。做项目化改动时，不能把“已有参数”误当作“已有项目摘要实现”（`entityCommands.ts:43`、`:1262`；`aiIntegrationService.ts:71`）。

### 2.3 共享实现与产物的用途

Copilot 和 Cursor 共用 `buildAgentKnowledgeRouterContent(locale, title)`。Cursor 固定输出 `<root>/.cursorrules`，入口根据 getLocale 选标题/语言；Copilot 固定英文（`src/services/aiIntegrationService.ts:58`、`:101`、`:404`）。因此修改共享 router 会同时影响两种工具；修改 Copilot wrapper 的内容策略可以只影响 Copilot，但全量生成仍会调用它。

全量有两条编排：service 的 `generateAllAIConfigs()` 顺序 await Cursor、Copilot，返回路径数组；UI 的同名命令**不调用这个 service 聚合方法**，而是在不可取消 progress 内直接顺序调用两个单项方法，最后提供打开两个文件的通知（`aiIntegrationService.ts:89`；`entityCommands.ts:1290`）。场景切换在用户确认后执行 `knowledge.generateAllAIConfigs`，所以复用 UI 这条链（`src/commands/scenarioCommands.ts:62`）。

生成正文的意图是让后续 agent 在架构、陌生代码、跨文件、依赖和影响分析时：MCP 可用则先做聚焦 query_graph；需要时局部扩展、仅审计时取证据；MCP 不可用/无有效结果时才读 agent-context index 并选一个最匹配组；不默认加载整份 knowledge-graph.md；已知文件的小任务可跳过图谱；修改/测试前核验当前源码；不要改 graph.sqlite（`aiIntegrationService.ts:435`）。**这是写给未来消费者的文本策略，不是生成器执行这些动作。** 此调用自身创建/覆盖配置文件并可打开编辑器/文件夹，不安装或启动 Copilot/MCP、不生成/更新知识图谱、不执行 query_graph、不加载完整图、不修改业务代码或运行测试；也不验证 Copilot 实际加载了该文件。

### 2.4 已有目标与错误处理

- **已有文件无保护覆盖。** 只检查父目录，完全不检查目标文件已有内容；默认 writeFileSync 会覆盖/截断，未见合并、确认、备份、临时文件替换或事务。已有用户指令会被替换。`.github` 存在但不是目录、无权限、磁盘/路径错误等会使写入拒绝（`aiIntegrationService.ts:71`）。
- **service 向上传播。** 方法标记 async，但目录和写入操作是同步 fs；没有内部 catch。失败成为 rejected Promise，直接 service 调用者必须处理；新建了父目录后再失败也无清理/回滚。
- **UI 显示错误并吞掉常规异常。** 数据准备、生成、成功通知 await，以及后续打开/显示文件夹都在同一个 try/catch。任一步失败显示本地化 generation error，方法不重新抛出（`entityCommands.ts:1262`、`:1282`）。因此成功写入后若“打开文件”失败，也会显示“生成失败”，但文件已存在；外层 extension catch 通常收不到已吞掉的异常，不能把命令 Promise 正常完成等同于生成成功。
- **全量生成不原子。** 顺序 Cursor → Copilot；第一个失败不执行第二个，第二个失败则第一份已经写入/覆盖，后续不回滚。UI 不显示“全部成功”而进入 catch；直接 service 聚合方法不会返回部分路径数组，而是拒绝（`aiIntegrationService.ts:89`；`entityCommands.ts:1306`、`:1332`）。

以上覆盖/部分成功/打开失败后文件仍在，是由操作次序和无回滚代码推导的故障结果，未通过故障注入执行。

### 2.5 现有测试覆盖与改动风险

`src/services/aiIntegrationService.test.ts:68` 在临时工作区放一个 ai-template marker，用空服务对象直接生成 Copilot，并读取返回路径内容。它检查索引路径、query_graph/get_neighbors/shortest_path/includeEvidence、单组回退、不默认读完整报告，以及不含 marker、Tech Stack、Dependency Details、Total Entities。它支持“紧凑导航说明、无图谱 dump、不需要实体服务查询”的当前合同；没有传入非空 graphData，也没有验证 UI 数据准备/通知链。测试创建的是 ai-template.md marker，不是对 ScenarioManager 场景切换的专门 spy 测试。

`:100` 对 Cursor 检查 query-first 和无模板/图谱 dump，约束共享 router。`:121`、`:144` 测试技术栈辅助函数不把 @types/node 当 Node runtime、接受 engines/.nvmrc；它们通过类型强转直接调用私有辅助方法，**不能证明 Copilot 正文会使用技术栈，也不是项目特异性生成测试**。测试服务初始化于 `:42`，vscode/workspace 配置被 mock 于 `:16`。

在检索到的 src/tests/packages 测试中，没有找到该命令或全量 UI 编排的专门测试。重要缺口：

1. 非空/相互不同图数据、不同工作区名称/技术栈/scenario 对现输出恒定的显式对照；Copilot 英文固定与 Cursor 中英文分支；共享 builder 改动是否误伤另一产物。
2. 已有用户文件覆盖合同、已有 `.github`、目录不是目录、mkdir/write 失败及写入中途失败；没有原子性/保留用户内容断言。更项目化的输出通常更值得保存，必须先明确覆盖与合并策略。
3. UI 无工作区、多根工作区目标选择、getGraphData 失败；成功通知重复 `.github/`；Open file / Show in folder / dismiss 和写入成功但打开失败的语义。
4. 全量调用顺序、部分成功与错误传播；UI 吞异常与直接 service 拒绝的区别；通知不能当作完整文件系统事务结果。
5. 紧凑性目前主要靠字符串包含/排除断言，没有长度预算、精确全文件内容、完整工具契约、实际 Copilot 加载或 MCP/索引存在性集成测试。让内容更项目化不能凭现有测试证明不会引入大图 dump、陈旧事实、无证据结论或额外图谱/模型操作。

**改动前结论：** 若目标是项目化正文，真正需要改的是 builder 的数据选择与输出合同，而不只是继续在 UI 传 graphData。应明确哪些当前源码事实进入文件、如何保持共享 router 的按需导航意图、是否继续固定英文，以及用户已有内容与部分失败如何处理；当前实现与测试均不能代替这些产品决定。
