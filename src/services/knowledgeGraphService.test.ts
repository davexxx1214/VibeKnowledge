import { describe, expect, it, vi } from 'vitest';
import { KnowledgeGraphService } from './knowledgeGraphService';
import type { EntityService } from './entityService';
import type { Entity } from '../utils/types';
import type {
  AgentEntity,
  AgentGraphGroupSnapshot,
  AgentGraphService,
  AgentRelation,
} from './agentGraph';

describe('KnowledgeGraphService', () => {
  it('builds an Agent-only aggregate and de-duplicates repeated group symbols', () => {
    const frameworkA = agentEntity('framework-a', 'key-a', 'A', 'src/a.ts');
    const frameworkB = agentEntity('framework-b', 'key-b', 'B', 'src/b.ts');
    const checkoutA = agentEntity(
      'checkout-a',
      'key-a',
      'A',
      'src/a.ts',
      checkoutGroup
    );
    const checkoutB = agentEntity(
      'checkout-b',
      'key-b',
      'B',
      'src/b.ts',
      checkoutGroup
    );
    const relations = [
      agentRelation('framework-relation', frameworkA, frameworkB),
      agentRelation('checkout-relation', checkoutA, checkoutB, checkoutGroup),
    ];
    const groups = [
      group(frameworkGroup, [frameworkA, frameworkB], [relations[0]]),
      group(checkoutGroup, [checkoutA, checkoutB], [relations[1]]),
    ];
    const service = createService(
      [frameworkA, frameworkB, checkoutA, checkoutB],
      relations,
      groups
    );

    const snapshot = service.getSnapshot();
    expect(snapshot.entities.map((entity) => entity.id)).toEqual([
      'framework-a',
      'framework-b',
    ]);
    expect(snapshot.entities.every((entity) => entity.origin === 'agent')).toBe(
      true
    );
    expect(snapshot.relations).toEqual([
      expect.objectContaining({
        id: 'framework-relation',
        sourceEntityId: 'framework-a',
        targetEntityId: 'framework-b',
        origin: 'agent',
      }),
    ]);
  });

  it('keeps repeated symbols in independent visualization groups', () => {
    const frameworkA = agentEntity('framework-a', 'key-a', 'A', 'src/a.ts');
    const checkoutA = agentEntity(
      'checkout-a',
      'key-a',
      'A',
      'src/a.ts',
      checkoutGroup
    );
    const checkout = agentEntity(
      'checkout',
      'key-checkout',
      'Checkout',
      'src/checkout.ts',
      checkoutGroup
    );
    const groups = [
      group(frameworkGroup, [frameworkA], []),
      group(checkoutGroup, [checkoutA, checkout], []),
    ];
    const service = createService(
      [frameworkA, checkoutA, checkout],
      [],
      groups
    );

    expect(service.getGroups()).toMatchObject([
      {
        key: 'framework',
        entities: [{ id: 'framework-a', origin: 'agent' }],
      },
      {
        key: 'checkout',
        entities: [
          { id: 'checkout-a', origin: 'agent' },
          { id: 'checkout', origin: 'agent' },
        ],
      },
    ]);
    expect(service.getEntity('checkout-a')?.name).toBe('A');
  });

  it('de-duplicates cross-group key variants by canonical alias', () => {
    const framework = agentEntity(
      'framework-a',
      'src/auth/auth.service.ts#AuthService',
      'AuthService',
      'src/auth/auth.service.ts'
    );
    const checkout = agentEntity(
      'checkout-a',
      ' SRC\\AUTH//auth.service.ts ## authservice() ',
      'AuthService',
      'src/auth/auth.service.ts',
      checkoutGroup
    );
    const service = createService(
      [framework, checkout],
      [],
      [
        group(frameworkGroup, [framework], []),
        group(checkoutGroup, [checkout], []),
      ]
    );

    expect(service.getSnapshot().entities).toHaveLength(1);
    expect(service.getSnapshot().entities[0].agentKey).toBe(
      'src/auth/auth.service.ts#AuthService'
    );
  });

  it('edits and resets descriptions through the Agent override store', () => {
    const entity = agentEntity('framework-a', 'key-a', 'A', 'src/a.ts');
    entity.description = 'Agent description';
    const entities = [entity];
    const groups = [group(frameworkGroup, entities, [])];
    const setManualDescription = vi.fn((entityId: string, description: string) => {
      const target = entities.find((candidate) => candidate.id === entityId);
      if (!target) {
        return null;
      }
      target.description = description;
      return target;
    });
    const resetManualDescription = vi.fn((entityId: string) => {
      const target = entities.find((candidate) => candidate.id === entityId);
      if (!target) {
        return null;
      }
      target.description = 'Agent description v2';
      return target;
    });
    const service = createService(entities, [], groups, {
      setManualDescription,
      resetManualDescription,
    });

    expect(service.updateDescription('framework-a', 'Human description'))
      .toMatchObject({ description: 'Human description', origin: 'agent' });
    expect(setManualDescription).toHaveBeenCalledWith(
      'framework-a',
      'Human description'
    );
    expect(service.resetGeneratedDescription('framework-a')).toMatchObject({
      description: 'Agent description v2',
    });
    expect(resetManualDescription).toHaveBeenCalledWith('framework-a');
  });

  it('uses legacy manual entities as descriptions without adding their structure', () => {
    const agent = agentEntity('framework-a', 'key-a', 'A', 'src/a.ts');
    const legacyA = legacyEntity('legacy-a', 'A', 'src/a.ts', 'Legacy prose');
    const legacyOnly = legacyEntity(
      'legacy-only',
      'LegacyOnly',
      'src/legacy.ts',
      'Must not become a node'
    );
    const resetManualDescription = vi.fn(() => {
      agent.description = 'Agent prose';
      return agent;
    });
    const service = createService(
      [agent],
      [],
      [group(frameworkGroup, [agent], [])],
      {
        legacyEntities: [legacyA, legacyOnly],
        resetManualDescription,
      }
    );

    expect(service.getSnapshot().entities).toEqual([
      expect.objectContaining({
        id: 'framework-a',
        description: 'Legacy prose',
        metadata: expect.objectContaining({
          legacyDescriptionOverride: true,
        }),
      }),
    ]);

    expect(service.resetGeneratedDescription('framework-a')).toMatchObject({
      description: 'Agent prose',
    });
    expect(legacyA.description).toBeUndefined();
    expect(legacyOnly.description).toBe('Must not become a node');
  });

  it('finds Agent entities and related entities from an editor location', () => {
    const a = agentEntity('framework-a', 'key-a', 'A', 'src/a.ts');
    const b = agentEntity('framework-b', 'key-b', 'B', 'src/b.ts');
    const relation = agentRelation('framework-relation', a, b);
    const service = createService(
      [a, b],
      [relation],
      [group(frameworkGroup, [a, b], [relation])]
    );

    expect(service.getEntitiesByFile('SRC\\A.TS')).toMatchObject([
      { id: 'framework-a', origin: 'agent' },
    ]);
    expect(service.findEntityAtLocation('./src/a.ts', 5)?.id).toBe(
      'framework-a'
    );
    expect(service.getRelatedEntities('framework-a')).toMatchObject([
      {
        direction: 'outgoing',
        entity: { id: 'framework-b' },
        relation: { id: 'framework-relation', origin: 'agent' },
      },
    ]);
    expect(service.getObservations('framework-a')).toEqual([]);
  });
});

