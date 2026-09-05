# Unicode description limit

Updated `src/providers/knowledgeCodeLensModel.ts:50` so `compactDescription` counts and slices Unicode code points using `Array.from`. Compacted descriptions of at most 96 code points remain complete; longer descriptions retain 95 code points plus the existing `…`. Whitespace compaction, entity-name fallback, and surrounding CodeLens construction are unchanged.

Added regression cases in `src/providers/knowledgeCodeLensModel.test.ts:58` covering 95/96/97 emoji, an emoji at the truncation boundary, 96/97 ASCII characters, whitespace compaction before counting, and empty/whitespace-only/undefined fallback. Existing graph statistics and location filtering assertions remain covered.

Verification actually run:

- `node observe.cjs test src/providers/knowledgeCodeLensModel.test.ts` before the source fix: 5 failed, 6 passed, reproducing premature truncation and split surrogate pairs.
- The same command after the fix: all 11 tests passed.
- `node observe.cjs typecheck`: passed (exit 0).

Limitations: counting follows the requested code-point semantics; a multi-code-point grapheme can still be split. The full test suite and a live VS Code session were not run.

Files inspected: `src/providers/knowledgeCodeLensModel.ts`, `src/providers/knowledgeCodeLensModel.test.ts`. The assigned structural context query was used first, then implementation and test behavior were checked directly in source.
