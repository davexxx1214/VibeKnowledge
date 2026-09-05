# Independent MCP harness review

Reviewed on 2026-09-04 without inspecting any old or new candidate answer,
candidate observation log, score, or arm-to-anonymous-grade mapping. This is a
code/design review, not certification that the eventual runs complied. Only
this review file was written. No candidate observer was invoked.

## Disposition

The bridge genuinely uses MCP SDK stdio and the design can measure the stated
restricted workflow. No product/API change or candidate restart is recommended.
Publication still needs the delivery, command-compliance and provenance checks
below. An arithmetic gate result alone is not an experiment-validity verdict.

Reviewed the seven requested files completely, plus `summarize.cjs`, the shared
`session-accounting.cjs`, public-output measurement v3, delivery audit v2 and
their three synthetic accounting tests. Relevant product resource/database,
RAG, locale and installed SDK transport implementation were also inspected.
The review was updated for the collector's MCP-config assertions and the
summarizer's later same-session delivery-audit binding; those are accounting
changes, not changes to frozen task inputs.

## What the implementation establishes

- `mcp-client.mjs:7-22` resolves the installed SDK, constructs `Client` and
  `StdioClientTransport`, launches `runtimeRoot/dist/index.js`, connects, then
  invokes the real tools/list. Calls and resource reads use the same client.
  There is no Skill dispatch or mocked handler. The installed SDK starts the
  child with pipes, `shell: false`, and hidden windows on Windows.
- The command line explicitly binds the candidate workspace and sets
  `--rag-mode none`. The product's RAG factory returns null in that mode and
  `ask_question` is not registered. The bridge supplies no invented feature
  brief/context operation. The overview resource returns actual product text.
- This is a new server process per invocation. Handshake, child startup and
  bridge execution contribute to elapsed time; SDK protocol envelopes and
  successful server stderr are not all injected into the model. Tool results
  are reduced to their text blocks. This is correctly not described as native
  host discovery, persistent-client latency or raw wire-byte overhead.
- `observe.cjs:38-42` records the exact capped stdout text, exit footer,
  operation, arguments, phase, duration and truncation marker before printing
  it. Failed/repeated calls are retained. The 18,000-character limit applies
  before the marker/footer, so final emissions can be slightly longer.
- Preparation checks the retained source hashes and creates a new empty DB,
  with no human observations/description overrides. B receives condenser
  output and raw structural facts, not a semantic answer authored for these
  questions. All three pairs receive the same prepared artifacts.
- Collection rechecks listed source/artifact/runtime files and both wrappers,
  verifies B's exact runtimeRoot config and A's lack of that config, rejects A
  observer MCP operations, and requires successful B discovery. It validates
  one completed non-aborted task with matching turn identity and checks the
  deduplicated response-usage sums against the final numeric totals.
- Public-output measurement v3 counts function/custom tool text including
  outer wrapper text and errors. Combined with observer totals and actual
  uncached-input-plus-output telemetry, this addresses the fact that observer
  stdout is not necessarily what the model received. It excludes non-public
  event text from exported metrics.

## Required post-collection checks

### 1. Delivery and compliance are different checks

Delivery audit v2 consumes matching occurrences and catches duplicated
observations that were delivered only once. It is intentionally one-way
substring matching, not call-identity or command-compliance proof. An
independent in-memory fixture using the actual audit script passed when every
observation was delivered but an additional unobserved public source output
was present. The fixture used synthetic events only and made zero disk writes.

The observer is not a security boundary: `rg` receives arbitrary arguments
without workspace/path validation (`observe.cjs:30`); `read` checks lexical
containment but neither realpath containment nor the forbidden-artifact list.
It can therefore read in-workspace briefs/reports if instructed, and `rg` can
name outside paths or command-executing options. No such misuse was observed
in this review because candidate traces were deliberately not inspected.

Before making a result claim, separately audit public tool-call instructions:
assigned cwd, observer-only source access, all rg/read paths and options,
allowed MCP entry points, no other workspaces/briefs/full artifacts/internet,
and only the permitted REPORT write. Check phase ordering and that the first
B observation is successful visualization discovery. Reconcile all observer
invocations to observations, not only observations to delivered text. Export
only an appropriate public/numeric compliance summary, not full sessions.

