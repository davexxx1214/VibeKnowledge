import { readFileSync, writeFileSync, cpSync, existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { createHash, randomInt } from 'node:crypto';
const [runArg, archiveArg] = process.argv.slice(2);
if (!runArg || !archiveArg) throw new Error('Usage: PAIR_RUN ARCHIVE');
const run = resolve(runArg), archive = resolve(archiveArg);
if (existsSync(join(archive, 'grade-mapping.json'))) throw new Error('Already blinded');
mkdirSync(archive, { recursive: true });
const blind = mkdtempSync(resolve('.vscode-test/routing-blind-'));
const mapping = randomInt(2) ? { A: 'X', B: 'Y' } : { A: 'Y', B: 'X' };
const hash = text => createHash('sha256').update(text).digest('hex');
const records = [];
for (const arm of ['A', 'B']) {
  const original = readFileSync(join(run, arm, 'REPORT.md'), 'utf8');
  if (!['discovery', 'followup', 'control'].every(p => original.includes('## ' + p))) throw new Error('Incomplete staged report');
  // Do not remove prose: it might contain substantive claims. Neutralize only paths/arm labels.
  const text = original.split(join(run, arm)).join('<workspace>')
    .split(join(run, arm).replaceAll('\\', '/')).join('<workspace>')
    .replace(/\bArm [AB]\b/g, '[method label withheld]');
  const file = mapping[arm] + '.md'; writeFileSync(join(blind, file), text);
  records.push({ arm, file, rawSha256: hash(original), blindSha256: hash(text), changed: original !== text });
}
for (const file of ['rubric.json', 'rubric.md', 'tasks.md']) cpSync(join('evaluation/query-skill/routing', file), join(blind, file));
writeFileSync(join(archive, 'grade-mapping.json'), JSON.stringify(mapping, null, 2) + '\n');
writeFileSync(join(archive, 'blinding.json'), JSON.stringify({ createdAt: new Date().toISOString(), blind, records,
  redaction: 'Absolute trial workspace prefixes and literal Arm A/B labels only; no answer prose removed.' }, null, 2) + '\n');
console.log(JSON.stringify({ blind }));
