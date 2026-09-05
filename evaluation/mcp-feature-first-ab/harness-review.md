# Feature-first MCP A/B：预运行协议与测量审查

审查日期：2026-09-05。包括初次审查和候选启动前的修订复查；下列初版问题保留作审计轨迹，当前关闭状态见“修订复查”。

## 范围与结论

已读本目录 `protocol.md`、`tasks.md`、`observe.cjs`、`mcp-client.mjs`、`collect.cjs`、`summarize.cjs`、`blind.mjs`，以及随后创建的 `prepare.mjs` 和隐藏 rubric。公共计量辅助脚本包括 `evaluation/query-skill/context/{session-accounting,measure-public-outputs,audit-observation-delivery}.cjs`、`evaluation/query-skill/routing/audit-public-calls.cjs` 及其合成测试源码。只用 `evaluation/mcp-ab/protocol.md` 对照旧门槛，未读旧候选答案、旧分数或本轮候选答案。另只读了当前 MCP 注册代码与已安装 SDK 的握手/工具列表实现，以核对真实协议路径。

没有运行候选任务、修改产品、启动子代理或运行产品测试。做了四个 harness 文件的 `node --check` 和一个不落盘的合成数值复现；本审查只新增本文件。

任务、source-only 对照和 warm-reuse 目标总体清楚，旧门槛的百分比没有被降低。初版有四组会影响结论的验收缺口；经复查，主代理已在候选启动前于代码层关闭。可以在完成最终 preflight 冻结后执行，但不能把本次静态审查当作六次候选运行、独立公共调用审计或盲评分已经通过。保留已有 freeze 与修订轨迹，不要在看到答案后改规则。

## 修订复查

已完整重读修订后的 `collect.cjs`、`summarize.cjs`、`blind.mjs`、新 `audit.cjs` 和新增的 `accounting.test.cjs`。四个主要脚本均再次通过 `node --check`。合成测试文件已读；本审查未重跑其会创建临时文件的测试，主代理另行执行的测试结果不冒充本审查执行证据。

- 问题 1 已在代码层关闭：summary 强制 delivery `passed===true`、逐臂无 unmatched 且匹配数一致，并要求六个正确 pair/arm/session/agent 的独立 `scope-audit.json` adjudications 全部通过。新 audit 增加具体 shell/rg 路径、禁止文件、MCP allowlist、文件新增及命令/观测重数检查。实际运行后仍须独立人工审查所有公开命令；`compliance-audit.json` 的自动结果不能冒充另一个人工 adjudication 文件。
- 问题 2 已关闭：collector 强制四个必需 token 字段为安全非负整数、cache≤input、total=input+output；summary 再检查 numeric 字段和派生等式，缺字段→NaN→null→零成本的路径已被拒绝。新增合成回归覆盖缺失/空/字符串/负值/错误总计。零分母的描述性 saved fraction 仍可变为非有限值并被 JSON 写成 null；真实结果若出现此情况应写“不可定义”，不能当作百分比优势。
- 问题 3 的实质内容删除已关闭：blind 不再删除 prologue 或 `分析范围` 行，只替换工作目录及显式 Arm 标签，且不再声称实施不存在的内容审查。残留方法线索作为盲化限制披露。仍须在 grader 访问前保留 hash，并确认路径/标签替换没有误触实现事实。
- 问题 4 的结构完整性已关闭：mapping 必须是 X/Y 双射；summary 验证全部 20 个唯一 item ID、0/0.5/1 分值、critical/supplemental 求和和 major-false-claims 数组长度。它不自动判断理由和引文是否有证据，这仍是 grader 与独立复核职责。

复查版本 SHA-256：

- `collect.cjs`: `9477AA3C0E53F9961166CBCDCF6551D045899833D46F3D62C7EADBF7A0AF268E`
- `summarize.cjs`: `C6FBB05DF42B0AC18B2D63AA804557E0E31C5ED2DA5E8C191C171B1E120C76DA`
- `blind.mjs`: `C311A8E285DFEAE8F1C1FEC46071298BAE4ED15D4E94AF3EFF4162C2B4CBD98D`
- `audit.cjs`: `9886E052C8B15927F3728AC77362893476F70A207B9591CC7901193159A24DC5`

