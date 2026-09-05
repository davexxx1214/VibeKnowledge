# 功能变更前影响分析 — Arm B

分析范围：图谱页面/视图交互，以及 Generate Copilot Instructions。只进行了源码与测试阅读；未修改产品源码、运行测试/build、生成图谱或安装依赖。MCP 仅用于发现相关实现，返回的静态关系不作为运行时调用或测试通过的证据。下文引用均为本工作区的仓库相对路径与源码行号；“推论/风险”不是实测结果。

## 1. Visualization

### 1.1 从用户命令到当前显示的分组

**实现事实。** `knowledge.visualizeGraph` 在 manifest 中贡献为 “Knowledge: Visualize Graph”，也出现在 Knowledge Graph Explorer 标题栏；注册的回调调用 `GraphView.createOrShow(context.extensionUri)`，同步异常显示 “Error opening graph”。激活阶段把 KnowledgeGraphService 和 StructuralGraphService 注入 GraphView。（`package.json:57`、`package.json:244`；`src/extension.ts:242`、`src/extension.ts:643`）

GraphView 是 `currentPanel` 单例。首次创建允许脚本、`retainContextWhenHidden: true` 的 Webview，并生成 HTML；已有面板先 reveal，标题语言变化时重写 HTML，否则只发送图谱数据。dispose 清空单例并释放监听器。（`src/ui/webview/graphView.ts:128`、`src/ui/webview/graphView.ts:157`、`src/ui/webview/graphView.ts:186`）

页面 load 时先初始化 D3 SVG，再发送 `ready`；宿主响应性能模式和 `graphData`。图数据是 `_collectGraphGroups()` 生成的独立分组视图模型，而不是扁平化总图：普通分组包含 key/name/kind/order、实体、关系及描述、来源、Evidence、structuralKey/structuralPath。KnowledgeGraphService 的 `getGroups()` 保留跨分组重复符号；与之相对，`getSnapshot()` 才按统一身份去重。当前 `getObservations()` 实际恒返空数组，因此观察记录显示框架存在，但该服务当前不会提供观察内容。（`src/ui/webview/graphView.ts:205`、`src/ui/webview/graphView.ts:263`、`src/ui/webview/graphView.ts:457`、`src/ui/webview/graphView.ts:1205`；`src/services/knowledgeGraphService.ts:67`、`src/services/knowledgeGraphService.ts:152`、`src/services/knowledgeGraphService.ts:256`）

浏览器按 order、再 name 排序，并用 DOM 文本创建分组按钮，展示种类与实体/关系数量。`setGraphGroups` 尝试保持当前 key；找不到则选择首组。`selectGraphGroup` 先保存 key/更新选中按钮，再只渲染该组。空组显示 empty state；全无分组时还会停止布局/粒子并清空几何缓存。（`src/ui/webview/graphView.ts:1372`、`src/ui/webview/graphView.ts:1423`、`src/ui/webview/graphView.ts:1449`、`src/ui/webview/graphView.ts:1495`）

### 1.2 Advanced structural view 不是另一套持久化普通分组

**实现事实。** 工具栏有 Boundary/Community/File 下拉框和 ⌘ 按钮；改变下拉框本身不会发请求，点击按钮才发送 `requestStructuralOverview`。宿主读取现有结构事实图，调用 `aggregateStructuralGraph({level, limit:80})`，转成带 `__structural_` 前缀的临时组，发送 `structuralGroup`。浏览器删除旧的所有结构组、插入新组并立即选中；普通组仍保留，所以仍可点回普通组。（`src/ui/webview/graphView.ts:1101`、`src/ui/webview/graphView.ts:324`、`src/ui/webview/graphView.ts:518`、`src/ui/webview/graphView.ts:1401`、`src/ui/webview/graphView.ts:2091`、`src/ui/webview/graphView.ts:2172`）

相关交互共享这条临时组通路：

