# 匿名功能分析盲评

仅依据给定 `rubric.md`、`notes.md`、X/Y 报告及指定源码快照逐项核实；没有运行源码、测试或构建，也没有读取任何方法映射或其他评价材料。分数采用原有 0 / 0.5 / 1 非穷尽因果标准，不按长度、例子数量或自称方法评分。

源码根目录：`D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot`。下列源码链接均指向该快照，报告引文已与对应行逐条核验。

## 总分

| 候选 | V 关键 / 9 | V 补充 / 2 | I 关键 / 8 | I 补充 / 1 | 关键合计 / 17 | 补充合计 / 3 | 重大错误 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| X | 9 | 2 | 7.5 | 1 | 16.5 | 3 | 0 |
| Y | 9 | 2 | 7.5 | 1 | 16.5 | 3 | 0 |

两份报告的关键覆盖均为 16.5/17，补充覆盖均为 3/3；没有确认的重大错误，但都遗漏同一项入口分支，故不是关键覆盖满分。

## 固定歧义处理与评分边界

- 严格采用 notes.md 的固定解释：源码以本次指定的0.4.0快照为准；panel reveal不同于dispose/new document；finite geometry检查针对node x/y；service返回path而UI方法返回void。
- I.C7 的 locale-aware 括注不作额外得分要求。源码 aiIntegrationService.ts:102–107 比较 zh，而 i18nService.ts:126–149 返回 zh-CN/en-US；X仅如实描述条件分支，未独立声称当前中文UI产中文，Y指出不匹配且正确，因此两者均无相关重大错误。
- I.C1 的 activation warning-placeholder 分支与方法自身 guard 是不同入口关系，前者并非只要求列全一个例子或行号；两份均遗漏这一显式规定的分支，统一判0.5。
- X的V.S1按全报告合并证据：切组保存/恢复alpha、settled、auto-fit和明确的unfinished-state保留已形成关系，不因未逐字写出freeze或再重复全部示例而扣分。
- 未新增重复.github通知前缀、locale矩阵等评分项；Y对重复前缀的额外发现由entityCommands.ts:1271与en.ts:293/zh.ts:294支持，X对文件名的概括不构成重大路由错误。

省略不自动视为错误；条件语句、路径简写和建议不提升为重大错误。V.S2 不要求每个缓存检查都被测试，V.C9/I.C8 则要求正确解释既有测试及其限制。

## 候选 X

主要遗漏（visualization）：按原 rubric 的非穷尽因果标准，未发现需要扣分的主要遗漏。

主要遗漏（instructions）：未说明无工作区激活时注册 warning placeholder 并提前返回，导致正常 EntityCommands 命令入口未建立的分支（I.C1）。方法级首工作区检查及写后路径展示已覆盖，因此该项为 0.5，而非 0。

### V.C1 — 1

完整连接贡献命令、双服务注入、单例保留上下文、同标题 reveal 不替换 HTML，以及 ready 后宿主模型/模式到浏览器的链路。

报告证据：

- [X.md:5](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:5)：“The view is a singleton, script-enabled webview with `retainContextWhenHidden: true`; an existing panel is revealed and sent graph data without replacing its HTML, except when its translated title changed”
- [X.md:5](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:5)：“the host responds with the actual performance preference and graph data”

源码核实：

- [package.json:57](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:57)：贡献 knowledge.visualizeGraph。
- [src/extension.ts:242](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:242)：注入两个图谱服务；643–646 注册命令并调用 createOrShow。
- [src/ui/webview/graphView.ts:157](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:157)：已有面板 reveal；同标题只 _sendGraphData；170–176 创建单例并 retainContextWhenHidden。
- [src/ui/webview/graphView.ts:205](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:205)：ready 分支发送实际性能设置和普通 groups。

### V.C2 — 1

解释独立 getGroups、排序、仅渲染选中组、记忆 key 的匹配/回退与空数据清理；后文将 key 的 webview state 与全局模式及内存 geometry 分开，因果边界完整。

报告证据：

- [X.md:7](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:7)：“only the selected group is rendered. An existing selected key wins if still present, otherwise the first group wins”
- [X.md:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:24)：“The page reads only `selectedGroupKey` from webview state; the layout cache is newly constructed.”
- [X.md:26](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:26)：“Clears in-memory selection, geometry/cache and active work, then shows the empty state.”

源码核实：

- [src/ui/webview/graphView.ts:456](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:456)：getGroups().map 建立独立模型。
- [src/ui/webview/graphView.ts:1149](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1149)：selectedGroupKey 来自 vscode.getState。
- [src/ui/webview/graphView.ts:1372](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1372)：排序、空列表清理、匹配所选 key 或第一个组。
- [src/ui/webview/graphView.ts:1449](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1449)：仅选中组 renderGraph，setState 只写 selectedGroupKey。

### V.C3 — 1

按需读取→聚合→发临时组→替换旧结构项并选择的链路正确，且明确普通 graphData 整体替换可移除临时视图；read 缺失/失败反馈及只读临时边界有可追踪证据，不要求逐字重复不生成产物。

报告证据：

- [X.md:9](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:9)：“The host reads StructuralGraphService on demand, aggregates with a limit of 80 nodes, converts the result to a display group and sends `structuralGroup`.”
- [X.md:9](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:9)：“The client removes prior `__structural_` groups, adds and selects the new one.”
- [X.md:9](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:9)：“any ordinary `graphData` response replaces the entire group array”

源码核实：

- [src/ui/webview/graphView.ts:324](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:324)：read 已有结构图、按 level 聚合后发送结构组；异常进入 _sendStructuralError。
- [src/services/structuralGraph/structuralGraphService.ts:63](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/structuralGraph/structuralGraphService.ts:63)：read 缺文件即抛错，不调用 generate。
- [src/ui/webview/graphView.ts:450](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:450)：结构错误发送页面消息和宿主 warning。
- [src/ui/webview/graphView.ts:1372](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1372)：普通数据整组替换；1401–1410 先删 __structural_ 临时项，再加入并选择新项。
- [src/ui/webview/graphView.ts:2091](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2091)：读取结构层级并发 requestStructuralOverview；2173 绑定按钮。

