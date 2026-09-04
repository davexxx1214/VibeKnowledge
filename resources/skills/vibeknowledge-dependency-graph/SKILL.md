---
name: vibeknowledge-dependency-graph
description: Analyze a code workspace and create or incrementally refresh VibeKnowledge's evidence-backed, grouped Knowledge Graph with a boundary-focused framework view and detailed module, page-level, or cross-page feature views. Use when asked to generate, update, repair, or review project architecture, page, module, or feature dependency relationships, including “生成依赖关系” and “知识图谱” requests. Do not use for package-manager upgrades or dependency installation.
---

# VibeKnowledge grouped Knowledge Graph

Maintain these generated artifacts:

- `.vscode/.knowledge/structural-graph.json`: the version-1 deterministic code-fact graph. Treat it as an internal evidence source and do not load the complete file into Agent context by default.
- `.vscode/.knowledge/structural-graph.previous.json`: the last structurally different valid snapshot, maintained automatically for graph diff. Treat it as internal evidence too.
- `.vscode/.knowledge/cache/structural/`: portable per-file extraction cache and active index. Never edit cache entries by hand.
- `.vscode/.knowledge/agent-graph.json`: the version-1 grouped machine-readable source. This is the only supported manifest shape.
- `.vscode/.knowledge/knowledge-graph.md`: the complete deterministic audit report for humans. Do not load it into Agent context by default.
- `.vscode/.knowledge/agent-context/index.md`: the compact routing index for Coding Agents.
- `.vscode/.knowledge/agent-context/<group-key>.md`: one compact entity/path/relation view per group, without Evidence prose.

VibeKnowledge displays one framework/module/feature group at a time and combines the generated structure with human-authored description overrides. Never edit `.vscode/.knowledge/graph.sqlite`. Human descriptions live there and remain authoritative when the same stable entity key is regenerated.

Before writing the curated graph, read [references/graph-schema.md](references/graph-schema.md). It defines the exact schema, group invariants, relation direction, allowed values, and evidence requirements. Read [references/structural-graph-schema.md](references/structural-graph-schema.md) only when generating, validating, or diagnosing the deterministic structural graph.

## Refresh deterministic code facts

For TypeScript or JavaScript workspaces, refresh the complete deterministic graph before semantic analysis. The incremental cache keeps this inexpensive after the first run:

```bash
node .agents/skills/vibeknowledge-dependency-graph/scripts/extract-structural-graph.mjs --workspace . --scope .
node .agents/skills/vibeknowledge-dependency-graph/scripts/validate-structural-graph.mjs .vscode/.knowledge/structural-graph.json .
```

The extractor uses the TypeScript Compiler API for `.ts`, `.tsx`, `.js`, and `.jsx`, records syntax failures as diagnostics, and emits only source-backed relationships. The curated group command applies its own narrow scope; do not overwrite the full structural graph with a feature-only extraction. Use targeted symbol/path searches in this file when verification is needed; do not inject the whole structural graph into Agent context.

Static-string `import()` calls are extracted, including lazy routes and their reverse-import cache dependencies. Computed imports are reported as unresolved diagnostics, not guessed. A missing edge is an extraction gap to disclose, never proof that a runtime boundary is unnecessary.

Later runs are incremental: unchanged file contributions are reused and only changed files plus their reverse-import dependants are resolved again. If extraction refuses to overwrite a corrupt, newly broken, or abnormally smaller graph, preserve the old artifacts and read [references/structural-cache.md](references/structural-cache.md). Never add `--force` autonomously; use it only after the user reviews and accepts the recovery rebuild.

If the workspace cannot resolve the `typescript` package, ask the user to run **Knowledge: Generate Structural Graph** in the VibeKnowledge extension when available. Otherwise continue with the existing source-inspection workflow and report that deterministic extraction was unavailable; never invent missing facts.

## Generate or refresh one curated group

Use the deterministic condenser before reading implementation details. It selects structural candidates, attaches Evidence and raw `structuralPath` hops, preserves matching prose, removes stale unmatched structure, and atomically replaces only the target group.

