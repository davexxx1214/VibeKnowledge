# Released MCP 0.5.0: matched feature-task A/B

2026-09-04. Three fresh matched pairs, two read-only feature-analysis tasks per
agent, gpt-5.6-sol/xhigh, no inherited conversation. A searched source; B could
also query the released MCP. Both had identical source, tasks and source-reading
observer. Tasks covered graph visualization controls and Copilot instruction
generation, not implementing code changes or running the editor/tests.

## Token result

**The predefined efficiency gate did not pass.** Median uncached input plus
output fell only 1.9%, while actual public tool text rose 0.7%. Per-pair outcomes
were mixed. This does not establish meaningful/general token savings for the
current MCP workflow, and does not establish that native MCP transport itself
is more expensive than a Skill.

| Median over three pairs | A: source only | B: MCP-assisted | B change |
| --- | ---: | ---: | ---: |
| Observer-emitted text tokens | 55,882 | 57,207 | +2.4% |
| Actual delivered public tool text | 65,679 | 66,170 | +0.7% |
| Uncached input | 82,423 | 81,413 | -1.2% |
| Uncached input + output | 95,231 | 93,468 | -1.9% |
| Cached input | 1,183,232 | 1,195,904 | +1.1% |
| Output | 12,808 | 12,252 | -4.3% |
| Total input + output including cached replay | 1,277,990 | 1,286,001 | +0.6% |
| Task execution duration | 381.1 s | 390.6 s | +2.5% |

Each median is independent; median components need not sum. Text uses
o200k_base. Model usage is numeric session telemetry, not a monetary invoice.
Timing includes a cold MCP process per call, and is descriptive only.

| Pair | A/B public tool text | A/B uncached input + output | A/B graph queries |
| --- | ---: | ---: | ---: |
| 1 | 62,730 / 71,178 | 94,758 / 105,529 | 0 / 3 |
| 2 | 68,188 / 61,388 | 95,282 / 90,097 | 0 / 2 |
| 3 | 65,679 / 66,170 | 95,231 / 93,468 | 0 / 2 |

All B agents successfully loaded the real 10-tool schema once (2,201 observer
tokens each). Across the three B sessions, query results added 6,051, 3,467 and
3,603 tokens. Six calls used query_graph; one used analyze_impact. Every query
completed successfully. Agents chose budgets and Evidence themselves; all six
query_graph calls requested Evidence. The experiment does not isolate default
budgets or default no-Evidence output.

Source-read text alone had medians 47,187 → 43,409 (-8.0%), but this excluded
searches, schemas, query output and wrappers. The full cost therefore cannot be
inferred from source-reading reduction alone. B still inspected behavior and
tests extensively; the graph was navigation support, not a substitute for those
contracts. This interpretation is consistent with the recorded trajectories,
not a causal isolation of any single formatter or selection algorithm.

## Per-task inspection

| Pair / task | A/B observer text | A/B source reads | A/B distinct source files |
| --- | ---: | ---: | ---: |
| 1 visualization | 35,829 / 41,601 | 22 / 21 | 12 / 12 |
| 1 instructions | 17,338 / 19,987 | 15 / 14 | 10 / 11 |
| 2 visualization | 39,036 / 35,788 | 17 / 21 | 8 / 10 |
| 2 instructions | 19,598 / 16,673 | 13 / 18 | 8 / 10 |
| 3 visualization | 36,498 / 36,580 | 21 / 17 | 11 / 10 |
| 3 instructions | 19,384 / 20,627 | 17 / 15 | 10 / 10 |

Failed searches are retained: A had 1/0/1, B had 1/1/1. The first task in each B
includes schema discovery. There were no resource calls, RAG calls or task
retries. All 294 observer emissions were matched to delivered public text, with
no outer truncation. Three observer-internal 18,000-character caps occurred
(pair-1 B, pair-2 A and pair-3 B, one each). Their displayed truncated text and
any follow-up reads remain counted; unseen text is not treated as delivered.

## Quality and validity

Three independent graders scored anonymized reports against the original
source-backed rubric. Each pair used one grader for both reports; graders did
not receive methods, token measurements or the A/B mapping.

| Pair | A/B critical coverage (out of 17) | A/B supplemental (out of 3) | A/B major false claims |
| --- | ---: | ---: | ---: |
| 1 | 17 / 17 | 3 / 3 | 1 / 0 |
| 2 | 16.5 / 16.5 | 3 / 3 | 0 / 0 |
| 3 | 17 / 16.5 | 3 / 3 | 0 / 0 |

**Neither predefined gate passed.** B had no strictly higher critical score in
any pair, and lost half a point in pair 3. Aggregated missed critical points
were A=0.5 and B=1.0. B made no additional major false claims; A's pair-1 answer
incorrectly attributed working zh/en selection to Cursor's locale wrapper.
The implementation returns zh-CN/en-US but compares against bare zh. The
critical rubric credits the shared-builder contract separately from that error.

