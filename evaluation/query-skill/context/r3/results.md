# Facet-balanced feature Skill: independent A/B

2026-09-04. Three fresh matched pairs on two frozen read-only feature-analysis
tasks in a selected VibeKnowledge source snapshot. Candidate and brief hashes
remained unchanged; all six agents used gpt-5.6-sol/xhigh without inherited task
history. Arm A searched source; B additionally used the portable query Skill and
independently authored feature briefs. Both had identical observation tooling,
source access, permissions and tasks. These are not code-modification acceptance
tests or a live editor benchmark.

Decision: **passes the predefined efficiency gate**, not the quality-improvement
gate. Independent blinded grading gave both arms **17/17 critical**, **3/3
supplemental**, and **zero major false claims in every pair**. No critical
coverage loss was observed under this finite rubric. Both original observer
and actual-public-text medians fell by at least 15%, and uncached input plus
output fell by at least 10%. See heldout-summary.json for the mechanical gate
calculation and each pair's grades.md/json for source-backed judgments.

This meets the scoped token-reduction objective. Baseline had no graded
omissions, so there is no demonstrated accuracy/completeness improvement.
The grader records interpretation caveats: the frozen locale-aware parenthetic
in I.C7 is imprecise, and placeholder/unload details are nonessential examples
under its pre-existing non-exhaustive rule. No retrospective score changes
were made. These caveats limit how broadly perfect rubric scores can be read.

## Tokens and time

| Median over three pairs | A: source only | B: feature Skill | Change |
| --- | ---: | ---: | ---: |
| Observer-emitted text tokens | 64,440 | 49,366 | -23.4% |
| Actual public tool-text tokens | 74,789 | 56,572 | -24.4% |
| Uncached input | 91,516 | 71,934 | -21.4% |
| Uncached input + output | 104,756 | 81,771 | -21.9% |
| Cached input | 1,053,312 | 939,776 | -10.8% |
| Output | 13,240 | 10,896 | -17.7% |
| Total input + output, including cached replay | 1,158,068 | 1,025,622 | -11.4% |
| Execution duration | 409.6 s | 339.9 s | -17.0% |

Medians are calculated separately for each metric; median components need not
sum to another median. Text uses o200k_base; model usage comes from numeric
session telemetry. Uncached input plus output is not a monetary invoice. Timing
is descriptive, with variable host load, not a performance guarantee.

| Pair | A/B public tool text | A/B uncached input + output | A/B query calls |
| --- | ---: | ---: | ---: |
| 1 | 74,789 / 58,869 | 104,756 / 88,534 | 0 / 4 |
| 2 | 69,358 / 56,420 | 94,903 / 81,771 | 0 / 4 |
| 3 | 77,606 / 56,572 | 117,187 / 81,310 | 0 / 5 |

Every B query was feature discovery or brief retrieval, not graph path/context
analysis. Agents chose budgets of 3,000/3,000, 7,000/6,000, and
2,200→4,200/4,000 for visualization/instructions. These are budget ceilings,
not actual payload sizes. The trial does not establish a saving specifically
at the default 1,800 budget, nor isolate the effect of facet ordering from
brief content and selective source verification.

## Per-task reading

| Pair / task | A/B observer text | A/B source read calls | A/B distinct source files |
| --- | ---: | ---: | ---: |
| 1 visualization | 43,554 / 35,014 | 23 / 18 | 13 / 11 |
| 1 instructions | 20,886 / 15,431 | 16 / 12 | 8 / 8 |
| 2 visualization | 39,337 / 32,367 | 23 / 17 | 11 / 9 |
| 2 instructions | 21,530 / 16,004 | 21 / 17 | 11 / 10 |
| 3 visualization | 43,153 / 34,888 | 19 / 20 | 12 / 12 |
| 3 instructions | 23,684 / 14,478 | 14 / 11 | 8 / 8 |

Each B also read the Skill once under visualization; that read is included in
text usage but excluded from the source-read columns. All source searches and
reads, including repeated/failed calls, remain in observations/metrics. The
third visualization run read more source ranges, despite less total text.
No claim that a Skill eliminates source inspection is supported.

## Generation cost and scope

An independent author received only the two feature areas, frozen source and
brief schema/authoring contract, not test prompts, rubrics, prior answers or a
savings target. Producing 25 facts across two briefs cost **90,480 uncached-input
plus output tokens**, **64,769 actual public tool-text tokens**, and **328.1 s**.
This preprocessing is additional to the warm-reuse numbers above. First use
does not save net tokens after that cost. Reuse frequency, source changes and
refresh expense determine amortization; this experiment does not measure a
real multi-week workflow. Development and evaluation work are also not part of
per-query operating cost.

The author synthesized source directly; no graph was supplied in its author
workspace. B received both the graph and briefs but used only briefs. Thus the
tested benefit is reusable feature context plus selective
access—not proof that graph algorithms, the Skill carrier, or MCP inherently
save tokens. Equivalent curated documentation might help too; that comparison
was not tested.

The new tasks cover visualization state/performance controls and Copilot
instruction generation, not the earlier descriptions/MCP-setup prompts.
They are still two prompts in one repository, not unseen repositories or an
actual multi-page frontend. The selected snapshot omits MCP package helper
scripts equally for source-only, Skill and author; see the source manifests.
No live editor, rendering, Copilot or network behavior was exercised by these
task agents. Finite rubric coverage does not establish exhaustive correctness.

## Audit and implementation verification

All source/artifact fingerprints match their frozen manifests. Public-output
version 3 validates a fresh completed task and both public output event types,
exports only numeric metadata, and counts text after outer truncation. Pair 2
B has one outer truncation: four observer emissions are not fully delivered.
Pairs 1/3 and pair 2 A have no missing emissions. Both original observer and
actual-public-text thresholds must pass, so correcting accounting cannot rescue
a failed original efficiency gate. See ../accounting-audit.md and each pair's
delivery audit; no private reasoning or system content is exported.

Implementation checks: 255 root tests, 107 MCP tests, Node 26.1 subset of 36
tests, root typecheck, MCP build, Skill validation and three synthetic accounting
regressions passed. Independent code review found no blocking formatter or
accounting issue. Packaging lists the query runtime and excludes evaluation
logs. These engineering checks are separate from task-agent answer grades.

The [r2 held-out failure](../heldout-results.md), [r2 pilot coverage loss](../pilot-r2/summary.md),
and [r1 task-context failure](../pilot-r1/summary.md) remain published. Local
negative-control tasks previously paid extra Skill overhead. Do not generalize
this candidate's result to small known-file edits or arbitrary impact analysis.
