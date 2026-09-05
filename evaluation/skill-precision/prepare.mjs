import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(dir, '../..');
const destination = path.join(dir, 'baseline.json');
if (fs.existsSync(destination)) throw new Error('Baseline already frozen');
const run = fs.mkdtempSync(path.join(root, '.vscode-test/skill-precision-'));
const source = path.join(root, '.vscode-test/mcp-feature-first-ab-fMamLc/pair-1/B');
const graphPath = path.join(source, '.vscode/.knowledge/structural-graph.json');
const graph = JSON.parse(fs.readFileSync(graphPath, 'utf8'));
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
for (const f of graph.files) if (sha(path.join(source, f.filePath)) !== f.contentHash) throw new Error('Changed source: ' + f.filePath);
const bundle = path.join(run, 'before.cjs');
await build({ entryPoints: [path.join(root, 'packages/mcp-server/src/taskContext.ts')], bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
const { buildTaskContext } = createRequire(import.meta.url)(bundle);
const selectors = [
  'src/services/aiIntegrationService.ts#AIIntegrationService.generateCopilotInstructions',
  'src/services/aiIntegrationService.ts#AIIntegrationService.buildCursorRulesContent',
  'src/ui/commands/entityCommands.ts#EntityCommands.generateCopilotInstructions',
  'src/services/aiIntegrationService.ts',
];
const guide = path.join(root, 'resources/skills/vibeknowledge-dependency-graph/references/feature-briefs.md');
fs.copyFileSync(guide, path.join(run, 'original-guide.md'));
const queries = selectors.map(selector => ({ selector, options: { mode: 'change', depth: 2, budget: 1600, snippets: false }, text: buildTaskContext(source, graph, { selector, mode: 'change', depth: 2, budget: 1600, snippets: false }) }));
fs.writeFileSync(destination, JSON.stringify({ createdAt: new Date().toISOString(), run, source, graphSha256: sha(graphPath), sourceHashes: Object.fromEntries(graph.files.map(f => [f.filePath, f.contentHash])), guideSha256: sha(guide), implementationSha256: sha(path.join(root, 'packages/mcp-server/src/taskContext.ts')), bundleSha256: sha(bundle), queries }, null, 2) + '\n');
console.log(JSON.stringify({ run, queries: queries.length }));