新 audit 还有一处旧试验描述需要准确化：`provenance()` 硬编码“after pair 1 started”，与主代理确认的本轮尚未启动不符；应记录真实采集阶段并引用本轮 preflight。该文字问题不推翻新增检查，但不能原样用于描述本轮时间线。最终预运行 helper/依赖冻结、实际完整 discovery、运行后身份/哈希核验以及人工 scope/grade 核验仍按下节执行。

## 初版阻塞性问题及最小关闭条件（保留历史）

### 1. 审计失败没有阻止门槛通过

`summarize.cjs:24` 检查 delivery audit 的版本与会话身份，但 `:45`、`:46` 的两个 gate 没有要求审计成功；`:55` 仅把 `deliveryAuditsPassed` 当作旁注保存。因而存在 `gates.efficiency=true` 同时 `deliveryAuditsPassed=false` 的合法代码路径。汇总也尚未加载公共调用范围审计。

最小修订：对每对/每臂强制交付审计通过、unmatched observations 为空，并把与正确 run/session 绑定的范围审计或明确的人工审计结论作为汇总前置条件。失败应形成保留的无效/偏离记录，不得自动重跑以取得更好答案。

范围审计不能只信现有 helper 的 `passed`。`audit-public-calls.cjs:29` 是 observer 命令前缀和工作目录检查，不是 shell/rg 参数解析；`observe.cjs` 的 `rg` 分支直接转发参数，不能阻止 `..`、绝对路径、`--pre` 等越界或执行选项。helper 自己也要求人工复核。必须复核全部公共命令、observer 参数和 REPORT patch 目标，包括 helper 声称自动通过的命令；不要求把 observer 改成安全沙箱。

### 2. 缺失 token 字段能被当成零成本

`collect.cjs:30` 用 `Object.values(...)` 验证存在的数值，却未要求计量必需字段存在。假如 `totals` 有 `input_tokens=100`、`output_tokens=10`、`total_tokens=110`，但没有 `cached_input_tokens`，现有谓词仍接受；随后 `uncachedInputPlusOutput` 为 `NaN`，JSON 保存为 `null`。`summarize.cjs` 未验证这些成本字段，JavaScript 会在除法中把 `null` 当作零，可能得到 100% 节省并通过门槛。

纯内存合成复现结果：`acceptedByCurrentNumericPredicate=true`，`archivedDerived.uncachedInputPlusOutput=null`，相对另一臂成本 50 的表面节省率为 1。此结果不来自任何候选 telemetry。

最小修订：collector 对每条 usage 和最终 totals 显式要求 `input_tokens`、`cached_input_tokens`、`output_tokens`、`total_tokens` 为有限非负整数，检查 cache 不大于 input，继续核对逐 response 求和，并验证派生成本有限非负。summary 对进入中位数/门槛的数值再次 fail closed，特别是不接受缺失值、`null` 或字符串；对比基数为零时不得输出伪造的百分比。建议加入上述合成回归测试。

### 3. 盲化记录宣称做了尚不存在的内容检查

`blind.mjs:19` 会删除首个 `## 1` 前的全部文字；`:30` 却声称已检查这些文字不包含实质答案。脚本并没有执行该检查。`分析范围：` 行和 `Arm A/B` 的全局替换也可能作用于任务正文。公共任务已禁止 method prologue，因此不需要默认进行广泛删除来确保正常答案可评分。

最小修订：只自动接受严格限定的标题/空白/路径或方法标记变换，拒绝或显式人工审查任何额外删除；保留原文/盲化 hash 和确切变更记录。任务正文有实质变化时不能声称原封不动。人工确认必须在 grader 访问前完成并存档；`--reblind` 必须保持原映射、记录理由且不得在评分后挑选更有利版本。不能把“检查过”写成未经执行的默认描述。

### 4. Mapping 与逐项评分尚未成为可靠的验收输入

`summarize.cjs:11` 直接用 mapping 索引 totals，未检查 A/B→X/Y 是双射；例如 A 和 B 都指向 X 时代码仍可运行，掩盖另一份报告的质量损失。`:26` 只检查 totals 的部分字段，没有核对 rubric 要求的逐项 0/0.5/1、总和、任务 maxima 和独立 major-false-claim 数组。

