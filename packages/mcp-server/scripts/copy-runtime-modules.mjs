import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const skillScripts = resolve(
  packageRoot,
  '..',
  '..',
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts'
);

for (const fileName of [
  'canonicalize-entity-key.mjs',
  'canonicalize-entity-key.d.mts',
  'structural-analysis.mjs',
  'structural-analysis.d.mts',
  'structural-extractor.d.mts'
]) {
  const destination = resolve(packageRoot, 'dist', fileName);
  mkdirSync(dirname(destination), { recursive: true });
  copyFileSync(resolve(skillScripts, fileName), destination);
}
