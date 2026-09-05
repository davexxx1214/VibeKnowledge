# Blind grades: export_subset

| Candidate | EX1 | EX2 | EX3 | EX4 | Total | Task mean | Major errors |
| --- | --- | --- | --- | --- | --- | --- | --- |
| X | 1 | 1 | 1 | 1 | 4/4 | 1.00 | 0 |
| Y | 1 | 1 | 1 | 1 | 4/4 | 1.00 | 0 |

Both candidates satisfy every frozen critical item. Neither has a rubric-defined major error; the major-error item ID lists are empty.

Static evidence: X/src/services/exportService.ts:273-311 and Y/src/services/exportService.ts:273-313 implement readonly optional selections, order-preserving entity filtering, relations whose endpoints both identify exported entities, scoped observations including empty arrays, accurate counts, and the preserved full-export envelope. Filtering and Set construction do not mutate caller arrays or graph objects. Both keep the aggregate-first service helpers unchanged (X:698-719; Y:700-721). Y's empty Set remains truthy, so its conditional branch correctly produces an empty selection.

Executed evidence: each candidate's checks.json records all four applicable export acceptance checks passed, two baseline regression checks passed, and typecheck exit 0. Six unrelated acceptance checks were skipped. These results support the source conclusions; no new tests were run during grading.

Candidate test sources were inspected in full (X/src/services/exportService.test.ts:1-162; Y/src/services/exportService.test.ts:1-145). X/REPORT.md reports 14 passing candidate tests and Y/REPORT.md reports 12; those runs are not separately recorded in checks.json. The candidate tests use stubbed services and a mocked filesystem write. No full-suite or extension-host integration results are supplied. Differences in test count or implementation style do not change the grades.

This grades only the supplied export_subset task. No cross-task overall mean was inferred. Item-specific evidence and reasons are in grades.json.
