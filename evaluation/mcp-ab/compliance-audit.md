# Independent compliance and provenance audit

Final conclusion: **pass with limits** (2026-09-04T15:08:51.363Z). No confirmed unauthorized operation was found in the audited public evidence. This is not an unqualified authorization-provenance or pre-run-environment proof.

## Preserved automatic findings and adjudication

The original automatic result was `fail`: each of six candidates made one first-command `Get-Content -LiteralPath .../evaluation/mcp-ab/tasks.md -Raw` outside the observer, and the parser could not find the functional task in role=user content. The byte-for-byte original reports are preserved as `compliance-audit.automatic.json` and `.md`, with hashes in the final JSON. No original finding was silently dropped.

The only outside read was the identical public task document. All six public bootstrap outputs contain the complete unchanged document. The primary agent’s explicitly labeled dispatch transcript authorizes this symmetric bootstrap exception. Independent checks bind all six parent public spawn records to task names, `fork_turns=none`, absent model/effort overrides, timing and the opaque task payload received by the correct candidate. Exact authorization plaintext cannot be recovered from the persisted payload; its wording remains transcription-based.

The prompt-location finding is a parser-assumption false positive: role=user contains environment scaffolding; the real task arrives in an opaque agent_message and the common functional instructions are delivered by the bootstrap read. Adjudication changes audit interpretation only, not candidate inputs or the protocol.

## Independent command and delivery checks

| Session | Observer commands | Call-ID-bound deliveries | Internally capped outputs | Final files |
|---|---:|---:|---:|---:|
| 1A | 54 | 54 | 0 | 228 |
| 1B | 50 | 50 | 1 | 235 |
| 2A | 43 | 43 | 1 | 228 |
| 2B | 55 | 55 | 0 | 235 |
| 3A | 49 | 49 | 0 | 228 |
| 3B | 43 | 43 | 1 | 235 |

All 294 observation entries match exact public command phase/operation/arguments and a distinct displayed-text occurrence under the requesting public call ID. Separate delivery-v2 artifacts also match the six session IDs and counts; zero outer truncation markers were found. Three observer-internal caps remain part of what candidates actually saw. The six task-document bootstraps are outside the observer count and belong in total public-output accounting.

All shell calls use the assigned workspace; all source searches/reads and B queries use its frozen observer. The only public orchestration callees are `text`, `tools.exec_command` and `tools.apply_patch`. Every rg path/option, read path, MCP argument list and patch target was inspected. The structural-analysis.mjs read is product implementation, not Skill instructions. No direct Skill/brief/full-graph reads, cross-workspace reads, extra tools, network, tests/builds or extra candidate writes were detected. Each candidate added only its own REPORT.md; observer log creation is expected. Reports were not opened and patch bodies were not exported.

All six sessions have one fresh completed task, no prior public assistant/tool history, distinct session IDs and `gpt-5.6-sol` / `xhigh` in every context. No context changes or forked-history evidence were found. Public spawn settings independently say no fork; no broader claim about undocumented platform internals is made.

## Freeze and provenance

All candidate source/artifact/wrapper hashes and B runtime configuration match their manifests; no unexpected files or links were found. All 51 runtime files match for each pair, with candidate digest `8ae701edd1c363b07dc9b46a953abb75158195c4917f9bcd062da220c028aeb7`.

Raw structural graph SHA-256 `3339ea221621cc87cbeac5c242f038d97b28af5fcb097ccd5a0247671975203c` matches all three historical r3 bArtifacts digests, the old raw graph, the newly prepared artifact and B workspace copies. No old trajectory, answer or score was used.

Observed tools: Node v26.8.1; ripgrep 15.2.0 (rev e89fff89ac); MCP 0.5.0; MCP SDK 1.30.0. Exact binary, dependency tree, active SDK entrypoint and condenser-script hashes are in the JSON. The initial SDK root-resolution diagnostic is not a missing dependency: the two subpath entrypoints actually used by the bridge resolve and are fingerprinted. Source snapshot manifest version 0.4.0 and actual MCP runtime 0.5.0 are different and disclosed.

## Limits

- Dispatch task-name/forkTurns/timestamp/opaque-payload identity is independently checked against the public parent log, but exact dispatch plaintext and bootstrap authorization wording rely on the explicitly labeled primary-agent transcript. No decryption or cryptographic plaintext proof is claimed.
- Environment/dependency/condenser fingerprints were first collected at 2026-09-04T14:51:38.107Z, after pair 1 and during pair 2, then at 2026-09-04T15:01:18.966Z. They are supplemental matching observations, not an all-pairs pre-run freeze.
- Final hashes and file inventories cannot exclude transient reverted modifications. Node executable identity for candidates is inferred from unmodified node commands/PATH rather than per-child process attestation.
- This measures observer-wrapped actual MCP SDK stdio calls with RAG disabled, not native host discovery, a persistent MCP session, future brief/context interfaces, or implementation correctness/quality gains.
- Arm B is always launched after Arm A by about eight seconds, and all pairs use the same task/source/runtime. Three repeats do not establish generalization or randomize environmental/order effects.

No candidate answer/score or private reasoning/system content was used or exported. Public result bodies were checked only for task delivery and observation accounting, not written to these artifacts. Quality grading and efficiency conclusions are separate from this compliance result.
