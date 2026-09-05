# 两份只读功能分析报告的独立盲评

仅核对指定 X、Y、rubric、notes 与源码快照。未运行源码、测试、构建，未修改源码；未读取方法映射或其他评价材料。

源码相对锚点的根目录为 `D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot`；报告行号相对于本目录的 X.md / Y.md。采用原有 0 / 0.5 / 1 非穷尽因果标准：关系和可追溯证据决定分数，不按报告长度或例子齐备程度评分。

## 汇总

| 候选 | V 关键 / 9 | V 补充 / 2 | I 关键 / 8 | I 补充 / 1 | 关键 / 17 | 补充 / 3 | 重大错误 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| X | 8.5 | 2 | 7.5 | 1 | 16 | 3 | 0 |
| Y | 9 | 2 | 7.5 | 1 | 16.5 | 3 | 0 |

覆盖扣分与重大错误分开。两份报告均未发现会推翻本任务核心行为/安全边界的重大错误；相邻 Cursor locale 措辞的局部纠正单列在末尾，不隐含“全文完全无误”的结论。

## 候选 X

主要遗漏（V）：未明确说明 beforeunload 如何停止布局、物理与粒子并清理 fit/resize timers；分组替换和隐藏/显示的生命周期因果已充分覆盖。

主要遗漏（I）：遗漏无工作区 activation 注册 warning 占位命令并提前返回的路径，只说明 EntityCommands 方法内的保护；其余关键写入、输出与测试边界已覆盖。

### Visualization (V)

- **V.C1：1**。完整连接命令、双服务注入、单面板及 ready 消息到 D3 分组渲染；明确同标题复用与换标题重建的区别。

  报告证据：X.md:5–9 — “An unchanged localized title causes a data message, not an HTML reload”; “the host replies with the effective performance mode and ordinary graph groups”

  源码证据：`package.json:57–59`；`src/extension.ts:242–243`；`src/extension.ts:643–651`；`src/ui/webview/graphView.ts:157–210`；`src/ui/webview/graphView.ts:263–274`。

- **V.C2：1**。独立 getGroups、排序、记忆键/首组回退、单组渲染与 selectedGroupKey 的 webview state 均有因果说明；空组清理及其源码锚点也已指出，不要求复述完整空态代码。

  报告证据：X.md:9、32、38 — “chooses the saved key if present or the first group, and renders only that group”; “vscode.setState stores only selectedGroupKey”; “an empty group/list has separate cleanup”

  源码证据：`src/ui/webview/graphView.ts:456–515`；`src/ui/webview/graphView.ts:1149–1150`；`src/ui/webview/graphView.ts:1372–1398`；`src/ui/webview/graphView.ts:1423–1459`。

- **V.C3：1**。按需读取并聚合、临时组替换/选中及错误反馈齐全；普通数据替换会丢弃结构视图的解释与只读调用链共同界定它不是永久 curated 产物。

  报告证据：X.md:13、19、34、36 — “The host reads the structural service”; “removes all previous __structural_ groups”; “that response replaces the entire list, so an advanced structural view disappears”

  源码证据：`src/ui/webview/graphView.ts:223–225`；`src/ui/webview/graphView.ts:324–338`；`src/ui/webview/graphView.ts:446–453`；`src/ui/webview/graphView.ts:1372–1420`；`src/ui/webview/graphView.ts:2091–2095`；`src/services/structuralGraph/structuralGraphService.ts:63–69`。

- **V.C4：1**。正确区分 machine/global 低默认偏好与图谱/组状态，并说明初始化、设置变化及回执以主机有效值为准。

  报告证据：X.md:7、23、36 — “machine-scoped, defaults to low”; “writes the Global configuration”; “The performance preference does survive because it is read from Global configuration”

  源码证据：`package.json:325–338`；`src/ui/webview/graphView.ts:150–154`；`src/ui/webview/graphView.ts:300–321`；`src/ui/webview/graphView.ts:1091`；`src/ui/webview/graphView.ts:1140`。

