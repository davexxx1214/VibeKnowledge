const { readFileSync, mkdtempSync, cpSync, symlinkSync } = require('node:fs');
const { resolve, join } = require('node:path');
const { spawnSync } = require('node:child_process');

const run = resolve(process.argv[2] ?? '');
const manifest = JSON.parse(readFileSync(join(run, 'manifest.json'), 'utf8'));
if (!manifest.dependencies) throw new Error('The run manifest must identify the shared dependency directory.');
const grader = mkdtempSync(join(run, 'grader-'));
function setup(directory, arm) {
  for (const file of ['jest.ab.json', 'tsconfig.json', 'legacy-node26.cjs']) {
    cpSync(join(run, arm, file), join(directory, file));
  }
  symlinkSync(manifest.dependencies, join(directory, 'node_modules'), process.platform === 'win32' ? 'junction' : 'dir');
}
setup(grader, 'A');
cpSync(join(__dirname, 'acceptance.fixture.ts'), join(grader, 'acceptance.test.ts'));
function test(directory, output, extra = [], env = {}) {
  const child = spawnSync(process.execPath, [
    join(manifest.dependencies, 'jest/bin/jest.js'), '--config', join(directory, 'jest.ab.json'),
    '--runInBand', '--no-cache', '--json', '--outputFile', output, ...extra,
  ], {
    cwd: directory, env: { ...process.env, ...env }, encoding: 'utf8', windowsHide: true,
    timeout: 60000, maxBuffer: 4 * 1024 * 1024,
  });
  if (child.error) throw child.error;
  let result;
  try { result = JSON.parse(readFileSync(output, 'utf8')); }
  catch { throw new Error(child.stderr || child.stdout || 'Jest did not produce a report'); }
  if (result.numRuntimeErrorTestSuites || result.numTotalTests === 0) throw new Error(child.stderr);
  return result;
}
for (const arm of ['A', 'B']) {
  const acceptance = test(grader, join(run, `${arm}-acceptance.json`), ['--testRegex', 'acceptance[.]test[.]ts'], { AB_WORKSPACE: join(run, arm) });
  if (!acceptance.success || acceptance.numPassedTests !== 6) throw new Error(`Acceptance failed for ${arm}`);
  const mutant = mkdtempSync(join(run, `mutant-${arm}-`));
  setup(mutant, arm);
  cpSync(join(run, arm, 'src'), join(mutant, 'src'), { recursive: true });
  cpSync(join(manifest.snapshot, 'src/tag/tag.service.ts'), join(mutant, 'src/tag/tag.service.ts'));
  const mutation = test(mutant, join(run, `${arm}-mutation.json`));
  if (mutation.success || mutation.numFailedTests === 0) throw new Error(`Tests did not detect the reverted sorting behavior in ${arm}`);
  console.log(JSON.stringify({ arm, acceptancePassed: acceptance.numPassedTests, mutationDetected: true, mutationFailed: mutation.numFailedTests, mutationTotal: mutation.numTotalTests }));
}
