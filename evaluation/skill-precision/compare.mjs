import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';
const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(dir, '../..');
const before = JSON.parse(fs.readFileSync(path.join(dir, 'baseline.json'), 'utf8'));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const graphPath = path.join(before.source, '.vscode/.knowledge/structural-graph.json');
if (sha(graphPath) !== before.graphSha256) throw new Error('Graph changed');
for (const [file, expected] of Object.entries(before.sourceHashes)) if (sha(path.join(before.source, file)) !== expected) throw new Error('Source changed');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8')), bundle = path.join(before.run, 'after.cjs');
await build({ entryPoints: [path.join(root, 'packages/mcp-server/src/taskContext.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
const { buildTaskContext } = createRequire(import.meta.url)(bundle);
const pairs = before.queries.map(q => ({ selector: q.selector, options: q.options, before: q.text, after: buildTaskContext(before.source, graph, { selector: q.selector, ...q.options }) }));
for (const pair of pairs) {
  const cli = spawnSync(process.execPath, [path.join(root, 'dist/skills/vibeknowledge-query/scripts/query.cjs'), 'context', '--workspace', before.source, '--selector', pair.selector, '--mode', pair.options.mode, '--depth', String(pair.options.depth), '--budget', String(pair.options.budget)], { encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (cli.status !== 0 || cli.stdout.trimEnd() !== pair.after.trimEnd()) throw new Error(`Packaged Skill parity failed for ${pair.selector}: ${cli.stderr}`);
  pair.packagedSkillParity = true;
}
const tokenized = spawnSync('python', ['-X', 'utf8', '-c', "import json,sys,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps([[len(e.encode(p[k], disallowed_special=())) for k in ['before','after']] for p in d]))"], { input: JSON.stringify(pairs), encoding: 'utf8', windowsHide: true, timeout: 30000 });
if (tokenized.status !== 0) throw new Error(tokenized.stderr);
const counts = JSON.parse(tokenized.stdout);
for (const [i, pair] of pairs.entries()) { pair.textTokens = { before: counts[i][0], after: counts[i][1] }; pair.changePercent = 100 * (counts[i][1] / counts[i][0] - 1); pair.fileControlIdentical = pair.selector.includes('#') ? null : pair.before === pair.after; }
const result = { at: new Date().toISOString(), candidateSha256: sha(path.join(root, 'packages/mcp-server/src/taskContext.ts')), graphSha256: before.graphSha256, sourceHashesMatch: true, encoding: 'o200k_base', pairs, note: 'Fixed query text only; no end-to-end agent usage or billing claim. All four preselected queries are retained.' };
if (process.argv.includes('--write')) { const out = path.join(dir, 'comparison.json'); if (fs.existsSync(out)) throw new Error('Already archived'); fs.writeFileSync(out, JSON.stringify(result, null, 2) + '\n'); }
console.log(JSON.stringify(pairs.map(({ selector, textTokens, changePercent, fileControlIdentical, after }) => ({ selector, textTokens, changePercent, fileControlIdentical, footer: after.split('\n').at(-1) })), null, 2));
