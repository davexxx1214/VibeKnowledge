import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentGraphService, parseAgentGraphDocument } from './agentGraphService';
import type { AgentEntityDescriptionOverrideStore } from './agentEntityOverrideService';

const tempDirs: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-agent-graph-'));
  tempDirs.push(workspace);
  mkdirSync(join(workspace, '.vscode', '.knowledge'), { recursive: true });
  return workspace;
}

function entity(
  key: string,
  name: string,
  filePath: string,
  description?: string
) {
  return {
    key,
    name,
    type: 'service',
    filePath,
    startLine: 1,
    endLine: 20,
    ...(description ? { description } : {}),
  };
}

function relation(source: string, target: string, filePath: string) {
  return {
    source,
    target,
    verb: 'depends_on',
    origin: 'agent',
    confidence: 'extracted',
    description: `${source} needs ${target}`,
    evidence: [
      {
        filePath,
        startLine: 5,
        detail: 'Dependency is used here',
      },
    ],
  };
}

function validDocument() {
  return {
    version: 2,
    generatedAt: '2026-08-21T12:00:00.000Z',
    scope: 'src',
    groups: [
      {
        key: 'framework',
        name: 'Framework',
        kind: 'framework',
        order: 0,
        description: 'Top-level application wiring',
        entities: [
          entity('src/a.ts#A', 'A', 'src/a.ts', 'Framework A'),
          entity('src/b.ts#B', 'B', 'src/b.ts', 'Framework B'),
        ],
        relations: [relation('src/a.ts#A', 'src/b.ts#B', 'src/a.ts')],
      },
      {
        key: 'checkout',
        name: 'Checkout',
        kind: 'feature',
        order: 1,
        scope: 'src/checkout',
        entities: [
          entity('src/a.ts#A', 'A', 'src/a.ts', 'Checkout A'),
          entity('src/checkout.ts#Checkout', 'Checkout', 'src/checkout.ts'),
        ],
        relations: [
          relation('src/checkout.ts#Checkout', 'src/a.ts#A', 'src/checkout.ts'),
        ],
      },
    ],
  };
}

function legacyDocument() {
  const document = validDocument();
  return {
    version: 1,
    generatedAt: document.generatedAt,
    scope: document.scope,
    entities: document.groups[0].entities,
    relations: document.groups[0].relations.map(
      ({ origin: _origin, confidence: _confidence, ...relation }) => relation
    ),
  };
}

