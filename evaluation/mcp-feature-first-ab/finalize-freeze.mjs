import { readFileSync, writeFileSync, copyFileSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const directory = dirname(fileURLToPath(import.meta.url));
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
const freezeFile = join(directory, 'freeze.json');
const frozen = JSON.parse(readFileSync(freezeFile, 'utf8'));
if (frozen.preflightAmendment) throw new Error('Already finalized');
for (let pair = 1; pair <= 3; pair++) for (const arm of ['A', 'B']) {
  if (existsSync(join(frozen.run, 'pair-' + pair, arm, 'ab-observations.jsonl')) || existsSync(join(frozen.run, 'pair-' + pair, arm, 'REPORT.md'))) throw new Error('Candidates already ran');
}
copyFileSync(freezeFile, join(directory, 'freeze-initial-preflight.json'));
frozen.preflightAmendment = { at: new Date().toISOString(), beforeAnyCandidate: true, initial: 'freeze-initial-preflight.json',
  changes: ['Mandatory numeric usage and grade validation', 'Delivery and independent scope adjudication required for gate publication', 'No blind-prologue deletion'] };
frozen.harnessHashes = Object.fromEntries(readdirSync(directory).filter(f => /\.(?:mjs|cjs|md)$/.test(f)).map(f => [f, sha(join(directory, f))]));
const tasks = readFileSync(join(directory, 'tasks.md'), 'utf8').replace(/\r\n/g, '\n').trimEnd();
const records = [];
for (let pair = 1; pair <= 3; pair++) for (const arm of ['A', 'B']) {
  const workspace = frozen.run.replaceAll('\\', '/') + '/pair-' + pair + '/' + arm;
  records.push({ pair, arm, taskName: 'mcp_feature_pair' + pair + '_' + arm.toLowerCase(), forkTurns: 'none',
    message: 'You are Arm ' + arm + '. Your assigned workspace is ' + workspace + '. Use that exact workdir for all commands and write only ' + workspace + '/REPORT.md. The complete task follows; do not read any other task/evaluation file.\n\n' + tasks });
}
const dispatch = join(directory, 'dispatches.json');
if (existsSync(dispatch)) throw new Error('Dispatches already recorded');
writeFileSync(dispatch, JSON.stringify({ createdAt: new Date().toISOString(), note: 'Public plaintext prepared before launching; actual tool dispatch metadata and candidate sessions are audited separately.', records }, null, 2) + '\n');
frozen.dispatchesSha256 = sha(dispatch);
writeFileSync(freezeFile, JSON.stringify(frozen, null, 2) + '\n');
console.log(JSON.stringify({ run: frozen.run, candidateSha256: frozen.candidateSha256, dispatchesSha256: frozen.dispatchesSha256 }));
