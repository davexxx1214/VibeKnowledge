import { afterEach, describe, expect, it } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const validatorPath = resolve(
  process.cwd(),
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'validate-graph.mjs'
);
const tempDirs: string[] = [];

function createFixture() {
  const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-skill-validator-'));
  tempDirs.push(workspace);
  mkdirSync(join(workspace, 'src'), { recursive: true });
  mkdirSync(join(workspace, '.vscode', '.knowledge'), { recursive: true });
  writeFileSync(join(workspace, 'src', 'a.ts'), 'one\ntwo\nthree\n', 'utf8');
  writeFileSync(join(workspace, 'src', 'b.ts'), 'export const b = 1;\n', 'utf8');
  return {
    workspace,
    graphPath: join(workspace, '.vscode', '.knowledge', 'agent-graph.json'),
  };
}

function graphWithEvidence(evidence: Array<Record<string, unknown>>) {
  return {
    version: 1,
    generatedAt: '2026-08-21T12:00:00.000Z',
    scope: '.',
    entities: [
      {
        key: 'src/a.ts#A',
        name: 'A',
        type: 'function',
        filePath: 'src/a.ts',
        startLine: 1,
        endLine: 3,
      },
      {
        key: 'src/b.ts#B',
        name: 'B',
        type: 'variable',
        filePath: 'src/b.ts',
        startLine: 1,
        endLine: 1,
      },
    ],
    relations: [
      {
        source: 'src/a.ts#A',
        target: 'src/b.ts#B',
        verb: 'calls',
        evidence,
      },
    ],
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('dependency graph skill validator', () => {
  it('accepts evidence that points inside an existing workspace file', () => {
    const fixture = createFixture();
    writeFileSync(
      fixture.graphPath,
      `\uFEFF${JSON.stringify(
        graphWithEvidence([{ filePath: 'src/a.ts', startLine: 2, endLine: 3 }])
      )}`,
      'utf8'
    );

    const result = spawnSync(process.execPath, [validatorPath, fixture.graphPath], {
      cwd: fixture.workspace,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('Valid Agent Graph: 2 entities, 1 relations');
  });

  it('rejects missing evidence files and out-of-range lines', () => {
    const fixture = createFixture();
    writeFileSync(
      fixture.graphPath,
      JSON.stringify(
        graphWithEvidence([
          { filePath: 'src/missing.ts', startLine: 1 },
          { filePath: 'src/a.ts', startLine: 99 },
        ])
      ),
      'utf8'
    );

    const result = spawnSync(process.execPath, [validatorPath, fixture.graphPath], {
      cwd: fixture.workspace,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not exist in the workspace');
    expect(result.stderr).toContain('but the file has 4 lines');
  });
});
