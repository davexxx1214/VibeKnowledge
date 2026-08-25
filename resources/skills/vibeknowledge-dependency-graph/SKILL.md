---
name: vibeknowledge-dependency-graph
description: Analyze a code workspace and create or incrementally refresh VibeKnowledge's evidence-backed, grouped Knowledge Graph with a boundary-focused framework view and detailed module or feature views. Use when asked to generate, update, repair, or review project architecture, module or feature dependency relationships, including “生成依赖关系” and “知识图谱” requests. Do not use for package-manager upgrades or dependency installation.
---

# VibeKnowledge grouped Knowledge Graph

Maintain these generated artifacts:

- `.vscode/.knowledge/agent-graph.json`: the version-2 machine-readable source.
- `.vscode/.knowledge/knowledge-graph.md`: the complete deterministic audit report for humans. Do not load it into Agent context by default.
- `.vscode/.knowledge/agent-context/index.md`: the compact routing index for Coding Agents.
- `.vscode/.knowledge/agent-context/<group-key>.md`: one compact entity/path/relation view per group, without Evidence prose.

VibeKnowledge displays one framework/module/feature group at a time and combines the generated structure with human-authored description overrides. Never edit `.vscode/.knowledge/graph.sqlite`. Human descriptions live there and remain authoritative when the same stable entity key is regenerated.

Before writing, read [references/graph-schema.md](references/graph-schema.md). It defines the exact schema, group invariants, relation direction, allowed values, and evidence requirements.

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

## Analyze and update

1. Establish the requested scope. For the framework group, inspect only the artifacts needed to prove startup, top-level composition, cross-boundary dependencies, shared infrastructure, and external systems. For a module or feature group, read its relevant public APIs, implementations, routes, data access, configuration, and tests, and trace their direct relationships.
2. Prefer high-signal boundaries, services, components, APIs, databases, configuration, and cross-boundary functions appropriate to the target group. Do not emit nodes merely because a parser can see them.
3. Give every file-backed entity a concise responsibility description suitable for the editor's `🧠 KG` hint. The Agent may refresh generated prose as code changes; a human override remains visible until the user explicitly restores the Agent description.
4. Add a relation only when workspace evidence supports it. Keep direction `source -> target`: the source invokes, imports, contains, or otherwise depends on the target.
5. Replace only the target group's generated contents. Preserve every unrelated group, its metadata, entities, relations, stable keys, and order. Update top-level `generatedAt` after the full document is assembled.
6. The same source symbol may appear in several detailed groups. Reuse the same entity key for that symbol. In the framework group, repeat only boundary nodes and genuinely shared infrastructure; keep feature-internal symbols in their detailed group. Keys must be unique only within one group, and every relation endpoint must exist in that same group.
7. Write the complete version-2 JSON document atomically. Never write generated structure to `graph.sqlite`.

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
- Model direct relationships. Avoid transitive edges that duplicate paths already present.
- Keep the framework group boundary-focused; completeness belongs to the detailed groups, not the overview.
- Keep external packages only when architecturally important; lockfile entries are noise.
- Do not invent endpoints. Add a supported entity with evidence or omit the relation and disclose the gap.
- Keep each group focused enough to understand and render independently.
