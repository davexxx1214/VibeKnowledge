# Arm B — visualization 与 Copilot Instructions 变更前分析

本报告只分析当前实现，没有修改产品代码，也没有执行测试、构建或生成图谱。MCP 局部查询用于定位入口和依赖；以下行为结论均回到源码核对。文中源码位置相对于本报告所在工作区。“推论/缺口”不是已执行的运行结果。

## 1. visualization

### 从命令到页面：实际显示的是哪个图

`knowledge.visualizeGraph` 在 manifest 中贡献为 “Knowledge: Visualize Graph”（`package.json:57`）。扩展激活时向 `GraphView` 注入统一知识图谱服务和结构图服务（`src/extension.ts:242`），命令调用 `GraphView.createOrShow(context.extensionUri)`，同步打开失败由外层记录日志并显示错误（`src/extension.ts:643`）。

`GraphView.currentPanel` 是单例入口。已有面板时先 reveal；标题仍匹配当前语言时只发送数据、不重新设置 HTML；标题变化时 `_update()` 替换 HTML。新建面板启用脚本和 `retainContextWhenHidden`，关闭后清空 `currentPanel` 并释放订阅（`src/ui/webview/graphView.ts:157`、`:186`、`:199`）。HTML 从扩展内 `dist/d3.min.js` 加载 D3，使用 webview URI 与 nonce/CSP，而非远程脚本（同文件 `:718`、`:751`）。

页面 `load → initGraph → ready`，扩展收到 `ready` 后发送当前性能模式和 `graphData`（同文件 `:1205`、`:205`）。`graphData.data` 含普通 `groups` 与 `mode: 'knowledge'`，客户端实际按 groups 处理（`:263`、`:1287`）。普通组来源是 `KnowledgeGraphService.getGroups()`，不是用于全局检索的去重快照：它保留不同 framework/module/feature 组中的同符号 occurrence（`src/services/knowledgeGraphService.ts:147`）。`_collectGraphGroups` 为每组构建独立视图模型，带观察记录、agent 标志、结构 key、关系来源/置信度/Evidence/structuralPath（`src/ui/webview/graphView.ts:457`）。这些字段既影响显示，也支持下钻，不能只当无关装饰删除。

客户端按 `order` 再按 `name` 排序，恢复仍存在的 `selectedGroupKey`，否则选第一组；侧栏使用文本节点建按钮，点击只渲染一组。选中时写入 `vscode.setState({ selectedGroupKey })`，随后调用 `renderGraph`（同文件 `:1372`、`:1423`、`:1449`）。无组会停止计算、清空画布及整个布局缓存并显示空态；只有当前组无实体时显示空态，但并非清空所有组的缓存（`:1378`、`:1495`）。

高级结构视图不是普通分组的另一种着色方式，而是按需请求另一套数据：

- toolbar 的 boundary/community/file selector 在点击结构按钮时读取；仅改变 selector 没有注册自动请求事件（同文件 `:1101`、`:2091`、`:2172`）。主机读结构图并 `aggregateStructuralGraph(..., { level, limit: 80 })`，转换成 `__structural_<level>` 组（`:324`、`:518`）。
- 收到 `structuralGroup` 后客户端删除所有旧 `__structural_` 组，添加新组并立即选中，普通组保留；同时展示节点/关系计数。它只有一个当前结构组，没有结构导航历史（`:1293`、`:1401`）。
- 聚合节点双击传 aggregate id、level、files；主机优先按 files 选实体，最多 80 实体、120 条组内关系。curated 节点右键或 Shift+双击用结构 key 查双向一跳邻居，并裁剪、过滤端点。关系/标签双击仅在非空 structuralPath 存在时下钻，主机按 source、target、verb 和精确源码位置匹配当前原始关系，不是重新猜一条路径（`:340`、`:365`、`:407`、`:627`、`:1601`、`:1685`、`:1761`）。原始切片节点 ID 是结构 key 的稳定哈希，但组 key 含 `Date.now()`（`:564`、`:643`），因此“重新请求相同切片”通常不是同一个缓存组。
- 普通节点双击跳源文件；原始结构节点双击走结构 key 解析，再打开源码。二者均使用第一个 workspace folder、把一基行号转成零基；外部节点有单独保护，打开失败会提示（`:647`、`:687`、`:705`）。

