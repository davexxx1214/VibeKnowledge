import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync, readFileSync, readdirSync, rmSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { publishFeatureBrief, type FeatureBriefDraft } from '../src/feature-brief.mjs';
import { runQuery } from '../src/queryCli.js';
import { estimateTokenCount } from '../src/graphQuery.js';
import { registerTools } from '../src/tools/registerTools.js';
import type { GraphDatabase } from '../src/database.js';
import type { StructuralGraphDocument } from '../src/structuralGraphStore.js';

describe('feature-first MCP / existing Skill payload parity', () => {
  let workspace: string, client: Client, server: McpServer, card: FeatureBriefDraft;
  const text = (content: unknown): string => Array.isArray(content) ? content.map(item => item.type === 'text' ? item.text : '').join('\n') : '';
  const tools = ['find_features', 'get_feature_brief', 'get_task_context'];

  function structuralGraph(): StructuralGraphDocument {
    const graph: StructuralGraphDocument = {
      version: 1, generatedAt: '2026-09-05T00:00:00Z', scope: '.',
      extractor: { name: 'typescript-compiler-api', version: 2, typescriptVersion: '5.9.3' },
      files: [], entities: [], relations: [], diagnostics: [],
    };
    for (const name of ['help', 'request', 'app', 'help.test']) {
      const filePath = 'src/' + name + '.ts';
      const symbol = name.replace('.', '_');
      if (name !== 'help') writeFileSync(join(workspace, filePath), 'export const ' + symbol + ' = 1;\n');
      const source = readFileSync(join(workspace, filePath), 'utf8');
      graph.files.push({ filePath, language: 'typescript', contentHash: createHash('sha256').update(source).digest('hex') });
      graph.entities.push({ key: filePath + '#' + symbol, name: symbol, kind: 'variable', filePath, startLine: 1, endLine: 1 });
    }
    for (const [source, target] of [[0, 1], [2, 0], [3, 0]]) {
      graph.relations.push({
        source: graph.entities[source].key, target: graph.entities[target].key, verb: 'references',
        origin: 'ast', confidence: 'extracted', location: { filePath: graph.entities[source].filePath, startLine: 1, endLine: 1 },
      });
    }
    writeFileSync(join(workspace, '.vscode/.knowledge/structural-graph.json'), JSON.stringify(graph));
    return graph;
  }

  beforeEach(async () => {
    workspace = mkdtempSync(join(tmpdir(), 'feature-mcp-'));
    mkdirSync(join(workspace, 'src'));
    writeFileSync(join(workspace, 'src/help.ts'), 'export const help = "docs";\nshow(help);\n');
    const location = { filePath: 'src/help.ts', startLine: 1, endLine: 2 };
    card = { key: 'help-page', name: '帮助文档', summary: 'Help Center', keywords: ['help center', '/help'], entries: [location],
      limitations: ['Frontend source only; tests not run.'], facts: [
        { kind: 'capability', text: 'Displays help content.', certainty: 'observed', evidence: [location] },
        { kind: 'dependency', text: 'Uses the local help value.', certainty: 'observed', evidence: [location] },
        { kind: 'framework', text: 'TypeScript source.', certainty: 'observed', evidence: [location] },
        { kind: 'test', text: 'No test execution evidence in this brief.', certainty: 'observed', evidence: [location] },
        { kind: 'constraint', text: 'SOURCE_GUARD runtime rendering is not verified.', certainty: 'inferred', evidence: [location] },
      ] };
    publishFeatureBrief(workspace, card);
    // These entrypoints do not read RAG, SQLite or a curated graph.
    const db = { listAllEntities: vi.fn(() => { throw new Error('Database should not be used'); }) } as unknown as GraphDatabase;
    server = new McpServer({ name: 'feature-test', version: '1.0.0' });
    registerTools(server, db, null, { debug: vi.fn(), info: vi.fn(), error: vi.fn() }, undefined, undefined, workspace);
    client = new Client({ name: 'feature-client', version: '1.0.0' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await Promise.all([client.connect(a), server.connect(b)]);
  });
  afterEach(async () => {
    await Promise.allSettled([client.close(), server.close()]);
    rmSync(workspace, { recursive: true, force: true });
  });

  it('registers read-only tools without a graph, RAG or SQLite', async () => {
    const listed = await client.listTools();
    for (const name of tools) {
      expect(listed.tools.find(t => t.name === name)?.annotations).toMatchObject({ readOnlyHint: true, destructiveHint: false, openWorldHint: false });
    }
    const result = await client.callTool({ name: 'find_features', arguments: {} });
    expect(result.isError).not.toBe(true);
    expect(text(result.content)).toBe(await runQuery('features', { workspace }));
    expect(existsSync(join(workspace, '.vscode/.knowledge/graph.sqlite'))).toBe(false);
    expect(existsSync(join(workspace, '.vscode/.knowledge/agent-graph.json'))).toBe(false);
  });
  it.each(['help-page', '帮助文档', 'Help Center', '/help', 'no-matching-feature'])('matches existing Skill discovery for %s', async query => {
    const result = await client.callTool({ name: 'find_features', arguments: { query, tokenBudget: 300 } });
    expect(result.isError).not.toBe(true);
    expect(text(result.content)).toBe(await runQuery('features', { workspace, query, budget: 300 }));
    expect(estimateTokenCount(text(result.content))).toBeLessThanOrEqual(300);
  });
  it.each([undefined, 600, 1800])('matches the facet-balanced brief at budget %s', async tokenBudget => {
    const result = await client.callTool({ name: 'get_feature_brief', arguments: { feature: card.key, ...(tokenBudget ? { tokenBudget } : {}) } });
    expect(result.isError).not.toBe(true);
    const output = text(result.content);
    expect(output).toBe(await runQuery('brief', { workspace, feature: card.key, budget: tokenBudget }));
    expect(output).toContain('SOURCE_GUARD');
    expect(output).toContain('TEST [observed]');
    expect(estimateTokenCount(output)).toBeLessThanOrEqual(tokenBudget ?? 1800);
  });
  it('keeps omission warnings when brief facts exceed the budget', async () => {
    card.facts[3].text = '测试'.repeat(300);
    publishFeatureBrief(workspace, card);
    const result = await client.callTool({ name: 'get_feature_brief', arguments: { feature: card.key, tokenBudget: 600 } });
    const output = text(result.content);
    expect(output).toBe(await runQuery('brief', { workspace, feature: card.key, budget: 600 }));
    expect(output).toContain('Unshown fact kinds: test');
    expect(estimateTokenCount(output)).toBeLessThanOrEqual(600);
  });
  it('withholds changed-source facts identically', async () => {
    writeFileSync(join(workspace, 'src/help.ts'), 'changed source secret');
    const result = await client.callTool({ name: 'get_feature_brief', arguments: { feature: card.key } });
    const output = text(result.content);
    expect(output).toBe(await runQuery('brief', { workspace, feature: card.key }));
    expect(output).toContain('NOT CURRENT');
    expect(output).not.toContain('changed source secret');
    expect(output).not.toContain('SOURCE_GUARD');
  });
  it.each([
    {}, { mode: 'understand', depth: 1 }, { mode: 'change', depth: 2, snippets: true }, { tokenBudget: 400 },
  ])('matches task context, including dependencies, test candidates and limits: %j', async options => {
    structuralGraph();
    const result = await client.callTool({ name: 'get_task_context', arguments: { selector: 'src/help.ts', ...options } });
    const { tokenBudget, ...rest } = options;
    const output = text(result.content);
    expect(result.isError).not.toBe(true);
    expect(output).toBe(await runQuery('context', { workspace, selector: 'src/help.ts', budget: tokenBudget, ...rest }));
    expect(estimateTokenCount(output)).toBeLessThanOrEqual(tokenBudget ?? 1600);
    if (!tokenBudget) {
      expect(output).toContain('DEPENDENCY src/request.ts');
      expect(output).toContain('UPSTREAM src/app.ts');
      expect(output).toContain('TEST candidate src/help.test.ts');
    }
    if (rest.snippets) expect(output).toContain('SOURCE src/help.ts');
  });
  it('withholds stale task-context excerpts and keeps the server available', async () => {
    structuralGraph();
    writeFileSync(join(workspace, 'src/help.ts'), 'DO NOT RETURN stale lines');
    const result = await client.callTool({ name: 'get_task_context', arguments: { selector: 'help', snippets: true } });
    const output = text(result.content);
    expect(output).toBe(await runQuery('context', { workspace, selector: 'help', snippets: true }));
    expect(output).toContain('STALE');
    expect(output).not.toContain('SOURCE src/help.ts');
    expect(output).not.toContain('DO NOT RETURN');
  });
  it('exposes exact-symbol scope over MCP without widening to another same-file feature', async () => {
    const graph = structuralGraph();
    const unrelated = { ...graph.entities[0], key: 'src/help.ts#unrelated', name: 'unrelated' };
    graph.entities.push(unrelated);
    graph.relations.push({ source: unrelated.key, target: graph.entities[2].key, verb: 'calls', origin: 'ast', confidence: 'extracted', location: { filePath: 'src/help.ts', startLine: 1, endLine: 1 } });
    writeFileSync(join(workspace, '.vscode/.knowledge/structural-graph.json'), JSON.stringify(graph));
    const result = await client.callTool({ name: 'get_task_context', arguments: { selector: 'src/help.ts#help', depth: 1 } });
    const output = text(result.content);
    expect(result.isError).not.toBe(true);
    expect(output).toBe(await runQuery('context', { workspace, selector: 'src/help.ts#help', depth: 1 }));
    expect(output).toContain('symbol src/help.ts#help');
    expect(output).toContain('src/request.ts#request');
    expect(output).not.toContain('#unrelated');
  });
  it.each(['missing', 'invalid'])('returns an error for %s structure without generating files', async kind => {
    if (kind === 'invalid') writeFileSync(join(workspace, '.vscode/.knowledge/structural-graph.json'), '{"invalid":true}');
    const result = await client.callTool({ name: 'get_task_context', arguments: { selector: 'help' } });
    expect(result.isError).toBe(true);
    expect(existsSync(join(workspace, '.vscode/.knowledge/structural-graph.json'))).toBe(kind === 'invalid');
    expect((await client.listTools()).tools.some(t => t.name === 'get_task_context')).toBe(true);
  });
  it.each([
    ['find_features', { limit: 3 }], ['find_features', { query: '' }],
    ['get_feature_brief', { feature: '../escape' }], ['get_feature_brief', { feature: 'missing-card' }],
    ['get_feature_brief', { feature: 'help-page', tokenBudget: 599 }],
    ['get_feature_brief', { feature: 'help-page', query: 'help' }],
    ['get_feature_brief', { feature: 'help-page', focus: ['dependency'] }],
    ['get_feature_brief', { feature: 'help-page', facts: ['f-0000000000000000'] }],
    ['get_feature_brief', { feature: 'help-page', exclude: ['f-0000000000000000'] }],
    ['get_feature_brief', { feature: 'help-page', snippets: true }],
    ['get_task_context', { selector: 'help', depth: 0 }],
    ['get_task_context', { selector: 'help', depth: 7 }],
    ['get_task_context', { selector: 'help', tokenBudget: 399 }],
    ['get_task_context', { selector: 'help', mode: 'invalid' }],
    ['get_task_context', { selector: 'help', snippets: 'true' }],
  ])('rejects invalid or removed input for %s: %j', async (name, args) => {
    const result = await client.callTool({ name: String(name), arguments: args as Record<string, unknown> });
    expect(result.isError).toBe(true);
    expect((await client.listTools()).tools.some(t => t.name === name)).toBe(true);
  });
  it('pins workspace to server configuration and does not modify source or knowledge files', async () => {
    structuralGraph();
    const snapshot = () => Object.fromEntries(readdirSync(workspace, { recursive: true, withFileTypes: true })
      .filter(f => f.isFile()).map(f => { const path = join(f.parentPath, f.name); return [path, readFileSync(path).toString('base64')]; }));
    const before = snapshot();
    for (const [name, args] of [
      ['find_features', {}], ['get_feature_brief', { feature: card.key }], ['get_task_context', { selector: 'help', snippets: true }],
    ] as const) {
      expect((await client.callTool({ name, arguments: args })).isError).not.toBe(true);
      expect((await client.callTool({ name, arguments: { ...args, workspace: 'another-project' } })).isError).toBe(true);
    }
    expect(snapshot()).toEqual(before);
  });
});