- **V.C5：1**。描述即时重绘并禁用、主机校验和持久化、finally 回传有效值、失败回滚和重新启用，未把乐观值当成保存成功。

  报告证据：X.md:23 — “a failed save shows an error and the reply rolls the optimistic page choice back”; “Settings UI changes also cause a host reply, which re-enables the selector”

  源码证据：`src/ui/webview/graphView.ts:150–154`；`src/ui/webview/graphView.ts:309–321`；`src/ui/webview/graphView.ts:1283–1285`；`src/ui/webview/graphView.ts:2077–2084`；`src/ui/webview/graphView.ts:2176–2182`。

- **V.C6：1**。说明相同数据的呈现工作差异；low 有让出式有限布局及直接拖拽，high 有动画/可重启物理但 settled 缓存可以停机，且预算不是单次 tick 的抢占保证。

  报告证据：X.md:23、25–26 — “explicitly does not change graph data”; “The budget is cooperative, not preemption of an expensive individual tick”; “unless hidden or a cached layout is already settled”

  源码证据：`src/ui/webview/graphView.ts:1495–1554`；`src/ui/webview/graphView.ts:1566–1579`；`src/ui/webview/graphView.ts:1594`；`src/ui/webview/graphView.ts:1619–1656`；`src/ui/webview/graphView.ts:1931–1959`；`src/ui/webview/graphPerformanceScript.ts:48–118`。

- **V.C7：0.5**。分组/模式替换与隐藏/显示的停止、保存、恢复和防重复工作因果充分，但没有说明独立 beforeunload 清理入口。关闭/重建只谈 singleton 与状态丢失，不能替代卸载时取消图形任务及定时器的解释；这是生命周期关系遗漏，不是错误声明。

  报告证据：X.md:35–38 — “On hide, particles and layout are paused, simulation stopped, transitions interrupted, fit/resize timers cleared”; “Closing disposes the singleton”; “Preserve cancellation and the one-loop invariant when switching groups/modes or hiding the page”

  源码证据：`src/ui/webview/graphView.ts:1234–1278`；`src/ui/webview/graphView.ts:1479–1493`；`src/ui/webview/graphPerformanceScript.ts:77–87`。

- **V.C8：1**。解释 group key 加拓扑签名验证、文字/证据更新重用、拓扑变动失配及位置/缩放恢复；明确几何缓存仅限当前文档内存，与 webview 选择键和 global 设置分开。

  报告证据：X.md:32–36 — “Prose/evidence edits do not invalidate it; topology changes do”; “It stores geometry, not graph/evidence objects”; “The layout cache is a new page-local object”

  源码证据：`src/ui/webview/graphPerformanceScript.ts:7–43`；`src/ui/webview/graphView.ts:1141–1150`；`src/ui/webview/graphView.ts:1453–1454`；`src/ui/webview/graphView.ts:1556–1579`。

- **V.C9：1**。将主机设置、布局执行/生命周期及拓扑缓存三类测试映射到风险，并明确 helper VM、mock host/语法检查不等于真实浏览器、页面回滚或端到端交互。

  报告证据：X.md:42–48 — “These are mocked-host tests: they do not execute the page’s rollback, group selection or browser layout”; “not a complete real-page quick-switch sequence”

  源码证据：`src/ui/webview/graphView.test.ts:18–31`；`src/ui/webview/graphView.test.ts:58–109`；`src/ui/webview/graphPerformanceScript.test.ts:5–38`；`src/ui/webview/graphPerformanceScript.test.ts:49–165`。

