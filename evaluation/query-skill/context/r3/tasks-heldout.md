# Held-out A/B request — visualization and Copilot Instructions

You are analyzing a VS Code extension repository. Complete these two read-only
tasks in order; write your answer to REPORT.md in your assigned workspace. Give
concrete source path:line citations and distinguish implementation facts from
inferences. Do not modify source, generate project artifacts, install packages,
or run tests/builds. You may inspect as much source/test code as needed.
Explain causal relationships and existing test coverage; a file inventory is
not an impact assessment.

1. **visualization**: Before changing how the graph visualization remembers its
   current view and balances responsiveness against animation, trace the user
   command through the extension host and browser-side page. Explain how
   ordinary groups and the advanced structural view are selected/displayed,
   how the performance selector changes behavior, and which state survives
   group switches, revealing/reopening the panel, or hiding the page.
   Identify the dependencies and important correctness/failure boundaries
   a change must preserve, and map relevant existing tests to those risks.
   Keep this about page/view interactions, not background source refresh.

2. **instructions**: Before changing Generate Copilot Instructions to produce
   more project-specific output, trace its UI command, inputs, content builder,
   destination file and completion/error handling. Determine which apparent
   inputs and dependencies actually affect the current output, how related
   instruction-generation paths share implementation, and what happens when
   the destination already exists or an operation fails. Explain the generated
   file's intended use versus actions the generator itself performs. Map
   relevant existing tests to this contract and identify consequential gaps;
   do not implement the proposed change.

Use the common observer for ALL source searches/reads/query output. From your
assigned workspace invoke `node observe.cjs --phase visualization|instructions ...`:

- `read FILE [START END]` returns numbered source lines.
- `rg ARGS...` runs ripgrep (supports --files, -n, -C, etc.).
- `query ARGS...` runs the installed query Skill command, when available.

Use apply_patch to write REPORT.md; do not read back the report through the
observer. No internet, MCP calls, subagents, other workspaces, parent evaluation
files, previous reports, or unobserved shell reads. You may batch observer calls,
but do not postprocess/filter their output outside the observer. Wrapper
implementation and bundled runtimes do not need inspection. This is a task
execution, not a review of the evaluation system. Finish with a short summary
and report path.

Arm A addition: use source inspection only. Do not read Skill instruction files
or generated graph artifacts. Reading source implementation of the requested
features, their dependencies and their tests is allowed.

Arm B addition: use the installed vibeknowledge-query Skill at
`.agents/skills/vibeknowledge-query/SKILL.md`; read it through the observer first
under phase visualization. Then follow its routing; graph queries are optional
where they would not help. Source reads and verification remain unrestricted.
Do not read other Skill instructions or entire graph artifacts. In observer
queries, omit `--workspace` because the observer supplies your assigned workspace.
