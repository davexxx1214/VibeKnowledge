# Anonymous feature analysis

[Pre-task execution-method prologue withheld; the task sections are unchanged.]

## 1. visualization

### 命令、服务与页面的因果链

- **事实：入口是同一个命令。** `package.json:57` 贡献 `knowledge.visualizeGraph`，`package.json:244` 将其放在 `knowledgeGraphExplorer` 标题栏。处理器调用 `GraphView.createOrShow(context.extensionUri)`，同步抛错由扩展层显示 `Error opening graph`（`src/extension.ts:643`）。激活时把 `KnowledgeGraphService` 和 `StructuralGraphService` 注入 `GraphView`（`src/extension.ts:180`、`src/extension.ts:242`），所以 UI 不直接读取图谱文件，也不通过 MCP 取数。
- **事实：Panel 是单例，不是每次执行都重建。** 已有 Panel 时 reveal 到第一列；标题仍等于当前翻译则仅发送数据，标题不同才重设 HTML。新 Panel 开启脚本及 `retainContextWhenHidden`；关闭清除 `currentPanel` 并释放订阅（`src/ui/webview/graphView.ts:157`、`:170`、`:186`）。因此“揭示仍存在的 Panel”和“关闭后重新打开”不能当作同一种生命周期。
- **事实：页面初始化与消息握手。** HTML 加载扩展内 `dist/d3.min.js`，使用随机 nonce 和限制性 CSP（`src/ui/webview/graphView.ts:718`、`:751`）。load 事件先 `initGraph()`，再发 `ready`；host 收到后依次发当前性能模式和普通分组数据（`:1205`、`:205`）。页面接收 `graphData` 调 `setGraphGroups`，接收 `structuralGroup` 走另一条 upsert 路径（`:1280`）。这不是向浏览器重新赋 HTML 的数据更新。

### 普通分组与高级结构视图

**事实：普通分组必须保持独立。** `_collectGraphGroups()` 使用 `KnowledgeGraphService.getGroups()`，而不是去重后的 aggregate snapshot（`src/ui/webview/graphView.ts:456`）。`getGroups()` 保留同一符号在不同模块/特性中的不同实例及各自关系；供搜索/导出的 `getSnapshot()` 才会跨组去重（`src/services/knowledgeGraphService.ts:67`、`:147`）。host 映射组 key/name/kind/order，实体的 ID、位置、描述、observations、structuralKey，以及关系的 provenance、confidence、evidence、structuralPath；这些不是可以随布局缓存一起冻结的内容（`src/ui/webview/graphView.ts:462`、`:469`、`:493`）。

页面按 order，再按 name 排序；侧栏按钮显示名称、类别和实体/关系计数。数据到达时保留仍存在的 selected key，否则取排序后的第一组；点击一组只渲染该组。`selectGraphGroup()` 保存选择、更新 active 样式并捕捉同步渲染错误（`src/ui/webview/graphView.ts:1372`、`:1396`、`:1423`、`:1449`）。空分组列表与选中的空组不同：前者清空所有布局缓存、停止仿真并显示空状态，后者走 `renderGraph` 的空实体分支（`:1378`、`:1495`）。

**事实：高级视图是按需加入的临时分组，而不是普通数据源的替代品。** toolbar 的 level 有 boundary/community/file；点击结构按钮才发送选中 level，单独修改下拉值没有监听器发请求（`src/ui/webview/graphView.ts:1101`、`:2091`、`:2172`）。host 读取已有结构图，调用 `aggregateStructuralGraph(..., { level, limit: 80 })`，再映射成 `__structural_<level>` 组（`:324`、`:518`）。结构服务 `read()` 读取 `.vscode/.knowledge/structural-graph.json`，缺少文件即抛错，不在此调用生成（`src/services/structuralGraph/structuralGraphService.ts:25`、`:63`）。

高级导航有不同语义，修改选择/缓存不能混淆：

