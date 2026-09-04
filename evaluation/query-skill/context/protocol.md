# Task-context Skill evaluation protocol

Frozen before the first task-context implementation/A-B run (2026-09-04).

Goal: demonstrate at least one of lower tokens, more accurate task completion,
or fewer important omissions. Not a claim about all repositories or tasks.

## Tasks and separation

Use isolated, identical snapshots of actual VibeKnowledge source, tests and
configuration; no invented dependencies or benchmark-specific hints in the graph.
Generate structural facts using the existing extractor. A has source inspection;
B additionally has the installed query Skill and generated graph. Both can read
all source and tests, with identical observation tooling. Do not tell either
agent which behavior/results are expected, prior results, or a token target.

Development suite (answers require source citations, no production edits):

1. Local control: explain DebouncedStructuralGraphUpdater's default delay and
   what dispose does to already queued/running callbacks; identify relevant tests.
2. Change impact: before changing background structural refresh behavior, trace
   source event registration through scheduling, graph generation and consumers;
   identify failure/staleness boundaries and relevant regression tests.
3. Change impact: before changing the query Skill installation directory, identify
   command registration, source-vs-installed paths, bundling/packaging and tests;
   distinguish this flow from MCP installation and graph generation.

Held-out suite (do not tune implementation to expected answers):

1. Trace entity-description edits/reset through storage and the consumers which
   must reflect them; identify invalidation, scope and important failure cases.
2. Trace MCP setup from UI command to child process/config writes; explain
   workspace selection, Node/dependency checks, error handling and safe retries.

Before each run freeze source hashes, installed Skill, prompts and source-backed
grading checklist outside the agents' workspaces. Checklist items must be
independently checkable facts/paths/behavior, not preferred wording. Include
false-positive checks: static reachability is not runtime execution; candidate
tests are not measured coverage; absence from a graph is not independence.

## Gates

Pilot runs guide improvements but cannot establish a final win. Record all
pilots, including failures. After a pilot improvement, freeze the candidate and
run three fresh matched pairs on the held-out suite. Use the same model/effort,
task order, source, outputs and permissions in each pair. No full-history forks.

A candidate can pass either gate:

- Efficiency: no loss in independently graded correctness/critical coverage,
  no extra major false claims, and >=15% lower median tool-observed tokens AND
  >=10% lower median uncached-input-plus-output tokens across the matched pairs.
- Quality/completeness: >=20% fewer missed required facts in aggregate, a strict
  improvement in at least two pairs, no extra major false claims, and <=25%
  increase in median uncached-input-plus-output tokens. Correctly labeling an
  unsupported claim unknown counts; generic warnings and extra unrelated files
  do not. If baseline has no omissions, this gate cannot pass.

These are practical engineering gates, not statistical significance or pricing
claims. Report every metric, cached input separately, per-task scores, source
reads, query counts, and wall time. Generation/update cost is separate and must
not be hidden; warm-query results do not establish first-use savings. Reports
must state sample size and scope. Retain a local-task negative control.

If no gate passes, leave the objective open, analyze actual trajectories, and
make evidence-based changes. Do not alter a frozen gate or remove difficult
tasks to obtain a pass; reserve a new held-out suite for further tuned candidates.

## Candidate r2: feature-first briefs

Added after the negative development pilot and the user's request for page/feature
navigation. Gates and task suites above are unchanged. B may also use semantic
briefs produced from the same frozen source. A separate author receives only
the requested feature areas, source and generation instructions, never task
prompts, rubrics, prior answers, outcomes or a savings target. Archive the authoring
prompt, artifact hashes and numeric generation usage. Artifacts freeze before
task agents run. Report generation/update cost separately and distinguish warm
reuse from end-to-end first-use economics. Semantic cards are reusable facts, not
benchmark-specific answers. A pilot still cannot establish the final win.

## Candidate r3: facet-balanced feature output

Candidate r2 failed both held-out gates; retain all three pairs and its pilot.
The next candidate gives distinct capability/dependency/framework/test/constraint
facets priority over repeated dependency and entry blocks, explicitly reports
unshown kinds, and clarifies brief reuse versus necessary source verification.
No threshold changes. A new independent author receives only the feature areas
graph visualization controls and Copilot-instruction generation, not tasks or
rubrics. A separate evaluator freezes new realistic tasks/rubrics in r3/.
Run three fresh matched pairs there, same source snapshot/model/effort/observer,
and do not reuse r2 held-out outcomes as final evidence for this candidate.
