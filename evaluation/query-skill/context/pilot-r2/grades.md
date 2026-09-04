# Anonymous development grades — pilot r2

Graded only the frozen [development rubric](../rubric-development.md), using candidate P/Q reports and the source snapshot at `.vscode-test/feature-pilot-r2-qyxAf5/snapshot`. Process labels, length, extra filenames and unrelated details did not contribute to scores. No tests, builds or installations were run.

## Totals

| Candidate | Task 1 critical | Task 2 critical | Task 3 critical | Total critical | Supplemental | Major false claims |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| P | 7/7 | 8/8 | 9/9 | **24/24** | **4/4** | 0 |
| Q | 6.5/7 | 7/8 | 9/9 | **22.5/24** | **3.5/4** | 0 |

P has full coverage under this finite rubric. Q's deductions are omissions, not incorrect claims; supplemental coverage does not compensate for them. The machine-readable [grades.json](grades.json) records every item, score, evidence anchor and rationale.

## Per-item scores

`C` denotes critical, `S` supplemental. Scores are 1, 0.5 or 0. Candidate evidence refers to line numbers in the input reports, not source lines. Source anchors are relative to the frozen snapshot. Whole-report explanations count where connected; repeating lifecycle details in task 2 was not required.

### T1 — Default delay and disposal

P: critical 7/7, supplemental 1/1. Q: critical 6.5/7, supplemental 1/1.

