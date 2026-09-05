import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url));
const out = join(dir, 'details.json');
if (existsSync(out)) throw new Error('Details already archived');
const json = path => JSON.parse(readFileSync(path, 'utf8'));
const pairs = [];
for (let pair = 1; pair <= 3; pair++) {
  const folder = join(dir, 'pair-' + pair), metrics = json(join(folder, 'metrics.json'));
  const arms = {};
  for (const arm of ['A', 'B']) {
    const rows = readFileSync(join(folder, arm + '-observations.jsonl'), 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
    const phases = {};
    for (const phase of ['visualization', 'instructions']) {
      const selected = rows.filter(r => r.phase === phase), reads = selected.filter(r => r.operation === 'read');
      const exactReads = reads.map(r => JSON.stringify(r.args));
      phases[phase] = {
        observations: selected.length, observedTextTokens: metrics.arms[arm].phases[phase].observedTextTokens,
        reads: reads.length, distinctReadFiles: new Set(reads.map(r => r.metadata.file)).size,
        repeatedExactReads: reads.length - new Set(exactReads).size, searches: selected.filter(r => r.operation === 'rg').length,
        queries: selected.filter(r => r.operation === 'mcp').length, discoveries: selected.filter(r => r.operation === 'mcp-list').length,
        resources: selected.filter(r => r.operation === 'mcp-resource').length,
        failures: selected.filter(r => r.exitCode !== 0).map(r => ({ operation: r.operation, args: r.args, exitCode: r.exitCode })),
        internalCaps: selected.filter(r => r.truncated).length,
        tokensByKind: metrics.arms[arm].phases[phase].tokensByKind,
      };
    }
    const calls = rows.filter(r => r.operation === 'mcp');
    arms[arm] = { phases, queriesByTool: Object.fromEntries([...new Set(calls.map(r => r.args[0]))].map(name => [name, calls.filter(r => r.args[0] === name).length])),
      queryArguments: calls.map(r => ({ phase: r.phase, args: r.args, exitCode: r.exitCode })) };
  }
  pairs.push({ pair, arms });
}
writeFileSync(out, JSON.stringify({ generatedAt: new Date().toISOString(), pairs,
  note: 'Repeated read means exact duplicate observer read arguments within one task, not overlapping ranges. DistinctReadFiles excludes files only seen in rg output. Per-task model usage is not inferred from session totals.' }, null, 2) + '\n');
console.log(JSON.stringify({ pairs: pairs.map(p => ({ pair: p.pair, queryTools: p.arms.B.queriesByTool })) }));