### 性能 selector 的因果链

`knowledgeGraph.visualization.performanceMode` 仅接受 low/high，默认 low，scope 为 machine，manifest 明确说不改变图谱数据（`package.json:325`）。页面选择后立即应用模式、重绘当前组，再禁用 selector 并发送 `setPerformanceMode`；主机只接受合法值，写入 `ConfigurationTarget.Global`。配置监听也回传模式；保存失败显示错误，并在 finally 回传实际配置，客户端重新启用 selector，因而撤销乐观选择（`src/ui/webview/graphView.ts:300`、`:150`、`:1283`、`:2077`、`:2176`）。模式不存进 `vscode.setState`。

两种模式都保留节点/边、标签、关系 tooltip、缩放、拖动和下钻；区别主要是计算调度、物理行为和视觉效果，而不是另取数据：

- 两者先建立 D3 力模型并复制 nodes/links，避免 D3 的坐标和端点对象替换污染输入视图数据（同文件 `:1504`、`:1552`、`:1566`）。low 停止 D3 自动仿真，用实际嵌入的 `GRAPH_PERFORMANCE_SCRIPT` 分帧手动 tick。每批约 6 ms，最多 120 ticks 或累计 600 ms 计算时间，冷却也可提前结束；每批显式更新几何，完成后 alpha 置零并保存布局，因为 D3 手工 tick 不触发 tick/end 事件（`src/ui/webview/graphPerformanceScript.ts:46`；调用处 `src/ui/webview/graphView.ts:1933`）。这是有界分批布局，不是完全不做布局计算；单个 tick 本身仍可能超过 6 ms，不能把它解读为严格帧时长保证。
- low 不建粒子、不加流动虚线 class、glow 和标签 halo，hover/fit 不做平滑过渡。high 保留这些效果，并用一个当前组的 RAF 粒子循环，以约 30 fps 节流；仿真停止后仍可继续粒子运动，已稳定路径长度会缓存，几何变化会清除它（`src/ui/webview/graphView.ts:1585`、`:1613`、`:1667`、`:1720`、`:1823`、`:1922`、`:2073`）。
- low 拖动会终止剩余静态布局、alpha 归零，只改被拖节点坐标并更新它的相邻边/标签；high 拖动重启物理仿真并提高 alphaTarget，结束时释放 fx/fy 并保存。low 因而避免一次拖动让整图重新运动（`src/ui/webview/graphPerformanceScript.ts:91`；`src/ui/webview/graphView.ts:1823`、`:1950`）。
- 初次 low 布局完成后可自动 fit；high 通常一秒后自动 fit，fit 过渡 750 ms。真实用户 zoom/pan 和拖动禁止后续自动 fit；显式 fit 仍可执行，缩放范围 0.1–4。resize 使用 120 ms 防抖，low 会主动 fit，high 在可见时以 alpha 0.15 重启。因此不能承诺手动视口在 resize 后原封不动（同文件 `:1210`、`:1360`、`:1933`、`:1957`、`:2053`）。

### 记忆与生命周期边界

页面创建 `layoutCache`，但 `getState()/setState()` 只读写选中 key（`src/ui/webview/graphView.ts:1138`、`:1453`）。每次重绘先停止旧循环和仿真，再调用绑定于旧组的保存闭包；因此即使 selected key 已变，保存的仍是旧组的几何。恢复布局时取位置和 zoom transform，并恢复 alpha、settled、autoFit（`:1479`、`:1556`、`:1575`）。

缓存只保存 `x/y`、transform 和上述布局进度，不保存实体/Evidence、速度或持久固定点。key 与拓扑签名必须匹配：签名由排序后的节点 ID 和边的 sourceId/targetId/verb 构成，文案/观察变化不会失效，实体/拓扑变化会失效。默认最多 8 组、所有组共 2000 节点，按最近使用淘汰；拒绝非有限坐标、单组超 2000 节点或超过 16000 条边的保存（`src/ui/webview/graphPerformanceScript.ts:7`）。

