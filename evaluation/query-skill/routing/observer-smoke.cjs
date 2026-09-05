const { mkdtempSync, mkdirSync, cpSync, writeFileSync, readFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { spawnSync } = require('node:child_process');
const assert = require('node:assert/strict');
const dir = mkdtempSync(join(tmpdir(), 'routing-observer-'));
try {
  cpSync(resolve('evaluation/query-skill/routing/observe.cjs'), join(dir, 'observe.cjs'));
  mkdirSync(join(dir, '.evaluation')); mkdirSync(join(dir, 'web'));
  for (const phase of ['discovery', 'followup', 'control']) writeFileSync(join(dir, '.evaluation', phase + '.md'), phase);
  writeFileSync(join(dir, 'web/sample.ts'), 'const marker = 1;\n');
  const run = (...args) => spawnSync(process.execPath, ['observe.cjs', ...args], { cwd: dir, encoding: 'utf8', windowsHide: true });
  assert.equal(run('--phase', 'discovery', 'task').status, 0);
  assert.equal(run('--phase', 'followup', 'task').status, 1);
  writeFileSync(join(dir, 'REPORT.md'), '## discovery\nDone.\n');
  assert.equal(run('--phase', 'followup', 'task').status, 0);
  assert.equal(run('--phase', 'control', 'task').status, 1);
  writeFileSync(join(dir, 'REPORT.md'), '## discovery\nDone.\n## followup\nDone.\n');
  assert.equal(run('--phase', 'control', 'task').status, 0);
  assert.match(run('--phase', 'control', 'read', 'web/sample.ts', '1', '1').stdout, /1: const marker = 1/);
  assert.match(run('--phase', 'control', 'rg', '-n', 'marker').stdout, /marker/);
  assert.equal(run('--phase', 'control', 'query', 'features').status, 1);
  assert.equal(readFileSync(join(dir, 'ab-observations.jsonl'), 'utf8').trim().split('\n').length, 8);
  console.log('Observer smoke: 8 staged/read/search/failure assertions passed.');
} finally {
  // Only the exact mkdtemp-created test directory is removed.
  rmSync(dir, { recursive: true });
}
