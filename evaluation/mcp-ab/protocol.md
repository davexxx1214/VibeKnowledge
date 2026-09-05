# Released MCP versus source-only: matched feature analysis

Frozen before task runs, 2026-09-04. Test the released 0.5.0 MCP without adding
new product APIs. Three fresh A/B pairs, the same two feature-analysis tasks,
source snapshot, model/effort, observer, source access and independent blind
rubric as query-skill/context/r3. A is source-only; B may also use the real
MCP server via SDK stdio, with RAG disabled. Do not reuse earlier A answers.

The source snapshot is the retained task-context-ab-9W8uP7 selected source,
verified against its archived hashes. It predates the release manifest bump;
the MCP implementation under test is 0.5.0. Do not pretend these are identical
versions or that this partial source fixture is a complete clone. The omitted
MCP package helper scripts are absent in both arms, as in the Skill trial.

Prepare graphs without test prompts/rubrics: reuse frozen complete structural
facts, and use the shipped condenser for framework plus the two primary scopes
src/ui/webview/graphView.ts and src/services/aiIntegrationService.ts. Do not
broaden to all src or tune nodes/edges from task answers. Copy the previously
independently authored feature briefs unchanged as archival input; current MCP
cannot read them. No semantic graph rewrite is performed: the curated graph is
the deterministic condenser output, not a separately authored semantic graph.
Record that limitation and preprocessing time. Full graphs are not injected.

B discovers the actual tools/list once through the observer. Tool invocation
uses a transparent evaluation-only MCP SDK stdio bridge (one process per
invocation). It does not route calls to the Skill or mock product handlers.
This measures real MCP results plus source reading and model usage, but is NOT
a native Codex/Copilot MCP tool-discovery/transport overhead benchmark. The
bridge's command/wrapper overhead is included; per-call startup is cold and
timing cannot predict persistent native-client latency. Do not add tools for
feature briefs or task context during evaluation. No RAG, internet or LLM call
inside the server. No source-generation or testing by task agents.

Use the original efficiency and quality gates unchanged: efficiency requires
every pair to lose no critical coverage and add no major false claims; it additionally
requires >=15% lower median observer text AND actual delivered public tool
text, and >=10% lower median uncached input plus output. Quality requires >=20%
fewer missed critical facts, strict improvement in >=2 pairs, no extra major
false claims and <=25% median uncached-input-plus-output increase. Preserve
failures. No task/result cherry-picking, retries for poor performance, or
retrospective tuning. Record infrastructure aborts separately.

Report cache separately, numeric model telemetry, all failed/repeated reads,
per-task reads/query counts, source and artifact fingerprints, public-text
truncation audit, timing and independent per-item grades. Tokenizer is
o200k_base, not billing. Generation/update/install costs are separate from
warm artifact reuse. This sample establishes neither broad statistical
significance nor an isolated transport advantage over Skill. The historic
Skill result is descriptive only, not a fresh randomized MCP/Skill A/B.

The original source-backed rubric remains unchanged and hidden from task
agents. Freeze any interpretation notes before looking at their answers.
Archive only public observations/reports and numeric telemetry, never private
reasoning, system messages, credentials or unrelated session content.