| 操作 | 实際可保留与丢失的状态 |
| --- | --- |
| 普通 A → B → A，或切换性能模式 | 符合容量及拓扑条件时恢复 A 的几何、视口和未完成布局进度；模式切换共用同一几何缓存。已 settled 的 high 组不会仅因切换模式便重新开始物理仿真，但视觉动画仍可运行。来源：`graphView.ts:1479`、`:1556`、`:1572`、`:2077`。 |
| 页面隐藏后由 UI 再显示 | 因 retainContext，保留组数据、当前结构组、选中 key、画布和内存缓存。隐藏时暂停静态布局/粒子、停止仿真，打断过渡、清 fit/resize timer 并保存；显示时 low 恢复未完成布局，high 仅在 alpha 尚未冷却时 restart，再恢复粒子。被取消的 high 自动 fit timer 没有在显示分支重建。来源：`graphView.ts:174`、`:1254`。 |
| 再执行 Visualize Graph，已有同语言面板 | 不换 HTML，保留缓存；但会重新发送仅含普通组的 graphData，整个 graphGroups 数组被替换。普通选中组仍存在则保留；高级结构组丢失，选中会退回第一普通组。toolbar Refresh 具有相同的数据替换效果。来源：`graphView.ts:157`、`:263`、`:1372`、`:2086`。 |
| HTML 因语言标题变化而重建 | 代码尝试从 webview state 恢复 selectedGroupKey，但 layoutCache 和页面组数据重新创建；新 ready 只取普通组。不能把 geometry 当作已持久化。来源：`graphView.ts:161`、`:199`、`:1138`、`:1205`。 |
| 关闭后重新打开，或重启扩展 | 性能模式从全局配置重取；关闭销毁 panel，几何未写磁盘，选中 key 也未写入 extension state。源码未见 webview serializer 注册，故不能声称关闭/重启后恢复原视图。来源：`graphView.ts:157`、`:186`、`:300`、`:1453`。此处是代码生命周期推论，未实际运行 VS Code 验证。 |

### 变更必须守住什么，现有测试能证明什么

1. **单组渲染与身份语义。** 不要拿全局去重快照替换可视化组，否则跨组同符号会消失，组内关系和跳转也可能错配。`src/services/knowledgeGraphService.test.ts:60` 验证跨组重复符号分别保留并能按 occurrence ID 查实体，但不是浏览器选择测试。
2. **一个活动布局/动画所有者。** 切组、变模式、空态、错误、隐藏和 unload 都要停止旧任务，否则可能后台耗电或旧任务写新 DOM。当前同步 `renderGraph` 错误显示 render-error，静态分批失败也走该错误入口（`graphView.ts:1449`、`:1465`、`:1272`；`graphPerformanceScript.ts:71`）。不过 `initGraph()` 位于 load handler 的捕获之外：D3 缺失/初始化失败可能到不了 ready，不能把 render-error 当成所有启动错误的兜底（`graphView.ts:1205`）。
3. **有界缓存与真实输入解耦。** 继续只缓存几何，保留稳定 ID/拓扑校验、LRU 及未完成 alpha/autoFit，避免旧 Evidence 被缓存、拓扑变更套错位置或快速切组冻结初始布局。`src/ui/webview/graphPerformanceScript.test.ts:105` 验证文案更新保留、拓扑变化失效；`:119` 验证组/节点容量及 LRU；`:133` 验证未完成状态字段。它们只执行 helper，不证明实际 `selectGraphGroup` 接线正确，也未覆盖所有非有限坐标/边数量上限。
4. **模式保存失败必须回到真实设置。** `src/ui/webview/graphView.test.ts:58` 验证 manifest 默认值、scope、两种选项及生成脚本语法；`:79` 验证 Global 写入、重新打开模式及已有 HTML 不被覆盖；`:96` 验证配置变化、失败回传和非法输入。测试使用 mock panel/VS Code，没有运行真实 DOM；尤其不证明 selectedGroupKey 或 geometry 在关闭后恢复。
5. **响应预算及交互差异。** `src/ui/webview/graphPerformanceScript.test.ts:49`、`:65` 验证分批、tick/时间/冷却退出；`:81` 验证 helper 的隐藏暂停、重复 resume 和取消；`:95` 验证失败不留 RAF；`:142` 对比 low 单节点拖动和 high restart。未见覆盖完整 visibilitychange、粒子/CSS 暂停、resize/fit 竞争或实际大图帧率的自动化测试。
6. **结构导航既要有来源也要处理失败。** 结构服务不可用、缺 key/aggregate 或空 path 会发送 `structuralError` 并 warning；页面隐藏 loading、显示状态，保留现有视图（`graphView.ts:324`、`:340`、`:450`、`:1296`）。非空但已不匹配的 path 可以得到空切片，而不是错误；客户端/服务没有请求 ID 或 latest-request guard，因此变更成异步请求后尤其需要定义过时结果的处理（根据 `:340`、`:1293` 推论）。`src/services/structuralGraph/structuralAnalysis.test.ts:15` 检查 impact/path 的来源，`:60` 检查社区建议和有限聚合；它们不测试 Webview 的 80/120 裁剪、聚合 drill-down、普通数据覆盖高级组或结构错误 UI。
7. **保留来源 tooltip 与基础渲染。** `src/ui/webview/graphWebviewClientScript.test.ts:6` 执行实际嵌入的 tooltip helper，断言来源、源码行范围和 raw-path 提示，防止该 helper 抛错中断渲染；不是对所有缺失/畸形关系或源文件打开错误的覆盖。

