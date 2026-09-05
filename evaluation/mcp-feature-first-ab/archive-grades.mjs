import { readFileSync, copyFileSync, existsSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const dir = dirname(fileURLToPath(import.meta.url));
const pair = Number(process.argv[2]);
if (![1, 2, 3].includes(pair)) throw new Error('Expected pair 1, 2 or 3');
const folder = join(dir, 'pair-' + pair), blinding = JSON.parse(readFileSync(join(folder, 'blinding.json'), 'utf8'));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
if (existsSync(join(folder, 'grades.json'))) throw new Error('Already archived');
for (const record of blinding.records) {
  if (sha(join(blinding.blind, record.file)) !== record.blindSha256) throw new Error('Anonymous answer changed');
}
const files = ['grades.md', 'grades.json', 'X.md', 'Y.md', 'notes.md', 'rubric.md'];
const sourceHashes = Object.fromEntries(files.map(f => [f, sha(join(blinding.blind, f))]));
for (const file of files) copyFileSync(join(blinding.blind, file), join(folder, file));
writeFileSync(join(folder, 'grade-artifacts.json'), JSON.stringify({ at: new Date().toISOString(), source: blinding.blind, sourceHashes }, null, 2) + '\n');
const grades = JSON.parse(readFileSync(join(folder, 'grades.json'), 'utf8'));
console.log(JSON.stringify({ pair, totals: Object.fromEntries(['X', 'Y'].map(k => [k, grades.candidates[k].totals])) }));