| Item / causal requirement | P | Q | Report evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — Default delay | 1 | 1 | P: 7; Q: 7, 15 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.ts:12` |
| C2 — Pending paths versus serialized, captured batches | 1 | 1 | P: 8, 10–11; Q: 7–8 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.ts:31` |
| C3 — Disposal drops unflushed paths and timer | 1 | 1 | P: 9; Q: 8 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.ts:49` |
| C4 — Already-chained callbacks survive disposal | 1 | 1 | P: 10; Q: 8 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.ts:43` |
| C5 — Disposal neither aborts nor awaits active callbacks | 1 | 0.5 | P: 10; Q: 8 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.ts:49` |
| C6 — Post-disposal notify and flush contract | 1 | 1 | P: 9–10; Q: 8 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.ts:17` |
| C7 — Existing debounce/serialization tests and disposal/default gaps | 1 | 1 | P: 11; Q: 9 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.test.ts:9` |
| S1 — Trailing debounce, deduplication, sort and predecessor rejection recovery | 1 | 1 | P: 7–8; Q: 7 | `src/services/structuralGraph/debouncedStructuralGraphUpdater.ts:21` |

P has no required omission. Q correctly explains that active callbacks continue, but does not state the separate contract that `dispose(): void` returns without awaiting their completion; C5 receives 0.5.

### T2 — Background structural refresh

P: critical 8/8, supplemental 2/2. Q: critical 7/8, supplemental 1.5/2.

| Item / causal requirement | P | Q | Report evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — First-root source/config events, normalization and filtering | 1 | 1 | P: 17; Q: 15–16 | `src/extension.ts:205` |
| C2 — 500 ms serial scheduler and disposal boundary | 1 | 1 | P: 7–11, 17–18; Q: 7–9, 15–16, 23 | `src/extension.ts:184` |
| C3 — Existence gate, log-only changed paths, no force/retry | 1 | 1 | P: 18–19, 26; Q: 15, 17, 21 | `src/extension.ts:185` |
| C4 — Synchronous extractor ownership and structural/cache artifacts | 1 | 1 | P: 18–20; Q: 17 | `src/services/structuralGraph/structuralGraphService.ts:82` |
| C5 — Protected failures preserve potentially stale output; manual force | 1 | 1 | P: 26–30; Q: 21–23 | `resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs:2226` |
| C6 — GraphView and MCP structural read-side handoff, including previous diff | 1 | 0.5 | P: 21, 29–30; Q: 27 | `packages/mcp-server/src/tools/registerStructuralAnalysisTools.ts:48` |
| C7 — Curation and agent-watcher/UI refresh are separate | 1 | 1 | P: 22, 29; Q: 28–30 | `src/extension.ts:266` |
| C8 — Scheduling, incremental and protected-failure/source-hash regression mapping | 1 | 0.5 | P: 34–38; Q: 34–36 | `src/services/structuralGraph/structuralGraphCli.test.ts:48` |
| S1 — Compatible cache and transitive reverse-dependency/deletion planning | 1 | 0.5 | P: 20, 35–36; Q: 17, 21, 34 | `resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs:1990` |
| S2 — Meaningful previous snapshot and per-file, nontransactional publication | 1 | 1 | P: 27, 35; Q: 22, 34 | `resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs:2189` |

P has no required omission. Q omits the MCP structural-tool-to-store consumer link and a source-hash freshness regression; its supplemental incremental explanation also stops short of explaining transitive reverse-dependency invalidation, despite naming importer/deletion/rename tests.

### T3 — Query Skill installation directory

P: critical 9/9, supplemental 1/1. Q: critical 9/9, supplemental 1/1.

| Item / causal requirement | P | Q | Report evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — Manifest/shared installer registration and returned-path opening | 1 | 1 | P: 44–46; Q: 42, 52 | `src/extension.ts:843` |
| C2 — Authoring, built source and workspace installation paths | 1 | 1 | P: 45, 51–52; Q: 46–50, 58 | `src/services/agentSkillService.ts:15` |
| C3 — Shared helper affects both Skills, detection, copy and opening | 1 | 1 | P: 45, 47, 52; Q: 52–53, 58 | `src/services/agentSkillService.ts:23` |
| C4 — Existence/partial-install detection, overwrite, cancellation and no migration | 1 | 1 | P: 46–47, 63; Q: 52–53, 70 | `src/services/agentSkillService.ts:36` |
| C5 — Required SKILL/runtime and recursive complete-bundle copying | 1 | 1 | P: 46, 51, 57, 63; Q: 52, 58, 64, 70 | `src/services/agentSkillService.ts:40` |
| C6 — CLI entry, build, prepublish and packaged built assets | 1 | 1 | P: 51–52; Q: 46, 58 | `scripts/build-query-skill.cjs:5` |
| C7 — MCP setup is a separate global-storage/client-config workflow | 1 | 1 | P: 57–59, 65; Q: 64, 66, 72 | `src/commands/mcpSetupCommands.ts:64` |
| C8 — Independent query installation reads artifacts, not graph generation | 1 | 1 | P: 44, 53, 57–59, 63–64; Q: 60, 64, 66, 70–71 | `src/services/agentSkillService.test.ts:42` |
| C9 — Installer, copied-runtime and no-artifact regression mapping | 1 | 1 | P: 63–65; Q: 70–72 | `tests/querySkill.test.ts:22` |
| S1 — Portable Node 26 CJS bundle, dependency guard and copied-runtime tests | 1 | 1 | P: 51, 64; Q: 58, 71 | `scripts/build-query-skill.cjs:8` |

Neither candidate has a required omission. Both preserve the source-versus-target, shared-helper, portable-bundle, MCP-setup and graph-generation distinctions, and do not present service/runtime tests as UI or packaged-VSIX proof.

## Partial-credit evidence and consequential judgments

- **Q T1.C5 (0.5):** “an already running callback continues” (Q:8) correctly rules out abortion. It does not say disposal returns without waiting; `debouncedStructuralGraphUpdater.ts:49` is a synchronous `void` method that only clears state/timer. This is the most interpretation-sensitive deduction: the cited source permits a reader to infer the missing contract, but the rubric asks for a causal explanation, not only a citation.
- **Q T2.C6 (0.5):** Q:27 accurately traces GraphView and CLI `context`, `impact`, `structural-path`, `structure` and previous-snapshot diff. The required MCP analysis/impact/path read-side is not connected to the store anywhere in the report; MCP setup later in Q:64 is a different route. The absent link is implemented in `packages/mcp-server/src/tools/registerStructuralAnalysisTools.ts:48`, `:70`, `:97`. A source filename inside `packages/mcp-server` does not by itself explain MCP tool routing.
- **Q T2.C8 (0.5):** Q:34–36 maps scheduling, incremental and protected recovery tests well, but does not identify `src/services/structuralGraph/structuralGraphCli.test.ts:48` or another source-hash freshness test. That test modifies source and expects validation to fail with a content-hash mismatch at lines 69–72. Agent cache/description tests are not equivalent coverage.
- **Q T2.S1 (0.5):** Q:17 explains an affected set/second pass and Q:34 names importer closure/deletion/rename tests, but never explains the transitive reverse-dependency mechanism or its consequences for a notified-files-only change. `structural-extractor.mjs:1990` seeds changed/deleted files, and `:2016–2041` registers old/current reverse dependencies and walks the transitive closure. P:20 does explain that mechanism.

## Major false-claim audit

**No major false claims identified in either report.** In particular:

- Both correctly distinguish timer-pending paths from callbacks already appended to the promise chain; neither claims cancellation or draining on disposal.
- Q:27 explicitly uses `structural-path`, not plain `path`. `queryCli.ts:70–100` confirms the cited raw-structural routing. P:21's general statement that the CLI also consumes snapshots is not a claim that every command uses the structural store.
- P:19's “`.previous.json`” is treated as suffix shorthand for the structural graph's previous snapshot, not a materially false literal filename. Both connect previous-snapshot publication to structural changes, and both reject a multi-file rollback guarantee.
- Both distinguish MCP setup from query Skill copying and from structural generation. Q:64's compact list of checks is not treated as a rigid claim that the health check precedes optional database initialization.
- Additional assertions about context-specific implementation were not needed for rubric credit and were not independently inspected. Neither report received extra credit for those assertions or for extra UI/cache details.

## Rubric concerns, kept separate from scores

No criterion was changed after reading the candidates.

1. T1.C5 bundles non-abortion and non-awaiting. Q explicitly explains only the former; the frozen 0.5 rule was applied. An audit may reasonably focus on whether its wording and source reference implicitly communicate the latter, rather than treating this as a factual dispute.
2. T2.C6 specifically requires MCP consumers as well as GraphView. Q offers a correct CLI-to-the-same-store trace, but that does not fulfill the named MCP link under the frozen criterion. This is a limitation of the rubric's chosen coverage, not a false CLI routing claim.

All consequential partial scores and their evidence are retained in the JSON for independent audit.
