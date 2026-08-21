---
name: vibeknowledge-dependency-graph
description: Analyze a code workspace and create or refresh an evidence-backed VibeKnowledge dependency graph. Use when asked to generate, update, repair, or review project dependency relationships or a knowledge graph, including “生成依赖关系” and “知识图谱” requests. Do not use for package-manager upgrades or dependency installation.
---

# VibeKnowledge dependency graph

Create the Agent Graph manifest at `.vscode/.knowledge/agent-graph.json`. VibeKnowledge reads this file directly and keeps it separate from the human-maintained SQLite graph.

Before writing, read [references/graph-schema.md](references/graph-schema.md). It defines the exact schema, relation direction, allowed values, and evidence requirements.

## Build the graph

1. Inspect the existing manifest when present so stable entity keys survive refreshes.
2. Establish the requested scope. If the user does not narrow it, analyze the workspace architecture rather than every symbol.
3. Read entry points, manifests, module boundaries, dependency-injection wiring, routes, data access, and representative implementations. Trace actual imports, calls, inheritance, configuration, and data flow.
4. Prefer high-signal modules, services, components, APIs, databases, configuration, and cross-boundary functions. Do not emit nodes merely because a parser can see them.
5. Add a relation only when workspace evidence supports it. Use the most specific verb that the evidence proves, and keep the direction `source -> target` meaning that the source depends on, invokes, imports, contains, or otherwise references the target.
6. Replace the manifest as one complete version-1 document. Preserve human-authored graph data by never editing `graph.sqlite` or the manual graph tables.
7. Validate the result:

   ```bash
   node .agents/skills/vibeknowledge-dependency-graph/scripts/validate-graph.mjs .vscode/.knowledge/agent-graph.json
   ```

   If the skill is installed elsewhere, resolve the validator relative to this `SKILL.md`.

8. Fix every validation error, including missing evidence files or out-of-range evidence lines. Report the entity and relation counts plus any material uncertainty or intentionally omitted area.

## Quality bar

- Base relationships on code or configuration, not names alone.
- Give every relation at least one precise evidence location and a short explanation of what it proves.
- Use stable keys derived from workspace-relative paths and symbols, such as `src/auth/service.ts#AuthService`.
- Model direct relationships. Avoid adding transitive edges that duplicate paths already present.
- Keep external packages only when they are architecturally important; ordinary package-lock entries are noise.
- Do not invent missing endpoints. Either add a supported entity with evidence or omit the relation and disclose the gap.
