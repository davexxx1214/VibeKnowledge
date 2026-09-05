# 只读盲评结果

按指定 rubric 与固定 notes 的 0 / 0.5 / 1 非穷尽因果标准评分；只核查 X、Y、rubric、notes 和指定源码快照。未运行源码、测试或构建，未修改源文件，未读取方法映射或其他评价材料。

源码根目录：D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot。下列引文仅摘录核心句；同项报告行号列出的上下文一并计分。

| 报告 | V critical | V supplemental | I critical | I supplemental | critical 总分 | supplemental 总分 | 重大错误 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| X | 9 / 9 | 2 / 2 | 7.5 / 8 | 1 / 1 | 16.5 / 17 | 3 / 3 | 1 |
| Y | 9 / 9 | 2 / 2 | 7.5 / 8 | 1 / 1 | 16.5 / 17 | 3 / 3 | 0 |

两份报告的覆盖分相同，但 X 有独立的重大事实错误，因此不能判定为完全正确/安全。实质遗漏和错误分别列出，不互相抵扣或重复扣分。

## X

### Visualization (V)

主要遗漏：未发现达到实质缺漏程度的 rubric 覆盖问题；所需状态、工作量、缓存和测试边界均有连贯证据。

#### V.C1 — 命令、依赖与页面生命周期：1

完整连接公开命令、两服务注入、单例/隐藏保留、同标题 reveal 只发数据以及 ready 双消息到页面渲染，未把重开命令等同新文档。

报告：[X.md:5](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:5>) — “An existing panel is revealed and sent graph data; its HTML is replaced only when the translated title differs.”

源码：

- [package.json:57-59](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:57>)：公开命令。
- [src/extension.ts:242-243,643-646](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:242>)：注入两个服务并调用 createOrShow。
- [src/ui/webview/graphView.ts:157-210,1205-1208](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:157>)：同标题 reveal 复用文档；新 panel 保留隐藏上下文；ready 发设置和数据。

#### V.C2 — 独立分组与选择状态：1

说明 getGroups 独立模型、排序及记忆键/首组回退、只渲染选中组和空列表清理；全报告区分 webview 选择键、全局性能偏好及文档内几何缓存。

报告：[X.md:7,31-32](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:7>) — “Ordinary views come from `KnowledgeGraphService.getGroups()` with entity observations, not its deduplicated aggregate snapshot.”

源码：

- [src/ui/webview/graphView.ts:456-470,1138-1150](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:456>)：独立组收集及读取 selectedGroupKey。
- [src/ui/webview/graphView.ts:1372-1398,1449-1459](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1372>)：排序、空态、回退选择、setState 和选组渲染。

#### V.C3 — 高级结构视图的临时性：1

连接显式工具栏请求、读取并聚合现有结构数据、返回/选中新合成组、替换旧结构组与普通数据刷新丢失临时视图；错误状态/警告已解释，不要求列全所有级别名称。

报告：[X.md:9,30,40](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:9>) — “This is a temporary additional view, not a replacement written to curated groups.”

源码：

- [src/ui/webview/graphView.ts:223-225,324-338,446-454](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:223>)：overview 只 read/aggregate/post；异常发 structuralError 和 warning。
- [src/ui/webview/graphView.ts:1101-1106,1287-1298,1372-1375,1401-1413,2091-2095](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1101>)：所选级别请求；普通列表整体替换；结构组临时 upsert；错误显示。

#### V.C4 — 性能偏好的作用域与权威：1

正确给出 low 默认、low/high、machine scope、Global 写入，并说明初始化、回执及 Settings 改动均来自主机实际配置；与图谱数据及几何持久化分开。

报告：[X.md:19,31](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:19>) — “The performance setting defaults to `low`, accepts `low`/`high`, and has machine scope”

源码：

- [package.json:325-338](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:325>)：low/high、默认 low、machine。
- [src/ui/webview/graphView.ts:150-154,300-320,1091,1140](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:150>)：主机读取设置、全局保存、finally 回实际模式和初始注入。

#### V.C5 — 乐观更新与失败协调：1

完整解释页面立即应用并禁用选择器、请求全局保存、finally 回实际值、失败回滚及重新启用；模式/外部设置消息只重渲染当前组，不替换整个 HTML。

