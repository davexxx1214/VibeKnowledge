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

  it('returns Agent entities and applies human description overrides', () => {
    const db = createDbStub();
    const results = searchMergedEntities(db, agentGraph, { limit: 100 });

    expect(results.map(({ name }) => name)).toEqual([
      'UserService',
      'AuthService',
      'Logger'
    ]);
    expect(results[0]).toMatchObject({
      source: 'agent',
      description: 'manual description wins',
      metadata: { descriptionSource: 'manual' }
    });
    expect(results.filter(({ name }) => name === 'UserService')).toHaveLength(1);
    expect(results.find(({ name }) => name === 'AuthService')).toMatchObject({
      description: 'Human-authored Auth description',
      metadata: { descriptionSource: 'manual' }
    });
    expect(
      searchMergedEntities(db, agentGraph, {
        query: 'Human-authored Auth',
        limit: 100
      })
        .filter(({ source }) => source === 'agent')
        .map(({ name }) => name)
    ).toEqual(['AuthService']);
    expect(
      searchMergedEntities(db, agentGraph, {
        query: 'manual description wins',
        limit: 100
      }).map(({ name }) => name)
    ).toEqual(['UserService']);
  });

  it('returns only Agent-authored relations', () => {
    const db = createDbStub();
    const results = searchMergedRelations(db, agentGraph, { limit: 100 });

    expect(results).toHaveLength(2);
    expect(results[0]).toMatchObject({ verb: 'uses', source: 'agent' });
    expect(results[1]).toMatchObject({ verb: 'calls', source: 'agent' });
  });

  it('ignores legacy manual structure in graph queries', () => {
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

    expect(results).toHaveLength(3);
    expect(results.every(({ source }) => source === 'agent')).toBe(true);
  });

  it('labels Agent sources in formatted MCP output', () => {
    const db = createDbStub();
    const entities = searchMergedEntities(db, agentGraph, { limit: 100 });
    const relations = searchMergedRelations(db, agentGraph, { limit: 100 });

    expect(formatEntityResults(entities)).not.toContain('来源：manual');
    expect(formatEntityResults(entities)).toContain(
      '来源：agent (.vscode/.knowledge/agent-graph.json)'
    );
    expect(formatRelationResults(relations)).not.toContain('Data Source: manual');
    expect(formatRelationResults(relations)).toContain(
      'Data Source: agent (.vscode/.knowledge/agent-graph.json)'
    );
  });

  it('reports one de-duplicated Agent Knowledge Graph overview', () => {
    const overview = getMergedOverview(createDbStub(), agentGraph);

    expect(overview).toMatchObject({
      entityCount: 3,
      relationCount: 2,
      observationCount: 0,
      lastUpdatedAt: '2026-08-21T01:02:03.000Z',
      generation: {
        generatedAt: '2026-08-21T01:02:03.000Z',
        scope: null,
        groupCount: 1,
        groups: [
          {
            key: 'framework',
            name: 'Framework',
            kind: 'framework',
            order: 0,
            entityCount: 3,
            relationCount: 2
          }
        ]
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
    })),
    getAgentEntityDescriptionOverrides: vi.fn(
      () => new Map([['agent-auth', 'Human-authored Auth description']])
    )
  } as unknown as GraphDatabase;
}