- **V.S1：1**。除位置外保存 settled/alpha/auto-fit，联系快速切组后继续未完成布局；用户缩放/拖动会禁用自动适配。

  报告证据：X.md:26、32、38、44 — “preserve unfinished alpha/auto-fit state so a quick switch does not freeze an incomplete layout”; “User zoom/pan or dragging disables automatic fitting”

  源码证据：`src/ui/webview/graphPerformanceScript.ts:24–33`；`src/ui/webview/graphView.ts:1360–1367`；`src/ui/webview/graphView.ts:1572–1579`；`src/ui/webview/graphView.ts:1933–1959`；`src/ui/webview/graphPerformanceScript.test.ts:133–140`。

- **V.S2：1**。给出组/总节点上限、LRU 淘汰和 oversized/nonfinite-position admission 拒绝，明确是缓存几何限制而非源图规模上限。

  报告证据：X.md:33、38 — “Limits are eight groups and 2,000 total cached nodes, with LRU eviction; oversized, excessively linked or nonfinite-position entries are rejected”

  源码证据：`src/ui/webview/graphPerformanceScript.ts:8–39`；`src/ui/webview/graphPerformanceScript.test.ts:119–130`。

### Instructions (I)

- **I.C1：0.5**。贡献命令→EntityCommands→service、首工作区、service 返回路径和可选打开/显示都正确；但无工作区只解释方法内 guard，遗漏 activation 提前注册 warning placeholders 并 return 的公共入口路径。缺失影响对初次无工作区调用实际路由的认识，不是把 void UI 方法误当返回路径。

  报告证据：X.md:54–58、83 — “The command chooses workspaceFolders[0]; no workspace means a localized error and immediate return”; “writes UTF-8 .github/copilot-instructions.md synchronously and returns the path”

  源码证据：`package.json:86–89`；`src/extension.ts:48–55`；`src/extension.ts:680–688`；`src/extension.ts:971`；`src/extension.ts:992–998`；`src/ui/commands/entityCommands.ts:23–39`；`src/ui/commands/entityCommands.ts:1255–1284`；`src/services/aiIntegrationService.ts:71–82`。

- **I.C2：1**。完整区分 UI 真实 snapshot/observations 收集成本与 writer 不使用 _graphData 的内容边界，并指出收集异常阻止写入。

  报告证据：X.md:56、63–64、83 — “Collected by the UI but ignored by _graphData”; “a real preceding cost and possible failure point”; “a collection failure prevents the write”

  源码证据：`src/ui/commands/entityCommands.ts:43–63`；`src/ui/commands/entityCommands.ts:1262–1284`；`src/services/aiIntegrationService.ts:71–82`；`src/services/aiIntegrationService.ts:404–408`。

- **I.C3：1**。目标、递归 mkdir、同步 UTF-8 直接覆盖、返回路径及异常向 UI 传播均有证据；明确无合并/确认/备份/原子回滚，以及失败不等于无副作用。

  报告证据：X.md:58、81 — “There is no overwrite prompt, merge, backup, existing-file content read, atomic replacement or undo/rollback”; “a write failure can leave prior contents already truncated/partially written”

  源码证据：`src/services/aiIntegrationService.ts:71–82`；`src/ui/commands/entityCommands.ts:1262–1284`。

- **I.C4：1**。准确追踪无参数 Copilot builder 到固定 en router，区分活跃紧凑输出与闲置富模板/技术栈代码，说明项目数据与 UI locale 不改变 Copilot 正文。

  报告证据：X.md:58、65–69 — “literal English locale”; “Their existence does not mean Copilot generation detects a technology stack”; “Merely editing the dormant rich builders would not change this output”

  源码证据：`src/services/aiIntegrationService.ts:71–82`；`src/services/aiIntegrationService.ts:101–119`；`src/services/aiIntegrationService.ts:404–447`；`src/services/aiIntegrationService.ts:691–711`。

