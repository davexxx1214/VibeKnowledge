# Page / feature briefs

Use when generating or refreshing a named page, user-visible capability or
technical feature. A brief is a compact semantic projection alongside the graph,
not a new graph layer full of method/test nodes. Keep framework overview small.

Publish under `.vscode/.knowledge/feature-briefs/<key>.json`; a small `index.json`
is maintained by the publisher. Use the corresponding group key when available.
Do not generate a card for every source file or every page preemptively.

Inspect the feature's actual entry, implementation, direct dependencies and
relevant tests once during generation. Use existing graph paths to guide this
review; inspect runtime wiring/configuration where graph coverage is incomplete.
Write only reusable project facts, never instructions tailored to a future coding
task, expected benchmark answer, fix patch, or a generic coding checklist.

A draft is JSON with these fields:

- `key`: lowercase kebab-case; stable on refresh; `index` is reserved.
- `name`, `summary`: user-facing feature and responsibility, not a filename list.
- `keywords`: short routing terms (page, route, feature names/synonyms).
- `entries`: source locations `{filePath, startLine, endLine}` for route, command,
  controller or other actual entry points.
- `facts`: concise items with `kind`, `text`, `certainty`, and `evidence` (a
  nonempty array of those source locations).
- `limitations`: concrete boundaries of this card (excluded areas, unavailable
  runtime/configuration facts). No claim of whole-project completeness.

Fact kinds:

- `capability`: what the page/feature does, including important states/branches.
- `dependency`: main implementation chain and direct shared dependencies, with
  roles rather than bare imports. Include a non-obvious consumer when relevant.
- `framework`: only libraries/runtime mechanisms relevant to this feature. Cite
  package/configuration sources for versions; do not guess from API shape.
- `test`: an existing test file and the behavior its assertions cover. A test
  filename is not measured coverage; do not claim it passed without execution.
- `constraint`: source-backed non-obvious assumptions, failure paths, ownership,
  ordering, lifecycle or freshness boundaries. Do not invent a pitfall to fill a
  section. A missing declaration only establishes absence in the checked scope.

`certainty` is `observed` for directly supported facts or `inferred` for synthesis
which still requires verification. All factual items need evidence. Keep the
card useful within roughly 1–2k query tokens; move peripheral detail to a peer
feature or leave it in source. This is not a quota that permits losing a critical
constraint. Do not reproduce whole functions or the audit report.

Write a reviewed draft in the target workspace and publish it:

```sh
node <skill>/scripts/publish-feature-brief.mjs --workspace <project> --input <draft.json>
```

The publisher validates fields, file paths and evidence line ranges, fingerprints
all cited source files, and replaces only that card/index entry. Invalid drafts
do not replace the previous card. Publication is per-file atomic, not a database
transaction. Semantic truth still requires the reviewing Agent; passing the
publisher is not a factual-correctness certificate. Never edit fingerprints by
hand or write human SQLite overrides into a brief.

Publish serially. An exclusive `publish.lock` prevents concurrent index updates;
if an interrupted publisher leaves a lock, report it and inspect the owner before
explicit recovery, never automatically delete it. Reads are bounded (2 MiB per
cited file, 64 MiB total); unavailable or oversized cited files invalidate the
card for queries. Evidence source and draft files must be UTF-8; other encodings
are rejected instead of hashing lossy replacement characters. Prefer citing
focused source files rather than generated blobs.

Refresh when cited behavior changes. Querying a stale card withholds its semantic
facts; it does not silently regenerate or install anything. New callers/unlisted
files are outside these fingerprints: use graph impact/source checks for changes
which extend beyond the card's scope. Record generation cost separately when
evaluating repeated-query savings.
