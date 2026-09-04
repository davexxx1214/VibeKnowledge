# Development A/B request

You are analyzing a VS Code extension repository. Complete these three read-only
tasks in order; write your answer to REPORT.md in your assigned workspace. Give
concrete source path:line citations and distinguish code facts from inferences.
Do not modify source or install packages. Concise causal explanations are more
useful than listing every file. You may inspect as much source/test code as needed.

1. **local**: Explain DebouncedStructuralGraphUpdater's default delay and what
   dispose does to already queued/running callbacks; identify relevant tests.
2. **refresh**: Before changing background structural refresh behavior, trace
   source event registration through scheduling, graph generation and consumers;
   identify failure/staleness boundaries and relevant regression tests.
3. **install**: Before changing the query Skill installation directory, identify
   command registration, source-vs-installed paths, bundling/packaging and tests;
   distinguish this flow from MCP installation and graph generation.

Use the common observer for ALL source searches/reads/query output. From your
assigned workspace invoke `node observe.cjs --phase local|refresh|install ...`:

- `read FILE [START END]` returns numbered source lines.
- `rg ARGS...` runs ripgrep (supports --files, -n, -C, etc.).
- `query ARGS...` runs the installed query Skill command, when available.

Use apply_patch to write REPORT.md; do not read back the report through the
observer. No internet, MCP, subagents, other workspaces, parent evaluation files,
previous reports, or unobserved shell reads. You may batch observer calls, but do
not postprocess/filter their output outside the observer. Wrapper implementation
and bundled runtimes do not need inspection. This is a task execution, not a
review of the evaluation system. Finish with a short summary and report path.

Arm A addition: use source inspection only. Do not read Skill instruction files
or generated graph artifacts. Reading source implementation of installation,
generation, packaging and their tests is allowed.

Arm B addition: use the installed vibeknowledge-query Skill at
`.agents/skills/vibeknowledge-query/SKILL.md`; read it through the observer first
under phase local. Then follow its routing; graph queries are optional where
they would not help. Source reads and verification remain unrestricted. Do not
read other Skill instructions or entire graph artifacts. In observer queries,
omit `--workspace` because the observer supplies your assigned workspace.
