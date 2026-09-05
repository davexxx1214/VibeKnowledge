import { readFileSync, writeFileSync, cpSync, existsSync, mkdtempSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash, randomInt } from 'node:crypto';
const [runArg, archiveArg, mode] = process.argv.slice(2);
if (!runArg || !archiveArg) throw new Error('Usage: PAIR_RUN ARCHIVE');
const run = resolve(runArg), archive = resolve(archiveArg);
if (existsSync(join(archive, 'grade-mapping.json')) && mode !== '--reblind') throw new Error('Mapping already frozen');
mkdirSync(archive, { recursive: true });
const blind = mkdtempSync(resolve('.vscode-test/mcp-feature-first-blind-'));
const mapping = mode === '--reblind' ? JSON.parse(readFileSync(join(archive, 'grade-mapping.json'), 'utf8')) : randomInt(2) ? { A: 'X', B: 'Y' } : { A: 'Y', B: 'X' };
const records = [];
for (const arm of ['A', 'B']) {
  const original = readFileSync(join(run, arm, 'REPORT.md'), 'utf8');
  // Remove only trial-path/method labels, never change implementation content.
  const text = original.split(join(run, arm)).join('<workspace>')
    .split(join(run, arm).replaceAll('\\', '/')).join('<workspace>')
    .replace(/\bArm [AB]\b/gi, '[method label withheld]')
    ;
  const name = `${mapping[arm]}.md`;
  writeFileSync(join(blind, name), text);
  records.push({ arm, file: name, rawSha256: createHash('sha256').update(original).digest('hex'), blindSha256: createHash('sha256').update(text).digest('hex'), changed: original !== text });
}
cpSync('evaluation/mcp-feature-first-ab/rubric.md', join(blind, 'rubric.md'));
// Method-free source/scoring interpretation notes only.
writeFileSync(join(blind, 'notes.md'), `Use the original 0/0.5/1 non-exhaustive rubric. Score causal content and traceable evidence, not length or claimed method. The source is the retained task-context snapshot with 0.4.0 package manifests. Panel reveal differs from disposal/new document. Geometry finite checks concern node x/y. Service writer returns a path, UI command is void. I.C7 locale-aware parenthetic is imprecise: getLocale returns full locale codes while the writer compares zh; score shared builder and sequential write contract, and record any independently false locale claim. Do not require every incidental example to award full credit. Do not read metrics, observations, mapping or other candidates.\n`);
if (mode !== '--reblind') writeFileSync(join(archive, 'grade-mapping.json'), JSON.stringify(mapping, null, 2) + '\n');
const recordPath = join(archive, mode === '--reblind' ? 'blinding-v2.json' : 'blinding.json');
if (existsSync(recordPath)) throw new Error('Blinding record exists');
writeFileSync(recordPath, JSON.stringify({ createdAt: new Date().toISOString(), blind, records, redaction: 'Only absolute trial workspace prefixes and explicit Arm A/B labels. No prologue or substantive prose is removed; all implementation content remains. Any residual method clues are a blinding limitation, not permission to discard an answer.' }, null, 2) + '\n');
console.log(JSON.stringify({ blind }));
