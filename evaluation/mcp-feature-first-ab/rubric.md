# Hidden held-out rubric — visualization and Copilot Instructions

Frozen independently from ordinary implementation and regression-test source in
`D:/workspace/VibeKnowledge/.vscode-test/task-context-ab-9W8uP7/snapshot`.
All source anchors below are relative to that snapshot. No new candidate,
brief, observation, metric, mapping, or generation material was inspected to
design these tasks. Existing evaluation scores are not evidence for any
criterion. No production files were changed and no tested code was run.

Public tasks: `tasks-heldout.md`, phases `visualization` and `instructions`.
Keep this rubric withheld from generators and candidates.

## Scoring rules

- Score each item independently: **1** = correct causal explanation with traceable
  source/test evidence; **0.5** = materially incomplete relationship or evidence;
  **0** = absent, materially wrong, or contradicted elsewhere in the report.
  Equivalent phrasing and alternative valid anchors count. Do not require every
  example, source line, numeric constant, or incidental implementation detail
  listed under an item.
- Critical and supplemental coverage are separate. Supplemental facts cannot
  compensate for a missing critical fact. There are **17 critical items**
  (V: 9, I: 8) and **3 supplemental items** (V: 2, I: 1).
- Require the specified causal relationships, not keywords, file inventories,
  generic warnings, answer length, or speculative improvements. Whole-report
  evidence counts where connected; repetition is unnecessary.
- Record each major false claim separately with a report quotation and
  contradictory source. An omission is not a false claim. A proposal is not a
  claim about current behavior. Harmless shorthand is not a routing error.
  Any major false claim precludes a fully correct/safe verdict.
- Relevant tests must be connected to their behavior. Read-only candidates need
  not run tests and receive no execution credit from unsupported assertions.
  Distinguish tests of shipped helper logic or mocked host integration from a
  real D3/browser/VS Code or external-assistant end-to-end test.
- Do not infer a candidate's method or use its self-label to score. Report any
  rubric ambiguity separately; do not retroactively change criteria.

## Task V — Page views, groups, performance and state

Critical: 9 items. Supplemental: 2 items.

1. **C1 — Command, host dependencies and page lifecycle.**
   `knowledge.visualizeGraph` reaches `GraphView.createOrShow`; activation injects
   KnowledgeGraphService and StructuralGraphService. The host owns one current
   panel, retains its context when hidden, and on browser `ready` sends settings
   plus group data. Reinvoking an existing same-title panel reveals it and sends
   data instead of unconditionally replacing its HTML. Connect host-supplied
   models/messages to browser rendering; this is not one new graph window or a
   fresh browser document per command.
   Evidence: `package.json:57`, `src/extension.ts:242`, `src/extension.ts:643`,
   `src/ui/webview/graphView.ts:157`, `:174`, `:199`, `:205`, `:263`.
   The title/locale-change rebuild exception is valid context, not an extra
   mandatory detail.

2. **C2 — Independent group selection and its stored state.**
   Host collection uses `KnowledgeGraphService.getGroups()` to send independent
   group models, not one aggregate graph rendered all at once. The client sorts
   groups by order/name, selects the remembered key if present or the first
   group otherwise, and renders only the selected group. It stores
   `selectedGroupKey` through VS Code webview state; that is distinct from the
   machine performance setting and from persisting layouts into project files.
   An empty group list stops/clears the graph and shows the empty state.
   Evidence: `src/ui/webview/graphView.ts:456`, `:1149`, `:1372`, `:1423`,
   `:1449`, `:1479`. Do not require exact sort syntax.

3. **C3 — Advanced structural view is an on-demand, transient page view.**
   The toolbar level and explicit open action send
   `requestStructuralOverview`; the host reads existing structural data,
   aggregates it at the selected boundary/community/file level, and returns a
   `structuralGroup`. The client replaces any earlier `__structural_` temporary
   group and selects the new one; it does not save a curated group or generate
   source artifacts. A later ordinary group-data replacement need not retain
   that transient view. Missing/read/aggregation errors produce structural
   status/warning feedback instead of silently building a graph.
   Evidence: `src/ui/webview/graphView.ts:223`, `:324`, `:446`, `:1097`,
   `:1287`, `:1372`, `:1401`, `:2091`.
   The overview's 80-item limit is useful context but not required. No complete
   structural-extractor or background-refresh trace is required.

4. **C4 — Performance preference scope and actual authority.**
   `knowledgeGraph.visualization.performanceMode` has low/high values, defaults
   to low, and is a machine-scoped preference saved with
   `ConfigurationTarget.Global`. The host rereads it for initialization,
   acknowledgement and Settings changes; selecting high is not a project
   graph mutation, a per-group setting, or a persisted geometry choice.
   Evidence: `package.json:325`, `src/ui/webview/graphView.ts:150`, `:300`,
   `:309`, `:1091`, `:1140`.

