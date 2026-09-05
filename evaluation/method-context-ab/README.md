# Exact-symbol context: scoped coding-task observations

Status: scope-corrected individual observations, **not a newly preregistered
two-task trial or a validated general efficiency claim**. Recorded 2026-09-05.

The knowledge-graph Skills support code dependencies and page/feature
understanding, not RAG. RAG-specific cases, dispatches, acceptance criteria,
grades and the original mixed aggregate have been removed from this published
evaluation. No new Agent runs were made for this scope correction. Original
pair numbers are retained so the remaining evidence is not relabeled.

## What was compared

- A: the previous context engine expands a method selector through its file.
- B: exact-symbol `buildTaskContext` follows the selected method and relevant
  helpers/callers/tests without expanding all container members.
- Both arms receive a context query. This is **not Skill versus no Skill** and
  does not measure feature-brief reuse or MCP transport overhead.
- Each task has one fresh, independent A/B pair, using `gpt-6-astra` / `xhigh`,
  the same source/graph snapshot and query parameters, then source inspection,
  implementation and tests. A separate grader scores anonymized artifacts.

| Pair / task | Actual public tool-text tokens, A → B | Uncached input + output, A → B | Blind critical score, A → B |
| --- | ---: | ---: | ---: |
| 1 / selected graph JSON export | 14,140 → 11,719 (−17.1%) | 29,271 → 25,129 (−14.2%) | 4/4 → 4/4 |
| 4 / Unicode-safe CodeLens truncation | 5,225 → 4,713 (−9.8%) | 16,893 → 27,950 (+65.5%) | 3/3 → 3/3 |

Both arms have zero major errors. The four export acceptance tests and three
Unicode acceptance tests pass in their respective arms; typechecks also pass.
The Unicode candidates additionally pass their 11-test focused regression suite.

The export task shows a local benefit. The small-file control reads less tool
text but consumes more uncached input plus output. **These observations do not
demonstrate a general efficiency or accuracy improvement.** No aggregate or
success-gate result is computed on this post-hoc scope subset.

## Accounting and limits

Actual public tool text is counted with `o200k_base` over the delivered outputs,
including graph queries, searches, source reads, tests, errors and outer tool
wrappers. It differs from the observer's inner `observedTextTokens` count.
Uncached input plus output is `input_tokens - cached_input_tokens + output_tokens`
across the entire task; it is not a billing measure. Generation, installation,
experimental setup, grading and this cleanup are outside task-level usage.

One pair per task cannot separate an engine effect from reasoning or cache
variation. For the Unicode control, B takes less elapsed time and emits fewer
model-output tokens, but has lower cache reuse; its +65.5% uncached count is not
proof of an inherent algorithmic regression. Neither result establishes broader
project understanding beyond the tested acceptance criteria.

Original metrics retain a failed strict record audit. The supplemental
`record-audit-v2.json` in each pair resolves the nested tool-output decoding
issue: delivered outputs match their records. However, persisted dispatch and
child prompt bodies are encrypted. Matching ciphertext does not verify the
prepared plaintext prompt hash, so full dispatch verification remains unresolved.
Do not treat this supplement as a fully passed strict audit.

## Retained evidence

- [Task definitions](design/tasks.json) and [scoring rules](design/rubric.json)
  retain the original selected task requirements, unchanged.
- [Scope-corrected machine observations](summary.json) have `aggregate: null`
  and `gateVerdict: null`; individual counts and grades are not recomputed.
- [Provenance](provenance.json) records source/graph/engine identity, hashes of
  unchanged retained artifacts, and hashes before/after check-record projection.
- [Pair 1](pair-1/) and [pair 4](pair-4/) retain candidate patches, reports,
  raw public observations, usage metrics, blind grades and audit records.
- [Retained acceptance fixture](design/acceptance.check.ts) contains only the
  four export and three Unicode tests. Projected `checks-*.json` and
  [preflight](preflight.json) keep the selected assertion results and original
  execution metadata, not the unrelated skipped tests from combined output.
  They are labeled projections, not new test executions.
- [Cleanup validation](cleanup-validation.json) separately records rerunning the
  pruned fixture on fresh copies of the four original candidates: all 14
  applicable assertions pass. It also checks 26 unchanged artifact hashes, five
  projected check hashes, summary/grade consistency and local documentation links.
  This is maintenance validation, not another Agent trial or token measurement.

The removed mixed protocol/harness is not a runnable recipe for this revised
scope. A future repeat must freeze a new non-RAG task set and method before
dispatch. Do not silently refresh the old candidate snapshots or telemetry.

The original materials are recoverable in a local Git-ignored `.vscode-test`
backup recorded in provenance, not shipped as part of this evaluation. Product
RAG code and unrelated historical coding trials are unchanged. Raw tool evidence
may still list a RAG source path from the repository; that is not a RAG task or
score and is not redacted from an otherwise unchanged task record.
