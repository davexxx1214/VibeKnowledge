import { cpSync, readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
const directory = dirname(fileURLToPath(import.meta.url)), root = resolve(directory, '../..');
const freeze = JSON.parse(readFileSync(join(directory, 'freeze.json'), 'utf8'));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const out = join(directory, 'preflight-checks.json');
if (existsSync(out)) throw new Error('Preflight already recorded');
for (let p = 1; p <= 3; p++) for (const arm of ['A', 'B']) {
  const dir = join(freeze.run, 'pair-' + p, arm);
  if (existsSync(join(dir, 'ab-observations.jsonl')) || existsSync(join(dir, 'REPORT.md'))) throw new Error('Candidates already started');
}
function inventory(dir, prefix = '') {
  return readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? inventory(join(dir, e.name), prefix + e.name + '/') : [prefix + e.name]).sort();
}
for (const [dir, expected] of [[join(freeze.run, 'snapshot'), freeze.sourceHashes], [join(freeze.run, 'artifacts'), freeze.bArtifacts]]) {
  if (JSON.stringify(inventory(dir)) !== JSON.stringify(Object.keys(expected).sort())) throw new Error('Unexpected source/artifact file inventory');
}
const smoke = join(freeze.run, 'preflight-workspace');
cpSync(join(freeze.run, 'pair-1/B'), smoke, { recursive: true });
const call = args => {
  const result = spawnSync(process.execPath, ['mcp-client.mjs', ...args], { cwd: smoke, encoding: 'utf8', windowsHide: true, timeout: 30000 });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return result.stdout;
};
const listed = call(['list']), tools = JSON.parse(listed).tools;
if (listed.length > 18000 || !['find_features', 'get_feature_brief', 'get_task_context'].every(n => tools.some(t => t.name === n))) throw new Error('Incomplete/capped feature-first discovery');
const briefs = JSON.parse(readFileSync(join(smoke, '.vscode/.knowledge/feature-briefs/index.json'), 'utf8'));
const checks = [];
for (const brief of briefs.features ?? briefs.briefs ?? []) {
  const output = call(['call', 'get_feature_brief', '--feature', brief.key, '--tokenBudget', '1800']);
  if (output.includes('NOT CURRENT')) throw new Error('Stale card in fixture');
  checks.push({ key: brief.key, chars: output.length, outputSha256: createHash('sha256').update(output).digest('hex') });
}
if (checks.length !== 2) throw new Error('Expected two valid original briefs');
const py = spawnSync('python', ['-X', 'utf8', '-c', "import sys,json,tiktoken;print(json.dumps({'python':sys.version,'executable':sys.executable,'tiktoken':tiktoken.__version__,'module':tiktoken.__file__}))"], { encoding: 'utf8', windowsHide: true });
if (py.status !== 0) throw new Error(py.stderr);
const tokenizer = JSON.parse(py.stdout);
tokenizer.executableSha256 = sha(tokenizer.executable); tokenizer.moduleSha256 = sha(tokenizer.module);
const helpers = ['session-accounting.cjs', 'measure-public-outputs.cjs', 'audit-observation-delivery.cjs'].map(f => 'evaluation/query-skill/context/' + f);
const current = readdirSync(directory).filter(f => /\.(?:mjs|cjs|md)$/.test(f));
writeFileSync(out, JSON.stringify({
  at: new Date().toISOString(), beforeAnyCandidate: true, run: freeze.run, candidateSha256: freeze.candidateSha256,
  note: 'Final pre-run harness/helper fingerprints. Supersedes matching harness entries in earlier preflight freezes; no candidate had started.',
  harnessHashes: Object.fromEntries(current.map(f => [f, sha(join(directory, f))])),
  helperHashes: Object.fromEntries(helpers.map(f => [f, sha(join(root, f))])), tokenizer,
  sourceInventoryVerified: true, artifactInventoryVerified: true, tools: tools.map(t => t.name),
  discoveryChars: listed.length, briefs: checks,
}, null, 2) + '\n');
console.log(JSON.stringify({ smokePassed: true, toolCount: tools.length, discoveryChars: listed.length, briefs: checks.map(b => b.key), tokenizer }));