The updated summarizer binds delivery audit v2 to the metrics' sessionId and
agentPath and emits `deliveryAuditsPassed`. Its arithmetic `gates` booleans
remain independent of that field. Treat a false/unclear delivery or compliance
result as a publication blocker even if an arithmetic gate is true. The parent
has explicitly committed to this separate validity check.

### 2. Remaining freeze/provenance limits

`prepare.mjs:52-70` freezes dist, package.json, lockfile, source, artifacts and
wrappers. This is useful, but the manifest is not a complete reproducibility
envelope:

- It omits actual installed dependency contents/versions, the Node executable
  hash and executable path, rg version, and condenser script/dependency hashes.
  `node: process.version` is preparation-time, not proof of the runtime used by
  each candidate's `node` command. A package-lock hash does not verify installed
  node_modules. The shared runtime directory is checked after runs, not copied
  per invocation; temporary changes reverted before collection are undetectable.
- It does not bind tasks.md, the actual dispatched arm prompts, rubric,
  interpretation notes, preparation/collection scripts, or the original
  structural-graph input to an earlier archived graph digest. The original
  preparation manifest's `graph` field contains counts/time, not a graph hash.
  The new bArtifacts hash freezes what was copied now, but alone does not prove
  that those raw facts are unchanged from their original generation.
- Hash mismatch checks cover listed files only, not extra files. They cannot
  independently prove A had no extra knowledge artifact or that no prohibited
  generated file was created. MCP configuration content is now explicitly
  checked, which closes that particular earlier omission.
- `candidateSha256` is constructed from runtimeHashes in preparation; the
  collector validates those constituent file hashes but does not recompute
  that aggregate identifier. Keep the manifest and its provenance together;
  the identifier alone is not an independent runtime attestation.

Do not retroactively claim missing values were frozen before the run. A
post-run audit may record current runtime/dependency/tool versions, compare
published raw-artifact hashes where available, bind the actual public prompts
to the unchanged task text, inventory permitted additions and verify graph
source digests where recorded. Label these as post-run evidence and disclose
anything that cannot be established. Do not regenerate or alter candidate
graphs to repair provenance after answers exist.

### 3. Accounting assertions are necessary but not exhaustive

Collection uses the first turn_context for model/effort; independently confirm
all public/numeric contexts agree, the six session IDs are distinct, and no
inherited/follow-up candidate conversation was included. Require finite,
nonnegative numeric usage, cached input no larger than input, real response
identifiers, and nonempty model/effort metadata. The existing sum checks do not
enforce all these properties. Record per-phase failed reads, searches, resource
and discovery calls from observations, not just successful MCP query counts.

The public metric and observer metric deliberately measure different text.
Do not add them together or substitute reportTokens for model output tokens.
Discovery schemas, report-writing tool responses and wrapper failures belong
in the delivered-public-text measure. Server preprocessing cost is additional;
the recorded condenser durations do not represent historical raw extraction,
installation or independently authored brief generation costs.

## Frozen rubric and gate interpretation

The two public functional task bodies match r3. No scoring changes are proposed.
The review-notes treatment of non-exhaustive examples and compound 0/0.5/1
criteria is appropriate. I.C7's locale caveat is independently confirmed:
`AIIntegrationService` compares `getLocale()` with `zh`, but the locale service
returns `zh-CN`/`en-US`. Score the existing shared-builder and sequential-write
consequences; do not require a false assertion that Chinese routing works.

Protocol lines 34-35 can be read as imposing pairwise non-regression on both
gates, whereas the original quality gate and the summarizer require aggregate
miss reduction and strict improvement in at least two pairs. This wording
ambiguity was raised before inspecting results. The parent's recorded decision
is to use the original quality gate unchanged and disclose the ambiguity, not
silently choose the more favorable interpretation after grading. Supplemental
facts remain separate from `17 - critical` misses. Finite rubric coverage is
not exhaustive truth or a real-browser/Copilot integration test.

## Review boundary

No experimental outcome, actual task compliance or actual delivery success is
certified here. Remaining audits can be performed after collection without
changing tasks, data, rubric or answers. A different fresh agent should perform
blind grading; this reviewer has inspected method information and should not
serve as a method-blind grader for these runs.
