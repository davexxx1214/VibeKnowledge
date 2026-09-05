// Independent read-only scope inspection. Never print report bodies, assistant
// answers, reasoning, system/user text, observer bodies or model-usage results.
// Existing artifacts are read-only; the script only emits audit evidence.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const ts = require('typescript');
const { publicCalls, shellWords } = require('./audit.cjs');
const directory = __dirname, root = path.resolve(directory, '../..');
const json = name => JSON.parse(fs.readFileSync(path.join(directory, name), 'utf8'));
const hash = data => crypto.createHash('sha256').update(data).digest('hex');
const fileHash = file => hash(fs.readFileSync(file));
const freeze = json('freeze.json'), preflight = json('preflight-checks.json');
const mapping = json('session-mapping.json'), compliance = json('compliance-audit.json');
const stdout = value => console.log(JSON.stringify(value, null, 2));
const outputTypes = new Set(['function_call_output', 'custom_tool_call_output']);
function inventory(dir, prefix = '') {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => {
    const name = prefix + e.name;
    if (e.isSymbolicLink()) return [{ name, link: true }];
    return e.isDirectory() ? inventory(path.join(dir, e.name), name + '/') : [{ name, link: false }];
  });
}
function mismatches(base, expected) {
  return Object.entries(expected).flatMap(([name, expectedHash]) => {
    const full = path.join(base, name);
    return !fs.existsSync(full) || fileHash(full) !== expectedHash ? [name] : [];
  });
}
const skeletons = new Map(), sessions = [];
for (const entry of mapping.sessions) {
  // Select public calls/outputs and allowlisted numeric/identity metadata only.
  const events = fs.readFileSync(entry.session, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const meta = events.find(e => e.type === 'session_meta')?.payload;
  const publicEvents = events.filter(e => e.type === 'response_item' && ['function_call', 'custom_tool_call'].includes(e.payload?.type));
  const parsed = publicCalls(publicEvents);
  const calleeNames = new Set(), callIds = [];
  for (const event of publicEvents) {
    const p = event.payload;
    if (!['exec', 'functions.exec'].includes(p.name)) {
      calleeNames.add('DIRECT:' + p.name);
      continue;
    }
    const code = p.input ?? p.arguments;
    const source = ts.createSourceFile('public.js', code, ts.ScriptTarget.Latest, true, ts.ScriptKind.JS);
    const replacements = [];
    function visit(n) {
      if (ts.isCallExpression(n)) calleeNames.add(n.expression.getText(source));
      if (ts.isTaggedTemplateExpression(n)) calleeNames.add('TAG:' + n.tag.getText(source));
      if (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) {
        replacements.push({ start: n.getStart(source), end: n.end, replacement: '"[string withheld]"' });
      }
      ts.forEachChild(n, visit);
    }
    visit(source);
    let skeleton = code;
    for (const r of replacements.sort((a, b) => b.start - a.start)) skeleton = skeleton.slice(0, r.start) + r.replacement + skeleton.slice(r.end);
    const key = hash(skeleton);
    if (!skeletons.has(key)) skeletons.set(key, { sha256: key, skeleton, calls: [] });
    skeletons.get(key).calls.push({ pair: entry.pair, arm: entry.arm, callId: p.call_id, inputSha256: hash(code) });
    callIds.push(p.call_id);
  }
  const workspace = path.join(freeze.run, 'pair-' + entry.pair, entry.arm);
  const observations = fs.readFileSync(path.join(workspace, 'ab-observations.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
  const publicOutputs = events.filter(e => e.type === 'response_item' && outputTypes.has(e.payload?.type)).flatMap(e => {
    const value = e.payload.output;
    return typeof value === 'string' ? [value] : Array.isArray(value) ? value.map(b => b.text).filter(v => typeof v === 'string') : [];
  });
  const decoded = publicOutputs.map(s => { try { const v = JSON.parse(s); return typeof v.output === 'string' ? v.output : s; } catch { return s; } });
  const missing = [];
  observations.forEach((o, i) => {
    const content = o.displayed.trimEnd(), index = decoded.findIndex(s => s.includes(content));
    if (index < 0) { missing.push(i); return; }
    const start = decoded[index].indexOf(content);
    decoded[index] = decoded[index].slice(0, start) + '\0'.repeat(content.length) + decoded[index].slice(start + content.length);
  });
  const actualDiscovery = observations.filter(o => o.operation === 'mcp-list').map(o => {
    const text = o.displayed.replace(/\n\[exit \d+\]\s*$/, '').trim();
    let names = [], validJson = false;
    try { names = JSON.parse(text).tools.map(t => t.name); validJson = true; } catch {}
    return { exitCode: o.exitCode, truncated: o.truncated, chars: text.length, validJson, names, equalsPreflightTools: JSON.stringify(names) === JSON.stringify(preflight.tools) };
  });
  const existing = compliance.sessions.find(s => s.pair === entry.pair && s.arm === entry.arm);
  const rawShellIssues = [], rawCommands = [];
  for (const call of parsed.calls.filter(c => c.name === 'exec_command')) {
    const command = shellWords(call.args.cmd);
    if (command.issues.length) rawShellIssues.push({ callId: call.callId, issues: command.issues });
    if (path.resolve(call.args.workdir).toLowerCase() !== workspace.toLowerCase()) rawShellIssues.push({ callId: call.callId, issue: 'Wrong workspace' });
    for (const words of command.commands) {
      if (words[0] !== 'node' || words[1] !== 'observe.cjs' || words[2] !== '--phase') rawShellIssues.push({ callId: call.callId, issue: 'Noncanonical observer command' });
      rawCommands.push(JSON.stringify({ phase: words[3], operation: words[4], args: words.slice(5) }));
    }
  }
  const frozenFiles = { ...freeze.sourceHashes, 'observe.cjs': freeze.observerSha256, 'mcp-client.mjs': freeze.bridgeSha256, ...(entry.arm === 'B' ? freeze.bArtifacts : {}) };
  const allowed = new Set([...Object.keys(frozenFiles), 'REPORT.md', 'ab-observations.jsonl', ...(entry.arm === 'B' ? ['mcp-eval.json'] : [])]);
  const files = inventory(workspace);
  const observedKeys = observations.map(o => JSON.stringify({ phase: o.phase, operation: o.operation, args: o.args })).sort();
  const commandKeys = existing.publicObserverCommands.map(c => JSON.stringify({ phase: c.phase, operation: c.operation, args: c.args })).sort();
  const beginnings = events.filter(e => e.type === 'event_msg' && e.payload?.type === 'task_started').map(e => ({ at: e.timestamp, turnId: e.payload.turn_id }));
  const endings = events.filter(e => e.type === 'event_msg' && e.payload?.type === 'task_complete').map(e => ({ at: e.timestamp, turnId: e.payload.turn_id }));
  const opCounts = Object.fromEntries([...new Set(observations.map(o => o.operation))].map(op => [op, observations.filter(o => o.operation === op).length]));
  sessions.push({ pair: entry.pair, arm: entry.arm, sessionId: meta.id, agentPath: meta.source?.subagent?.thread_spawn?.agent_path,
    forkedFrom: meta.forked_from_id ?? null, beginnings, endings,
    aborts: events.filter(e => e.type === 'event_msg' && e.payload?.type === 'turn_aborted').length,
    contexts: events.filter(e => e.type === 'turn_context').map(e => ({ model: e.payload.model, effort: e.payload.effort, cwd: e.payload.cwd })),
    publicCallCount: publicEvents.length, parsedTools: Object.fromEntries([...new Set(parsed.calls.map(c => c.name))].map(name => [name, parsed.calls.filter(c => c.name === name).length])),
    unknown: parsed.unknown, callees: [...calleeNames], observations: observations.length, operations: opCounts,
    commandObservationKeysMatch: JSON.stringify(observedKeys) === JSON.stringify(commandKeys),
    rawPublicCommandKeysMatchObservations: JSON.stringify(rawCommands.sort()) === JSON.stringify(observedKeys), rawShellIssues,
    missingPublicDelivery: missing, outerTruncationMarkers: publicOutputs.filter(s => /Warning: truncated output|[0-9]+ tokens truncated/.test(s)).length,
    cappedObserverIndexes: observations.flatMap((o, i) => o.truncated ? [i] : []), discovery: actualDiscovery,
    frozenFileMismatches: mismatches(workspace, frozenFiles), extraFiles: files.filter(f => !allowed.has(f.name)), symlinks: files.filter(f => f.link),
  });
}
const dependencyInventory = inventory(path.join(freeze.runtimeRoot, 'node_modules')).map(f => f.name).sort();
const integrity = {
  runtime: mismatches(freeze.runtimeRoot, freeze.runtimeHashes),
  runtimeSource: mismatches(path.join(freeze.runtimeRoot, 'src'), freeze.runtimeSourceHashes),
  dependencies: mismatches(path.join(freeze.runtimeRoot, 'node_modules'), freeze.dependencyHashes),
  dependencyInventoryMatches: JSON.stringify(dependencyInventory) === JSON.stringify(Object.keys(freeze.dependencyHashes).sort()),
  harness: mismatches(directory, preflight.harnessHashes), helpers: mismatches(root, preflight.helperHashes),
  nodeMatches: fileHash(freeze.environment.nodePath) === freeze.environment.nodeSha256,
  rgMatches: fileHash(freeze.environment.rgPath) === freeze.environment.rgSha256,
  tokenizerExecutableMatches: fileHash(preflight.tokenizer.executable) === preflight.tokenizer.executableSha256,
  tokenizerModuleMatches: fileHash(preflight.tokenizer.module) === preflight.tokenizer.moduleSha256,
  dispatchesMatchFreeze: fileHash(path.join(directory, 'dispatches.json')) === freeze.dispatchesSha256,
};
stdout({ createdAt: new Date().toISOString(), integrity, sessions, skeletons: [...skeletons.values()] });
