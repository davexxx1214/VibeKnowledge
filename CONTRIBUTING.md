# Contributing to VibeKnowledge

Thank you for helping improve VibeKnowledge. Bug fixes, documentation updates, tests, and focused feature proposals are welcome.

## Development setup

Requirements:

- Node.js 20 or newer
- VS Code 1.80 or newer
- Git

Install and validate the extension:

```bash
npm ci
npm run check
```

Press `F5` in VS Code to launch an Extension Development Host. Use a disposable workspace when testing graph or RAG changes because VibeKnowledge writes project data to `.vscode/.knowledge/graph.sqlite`.

The MCP server is a separate package:

```bash
cd packages/mcp-server
npm ci
npm run build
npm test
```

## Making changes

1. Create a focused branch from `main`.
2. Keep unrelated formatting and refactors out of the change.
3. Add or update tests when behavior changes.
4. Update both `README.md` and `README_ZH.md` when user-facing documentation changes.
5. Add a short entry under `Unreleased` in `CHANGELOG.md`.
6. Run the checks below before opening a pull request.

```bash
npm run check
npm audit --omit=dev
npm run package -- --out vibe-knowledge.vsix

cd packages/mcp-server
npm run build
npm test
npm audit --omit=dev
```

## Pull requests

Describe the problem, the chosen approach, and how you tested it. Include screenshots or a short recording for visible UI changes. Call out storage-schema, configuration, security, or backward-compatibility effects explicitly.

Large features and database-format changes should start with an issue so the intended behavior can be agreed before implementation.
