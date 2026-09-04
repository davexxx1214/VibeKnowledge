# Skill vs MCP dependency query evaluation

Generated: 2026-09-04T10:46:28.906Z

Sample: D:\workspace\nestjs-realworld-example-app; Node v26.1.0; 9 queries; approximate budget 1200.

Both modes use the same generated graph and query algorithms. **9/9 result payloads are byte-identical: retrieval-payload token saving is 0%.**

## Controlled text-token accounting

Counts use tiktoken 0.12.0, o200k_base, not billing telemetry. Questions + results + call argument text are included.

| Nine-query session | Tokens |
| --- | ---: |
| Skill entry + advanced reference once | 5265 |
| MCP all 10 tool definitions once | 6101 |
| MCP dependency-only definitions once | 5962 |
| MCP used definitions once (selective discovery example) | 5642 |
| Warm Skill, no instruction reload | 4083 |
| Warm MCP, no schema reload | 3907 |

Skill change versus all-definition MCP: 13.7% fewer tokens; versus dependency-only MCP: 11.7% fewer. Negative values mean Skill costs more.

Skill instructions: 602; advanced reference: 580; MCP all schemas: 2194. Optional overview payload: 92, not charged above because group keys are supplied in these paired queries.

## Per-query payload and invocation

| Task | Shared result tokens | MCP call tokens | CLI call tokens | MCP ms (warm) | CLI ms (cold) | Truncated |
| --- | ---: | ---: | ---: | ---: | ---: | --- |
| locate-tag-sorting | 599 | 41 | 63 | 19 | 119 | no |
| test-invalid-login | 762 | 39 | 61 | 12 | 114 | yes |
| modify-article-favorite | 685 | 40 | 62 | 10 | 117 | yes |
| impact-auth-middleware | 529 | 37 | 54 | 8 | 101 | no |
| trace-entity-cycle | 349 | 23 | 44 | 7 | 103 | no |
| entity-user-service | 90 | 31 | 51 | 6 | 108 | no |
| neighbors-tag | 262 | 40 | 58 | 8 | 153 | no |
| path-tag-controller | 91 | 48 | 64 | 7 | 160 | no |
| raw-path-tag | 93 | 43 | 61 | 12 | 151 | no |

## Limitations

- Tokenizer counts of explicit text, not provider billing or an end-to-end LLM coding evaluation.
- Result payloads must be byte-identical; reduced payload is not attributed to the transport.
- MCP discovery is client-dependent. Compare all/used definitions and warm/no-discovery cases separately.
- CLI counts example shell arguments; hidden shell tool schema/wrappers, MCP wrappers, caching, reasoning and source reads are not measured.
- Skill entry and advanced reference each counted once per nine-query session. Optional overview adds its call/result tokens.
- Curated graphs exclude tests. Missed expected test files require targeted source search, in both modes.
- The budget uses the existing approximate estimator; actual tokenizer counts can exceed that number.
- Input project is copied and graphs regenerated in an isolated workspace. Original project remains untouched.

## Reproduce

Run from repository root after installing developer dependencies:

```sh
npm --prefix packages/mcp-server run build
node evaluation/query-skill/run.mjs <sample-workspace>
```

Python with tiktoken is required only for this evaluation, not the Skill. Raw transcripts are retained in the reported isolated workspace.
