# 匿名答案盲评分

依据 rubric.md 和 notes.md；仅核对指定匿名答案及保留源码/测试，未运行测试。分数为 0 / 0.5 / 1；关键项与补充项分开，不按篇幅或方法评分。

源码定位均相对于 `D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-ab-jzyaQm/snapshot`；答案定位相对于 `D:/workspace/VibeKnowledge/.vscode-test/mcp-blind-3XqHKL`。

| 候选 | visualization 关键/补充 | instructions 关键/补充 | 总关键 | 总补充 | 重大错误 |
| --- | --- | --- | --- | --- | --- |
| X | 9/9 · 2/2 | 7.5/8 · 1/1 | 16.5/17 | 3/3 | 0 |
| Y | 9/9 · 2/2 | 8/8 · 1/1 | 17/17 | 3/3 | 0 |

## 评分口径说明

- I.C7：rubric 中 Cursor locale-aware 的括注不精确；notes 已要求以共享 builder 与顺序写入契约评分。 getLocale 返回 zh-CN/en-US 而 wrapper 比较 zh；X.md:90 与 Y.md:83 的英文分支推论都与源码一致，不扣分、不记重大错误。 证据：`src/services/aiIntegrationService.ts:101-108`；`src/i18n/i18nService.ts:126-127`；`src/i18n/i18nService.ts:148-149`。
- I.C1：X 覆盖真实方法的缺工作区 guard，却未覆盖 rubric 明列的激活占位注册分支。 这是独立公共命令路由的遗漏，不是缺少某个行号、枚举例子或文字量；按 materially incomplete relationship 记 0.5，只记遗漏而非错误声明。 证据：`X.md:65-69`；`src/extension.ts:48-54`；`src/extension.ts:960-998`。

## 候选 X

### visualization

关键项 9/9；补充项 2/2。