- **I.C5：1**。完整解释条件式聚焦查询、局部扩展、选择性 evidence、index+单组 fallback、已知小任务跳过及源码验证，并联系紧凑 router 与定制内容的合同变化。

  报告证据：X.md:69、73、95 — “fallback to agent-context/index.md and one matching group”; “allows skipping graph lookup for small known-file tasks, requires verification in current source”; “compact-router/no-dump contract”

  源码证据：`src/services/aiIntegrationService.ts:435–442`；`src/services/aiIntegrationService.test.ts:83–98`。

- **I.C6：1**。生成建议文本与执行查询/配置外部助手/检查资源的边界清楚，且以完整 writer/builder 为证；不是把文本中的引用当作生成或验证产物。

  报告证据：X.md:67、73 — “no MCP/LLM call, availability check, graph-artifact read”; “These are generated instructions, not actions the generator performs”

  源码证据：`src/services/aiIntegrationService.ts:71–82`；`src/services/aiIntegrationService.ts:404–447`；`src/ui/commands/entityCommands.ts:1255–1284`。

- **I.C7：1**。正确解释共同 router 修改影响 Cursor、仅 Copilot wrapper 可局部修改，以及两条 bulk 路径均先 Cursor 后 Copilot且非事务。按 notes 不把不精确 locale parenthetic 纳入本项扣分；另列局部事实纠正。

  报告证据：X.md:75、77、87 — “Changes to the shared router can consequently affect both products”; “Copilot failure can leave .cursorrules already overwritten”; “Neither ... rolls the first file back”

  源码证据：`src/services/aiIntegrationService.ts:58–64`；`src/services/aiIntegrationService.ts:89–109`；`src/services/aiIntegrationService.ts:404–447`；`src/extension.ts:692–700`；`src/ui/commands/entityCommands.ts:1290–1334`。

- **I.C8：1**。映射 Copilot 正向 router/负向 dump 与 marker 断言，并将 Cursor 测试联系共享修改风险；正确指出无 GraphData fixture、不是 UI/真实 Copilot/覆盖安全或回滚测试，技术栈测试只测闲置 helper。

  报告证据：X.md:91–95 — “does not ... provide populated GraphData”; “should not be overstated as exhaustive scenario integration coverage”; “Those protect a helper, not proof that generated instructions contain project/runtime information”

  源码证据：`src/services/aiIntegrationService.test.ts:16–47`；`src/services/aiIntegrationService.test.ts:68–119`；`src/services/aiIntegrationService.test.ts:121–163`。

- **I.S1：1**。写入与后续可选展示同处 try/catch，正确推出 open/reveal 失败仍可能已有文件；关闭通知不继续操作而非撤销。

  报告证据：X.md:83 — “does nothing further when dismissed”; “an open/reveal failure can report ‘Failed to generate…’ even though the file was already written”

  源码证据：`src/ui/commands/entityCommands.ts:1262–1284`。

重大错误：无；JSON 的 `major_false_claims` 为 `[]`。

## 候选 Y

主要遗漏（V）：未发现 rubric 意义下的主要因果遗漏；不要求补齐每个常数或所有测试例子。

主要遗漏（I）：遗漏无工作区 activation 的 warning 占位命令路径，只说明方法内 guard；其余关键生成与失败边界已覆盖。

### Visualization (V)

- **V.C1：1**。完整命令、服务注入、单实例 retained panel、同标题复用/标题变化重建以及 load-ready→模式和数据→D3 渲染链。

  报告证据：Y.md:5、7 — “subsequent calls reveal that panel and resend graph data, except a translated-title change replaces its HTML”; “the host responds with performance preference and graph data”

  源码证据：`package.json:57–59`；`src/extension.ts:242–243`；`src/extension.ts:643–651`；`src/ui/webview/graphView.ts:157–210`；`src/ui/webview/graphView.ts:263–274`。