- 双击关系线/标签：只有非空 structuralPath 才发 `drillDownRelation`；宿主用 source/target/verb/文件/起止行的完整关系身份匹配当前事实图，取匹配关系及端点。缺少 path 会报错；path 存在但已无匹配时会形成空图，而非保证提示“路径失效”。该路径没有统一套用 80 节点/120 关系上限。（`src/ui/webview/graphView.ts:340`、`src/ui/webview/graphView.ts:627`、`src/ui/webview/graphView.ts:1601`、`src/ui/webview/graphView.ts:1685`）
- 普通实体 Shift+双击，或有 structuralKey 的普通实体右键：发送 `drillDownEntity`，读取双向一层结构影响，关系去重后最多 120 条、实体最多 80 个，最终再过滤掉端点不在实体切片内的关系。（`src/ui/webview/graphView.ts:365`、`src/ui/webview/graphView.ts:1778`、`src/ui/webview/graphView.ts:1791`）
- 聚合节点双击：按 aggregateFiles 优先，否则按文件/边界匹配，取内部原始实体/关系切片，上限 80/120。生成的 raw drilldown key 带 `Date.now()`，不是同一实体永久固定的视图 key。（`src/ui/webview/graphView.ts:407`、`src/ui/webview/graphView.ts:564`、`src/ui/webview/graphView.ts:1761`）
- 普通实体通常双击跳源码；raw structural 实体双击走 structuralKey 解析后跳源码。文件定位依赖第一工作区根路径及 1-based 行号到 VS Code 0-based Range 的转换；external 实体不打开。（`src/ui/webview/graphView.ts:647`、`src/ui/webview/graphView.ts:687`、`src/ui/webview/graphView.ts:1761`）

结构服务不可用、图文件不存在、读取或分析失败，宿主发送 `structuralError` 并弹 warning；页面显示状态提示并隐藏 loading，不把旧图主动清空。结构图只读入口缺文件会抛错，不在此交互里自动生成。（`src/ui/webview/graphView.ts:324`、`src/ui/webview/graphView.ts:450`、`src/ui/webview/graphView.ts:1296`；`src/services/structuralGraph/structuralGraphService.ts:63`）

### 1.3 性能选择器改变的是调度/效果，不是图谱事实

**实现事实。** 设置项 `knowledgeGraph.visualization.performanceMode` 只接受 low/high，默认 low、scope 为 machine。HTML 初始样式与变量来自当前设置。页面选择后立即应用模式、重渲染当前组、禁用选择器，再向宿主请求保存；宿主验证值后写 `ConfigurationTarget.Global`。保存失败会报错，但 finally 仍发实际设置值，让页面回滚并重新启用选择器。外部 Settings 修改也会向页面同步。（`package.json:325`；`src/ui/webview/graphView.ts:150`、`src/ui/webview/graphView.ts:300`、`src/ui/webview/graphView.ts:1091`、`src/ui/webview/graphView.ts:1283`、`src/ui/webview/graphView.ts:2077`、`src/ui/webview/graphView.ts:2176`）

