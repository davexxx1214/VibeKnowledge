// Developer-only benchmark fixture. Never modifies the supplied source checkout.
import { cpSync, existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('.'), source = resolve(process.argv[2] ?? '.vscode-test/yuxi-review-e9c0bbfc');
const run = mkdtempSync(join(root, '.vscode-test/feature-routing-'));
const snapshot = join(run, 'snapshot'); mkdirSync(snapshot);
const hashes = {};
const sha = data => createHash('sha256').update(data).digest('hex');
function copySources(dir, prefix) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const key = prefix + entry.name, path = join(dir, entry.name);
    if (entry.isSymbolicLink()) throw new Error('No symlinks in fixture');
    if (entry.isDirectory()) copySources(path, key + '/');
    else if (/\.(?:vue|js|ts|jsx|tsx|json|css|less|scss|html|md|mjs|cjs)$/.test(entry.name)) {
      const bytes = readFileSync(path); hashes[key] = sha(bytes);
      mkdirSync(resolve(snapshot, key, '..'), { recursive: true }); cpSync(path, join(snapshot, key));
    }
  }
}
copySources(join(source, 'web/src'), 'web/src/'); copySources(join(source, 'web/tests'), 'web/tests/');
for (const file of ['package.json', 'vite.config.js', 'vitest.config.js', 'index.html']) {
  if (!existsSync(join(source, 'web', file))) continue;
  const key = 'web/' + file; cpSync(join(source, key), join(snapshot, key)); hashes[key] = sha(readFileSync(join(snapshot, key)));
}
const manifest = { createdAt: new Date().toISOString(), sourceRepository: 'https://github.com/zenghui-li/yuxi',
  sourceRevision: '2c8ff10dc6bca1da07c0d64f451ee7c1cf177476', snapshot, sourceHashes: hashes,
  scope: 'Frontend text sources/config only; binary assets, node_modules and backend omitted equally. No Vue structural-graph completeness claim.' };
writeFileSync(join(run, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
for (const role of ['author', 'designer']) {
  cpSync(snapshot, join(run, role), { recursive: true });
  cpSync(join(root, 'evaluation/query-skill/ab/observe.cjs'), join(run, role, 'observe.cjs'));
}
const author = join(run, 'author'), instructions = join(author, '.brief-authoring'); mkdirSync(instructions);
for (const file of ['feature-brief.mjs', 'feature-search.mjs', 'publish-feature-brief.mjs']) cpSync(join(root, 'resources/skills/vibeknowledge-dependency-graph/scripts', file), join(instructions, file));
cpSync(join(root, 'resources/skills/vibeknowledge-dependency-graph/references/feature-briefs.md'), join(instructions, 'INSTRUCTIONS.md'));
console.log(JSON.stringify({ run, sourceFiles: Object.keys(hashes).length, author, designer: join(run, 'designer') }));
