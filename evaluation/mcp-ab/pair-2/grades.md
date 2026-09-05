# 匿名评分：X / Y

只读取指定 rubric、notes、两份候选与指定 0.4.0 源码快照；未运行测试，未读取任何映射、旧成绩或其他评估材料。分数采用原定 0 / 0.5 / 1；定位均相对于候选目录或下述源码根目录。

源码根目录：`D:/workspace/VibeKnowledge/.vscode-test/mcp-feature-ab-jzyaQm/snapshot`

| 候选 | V critical | V supplemental | I critical | I supplemental | critical 合计 | supplemental 合计 | 重大错误 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| X | 9/9 | 2/2 | 7.5/8 | 1/1 | 16.5/17 | 3/3 | 0 |
| Y | 9/9 | 2/2 | 7.5/8 | 1/1 | 16.5/17 | 3/3 | 0 |

## 评分解释

非穷尽规则接受等价证据及跨段落连接，不因没有复述每个示例、数值或 incidental detail 扣分。两份答案的 I.C1 均缺少实际改变公开命令入口的“无工作区激活 → 占位 warning 命令 → 不进入正常服务链路”关系，故该项 0.5；其方法内 guard 说明正确，不计重大错误。

## 候选 X

### V — visualization

Critical 9/9；supplemental 2/2。