报告：[X.md:19](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:19>) — “A failed save reports an error and the reply restores the actual mode/re-enables the selector”

源码：

- [src/ui/webview/graphView.ts:309-321,1283-1285](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:309>)：校验、保存失败通知、finally 回执及启用。
- [src/ui/webview/graphView.ts:2077-2084,2176-2182](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2077>)：乐观应用、禁用、发消息及当前组重渲染。
- [src/ui/webview/graphView.test.ts:96-109](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.test.ts:96>)：Settings、失败后回 high、非法输入断言。

#### V.C6 — 工作量变化不改变图义：1

将同一组数据的视觉模式切换与语义内容分开；说明 low 有有限预算、可让出的布局和直接拖拽，high 可重启物理/动画但已稳定缓存不会无条件重热；未声称硬性墙钟 SLA。

报告：[X.md:19,21,23](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:19>) — “Low-mode drag stops settling, moves just the selected node and redraws its affected geometry without restarting physics.”

源码：

- [src/ui/webview/graphPerformanceScript.ts:48-88,91-118](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:48>)：低模式分批有限布局；低直接移动、高 restart 拖拽。
- [src/ui/webview/graphView.ts:1552-1578,1594,1617-1619,1933-1959](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1552>)：同一节点关系、缓存稳定态、动画差异及接入。

#### V.C7 — 隐藏、替换与卸载的工作清理：1

把换组停止旧布局/物理/粒子并保存、隐藏暂停并清理 transitions/定时器、显示按状态恢复及卸载取消连接到避免残留工作；没有把 retained context 误写成后台持续运转。

报告：[X.md:27,29,34,38](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:27>) — “Before removing old geometry, rendering stops old work and saves its layout.”

源码：

- [src/ui/webview/graphView.ts:1234-1278](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1234>)：粒子单回调、隐藏暂停/显示恢复及 unload 停止。
- [src/ui/webview/graphView.ts:1479-1493](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1479>)：换组先停止/保存旧几何再移除内容。
- [src/ui/webview/graphPerformanceScript.ts:77-87](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:77>)：不重复调度；pause 与永久 stop 区分。

#### V.C8 — 几何缓存的拓扑与文档边界：1

说明按组键和节点/端点/verb 拓扑校验，文字更新与相同拓扑可复用坐标/相机，变化则失效；缓存不存证据对象，且新文档重建，与设置/选择键不同。

报告：[X.md:27-31](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:27>) — “validity depends on sorted node IDs and source/target/verb edge topology, not prose”

源码：

- [src/ui/webview/graphPerformanceScript.ts:7-43](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:7>)：拓扑签名、几何条目、命中/失效。
- [src/ui/webview/graphView.ts:1141,1454,1552-1579](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1141>)：新文档新 cache、只持久选择键、恢复坐标/zoom 或重置。
- [src/ui/webview/graphPerformanceScript.test.ts:105-117](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:105>)：prose/顺序复用、verb/节点变化失效。

#### V.C9 — 回归测试与真实覆盖界限：1

映射主机设置、布局调度/生命周期/拖拽、缓存拓扑/重访三个风险族到对应断言；正确限定为 helper VM、mock host 和语法检查，未夸大为真实浏览器或 VS Code 端到端。

报告：[X.md:44-49](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:44>) — “These directly protect helper invariants, but not the surrounding D3/DOM lifecycle wiring.”

源码：

- [src/ui/webview/graphView.test.ts:18-47,58-109](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.test.ts:18>)：mock host、语法编译、全局保存/reopen/失败同步。
- [src/ui/webview/graphPerformanceScript.test.ts:5-38,49-103,105-140,142-165](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:5>)：VM/fake 时钟与调度、缓存、拖拽断言。

#### V.S1 — 未完成布局的恢复：1

已说明缓存还保存 settled/alpha/autoFit、重访需延续未完成布局，以及用户相机/拖拽取消自动 fit；按全报告连贯证据评分，不要求复述完整快速换组场景。

报告：[X.md:27,34,38,45](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:27>) — “user zoom/pan and drag disable automatic fitting, while unfinished layout stores its remaining auto-fit intent”

源码：

