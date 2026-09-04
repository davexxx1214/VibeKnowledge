# Delivery and accounting audit

The common observer records the text it emits after its own 18,000-character
cap. A second, outer tool layer can still truncate a batched result. Therefore
an observer log is not by itself proof that every emitted token reached the
agent. This was audited independently of task grading using only public tool
outputs, never private reasoning or system messages.

Held-out pair 1: every A/B observation appears in the actual public tool output.
Pair 2: all A observations match; seven B observations are not fully present due
to one outer truncation. Original metrics/observations are retained unchanged.
Failed reads also count: a collector metadata bug for a missing file was fixed
before pair 1 metrics completed; the failed-read text was never discarded.

`measure-public-outputs.cjs` additionally tokenizes every actual public tool-text
block after all truncation, including errors and wrapper formatting. It exports
only counts and metadata. This is distinct from observer-emitted stdout and from
the model's cumulative input/cache/output telemetry. All pairs use this same
additional measurement, not only the affected arm or run.

The efficiency decision conservatively requires BOTH the original >=15% lower
median observer-payload count and >=15% lower median actual public-tool-text
count, plus the original >=10% lower median uncached-input-plus-output and
unchanged quality conditions. The correction cannot turn a failing original
gate into a pass by itself. No thresholds, tasks, candidate or grading rubric
were loosened after seeing results. These remain small-sample engineering gates,
not pricing or statistical-significance claims.

The frozen source snapshot copies the directories listed by prepare.mjs, not
every file in a full installed checkout. In particular MCP package helper
scripts are absent in this snapshot; both arms and the author had the same gap.
Source-hash manifests document the exact scope. Any reported benefit is limited
to this snapshot and these tasks, not full MCP runtime validation.

Final public-output measurements are version 3: both function/custom output
records, plain-text special-token literals, and one fresh completed task with
matching start/completion identity are validated. Output item count is named
toolOutputItems (not tool calls). Version 1/2 measurements remain archived.
Delivery version 2 consumes each matched substring occurrence once. Pair 3 has
no unmatched observations. Three synthetic accounting regression tests pass;
independent code-only review found no remaining blocking accounting issue.
