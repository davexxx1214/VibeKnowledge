# MCP 0.5.0 independent feature-task evaluation

This directory measures the **released MCP-assisted workflow versus source-only
analysis**, using the same two published feature tasks and grading method as
the query Skill r3 trial. It does not implement new MCP product capabilities.

**Result: neither predefined gate passed.** Median public tool text rose 0.7%,
uncached input plus output fell 1.9%, and critical coverage was tied in two pairs
but lower with MCP in one. See the [complete results](results.md) and
[machine-readable summary](summary.json); the earlier fixed-retrieval savings
are not complete agent-task savings.

- [Protocol](protocol.md): three fresh matched pairs and unchanged gates.
- [Task instructions](tasks.md): visualization controls, then Copilot generation.
- [Pre-result interpretation notes](review-notes.md).
- [Independent harness review](harness-review.md).
- [Independent command/provenance audit](compliance-audit.md).
- [Frozen grading rubric](rubric.md) and [pre-grading clarification](grading-notes.md).

The independent audit concluded **pass with limits**, retaining its initial
automatic findings and their explicit adjudication. Bootstrap authorization
wording is transcription-based, and environment fingerprints were supplemental
rather than frozen before all runs. Read those qualifications with the results.

The MCP is called over real SDK stdio, with RAG disabled, via an evaluation-only
observer bridge. This is not a native editor's automatic MCP discovery test.
Each invocation starts a new process; latency does not represent a persistent
client. Tool definitions, results, failures, source reads and model usage count.

The released MCP has graph queries and structural analysis, but no feature
brief or task-context endpoints. The prepared compact graph has three groups:
framework, graph visualization and Copilot instructions. Its deterministic
descriptions are not a separately authored semantic graph. Archived r3 briefs
are present in the fixture but unavailable to the task agents/MCP interface.
Consequently, comparison with the earlier Skill result does not isolate the
transport: it also compares different available information and workflows.

## Reproduction and accounting

Developer dependencies must be installed, including the MCP SDK/server runtime
and Python with tiktoken. Before starting any candidates, build the MCP, then:

```sh
node evaluation/mcp-ab/prepare.mjs <retained-source-run>
node --test evaluation/mcp-ab/accounting.test.cjs
node --test evaluation/query-skill/context/accounting.test.cjs
```

The source-run must contain `snapshot`, its `manifest.json/sourceHashes`, and
`structural-graph.json`. The local retained source is the same selected snapshot
as the published Skill r3 test; its package manifests predate the release bump.
The 0.5.0 runtime is separate. A new checkout does not contain the ignored local
snapshot: supply hash-matching source or clearly declare a new benchmark, not
an identical replay. No original sample project is changed.

Dispatch three pairs of fresh agents with identical model/effort and no inherited
history. Each gets only tasks.md, its arm identity and isolated workspace. Do
not pass results, grading rubric or expected savings. Independently grade
anonymized reports against the unchanged source-backed r3 rubric. Record all
runs, including failures, without rerunning for a desired outcome.

`collect.cjs` exports public observations and numeric session usage only. The
shared `measure-public-outputs.cjs` and `audit-observation-delivery.cjs` account
for delivered text/truncation separately. `audit.cjs` checks public commands and
workspace provenance; `adjudicate-audit.cjs` preserves and explains the initial
bootstrap/parser flags. `summarize.cjs` computes the original gates. A numeric
gate alone is insufficient if delivery/compliance is unresolved. Do not add
observer text to delivered text; they are two views of the same interaction.

Private reasoning/system text and full sessions must not be published. Reports,
observation logs, numeric telemetry, hashes and grades are evaluation artifacts,
excluded from the VSIX. Graph preparation/install/update expense is additional
to the reported warm-artifact task usage; no billing or universal savings claim.