### V.C4 — 1

正确说明 low 默认、low/high 校验、machine scope、Global 写入及宿主实际配置权威；新面板仍取全局偏好，与局部 key/geometry 生命周期区分。

报告证据：

- [X.md:15](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:15)：“the machine-scoped setting defaults to `low`; only `low`/`high` are accepted by the host”
- [X.md:15](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:15)：“The host writes VS Code Global configuration, reports write errors, and always resends the actual stored mode”
- [X.md:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:24)：“The globally saved performance preference survives a fresh panel”

源码核实：

- [package.json:325](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:325)：性能设置 enum low/high、default low、scope machine。
- [src/ui/webview/graphView.ts:150](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:150)：设置变化重新发送当前模式。
- [src/ui/webview/graphView.ts:300](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:300)：实际配置归一化读取；309–320 Global 更新并 finally 重读。
- [src/ui/webview/graphView.ts:1091](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1091)：初始 body 与1140模式变量均取宿主设置。

### V.C5 — 1

完整说明乐观 apply/禁用/消息、宿主验证和保存、finally 实际值回包、失败回滚和启用，以及设置变化和仅重绘当前组而非 HTML reload。

报告证据：

- [X.md:15](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:15)：“A selector change immediately applies locally, disables the control, and sends `setPerformanceMode`.”
- [X.md:15](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:15)：“receiving it applies/rolls back the page and reenables the selector. Settings changes also resend the preference”
- [X.md:15](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:15)：“Changing mode rerenders the selected group; it does not request different graph data”

源码核实：

- [src/ui/webview/graphView.ts:2176](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2176)：change 立即 apply，禁用选择器并发送 setPerformanceMode。
- [src/ui/webview/graphView.ts:309](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:309)：验证 low/high，Global 保存、失败提示、finally 发真实配置。
- [src/ui/webview/graphView.ts:1283](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1283)：回包 apply 并重新启用选择器。
- [src/ui/webview/graphView.ts:2077](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2077)：改变模式后仅重选/重绘当前组；150 设置变化也发模式消息。

### V.C6 — 1

连接相同组数据与纯渲染模式差异，说明 low 有让出执行权的有界布局和局部 drag、high 动效/可重热 physics，且 settled cache 不必重热；预算未被误说成墙钟 SLA。

报告证据：

- [X.md:15](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:15)：“it does not request different graph data”
- [X.md:17](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:17)：“It yields between batches and routes errors to the render-error path”
- [X.md:17](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:17)：“Low-mode drag stops layout, moves just the node, redraws its incident geometry, and saves on release without reheating physics”
- [X.md:28](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:28)：“low-to-high preserves a settled cached layout instead of necessarily reheating it”

源码核实：

- [src/ui/webview/graphView.ts:1495](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1495)：同一组实体关系准备 links；1552 复制 nodes；模式不筛掉语义数据。
- [src/ui/webview/graphPerformanceScript.ts:48](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:48)：低模式短批次手动 tick、让出帧，按冷却/tick/累计计算预算结束。
- [src/ui/webview/graphPerformanceScript.ts:91](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:91)：低模式 drag 仅更新节点、不 restart；高模式可以 restart。
- [src/ui/webview/graphView.ts:1572](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1572)：低模式、settled 缓存或隐藏页面停止 simulation。
- [src/ui/webview/graphView.ts:1594](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1594)：link-flow 受 high 控制；1933 未 settled 的 low 才新建静态布局。

### V.C7 — 1

替换前停止/保存旧 work、隐藏时暂停并清 timers、恢复时按 unfinished/alpha 条件继续、卸载停止均具备，并通过生命周期取消与去重调度测试连接避免旧工作残留的风险。

报告证据：

- [X.md:21](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:21)：“Before replacing geometry, the page stops old layout/particles/simulation and saves its layout closure.”
- [X.md:25](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:25)：“Visibility handling pauses static work and particles, stops simulation, interrupts transitions, clears fit/resize timers and saves geometry.”
- [X.md:34](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:34)：“pause/resume/no duplicate scheduling, replacement cancellation”

源码核实：

- [src/ui/webview/graphView.ts:1234](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1234)：取消旧粒子帧，防重复调度。
- [src/ui/webview/graphView.ts:1254](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1254)：隐藏暂停静态布局/粒子、停止模拟、打断动画、清计时器并保存；显示按模式/热度恢复。
- [src/ui/webview/graphView.ts:1272](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1272)：卸载停止布局/模拟/粒子及 timers。
- [src/ui/webview/graphView.ts:1479](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1479)：替换前停止旧 work、保存旧布局、打断并清 DOM。

### V.C8 — 1

说明按组与 node/endpoint/verb topology 判定的内存 geometry cache、prose 不失效、positions/zoom 复用、文档重建丢 cache，未把源对象或全部 geometry 误当持久 state。

报告证据：

- [X.md:21](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:21)：“A valid cache entry restores positions, pan/zoom transform, alpha, settled status and auto-fit intent.”
- [X.md:22](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:22)：“Validity depends on node IDs and edge source/target/verb topology, not descriptions/evidence. Geometry is copied, never source/evidence objects”
- [X.md:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:24)：“There is no durable layout serialization in this path.”

源码核实：

- [src/ui/webview/graphPerformanceScript.ts:8](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:8)：按 group key 缓存；signature 使用 node IDs 和 sourceId/targetId/verb；保存几何而非源对象。
- [src/ui/webview/graphView.ts:1141](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1141)：每份新文档创建 memory cache。
- [src/ui/webview/graphView.ts:1454](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1454)：webview state 仅 selectedGroupKey。
- [src/ui/webview/graphView.ts:1556](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1556)：命中恢复坐标和 zoom；未命中归零 transform，1575 保存当前 geometry。

### V.C9 — 1

三类风险均与实际断言连接：宿主设置/失败同步、布局预算/生命周期/drag、cache复用失效；明确 helper VM/mock/syntax 不等于真实浏览器或硬件表现。

报告证据：

