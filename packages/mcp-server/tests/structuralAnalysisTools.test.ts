import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import type { Logger } from '../src/server.js';
import { StructuralGraphStore } from '../src/structuralGraphStore.js';
import { registerStructuralAnalysisTools, withinBudget } from '../src/tools/registerStructuralAnalysisTools.js';
import { runQuery } from '../src/queryCli.js';
import { estimateTokenCount } from '../src/graphQuery.js';

describe('structural analysis MCP tools', () => {
  let workspaceRoot: string;
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'vibeknowledge-structural-tools-'));
    const store = new StructuralGraphStore(workspaceRoot);
    mkdirSync(dirname(store.filePath), { recursive: true });
    writeFileSync(store.filePath, JSON.stringify(graph('2026-09-03T01:00:00.000Z')), 'utf8');
    const previous = graph('2026-09-03T00:00:00.000Z');
    previous.entities.pop();
    previous.relations = previous.relations.slice(0, 2);
    writeFileSync(store.previousFilePath, JSON.stringify(previous), 'utf8');

    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerStructuralAnalysisTools(server, store, logger());
    client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport),
    ]);
  });

  afterEach(async () => {
    await Promise.allSettled([client.close(), server.close()]);
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('registers Phase 6 diagnostic tools', async () => {
    const result = await client.listTools();
    expect(result.tools.map((tool) => tool.name)).toEqual([
      'analyze_structure',
      'analyze_impact',
      'find_structural_path',
    ]);
  });

  it.each(['cycles', 'coupling', 'cross_boundary', 'diff', 'communities'])('keeps CLI/MCP %s output identical', async (analysis) => {
    const response = await client.callTool({ name: 'analyze_structure', arguments: { analysis, tokenBudget: 500 } });
    expect(response.isError).not.toBe(true);
    const cli = await runQuery('structure', { workspace: workspaceRoot, analysis, budget: '500' });
    expect(cli).toBe(text(response.content));
  });

  it('reserves truncation tokens, including when the first line is too large', () => {
    for (const lines of [['x'.repeat(2000)], ['header', 'x'.repeat(2000)], Array.from({ length: 100 }, () => 'some relationship')]) {
      const output = withinBudget(lines, 200);
      expect(output).toContain('truncated');
      expect(estimateTokenCount(output)).toBeLessThanOrEqual(200);
    }
    expect(withinBudget(['short', 'complete'], 200)).toBe('short\ncomplete');
  });

  it('reports cycles, code locations, and snapshot diffs', async () => {
    const cycles = await client.callTool({
      name: 'analyze_structure',
      arguments: { analysis: 'cycles', tokenBudget: 500 },
    });
    expect(text(cycles.content)).toContain('cycle-1');
    expect(text(cycles.content)).toContain('src/a/a.ts:4-4');

    const diff = await client.callTool({
      name: 'analyze_structure',
      arguments: { analysis: 'diff' },
    });
    expect(text(diff.content)).toContain('entities +1');
    expect(text(diff.content)).toContain('relations +1');
  });

  it('returns bounded impact and cross-module structural paths', async () => {
    const impact = await client.callTool({
      name: 'analyze_impact',
      arguments: { selector: 'A', direction: 'upstream', maxDepth: 2 },
    });
    expect(text(impact.content)).toContain('Consumer');
    expect(text(impact.content)).toContain('src/consumer/consumer.ts:8-8');

    const path = await client.callTool({
      name: 'find_structural_path',
      arguments: { source: 'Consumer', target: 'B', direction: 'outgoing' },
    });
    expect(text(path.content)).toContain('1. src/consumer/consumer.ts#Consumer --calls--> src/a/a.ts#A');
    expect(text(path.content)).toContain('2. src/a/a.ts#A --calls--> src/b/b.ts#B');
  });
});

function text(content: unknown): string {
  return Array.isArray(content)
    ? content
        .filter((item): item is { type: 'text'; text: string } =>
          typeof item === 'object' && item !== null &&
          'type' in item && item.type === 'text' &&
          'text' in item && typeof item.text === 'string'
        )
        .map((item) => item.text)
        .join('\n')
    : '';
}

function logger(): Logger {
  return { debug: vi.fn(), info: vi.fn(), error: vi.fn() };
}

function graph(generatedAt: string): any {
  return {
    version: 1,
    generatedAt,
    scope: '.',
    extractor: {
      name: 'typescript-compiler-api',
      version: 1,
      typescriptVersion: '5.9.2',
    },
    files: [
      'src/a/a.ts',
      'src/b/b.ts',
      'src/consumer/consumer.ts',
    ].map((filePath) => ({
      filePath,
      language: 'typescript',
      contentHash: `hash-${filePath}`,
    })),
    entities: [
      entity('src/a/a.ts#A', 'A', 'src/a/a.ts'),
      entity('src/b/b.ts#B', 'B', 'src/b/b.ts'),
      entity('src/consumer/consumer.ts#Consumer', 'Consumer', 'src/consumer/consumer.ts'),
    ],
    relations: [
      relation('src/a/a.ts#A', 'src/b/b.ts#B', 'src/a/a.ts', 4),
      relation('src/b/b.ts#B', 'src/a/a.ts#A', 'src/b/b.ts', 5),
      relation('src/consumer/consumer.ts#Consumer', 'src/a/a.ts#A', 'src/consumer/consumer.ts', 8),
    ],
    diagnostics: [],
  };
}

function entity(key: string, name: string, filePath: string) {
  return { key, name, kind: 'class', filePath, startLine: 1, endLine: 10 };
}

function relation(source: string, target: string, filePath: string, line: number) {
  return {
    source,
    target,
    verb: 'calls',
    origin: 'resolver',
    confidence: 'extracted',
    location: { filePath, startLine: line, endLine: line },
  };
}
