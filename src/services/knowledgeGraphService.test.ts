import { describe, expect, it, vi } from 'vitest';
import { KnowledgeGraphService } from './knowledgeGraphService';
import type { Entity, Relation } from '../utils/types';
import type { AgentEntity, AgentRelation } from './agentGraph';

describe('KnowledgeGraphService', () => {
  it('returns one de-duplicated graph and remaps Agent relations', () => {
    const manualEntities: Entity[] = [entity('manual-a', 'A', 'src/a.ts', undefined)];
    const agentEntities: AgentEntity[] = [
      agentEntity('agent-a', 'key-a', 'A', 'src/a.ts', 'Agent A'),
      agentEntity('agent-b', 'key-b', 'B', 'src/b.ts', 'Agent B'),
    ];
    const agentRelations: AgentRelation[] = [
      {
        id: 'agent-relation',
        sourceKey: 'key-a',
        targetKey: 'key-b',
        sourceEntityId: 'agent-a',
        targetEntityId: 'agent-b',
        verb: 'depends_on',
        createdAt: 1,
      },
    ];
    const service = createService(manualEntities, [], agentEntities, agentRelations);

    const snapshot = service.getSnapshot();
    expect(snapshot.entities).toHaveLength(2);
    expect(snapshot.entities[0]).toMatchObject({
      id: 'manual-a',
      description: 'Agent A',
      origin: 'manual',
    });
    expect(snapshot.relations[0]).toMatchObject({
      sourceEntityId: 'manual-a',
      targetEntityId: 'agent-b',
      origin: 'agent',
    });
  });

  it('keeps a human description over regenerated Agent prose', () => {
    const manual = entity('manual-a', 'A', 'src/a.ts', 'Human A');
    const updateEntity = vi.fn((_id: string, updates: Partial<Entity>) => {
      Object.assign(manual, updates);
      return manual;
    });
    const service = createService(
      [manual],
      [],
      [agentEntity('agent-a', 'key-a', 'A', 'src/a.ts', 'Agent A v2')],
      [],
      updateEntity
    );

    expect(service.getEntity('manual-a')?.description).toBe('Human A');
    expect(service.updateDescription('manual-a', 'Human A v2')?.description)
      .toBe('Human A v2');
    expect(updateEntity).toHaveBeenCalledWith('manual-a', {
      description: 'Human A v2',
    });
  });

  it('finds Agent entities and relations from an editor location', () => {
    const agentEntities: AgentEntity[] = [
      agentEntity('agent-a', 'key-a', 'A', 'src/a.ts', 'Agent A'),
      agentEntity('agent-b', 'key-b', 'B', 'src/b.ts', 'Agent B'),
    ];
    const agentRelations: AgentRelation[] = [
      {
        id: 'agent-relation',
        sourceKey: 'key-a',
        targetKey: 'key-b',
        sourceEntityId: 'agent-a',
        targetEntityId: 'agent-b',
        verb: 'calls',
        createdAt: 1,
      },
    ];
    const service = createService([], [], agentEntities, agentRelations);

    expect(service.getEntitiesByFile('SRC\\A.TS')).toMatchObject([
      { id: 'agent-a', description: 'Agent A', origin: 'agent' },
    ]);
    expect(service.findEntityAtLocation('./src/a.ts', 5)?.id).toBe('agent-a');
    expect(service.getRelatedEntities('agent-a')).toMatchObject([
      {
        direction: 'outgoing',
        entity: { id: 'agent-b' },
        relation: { id: 'agent-relation', origin: 'agent' },
      },
    ]);
  });
});

function createService(
  manualEntities: Entity[],
  manualRelations: Relation[],
  agentEntities: AgentEntity[],
  agentRelations: AgentRelation[],
  updateEntity = vi.fn()
): KnowledgeGraphService {
  return new KnowledgeGraphService(
    {
      listEntities: vi.fn(() => manualEntities),
      updateEntity,
      getEntity: vi.fn(
        (entityId: string) =>
          manualEntities.find((entity) => entity.id === entityId) || null
      ),
    } as any,
    { getAllRelations: vi.fn(() => manualRelations) } as any,
    { getObservations: vi.fn(() => []) } as any,
    {
      listEntities: vi.fn(() => agentEntities),
      listRelations: vi.fn(() => agentRelations),
      setManualDescription: vi.fn(),
      resetManualDescription: vi.fn(),
    } as any
  );
}

function entity(
  id: string,
  name: string,
  filePath: string,
  description: string | undefined
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

function agentEntity(
  id: string,
  key: string,
  name: string,
  filePath: string,
  description: string
): AgentEntity {
  return { ...entity(id, name, filePath, description), key };
}
