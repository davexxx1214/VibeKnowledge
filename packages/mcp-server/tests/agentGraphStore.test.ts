import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it
} from 'vitest';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { AgentGraphStore } from '../src/agentGraphStore.js';

describe('AgentGraphStore', () => {
  let workspaceRoot: string;
  let store: AgentGraphStore;

  beforeEach(() => {
    workspaceRoot = mkdtempSync(join(tmpdir(), 'vibeknowledge-agent-graph-'));
    store = new AgentGraphStore(workspaceRoot);
  });

  afterEach(() => {
    rmSync(workspaceRoot, { recursive: true, force: true });
  });

  it('treats a missing sidecar as an empty graph', () => {
    expect(store.getOverview()).toEqual({
      entityCount: 0,
      relationCount: 0,
      generatedAt: null,
      scope: null
    });
    expect(store.searchEntities()).toEqual([]);
    expect(store.searchRelations()).toEqual([]);
  });

  it('reads a valid v1 graph and creates stable IDs', () => {
    writeGraph(store.filePath, validGraph());

    const firstEntities = store.searchEntities({ limit: 100 });
    const firstRelations = store.searchRelations({ limit: 100 });

    expect(store.getOverview()).toEqual({
      entityCount: 3,
      relationCount: 2,
      generatedAt: '2026-08-21T01:02:03.000Z',
      scope: 'packages/core'
    });
    expect(firstEntities.map((entity) => entity.key)).toEqual([
      'core:user-service',
      'core:auth-service',
      'core:logger'
    ]);
    expect(firstRelations[0].evidence).toEqual([
      {
        filePath: 'src/user.ts',
        startLine: 12,
        endLine: 13,
        detail: 'constructor injection'
      }
    ]);

    const updated = validGraph();
    updated.generatedAt = '2026-08-22T01:02:03.000Z';
    updated.entities[0].description = 'updated prose';
    updated.relations[0].description = 'updated prose';
    writeGraph(store.filePath, updated);

    expect(store.searchEntities({ limit: 100 }).map(({ id }) => id)).toEqual(
      firstEntities.map(({ id }) => id)
    );
    expect(store.searchRelations({ limit: 100 }).map(({ id }) => id)).toEqual(
      firstRelations.map(({ id }) => id)
    );
  });

  it('applies entity and relation filters and limits', () => {
    writeGraph(store.filePath, validGraph());

    expect(store.searchEntities({ query: 'AUTH' })).toHaveLength(1);
    expect(store.searchEntities({ query: 'constructor' })).toHaveLength(0);
    expect(store.searchEntities({ type: 'service' })).toHaveLength(2);
    expect(store.searchEntities({ filePath: 'src/' })).toHaveLength(3);
    expect(store.searchEntities({ limit: 1 })).toHaveLength(1);

    expect(store.searchRelations({ verb: 'uses' })).toHaveLength(1);
    expect(store.searchRelations({ source: 'USER' })).toHaveLength(1);
    expect(store.searchRelations({ source: 'core:user-service' })).toHaveLength(
      1
    );
    expect(store.searchRelations({ target: 'logger' })).toHaveLength(1);
    expect(store.searchRelations({ limit: 1 })).toHaveLength(1);
  });

  it('treats malformed or unsupported documents as empty', () => {
    writeRaw(store.filePath, '{not json');
    expect(store.getOverview().entityCount).toBe(0);

    writeGraph(store.filePath, { ...validGraph(), version: 2 });
    expect(store.getOverview().entityCount).toBe(0);

    writeGraph(store.filePath, {
      ...validGraph(),
      generatedAt: '1'
    });
    expect(store.getOverview().entityCount).toBe(0);
  });

  it.each([
    [
      'a duplicate entity key',
      () => {
        const graph = validGraph();
        graph.entities.push({ ...graph.entities[0] });
        return graph;
      }
    ],
    [
      'an invalid entity path',
      () => {
        const graph = validGraph();
        graph.entities[0].filePath = '../user.ts';
        return graph;
      }
    ],
    [
      'an invalid entity line range',
      () => {
        const graph = validGraph();
        graph.entities[0].endLine = 0;
        return graph;
      }
    ],
    [
      'an unsupported entity type',
      () => {
        const graph = validGraph();
        graph.entities[0].type = 'guess';
        return graph;
      }
    ],
    [
      'a dangling relation endpoint',
      () => {
        const graph = validGraph();
        graph.relations[0].target = 'missing';
        return graph;
      }
    ],
    [
      'a self relation',
      () => {
        const graph = validGraph();
        graph.relations[0].target = graph.relations[0].source;
        return graph;
      }
    ],
    [
      'a duplicate relation edge',
      () => {
        const graph = validGraph();
        graph.relations.push({ ...graph.relations[0] });
        return graph;
      }
    ],
    [
      'an unsupported relation verb',
      () => {
        const graph = validGraph();
        graph.relations[0].verb = 'guesses';
        return graph;
      }
    ],
    [
      'missing relation evidence',
      () => {
        const graph = validGraph();
        graph.relations[0].evidence = [];
        return graph;
      }
    ],
    [
      'invalid evidence',
      () => {
        const graph = validGraph();
        graph.relations[0].evidence[0].filePath = 'src\\user.ts';
        return graph;
      }
    ],
    [
      'an invalid evidence line range',
      () => {
        const graph = validGraph();
        graph.relations[0].evidence[0].startLine = 12;
        graph.relations[0].evidence[0].endLine = 4;
        return graph;
      }
    ]
  ])('hides the entire graph when it contains %s', (_label, makeGraph) => {
    writeGraph(store.filePath, makeGraph());

    expect(store.getOverview()).toEqual({
      entityCount: 0,
      relationCount: 0,
      generatedAt: null,
      scope: null
    });
    expect(store.searchEntities()).toEqual([]);
    expect(store.searchRelations()).toEqual([]);
  });
});

function writeGraph(filePath: string, graph: Record<string, any>): void {
  writeRaw(filePath, JSON.stringify(graph));
}

function writeRaw(filePath: string, content: string): void {
  mkdirSync(dirname(filePath), { recursive: true });
  writeFileSync(filePath, content, 'utf8');
}

function validGraph(): Record<string, any> {
  return {
    version: 1,
    generatedAt: '2026-08-21T01:02:03.000Z',
    scope: 'packages/core',
    entities: [
      {
        key: 'core:user-service',
        name: 'UserService',
        type: 'service',
        filePath: 'src/user.ts',
        startLine: 1,
        endLine: 80,
        description: 'Manages users'
      },
      {
        key: 'core:auth-service',
        name: 'AuthService',
        type: 'service',
        filePath: 'src/auth.ts',
        startLine: 1,
        endLine: 50
      },
      {
        key: 'core:logger',
        name: 'Logger',
        type: 'function',
        filePath: 'src/logger.ts',
        startLine: 5,
        endLine: 12
      }
    ],
    relations: [
      {
        source: 'core:user-service',
        target: 'core:auth-service',
        verb: 'uses',
        evidence: [
          {
            filePath: 'src/user.ts',
            startLine: 12,
            endLine: 13,
            detail: 'constructor injection'
          }
        ],
        description: 'User operations require authorization'
      },
      {
        source: 'core:auth-service',
        target: 'core:logger',
        verb: 'calls',
        evidence: [
          {
            filePath: 'src/auth.ts',
            startLine: 20,
            detail: 'AuthService logs failed attempts'
          }
        ]
      }
    ]
  };
}
