import { cpSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
const root = resolve('.');
const previous = resolve(process.argv[2]);
const selection = process.argv[3] ?? 'Reusable feature briefs for graph refresh, Skill installation, entity descriptions and MCP setup.';
const run = mkdtempSync(join(root, '.vscode-test/feature-brief-generation-'));
cpSync(join(previous, 'snapshot'), join(run, 'workspace'), { recursive: true });
const workspace = join(run, 'workspace');
const instructions = join(workspace, '.brief-authoring'); mkdirSync(instructions);
for (const file of ['feature-brief.mjs', 'publish-feature-brief.mjs']) {
  cpSync(join(root, 'resources/skills/vibeknowledge-dependency-graph/scripts', file), join(instructions, file));
}
cpSync(join(root, 'resources/skills/vibeknowledge-dependency-graph/references/feature-briefs.md'), join(instructions, 'INSTRUCTIONS.md'));
cpSync(join(root, 'evaluation/query-skill/ab/observe.cjs'), join(workspace, 'observe.cjs'));
cpSync(join(previous, 'manifest.json'), join(run, 'source-manifest.json'));
writeFileSync(join(run, 'generation-manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), sourceRun: previous,
  sourceSnapshot: JSON.parse(readFileSync(join(previous, 'manifest.json'), 'utf8')).snapshot, workspace,
  selection: `${selection} Generator has no task prompts, rubric or prior results.` }, null, 2) + '\n');
console.log(JSON.stringify({ run, workspace }));
