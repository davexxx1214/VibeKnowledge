import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const [runArg, sessionA, sessionB, outArg, pathA, pathB] = process.argv.slice(2);
if (![runArg, sessionA, sessionB, outArg, pathA, pathB].every(Boolean)) throw new Error('Usage: RUN SESSION_A SESSION_B ARCHIVE PATH_A PATH_B');
const run = resolve(runArg), out = resolve(outArg);
const invoke = (script, args) => {
  const r = spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(r.stdout + r.stderr);
  return r.stdout;
};
if (!existsSync(join(out, 'metrics.json'))) console.log(invoke('evaluation/query-skill/context/collect.cjs', [run, sessionA, sessionB, out, pathA, pathB]));
if (!existsSync(join(out, 'public-output.json'))) console.log(invoke('evaluation/query-skill/context/measure-public-outputs.cjs', [sessionA, sessionB, join(out, 'public-output.json')]));
if (!existsSync(join(out, 'delivery-audit.json'))) console.log(invoke('evaluation/query-skill/context/audit-observation-delivery.cjs', [run, sessionA, sessionB, join(out, 'delivery-audit.json')]));
const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
const hash = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const parse = file => readFileSync(file, 'utf8').trim().split('\n').map(JSON.parse);
const arms = {};
for (const [arm, session] of [['A', sessionA], ['B', sessionB]]) {
  const contexts = parse(session).filter(e => e.type === 'turn_context').map(e => e.payload);
  const observations = parse(join(run, arm, 'ab-observations.jsonl'));
  const phases = ['discovery', 'followup', 'control'];
  const tasks = observations.filter(o => o.operation === 'task').map(o => ({ phase: o.phase, exit: o.exitCode }));
  const errors = [];
  if (new Set(contexts.map(c => c.model + ':' + c.effort)).size !== 1) errors.push('Model/effort changed');
  if (JSON.stringify(tasks) !== JSON.stringify(phases.map(phase => ({ phase, exit: 0 })))) errors.push('Task release order/count/error mismatch');
  let current = '';
  for (const o of observations) {
    if (o.operation === 'task') current = o.phase;
    if (o.phase !== current) errors.push('Observation outside current stage');
  }
  if (hash(join(run, arm, 'observe.cjs')) !== manifest.observerSha256) errors.push('Observer changed');
  for (const [file, expected] of Object.entries(manifest.taskHashes)) if (hash(join(run, arm, '.evaluation', file)) !== expected) errors.push('Task changed: ' + file);
  arms[arm] = { errors, modelContexts: contexts.length, tasks, observations: observations.length,
    cappedObservations: observations.filter(o => o.truncated).length,
    failedObservations: observations.filter(o => o.exitCode !== 0).length };
}
const audit = { createdAt: new Date().toISOString(), passed: Object.values(arms).every(a => a.errors.length === 0), arms,
  limits: ['Observation delivery is multiplicity-aware, not call-identity proof. Agent scope compliance additionally reviewed from public calls.', 'Full-session numeric usage does not support exact uncached-token attribution to each stage.'] };
if (existsSync(join(out, 'stage-audit.json'))) throw new Error('Stage audit already exists');
writeFileSync(join(out, 'stage-audit.json'), JSON.stringify(audit, null, 2) + '\n');
console.log(JSON.stringify(audit, null, 2));