- [src/ui/webview/graphPerformanceScript.ts:24-33](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:24>)：缓存保存 settled、alpha、autoFit。
- [src/ui/webview/graphView.ts:1360-1367,1564-1578,1933-1957](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1360>)：恢复状态决定继续布局，用户交互关闭 fit。
- [src/ui/webview/graphPerformanceScript.test.ts:133-140](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:133>)：未完成状态存储测试。

#### V.S2 — 缓存准入与有界淘汰：1

说明 oversized/非有限位置拒绝、组数/节点总数预算及 LRU 淘汰后重访未必恢复，不把缓存上限当源图容量上限；非有限几何按 notes 理解为节点 x/y。

报告：[X.md:28](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:28>) — “Default limits are eight groups and 2,000 total nodes; oversized/nonfinite layouts are rejected and least-recently-used entries evicted.”

源码：

- [src/ui/webview/graphPerformanceScript.ts:8-39](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:8>)：8 组/2000 节点默认，节点/边数量与 x/y 准入、LRU。
- [src/ui/webview/graphPerformanceScript.test.ts:119-130](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:119>)：组数/节点总数和 LRU/clear 断言。

### Instructions (I)

主要遗漏：缺少无工作区激活提前注册 warning 占位命令的可达性分支，只描述了正常注册路径及方法级 guard。另有独立 Cursor locale 事实错误，已与遗漏分开记录。

#### I.C1 — 命令至首工作区写入和返回路径：0.5

正常路径、首工作区、服务返回路径供 open/reveal 及方法自身无工作区 guard 均正确；但遗漏无工作区激活会提前注册 warning 占位命令并返回，因而该场景不会进入所描述的正常 EntityCommands 路径。这是不同可达分支的实质缺口，不是缺少行号或例子；不计为重大错误。

报告：[X.md:55,57,59](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:55>) — “It targets `workspaceFolders[0]`, reports a localized no-workspace error and returns if absent.”

源码：

