# Changelog

All notable changes to VibeKnowledge are documented in this file. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added

- A bundled Agent Skill that generates an evidence-backed dependency graph in `.vscode/.knowledge/agent-graph.json`.
- Agent Graph and merged Human + Agent views in the extension and MCP server.
- Root tests for graph sonification and Strudel Webview security behavior.
- GitHub Actions checks for the extension and standalone MCP server.
- Contribution, security, issue, and pull-request guidance.
- Repeatable VSIX packaging with Marketplace metadata.
- A local D3 runtime for the graph Webview.

### Changed

- Replaced the regex-based automatic dependency analyzer with Agent-driven semantic analysis; human-maintained graph data remains isolated.
- Made English the default README and moved the Chinese documentation to `README_ZH.md`.
- Updated compatible dependencies and development tooling.
- Removed generated coverage reports from version control.
- Renamed newly created Gemini File Search display names from `vibecoding_` to `vibeknowledge_`; existing stores remain unchanged.

### Security

- Added restrictive content security policies to graph and Strudel Webviews.
- Removed the unnecessary microphone permission from the Strudel player.
- Updated dependency lockfiles to resolve known production vulnerabilities.
