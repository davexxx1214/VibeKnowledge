# Anonymous held-out grades — r1

Graded only the frozen [held-out rubric](../rubric-heldout.md), the two candidate reports, and `.vscode-test/feature-heldout-r1-GO62UG/snapshot`. No methods, arm directories, metrics, observations or generation material were used; no tests were run.

## Totals

| Candidate | H1 critical | H2 critical | Total critical | Supplemental | Major false claims |
| --- | ---: | ---: | ---: | ---: | ---: |
| X | 7.5/8 | 9/9 | **16.5/17** | **3/3** | 0 |
| Y | 7.5/8 | 9/9 | **16.5/17** | **3/3** | 0 |

The deductions are missing regression evidence, not false descriptions of implementation. Critical and supplemental scores remain separate. [grades.json](grades.json) includes every item’s rationale and source anchors.

## Per-item scores

Report evidence gives candidate line numbers. Source anchors are relative to the frozen snapshot. `C` is critical; `S` is supplemental.

### H1 — Entity descriptions

X: critical 7.5/8, supplemental 2/2. Y: critical 7.5/8, supplemental 2/2.

| Item / required causal relationship | X | Y | Report evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — UI edit/reset route, cancellation and empty input | 1 | 1 | X:9–10, 16; Y:9, 11 | `src/ui/commands/entityCommands.ts:225` |
| C2 — Stable-key durable SQL overlay, not generated JSON editing | 1 | 1 | X:10; Y:11, 13 | `src/services/agentGraph/agentEntityOverrideService.ts:47` |
| C3 — Cross-group workspace scope and latest-generated reset | 1 | 1 | X:11–12; Y:15, 39 | `src/services/agentGraph/agentGraphService.ts:143` |
| C4 — Explicit refresh versus manifest-signature caching | 1 | 1 | X:16, 31; Y:11, 28, 36 | `src/services/agentGraph/agentGraphService.ts:108` |
| C5 — Tree/GraphView/CodeLens invalidation and pull consumers | 1 | 1 | X:16, 20–23; Y:21–24, 28 | `src/extension.ts:548` |
| C6 — MCP read-side overlay affects descriptions and search | 1 | 1 | X:24, 31; Y:25, 36 | `packages/mcp-server/src/mergedGraph.ts:26` |
| C7 — Nullable/malformed input and nontransactional save failures | 1 | 1 | X:28–31; Y:11, 32–33, 36 | `src/services/agentGraph/agentGraphService.ts:148` |
| C8 — Delegation, regeneration/reset and consumer regression coverage | 0.5 | 0.5 | X:11–12, 24; Y:39 | `src/services/knowledgeGraphService.test.ts:131` |
| S1 — Exact-first and unambiguous case-safe identity fallback | 1 | 1 | X:12, 24, 29; Y:13, 34, 39 | `src/services/agentGraph/agentEntityOverrideService.ts:22` |
| S2 — Reset success ignores result; normal no-op returns still refresh | 1 | 1 | X:9, 16, 28; Y:28, 32 | `src/ui/commands/entityCommands.ts:248` |

Both reports omit a regression test of the edit/reset service-delegation handoff. X maps regeneration/reset plus MCP search tests; Y maps regeneration/reset plus a valid CLI overlay consumer test, so both receive 0.5 for C8.

### H2 — MCP setup

X: critical 9/9, supplemental 1/1. Y: critical 9/9, supplemental 1/1.