- 双击聚合节点：发送 aggregateId、level、files，按文件集或边界选择原始实体；最多 80 实体、120 条两端均在子集中的关系（`src/ui/webview/graphView.ts:1761`、`:407`）。
- 普通 curated 节点右键，或带 structuralKey 的 Shift+双击：发 `drillDownEntity`；双向一跳 impact，关系去重后取最多 120、实体最多 80，再剔除未包含端点的边（`:1778`、`:1791`、`:365`）。
- 双击有非空 structuralPath 的边或边标签：发送路径；host 以 source/target/verb/filePath/startLine/endLine 精确匹配当前结构图关系，取端点实体，不是按名称重新猜测，也没有该路径分支的 80/120 截断（`:1601`、`:1685`、`:340`、`:627`）。
- 原始结构节点双击是定位源码，普通节点普通双击也是定位源码；前者通过结构 key 解析，后者通过普通实体 ID 查找，外部实体不打开为本地代码（`:1771`、`:1785`、`:647`、`:687`）。`KnowledgeGraphService.getEntity()` 能回退到独立分组实例，不能只查去重 snapshot（`src/services/knowledgeGraphService.ts:192`）。

`upsertStructuralGroup()` 删除所有旧 `__structural_` 组、加入新组并自动选中，因此同时只有一个高级组，没有高级导航历史；原始切片 key 带 `Date.now()`（`src/ui/webview/graphView.ts:1401`、`:576`）。普通 `graphData` 会整体替换 `graphGroups`，并不合并这个临时组（`:1372`）。**推断：** 在高级组里按页面 refresh，或再次执行命令 reveal 同一 Panel，普通数据回复会移除高级组，随后回退第一普通组；单纯隐藏后再显示则不会主动发这个消息。

### 性能选择器改变什么

**事实：它是机器偏好，不是图谱数据设置。** manifest 默认 low、仅 low/high、scope machine（`package.json:325`）。页面选择后立即规范化模式、重渲染当前组，再禁用 selector 并发 `setPerformanceMode`；host 只接受 low/high，写 `ConfigurationTarget.Global`，失败显示错误，finally 回传实际配置。页面收到回传重新启用选择器；Settings UI 的修改也有订阅同步（`src/ui/webview/graphView.ts:300`、`:309`、`:150`、`:2077`、`:2176`、`:1283`）。所以失败回传会把乐观显示切回实际模式；非法输入 host 直接忽略，不能期待所有无效请求都得到 ack。

- **Low：** 仍创建 D3 force simulation，但停止其常规 tick，使用显式短批次静态布局；每批至少一次 tick，以约 6ms 为批次条件，总计最多 120 ticks、600ms 累计计算时间或冷却到 alphaMin 后停止。每批手动更新几何，因为 D3 `tick()` 不触发 tick/end 事件；用 requestAnimationFrame 在批次间让出线程（`src/ui/webview/graphView.ts:1566`、`:1933`；`src/ui/webview/graphPerformanceScript.ts:46`）。这是预算控制而非每一帧绝对不超时的保证，单次昂贵 tick 仍可跨过预算。
- **Low 拖拽：** 停止静态任务、alpha 设为 0，只移动被拖节点并更新相关几何，不重启全图物理；结束清 fx/fy 并保存（`src/ui/webview/graphPerformanceScript.ts:91`；`src/ui/webview/graphView.ts:1823`、`:1950`）。Low 去掉粒子、流动虚线、节点 glow/text-shadow、标签 halo 和动画式 hover/fit，但关系文本、箭头、tooltip、来源样式、双击导航及拖拽仍存在（`:1080`、`:1594`、`:1619`、`:1668`、`:1727`、`:2073`）。
- **High：** 使用交互式 force 仿真，拖拽 reheats 到 alphaTarget 0.3；有单个受节流约 30fps 的粒子循环，缓存路径对象和 settled path length，渲染几何变化会清长度缓存（`src/ui/webview/graphPerformanceScript.ts:97`；`src/ui/webview/graphView.ts:1154`、`:1624`、`:1630`、`:1823`、`:1922`）。High 支持流动虚线、发光和转场，但切到 high 并不必然重新排版：若可复用缓存已 settled，simulation 仍停止；拖拽或可见页 resize 才可能重新加热（`:1572`、`:1223`）。
- **Fit 与响应：** 用户发起 zoom 或 drag 会取消自动 fit；未干预的新 low 布局完成时 fit，high 约一秒后 fit。fit 的 scale 限在 0.1–4，遇到零尺寸直接返回；low 即时、high 750ms 转场。resize 防抖 120ms，low 调 fit，high 在可见时以 0.15 restart（`src/ui/webview/graphView.ts:1360`、`:1933`、`:1957`、`:2053`、`:1210`）。**推断：** low 下 resize 会改变用户缩放，因为该路径无视 allowAutoFit；不能把“用户 zoom 后不自动 fit”概括成所有场景都不再 fit。