- [X.md:33](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:33)：“The shipped helper-string VM tests cover prose reuse/topology invalidation, LRU/group/node limits and pending-state retention”
- [X.md:34](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:34)：“The harness uses fake D3-like simulation, time and animation frames, not measured browser performance”
- [X.md:35](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:35)：“Settings synchronization, failed save and invalid input”
- [X.md:35](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:35)：“Syntax compilation is not execution of page event wiring.”

源码核实：

- [src/ui/webview/graphView.test.ts:58](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.test.ts:58)：manifest/HTML/语法；79 persistence/reopen/reveal；96 Settings 与失败回包。
- [src/ui/webview/graphPerformanceScript.test.ts:5](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:5)：VM 执行 shipped helper，使用伪 simulation/time/frames。
- [src/ui/webview/graphPerformanceScript.test.ts:49](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:49)：tick/compute/冷却预算；81隐藏暂停与取消；142 low/high drag。
- [src/ui/webview/graphPerformanceScript.test.ts:105](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:105)：prose/order 复用与 topology miss；133仅保存/读取未完成状态。

### I.C1 — 0.5

正常命令委托、首工作区、方法级 guard、writer 返回路径及可选展示均正确；但未解释无工作区激活先注册 warning placeholder 并 return，因而该入口不会进入其叙述的正常 EntityCommands handler。这是显式要求的另一条入口因果分支缺失，不是将方法级 guard 判错。

报告证据：

- [X.md:43](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:43)：“Its registered async handler awaits `EntityCommands.generateCopilotInstructions()`”
- [X.md:43](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:43)：“EntityCommands selects `workspaceFolders[0]`, reports a localized no-workspace error and returns if absent”
- [X.md:59](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:59)：“then returns that path”
- [X.md:63](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:63)：“These respectively call `openTextDocument`/`showTextDocument` or `revealFileInOS`”

源码核实：

- [package.json:86](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:86)：贡献 knowledge.generateCopilotInstructions。
- [src/extension.ts:48](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:48)：无 workspaceFolders 时显示 warning、注册 placeholder、直接 return，不进入正常服务/命令注册。
- [src/extension.ts:680](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:680)：正常命令委托 EntityCommands 方法。
- [src/extension.ts:971](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:971)：Copilot 命令包含在占位列表；992–996 注册仅显示 warning 的 handler。
- [src/ui/commands/entityCommands.ts:1255](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1255)：方法自己也检查 folders[0]；1264 接收服务路径，1276/1280用于可选展示。

### I.C2 — 1

正确区分 caller 真实 snapshot/observations 收集与 writer unused GraphData；明确收集有成本且失败可阻断写入，不因参数未使用推成全路径零读取。

报告证据：

- [X.md:45](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:45)：“Its `getGraphData()` obtains KnowledgeGraphService's snapshot and collects observations for each resulting entity”
- [X.md:50](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:50)：“The parameter is named `_graphData` and is unused.”
- [X.md:55](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:55)：“Graph gathering is currently an operational dependency without an output-content benefit: a snapshot/observation failure still prevents the UI from reaching generation”

源码核实：

- [src/ui/commands/entityCommands.ts:43](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:43)：getSnapshot 后逐实体 getObservations，构成 GraphData。
- [src/ui/commands/entityCommands.ts:1263](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1263)：在 writer 调用之前收集，所以抛错可阻止写入。
- [src/services/aiIntegrationService.ts:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71)：_graphData 未使用，调用无参 builder。
- [src/services/aiIntegrationService.ts:404](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:404)：Copilot wrapper 不接收/读取 graph data。

### I.C3 — 1

创建目录、同步 UTF-8 覆盖、返回路径、无 merge/备份/确认/回滚及失败可能已有副作用均正确，目录 existence check 与目标文件检查区别清楚。

报告证据：

- [X.md:59](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:59)：“creates `.github` recursively if absent, calls `buildCopilotInstructionsContent()`, synchronously writes UTF-8 to `.github/copilot-instructions.md`, then returns that path”
- [X.md:61](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:61)：“The normal write replaces existing instructions, including user-authored content.”
- [X.md:61](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:61)：“a failed direct write is not a guarantee that old file bytes were preserved”

源码核实：

- [src/services/aiIntegrationService.ts:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71)：仅检查/递归创建 .github，UTF-8 writeFileSync 无条件覆盖并返回路径，无 merge/backup/temp-rename/rollback。
- [src/ui/commands/entityCommands.ts:1262](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262)：生成及展示在 try 中；1282 捕获异常。

### I.C4 — 1

准确追踪无参 Copilot wrapper→固定 en compact router，且将 UI locale、GraphData、technology/scenario/custom-template 及旧 rich helpers 从活动链排除。

报告证据：

- [X.md:52](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:52)：“Affects command notifications, not Copilot content”
- [X.md:53](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:53)：“the active Cursor and Copilot entry builders both call the compact router instead”
- [X.md:55](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:55)：“Copilot content is currently the same fixed router across projects, graph contents and interface locales.”

源码核实：

- [src/services/aiIntegrationService.ts:404](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:404)：Copilot 无参 wrapper 硬编码 en 后调用共享 compact router。
- [src/services/aiIntegrationService.ts:432](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:432)：固定英文字符串，不嵌 graph/template/tech-stack。
- [src/services/aiIntegrationService.ts:101](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:101)：活动 Cursor 也调用 router，不调用114/259的旧 rich builders。
- [src/services/aiIntegrationService.ts:691](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:691)：场景模板读取在旧 rich helper 路径，不在活动 Copilot 链。

### I.C5 — 1

说明特定复杂任务条件式 focused MCP 查询、局部扩展/选择证据、index+一个组的有界 fallback、小已知文件任务可跳过及源码验证，并连接其固定 router 契约与个性化改动。

报告证据：

- [X.md:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:71)：“If MCP is unavailable/unhelpful, it points to `.vscode/.knowledge/agent-context/index.md` and only the best-matching group view.”
- [X.md:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:71)：“permits known-file small tasks to skip graph lookup, requires current-source verification”
- [X.md:55](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:55)：““More project-specific” therefore changes the active data contract”

源码核实：

