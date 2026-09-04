import { readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import { publishFeatureBrief } from './feature-brief.mjs';

try {
  const { values } = parseArgs({ options: { workspace: { type: 'string', default: '.' }, input: { type: 'string' } }, strict: true });
  if (!values.input) throw new Error('Usage: node publish-feature-brief.mjs --workspace PROJECT --input REVIEWED-DRAFT.json');
  const input = resolve(values.workspace, values.input), info = statSync(input);
  if (!info.isFile() || info.size > 8 * 1024 * 1024) throw new Error('Draft must be a regular UTF-8 JSON file <= 8 MiB.');
  const draft = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readFileSync(input)));
  const card = publishFeatureBrief(values.workspace, draft);
  console.log(`Published ${card.key}: ${card.facts.length} facts; ${card.sources.length} source fingerprints. Prose meaning requires semantic review; path/hash checks are not proof of correctness.`);
} catch (error) { console.error(error.message); process.exitCode = 1; }
