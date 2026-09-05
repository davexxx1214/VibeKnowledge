# Advanced queries

Prefix each command with `node <skill>/scripts/query.cjs`; pass `--workspace <project>` when not running in the project root. These are local commands, not MCP tools.

| Command | Parameters | Graph |
| --- | --- | --- |
| features | [--query PAGE_OR_FEATURE] | Small feature-card index only |
| brief | --feature KEY [--budget 600..12000] | One semantic brief; cited source hashes only; default budget 1800 |
| context | --selector FILE_OR_SYMBOL [--mode change\|understand] [--depth 1..6] [--snippets] | Exact-symbol or whole-file navigation, hashes, diagnostics, test candidates |
| overview | none | Group keys and snapshot date |
| query | --query TEXT [--group KEY] [--file PATH] [--depth 0..5] | Curated subgraph |
| entity | --selector KEY [--group KEY] | Curated occurrences |
| neighbors | --selector KEY [--direction incoming\|outgoing\|both] [--depth 1..5] [--group KEY] | Curated dependencies |
| path | --source KEY --target KEY [--direction outgoing\|both] [--depth 1..12] [--group KEY] | Curated shortest path |
| impact | --selector KEY [--direction upstream\|downstream\|both] [--depth 1..8] | Raw dependants/dependencies |
| structural-path | --source KEY --target KEY [--direction outgoing\|both] [--depth 1..20] | Raw shortest path |
| structure | --analysis cycles\|coupling\|cross_boundary\|diff\|communities [--limit 20] | Raw diagnostics |
| search | [--query TEXT] [--file PATH] [--type TYPE] [--group KEY] [--limit 20] | Curated entities |
| relations | [--source TEXT] [--target TEXT] [--verb VERB] [--group KEY] [--limit 20] | Curated relations |

Unless noted below, commands support `--budget 200..12000` (default 1200) and optional `--json` (`{text}` envelope). Brief uses 600..12000 (default 1800). Budgets are approximate text-token limits, not model billing guarantees. Default plain text avoids unnecessary JSON tokens. Errors use stderr and nonzero exit status. Diff needs structural-graph.previous.json; its absence is reported, not an empty diff.

Context uses `--budget 400..12000`, default 1600. It accepts an exact indexed file, symbol name or key (ambiguous names, including same-file collisions, fail rather than silently selecting). File selectors project edges to files. Symbol selectors follow that symbol's calls/references, including same-file helpers; each symbol edge consumes one depth hop. Container, type-only, receiver, import/export and file endpoints are terminal navigation hints, not permission to expand all their members. Owner/constructor locations identify shared initialization/state to inspect separately; dynamic bindings and wider module effects may still require file scope or source review. `--mode understand` includes dependencies plus direct consumers; `change` includes both directions, default depth 2. Small source excerpts are available with `--snippets`. A hash match checks indexed contents only: new/unindexed files, compiler configuration and runtime wiring remain uncertified. Changed/unsafe/unavailable sources never supply excerpts. Depth and budget omissions are explicitly counted; expand only for a task-relevant gap.

For query/neighbors/path/relations, add `--evidence` only when precise relationship evidence is needed. Traversal commands support `--verbs imports,calls,...`. Curated verbs: calls, extends, implements, depends_on, contains, references, imports, exports. Raw diagnostics/traversals accept imports, extends, implements, calls, references.

Source -> target means source depends on/invokes/imports target. Incoming/upstream finds callers; outgoing/downstream finds dependencies. Path's default `both` may follow reverse edges and must not be described as a directed call chain. Use `--direction outgoing` for directed reachability.

Communities are suggestions, not replacement curated groups. Raw relations may be extracted, inferred, or review_required; verify uncertainty against source. These commands never refresh facts or write human overrides.
