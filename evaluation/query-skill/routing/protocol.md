# Ranked feature discovery and progressive facts: development validation

Frozen before any task-agent runs. Candidate implementation/tests may be changed
before freeze; never tune to scored task trajectories and call it a held-out win.
Three new matched A/B pairs on a previously untested real Yuxi frontend snapshot.
A uses source inspection; B also has the portable query Skill and reusable briefs.
No RAG, server, database or embedding dependency; no graph traversal claim for Vue.
Frontend-only scope omits backend and binary assets in both arms.

An independent author receives only five requested page areas and raw source,
not task wording/rubric/expected savings. A different independent designer sees
raw source and the same page areas, not briefs/candidate implementation/prior
results. It prepares one discovery task, one follow-up on the same feature,
and a known-file local control, with a source-backed rubric. The two first phases
run sequentially in one fresh session to test reuse, not isolated cold prompts.
This is prospective development validation, not broad unseen-task generalization.

Freeze source hashes, briefs, installed Skill, task/rubric text, observer, Node
and tokenizer versions before task runs. All candidates use the same model and
reasoning effort with fork_turns=none and isolated workspaces. Alternate launch
order by pair; same phase order in both arms. Only REPORT.md writes permitted.
All reads/rg/query calls go through the observer with 18,000-character cap.
The dispatch supplies common workflow instructions. The observer's `task`
operation releases discovery, followup, control sequentially; later task text
is not loaded before the preceding REPORT section is written. No outside
bootstrap exception. The task-release files are instrumentation, not source.
No network/install/tests/build or access to other arms, grading, full artifacts,
generation instructions, implementation internals or previous evaluations.

Keep the existing practical gates: no pairwise critical coverage loss or extra
major false claim, >=15% lower median observer AND public tool-output tokens,
and >=10% lower uncached-input-plus-output tokens for efficiency. Quality needs
>=20% fewer missed critical points, strict gains in >=2 pairs, no extra major
claims and <=25% added uncached-input-plus-output. Report local control separately
as well as full-session totals; do not discard it for an inconvenient result.
Retain every run, failure, cap and repeat. No runtime or prompt tuning mid-trial.

Use original public-output and delivery accounting with numeric session usage;
do not export private reasoning/system messages. Anonymize method preambles
only and preserve source-answer content for independent blind grading. Publish
cache separately, per-phase reads/queries, hashes, limitations, generation cost
and all grades. This is not a bill or a statistical significance claim. Costs
of authoring briefs and evaluation infrastructure are not warm-query savings.
If no gate passes, report that outcome; do not promise a token improvement.

After this evaluation, expose the same validated query engine through MCP and
test SDK payload parity. Parity does not measure native-host MCP overhead or
prove new full-task MCP savings; that requires another independent experiment.
