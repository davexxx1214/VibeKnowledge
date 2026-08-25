import type { AgentGraphService } from './agentGraph';
import type { EntityService } from './entityService';
import type { ObservationService } from './observationService';
import type { RelationService } from './relationService';
import type {
  Entity,
  EntityFilters,
  Observation,
  Relation,
  RelationVerb,
} from '../utils/types';

export type KnowledgeGraphOrigin = 'manual' | 'agent';

export interface KnowledgeEntity extends Entity {
  origin: KnowledgeGraphOrigin;
  agentKey?: string;
}

export interface KnowledgeRelation extends Relation {
  origin: KnowledgeGraphOrigin;
}

export interface KnowledgeGraphSnapshot {
  entities: KnowledgeEntity[];
  relations: KnowledgeRelation[];
}

/**
 * The single product-level Knowledge Graph.
 *
 * Agent output supplies refreshable structure. SQLite records and description
 * overrides supply human-authored knowledge. When both describe the same
 * symbol, the human record and its description win, while Agent-only edges are
 * remapped to the surviving entity.
 */
export class KnowledgeGraphService {
  constructor(
    private readonly entityService: EntityService,
    private readonly relationService: RelationService,
    private readonly observationService: ObservationService,
    private readonly agentGraphService: AgentGraphService
  ) {}

  public refresh(): void {
    this.agentGraphService.refresh();
  }

  public getGenerationError(): Error | undefined {
    return this.agentGraphService.getLastError();
  }

  public getSnapshot(): KnowledgeGraphSnapshot {
    const manualEntities = this.entityService.listEntities();
    const agentEntities = this.agentGraphService.listEntities();
    const agentByIdentity = new Map(
      agentEntities.map((entity) => [entityIdentity(entity), entity])
    );
    const finalIdByIdentity = new Map<string, string>();
    const agentIdToIdentity = new Map<string, string>();
    const entities: KnowledgeEntity[] = [];

    for (const agentEntity of agentEntities) {
      agentIdToIdentity.set(agentEntity.id, entityIdentity(agentEntity));
    }

    // Human records appear first and remain authoritative for duplicate symbols.
    for (const manualEntity of manualEntities) {
      const identity = entityIdentity(manualEntity);
      const matchingAgent = agentByIdentity.get(identity);
      const hasManualDescription = typeof manualEntity.description === 'string';
      const entity: KnowledgeEntity = {
        ...manualEntity,
        description: hasManualDescription
          ? manualEntity.description
          : matchingAgent?.description,
        metadata: {
          ...(matchingAgent?.metadata || {}),
          ...(manualEntity.metadata || {}),
          knowledgeOrigin: 'manual',
          ...(matchingAgent ? { agentKey: matchingAgent.key } : {}),
        },
        origin: 'manual',
        agentKey: matchingAgent?.key,
      };
      entities.push(entity);
      finalIdByIdentity.set(identity, entity.id);
    }

    for (const agentEntity of agentEntities) {
      const identity = entityIdentity(agentEntity);
      if (finalIdByIdentity.has(identity)) {
        continue;
      }
      const entity: KnowledgeEntity = {
        ...agentEntity,
        metadata: {
          ...(agentEntity.metadata || {}),
          knowledgeOrigin: 'agent',
        },
        origin: 'agent',
        agentKey: agentEntity.key,
      };
      entities.push(entity);
      finalIdByIdentity.set(identity, entity.id);
    }

    const entityIds = new Set(entities.map((entity) => entity.id));
    const relations: KnowledgeRelation[] = this.relationService
      .getAllRelations()
      .filter(
        (relation) =>
          entityIds.has(relation.sourceEntityId) &&
          entityIds.has(relation.targetEntityId)
      )
      .map((relation) => ({
        ...relation,
        metadata: {
          ...(relation.metadata || {}),
          knowledgeOrigin: 'manual',
        },
        origin: 'manual',
      }));
    const relationKeys = new Set(relations.map(relationIdentity));

    for (const relation of this.agentGraphService.listRelations()) {
      const sourceIdentity = agentIdToIdentity.get(relation.sourceEntityId);
      const targetIdentity = agentIdToIdentity.get(relation.targetEntityId);
      const sourceEntityId = sourceIdentity
        ? finalIdByIdentity.get(sourceIdentity)
        : undefined;
      const targetEntityId = targetIdentity
        ? finalIdByIdentity.get(targetIdentity)
        : undefined;
      if (
        !sourceEntityId ||
        !targetEntityId ||
        sourceEntityId === targetEntityId
      ) {
        continue;
      }

      const knowledgeRelation: KnowledgeRelation = {
        ...relation,
        sourceEntityId,
        targetEntityId,
        metadata: {
          ...(relation.metadata || {}),
          knowledgeOrigin: 'agent',
        },
        origin: 'agent',
      };
      const identity = relationIdentity(knowledgeRelation);
      if (relationKeys.has(identity)) {
        continue;
      }
      relationKeys.add(identity);
      relations.push(knowledgeRelation);
    }

    return { entities, relations };
  }

