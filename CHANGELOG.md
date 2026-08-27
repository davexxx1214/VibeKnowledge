# Changelog

All notable changes to VibeKnowledge are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A bundled Agent Skill that generates an evidence-backed dependency graph in `.vscode/.knowledge/agent-graph.json`.
- Version-2 framework/module/feature groups with framework-first generation, incremental group refreshes, and a generated `.vscode/.knowledge/knowledge-graph.md` aggregate.
- A left-side group selector that renders one independent graph at a time.
- Compact per-group Agent context views containing only entities, source paths, and direct relations.
- A unified Knowledge Graph view across the extension and MCP server.
- Durable human description overrides for Agent-generated entities.
- Root tests for graph sonification and Strudel Webview security behavior.
- GitHub Actions checks for the extension and standalone MCP server.
- Contribution, security, issue, and pull-request guidance.
- Repeatable VSIX packaging with Marketplace metadata.
- A local D3 runtime for the graph Webview.

### Changed

- Replaced the regex-based automatic dependency analyzer with Agent-driven semantic analysis. Agent output is now the only entity/relation structure; SQLite supplies human description overrides and RAG data.
- Kept legacy version-1 manifests readable by normalizing them into one framework group.
- Kept the framework group at system-boundary level instead of expanding feature-internal controllers, services, entities, DTOs, or tests.
- Made GitHub Copilot instructions route to one compact Knowledge Graph group on demand instead of embedding the full audit report or template content.
- Reduced graph-view animation work by cancelling stale loops, caching lookup/path data, throttling particles to 30 FPS, limiting animated edge styles, and debouncing resize handling.
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