The partial-coverage deductions concern the no-workspace activation branch:
the public command becomes a warning placeholder rather than reaching the
normal service chain. Both pair-2 reports and B in pair 3 covered the method's
own guard but omitted this separate routing branch. No product bug was fixed
as part of grading. The finite rubric is not exhaustive correctness; independent
graders can interpret coverage differently from the previous Skill trial, so
its earlier perfect scores are not a causal cross-trial quality comparison.

Raw reports, the exact anonymized reports shown to graders, item-by-item grades
and mappings remain in each pair directory. [summary.json](summary.json)
computes the unchanged gates from those grades and the archived measurements.

### Independent compliance adjudication

The [independent audit](compliance-audit.md) concluded **pass with limits**:
no confirmed unauthorized operation, all 294 observations bound to the public
call that requested them, and unchanged frozen source/artifact/runtime hashes.
The original automated `fail` is preserved separately. It flagged each agent's
one-time read of the shared task document outside the observer, and assumed the
task would be in a different session field. The final adjudication treats these
as bootstrap/parser findings, not unreported extra source reads.

The authorization wording for that symmetric bootstrap read relies on a labeled
primary-agent transcription: persisted dispatch bodies are opaque. The reviewer
independently verified dispatch identities, no-fork settings and that every
agent received the same complete task document, but could not independently
recover the authorization plaintext. Environment/dependency/condenser hashes
were supplementary measurements taken after pair 1 and during pair 2, not an
all-pairs pre-run freeze. Final hashes cannot exclude transient reverted edits.
A was always started before B by about eight seconds; order was not randomized.
These qualifications must accompany publication of the result.

Five developer accounting regression tests passed (three shared and two MCP
checks), and the evaluation scripts passed syntax checks. These checks validate
measurement helpers, not new product functionality; no product test suite was
rerun or claimed as part of this analysis-only trial.

## What was actually tested

The runtime is the released **MCP 0.5.0**. The analyzed source is the retained
selected VibeKnowledge snapshot used in Skill r3, whose package manifests say
0.4.0. Eight central implementation/test files match current release source.
The snapshot omits some MCP helper scripts equally for both arms and is not a
complete clean clone. Source/artifact hashes remained unchanged in all six runs.

The full structural graph was reused unchanged: 156 files, 1,117 entities,
10,250 relations and 47 diagnostics, matching the archived r3 digest. The shipped
condenser produced framework (11 nodes/14 edges), graph visualization (12/11)
and Copilot instructions (11/12) groups in 974 ms altogether. Narrow primary
file scopes were selected before task answers. Mechanical descriptions were not
rewritten to encode rubric answers. Framework warnings about two unsupported
boundary paths and one unresolved dynamic import were retained, not tuned away.

This is an evaluation-only bridge using the actual MCP SDK 1.30.0 and stdio
server, Node 26.8.1, RAG disabled, with an empty isolated SQLite fixture. It does
not mock handlers, read real human overrides, or forward queries to the Skill.
Each command restarts the server. Schemas/results are exposed as observer text,
not through the host's native automatic MCP discovery. Native client caching,
deferred tool loading and persistent sessions can change overhead and latency.

Artifacts were precomputed. Raw extraction's historical 5,453 ms, installation,
refresh and any semantic authoring expense are separate; the 974 ms condenser
measurement is not total first-use cost. Archived Skill briefs were copied but
not readable via the tested MCP; their historical authoring cost is not charged
as consumed MCP context. Main-agent setup/evaluation work is not per-task usage.

## Relation to the Skill result and next experiment

The previous Skill r3 trial reported -24.4% public text and -21.9% uncached input
plus output, using reusable **feature briefs**, not graph traversal. Current MCP
does **not** expose feature discovery, feature briefs or task-context endpoints.
It returns entity/relationship navigation and structural analysis instead.
These trials differ in available information and execution method; subtracting
their percentages would not measure a pure Skill-versus-MCP transport effect.

A useful next candidate would expose the existing feature-first retrieval logic
through MCP, sharing brief contents, freshness checks, facet selection, budget
rules and source fallback with the Skill. First verify payload parity, then run
new independent same-information task pairs (and a small-task negative control).
Do not promise savings merely from renaming the interface. No such product/API
change was made for this experiment.

This is replication on two already published tasks in one repository, not a
new unseen-repository held-out test or statistical-significance claim. No new
local-task negative control or real code-change acceptance task was included.
Complete method and audit limitations: [protocol](protocol.md),
[harness review](harness-review.md), [compliance audit](compliance-audit.md).
