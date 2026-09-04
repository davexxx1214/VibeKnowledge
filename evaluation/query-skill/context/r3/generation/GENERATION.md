# Feature brief generation

The author read `.brief-authoring/INSTRUCTIONS.md` completely before reviewing source. All source searches and reads used `node observe.cjs --phase generation` in this workspace. No network, other workspace, evaluator material, observer/publisher implementation, or subagent was used.

## Coverage

- `graph-visualization`: 15 evidence-backed facts covering the command/Webview entry, independent curated groups, structural views and drilldown boundaries, low/high display state, persistence and lifecycle, geometry caching, direct services, the group music consumer, declared framework ranges, and inspected test assertions.
- `copilot-instructions`: 10 evidence-backed facts covering the command and first-workspace target, UTF-8 output, active English query router, snapshot/service chain, shared Cursor and bulk consumers, overwrite/failure boundaries, declared framework ranges, and inspected test assertions.

No existing `.vscode/.knowledge` directory was available for graph-guided routing or an existing group key. Stable feature-name keys were used. Evidence points to inspected source lines, not an assumed graph. The test statements describe assertions only; no tests, extension, browser, MCP service, or Copilot session were run.

## Exclusions

This is a bounded feature review, not a whole-repository scan. Detailed graph extraction/curation algorithms, persistence internals, music synthesis/playback, unused long-form AI formatters, scenario templates, MCP installation/query implementation, and downstream context production are outside the briefs except where a directly observed interface or consumer matters. Local package declarations are not claims about installed versions or runtime performance.

## Publication validation

The reviewed drafts were published serially with `.brief-authoring/publish-feature-brief.mjs`. Publisher success validates structure, paths, line ranges and fingerprints, not semantic truth. Source files were not modified.

- `node .brief-authoring/publish-feature-brief.mjs --workspace . --input graph-visualization.draft.json` exited 0: published `graph-visualization`, 15 facts and 13 source fingerprints.
- The first Copilot publication attempt rejected one fact with seven evidence locations: each fact permits 1–6. Adjacent package declaration citations were combined without changing the factual statement.
- `node .brief-authoring/publish-feature-brief.mjs --workspace . --input copilot-instructions.draft.json` then exited 0: published `copilot-instructions`, 10 facts and 6 source fingerprints.
- Published cards are `.vscode/.knowledge/feature-briefs/graph-visualization.json` and `.vscode/.knowledge/feature-briefs/copilot-instructions.json`; the publisher maintains their shared index. No lock recovery or manual fingerprint editing was needed.