| 项目 | 分数 | 依据与答案定位 | 源码/测试定位 |
| --- | --- | --- | --- |
| V.C1 命令、宿主依赖与页面生命周期 | 1 | 正确连起命令、两服务注入、单例面板、隐藏保留及 ready 后发送模式和分组；并说明数据消息经客户端选择后 renderGraph，不把重执行命令等同新文档。 答案：`X.md:9-15`「已有面板时先 reveal；标题仍匹配当前语言时只发送数据、不重新设置 HTML」 | `package.json:57`；`src/extension.ts:242-243`；`src/extension.ts:643-651`；`src/ui/webview/graphView.ts:157-210`；`src/ui/webview/graphView.ts:263-273`；`src/ui/webview/graphView.ts:1205-1208` |
| V.C2 独立分组、选择及存储状态 | 1 | 明确 getGroups 独立模型、排序、单组选中渲染、webview state 保存 key 及空列表清理；与全局性能设置、仅页内几何缓存相互区分。 答案：`X.md:13-15,26,37`「恢复仍存在的 selectedGroupKey，否则选第一组」 | `src/ui/webview/graphView.ts:456-515`；`src/ui/webview/graphView.ts:1141-1150`；`src/ui/webview/graphView.ts:1372-1398`；`src/ui/webview/graphView.ts:1423-1462` |
| V.C3 按需、临时高级结构视图 | 1 | 说明显式按钮按 level 请求、读结构图并聚合、临时替换选中和普通数据重发会移除高级组；错误发 structuralError/warning 并保留旧图，整体因果没有把此页面请求当作生成或永久分组写入。 答案：`X.md:17-20,45,56`「收到 structuralGroup 后客户端删除所有旧 __structural_ 组，添加新组并立即选中，普通组保留」 | `src/ui/webview/graphView.ts:223-225`；`src/ui/webview/graphView.ts:324-337`；`src/ui/webview/graphView.ts:446-453`；`src/ui/webview/graphView.ts:1287-1299`；`src/ui/webview/graphView.ts:1372-1413`；`src/ui/webview/graphView.ts:2091-2095`；`src/services/structuralGraph/structuralGraphService.ts:63-69` |
| V.C4 性能偏好的作用域和权威状态 | 1 | 正确说明 low/high、machine 与 Global，初始化/配置监听/finally 重读实际设置，以及跨关闭重取；不把模式当图数据、组选中或几何状态。 答案：`X.md:26,47`「默认 low，scope 为 machine」 | `package.json:325-338`；`src/ui/webview/graphView.ts:150-154`；`src/ui/webview/graphView.ts:205-214`；`src/ui/webview/graphView.ts:300-321`；`src/ui/webview/graphView.ts:1091`；`src/ui/webview/graphView.ts:1140` |
| V.C5 乐观选择、确认与保存失败回退 | 1 | 完整描述立即应用、当前组重绘、禁用、合法值校验、全局更新、错误确认回退和外部设置同步；无整页 HTML 重载误述。 答案：`X.md:26,54`「保存失败显示错误，并在 finally 回传实际配置，客户端重新启用 selector，因而撤销乐观选择」 | `src/ui/webview/graphView.ts:150-154`；`src/ui/webview/graphView.ts:309-321`；`src/ui/webview/graphView.ts:1283-1286`；`src/ui/webview/graphView.ts:2077-2084`；`src/ui/webview/graphView.ts:2176-2182`；`src/ui/webview/graphView.test.ts:96-109` |
| V.C6 模式改变渲染工作而非图谱语义 | 1 | 将相同节点/边和交互语义与 low 的有界让出计算及关闭特效、高模式动画分开；说明 low 拖动不重启整图、高拖动重启及 settled 高模式可停，且不把计算预算作墙钟 SLA。 答案：`X.md:28-33,43`「这是有界分批布局，不是完全不做布局计算」 | `src/ui/webview/graphView.ts:1495-1512`；`src/ui/webview/graphView.ts:1552-1579`；`src/ui/webview/graphView.ts:1594-1619`；`src/ui/webview/graphView.ts:1931-1959`；`src/ui/webview/graphPerformanceScript.ts:48-88`；`src/ui/webview/graphPerformanceScript.ts:91-118` |
| V.C7 隐藏、替换与卸载的工作控制 | 1 | 连接旧几何保存、停旧布局/仿真/粒子、隐藏清计时器及转场、可见时有条件恢复和卸载清理；明确保留上下文不等于持续后台计算。 答案：`X.md:37,44,52`「切组、变模式、空态、错误、隐藏和 unload 都要停止旧任务，否则可能后台耗电或旧任务写新 DOM」 | `src/ui/webview/graphView.ts:1234-1278`；`src/ui/webview/graphView.ts:1479-1493`；`src/ui/webview/graphPerformanceScript.ts:77-88` |
| V.C8 几何复用的拓扑与生命周期边界 | 1 | 说明组 key 加节点 ID/关系端点和 verb 校验、文案更新复用而拓扑改变失效、位置和 zoom 的用户可见恢复，并区分新文档缓存消失与持久性能偏好及 selected key。 答案：`X.md:37-47,53`「key 与拓扑签名必须匹配」 | `src/ui/webview/graphPerformanceScript.ts:7-43`；`src/ui/webview/graphView.ts:1141-1150`；`src/ui/webview/graphView.ts:1453-1454`；`src/ui/webview/graphView.ts:1556-1579`；`src/ui/webview/graphPerformanceScript.test.ts:105-117` |
| V.C9 回归测试与交互风险的对应 | 1 | 分别将 host 设置/失败同步、静态布局/生命周期/拖动、拓扑/缓存三类风险映射到现有测试；准确限定 helper 执行与 mock host/脚本语法测试，不声称真实浏览器或 VS Code E2E。 答案：`X.md:53-55,59`「没有实际执行整页分组选择/模式切换/隐藏显示/关闭重开序列的测试」 | `src/ui/webview/graphView.test.ts:18-47`；`src/ui/webview/graphView.test.ts:58-109`；`src/ui/webview/graphPerformanceScript.test.ts:5-38`；`src/ui/webview/graphPerformanceScript.test.ts:49-165` |
| V.S1 未完成布局进度与自动适配意图 | 1 | 说明 settled、alpha、autoFit 的保存/恢复和快速切组防冻结，且用户 zoom/drag 禁止后续自动 fit；也正确限定相应测试只是字段测试。 答案：`X.md:33,37,43,53`「恢复 A 的几何、视口和未完成布局进度」 | `src/ui/webview/graphPerformanceScript.ts:24-33`；`src/ui/webview/graphView.ts:1360-1367`；`src/ui/webview/graphView.ts:1556-1579`；`src/ui/webview/graphView.ts:1933-1959`；`src/ui/webview/graphPerformanceScript.test.ts:133-140` |
| V.S2 缓存准入、容量与淘汰 | 1 | 清楚解释节点 x/y 准入、超大节点/边拒存、总组/节点限额和 LRU 淘汰，作用对象是缓存而非源图实体上限。 答案：`X.md:39,53`「默认最多 8 组、所有组共 2000 节点，按最近使用淘汰；拒绝非有限坐标」 | `src/ui/webview/graphPerformanceScript.ts:8-40`；`src/ui/webview/graphPerformanceScript.test.ts:119-130` |