For the framework boundary view:

```bash
node .agents/skills/vibeknowledge-dependency-graph/scripts/curate-structural-graph.mjs --workspace . --kind framework --name "框架层"
```

For one module or feature:

```bash
node .agents/skills/vibeknowledge-dependency-graph/scripts/curate-structural-graph.mjs --workspace . --kind feature --scope src/article --key article-management --name "文章管理"
```

Use `--kind module` for a technical subsystem or package. Keep the existing group key when refreshing. The command refuses a detailed group when no framework group exists, validates the complete candidate document before replacement, and leaves the previous file untouched on failure.

After convergence, load only the target group plus the source snippets referenced by its Evidence. Review and edit only what requires semantic judgment:

- boundary and group naming;
- group and entity responsibility descriptions;
- ambiguous edge handling;
- business concepts or relations that syntax cannot express.

Do not manually reproduce imports, calls, containment, or source locations already emitted by the condenser. A relation synthesized from structural facts keeps its generated `structuralPath`. A genuinely Agent-only business relation may omit `structuralPath`, but must use `origin: agent`, normally `confidence: review_required`, and precise source Evidence.

## Choose the target group

1. Read the existing manifest when present.
2. Require the version-1 grouped schema. Do not migrate an older unpublished shape; regenerate the requested graph instead.
3. Ensure the first group is always the framework boundary graph, never a whole-project call graph:
   - key: `framework`
   - name: a localized natural-language framework name, normally `Framework` or `框架层`
   - kind: `framework`
   - order: `0`
4. If there is no framework group, analyze entry points, runtime bootstrapping, root composition, top-level package or business-module boundaries, shared infrastructure, and important external systems first. A generic request to “generate the Knowledge Graph” produces this boundary-level framework group and stops there.
5. If the user explicitly names a module or feature and the framework group is missing, complete the framework group first, then add the requested group in the same run when feasible.
6. For a named request, infer a concise group name and stable lowercase kebab-case key from the code and the user's wording:
   - use `module` for a subsystem, package, library, or technical boundary;
   - use `feature` for an end-to-end user or product capability.
7. Groups after `framework` are parallel peers. A new group receives `max(existing order) + 1`. Refreshing a group keeps its existing key and order.

## Scope a page or product feature

Treat a requested page, user journey, or product capability such as a help center as a `feature`, not as a framework boundary. Do not generate detailed groups for every page preemptively; add or refresh only the page or capability needed for the current task.

Locate the route or other user-facing entry point before choosing `--scope` when the user does not provide a path. Choose the narrowest stable scope that still represents the requested behavior:

- for one page, use its route entry file or page-owned directory;
- for a capability spanning several pages, use its feature directory rather than any individual page;
- for an API-only capability, use the owning controller, handler, or backend feature directory.

Always refresh deterministic facts with extraction scope `.`. Apply the narrow path only to curated-group convergence. A single-file scope intentionally includes component-level entities from that file plus one direct dependency hop; a feature-directory scope covers its page entries and shared feature implementation.

For a page group, prefer the route, page component, directly rendered feature components, hooks, stores or contexts, API client, public data contracts, and directly connected permission, caching, analytics, or runtime integration. For a cross-page capability, also include its shared navigation, orchestration, data loading, and external content or service boundary. A help-center feature, for example, normally centers on its routes, navigation or sidebar, document renderer or loader, search state and API, and CMS or content source when present.

Do not widen a scattered feature to `src`, `app`, or another broad common ancestor merely to capture every related file. Use the primary feature scope and its one-hop dependencies. If important UI and API implementations remain disconnected across distant directories or packages, create focused peer groups such as `help-center-ui` and `help-center-api`, then use raw structural path queries to explain their connection. Split a group at a stable user journey or responsibility when the condenser reports more than about 25 entities or the rendered graph is no longer independently readable.

