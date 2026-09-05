// Post-run integrity check; only hashes/metadata are exported.
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const dir = dirname(fileURLToPath(import.meta.url)), root = resolve(dir, '../..');
const frozen = JSON.parse(readFileSync(join(dir, 'freeze.json'), 'utf8'));
const preflight = JSON.parse(readFileSync(join(dir, 'preflight-checks.json'), 'utf8'));
const out = join(dir, 'post-run-integrity.json');
if (existsSync(out)) throw new Error('Integrity already recorded');
const sha = file => createHash('sha256').update(readFileSync(file)).digest('hex');
function check(base, hashes) {
  return Object.entries(hashes).filter(([file, digest]) => !existsSync(join(base, file)) || sha(join(base, file)) !== digest).map(([file]) => file);
}
function inventory(base, prefix = '') {
  return readdirSync(base, { withFileTypes: true }).flatMap(e => e.isDirectory() ? inventory(join(base, e.name), prefix + e.name + '/') : [prefix + e.name]).sort();
}
const runtime = check(frozen.runtimeRoot, frozen.runtimeHashes);
const runtimeSource = check(join(frozen.runtimeRoot, 'src'), frozen.runtimeSourceHashes);
const dependencies = check(join(frozen.runtimeRoot, 'node_modules'), frozen.dependencyHashes);
const dependencyInventoryMatches = JSON.stringify(inventory(join(frozen.runtimeRoot, 'node_modules'))) === JSON.stringify(Object.keys(frozen.dependencyHashes).sort());
const harness = check(dir, preflight.harnessHashes), helpers = check(root, preflight.helperHashes);
const node = sha(frozen.environment.nodePath) === frozen.environment.nodeSha256;
const rg = sha(frozen.environment.rgPath) === frozen.environment.rgSha256;
const tokenizer = sha(preflight.tokenizer.executable) === preflight.tokenizer.executableSha256 && sha(preflight.tokenizer.module) === preflight.tokenizer.moduleSha256;
const dispatches = sha(join(dir, 'dispatches.json')) === frozen.dispatchesSha256;
const arms = [];
for (let pair = 1; pair <= 3; pair++) for (const arm of ['A', 'B']) {
  const workspace = join(frozen.run, 'pair-' + pair, arm);
  const hashes = { ...frozen.sourceHashes, ...(arm === 'B' ? frozen.bArtifacts : {}), 'observe.cjs': frozen.observerSha256, 'mcp-client.mjs': frozen.bridgeSha256 };
  const expected = [...Object.keys(hashes), 'REPORT.md', 'ab-observations.jsonl', ...(arm === 'B' ? ['mcp-eval.json'] : [])].sort();
  const changed = check(workspace, hashes), files = inventory(workspace);
  const inventoryMatches = JSON.stringify(files) === JSON.stringify(expected);
  const configMatches = arm === 'A' || JSON.stringify(JSON.parse(readFileSync(join(workspace, 'mcp-eval.json'), 'utf8'))) === JSON.stringify({ runtimeRoot: frozen.runtimeRoot });
  arms.push({ pair, arm, changed, files: files.length, inventoryMatches, configMatches });
}
const passed = ![...runtime, ...runtimeSource, ...dependencies, ...harness, ...helpers].length && dependencyInventoryMatches && node && rg && tokenizer && dispatches && arms.every(a => !a.changed.length && a.inventoryMatches && a.configMatches);
writeFileSync(out, JSON.stringify({ at: new Date().toISOString(), passed, runtime, runtimeSource, dependencies, dependencyInventoryMatches, harness, helpers, node, rg, tokenizer, dispatches, arms,
  limitation: 'Before/after identity and observed calls cannot exclude transient reverted modifications; this is not a security sandbox.' }, null, 2) + '\n');
console.log(JSON.stringify({ passed, changedFiles: [...runtime, ...runtimeSource, ...dependencies, ...harness, ...helpers], arms }));
if (!passed) process.exitCode = 1;
