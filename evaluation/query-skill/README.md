# Latest Skill evaluation

Scope: code dependencies and page/feature understanding through the knowledge-graph
Skills. RAG is not part of these Skills and is not an evaluation target.

## Exact-symbol task context (0.6.0)

The [scope-corrected report](../method-context-ab/README.md) retains two non-RAG
coding tasks, one independent pair each, comparing old whole-file context with
exact-symbol context. This is not Skill versus no Skill.

| Task | Actual tool text | Uncached input + output | Blind score, A → B |
| --- | ---: | ---: | ---: |
| Selected JSON export | −17.1% | −14.2% | 4/4 → 4/4 |
| Unicode truncation control | −9.8% | +65.5% | 3/3 → 3/3 |

Both arms passed the task acceptance checks and typechecks, with zero major errors.
One local benefit is observed, not a general efficiency or accuracy improvement.
The sample is small, cache variation is uncontrolled, and encrypted persisted
prompts prevent complete plaintext dispatch verification. RAG-specific cases,
checks, grades and the mixed aggregate are removed; retained measurements are
unchanged. No post-hoc aggregate or gate recalculation is used.


Raw task metrics, blind grades, acceptance checks and audit limits are linked in
that report.