以上测试均为“存在的测试及其断言范围”，本次未运行。当前最重要的整体缺口是：没有实际执行整页分组选择/模式切换/隐藏显示/关闭重开序列的测试，因此不能用 helper 或 mock host 测试替代生命周期契约验证。

## 2. Generate Copilot Instructions

### 命令、输入与写入链

manifest 贡献 `knowledge.generateCopilotInstructions`，标题为 “Knowledge: Generate Copilot Instructions”（`package.json:86`）。扩展将它注册成 async handler，等待 `entityCommands.generateCopilotInstructions()`，外层仅捕获继续向外抛出的错误（`src/extension.ts:680`）。`EntityCommands` 注入统一 KnowledgeGraphService，并构造 AIIntegrationService；后者接收旧 Entity/Relation/Observation services，构造 DependencyAnalyzer（`src/extension.ts:246`；`src/ui/commands/entityCommands.ts:23`；`src/services/aiIntegrationService.ts:45`）。DependencyAnalyzer 的构造函数只保存服务引用，不在构造时分析图（`src/services/dependencyAnalyzer.ts:49`）。

UI handler 固定选择 `workspaceFolders?.[0]`，没有 workspace 时提示并返回，没有选目标目录或项目的对话框，也不依赖当前编辑器选区。随后调用 `getGraphData()`：取统一图谱 snapshot，逐实体读取 observations，形成 entities、relations、带 entityId/name 的 observations 和固定 `sourceType: 'knowledge'`，再传给生成器（`src/ui/commands/entityCommands.ts:43`、`:1255`）。

真正的服务方法是 `generateCopilotInstructions(workspaceRoot, _graphData?)`：若 `<root>/.github` 不存在则递归建目录，调用零参数内容 builder，UTF-8 同步写 `<root>/.github/copilot-instructions.md`，返回该路径。虽然方法声明 async，核心文件 I/O 是 `fs.existsSync/mkdirSync/writeFileSync`，不是流式生成或远程 AI 调用（`src/services/aiIntegrationService.ts:71`）。

### 什么影响当前输出，什么只是看起来相关