| 项目 | 分数 | 理由 | 候选定位 | 核对源码/测试定位 |
| --- | ---: | --- | --- | --- |
| V.C1 命令、宿主依赖及页面生命周期 | 1 | 连接命令→createOrShow→注入服务→宿主消息→页面渲染；准确区分单例 reveal 与重建 HTML，说明 ready 回传设置和分组、隐藏保留上下文。 | `X.md:9`、`X.md:13` | `package.json:57`；`src/extension.ts:242-243`；`src/extension.ts:643-650`；`src/ui/webview/graphView.ts:128-210`；`src/ui/webview/graphView.ts:263-273` |
| V.C2 独立分组选择与保存状态 | 1 | 准确说明 getGroups 的独立视图、排序、保存键/首组回退及只渲染当前组，并区分 webview 选择状态、页面几何和全局偏好；空列表清理也有说明。 X 未逐字展开空态提示/空组的每个停止调用，但已说明空替换清几何并给出对应分支定位；按非穷尽规则不另扣分。 | `X.md:17`、`X.md:19`、`X.md:45`、`X.md:48` | `src/ui/webview/graphView.ts:457-462`；`src/ui/webview/graphView.ts:1140-1150`；`src/ui/webview/graphView.ts:1372-1398`；`src/ui/webview/graphView.ts:1449-1459`；`src/services/knowledgeGraphService.ts:147-154` |
| V.C3 高级结构视图的按需与临时性 | 1 | 说明按钮携带聚合层级、宿主读取结构数据并返回 structuralGroup、替换临时结构槽并选中；普通数据更新会移除该槽，错误给状态/警告而不是生成永久项目分组。 | `X.md:21`、`X.md:29`、`X.md:47` | `src/ui/webview/graphView.ts:223-224`；`src/ui/webview/graphView.ts:324-336`；`src/ui/webview/graphView.ts:446-453`；`src/ui/webview/graphView.ts:1287-1298`；`src/ui/webview/graphView.ts:1372-1413`；`src/ui/webview/graphView.ts:2091-2094`；`src/services/structuralGraph/structuralGraphService.ts:63-69` |
| V.C4 性能偏好的作用域与权威来源 | 1 | 覆盖 low 默认、low/high 值、machine 范围及 Global 写入；初始化、确认、Settings 更新均以宿主读取值为准，且与图数据/分组/几何状态分开。 | `X.md:33`、`X.md:48`、`X.md:60` | `package.json:325-332`；`src/ui/webview/graphView.ts:150-153`；`src/ui/webview/graphView.ts:300-320`；`src/ui/webview/graphView.ts:1091`；`src/ui/webview/graphView.ts:1140` |
| V.C5 乐观选择、宿主确认与失败回退 | 1 | 完整描述立即应用并禁用选择器、发送请求、主机验证/写入/报错、finally 回传实际值、页面重新启用并可能回退；通过当前组重渲染而非整个 HTML 替换。 | `X.md:33`、`X.md:35` | `src/ui/webview/graphView.ts:309-320`；`src/ui/webview/graphView.ts:1283-1285`；`src/ui/webview/graphView.ts:2077-2083`；`src/ui/webview/graphView.ts:2176-2181`；`src/ui/webview/graphView.test.ts:96-108` |
| V.C6 模式改变渲染工作而非语义 | 1 | 同一节点/关系语义下，low 关闭持续特效并分批 tick 到冷却或有限计算预算，仍支持直接拖动；high 可重启物理并有特效，已 settled 缓存不必持续模拟。 | `X.md:35`、`X.md:37`、`X.md:39`、`X.md:49` | `src/ui/webview/graphPerformanceScript.ts:48-88`；`src/ui/webview/graphPerformanceScript.ts:91-116`；`src/ui/webview/graphView.ts:1552-1578`；`src/ui/webview/graphView.ts:1594`；`src/ui/webview/graphView.ts:1619`；`src/ui/webview/graphView.ts:1931-1959` |
| V.C7 隐藏、替换、卸载的生命周期控制 | 1 | 换组先停止旧循环/布局并保存几何，隐藏暂停布局和粒子、停止模拟、打断过渡并清定时器；可见时恢复适当工作，卸载停止，明确保护旧/新工作所有权。 | `X.md:19`、`X.md:49`、`X.md:50`、`X.md:54` | `src/ui/webview/graphView.ts:1234-1277`；`src/ui/webview/graphView.ts:1479-1493`；`src/ui/webview/graphPerformanceScript.ts:77-87` |
| V.C8 几何缓存的拓扑与文档寿命边界 | 1 | 准确给出 group key + 节点 ID/边端点/verb 签名，文字更新、换组或模式重渲染可复用位置及缩放，拓扑变化 miss；只缓存几何而非旧证据，新文档重新建立缓存。 | `X.md:35`、`X.md:46`、`X.md:48` | `src/ui/webview/graphPerformanceScript.ts:7-42`；`src/ui/webview/graphView.ts:1141`；`src/ui/webview/graphView.ts:1454`；`src/ui/webview/graphView.ts:1556-1578`；`src/ui/webview/graphPerformanceScript.test.ts:105-116` |
| V.C9 回归证据与真实测试边界 | 1 | 分别将宿主设置/失败确认、有限布局或生命周期/拖动、拓扑与回访缓存三类风险连接到具体测试；明确这些是 mocked host、脚本语法与 VM helper 测试，不等于 D3/DOM/VS Code 完整端到端或帧率证明。 | `X.md:60`、`X.md:61`、`X.md:62`、`X.md:66` | `src/ui/webview/graphView.test.ts:18-27`；`src/ui/webview/graphView.test.ts:58-108`；`src/ui/webview/graphPerformanceScript.test.ts:5-38`；`src/ui/webview/graphPerformanceScript.test.ts:49-162` |
| V.S1 未完成几何不能误当已稳定布局 | 1 | 不仅记录 x/y，还解释 settled、alpha、autoFit 的保存及快速换组后续算，避免冻结初始布局；用户缩放/拖动会关闭自动适配。 | `X.md:39`、`X.md:46`、`X.md:62` | `src/ui/webview/graphPerformanceScript.ts:24-33`；`src/ui/webview/graphView.ts:1360-1366`；`src/ui/webview/graphView.ts:1572-1578`；`src/ui/webview/graphView.ts:1933-1957`；`src/ui/webview/graphPerformanceScript.test.ts:133-139` |
| V.S2 缓存准入与容量淘汰 | 1 | 覆盖超大项/非有限节点坐标准入拒绝、分组及累计节点双上限、LRU 淘汰，并将此限额限定为几何缓存而非源图实体上限。 | `X.md:46`、`X.md:62` | `src/ui/webview/graphPerformanceScript.ts:8-39`；`src/ui/webview/graphPerformanceScript.test.ts:119-130` |

