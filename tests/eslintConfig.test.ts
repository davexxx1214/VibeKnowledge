import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { ESLint } from 'eslint';
import { describe, expect, it } from 'vitest';

const eslint = new ESLint({ cwd: process.cwd() });

describe('ESLint 10 flat config migration', () => {
  it('uses the flat config without a legacy compatibility layer', async () => {
    expect(ESLint.version).toMatch(/^10\./);
    expect(existsSync('eslint.config.cjs')).toBe(true);
    expect(existsSync('.eslintrc.json')).toBe(false);
    const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(manifest.scripts.lint).toBe('eslint src');
    const config = await eslint.calculateConfigForFile('src/extension.ts');
    expect(config.rules['@typescript-eslint/no-explicit-any'][0]).toBe(1);
    expect(config.rules['@typescript-eslint/no-unused-vars'][0]).toBe(2);
    expect(config.rules['@typescript-eslint/naming-convention'][0]).toBe(1);
    expect(config.rules['no-unassigned-vars'][0]).toBe(2);
  });

  it('keeps declaration files, build output and intentionally broken fixtures excluded', async () => {
    for (const file of [
      'src/generated.d.ts',
      'src/services/structuralGraph/fixtures/nest-project/src/broken.ts',
      'dist/extension.js',
      '.vscode-test/lint.ts',
    ]) {
      expect(await eslint.isPathIgnored(path.resolve(file)), file).toBe(true);
    }
    expect(await eslint.isPathIgnored(path.resolve('src/extension.ts'))).toBe(false);
    expect(await eslint.isPathIgnored(path.resolve('src/services/musicGenerator/musicGeneratorService.test.ts'))).toBe(false);
  });

  it('still reports unsafe any as a warning and unused variables as errors', async () => {
    const [result] = await eslint.lintText(
      'export function identity(value: any) { const unused = 1; return value; }',
      { filePath: 'src/lint-regression.ts' },
    );
    expect(result.messages).toEqual(expect.arrayContaining([
      expect.objectContaining({ ruleId: '@typescript-eslint/no-explicit-any', severity: 1 }),
      expect.objectContaining({ ruleId: '@typescript-eslint/no-unused-vars', severity: 2 }),
    ]));
    expect(result.fatalErrorCount).toBe(0);
  });

  it('preserves ignored underscore arguments and caught errors', async () => {
    const [result] = await eslint.lintText(
      'export function identity(_unused: string) { try { return process.platform; } catch (_error) { return "unknown"; } }',
      { filePath: 'src/lint-regression.ts' },
    );
    expect(result.errorCount).toBe(0);
    expect(result.warningCount).toBe(0);
  });
});
