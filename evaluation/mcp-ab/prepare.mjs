import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const source = resolve(process.argv[2] ?? join(root, '.vscode-test/task-context-ab-9W8uP7'));
const base = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
for (const [file, hash] of Object.entries(base.sourceHashes)) if (sha(join(source, 'snapshot', file)) !== hash) throw new Error('Frozen source changed: ' + file);
const run = mkdtempSync(join(root, '.vscode-test/mcp-feature-ab-'));
const snapshot = join(run, 'snapshot');
cpSync(join(source, 'snapshot'), snapshot, { recursive: true });
const artifacts = join(run, 'artifacts'), knowledge = join(artifacts, '.vscode/.knowledge');
mkdirSync(knowledge, { recursive: true });
cpSync(join(source, 'structural-graph.json'), join(knowledge, 'structural-graph.json'));
// Condenser validation needs matching evidence files. Generate in an isolated copy.
const generator = join(run, 'generation');
cpSync(snapshot, generator, { recursive: true });
cpSync(join(artifacts, '.vscode'), join(generator, '.vscode'), { recursive: true });
const scripts = join(root, 'resources/skills/vibeknowledge-dependency-graph/scripts');
const preparation = [];
for (const args of [
  ['--kind', 'framework', '--name', 'Framework'],
  ['--kind', 'feature', '--scope', 'src/ui/webview/graphView.ts', '--key', 'graph-visualization', '--name', 'Graph visualization'],
  ['--kind', 'feature', '--scope', 'src/services/aiIntegrationService.ts', '--key', 'copilot-instructions', '--name', 'Copilot instructions']
]) {
  const started = Date.now();
  const result = spawnSync(process.execPath, [join(scripts, 'curate-structural-graph.mjs'), '--workspace', generator, ...args], { encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 4 * 1024 * 1024 });
  preparation.push({ args, elapsedMs: Date.now() - started, exitCode: result.status, stdout: result.stdout, stderr: result.stderr });
  if (result.status !== 0) throw new Error(JSON.stringify(preparation.at(-1)));
}
cpSync(join(generator, '.vscode/.knowledge/agent-graph.json'), join(knowledge, 'agent-graph.json'));
cpSync(join(root, 'evaluation/query-skill/context/r3/generation/feature-briefs'), join(knowledge, 'feature-briefs'), { recursive: true });
// Empty DB fixture only: generated structure stays in JSON, no human overrides.
const db = new DatabaseSync(join(knowledge, 'graph.sqlite'));
db.exec(`CREATE TABLE entities(id TEXT PRIMARY KEY,name TEXT,type TEXT,file_path TEXT,start_line INTEGER,end_line INTEGER,description TEXT,created_at INTEGER,updated_at INTEGER,metadata TEXT);
CREATE TABLE relations(id TEXT PRIMARY KEY,source_entity_id TEXT,target_entity_id TEXT,verb TEXT,created_at INTEGER,metadata TEXT);
CREATE TABLE observations(id TEXT PRIMARY KEY,entity_id TEXT,content TEXT,created_at INTEGER,updated_at INTEGER);
CREATE TABLE agent_entity_overrides(agent_key TEXT PRIMARY KEY,description TEXT,updated_at INTEGER);`);
db.close();
function hashes(dir, prefix = '') {
  const result = {};
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name), name = prefix + entry.name;
    Object.assign(result, entry.isDirectory() ? hashes(path, name + '/') : { [name]: sha(path) });
  }
  return result;
}
const runtimeRoot = join(root, 'packages/mcp-server');
const runtimeHashes = { ...hashes(join(runtimeRoot, 'dist'), 'dist/'), 'package.json': sha(join(runtimeRoot, 'package.json')), 'package-lock.json': sha(join(runtimeRoot, 'package-lock.json')) };
const graph = JSON.parse(readFileSync(join(knowledge, 'agent-graph.json'), 'utf8'));
const candidateSha256 = createHash('sha256').update(JSON.stringify(runtimeHashes)).digest('hex');
for (let pair = 1; pair <= 3; pair++) {
  const pairRoot = join(run, 'pair-' + pair);
  for (const arm of ['A', 'B']) {
    const dest = join(pairRoot, arm);
    cpSync(snapshot, dest, { recursive: true });
    cpSync(join(root, 'evaluation/mcp-ab/observe.cjs'), join(dest, 'observe.cjs'));
    cpSync(join(root, 'evaluation/mcp-ab/mcp-client.mjs'), join(dest, 'mcp-client.mjs'));
    if (arm === 'B') {
      cpSync(join(artifacts, '.vscode'), join(dest, '.vscode'), { recursive: true });
      writeFileSync(join(dest, 'mcp-eval.json'), JSON.stringify({ runtimeRoot }) + '\n');
    }
  }
  writeFileSync(join(pairRoot, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), source: base.source, snapshot, sourceHashes: base.sourceHashes,
    graph: base.graph, preparation, groups: graph.groups.map(g => ({ key: g.key, scope: g.scope, entities: g.entities.length, relations: g.relations.length })),
    bArtifacts: hashes(artifacts), observerSha256: sha(join(pairRoot, 'A/observe.cjs')), bridgeSha256: sha(join(pairRoot, 'A/mcp-client.mjs')),
    runtimeRoot, runtimeHashes, candidateSha256, node: process.version, pair }, null, 2) + '\n');
}
cpSync(join(root, 'evaluation/mcp-ab/protocol.md'), join(run, 'protocol.md'));
console.log(JSON.stringify({ run, candidateSha256, groups: graph.groups.map(g => ({ key: g.key, entities: g.entities.length, relations: g.relations.length })), preparation }, null, 2));
