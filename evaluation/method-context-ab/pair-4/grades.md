# Blind CodeLens Unicode grades

| Candidate | CU1 | CU2 | CU3 | Total | Task mean | Major errors |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| X | 1 | 1 | 1 | 3/3 | 1.00 | 0 |
| Y | 1 | 1 | 1 | 3/3 | 1.00 | 0 |

Both candidates satisfy all three frozen criteria. Static inspection of `X/src/providers/knowledgeCodeLensModel.ts:50-56` and `Y/src/providers/knowledgeCodeLensModel.ts:50-56` shows whitespace compaction followed by code-point counting, an inclusive 96-point boundary, and truncation to 95 complete code points plus the existing ellipsis. Their model construction at lines 20-46 matches the baseline, preserving fallback, counts, IDs, line conversion, title fields, and filtering. The surrounding `codeLensProvider.ts` files also match the baseline byte-for-byte.

Executed evidence comes from each candidate's supplied `checks.json`: lines 4-6 record CU1, CU2, and CU3 passing; lines 10-12 record all 11 focused tests passing; lines 16-19 record typecheck exit 0. The seven skipped acceptance cases belong to other tasks. Boundary and fallback assertions are visible in `X/src/providers/knowledgeCodeLensModel.test.ts:58-94` and `Y/src/providers/knowledgeCodeLensModel.test.ts:58-127`; existing statistics assertions remain at lines 9-55 in both.

No new tests were run during grading. Both reports (line 13) state that the full suite and live VS Code UI were not exercised. A code-point cutoff may divide a multi-code-point grapheme, which is consistent with this task. Neither candidate meets any frozen major-error condition; there are no affected major-error item IDs. Detailed item evidence is recorded in `grades.json`.