The deterministic extractor parses `.ts`, `.tsx`, `.js`, and `.jsx`, not pure `.md` or `.mdx` content. For documentation-driven features, anchor convergence on the TypeScript/JavaScript route, loader, registry, renderer, or search implementation. During semantic review, add an essential Markdown/MDX content file only as an evidence-backed `file` or business concept; do not invent dependency edges the extractor cannot prove. Reuse the same stable group key on later refreshes and preserve every unrelated group.

## Keep the framework group at boundary level

The framework group is the system skeleton and routing overview. It should answer how the application starts, which top-level boundaries it assembles, which boundaries directly depend on each other, and which shared infrastructure or external systems support them.

Include only:

- executable entry points and runtime bootstrap;
- root composition and one stable node per top-level package, module, or business boundary;
- direct boundary-to-boundary dependencies;
- shared configuration, middleware, persistence integration, or other cross-cutting runtime components when they connect multiple boundaries;
- architecturally important external systems.

Exclude feature-internal controllers, services, repositories, entities, DTOs, interfaces, tests, and their internal calls or data flow. Put those details in the corresponding module or feature group. An internal symbol may remain in the framework group only when its cross-cutting responsibility is necessary to explain more than one top-level boundary.

For React/Vite applications, verify the HTML module-script entry or actual React DOM mounting call, its root UI composition, router creation, and root route layout. Names such as `App`, `router`, or `Layout` are clues, not evidence; arbitrary functions in `index.tsx` are not entry points. Exclude test fixtures, archived snapshots, Storybook and development mock directories from the default production boundary view, while keeping their code facts in the structural graph. Generated code is not automatically noise: a reachable generated API client may represent a real runtime boundary.

Every selected boundary must retain its own identity, even when several roots share a file or directory. A lifted relation must have a continuous evidence path anchored at its displayed source and target, without traversing a third displayed boundary. Its one actual crossing determines dependency direction; internal containment, exports or imports may be traversed in reverse only as ownership evidence, not as reverse calls. Keep direct cross-boundary dependencies; do not add transitive shortcuts simply because a path exists.

Boundary nodes and genuinely shared infrastructure may also appear in detailed groups using the same stable keys. Do not duplicate feature-internal nodes in the framework group merely to make the overview comprehensive.

For an ordinary application, aim for roughly 8–15 entities and 10–20 relations in the framework group. These are readability targets, not validation limits. If a legitimate architecture exceeds them, collapse at the nearest stable boundary or add a missing module or feature group; never omit an architecturally important boundary solely to meet a count.

## Keep detailed groups at component level

Include the public module, controller or API, service/repository, entity/model, DTO/interface, exported symbol, direct cross-scope dependency, and important runtime integration needed to explain the named capability.

Exclude method and constructor nodes, tests, framework decorators, lockfile packages, and compiler-only symbols. Lift implementation-level calls and references to the nearest selected owner. Do not expand through newly included cross-scope neighbors: detailed groups may reach one direct dependency hop outside their scope, but must not absorb that dependency's surrounding feature. Keep one strongest relation per ordered pair instead of parallel `calls` and `references` edges.

## Semantic review and update

1. Confirm the requested group and run deterministic extraction and convergence when available.
2. Inspect the target group only. Read its referenced public APIs, implementations, routes, data access, configuration, or tests only as needed to replace mechanical descriptions with business meaning or resolve a warning.
3. Keep the condenser's high-signal component selection. Remove a node only when it is clearly noise; add a node only when the Skill can prove a business concept from precise Evidence. Human editing is prose-only and never creates structural nodes or relations.
4. Keep direction `source -> target`: the source invokes, imports, contains, or otherwise depends on the target. Do not change an extracted relation to `origin: agent` merely because the Agent reviewed its wording.
5. Preserve every unrelated group. Within the refreshed group, generated entities, stable keys, types, paths, and relations are authoritative; preserve only matching group/entity/relation prose and discard unmatched old structure.
6. Give file-backed entities concise responsibility prose suitable for the editor's `🧠 KG` hint. Human SQLite overrides remain authoritative and must never be written into `agent-graph.json`.
7. Validate and render after semantic edits. Never write generated structure to `graph.sqlite`.