5. **C5 — Optimistic selector/host acknowledgement and failed-save recovery.**
   The browser applies the chosen mode immediately, disables its selector and
   posts `setPerformanceMode`. The host accepts only low/high, attempts the
   global update, reports errors, and sends the actually stored mode in
   `finally`. Receipt applies that mode and re-enables the selector, so a failed
   save can revert the optimistic display. Mode changes rerender the selected
   group without a wholesale HTML reload; external Settings changes use the
   same host-to-page mode message.
   Evidence: `src/ui/webview/graphView.ts:150`, `:309`, `:1283`, `:2077`,
   `:2176`; `src/ui/webview/graphView.test.ts:96`.
   Full credit needs the round trip and failure consequence, not just “setting
   is persisted.”

6. **C6 — Low/high modes change rendering work, not graph meaning.**
   Both modes use the same selected entities/relations. Low mode disables
   continuous visual effects and drives D3 through short, yielding static
   layout batches until cooling or a finite tick/compute budget; it is neither
   zero layout work nor an endless force loop. It still supports drag: the
   dragged node is updated without restarting the global simulation, whereas
   high-mode drag can restart physics and high mode enables animated effects.
   A settled cached high-mode layout need not keep simulating forever.
   Evidence: `src/ui/webview/graphView.ts:1552`, `:1566`, `:1594`, `:1619`,
   `:1931`, `:1950`; `src/ui/webview/graphPerformanceScript.ts:48`, `:91`.
   Exact 120 ticks / 600 ms accumulated computation / roughly 6 ms batch
   constants are not required and are not a wall-clock responsiveness SLA.

7. **C7 — Hidden/replaced/unloaded page work has explicit lifecycle controls.**
   Rendering a different group stops the preceding static layout, simulation
   and particle loop and saves its geometry before replacing it. Hidden-page
   handling pauses/cancels graph animation work, interrupts transitions and
   clears fit/resize timers; becoming visible resumes unfinished low-mode work
   or still-hot high-mode physics and appropriate particles. Unload stops the
   work; retaining a hidden webview context does not mean graph loops should
   keep running. Tie these controls to avoiding stale/duplicate work, not
   merely “performance is optimized.”
   Evidence: `src/ui/webview/graphView.ts:1234`, `:1254`, `:1272`, `:1479`;
   `src/ui/webview/graphPerformanceScript.ts:77`.
   Claims are about graph rendering work, not every optional page feature.

8. **C8 — Geometry reuse has a topology and lifetime boundary.**
   The in-memory layout cache is keyed by group and validates a topology
   signature of node IDs plus relation endpoints/verbs. It reuses positions
   and zoom for unchanged topology across group revisits, prose updates or
   mode rerenders, but changed topology misses the cache. It does not cache
   source/evidence objects or serialize all geometry via webview state; a new
   document starts a new cache even though the performance preference may
   persist. Connect cache reuse/invalidation to what the user sees.
   Evidence: `src/ui/webview/graphPerformanceScript.ts:7`,
   `src/ui/webview/graphView.ts:1141`, `:1454`, `:1556`, `:1575`;
   `src/ui/webview/graphPerformanceScript.test.ts:105`.

9. **C9 — Regression evidence matches the interaction risks.**
   Map host/page-setting tests to default/persistence/reopen or failed-save
   synchronization (`src/ui/webview/graphView.test.ts:58`, `:79`, `:96`);
   map a layout-execution/lifecycle test to bounded work, hidden/replaced work
   or mode-specific drag (`graphPerformanceScript.test.ts:49`, `:65`, `:81`,
   `:95`, `:142`); and map cache tests to topology/prose or revisit behavior
   (`graphPerformanceScript.test.ts:105`, `:133`). Require those three risk
   families, not every test. These execute emitted helper JavaScript and mocked
   host integration/syntax checks, not a full real-browser group/structural
   selection and rendering test.
   All abbreviated test paths here are under `src/ui/webview/`.

10. **S1 — Unfinished geometry must not become a falsely settled revisit.**
    Cache entries also carry settled state, simulation alpha and auto-fit
    intent. A quick group switch can preserve an unfinished layout so returning
    resumes it instead of freezing its initial positions; user zoom/drag can
    disable automatic fitting. This is richer than just x/y preservation.
    Evidence: `src/ui/webview/graphPerformanceScript.ts:24`,
    `src/ui/webview/graphView.ts:1360`, `:1572`, `:1933`, `:1957`;
    `src/ui/webview/graphPerformanceScript.test.ts:133`.