最小修订：要求 mapping 恰好对应两个不同匿名候选；在 summary 或独立评分审计中逐项检查 17 个 critical、3 个 supplemental、分值范围/步长、逐任务和总计一致，以及重大错误条目数与 totals 一致。保留每项理由与 report/source 证据供独立审查。若由人工核对替代脚本，应保存明确的核验结论，不能只有 grader 自报的 totals。

## 冻结与执行前仍需完成的核验

- `prepare.mjs` 现已记录 runtime source、dist/manifest、node_modules、Node/rg 和本目录 harness 哈希，这是有用的基线。`collect.cjs:15` 实际只重验 runtimeHashes 中的 dist/manifest；尚不能由该脚本证明依赖、Node/rg、source 或所有 harness 在试验结束时仍相同。执行前和最后一次运行后需要独立复验，并存档结果。
- `prepare.mjs:70` 的 harness 哈希列表未包含公共计量/交付/范围 helper 或 tokenizer 环境。应把实际调用的这些脚本和 tokenizer 版本纳入最后的 preflight 记录；计量期间不要静默变更依赖或解释规则。
- `verify`/`mismatch` 检查列举文件的哈希，不检测新增文件。复制前应确认 source/artifact 目录的完整文件清单与预期一致；每臂运行后检查只多出准许的 REPORT、观测日志或已声明运行产物。相同列举文件的哈希不等于完整目录身份。
- 保存每次实际 dispatch 文本、arm 路径、fresh/no-inherited-history 的启动参数、先后顺序与会话身份。`assertFreshComplete` 验证的是单一匹配 start/complete 和未 abort，不单独证明无继承对话、未暴露 rubric 或实际 dispatch 相同。审查时尚未以候选产物核验这些事项。
- 一次成功的 `mcp-list` 不是完整 discovery 的充分条件。`collect.cjs:51` 只检查 exit 0；应验证返回的工具列表包含三个 feature-first 工具，并且未被 18,000 字符或外层预算截断。若截断，必须保留偏离及实际交付成本，不能宣称完整工具定义已送达。

## 已确认合理的设计与计量边界

### 公平性与门槛

两臂的公共任务、执行顺序、source access、observer cap、禁止改源/测试/网络等要求相同，B 额外获得预先生成的图与 briefs 是预定 treatment，而非源代码权利不平等。两臂应收到完整共同任务加自己的 arm 指令，不能把另一臂指令或 rubric 一并传入。B 的详细 feature-first 使用指导本身也是 treatment，结论应表述为“这些 artifacts + MCP endpoints + 指导方法”的组合效果，不能归因于 MCP transport 单一因素。

现有 summary 的百分比与旧协议一致：observer 和 delivered public text 各至少节省 15%，uncached input+output 至少节省 10%；质量门槛为 missed-critical 总量至少下降 20%、至少两对严格改善、无额外重大错误、成本中位数增加不超过 25%。它使用两臂各自中位数，不是配对节省率中位数；应沿用并明确报告，勿临时挑选有利算法。

“每对无 critical coverage loss”在当前代码中指 critical 总分不降，不保证每个 critical item 都不降，也不保证两个任务各自都不降。0.5 分意味着 missed-critical 是加权缺失分，而非整数事实个数。应保留逐项/逐任务评分以披露抵消现象，不宜事后改变老门槛含义。

### MCP 调用确实经过真实协议

`mcp-client.mjs` 用 SDK `Client` 和 `StdioClientTransport` 启动真实 `dist/index.js`；安装的 SDK `client/index.js:278` 的 connect 执行 `initialize`，验证协议版本，再发 `notifications/initialized`。随后调用 `tools/list`、`tools/call` 或 `resources/read`，最后关闭连接。当前 `McpServer` 的列表实现返回全部 enabled 注册工具，不存在本实现尚未遍历的分页。这不是绕过协议直接调用 handler 的 mock。

产品 feature-first handler 会复用 `runQuery`，但调用路径仍经过 MCP 协议；应该同时披露“真实 MCP transport”与“共用原 Skill/query engine”，二者不矛盾。桥接只把 text content 交给候选，不输出握手/JSON-RPC envelope，也不完整暴露非 text 或 structuredContent；当前所测端点是 text，但不能外推成完整多模态/任意 MCP 客户端行为。