- [src/services/aiIntegrationService.ts:435](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:435)：按需依赖导航；437针对指定任务条件式 focused query；438局部扩展及选择证据。
- [src/services/aiIntegrationService.ts:439](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:439)：无 MCP/结果无用时 index+一个最佳组，440不默认 audit dump，441小任务可跳过并验证源码。

### I.C6 — 1

明确生成文本不等于执行指导：不查询/安装或验证 MCP、不造/验证上下文产物、不证明消费者发现/遵循，source boundary正确。

报告证据：

- [X.md:59](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:59)：“There is no model call, project analysis, prompt, network operation or graph query in this active content-generation chain.”
- [X.md:73](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:73)：“These are instructions written into text, not actions performed by the generator.”
- [X.md:73](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:73)：“does not configure/install MCP, run the named tools, generate/validate the context index or group files”

源码核实：

- [src/services/aiIntegrationService.ts:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71)：完整 writer 仅 mkdir、builder、writeFileSync、return。
- [src/services/aiIntegrationService.ts:404](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:404)：活动 builder 构造静态文本；437–442只是后续工具/文件指导，不执行或验证目标。
- [src/ui/commands/entityCommands.ts:1262](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262)：调用者只收集、写文件、通知/可选展示，未连接真实 Copilot/MCP 消费者。

### I.C7 — 1

共享 builder 影响范围、Copilot wrapper 的局部变更边界、UI/service两条路径顺序复用 writers 及第二阶段失败保留 Cursor 均正确。locale句只是代码条件 zh/otherwise 的准确描述，未声称当前中文 UI 会产中文；按 notes 不另加 locale 必答条件。

报告证据：

- [X.md:67](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:67)：“These are sequential, not transactional: Copilot failure leaves an already-written Cursor file”
- [X.md:69](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:69)：“Cursor's active builder shares the compact router, selecting Chinese only for locale `zh` and otherwise English”
- [X.md:69](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:69)：“Changing shared router logic can affect both products; changing the Copilot wrapper alone need not change Cursor.”

源码核实：

- [src/services/aiIntegrationService.ts:58](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:58)：Cursor writer 到101共享 router；404 Copilot wrapper 也到共享 router。
- [src/services/aiIntegrationService.ts:89](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:89)：await Cursor 后 await Copilot；无事务回滚。
- [src/ui/commands/entityCommands.ts:1290](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1290)：UI 路径独立顺序调用同一对 writers；1308先 Cursor、1311后 Copilot。
- [src/i18n/i18nService.ts:126](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/i18n/i18nService.ts:126)：getLocaleCode 返回 zh-CN/en-US；148导出 getLocale。

### I.C8 — 1

连接 Copilot 正向路由/fallback 和反向模板/图转储断言、Cursor共享风险；明确没传 GraphData、空 service doubles、非命令/真实消费者测试，所列增补仅为建议。

报告证据：

- [X.md:77](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:77)：“It calls generation without GraphData using empty service doubles”
- [X.md:78](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:78)：“The neighboring Cursor test protects shared query-first behavior and absence of template/graph dumps”
- [X.md:79](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:79)：“They also do not test live Copilot/MCP/index availability.”
- [X.md:79](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:79)：“These are proposed verification needs, not implemented changes or claims of measured coverage.”

源码核实：

- [src/services/aiIntegrationService.test.ts:16](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:16)：VS Code mock 无 workspaceFolders；42服务使用空 stub。
- [src/services/aiIntegrationService.test.ts:68](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:68)：temp workspace 与模板 marker；78不传 GraphData；83–97验证 focused routing/fallback 和无模板/图转储标题。
- [src/services/aiIntegrationService.test.ts:100](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:100)：Cursor compact-router assertions 保护共享 builder。
- [src/services/aiIntegrationService.test.ts:121](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:121)：后续测试直接调 private tech-stack helper，不经过当前输出内容路径。

### V.S1 — 1

整体证据已连接切组保存/恢复 alpha、settled、auto-fit 与未完成状态保留，另说明用户交互禁 auto-fit；不是仅列 x/y。按非穷尽标准，不因未使用“freeze”原句再扣分。

报告证据：

- [X.md:21](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:21)：“A valid cache entry restores positions, pan/zoom transform, alpha, settled status and auto-fit intent.”
- [X.md:28](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:28)：“user zoom/pan or drag disables pending automatic fit”
- [X.md:33](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:33)：“Preserve cache freshness without caching old semantic data, bounded memory, unfinished-layout alpha/auto-fit state, and cleanup before rendering replacements.”

源码核实：

- [src/ui/webview/graphPerformanceScript.ts:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:24)：缓存 settled、alpha、autoFit。
- [src/ui/webview/graphView.ts:1572](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1572)：按 cached settled/alpha恢复模拟状态；1933未 settled 的 low 重建并 resume布局。
- [src/ui/webview/graphView.ts:1360](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1360)：用户 zoom 禁自动 fit；1957 drag 亦然。
- [src/ui/webview/graphPerformanceScript.test.ts:133](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:133)：测试保存并取回未完成状态，不是端到端切组。

### V.S2 — 1

明确内存 LRU 的组/总节点约束与 oversized/nonfinite admission拒绝，因而并非无界会话保留，也没误当图源规模限制；finite 只按 notes 解为 node positions。

报告证据：

- [X.md:22](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:22)：“Memory-only LRU defaults to eight groups/2,000 total nodes; oversized groups, excessive links or nonfinite positions are not cached.”

源码核实：

- [src/ui/webview/graphPerformanceScript.ts:8](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:8)：默认8组/2000节点。
- [src/ui/webview/graphPerformanceScript.ts:26](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:26)：拒绝超大节点/边集合和非有限 node x/y。
- [src/ui/webview/graphPerformanceScript.ts:35](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:35)：超过组数/总节点数则驱逐最旧项；17–21读取更新 LRU。
- [src/ui/webview/graphPerformanceScript.test.ts:119](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:119)：组/节点 bound 及 LRU 断言。

### I.S1 — 1

说明成功写入与后续展示的不同完成边界，同一 catch 可将 open/reveal 失败呈现为生成错误；取消通知不撤销文件。

报告证据：

