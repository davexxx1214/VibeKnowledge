# Feature-first pilot r2

One fresh matched pair on the same three development tasks and frozen source as
pilot r1. B used independently authored feature briefs; no expected answers or
rubric were supplied to the author or task agents. Quality grading is separate.

| Metric | A: source only | B: feature-first Skill | Difference |
| --- | ---: | ---: | ---: |
| Tool-observed text tokens | 59,313 | 40,895 | -31.1% |
| Uncached input + output | 92,136 | 69,146 | -25.0% |
| Cached input | 1,074,688 | 1,040,896 | -3.1% |
| Total input + output, including cached replay | 1,166,824 | 1,110,042 | -4.9% |
| Output tokens | 9,827 | 7,474 | -23.9% |
| Elapsed execution | 364.6 s | 358.2 s | -1.7% |

Per-task observed text: local A 1,402 / B 2,012; refresh A 32,400 / B 19,479;
install A 25,511 / B 19,404. The local negative control still pays Skill loading
overhead. B made four calls: two discovery queries and two feature briefs, then
verified source. No graph context expansion was used. Read-only source and
frozen artifact fingerprints remained unchanged.

These are warm-reuse results. Creating all four feature briefs cost 63,049
observed text tokens and 110,080 uncached-input-plus-output tokens, taking 508.6 s.
Adding that cost to this first task suite eliminates the apparent immediate
net saving. It is shared preprocessing for four features, not a cost attributable
to only one card. Reuse and refresh frequency determine any amortization.

Independent grading found A 24/24 critical and 4/4 supplemental versus B 22.5/24
critical and 3.5/4 supplemental, with no major false claims on either side. B
missed the MCP structural consumer link and source-hash regression coverage;
its omission of the explicit non-awaiting disposal contract is interpretation-
sensitive. It also omitted a supplemental causal reverse-dependency explanation.
Thus the pilot does not satisfy the no-quality-loss condition despite lower
tokens. See grades.md / grades.json; no criterion was changed after grading.

This pilot is not the final gate. The predefined three fresh held-out pairs were
run on the frozen candidate and also failed the gates; see ../heldout-results.md.
Any benefit on later tasks must be reported alongside this coverage loss,
not generalized to arbitrary change-impact analysis.
The candidate bundle and briefs were frozen for those pairs. Held-out tasks are
new prompts/rubrics within the same repository, not an unseen repository or
entirely disjoint feature areas. No statistical or universal saving is claimed.

See metrics.json and the numeric telemetry for complete counts; generation
artifacts/costs are in ../brief-generation-r2/. No raw private reasoning or
system instructions are exported.
