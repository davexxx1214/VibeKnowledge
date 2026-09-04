import type {
  AgentEntity,
  AgentGraphGroupKind,
  AgentGraphService,
} from './agentGraph';
import type {
  Entity,
  EntityFilters,
  Observation,
  Relation,
  RelationVerb,
} from '../utils/types';
import { normalizeEntityIdentity } from '../../resources/skills/vibeknowledge-dependency-graph/scripts/canonicalize-entity-key.mjs';

export type KnowledgeGraphOrigin = 'agent';

export interface KnowledgeEntity extends Entity {
  origin: KnowledgeGraphOrigin;
  agentKey?: string;
}

export interface KnowledgeRelation extends Relation {
  origin: KnowledgeGraphOrigin;
}

export interface KnowledgeRelatedEntity {
  entity: KnowledgeEntity;
  relation: KnowledgeRelation;
  direction: 'incoming' | 'outgoing';
}

export interface KnowledgeGraphSnapshot {
  entities: KnowledgeEntity[];
  relations: KnowledgeRelation[];
}

export type KnowledgeGraphGroupKind = AgentGraphGroupKind;

export interface KnowledgeGraphGroup extends KnowledgeGraphSnapshot {
  key: string;
  name: string;
  kind: KnowledgeGraphGroupKind;
  order: number;
  description?: string;
  scope?: string;
}

/**
 * The single product-level Knowledge Graph.
 *
 * Agent output is the only structural source. SQLite stores human description
 * overrides, which AgentGraphService reapplies by stable symbol key. The
 * aggregate snapshot de-duplicates symbols repeated across independent groups;
 * getGroups() intentionally retains those occurrences for visualization.
 */
export class KnowledgeGraphService {
  constructor(private readonly agentGraphService: AgentGraphService) {}

  public refresh(): void {
    this.agentGraphService.refresh();
  }

  public getGenerationError(): Error | undefined {
    return this.agentGraphService.getLastError();
  }

  public getSnapshot(): KnowledgeGraphSnapshot {
    const agentEntities = this.agentGraphService.listEntities();
    const finalEntityByKey = new Map<string, KnowledgeEntity>();
    const finalIdByAgentId = new Map<string, string>();
    const entities: KnowledgeEntity[] = [];

    for (const agentEntity of agentEntities) {
      const identityKey = normalizeEntityIdentity(agentEntity.key);
      const existing = finalEntityByKey.get(identityKey);
      if (existing) {
        finalIdByAgentId.set(agentEntity.id, existing.id);
        continue;
      }
      const entity = this.toKnowledgeEntity(agentEntity);
      entities.push(entity);
      finalEntityByKey.set(identityKey, entity);
      finalIdByAgentId.set(agentEntity.id, entity.id);
    }

    const relations: KnowledgeRelation[] = [];
    const relationKeys = new Set<string>();

    for (const relation of this.agentGraphService.listRelations()) {
      const sourceEntityId = finalIdByAgentId.get(relation.sourceEntityId);
      const targetEntityId = finalIdByAgentId.get(relation.targetEntityId);
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
      if (
        filters?.filePath &&
        normalizeKnowledgeFilePath(entity.filePath) !==
          normalizeKnowledgeFilePath(filters.filePath)
      ) {
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

  public getEntitiesByFile(filePath: string): KnowledgeEntity[] {
    return this.listEntities({ filePath });
  }

  /**
   * Return independent graphs for visualization. Agent groups intentionally
   * retain duplicate symbols across modules/features; the aggregate snapshot
   * continues to de-duplicate them for search, CodeLens, and exports.
   */
  public getGroups(): KnowledgeGraphGroup[] {
    const agentGroups = this.agentGraphService.listGroups();
    return agentGroups.map((group) => ({
      key: group.key,
      name: group.name,
      kind: group.kind,
      order: group.order,
      description: group.description,
      scope: group.scope,
      entities: group.entities.map((agentEntity) =>
        this.toKnowledgeEntity(agentEntity)
      ),
      relations: group.relations.map((relation) => ({
        ...relation,
        metadata: {
          ...(relation.metadata || {}),
          knowledgeOrigin: 'agent',
        },
        origin: 'agent' as const,
      })),
    }));
  }

  public findEntityAtLocation(
    filePath: string,
    line: number
  ): KnowledgeEntity | null {
    return (
      this.getEntitiesByFile(filePath)
        .filter(
          (entity) => entity.startLine <= line && entity.endLine >= line
        )
        .sort((left, right) => {
          const leftSpan = left.endLine - left.startLine;
          const rightSpan = right.endLine - right.startLine;
          return leftSpan - rightSpan || right.startLine - left.startLine;
        })[0] || null
    );
  }

  public getEntity(entityId: string): KnowledgeEntity | null {
    const aggregateEntity = this.getSnapshot().entities.find(
      (entity) => entity.id === entityId
    );
    if (aggregateEntity) {
      return aggregateEntity;
    }
    for (const group of this.getGroups()) {
      const entity = group.entities.find((candidate) => candidate.id === entityId);
      if (entity) {
        return entity;
      }
    }
    return null;
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

  public getRelatedEntities(entityId: string): KnowledgeRelatedEntity[] {
    const snapshot = this.getSnapshot();
    const entitiesById = new Map(
      snapshot.entities.map((entity) => [entity.id, entity])
    );

    return snapshot.relations.flatMap((relation) => {
      if (relation.sourceEntityId === entityId) {
        const entity = entitiesById.get(relation.targetEntityId);
        return entity
          ? [{ entity, relation, direction: 'outgoing' as const }]
          : [];
      }
      if (relation.targetEntityId === entityId) {
        const entity = entitiesById.get(relation.sourceEntityId);
        return entity
          ? [{ entity, relation, direction: 'incoming' as const }]
          : [];
      }
      return [];
    });
  }

  public getObservations(entityId: string): Observation[] {
    void entityId;
    return [];
  }

  public updateDescription(
    entityId: string,
    description: string
  ): KnowledgeEntity | null {
    const entity = this.getEntity(entityId);
    if (!entity) {
      return null;
    }

    if (!this.agentGraphService.setManualDescription(entity.id, description)) {
      return null;
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

  private toKnowledgeEntity(agentEntity: AgentEntity): KnowledgeEntity {
    return {
      ...agentEntity,
      metadata: {
        ...(agentEntity.metadata || {}),
        knowledgeOrigin: 'agent',
      },
      origin: 'agent',
      agentKey: agentEntity.key,
    };
  }
}

export function normalizeKnowledgeFilePath(filePath: string): string {
  return normalizeEntityIdentity(filePath);
}

function relationIdentity(
  relation: Pick<Relation, 'sourceEntityId' | 'targetEntityId' | 'verb'>
): string {
  return `${relation.sourceEntityId}\u0000${relation.targetEntityId}\u0000${relation.verb}`;
}
