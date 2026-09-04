# Changelog

All notable changes to VibeKnowledge are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Changed

- Separated exact, case-sensitive graph identity from fuzzy search aliases across validation, curation, description overrides, extension snapshots and MCP queries. Ambiguous selectors require an exact key for traversal.
- Documented failure handling in the dependency-graph Skill: graph generation does not authorize editing installed tools, and readability counts must not drive removal of real dependencies.
- Taught the bundled dependency-graph Skill to scope on-demand page and cross-page feature graphs, including help-center content, scattered frontend/backend code, and Markdown/MDX limitations.

### Fixed

- Recognized React/Vite HTML and mount entries, JSX composition, routers and root layouts; excluded development artifacts from framework candidates while retaining reachable generated API clients.
- Extracted literal dynamic imports and invalidated their dependants incrementally; HTML entry changes now invalidate extraction caches and trigger background refresh.
- Prevented same-directory boundaries from overwriting one another and constrained lifted evidence paths to direct boundary crossings, without transitive shortcuts through other displayed nodes.
- Fixed a Webview runtime error that left the graph canvas blank after group metadata loaded, and made future rendering failures visible in the graph view.

## [0.2.0] - 2026-09-03

### Added

- A bundled Agent Skill that generates an evidence-backed dependency graph in `.vscode/.knowledge/agent-graph.json`.
- Version-1 grouped framework/module/feature views with framework-first generation, incremental group refreshes, and a generated `.vscode/.knowledge/knowledge-graph.md` aggregate.
- A left-side group selector that renders one independent graph at a time.
- Compact per-group Agent context views containing only entities, source paths, and direct relations.
- Token-budgeted MCP graph navigation with `query_graph`, `get_entity`, `get_neighbors`, and `shortest_path`.
- Comparison-only canonical entity-key aliases shared by the Skill validator, extension, and MCP server.
- Required relation `origin` and `confidence` provenance in graph parsing, MCP results, Markdown reports, and graph tooltips.
- A deterministic TypeScript/JavaScript structural extractor with schema validation, two-pass symbol resolution, NestJS metadata, per-file diagnostics, and atomic `structural-graph.json` output.
- Portable content-addressed structural caches with reverse-import invalidation, deletion cleanup, guarded recovery, `--force` rebuilds, and debounced VS Code source watching.
- A deterministic structural condenser and VS Code curation command for boundary-focused framework views and scoped module/feature views, with single-group atomic merges.
- Optional curated-relation `structuralPath` traces validated against raw structural facts and returned with explicitly requested MCP Evidence.
- Deterministic structural diagnostics for dependency cycles, upstream/downstream impact, raw shortest paths, coupling hotspots, cross-boundary links, graph diffs, and community suggestions.
- MCP tools `analyze_structure`, `analyze_impact`, and `find_structural_path`, with token-budgeted results linked to stable keys and source locations.
- An opt-in advanced graph view with boundary, community, and file aggregation plus curated-node and relationship drill-down.
- Automatic preservation of the last structurally different valid graph snapshot for change analysis.
- A reproducible Phase 7 retrieval benchmark with fixed Coding Agent tasks, three retrieval modes, MCP budget sweeps, freshness/fallback checks, and machine-readable results.
- A unified Knowledge Graph view across the extension and MCP server.
- Durable human description overrides for Agent-generated entities.
- Root tests for graph sonification and Strudel Webview security behavior.
- GitHub Actions checks for the extension and standalone MCP server.
- Contribution, security, issue, and pull-request guidance.
- Repeatable VSIX packaging with Marketplace metadata.
- A local D3 runtime for the graph Webview.

### Changed

- Rewrote the English and Chinese READMEs around the current Skill-generated graph, compact routing, MCP on-demand workflow, and measured Phase 7 context savings.
- Replaced repository screenshots with a Mermaid architecture diagram and removed 125.45 MiB of unreferenced presentation and cover assets.
- Replaced the regex-based automatic dependency analyzer with a deterministic TypeScript/JavaScript fact layer plus Agent-driven semantic curation. SQLite supplies human description overrides and RAG data, not graph structure.
- Replaced the unpublished manifest variants with one strict version-1 grouped schema; old flat/version-2 shapes are rejected and regenerated.
- Reduced curated entities to `function`, `class`, `interface`, `variable`, `file`, `api`, `service`, `component`, and `external`, and removed the ambiguous `uses` relation.
- Made generated structure authoritative on refresh: only matching prose survives while unmatched old entities and relations are discarded.
- Collapsed detailed groups to component-level nodes, one direct external dependency hop, and one strongest relationship per ordered pair.
- Kept the framework group at system-boundary level instead of expanding feature-internal controllers, services, entities, DTOs, or tests.
- Limited Agent graph generation to semantic naming, responsibility prose, ambiguity review, and business-only concepts after deterministic structural convergence, with a pure Agent fallback when extraction is unavailable.
- Made GitHub Copilot instructions route to one compact Knowledge Graph group on demand instead of embedding the full audit report or template content.
- Made generated Cursor and Copilot instructions query the MCP graph first, with compact group files as the fallback.
- Reduced graph-view animation work by cancelling stale loops, caching lookup/path data, throttling particles to 30 FPS, limiting animated edge styles, and debouncing resize handling.
- Kept curated groups as the default Webview and Agent context while limiting raw structural rendering to explicit, bounded requests.
- Improved graph-query seed ranking with relationship context and allowed impact/path traversal to bridge file and symbol containment without adding containment noise to cycle or coupling diagnostics.
- Made human-authored descriptions authoritative across Agent regeneration.
- Made editor `🧠 KG` CodeLens and hover hints use the unified graph, show Agent-authored descriptions, refresh after Skill output changes, and open manual description editing directly.
- Made English the default README and moved the Chinese documentation to `README_ZH.md`.
- Updated compatible dependencies and development tooling.
- Removed generated coverage reports from version control.
- Renamed newly created Gemini File Search display names from `vibecoding_` to `vibeknowledge_`; existing stores remain unchanged.

### Fixed

- Stopped treating `@types/node` as the installed Node.js runtime version; runtime detection now uses explicit project configuration.

### Security

- Added restrictive content security policies to graph and Strudel Webviews.
- Removed the unnecessary microphone permission from the Strudel player.
- Updated dependency lockfiles to resolve known production vulnerabilities.