const frameworkGroup = {
  key: 'framework',
  name: 'Framework',
  kind: 'framework' as const,
  order: 0,
};

const checkoutGroup = {
  key: 'checkout',
  name: 'Checkout',
  kind: 'feature' as const,
  order: 1,
};

function createService(
  entities: AgentEntity[],
  relations: AgentRelation[],
  groups: AgentGraphGroupSnapshot[],
  methods: {
    setManualDescription?: ReturnType<typeof vi.fn>;
    resetManualDescription?: ReturnType<typeof vi.fn>;
    legacyEntities?: Entity[];
  } = {}
): KnowledgeGraphService {
  const legacyEntities = methods.legacyEntities || [];
  const entityService = {
    listEntities: vi.fn(() => legacyEntities),
    updateEntity: vi.fn((entityId: string, updates: Partial<Entity>) => {
      const target = legacyEntities.find((entity) => entity.id === entityId);
      if (!target) {
        return null;
      }
      Object.assign(target, updates);
      return target;
    }),
  } as unknown as EntityService;
  const agentGraphService = {
    refresh: vi.fn(),
    getLastError: vi.fn(),
    listGroups: vi.fn(() => groups),
    listEntities: vi.fn(() => entities),
    listRelations: vi.fn(() => relations),
    setManualDescription: methods.setManualDescription || vi.fn(),
    resetManualDescription: methods.resetManualDescription || vi.fn(),
  } as unknown as AgentGraphService;
  return new KnowledgeGraphService(entityService, agentGraphService);
}

function group(
  metadata: typeof frameworkGroup | typeof checkoutGroup,
  entities: AgentEntity[],
  relations: AgentRelation[]
): AgentGraphGroupSnapshot {
  return { ...metadata, entities, relations };
}

function agentEntity(
  id: string,
  key: string,
  name: string,
  filePath: string,
  metadata: typeof frameworkGroup | typeof checkoutGroup = frameworkGroup
): AgentEntity {
  return {
    id,
    key,
    groupKey: metadata.key,
    groupName: metadata.name,
    groupKind: metadata.kind,
    groupOrder: metadata.order,
    name,
    filePath,
    description: `${name} description`,
    type: 'service',
    startLine: 1,
    endLine: 10,
    createdAt: 1,
    updatedAt: 1,
  };
}

function agentRelation(
  id: string,
  source: AgentEntity,
  target: AgentEntity,
  metadata: typeof frameworkGroup | typeof checkoutGroup = frameworkGroup
): AgentRelation {
  return {
    id,
    sourceKey: source.key,
    targetKey: target.key,
    groupKey: metadata.key,
    groupName: metadata.name,
    groupKind: metadata.kind,
    groupOrder: metadata.order,
    sourceEntityId: source.id,
    targetEntityId: target.id,
    verb: 'depends_on',
    createdAt: 1,
  };
}

function legacyEntity(
  id: string,
  name: string,
  filePath: string,
  description: string
): Entity {
  return {
    id,
    name,
    filePath,
    description,
    type: 'service',
    startLine: 1,
    endLine: 10,
    createdAt: 1,
    updatedAt: 1,
  };
}
