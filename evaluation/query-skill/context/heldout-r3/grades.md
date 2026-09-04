# Anonymous held-out grades — r3

Graded only the frozen [held-out rubric](../rubric-heldout.md), anonymous candidate X/Y reports and `.vscode-test/feature-heldout-r3-QADQ4Z/snapshot`. No mapping files, arm directories, briefs, observations, metrics or generation materials were inspected. No tested code was run.

## Totals

| Candidate | H1 critical | H2 critical | Total critical | Supplemental | Major false claims |
| --- | ---: | ---: | ---: | ---: | ---: |
| X | 7.5/8 | 9/9 | **16.5/17** | **3/3** | 0 |
| Y | 7.5/8 | 9/9 | **16.5/17** | **3/3** | 0 |

The deductions are missing regression evidence, not false descriptions of implementation. Critical and supplemental scores remain separate. [grades.json](grades.json) contains per-item evidence/rationales and the same flat totals schema as the preceding pairs.

## Per-item scores

Report evidence gives candidate line numbers. Source anchors are relative to this run's frozen snapshot. `C` is critical; `S` is supplemental.

### H1 — Entity descriptions

X: critical 7.5/8, supplemental 2/2. Y: critical 7.5/8, supplemental 2/2.

| Item / required causal relationship | X | Y | Report evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — UI edit/reset route, cancellation and empty input | 1 | 1 | X:9, 11, 25; Y:9, 11, 31 | `src/ui/commands/entityCommands.ts:225` |
| C2 — Stable-key durable SQL overlay, not generated JSON editing | 1 | 1 | X:11, 17; Y:11, 13, 15 | `src/services/agentGraph/agentEntityOverrideService.ts:47` |
| C3 — Cross-group workspace scope and latest-generated reset | 1 | 1 | X:13, 17; Y:15, 17, 35, 41 | `src/services/agentGraph/agentGraphService.ts:143` |
| C4 — Explicit refresh versus manifest-signature caching | 1 | 1 | X:11, 25, 38; Y:23, 31, 38 | `src/services/agentGraph/agentGraphService.ts:108` |
| C5 — Tree/GraphView/CodeLens invalidation and pull consumers | 1 | 1 | X:25, 29–32; Y:24–27, 31 | `src/extension.ts:548` |
| C6 — MCP read-side overlay affects descriptions and search | 1 | 1 | X:33–34, 39; Y:28, 38–39 | `packages/mcp-server/src/mergedGraph.ts:26` |
| C7 — Nullable/malformed input and nontransactional save failures | 1 | 1 | X:38–41; Y:9, 11, 36–38 | `src/services/agentGraph/agentGraphService.ts:148` |
| C8 — Delegation, regeneration/reset and consumer regression coverage | 0.5 | 0.5 | X:13, 40; Y:17, 41 | `src/services/knowledgeGraphService.test.ts:131` |
| S1 — Exact-first and unambiguous case-safe identity fallback | 1 | 1 | X:19, 33, 40; Y:17 | `src/services/agentGraph/agentEntityOverrideService.ts:22` |
| S2 — Reset success ignores result; normal no-op returns still refresh | 1 | 1 | X:25, 41; Y:9, 31, 37 | `src/ui/commands/entityCommands.ts:248` |

X cites cross-group regeneration/latest-prose reset and identity tests, but no service-delegation or description-consumer regression. Y additionally cites a valid CLI override consumer test, but still omits service-delegation regression evidence; both incomplete sets receive 0.5 for C8 under the frozen scale.

### H2 — MCP setup

X: critical 9/9, supplemental 1/1. Y: critical 9/9, supplemental 1/1.