主要遗漏：未发现本任务评分项所要求的主要因果关系遗漏。

重大错误：无（major_false_claims = []）。

### instructions

关键项 7.5/8；补充项 1/1。

| 项目 | 分数 | 依据与答案定位 | 源码/测试定位 |
| --- | --- | --- | --- |
| I.C1 命令到首个工作区写入器及返回路径 | 0.5 | 命令注册、EntityCommands/AIIntegrationService、第一工作区、服务返回路径及可选打开/reveal 均正确；但只说明真实方法自己的缺工作区 guard，遗漏激活时缺工作区会改为注册 warning 占位命令并提前返回的独立路由，故此项关系不完整。 答案：`X.md:65-69,99,112`「UI handler 固定选择 workspaceFolders?.[0]，没有 workspace 时提示并返回」 | `package.json:86-88`；`src/extension.ts:48-57`；`src/extension.ts:680-689`；`src/extension.ts:960-998`；`src/ui/commands/entityCommands.ts:23-39`；`src/ui/commands/entityCommands.ts:1255-1284`；`src/services/aiIntegrationService.ts:71-81` |
| I.C2 被忽略的 GraphData 仍是上游依赖 | 1 | 明确真实上游 snapshot/逐实体 observations 收集与传递、_graphData 未使用和零参数 builder，正确解释正文不个性化但采集仍有执行成本与阻断失败后果。 答案：`X.md:67,76-78`「snapshot/observation 读取若抛错，会被 handler 捕获并跳过写入」 | `src/ui/commands/entityCommands.ts:43-62`；`src/ui/commands/entityCommands.ts:1262-1283`；`src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-414` |
| I.C3 目标文件、直接覆盖与失败语义 | 1 | 正确给出 .github 递归创建、UTF-8 同步覆盖、返回路径、I/O 拒绝传播以及手改丢失/失败可能有部分副作用，没有声称原子性或回滚。 答案：`X.md:69,98,101`「没有 overwrite 确认、合并、保留用户段落、备份或临时文件原子替换」 | `src/services/aiIntegrationService.ts:71-81`；`src/ui/commands/entityCommands.ts:1262-1283` |
| I.C4 固定英文紧凑路由器的活动派发 | 1 | 说明活动 wrapper 固定 en 并调用共享字符串 router，与旧富模板/技术栈/场景 helper 的未调用路径作明确区别，正确排除 UI locale 与 GraphData 对正文的影响。 答案：`X.md:76,79-82`「当前入口直接路由到紧凑共享 builder」 | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:101-120`；`src/services/aiIntegrationService.ts:259-265`；`src/services/aiIntegrationService.ts:404-447`；`src/services/aiIntegrationService.ts:691-712` |
| I.C5 聚焦查询、有限回退及源码核验 | 1 | 覆盖有条件聚焦查询、局部扩展/证据、单组回退、不默认全报告、小任务可跳过和源码核验；把紧凑导航契约与恢复旧完整图谱/模板的改变联系起来。 答案：`X.md:82,106,118`「MCP 不可用或局部结果无用时才读取 agent-context/index.md 和一个最匹配分组」 | `src/services/aiIntegrationService.ts:435-442`；`src/services/aiIntegrationService.test.ts:83-98` |
| I.C6 写入指令文字与实际执行的边界 | 1 | 明确不是执行 MCP/LLM、刷新图谱或安装配置，且不检查 fallback/产物是否存在或消费者是否加载；满足文字与执行/产物边界，而非只罗列禁止动作。 答案：`X.md:69,84,116`「服务真正做的是组装固定字符串并写文件」 | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-447`；`src/ui/commands/entityCommands.ts:1255-1284` |
| I.C7 共享构建器与顺序批量生成 | 1 | 正确连接 Cursor/Copilot 共用 router 与局部 wrapper 修改范围，并说明 UI 和服务两条 All 路径顺序写 Cursor 后 Copilot、第二步失败保留第一步覆盖结果；语言分支推论也与源码一致。 答案：`X.md:88-94,102,118`「修改共享导航 builder 会同时改变两个文件」 | `src/services/aiIntegrationService.ts:58-63`；`src/services/aiIntegrationService.ts:89-108`；`src/services/aiIntegrationService.ts:404-414`；`src/extension.ts:692-699`；`src/ui/commands/entityCommands.ts:1290-1334` |
| I.C8 回归证据与实际测试边界 | 1 | 准确说明 Copilot 正向查询/回退和负向模板/图谱标题断言、Cursor 共享回归风险及技术栈 helper 不是当前输出证明；列明非空 GraphData 未直测、服务/临时文件测试不覆盖 UI、覆盖保护、失败/回滚或实际 Copilot。 答案：`X.md:106-116`「当前测试只省略 graphData」 | `src/services/aiIntegrationService.test.ts:16-58`；`src/services/aiIntegrationService.test.ts:68-119`；`src/services/aiIntegrationService.test.ts:121-163` |
| I.S1 写入完成后展示失败仍可能报生成失败 | 1 | 区分写成功与可选展示步骤，同 try/catch 使 open/reveal 失败也报生成失败，忽略通知没有额外动作且不会撤销写入。 答案：`X.md:99-101`「即使文件已经写好了；没有回滚」 | `src/ui/commands/entityCommands.ts:1264-1284` |

