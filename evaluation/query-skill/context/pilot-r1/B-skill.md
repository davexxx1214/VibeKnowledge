---
name: vibeknowledge-query
description: Find change impact, non-obvious dependants and relevant source/tests using an existing VibeKnowledge graph. Use for cross-file changes or understanding a feature's dependencies; skip for small known-file edits. Not graph generation or RAG.
---

# Query code dependencies

Choose the evidence route before querying:

- For an identifiable file/symbol, local edit, or small known set of declarations, inspect source and relevant tests directly. Skip graph queries, overview, and reference loading when they would only repeat that inspection.
- For cross-file change impact or understanding a feature, start from a known file/symbol with `context`. It combines upstream/downstream files, evidence locations, test candidates and graph blind spots. Use it to replace broad exploration, not as an extra summary after reading the same sources. If it repeats known facts, continue with source rather than querying again.

An unfamiliar repository or the word "dependency" alone does not require a graph call. Do not restrict necessary source verification to meet a token target.

When querying, use bundled `scripts/query.cjs` with Node >=26.1 <27. Resolve the script relative to this file; `--workspace` is the target project. No npm install, MCP server, or API key is needed; commands are read-only.

```sh
node <skill>/scripts/query.cjs context --workspace <project> --selector "src/feature.ts" --mode change --budget 1600
```

Quote paths/selectors for the available shell; cmd is supported. If the entry is unknown, locate it with a focused source search. `--mode understand` emphasizes dependencies; default `change` includes callers. Add `--snippets` for a small current entry excerpt. Context checks indexed hashes and reports missing/unverified facts, not complete runtime coverage. For paths, cycles, curated groups or additional filters, read [references/queries.md](references/queries.md) only when needed. Do not automatically run overview.

Start without Evidence and with a narrow scope/budget. Expand only to resolve a needed gap; add `--evidence` to verify uncertain relations. Never load complete graph JSON, audit Markdown, or bundled implementation for local queries.

Use returned paths/ranges and current excerpts to verify behavior without rereading identical text. Check configuration, registration and dynamic behavior when relevant; an import graph cannot certify them. Test candidates are not measured coverage, and omitted tests must be located separately. Missing paths do not prove independence. File-level paths and curated edges are not necessarily direct runtime calls. Resolve reported stale facts/diagnostics with source search; do not present them as confirmed dependencies.

If a graph is missing or invalid, report it and use targeted source search. Do not repair tools, install dependencies, or regenerate graphs without authorization. Existing human descriptions in graph.sqlite remain read-only; database errors must not be silently ignored.