- [X.md:63](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:63)：“dismissing the message leaves the file written with no follow-up action.”
- [X.md:63](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/X.md:63)：“An open/reveal error can therefore be reported after the file was successfully written; the command does not undo it”

源码核实：

- [src/ui/commands/entityCommands.ts:1262](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262)：同一 try/catch 包围 writer、成功通知和 open/reveal；1282后展示失败仍报 generation error。
- [src/services/aiIntegrationService.ts:80](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:80)：服务先写完并返回；未实现展示失败后的撤销。

### X：重大错误

未发现。对应 JSON 的 `major_false_claims` 为 `[]`；I.C1 是遗漏，不记为重大错误。

## 候选 Y

主要遗漏（visualization）：按原 rubric 的非穷尽因果标准，未发现需要扣分的主要遗漏。

主要遗漏（instructions）：未说明无工作区激活时注册 warning placeholder 并提前返回，导致正常 EntityCommands 命令入口未建立的分支（I.C1）。方法级首工作区检查及写后路径展示已覆盖，因此该项为 0.5，而非 0。

### V.C1 — 1

完整说明贡献入口、正常 command→createOrShow、双服务依赖、单例 retain context、同标题 reveal只发数据、ready握手与浏览器接收实际设置/组，区分 reveal/visibility/new document。

报告证据：

- [Y.md:5](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:5)：“its extension-host handler calls `GraphView.createOrShow(context.extensionUri)`”
- [Y.md:7](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:7)：“The host maintains a single panel. New panels enable scripts and retain context while hidden.”
- [Y.md:7](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:7)：“with an unchanged localized title it posts fresh `graphData` without replacing HTML”
- [Y.md:7](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:7)：“receives the effective performance preference followed by ordinary groups”

源码核实：

- [package.json:57](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:57)：贡献 knowledge.visualizeGraph。
- [src/extension.ts:242](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:242)：注入两个图谱服务；643–646 注册命令并调用 createOrShow。
- [src/ui/webview/graphView.ts:157](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:157)：已有面板 reveal；同标题只 _sendGraphData；170–176 创建单例并 retainContextWhenHidden。
- [src/ui/webview/graphView.ts:205](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:205)：ready 分支发送实际性能设置和普通 groups。

### V.C2 — 1

getGroups 独立视图、排序、记忆 key 回退、单组渲染和 setState 明确；把选中 key 与内存 cache及 durable性能偏好区分，空数据也停止/清理并展示空态。

报告证据：

- [Y.md:9](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:9)：“Ordinary groups are independent framework/module/feature views, not a union of all nodes.”
- [Y.md:9](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:9)：“restores a matching selected key or falls back to the first group, and renders only that group.”
- [Y.md:9](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:9)：“Selection writes `vscode.setState({ selectedGroupKey })`”
- [Y.md:28](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:28)：“No groups clears live selection, simulation, geometry cache, and graph DOM, then displays the empty state.”

源码核实：

- [src/ui/webview/graphView.ts:456](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:456)：getGroups().map 建立独立模型。
- [src/ui/webview/graphView.ts:1149](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1149)：selectedGroupKey 来自 vscode.getState。
- [src/ui/webview/graphView.ts:1372](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1372)：排序、空列表清理、匹配所选 key 或第一个组。
- [src/ui/webview/graphView.ts:1449](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1449)：仅选中组 renderGraph，setState 只写 selectedGroupKey。

### V.C3 — 1

清楚说明按钮读取当前 level后发请求、host只读聚合并发送、单一临时槽替换/选中、普通 graphData移除及错误/status+warning；此只读 transient链足以表达非持久视图，不要求列每种不产生的文件。

报告证据：

- [Y.md:11](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:11)：“changing the option alone does not fetch a view—the adjacent structural button sends `requestStructuralOverview` with its current value.”
- [Y.md:11](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:11)：“This is one temporary advanced slot, not a stack of drill-down tabs.”
- [Y.md:26](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:26)：“an active structural group disappears and selection falls back to the first ordinary group.”
- [Y.md:42](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:42)：“structural failures post an error/status and host warning, leaving the previous view available.”

源码核实：

- [src/ui/webview/graphView.ts:324](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:324)：read 已有结构图、按 level 聚合后发送结构组；异常进入 _sendStructuralError。
- [src/services/structuralGraph/structuralGraphService.ts:63](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/structuralGraph/structuralGraphService.ts:63)：read 缺文件即抛错，不调用 generate。
- [src/ui/webview/graphView.ts:450](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:450)：结构错误发送页面消息和宿主 warning。
- [src/ui/webview/graphView.ts:1372](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1372)：普通数据整组替换；1401–1410 先删 __structural_ 临时项，再加入并选择新项。
- [src/ui/webview/graphView.ts:2091](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2091)：读取结构层级并发 requestStructuralOverview；2173 绑定按钮。

### V.C4 — 1

正确描述 low默认、machine scope、low/high、Global、实际设置回读与初始化/Settings同步；明确属于显示偏好而非图修改，与持久几何分开。

报告证据：

- [Y.md:34](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:34)：“The default setting is `low`, enum `low/high`, machine-scoped.”
- [Y.md:34](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:34)：“saves to `ConfigurationTarget.Global`, and always posts the effective setting back”
- [Y.md:34](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:34)：“This is a display preference, not graph mutation.”
- [Y.md:27](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:27)：“the durable reopen preference is the separately saved performance setting”

源码核实：

- [package.json:325](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:325)：性能设置 enum low/high、default low、scope machine。
- [src/ui/webview/graphView.ts:150](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:150)：设置变化重新发送当前模式。
- [src/ui/webview/graphView.ts:300](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:300)：实际配置归一化读取；309–320 Global 更新并 finally 重读。
- [src/ui/webview/graphView.ts:1091](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1091)：初始 body 与1140模式变量均取宿主设置。

### V.C5 — 1

完整覆盖乐观UI→禁用→发送→合法值/保存→finally真实值回包→回滚/启用，并描述模式仅当前组重绘及同一设置消息同步路径。

报告证据：