## Diagnose structure on demand

Keep the curated group as the normal task-routing context. When VibeKnowledge MCP is available, query the raw fact layer only for a concrete diagnostic question:

- `analyze_structure` with `cycles`, `coupling`, `cross_boundary`, `diff`, or `communities`;
- `analyze_impact` for upstream dependants and downstream dependencies of one stable key;
- `find_structural_path` when a curated relationship is too coarse to explain a cross-module route.

Set a token budget and continue from the returned stable keys and source locations. Community results are suggestions for a future module/feature group, never authorization to replace the curated grouping. If MCP is unavailable, search the structural JSON only for the named keys and their adjacent relations; do not load the whole file.

## Pure Agent fallback

Use the earlier source-inspection workflow only when the deterministic extractor or condenser cannot run and no current structural graph is available. State the fallback in the result. Inspect the requested scope with targeted searches, preserve unrelated groups, use stable keys, attach precise Evidence to every relation, validate, and render normally. Never claim an unavailable raw `structuralPath`; omit it for Agent-only relations instead.

## Generation failures and tool defects

A request to generate or refresh a graph does not authorize modifying this Skill's installed scripts, validators, the application source, or tool configuration. On failure, preserve the last valid artifacts, inspect the diagnostic and a minimal relevant source snippet, and distinguish a source problem from an extractor/condenser defect. Report the failing command, affected symbol/path, and any safe fallback. Ask for authorization before repairing the tool or changing business code.

Do not invent hash-suffixed keys to bypass identity validation, repeatedly patch selection rules until counts look small, or drop an orphaned node solely because a dynamic dependency was not extracted. For an authorized tool repair, reproduce the issue in a regression fixture, fix the shared generator, verify cold/warm extraction and boundary evidence, then reinstall the updated Skill in consumer projects. Project-specific names must not become general selection rules. Entity/relation counts are readability warnings, not quotas; retain legitimate architecture and disclose coverage gaps.

## Validate and render

Resolve scripts relative to this `SKILL.md` when the skill is installed elsewhere.

1. Validate JSON and evidence against the workspace:

   ```bash
   node .agents/skills/vibeknowledge-dependency-graph/scripts/validate-graph.mjs .vscode/.knowledge/agent-graph.json
   ```

2. Fix every validation error, including missing evidence files and out-of-range evidence lines.
3. Regenerate the complete audit report and compact per-group Agent views only after validation succeeds:

   ```bash
   node .agents/skills/vibeknowledge-dependency-graph/scripts/render-graph-md.mjs .vscode/.knowledge/agent-graph.json .vscode/.knowledge/knowledge-graph.md
   ```

   The renderer writes the full report to the explicit output path and compact views beside it under `agent-context/`.

4. Report the updated group name, total group/entity-occurrence/relation counts, and any material uncertainty or intentionally omitted area.

## Quality bar

- Base relationships on code or configuration, not names alone.
- Give every relation at least one precise evidence location and a short explanation of what it proves.
- Use stable keys such as `src/auth/service.ts#AuthService`. Changing a key disconnects all occurrences from their shared human description override.
- Identity preserves symbol and path case, Unicode and punctuation. Only portable path spelling (`\\` versus `/`, repeated `/`, and a leading `./`) is normalized for identity comparison. `PartnerShip` and `Partnership` are different legal symbols. Fuzzy search aliases may return multiple candidates; they must not merge entities, transfer human descriptions, or silently choose a traversal target. Relation endpoints always use the exact serialized keys.
- Model direct relationships. Avoid transitive edges that duplicate paths already present.
- Keep the framework group boundary-focused; completeness belongs to the detailed groups, not the overview.
- Keep external packages only when architecturally important; lockfile entries are noise.
- Do not invent endpoints. Add a supported entity with evidence or omit the relation and disclose the gap.
- Keep each group focused enough to understand and render independently.