- **V.C2：1**。独立 getGroups 而非统一去重图；正确连接排序、选择键有效性/首组回退、单组渲染和 webview state，另明确空数据停止/清理与空态。

  报告证据：Y.md:7、29、37 — “Only that group is rendered; clicking a button persists its key using vscode.setState”; “Empty data has explicit cleanup and an empty-state display”

  源码证据：`src/ui/webview/graphView.ts:456–515`；`src/ui/webview/graphView.ts:1149–1150`；`src/ui/webview/graphView.ts:1372–1398`；`src/ui/webview/graphView.ts:1423–1459`。

- **V.C3：1**。按需选择层级→读取已有 structural data→聚合→临时组替换/选中，普通 graphData 丢弃临时组与错误 warning/status 因果齐全；不把结构浏览当作生成持久产物。

  报告证据：Y.md:9、28、39 — “The host reads StructuralGraphService”; “only one temporary structural view”; “a temporary structural group disappears”; “structural reads validate and throw, producing both page status and a VS Code warning”

  源码证据：`src/ui/webview/graphView.ts:223–225`；`src/ui/webview/graphView.ts:324–338`；`src/ui/webview/graphView.ts:446–453`；`src/ui/webview/graphView.ts:1372–1420`；`src/ui/webview/graphView.ts:2091–2095`；`src/services/structuralGraph/structuralGraphService.ts:63–69`。

- **V.C4：1**。模式 low/high、machine scope、低默认、global 保存及主机初始化/同步的权威来源正确，与组数据和文档内存几何区别清楚。

  报告证据：Y.md:5、18、29 — “machine-scoped low/high preference defaulting to low”; “saves globally, not to workspace files”; “global performance preference is read again and does survive”

  源码证据：`package.json:325–338`；`src/ui/webview/graphView.ts:150–154`；`src/ui/webview/graphView.ts:300–321`；`src/ui/webview/graphView.ts:1091`；`src/ui/webview/graphView.ts:1140`。

- **V.C5：1**。正确覆盖乐观应用/禁用、低高校验与 global update、有效值回执恢复 selector、失败回滚及 Settings 同步；重绘只针对当前组，不刷新整个文档。

  报告证据：Y.md:18、26 — “Failed persistence shows an error and still resends the actual preference, rolling back the optimistic UI”; “rerenders the currently selected group”

  源码证据：`src/ui/webview/graphView.ts:150–154`；`src/ui/webview/graphView.ts:309–321`；`src/ui/webview/graphView.ts:1283–1285`；`src/ui/webview/graphView.ts:2077–2084`；`src/ui/webview/graphView.ts:2176–2182`。

- **V.C6：1**。相同选中数据、low 停自动物理但执行有限让出批次并保留直接拖动、high 动画与拖动重热，以及 settled cache 可停机均解释正确；没有把 compute budget 当真实时间 SLA。

  报告证据：Y.md:18、20–22 — “Changing mode does not request a different graph dataset”; “This bounds accumulated work, not the duration of an individually expensive tick”; “does not necessarily restart already-settled physics”

  源码证据：`src/ui/webview/graphView.ts:1495–1554`；`src/ui/webview/graphView.ts:1566–1579`；`src/ui/webview/graphView.ts:1594`；`src/ui/webview/graphView.ts:1619–1656`；`src/ui/webview/graphView.ts:1931–1959`；`src/ui/webview/graphPerformanceScript.ts:48–118`。

- **V.C7：1**。明确分组/模式替换停止并保存，隐藏取消/暂停、打断 transitions/定时器、显示按模式和 alpha 恢复，以及 unload 停止；联系防止旧 callback 影响新图的风险。

  报告证据：Y.md:26–27、37 — “Before clearing the old rendering, the page stops work and saves geometry”; “old callbacks can affect a new group”; “Hidden/unloaded pages must not keep layout/particle loops or fit timers running”

  源码证据：`src/ui/webview/graphView.ts:1234–1278`；`src/ui/webview/graphView.ts:1479–1493`；`src/ui/webview/graphPerformanceScript.ts:77–87`。

