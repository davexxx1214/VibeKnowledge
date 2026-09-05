import { readFileSync, cpSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
const archive = resolve(process.argv[2]);
const { blind } = JSON.parse(readFileSync(join(archive, 'blinding.json'), 'utf8'));
for (const name of ['grade.json', 'grade.md']) {
  if (existsSync(join(archive, name))) throw new Error('Grade already archived');
  cpSync(join(blind, name), join(archive, name));
}
console.log('Archived independent grade: ' + archive);
