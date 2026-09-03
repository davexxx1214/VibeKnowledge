# Phase 7 evaluation

This benchmark uses a fixed NestJS RealWorld task set to compare three retrieval modes:

1. lexical source search without a Knowledge Graph;
2. the compact per-group Markdown view;
3. the actual MCP protocol tools backed by the curated and structural graphs.

It records conservative estimated context and retrieval-output tokens, source files read, tool calls, median retrieval time, expected-file precision/recall, expected-term recall, a combined evidence-coverage score, and omission rate. The coverage score is a retrieval proxy, not an LLM answer score, and token counts are not provider billing telemetry.

The report also estimates the cost of injecting the complete `knowledge-graph.md`, checks structural freshness by source-content hash, and checks curated-graph freshness against the modification time of each referenced workspace file. A structural graph generated after a curated graph is reported as generation order only; it does not by itself make the curated graph stale.

## Run

Build the MCP package and refresh the structural graph before the benchmark:

```powershell
npm --prefix packages/mcp-server run build
node resources/skills/vibeknowledge-dependency-graph/scripts/extract-structural-graph.mjs --workspace D:/workspace/nestjs-realworld-example-app --scope .
node evaluation/phase7/run-evaluation.mjs --workspace D:/workspace/nestjs-realworld-example-app
```

Use `--budgets 400,600,1000,1600` to change the MCP budget sweep, `--repeats 10` to change timing repetitions, or `--output <path>.json` to keep another result set.

The runner never changes application source files. Its stale-graph check mutates one source string only in memory, verifies the structural content hash mismatch, and records whether source-search fallback would trigger. Generated results are committed as a reproducible baseline; elapsed time can vary between machines.
