// Export public observations/reports and numeric metadata only, never full sessions.
import { readFileSync, writeFileSync, readdirSync, existsSync, openSync, readSync, closeSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
const directory = dirname(fileURLToPath(import.meta.url)), root = resolve(directory, '../..');
const frozen = JSON.parse(readFileSync(join(directory, 'freeze.json'), 'utf8'));
const [mode = 'status', requested = 'all', sessionRoot = 'C:/Users/davex/.codex/sessions/2026/09/05'] = process.argv.slice(2);
function locate() {
  const result = [];
  for (const name of readdirSync(sessionRoot).filter(n => n.endsWith('.jsonl'))) {
    const file = join(sessionRoot, name), fd = openSync(file, 'r'), buffer = Buffer.alloc(128 * 1024);
    let head;
    try { head = buffer.subarray(0, readSync(fd, buffer, 0, buffer.length, 0)).toString('utf8').split('\n')[0]; } finally { closeSync(fd); }
    const event = JSON.parse(head), p = event.payload;
    const agentPath = p?.source?.subagent?.thread_spawn?.agent_path;
    const match = /^\/root\/mcp_feature_pair([123])_([ab])$/.exec(agentPath ?? '');
    if (event.type !== 'session_meta' || !match) continue;
    result.push({ pair: Number(match[1]), arm: match[2].toUpperCase(), session: file, sessionId: p.id, agentPath, forkTurns: 'none' });
  }
  if (new Set(result.map(x => x.pair + x.arm)).size !== result.length) throw new Error('Ambiguous duplicate candidate sessions');
  return result.sort((a, b) => a.pair - b.pair || a.arm.localeCompare(b.arm));
}
const sessions = locate();
const run = (script, args) => {
  const result = spawnSync(process.execPath, [script, ...args], { cwd: root, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout.trim();
};
if (mode === 'status') {
  console.log(JSON.stringify(sessions.map(s => {
    const events = readFileSync(s.session, 'utf8').split('\n').filter(Boolean).map(JSON.parse);
    const complete = events.some(e => e.type === 'event_msg' && e.payload?.type === 'task_complete');
    return { pair: s.pair, arm: s.arm, sessionId: s.sessionId, complete };
  })));
} else if (mode === 'collect') {
  const pairs = requested === 'all' ? [1, 2, 3] : [Number(requested)];
  for (const pair of pairs) {
    const a = sessions.find(s => s.pair === pair && s.arm === 'A'), b = sessions.find(s => s.pair === pair && s.arm === 'B');
    if (!a || !b) throw new Error('Pair not located: ' + pair);
    const pairRun = join(frozen.run, 'pair-' + pair), out = join(directory, 'pair-' + pair);
    mkdirSync(out, { recursive: true });
    if (!existsSync(join(out, 'metrics.json'))) console.log(run(join(directory, 'collect.cjs'), [pairRun, a.session, b.session, out, a.agentPath, b.agentPath]));
    const shared = join(root, 'evaluation/query-skill/context');
    if (!existsSync(join(out, 'public-output-metrics-v3.json'))) console.log(run(join(shared, 'measure-public-outputs.cjs'), [a.session, b.session, join(out, 'public-output-metrics-v3.json')]));
    if (!existsSync(join(out, 'delivery-audit-v2.json'))) console.log(run(join(shared, 'audit-observation-delivery.cjs'), [pairRun, a.session, b.session, join(out, 'delivery-audit-v2.json')]));
    if (!existsSync(join(out, 'grade-mapping.json'))) console.log(run(join(directory, 'blind.mjs'), [pairRun, out]));
  }
  if (sessions.length === 6) {
    const mapping = join(directory, 'session-mapping.json');
    if (!existsSync(mapping)) writeFileSync(mapping, JSON.stringify({ dispatchAttestation: 'See prewritten dispatches.json and actual public spawn records; all candidates explicitly use fork_turns none.', sessions }, null, 2) + '\n');
  }
} else throw new Error('Use status or collect PAIR|all');