- **low：** 仍用相同 D3 forces 求布局，但先停自动 simulation，通过 requestAnimationFrame 分批手动 tick，每批约 6ms，最多 120 ticks 或累计约 600ms 计算时间，或提前冷却完成；每批显式绘制，完成设 alpha=0 并停机。它是有界静态布局，不是“不计算布局”。单次 tick/render 若很慢仍可能超预算，预算不是硬实时抢占。（`src/ui/webview/graphPerformanceScript.ts:46`；`src/ui/webview/graphView.ts:1566`、`src/ui/webview/graphView.ts:1931`）
- low 不生成粒子、流动虚线 class、光晕标签背景和发光效果；全局禁 CSS animation/transition。hover 尺寸变化与 fit 直接应用；拖拽停止布局，只移动被拖节点并重绘相邻边/标签，不启动全图物理运动。（`src/ui/webview/graphView.ts:1080`、`src/ui/webview/graphView.ts:1594`、`src/ui/webview/graphView.ts:1618`、`src/ui/webview/graphView.ts:1668`、`src/ui/webview/graphView.ts:1727`、`src/ui/webview/graphView.ts:1823`、`src/ui/webview/graphView.ts:1950`；`src/ui/webview/graphPerformanceScript.ts:91`）
- **high：** 正常动态力导向，拖拽 reheat；提供粒子、虚线流动、发光及过渡。粒子只保留当前组的一条约 30fps 调度链，复用 path 查找，simulation 结束后缓存路径长度，几何变化时清除长度缓存。已缓存且 settled 的组在 high 也不会无条件重跑力布局，但粒子仍可运行。（`src/ui/webview/graphView.ts:1151`、`src/ui/webview/graphView.ts:1234`、`src/ui/webview/graphView.ts:1572`、`src/ui/webview/graphView.ts:1624`、`src/ui/webview/graphView.ts:1823`、`src/ui/webview/graphView.ts:1922`；`src/ui/webview/graphPerformanceScript.ts:97`）
- 自动 fit：low 在静态布局完成时执行，high 首次约 1 秒后执行；用户 zoom/pan 或拖动关闭当前 autoFit，防止覆盖用户操作。手动 Fit 仍可用，缩放限制为 0.1–4。resize 120ms 防抖，low 直接 fit，high 可见时以 alpha 0.15 重启。因此“记住视角”不等于 resize 永不改变视角。（`src/ui/webview/graphView.ts:1210`、`src/ui/webview/graphView.ts:1360`、`src/ui/webview/graphView.ts:1933`、`src/ui/webview/graphView.ts:1957`、`src/ui/webview/graphView.ts:2053`）

### 1.4 哪些状态能保留

| 状态/事件 | 当前行为与边界 |
| --- | --- |
| 普通组之间切换 | `vscode.setState({selectedGroupKey})` 保存当前 key；换图前保存旧组几何。命中缓存则恢复 x/y、zoom transform、alpha、settled、autoFit。不是保存原始数据、速度或固定节点状态。 |
| 布局缓存有效性 | 以 group key 加排序后的实体 ID、关系 sourceId/targetId/verb 拓扑签名匹配。描述、Evidence、关系 ID 等变化不会使布局失效，但渲染数据取新的组对象。缓存是页面内存 LRU，最多 8 组、总计 2000 节点；单项节点超过 2000、关系超过 16000 或坐标非有限数不缓存。 |
| 隐藏再显示同一页面 | retainContextWhenHidden 保留页面上下文。visibilitychange 隐藏时停粒子、暂停静态批次、停 simulation、打断 D3 transitions、清 fit/resize timer，并保存布局；重新可见时恢复未完成静态布局，或只重启仍未冷却的 high simulation，并恢复粒子。 |
| 再执行可视化命令/reveal | 相同语言标题不会替换 HTML，普通组 key 和有效几何缓存可继续使用；但仍发送 `graphData`，浏览器整体替换 group 数组。结构组不在该消息里，因此若当前为结构组会退回普通首组，或显示空状态。仅仅 tab 隐藏/再可见、不调用 createOrShow，则不因此删除结构组。 |
| HTML 重建与关闭后重新打开 | 标题语言变化会重写 HTML，页面内存缓存与临时结构组重建；代码只尝试从 VS Code state 读 selected key。关闭会 dispose，之后新建 panel。没有 serializer 或宿主的分组/布局持久化实现，因此不能把 getState 等同于关闭重开/重启后恢复整个视图；新 panel 默认走首组选择，几何重新计算。 |
| 性能模式 | 全局 machine 设置，不在布局缓存/setState 中；新建面板也重新读取，因此关闭后仍保留。 |

表中实现依据：`src/ui/webview/graphView.ts:157`、`src/ui/webview/graphView.ts:186`、`src/ui/webview/graphView.ts:1141`、`src/ui/webview/graphView.ts:1254`、`src/ui/webview/graphView.ts:1372`、`src/ui/webview/graphView.ts:1453`、`src/ui/webview/graphView.ts:1479`、`src/ui/webview/graphView.ts:1556`；`src/ui/webview/graphPerformanceScript.ts:7`。关闭重开结论是上述生命周期及 `src` 中无 `registerWebviewPanelSerializer` 的源码推论，非真实 VS Code 实测。

