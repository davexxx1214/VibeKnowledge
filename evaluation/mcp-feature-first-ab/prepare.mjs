import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const directory = dirname(fileURLToPath(import.meta.url));
const previous = resolve(process.argv[2] ?? join(root, '.vscode-test/mcp-feature-ab-jzyaQm'));
const json = file => JSON.parse(readFileSync(file, 'utf8'));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
function hashes(dir, prefix = '') {
  const result = {};
  for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const file = join(dir, entry.name), key = prefix + entry.name;
    if (entry.isSymbolicLink()) throw new Error('Do not silently follow symlinks: ' + file);
    Object.assign(result, entry.isDirectory() ? hashes(file, key + '/') : { [key]: sha(file) });
  }
  return result;
}
function verify(dir, expected) {
  for (const [file, hash] of Object.entries(expected)) {
    if (!existsSync(join(dir, file)) || sha(join(dir, file)) !== hash) throw new Error('Frozen input changed: ' + join(dir, file));
  }
}
const base = json(join(previous, 'pair-1/manifest.json'));
verify(join(previous, 'snapshot'), base.sourceHashes);
verify(join(previous, 'artifacts'), base.bArtifacts);
const historical = json(join(root, 'evaluation/query-skill/context/r3/heldout-r1/manifest.json'));
for (const [file, digest] of Object.entries(base.bArtifacts)) {
  if ((file.includes('/feature-briefs/') || file.endsWith('/structural-graph.json')) && historical.bArtifacts[file] !== digest) {
    throw new Error('Not the original Skill r3 artifact: ' + file);
  }
}
const runtimeRoot = join(root, 'packages/mcp-server');
const runtimeHashes = { ...hashes(join(runtimeRoot, 'dist'), 'dist/'), 'package.json': sha(join(runtimeRoot, 'package.json')), 'package-lock.json': sha(join(runtimeRoot, 'package-lock.json')) };
const candidateSha256 = createHash('sha256').update(JSON.stringify(runtimeHashes)).digest('hex');
const run = mkdtempSync(join(root, '.vscode-test/mcp-feature-first-ab-'));
const snapshot = join(run, 'snapshot'), artifacts = join(run, 'artifacts');
cpSync(join(previous, 'snapshot'), snapshot, { recursive: true });
cpSync(join(previous, 'artifacts'), artifacts, { recursive: true });
const common = {
  createdAt: new Date().toISOString(), source: base.source, snapshot, sourceHashes: base.sourceHashes,
  graph: base.graph, preparation: [], reusedPreparation: base.preparation, groups: base.groups,
  bArtifacts: hashes(artifacts), observerSha256: sha(join(directory, 'observe.cjs')),
  bridgeSha256: sha(join(directory, 'mcp-client.mjs')), runtimeRoot, runtimeHashes, candidateSha256, node: process.version,
};
for (let pair = 1; pair <= 3; pair++) {
  const pairRoot = join(run, 'pair-' + pair);
  for (const arm of ['A', 'B']) {
    const target = join(pairRoot, arm);
    cpSync(snapshot, target, { recursive: true });
    for (const name of ['observe.cjs', 'mcp-client.mjs']) cpSync(join(directory, name), join(target, name));
    if (arm === 'B') {
      cpSync(join(artifacts, '.vscode'), join(target, '.vscode'), { recursive: true });
      writeFileSync(join(target, 'mcp-eval.json'), JSON.stringify({ runtimeRoot }) + '\n');
    }
  }
  writeFileSync(join(pairRoot, 'manifest.json'), JSON.stringify({ ...common, pair }, null, 2) + '\n');
}
const where = spawnSync(process.platform === 'win32' ? 'where.exe' : 'which', ['rg'], { encoding: 'utf8', windowsHide: true });
if (where.status !== 0) throw new Error('rg unavailable');
const rgPath = where.stdout.trim().split(/\r?\n/)[0];
const dependencies = hashes(join(runtimeRoot, 'node_modules'));
const freeze = {
  ...common, run, previous, dispatchOrder: [['A', 'B'], ['B', 'A'], ['A', 'B']],
  runtimeSourceHashes: hashes(join(runtimeRoot, 'src')), dependencyHashes: dependencies,
  dependenciesSha256: createHash('sha256').update(JSON.stringify(dependencies)).digest('hex'),
  environment: { nodePath: process.execPath, nodeSha256: sha(process.execPath), rgPath, rgSha256: sha(rgPath) },
  harnessHashes: Object.fromEntries(['protocol.md', 'tasks.md', 'rubric.md', 'prepare.mjs', 'observe.cjs', 'mcp-client.mjs', 'collect.cjs', 'summarize.cjs', 'blind.mjs'].map(name => [name, sha(join(directory, name))])),
  historicalBriefGeneration: { uncachedInputPlusOutput: 90480, report: 'evaluation/query-skill/context/r3/generation/GENERATION.md' },
};
const frozen = join(directory, 'freeze.json');
if (existsSync(frozen)) throw new Error('This experiment is already frozen; use a new directory.');
mkdirSync(directory, { recursive: true });
writeFileSync(frozen, JSON.stringify(freeze, null, 2) + '\n');
console.log(JSON.stringify({ run, candidateSha256, dependencyFiles: Object.keys(dependencies).length, groups: base.groups }, null, 2));