11. **S2 — Cache size and invalid geometry are bounded.**
    Cache admission rejects oversized/nonfinite geometry, and group count and
    total node count are bounded with least-recently-used eviction. Defaults
    are 8 groups and 2000 nodes; this is neither unlimited session retention nor
    a limit on how many graph entities the source contains.
    Evidence: `src/ui/webview/graphPerformanceScript.ts:8`, `:24`, `:35`;
    `src/ui/webview/graphPerformanceScript.test.ts:119`.
    Full credit needs the bounded/admission/eviction consequence, not exact
    numerical recall.

Major false-claim traps:

- All groups are merged and simultaneously rendered, every visualize command
  recreates the document, or all layout geometry is stored in VS Code settings
  or generated graph files (C1/C2/C8).
- Opening the advanced view generates missing structural data or writes a
  permanent curated group; transient structural groups always survive ordinary
  group-data replacement (C3).
- High is the default; performance selection is workspace graph data; the UI
  treats failed persistence as durable success and never reconciles (C4/C5).
- Low mode has no layout/drag interaction, changes/removes semantic graph data,
  or runs unbounded continuous physics; high mode unconditionally keeps physics
  running forever, including while hidden (C6/C7).
- Hiding/replacing groups intentionally leaves previous graph loops running,
  or cached topology ignores changed relation verbs/endpoints (C7/C8).
- Helper mocks/syntax compilation prove actual browser frame-rate, all group
  interactions or VS Code end-to-end rendering; exact compute budgets guarantee
  a wall-clock completion deadline (C6/C9).

## Task I — Generate Copilot Instructions

Critical: 8 items. Supplemental: 1 item.

1. **C1 — Public command reaches the first-workspace writer and returns a path.**
   The contributed `knowledge.generateCopilotInstructions` command invokes
   `EntityCommands.generateCopilotInstructions`, which uses workspace folder
   zero and delegates to its AIIntegrationService. No-workspace activation
   registers warning placeholders, and the command method itself also guards
   missing workspace. On normal completion the returned file path drives
   optional editor opening or OS reveal; this is not active-file-root or a
   user-selected arbitrary output directory.
   Evidence: `package.json:86`, `src/extension.ts:48`, `:680`, `:971`,
   `:992`; `src/ui/commands/entityCommands.ts:23`, `:1255`.

2. **C2 — Caller graph collection exists even though this writer ignores it.**
   Before calling the writer, EntityCommands collects the unified
   KnowledgeGraphService snapshot and per-entity observations into GraphData.
   It passes that object, but the Copilot writer's `_graphData` parameter is
   unused and its builder accepts no graph data. Thus current output is not
   personalized by those entities/observations; nevertheless collection is a
   real upstream dependency/cost and a thrown collection error can prevent
   reaching the file write. Do not infer “no graph read anywhere” from the
   unused service parameter.
   Evidence: `src/ui/commands/entityCommands.ts:43`, `:1262`;
   `src/services/aiIntegrationService.ts:71`, `:404`.

3. **C3 — File and overwrite/persistence contract.**
   The writer creates `<workspace>/.github` recursively if absent, writes
   `copilot-instructions.md` as UTF-8 with synchronous `writeFileSync`, and
   returns its path. Existing content is replaced without a merge, backup or
   overwrite confirmation. Directory/write failures propagate to command error
   handling; there is no atomic-temp-file/rollback contract. A regeneration can
   therefore discard hand edits and an I/O error is not proof of no side effect.
   Evidence: `src/services/aiIntegrationService.ts:71`;
   `src/ui/commands/entityCommands.ts:1262`, `:1282`.

4. **C4 — Active content builder is a fixed English compact router.**
   Copilot uses `buildCopilotInstructionsContent` →
   `buildAgentKnowledgeRouterContent('en', ...)`. It is not selected by the UI
   locale and does not embed graph dumps, entity totals, technology-stack
   analysis or a scenario/custom template. Rich formatting/template methods
   elsewhere in the same service are not proof that this active path calls
   them. Explain the dispatch distinction, not merely “there is a template
   helper in this file.”
   Evidence: `src/services/aiIntegrationService.ts:404`, `:411`, `:432`;
   contrasting older rich builders at `:114`, `:258`, and template helper
   at `:691`; `src/services/aiIntegrationService.test.ts:68`.
   Exact title wording is not required.

