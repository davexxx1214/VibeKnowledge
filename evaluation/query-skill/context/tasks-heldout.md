# Held-out A/B request

You are analyzing a VS Code extension repository. Complete these two read-only
tasks in order; write your answer to REPORT.md in your assigned workspace. Give
concrete source path:line citations and distinguish code facts from inferences.
Do not modify source or install packages. Concise causal explanations are more
useful than listing every file. You may inspect as much source/test code as needed.

1. **descriptions**: Trace entity-description edits/reset through storage and the
   consumers which must reflect them; identify invalidation, scope and important
   failure cases.
2. **setup**: Trace MCP setup from UI command to child process/config writes;
   explain workspace selection, Node/dependency checks, error handling and safe
   retries.

Use the common observer for ALL source searches/reads/query output. From your
assigned workspace invoke `node observe.cjs --phase descriptions|setup ...`:

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
under phase descriptions. Then follow its routing; graph queries are optional
where they would not help. Source reads and verification remain unrestricted.
Do not read other Skill instructions or entire graph artifacts. In observer
queries, omit `--workspace` because the observer supplies your assigned workspace.