主要遗漏：无实质性覆盖遗漏；按非穷尽规则接受跨段落等价说明，不要求重复每个实现常数或空态 UI 细节。

重大错误：无（`major_false_claims: []`）。

### I — instructions

Critical 7.5/8；supplemental 1/1。

| 项目 | 分数 | 理由 | 候选定位 | 核对源码/测试定位 |
| --- | ---: | --- | --- | --- |
| I.C1 公开命令、首工作区写入及返回路径 | 0.5 | 正常命令→EntityCommands→AIIntegrationService、首工作区、方法内部无工作区 guard、writer 返回路径及后续 open/reveal 均正确；但未说明无工作区激活会提前返回并注册 warning 占位命令，因此没有完整解释该情况下实际公开命令不会进入正常服务链路。 | `X.md:72`、`X.md:74`、`X.md:76` | `package.json:86`；`src/extension.ts:48-54`；`src/extension.ts:680-688`；`src/extension.ts:960-995`；`src/ui/commands/entityCommands.ts:23-39`；`src/ui/commands/entityCommands.ts:1255-1283` |
| I.C2 上游收图仍是依赖，writer 却忽略数据 | 1 | 准确区分 UI 的 unified snapshot/逐实体 observations 收集与 writer 未使用 _graphData/no-argument builder；明确无个性化输出不代表没有收图成本，收图抛错会阻止写入。 | `X.md:76`、`X.md:80`、`X.md:85` | `src/ui/commands/entityCommands.ts:43-62`；`src/ui/commands/entityCommands.ts:1262-1267`；`src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-408` |
| I.C3 文件、覆盖及持久化失败契约 | 1 | 说明 .github/copilot-instructions.md、创建目录、UTF-8 同步写及返回路径；现有内容直接替换，无合并/备份/确认/原子回滚，失败可保留目录或部分写入，错误由命令处理。 | `X.md:76`、`X.md:104`、`X.md:106` | `src/services/aiIntegrationService.ts:71-81`；`src/ui/commands/entityCommands.ts:1262-1283` |
| I.C4 固定英文精简 router 的实际分派 | 1 | 明确 Copilot wrapper 固定 en 调用共享 router，区别 UI locale；通过实际分派说明旧图谱/技术栈/场景模板 builder 不在当前调用链，而非仅列出同文件方法。 | `X.md:80`、`X.md:87`、`X.md:88`、`X.md:89` | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:101-120`；`src/services/aiIntegrationService.ts:233`；`src/services/aiIntegrationService.ts:378`；`src/services/aiIntegrationService.ts:404-447`；`src/services/aiIntegrationService.ts:691-711`；`src/services/aiIntegrationService.test.ts:68-98` |
| I.C5 指令路由聚焦访问的内容契约 | 1 | 说明复杂或陌生任务的条件式聚焦 MCP 查询、局部扩展/选择性证据、index + 单个最佳分组回退及源码核验；连接精简导航目的与接入整图/模板会改变当前契约。 未复述可跳过已知文件小任务的每一句，但满足该项明确要求的条件查询、有限回退与源码核验。 | `X.md:80`、`X.md:92`、`X.md:100`、`X.md:116`、`X.md:128` | `src/services/aiIntegrationService.ts:435-442`；`src/services/aiIntegrationService.test.ts:83-97` |
| I.C6 生成指令不等于执行指令 | 1 | 明确写入文字与未来助手行为的边界：不执行 MCP/模型调用或刷新图，引用的工具/文件不会因此被读取验证或生成，成功写文件不保证外部助手消费或遵从。 | `X.md:90`、`X.md:92`、`X.md:126` | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-447`；`src/ui/commands/entityCommands.ts:1255-1283` |
| I.C7 共享 builder 与顺序批量写的变更面 | 1 | 说明 Cursor/Copilot 共享 router 与独立 wrapper 的影响范围，服务与 UI 两条批量入口都 Cursor→Copilot 顺序调用同 writer；第二次失败保留第一次文件且无事务回滚。另核实 locale 比较缺陷，候选并未误称实际自动中文生成。 | `X.md:96`、`X.md:98`、`X.md:110` | `src/services/aiIntegrationService.ts:58-108`；`src/services/aiIntegrationService.ts:404-408`；`src/extension.ts:692-699`；`src/ui/commands/entityCommands.ts:1290-1333`；`src/i18n/i18nService.ts:126-127`；`src/i18n/i18nService.ts:148-149` |
| I.C8 回归证据及局限 | 1 | 将 Copilot 测试的 query/fallback 正向断言与模板/图谱标题负向断言、Cursor 测试的共享风险对应起来；区分临时文件系统服务测试与命令/UI/失败/覆盖/批量/真实 Copilot 交互，明确未传 GraphData、非任意输入忽略哨兵测试。 | `X.md:114`、`X.md:116`、`X.md:118`、`X.md:120`、`X.md:122`、`X.md:123`、`X.md:124`、`X.md:125`、`X.md:126` | `src/services/aiIntegrationService.test.ts:16-47`；`src/services/aiIntegrationService.test.ts:68-119`；`src/services/aiIntegrationService.test.ts:121-163` |
| I.S1 写入成功后的 UI 故障 | 1 | 明确同一个 try/catch 包括写入、通知及 open/reveal，因此后续展示错误可被报成生成失败但文件已落盘；关闭通知不撤销写入。 | `X.md:106` | `src/ui/commands/entityCommands.ts:1262-1283` |

