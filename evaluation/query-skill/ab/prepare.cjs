const { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, symlinkSync, existsSync, readdirSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { createHash } = require('node:crypto');

const root = resolve(__dirname, '../../..');
const previous = JSON.parse(readFileSync(join(root, 'evaluation/query-skill/results.json'), 'utf8'));
const snapshot = previous.workspace;
const source = previous.source;
const dependencies = resolve(process.argv[2] ?? join(source, 'node_modules'));
const run = mkdtempSync(join(root, '.vscode-test/query-skill-ab-'));
const sourceHashes = {};
function hashSource(dir, prefix = '') {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const key = `${prefix}${entry.name}`;
    if (entry.isDirectory()) hashSource(join(dir, entry.name), key + '/');
    else sourceHashes[key] = createHash('sha256').update(readFileSync(join(dir, entry.name))).digest('hex');
  }
}
hashSource(join(snapshot, 'src'), 'src/');
for (const arm of ['A', 'B']) {
  const dest = join(run, arm);
  mkdirSync(dest);
  for (const entry of ['src', 'test', 'package.json', 'tsconfig.json', 'index.js']) {
    if (existsSync(join(snapshot, entry))) cpSync(join(snapshot, entry), join(dest, entry), { recursive: true });
  }
  cpSync(join(source, 'jest.json'), join(dest, 'jest.json'));
  symlinkSync(dependencies, join(dest, 'node_modules'), 'junction');
  cpSync(join(__dirname, 'observe.cjs'), join(dest, 'observe.cjs'));
  cpSync(join(__dirname, 'legacy-node26.cjs'), join(dest, 'legacy-node26.cjs'));
  writeFileSync(join(dest, 'jest.ab.json'), JSON.stringify({
    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    transform: { '^.+[.]tsx?$': 'ts-jest' },
    testRegex: '/src/.*\\.(test|spec)\\.(ts|tsx|js)$',
    testEnvironment: 'node',
    setupFiles: ['<rootDir>/legacy-node26.cjs'],
    globals: { 'ts-jest': { isolatedModules: true, diagnostics: false, tsConfig: { skipLibCheck: true } } },
  }, null, 2) + '\n');
  if (arm === 'B') {
    cpSync(join(snapshot, '.vscode/.knowledge'), join(dest, '.vscode/.knowledge'), { recursive: true });
    cpSync(join(root, 'dist/skills/vibeknowledge-query'), join(dest, '.agents/skills/vibeknowledge-query'), { recursive: true });
  }
}
writeFileSync(join(run, 'manifest.json'), JSON.stringify({ createdAt: new Date().toISOString(), source, snapshot, dependencies, sourceHashes, arms: ['A', 'B'], node: process.version }, null, 2) + '\n');
console.log(run);