- **V.C8：1**。以节点 IDs 与端点/verb 拓扑限定 cache 命中，文字证据改变仍用新 metadata 加旧几何，拓扑变更不复用；明确页面内存、文档重建丢失和选择键另存。

  报告证据：Y.md:26、29、31 — “when topology matches”; “Cache validity uses sorted node IDs and relationship endpoint/verb topology, not descriptions or evidence”; “cache, structural groups, and layout are JavaScript memory”

  源码证据：`src/ui/webview/graphPerformanceScript.ts:7–43`；`src/ui/webview/graphView.ts:1141–1150`；`src/ui/webview/graphView.ts:1453–1454`；`src/ui/webview/graphView.ts:1556–1579`。

- **V.C9：1**。三类指定回归风险均有对应断言，并准确限定 mock host、VM helper、syntax 检查不等于实际页面回滚、切组、可见性或帧延迟实测。

  报告证据：Y.md:41–47 — “It mocks VS Code and does not execute the full page/D3 interaction”; “These do not prove actual group switching, frame latency, or complete page visibility behavior”

  源码证据：`src/ui/webview/graphView.test.ts:18–31`；`src/ui/webview/graphView.test.ts:58–109`；`src/ui/webview/graphPerformanceScript.test.ts:5–38`；`src/ui/webview/graphPerformanceScript.test.ts:49–165`。

- **V.S1：1**。保存 alpha、settled、auto-fit 并说明避免 quick-switch 冻结半成品；用户 zoom/drag 禁用待执行自动适配。

  报告证据：Y.md:26、33、37 — “alpha, settled status, and auto-fit permission”; “user zoom or drag disables pending auto-fit”; “quick switches can freeze half-laid-out graphs”

  源码证据：`src/ui/webview/graphPerformanceScript.ts:24–33`；`src/ui/webview/graphView.ts:1360–1367`；`src/ui/webview/graphView.ts:1572–1579`；`src/ui/webview/graphView.ts:1933–1959`；`src/ui/webview/graphPerformanceScript.test.ts:133–140`。

- **V.S2：1**。几何缓存 admission 拒绝无效/过大条目，8组/2000总节点及 LRU 淘汰界定复用边界，而非全量源数据限制；泛称 invalid geometry 按 notes 对应节点 x/y。

  报告证据：Y.md:31 — “The LRU defaults to eight groups and 2,000 total nodes, rejects oversized/invalid geometry”; “remembered geometry is intentionally bounded and conditional, not permanent storage”

  源码证据：`src/ui/webview/graphPerformanceScript.ts:8–39`；`src/ui/webview/graphPerformanceScript.test.ts:119–130`。

### Instructions (I)

- **I.C1：0.5**。主链、首目录、service 返回路径和后续打开/OS reveal 正确；无工作区只写方法 guard，漏掉 activation 注册 warning placeholders 后返回，所以公共命令在无工作区启动时的另一真实路由未交代。

  报告证据：Y.md:53、57、69 — “chooses workspaceFolders[0], reports a localized no-workspace error and returns if absent”; “writes the returned text, and returns the path”; “revealFileInOS using the returned path”

  源码证据：`package.json:86–89`；`src/extension.ts:48–55`；`src/extension.ts:680–688`；`src/extension.ts:971`；`src/extension.ts:992–998`；`src/ui/commands/entityCommands.ts:23–39`；`src/ui/commands/entityCommands.ts:1255–1284`；`src/services/aiIntegrationService.ts:71–82`。

- **I.C2：1**。将 UI snapshot/每实体 observations 收集、传入但未消费的参数与 builder 字面内容明确连接，且指出收集异常会在写入之前被捕获。

  报告证据：Y.md:55–63 — “Graph collection is currently an execution dependency but not a content dependency”; “if snapshot/observation collection throws, the UI catches the error before writing”

  源码证据：`src/ui/commands/entityCommands.ts:43–63`；`src/ui/commands/entityCommands.ts:1262–1284`；`src/services/aiIntegrationService.ts:71–82`；`src/services/aiIntegrationService.ts:404–408`。