另两个细节影响后续持久化设计：当前 `setState` 覆盖整个对象，而非合并其他字段；空 graphData 把内存 selectedGroupKey 置 null，却未同步写 null 到 VS Code state。新增持久字段或改变空状态恢复策略时，必须明确这些行为。（`src/ui/webview/graphView.ts:1378`、`src/ui/webview/graphView.ts:1453`）

### 1.5 变更须保留的依赖与失败边界

1. **分组身份、端点与来源不能被缓存混淆。** 普通组不是 aggregate snapshot；渲染依赖组内 endpoint ID，D3 会修改新建 nodes/links 副本。缓存只能重用几何，不能让旧描述/Evidence 或其他组的对象覆盖新数据。raw structural/aggregate/curated 的 source 区分还决定双击行为。（`src/services/knowledgeGraphService.ts:147`；`src/ui/webview/graphView.ts:1504`、`src/ui/webview/graphView.ts:1552`、`src/ui/webview/graphView.ts:1761`；`src/ui/webview/graphPerformanceScript.ts:7`）
2. **一组活动任务及取消顺序。** 重渲染先停粒子/静态任务/simulation，再保存旧闭包指向的布局，清 timer/transition/DOM。缓存必须保留“尚未完成”状态，不能快速切组一次就把初始布局当 settled；隐藏/卸载后也不能遗留循环。改变 mode 要经过同样清理而不是叠加调度器。（`src/ui/webview/graphView.ts:1272`、`src/ui/webview/graphView.ts:1479`、`src/ui/webview/graphView.ts:1574`、`src/ui/webview/graphView.ts:2077`）
3. **空数据、渲染异常、结构异常是不同状态。** 选组渲染异常及静态任务异步异常进入 render-error，并停止相关工作；结构请求失败则保留旧图。分组 key 在渲染前已经持久化，所以报错不会自动回退到上一组。现有结构消息也没有 request id/“仍是当前请求”检查，新增异步处理时须防旧响应夺回选择。（`src/ui/webview/graphView.ts:1449`、`src/ui/webview/graphView.ts:1465`、`src/ui/webview/graphView.ts:1934`、`src/ui/webview/graphView.ts:1280`）
4. **浏览器启动依赖本地 D3 与 CSP。** HTML 加载 `dist/d3.min.js`，脚本受 nonce/CSP 限制；`initGraph()` 在 ready 之前运行且不在 selectGraphGroup 的 catch 内。推论：D3 缺失等初始化失败不一定进入现有 render-error，可能停在 loading。主命令的同步 catch 也不覆盖之后所有 message/浏览器回调失败。（`src/ui/webview/graphView.ts:718`、`src/ui/webview/graphView.ts:751`、`src/ui/webview/graphView.ts:1205`；`src/extension.ts:643`）
5. **偏好保存的确认通路。** 正常 UI 先乐观切换，再等宿主确认；失败回滚必须重新启用选择器，不能把不落盘的暂态显示成已保存。宿主忽略非法 mode；正常选择器只发合法值，但消息丢失或处理异常可能使控件一直 disabled，当前没有超时重试。（`src/ui/webview/graphView.ts:309`、`src/ui/webview/graphView.ts:1283`、`src/ui/webview/graphView.ts:2176`）

### 1.6 现有测试能保证什么，不能保证什么

