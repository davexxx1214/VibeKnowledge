# Development pilot r1 — anonymous rubric grades

Graded only the frozen development rubric at `.vscode-test/task-context-ab-9W8uP7/rubric.md`, using the supplied X/Y reports and disputed-claim checks against `.vscode-test/task-context-ab-9W8uP7/snapshot`. No arm directories, observations, metrics, or method artifacts were inspected; self-labels/process descriptions inside reports were ignored. No production changes or tests were run.

## Totals

| Candidate | T1 critical | T2 critical | T3 critical | Total critical | Supplemental | Major false claims |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| X | 7/7 | 8/8 | 9/9 | 24/24 | 4/4 | 0 |
| Y | 7/7 | 7/8 | 9/9 | 23/24 | 4/4 | 1 |

The entire difference is Y-T2-M1 below. Both reports cover the checklist comprehensively; no length or method preference was applied. Supplemental points do not offset critical errors. X has no identified major false claim; Y's fully-correct verdict is withheld under the literal command-name reading, which should receive independent audit.

## Item scores

Scores use the frozen 0 / 0.5 / 1 scale. Candidate evidence numbers refer to lines in the named report, not source files. Each rationale covers the causal fact, not merely a matching filename. Complete machine-readable item records are in `grades.json`.

### T1

| Item | X | Y | X report lines | Y report lines | Basis |
| --- | ---: | ---: | --- | --- | --- |
| C1 Default delay | 1 | 1 | 7 | 7 | Correct 500 ms default; explicit production value is extra context. |
| C2 Already-chained versus unflushed work | 1 | 1 | 7, 9, 11 | 7, 9, 11 | Explains snapshot/clear, Promise chaining and serialization. |
| C3 Pending paths and timer discarded | 1 | 1 | 9 | 9 | Correctly limits disposal of unflushed work. |
| C4 Already-chained callback survives disposal | 1 | 1 | 9 | 9 | Explicitly includes callbacks not started yet and the missing disposed check. |
| C5 Running callback not aborted or awaited | 1 | 1 | 9 | 9 | Explicit non-abort/non-await lifecycle explanation. |
| C6 Calls after disposal | 1 | 1 | 9 | 9 | notify is ignored; flush returns existing running Promise without scheduling. |
| C7 Existing tests and coverage limits | 1 | 1 | 11 | 11 | Maps both tests to custom-delay/coalescing/serialization; identifies missing lifecycle/default checks. |
| S1 Batch ordering and rejection recovery | 1 | 1 | 7 | 7 | Explains trailing reset, deduplication, sorting and recovery from earlier rejection. |

Omissions: X — No material omission under the frozen checklist. Y — No material omission under the frozen checklist.

### T2

| Item | X | Y | X report lines | Y report lines | Basis |
| --- | ---: | ---: | --- | --- | --- |
| C1 Watcher registration and filters | 1 | 1 | 17 | 17 | Correct first-root watcher types, create/change/delete route, normalization, filtering and subscriptions. |
| C2 Scheduling and lifecycle boundary | 1 | 1 | 7, 9, 17, 18 | 7, 9, 17, 19 | Explicit production delay and established debounce/serialization/disposal mechanics connect to subscribed updater. |
| C3 Background callback policy | 1 | 1 | 18, 26 | 19, 27 | No bootstrap, changed paths only logged, no force or automatic retry; existence gate explained. |
| C4 Generation owner and persisted artifacts | 1 | 1 | 19, 20 | 19, 21, 23 | Correct synchronous service-to-extractor delegation, output/cache and internally computed changes. |
| C5 Safety versus staleness | 1 | 1 | 26, 27, 29 | 27, 30 | Protected graph/cache/source/shrink failures, retained stale snapshots and explicit modal force recovery distinguished. |
| C6 Direct structural consumers | 1 | 0 | 29, 33 | 23, 27, 29 | Both describe the direct readers; Y also assigns plain CLI path to the raw snapshot. See Y-T2-M1. |
| C7 Curated/UI freshness boundary | 1 | 1 | 35 | 29 | Separates curation/agent-graph watcher from raw background generation; explains idle-view staleness. |
| C8 Regression tests mapped to risks | 1 | 1 | 11, 39, 40, 42, 43, 45 | 11, 34, 36 | Maps scheduling, incremental/deletion/rename, guarded failures and staleness; does not claim end-to-end watcher coverage. |
| S1 Cache compatibility and importer closure | 1 | 1 | 20, 40 | 21, 34 | Describes compatible reuse and old/current reverse dependencies; includes deletion/rename consequences. |
| S2 Per-file publication and previous identity | 1 | 1 | 28 | 23, 28 | Correct write order, no multi-file transaction, late I/O failure and structural-not-time snapshot rotation. |

Omissions: X — No material omission under the frozen checklist. Y — No core coverage omission; replace the unqualified CLI path label with structural-path to avoid assigning the curated path query to raw structural refresh.

### T3