- [Y.md:34](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:34)：“The selector optimistically applies the mode and rerenders the selected group, disables itself, then posts `setPerformanceMode`.”
- [Y.md:34](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:34)：“The reply reapplies/rolls back the page and reenables the selector. Settings UI changes reach the same reply path.”

源码核实：

- [src/ui/webview/graphView.ts:2176](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2176)：change 立即 apply，禁用选择器并发送 setPerformanceMode。
- [src/ui/webview/graphView.ts:309](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:309)：验证 low/high，Global 保存、失败提示、finally 发真实配置。
- [src/ui/webview/graphView.ts:1283](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1283)：回包 apply 并重新启用选择器。
- [src/ui/webview/graphView.ts:2077](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:2077)：改变模式后仅重选/重绘当前组；150 设置变化也发模式消息。

### V.C6 — 1

同一选中图保留交互、低模式有有限分批force布局和局部drag、高模式重热与动效、settled缓存例外均讲清；计算预算与墙钟保证作了正确区分。

报告证据：

- [Y.md:36](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:36)：“Low mode still computes a force layout, but it stops D3's automatic loop”
- [Y.md:36](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:36)：“this is not a guaranteed 600 ms wall-clock deadline”
- [Y.md:36](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:36)：“Low-mode drag cancels pending layout, updates only the dragged node and incident geometry, and never restarts physics.”
- [Y.md:38](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:38)：“It does not necessarily restart a settled cached layout merely because the mode changed”

源码核实：

- [src/ui/webview/graphView.ts:1495](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1495)：同一组实体关系准备 links；1552 复制 nodes；模式不筛掉语义数据。
- [src/ui/webview/graphPerformanceScript.ts:48](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:48)：低模式短批次手动 tick、让出帧，按冷却/tick/累计计算预算结束。
- [src/ui/webview/graphPerformanceScript.ts:91](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:91)：低模式 drag 仅更新节点、不 restart；高模式可以 restart。
- [src/ui/webview/graphView.ts:1572](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1572)：低模式、settled 缓存或隐藏页面停止 simulation。
- [src/ui/webview/graphView.ts:1594](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1594)：link-flow 受 high 控制；1933 未 settled 的 low 才新建静态布局。

### V.C7 — 1

替换、隐藏、恢复与卸载的 graph work拥有明确取消/保存/恢复条件；直接连接旧回调污染新组与隐藏忙碌风险，没有把 retainContext误当后台持续运行。

报告证据：

- [Y.md:25](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:25)：“Hiding pauses particles/static layout, stops physics, interrupts transitions, cancels fit/resize timers, saves layout”
- [Y.md:40](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:40)：“replacement stops old particle/static/simulation work and interrupts transitions before new graph construction; hidden and unload paths cancel scheduled work.”
- [Y.md:40](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:40)：“Otherwise old callbacks can mutate a newly selected view or leave hidden pages busy.”

源码核实：

- [src/ui/webview/graphView.ts:1234](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1234)：取消旧粒子帧，防重复调度。
- [src/ui/webview/graphView.ts:1254](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1254)：隐藏暂停静态布局/粒子、停止模拟、打断动画、清计时器并保存；显示按模式/热度恢复。
- [src/ui/webview/graphView.ts:1272](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1272)：卸载停止布局/模拟/粒子及 timers。
- [src/ui/webview/graphView.ts:1479](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1479)：替换前停止旧 work、保存旧布局、打断并清 DOM。

### V.C8 — 1

内存/新文档生命周期、group key+拓扑签名、prose复用且显示新语义、topology miss、positions/zoom复用均正确，也明确不保存源对象/完整 state geometry。

报告证据：

- [Y.md:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:24)：“This is a browser-memory LRU cache, not VS Code persisted state.”
- [Y.md:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:24)：“Metadata-only changes can reuse geometry while displaying fresh data; topology changes miss the cache.”
- [Y.md:27](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:27)：“Page initialization reads only `selectedGroupKey` from `getState`; all caches and group arrays are newly allocated.”

源码核实：

- [src/ui/webview/graphPerformanceScript.ts:8](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:8)：按 group key 缓存；signature 使用 node IDs 和 sourceId/targetId/verb；保存几何而非源对象。
- [src/ui/webview/graphView.ts:1141](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1141)：每份新文档创建 memory cache。
- [src/ui/webview/graphView.ts:1454](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1454)：webview state 仅 selectedGroupKey。
- [src/ui/webview/graphView.ts:1556](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1556)：命中恢复坐标和 zoom；未命中归零 transform，1575 保存当前 geometry。

### V.C9 — 1

把设置/回滚、有限执行/隐藏取消、cache invalidation/revisit 三组风险都映射到对应真实测试，明确 mocks/VM/语法检查及非D3、非整页交互/E2E的限制。

报告证据：

- [Y.md:48](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:48)：“It mocks VS Code and compiles—not executes—the entire page”
- [Y.md:49](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:49)：“Tests execute the shipped helper string in a VM with mocked frames/time/simulation”
- [Y.md:50](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:50)：“Helper tests cover geometry across prose/order changes, invalidation after topology changes”
- [Y.md:50](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:50)：“The quick-switch test stores/retrieves state; it is not an end-to-end switch sequence.”

源码核实：

- [src/ui/webview/graphView.test.ts:58](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.test.ts:58)：manifest/HTML/语法；79 persistence/reopen/reveal；96 Settings 与失败回包。
- [src/ui/webview/graphPerformanceScript.test.ts:5](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:5)：VM 执行 shipped helper，使用伪 simulation/time/frames。
- [src/ui/webview/graphPerformanceScript.test.ts:49](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:49)：tick/compute/冷却预算；81隐藏暂停与取消；142 low/high drag。
- [src/ui/webview/graphPerformanceScript.test.ts:105](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:105)：prose/order 复用与 topology miss；133仅保存/读取未完成状态。

### I.C1 — 0.5

正常命令→EntityCommands→首工作区 writer→路径展示与方法级无工作区 guard准确；但未识别无工作区激活先注册警告占位并 return的另一条公共入口，因此入口解释仍不完整。此遗漏不等于报告断言 guard不存在或执行成功。

报告证据：