- **I.C3：1**。完整说明首工作区 .github、递归创建、sync UTF-8 覆盖及返回路径；无合并/备份/确认/原子写，错误被 UI 捕获且不证明原文件未变。

  报告证据：Y.md:57、67、71 — “Existing contents are overwritten”; “no read/merge, confirmation, backup, or atomic temporary-file swap”; “cannot assume an existing file remains untouched after every write failure”

  源码证据：`src/services/aiIntegrationService.ts:71–82`；`src/ui/commands/entityCommands.ts:1262–1284`。

- **I.C4：1**。正确定位 Copilot 固定 en compact router，区分活跃分派与富格式、tech-stack、scenario helper；明确 workspace/graph/locale不驱动 Copilot 正文。

  报告证据：Y.md:57–61 — “buildAgentKnowledgeRouterContent('en', '# VibeKnowledge Agent Instructions')”; “They are not on the active Copilot or Cursor router path”; “Editing those old helpers alone will not make current instructions project-specific”

  源码证据：`src/services/aiIntegrationService.ts:71–82`；`src/services/aiIntegrationService.ts:101–119`；`src/services/aiIntegrationService.ts:404–447`；`src/services/aiIntegrationService.ts:691–711`。

- **I.C5：1**。条件聚焦 MCP、local expansion、按需 evidence、index+一个 group、跳过小任务和源码验证均齐全，并联系改变 dump/template 行为需有意识修订 contract。

  报告证据：Y.md:81、91 — “If MCP is unavailable/unhelpful, read agent-context/index.md and one matching group view”; “skip graph lookup for small known-file work; verify behavior in current source”; “preserve or consciously revise that compact-router contract”

  源码证据：`src/services/aiIntegrationService.ts:435–442`；`src/services/aiIntegrationService.test.ts:83–98`。

- **I.C6：1**。充分说明写文案不执行 LLM/MCP、安装配置、资源检查或生成图产物，也不证明 Copilot 加载/遵守或下游资源可用。

  报告证据：Y.md:83 — “These are instructions in a file, not actions performed by generation”; “Successful generation proves the write completed, not that referenced downstream resources exist or are usable”

  源码证据：`src/services/aiIntegrationService.ts:71–82`；`src/services/aiIntegrationService.ts:404–447`；`src/ui/commands/entityCommands.ts:1255–1284`。

- **I.C7：1**。共享 builder 影响双方与 UI/service 各自 bulk 同一顺序、非事务部分成功合同说明完整。按 notes 不因 locale parenthetic 改变本项评分，局部措辞问题另列。

  报告证据：Y.md:75–76 — “A change to the shared router changes both products unless deliberately split”; “Neither path is transactional: Copilot failure leaves the earlier Cursor write; Cursor failure prevents Copilot from starting”

  源码证据：`src/services/aiIntegrationService.ts:58–64`；`src/services/aiIntegrationService.ts:89–109`；`src/services/aiIntegrationService.ts:404–447`；`src/extension.ts:692–700`；`src/ui/commands/entityCommands.ts:1290–1334`。

- **I.C8：1**。正确描述 temp filesystem/empty stubs、Copilot 正负断言和 Cursor 等价 compact 覆盖，联系共同 builder 风险；指出没有非空 GraphData、UI/写入失败/回滚/外部助手测试，区分技术栈 helper 测试。

  报告证据：Y.md:87–91 — “no graph argument”; “The neighboring Cursor test protects equivalent compact behavior”; “The marker test alone does not establish every template/scenario path”; “not project-specific content in the active instructions generator”

  源码证据：`src/services/aiIntegrationService.test.ts:16–47`；`src/services/aiIntegrationService.test.ts:68–119`；`src/services/aiIntegrationService.test.ts:121–163`。

