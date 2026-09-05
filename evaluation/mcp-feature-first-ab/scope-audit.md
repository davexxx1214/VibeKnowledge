# 独立最终范围与方法审计

审计时间：2026-09-04 17:11:40 UTC（香港时间 2026-09-05 01:11:40）。

结论：`passed: false`。六次候选的公开执行范围检查均通过，但本轮不能无保留地声明满足预注册方法，不能据此放行原 efficiency/quality 门槛。原因不是候选越界读文件，而是六份实际执行所依据的预写/主代理确认派发均包含另一臂方法说明，未满足预注册的本臂信息限制。

机器可读裁定见 `scope-audit.json`。其中 `operationalScopePassed: true` 与整体 `passed: false` 是有意区分，不应只摘取前者宣称整个审计通过。所有原始试验仍应保留，可作附带清楚偏离声明的描述性报告；不建议重跑候选、修改协议、覆盖冻结记录或移除汇总的审计门槛。

## 审计范围与证据处理

独立核对了协议、公共任务、六份预写 dispatch、公开实际 dispatch 元数据、session mapping、冻结/preflight/post-run integrity、自动审计与各 pair 的交付审计。根据 mapping 定位六份 session，仅提取公开工具调用/输出和必要会话身份、model/effort、start/complete 元数据。没有读取 REPORT 文件、候选最终回答、grades、performance metrics 正文，也没有检查私有推理或系统消息。

新增的 `scope-inspect.cjs` 是只读审计辅助程序：静态解析公开调用，隐藏所有报告/源代码正文，只输出调用结构、元数据与哈希核验结果。未执行 session 中的 JavaScript，未运行候选任务或产品源码。报告 patch 仅检查构造方式与目标，不评价或展示其内容。公共输出仅用于交付匹配和 discovery schema 核对。

本次重新检查了 224 个冻结源文件/臂、B 制品、observer/bridge、MCP dist 与 source、5,739 个依赖文件及其文件清单、Node/rg、tokenizer executable/module、最终 preflight harness/helper 和预写 dispatch 哈希，均与记录一致。未改变自动审计、冻结产物或产品。

## 阻止整体放行的派发方法偏离：D1

`protocol.md` 规定每次派发包含共同任务及 “only its arm and isolated workspace”。审前 `harness-review.md` 进一步明确，不应把另一臂指令一并传入。

然而 `dispatches.json` 六条记录均满足以下事实：

- 前缀正确指定自己的 A/B 标签和唯一工作区。
- 后面原样追加完整 `tasks.md`，含 `Arm A: use source inspection only` 和完整 `Arm B: start by reading mcp-list` 两段。
- 每条预写明文的 SHA-256 与 `public-dispatch.json` 对应的 `preparedPlaintextSha256` 一致；整个 dispatches 文件也与冻结哈希一致。

`finalize-freeze.mjs` 的代码亦直接追加整个 tasks 文本。主代理在此次独立审计中明确确认，实际执行方案就是向每个候选发送完整 tasks.md，再用前缀指定本臂，而非只发送本臂说明。

裁定：这是明确的预注册方法偏离，不把它认定成候选越界访问另一臂资料。双方都看见同一套条件说明，且实际 A 没有使用 MCP，因此主要执行分组仍然保留；但不能据此把先前的信息限制事后解释为已经满足。这里测量的就是上下文/模型成本，另一臂方法说明增加的输入文本及可能的行为影响是实验条件的一部分；不能在不改变反事实试验的情况下证明影响为零，也不应依据最终结果是否好看来宽免。本审计未查看那些结果。

因此六项 `sessions[].passed` 均为 false，阻止无保留的预注册门槛发布。并非判定六名候选进行了违规 shell 操作。

## 自动审计待审事项的独立裁定

### 实际任务正文不可解密对齐：L1

六次 actual dispatch 的消息都以 opaque payload 留存；公开记录自身标记 `plaintextIndependentlyMatched: false`。opaque payload hash 与准备好的 plaintext hash 是不同对象的哈希，不能互相证明明文一致或实际送达。

自动审计的六个 task-body-match review 因而不能被解释为“已经证明发了错误任务”，也不能伪装为已独立通过 exact match。此项关闭为必须披露的可验证性限制：能检查预写明文、时间、任务名、fork none 和无 model/effort override；正文只能依赖预写记录与发送者声明。本限制本身不是另一个判失败理由；D1 根据可见的预写正文与主代理明确确认独立成立。

### Pair 1 A 的非字面 patch：R1 已关闭

公开调用 `call_64mzcGPjlxFiKihwk9G20VLq`，输入 SHA-256 为 `0052a90e3b5262881df615ae6ffde69d3ac2dfa893dca0c7ca125641c9e4cd01`。

