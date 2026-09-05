# Feature-first MCP A/B archive

Three fresh matched pairs analyzed visualization controls and Copilot-instruction
generation. A used source only; B could also query the existing feature briefs
through the development MCP. This is a warm-reuse test of artifacts, endpoints
and routing guidance together, not an isolated transport comparison with Skill.

Start with [results](results.md), then inspect:

- [Prospective protocol](protocol.md), [task document](tasks.md),
  [rubric](rubric.md) and [pre-run harness review](harness-review.md).
- `freeze.json`, `freeze-initial-preflight.json`, `preflight-checks.json` and
  `post-run-integrity.json`: source, artifacts, runtime, dependencies and helper
  hashes. The initial freeze is retained alongside pre-run corrections.
- `dispatches.json`, `public-dispatch.json`, `session-mapping.json`: prepared
  prompts and public dispatch/session metadata. Persisted payloads are opaque;
  their plaintext is not independently verified or decrypted.
- `pair-1` through `pair-3`: original reports, observer output, numeric usage,
  public-output accounting, delivery audit, anonymized reports and blind grades.
- `details.json`: per-task reads/searches, failures, caps and actual MCP calls.
- `compliance-audit.*` and `scope-audit.*`: automatic findings and independent
  adjudication. They are separate records; automatic review flags are not
  silently replaced with a pass.
- [summary-blocked.json](summary-blocked.json): the frozen summarizer refused
  aggregation because the independent overall scope audit failed. No passing
  `summary.json` was generated; the results page is descriptive reporting.

The source snapshot has 0.4.0 manifests. The MCP runtime has a 0.5.0 manifest
plus uncommitted feature-first changes, identified by its candidate hash. The
two briefs and structural data are reused byte-for-byte from the earlier
experiments, not regenerated for these answers. This is not a new held-out
repository or a code-modification acceptance test.

## Check the measurement helpers

From the repository root:

```sh
node --test evaluation/mcp-feature-first-ab/accounting.test.cjs evaluation/mcp-feature-first-ab/summary.test.cjs evaluation/query-skill/context/accounting.test.cjs
```

These eight synthetic checks validate accounting and fail-closed aggregation;
they do not validate product behavior. Text accounting needs Python with
`tiktoken`; that is an evaluation dependency, not an MCP or Skill dependency.

`summarize.cjs` requires all six independently adjudicated scope results to
pass, in addition to complete delivery, numeric and grading evidence. A failed
scope audit must remain failed; do not edit it or the frozen summarizer merely
to produce a passing result. Descriptive counts can still be reported with the
deviation clearly disclosed.

## Repeat, without overwriting this run

Use a new evaluation directory and newly frozen isolated workspaces. Review the
recorded protocol deviations before dispatching. `prepare.mjs` documents how
the retained fixture was copied and hashed; its default paths are this
machine's historical paths, not a portable source download. Repeating requires
those exact inputs or an explicitly new snapshot/protocol.

`record.mjs` collects completed candidates, `blind.mjs` anonymizes paths/arm
labels without removing substantive content, and `archive-grades.mjs` preserves
independent grades. All write-once guards are intentional. Do not overwrite
answers, rerun unfavorable candidates or substitute current source for frozen
files under historical hashes.

Archived records contain public task artifacts and numeric telemetry only,
not private reasoning or system messages. Absolute paths identify the original
local run; full session logs and temporary source copies are not committed.
Evaluation artifacts are excluded from the VSIX.
