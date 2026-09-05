# Unicode-safe CodeLens description limit

Changed `src/providers/knowledgeCodeLensModel.ts:50` to count and slice Unicode code points using `Array.from`. After existing whitespace compaction, descriptions of at most 96 code points remain complete; longer descriptions use the first 95 code points and the existing `…`. Empty-description fallback and surrounding CodeLens behavior are preserved.

Added regression coverage in `src/providers/knowledgeCodeLensModel.test.ts:58` for ASCII limits, 95/96/97 emoji, an emoji at the truncation boundary, whitespace compaction before counting, and empty/whitespace/undefined fallback. Existing statistics and location checks remain covered.

Verification actually run:

- `node observe.cjs test src/providers/knowledgeCodeLensModel.test.ts` before the implementation: 5 failed, 6 passed, confirming Unicode regressions.
- Same focused command after the implementation: all 11 tests passed.
- `node observe.cjs typecheck`: passed, exit 0.

Limitations: this implements the requested code-point limit, not grapheme-cluster preservation. The full test suite and live VS Code UI were not exercised.

Files inspected: `src/providers/knowledgeCodeLensModel.ts`, `src/providers/knowledgeCodeLensModel.test.ts`. Initial navigation used the assigned observer context query; no graph regeneration was performed.