### 状态存活边界

| 状态 | 存放位置与存活条件 |
| --- | --- |
| 当前普通/高级 key | `vscode.getState()?.selectedGroupKey` 初始化，每次选择以 `vscode.setState({ selectedGroupKey })` 写入；只保存 key，不保存图数据或几何（`src/ui/webview/graphView.ts:1150`、`:1453`）。数据更新后 key 必须仍在组列表中，否则回退。 |
| 每组位置、pan/zoom、settled、alpha、autoFit | 页内 `layoutCache`，key 为 group key。render 下一组前保存旧组；恢复缓存位置及 zoom，再用 alpha/settled 决定是否继续布局（`src/ui/webview/graphView.ts:1141`、`:1479`、`:1556`、`:1575`）。不会写入 Webview state、磁盘或 host。 |
| 缓存有效性与容量 | 拓扑签名只含排序后的节点 IDs、关系 sourceId/targetId/verb。描述、evidence、关系 ID 的变化不会废弃几何，但渲染仍使用新实体/关系对象。默认最多 8 组、累计 2000 节点；单次超过 2000 节点或 16000 边、位置不是有限数则不缓存；LRU 淘汰（`src/ui/webview/graphPerformanceScript.ts:7`）。不保存速度 vx/vy、fx/fy，不等于完整物理快照。 |
| 性能模式 | host 的全局 machine 设置。跨关 Panel 再开继续读取；不是 selectedGroupKey 的一部分（`src/ui/webview/graphView.ts:300`、`:1140`）。 |
| 临时高级数据 | 只在当前页 `graphGroups` 中；新的高级响应替代旧高级组，普通数据响应移除它；即使持久 key 还在，也不能重建高级切片（`src/ui/webview/graphView.ts:1372`、`:1401`）。 |

**事实：隐藏不会丢掉当前页。** retainContext 保留上下文；`visibilitychange` 隐藏时停止粒子但保留 resume 回调、pause 静态布局、stop 仿真、interrupt SVG/子元素转场、取消 fit/resize 定时器，并保存当前布局。重新可见时 low resume 未完成布局，high 仅 alpha 尚未冷却才 restart，并恢复粒子（`src/ui/webview/graphView.ts:176`、`:1254`）。`beforeunload` 清循环、布局和定时器，但不执行布局持久化（`:1272`）。隐藏期间保留的状态不等于后台仍持续动画。

**推断：** 普通组内 reveal、相同拓扑重发数据一般可保持布局/zoom；标题因语言变化触发 `_update()` 则页内缓存重建，只有能由 Webview state 读回的 key 有恢复入口。关闭后创建的是新 Panel，代码没有跨 Panel 的 selection/geometry 存储或 serializer，因此不能承诺关闭/重启后恢复旧视图（`src/ui/webview/graphView.ts:157`、`:186`、`:1141`；源码中 state 使用仅见 `:1150`、`:1454`）。另外，空列表把局部 key 设 null，却没有 `setState(null)`，所以存储的旧 key 可能继续存在；高模式隐藏取消的初次 fit timer 在显示时也未重新安排（`:1378`、`:1262`、`:1265`）。这些是改“记住当前视图”时应明确的产品规则，而非把当前行为无条件保留下来。

### 必须保持的正确性/失败边界与测试映射

