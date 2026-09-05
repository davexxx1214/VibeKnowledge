const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
function fixture() {
  const dir = fs.mkdtempSync(path.resolve('.vscode-test/mcp-first-summary-'));
  const put = (file, value) => fs.writeFileSync(path.join(dir, file), JSON.stringify(value));
  const scope = { version: 1, passed: true, sessions: [] };
  const ids = [...Array.from({ length: 9 }, (_, i) => 'V.C' + (i + 1)), ...Array.from({ length: 8 }, (_, i) => 'I.C' + (i + 1)), 'V.S1', 'V.S2', 'I.S1'];
  const grade = { items: ids.map(id => ({ id, score: 1 })), major_false_claims: [], totals: { critical: 17, critical_max: 17, supplemental: 3, supplemental_max: 3, major_false_claim_count: 0 } };
  for (let pair = 1; pair <= 3; pair++) {
    const prefix = 'pair-' + pair + '/'; fs.mkdirSync(path.join(dir, prefix));
    const arms = {}, delivered = {}, audited = {};
    for (const arm of ['A', 'B']) {
      const identity = { sessionId: pair + arm, agentPath: '/test/' + pair + arm };
      const n = arm === 'A' ? 1000 : 600;
      arms[arm] = { ...identity, model: 'test', effort: 'test', sourceHashMismatches: [], artifactHashMismatches: [], observedTextTokens: n, elapsedMs: 1000,
        usage: { input_tokens: n, cached_input_tokens: 0, output_tokens: 10, total_tokens: n + 10, uncachedInput: n, uncachedInputPlusOutput: n + 10 } };
      delivered[arm] = { ...identity, publicToolOutputTokens: n };
      audited[arm] = { ...identity, unmatchedObservationIndexes: [], observations: 1, matchedPublicToolOutput: 1 };
      scope.sessions.push({ ...identity, pair, arm, passed: true });
    }
    put(prefix + 'metrics.json', { candidateSha256: 'same', arms });
    put(prefix + 'manifest.json', { sourceHashes: {}, bArtifacts: {} });
    put(prefix + 'public-output-metrics-v3.json', { version: 3, freshSingleTaskValidated: true, arms: delivered });
    put(prefix + 'delivery-audit-v2.json', { version: 2, passed: true, arms: audited });
    put(prefix + 'grades.json', { candidates: { X: grade, Y: grade } });
    put(prefix + 'grade-mapping.json', { A: 'X', B: 'Y' });
  }
  put('scope-audit.json', scope);
  return { dir, put, get: file => JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8')) };
}
function run(f) { return spawnSync(process.execPath, [path.join(__dirname, 'summarize.cjs'), f.dir], { encoding: 'utf8', windowsHide: true }); }
test('valid complete evidence can pass the unchanged efficiency gate', () => {
  const f = fixture(), result = run(f);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(f.get('summary.json').gates.efficiency, true);
});
test('missing/damaged evidence cannot produce a passing summary', () => {
  for (const [file, change] of [
    ['scope-audit.json', d => { d.passed = false; }],
    ['scope-audit.json', d => { d.sessions[0].sessionId = 'wrong'; }],
    ['pair-1/delivery-audit-v2.json', d => { d.passed = false; }],
    ['pair-1/delivery-audit-v2.json', d => { d.arms.B.unmatchedObservationIndexes = [0]; }],
    ['pair-1/grade-mapping.json', d => { d.B = 'X'; }],
    ['pair-1/grades.json', d => { d.candidates.X.items[0].score = 0; }],
    ['pair-1/metrics.json', d => { d.arms.B.usage.uncachedInputPlusOutput = null; }],
    ['pair-1/metrics.json', d => { d.arms.B.usage.total_tokens = 0; }],
  ]) {
    const f = fixture(), value = f.get(file); change(value); f.put(file, value);
    const result = run(f); assert.notEqual(result.status, 0, file);
    assert.equal(fs.existsSync(path.join(f.dir, 'summary.json')), false);
  }
});
