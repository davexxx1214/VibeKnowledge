// Numeric/public-only accounting for one fresh matched MCP pair.
const { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const { assertFreshComplete } = require('../query-skill/context/session-accounting.cjs');
const [runArg, sessionA, sessionB, outArg, expectedA, expectedB] = process.argv.slice(2);
if (![runArg, sessionA, sessionB, outArg, expectedA, expectedB].every(Boolean)) throw new Error('Usage: RUN SESSION_A SESSION_B NEW_OUTPUT AGENT_PATH_A AGENT_PATH_B');
const run = resolve(runArg), out = resolve(outArg);
if (existsSync(join(out, 'metrics.json'))) throw new Error('Do not overwrite an archived experiment.');
const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
const lines = file => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const mismatch = (base, hashes) => Object.entries(hashes).filter(([file, hash]) => !existsSync(join(base, file)) || sha(join(base, file)) !== hash).map(([file]) => file);
const runtimeMismatches = mismatch(manifest.runtimeRoot, manifest.runtimeHashes);
if (runtimeMismatches.length) throw new Error('Runtime changed: ' + runtimeMismatches.join(', '));
if (createHash('sha256').update(JSON.stringify(manifest.runtimeHashes)).digest('hex') !== manifest.candidateSha256) throw new Error('Aggregate runtime hash mismatch');
mkdirSync(out, { recursive: true });
const arms = {}, texts = {};
for (const [arm, session, expected] of [['A', sessionA, expectedA], ['B', sessionB, expectedB]]) {
  const events = lines(session), obs = lines(join(run, arm, 'ab-observations.jsonl'));
  const meta = events.find(e => e.type === 'session_meta')?.payload;
  if (meta?.source?.subagent?.thread_spawn?.agent_path !== expected) throw new Error('Wrong session ' + arm);
  const completion = assertFreshComplete(events);
  const context = events.find(e => e.type === 'turn_context')?.payload;
  if (!context?.model || !context?.effort || events.filter(e => e.type === 'turn_context').some(e => e.payload.model !== context.model || e.payload.effort !== context.effort)) throw new Error('Missing/changing model context');
  const rows = [...new Map(events.filter(e => e.type === 'token_usage_record').map(e => [e.payload.response_id, e.payload])).values()];
  const totals = rows.at(-1)?.thread_token_usage;
  if (!totals) throw new Error('Missing numeric usage ' + arm);
  if (rows.some(row => typeof row.response_id !== 'string' || !row.response_id || Object.values(row.usage).some(n => !Number.isFinite(n) || n < 0)) || Object.values(totals).some(n => !Number.isFinite(n) || n < 0) || totals.cached_input_tokens > totals.input_tokens) throw new Error('Invalid numeric usage');
  for (const key of Object.keys(totals)) if (rows.reduce((n, row) => n + (row.usage[key] ?? 0), 0) !== totals[key]) throw new Error('Usage mismatch: ' + key);
  const sourceChanges = mismatch(join(run, arm), manifest.sourceHashes);
  const artifactChanges = arm === 'B' ? mismatch(join(run, arm), manifest.bArtifacts) : [];
  if (sha(join(run, arm, 'observe.cjs')) !== manifest.observerSha256 || sha(join(run, arm, 'mcp-client.mjs')) !== manifest.bridgeSha256) throw new Error('Observer changed');
  if (arm === 'B') {
    const config = JSON.parse(readFileSync(join(run, arm, 'mcp-eval.json'), 'utf8'));
    if (JSON.stringify(config) !== JSON.stringify({ runtimeRoot: manifest.runtimeRoot })) throw new Error('MCP runtime configuration changed');
  } else if (existsSync(join(run, arm, 'mcp-eval.json'))) throw new Error('MCP enabled in source-only arm');
  if (sourceChanges.length || artifactChanges.length) throw new Error('Frozen input changed');
  for (const [i, entry] of obs.entries()) texts[`${arm}:${i}`] = entry.displayed;
  texts[`${arm}:report`] = readFileSync(join(run, arm, 'REPORT.md'), 'utf8');
  arms[arm] = { sessionId: meta.id, agentPath: expected, model: context.model, effort: context.effort,
    responses: rows.length, elapsedMs: completion.duration_ms, usage: { ...totals,
      uncachedInput: totals.input_tokens - totals.cached_input_tokens,
      uncachedInputPlusOutput: totals.input_tokens - totals.cached_input_tokens + totals.output_tokens },
    sourceHashMismatches: sourceChanges, artifactHashMismatches: artifactChanges,
    queries: obs.filter(o => o.operation === 'mcp').length,
    discoveries: obs.filter(o => o.operation === 'mcp-list').length,
    resources: obs.filter(o => o.operation === 'mcp-resource').length, phases: {} };
  if (arm === 'A' && obs.some(o => o.operation.startsWith('mcp'))) throw new Error('Source-only arm used MCP');
  if (arm === 'B' && !obs.some(o => o.operation === 'mcp-list' && o.exitCode === 0)) throw new Error('No successful MCP discovery');
  for (const phase of new Set(obs.map(o => o.phase))) {
    const selected = obs.filter(o => o.phase === phase);
    arms[arm].phases[phase] = { observations: selected.length, queries: selected.filter(o => o.operation === 'mcp').length,
      reads: selected.filter(o => o.operation === 'read').map(o => o.metadata) };
  }
  cpSync(join(run, arm, 'REPORT.md'), join(out, `${arm}-report.md`));
  cpSync(join(run, arm, 'ab-observations.jsonl'), join(out, `${arm}-observations.jsonl`));
  writeFileSync(join(out, `${arm}-telemetry.json`), JSON.stringify({ sessionId: meta.id, responses: rows.map(row => ({ responseId: row.response_id, usage: row.usage })), totals }, null, 2) + '\n');
}
if (arms.A.model !== arms.B.model || arms.A.effort !== arms.B.effort) throw new Error('Unequal model/effort');
const tokenized = spawnSync('python', ['-X', 'utf8', '-c', "import sys,json,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps({'version':tiktoken.__version__,'counts':{k:len(e.encode(v, disallowed_special=())) for k,v in d.items()}}))"], { input: JSON.stringify(texts), encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 4 * 1024 * 1024 });
if (tokenized.status !== 0) throw new Error(tokenized.stderr);
const measured = JSON.parse(tokenized.stdout);
for (const arm of ['A', 'B']) {
  const obs = lines(join(run, arm, 'ab-observations.jsonl'));
  arms[arm].observedTextTokens = obs.reduce((n, o, i) => n + measured.counts[`${arm}:${i}`], 0);
  arms[arm].reportTokens = measured.counts[`${arm}:report`];
  for (const [phase, stats] of Object.entries(arms[arm].phases)) {
    stats.observedTextTokens = 0; stats.tokensByKind = {};
    obs.forEach((o, i) => {
      if (o.phase !== phase) return;
      const n = measured.counts[`${arm}:${i}`];
      stats.observedTextTokens += n;
      const kind = o.operation === 'read' ? 'source' : o.operation;
      stats.tokensByKind[kind] = (stats.tokensByKind[kind] ?? 0) + n;
    });
  }
}
cpSync(join(run, 'manifest.json'), join(out, 'manifest.json'));
const result = { generatedAt: new Date().toISOString(), run, candidateSha256: manifest.candidateSha256,
  bundleSha256: manifest.candidateSha256, graphPreparation: manifest.preparation,
  tokenizer: { encoding: 'o200k_base', version: measured.version }, arms,
  limitations: ['Real MCP SDK stdio bridge, not native-host discovery overhead.', 'Same published tasks, new independent answers; two tasks in one source snapshot.', 'No private reasoning/system content exported.', 'Generation cost separate; no feature-brief/context API in tested MCP.'] };
writeFileSync(join(out, 'metrics.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ candidateSha256: result.candidateSha256, arms: Object.fromEntries(Object.entries(arms).map(([arm, m]) => [arm, { observedTextTokens: m.observedTextTokens, usage: m.usage, queries: m.queries, elapsedMs: m.elapsedMs }])) }, null, 2));