主要遗漏：未追踪无工作区激活时注册占位命令并提前返回的公开入口分支；已准确说明 EntityCommands 方法自身的 guard，这属于遗漏而非错误断言。

重大错误：无（`major_false_claims: []`）。

## 候选 Y

### V — visualization

Critical 9/9；supplemental 2/2。

| 项目 | 分数 | 理由 | 候选定位 | 核对源码/测试定位 |
| --- | ---: | --- | --- | --- |
| V.C1 命令、宿主依赖及页面生命周期 | 1 | 连接命令→createOrShow→注入服务→宿主消息→页面渲染；准确区分单例 reveal 与重建 HTML，说明 ready 回传设置和分组、隐藏保留上下文。 | `Y.md:9`、`Y.md:11`、`Y.md:13` | `package.json:57`；`src/extension.ts:242-243`；`src/extension.ts:643-650`；`src/ui/webview/graphView.ts:128-210`；`src/ui/webview/graphView.ts:263-273` |
| V.C2 独立分组选择与保存状态 | 1 | 准确说明 getGroups 的独立视图、排序、保存键/首组回退及只渲染当前组，并区分 webview 选择状态、页面几何和全局偏好；空列表清理也有说明。 | `Y.md:17`、`Y.md:19`、`Y.md:49`、`Y.md:54` | `src/ui/webview/graphView.ts:457-462`；`src/ui/webview/graphView.ts:1140-1150`；`src/ui/webview/graphView.ts:1372-1398`；`src/ui/webview/graphView.ts:1449-1459`；`src/services/knowledgeGraphService.ts:147-154` |
| V.C3 高级结构视图的按需与临时性 | 1 | 说明按钮携带聚合层级、宿主读取结构数据并返回 structuralGroup、替换临时结构槽并选中；普通数据更新会移除该槽，错误给状态/警告而不是生成永久项目分组。 | `Y.md:21`、`Y.md:30`、`Y.md:57` | `src/ui/webview/graphView.ts:223-224`；`src/ui/webview/graphView.ts:324-336`；`src/ui/webview/graphView.ts:446-453`；`src/ui/webview/graphView.ts:1287-1298`；`src/ui/webview/graphView.ts:1372-1413`；`src/ui/webview/graphView.ts:2091-2094`；`src/services/structuralGraph/structuralGraphService.ts:63-69` |
| V.C4 性能偏好的作用域与权威来源 | 1 | 覆盖 low 默认、low/high 值、machine 范围及 Global 写入；初始化、确认、Settings 更新均以宿主读取值为准，且与图数据/分组/几何状态分开。 | `Y.md:34`、`Y.md:49`、`Y.md:54`、`Y.md:62` | `package.json:325-332`；`src/ui/webview/graphView.ts:150-153`；`src/ui/webview/graphView.ts:300-320`；`src/ui/webview/graphView.ts:1091`；`src/ui/webview/graphView.ts:1140` |
| V.C5 乐观选择、宿主确认与失败回退 | 1 | 完整描述立即应用并禁用选择器、发送请求、主机验证/写入/报错、finally 回传实际值、页面重新启用并可能回退；通过当前组重渲染而非整个 HTML 替换。 | `Y.md:34` | `src/ui/webview/graphView.ts:309-320`；`src/ui/webview/graphView.ts:1283-1285`；`src/ui/webview/graphView.ts:2077-2083`；`src/ui/webview/graphView.ts:2176-2181`；`src/ui/webview/graphView.test.ts:96-108` |
| V.C6 模式改变渲染工作而非语义 | 1 | 同一节点/关系语义下，low 关闭持续特效并分批 tick 到冷却或有限计算预算，仍支持直接拖动；high 可重启物理并有特效，已 settled 缓存不必持续模拟。 | `Y.md:36`、`Y.md:38`、`Y.md:39`、`Y.md:40` | `src/ui/webview/graphPerformanceScript.ts:48-88`；`src/ui/webview/graphPerformanceScript.ts:91-116`；`src/ui/webview/graphView.ts:1552-1578`；`src/ui/webview/graphView.ts:1594`；`src/ui/webview/graphView.ts:1619`；`src/ui/webview/graphView.ts:1931-1959` |
| V.C7 隐藏、替换、卸载的生命周期控制 | 1 | 换组先停止旧循环/布局并保存几何，隐藏暂停布局和粒子、停止模拟、打断过渡并清定时器；可见时恢复适当工作，卸载停止，明确保护旧/新工作所有权。 | `Y.md:46`、`Y.md:50`、`Y.md:55` | `src/ui/webview/graphView.ts:1234-1277`；`src/ui/webview/graphView.ts:1479-1493`；`src/ui/webview/graphPerformanceScript.ts:77-87` |
| V.C8 几何缓存的拓扑与文档寿命边界 | 1 | 准确给出 group key + 节点 ID/边端点/verb 签名，文字更新、换组或模式重渲染可复用位置及缩放，拓扑变化 miss；只缓存几何而非旧证据，新文档重新建立缓存。 | `Y.md:46`、`Y.md:47`、`Y.md:48`、`Y.md:49`、`Y.md:54` | `src/ui/webview/graphPerformanceScript.ts:7-42`；`src/ui/webview/graphView.ts:1141`；`src/ui/webview/graphView.ts:1454`；`src/ui/webview/graphView.ts:1556-1578`；`src/ui/webview/graphPerformanceScript.test.ts:105-116` |
| V.C9 回归证据与真实测试边界 | 1 | 分别将宿主设置/失败确认、有限布局或生命周期/拖动、拓扑与回访缓存三类风险连接到具体测试；明确这些是 mocked host、脚本语法与 VM helper 测试，不等于 D3/DOM/VS Code 完整端到端或帧率证明。 | `Y.md:62`、`Y.md:63`、`Y.md:64`、`Y.md:68` | `src/ui/webview/graphView.test.ts:18-27`；`src/ui/webview/graphView.test.ts:58-108`；`src/ui/webview/graphPerformanceScript.test.ts:5-38`；`src/ui/webview/graphPerformanceScript.test.ts:49-162` |
| V.S1 未完成几何不能误当已稳定布局 | 1 | 不仅记录 x/y，还解释 settled、alpha、autoFit 的保存及快速换组后续算，避免冻结初始布局；用户缩放/拖动会关闭自动适配。 | `Y.md:40`、`Y.md:46`、`Y.md:54`、`Y.md:64` | `src/ui/webview/graphPerformanceScript.ts:24-33`；`src/ui/webview/graphView.ts:1360-1366`；`src/ui/webview/graphView.ts:1572-1578`；`src/ui/webview/graphView.ts:1933-1957`；`src/ui/webview/graphPerformanceScript.test.ts:133-139` |
| V.S2 缓存准入与容量淘汰 | 1 | 覆盖超大项/非有限节点坐标准入拒绝、分组及累计节点双上限、LRU 淘汰，并将此限额限定为几何缓存而非源图实体上限。 | `Y.md:47`、`Y.md:64` | `src/ui/webview/graphPerformanceScript.ts:8-39`；`src/ui/webview/graphPerformanceScript.test.ts:119-130` |

