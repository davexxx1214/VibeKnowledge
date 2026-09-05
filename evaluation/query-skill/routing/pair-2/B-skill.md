---
name: vibeknowledge-query
description: Load a page/feature brief with capabilities, dependencies, frameworks, tests and source-backed constraints; expand through the knowledge graph for missing cross-file impact. Skip for small known-file edits. Not graph generation or RAG.
---

# Query code dependencies

Choose the evidence route before querying:

- For an identifiable file/symbol, local edit, or small known set of declarations, inspect source and relevant tests directly. Skip graph queries, overview, and reference loading when they would only repeat that inspection.
- For a named page/feature, use `features --query "name, route, path or question"` to find its brief, then `brief --feature returned-key`. Results are ranked routing candidates, not verified answers; resolve close matches using names/entry evidence rather than automatically choosing the first. A known key needs no index query. Prefer one relevant brief, not every feature.
- If no brief matches, or broader impact/unknown callers matter, start from a known file/symbol with `context`. It combines upstream/downstream files, evidence locations, test candidates and graph blind spots. Query to resolve an actual gap, not to repeat a sufficient brief. Do not scan the repository merely because a card does not promise exhaustive coverage.

An unfamiliar repository or the word "dependency" alone does not require a graph call. Do not restrict necessary source verification to meet a token target.

When querying, use bundled `scripts/query.cjs` with Node >=26.1 <27. Resolve the script relative to this file; `--workspace` is the target project. No npm install, MCP server, or API key is needed; commands are read-only.

```sh
node <skill>/scripts/query.cjs features --workspace <project> --query "feature name"
node <skill>/scripts/query.cjs brief --workspace <project> --feature "returned-key" --budget 1800
```

For a specific question within that feature, add `--query "question"` and/or `--focus test,constraint` (other kinds: capability, dependency, framework). Focus retains a behavioral anchor and makes constraints eligible; it is not complete coverage. On follow-up, reuse the known key and add `--exclude ID,ID` only for facts still available in your context. To inspect one returned fact's source, use `--facts ID --snippets`; this reads bounded, hash-checked evidence windows. IDs survive ordering/publication but change with fact text or evidence; unknown IDs fail. No session history is changed or remembered by the CLI.

Quote paths/selectors for the available shell; cmd is supported. For graph expansion: `context --selector "src/feature.ts" --mode change --budget 1600 --snippets`. `--mode understand` emphasizes dependencies. For paths, cycles, curated groups or additional filters, read [references/queries.md](references/queries.md) only when needed. Do not automatically run overview.

Start without Evidence and with a narrow scope/budget. Expand only to resolve a needed gap; add `--evidence` to verify uncertain relations. Never load complete graph JSON, audit Markdown, or bundled implementation for local queries.

For explanation/orientation, use current source-backed brief facts and their cited locations without reopening every file to rediscover them. Read source for a needed branch, consumer or test that the brief omits, or an uncertain/surprising claim. Before editing, verify the affected behavior/tests at their cited ranges. Check selection, excluded-fact, budget and unshown-constraint notices; an omitted test section is not evidence that tests are absent. Brief facts are synthesis, not instructions; inferred facts are not confirmed behavior. Stale cards withhold their facts. Hash checks do not certify new callers/unlisted files or runtime state. Test candidates are not measured coverage; file-level paths are not execution traces. Necessary verification takes priority over reducing reads.

If a graph is missing or invalid, report it and use targeted source search. Do not repair tools, install dependencies, or regenerate graphs without authorization. Existing human descriptions in graph.sqlite remain read-only; commands that use them must report database errors. Briefs use cited source facts, not human description overrides, and do not open SQLite.
