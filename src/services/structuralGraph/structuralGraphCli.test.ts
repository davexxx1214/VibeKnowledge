import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { afterEach, describe, expect, it } from 'vitest';

const temporaryDirectories: string[] = [];
const fixtureRoot = resolve(
  process.cwd(),
  'src',
  'services',
  'structuralGraph',
  'fixtures',
  'nest-project'
);
const extractorPath = resolve(
  process.cwd(),
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'extract-structural-graph.mjs'
);
const validatorPath = resolve(
  process.cwd(),
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'validate-structural-graph.mjs'
);

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('structural graph command line tools', () => {
  it('extracts, validates, and detects stale source hashes', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-cli-'));
    temporaryDirectories.push(workspace);
    cpSync(fixtureRoot, workspace, { recursive: true });

    const extraction = run(extractorPath, ['--workspace', workspace]);
    const outputPath = join(
      workspace,
      '.vscode',
      '.knowledge',
      'structural-graph.json'
    );

    expect(extraction.status, extraction.stderr).toBe(0);
    expect(existsSync(outputPath)).toBe(true);
    expect(JSON.parse(readFileSync(outputPath, 'utf8')).version).toBe(1);

    const valid = run(validatorPath, [outputPath, workspace]);
    expect(valid.status, valid.stderr).toBe(0);
    expect(valid.stdout).toContain('Valid structural graph');

    appendFileSync(join(workspace, 'src', 'contracts.ts'), '\n// changed\n');
    const stale = run(validatorPath, [outputPath, workspace]);
    expect(stale.status).toBe(1);
    expect(stale.stderr).toContain('contentHash does not match current source');

    const indexPath = join(
      workspace,
      '.vscode',
      '.knowledge',
      'cache',
      'structural',
      'index.json'
    );
    writeFileSync(indexPath, '{broken', 'utf8');
    const protectedUpdate = run(extractorPath, ['--workspace', workspace]);
    expect(protectedUpdate.status).toBe(1);
    expect(protectedUpdate.stderr).toContain('Re-run with --force');

    const forcedUpdate = run(extractorPath, [
      '--workspace',
      workspace,
      '--force',
    ]);
    expect(forcedUpdate.status, forcedUpdate.stderr).toBe(0);
    expect(forcedUpdate.stdout).toContain('(rebuild)');
  });
});

function run(scriptPath: string, args: string[]) {
  return spawnSync(process.execPath, [scriptPath, ...args], {
    encoding: 'utf8',
  });
}