主要遗漏：遗漏无工作区激活时注册 warning 占位命令并提前返回的路由；真实方法 guard 不能完整替代该分支说明。除此之外，本任务评分所需的主要因果关系均已覆盖。

重大错误：无（major_false_claims = []）。

## 候选 Y

### visualization

关键项 9/9；补充项 2/2。

| 项目 | 分数 | 依据与答案定位 | 源码/测试定位 |
| --- | --- | --- | --- |
| V.C1 命令、宿主依赖与页面生命周期 | 1 | 正确连起命令、注入服务、单例 reveal/同标题数据重发、隐藏保留、ready 模式和组消息到页面处理；明确 reveal 与关闭再开不是同一生命周期。 答案：`Y.md:9-11,17`「Panel 是单例，不是每次执行都重建」 | `package.json:57`；`src/extension.ts:242-243`；`src/extension.ts:643-651`；`src/ui/webview/graphView.ts:157-210`；`src/ui/webview/graphView.ts:263-273`；`src/ui/webview/graphView.ts:1205-1208` |
| V.C2 独立分组、选择及存储状态 | 1 | 解释 getGroups 与去重快照区别、排序/记忆 key 回退、只渲染选中组及空列表清理；将 webview state 的 key 与机器设置和页内几何分别定位。 答案：`Y.md:15-17,43-46`「点击一组只渲染该组」 | `src/ui/webview/graphView.ts:456-515`；`src/ui/webview/graphView.ts:1141-1150`；`src/ui/webview/graphView.ts:1372-1398`；`src/ui/webview/graphView.ts:1423-1462` |
| V.C3 按需、临时高级结构视图 | 1 | 完整描述按钮按 level 的请求、既有结构数据聚合、临时组替换选中、普通数据覆盖临时组和读图失败提示；明确不是此请求生成数据或永久分组操作。 答案：`Y.md:19,28,47,58`「host 读取已有结构图」 | `src/ui/webview/graphView.ts:223-225`；`src/ui/webview/graphView.ts:324-337`；`src/ui/webview/graphView.ts:446-453`；`src/ui/webview/graphView.ts:1287-1299`；`src/ui/webview/graphView.ts:1372-1413`；`src/ui/webview/graphView.ts:2091-2095`；`src/services/structuralGraph/structuralGraphService.ts:63-69` |
| V.C4 性能偏好的作用域和权威状态 | 1 | 给出 low 默认/low-high/machine/Global，初始化和配置更改重读同步及跨关闭重开重取，明确不属于 selectedGroupKey 或图谱数据。 答案：`Y.md:11,32,46`「它是机器偏好，不是图谱数据设置」 | `package.json:325-338`；`src/ui/webview/graphView.ts:150-154`；`src/ui/webview/graphView.ts:205-214`；`src/ui/webview/graphView.ts:300-321`；`src/ui/webview/graphView.ts:1091`；`src/ui/webview/graphView.ts:1140` |
| V.C5 乐观选择、确认与保存失败回退 | 1 | 正确解释页面即时重绘并禁用、host 校验/写全局、finally 实际模式确认、客户端恢复 selector 和设置订阅；区分非法值无 ack，不夸大 DOM 测试覆盖。 答案：`Y.md:32,57`「失败回传会把乐观显示切回实际模式」 | `src/ui/webview/graphView.ts:150-154`；`src/ui/webview/graphView.ts:309-321`；`src/ui/webview/graphView.ts:1283-1286`；`src/ui/webview/graphView.ts:2077-2084`；`src/ui/webview/graphView.ts:2176-2182`；`src/ui/webview/graphView.test.ts:96-109` |
| V.C6 模式改变渲染工作而非图谱语义 | 1 | 说明模式不变更图数据、low 分批有界布局/保留拖动且不重启整图、高模式动画/拖动加热与 settled 可停；预算不是严格帧或墙钟保证。 答案：`Y.md:32-37,44-45`「若可复用缓存已 settled，simulation 仍停止」 | `src/ui/webview/graphView.ts:1495-1512`；`src/ui/webview/graphView.ts:1552-1579`；`src/ui/webview/graphView.ts:1594-1619`；`src/ui/webview/graphView.ts:1931-1959`；`src/ui/webview/graphPerformanceScript.ts:48-88`；`src/ui/webview/graphPerformanceScript.ts:91-118` |
| V.C7 隐藏、替换与卸载的工作控制 | 1 | 连接切组停旧任务并存几何、隐藏暂停动画和仿真/打断转场/取消计时器、可见有条件续作及 beforeunload 清理，解释其避免 stale/duplicate work 的作用。 答案：`Y.md:44,49,56`「避免旧帧更新已换组 DOM」 | `src/ui/webview/graphView.ts:1234-1278`；`src/ui/webview/graphView.ts:1479-1493`；`src/ui/webview/graphPerformanceScript.ts:77-88` |
| V.C8 几何复用的拓扑与生命周期边界 | 1 | 正确区分几何缓存和新语义对象，说明组 key/拓扑校验、文案更新/回访/模式重绘复用、拓扑改变 miss 及文档重建缓存失效，不宣称磁盘或 webview state 保存几何。 答案：`Y.md:43-51,55`「描述、evidence、关系 ID 的变化不会废弃几何，但渲染仍使用新实体/关系对象」 | `src/ui/webview/graphPerformanceScript.ts:7-43`；`src/ui/webview/graphView.ts:1141-1150`；`src/ui/webview/graphView.ts:1453-1454`；`src/ui/webview/graphView.ts:1556-1579`；`src/ui/webview/graphPerformanceScript.test.ts:105-117` |
| V.C9 回归测试与交互风险的对应 | 1 | 将设置同步、布局/生命周期/拖动、缓存拓扑/进度三类风险映射到相关测试，明确 mock host/VM helper/语法与真实页面 E2E 的区别，未把额外建议说成已覆盖。 答案：`Y.md:55-57`「helper 的假 document/假 simulation 不覆盖真实 visibilitychange handler、D3、SVG、粒子与 timer 组合」 | `src/ui/webview/graphView.test.ts:18-47`；`src/ui/webview/graphView.test.ts:58-109`；`src/ui/webview/graphPerformanceScript.test.ts:5-38`；`src/ui/webview/graphPerformanceScript.test.ts:49-165` |
| V.S1 未完成布局进度与自动适配意图 | 1 | 说明保留未完成布局状态、切组返回后继续的意义与 autoFit 及用户干预；正确指出 quick-switch 测试仅验证缓存字段而非实际整页续作。 答案：`Y.md:37,44,55`「恢复缓存位置及 zoom，再用 alpha/settled 决定是否继续布局」 | `src/ui/webview/graphPerformanceScript.ts:24-33`；`src/ui/webview/graphView.ts:1360-1367`；`src/ui/webview/graphView.ts:1556-1579`；`src/ui/webview/graphView.ts:1933-1959`；`src/ui/webview/graphPerformanceScript.test.ts:133-140` |
| V.S2 缓存准入、容量与淘汰 | 1 | 准确描述准入拒存、总组/节点容量及 LRU 淘汰，有限性针对节点位置而非所有 transform/state 字段；未将缓存限制误作源图限制。 答案：`Y.md:45,55`「单次超过 2000 节点或 16000 边、位置不是有限数则不缓存；LRU 淘汰」 | `src/ui/webview/graphPerformanceScript.ts:8-40`；`src/ui/webview/graphPerformanceScript.test.ts:119-130` |