| 风险 | 已有测试证据 | 范围/缺口 |
| --- | --- | --- |
| 配置默认、同步、失败回滚、保留 HTML | `src/ui/webview/graphView.test.ts:58` 检查 machine/low、两个选项与 inline JS 可解析；`:79` 检查 Global 写入、再次 createOrShow 不重写 HTML、新建时 mode；`:96` 检查 Settings 同步、失败回报实际 mode、非法输入不写。 | mock Webview，不执行完整 DOM。所谓 reopen 覆盖的是性能设置，不是 selectedGroupKey/zoom/结构组恢复。 |
| low 响应性、冷却/预算、隐藏取消、错误收敛 | `src/ui/webview/graphPerformanceScript.test.ts:49`、`:65`、`:81`、`:95` 在 VM 中运行实际嵌入 helper，检查分批 tick、120/时间/冷却终止、暂停/恢复/停止、失败不留 frame。 | fake scheduler/simulation，不证明真实 D3 + 大图墙钟时延，也未执行页面 visibilitychange 的整个联动。 |
| 缓存正确性与拖拽行为 | 同文件 `:105` 检查 prose 不失效而拓扑变化失效；`:119` 检查 LRU/组节点数量；`:133` 检查未完成 alpha/autoFit 保留；`:142` 检查 low 直接移动与 high restart。 | 无完整 A→B→A、mode 中途切换、zoom/autofit 时序测试；未直接断言超大边数与非有限坐标拒绝、真实 D3 几何恢复。 |
| 独立分组、稳定 ID 与坏端点 | `src/services/knowledgeGraphService.test.ts:60` 检查跨组重复实体保留且组内 ID 可解析；`src/services/agentGraph/agentGraphService.test.ts:286` 检查排序/稳定组特定 ID/Evidence/path；`:357` 检查坏端点不暴露部分图。 | 服务数据合同，不等于 sidebar、空态、缓存及结构切换的 UI 覆盖。 |
| Tooltip 和结构分析依赖 | `src/ui/webview/graphWebviewClientScript.test.ts:6` 用实际 tooltip 脚本检查 provenance/Evidence/path 提示不抛错；`src/services/structuralGraph/structuralAnalysis.test.ts:15` 验证 source-backed impact/path，`:60` 验证聚合 limit/truncated/count。 | 未覆盖 GraphView 请求到结构组、聚合双击、精确 path 匹配失效、缺图报错、源码跳转、临时组被 reveal 替换。 |

优先补足的验证（建议，未实施）：真实页面切组并恢复视角/未冷却布局；隐藏/恢复/关闭/语言重建；high/low 切换时只有一条调度链；手动 zoom/drag 不被延迟 fit 覆盖；结构组 reveal/普通 refresh 丢失的明确合同；D3 加载失败、空图/坏端点和结构请求错误。现有源码测试中没有找到这些完整交互测试；不能把可选 smoke HTML 产物分支当成已执行浏览器测试（`src/ui/webview/graphView.test.ts:72`）。

## 2. Generate Copilot Instructions

### 2.1 UI → 输入 → 内容 → 文件 → 完成处理

**实现事实。** manifest 贡献命令 `knowledge.generateCopilotInstructions`（“Knowledge: Generate Copilot Instructions”），extension 注册 async 回调并 await `entityCommands.generateCopilotInstructions()`；外层 catch 记录日志、显示兜底错误。EntityCommands 构造时创建 AIIntegrationService，传 EntityService/RelationService/ObservationService。（`package.json:86`；`src/extension.ts:680`；`src/ui/commands/entityCommands.ts:23`）

实际用户流程如下：

1. 取 `workspaceFolders?.[0]`。无工作区则提示并返回；没有选择目录/活动文件/可视化分组的交互。（`src/ui/commands/entityCommands.ts:1255`）
2. 在 try 内 `getGraphData()`：读取 unified KnowledgeGraph snapshot，逐实体询问 observations，封装 entities/relations/observations/sourceType='knowledge'。当前 `KnowledgeGraphService.getObservations` 恒返 []。（`src/ui/commands/entityCommands.ts:42`；`src/services/knowledgeGraphService.ts:256`）
3. 调用 `AIIntegrationService.generateCopilotInstructions(firstWorkspace.fsPath, graphData)`。虽然注释声称可以使用默认服务获取图数据，实际参数名是 `_graphData`，函数不使用它。检查 `.github` 是否存在，必要时递归 mkdir；以固定 builder 生成内容，`writeFileSync(...,'utf-8')` 写入 `<workspaceRoot>/.github/copilot-instructions.md`，返回绝对路径。（`src/services/aiIntegrationService.ts:66`）
4. 成功写入后才显示成功通知，提供“打开文件”“在文件夹中显示”；分别调用 openTextDocument/showTextDocument，或 `revealFileInOS`。用户关闭通知不撤销生成，也不会自动打开文件。单项命令没有进度/cancel 或覆盖确认。（`src/ui/commands/entityCommands.ts:1262`）