1. **组 identity、拓扑和语义不能混为一谈。** 独立组的同名/同符号实体必须继续可选和可跳转；缓存只保存几何，新 evidence、provenance 与描述仍应立即显示。`src/services/knowledgeGraphService.test.ts:60` 验证重复符号保留在独立组并能 `getEntity`；`:11` 验证 aggregate 去重。`src/ui/webview/graphPerformanceScript.test.ts:105` 验证文字变化保留几何、拓扑变化失效和节点重排；`:119` 验证 LRU/节点容量；`:133` 验证未完成 alpha/autoFit 状态。**缺口：** 后一项只是缓存字段测试，不是真实快速切组再继续仿真的页面测试；没有完整 selectedGroupKey fallback、普通/高级互切、HTML 重建/关闭恢复、有限坐标及超大边数测试。
2. **所有旧渲染工作应在切组/换模式/隐藏时停掉，避免旧帧更新已换组 DOM。** `renderGraph` 先停止粒子、静态布局和仿真，再保存旧闭包状态、interrupt/remove SVG 子树（`src/ui/webview/graphView.ts:1479`）；异步静态计算错误调用同一 `showRenderError`。`src/ui/webview/graphPerformanceScript.test.ts:49`、`:65`、`:81`、`:95` 覆盖让出帧、tick/时间/冷却预算、hidden/pause/resume/stop、渲染异常不再调度；`:142` 覆盖 low 单节点拖动和 high physics。**缺口：** helper 的假 document/假 simulation 不覆盖真实 visibilitychange handler、D3、SVG、粒子与 timer 组合；没有浏览器 E2E 对隐藏/恢复、fit 与用户 zoom、模式切换后的实际几何行为作断言。
3. **性能保存要可回退、不可污染图数据。** `src/ui/webview/graphView.test.ts:58` 验证 machine/low manifest、两种 UI 文案，并对完整 inline script 做语法解析；`:79` 验证全局写设置、reveal 不重载、关闭再开复用 high；`:96` 验证 Settings 同步、失败回传原模式及拒绝非法模式。**缺口：** 测试调用 host 消息回调，不执行整页 DOM；因此未证明 selector 的禁用/恢复或回退时实际重渲染，也不验证 message 丢失时的交互恢复。
4. **结构视图应保持 on-demand、端点完整和来源证据可追溯。** `structuralError` 发回页面并弹 warning；页面解除 loading、显示状态，不清掉旧图（`src/ui/webview/graphView.ts:450`、`:1296`）。缺图、服务未注入、空路径等明确错误与“匹配出空切片”不同；后者可直接显示空状态。`src/services/structuralGraph/structuralAnalysis.test.ts:15` 验证 source-backed impact/path，`:60` 验证聚合截断和关系 count，`:113` 验证 containment 导航桥；这些不是 Webview message/selection 测试。`src/ui/webview/graphWebviewClientScript.test.ts:6` 验证实际嵌入的 tooltip formatter 能呈现 provenance、证据位置和 raw-path 提示。**缺口：** 未见高级消息到 host 再回页面的测试、80/120 端点过滤、失效 structuralPath、missing graph 的 loading 恢复、快速发请求后返回选择被覆盖的测试；当前协议没有请求 ID/当前导航意图校验（`src/ui/webview/graphView.ts:223`、`:1293`），异步化实现时尤其需决定旧响应如何处理。
5. **错误展示不是所有错误的总兜底。** 选组同步异常和静态批次失败会停动画、隐藏 loading、显示独立 render-error，不冒充无数据（`src/ui/webview/graphView.ts:1458`、`:1465`、`:1938`）。但是 load 的 `initGraph()` 在 ready 之前且没有这个 try/catch，D3 加载/初始化失败可能停在 loading；high 的 tick/粒子异步回调也未统一包在 render-error 中（`:1205`、`:1632`、`:1920`）。上层打开命令的同步 catch 无法捕获浏览器异步错误。应为初始化失败、坏链接端点及异步 SVG 路径错误补针对性验证，而不是仅依赖 inline script 能解析。

以上仅涉及页面/视图交互，不分析后台源码刷新流水线。

## 2. Generate Copilot Instructions

### UI 到文件的实际调用链