| Item / required causal relationship | X | Y | Report evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — Early shared registration, trust, overlap and abort gating | 1 | 1 | X:48, 50, 67; Y:47–49, 69 | `src/extension.ts:36` |
| C2 — Configured/local workspace, client, confirmation and validation | 1 | 1 | X:50–52; Y:49–51, 55 | `src/commands/mcpSetupCommands.ts:23` |
| C3 — Resolved external Node and npm/runtime environment consistency | 1 | 1 | X:56, 60–63, 75; Y:56, 65 | `src/services/mcpSetupService.ts:91` |
| C4 — Isolated install, audit, database, health, then publication | 1 | 1 | X:52, 58–65, 77; Y:57–61, 67 | `src/commands/mcpSetupCommands.ts:64` |
| C5 — Shell-free child arguments, bounded errors and cancellation | 1 | 1 | X:48, 50, 67, 81; Y:57, 69, 75 | `src/services/mcpSetupService.ts:37` |
| C6 — Client-specific scoped JSONC publication, backup and conflict check | 1 | 1 | X:50, 75, 81–82; Y:49, 65, 67, 75 | `src/services/mcpSetupService.ts:118` |
| C7 — Failed-stage cleanup, fresh retry and manual client start | 1 | 1 | X:75, 77, 79–84; Y:67, 69, 73, 75 | `src/services/mcpSetupService.ts:213` |
| C8 — Bounded fail-closed audit retries, distinct from whole setup | 1 | 1 | X:61, 67, 71, 79; Y:58, 71, 73 | `scripts/audit-dependencies.cjs:3` |
| C9 — Preparation/publication-failure/safe-retry tests and mocked limits | 1 | 1 | X:65, 84; Y:77 | `tests/mcpSetup.test.ts:82` |
| S1 — Preservation is not a transaction or cross-process lock | 1 | 1 | X:80–82; Y:75 | `src/commands/mcpSetupCommands.ts:52` |

No material coverage deduction: both connect isolated preparation to gated publication, cleanup/fresh retry and manual client start, with appropriate nontransactional and mocked-health limits. X's UI error/settings/guard details are more compressed, as noted below.

## Consequential grading judgments

- **X H1.C8 = 0.5:** “Regeneration/reset behavior is explicitly asserted” (X:13) correctly maps `agentGraphService.test.ts:393`. The identity tests at X:40 do not exercise the missing KnowledgeGraphService delegation (`src/services/knowledgeGraphService.test.ts:131`) or description-consumer regression; explaining their implementation elsewhere does not supply tests.
- **Y H1.C8 = 0.5:** Y:41 maps cross-group/reset and “read-only CLI visibility, byte preservation, and corrupt-database failure.” `tests/querySkill.test.ts:86–97` actually checks returned human prose and unchanged database bytes, so it is a valid alternative consumer test under the rubric. The service-delegation regression is still absent.
- **X H2.C8 = 1:** “retry up to three times with 2s/4s backoff” (X:71) is loose terminology. With two backoffs and X:67's three request/process limits, it is read as the source's three total attempts, not an explicit assertion of four attempts (`scripts/audit-dependencies.cjs:3`, `:121`, `:136`).
- **X H2.C7 = 1:** X:75, 77, 79–84 connects fresh corrected retry, unique failed-stage cleanup, retained earlier installs, relevant preservation tests and manual client start. It does not separately spell out the settings offer and `finally` guard clearing, but the core safe-rerun relationship is explained; no extra deduction for not restating every UI detail. The actual guard clearing is at `src/commands/mcpSetupCommands.ts:97`.

## Major false-claim audit

**None identified.**

Both describe workspace stable-key SQL overlays, not generated-graph edits; empty prose and per-group latest-generated reset are correct. They distinguish explicit invalidation from external SQLite updates and read-side MCP merging from a universal visibility guarantee. Save failure is not described as atomic rollback, and reset's success message is not treated as proof of a non-null update.

Both identify the selected external Node/npm, separate global-storage staging, audit/health-before-config gates, client-specific JSONC keys, failed-stage cleanup and later manual client startup. Neither asserts a transaction over every side effect or a cross-process config lock.

The reported absence of `packages/mcp-server/scripts/health-check.mjs` was confirmed in this snapshot. The mandatory invocation/exit gate is observable; its absent helper's exact protocol checks and live connection success cannot be inferred from mocked setup tests. Their evidence caveat is correct.

The post-rename cleanup concern is also source-backed: temporary cleanup precedes `published = true`, so an exception there can enter failed-stage removal after publication (`src/services/mcpSetupService.ts:207–218`). Both label this a code-path risk, not an observed failure.

## Frozen-rubric interpretation and verification limits

No criterion or score scale changed. H1.C8 permits alternative consumer tests but still requires the delegation/reset/consumer regression relationships. H2.C9 uses its explicit preparation/publication-failure/safe-retry minimum, not exhaustive test-name recall. The same interpretations were applied to X and Y.

Read-only checks covered the consequential regression assertions, stable-key overlay/cache/save behavior, wrapper refresh and MCP consumer merge, setup/audit gates, failed-stage cleanup and publication order in this snapshot. No method labels or source outside the permitted snapshot contributed to factual scoring.
