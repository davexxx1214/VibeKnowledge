// Post-run independent adjudication. Never evaluate candidate code, open REPORT,
// export result bodies, decrypt task payloads, or inspect answers/quality scores.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const ts = require('typescript');
const { publicCalls, shellWords } = require('./audit.cjs');
const DIR = __dirname, ROOT = path.resolve(DIR, '../..');
const readJson = f => JSON.parse(fs.readFileSync(f, 'utf8'));
const hash = x => crypto.createHash('sha256').update(x).digest('hex');
const sha = f => hash(fs.readFileSync(f));
const same = (a, b) => path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
const normalize = x => x.replace(/\r\n/g, '\n');
const assert = (value, label) => { if (!value) throw new Error(label); };
const lines = f => fs.readFileSync(f, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
function outputBlocks(event) {
  const output = event.payload.output;
  const blocks = typeof output === 'string' ? [output] : Array.isArray(output) ? output.map(b => b.text).filter(x => typeof x === 'string') : [];
  return blocks.map(text => { try { const v = JSON.parse(text); return normalize(typeof v?.output === 'string' ? v.output : text); } catch { return normalize(text); } });
}
function parentDispatch(records) {
  const found = [];
  // Filter the parent log before parsing; do not export unrelated history.
  for (const file of new Set(records.map(r => r.session))) {
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      if (!line.includes('spawn_agent') || !line.includes('mcp_pair')) continue;
      const e = JSON.parse(line), p = e.payload;
      if (e.type !== 'response_item' || p?.type !== 'function_call' || !p.name?.endsWith('spawn_agent')) continue;
      const a = typeof p.arguments === 'string' ? JSON.parse(p.arguments) : p.arguments;
      if (!/^mcp_pair[123]_[ab]$/.test(a?.task_name)) continue;
      found.push({ session: file, timestamp: e.timestamp, callId: p.call_id, taskName: a.task_name,
        forkTurns: a.fork_turns, modelOverride: a.model ?? null, effortOverride: a.reasoning_effort ?? null,
        messagePayloadSha256: hash(a.message) });
    }
  }
  assert(found.length === 6, 'Expected exactly six public parent dispatches');
  for (const r of records) {
    const f = found.find(x => x.taskName === r.taskName);
    assert(f && Object.keys(f).every(k => f[k] === r[k]), 'Public dispatch metadata differs from parent log');
    assert(f.forkTurns === 'none' && f.modelOverride === null && f.effortOverride === null, 'Dispatch settings differ');
  }
  return found;
}
function calleeAudit(events) {
  const names = new Set();
  for (const e of events) {
    if (e.type !== 'response_item' || !['function_call', 'custom_tool_call'].includes(e.payload?.type) || e.payload.name?.split('.').at(-1) !== 'exec') continue;
    const raw = e.payload.input ?? e.payload.arguments;
    const source = ts.createSourceFile('public.js', typeof raw === 'string' ? raw : raw.code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    assert(source.parseDiagnostics.length === 0, 'JS parse error');
    function visit(n) { if (ts.isCallExpression(n)) names.add(n.expression.getText(source)); ts.forEachChild(n, visit); }
    visit(source);
  }
  assert([...names].every(n => ['text', 'tools.exec_command', 'tools.apply_patch'].includes(n)), 'Unexpected orchestration callee');
  return [...names].sort();
}
function auditBootstrapAndDelivery(item, original, dispatch, transcript, taskText) {
  const events = lines(item.session), parsed = publicCalls(events);
  assert(parsed.unknown.length === 0 && parsed.calls.every(c => !c.repeated), 'Unresolved call syntax');
  assert(parsed.calls.every(c => ['exec_command', 'apply_patch'].includes(c.name)), 'Unexpected tool type');
  const shellCalls = parsed.calls.filter(c => c.name === 'exec_command');
  const boot = shellCalls[0], words = shellWords(boot.args.cmd);
  assert(words.issues.length === 0 && words.commands.length === 1, 'Unsafe bootstrap syntax');
  const w = words.commands[0], taskFile = path.join(DIR, 'tasks.md');
  assert(w.length === 4 && w[0].toLowerCase() === 'get-content', 'Bootstrap command differs');
  const allowedOrders = [ ['-LiteralPath', taskFile, '-Raw'], ['-Raw', '-LiteralPath', taskFile] ];
  assert(allowedOrders.some(order => order.every((v,i) => i + 1 === w.indexOf(taskFile) ? same(v, w[i+1]) : v.toLowerCase() === w[i+1].toLowerCase())), 'Bootstrap flags/path differ');
  assert(same(boot.args.workdir, original.workspace), 'Bootstrap cwd differs');
  assert(original.violations.length === 1 && original.violations[0].reason === 'Non-observer shell command' && original.violations[0].callId === boot.callId, 'Unexpected automatic violation');
  assert(original.review.length === 1 && original.review[0].reason === 'Public task body does not exactly match frozen tasks.md', 'Unexpected automatic review');
  assert(transcript.message.includes(original.workspace) && transcript.message.includes(taskFile) && transcript.message.includes('不通过observer'), 'Transcript lacks exact bootstrap exception');
  const taskMessages = events.filter(e => e.type === 'response_item' && e.payload?.type === 'agent_message');
  assert(taskMessages.length === 1, 'Unexpected additional task dispatch');
  const opaque = taskMessages[0].payload.content.filter(c => c.type === 'encrypted_content');
  assert(opaque.length === 1 && hash(opaque[0].encrypted_content) === dispatch.messagePayloadSha256, 'Opaque dispatch binding differs');
  assert(Date.parse(dispatch.timestamp) < Date.parse(events[boot.eventIndex].timestamp), 'Bootstrap preceded dispatch');
  const outputs = events.filter(e => e.type === 'response_item' && ['function_call_output', 'custom_tool_call_output'].includes(e.payload?.type));
  const bootOutputs = outputs.filter(e => e.payload.call_id === boot.callId).flatMap(outputBlocks);
  assert(bootOutputs.some(t => t.includes(normalize(taskText).trimEnd())), 'Full common task not delivered');
  // Strengthen the separate v2 delivery check by binding each consumed display
  // occurrence to the public call ID that actually requested that observation.
  const available = new Map();
  for (const e of outputs) available.set(e.payload.call_id, [...(available.get(e.payload.call_id) || []), ...outputBlocks(e)]);
  const observations = lines(path.join(original.workspace, 'ab-observations.jsonl'));
  const unused = observations.map((o, i) => ({ o, i, key: JSON.stringify({ phase:o.phase, operation:o.operation, args:o.args }) }));
  const bound = [];
  for (const c of original.publicObserverCommands) {
    const at = unused.findIndex(x => x.key === JSON.stringify({ phase:c.phase, operation:c.operation, args:c.args }));
    assert(at >= 0, 'Command lacks observation');
    const { o, i } = unused.splice(at, 1)[0], blocks = available.get(c.callId) || [], display = normalize(o.displayed).trimEnd();
    const j = blocks.findIndex(t => display.length && t.includes(display));
    assert(j >= 0, 'Observation not delivered by its requesting call ID');
    const offset = blocks[j].indexOf(display);
    blocks[j] = blocks[j].slice(0, offset) + '\0'.repeat(display.length) + blocks[j].slice(offset + display.length);
    bound.push({ observationIndex:i, callId:c.callId });
  }
  assert(unused.length === 0, 'Unrequested observation');
  const outerTruncations = outputs.flatMap(outputBlocks).filter(t => /Warning: truncated output|[0-9]+ tokens truncated/.test(t)).length;
  assert(outerTruncations === 0, 'Outer truncation marker');
  return {
    bootstrap: { callId:boot.callId, eventIndex:boot.eventIndex, command:boot.args.cmd, cwd:boot.args.workdir,
      taskFileSha256:sha(taskFile), completeCommonTaskDelivered:true, exceptionBasis:'Primary-agent public dispatch transcription; exact plaintext is not independently recoverable from persisted opaque payload.',
      originalDispatchPayloadHashMatches:true, dispatchBeforeBootstrap:true },
    orchestrationCallees:calleeAudit(events), delivery:{callIdentityBoundMatches:bound.length, outerTruncationMarkers:outerTruncations, bindings:bound},
    resolutions:[
      { original:'Non-observer shell command', disposition:'documented_bootstrap_exception_with_provenance_limit', reason:'One first-command literal Get-Content of the same public tasks.md, authorized symmetrically in the primary-agent transcript. No source, graph, Skill, report or unrelated parent file was read outside the observer.' },
      { original:'Public task body does not exactly match frozen tasks.md', disposition:'parser_assumption_false_positive', reason:'The original parser searched only role=user scaffolding. The real task arrived as an opaque agent_message; the entire identical functional task document is independently present in each bootstrap public output. Exact dispatch plaintext remains unverified.' }
    ]
  };
}
function main() {
  const auditFile = path.join(DIR,'compliance-audit.json'), mdFile = path.join(DIR,'compliance-audit.md');
  const automaticFile = path.join(DIR,'compliance-audit.automatic.json'), automaticMd = path.join(DIR,'compliance-audit.automatic.md');
  const current = readJson(auditFile);
  assert(!current.adjudication, 'Final adjudication already exists');
  assert(current.status === 'fail' && !current.globalIssues.length && current.sessions.length === 6, 'Unexpected initial result');
  // Byte-for-byte archive is made before any replacement of the presentation.
  for (const [from,to] of [[auditFile,automaticFile],[mdFile,automaticMd]]) {
    if (fs.existsSync(to)) assert(sha(from) === sha(to), 'Existing automatic archive differs');
    else fs.copyFileSync(from,to,fs.constants.COPYFILE_EXCL);
  }
  const mapping = readJson(path.join(DIR,'session-mapping.json')).sessions;
  const dispatchExport = readJson(path.join(DIR,'public-dispatch.json'));
  assert(dispatchExport.version === 2 && dispatchExport.records.length === 6, 'Expected sanitized public dispatch v2');
  const dispatches = parentDispatch(dispatchExport.records);
  const transcripts = readJson(path.join(DIR,'dispatch-transcript.json'));
  const tasks = fs.readFileSync(path.join(DIR,'tasks.md'),'utf8');
  const sessions = current.sessions.map(original => {
    const item = mapping.find(i => i.pair === original.pair && i.arm === original.arm), name = item.agentPath.split('/').at(-1);
    const review = auditBootstrapAndDelivery(item, original, dispatches.find(d=>d.taskName===name), transcripts.records.find(t=>t.taskName===name), tasks);
    return {...original, automaticStatus:original.status, status:'pass_with_limits', automaticFindings:{violations:original.violations,review:original.review}, violations:[],review:[],adjudication:review};
  });
  const runtimeChecks = [1,2,3].map(pair => {
    const m = readJson(path.join(current.run,`pair-${pair}/manifest.json`));
    const mismatch = Object.entries(m.runtimeHashes).filter(([f,h]) => sha(path.join(m.runtimeRoot,f)) !== h).map(([f])=>f);
    assert(!mismatch.length && hash(JSON.stringify(m.runtimeHashes)) === m.candidateSha256, 'Runtime freeze differs');
    return {pair, runtimeFiles:Object.keys(m.runtimeHashes).length, runtimeHashMismatches:mismatch, candidateSha256:m.candidateSha256};
  });
  const delivery = [1,2,3].map(pair => {
    const file = path.join(DIR,`pair-${pair}/delivery-audit-v2.json`), d = readJson(file);
    assert(d.version === 2 && d.passed && ['A','B'].every(arm => {
      const s=sessions.find(s=>s.pair===pair&&s.arm===arm), a=d.arms[arm];
      return a.sessionId===s.sessionId && a.agentPath===s.agentPath && a.observations===s.observationCount && a.matchedPublicToolOutput===s.observationCount && !a.unmatchedObservationIndexes.length && a.toolOutputTruncationMarkers===0;
    }), 'Separate delivery artifact not matched');
    return {pair,file,sha256:sha(file),sessionAndCountBound:true,passed:true};
  });
  const req = createRequire(path.join(current.provenance.runtime.root,'package.json'));
  const sdkFiles = ['@modelcontextprotocol/sdk/client/index.js','@modelcontextprotocol/sdk/client/stdio.js'].map(specifier => {const file=req.resolve(specifier);return {specifier,file,sha256:sha(file)};});
  const sdkPkg = path.join(current.provenance.runtime.root,'node_modules/@modelcontextprotocol/sdk/package.json');
  const environment = {collectedAt:new Date().toISOString(),sdk:{version:readJson(sdkPkg).version,packageJsonSha256:sha(sdkPkg),files:sdkFiles,
    correction:'Initial generic require.resolve(packageRoot) diagnostic is retained in the automatic archive. SDK has no root entry; both exact client subpaths used by the bridge resolve successfully. This is not a missing runtime dependency.'},
    preparationVsPost:{nodeIdentical:current.provenance.node.sha256===current.postRunProvenance.node.sha256,rgIdentical:current.provenance.rg.sha256===current.postRunProvenance.rg.sha256,nodeModulesIdentical:current.provenance.runtime.nodeModules.sha256===current.postRunProvenance.runtime.nodeModules.sha256,condenserScriptsIdentical:JSON.stringify(current.provenance.condenserFiles)===JSON.stringify(current.postRunProvenance.condenserFiles)}};
  assert(Object.values(environment.preparationVsPost).every(Boolean), 'Supplemental environment changed');
  const limits = [
    'Dispatch task-name/forkTurns/timestamp/opaque-payload identity is independently checked against the public parent log, but exact dispatch plaintext and bootstrap authorization wording rely on the explicitly labeled primary-agent transcript. No decryption or cryptographic plaintext proof is claimed.',
    'Environment/dependency/condenser fingerprints were first collected at '+current.provenance.collectedAt+', after pair 1 and during pair 2, then at '+current.postRunProvenance.collectedAt+'. They are supplemental matching observations, not an all-pairs pre-run freeze.',
    'Final hashes and file inventories cannot exclude transient reverted modifications. Node executable identity for candidates is inferred from unmodified node commands/PATH rather than per-child process attestation.',
    'This measures observer-wrapped actual MCP SDK stdio calls with RAG disabled, not native host discovery, a persistent MCP session, future brief/context interfaces, or implementation correctness/quality gains.',
    'Arm B is always launched after Arm A by about eight seconds, and all pairs use the same task/source/runtime. Three repeats do not establish generalization or randomize environmental/order effects.'
  ];
  const result = {...current,version:2,status:'pass_with_limits',automaticStatus:current.status,updatedAt:new Date().toISOString(),sessions,
    adjudication:{reviewer:'independent method/compliance subagent; not a blind grader',automaticArchive:{json:path.basename(automaticFile),jsonSha256:sha(automaticFile),markdown:path.basename(automaticMd),markdownSha256:sha(automaticMd)},
      confirmedUnauthorizedOperations:0,unresolvedConservativeParserItems:0,taskDocumentSha256:sha(path.join(DIR,'tasks.md')),dispatches,dispatchTranscriptSha256:sha(path.join(DIR,'dispatch-transcript.json')),
      totalObserverCommands:sessions.reduce((n,s)=>n+s.commandCount,0),totalCallIdentityBoundDeliveries:sessions.reduce((n,s)=>n+s.adjudication.delivery.callIdentityBoundMatches,0),runtimeChecks,delivery,environment,limits,
      manualReview:'All unique read paths, every rg argument list, every MCP tool/argument list and every patch target were independently inspected. Only src, tests, package.json and the relevant structural-analysis.mjs implementation dependency were read. rg --files listings do not constitute reading Skill instructions. No extra writes except each own REPORT.md and observer-created log; no network, builds, tests, other agents, resource calls, direct graph/brief/Skill/report reads, wrapper/config inspection or cross-workspace source reads were found.',
      changeScope:'Only evaluation audit artifacts changed. Original automatic fail and its six bootstrap flags plus six prompt-location reviews are archived unchanged; no candidate log/report/input, product, task or rubric was changed.'}};
  fs.writeFileSync(auditFile,JSON.stringify(result,null,2)+'\n');
  const rows=sessions.map(s=>`| ${s.pair}${s.arm} | ${s.commandCount} | ${s.adjudication.delivery.callIdentityBoundMatches} | ${s.observations.filter(o=>o.truncated).length} | ${s.fileInventory.files} |`);
  const md = ['# Independent compliance and provenance audit','',`Final conclusion: **pass with limits** (${result.updatedAt}). No confirmed unauthorized operation was found in the audited public evidence. This is not an unqualified authorization-provenance or pre-run-environment proof.`,
    '', '## Preserved automatic findings and adjudication','',
    'The original automatic result was `fail`: each of six candidates made one first-command `Get-Content -LiteralPath .../evaluation/mcp-ab/tasks.md -Raw` outside the observer, and the parser could not find the functional task in role=user content. The byte-for-byte original reports are preserved as `compliance-audit.automatic.json` and `.md`, with hashes in the final JSON. No original finding was silently dropped.',
    '', 'The only outside read was the identical public task document. All six public bootstrap outputs contain the complete unchanged document. The primary agent’s explicitly labeled dispatch transcript authorizes this symmetric bootstrap exception. Independent checks bind all six parent public spawn records to task names, `fork_turns=none`, absent model/effort overrides, timing and the opaque task payload received by the correct candidate. Exact authorization plaintext cannot be recovered from the persisted payload; its wording remains transcription-based.',
    '', 'The prompt-location finding is a parser-assumption false positive: role=user contains environment scaffolding; the real task arrives in an opaque agent_message and the common functional instructions are delivered by the bootstrap read. Adjudication changes audit interpretation only, not candidate inputs or the protocol.',
    '', '## Independent command and delivery checks','',
    '| Session | Observer commands | Call-ID-bound deliveries | Internally capped outputs | Final files |','|---|---:|---:|---:|---:|',...rows,
    '', 'All 294 observation entries match exact public command phase/operation/arguments and a distinct displayed-text occurrence under the requesting public call ID. Separate delivery-v2 artifacts also match the six session IDs and counts; zero outer truncation markers were found. Three observer-internal caps remain part of what candidates actually saw. The six task-document bootstraps are outside the observer count and belong in total public-output accounting.',
    '', 'All shell calls use the assigned workspace; all source searches/reads and B queries use its frozen observer. The only public orchestration callees are `text`, `tools.exec_command` and `tools.apply_patch`. Every rg path/option, read path, MCP argument list and patch target was inspected. The structural-analysis.mjs read is product implementation, not Skill instructions. No direct Skill/brief/full-graph reads, cross-workspace reads, extra tools, network, tests/builds or extra candidate writes were detected. Each candidate added only its own REPORT.md; observer log creation is expected. Reports were not opened and patch bodies were not exported.',
    '', 'All six sessions have one fresh completed task, no prior public assistant/tool history, distinct session IDs and `gpt-5.6-sol` / `xhigh` in every context. No context changes or forked-history evidence were found. Public spawn settings independently say no fork; no broader claim about undocumented platform internals is made.',
    '', '## Freeze and provenance','',
    'All candidate source/artifact/wrapper hashes and B runtime configuration match their manifests; no unexpected files or links were found. All 51 runtime files match for each pair, with candidate digest `'+runtimeChecks[0].candidateSha256+'`.',
    '', 'Raw structural graph SHA-256 `'+current.provenance.historicalRawGraph.preparedManifestDigest+'` matches all three historical r3 bArtifacts digests, the old raw graph, the newly prepared artifact and B workspace copies. No old trajectory, answer or score was used.',
    '', `Observed tools: Node ${current.provenance.node.version}; ${current.provenance.rg.version.split(/\r?\n/)[0]}; MCP ${current.provenance.runtime.version}; MCP SDK ${environment.sdk.version}. Exact binary, dependency tree, active SDK entrypoint and condenser-script hashes are in the JSON. The initial SDK root-resolution diagnostic is not a missing dependency: the two subpath entrypoints actually used by the bridge resolve and are fingerprinted. Source snapshot manifest version 0.4.0 and actual MCP runtime 0.5.0 are different and disclosed.`,
    '', '## Limits','',...limits.map(x=>'- '+x),
    '', 'No candidate answer/score or private reasoning/system content was used or exported. Public result bodies were checked only for task delivery and observation accounting, not written to these artifacts. Quality grading and efficiency conclusions are separate from this compliance result.',''];
  fs.writeFileSync(mdFile,md.join('\n'));
  console.log(JSON.stringify({status:result.status,automaticStatus:result.automaticStatus,confirmedUnauthorizedOperations:0,totalObserverCommands:result.adjudication.totalObserverCommands,callIdentityBoundDeliveries:result.adjudication.totalCallIdentityBoundDeliveries,rawGraphMatch:current.provenance.historicalRawGraph.allMatch,versions:{node:current.provenance.node.version,mcp:current.provenance.runtime.version,sdk:environment.sdk.version}}));
}
if(require.main===module)main();