  public listEntities(filters?: EntityFilters): KnowledgeEntity[] {
    return this.getSnapshot().entities.filter((entity) => {
      if (filters?.type && entity.type !== filters.type) {
        return false;
      }
      if (filters?.filePath && entity.filePath !== filters.filePath) {
        return false;
      }
      if (
        filters?.name &&
        !entity.name.toLocaleLowerCase().includes(filters.name.toLocaleLowerCase())
      ) {
        return false;
      }
      return true;
    });
  }

  public getEntity(entityId: string): KnowledgeEntity | null {
    return (
      this.getSnapshot().entities.find((entity) => entity.id === entityId) || null
    );
  }

  public listRelations(filters?: {
    verb?: RelationVerb;
    sourceEntityId?: string;
    targetEntityId?: string;
  }): KnowledgeRelation[] {
    return this.getSnapshot().relations.filter((relation) => {
      if (filters?.verb && relation.verb !== filters.verb) {
        return false;
      }
      if (
        filters?.sourceEntityId &&
        relation.sourceEntityId !== filters.sourceEntityId
      ) {
        return false;
      }
      if (
        filters?.targetEntityId &&
        relation.targetEntityId !== filters.targetEntityId
      ) {
        return false;
      }
      return true;
    });
  }

  public getObservations(entityId: string): Observation[] {
    return this.entityService.getEntity(entityId)
      ? this.observationService.getObservations(entityId)
      : [];
  }

  public updateDescription(
    entityId: string,
    description: string
  ): KnowledgeEntity | null {
    const entity = this.getEntity(entityId);
    if (!entity) {
      return null;
    }

    if (entity.origin === 'manual') {
      if (!this.entityService.updateEntity(entity.id, { description })) {
        return null;
      }
    } else {
      if (!this.agentGraphService.setManualDescription(entity.id, description)) {
        return null;
      }
    }
    return this.getEntity(entityId);
  }

  public resetGeneratedDescription(entityId: string): KnowledgeEntity | null {
    const entity = this.getEntity(entityId);
    if (!entity || entity.origin !== 'agent') {
      return entity;
    }
    if (!this.agentGraphService.resetManualDescription(entity.id)) {
      return null;
    }
    return this.getEntity(entityId);
  }
}

export function entityIdentity(entity: Pick<Entity, 'name' | 'filePath'>): string {
  const normalizedPath = entity.filePath
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .toLocaleLowerCase();
  return `${normalizedPath}\u0000${entity.name.trim().toLocaleLowerCase()}`;
}

function relationIdentity(
  relation: Pick<Relation, 'sourceEntityId' | 'targetEntityId' | 'verb'>
): string {
  return `${relation.sourceEntityId}\u0000${relation.targetEntityId}\u0000${relation.verb}`;
}