**事实：** `package.json:86` 贡献命令；`src/extension.ts:680` 的 async handler 调 `entityCommands.generateCopilotInstructions()`，外围 catch 显示 `Error generating Copilot Instructions`。扩展选择第一个 workspace root 来初始化服务，并以 entity/relation/observation/knowledge 服务创建命令对象（`src/extension.ts:57`、`:245`）；`EntityCommands` 再构造 `AIIntegrationService`（`src/ui/commands/entityCommands.ts:23`）。没有工作区时激活注册的是提示打开文件夹的占位命令，清单包含 Copilot、Cursor 和 Generate All（`src/extension.ts:48`、`:960`、`:992`）；真实方法自身也再次检查第一 workspace folder（`src/ui/commands/entityCommands.ts:1255`）。

单独生成的顺序是：第一 workspace folder → `getGraphData()` → `AIIntegrationService.generateCopilotInstructions(root, graphData)` → 成功通知 → 可选打开文件/在系统文件夹中显示。没有额外项目选择、prompt、内容选项或进度条（`src/ui/commands/entityCommands.ts:1255`）。`getGraphData()` 使用 unified `KnowledgeGraphService.getSnapshot()`，对 snapshot 实体收集 observations，返回 entities/relations/observations/sourceType:'knowledge'（`:43`）。它不是把当前可视化选中的一组作为输入。

服务创建 `.github`（目录不存在时 recursive mkdir），生成内容，以 UTF-8 同步写入 `<root>/.github/copilot-instructions.md`，最后返回路径（`src/services/aiIntegrationService.ts:71`）。方法虽然声明 async，内部不是流式、可取消或异步 fs 工作。

### 哪些输入实际影响输出

**核心事实：Copilot 当前正文是固定英文导航模板，而非项目摘要。** 公共方法参数是 `_graphData?: GraphData`，未传给 builder；`buildCopilotInstructionsContent()` 固定传 `'en'` 和 `# VibeKnowledge Agent Instructions`，router 把常量字符串数组 join 成正文（`src/services/aiIntegrationService.ts:71`、`:404`、`:411`）。因此同版本代码下，两个项目的正文不会因为图谱实体、关系、观察、工作区名称、技术栈或场景不同而变化。

| 看起来可能相关的输入/依赖 | 当前实际影响 |
| --- | --- |
| workspaceRoot | 决定目录/文件路径和写权限结果，不插入正文；UI 总选第一 workspace folder，不以活动编辑器或文件所在项目决定（`src/ui/commands/entityCommands.ts:1256`；`src/services/aiIntegrationService.ts:72`）。 |
| GraphData（entities、relations、observations、sourceType） | 命令确实计算并传入，但服务忽略。直接服务调用不提供数据也能输出同一模板；注释“不给则默认服务获取”不符合当前执行路径（`src/services/aiIntegrationService.ts:66`）。 |
| entity/relation/observation 服务、DependencyAnalyzer | service 构造保存这些对象并创建 analyzer，但 Copilot builder 不调用它们；analyzer 构造只存引用（`src/services/aiIntegrationService.ts:43`；`src/services/dependencyAnalyzer.ts:49`）。然而 UI 的 graphData 收集仍是前置执行依赖：其异常可阻止一个不需要图谱的固定模板生成（`src/ui/commands/entityCommands.ts:1262`）。 |
| 技术栈、关系显示上限、依赖统计、工作区名、AI 场景/模板 | 大量相关 helper 仍留在同一 service，例如旧 Cursor CN/EN builder 取 workspaceName/stats/techStack/customTemplate；`extractTechStack()` 会检测包文件，`readCustomAITemplate()` 会取 ScenarioManager 模板（`src/services/aiIntegrationService.ts:114`、`:259`、`:378`、`:691`、`:718`、`:857`）。但当前公共 Cursor/Copilot 入口都转 router，不调用旧 CN/EN builder。因此这些不能仅凭 import 或 helper 存在就视作当前正文依赖。 |
| 语言设置 | `t()` 影响成功/失败 UI 文案；Copilot 正文固定英文。Cursor builder 看似按 locale 选中英文，但它比较 `getLocale() === 'zh'`，实际 `getLocale()` 返回 `zh-CN` 或 `en-US`，因此按当前实现也落入英文分支（`src/services/aiIntegrationService.ts:101`；`src/i18n/i18nService.ts:126`、`:134`、`:148`）。这是由源码组合得出的现有语言分支缺陷，不是已运行测试的结果。 |
| Gemini/API key、MCP 可用性、当前生成图谱是否存在 | 不参与正文构建或条件分支。模板谈到这些工具/图谱文件，并不意味着生成器检查它们或请求它们（`src/services/aiIntegrationService.ts:404`）。扩展级服务初始化与此命令的实际内容生成调用链需分开。 |

