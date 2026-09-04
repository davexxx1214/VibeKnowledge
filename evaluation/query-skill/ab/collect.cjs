const { readFileSync, writeFileSync, existsSync, mkdirSync, cpSync, readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const [runArg, sessionA, sessionB, outputArg, pathA = '/root/ab_source_only', pathB = '/root/ab_query_skill'] = process.argv.slice(2);
if (!runArg || !sessionA || !sessionB) throw new Error('Usage: node collect.cjs RUN_DIR SESSION_A.jsonl SESSION_B.jsonl [NEW_OUTPUT_DIR [A_AGENT_PATH B_AGENT_PATH]]');
const run = resolve(runArg);
const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
const out = outputArg ? resolve(outputArg) : join(__dirname, 'results');
if (existsSync(join(out, 'metrics.json'))) throw new Error('Refusing to replace a recorded experiment; use a new output directory.');
mkdirSync(out, { recursive: true });
const texts = {}, arms = {};
const readLines = file => readFileSync(file, 'utf8').split('\n').filter(Boolean).map(line => JSON.parse(line));
function sourcePaths(dir, prefix = 'src/') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? sourcePaths(join(dir, entry.name), `${prefix}${entry.name}/`)
    : [`${prefix}${entry.name}`]);
}
for (const [arm, sessionFile] of [['A', sessionA], ['B', sessionB]]) {
  const observations = readLines(join(run, arm, 'ab-observations.jsonl'));
  const session = readLines(sessionFile);
  const meta = session.find(r => r.type === 'session_meta')?.payload;
  const expected = arm === 'A' ? pathA : pathB;
  if (meta?.source?.subagent?.thread_spawn?.agent_path !== expected) throw new Error(`Wrong session for ${arm}`);
  const context = session.find(r => r.type === 'turn_context')?.payload;
  const completion = session.findLast(r => r.type === 'event_msg' && r.payload?.type === 'task_complete')?.payload;
  if (!completion) throw new Error(`Agent ${arm} is not finished`);
  const usageRows = [...new Map(session.filter(r => r.type === 'token_usage_record').map(r => [r.payload.response_id, r.payload])).values()];
  const actual = usageRows.at(-1)?.thread_token_usage;
  if (!actual) throw new Error(`Missing usage telemetry for ${arm}`);
  const sumUsage = Object.fromEntries(Object.keys(actual).map(key => [key, usageRows.reduce((sum, r) => sum + (r.usage[key] ?? 0), 0)]));
  if (JSON.stringify(actual) !== JSON.stringify(sumUsage)) throw new Error(`Nonmatching usage aggregation for ${arm}`);
  const changedFiles = Object.entries(manifest.sourceHashes).filter(([file, hash]) =>
    createHash('sha256').update(readFileSync(join(run, arm, file))).digest('hex') !== hash).map(([file]) => file);
  const report = readFileSync(join(run, arm, 'REPORT.md'), 'utf8');
  texts[`${arm}:report`] = report;
  observations.forEach((r, i) => { texts[`${arm}:${i}`] = r.displayed; });
  const phases = {};
  for (const phase of [...new Set(observations.map(o => o.phase))]) {
    const rows = observations.map((r, i) => ({ ...r, i })).filter(r => r.phase === phase);
    phases[phase] = {
      observations: rows.length,
      queryCalls: rows.filter(r => r.operation === 'query').length,
      searchCalls: rows.filter(r => r.operation === 'rg').length,
      testRuns: rows.filter(r => r.operation === 'test').length,
      readFiles: [...new Set(rows.filter(r => r.operation === 'read').map(r => r.metadata.file))],
      displayedSourceLines: rows.filter(r => r.operation === 'read' && r.metadata.file.startsWith('src/')).reduce((sum, r) => sum + r.metadata.end - r.metadata.start + 1, 0),
    };
  }
  const toolCalls = session.filter(r => r.type === 'response_item' && ['custom_tool_call', 'function_call'].includes(r.payload?.type));
  arms[arm] = {
    method: arm === 'A' ? 'source-only' : 'query-skill',
    sessionId: meta.id, model: context.model, reasoningEffort: context.effort,
    modelResponses: usageRows.length,
    elapsedMs: completion.duration_ms,
    actualUsage: { ...actual, uncached_input_tokens: actual.input_tokens - actual.cached_input_tokens },
    aggregateValidated: true,
    toolCalls: toolCalls.length,
    changedOriginalSourceFiles: changedFiles,
    addedSourceFiles: sourcePaths(join(run, arm, 'src')).filter(file => !(file in manifest.sourceHashes)),
    phases,
  };
  cpSync(join(run, arm, 'REPORT.md'), join(out, `${arm}-report.md`));
  cpSync(join(run, arm, 'ab-observations.jsonl'), join(out, `${arm}-observations.jsonl`));
  const skillFile = join(run, arm, '.agents/skills/vibeknowledge-query/SKILL.md');
  if (existsSync(skillFile)) cpSync(skillFile, join(out, `${arm}-skill-under-test.md`));
  // Preserve numerical telemetry only; never export private reasoning/system instructions.
  writeFileSync(join(out, `${arm}-telemetry.json`), JSON.stringify({
    sessionId: meta.id, agentPath: expected, model: context.model, reasoningEffort: context.effort,
    responses: usageRows.map(r => ({ responseId: r.response_id, usage: r.usage })),
    totals: actual,
  }, null, 2) + '\n');
  arms[arm].verification = {};
  for (const kind of ['acceptance', 'mutation']) {
    const path = join(run, `${arm}-${kind}.json`);
    if (!existsSync(path)) throw new Error(`Missing parent ${kind} verification for ${arm}`);
    const checked = JSON.parse(readFileSync(path, 'utf8'));
    arms[arm].verification[kind] = {
      passedTests: checked.numPassedTests,
      failedTests: checked.numFailedTests,
      totalTests: checked.numTotalTests,
      runtimeErrorSuites: checked.numRuntimeErrorTestSuites,
      success: checked.success,
      cases: checked.testResults.flatMap(suite => suite.assertionResults.map(test => ({ name: test.fullName, status: test.status }))),
    };
  }
}
if (arms.A.model !== arms.B.model || arms.A.reasoningEffort !== arms.B.reasoningEffort) throw new Error('Unequal model settings');
const tokenized = spawnSync('python', ['-X', 'utf8', '-c', "import sys,json,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps({'version':tiktoken.__version__,'counts':{k:len(e.encode(v)) for k,v in d.items()}}))"], {
  input: JSON.stringify(texts), encoding: 'utf8', windowsHide: true, timeout: 30000, maxBuffer: 1024 * 1024,
});
if (tokenized.status !== 0) throw new Error(tokenized.stderr);
const measured = JSON.parse(tokenized.stdout);
for (const arm of ['A', 'B']) {
  const observations = readLines(join(run, arm, 'ab-observations.jsonl'));
  arms[arm].observedTextTokens = observations.reduce((sum, _, i) => sum + measured.counts[`${arm}:${i}`], 0);
  arms[arm].reportTextTokens = measured.counts[`${arm}:report`];
  for (const [phase, stats] of Object.entries(arms[arm].phases)) {
    stats.observedTextTokens = observations.reduce((sum, row, i) => sum + (row.phase === phase ? measured.counts[`${arm}:${i}`] : 0), 0);
    stats.tokensByKind = {};
    observations.forEach((row, i) => {
      if (row.phase !== phase) return;
      const kind = row.operation !== 'read' ? row.operation
        : row.metadata.file.startsWith('.agents/') ? 'skill-instructions'
        : row.metadata.file.startsWith('src/') ? 'source-read' : 'other-read';
      stats.tokensByKind[kind] = (stats.tokensByKind[kind] ?? 0) + measured.counts[`${arm}:${i}`];
    });
  }
}
const reduction = (a, b) => Math.round((1 - b / a) * 1000) / 10;
const result = {
  generatedAt: new Date().toISOString(), run, source: manifest.source,
  design: 'One independent agent per arm, same two tasks in the same order; no history fork; same model and effort. Not replicated or randomized.',
  tokenizer: { encoding: 'o200k_base', version: measured.version },
  originalSourceHashMismatches: Object.entries(manifest.sourceHashes).filter(([file, hash]) =>
    !existsSync(join(manifest.source, file)) || createHash('sha256').update(readFileSync(join(manifest.source, file))).digest('hex') !== hash).map(([file]) => file),
  arms,
  graphQueryCalls: Object.fromEntries(Object.entries(arms).map(([arm, values]) => [arm, Object.values(values.phases).reduce((sum, phase) => sum + phase.queryCalls, 0)])),
  reductionsPercent: {
    observedText: reduction(arms.A.observedTextTokens, arms.B.observedTextTokens),
    input: reduction(arms.A.actualUsage.input_tokens, arms.B.actualUsage.input_tokens),
    uncachedInput: reduction(arms.A.actualUsage.uncached_input_tokens, arms.B.actualUsage.uncached_input_tokens),
    output: reduction(arms.A.actualUsage.output_tokens, arms.B.actualUsage.output_tokens),
    total: reduction(arms.A.actualUsage.total_tokens, arms.B.actualUsage.total_tokens),
  },
  limits: [
    'Runtime telemetry is model-reported usage, not a monetary invoice. Input includes replay/cache; reasoning_output_tokens is a subset of output_tokens.',
    'Observed text is counted once as displayed by the common wrapper; includes Skill docs/query results/tests, excludes hidden context and replay.',
    'Setup/generation/dependency installation and parent grading excluded from both arms.',
    'Unit tests run without MySQL using identical Jest25 isolated transpilation and a Node26 legacy util compatibility shim. No DB integration or whole-project typecheck is claimed.',
    'One pair is descriptive evidence only; task selection, caching and agent trajectory may dominate. No statistical or cross-project generalization.',
  ],
};
writeFileSync(join(out, 'metrics.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result, null, 2));
