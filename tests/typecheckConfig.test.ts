import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import ts from 'typescript';
import { en } from '../src/i18n/en';
import { zh } from '../src/i18n/zh';

function shape(value: unknown): unknown {
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, shape(entry)]));
  return typeof value;
}

describe('strict build typechecking', () => {
  it('checks production TS before extension packaging and keeps strict mode enabled', () => {
    const manifest = JSON.parse(readFileSync('package.json', 'utf8'));
    expect(manifest.scripts.compile).toBe('npm run typecheck && node esbuild.js');
    expect(manifest.scripts.typecheck).toBe('tsc --noEmit');
    const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
    expect(parsed.options.strict).toBe(true);
    expect(parsed.fileNames).toContain('src/extension.ts');
    expect(parsed.fileNames).toContain('src/services/mcpSetupService.ts');
    expect(parsed.fileNames.some(file => file.includes('/fixtures/'))).toBe(false);
  });
  it('keeps Chinese and English translation keys and formatter types aligned', () => {
    expect(shape(zh)).toEqual(shape(en));
    expect(en.rag.viewIndexedDocuments.error('test')).toContain('test');
    expect(zh.rag.viewIndexedDocuments.error('测试')).toContain('测试');
  });
});
