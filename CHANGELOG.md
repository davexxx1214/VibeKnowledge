# Changelog

All notable changes to VibeKnowledge are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.5.0] - 2026-09-04

### Added

- Standalone `vibeknowledge-query` Agent Skill with a portable read-only CLI, token-bounded dependency/impact/path queries, built-in SQLite description reads, and a separate VS Code installation command. No MCP, RAG, API key, or consumer npm installation is needed.
- Reproducible nine-query Skill/MCP parity and text-token evaluation, reporting both discovery-loaded and warm-session costs rather than assuming the Skill always saves tokens.
- Source-backed page/feature briefs with capabilities, entry points, dependency roles and consumers, relevant frameworks, test references and constraints. The generation Skill publishes briefs on demand; queries check cited-file fingerprints and withhold stale facts without regenerating or modifying the workspace.
- Feature discovery and bounded brief retrieval, plus task-context queries combining dependency direction, evidence locations, candidate tests and extraction blind spots. Briefs need neither MCP nor SQLite and prioritize distinct fact kinds before repeated detail, reporting any omitted kinds.

### Evaluation and documentation

- Published the full Skill evaluation history, including failed pilots, independent source-backed grading, numeric usage, artifact hashes and an accounting audit; linked the reports from both READMEs and the MCP guide.
- Three fresh matched pairs on two VibeKnowledge feature-analysis tasks passed the predefined warm-reuse efficiency gate: median actual tool text decreased 24.4% (74,789 to 56,572), and uncached input plus output decreased 21.9% (104,756 to 81,771). Both arms scored 17/17 critical items with no major false claims in all pairs; accuracy improvement was not demonstrated.
- Kept generation cost separate: two briefs cost 90,480 uncached-input-plus-output tokens, so first use did not save net tokens. The result tests feature briefs plus selective access, not an isolated graph-algorithm or MCP advantage, and is limited to the measured source snapshot and tasks.
- Excluded evaluation logs and local attachments from distributable packages; ignored local attachments in Git without deleting them.

### MCP setup

- Configurable MCP audit request timeout in native settings (10–120 seconds, default 60), with the matching `VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS` option for command-line audits and CI.
- Bounded 2s/4s audit retry backoff, failure categories, redacted registry/ping diagnostics, and distinct blocking exit codes for vulnerabilities, unavailable reports and invalid configuration. MCP setup's outer timeout now accounts for the configured audit budget.

### Changed

- Upgraded ESLint from 8.57.1 to 10.9.1 and migrated to `eslint.config.cjs` using native flat configs, preserving TypeScript rules, severities and fixture exclusions without the legacy compatibility layer.
- Upgraded the standalone MCP runtime from `better-sqlite3` 12.11.1 to 13.0.3, adopting its N-API binaries distributed in the npm package and removing the MCP dependency on `prebuild-install`.
- Pinned `encoding-sniffer` 1.0.2 only in the `@vscode/vsce → cheerio` development dependency chain, replacing deprecated `whatwg-encoding` with `@exodus/bytes`; added CommonJS, encoding/stream and packaging regressions. Kept `node-domexception` 1.x after a 2.0.2 trial broke `fetch-blob`'s DOMException constructor contract.
- Kept Node.js defaults at 26.1.0 and the supported range at `>=26.1.0 <27`. Existing MCP installations must be reconfigured through one-click setup to use the updated runtime.

### Fixed

- Preserved original parse errors as `Error.cause` when reading structural/curated graphs and removed an unused entity-selection initializer exposed by ESLint 10's recommended rules.
- Prevented npm's implicit `node-gyp` rebuild of SQLite 13 on clean lockfile installs by disabling dependency lifecycle scripts only for the MCP package and isolated setup; dependency auditing and SQLite/protocol health checks remain required.

## [0.4.0] - 2026-09-04

### Added

- One-click MCP installation from Knowledge Settings and the Explorer toolbar: configurable workspace, external Node and client; precompiled runtime included in VSIX/F5 builds; isolated locked production dependency installation, native SQLite/protocol checks, JSONC-preserving configuration updates and backups.
- Cancellable setup progress and diagnostics without PowerShell; failed attempts preserve previous client configuration and successful installations.

### Fixed

- Restored dependency audits in both CI jobs and installation instructions, using npm 11.19.0 in CI and a bounded retry gate for invalid/unavailable audit reports. High/critical vulnerabilities fail immediately; persistent service failures remain failures, not skipped audits.
- Updated the locked transitive `@xmldom/xmldom` dependency from 0.8.13 to 0.8.15 to address GHSA-6gmq-8vp8-gcm6.
- Updated locked development dependencies `fast-uri` to 3.1.7 and `qs` to 6.16.0 to clear the vulnerabilities found by the full dependency audit.
- Added strict extension typechecking before compilation, fixing 80 previously hidden diagnostics: SQL.js/MIME declarations, duplicate/incomplete locale types, QuickPick discriminator collisions, Thenable handling, graph result inference and SDK response fields.
- Removed MCP production `any` annotations in favor of shared structural-analysis declarations and typed/validated Gemini responses. MCP source builds now preflight the local compiler and SDK declarations; regression tests reject new `any` annotations.

## [0.3.0] - 2026-09-04

### Upgrade notes

- Development tools and the standalone MCP server now require Node.js `>=26.1.0 <27` (default: 26.1.0). Reinstall dependencies after changing Node, especially the native `better-sqlite3` module, and restart MCP clients. VS Code still manages its own extension-host runtime.
- The MCP tool `knowledge://relations` is now `list_relations`; restart the MCP server and refresh clients' cached tool lists. Graph identifiers are now exact and case-sensitive; ambiguous fuzzy selectors require an exact entity key.

### Added

- Default low-performance graph display mode with a toolbar switch to high-performance effects and a machine-local persisted setting. Low mode uses budgeted static layout, bounded geometry caching, and local drag redraws without removing graph facts.

### Changed

- Pinned the project and both CI jobs to Node.js 26.1.0 via `.nvmrc`, with package engine ranges `>=26.1.0 <27` so local Node 26.8.1 remains allowed; documented native MCP dependency reinstallation after runtime changes.
- Temporarily paused dependency vulnerability audits in both CI jobs after npm audit endpoint failures: installation uses `npm ci --no-audit`, and standalone audit steps are removed. Build, test, and extension packaging checks remain enabled.
- Separated exact, case-sensitive graph identity from fuzzy search aliases across validation, curation, description overrides, extension snapshots and MCP queries. Ambiguous selectors require an exact key for traversal.
- Documented failure handling in the dependency-graph Skill: graph generation does not authorize editing installed tools, and readability counts must not drive removal of real dependencies.
- Taught the bundled dependency-graph Skill to scope on-demand page and cross-page feature graphs, including help-center content, scattered frontend/backend code, and Markdown/MDX limitations.

### Fixed

- Used explicit CMD shells for Windows build/watch tasks, including the F5 pre-launch build, without changing system execution policies or other workspaces' terminal profiles.
- Corrected standalone MCP install/build commands and the distinct VS Code/Cursor configuration formats, with native Node.js dependency troubleshooting for moved checkouts.
- Renamed the MCP relationship-list tool to `list_relations` to avoid invalid tool-name characters; clients must restart the server and refresh cached tools.

- Paused graph animation and layout work while hidden, cancelled replaced layouts, and reused the existing Webview document when reopening the graph panel.

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