完成文案有可见瑕疵：调用方已传 `.github/${basename}`，中英文 `success` 又加 `.github/`，所以通知会显示 `.github/.github/copilot-instructions.md`。实际文件路径、打开文件和 reveal 使用 service 返回的路径，并没有双层目录。（`src/ui/commands/entityCommands.ts:1271`；`src/i18n/en.ts:293`；`src/i18n/zh.ts:294`）

### 2.2 表面输入与真正影响输出的依赖

**结论：当前 Copilot 内容是固定英文、确定性的导航指令，不是项目摘要或 AI 模型生成。** `buildCopilotInstructionsContent()` 仅调用 `buildAgentKnowledgeRouterContent('en', '# VibeKnowledge Agent Instructions')`；后者按固定行数组 join，无项目名、日期、技术栈、路径插值、图谱统计、模型调用。（`src/services/aiIntegrationService.ts:404`）

| 表面输入/依赖 | 当前实际影响 |
| --- | --- |
| workspaceRoot、`.github` 是否存在、磁盘权限 | 决定写哪里、是否创建目录、操作能否完成；不改变内容文本。第一工作区选择是 UI 调用方的合同，service 自身使用传入 root。 |
| GraphData 的 entities/relations/observations/sourceType | UI 确实构建并传入，但 Copilot writer 忽略；有无数据甚至空图都不改变正文。收集仍消耗工作、可能在写前抛错，因此是运行依赖而非内容依赖。 |
| 注入 EntityService/RelationService/ObservationService、DependencyAnalyzer | service 构造仍保存引用并构造 DependencyAnalyzer；后者构造函数只保存两个引用。当前 Copilot builder 不调用这些服务或分析器。 |
| 工作区名、package/技术栈、依赖统计、关系数量设置 | 旧的 rich Cursor CN/EN builder 和辅助函数仍存在，但当前 Cursor dispatcher 已直接调用 router，Copilot 也不调用旧路径。这些类级静态依赖不能推出生成内容使用它们。 |
| 自定义 AI 模板 / ScenarioManager / 当前 scenario | `readCustomAITemplate()` 只在旧 rich Cursor builders 中调用；router 不调用，也不读取模板。切换场景后可触发重新生成，但不会因此让当前 Copilot 指令变为该场景专属。 |
| UI 语言 | 决定通知文案；Copilot builder 硬编码 en，不随 UI 语言变中文。 |

依据：`src/ui/commands/entityCommands.ts:42`、`src/ui/commands/entityCommands.ts:1255`；`src/services/aiIntegrationService.ts:45`、`src/services/aiIntegrationService.ts:71`、`src/services/aiIntegrationService.ts:101`、`src/services/aiIntegrationService.ts:114`、`src/services/aiIntegrationService.ts:233`、`src/services/aiIntegrationService.ts:259`、`src/services/aiIntegrationService.ts:404`、`src/services/aiIntegrationService.ts:691`、`src/services/aiIntegrationService.ts:718`；`src/services/dependencyAnalyzer.ts:50`。

**推论。** 项目特定化不能只修改 GraphData 收集或技术栈提取：还需把内容真正接到当前可达 builder。反之，若只编辑遗留 `buildCursorRulesContentCN/EN`，正常生成路径不会变化。若接入新数据，应区分“读取失败时是否仍生成通用 router”和“必须拒绝生成”，因为目前不必要的 snapshot 收集已经可能阻止一个本可独立写出的固定文件。

