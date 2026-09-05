import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { build } from 'esbuild';

const dir = path.dirname(fileURLToPath(import.meta.url)), root = path.resolve(dir, '../..');
const baselinePath = path.join(dir, 'baseline.json');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const baselineMode = process.argv.includes('--baseline');
if (baselineMode && fs.existsSync(baselinePath)) throw new Error('Baseline already frozen');
const previous = baselineMode ? null : JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
const run = previous?.run ?? fs.mkdtempSync(path.join(root, '.vscode-test/brief-budget-'));
const implementation = path.join(root, 'packages/mcp-server/src/featureBriefQuery.ts');
const bundle = path.join(run, baselineMode ? 'before.cjs' : 'after.cjs');
await build({ entryPoints: [implementation], bundle: true, platform: 'node', format: 'cjs', outfile: bundle });
const { featureBrief } = createRequire(import.meta.url)(bundle);
const sources = [
  ['vibeknowledge', '.vscode-test/mcp-feature-first-ab-fMamLc/pair-1/B'],
  ['yuxi', '.vscode-test/feature-routing-dLeIF4/pair-1/B'],
  ['shelf', '.vscode-test/skill-precision-ueXaLu/validate-A'],
];
const budgets = [600, 900, 1200, 1800, 2400, 12000];
const cards = baselineMode ? sources.flatMap(([sample, relative]) => {
  const workspace = path.join(root, relative), folder = path.join(workspace, '.vscode/.knowledge/feature-briefs');
  return fs.readdirSync(folder).filter(f => f.endsWith('.json') && f !== 'index.json').sort().map(file => {
    const artifact = path.join(folder, file), document = JSON.parse(fs.readFileSync(artifact, 'utf8'));
    return { sample, workspace, artifact, artifactSha256: sha(artifact), indexSha256: sha(path.join(folder, 'index.json')), document };
  });
}) : previous.cards;
if (cards.length !== 8) throw new Error('Expected all eight preselected cards');
const rows = [];
for (const card of cards) {
  if (sha(card.artifact) !== card.artifactSha256 || sha(path.join(path.dirname(card.artifact), 'index.json')) !== card.indexSha256) throw new Error('Card changed');
  for (const source of card.document.sources) if (sha(path.join(card.workspace, source.filePath)) !== source.contentHash) throw new Error('Source changed: ' + source.filePath);
  for (const budget of budgets) {
    const text = featureBrief(card.workspace, card.document.key, budget);
    if (text.includes('NOT CURRENT')) throw new Error('Unverified input');
    const shown = card.document.facts.flatMap((f, index) => {
      const block = `${f.kind.toUpperCase()} [${f.certainty}] ${f.text}\n  ${f.evidence.map(e => `${e.filePath}:${e.startLine}-${e.endLine}`).join('; ')}`;
      return text.includes(block) ? [{ index, kind: f.kind }] : [];
    });
    rows.push({ sample: card.sample, key: card.document.key, budget, text, shown });
  }
}
const tokenized = spawnSync('python', ['-X', 'utf8', '-c', "import json,sys,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps([len(e.encode(s,disallowed_special=())) for s in d]))"], { input: JSON.stringify(rows.map(r => r.text)), encoding: 'utf8', windowsHide: true, timeout: 30000 });
if (tokenized.status !== 0) throw new Error(tokenized.stderr);
const tokens = JSON.parse(tokenized.stdout); rows.forEach((r, i) => { r.textTokens = tokens[i]; });
if (baselineMode) {
  fs.copyFileSync(implementation, path.join(dir, 'before-featureBriefQuery.ts.txt'));
  fs.writeFileSync(baselinePath, JSON.stringify({ at: new Date().toISOString(), run, implementationSha256: sha(implementation), budgets, cards, rows }, null, 2) + '\n');
  console.log(JSON.stringify({ baseline: baselinePath, cards: cards.length, queries: rows.length, run }));
} else {
  const comparisons = rows.map((after, i) => {
    const before = previous.rows[i];
    if (before.key !== after.key || before.budget !== after.budget) throw new Error('Query order changed');
    const shown = (row, kinds) => row.shown.filter(f => kinds.includes(f.kind)).length;
    return { before, after, gained: after.shown.filter(f => !before.shown.some(b => b.index === f.index)), lost: before.shown.filter(f => !after.shown.some(a => a.index === f.index)), priorityFacts: { before: shown(before, ['constraint', 'test']), after: shown(after, ['constraint', 'test']) } };
  });
  if (process.argv.includes('--write')) {
    const out = path.join(dir, 'comparison.json'); if (fs.existsSync(out)) throw new Error('Already archived');
    for (const row of rows) {
      const card = cards.find(c => c.sample === row.sample && c.document.key === row.key);
      const cli = spawnSync(process.execPath, [path.join(root, 'dist/skills/vibeknowledge-query/scripts/query.cjs'), 'brief', '--workspace', card.workspace, '--feature', row.key, '--budget', String(row.budget)], { encoding: 'utf8', windowsHide: true, timeout: 10000 });
      if (cli.status !== 0 || cli.stdout.trimEnd() !== row.text.trimEnd()) throw new Error('Packaged Skill mismatch');
    }
    fs.writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), implementationSha256: sha(implementation), inputHashesMatch: true, packagedSkillParity: true, tokenizer: 'o200k_base', comparisons }, null, 2) + '\n');
  }
  console.log(JSON.stringify(budgets.map(budget => {
    const selected = comparisons.filter(c => c.before.budget === budget);
    return { budget, cases: selected.length, priorityFacts: { before: selected.reduce((n, c) => n + c.priorityFacts.before, 0), after: selected.reduce((n, c) => n + c.priorityFacts.after, 0) }, textTokens: { before: selected.reduce((n, c) => n + c.before.textTokens, 0), after: selected.reduce((n, c) => n + c.after.textTokens, 0) }, gained: selected.flatMap(c => c.gained).length, lost: selected.flatMap(c => c.lost).length };
  }), null, 2));
}
