import fs from 'node:fs';
import path from 'node:path';
import { createHash, randomInt } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { publishFeatureBrief } from '../../resources/skills/vibeknowledge-dependency-graph/scripts/feature-brief.mjs';
const dir = path.dirname(fileURLToPath(import.meta.url)), frozen = JSON.parse(fs.readFileSync(path.join(dir, 'authors-freeze.json'), 'utf8'));
const out = path.join(dir, 'blinding.json');
if (fs.existsSync(out)) throw new Error('Already blinded');
const sha = file => createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const blind = fs.mkdtempSync(path.join(frozen.run, 'blind-'));
const mapping = randomInt(2) ? { A: 'X', B: 'Y' } : { A: 'Y', B: 'X' };
const archive = path.join(dir, 'authors'); fs.mkdirSync(archive);
const records = [];
for (const arm of ['A', 'B']) {
  const { workspace, hashes } = frozen.arms[arm];
  for (const [file, expected] of Object.entries(hashes)) if (sha(path.join(workspace, file)) !== expected) throw new Error('Changed author input');
  const draftFile = path.join(workspace, 'draft.json'), text = fs.readFileSync(draftFile, 'utf8'), draft = JSON.parse(text);
  // Validation/publication happens after authors complete and in a new copy.
  const validation = path.join(frozen.run, 'validate-' + arm);
  fs.cpSync(path.join(dir, 'fixture'), validation, { recursive: true });
  publishFeatureBrief(validation, draft);
  fs.copyFileSync(draftFile, path.join(blind, mapping[arm] + '.json'));
  fs.copyFileSync(draftFile, path.join(archive, arm + '.json'));
  fs.copyFileSync(path.join(workspace, 'authoring.md'), path.join(archive, arm + '-guidance.md'));
  records.push({ arm, label: mapping[arm], sha256: sha(draftFile), facts: draft.facts.length, sourceInputsUnchanged: true, publicationValid: true });
}
fs.cpSync(path.join(dir, 'fixture'), path.join(blind, 'source'), { recursive: true });
fs.copyFileSync(path.join(dir, 'author-rubric.md'), path.join(blind, 'rubric.md'));
fs.writeFileSync(out, JSON.stringify({ createdAt: new Date().toISOString(), blind, mapping, records, draftChanges: 'None; identical bytes copied, no content redaction.' }, null, 2) + '\n');
console.log(JSON.stringify({ blind, draftsValid: true }));
