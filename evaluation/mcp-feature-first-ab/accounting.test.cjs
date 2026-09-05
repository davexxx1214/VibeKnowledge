// Developer-only synthetic accounting regression; never consumes agent content.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync } = require('node:fs');
const { join, resolve } = require('node:path');
const { createHash } = require('node:crypto');
const { spawnSync } = require('node:child_process');
const sha = text => createHash('sha256').update(text).digest('hex');
const jsonl = entries => entries.map(e => JSON.stringify(e)).join('\n') + '\n';
function fixture() {
  const root = mkdtempSync(resolve('.vscode-test/mcp-accounting-'));
  const runtimeRoot = join(root, 'runtime'); mkdirSync(runtimeRoot);
  writeFileSync(join(runtimeRoot, 'version'), '0.5.0');
  const manifest = { runtimeRoot, runtimeHashes: { version: sha('0.5.0') }, sourceHashes: { 'source.ts': sha('source') }, bArtifacts: { 'graph.json': sha('{}') }, observerSha256: sha('observer'), bridgeSha256: sha('bridge'), candidateSha256: 'synthetic', preparation: [] };
  manifest.candidateSha256 = sha(JSON.stringify(manifest.runtimeHashes));
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  for (const arm of ['A', 'B']) {
    const dir = join(root, arm); mkdirSync(dir);
    for (const [file, text] of Object.entries({ 'source.ts': 'source', 'observe.cjs': 'observer', 'mcp-client.mjs': 'bridge', 'REPORT.md': 'report' })) writeFileSync(join(dir, file), text);
    const obs = [{ phase: 'visualization', operation: 'read', metadata: { file: 'source.ts' }, displayed: 'source\n[exit 0]\n', exitCode: 0 }];
    if (arm === 'B') {
      writeFileSync(join(dir, 'graph.json'), '{}');
      writeFileSync(join(dir, 'mcp-eval.json'), JSON.stringify({ runtimeRoot }));
      obs.unshift({ phase: 'visualization', operation: 'mcp-list', displayed: '{"tools":[]}\n[exit 0]\n', exitCode: 0 });
      obs.push({ phase: 'visualization', operation: 'mcp', args: ['query_graph'], displayed: 'failed query\n[exit 1]\n', exitCode: 1 });
    }
    writeFileSync(join(dir, 'ab-observations.jsonl'), jsonl(obs));
    const usage = { input_tokens: 100, cached_input_tokens: 60, output_tokens: 10, total_tokens: 110 };
    writeFileSync(join(root, arm + '.jsonl'), jsonl([
      { type: 'session_meta', payload: { id: arm, source: { subagent: { thread_spawn: { agent_path: '/test/' + arm } } } } },
      { type: 'turn_context', payload: { model: 'synthetic', effort: 'xhigh' } },
      { type: 'event_msg', payload: { type: 'task_started', turn_id: 'one' } },
      { type: 'token_usage_record', payload: { response_id: 'one', usage, thread_token_usage: usage } },
      { type: 'event_msg', payload: { type: 'task_complete', turn_id: 'one', duration_ms: 1000 } }
    ]));
  }
  return root;
}
function collect(root, out = 'out') {
  return spawnSync(process.execPath, [join(__dirname, 'collect.cjs'), root, join(root, 'A.jsonl'), join(root, 'B.jsonl'), join(root, out), '/test/A', '/test/B'], { encoding: 'utf8', windowsHide: true });
}
test('counts discovery and failed MCP calls, with cached usage separate', () => {
  const root = fixture(), result = collect(root);
  assert.equal(result.status, 0, result.stderr);
  const metrics = JSON.parse(readFileSync(join(root, 'out/metrics.json'), 'utf8'));
  assert.equal(metrics.arms.B.queries, 1);
  assert.equal(metrics.arms.B.discoveries, 1);
  assert.equal(metrics.arms.B.usage.uncachedInputPlusOutput, 50);
  assert.ok(metrics.arms.B.observedTextTokens > metrics.arms.A.observedTextTokens);
  assert.ok(metrics.arms.B.phases.visualization.tokensByKind['mcp-list'] > 0);
  assert.ok(metrics.arms.B.phases.visualization.tokensByKind.mcp > 0);
  assert.notEqual(collect(root).status, 0, 'must not overwrite results');
});
test('rejects frozen-source, runtime and configuration mutations', () => {
  for (const mutate of [
    root => writeFileSync(join(root, 'B/source.ts'), 'changed'),
    root => writeFileSync(join(root, 'runtime/version'), 'changed'),
    root => writeFileSync(join(root, 'B/mcp-eval.json'), '{"runtimeRoot":"elsewhere"}'),
    root => writeFileSync(join(root, 'A/mcp-eval.json'), '{}')
  ]) {
    const root = fixture(); mutate(root);
    assert.notEqual(collect(root).status, 0);
  }
});
test('rejects missing, nonnumeric and inconsistent mandatory token fields', () => {
  for (const mutate of [
    u => { delete u.cached_input_tokens; },
    u => { u.input_tokens = null; },
    u => { u.output_tokens = '10'; },
    u => { u.cached_input_tokens = -1; },
    u => { u.total_tokens = 999; },
  ]) {
    const root = fixture();
    const file = join(root, 'B.jsonl');
    const events = readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
    const record = events.find(e => e.type === 'token_usage_record').payload;
    mutate(record.usage); mutate(record.thread_token_usage);
    writeFileSync(file, jsonl(events));
    const result = collect(root);
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /Invalid numeric usage/);
  }
});