### 2.3 相关生成路径共享什么

- Cursor 输出到根目录 `.cursorrules`；其公开 writer 调 `buildCursorRulesContent`，与 Copilot 共享 `buildAgentKnowledgeRouterContent`。修改共享正文会影响二者；修改 Copilot title/locale wrapper 则只影响 Copilot。（`src/services/aiIntegrationService.ts:58`、`src/services/aiIntegrationService.ts:101`、`src/services/aiIntegrationService.ts:404`）
- **当前 locale 不匹配：** Cursor dispatcher 用 `getLocale() === 'zh'` 决定语言，但 `getLocale()` 返回的是 `zh-CN` 或 `en-US`。按当前实现，两种配置都进入英文分支，中文 router 分支不会由该入口到达。这是源码推导的现有行为，不应仅凭“调用 getLocale”就宣称 Cursor 正常本地化。（`src/services/aiIntegrationService.ts:101`；`src/i18n/i18nService.ts:126`、`src/i18n/i18nService.ts:148`）
- `EntityCommands.generateAllAIConfigs()` 收集一次同样的 GraphData，以不可取消进度依次调用 Cursor writer 和 Copilot writer，最后提供打开任一文件；它并未调用 service 自己的 `generateAllAIConfigs` helper。后者也是依次 await 两个 writer 并返回路径列表。因此批量入口与单项入口共享真正的内容与写入实现。（`src/ui/commands/entityCommands.ts:1290`；`src/services/aiIntegrationService.ts:89`；`src/extension.ts:692`）
- `switchAIScenarioCommand` 在实际切换 scenario 后询问是否重新生成，只有用户选 Generate 才 execute `knowledge.generateAllAIConfigs`。这条可达路径会重写同样的 router，而不是把当前 scenario 模板注入正文。（`src/commands/scenarioCommands.ts:50`；`src/services/aiIntegrationService.ts:411`）

### 2.4 文件已存在、失败和部分成功

**实现事实。** writer 只检查 `.github` 目录存在，不检查目标文件是否存在；`writeFileSync` 无 append/独占 flags，没有 merge、backup、内容比较、确认、temp-file rename 或回滚。已有指令会被完整覆盖；相同内容也会重写。service 是 async 签名但执行同步 mkdir/write，异常成为 rejected promise 并传播给 await 调用方。（`src/services/aiIntegrationService.ts:71`）

命令层 try 包括图数据收集、生成、成功通知及后续打开/reveal，catch 统一显示 “Failed to generate…” 并吞掉异常。故收集失败可以阻止写入；mkdir/write 失败不显示成功；打开文件/reveal 失败也会报“生成失败”，即使文件已写成功。外层 extension catch 仅负责未被命令层处理的异常，而非通常要重复弹两次。（`src/ui/commands/entityCommands.ts:1262`；`src/extension.ts:680`）

**推论/风险。** 如果 `.github` 实际是文件，存在检查不会发现类型错误，后续写子路径失败；同步直接写入发生中途错误时没有原子替换保证，旧文件不能视为始终可恢复。即使内容 builder 失败，前面创建的 `.github` 目录也不会回滚。批量生成先写 `.cursorrules`，如果后续 Copilot 步骤失败，Cursor 文件仍已生成/覆盖，整体错误不能表示“两个文件都没改”。若第一步失败，第二步不会运行。（`src/services/aiIntegrationService.ts:58`、`src/services/aiIntegrationService.ts:71`、`src/services/aiIntegrationService.ts:89`；`src/ui/commands/entityCommands.ts:1306`）

未来项目特定输出应明确保留/更新已有用户指令的策略，以及批量操作部分成功的告知；不能默认当前生成器保护手工修改。以上仅为变更边界建议，本次没有执行生成。

### 2.5 生成文件的用途，不等于生成器执行的动作

