# Independent query-Skill A/B experiment

See [the completed experiment](results.md). This is an actual two-agent coding/analysis trial, not the fixed top-five-file retrieval proxy or the MCP transport benchmark.

The [selective-routing follow-up](selective-results.md) uses a fresh A/B pair on the same tasks. B is permitted to skip graph queries after reading the revised Skill; the recorded number of graph calls is zero. It is not a discovery-only experiment in which the Skill body is never loaded.

## Components

- `prepare.cjs`: copies the snapshot referenced by `../results.json` to two independent workspaces, checksums source, and installs the query Skill/graph in B only. An optional first argument supplies a healthy, already-provisioned node_modules directory shared read-only by both arms.
- `observe.cjs`: common read/search/query/test wrapper. It records the exact displayed text, arguments, phase, exit status and truncation. It does not select source files for the agents.
- `acceptance.fixture.ts`: parent-only acceptance tests; copy to an isolated grader as `acceptance.test.ts`. `AB_WORKSPACE` identifies the candidate. Do not expose it to either agent.
- `legacy-node26.cjs`: common test-only compatibility shim for the old sample. Production sources are unchanged by setup.
- `collect.cjs`: reads completed subagent sessions, verifies matching model/effort and usage aggregation, counts observations, and saves sanitized records. Requires Python/tiktoken for developer measurement only.
- `verify.cjs`: runs the same hidden acceptance and reverted-sorting mutation checks against completed candidates using their shared runtime. Writes the reports required by the collector; does not edit either candidate.

## Protocol

1. Prepare healthy legacy sample dependencies in an isolated runtime. Do not repair or install into the original sample. The recorded trial normalized old lockfile mirror URLs to the official npm registry while preserving integrity and used `npm ci --include=dev --ignore-scripts`. A raw 2020 sample dependency tree is not production-ready on Node 26.
2. Build the query Skill and create the shared snapshot by running the existing paired benchmark. Then run `node evaluation/query-skill/ab/prepare.cjs <isolated-node_modules>`.
3. Preflight the grader before dispatch: baseline code should run successfully but fail the three sorting assertions. Both candidates use the same Jest config, Node 26.1.0 runtime and shim. Do not count setup against either candidate.
4. Spawn exactly two fresh agents with no history fork, the same model/effort, identical tasks and independent working directories. A may use only source search/read; B must first read and use its installed query Skill. Neither may use MCP, the internet, sibling artifacts or prior reports. Both may patch their own source/tests.
5. Give both tasks in the same order: implement repository `tag ASC` ordering, preserve GET /tags and array/entity contract, add no-DB service/controller tests (nonempty/empty/error/options); then analyze ArticleEntity/Comment/UserEntity relation fields, inverse/owning sides, join metadata, eager/cascade/delete declarations and concrete service dependencies with citations. Do not disclose the parent acceptance tests.
6. Require every read/search/query/test through `node observe.cjs --phase tags|relations OP ARGS...`, with `OP` being `read`, `rg`, `query` (B only), or `test`. Allow normal patch tools. Do not impose artificial source-reading quotas. Require a final REPORT.md and successful unit tests; do not give either arm token-saving targets.
7. After completion, run identical parent acceptance tests. Copy each candidate to a separate mutation workspace, restore the baseline tag service there, and rerun that candidate's tests. Sorting assertions must fail for behavior, not a runtime setup error.
8. Review relationship claims against source; confirm changes stay within the tag task and original-source hashes match. Keep all parent grading outside measured agent sessions.
9. Run `node evaluation/query-skill/ab/verify.cjs <run-dir>`, then `node evaluation/query-skill/ab/collect.cjs <run-dir> <A-session.jsonl> <B-session.jsonl> <new-output-dir> <A-agent-path> <B-agent-path>`. Session metadata must identify the two designated subagents. The collector refuses unfinished sessions, unequal model settings, or replacing an existing metrics file.

The first recorded trial used `/root/ab_source_only` and `/root/ab_query_skill`; these remain the default expected names. Explicit agent paths support new independent trials. The collector expects `<arm>-acceptance.json` and `<arm>-mutation.json` from Jest in the run directory. Use a new output directory for every repeat rather than replacing the baseline.

Only model-count telemetry is treated as actual model usage; one-time text tokenization is a separate metric. Neither is a currency invoice. Do not add reasoning tokens to output tokens again. Do not generalize this single pair to other projects without replicated trials.
