import { cpSync, existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';
const [sourceArg, generationArg, label, tasksArg] = process.argv.slice(2);
if (!sourceArg || !generationArg || !/^[a-z0-9-]+$/.test(label)) throw new Error('Usage: SOURCE_RUN GENERATION_RUN LABEL');
const root = resolve('.'), source = resolve(sourceArg), generation = resolve(generationArg);
const manifest = JSON.parse(readFileSync(join(source, 'manifest.json'), 'utf8'));
const run = mkdtempSync(join(root, `.vscode-test/${label}-`));
const briefRoot = join(generation, 'workspace/.vscode/.knowledge/feature-briefs');
if (!existsSync(join(briefRoot, 'index.json'))) throw new Error('Publish feature briefs before preparing a pair.');
cpSync(join(source, 'snapshot'), join(run, 'snapshot'), { recursive: true });
for (const arm of ['A', 'B']) {
  const destination = join(run, arm);
  cpSync(join(source, 'snapshot'), destination, { recursive: true });
  cpSync(join(root, 'evaluation/query-skill/ab/observe.cjs'), join(destination, 'observe.cjs'));
  if (arm === 'B') {
    mkdirSync(join(destination, '.vscode/.knowledge'), { recursive: true });
    cpSync(join(source, 'structural-graph.json'), join(destination, '.vscode/.knowledge/structural-graph.json'));
    cpSync(briefRoot, join(destination, '.vscode/.knowledge/feature-briefs'), { recursive: true });
    cpSync(join(root, 'dist/skills/vibeknowledge-query'), join(destination, '.agents/skills/vibeknowledge-query'), { recursive: true });
  }
}
const bArtifacts = {};
function fingerprint(dir, prefix) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name), key = prefix + entry.name;
    if (entry.isDirectory()) fingerprint(path, key + '/');
    else bArtifacts[key] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
}
fingerprint(join(run, 'B/.agents'), '.agents/'); fingerprint(join(run, 'B/.vscode/.knowledge'), '.vscode/.knowledge/');
writeFileSync(join(run, 'manifest.json'), JSON.stringify({ ...manifest, createdAt: new Date().toISOString(), snapshot: join(run, 'snapshot'),
  originalSourceRun: source, generationRun: generation, label, bArtifacts }, null, 2) + '\n');
cpSync(join(root, 'evaluation/query-skill/context/protocol.md'), join(run, 'protocol.md'));
cpSync(tasksArg ? resolve(tasksArg) : join(root, 'evaluation/query-skill/context', label.includes('heldout') ? 'tasks-heldout.md' : 'tasks-development.md'), join(run, 'tasks.md'));
console.log(JSON.stringify({ run }));