**实现事实。** 文件向后续 AI 编程助手提供“按需依赖导航器”策略：架构/陌生代码/跨文件依赖/影响分析优先聚焦 `query_graph` 与 tokenBudget；按需用 get_entity/get_neighbors/shortest_path 扩展，仅审计关系时请求 Evidence；MCP 不可用或无有效结果时再读 agent-context/index 并只加载最匹配组；不默认读完整 knowledge-graph.md；小型已知文件任务可跳过图谱；修改/测试前验证当前源码；禁止直接编辑 graph.sqlite。（`src/services/aiIntegrationService.ts:435`）

这些工具名和路径只是被写入 Markdown 的文字。当前 generator 本身不调用 MCP、不检测其是否可用、不读取这些知识产物、不生成/刷新图谱、不编辑 SQLite、不安装 Copilot/配置 MCP，也不替用户执行任何图谱查询或源码修改。写文件成功仅说明指令文件已输出，不证明 Copilot 已加载/遵从它或引用的图谱资产可用。（`src/services/aiIntegrationService.ts:71`、`src/services/aiIntegrationService.ts:404`；`src/ui/commands/entityCommands.ts:1255`）

### 2.6 测试合同与重要缺口

**已有覆盖。** `src/services/aiIntegrationService.test.ts:68` 在临时工作区预置模板 marker，调用真实 Copilot writer 并读取返回路径，断言包含 query_graph/get_neighbors/shortest_path/Evidence、fallback index、单最佳分组策略和不要默认读全图，同时不包含模板 marker、Tech Stack、Dependency Details、Total Entities。服务用空对象模拟三个依赖、未提供 GraphData，因此该测试支持“紧凑 router、无默认数据服务调用”的当前合同；其成功路径也经过缺失 `.github` 时的创建/写入，但未明确断言准确目的路径。（同文件 `:42`、`:68`）

Cursor 测试 `src/services/aiIntegrationService.test.ts:100` 断言共享的 query-first/fallback 内容且无模板/图谱 dump。`:121`、`:144` 的 Node runtime tests 是通过强制访问私有 `extractJavaScriptTechStack`，验证 @types/node 不是运行时以及 engines/.nvmrc 解析；它们**不是**“生成的 Copilot 文件已使用技术栈”的证据，也不能证明旧 rich builder 可达。

**后续变更前应补的验证（建议，未实施）。**

1. 显式传入两个不同非空 GraphData、不同 workspace 名/技术栈/scenario，当前应相同或在变更后按明确定义的字段变化；覆盖 observations 当前为空与 missing graph 的策略。现有模板 marker 测试不是对 ScenarioManager 的 spy，更不是跨 scenario 的端到端断言。
2. 目的文件精确路径、UTF-8、已存在自定义文件的覆盖/保护合同；`.github` 为文件、权限拒绝、mkdir/write 抛错；验证不会错误报告成功，以及新策略需要时的原子写/恢复。
3. 命令 no-workspace、第一工作区、多根工作区、snapshot 失败、成功通知 dismiss/open/reveal、打开失败但文件仍存在。现有测试没有实例化 EntityCommands 或注册真实 command 链，因此也没捕获重复 `.github/` 通知路径。
4. Copilot 始终英文的明确断言与 Cursor zh-CN/en-US 语言回归；现有 tests 只检查少量词句，没有捕获当前 locale 比较错误。
5. 批量生成顺序、共享 writer、第一/第二步失败时的部分写入状态，及 scenario regenerate 路由；防止误以为 generateAll 是原子操作。
6. 确认 generator 不读取 full graph、不调用 MCP/模型/刷新产物，而不仅是断言生成文本没有某些标题；若未来项目特定化需要这些动作，应把新副作用与失败策略明确纳入合同。

上述缺口判断基于已读 `src/services/aiIntegrationService.test.ts` 与对 src/tests 中生成命令相关测试引用的搜索；不宣称测试已运行，也不把 MCP 静态图里的 references 边当成实际测试覆盖。