主要遗漏：未发现本任务评分项所要求的主要因果关系遗漏。

重大错误：无（major_false_claims = []）。

### instructions

关键项 8/8；补充项 1/1。

| 项目 | 分数 | 依据与答案定位 | 源码/测试定位 |
| --- | --- | --- | --- |
| I.C1 命令到首个工作区写入器及返回路径 | 1 | 覆盖 manifest 到 handler/服务、激活占位分支与方法自身 guard、第一工作区及返回路径驱动可选打开/reveal；没有把 void UI 命令与返回路径的服务方法混淆。 答案：`Y.md:67-71,99`「没有工作区时激活注册的是提示打开文件夹的占位命令」 | `package.json:86-88`；`src/extension.ts:48-57`；`src/extension.ts:680-689`；`src/extension.ts:960-998`；`src/ui/commands/entityCommands.ts:23-39`；`src/ui/commands/entityCommands.ts:1255-1284`；`src/services/aiIntegrationService.ts:71-81` |
| I.C2 被忽略的 GraphData 仍是上游依赖 | 1 | 说明 snapshot 加 observations 的真实收集/传入，writer/builder 忽略 GraphData 使正文不随图变化，并解释上游异常可阻断固定模板写入。 答案：`Y.md:69,75,80-81`「UI 的 graphData 收集仍是前置执行依赖」 | `src/ui/commands/entityCommands.ts:43-62`；`src/ui/commands/entityCommands.ts:1262-1283`；`src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-414` |
| I.C3 目标文件、直接覆盖与失败语义 | 1 | 说明同步 UTF-8 写目标、递归创建、返回路径、无确认/merge/备份/事务及 I/O 传播；将手改丢失和失败可能已建目录/影响目标的副作用与覆盖契约联系起来。 答案：`Y.md:71,98,100-102`「已有目标直接覆盖」 | `src/services/aiIntegrationService.ts:71-81`；`src/ui/commands/entityCommands.ts:1262-1283` |
| I.C4 固定英文紧凑路由器的活动派发 | 1 | 从实际零参数 wrapper 到 en router 说明活动调用链，同时排除旧 CN/EN 富模板、技术栈和场景 helper 的影响及 UI locale 自动本地化。 答案：`Y.md:75,80-84`「Copilot 当前正文是固定英文导航模板，而非项目摘要」 | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:101-120`；`src/services/aiIntegrationService.ts:259-265`；`src/services/aiIntegrationService.ts:404-447`；`src/services/aiIntegrationService.ts:691-712` |
| I.C5 聚焦查询、有限回退及源码核验 | 1 | 覆盖聚焦条件查询、局部扩展/审计证据、单组 fallback、不默认全报告、小已知任务可跳过及源码核验，并说明项目化改变仍要面对紧凑导航契约。 答案：`Y.md:92,111`「MCP 无效再读 agent-context index 和最匹配的一个组」 | `src/services/aiIntegrationService.ts:435-442`；`src/services/aiIntegrationService.test.ts:83-98` |
| I.C6 写入指令文字与实际执行的边界 | 1 | 正确说明只是生成/写入文字与可选展示，不执行 MCP/LLM、分析/刷新图、安装配置或校验外部连接/消费者；文字引用不等于生成那些上下文产物。 答案：`Y.md:84,94,109`「不验证 fallback 文件是否存在或 Copilot 最终有没有采用该文件」 | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-447`；`src/ui/commands/entityCommands.ts:1255-1284` |
| I.C7 共享构建器与顺序批量生成 | 1 | 将共享 builder 与 Copilot 专用修改的影响范围说清，区分 UI 自己编排和 service wrapper 但二者均先 Cursor 后 Copilot；准确指出第二步失败保留先前输出且无批量原子性。 答案：`Y.md:86,102,111`「改共享 router 会影响两个文件」 | `src/services/aiIntegrationService.ts:58-63`；`src/services/aiIntegrationService.ts:89-108`；`src/services/aiIntegrationService.ts:404-414`；`src/extension.ts:692-699`；`src/ui/commands/entityCommands.ts:1290-1334` |
| I.C8 回归证据与实际测试边界 | 1 | 准确映射 compact Copilot 的正向/负向断言、Cursor 共享风险，说明未传 GraphData、临时文件/空 stub 的限制、技术栈 helper 与当前输出脱钩及 UI/覆盖/错误/回滚/真实 Copilot 未覆盖。 答案：`Y.md:106-109`「不能由此证明 UI 数据收集不被调用、非空 graphData 被忽略」 | `src/services/aiIntegrationService.test.ts:16-58`；`src/services/aiIntegrationService.test.ts:68-119`；`src/services/aiIntegrationService.test.ts:121-163` |
| I.S1 写入完成后展示失败仍可能报生成失败 | 1 | 明确成功文件写入先于通知/展示，展示失败仍被同一 catch 视为生成失败且不回滚；用户关闭通知不做额外动作。 答案：`Y.md:99-101`「open/reveal 失败则可能已经写好文件、甚至已显示成功，仍收到“生成失败”」 | `src/ui/commands/entityCommands.ts:1264-1284` |

主要遗漏：未发现本任务评分项所要求的主要因果关系遗漏。

重大错误：无（major_false_claims = []）。

## 验证与限制

已静态核对相关实现及核心回归测试；没有执行测试、浏览器、VS Code 或外部 Copilot 验证。重大错误与遗漏分开：X 的 I.C1 是遗漏，不是与源码相反的声明；两份答案均未发现需要登记的重大错误。