**共享实现与连带影响：** Cursor 生成 `.cursorrules`，其入口也调用 `buildAgentKnowledgeRouterContent`，主要区别在 title 和预期 locale；改共享 router 会影响两个文件（`src/services/aiIntegrationService.ts:58`、`:101`、`:404`）。服务级 `generateAllAIConfigs()` 顺序调 Cursor 后 Copilot，返回路径数组（`:89`）。但 UI 的 Generate All **没有调用这个服务 wrapper**：命令自己收集 graphData，在非取消进度窗口里顺序调用两个单独生成器，再提供两个查看动作（`src/ui/commands/entityCommands.ts:1290`）。因此改 wrapper 不能自动改变 UI 批量命令的编排，改 Copilot 单独 generator 会影响两条 All 路径。

此外，“切换 AI 场景”成功后可让用户选择重新生成，它执行 `knowledge.generateAllAIConfigs`（`src/commands/scenarioCommands.ts:62`）。**推断：** 用户可能以为换场景会改变这些配置内容，实际当前 router 不读场景，所以重新生成相同版本的正文不受场景影响；将来接入场景时这是一个真实的调用方，不应遗漏。

### 文件的用途与生成器动作不是一回事

**事实：** 生成的 `.github/copilot-instructions.md` 是提供给 Copilot/Agent 的常驻说明，正文把图谱定位为按需依赖导航器：架构/陌生代码/跨文件/依赖/影响分析优先 focused `query_graph`，再按需 `get_entity`/`get_neighbors`/`shortest_path`；仅审计关系时要 evidence；MCP 无效再读 agent-context index 和最匹配的一个组；不默认装入完整人工审计图；已知目标的小任务可跳过，改动/测试前核实当前源码，不编辑 graph.sqlite（`src/services/aiIntegrationService.ts:432`）。

**事实：** 此生成器本身只构建、写文件并由 UI 可选打开/显示路径。它不调用语言模型，不调用 MCP，不运行 source analysis，不生成/刷新图谱，不编辑数据库，不安装/配置 Copilot/MCP，也不验证 fallback 文件是否存在或 Copilot 最终有没有采用该文件（`src/services/aiIntegrationService.ts:71`、`:404`；`src/ui/commands/entityCommands.ts:1270`）。这些模板文字应作为待生成的内容理解，而不是对分析过程的执行指令。

### 覆盖、完成与错误契约

