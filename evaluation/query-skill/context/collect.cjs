const { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { assertFreshComplete } = require('./session-accounting.cjs');
const [runArg, sessionA, sessionB, outArg, pathA, pathB] = process.argv.slice(2);
if (![runArg, sessionA, sessionB, outArg, pathA, pathB].every(Boolean)) throw new Error('Usage: RUN SESSION_A SESSION_B NEW_OUTPUT AGENT_PATH_A AGENT_PATH_B');
const run = resolve(runArg), out = resolve(outArg);
if (existsSync(join(out, 'metrics.json'))) throw new Error('Experiment already recorded; use a new directory.');
const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
const lines = p => readFileSync(p, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
const arms = {}, texts = {};
mkdirSync(out, { recursive: true });
for (const [arm, file, expected] of [['A', sessionA, pathA], ['B', sessionB, pathB]]) {
  const events = lines(file), observations = lines(join(run, arm, 'ab-observations.jsonl'));
  const meta = events.find(r => r.type === 'session_meta')?.payload;
  if (meta?.source?.subagent?.thread_spawn?.agent_path !== expected) throw new Error(`Wrong session ${arm}`);
  const context = events.find(r => r.type === 'turn_context')?.payload;
  const completion = assertFreshComplete(events);
  const rows = [...new Map(events.filter(r => r.type === 'token_usage_record').map(r => [r.payload.response_id, r.payload])).values()];
  const totals = rows.at(-1)?.thread_token_usage;
  if (!totals) throw new Error(`No usage ${arm}`);
  for (const key of Object.keys(totals)) if (rows.reduce((n, r) => n + (r.usage[key] ?? 0), 0) !== totals[key]) throw new Error(`Usage mismatch ${arm}/${key}`);
  const changed = Object.entries(manifest.sourceHashes).filter(([p, hash]) => !existsSync(join(run, arm, p)) || createHash('sha256').update(readFileSync(join(run, arm, p))).digest('hex') !== hash).map(([p]) => p);
  if (changed.length) throw new Error(`Read-only source changed: ${arm} ${changed.join(', ')}`);
  const changedArtifacts = arm === 'B' ? Object.entries(manifest.bArtifacts ?? {}).filter(([p, hash]) => !existsSync(join(run, arm, p)) || createHash('sha256').update(readFileSync(join(run, arm, p))).digest('hex') !== hash).map(([p]) => p) : [];
  if (changedArtifacts.length) throw new Error(`Frozen artifacts changed: ${changedArtifacts.join(', ')}`);
  observations.forEach((r, i) => { texts[`${arm}:${i}`] = r.displayed; });
  texts[`${arm}:report`] = readFileSync(join(run, arm, 'REPORT.md'), 'utf8');
  arms[arm] = { sessionId: meta.id, agentPath: expected, model: context.model, effort: context.effort,
    responses: rows.length, elapsedMs: completion.duration_ms, usage: { ...totals,
      uncachedInput: totals.input_tokens - totals.cached_input_tokens,
      uncachedInputPlusOutput: totals.input_tokens - totals.cached_input_tokens + totals.output_tokens },
    sourceHashMismatches: changed, artifactHashMismatches: changedArtifacts, queries: observations.filter(r => r.operation === 'query').length, phases: {} };
  for (const phase of new Set(observations.map(r => r.phase))) arms[arm].phases[phase] = {
    observations: observations.filter(r => r.phase === phase).length,
    queries: observations.filter(r => r.phase === phase && r.operation === 'query').length,
    reads: observations.filter(r => r.phase === phase && r.operation === 'read').map(r => r.metadata),
  };
  cpSync(join(run, arm, 'REPORT.md'), join(out, `${arm}-report.md`));
  cpSync(join(run, arm, 'ab-observations.jsonl'), join(out, `${arm}-observations.jsonl`));
  writeFileSync(join(out, `${arm}-telemetry.json`), JSON.stringify({ sessionId: meta.id, responses: rows.map(r => ({ responseId: r.response_id, usage: r.usage })), totals }, null, 2) + '\n');
}
if (arms.A.model !== arms.B.model || arms.A.effort !== arms.B.effort) throw new Error('Unequal models/effort');
const tokenized = spawnSync('python', ['-X', 'utf8', '-c', "import sys,json,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps({'version':tiktoken.__version__,'counts':{k:len(e.encode(v, disallowed_special=())) for k,v in d.items()}}))"], { input: JSON.stringify(texts), encoding: 'utf8', timeout: 30000, windowsHide: true, maxBuffer: 4 * 1024 * 1024 });
if (tokenized.status !== 0) throw new Error(tokenized.stderr);
const measured = JSON.parse(tokenized.stdout);
for (const arm of ['A', 'B']) {
  const observations = lines(join(run, arm, 'ab-observations.jsonl'));
  arms[arm].observedTextTokens = observations.reduce((n, r, i) => n + measured.counts[`${arm}:${i}`], 0);
  arms[arm].reportTokens = measured.counts[`${arm}:report`];
  for (const [phase, stats] of Object.entries(arms[arm].phases)) {
    stats.observedTextTokens = 0; stats.tokensByKind = {};
    observations.forEach((r, i) => {
      if (r.phase !== phase) return;
      const n = measured.counts[`${arm}:${i}`]; stats.observedTextTokens += n;
      // Failed reads still consume visible tokens and must be counted. Their
      // observer metadata may be empty (for example a missing source file).
      const readPath = r.metadata?.file ?? r.args?.[0] ?? '';
      const kind = r.operation === 'read' ? readPath.startsWith('.agents/') ? 'skill' : 'source' : r.operation;
      stats.tokensByKind[kind] = (stats.tokensByKind[kind] ?? 0) + n;
    });
  }
}
cpSync(join(run, 'manifest.json'), join(out, 'manifest.json'));
cpSync(join(run, 'B/.agents/skills/vibeknowledge-query/SKILL.md'), join(out, 'B-skill.md'));
const bundle = readFileSync(join(run, 'B/.agents/skills/vibeknowledge-query/scripts/query.cjs'));
const result = { generatedAt: new Date().toISOString(), run, graphPreparation: manifest.graph, tokenizer: { encoding: 'o200k_base', version: measured.version },
  bundleSha256: createHash('sha256').update(bundle).digest('hex'), arms,
  limitations: ['Usage alone is not a final gate; pair it with independent source-backed grading and the frozen protocol.', 'Total input includes cache/replay; usage is not a monetary invoice.', 'Generation/update cost separate; these are warm artifact queries.', 'Raw private reasoning/system instructions are not exported.'] };
writeFileSync(join(out, 'metrics.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ generatedAt: result.generatedAt, run: result.run, bundleSha256: result.bundleSha256,
  arms: Object.fromEntries(Object.entries(arms).map(([key, value]) => [key, {
    observedTextTokens: value.observedTextTokens, usage: value.usage, elapsedMs: value.elapsedMs,
    queries: value.queries, sourceHashMismatches: value.sourceHashMismatches, artifactHashMismatches: value.artifactHashMismatches
  }])) }, null, 2));
