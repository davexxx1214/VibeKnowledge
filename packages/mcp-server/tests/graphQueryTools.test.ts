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
import { registerGraphQueryTools } from '../src/tools/registerGraphQueryTools.js';

describe('graph query MCP tools', () => {
  let workspaceRoot: string;
  let server: McpServer;
  let client: Client;

  beforeEach(async () => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'vibeknowledge-query-tools-'));
    const graph = new AgentGraphStore(workspaceRoot);
    mkdirSync(dirname(graph.filePath), { recursive: true });
    writeFileSync(graph.filePath, JSON.stringify(validGraph()), 'utf8');

    server = new McpServer({ name: 'test-server', version: '1.0.0' });
    registerGraphQueryTools(server, createDbStub(), graph, createLogger());
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

  it('registers all Phase 1 graph tools', async () => {
    const result = await client.listTools();

    expect(result.tools.map((tool) => tool.name)).toEqual([
      'query_graph',
      'get_entity',
      'get_neighbors',
      'shortest_path'
    ]);
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
