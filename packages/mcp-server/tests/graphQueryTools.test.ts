import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi
} from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { AgentGraphStore } from '../src/agentGraphStore.js';
import type { GraphDatabase } from '../src/database.js';
import type { Logger } from '../src/server.js';
import { registerTools } from '../src/tools/registerTools.js';
import { StructuralGraphStore } from '../src/structuralGraphStore.js';
import { registerBaseResources } from '../src/resources/registerResources.js';

describe('graph query MCP tools', () => {
  let workspaceRoot: string;
  let graph: AgentGraphStore;
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'vibeknowledge-query-tools-'));
    graph = new AgentGraphStore(workspaceRoot);
    mkdirSync(dirname(graph.filePath), { recursive: true });
    writeFileSync(graph.filePath, JSON.stringify(validGraph()), 'utf8');

    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    const db = createDbStub();
    registerTools(server, db, null, createLogger(), graph, new StructuralGraphStore(workspaceRoot));
    registerBaseResources(server, db, graph);
    client = new Client({ name: 'test-client', version: '1.0.0' });
    const [clientTransport, serverTransport] =
      InMemoryTransport.createLinkedPair();
    await Promise.all([
      server.connect(serverTransport),
      client.connect(clientTransport)
    ]);
  });

  afterEach(async () => {
    await Promise.allSettled([client.close(), server.close()]);
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('registers all graph tools with client-compatible names', async () => {
    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toEqual([
      'search_entities',
      'search_observations',
      'list_relations',
      'query_graph',
      'get_entity',
      'get_neighbors',
      'shortest_path',
      'analyze_structure',
      'analyze_impact',
      'find_structural_path'
    ]);
    expect(result.tools.every(tool => /^[A-Za-z0-9_.-]{1,128}$/.test(tool.name))).toBe(true);
    expect(result.tools.some(tool => tool.name === 'knowledge://relations')).toBe(false);
  });

  it('keeps resource URIs separate from tool names', async () => {
    const result = await client.readResource({ uri: 'knowledge://overview' });
    expect(JSON.parse(result.contents[0].text as string)).toMatchObject({
      entityCount: 3,
      relationCount: 2
    });
  });

  it('calls list_relations with filters and returns graph evidence', async () => {
    const result = await client.callTool({
      name: 'list_relations',
      arguments: { verb: 'depends_on', source: 'UserService', target: 'AuthService', limit: 1 }
    });
    expect(result.isError).not.toBe(true);
    const text = getText(result.content);
    expect(text).toContain('UserService [service] --depends_on--> AuthService [service]');
    expect(text).toContain('Evidence: src/user.ts:10-10');
    expect(text).not.toContain('Logger');
  });

  it('uses the new tool name in errors without crashing the protocol', async () => {
    vi.spyOn(graph, 'searchRelations').mockImplementationOnce(() => { throw new Error('read failed'); });
    const result = await client.callTool({ name: 'list_relations', arguments: {} });
    expect(result.isError).toBe(true);
    expect(getText(result.content)).toContain('list_relations 执行失败');
    expect((await client.listTools()).tools.length).toBe(10);
  });

  it('queries a compact subgraph without Evidence by default', async () => {
    const result = await client.callTool({
      name: 'query_graph',
      arguments: {
        query: 'user service',
        groupKey: 'framework',
        tokenBudget: 400
      }
    });
    const text = getText(result.content);

    expect(text).toContain('UserService');
    expect(text).toContain('AuthService');
    expect(text).not.toContain('Evidence:');
  });

  it('returns Evidence only when explicitly requested', async () => {
    const result = await client.callTool({
      name: 'get_neighbors',
      arguments: {
        selector: 'UserService',
        includeEvidence: true
      }
    });

    expect(getText(result.content)).toContain('Evidence:');
  });

  it('applies human description overrides to graph query output', async () => {
    const result = await client.callTool({
      name: 'get_entity',
      arguments: { selector: 'UserService' }
    });

    expect(getText(result.content)).toContain(
      'Human-maintained user description'
    );
  });

  it('exposes shortest paths through the MCP protocol', async () => {
    const result = await client.callTool({
      name: 'shortest_path',
      arguments: {
        source: 'UserService',
        target: 'Logger',
        direction: 'outgoing'
      }
    });
    const text = getText(result.content);

    expect(text).toContain('UserService <user>');
    expect(text).toContain('--depends_on-->');
    expect(text).toContain('--calls-->');
    expect(text).toContain('Logger <logger>');
  });
});

function getText(content: unknown): string {
  if (!Array.isArray(content)) {
    return '';
  }
  return content
    .filter(
      (item): item is { type: 'text'; text: string } =>
        typeof item === 'object' &&
        item !== null &&
        'type' in item &&
        item.type === 'text' &&
        'text' in item &&
        typeof item.text === 'string'
    )
    .map((item) => item.text)
    .join('\n');
}

function createDbStub(): GraphDatabase {
  return {
    listAllEntities: vi.fn(() => []),
    getAgentEntityDescriptionOverrides: vi.fn(
      () => new Map([['user', 'Human-maintained user description']])
    )
  } as unknown as GraphDatabase;
}

function createLogger(): Logger {
  return {
    debug: vi.fn(),
    info: vi.fn(),
    error: vi.fn()
  };
}

function validGraph(): Record<string, unknown> {
  return {
    version: 1,
    generatedAt: '2026-09-02T00:00:00.000Z',
    groups: [
      {
        key: 'framework',
        name: 'Framework',
        kind: 'framework',
        order: 0,
        entities: [
          {
            key: 'user',
            name: 'UserService',
            type: 'service',
            filePath: 'src/user.ts',
            startLine: 1,
            endLine: 40,
            description: 'Generated description'
          },
          {
            key: 'auth',
            name: 'AuthService',
            type: 'service',
            filePath: 'src/auth.ts',
            startLine: 1,
            endLine: 30
          },
          {
            key: 'logger',
            name: 'Logger',
            type: 'service',
            filePath: 'src/logger.ts',
            startLine: 1,
            endLine: 20
          }
        ],
        relations: [
          {
            source: 'user',
            target: 'auth',
            verb: 'depends_on',
            origin: 'agent',
            confidence: 'review_required',
            evidence: [
              {
                filePath: 'src/user.ts',
                startLine: 10,
                detail: 'UserService injects AuthService'
              }
            ]
          },
          {
            source: 'auth',
            target: 'logger',
            verb: 'calls',
            origin: 'agent',
            confidence: 'review_required',
            evidence: [
              {
                filePath: 'src/auth.ts',
                startLine: 20,
                detail: 'AuthService records failures'
              }
            ]
          }
        ]
      }
    ]
  };
}