function cloneDocument(): ReturnType<typeof validDocument> {
  return JSON.parse(JSON.stringify(validDocument())) as ReturnType<
    typeof validDocument
  >;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('parseAgentGraphDocument', () => {
  it('accepts independent groups and allows the same entity key across groups', () => {
    const graph = parseAgentGraphDocument(validDocument());

    expect(graph.groups).toHaveLength(2);
    expect(graph.groups.map((group) => group.key)).toEqual([
      'framework',
      'checkout',
    ]);
    expect(graph.groups[0].entities).toHaveLength(2);
    expect(graph.groups[1].entities).toContainEqual(
      expect.objectContaining({ key: 'src/a.ts#A' })
    );
  });

  it('normalizes a legacy v1 graph into the framework group', () => {
    const graph = parseAgentGraphDocument(legacyDocument());

    expect(graph.version).toBe(2);
    expect(graph.groups).toEqual([
      expect.objectContaining({
        key: 'framework',
        name: 'Framework',
        kind: 'framework',
        order: 0,
      }),
    ]);
  });

  it('accepts legacy v2 relations without provenance fields', () => {
    const document = cloneDocument();
    delete (document.groups[0].relations[0] as Partial<{
      origin: string;
      confidence: string;
    }>).origin;
    delete (document.groups[0].relations[0] as Partial<{
      origin: string;
      confidence: string;
    }>).confidence;

    const relation = parseAgentGraphDocument(document).groups[0].relations[0];
    expect(relation.origin).toBeUndefined();
    expect(relation.confidence).toBeUndefined();
  });

  it.each([
    [
      'an unsupported verb',
      () => {
        const document = cloneDocument();
        document.groups[0].relations[0].verb = 'guesses';
        return document;
      },
    ],
    [
      'a dangling endpoint',
      () => {
        const document = cloneDocument();
        document.groups[0].relations[0].target = 'missing';
        return document;
      },
    ],
    [
      'a self relation',
      () => {
        const document = cloneDocument();
        document.groups[0].relations[0].target = 'src/a.ts#A';
        return document;
      },
    ],
    [
      'missing evidence',
      () => {
        const document = cloneDocument();
        document.groups[0].relations[0].evidence = [];
        return document;
      },
    ],
    [
      'a parent path',
      () => {
        const document = cloneDocument();
        document.groups[0].entities[0].filePath = '../a.ts';
        return document;
      },
    ],
    [
      'a non-ISO timestamp',
      () => ({ ...cloneDocument(), generatedAt: '1' }),
    ],
    [
      'a graph without a framework group',
      () => {
        const document = cloneDocument();
        document.groups[0].kind = 'module';
        return document;
      },
    ],
    [
      'a framework group that is not first',
      () => {
        const document = cloneDocument();
        document.groups[0].order = 2;
        return document;
      },
    ],
    [
      'duplicate keys inside one group',
      () => {
        const document = cloneDocument();
        document.groups[0].entities[1].key = document.groups[0].entities[0].key;
        return document;
      },
    ],
    [
      'canonical key collisions inside one group',
      () => {
        const document = cloneDocument();
        document.groups[0].entities[1].key = ' SRC\\A.ts ## a() ';
        return document;
      },
    ],
    [
      'an unsupported relation origin',
      () => {
        const document = cloneDocument();
        document.groups[0].relations[0].origin = 'parser';
        return document;
      },
    ],
    [
      'an unsupported relation confidence',
      () => {
        const document = cloneDocument();
        document.groups[0].relations[0].confidence = 'certain';
        return document;
      },
    ],
    [
      'an empty structural path',
      () => {
        const document = cloneDocument();
        Object.assign(document.groups[0].relations[0], { structuralPath: [] });
        return document;
      },
    ],
  ])('rejects %s', (_label, makeDocument) => {
    expect(() => parseAgentGraphDocument(makeDocument())).toThrow();
  });
});

describe('AgentGraphService', () => {
  it('returns an empty grouped graph when the manifest is absent', () => {
    const service = new AgentGraphService(createWorkspace());
    expect(service.getStats()).toEqual({
      groupCount: 0,
      entityCount: 0,
      relationCount: 0,
      generatedAt: undefined,
      scope: undefined,
      groups: [],
    });
  });

  it('loads ordered groups with stable, group-specific IDs and metadata', () => {
    const workspace = createWorkspace();
    const graphPath = join(workspace, '.vscode', '.knowledge', 'agent-graph.json');
    const document = validDocument();
    Object.assign(document.groups[0].relations[0], {
      structuralPath: [
        {
          source: 'src/a.ts#A',
          target: 'src/b.ts#B',
          verb: 'calls',
          filePath: 'src/a.ts',
          startLine: 5,
          endLine: 5,
          traversal: 'forward',
        },
      ],
    });
    writeFileSync(graphPath, JSON.stringify(document), 'utf8');

    const first = new AgentGraphService(workspace);
    const second = new AgentGraphService(workspace);
    const duplicateEntities = first.listEntities({ name: 'A' });
    const relation = first.listRelations({ verb: 'depends_on' })[0];

    expect(first.listGroups().map((group) => group.key)).toEqual([
      'framework',
      'checkout',
    ]);
    expect(duplicateEntities).toHaveLength(2);
    expect(duplicateEntities[0].id).not.toBe(duplicateEntities[1].id);
    expect(duplicateEntities[0].id).toBe(
      second.listEntities({ name: 'A' })[0].id
    );
    expect(relation.sourceEntityId).toBe(duplicateEntities[0].id);
    expect(relation.metadata?.evidence).toHaveLength(1);
    expect(relation).toMatchObject({
      extractionOrigin: 'agent',
      confidence: 'extracted',
      structuralPath: [
        expect.objectContaining({
          source: 'src/a.ts#A',
          target: 'src/b.ts#B',
          verb: 'calls',
          traversal: 'forward',
        }),
      ],
      metadata: {
        relationOrigin: 'agent',
        relationConfidence: 'extracted',
        structuralPath: [
          expect.objectContaining({
            source: 'src/a.ts#A',
            target: 'src/b.ts#B',
          }),
        ],
      },
    });
    expect(first.getRelationsByEntity(duplicateEntities[0].id, 'outgoing'))
      .toHaveLength(1);
    expect(first.getStats()).toMatchObject({
      groupCount: 2,
      entityCount: 4,
      relationCount: 2,
      scope: 'src',
      groups: [
        { key: 'framework', order: 0, entityCount: 2, relationCount: 1 },
        { key: 'checkout', order: 1, entityCount: 2, relationCount: 1 },
      ],
    });
  });

  it('does not expose a partially invalid graph', () => {
    const workspace = createWorkspace();
    const graphPath = join(workspace, '.vscode', '.knowledge', 'agent-graph.json');
    const invalid = cloneDocument();
    invalid.groups[0].relations[0].target = 'missing';
    writeFileSync(graphPath, JSON.stringify(invalid), 'utf8');

    const service = new AgentGraphService(workspace);
    expect(service.listGroups()).toEqual([]);
    expect(service.listEntities()).toEqual([]);
    expect(service.listRelations()).toEqual([]);
    expect(service.getLastError()).toBeDefined();
  });

  it('uses refreshed Agent descriptions when there is no human override', () => {
    const workspace = createWorkspace();
    const graphPath = join(workspace, '.vscode', '.knowledge', 'agent-graph.json');
    writeFileSync(graphPath, JSON.stringify(validDocument()), 'utf8');

    const service = new AgentGraphService(workspace);
    const entityId = service.listGroups()[0].entities[0].id;
    const refreshed = cloneDocument();
    refreshed.generatedAt = '2026-08-22T12:00:00.000Z';
    refreshed.groups[0].entities[0].description = 'Framework A v2';
    writeFileSync(graphPath, JSON.stringify(refreshed), 'utf8');
    service.refresh();

    expect(service.getEntity(entityId)).toMatchObject({
      description: 'Framework A v2',
      metadata: {
        generatedDescription: 'Framework A v2',
        descriptionSource: 'agent',
      },
    });
  });

  it('applies one human description to every occurrence after regeneration', () => {
    const workspace = createWorkspace();
    const graphPath = join(workspace, '.vscode', '.knowledge', 'agent-graph.json');
    const descriptions = new Map<string, string>();
    const overrides: AgentEntityDescriptionOverrideStore = {
      getDescription: (key) => descriptions.get(key),
      setDescription: (key, description) => descriptions.set(key, description),
      deleteDescription: (key) => descriptions.delete(key),
    };
    writeFileSync(graphPath, JSON.stringify(validDocument()), 'utf8');

    const service = new AgentGraphService(workspace, overrides);
    const entityId = service.listGroups()[0].entities[0].id;
    expect(service.setManualDescription(entityId, 'Human description')?.description)
      .toBe('Human description');

    const regenerated = cloneDocument();
    regenerated.generatedAt = '2026-08-22T12:00:00.000Z';
    regenerated.groups[0].entities[0].description = 'Framework A v2';
    regenerated.groups[1].entities[0].description = 'Checkout A v2';
    writeFileSync(graphPath, JSON.stringify(regenerated), 'utf8');
    service.refresh();

    expect(service.listEntities({ name: 'A' })).toEqual([
      expect.objectContaining({
        description: 'Human description',
        metadata: expect.objectContaining({ descriptionSource: 'manual' }),
      }),
      expect.objectContaining({
        description: 'Human description',
        metadata: expect.objectContaining({ descriptionSource: 'manual' }),
      }),
    ]);

    expect(service.resetManualDescription(entityId)?.description)
      .toBe('Framework A v2');
    expect(service.listEntities({ name: 'A' }).map((item) => item.description))
      .toEqual(['Framework A v2', 'Checkout A v2']);
  });
});
