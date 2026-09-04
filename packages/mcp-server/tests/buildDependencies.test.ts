import { mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import ts from 'typescript';
import { checkBuildDependencies } from '../scripts/check-build-dependencies.mjs';

const directories: string[] = [];
afterEach(() => { for (const dir of directories.splice(0)) rmSync(dir, { recursive: true, force: true }); });

describe('MCP build preflight', () => {
  it('resolves the SDK bundled declarations with the local compiler', () => {
    expect(() => checkBuildDependencies(process.cwd())).not.toThrow();
  });
  it('detects a missing local compiler instead of falling back to an unrelated parent tsc', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-build-check-'));
    directories.push(dir);
    writeFileSync(join(dir, 'package.json'), '{}');
    expect(() => checkBuildDependencies(dir)).toThrow('local TypeScript is missing');
  });
  it('detects a missing SDK declaration before emitting cascading implicit-any errors', () => {
    const dir = mkdtempSync(join(tmpdir(), 'mcp-build-check-'));
    directories.push(dir);
    mkdirSync(join(dir, 'node_modules/typescript/lib'), { recursive: true });
    writeFileSync(join(dir, 'package.json'), '{}');
    writeFileSync(join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions: { module: 'NodeNext', moduleResolution: 'NodeNext' } }));
    writeFileSync(join(dir, 'node_modules/typescript/lib/typescript.js'), `module.exports = require(${JSON.stringify(resolve('node_modules/typescript/lib/typescript.js'))});`);
    expect(() => checkBuildDependencies(dir)).toThrow('cannot resolve declarations');
  });
  it('does not use any annotations or disable strict mode in MCP production sources', () => {
    const config = ts.readConfigFile('tsconfig.json', ts.sys.readFile);
    const parsed = ts.parseJsonConfigFileContent(config.config, ts.sys, '.');
    expect(parsed.options.strict).toBe(true);
    for (const file of parsed.fileNames) {
      const source = ts.createSourceFile(file, readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true);
      const check = (node: ts.Node) => {
        expect(node.kind, `${file}: untyped any annotation`).not.toBe(ts.SyntaxKind.AnyKeyword);
        ts.forEachChild(node, check);
      };
      check(source);
    }
  });
});
