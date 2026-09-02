import { copyFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const source = resolve(
  packageRoot,
  '..',
  '..',
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'canonicalize-entity-key.mjs'
);
const destination = resolve(packageRoot, 'dist', 'canonicalize-entity-key.mjs');

mkdirSync(dirname(destination), { recursive: true });
copyFileSync(source, destination);