| 输入/依赖 | 当前实际作用 |
| --- | --- |
| workspaceRoot | 决定目标目录和返回路径，不插入正文。见 `aiIntegrationService.ts:71`。 |
| GraphData：实体、关系、观察、sourceType | UI 构造并传递，但服务参数明确为 `_graphData`，builder 不接收它；没有数据时也能直接生成相同正文。见 `entityCommands.ts:43`、`:1263`；`aiIntegrationService.ts:71`、`:404`。 |
| KnowledgeGraphService | 不影响正文，却仍影响 UI 命令能否走到写文件：snapshot/observation 读取若抛错，会被 handler 捕获并跳过写入。这是一个真实的成功/失败依赖，不能因为数据未使用就说“命令完全不依赖图谱”。见 `entityCommands.ts:1262`、`:1282`。 |
| Entity/Relation/Observation services、DependencyAnalyzer | 是共享类的构造依赖，但 Copilot builder 的调用链不查询它们。见 `aiIntegrationService.ts:45`、`:404`、`:411`。 |
| 项目名、技术栈、依赖统计、当前场景/custom template、aiConfig.maxRelationsDisplay | 旧 CN/EN Cursor builder 及其 helpers 仍在同一个大类中，看起来高度相关，却不在当前两个公开生成入口的调用链上。旧 builder 读取这些信息（`aiIntegrationService.ts:114`、`:259`、`:378`、`:691`、`:718`、`:857`）；当前入口直接路由到紧凑共享 builder（`:101`、`:404`）。不能依据整个类的 MCP 关系边就认定它们影响 Copilot 输出。 |
| UI 语言 | 影响提示文案，但 Copilot 内容固定传 `'en'` 和 `'# VibeKnowledge Agent Instructions'`，无日期、项目名或图谱摘要插值。见 `aiIntegrationService.ts:404`、`:432`；`entityCommands.ts:1269`。 |

当前内容是固定的简短导航指令：对架构/陌生代码/跨文件/依赖/影响分析优先聚焦 `query_graph` 并设置 tokenBudget；按需用 get_entity/get_neighbors/shortest_path 和 Evidence；MCP 不可用或局部结果无用时才读取 agent-context/index.md 和一个最匹配分组；默认不加载完整审计报告；已知文件的小任务可以跳过图谱；修改/测试前核验源码；不直接编辑 graph.sqlite（`src/services/aiIntegrationService.ts:411`）。

这说明文件的**意图**是给后续 Copilot/Agent 提供按需导航政策，**不是**生成器本身在查询 MCP、检查 MCP 是否可用、加载 fallback 文件、调用 LLM/RAG、刷新图谱、修改数据库、安装配置或验证消费者一定会遵循。服务真正做的是组装固定字符串并写文件（`:71`、`:404`、`:411`）。生成成功也不等于那些被提及的产物实际存在或已被 Copilot 加载。

### 共享路径与两个容易遗漏的行为

`generateCursorRules` 写根目录 `.cursorrules`，通过 `buildCursorRulesContent` 调用与 Copilot 完全相同的 `buildAgentKnowledgeRouterContent`，仅选择标题和语言参数；它同样忽略 graphData（`src/services/aiIntegrationService.ts:58`、`:101`）。因此修改共享导航 builder 会同时改变两个文件；若只要求 Copilot 项目化，需要明确是否要改变 Cursor，不能无意间连带改变。

语言存在具体实现偏差：Cursor builder 用 `getLocale() === 'zh'` 判中文，而 `getLocale()` 实际返回 `zh-CN` 或 `en-US`（`src/services/aiIntegrationService.ts:102`；`src/i18n/i18nService.ts:126`、`:148`）。**源码推论：当前正常语言服务下 Cursor 也走英文分支**，不应仅凭它有中文数组就声称生成会自动中文化。Copilot 的固定英文则是显式行为。

“Generate All AI Configs” 的 UI handler 自己顺序调用 `generateCursorRules` 与 `generateCopilotInstructions`，而不是调用服务层同名 `generateAllAIConfigs`。UI 有不可取消进度提示（0/50/100），然后提供打开两个文件的选项；服务层同名方法也按同样顺序调用两个单文件生成器并返回路径数组（`src/ui/commands/entityCommands.ts:1290`；`src/services/aiIntegrationService.ts:89`）。这两条编排路径共享实际单文件写入实现，但 UI/服务编排仍是两份。

切换 AI 场景后，用户若选择重新生成，会执行 `knowledge.generateAllAIConfigs`（`src/commands/scenarioCommands.ts:62`）。这能触发两个文件重写，**但当前路由 builder 不读取场景模板**，所以场景选择本身不会令这两个文件正文变成场景专属内容。`readCustomAITemplate` 的存在并不改变该调用链事实（`src/services/aiIntegrationService.ts:691`）。

### 已有文件、完成提示和错误语义