- [Y.md:60](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:60)：“The registered async handler delegates to `EntityCommands.generateCopilotInstructions()`”
- [Y.md:60](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:60)：“The command takes the first workspace folder, errors and returns if none exists”
- [Y.md:64](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:64)：“returns that exact path”
- [Y.md:64](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:64)：“choosing the former opens and displays the returned file, choosing the latter invokes `revealFileInOS`”

源码核实：

- [package.json:86](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/package.json:86)：贡献 knowledge.generateCopilotInstructions。
- [src/extension.ts:48](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:48)：无 workspaceFolders 时显示 warning、注册 placeholder、直接 return，不进入正常服务/命令注册。
- [src/extension.ts:680](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:680)：正常命令委托 EntityCommands 方法。
- [src/extension.ts:971](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/extension.ts:971)：Copilot 命令包含在占位列表；992–996 注册仅显示 warning 的 handler。
- [src/ui/commands/entityCommands.ts:1255](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1255)：方法自己也检查 folders[0]；1264 接收服务路径，1276/1280用于可选展示。

### I.C2 — 1

明确调用端实际 snapshot/observations收集、传GraphData、活动参数unused和无内容影响，同时说明收集开销/抛错可阻止写，因果完整。

报告证据：

- [Y.md:62](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:62)：“This is real work on the command path, despite not being used by the active Copilot builder.”
- [Y.md:62](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:62)：“graph collection can consume time or throw and prevent generation before any write”
- [Y.md:75](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:75)：“All are ignored by the active Copilot service parameter `_graphData`”

源码核实：

- [src/ui/commands/entityCommands.ts:43](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:43)：getSnapshot 后逐实体 getObservations，构成 GraphData。
- [src/ui/commands/entityCommands.ts:1263](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1263)：在 writer 调用之前收集，所以抛错可阻止写入。
- [src/services/aiIntegrationService.ts:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71)：_graphData 未使用，调用无参 builder。
- [src/services/aiIntegrationService.ts:404](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:404)：Copilot wrapper 不接收/读取 graph data。

### I.C3 — 1

路径、recursive mkdir、sync UTF-8、返回路径、目标文件无条件覆盖/无确认合并备份及无事务/回滚均正确；还区分目录可能已经创建和失败后的无 restoration。

报告证据：

- [Y.md:64](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:64)：“creates `.github` recursively if absent, calls the content builder, synchronously writes UTF-8, and returns that exact path.”
- [Y.md:93](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:93)：“an existing instruction file is replaced, with no merge, preserved user section, backup, comparison, or confirmation.”
- [Y.md:93](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:93)：“If directory creation succeeds and writing subsequently fails, that newly created directory can remain.”

源码核实：

- [src/services/aiIntegrationService.ts:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71)：仅检查/递归创建 .github，UTF-8 writeFileSync 无条件覆盖并返回路径，无 merge/backup/temp-rename/rollback。
- [src/ui/commands/entityCommands.ts:1262](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262)：生成及展示在 try 中；1282 捕获异常。

### I.C4 — 1

固定英文 compact路由器活动链完整，并将 GraphData、UI locale、富格式/tech stack与场景template分派从实际内容链分开；locale问题识别与源代码一致。

报告证据：

- [Y.md:70](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:70)：“`generateCopilotInstructions(workspaceRoot, _graphData?)` → `buildCopilotInstructionsContent()` → `buildAgentKnowledgeRouterContent('en', '# VibeKnowledge Agent Instructions')`”
- [Y.md:78](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:78)：“Neither active generator reaches this path.”
- [Y.md:79](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:79)：“Copilot explicitly forces English.”

源码核实：

- [src/services/aiIntegrationService.ts:404](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:404)：Copilot 无参 wrapper 硬编码 en 后调用共享 compact router。
- [src/services/aiIntegrationService.ts:432](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:432)：固定英文字符串，不嵌 graph/template/tech-stack。
- [src/services/aiIntegrationService.ts:101](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:101)：活动 Cursor 也调用 router，不调用114/259的旧 rich builders。
- [src/services/aiIntegrationService.ts:691](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:691)：场景模板读取在旧 rich helper 路径，不在活动 Copilot 链。

### I.C5 — 1

正确给出 focused条件式查询、局部扩展/审计证据、单组index fallback、默认不读全集、小任务跳过和源码确认；同时指出个性化输出改变generic routing契约。

报告证据：

- [Y.md:85](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:85)：“call MCP `query_graph` for unfamiliar/architectural/cross-file/impact tasks when available, then focused entity/neighbor/path queries”
- [Y.md:85](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:85)：“fall back to the agent-context index and one matching group”
- [Y.md:85](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:85)：“skip graph lookup for small known-file tasks; verify current source before edits/tests”
- [Y.md:114](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:114)：“More project-specific output would change today's deliberately generic routing contract”

源码核实：

- [src/services/aiIntegrationService.ts:435](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:435)：按需依赖导航；437针对指定任务条件式 focused query；438局部扩展及选择证据。
- [src/services/aiIntegrationService.ts:439](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:439)：无 MCP/结果无用时 index+一个最佳组，440不默认 audit dump，441小任务可跳过并验证源码。

### I.C6 — 1

明确文本推荐非当场执行，生成不调用AI/MCP、安装验证外部连接、生成fallback产物或证明真实Copilot消费；正确区分意图推断与执行证据。

报告证据：

- [Y.md:70](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:70)：“It neither calls an AI model nor examines the project to compose its prose.”
- [Y.md:85](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:85)：“These are strings in the output, not actions the generator performs.”
- [Y.md:85](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:85)：“It does not call those tools, validate/install MCP, load the referenced graph files, refresh graph artifacts”
- [Y.md:85](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:85)：“not an observed Copilot execution”

源码核实：

- [src/services/aiIntegrationService.ts:71](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:71)：完整 writer 仅 mkdir、builder、writeFileSync、return。
- [src/services/aiIntegrationService.ts:404](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:404)：活动 builder 构造静态文本；437–442只是后续工具/文件指导，不执行或验证目标。
- [src/ui/commands/entityCommands.ts:1262](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262)：调用者只收集、写文件、通知/可选展示，未连接真实 Copilot/MCP 消费者。

