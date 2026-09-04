# Feature-first r2: held-out result

Three matched pairs, two new prompts per pair, one frozen VibeKnowledge source
snapshot. Same model/effort (gpt-5.6-sol/xhigh), source, observer and candidate.
Independent rubric scoring was blinded to arms and usage. No tests were executed
by the task agents: these were source-analysis tasks, not coding acceptance runs.

| Median metric | Source only | Feature-first Skill | Change |
| --- | ---: | ---: | ---: |
| Observer-emitted text | 63,717 | 53,982 | -15.3% |
| Actual public tool text after truncation | 72,365 | 62,010 | -14.3% |
| Uncached input + output | 93,483 | 85,845 | -8.2% |
| Cached input | 966,912 | 941,056 | -2.7% |
| Total input + output including cache replay | 1,061,101 | 1,025,486 | -3.4% |
| Output | 9,143 | 7,902 | -13.6% |
| Duration | 331.0 s | 351.2 s | +6.1% |

Critical scores A/B: 16.5/16.5, 16.5/17, 16.5/16.5 (each out of 17).
Both arms scored all supplemental points and no major false claims in all pairs.
The aggregate missing-score amount fell from 1.5 to 1.0, but improvement occurred
in only one pair. This is a small grading difference, not a 33% general accuracy
improvement. B made 4, 5, 4 queries, A zero. Full per-phase reads, tokens and
grades are preserved under heldout-r1/r2/r3; heldout-summary.json evaluates the
unchanged gates. **Neither gate passed.**

Creating four reusable briefs cost 110,080 uncached-input-plus-output tokens and
508.6 seconds. The figures above exclude generation/refresh, so they do not show
first-use savings. Earlier pilot-r2 reduced reading more but lost critical
coverage; that negative result remains part of this evidence.

The source fixture is a selected snapshot, not a full installed checkout. In
particular MCP helper scripts are absent from both arms and author workspace.
New prompts share a repository and feature areas with generation, not an unseen
repository. The result tests precomputed feature context plus selective access,
not an isolated advantage of graph algorithms or the Skill transport. See
accounting-audit.md for the outer-tool truncation and conservative dual metric.

Next candidate: facet-balanced output so late tests/constraints are not crowded
out by repeated dependencies; clearer source-verification routing. A new held-out
suite is required after this change; the r2 results will not be rerun as final
evidence for a tuned candidate.
