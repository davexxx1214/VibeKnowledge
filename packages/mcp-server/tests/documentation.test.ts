import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import stripJsonComments from 'strip-json-comments';

const usage = readFileSync(new URL('../../../MCP_USAGE.md', import.meta.url), 'utf8');
const examples = [...usage.matchAll(/```jsonc\s*\n([\s\S]*?)```/g)]
  .map(match => match[1])
  .filter(body => body.trimStart().startsWith('{'))
  .map(body => JSON.parse(stripJsonComments(body)));

describe('MCP setup documentation', () => {
  it('documents independent package install/build instead of undeclared npm workspaces', () => {
    const root = JSON.parse(readFileSync(new URL('../../../package.json', import.meta.url), 'utf8'));
    const mcp = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
    expect(root.workspaces).toBeUndefined();
    expect(mcp.scripts.build).toBeTruthy();
    expect(usage).toContain('npm --prefix packages/mcp-server ci');
    expect(usage).toContain('npm --prefix packages/mcp-server run build');
    expect(usage).not.toContain('npm run --workspace packages/mcp-server build');
  });

  it('provides distinct valid stdio configurations for Cursor and VS Code', () => {
    for (const key of ['mcpServers', 'servers']) {
      const configs = examples.filter(example => example[key]);
      expect(configs).toHaveLength(1);
      const server = configs[0][key].vibeknowledge;
      expect(server.type).toBe('stdio');
      expect(server.command).toBe('node');
      expect(server.args).toEqual([
        'D:/workspace/VibeKnowledge/packages/mcp-server/dist/index.js',
        '--workspace',
        'D:/workspace/nestjs-realworld-example-app'
      ]);
    }
    expect(examples.some(example => example.vibeknowledge)).toBe(false);
  });

  it('documents the standards-compatible relation tool', () => {
    expect(usage).toContain('tool list_relations');
    expect(usage).toContain('| Tool | `list_relations` |');
    expect(usage).not.toContain('knowledge://relations');
    expect(usage).toContain('MCP: Reset Cached Tools');
  });
});
