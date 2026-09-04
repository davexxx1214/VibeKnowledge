# Anonymous r3 held-out grades — pair 1

Frozen rubric and this run's source snapshot only. No mapping, arm, brief, observation, metric or other evaluation result was used. No tests were run.

## Totals

| Candidate | Visualization critical | Instructions critical | Total critical | Supplemental | Major false claims |
| --- | ---: | ---: | ---: | ---: | ---: |
| X | 9/9 | 8/8 | **17/17** | **3/3** | 0 |
| Y | 9/9 | 8/8 | **17/17** | **3/3** | 0 |

No material frozen-item deductions. Scores measure the finite checklist, not answer length or a guarantee that every extra assertion is precise. [grades.json](grades.json) contains item rationales and source evidence.

## visualization

| Item | X | Y | Candidate evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — Command/host dependencies and retained single-panel lifecycle | 1 | 1 | X:9–13; Y:9–15 | `src/extension.ts:643` |
| C2 — Independent selected group, key state, fallback and empty state | 1 | 1 | X:17–19, 51, 57, 61; Y:19–21, 56 | `src/ui/webview/graphView.ts:456` |
| C3 — On-demand transient structural view and error boundary | 1 | 1 | X:21, 58, 69; Y:23–25, 34, 55 | `src/ui/webview/graphView.ts:324` |
| C4 — Low-default machine/global performance authority | 1 | 1 | X:36, 51, 60; Y:38, 57 | `package.json:325` |
| C5 — Optimistic mode, host persistence acknowledgement and rollback | 1 | 1 | X:36, 75; Y:38, 68 | `src/ui/webview/graphView.ts:309` |
| C6 — Bounded low layout/drag versus high animation/physics | 1 | 1 | X:40–47; Y:40–46 | `src/ui/webview/graphPerformanceScript.ts:48` |
| C7 — Replacement/hidden/unload rendering-work lifecycle | 1 | 1 | X:55, 59, 65, 69; Y:52, 54, 57, 59 | `src/ui/webview/graphView.ts:1254` |
| C8 — Group/topology-aware geometry cache and document lifetime | 1 | 1 | X:51, 55–60; Y:52–57 | `src/ui/webview/graphPerformanceScript.ts:7` |
| C9 — Settings, layout-lifecycle and cache regression families | 1 | 1 | X:73–77, 82; Y:67–70, 75 | `src/ui/webview/graphView.test.ts:79` |
| S1 — Unfinished alpha/settled/auto-fit state survives revisits | 1 | 1 | X:55–56, 65, 77; Y:46, 52, 70 | `src/ui/webview/graphPerformanceScript.ts:24` |
| S2 — Bounded geometry admission and LRU eviction | 1 | 1 | X:47, 56, 77; Y:53, 70 | `src/ui/webview/graphPerformanceScript.ts:24` |

No required causal omission. Both reports distinguish actual behavior, inferred risk, existing test assertions and untested end-to-end behavior.

## instructions

| Item | X | Y | Candidate evidence | Source anchor |
| --- | ---: | ---: | --- | --- |
| C1 — Contributed command, first workspace, writer and returned-path actions | 1 | 1 | X:88–94; Y:9, 81–87 | `src/extension.ts:680` |
| C2 — Real caller precollection but ignored writer GraphData | 1 | 1 | X:90, 101–102, 110; Y:83, 94–95, 101 | `src/ui/commands/entityCommands.ts:43` |
| C3 — Destination, direct overwrite and nontransactional failure | 1 | 1 | X:92, 125–129; Y:85, 112–120 | `src/services/aiIntegrationService.ts:71` |
| C4 — Fixed English compact active builder, not dormant rich/template paths | 1 | 1 | X:92, 103–108; Y:85, 96–102, 106 | `src/services/aiIntegrationService.ts:404` |
| C5 — Conditional focused query, bounded fallback and source verification | 1 | 1 | X:133, 149; Y:126 | `src/services/aiIntegrationService.ts:435` |
| C6 — Writing instructions is not executing downstream tools or creating graph artifacts | 1 | 1 | X:106, 135; Y:99, 128 | `src/services/aiIntegrationService.ts:71` |
| C7 — Shared Cursor builder and sequential partial-failure batch impact | 1 | 1 | X:114–121, 129; Y:105–108, 120 | `src/services/aiIntegrationService.ts:89` |
| C8 — Copilot/ Cursor compact-router tests and unproved integration variants | 1 | 1 | X:141–147; Y:134–147 | `src/services/aiIntegrationService.test.ts:68` |
| S1 — Post-write presentation failure differs from file completion | 1 | 1 | X:94, 127, 129; Y:87, 114, 119 | `src/ui/commands/entityCommands.ts:1269` |

No required causal omission. Both reports distinguish actual behavior, inferred risk, existing test assertions and untested end-to-end behavior.

## Major claims and consequential audit

No major false claims identified. Both accurately separate transient structural views, global mode preferences, serialized selection and document-memory geometry. Both describe bounded low-mode work, lifecycle cleanup and geometry admission rather than guaranteeing performance. Both distinguish instruction precollection from ignored content inputs and generated text from tool execution, and explain direct overwrite/partial failure.

Both cover the required settings/layout/cache tests and Copilot/Cursor compact-router tests, including their mocked/service-only limits. Extra navigation, scenario and formatting observations do not earn points.

## Rubric flaw — locale parenthetical (scores unchanged)

The frozen I.C7 phrase “locale-aware there” is imprecise. `buildCursorRulesContent` compares `getLocale()` with `'zh'` (`src/services/aiIntegrationService.ts:101–107`), while `getLocaleCode()` returns `'zh-CN'` or `'en-US'` and `getLocale()` forwards it (`src/i18n/i18nService.ts:126–149`). Therefore the currently reachable Cursor writer also chooses English.

Y:106 explicitly identifies this mismatch correctly. X:105 says Cursor “supplies a localized title/language,” which describes the apparent branch but overstates effective localization; X still correctly states Copilot is English and traces the shared helper plus both sequential bulk routes. This incidental phrasing does not invalidate the core I.C7 relationship and is not a major Copilot-language/routing error. It is recorded without retroactively changing the frozen rubric or adding bonus points.

All source references are relative to `.vscode-test/feature-r3-heldout-1-k4B58P/snapshot`; report line numbers refer to its sibling anonymous candidate files.
