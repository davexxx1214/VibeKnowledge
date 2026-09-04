import { createRequire } from 'node:module';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
const { buildMcpRuntime } = require('../scripts/build-mcp-runtime.cjs');

describe('packaged MCP runtime', () => {
  it('builds portable JS and helpers without shipping node_modules or TypeScript sources', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'vibeknowledge-bundle-test-'));
    try {
      await buildMcpRuntime(process.cwd(), directory);
      const files = await readdir(directory);
      expect(files).toEqual(expect.arrayContaining(['dist', 'package.json', 'package-lock.json', '.npmrc', 'health-check.mjs', 'audit-dependencies.cjs']));
      expect(files).not.toContain('node_modules');
      expect(files).not.toContain('src');
      expect(await readFile(path.join(directory, 'package-lock.json'), 'utf8')).toBe(await readFile('packages/mcp-server/package-lock.json', 'utf8'));
      expect(await readFile(path.join(directory, 'dist', 'config.js'), 'utf8')).toContain('import packageJson from "../package.json"');
      expect(await readFile(path.join(directory, 'dist', 'structural-analysis.mjs'), 'utf8')).not.toContain('../../../resources');
      expect(await readFile(path.join(directory, 'dist', 'server.js'), 'utf8')).toContain('@modelcontextprotocol/sdk/server/mcp.js');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });

  it('bundles the JSONC parser ESM entry, with no unresolved UMD runtime imports', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'vibeknowledge-jsonc-bundle-test-'));
    try {
      const outfile = path.join(directory, 'setup.cjs');
      const alias = { 'jsonc-parser': require.resolve('jsonc-parser/lib/esm/main.js') };
      // Exercise the same alias used by the extension's esbuild config.
      expect(await readFile('esbuild.js', 'utf8')).toContain("alias: { 'jsonc-parser': require.resolve('jsonc-parser/lib/esm/main.js') }");
      await require('esbuild').build({ entryPoints: ['src/services/mcpSetupService.ts'], outfile, bundle: true, platform: 'node', format: 'cjs', alias });
      const { mergeMcpConfig } = require(outfile);
      expect(JSON.parse(mergeMcpConfig('{}', 'vscode', 'node', 'server.js', 'workspace')).servers.vibeknowledge.command).toBe('node');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
