import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import type {
  EntityRecord,
  GraphDatabase,
  RelationRecord
} from '../src/database.js';
import { AgentGraphStore } from '../src/agentGraphStore.js';
import {
  getMergedOverview,
  searchMergedEntities,
  searchMergedRelations
} from '../src/mergedGraph.js';
import {
  formatEntityResults,
  formatRelationResults
} from '../src/tools/registerTools.js';

describe('merged graph queries', () => {
  let workspaceRoot: string;
  let agentGraph: AgentGraphStore;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'vibeknowledge-merged-'));
    agentGraph = new AgentGraphStore(workspaceRoot);
    mkdirSync(dirname(agentGraph.filePath), { recursive: true });
    writeFileSync(
      agentGraph.filePath,
      JSON.stringify({
        version: 1,
        generatedAt: '2026-08-21T01:02:03.000Z',
        entities: [
          {
            key: 'agent-user',
            name: 'UserService',
            type: 'service',
            filePath: 'src/user.ts',
            startLine: 2,
            endLine: 70
          },
          {
            key: 'agent-auth',
            name: 'AuthService',
            type: 'service',
            filePath: 'src/auth.ts',
            startLine: 1,
            endLine: 50
          },
          {
            key: 'agent-logger',
            name: 'Logger',
            type: 'function',
            filePath: 'src/logger.ts',
            startLine: 1,
            endLine: 10
          }
        ],
        relations: [
          {
            source: 'agent-user',
            target: 'agent-auth',
            verb: 'uses',
            evidence: [{ filePath: 'src/user.ts', startLine: 10 }]
          },
          {
            source: 'agent-auth',
            target: 'agent-logger',
            verb: 'calls',
            evidence: [{ filePath: 'src/auth.ts', startLine: 20 }]
          }
        ]
      }),
      'utf8'
    );
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('merges entities with manual records taking precedence', () => {
    const db = createDbStub();
    const results = searchMergedEntities(db, agentGraph, { limit: 100 });

    expect(results.map(({ name }) => name)).toEqual([
      'UserService',
      'ManualOnly',
      'AuthService',
      'Logger'
    ]);
    expect(results[0].source).toBe('manual');
    expect(results.filter(({ name }) => name === 'UserService')).toHaveLength(1);
  });

  it('merges relations with manual records taking precedence', () => {
    const db = createDbStub();
    const results = searchMergedRelations(db, agentGraph, { limit: 100 });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ verb: 'uses', source: 'manual' });
    expect(results[1]).toMatchObject({ verb: 'calls', source: 'agent' });
  });

  it('reserves room for Agent matches in bounded merged queries', () => {
    const db = createDbStub();
    const manualResults = Array.from({ length: 25 }, (_, index) => ({
      id: `manual-${index}`,
      name: `Manual${index}`,
      type: 'class',
      filePath: `src/manual-${index}.ts`,
      startLine: 1,
      endLine: 2,
      description: null,
      metadata: null,
      createdAt: 1,
      updatedAt: 2
    }));
    vi.mocked(db.searchEntities).mockReturnValue(manualResults);

    const results = searchMergedEntities(db, agentGraph, { limit: 20 });

    expect(results).toHaveLength(20);
    expect(results.some(({ source }) => source === 'manual')).toBe(true);
    expect(results.some(({ source }) => source === 'agent')).toBe(true);
  });

  it('labels manual and Agent sources in formatted MCP output', () => {
    const db = createDbStub();
    const entities = searchMergedEntities(db, agentGraph, { limit: 100 });
    const relations = searchMergedRelations(db, agentGraph, { limit: 100 });

    expect(formatEntityResults(entities)).toContain(
      '来源：manual (graph.sqlite)'
    );
    expect(formatEntityResults(entities)).toContain(
      '来源：agent (.vscode/.knowledge/agent-graph.json)'
    );
    expect(formatRelationResults(relations)).toContain(
      'Data Source: manual (graph.sqlite)'
    );
    expect(formatRelationResults(relations)).toContain(
      'Data Source: agent (.vscode/.knowledge/agent-graph.json)'
    );
  });

  it('merges overview totals and reports a source breakdown', () => {
    const overview = getMergedOverview(createDbStub(), agentGraph);

    expect(overview).toMatchObject({
      entityCount: 4,
      relationCount: 2,
      observationCount: 4,
      lastUpdatedAt: '2026-08-21T01:02:03.000Z',
      sources: {
        manual: { entityCount: 2, relationCount: 1 },
        agent: { entityCount: 3, relationCount: 2 }
      }
    });
  });
});

function createDbStub(): GraphDatabase {
  const manualEntities: EntityRecord[] = [
    {
      id: 'manual-user',
      name: 'UserService',
      type: 'class',
      filePath: 'src/user.ts',
      startLine: 1,
      endLine: 80,
      description: 'manual description wins',
      metadata: null,
      createdAt: 1,
      updatedAt: 2
    },
    {
      id: 'manual-only',
      name: 'ManualOnly',
      type: 'class',
      filePath: 'src/manual.ts',
      startLine: 1,
      endLine: 20,
      description: null,
      metadata: null,
      createdAt: 1,
      updatedAt: 2
    }
  ];
  const manualRelations: RelationRecord[] = [
    {
      id: 'manual-relation',
      verb: 'uses',
      createdAt: 2,
      sourceEntityId: 'manual-user',
      sourceName: 'UserService',
      sourceType: 'class',
      sourceFilePath: 'src/user.ts',
      targetEntityId: 'manual-auth',
      targetName: 'AuthService',
      targetType: 'service',
      targetFilePath: 'src/auth.ts'
    }
  ];

  return {
    searchEntities: vi.fn(() => manualEntities),
    searchRelations: vi.fn(() => manualRelations),
    listAllEntities: vi.fn(() => manualEntities),
    listAllRelations: vi.fn(() => manualRelations),
    getOverview: vi.fn(() => ({
      entityCount: 2,
      relationCount: 1,
      observationCount: 4,
      lastUpdatedAt: '2026-08-20T01:02:03.000Z'
    }))
  } as unknown as GraphDatabase;
}
