# Candidate r3 freeze

Frozen before any r3 task-agent run. The feature author and rubric author are
independent; neither receives future task answers or candidate outcomes.

- Query bundle SHA-256: c5f78528aa8c3479b66a2d7aab97aa655c2a42a6d17fb1fbd15bd1bb0f01aa25
- Query Skill SHA-256: 358f517636c58386be942b1f7e05554d936a4c732ab9cb477e03b89c2fa436a1
- Source snapshot: task-context-ab-9W8uP7, unchanged selected VibeKnowledge source.
- Change: distinct feature facets before repeated entries/dependencies; explicit
  missing-kind notification; explanation uses current brief evidence without
  mandatory rediscovery, but editing still requires relevant source verification.
- Root: 255 tests / 35 files passed, typecheck passed.
- MCP: build and 107 tests / 11 files passed.
- Node 26.1: feature/query subset 36 tests passed.
- Source and distributable Skill validation passed.
- Evaluation accounting: 3 synthetic regression tests passed.
- Independent code review found no blocking facet-selection/budget issue.
- `vsce ls --no-dependencies` confirms evaluation files are excluded and the
  standalone query runtime is included (packaging-only change, not the candidate).

The per-pair manifests will bind source, published brief, index and complete
installed Skill hashes. Do not edit these inputs while the pairs run. Run the
same three-pair gates from ../protocol.md; retain the failed previous candidate.
