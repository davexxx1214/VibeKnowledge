# Blind brief review

Read only the assigned X/Y drafts and fixture source. The task is a reusable
Shelf export feature brief, not a code repair. Score these eight existing
behavioral relationships 0 (missing/wrong), 0.5 (substantially incomplete), or
1 (accurate and source-supported); do not reward verbosity or code reproduction.

- R1: Normal activation registers export -> command -> exporter, and requires
  workspace at activation. No-workspace activation installs a distinct placeholder
  and returns; the method guard is a separate path, and opening a workspace alone
  does not replace the already registered handler.
- R2: formatTag returns MIME values while render compares to short 'json', so both
  supported preferences currently produce joined plain text. Evidence covers both
  producer and consumer. Nonempty structured test does not establish JSON output.
- R3: save writes a fixed shelf-export.txt path then appends its index, returning
  path only after both succeed. Store/transport overwrite or atomicity guarantees
  are unspecified; do not infer local filesystem semantics from the name write.
- R4: If appendIndex fails after write succeeds, earlier write is not rolled back
  by this layer; the command reports failure, and no reveal occurs on that path.
- R5: Successful save notifies success before optional reveal; reveal failure also
  reports failure after persistence, so messages can include both success/failure.
- R6: Preview shares render, but does not save/index; renderer changes affect both.
- R7: The tests prove mocked order/path/plain content and nonempty structured
  output only. They do not exercise activation, real transport, failed writes/index
  or reveal. Test names are not evidence of those untested behaviors.
- R8: Host/register/notify/reveal and Store/Transport are injected boundaries;
  repo source does not implement platform registration, networking guarantees or
  filesystem behavior. State and preference influence render/reveal respectively.

Record independently any false claims that would mislead a change in behavior
(e.g. JSON works, rollback, local overwrite, activation automatically repairs its
placeholder). Keep unsupported minor wording separately. No deduction merely for
not mentioning every example; concrete limitations can qualify inferred effects.
Give report fact indexes and source file:line evidence for each judgement.
Do not read mapping, author instructions, token metrics or other experiments.
