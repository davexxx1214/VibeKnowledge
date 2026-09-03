import type {
  StructuralGraphDocument,
  StructuralGraphRelation,
} from './structural-extractor.mjs';

export interface CuratedStructuralHop {
  source: string;
  target: string;
  verb: StructuralGraphRelation['verb'];
  filePath: string;
  startLine: number;
  endLine: number;
  traversal?: 'forward' | 'reverse';
}

export interface CuratedEntity {
  key: string;
  name: string;
  type:
    | 'function'
    | 'class'
    | 'interface'
    | 'variable'
    | 'file'
    | 'api'
    | 'service'
    | 'component'
    | 'external';
  filePath: string;
  startLine: number;
  endLine: number;
  description?: string;
}

export interface CuratedRelation {
  source: string;
  target: string;
  verb:
    | 'imports'
    | 'exports'
    | 'contains'
    | 'extends'
    | 'implements'
    | 'calls'
    | 'references'
    | 'depends_on';
  origin: 'ast' | 'resolver' | 'agent';
  confidence: 'extracted' | 'inferred' | 'review_required';
  description?: string;
  evidence: Array<{
    filePath: string;
    startLine: number;
    endLine?: number;
    detail?: string;
  }>;
  structuralPath?: CuratedStructuralHop[];
}

export interface CuratedGroup {
  key: string;
  name: string;
  kind: 'framework' | 'module' | 'feature';
  order: number;
  description?: string;
  scope?: string;
  entities: CuratedEntity[];
  relations: CuratedRelation[];
}

export interface CuratedGraphDocument {
  version: 1;
  generatedAt: string;
  scope?: string;
  groups: CuratedGroup[];
}

export interface ConvergeOptions {
  kind?: 'framework' | 'module' | 'feature';
  scope?: string;
  key?: string;
  name?: string;
}

export function convergeStructuralGraph(
  structuralGraph: StructuralGraphDocument,
  options?: ConvergeOptions
): {
  group: CuratedGroup;
  statistics: {
    structuralEntities: number;
    structuralRelations: number;
    curatedEntities: number;
    curatedRelations: number;
    collapsedRelations: number;
  };
  warnings: string[];
};

export function mergeCuratedGroup(
  existingDocument: unknown,
  candidateGroup: CuratedGroup,
  options?: { generatedAt?: string }
): CuratedGraphDocument;

export function serializeCuratedGraph(document: CuratedGraphDocument): string;
