# Independent accounting review

Outcome: **pass_with_limits**, reviewed by a separate fresh audit agent
(`/root/routing_final_audit`) after task runs and grades. It made no file changes
and did not regrade answers or see candidate private conversations.

The reviewer independently recomputed all 127 observed-text counts with
tiktoken 0.12.0/o200k_base, phase/report counts, numeric telemetry sums, arm
medians, grades/mappings, and generation cost. It checked protocol/task/rubric/
observer/brief hashes and source hashes in snapshot/author/designer workspaces.
It found no discrepancy requiring a result or gate change.

It confirmed that summary.json and summary-v2.json contain identical pair data;
the disclosed aggregation correction changes only how percentages are combined.
Both calculations fail both gates. The coordinator checked the preceding r3
summary/script for the arm-median convention; that historical check was outside
the independent reviewer's permitted scope.

Limits retained in the review:

- The archived numeric public-tool counts and delivery audits were checked, but
  the reviewer did not read private session containers to retokenize tool-wrapper
  text. Those wrappers are not separately archived. Delivery matching is
  multiplicity-aware, not call-identity proof; public-call scope checking is not
  a sandbox.
- Dispatch used fresh no-history agents and separate roles/workspaces. Archived
  scope evidence alone cannot prove every role's lack of prior information or
  reconstruct the original fork setting. Three runs of the same staged task are
  not cross-task/statistical independence or an external third-party validation.
- This dataset did not stress source/output limits: largest source 127,131
  bytes, largest brief's total cited sources 200,367 bytes, longest observed
  output 8,005 characters. Boundary behavior is covered by separate unit tests.
- All B agents used only discovery and one full brief. The new incremental
  options were not exercised by task agents, so no behavioral savings claim for
  them is justified.
- MCP parity was correctly separated from full-task/native-host savings. The
  reviewer did not inspect MCP implementation/tests and does not independently
  attest to their execution.

No private reasoning/system instructions were exported.
