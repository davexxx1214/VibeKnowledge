# Changelog

All notable changes to VibeKnowledge are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A bundled Agent Skill that generates an evidence-backed dependency graph in `.vscode/.knowledge/agent-graph.json`.
- A unified Knowledge Graph view across the extension and MCP server.
- Durable human description overrides for Agent-generated entities.
- Root tests for graph sonification and Strudel Webview security behavior.
- GitHub Actions checks for the extension and standalone MCP server.
- Contribution, security, issue, and pull-request guidance.
- Repeatable VSIX packaging with Marketplace metadata.
- A local D3 runtime for the graph Webview.

### Changed

- Replaced the regex-based automatic dependency analyzer with Agent-driven semantic analysis, while presenting generated and human-authored data as one graph.
- Made human-authored descriptions authoritative across Agent regeneration.
- Made editor `🧠 KG` CodeLens and hover hints use the unified graph, show Agent-authored descriptions, refresh after Skill output changes, and open manual description editing directly.
- Made English the default README and moved the Chinese documentation to `README_ZH.md`.
- Updated compatible dependencies and development tooling.
- Removed generated coverage reports from version control.
- Renamed newly created Gemini File Search display names from `vibecoding_` to `vibeknowledge_`; existing stores remain unchanged.

### Security

- Added restrictive content security policies to graph and Strudel Webviews.
- Removed the unnecessary microphone permission from the Strudel player.
- Updated dependency lockfiles to resolve known production vulnerabilities.
