import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const readText = (path: string): string => readFileSync(resolve(path), 'utf8');

describe('Node runtime configuration', () => {
  it('pins the project default to the company Node version', () => {
    expect(readText('.nvmrc').trim()).toBe('26.1.0');
  });

  it.each(['.', 'packages/mcp-server'])(
    'keeps %s manifest and lockfile engines aligned while allowing newer Node 26 versions',
    (directory) => {
      const manifest = JSON.parse(readText(`${directory}/package.json`));
      const lock = JSON.parse(readText(`${directory}/package-lock.json`));
      expect(manifest.engines.node).toBe('>=26.1.0 <27');
      expect(lock.packages[''].engines).toEqual(manifest.engines);
    }
  );

  it('makes both CI setups read the shared pin without a competing version override', () => {
    const workflow = readText('.github/workflows/ci.yml');
    const setups = workflow.split(/^\s+- uses: actions\/setup-node@/m).slice(1)
      .map(block => block.split(/^\s+- (?:name:|run:|uses:)/m)[0]);
    expect(setups).toHaveLength(2);
    for (const setup of setups) {
      expect(setup).toMatch(/^\s+node-version-file: \.nvmrc\s*$/m);
      expect(setup).not.toMatch(/^\s+node-version:/m);
    }
  });

  it('preserves the VS Code extension-host compatibility declaration', () => {
    const manifest = JSON.parse(readText('package.json'));
    expect(manifest.engines.vscode).toBe('^1.80.0');
  });
});