主要遗漏：无实质性覆盖遗漏；按非穷尽规则接受跨段落等价说明，不要求重复每个实现常数或空态 UI 细节。

重大错误：无（`major_false_claims: []`）。

### I — instructions

Critical 7.5/8；supplemental 1/1。

| 项目 | 分数 | 理由 | 候选定位 | 核对源码/测试定位 |
| --- | ---: | --- | --- | --- |
| I.C1 公开命令、首工作区写入及返回路径 | 0.5 | 正常命令→EntityCommands→AIIntegrationService、首工作区、方法内部无工作区 guard、writer 返回路径及后续 open/reveal 均正确；但未说明无工作区激活会提前返回并注册 warning 占位命令，因此没有完整解释该情况下实际公开命令不会进入正常服务链路。 | `Y.md:74`、`Y.md:76`、`Y.md:78`、`Y.md:80` | `package.json:86`；`src/extension.ts:48-54`；`src/extension.ts:680-688`；`src/extension.ts:960-995`；`src/ui/commands/entityCommands.ts:23-39`；`src/ui/commands/entityCommands.ts:1255-1283` |
| I.C2 上游收图仍是依赖，writer 却忽略数据 | 1 | 准确区分 UI 的 unified snapshot/逐实体 observations 收集与 writer 未使用 _graphData/no-argument builder；明确无个性化输出不代表没有收图成本，收图抛错会阻止写入。 | `Y.md:76`、`Y.md:87`、`Y.md:92` | `src/ui/commands/entityCommands.ts:43-62`；`src/ui/commands/entityCommands.ts:1262-1267`；`src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-408` |
| I.C3 文件、覆盖及持久化失败契约 | 1 | 说明 .github/copilot-instructions.md、创建目录、UTF-8 同步写及返回路径；现有内容直接替换，无合并/备份/确认/原子回滚，失败可保留目录或部分写入，错误由命令处理。 | `Y.md:78`、`Y.md:106`、`Y.md:108` | `src/services/aiIntegrationService.ts:71-81`；`src/ui/commands/entityCommands.ts:1262-1283` |
| I.C4 固定英文精简 router 的实际分派 | 1 | 明确 Copilot wrapper 固定 en 调用共享 router，区别 UI locale；通过实际分派说明旧图谱/技术栈/场景模板 builder 不在当前调用链，而非仅列出同文件方法。 | `Y.md:78`、`Y.md:89`、`Y.md:90`、`Y.md:92` | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:101-120`；`src/services/aiIntegrationService.ts:233`；`src/services/aiIntegrationService.ts:378`；`src/services/aiIntegrationService.ts:404-447`；`src/services/aiIntegrationService.ts:691-711`；`src/services/aiIntegrationService.test.ts:68-98` |
| I.C5 指令路由聚焦访问的内容契约 | 1 | 说明复杂或陌生任务的条件式聚焦 MCP 查询、局部扩展/选择性证据、index + 单个最佳分组回退及源码核验；连接精简导航目的与接入整图/模板会改变当前契约。 | `Y.md:100`、`Y.md:118` | `src/services/aiIntegrationService.ts:435-442`；`src/services/aiIntegrationService.test.ts:83-97` |
| I.C6 生成指令不等于执行指令 | 1 | 明确写入文字与未来助手行为的边界：不执行 MCP/模型调用或刷新图，引用的工具/文件不会因此被读取验证或生成，成功写文件不保证外部助手消费或遵从。 | `Y.md:78`、`Y.md:102` | `src/services/aiIntegrationService.ts:71-81`；`src/services/aiIntegrationService.ts:404-447`；`src/ui/commands/entityCommands.ts:1255-1283` |
| I.C7 共享 builder 与顺序批量写的变更面 | 1 | 说明 Cursor/Copilot 共享 router 与独立 wrapper 的影响范围，服务与 UI 两条批量入口都 Cursor→Copilot 顺序调用同 writer；第二次失败保留第一次文件且无事务回滚。另核实 locale 比较缺陷，候选并未误称实际自动中文生成。 | `Y.md:89`、`Y.md:92`、`Y.md:96`、`Y.md:110` | `src/services/aiIntegrationService.ts:58-108`；`src/services/aiIntegrationService.ts:404-408`；`src/extension.ts:692-699`；`src/ui/commands/entityCommands.ts:1290-1333`；`src/i18n/i18nService.ts:126-127`；`src/i18n/i18nService.ts:148-149` |
| I.C8 回归证据及局限 | 1 | 将 Copilot 测试的 query/fallback 正向断言与模板/图谱标题负向断言、Cursor 测试的共享风险对应起来；区分临时文件系统服务测试与命令/UI/失败/覆盖/批量/真实 Copilot 交互，明确未传 GraphData、非任意输入忽略哨兵测试。 | `Y.md:114`、`Y.md:115`、`Y.md:116`、`Y.md:118`、`Y.md:122` | `src/services/aiIntegrationService.test.ts:16-47`；`src/services/aiIntegrationService.test.ts:68-119`；`src/services/aiIntegrationService.test.ts:121-163` |
| I.S1 写入成功后的 UI 故障 | 1 | 明确同一个 try/catch 包括写入、通知及 open/reveal，因此后续展示错误可被报成生成失败但文件已落盘；关闭通知不撤销写入。 | `Y.md:80`、`Y.md:108` | `src/ui/commands/entityCommands.ts:1262-1283` |

主要遗漏：未追踪无工作区激活时注册占位命令并提前返回的公开入口分支；已准确说明 EntityCommands 方法自身的 guard，这属于遗漏而非错误断言。

重大错误：无（`major_false_claims: []`）。

非重大措辞问题：Y.md:106 的 “A directory at `.github` … can reject” 过宽；普通可写的 `.github` 目录合法，实际风险取决于路径冲突或权限/I/O（`src/services/aiIntegrationService.ts:72-80`）。其核心覆盖与非事务说明仍正确，未据此扣分或计为重大错误。

## Rubric concerns（不混入成绩）

I.C7 的 “locale-aware” 括注不准确，notes 已指出：`getLocale()` 返回 `zh-CN/en-US`，Cursor wrapper 却比较 `zh`（`src/services/aiIntegrationService.ts:101-107`、`src/i18n/i18nService.ts:126-127`、`:148-149`）。两份候选均正确识别该事实，因此按共享 builder 和顺序写入契约给分，不要求复述不准确括注。

