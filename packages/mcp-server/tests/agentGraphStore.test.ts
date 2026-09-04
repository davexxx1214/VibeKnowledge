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
      groupCount: 0,
      entityCount: 0,
      relationCount: 0,
      generatedAt: null,
      scope: null,
      groups: []
    });
    expect(store.searchEntities()).toEqual([]);
    expect(store.searchRelations()).toEqual([]);
  });

  it('keeps case-distinct keys and human overrides independent', () => {
    const graph = validGraph();
    const first = graph.groups[0].entities[0];
    graph.groups[0].entities = [
      { ...first, key: 'src/a.ts#PartnerShip', name: 'PartnerShip' },
      { ...first, key: 'src/a.ts#Partnership', name: 'Partnership' }
    ];
    graph.groups[0].relations = [];
    writeGraph(store.filePath, graph);
    const entities = store.searchEntities({}, new Map([['src/a.ts#PartnerShip', 'Upper human description']]));
    expect(entities).toHaveLength(2);
    expect(entities.find((entity) => entity.key.endsWith('#PartnerShip'))?.description).toBe('Upper human description');
    expect(entities.find((entity) => entity.key.endsWith('#Partnership'))?.description).toBe('Manages users');
  });

  it('reads a valid grouped graph and creates stable IDs', () => {
    writeGraph(store.filePath, validGraph());

    const firstEntities = store.searchEntities({ limit: 100 });
    const firstRelations = store.searchRelations({ limit: 100 });

    expect(store.getOverview()).toEqual({
      groupCount: 1,
      entityCount: 3,
      relationCount: 2,
      generatedAt: '2026-08-21T01:02:03.000Z',
      scope: 'packages/core',
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
    });
    expect(firstEntities.map((entity) => entity.key)).toEqual([
      'core:user-service',
      'core:auth-service',
      'core:logger'
    ]);
    expect(firstEntities[0]).toMatchObject({
      groupKey: 'framework',
      groupKind: 'framework',
      groupOrder: 0
    });
    expect(firstRelations[0].evidence).toEqual([
      {
        filePath: 'src/user.ts',
        startLine: 12,
        endLine: 13,
        detail: 'constructor injection'
      }
    ]);
    expect(firstRelations[0].origin).toBe('agent');
    expect(firstRelations[0].confidence).toBe('review_required');

    const updated = validGraph();
    updated.generatedAt = '2026-08-22T01:02:03.000Z';
    updated.groups[0].entities[0].description = 'updated prose';
    updated.groups[0].relations[0].description = 'updated prose';
    writeGraph(store.filePath, updated);

    expect(store.searchEntities({ limit: 100 }).map(({ id }) => id)).toEqual(
      firstEntities.map(({ id }) => id)
    );
    expect(store.searchRelations({ limit: 100 }).map(({ id }) => id)).toEqual(
      firstRelations.map(({ id }) => id)
    );
  });

  it('preserves repeated symbols as separate group occurrences', () => {
    writeGraph(store.filePath, validGroupedGraph());

    const entities = store.searchEntities({ query: 'UserService', limit: 100 });
    const relations = store.searchRelations({ limit: 100 });

    expect(store.getOverview()).toMatchObject({
      groupCount: 2,
      entityCount: 4,
      relationCount: 2,
      groups: [
        { key: 'framework', kind: 'framework', order: 0, entityCount: 2 },
        { key: 'checkout', kind: 'feature', order: 1, entityCount: 2 }
      ]
    });
    expect(entities).toHaveLength(2);
    expect(entities.map((entity) => entity.groupKey)).toEqual([
      'framework',
      'checkout'
    ]);
    expect(entities[0].id).not.toBe(entities[1].id);
    expect(relations.map((relation) => relation.groupKey)).toEqual([
      'framework',
      'checkout'
    ]);

    const overridden = store.searchEntities(
      { query: 'UserService', limit: 100 },
      new Map([['core:user-service', 'Human description']])
    );
    expect(overridden.map((entity) => entity.description)).toEqual([
      'Human description',
      'Human description'
    ]);

    const canonicalOverride = store.searchEntities(
      { query: 'UserService', limit: 100 },
      new Map([['./core:user-service', 'Canonical human description']])
    );
    expect(canonicalOverride.map((entity) => entity.description)).toEqual([
      'Canonical human description',
      'Canonical human description'
    ]);
  });

  it('preserves required relation provenance and structural paths', () => {
    const graph = validGroupedGraph();
    graph.groups[0].relations[0].origin = 'resolver';
    graph.groups[0].relations[0].confidence = 'inferred';
    graph.groups[0].relations[0].structuralPath = [
      {
        source: 'core:auth-service',
        target: 'core:user-service',
        verb: 'calls',
        filePath: 'src/auth.ts',
        startLine: 5,
        endLine: 5,
        traversal: 'forward'
      }
    ];
    writeGraph(store.filePath, graph);

    expect(store.searchRelations({ limit: 100 })[0]).toMatchObject({
      origin: 'resolver',
      confidence: 'inferred',
      structuralPath: [
        expect.objectContaining({
          source: 'core:auth-service',
          target: 'core:user-service',
          verb: 'calls',
          traversal: 'forward'
        })
      ]
    });
  });

  it('applies entity and relation filters and limits', () => {
    writeGraph(store.filePath, validGraph());

    expect(store.searchEntities({ query: 'AUTH' })).toHaveLength(1);
    expect(store.searchEntities({ query: 'CORE::AUTH---SERVICE' })).toHaveLength(
      1
    );
    expect(store.searchEntities({ query: 'constructor' })).toHaveLength(0);
    expect(store.searchEntities({ type: 'service' })).toHaveLength(2);
    expect(store.searchEntities({ filePath: 'src/' })).toHaveLength(3);
    expect(store.searchEntities({ limit: 1 })).toHaveLength(1);

    expect(store.searchRelations({ verb: 'depends_on' })).toHaveLength(1);
    expect(store.searchRelations({ source: 'USER' })).toHaveLength(1);
    expect(store.searchRelations({ source: 'core:user-service' })).toHaveLength(
      1
    );
    expect(
      store.searchRelations({ source: 'CORE::USER---SERVICE' })
    ).toHaveLength(1);
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
        graph.groups[0].entities.push({ ...graph.groups[0].entities[0] });
        return graph;
      }
    ],
    [
      'a path-normalized entity key collision',
      () => {
        const graph = validGraph();
        graph.groups[0].entities.push({
          ...graph.groups[0].entities[0],
          key: './core:user-service'
        });
        return graph;
      }
    ],
    [
      'an invalid entity path',
      () => {
        const graph = validGraph();
        graph.groups[0].entities[0].filePath = '../user.ts';
        return graph;
      }
    ],
    [
      'an invalid entity line range',
      () => {
        const graph = validGraph();
        graph.groups[0].entities[0].endLine = 0;
        return graph;
      }
    ],
    [
      'a removed catch-all entity type',
      () => {
        const graph = validGraph();
        graph.groups[0].entities[0].type = 'other';
        return graph;
      }
    ],
    [
      'a dangling relation endpoint',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].target = 'missing';
        return graph;
      }
    ],
    [
      'a self relation',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].target = graph.groups[0].relations[0].source;
        return graph;
      }
    ],
    [
      'a duplicate relation edge',
      () => {
        const graph = validGraph();
        graph.groups[0].relations.push({ ...graph.groups[0].relations[0] });
        return graph;
      }
    ],
    [
      'the removed uses relation verb',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].verb = 'uses';
        return graph;
      }
    ],
    [
      'an unsupported relation origin',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].origin = 'parser';
        return graph;
      }
    ],
    [
      'an unsupported relation confidence',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].confidence = 'certain';
        return graph;
      }
    ],
    [
      'missing relation evidence',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].evidence = [];
        return graph;
      }
    ],
    [
      'invalid evidence',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].evidence[0].filePath = 'src\\user.ts';
        return graph;
      }
    ],
    [
      'an invalid evidence line range',
      () => {
        const graph = validGraph();
        graph.groups[0].relations[0].evidence[0].startLine = 12;
        graph.groups[0].relations[0].evidence[0].endLine = 4;
        return graph;
      }
    ]
  ])('hides the entire graph when it contains %s', (_label, makeGraph) => {
    writeGraph(store.filePath, makeGraph());

    expect(store.getOverview()).toEqual({
      groupCount: 0,
      entityCount: 0,
      relationCount: 0,
      generatedAt: null,
      scope: null,
      groups: []
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
    groups: [
      {
        key: 'framework',
        name: 'Framework',
        kind: 'framework',
        order: 0,
        entities: baseEntities(),
        relations: baseRelations()
      }
    ]
  };
}

function validGroupedGraph(): Record<string, any> {
  const base = validGraph();
  const framework = base.groups[0];
  return {
    version: 1,
    generatedAt: base.generatedAt,
    scope: base.scope,
    groups: [
      {
        key: 'framework',
        name: 'Framework',
        kind: 'framework',
        order: 0,
        entities: framework.entities.slice(0, 2),
        relations: framework.relations.slice(0, 1)
      },
      {
        key: 'checkout',
        name: 'Checkout',
        kind: 'feature',
        order: 1,
        entities: [framework.entities[0], framework.entities[2]],
        relations: [
          {
            source: 'core:user-service',
            target: 'core:logger',
            verb: 'calls',
            origin: 'agent',
            confidence: 'review_required',
            evidence: [{ filePath: 'src/user.ts', startLine: 30 }]
          }
        ]
      }
    ]
  };
}

function baseEntities(): Array<Record<string, any>> {
  return [
    {
      key: 'core:user-service', name: 'UserService', type: 'service',
      filePath: 'src/user.ts', startLine: 1, endLine: 80,
      description: 'Manages users'
    },
    {
      key: 'core:auth-service', name: 'AuthService', type: 'service',
      filePath: 'src/auth.ts', startLine: 1, endLine: 50
    },
    {
      key: 'core:logger', name: 'Logger', type: 'function',
      filePath: 'src/logger.ts', startLine: 5, endLine: 12
    }
  ];
}

function baseRelations(): Array<Record<string, any>> {
  return [
    {
      source: 'core:user-service', target: 'core:auth-service',
      verb: 'depends_on', origin: 'agent', confidence: 'review_required',
      evidence: [{
        filePath: 'src/user.ts', startLine: 12, endLine: 13,
        detail: 'constructor injection'
      }],
      description: 'User operations require authorization'
    },
    {
      source: 'core:auth-service', target: 'core:logger',
      verb: 'calls', origin: 'agent', confidence: 'review_required',
      evidence: [{
        filePath: 'src/auth.ts', startLine: 20,
        detail: 'AuthService logs failed attempts'
      }]
    }
  ];
}