- **事实：已有目标直接覆盖。** 只检查 `.github` 是否存在，不检查目标内容；默认 `writeFileSync` 覆盖写，不提示、不 merge、不保留手工段落、不备份、无临时文件/rename 事务（`src/services/aiIntegrationService.ts:72`、`:80`）。**推断：** 项目特定内容若由用户手写在此文件内，重新生成会丢失；失败也没有回滚保证，可能留下已建目录或受写入影响的目标。因此“加入更多项目内容”前应明确生成器拥有整个文件还是仅某段。
- **事实：正常完成返回路径后才显示成功信息。** 可选 Open file 调 `openTextDocument`/`showTextDocument`；Show in folder 调 `revealFileInOS`；用户关闭通知则不做额外动作（`src/ui/commands/entityCommands.ts:1269`）。当前成功通知有双 `.github/`：调用者传 `.github/<basename>`，中英文 `success()` 又前缀 `.github/`（`:1271`；`src/i18n/en.ts:293`；`src/i18n/zh.ts:294`）。这只是展示路径错误，实际写入及打开使用服务返回的正确路径。
- **事实：service 不吞错。** mkdir、builder、write 的异常由 async 方法拒绝传播；UI 将 graphData 收集、生成、通知及完成后打开/显示动作放在同一个 try/catch，显示本地化错误并吞掉异常（`src/ui/commands/entityCommands.ts:1262`、`:1282`）。扩展外围 catch 仅接收逃出命令的异常，通常不会重复处理已被内部 catch 的生成失败（`src/extension.ts:680`）。
- **推断：** 图谱收集失败会导致根本没写文件；open/reveal 失败则可能已经写好文件、甚至已显示成功，仍收到“生成失败”，文件不回滚。错误消息没有区分这些阶段。新项目特定 builder 若读取额外文件/模板，其失败也会进入同一机制，应避免把“信息不足”和“无法写文件”混成同一结果。
- **事实：All 不是原子操作。** 两条 All 路径均先写 Cursor 再写 Copilot，任何一步失败就中断，没有撤销前一步（`src/services/aiIntegrationService.ts:89`；`src/ui/commands/entityCommands.ts:1306`、`:1332`）。**推断：** 第二步失败时 `.cursorrules` 已经生成/覆盖而 Copilot 可能保持旧值或写入失败；不能把 All 的异常解释成“两个文件均未修改”。

### 现有测试能证明什么，不能证明什么

1. `src/services/aiIntegrationService.test.ts:68` 用临时 workspace、空 mock 服务，真实调用 Copilot service 生成并读取返回路径，断言含 query-first/MCP 扩展/evidence/fallback 单组与“不默认读全图”的文字，且不含 template marker、Tech Stack、Dependency Details、Total Entities。这覆盖固定 compact router 的重要文本约束和基本 mkdir/write 成功路径；空服务能工作与“当前 builder 不访问服务数据”一致。**不能由此证明** UI 数据收集不被调用、非空 graphData 被忽略、路径一定等于指定 `.github/copilot-instructions.md`（测试只读返回路径），或真实 ScenarioManager 模板在所有状态下均被忽略。测试中的 workspaceFolders 为 undefined，模板 marker 文件也并非实际场景状态的全面模拟（`:16`、`:42`、`:69`）。
2. `src/services/aiIntegrationService.test.ts:100` 对 Cursor 验证类似紧凑 router、get_entity/fallback 和无模板/图谱 dump 的契约，有助于约束共享 builder 改动的连带影响。**缺口：** 没有中英文 title/locale matrix；上述 `zh` 与 `zh-CN` 不匹配不会被当前关键字断言发现。Copilot 固定英文也没有显式跨语言不变性测试。
3. `src/services/aiIntegrationService.test.ts:121`、`:144` 直接调用私有 JavaScript 技术栈 helper，证明不能把 `@types/node` 当 runtime，以及 engines/.nvmrc 的识别。**这不是生成 Copilot 的项目适配覆盖**，因为当前 generator 不走该 helper；若未来接入，应增加从实际 public generator 输入到文件输出的测试，而非依赖这些孤立 helper 测试。
4. 对 `src`/`tests` 中 Copilot/Cursor/Generate All 的现有测试检索只找到上述 service 内容测试，未见这些命令的交互集成测试。 consequential gaps 包括：第一 workspace root/无 workspace、getGraphData 失败、成功文案重复目录、取消通知、Open/Reveal 各成功/失败、已有文件的 overwrite/人工内容策略、mkdir/write 异常与部分写入、All 第二步失败的部分成功、场景触发 Generate All、服务 wrapper 与 UI 两份编排的一致性。也没有运行 Copilot 消费生成文件的测试；不能把写出文件等同于用户 Agent 已采用它。

**改动前的结论（推断/设计边界）：** 增加项目特定输出应首先确定真实输入与 fallback：哪些来自 unified graph，哪些来自当前源码/包文件，何时图谱不可用仍能生成；保留“按需导航而非无界图谱 dump”的现有契约，并明确覆盖所有权、部分成功与阶段化错误。需要决定改 Copilot 专用 builder 还是共享 router；前者局部，后者会同时改变 Cursor、两条 All 路径和场景重生成的结果。本报告不实现这些改变。