- **I.S1：1**。成功后的通知和可选 open/reveal 仍在同一异常块，明确后续展示失败不撤销已写文件，dismiss 不会撤销。

  报告证据：Y.md:67、69、71 — “dismissing the notification does nothing further”; “A post-write open/reveal failure does not undo the generated file despite the error wording”

  源码证据：`src/ui/commands/entityCommands.ts:1262–1284`。

重大错误：无；JSON 的 `major_false_claims` 为 `[]`。

## 固定 notes 与评分边界

- 遵循固定 notes：panel reveal 与 disposal/new document 分开；几何有限值检查仅针对节点 x/y；返回 path 的是 service writer，不是 Promise<void> UI 命令。
- I.C7 的 locale-aware parenthetic 按 notes 不作为额外评分要求。本项只依既有共享 builder 和顺序/非事务写入合同评分，独立 locale 措辞纠正在 factual_corrections 中记录。
- 无新设标准。V.C7 的 beforeunload 和 I.C1 的无工作区 activation 占位路由均为 rubric 已明确列出的独立因果分支；相应缺失只记覆盖扣分，不记重大错误。

两项扣分的直接源码关系：

- `src/ui/webview/graphView.ts:1272–1278` 注册 `beforeunload`，执行 `stopParticleAnimation()`、`staticLayout?.stop()`、`simulation?.stop()` 及两项 clearTimeout。X 的关闭/重建段落解释状态寿命，而未解释该独立清理入口；Y:37 则明确提到 unloaded 的停止边界。
- `src/extension.ts:48–55` 在无 workspaceFolders 时调用 `registerPlaceholderCommands(context)` 后 return；`:971` 包含 Copilot 命令，`:992–998` 让它显示 warning。两份报告引用 `entityCommands.ts:1255–1259` 的 localized error guard 是真实方法行为，但不覆盖这个 activation 公共路由。

## 独立局部事实纠正（不计重大错误，不改变 I.C7）

### X：Cursor locale 措辞

报告原文：X.md:75 — “with a Cursor-specific title and English/Chinese locale”

矛盾源码：src/services/aiIntegrationService.ts:101–109 — const locale = getLocale(); 然后两处比较 locale === 'zh'。；src/i18n/i18nService.ts:126–127 — return this.currentLanguage === 'zh' ? 'zh-CN' : 'en-US';；src/i18n/i18nService.ts:148–149 — getLocale() 返回 getLocaleCode()。

该措辞将当前 Cursor 活跃路径描述成可输出英/中两种语言；实际完整 locale 代码都不等于 'zh'，所以此路径进入英文正文和英文标题。它是邻接 Cursor 语言细节的局部事实错误，不推翻 Copilot 固定英文、共享 router 或批量写入次序，故不计重大错误、不扣 I.C7。X.md:65 的“does consult getLocale()”本身正确。

### Y：Cursor locale 措辞

报告原文：Y.md:75 — “with a locale-specific Cursor heading”

矛盾源码：src/services/aiIntegrationService.ts:101–109 — locale === 'zh' 决定 router 参数及标题。；src/i18n/i18nService.ts:126–127 — getLocaleCode() 仅返回 'zh-CN' 或 'en-US'。；src/i18n/i18nService.ts:148–149 — getLocale() 返回完整代码。

若 locale-specific 指实际随已支持界面语言变化，则这一行为表述不准确：完整 locale 与短码比较不匹配，当前标题总取英文。Y.md:60 只说 builder 使用 getLocale()，作为代码依赖描述是正确的；不把这句话另计错误。该局部标题措辞不改变核心共享/顺序合同，按 notes 单独记录而不计重大错误、不扣 I.C7。

没有新增评分项，也未把相同事实的多次表述累计扣分。分数与汇总在生成前逐项校验一致；测试相关结论仅来自源码阅读。

