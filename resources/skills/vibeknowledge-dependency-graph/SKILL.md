---
name: vibeknowledge-dependency-graph
description: Analyze a code workspace and create or incrementally refresh VibeKnowledge's evidence-backed, grouped Knowledge Graph with a boundary-focused framework view and detailed module or feature views. Use when asked to generate, update, repair, or review project architecture, module or feature dependency relationships, including “生成依赖关系” and “知识图谱” requests. Do not use for package-manager upgrades or dependency installation.
---

# VibeKnowledge grouped Knowledge Graph

Maintain these generated artifacts:

- `.vscode/.knowledge/structural-graph.json`: the version-1 deterministic code-fact graph. Treat it as an internal evidence source and do not load the complete file into Agent context by default.
- `.vscode/.knowledge/structural-graph.previous.json`: the last structurally different valid snapshot, maintained automatically for graph diff. Treat it as internal evidence too.
- `.vscode/.knowledge/cache/structural/`: portable per-file extraction cache and active index. Never edit cache entries by hand.
- `.vscode/.knowledge/agent-graph.json`: the version-2 machine-readable source.
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

Later runs are incremental: unchanged file contributions are reused and only changed files plus their reverse-import dependants are resolved again. If extraction refuses to overwrite a corrupt, newly broken, or abnormally smaller graph, preserve the old artifacts and read [references/structural-cache.md](references/structural-cache.md). Never add `--force` autonomously; use it only after the user reviews and accepts the recovery rebuild.

If the workspace cannot resolve the `typescript` package, ask the user to run **Knowledge: Generate Structural Graph** in the VibeKnowledge extension when available. Otherwise continue with the existing source-inspection workflow and report that deterministic extraction was unavailable; never invent missing facts.

## Generate or refresh one curated group

Use the deterministic condenser before reading implementation details. It selects structural candidates, attaches Evidence and raw `structuralPath` hops, preserves stable keys and Agent-authored semantics, and atomically replaces only the target group.

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
2. If it is version 1, migrate its contents into the `framework` group before doing other work. Preserve stable entity keys.
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

## Keep the framework group at boundary level

The framework group is the system skeleton and routing overview. It should answer how the application starts, which top-level boundaries it assembles, which boundaries directly depend on each other, and which shared infrastructure or external systems support them.

Include only:

- executable entry points and runtime bootstrap;
- root composition and one stable node per top-level package, module, or business boundary;
- direct boundary-to-boundary dependencies;
- shared configuration, middleware, persistence integration, or other cross-cutting runtime components when they connect multiple boundaries;
- architecturally important external systems.

Exclude feature-internal controllers, services, repositories, entities, DTOs, interfaces, tests, and their internal calls or data flow. Put those details in the corresponding module or feature group. An internal symbol may remain in the framework group only when its cross-cutting responsibility is necessary to explain more than one top-level boundary.

Boundary nodes and genuinely shared infrastructure may also appear in detailed groups using the same stable keys. Do not duplicate feature-internal nodes in the framework group merely to make the overview comprehensive.

For an ordinary application, aim for roughly 8–15 entities and 10–20 relations in the framework group. These are readability targets, not validation limits. If a legitimate architecture exceeds them, collapse at the nearest stable boundary or add a missing module or feature group; never omit an architecturally important boundary solely to meet a count.

## Semantic review and update

1. Confirm the requested group and run deterministic extraction and convergence when available.
2. Inspect the target group only. Read its referenced public APIs, implementations, routes, data access, configuration, or tests only as needed to replace mechanical descriptions with business meaning or resolve a warning.
3. Keep the condenser's high-signal selection. Remove a node only when it is clearly internal noise for the requested view; add a node only when a business concept cannot be represented from structural facts and has precise Evidence.
4. Keep direction `source -> target`: the source invokes, imports, contains, or otherwise depends on the target. Do not change an extracted relation to `origin: agent` merely because the Agent reviewed its wording.
5. Preserve every unrelated group, its metadata, entities, relations, stable keys, and order. The condenser already performs this merge; edit only the refreshed target group afterward.
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
- Treat canonical keys only as comparison aliases. Preserve the serialized key exactly when refreshing an existing entity; the validator rejects two keys in one group that differ only by path separators, Unicode compatibility forms, case, whitespace, or redundant punctuation.
- Model direct relationships. Avoid transitive edges that duplicate paths already present.
- Keep the framework group boundary-focused; completeness belongs to the detailed groups, not the overview.
- Keep external packages only when architecturally important; lockfile entries are noise.
- Do not invent endpoints. Add a supported entity with evidence or omit the relation and disclose the gap.
- Keep each group focused enough to understand and render independently.
