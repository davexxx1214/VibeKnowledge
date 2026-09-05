import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const dir = path.dirname(fileURLToPath(import.meta.url));
const read = name => JSON.parse(fs.readFileSync(path.join(dir, name), 'utf8'));
const frozen = read('authors-freeze.json'), blind = read('blinding.json');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
if (fs.existsSync(path.join(dir, 'summary.json'))) throw new Error('Already finalized');
if (sha(path.join(dir, 'author-rubric.md')) !== frozen.rubricSha256 || sha(path.join(blind.blind, 'rubric.md')) !== frozen.rubricSha256) throw new Error('Rubric changed');
const grades = JSON.parse(fs.readFileSync(path.join(blind.blind, 'grades.json'), 'utf8'));
for (const record of blind.records) {
  if (sha(path.join(dir, 'authors', record.arm + '.json')) !== record.sha256 || sha(path.join(blind.blind, record.label + '.json')) !== record.sha256) throw new Error('Draft changed');
  for (const [file, hash] of Object.entries(frozen.arms[record.arm].hashes)) {
    if (sha(path.join(frozen.arms[record.arm].workspace, file)) !== hash) throw new Error('Author input changed');
    if (file !== 'authoring.md' && sha(path.join(blind.blind, 'source', file)) !== hash) throw new Error('Grader source changed');
  }
}
const texts = Object.fromEntries(Object.entries(frozen.mapping).map(([version, arm]) => [version, {
  guidance: fs.readFileSync(path.join(dir, 'authors', arm + '-guidance.md'), 'utf8'),
  draft: fs.readFileSync(path.join(dir, 'authors', arm + '.json'), 'utf8'),
}]));
const measured = spawnSync('python', ['-X', 'utf8', '-c', "import json,sys,tiktoken; d=json.load(sys.stdin); e=tiktoken.get_encoding('o200k_base'); print(json.dumps({a:{k:len(e.encode(v, disallowed_special=())) for k,v in ts.items()} for a,ts in d.items()}))"], { input: JSON.stringify(texts), encoding: 'utf8', windowsHide: true, timeout: 30000 });
if (measured.status !== 0) throw new Error(measured.stderr);
const textTokens = JSON.parse(measured.stdout);
const authors = Object.fromEntries(Object.entries(frozen.mapping).map(([version, arm]) => {
  const label = blind.mapping[arm], grade = grades.candidates[label];
  if (grade.items.length !== 8 || new Set(grade.items.map(i => i.id)).size !== 8 || grade.items.some(i => ![0, .5, 1].includes(i.score))) throw new Error('Invalid grade items');
  if (grade.items.reduce((n, i) => n + i.score, 0) !== grade.totals.score || grade.major_false_claims.length !== grade.totals.major_false_claim_count) throw new Error('Grade total mismatch');
  return [version, { arm, label, ...grade.totals, minorCorrections: grade.minor_corrections.length, textTokens: textTokens[version] }];
}));
fs.copyFileSync(path.join(blind.blind, 'grades.json'), path.join(dir, 'grades.json'));
fs.copyFileSync(path.join(blind.blind, 'grades.md'), path.join(dir, 'grades.md'));
const queries = read('comparison.json').pairs;
const methods = queries.filter(q => q.selector.includes('#'));
const total = side => methods.reduce((n, q) => n + q.textTokens[side], 0);
const summary = { at: new Date().toISOString(), authors, methods: { count: methods.length, beforeTextTokens: total('before'), afterTextTokens: total('after'), changePercent: 100 * (total('after') / total('before') - 1) }, fileControlIdentical: queries.filter(q => !q.selector.includes('#')).every(q => q.fileControlIdentical), packagedSkillParity: queries.every(q => q.packagedSkillParity), note: 'Targeted single-pair pilot with designed failure classes. Grader tie; no demonstrated authoring-quality gain. Fixed output text is not end-to-end agent usage. Guidance and draft tokens are standalone artifact sizes, not author model usage or billing.' };
fs.writeFileSync(path.join(dir, 'summary.json'), JSON.stringify(summary, null, 2) + '\n');
console.log(JSON.stringify(summary, null, 2));