### I.C7 — 1

共享helper及Copilot-only wrapper的变更影响、两条batch路径复用同writers、Cursor→Copilot顺序及部分成功均正确；按notes评价这些主契约，locale full-code不匹配的独立推断已核实正确。

报告证据：

- [Y.md:87](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:87)：“A shared-router edit therefore changes both products' output”
- [Y.md:89](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:89)：“the UI command independently orchestrates those same two methods”
- [Y.md:97](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:97)：“If Copilot fails after Cursor succeeds, the Cursor file remains changed”
- [Y.md:79](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:79)：“`getLocale()` actually returns `zh-CN` or `en-US`”

源码核实：

- [src/services/aiIntegrationService.ts:58](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:58)：Cursor writer 到101共享 router；404 Copilot wrapper 也到共享 router。
- [src/services/aiIntegrationService.ts:89](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:89)：await Cursor 后 await Copilot；无事务回滚。
- [src/ui/commands/entityCommands.ts:1290](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1290)：UI 路径独立顺序调用同一对 writers；1308先 Cursor、1311后 Copilot。
- [src/i18n/i18nService.ts:126](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/i18n/i18nService.ts:126)：getLocaleCode 返回 zh-CN/en-US；148导出 getLocale。

### I.C8 — 1

准确说明Copilot正负路由断言及Cursor保护共享builder，说明无GraphData fixture、空stubs及测试非UI/消费者/overwrite/事务覆盖；没有用tech-stack私有helper测试宣称现有输出包含该数据。

报告证据：

- [Y.md:101](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:101)：“It excludes the custom marker, Tech Stack, Dependency Details, and Total Entities.”
- [Y.md:101](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:101)：“The service is constructed with empty dependency stubs and no GraphData”
- [Y.md:103](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:103)：“The paired Cursor test checks the same compact, query-first pattern and absence of template/graph dumps, protecting the shared builder's role.”
- [Y.md:103](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:103)：“Those extractor tests are not evidence that current generated instructions contain project technology information.”

源码核实：

- [src/services/aiIntegrationService.test.ts:16](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:16)：VS Code mock 无 workspaceFolders；42服务使用空 stub。
- [src/services/aiIntegrationService.test.ts:68](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:68)：temp workspace 与模板 marker；78不传 GraphData；83–97验证 focused routing/fallback 和无模板/图转储标题。
- [src/services/aiIntegrationService.test.ts:100](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:100)：Cursor compact-router assertions 保护共享 builder。
- [src/services/aiIntegrationService.test.ts:121](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.test.ts:121)：后续测试直接调 private tech-stack helper，不经过当前输出内容路径。

### V.S1 — 1

明确说明切换前未稳定状态需保留alpha/settled/auto-fit，以免只存坐标导致冻结；恢复与用户zoom/drag禁auto-fit也有因果解释。

报告证据：

- [Y.md:23](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:23)：“Matching cache entries restore positions, pan/zoom, cooling alpha, settled state, and pending auto-fit intent.”
- [Y.md:40](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:40)：“Cache alpha/settled/auto-fit fields matter when switching away before stabilization; preserving positions alone can freeze an unfinished layout.”
- [Y.md:38](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:38)：“User-origin zoom and drag suppress pending auto-fit”

源码核实：

- [src/ui/webview/graphPerformanceScript.ts:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:24)：缓存 settled、alpha、autoFit。
- [src/ui/webview/graphView.ts:1572](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1572)：按 cached settled/alpha恢复模拟状态；1933未 settled 的 low 重建并 resume布局。
- [src/ui/webview/graphView.ts:1360](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphView.ts:1360)：用户 zoom 禁自动 fit；1957 drag 亦然。
- [src/ui/webview/graphPerformanceScript.test.ts:133](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:133)：测试保存并取回未完成状态，不是端到端切组。

### V.S2 — 1

明确cache admission拒绝超大/非有限坐标，以及LRU组数/总节点限制；未将缓存容量说成实体源数据规模限制。

报告证据：

- [Y.md:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:24)：“Defaults are eight groups and 2,000 total cached nodes; individual entries reject oversized node/link sets or nonfinite positions.”
- [Y.md:24](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:24)：“This is a browser-memory LRU cache”

源码核实：

- [src/ui/webview/graphPerformanceScript.ts:8](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:8)：默认8组/2000节点。
- [src/ui/webview/graphPerformanceScript.ts:26](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:26)：拒绝超大节点/边集合和非有限 node x/y。
- [src/ui/webview/graphPerformanceScript.ts:35](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.ts:35)：超过组数/总节点数则驱逐最旧项；17–21读取更新 LRU。
- [src/ui/webview/graphPerformanceScript.test.ts:119](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/webview/graphPerformanceScript.test.ts:119)：组/节点 bound 及 LRU 断言。

### I.S1 — 1

分离写成功与可选展示，dismiss不撤销；同一try/catch可在写完后因open/reveal失败发生成错误，并明确无回滚。

报告证据：

- [Y.md:64](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:64)：“dismissing the prompt simply leaves the generated file in place.”
- [Y.md:95](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-blind-PYhKqE/Y.md:95)：“an open/reveal failure after a successful write can produce a “generation failed” message even though the file exists”

源码核实：

- [src/ui/commands/entityCommands.ts:1262](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/ui/commands/entityCommands.ts:1262)：同一 try/catch 包围 writer、成功通知和 open/reveal；1282后展示失败仍报 generation error。
- [src/services/aiIntegrationService.ts:80](D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-first-ab-fMamLc/snapshot/src/services/aiIntegrationService.ts:80)：服务先写完并返回；未实现展示失败后的撤销。

### Y：重大错误

未发现。对应 JSON 的 `major_false_claims` 为 `[]`；I.C1 是遗漏，不记为重大错误。

## 一致性检查

X、Y各有且仅有20项，ID分别覆盖V.C1–V.C9、I.C1–I.C8、V.S1、V.S2、I.S1；分值均为0/0.5/1。两者关键项各为9 + 7.5 = 16.5，补充项各为2 + 1 = 3，major_false_claim_count与空数组长度一致。
