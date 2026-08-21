import { Entity, EntityType, Relation, RelationVerb } from '../../utils/types';

export interface AgentGraphEvidence {
  filePath: string;
  startLine: number;
  endLine?: number;
  detail?: string;
}

export interface AgentGraphEntityInput {
  key: string;
  name: string;
  type: EntityType;
  filePath: string;
  startLine: number;
  endLine: number;
  description?: string;
}

export interface AgentGraphRelationInput {
  source: string;
  target: string;
  verb: RelationVerb;
  description?: string;
  evidence: AgentGraphEvidence[];
}

export interface AgentGraphDocument {
  version: 1;
  generatedAt: string;
  scope?: string;
  entities: AgentGraphEntityInput[];
  relations: AgentGraphRelationInput[];
}

export interface AgentEntity extends Entity {
  key: string;
}

export interface AgentRelation extends Relation {
  sourceKey: string;
  targetKey: string;
}

export interface AgentGraphSnapshot {
  generatedAt?: string;
  scope?: string;
  entities: AgentEntity[];
  relations: AgentRelation[];
}

export interface AgentGraphStats {
  entityCount: number;
  relationCount: number;
  generatedAt?: string;
  scope?: string;
}
