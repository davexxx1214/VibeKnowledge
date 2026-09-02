# Structural cache and recovery

Read this reference when diagnosing incremental extraction, cache reuse, or a recovery refusal.

## Layout

```text
.vscode/.knowledge/cache/structural/
├── index.json
└── entries/<cache-key>.json
```

The index records the structural schema version, extractor version, scope, normalized compiler-configuration hash, and active file descriptors. Each content-addressed entry stores one file's entities, first-pass relations and diagnostics, resolved relations and diagnostics, external endpoints, plus import/re-export/export summaries.

The cache key is SHA-256 over:

1. cache format version;
2. structural graph schema version;
3. extractor version;
4. workspace-relative file path;
5. source content SHA-256.

It contains no checkout-specific absolute path, so an unchanged cache can be reused after copying the workspace.

## Incremental invalidation

A changed or new file is parsed again. A deleted file is removed from the active index. Cross-file resolution runs for changed files and the transitive reverse-import closure calculated from both the previous and current import summaries. Unaffected files reuse their cached contributions.

Every completed update rebuilds and validates the whole merged `structural-graph.json`; therefore deleted entities cannot leave dangling cached relations. The graph, cache entries, and cache index are each written through a temporary file followed by atomic replacement.

## Recovery rules

Normal and background updates preserve the existing graph when:

- the graph or cache is unreadable or structurally invalid;
- a previously valid, changed source file now has a syntax error;
- file, entity, or relation counts shrink past the abnormal-reduction thresholds.

Review source changes before recovery. Use `--force` only when the reduction or broken source is intentional:

```bash
node .agents/skills/vibeknowledge-dependency-graph/scripts/extract-structural-graph.mjs --workspace . --scope . --force
```

`--force` ignores the existing cache, performs a complete rebuild, and permits replacement after schema validation. It does not bypass schema validation.
