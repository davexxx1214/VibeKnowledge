# Structural Graph v1

`<workspace>/.vscode/.knowledge/structural-graph.json` is the complete deterministic code-fact graph. It is separate from the curated `agent-graph.json` and is not loaded into Agent context or rendered in the default Webview.

The normative machine schema is [structural-graph.schema.json](structural-graph.schema.json). The standalone validator also enforces global identity, endpoint, line-range, and source-file invariants that JSON Schema cannot express conveniently.

## Producers and consumers

- The TypeScript Compiler API extractor writes version `1`.
- Future language adapters may contribute the same entity and relation shapes.
- Query and boundary-reduction stages may consume this graph, but must not treat it as a curated user-facing view.
- `agent-graph.json` remains version `2` and keeps human descriptions and Agent-selected boundaries separate.

## Identity

- File entity: `<workspace-relative-path>`.
- Symbol entity: `<workspace-relative-path>#<qualified-symbol>`.
- External package: `external:<package-specifier>`.
- Keys are deterministically generated. Canonical aliases are comparison-only.

## Relations

Every relation contains one source location plus:

- `origin: ast` when syntax alone establishes the target;
- `origin: resolver` when module or symbol resolution is required;
- `confidence: extracted` for direct facts;
- `confidence: inferred` for deterministic synthesis such as a resolved wildcard re-export;
- `confidence: review_required` only when retaining an ambiguous fact is more useful than omitting it.

The first extractor omits ambiguous cross-file symbol targets and records a diagnostic rather than guessing.

## Diagnostics

One malformed source file produces an `error` diagnostic and a file entity, but no declaration or relation facts for that file. Other files continue to be analyzed. The writer validates the complete document before atomically replacing the last valid output.
