# Ranked feature routing: Yuxi frontend A/B

**Status: archived / implementation rolled back.** The experimental ranking,
filtering and incremental-expansion code was reverted at the user’s request.
This report and frozen hashes describe that historical candidate, not the current
Skill or MCP. Raw measurements are unchanged. Current MCP work reuses the original
0.5.0 Skill features/brief/context method; no new complete-task benefit is claimed.

Completed 2026-09-05 (Asia/Hong_Kong). Neither predefined gate passed.
The candidate successfully located the feature, but this trial does not establish
a reliable token-efficiency or accuracy improvement.

## What was compared

Three fresh, independent matched pairs completed the same sequential task:
locate a page from its behavior, answer a follow-up on that feature, then answer
a small known-file control. This is three repetitions of one three-stage task,
not three unrelated tasks or repositories. All six candidates used
`gpt-5.6-sol`, `xhigh`, without inherited task history.

- A: targeted source inspection only.
- B: the same source plus the portable query Skill and five reusable page briefs.
- Source: [zenghui-li/yuxi](https://github.com/zenghui-li/yuxi), commit
  `2c8ff10dc6bca1da07c0d64f451ee7c1cf177476`; 230 frontend text files,
  including 12 views. Backend, dependencies and binary assets omitted equally.
- An independent author wrote the five briefs from source without seeing tasks,
  rubric or expected savings. A different designer wrote the tasks/rubric without
  seeing briefs or candidate implementation. Each pair had a separate fresh
  anonymous grader using the same frozen rubric and source snapshot.
- Source hashes, briefs, task/rubric text, observer, Skill bundle and runtime
  fingerprints were frozen before candidates ran. Launch order was A/B, B/A,
  A/B; runs overlapped as agent capacity allowed. This is not a controlled
  machine-performance benchmark.
- No RAG, MCP transport, graph traversal, application execution or test execution
  was used by candidates. Vue template dependencies are not represented as
  complete AST graph facts in this trial.

See [protocol](protocol.md), [freeze](freeze.json), [tasks](tasks.md),
[rubric](rubric.md), [independent accounting review](audit.md), and
[source license](THIRD_PARTY_NOTICES.md).

## Results

Primary percentages compare **arm medians**, matching the previous r3 evaluation.
Observer/public text use `o200k_base`; model usage is numerical session telemetry,
not that tokenizer's estimate or a monetary invoice.

| Median metric | A: source | B: Skill | Change |
| --- | ---: | ---: | ---: |
| Observer-delivered text | 15,206 | 15,152 | −0.4% |
| Actual public tool text, including wrappers | 18,026 | 17,483 | −3.0% |
| Uncached input + output | 47,652 | 34,752 | −27.1% |
| Cached input | 1,044,224 | 868,352 | Reported separately; not a saving invoice |
| Input + output including cached replay | 1,096,299 | 908,804 | Not the primary gate |

| Pair | Critical score A / B | Public text A / B | Uncached input + output A / B | Major errors A / B |
| --- | --- | --- | --- | --- |
| 1 | 11.5 / 12 | 18,552 / 16,463 | 47,652 / 33,049 | 0 / 0 |
| 2 | 12 / 12 | 18,026 / 18,143 | 39,532 / 40,452 | 0 / 0 |
| 3 | 12 / 12 | 17,871 / 17,483 | 52,075 / 34,752 | 0 / 0 |

Efficiency required at least 15% less observer **and** public tool text, at least
10% less uncached input + output, and no coverage loss/extra major error. The
text gates failed. Uncached usage fell in two pairs but rose 2.3% in the other;
it also depends on cache behavior, invocation count and model output. It cannot
alone establish that the Skill compressed the needed source context.

Quality required at least 20% fewer missed points and strict improvement in at
least two pairs, without extra major errors or more than 25% extra uncached
input + output. Only one pair improved, by half a point: A omitted the initial
load's `finally` cleanup while B mentioned it. This is not a demonstrated
general accuracy improvement. [Pair 1 grade](pair-1/grade.md),
[pair 2 grade](pair-2/grade.md), [pair 3 grade](pair-3/grade.md).

## Where the text went

| Stage: median observer text | A | B | Change |
| --- | ---: | ---: | ---: |
| Discover the CLI authorization page | 9,565 | 10,272 | +7.4% |
| Follow-up: password/OIDC round trip | 4,698 | 4,073 | −13.3% |
| Known-file local control | 921 | 823 | −10.6% |

All B candidates made exactly two queries: one ranked `features` lookup, which
returned the correct CLI feature first, and one full `brief` for
`cli-auth-authorize-view` with a 2,300–2,400 estimated-token budget. They then
read source. They did not call `context`, load other briefs, or use brief
`--query`, `--focus`, `--exclude`, `--facts` or `--snippets` in later phases.

The observed benefit is routing assistance, not demonstrated adoption or savings
from incremental fact expansion. Each B loaded 944 tokens of Skill instructions
plus 1,546–1,618 tokens of query output. Much of the necessary implementation was
then reread. Discovery therefore became slightly more expensive at the median.
The follow-up/control differences cannot be causally assigned to new options
that were never invoked. Skipping an unnecessary query in the local control is
appropriate; it is not evidence that a query would have helped.

The new options have deterministic regression and SDK parity tests. Those prove
their output contract, not that agents will choose them or save full-task tokens.
This comparison also does not isolate the candidate from the previous Skill.

## Generation cost and accounting

The independent author produced 5 briefs, 46 facts, in 525.3 seconds. This added
**117,878 uncached-input-plus-output tokens**, separately from warm reuse.
That exceeds the observed first-session saving. No first-use net saving or
reliable break-even count is claimed. Task-design, grading, coordinator and
future refresh costs are additionally excluded from warm-query metrics.
[Generation report](generation/author-report.md), [generation telemetry](generation/metrics.json).

All six sessions were fresh single completed tasks with identical model/effort.
All source and frozen B artifact hashes matched. Observer/task-release scripts
were unchanged. All 127 observations were matched to actual public tool outputs;
there were no failed observations, observer caps or outer truncation markers.
All task releases occurred in discovery → followup → control order. Public calls
were limited to observer commands and REPORT.md patches. One report placed its
control section before followup in the final file; release/write chronology and
content remained intact, and formatting was not scored.

The delivery check is multiplicity-aware substring matching, not call-identity
proof; the scope check parses public tool arguments, not a security sandbox.
Per-stage visible text is available, but cached/uncached model usage is reported
for the full session, not artificially attributed to individual phases.
No raw private reasoning or system messages are exported.

[summary-v2.json](summary-v2.json) is the primary computed result. The earlier
[summary.json](summary.json) is retained as a preliminary calculation using
the median of pairwise percentage changes (observer +0.3%, public text −2.2%,
uncached input + output −30.6%). V2 restores the previous evaluation's arm-median
definition. Both calculations fail both gates; no measurements or grades changed.

## Historical experimental MCP reuse (subsequently replaced)

After the candidate runs, the same query engine was exposed as `find_features`
and `get_feature_brief`. A real SDK in-memory client/server test checks identical
CLI/MCP text for discovery, selection, exclusions, excerpts and staleness, plus
invalid-input handling. This is interface parity, not another complete-agent A/B
or a measurement of native editor tool-discovery overhead. The earlier
[0.5.0 MCP A/B](../../mcp-ab/results.md) remains unchanged and did not have these APIs.

## Reproduce or inspect

The developer-only scripts here prepare independent author/designer workspaces,
freeze candidates, stage observed tasks, record model telemetry, blind reports,
archive grades, audit public calls and calculate the summary. They reject
overwriting frozen results. Use a new experiment directory for a rerun.
`record.mjs` reuses the accounting helpers under `../context/`; Python/tiktoken
and TypeScript are evaluation dependencies, not requirements of the query Skill.
Absolute paths in archives identify this run; source hashes and the pinned Git
revision identify the portable source snapshot. The historical uncommitted implementation
is identified by its frozen bundle hash, not the preceding release tag.

This prospective development validation is narrow and small. Preserve selective
source inspection and accurate caveats; do not force repeated brief calls or
advertise a general saving based on the uncached figure alone. Evaluation files
are excluded from the VSIX.
