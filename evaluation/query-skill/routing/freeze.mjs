import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
const root = resolve('.'), run = resolve(process.argv[2]);
const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
for (const role of ['snapshot', 'author', 'designer']) for (const [file, hash] of Object.entries(manifest.sourceHashes)) {
  if (sha(join(run, role, file)) !== hash) throw new Error(`${role} changed ${file}`);
}
const tasks = JSON.parse(readFileSync(join(run, 'designer/tasks.json'), 'utf8'));
const briefRoot = join(run, 'author/.vscode/.knowledge/feature-briefs');
if (JSON.parse(readFileSync(join(briefRoot, 'index.json'), 'utf8')).features.length !== 5) throw new Error('Expected five reviewed page briefs');
const archive = join(root, 'evaluation/query-skill/routing');
if (existsSync(join(archive, 'freeze.json'))) throw new Error('Do not overwrite a frozen experiment');
for (const name of ['tasks.json', 'tasks.md', 'rubric.json', 'rubric.md']) cpSync(join(run, 'designer', name), join(archive, name));
cpSync(briefRoot, join(archive, 'generation/feature-briefs'), { recursive: true });
cpSync(join(run, 'author/.brief-authoring/INSTRUCTIONS.md'), join(archive, 'generation/authoring-instructions.md'));
const fingerprint = (dir, prefix = '') => Object.fromEntries(readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory()
  ? Object.entries(fingerprint(join(dir, e.name), prefix + e.name + '/')) : [[prefix + e.name, sha(join(dir, e.name))]]));
const environment = { node: process.version, nodeBinarySha256: sha(process.execPath),
  rg: spawnSync('rg', ['--version'], { encoding: 'utf8', windowsHide: true }).stdout.trim(),
  tokenizer: spawnSync('python', ['-X', 'utf8', '-c', 'import tiktoken; print(tiktoken.__version__)'], { encoding: 'utf8', windowsHide: true }).stdout.trim() };
for (const pair of [1, 2, 3]) {
  const pairRoot = join(run, 'pair-' + pair);
  if (existsSync(pairRoot)) throw new Error('Pair already exists');
  for (const arm of ['A', 'B']) {
    const workspace = join(pairRoot, arm); cpSync(join(run, 'snapshot'), workspace, { recursive: true });
    cpSync(join(archive, 'observe.cjs'), join(workspace, 'observe.cjs'));
    mkdirSync(join(workspace, '.evaluation'));
    for (const phase of ['discovery', 'followup', 'control']) {
      if (typeof tasks[phase] !== 'string' || !tasks[phase].trim()) throw new Error('Missing task ' + phase);
      writeFileSync(join(workspace, '.evaluation', phase + '.md'), tasks[phase] + '\n');
    }
    if (arm === 'B') {
      cpSync(briefRoot, join(workspace, '.vscode/.knowledge/feature-briefs'), { recursive: true });
      cpSync(join(root, 'dist/skills/vibeknowledge-query'), join(workspace, '.agents/skills/vibeknowledge-query'), { recursive: true });
    }
  }
  const b = join(pairRoot, 'B');
  const bArtifacts = { ...fingerprint(join(b, '.agents'), '.agents/'), ...fingerprint(join(b, '.vscode'), '.vscode/') };
  writeFileSync(join(pairRoot, 'manifest.json'), JSON.stringify({ ...manifest, createdAt: new Date().toISOString(),
    snapshot: join(run, 'snapshot'), environment, bArtifacts, observerSha256: sha(join(b, 'observe.cjs')),
    taskHashes: fingerprint(join(b, '.evaluation')), graph: { status: 'not supplied', reason: 'Frontend brief evaluation; no Vue AST coverage claim' } }, null, 2) + '\n');
}
const frozen = { createdAt: new Date().toISOString(), run, environment,
  scope: manifest.scope, sourceRevision: manifest.sourceRevision, sourceFiles: Object.keys(manifest.sourceHashes).length,
  implementation: fingerprint(join(root, 'dist/skills/vibeknowledge-query')), tasks: sha(join(archive, 'tasks.json')),
  rubric: sha(join(archive, 'rubric.json')), observer: sha(join(archive, 'observe.cjs')), briefs: fingerprint(briefRoot),
  protocol: sha(join(archive, 'protocol.md')) };
writeFileSync(join(archive, 'freeze.json'), JSON.stringify(frozen, null, 2) + '\n');
console.log(JSON.stringify(frozen, null, 2));
