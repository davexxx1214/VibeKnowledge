export const STRUCTURAL_GRAPH_VERSION: 1;
export const STRUCTURAL_ENTITY_KINDS: readonly StructuralEntityKind[];
export const STRUCTURAL_RELATION_VERBS: readonly StructuralRelationVerb[];
export const STRUCTURAL_RELATION_ORIGINS: readonly StructuralRelationOrigin[];
export const STRUCTURAL_RELATION_CONFIDENCES: readonly StructuralRelationConfidence[];

export type StructuralEntityKind =
  | 'file'
  | 'class'
  | 'interface'
  | 'function'
  | 'method'
  | 'variable'
  | 'external';
export type StructuralRelationVerb =
  | 'imports'
  | 'exports'
  | 'contains'
  | 'extends'
  | 'implements'
  | 'calls'
  | 'references';
export type StructuralRelationOrigin = 'ast' | 'resolver';
export type StructuralRelationConfidence =
  | 'extracted'
  | 'inferred'
  | 'review_required';

export function validateStructuralGraphDocument(value: unknown): string[];
export function assertStructuralGraphDocument<T>(value: T): T;