- [package.json:86-89](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:86>)：公开命令。
- [src/extension.ts:48-54,680-688,960-995](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:48>)：无工作区提前注册占位命令；正常时注册 EntityCommands handler。
- [src/ui/commands/entityCommands.ts:23-39,1255-1285](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:23>)：方法 guard、首根、服务返回路径与可选显示；方法返回 void。
- [src/services/aiIntegrationService.ts:71-82](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：服务返回文件路径。

#### I.C2 — 被忽略内容参数的上游依赖：1

区分 UI 真实收集统一 snapshot/逐实体 observations 的成本与失败依赖，以及 writer/builder 不消费这些数据，故当前内容不个性化；未推导成完全不读图。

报告：[X.md:63,68](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:63>) — “snapshot/observation errors can still prevent UI generation, and gathering may cost work”

源码：

- [src/ui/commands/entityCommands.ts:43-63,1262-1267](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:43>)：先收集实体观察信息，再传 GraphData。
- [src/services/aiIntegrationService.ts:71-82,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：_graphData 未读取，固定 builder 无图数据入参。

#### I.C3 — 输出与覆盖/失败契约：1

正确给出 .github 递归创建、UTF-8 同步直接覆盖、返回路径、无 merge/确认/备份/原子回滚；联系 I/O 错误与可能已发生副作用、UI catch。

报告：[X.md:57,59](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:57>) — “there is no existence check for the target file, merge, confirmation, backup, temporary-file swap or rollback”

源码：

- [src/services/aiIntegrationService.ts:71-82](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：目录创建后 writeFileSync 覆盖并返回。
- [src/ui/commands/entityCommands.ts:1262-1284](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262>)：收集、写入与后续 UI 的统一 catch。

#### I.C4 — 固定英文精简路由器：1

追踪 Copilot wrapper 固定 en 到共享字面量 router，并明确它不受 UI locale、GraphData、技术栈或场景模板影响；旧 rich/template 方法存在但不在活动调用链。

报告：[X.md:63,67-71](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:63>) — “`buildCopilotInstructionsContent()` supplies a fixed English locale and title to `buildAgentKnowledgeRouterContent()`”

源码：

- [src/services/aiIntegrationService.ts:71-81,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：Copilot 活动 builder 固定英文路由文本。
- [src/services/aiIntegrationService.ts:101-119,259-278,691-711](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:101>)：活动 Cursor dispatcher 与未调用的 rich/template helper 对照。

#### I.C5 — 聚焦查询与有界回退：1

解释适用任务、focused MCP/local expansion/selective evidence、不可用/无效时 index 加一个组、避免全量审计报告、小任务可跳过及源码验证，连接到精简而非图谱/模板导出的目的。

报告：[X.md:74,78](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:74>) — “If MCP is unavailable/unhelpful, use `.vscode/.knowledge/agent-context/index.md` and one best-matching group.”

源码：

- [src/services/aiIntegrationService.ts:435-442](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:435>)：条件查询、局部扩展、有界文件回退、跳过条件和源码校验。
- [src/services/aiIntegrationService.test.ts:83-97](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:83>)：查询/回退指引及禁止 dump 的断言。

#### I.C6 — 生成文本并非执行推荐：1

明确写文本和后续助手执行的边界：不查询 MCP/LLM、不刷新图或产生/校验指向的上下文产物、不保证外部助手加载遵从；承认 UI 上游收图与可选打开。

报告：[X.md:57,72,74](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:57>) — “The generator itself does not query MCP, install/configure it, generate or verify the index/groups, analyze the project, edit a database, invoke an AI model, or activate Copilot.”

源码：

- [src/services/aiIntegrationService.ts:71-82,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：活动生成路径只有目录、固定内容、写入；MCP/路径只是字符串。
- [src/ui/commands/entityCommands.ts:1255-1285](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1255>)：真实额外工作为收图及可选展示。

#### I.C7 — 共享 builder 与批量非事务：1

按 notes 只以共享 builder 的两工具影响面、Copilot wrapper 可独立变更及两条批量路径顺序/部分成功契约评分；这些因果关系完整。语言表述另行核实，不把 locale 歧义加入此条的新要求。

报告：[X.md:78,80](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:78>) — “Both are sequential and nontransactional: Cursor failure prevents Copilot; Copilot failure leaves the earlier Cursor write”

源码：

- [src/services/aiIntegrationService.ts:58-63,89-109,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:58>)：Cursor/Copilot 共用 router；服务 Cursor 后 Copilot。
- [src/extension.ts:692-699](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:692>)：公开批量 handler。
- [src/ui/commands/entityCommands.ts:1290-1334](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1290>)：UI 独立顺序调用同一组 writers；失败无回滚。

#### I.C8 — 内容测试及其限制：1

把 Copilot 正向导航/有界回退与反向模板/图谱标题断言、Cursor 第二消费者测试映射到内容契约；明确无 GraphData fixture 不能证明任意 populated input 不变，并限制为服务临时文件测试而非 UI、覆盖保护、回滚或真实 Copilot。

报告：[X.md:86-90](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:86>) — “It asserts MCP/group-index guidance, neighbor/path/evidence guidance and audit-report avoidance, and rejects the template marker, Tech Stack, Dependency Details and Total Entities.”

源码：

- [src/services/aiIntegrationService.test.ts:16-47,68-119](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:16>)：空服务与临时目录测试；无 graph 参数；Copilot/Cursor 正负断言。
- [src/services/aiIntegrationService.test.ts:50-58,121-162](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:50>)：runtime 测试直接调用私有 helper，不是生成内容证明。

#### I.S1 — 写后展示失败：1

明确写入已完成后 optional open/reveal 仍在同一 catch，可能显示生成失败但文件已存在；通知被关闭不撤销写入。

报告：[X.md:59](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:59>) — “a document-open/reveal failure can report “Failed to generate” after the file has already been written, without deleting it”

源码：

- [src/ui/commands/entityCommands.ts:1264-1284](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1264>)：先写文件，后通知/open/reveal，末尾统一 catch。

### 重大错误

#### X.MF1

将当前 Cursor 输出描述为按当前 locale 选择中英文，而真实 getLocale() 返回值永远不等于 writer 所比较的 'zh'。

报告：[X.md:70](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:70>) — “The related Cursor builder does consult `getLocale()` and selects Chinese or English plus a Cursor-specific title”

报告：[X.md:82](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/X.md:82>) — “accepting that prompt rewrites the same compact routers for the current locale”

矛盾源码：

- [src/i18n/i18nService.ts:126-127,148-149](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/i18n/i18nService.ts:126>)：getLocale 委托 getLocaleCode，只返回 zh-CN 或 en-US。
- [src/services/aiIntegrationService.ts:101-108](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:101>)：语言和标题均比较 locale === 'zh'；真实返回值均不匹配，走英文。

X 在实际输入/效果表与再生成后果中肯定当前 locale 的中英文选择效果，而非仅列出条件表达式。这个内容依赖断言会误导当前 Cursor 生成物的语言契约；按 notes 独立记一项重大事实错误，不否定其正确解释的共享 builder 和顺序写入，也不再扣 I.C7。X 对 Copilot 固定英文的说明正确，不把它另记为 Copilot 语言错误。

## Y

### Visualization (V)

主要遗漏：未发现达到实质缺漏程度的 rubric 覆盖问题；所需状态、工作量、缓存和测试边界均有连贯证据。

#### V.C1 — 命令、依赖与页面生命周期：1

完整连接公开命令、两服务注入、单例/隐藏保留、同标题 reveal 只发数据以及 ready 双消息到页面渲染，未把重开命令等同新文档。

报告：[Y.md:5,7](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:5>) — “an unchanged translated title causes a data message, not an HTML replacement”

源码：

- [package.json:57-59](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:57>)：公开命令。
- [src/extension.ts:242-243,643-646](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:242>)：注入两个服务并调用 createOrShow。
- [src/ui/webview/graphView.ts:157-210,1205-1208](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:157>)：同标题 reveal 复用文档；新 panel 保留隐藏上下文；ready 发设置和数据。

#### V.C2 — 独立分组与选择状态：1

说明 getGroups 独立模型、排序及记忆键/首组回退、只渲染选中组和空列表清理；全报告区分 webview 选择键、全局性能偏好及文档内几何缓存。

报告：[Y.md:11,35-36](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:11>) — “selects the saved key if still present or the first group otherwise, and renders only that group”

源码：

- [src/ui/webview/graphView.ts:456-470,1138-1150](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:456>)：独立组收集及读取 selectedGroupKey。
- [src/ui/webview/graphView.ts:1372-1398,1449-1459](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1372>)：排序、空态、回退选择、setState 和选组渲染。

#### V.C3 — 高级结构视图的临时性：1

连接显式工具栏请求、读取并聚合现有结构数据、返回/选中新合成组、替换旧结构组与普通数据刷新丢失临时视图；错误状态/警告已解释，不要求列全所有级别名称。

报告：[Y.md:13,43](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:13>) — “Ordinary `graphData` replaces the entire list”

源码：

- [src/ui/webview/graphView.ts:223-225,324-338,446-454](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:223>)：overview 只 read/aggregate/post；异常发 structuralError 和 warning。
- [src/ui/webview/graphView.ts:1101-1106,1287-1298,1372-1375,1401-1413,2091-2095](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1101>)：所选级别请求；普通列表整体替换；结构组临时 upsert；错误显示。

#### V.C4 — 性能偏好的作用域与权威：1

正确给出 low 默认、low/high、machine scope、Global 写入，并说明初始化、回执及 Settings 改动均来自主机实际配置；与图谱数据及几何持久化分开。

报告：[Y.md:7,23,36](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:7>) — “The setting is `knowledgeGraph.visualization.performanceMode`, machine-scoped, default `low`, with `low`/`high` choices”

源码：

- [package.json:325-338](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:325>)：low/high、默认 low、machine。
- [src/ui/webview/graphView.ts:150-154,300-320,1091,1140](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:150>)：主机读取设置、全局保存、finally 回实际模式和初始注入。

#### V.C5 — 乐观更新与失败协调：1

完整解释页面立即应用并禁用选择器、请求全局保存、finally 回实际值、失败回滚及重新启用；模式/外部设置消息只重渲染当前组，不替换整个 HTML。

报告：[Y.md:23](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:23>) — “A failed write shows an error and that reply rolls the optimistic UI back; a Settings change also sends the effective value.”

源码：

- [src/ui/webview/graphView.ts:309-321,1283-1285](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:309>)：校验、保存失败通知、finally 回执及启用。
- [src/ui/webview/graphView.ts:2077-2084,2176-2182](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2077>)：乐观应用、禁用、发消息及当前组重渲染。
- [src/ui/webview/graphView.test.ts:96-109](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.test.ts:96>)：Settings、失败后回 high、非法输入断言。

#### V.C6 — 工作量变化不改变图义：1

将同一组数据的视觉模式切换与语义内容分开；说明 low 有有限预算、可让出的布局和直接拖拽，high 可重启物理/动画但已稳定缓存不会无条件重热；未声称硬性墙钟 SLA。

报告：[Y.md:23,25,27](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:23>) — “A cached settled graph does not automatically reheat merely because high mode was chosen.”

源码：

- [src/ui/webview/graphPerformanceScript.ts:48-88,91-118](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:48>)：低模式分批有限布局；低直接移动、高 restart 拖拽。
- [src/ui/webview/graphView.ts:1552-1578,1594,1617-1619,1933-1959](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1552>)：同一节点关系、缓存稳定态、动画差异及接入。

#### V.C7 — 隐藏、替换与卸载的工作清理：1

把换组停止旧布局/物理/粒子并保存、隐藏暂停并清理 transitions/定时器、显示按状态恢复及卸载取消连接到避免残留工作；没有把 retained context 误写成后台持续运转。

报告：[Y.md:33,37,43](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:33>) — “Hiding pauses particles without losing their resume callback, pauses static layout, stops physics, interrupts transitions, clears fit/resize timers, and saves geometry.”

源码：

- [src/ui/webview/graphView.ts:1234-1278](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1234>)：粒子单回调、隐藏暂停/显示恢复及 unload 停止。
- [src/ui/webview/graphView.ts:1479-1493](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1479>)：换组先停止/保存旧几何再移除内容。
- [src/ui/webview/graphPerformanceScript.ts:77-87](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:77>)：不重复调度；pause 与永久 stop 区分。

#### V.C8 — 几何缓存的拓扑与文档边界：1

说明按组键和节点/端点/verb 拓扑校验，文字更新与相同拓扑可复用坐标/相机，变化则失效；缓存不存证据对象，且新文档重建，与设置/选择键不同。

报告：[Y.md:33-36](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:33>) — “Group key plus sorted node IDs and endpoint/verb topology determine reuse. Prose/evidence changes do not invalidate geometry; topology changes do.”

源码：

- [src/ui/webview/graphPerformanceScript.ts:7-43](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:7>)：拓扑签名、几何条目、命中/失效。
- [src/ui/webview/graphView.ts:1141,1454,1552-1579](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1141>)：新文档新 cache、只持久选择键、恢复坐标/zoom 或重置。
- [src/ui/webview/graphPerformanceScript.test.ts:105-117](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:105>)：prose/顺序复用、verb/节点变化失效。

#### V.C9 — 回归测试与真实覆盖界限：1

映射主机设置、布局调度/生命周期/拖拽、缓存拓扑/重访三个风险族到对应断言；正确限定为 helper VM、mock host 和语法检查，未夸大为真实浏览器或 VS Code 端到端。

报告：[Y.md:47-53](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:47>) — “These protect helper scheduling, not actual browser visibility wiring or D3 cost.”

源码：

- [src/ui/webview/graphView.test.ts:18-47,58-109](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.test.ts:18>)：mock host、语法编译、全局保存/reopen/失败同步。
- [src/ui/webview/graphPerformanceScript.test.ts:5-38,49-103,105-140,142-165](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:5>)：VM/fake 时钟与调度、缓存、拖拽断言。

#### V.S1 — 未完成布局的恢复：1

已说明缓存还保存 settled/alpha/autoFit、重访需延续未完成布局，以及用户相机/拖拽取消自动 fit；按全报告连贯证据评分，不要求复述完整快速换组场景。

报告：[Y.md:33,39,43,48](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:33>) — “The unfinished-state test checks storage, not an end-to-end rapid group-switch sequence.”

源码：

- [src/ui/webview/graphPerformanceScript.ts:24-33](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:24>)：缓存保存 settled、alpha、autoFit。
- [src/ui/webview/graphView.ts:1360-1367,1564-1578,1933-1957](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1360>)：恢复状态决定继续布局，用户交互关闭 fit。
- [src/ui/webview/graphPerformanceScript.test.ts:133-140](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:133>)：未完成状态存储测试。

#### V.S2 — 缓存准入与有界淘汰：1

说明 oversized/非有限位置拒绝、组数/节点总数预算及 LRU 淘汰后重访未必恢复，不把缓存上限当源图容量上限；非有限几何按 notes 理解为节点 x/y。

报告：[Y.md:34](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:34>) — “The LRU cache defaults to 8 groups/2,000 total nodes, rejects oversized edge/node sets and nonfinite positions, and can evict a previously visited view”

源码：

- [src/ui/webview/graphPerformanceScript.ts:8-39](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:8>)：8 组/2000 节点默认，节点/边数量与 x/y 准入、LRU。
- [src/ui/webview/graphPerformanceScript.test.ts:119-130](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:119>)：组数/节点总数和 LRU/clear 断言。

### Instructions (I)

主要遗漏：缺少无工作区激活提前注册 warning 占位命令的可达性分支，只描述了正常注册路径及方法级 guard。未发现重大错误。

#### I.C1 — 命令至首工作区写入和返回路径：0.5

正常路径、首工作区、服务返回路径供 open/reveal 及方法自身无工作区 guard 均正确；但遗漏无工作区激活会提前注册 warning 占位命令并返回，因而该场景不会进入所描述的正常 EntityCommands 路径。这是不同可达分支的实质缺口，不是缺少行号或例子；不计为重大错误。

报告：[Y.md:59,61,63,65](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:59>) — “The command chooses `workspaceFolders[0]`, not the active editor's folder and not a user-selected output root.”

源码：

- [package.json:86-89](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:86>)：公开命令。
- [src/extension.ts:48-54,680-688,960-995](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:48>)：无工作区提前注册占位命令；正常时注册 EntityCommands handler。
- [src/ui/commands/entityCommands.ts:23-39,1255-1285](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:23>)：方法 guard、首根、服务返回路径与可选显示；方法返回 void。
- [src/services/aiIntegrationService.ts:71-82](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：服务返回文件路径。

#### I.C2 — 被忽略内容参数的上游依赖：1

区分 UI 真实收集统一 snapshot/逐实体 observations 的成本与失败依赖，以及 writer/builder 不消费这些数据，故当前内容不个性化；未推导成完全不读图。

报告：[Y.md:61,65,71,74](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:61>) — “The knowledge graph remains an **operational** dependency of the UI command because it is collected before the ignored argument is passed.”

源码：

- [src/ui/commands/entityCommands.ts:43-63,1262-1267](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:43>)：先收集实体观察信息，再传 GraphData。
- [src/services/aiIntegrationService.ts:71-82,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：_graphData 未读取，固定 builder 无图数据入参。

#### I.C3 — 输出与覆盖/失败契约：1

正确给出 .github 递归创建、UTF-8 同步直接覆盖、返回路径、无 merge/确认/备份/原子回滚；联系 I/O 错误与可能已发生副作用、UI catch。

报告：[Y.md:63,65](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:63>) — “no merge with custom instructions, prompt, backup, atomic temporary-file swap, or rollback”

源码：

- [src/services/aiIntegrationService.ts:71-82](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：目录创建后 writeFileSync 覆盖并返回。
- [src/ui/commands/entityCommands.ts:1262-1284](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262>)：收集、写入与后续 UI 的统一 catch。

#### I.C4 — 固定英文精简路由器：1

追踪 Copilot wrapper 固定 en 到共享字面量 router，并明确它不受 UI locale、GraphData、技术栈或场景模板影响；旧 rich/template 方法存在但不在活动调用链。

报告：[Y.md:71,73,75](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:71>) — “calls `buildAgentKnowledgeRouterContent('en', '# VibeKnowledge Agent Instructions')`”

源码：

- [src/services/aiIntegrationService.ts:71-81,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：Copilot 活动 builder 固定英文路由文本。
- [src/services/aiIntegrationService.ts:101-119,259-278,691-711](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:101>)：活动 Cursor dispatcher 与未调用的 rich/template helper 对照。

#### I.C5 — 聚焦查询与有界回退：1

解释适用任务、focused MCP/local expansion/selective evidence、不可用/无效时 index 加一个组、避免全量审计报告、小任务可跳过及源码验证，连接到精简而非图谱/模板导出的目的。

报告：[Y.md:79,93](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:79>) — “skip graph navigation for small known-file tasks; verify behavior in current source”

源码：

- [src/services/aiIntegrationService.ts:435-442](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:435>)：条件查询、局部扩展、有界文件回退、跳过条件和源码校验。
- [src/services/aiIntegrationService.test.ts:83-97](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:83>)：查询/回退指引及禁止 dump 的断言。

#### I.C6 — 生成文本并非执行推荐：1

明确写文本和后续助手执行的边界：不查询 MCP/LLM、不刷新图或产生/校验指向的上下文产物、不保证外部助手加载遵从；承认 UI 上游收图与可选打开。

报告：[Y.md:81](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:81>) — “Those are **instructions written into a file**, not actions executed by the generator.”

源码：

- [src/services/aiIntegrationService.ts:71-82,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71>)：活动生成路径只有目录、固定内容、写入；MCP/路径只是字符串。
- [src/ui/commands/entityCommands.ts:1255-1285](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1255>)：真实额外工作为收图及可选展示。

#### I.C7 — 共享 builder 与批量非事务：1

按 notes 只以共享 builder 的两工具影响面、Copilot wrapper 可独立变更及两条批量路径顺序/部分成功契约评分；这些因果关系完整。语言表述另行核实，不把 locale 歧义加入此条的新要求。

报告：[Y.md:83,85](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:83>) — “A change in the shared router therefore affects Cursor as well as Copilot; a Copilot-only change at its dispatcher need not do so.”

源码：

- [src/services/aiIntegrationService.ts:58-63,89-109,404-447](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:58>)：Cursor/Copilot 共用 router；服务 Cursor 后 Copilot。
- [src/extension.ts:692-699](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:692>)：公开批量 handler。
- [src/ui/commands/entityCommands.ts:1290-1334](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1290>)：UI 独立顺序调用同一组 writers；失败无回滚。

#### I.C8 — 内容测试及其限制：1

把 Copilot 正向导航/有界回退与反向模板/图谱标题断言、Cursor 第二消费者测试映射到内容契约；明确无 GraphData fixture 不能证明任意 populated input 不变，并限制为服务临时文件测试而非 UI、覆盖保护、回滚或真实 Copilot。

报告：[Y.md:89-93](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:89>) — “It supplies no graph argument”

源码：

- [src/services/aiIntegrationService.test.ts:16-47,68-119](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:16>)：空服务与临时目录测试；无 graph 参数；Copilot/Cursor 正负断言。
- [src/services/aiIntegrationService.test.ts:50-58,121-162](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:50>)：runtime 测试直接调用私有 helper，不是生成内容证明。

#### I.S1 — 写后展示失败：1

明确写入已完成后 optional open/reveal 仍在同一 catch，可能显示生成失败但文件已存在；通知被关闭不撤销写入。

报告：[Y.md:65](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-arXVgy/Y.md:65>) — “an open/reveal failure can produce an error **after** the file was already generated”

源码：

- [src/ui/commands/entityCommands.ts:1264-1284](<D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1264>)：先写文件，后通知/open/reveal，末尾统一 catch。

### 重大错误

无；`major_false_claims` 为 `[]`。

## 固定歧义处理与核算

- 按 notes 使用本快照 package.json:5 的 0.4.0；未把 rubric 中历史路径当作读取许可。
- 按 notes 区分同标题 panel reveal 与 disposal/new document；有限几何检查只针对节点 x/y，不要求 transform 也有非有限校验。
- 按 notes，返回路径的是服务 writer；UI command 返回 Promise<void>，两报告未在此混淆。
- I.C7 的 locale-aware 括注按 notes 不作为额外必要条件；共享依赖和顺序写入足够得分。独立声称实际输出按当前 locale 选中英文，仍须对照 getLocale 实现记录事实错误。
- I.C1 的扣分针对一个未描述的不同可达命令分支；没有因未列全部级别、常数、负面例子或测试而扣分。

每份 JSON 恰含 20 个唯一 ID：V.C1–V.C9、I.C1–I.C8、V.S1、V.S2、I.S1；每项均含 score、rationale、report_evidence、source_evidence。逐项核算：critical = 9 + 7.5 = 16.5 / 17，supplemental = 2 + 1 = 3 / 3；X 的重大错误数量为 1，Y 为 0。

