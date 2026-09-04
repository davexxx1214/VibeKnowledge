# Reusable feature brief generation

Published four reviewed feature briefs for this isolated VS Code extension source snapshot. These describe reusable capabilities and implementation boundaries, not a proposed code change.

| Key | Reviewed scope | Facts | Fingerprinted source files |
| --- | --- | ---: | ---: |
| `graph-refresh` | Refresh command, Agent sidecar events, tree/CodeLens/webview propagation, Agent cache and structural background refresh/recovery | 9 | 13 |
| `agent-skill-installation` | Independent dependency-graph/query installation, overwrite and partial-install behavior, bundle ownership and read-only query boundary | 9 | 11 |
| `entity-description-editing` | Edit/reset entry points, entity resolution, shared stable-key overrides, SQLite persistence and portable-query consumer | 9 | 13 |
| `mcp-setup` | Trust/target selection, isolated runtime installation, audit/health gates, JSONC client configuration, cancellation and preservation boundaries | 10 | 12 |

The published files are `.vscode/.knowledge/feature-briefs/<key>.json`; the publisher-maintained routing index is `.vscode/.knowledge/feature-briefs/index.json`. Reviewed input drafts remain in `.brief-authoring/drafts/<key>.json`.

## Review and validation

All source searches and reads used `node observe.cjs --phase generation` from this assigned workspace. No pre-existing graph paths were returned by the checked `.vscode/.knowledge/**` file listing, so source entry points and runtime wiring guided the review. Relevant source, direct dependencies/configuration and selected test assertions were inspected before authoring.

Each draft was published successfully with `.brief-authoring/publish-feature-brief.mjs`. Publication validated the schema, evidence paths/ranges and source fingerprints; the author separately reviewed the claims against observed source. Publisher success is not proof of semantic correctness or test execution.

## Limitations

- This was a bounded review of the four requested capabilities, not a repository-wide architecture or security audit. Unlisted callers, dynamic runtime behavior and uncited files are outside each card's fingerprint boundary.
- Tests were inspected but not run. No extension UI, watcher delivery, package build, Skill installation, graph generation, dependency installation, audit/network request or MCP handshake was executed.
- `scripts/build-mcp-runtime.cjs` references `packages/mcp-server/scripts/health-check.mjs`, which was absent in this isolated source copy. The health-check implementation and end-to-end bundle completeness remain unverified; the MCP brief records this explicitly.
- Application source was not modified. No graph/database content, user configuration or installed Skill was changed. Only draft/published briefs, their routing index and this generation record were authored; observer telemetry is maintained by the supplied observer.

Artifact totals: 4 published briefs containing 37 facts, 1 routing index, 4 reviewed JSON drafts and 1 generation record (10 authoring artifacts). Per-card fingerprint counts above are not a deduplicated repository-file count.