| Item | X | Y | X report lines | Y report lines | Basis |
| --- | ---: | ---: | --- | --- | --- |
| C1 Command-to-installer registration | 1 | 1 | 51 | 42 | Contributed command/menu, query-specific service construction and returned-file opening traced. |
| C2 Authoring, built source and installed target | 1 | 1 | 55, 56, 57, 58, 59, 65 | 48, 49, 50, 52, 54 | Correctly separates all path roles and returned SKILL.md. |
| C3 Shared target helper scope | 1 | 1 | 59, 61, 65 | 52, 56 | Explains why an unconditional helper edit moves both Skills and does not require relocating bundle sources. |
| C4 Detection, overwrite and relocation consequences | 1 | 1 | 51, 61, 79 | 42, 52, 56, 66 | Directory-based detection/update/cancel/open chain and absent old-location migration explained; partial installation acknowledged. |
| C5 Complete bundle contract | 1 | 1 | 61, 71, 79 | 52, 60, 66 | Requires SKILL.md plus query.cjs, recursively copies complete built assets and rejects incomplete bundles; no install-time build. |
| C6 Build and packaging chain | 1 | 1 | 55, 56, 65 | 54 | Correct resource-copy and CLI bundle entry, esbuild/prepublish integration and raw-source packaging exclusions. |
| C7 MCP setup separation | 1 | 1 | 73, 75, 81 | 62, 68 | Separate registration, dist/mcp-server, global-storage installs, dependency/audit/health/config stages and no graph regeneration. |
| C8 Query copy versus graph generation | 1 | 1 | 71, 75, 79, 80 | 60, 66, 67 | Independent query installation and read-only existing-artifact behavior distinguished from generation tooling/commands. |
| C9 Installation/portability regressions and gaps | 1 | 1 | 79, 80, 81, 83 | 66, 67, 68 | Connects service path/overwrite/partial tests and copied runtime/read-only tests; distinguishes MCP and untested VSIX/UI contracts. |
| S1 Portable runtime boundaries | 1 | 1 | 65, 80 | 54, 67 | CJS Node 26/root Zod/forbidden dependencies/licenses and copied no-node_modules Unicode/space portability covered. |

Omissions: X — No material omission under the frozen checklist. Y — No material omission under the frozen checklist.

## Major false-claim audit

### Y-T2-M1 — Plain CLI path assigned to raw structural data

Candidate quote (`candidate-Y.md:23`):

> CLI context/impact/path/structure and MCP structural-analysis tools also read it; diff reads the previous snapshot.

Read literally as the named CLI commands, this routes plain path to the raw structural snapshot. The raw command is structural-path; plain path uses the AgentGraphStore-backed engine. This can misidentify which consumer becomes current after background structural refresh.

- `packages/mcp-server/src/queryCli.ts:74`: Only impact, structural-path and structure enter this raw structural branch.
- `packages/mcp-server/src/queryCli.ts:97`: The remaining commands use AgentGraphStore and require agent-graph.json.
- `packages/mcp-server/src/queryCli.ts:125`: Plain path invokes shortestPath on the AgentGraphStore-backed engine.

Scoring: T2 C6 = 0, applying the frozen rule for a materially wrong/contradicted causal item. This is a factual correction, not an added requirement that candidates enumerate CLI commands. All other T2 facts, including the raw/curated UI separation, retain credit.

Audit sensitivity: The word path is not backticked and may have been intended as shorthand for structural-path. This grader reads the slash-delimited CLI list literally because path is itself a distinct real command. The rest of Y's raw/curated explanation is correct. This single literal-versus-shorthand decision accounts for the entire score difference and major-claim flag.

## Consistent interpretations and rubric flaws

- A report is read as a whole: already-established lifecycle facts and tests can support a later task's mapping without repetition. Tasks retain independent item scores and totals.
- Equivalent source-backed test evidence is accepted. Y's taskContext.test.ts:54 staleness test is accepted for T2 C8 instead of requiring the rubric's exact structural CLI test citation.
- Exact prose and every reference anchor are not required. X's MCP description identifies client-config publication causally without spelling both mcp.json filenames; this does not reduce T3 C7.

These rubric issues are reported separately; neither rubric nor weights were retroactively changed:

- **R1:** Several nominally independent items bundle multiple subfacts and overlap other items; particularly T2 C2 reuses T1 lifecycle content. The rubric does not specify whether cross-section evidence counts. Applied one whole-report evidence policy to both candidates; no new requirement to repeat facts or point weights added.
- **R2:** The rubric gives no operational severity threshold for imprecise extra consumer names, and T2 C6's required examples are GraphView/MCP rather than CLI command spelling. Used the existing zero-for-material-error rule for Y's actual CLI data-source claim and recorded the literal-versus-shorthand ambiguity for independent audit; did not add a CLI coverage requirement.
- **R3:** T2 C8's at-minimum named test list could be read as exact-test matching despite the global allowance for alternative evidence. Accepted Y's independently source-checked stale-file test as equivalent staleness evidence, retaining full C8 credit.

The source check for Y's alternative staleness test confirmed assertions for a changed file outside the selected slice and withholding changed-file snippets (`tests/taskContext.test.ts:54`). Its omission of the exact structural-CLI test filename is therefore not a deduction.