### 成本没有重复相加，但不是原生或 all-in 成本

observer 把每次成功、失败、重复、discovery、resource 的最终 capped 文本记入日志；public-output helper 独立统计两种公开工具返回格式，包含外层包装和真实外层截断。两者是同一交互的不同测量，不能相加。delivery helper 消耗每个匹配片段，避免两个相同 observations 复用一次交付；但它是重数感知子串匹配，不是 call-id 因果绑定，也不独立排除未观察的额外输出。范围审计和完整 public-text 统计需与之配合。

数值 telemetry 在完整性校验修正后，可涵盖任务提示、工具调用参数、公开输出、最终回答等真实模型用量；它无需导出私密推理/系统文本。`observedTextTokens` 本来只统计工具返回文本，不能据此宣称所有 agent token 成本都已计入。`o200k_base` 是可复现文本度量，不是 provider 的账单 tokenizer；uncached 指标又受缓存状态影响，必须同时报告 cached input、总 input/output 与实际 model/effort。

每次 MCP 调用新建 server process，只有一次 discovery 文本交给模型。未交给模型的协议握手/内部日志不是本轮任务上下文 token，不能要求把它们虚构为 consumed model context；但这也不衡量 native host 自动 schema 注入、缓存、持久连接延迟或后台进程费用。bridge/wrapper 公开文本与模型用量已在定义内，启动时间只应作描述性指标。

`collect.cjs` 的 phase 统计保存 reads 数组和 MCP query 数，原始日志也保留所有 rg calls，但 summary 没有显式展示每任务 rg 搜索次数、失败次数、重复次数和 discovery/resource 次数。最终应从原始公开日志补足这些表述。两任务共用一次 agent turn，不能把全会话 telemetry 凭空拆成独立的 per-task 模型 token 成本。

## 最终结果必须披露的限制

- 只有三对 fresh 重复、两个已公布任务、一个选取的 source snapshot；不是六个独立任务，不是新 held-out 仓库，没有统计显著性或普遍优越性结论。每对近同时执行会竞争硬件资源；固定交替派发可减少单侧先后偏差，但不是随机化系统性能实验。
- 本轮复用了此前针对这些 feature 的独立 briefs 和准备后的图。候选可以是新的，任务/制品/开发者知识不是新的。不得借 rubric 文件名中的 “held-out” 暗示这是本轮新设盲测，也不能排除产品开发对已知任务的适配。
- 没有新的 known-file negative control、真实 code-change task 或同步 Skill arm。即便本轮优于 source-only，也不能推出 MCP 对任意小任务有益、能安全实施修改，或 transport 比 Skill 更省；旧试验百分比不能做因果差值。
- 历史两份 brief 生成的 90,480 uncached-input-plus-output 是共享一次性准备成本，不应按每个候选重复加算，也不能视为零。提取、人工整理、安装、刷新以及本轮 setup/grading 是另外的成本；没有数据的项目应注明未测，不宣称 all-in 净节省或盈亏平衡已成立。
- 随机 X/Y 标签和独立 fresh grader 只能降低显式臂标签/既往评分影响。报告措辞、来源引用、fact IDs、长度可能暴露方法；不能保证 grader 完全猜不出 arm。每对一个 grader 没有 inter-rater reliability，pair 差异还混入 grader 变异。固定 notes 修正已知 rubric 歧义是可接受的，但不得看答案后改 notes。
- rubric 有限且非穷尽；高覆盖不等于没有其他重大错误。候选允许不运行测试，所以答案只评价对既有测试和行为边界的解释，不能声称实际端到端行为、帧率或代码修改安全已验证。
- aborted/基础设施失败要单独保留时间、原因和可用数值用量，不与完整 run 叠加后伪装成一个成功候选，也不能从整体执行记录消失。只保留“成功三对”而不报告发生的中断会低估实际试验成本。

最终结果放行要求：四组代码验收问题按复查版本保持关闭，预运行修订与完整依赖/公共 helper 冻结可追溯，实际三对运行的 source/arm/会话/交付/范围/评分核验全部完成。此报告没有对任何候选质量或节省率作判断。
