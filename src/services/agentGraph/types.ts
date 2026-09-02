import { Entity, EntityType, Relation, RelationVerb } from '../../utils/types';

export interface AgentGraphEvidence {
  filePath: string;
  startLine: number;
  endLine?: number;
  detail?: string;
}

export interface AgentGraphStructuralHop {
  source: string;
  target: string;
  verb: RelationVerb;
  filePath: string;
  startLine: number;
  endLine: number;
  traversal?: 'forward' | 'reverse';
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

export type AgentGraphRelationOrigin = 'ast' | 'resolver' | 'agent';
export type AgentGraphRelationConfidence =
  | 'extracted'
  | 'inferred'
  | 'review_required';

export interface AgentGraphRelationInput {
  source: string;
  target: string;
  verb: RelationVerb;
  description?: string;
  origin?: AgentGraphRelationOrigin;
  confidence?: AgentGraphRelationConfidence;
  evidence: AgentGraphEvidence[];
  structuralPath?: AgentGraphStructuralHop[];
}

export type AgentGraphGroupKind = 'framework' | 'module' | 'feature';

export interface AgentGraphGroupInput {
  key: string;
  name: string;
  kind: AgentGraphGroupKind;
  order: number;
  description?: string;
  scope?: string;
  entities: AgentGraphEntityInput[];
  relations: AgentGraphRelationInput[];
}

export interface AgentGraphDocument {
  version: 2;
  generatedAt: string;
  scope?: string;
  groups: AgentGraphGroupInput[];
}

export interface AgentEntity extends Entity {
  key: string;
  groupKey: string;
  groupName: string;
  groupKind: AgentGraphGroupKind;
  groupOrder: number;
}

export interface AgentRelation extends Relation {
  sourceKey: string;
  targetKey: string;
  groupKey: string;
  groupName: string;
  groupKind: AgentGraphGroupKind;
  groupOrder: number;
  extractionOrigin?: AgentGraphRelationOrigin;
  confidence?: AgentGraphRelationConfidence;
  structuralPath?: AgentGraphStructuralHop[];
}

export interface AgentGraphGroupSnapshot {
  key: string;
  name: string;
  kind: AgentGraphGroupKind;
  order: number;
  description?: string;
  scope?: string;
  entities: AgentEntity[];
  relations: AgentRelation[];
}

export interface AgentGraphSnapshot {
  generatedAt?: string;
  scope?: string;
  groups: AgentGraphGroupSnapshot[];
  entities: AgentEntity[];
  relations: AgentRelation[];
}

export interface AgentGraphStats {
  groupCount: number;
  entityCount: number;
  relationCount: number;
  generatedAt?: string;
  scope?: string;
  groups: Array<{
    key: string;
    name: string;
    kind: AgentGraphGroupKind;
    order: number;
    entityCount: number;
    relationCount: number;
  }>;
}