静态结构为固定本臂 `root`，内存中的 `String.raw` 报告文字，引用链接格式化的 replace，再将每个报告行加上 `+`，拼接固定 `*** Add File:` 头和 `/REPORT.md` 尾路径，调用 apply_patch。所有内容行都以 `+` 开头，不会形成额外 patch 目标；没有额外源文件读取、执行、联网或 observer 输出过滤。无需展示/阅读报告内容即可确认其唯一目标是 `pair-1/A/REPORT.md`。其余五次都是字面 patch，仅添加各自 REPORT。

## 公开执行范围：六次均通过

| Pair/臂 | read | rg | MCP discovery | MCP calls | 完整交付/观测 | 源/制品变更 |
|---|---:|---:|---:|---:|---:|---:|
| 1 A | 39 | 10 | 0 | 0 | 49/49 | 0 |
| 1 B | 27 | 7 | 1 | 4 | 39/39 | 0 |
| 2 A | 29 | 10 | 0 | 0 | 39/39 | 0 |
| 2 B | 32 | 7 | 1 | 4 | 44/44 | 0 |
| 3 A | 35 | 10 | 0 | 0 | 45/45 | 0 |
| 3 B | 26 | 6 | 1 | 4 | 37/37 | 0 |

253 条公开 observer 命令的 phase/operation/args 与原始 observations 的重数完全一致，公开返回中找到了全部 253 个完整 displayed 片段，且没有外层 truncation marker。Pair 3 A 的第 4 号（零起算）observer 本身触及预定 18,000 字符 cap；包含 cap marker 的最终文本完整交付，属于规定内截断，应保留而非剔除。

逐一核对所有 read、rg 路径/flags、MCP 参数及公开调用脚本结构后：

- 所有 shell 调用都是各自 workdir 下的 `node observe.cjs --phase ...`；没有其他 shell 命令、pipe、动态 shell、外部目录或网络工具。
- 所读均为分配 snapshot 内 source/tests/package 等；未直接读取 Skill instructions、brief、生成 graph、父评测文件、另一工作区或候选报告。`rg --files` 的文件名发现不等于读取这些文件的内容。对 `resources/skills/.../scripts` 的搜索受 test/spec 等文件模式限定，属于源码测试搜索，不是读取 SKILL.md。
- 没有测试/build/安装/源码执行、源码 patch、配置写入、外部 MCP 或子代理调用。公开调用只使用 exec_command 和 apply_patch，普通 observer 输出直接交付，未作外部过滤。
- 三次 B 均在 visualization 阶段首先做 mcp-list，然后按每项任务执行 find_features → get_feature_brief，之后读源。每次真实 discovery 都是合法 JSON、13 个工具、10507 字符（去尾换行后），包含三个新 endpoint，与 preflight 列表完全相同，没有 discovery 截断。
- 六臂没有额外文件、symlink、冻结输入 hash mismatch，报告 patch 均限定自己的 REPORT.md。A 未启用/调用 MCP，B 通过冻结 bridge 使用 RAG-disabled runtime。

## Freshness、顺序和冻结

六个 session ID 和 agentPath 都与 mapping 一致，model/effort 同为 `gpt-5.6-sol` / `xhigh`，每个只有一组匹配 task start/complete，未见 abort、forked-from ID 或在任务开始前继承的公开 assistant/tool 历史。公开 dispatch 元数据记录全部 `forkTurns: none`，无 model/effort override。此结论不靠查看私有/系统上下文。

UTC 执行顺序：

- 预写 dispatch：16:45:48.668；最终 preflight：16:46:25.992；均早于第一个 candidate start 16:46:49.116。
- Pair 1 按 A/B 派发；两臂完成至 16:53:01.444，之后 Pair 2 才开始派发。
- Pair 2 按 B/A 派发；两臂完成至 16:59:13.742，之后 Pair 3 才开始派发。
- Pair 3 按 A/B 派发；最终完成于 17:05:32.713。

三对内部 start 间隔约 21.8、21.4、24.2 秒，配对之间串行。冻结初版与 preflight 修订均保留；本次使用明确声明优先级的最终 preflight harness/helper 哈希核验，没有把更早被修订的 harness 哈希当作当前版本。独立重验与 `post-run-integrity.json` 所报一致。

## 可验证性边界

- 本审计不是质量评分、token 节省率复算，也不判断任何候选答案正确性。
- 实际派发 payload 无法独立解密对齐；发送者声明不等于 cryptographic delivery proof。未见历史 fork 不等于查验了私有/system context。
- 交付检查是重数感知的完整片段匹配，不是 call-ID 层面的因果绑定。
- before/after hash 与公开命令不能排除被恢复的瞬时修改、平台内部不可见动作或未记录活动；这里不是安全沙箱或 network-syscall 监测。
- 只审计 mapping 中六个完成 session，不以此证明不存在任何未披露的其他运行；中断/基础设施成本仍由独立执行记录披露。
- 只读辅助脚本是在运行完成后新增的审计程序，不冒称为预运行 instrumentation。关键证据和脚本 SHA-256 已写入 scope-audit.json，便于复核。
