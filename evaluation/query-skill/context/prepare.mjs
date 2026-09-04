import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractStructuralGraph, serializeStructuralGraph } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '../../..');
const run = mkdtempSync(join(root, '.vscode-test/task-context-ab-'));
const snapshot = join(run, 'snapshot'); mkdirSync(snapshot);
const entries = ['src', 'tests', 'scripts', 'resources', 'packages/mcp-server/src', 'packages/mcp-server/tests',
  'packages/mcp-server/package.json', 'packages/mcp-server/tsconfig.json', 'packages/mcp-server/.npmrc',
  'package.json', 'tsconfig.json', 'esbuild.js', '.vscodeignore', '.github/workflows', '.vscode', 'eslint.config.cjs'];
for (const entry of entries) {
  if (!existsSync(join(root, entry))) continue;
  cpSync(join(root, entry), join(snapshot, entry), { recursive: true,
    filter: source => !/(?:^|[/\\])(?:node_modules|\.knowledge)(?:[/\\]|$)/.test(source) });
}
const hashes = {};
function hashDirectory(directory, prefix = '') {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const name = prefix + entry.name;
    if (entry.isDirectory()) hashDirectory(join(directory, entry.name), name + '/');
    else hashes[name] = createHash('sha256').update(readFileSync(join(directory, entry.name))).digest('hex');
  }
}
hashDirectory(snapshot);
const started = Date.now();
const graph = extractStructuralGraph({ workspaceRoot: snapshot, scope: '.' });
const elapsedMs = Date.now() - started;
writeFileSync(join(run, 'structural-graph.json'), serializeStructuralGraph(graph));
for (const arm of ['A', 'B']) {
  const dest = join(run, arm); cpSync(snapshot, dest, { recursive: true });
  cpSync(join(root, 'evaluation/query-skill/ab/observe.cjs'), join(dest, 'observe.cjs'));
  if (arm === 'B') {
    mkdirSync(join(dest, '.vscode/.knowledge'), { recursive: true });
    cpSync(join(run, 'structural-graph.json'), join(dest, '.vscode/.knowledge/structural-graph.json'));
    cpSync(join(root, 'dist/skills/vibeknowledge-query'), join(dest, '.agents/skills/vibeknowledge-query'), { recursive: true });
  }
}
writeFileSync(join(run, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), source: root, snapshot, sourceHashes: hashes,
  graph: { files: graph.files.length, entities: graph.entities.length, relations: graph.relations.length, diagnostics: graph.diagnostics.length, elapsedMs }, node: process.version }, null, 2) + '\n');
console.log(JSON.stringify({ run, graph: { files: graph.files.length, entities: graph.entities.length, relations: graph.relations.length, diagnostics: graph.diagnostics.length, elapsedMs } }));
