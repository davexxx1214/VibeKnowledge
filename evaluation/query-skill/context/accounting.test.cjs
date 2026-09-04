// Evaluation-only checks: requires Python + tiktoken, not a product dependency.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { assertFreshComplete } = require('./session-accounting.cjs');
const event = type => ({ type: 'event_msg', payload: { type, turn_id: 'turn-1' } });
const output = (type, text) => ({ type: 'response_item', payload: { type, output: text } });
const session = (items = []) => [
  { type: 'session_meta', payload: { id: 'test-session', source: { subagent: { thread_spawn: { agent_path: '/test' } } } } },
  event('task_started'), ...items, event('task_complete'),
];
const jsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + '\n';

test('only accepts one fresh matching completed task', () => {
  assert.equal(assertFreshComplete(session()).turn_id, 'turn-1');
  for (const rows of [[], [event('task_complete')], [event('task_complete'), event('task_started')],
    [...session(), event('task_started')], [...session(), ...session()],
    session([event('turn_aborted')]),
    [event('task_started'), { type: 'event_msg', payload: { type: 'task_complete', turn_id: 'wrong' } }]]) {
    assert.throws(() => assertFreshComplete(rows));
  }
});

test('counts both public output types and literal special tokens, excluding other event text', () => {
  const root = mkdtempSync(join(tmpdir(), 'vk-accounting-'));
  try {
    const a = join(root, 'a.jsonl'), b = join(root, 'b.jsonl'), result = join(root, 'counts.json');
    const items = [output('function_call_output', 'visible <|endoftext|>'),
      output('custom_tool_call_output', [{ type: 'text', text: 'also visible' }])];
    writeFileSync(a, jsonl(session(items)));
    // Synthetic non-public fields must not enter the public-tool metric.
    writeFileSync(b, jsonl(session([...items, output('reasoning', 'SYNTHETIC NON-PUBLIC '.repeat(100)),
      { type: 'response_item', payload: { type: 'message', role: 'system', content: 'SYNTHETIC SYSTEM' } }])));
    const run = spawnSync(process.execPath, [join(__dirname, 'measure-public-outputs.cjs'), a, b, result], { encoding: 'utf8', windowsHide: true });
    assert.equal(run.status, 0, run.stderr);
    const data = JSON.parse(readFileSync(result, 'utf8'));
    assert.equal(data.version, 3);
    assert.equal(data.arms.A.toolOutputItems, 2);
    assert.equal(data.arms.A.publicToolOutputTokens, data.arms.B.publicToolOutputTokens);
    assert.ok(data.arms.A.publicToolOutputTokens > 0);
    assert.ok(!JSON.stringify(data).includes('SYNTHETIC'));
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('one delivered occurrence cannot certify two identical observations', () => {
  const root = mkdtempSync(join(tmpdir(), 'vk-delivery-'));
  try {
    for (const arm of ['A', 'B']) {
      mkdirSync(join(root, arm));
      writeFileSync(join(root, arm, 'ab-observations.jsonl'), jsonl([{ displayed: 'duplicate' }, { displayed: 'duplicate' }]));
    }
    const file = join(root, 'session.jsonl'), result = join(root, 'audit.json');
    writeFileSync(file, jsonl(session([output('function_call_output', JSON.stringify({ output: 'duplicate' }))])));
    const run = spawnSync(process.execPath, [join(__dirname, 'audit-observation-delivery.cjs'), root, file, file, result], { encoding: 'utf8', windowsHide: true });
    assert.equal(run.status, 1, run.stderr);
    const data = JSON.parse(readFileSync(result, 'utf8'));
    assert.deepEqual(data.arms.A.unmatchedObservationIndexes, [1]);
    assert.equal(data.arms.A.matchedPublicToolOutput, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
