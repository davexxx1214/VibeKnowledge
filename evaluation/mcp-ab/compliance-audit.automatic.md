# Independent compliance and provenance audit

Status: fail. Collected 2026-09-04T15:01:18.822Z.

No old/new candidate answer or grade is used. Public tool calls are parsed statically; code from sessions is never executed. Private reasoning/system text and tool-result bodies are not exported.

## Preparation and provenance

Historical r3 raw structural graph digest match: true.
Supplemental observation after pair 1 started; not an all-pairs pre-run freeze.

Node v26.8.1; MCP 0.5.0. Full supplementary fingerprints are in compliance-audit.json.

## Method

- Check every public function/custom-tool call, with literal JavaScript AST extraction of nested tools; unsupported dynamic constructs require manual review.
- Check shell cwd, observer-only execution, quoted arguments, read/rg paths, MCP allowlist, patch headers restricted to REPORT.md and exact command/observation multiplicity.
- Check all model/effort contexts, task/turn identity, public prompt body, no prior public assistant/tool history, supplied no-fork dispatch attestation and distinct sessions.
- Inventory final files and rehash frozen inputs; never open REPORT.md. Compare raw graph bytes to three historical r3 manifest digests.
- Record environment/dependency/condenser fingerprints as supplemental observations, not a retroactive pre-run freeze.

## Session results

### Pair 1 A: fail

Session 01a06cdc-0281-7113-b7c1-27fbf50ea988; public observer commands 54; observations 54.

- Violation: Non-observer shell command.
- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 1 B: fail

Session 01a06cdc-2260-7ba0-a8f4-f79fbe0b77b0; public observer commands 50; observations 50.

- Violation: Non-observer shell command.
- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 2 A: fail

Session 01a06ce2-efde-7733-8f2e-555634a2afd0; public observer commands 43; observations 43.

- Violation: Non-observer shell command.
- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 2 B: fail

Session 01a06ce3-11db-78f1-a579-78ac42bbfb25; public observer commands 55; observations 55.

- Violation: Non-observer shell command.
- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 3 A: fail

Session 01a06ce9-2499-7263-839b-6a2bce75875e; public observer commands 49; observations 49.

- Violation: Non-observer shell command.
- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 3 B: fail

Session 01a06ce9-460c-7d20-903c-648b1db3f5f9; public observer commands 43; observations 43.

- Violation: Non-observer shell command.
- Requires review: Public task body does not exactly match frozen tasks.md.

## Limits

Static parsing is conservative and is not a hostile-code sandbox. Unknown calls are not silently approved. Final file hashes cannot rule out transient reverted modifications. No-fork settings not present in session metadata rely partly on the separately supplied public dispatch record. Delivery completeness and blind quality grading remain separate audits.