- 目标已存在时直接 `writeFileSync` 覆盖；没有 overwrite 确认、合并、保留用户段落、备份或临时文件原子替换。`.github` 已是目录时直接使用；若是同名普通文件、路径无权限或磁盘写入失败，操作会抛错。服务没有 catch，async 方法以 rejected promise 向调用者报告（`src/services/aiIntegrationService.ts:71`）。**推论：**写到一半出错不能假定旧内容完整，目录可能已经建好；直接覆盖本身是项目化改动尤其要明确的兼容边界。
- 成功写入后 UI 显示 success 和“打开文件/在文件夹中显示”操作；打开走 openTextDocument/showTextDocument，显示目录走 revealFileInOS，忽略提示则不再做事（`src/ui/commands/entityCommands.ts:1269`）。生成器自身不会自动打开文件。
- success 调用传入 `.github/${basename}`，而英文及中文翻译又添加 `.github/`，因此**源码推论**成功提示实际会出现 `.github/.github/copilot-instructions.md`；真正文件路径与打开行为只含一次 `.github`（`src/ui/commands/entityCommands.ts:1271`；`src/i18n/en.ts:293`；`src/i18n/zh.ts:294`）。
- 数据获取、写入和成功后的打开/reveal 都在同一个 try 中。因此“打开已生成文件失败”也会显示“生成失败”，即使文件已经写好了；没有回滚。内层 catch 显示本地化错误并不重新抛出，通常外层扩展命令 catch 不会再触发（`src/ui/commands/entityCommands.ts:1262`、`:1276`、`:1282`；`src/extension.ts:684`）。
- All Configs 不是事务：Cursor 先写成功而 Copilot 后失败时 `.cursorrules` 保留已更改状态，不显示总成功；Cursor 先失败则不会继续 Copilot。服务与 UI 两种编排均如此，UI 最后打开失败也走统一失败提示（`src/services/aiIntegrationService.ts:89`；`src/ui/commands/entityCommands.ts:1306`、`:1323`、`:1332`）。

### 现有测试与项目化变更的风险对应

`src/services/aiIntegrationService.test.ts:68` 实际测试服务生成到临时 workspace：创建一个带 marker 的 ai-template，调用 Copilot 服务，读回内容，断言 query_graph/get_neighbors/shortest_path/includeEvidence、index fallback、只读一个分组和不默认读完整报告；同时断言无模板 marker、Tech Stack、Dependency Details、Total Entities。构造使用空 service stub，直接生成时无需图谱服务查询（同文件 `:42`）。这锁定的是“紧凑路由而非完整图谱/模板 dump”的契约；项目化改动如果直接恢复旧大模板，会与现有断言冲突。

`src/services/aiIntegrationService.test.ts:100` 对 Cursor 验证类似的紧凑 query-first 契约，是共享 builder 改动的直接回归点。`:121` 和 `:144` 的技术栈测试检查 @types/node 不当成运行时版本，以及 engines/.nvmrc 的版本提取，但它们通过类型转换直接调用私有技术栈 helper（`:50`），**不证明 Copilot 或 Cursor 公开生成入口当前包含技术栈**。

本次检索到的相关测试没有覆盖以下重要契约；这些是分析缺口，不是已执行失败：

1. UI handler 的无 workspace、多根工作区选择、getGraphData 抛错、打开/reveal 选择、完成后的错误，以及重复 `.github` 提示。现有服务测试不经过 EntityCommands。
2. 传入非空/不同 GraphData、不同项目名/依赖/场景时输出是否相同；当前测试只省略 graphData。已有“无模板 marker”断言也不等于验证真实 ScenarioManager 分支从未被调用。
3. 已有目标文件的覆盖语义、保留用户内容决策、目录冲突、mkdir/write 失败、权限/部分写入；以及 All Configs 第二步失败后的部分成功状态。
4. Copilot 固定英文、Cursor 语言选择和上述 zh/zh-CN 不匹配；现有 Cursor 测试断言公共路径/tool 名字，无法发现生成语言错误。
5. 生成文件是否被实际 Copilot 消费、引用路径是否存在、MCP 是否配置可用；当前测试只验证字符串与服务文件输出。

因而在实现“更项目化”前，需要明确真正启用哪些输入、资料缺失时的降级规则、是否仍保持紧凑按需导航、是否连带影响 Cursor，以及是否改变覆盖/失败契约。当前代码的因果链不能支持“已有技术栈/场景 helper，所以生成结果已经项目化”这一结论。
