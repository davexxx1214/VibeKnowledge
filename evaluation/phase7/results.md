# Phase 7 retrieval evaluation

- Generated: 2026-09-03T04:09:24.812Z
- Sample: `D:/workspace/nestjs-realworld-example-app`
- Tasks: 5
- Recommended MCP budget: **600 tokens**
- Structural graph fresh: **true**
- Curated graph source-fresh: **true**
- Structural graph generated after curated graph: **false** (informational, not a stale verdict)
- Complete audit Markdown: **10679 estimated tokens**

> Token counts are conservative estimates, not provider billing telemetry. Correctness is an evidence-coverage proxy, not an LLM answer score.

## Key comparison

At the recommended budget, MCP used **38.6% fewer estimated input tokens** than source-only retrieval (1073 tokens/task), while the correctness proxy changed by **+4.8 percentage points**. Against compact Markdown, MCP used **29.5% fewer input tokens** and changed correctness by **+17.8 percentage points**.

The average MCP retrieval payload was **96.2% smaller** than injecting the complete audit Markdown (10268 estimated tokens saved before source reads).

## Mode summary

| Mode | Correctness proxy | Omission | Input tokens | Retrieval tokens | Files read | Tool calls | Median ms | Truncated tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| noGraph | 85.6% | 7% | 2783 | 144 | 5 | 6 | 5.529 | 0 |
| compact | 72.6% | 25.2% | 2426 | 855 | 4.8 | 6.8 | 0.79 | 0 |
| mcp | 90.3% | 10% | 1710 | 411 | 3.6 | 4.6 | 3.933 | 3 |

## MCP budget sweep

| Budget | Correctness proxy | Omission | Input tokens | Retrieval tokens | Truncated tasks |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 400 | 91.3% | 10% | 1549 | 279 | 5 |
| 600 | 90.3% | 10% | 1710 | 411 | 3 |
| 1000 | 86.6% | 10% | 1957 | 572 | 2 |
| 1600 | 86.6% | 10% | 2139 | 753 | 2 |

## Per-task results

| Task | Mode | Correctness proxy | Omission | Input tokens | Files | Calls | Missed files |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| locate-tag-sorting | no-graph | 87.5% | 0% | 2428 | 5 | 6 | — |
| locate-tag-sorting | compact-markdown | 78.6% | 20% | 969 | 4 | 6 | src/tag/tag.controller.spec.ts |
| locate-tag-sorting | mcp-600 | 78.6% | 20% | 836 | 4 | 5 | src/tag/tag.controller.spec.ts |
| test-invalid-login | no-graph | 87.5% | 0% | 2968 | 5 | 6 | — |
| test-invalid-login | compact-markdown | 42.5% | 56% | 1672 | 5 | 7 | src/user/user.controller.ts<br>src/user/user.service.ts |
| test-invalid-login | mcp-600 | 100% | 0% | 1866 | 3 | 4 | — |
| modify-article-favorite | no-graph | 83.3% | 15% | 3609 | 5 | 6 | src/user/user.entity.ts |
| modify-article-favorite | compact-markdown | 83.3% | 15% | 4497 | 5 | 7 | src/user/user.entity.ts |
| modify-article-favorite | mcp-600 | 78.6% | 30% | 3234 | 3 | 4 | src/article/article.entity.ts<br>src/user/user.entity.ts |
| impact-auth-middleware | no-graph | 94.4% | 0% | 1376 | 5 | 6 | — |
| impact-auth-middleware | compact-markdown | 83.3% | 15% | 1815 | 5 | 7 | src/user/auth.middleware.ts |
| impact-auth-middleware | mcp-600 | 94.4% | 0% | 1678 | 5 | 6 | — |
| trace-entity-cycle | no-graph | 75% | 20% | 3534 | 5 | 6 | src/user/user.entity.ts |
| trace-entity-cycle | compact-markdown | 75% | 20% | 3177 | 5 | 7 | src/user/user.entity.ts |
| trace-entity-cycle | mcp-600 | 100% | 0% | 937 | 3 | 4 | — |

## Stale graph scenario

A source-only mutation was simulated for `src/tag/tag.service.ts`. Hash validation detected it: **true**; source-search fallback triggered: **true**.
