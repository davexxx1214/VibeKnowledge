# Independent compliance and provenance audit

Status: review_required. Collected 2026-09-04T17:06:05.975Z.

No old/new candidate answer or grade is used. Public tool calls are parsed statically; code from sessions is never executed. Private reasoning/system text and tool-result bodies are not exported.

## Preparation and provenance

Historical r3 raw structural graph digest match: true.
Supplementary audit-time measurement. The independent pre-run baseline for this experiment is freeze.json and preflight-checks.json.

Node v26.8.1; MCP 0.5.0. Full supplementary fingerprints are in compliance-audit.json.

## Method

- Check every public function/custom-tool call, with literal JavaScript AST extraction of nested tools; unsupported dynamic constructs require manual review.
- Check shell cwd, observer-only execution, quoted arguments, read/rg paths, MCP allowlist, patch headers restricted to REPORT.md and exact command/observation multiplicity.
- Check all model/effort contexts, task/turn identity, public prompt body, no prior public assistant/tool history, supplied no-fork dispatch attestation and distinct sessions.
- Inventory final files and rehash frozen inputs; never open REPORT.md. Compare raw graph bytes to three historical r3 manifest digests.
- Record environment/dependency/condenser fingerprints as supplemental observations, not a retroactive pre-run freeze.

## Session results

### Pair 1 A: review_required

Session 01a06d50-d2d0-7b63-92e7-135415317935; public observer commands 49; observations 49.

- Requires review: Public task body does not exactly match frozen tasks.md.
- Requires review: Nonliteral argument requires manual review.

### Pair 1 B: review_required

Session 01a06d51-27f8-7fb3-b442-4d288cd6c18b; public observer commands 39; observations 39.

- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 2 A: review_required

Session 01a06d57-71ee-7af2-b76d-67165452e64e; public observer commands 39; observations 39.

- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 2 B: review_required

Session 01a06d57-1e77-7691-98f3-3bda76d1b5a4; public observer commands 44; observations 44.

- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 3 A: review_required

Session 01a06d5c-f3ef-79d2-ac45-80669aa23b83; public observer commands 45; observations 45.

- Requires review: Public task body does not exactly match frozen tasks.md.

### Pair 3 B: review_required

Session 01a06d5d-52a5-70a2-8a06-fa360b2afb42; public observer commands 37; observations 37.

- Requires review: Public task body does not exactly match frozen tasks.md.

## Limits

Static parsing is conservative and is not a hostile-code sandbox. Unknown calls are not silently approved. Final file hashes cannot rule out transient reverted modifications. No-fork settings not present in session metadata rely partly on the separately supplied public dispatch record. Delivery completeness and blind quality grading remain separate audits.