| Item / required causal relationship | X | Y | Report evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — Early shared registration, trust, overlap and abort gating | 1 | 1 | X:38, 42; Y:45, 47, 62 | `src/extension.ts:36` |
| C2 — Configured/local workspace, client, confirmation and validation | 1 | 1 | X:39–40; Y:47 | `src/commands/mcpSetupCommands.ts:23` |
| C3 — Resolved external Node and npm/runtime environment consistency | 1 | 1 | X:40, 49; Y:53, 57 | `src/services/mcpSetupService.ts:91` |
| C4 — Isolated install, audit, database, health, then publication | 1 | 1 | X:40–41, 44, 50; Y:51, 54–56, 68 | `src/commands/mcpSetupCommands.ts:64` |
| C5 — Shell-free child arguments, bounded errors and cancellation | 1 | 1 | X:42; Y:62 | `src/services/mcpSetupService.ts:37` |
| C6 — Client-specific scoped JSONC publication, backup and conflict check | 1 | 1 | X:39, 49; Y:57–58, 66 | `src/services/mcpSetupService.ts:118` |
| C7 — Failed-stage cleanup, fresh retry and manual client start | 1 | 1 | X:42, 49–52; Y:58, 62, 64 | `src/services/mcpSetupService.ts:213` |
| C8 — Bounded fail-closed audit retries, distinct from whole setup | 1 | 1 | X:48, 51; Y:55, 64 | `scripts/audit-dependencies.cjs:3` |
| C9 — Preparation/publication-failure/safe-retry tests and mocked limits | 1 | 1 | X:44, 48, 51; Y:70 | `tests/mcpSetup.test.ts:82` |
| S1 — Preservation is not a transaction or cross-process lock | 1 | 1 | X:52; Y:64, 66 | `src/commands/mcpSetupCommands.ts:52` |

No required causal omission was identified under the frozen minimum. The reports connect preparation failures to protected config and failed-stage cleanup, distinguish fresh setup from bounded audit retries, and qualify mocked health evidence.

## Consequential grading judgments

- **X H1.C8 = 0.5** (candidate-X.md:24): Consumer plus regeneration tests are credited, but there is no identified test of KnowledgeGraphService's edit/reset delegation. Source explanation of delegation at X:10 is not regression evidence. Evidence: `src/services/knowledgeGraphService.test.ts:131`, `src/services/agentGraph/agentGraphService.test.ts:393`, `packages/mcp-server/tests/mergedGraph.test.ts:77`.
- **Y H1.C8 = 0.5** (candidate-Y.md:39): Regeneration/reset and the CLI human-prose consumer test are valid; the service-delegation regression remains absent. Evidence: `src/services/knowledgeGraphService.test.ts:131`, `tests/querySkill.test.ts:86`.
- **X H2.C9 = 1** (candidate-X.md:44, 48, 51): Preparation gates, failure preservation/cleanup and concurrent/process tests are causally mapped. Not naming every UI or dedicated audit test does not defeat the explicit frozen minimum. Evidence: `tests/mcpSetup.test.ts:82`, `tests/mcpSetup.test.ts:110`, `tests/mcpSetup.test.ts:140`, `tests/mcpSetup.test.ts:167`.

## Major false-claim audit

**None identified.** All required behavior claims were evaluated independently of self-described method.

- Description edits are correctly treated as workspace stable-key SQL overlays, not generated-graph changes. Empty manual prose, per-group latest-generated reset, manifest-only cache signatures and read-side MCP merging are distinguished correctly.
- Save exceptions are not presented as atomic rollback, reset success is not presented as proof of a non-null result, and fresh SQL reads are not presented as a universal cross-process visibility guarantee.
- Setup targets the selected/configured workspace using the resolved external runtime. Audit/health gates precede config publication; old installs and unrelated config are preserved at the stated preparation boundaries, without a universal transaction claim.
- The reported absent health-check helper is confirmed in both frozen snapshots. The setup invocation and intended gate are observable; its actual protocol assertions or live connection success are not. Qualifying that missing source is correct, not a deduction.
- The post-rename cleanup concern is supported: temporary cleanup precedes `published = true`, so a cleanup exception can trigger failed-stage removal after the config rename (`src/services/mcpSetupService.ts:207–218`). It is described as a code-path risk, not a reproduced failure.

## Frozen-rubric interpretation and verification limits

No rubric criterion or score scale was changed. H1.C8 explicitly requires delegation/reset/consumer regression relationships; its “such as” consumer examples allow a directly relevant CLI test. H2.C9 explicitly requires risk-linked examples, not exhaustive recall of its listed UI/runtime/audit test names; that same minimum was applied to both candidates and both pairs.

Relevant source/test bytes across the two snapshots were checked for equality. Read-only checks confirmed the key identity/cache/save behavior, command/reset semantics, process gates, audit limits, publication cleanup, and consequential test assertions. Test inspection does not establish end-to-end editor refresh, atomic database persistence, a successful build, or a live external client connection.
