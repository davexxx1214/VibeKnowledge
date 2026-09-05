# Selected JSON export

Implemented `exportToJSON(outputPath, options = {})` with optional `entityIds?: readonly string[]` in `src/services/exportService.ts:273`.

- Filters existing entities in their original order and includes only relations whose endpoints are both exported (`src/services/exportService.ts:277`). Unknown and repeated IDs are harmless; an empty selection exports empty collections.
- Collects observations only for exported entities and calculates statistics from the exported collections (`src/services/exportService.ts:291`). The JSON envelope, serialization and full-export behavior are preserved when selection is omitted.
- Added tests for both legacy and knowledge-graph service routing, omitted options, readonly input, ordering, duplicate/unknown IDs, dangling endpoints, self-relations, empty selections, isolated selected entities, observations and counts (`src/services/exportService.test.ts:89`).

Verification actually run:

- `node observe.cjs test src/services/exportService.test.ts` — passed, 1 test file / 14 tests.
- `node observe.cjs typecheck` — passed, exit 0.

Limitations: tests use service stubs and a mocked filesystem write; no extension-host integration or full-suite run was performed. No known implementation gaps remain.

Files inspected through source reads: `src/services/exportService.ts`, `src/services/exportService.test.ts`, `src/utils/types.ts`, `src/services/knowledgeGraphService.ts`, `src/services/observationService.ts`, `src/services/dependencyAnalyzer.ts`, `src/services/aiIntegrationService.test.ts`, `src/i18n/i18nService.ts`, `tests/setup.ts`, and `package.json`. Targeted source searches also located the existing one-argument caller in `src/ui/commands/entityCommands.ts`. The observer declined the attempted `vitest.config.ts` read; its contents were not inspected.
