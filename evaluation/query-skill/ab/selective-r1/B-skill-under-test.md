---
name: vibeknowledge-query
description: Query an existing VibeKnowledge graph for uncertain cross-file dependencies, multi-hop impact, paths, or cycles. Prefer direct source inspection for known files and small local changes; graph queries are optional, not a prerequisite for coding. Not for graph generation or RAG.
---

# Query code dependencies

Choose the evidence route before querying:

- For an identifiable file/symbol, local edit, or small known set of declarations, inspect source and relevant tests directly. Skip graph queries, overview, and reference loading when they would only repeat that inspection.
- For uncertain callers, cross-module impact, multi-hop paths, or cycles, query the graph when it can replace broad exploration. Use a focused operation, not several overlapping group dumps. If a result only repeats what is already known, continue with source rather than querying again.

An unfamiliar repository or the word "dependency" alone does not require a graph call. Do not restrict necessary source verification to meet a token target.

When querying, use bundled `scripts/query.cjs` with Node >=26.1 <27. Resolve the script relative to this file; `--workspace` is the target project. No npm install, MCP server, or API key is needed; commands are read-only.

```sh
node <skill>/scripts/query.cjs query --workspace <project> --query "SymbolName" --budget 1200
node <skill>/scripts/query.cjs impact --workspace <project> --selector "returned-key" --direction upstream --depth 2 --budget 1200
```

Quote paths/selectors for the available shell; cmd is supported. Use a known `--group` or `--file` filter when useful; neither is required for `query`. Use `overview` only if group discovery is actually needed, not automatically before a query. For paths, cycles, neighbors, or additional filters, read [references/queries.md](references/queries.md) only when needed.

Start without Evidence and with a narrow scope/budget. Expand only to resolve a needed gap; add `--evidence` to verify uncertain relations. Never load complete graph JSON, audit Markdown, or bundled implementation for local queries.

Use returned paths to inspect relevant source ranges; find tests separately because curated groups omit tests. Cite source for behavior. Graphs are snapshots; missing paths do not prove independence. Curated edges can summarize multiple raw hops, not necessarily direct runtime calls.

If a graph is missing or invalid, report it and use targeted source search. Do not repair tools, install dependencies, or regenerate graphs without authorization. Existing human descriptions in graph.sqlite remain read-only; database errors must not be silently ignored.
