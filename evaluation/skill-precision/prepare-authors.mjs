import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../..'), baseline = JSON.parse(fs.readFileSync(path.join(dir, 'baseline.json'), 'utf8'));
const out = path.join(dir, 'authors-freeze.json');
if (fs.existsSync(out)) throw new Error('Authors already frozen');
const mapping = randomInt(2) ? { original: 'A', revised: 'B' } : { original: 'B', revised: 'A' };
const hashes = folder => Object.fromEntries(fs.readdirSync(folder, { recursive: true, withFileTypes: true }).filter(f => f.isFile()).map(f => { const file = path.join(f.parentPath, f.name); return [path.relative(folder, file).replaceAll('\\', '/'), createHash('sha256').update(fs.readFileSync(file)).digest('hex')]; }));
for (const [version, arm] of Object.entries(mapping)) {
  const target = path.join(baseline.run, 'author-' + arm);
  fs.cpSync(path.join(dir, 'fixture'), target, { recursive: true });
  fs.copyFileSync(version === 'original' ? path.join(baseline.run, 'original-guide.md') : path.join(root, 'resources/skills/vibeknowledge-dependency-graph/references/feature-briefs.md'), path.join(target, 'authoring.md'));
}
fs.writeFileSync(out, JSON.stringify({ createdAt: new Date().toISOString(), run: baseline.run, mapping, task: fs.readFileSync(path.join(dir, 'author-task.md'), 'utf8'), rubricSha256: createHash('sha256').update(fs.readFileSync(path.join(dir, 'author-rubric.md'))).digest('hex'), arms: Object.fromEntries(['A', 'B'].map(arm => [arm, { workspace: path.join(baseline.run, 'author-' + arm), hashes: hashes(path.join(baseline.run, 'author-' + arm)) }])) }, null, 2) + '\n');
console.log(JSON.stringify({ workspaces: ['A', 'B'].map(arm => path.join(baseline.run, 'author-' + arm)) }));