5. **C5 — The produced instructions route focused knowledge access.**
   For architecture/unfamiliar/cross-file/dependency/impact work they recommend
   focused MCP graph querying when available, with local expansion and selective
   evidence. When that is unavailable/unhelpful they point to the context index
   and one best-matching group, not loading the complete audit report by
   default. They allow skipping the graph for small known-file tasks and require
   source verification. Connect this compact routing purpose to why graph or
   template dumps would alter the current contract.
   Evidence: `src/services/aiIntegrationService.ts:435`–`:442`;
   `src/services/aiIntegrationService.test.ts:83`.
   Full credit needs focused conditional querying, bounded fallback and source
   verification; reciting every tool/line is unnecessary.

6. **C6 — Generating instructions is not executing the instructions.**
   This route writes text. It does not call an LLM, perform the recommended MCP
   queries, install/start a server or Skill, generate/rebuild a graph, or create
   the referenced context index/group files. Those recommendations/references
   do not validate their targets or certify Copilot will actually load/follow
   the file. A working external assistant connection is not checked by this
   writer.
   Evidence: complete writer at `src/services/aiIntegrationService.ts:71`,
   active builder at `:404`, `:411`; caller at
   `src/ui/commands/entityCommands.ts:1255`.
   Full credit requires the text-versus-execution/artifact boundary, not listing
   every action it does not take.

7. **C7 — Shared-builder and batch-generation change surface.**
   The active Cursor writer also uses `buildAgentKnowledgeRouterContent`
   (locale-aware there), so changing that shared helper can affect both tools,
   while changing only Copilot's wrapper need not. Generate All AI Configs
   calls Cursor then Copilot sequentially; the UI path and service helper both
   reach these same writers. It is not a multi-file transaction: a Copilot-stage
   failure can leave the earlier Cursor output. Connect the shared dependency
   and sequencing to a content/overwrite change.
   Evidence: `src/services/aiIntegrationService.ts:58`, `:89`, `:101`,
   `:404`; `src/extension.ts:692`;
   `src/ui/commands/entityCommands.ts:1290`, `:1307`.
   Do not require progress-percent trivia or a proposed migration design.

8. **C8 — Regression evidence and its real limit.**
   Identify the compact Copilot router test and explain its positive focused
   query/fallback assertions plus negative template/graph-dump assertions
   (`src/services/aiIntegrationService.test.ts:68`–`:98`). Tie the Cursor
   compact-router test (`:100`–`:119`) to shared-builder change risk. These
   service/temp-filesystem tests are not command/UI, overwrite preservation,
   write/open failure, batch rollback, or actual Copilot-integration tests;
   additional coverage must be labeled proposed. The tech-stack parsing tests
   later in the file do not prove tech-stack content is included in the current
   Copilot output.
   The Copilot test does not pass a GraphData fixture; its negative headings
   are not a direct sentinel test of arbitrary GraphData being ignored.

9. **S1 — A post-write UI failure can still appear as generation failure.**
   The success notification's Open/Show in Folder branches remain inside the
   same try/catch as writing. An editor-open/reveal failure can report an error
   after the output file has already been written; dismissing the success
   notification does not undo the write. Distinguish file completion from the
   optional presentation step.
   Evidence: `src/ui/commands/entityCommands.ts:1264`–`:1283`.

Major false-claim traps:

- The command targets the active document's folder, prompts for a target folder,
  or writes a user-global Copilot file (C1/C3).
- Because GraphData is passed, current output necessarily embeds entities,
  observations or a technology stack; conversely, because it is unused, the UI
  route performs no graph collection at all (C2/C4).
- Copilot output automatically follows Chinese UI locale or incorporates the
  scenario template because dormant rich/template helpers exist (C4).
- Existing hand-authored instructions are merged/backed up/confirmed, writes
  are atomic with rollback, or every reported failure means nothing was written
  (C3/S1).
- Generating the file actually executes MCP/LLM queries, installs a runtime,
  generates graph/context artifacts, or proves Copilot consumed the output
  (C5/C6).
- Editing the shared router cannot affect Cursor; Generate All is atomic or
  always produces both files despite a failed second write (C7).
- The existing tests prove real Copilot behavior, UI completion, safe overwrite,
  full batch rollback, or inclusion of tech-stack/template data (C8).

## Result format for later blind grading

For each anonymous candidate, report per-task critical/max and supplemental/max,
per-item score/rationale and report/source evidence, major false claims with
quotes/evidence, and no more than two sentences on the main omissions per task.
Use separate `major_false_claims` arrays, including an empty array when none.

JSON must include:
`candidates.X.totals` and `candidates.Y.totals`, each with numeric fields
`critical`, `critical_max`, `supplemental`, `supplemental_max`,
`major_false_claim_count`. Here maxima are 17 and 3.
Identify the two tasks as visualization (V) and instructions (I); keep rubric
concerns separate from the scores. Do not read mapping/method information to
grade.
