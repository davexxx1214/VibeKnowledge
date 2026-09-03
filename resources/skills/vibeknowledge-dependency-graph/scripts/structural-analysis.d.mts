import type {
  StructuralGraphDocument,
  StructuralGraphEntity,
  StructuralGraphRelation,
} from './structural-extractor.mjs';

export type StructuralDirection = 'upstream' | 'downstream' | 'both';
export type StructuralAggregationLevel = 'boundary' | 'file' | 'community';
export interface StructuralAnalysisOptions {
  relationVerbs?: string[];
  limit?: number;
  minimumSize?: number;
  maximumIterations?: number;
  baseline?: StructuralGraphDocument;
}
export interface StructuralCycle {
  id: string;
  entityKeys: string[];
  entities: StructuralGraphEntity[];
  relations: StructuralGraphRelation[];
  boundaries: string[];
}
export interface StructuralImpactSlice {
  entities: Array<StructuralGraphEntity & { depth: number }>;
  relations: StructuralGraphRelation[];
}
export interface StructuralImpactResult {
  seed: StructuralGraphEntity;
  direction: StructuralDirection;
  maxDepth: number;
  upstream: StructuralImpactSlice;
  downstream: StructuralImpactSlice;
}
export interface StructuralPathResult {
  source: StructuralGraphEntity;
  target: StructuralGraphEntity;
  found: boolean;
  steps: Array<{
    from: string;
    to: string;
    traversal: 'forward' | 'reverse';
    relation: StructuralGraphRelation;
  }>;
}
export interface StructuralCouplingRecord {
  key: string;
  name: string;
  kind: StructuralGraphEntity['kind'];
  filePath: string;
  startLine: number;
  boundary: string;
  incoming: number;
  outgoing: number;
  crossBoundary: number;
  total: number;
  score: number;
}
export interface StructuralBoundaryConnection {
  sourceBoundary: string;
  targetBoundary: string;
  count: number;
  verbs: Record<string, number>;
  relations: StructuralGraphRelation[];
}
export interface StructuralCommunitySuggestion {
  id: string;
  suggestedKey: string;
  suggestedName: string;
  scope: string;
  files: string[];
  boundaries: string[];
  relationCount: number;
}
export interface StructuralGraphDiff {
  available: boolean;
  baselineGeneratedAt?: string;
  currentGeneratedAt?: string;
  addedEntities: StructuralGraphEntity[];
  removedEntities: StructuralGraphEntity[];
  changedEntities: Array<{ before: StructuralGraphEntity; after: StructuralGraphEntity }>;
  addedRelations: StructuralGraphRelation[];
  removedRelations: StructuralGraphRelation[];
  changedRelations: Array<{ before: StructuralGraphRelation[]; after: StructuralGraphRelation[] }>;
}
export interface StructuralAggregate {
  level: StructuralAggregationLevel;
  truncated: boolean;
  totalNodeCount: number;
  nodes: Array<{
    id: string;
    name: string;
    entityCount: number;
    files: string[];
    rawKeys: string[];
  }>;
  relations: Array<{
    source: string;
    target: string;
    verb: StructuralGraphRelation['verb'];
    count: number;
    relations: StructuralGraphRelation[];
  }>;
}
export function resolveStructuralEntity(graph: StructuralGraphDocument, selector: string): StructuralGraphEntity | undefined;
export function findStructuralCycles(graph: StructuralGraphDocument, options?: StructuralAnalysisOptions): StructuralCycle[];
export function analyzeStructuralImpact(graph: StructuralGraphDocument, selector: string, options?: StructuralAnalysisOptions & { direction?: StructuralDirection; maxDepth?: number }): StructuralImpactResult;
export function findStructuralPath(graph: StructuralGraphDocument, sourceSelector: string, targetSelector: string, options?: StructuralAnalysisOptions & { direction?: 'outgoing' | 'both'; maxDepth?: number }): StructuralPathResult;
export function reportStructuralCoupling(graph: StructuralGraphDocument, options?: StructuralAnalysisOptions): StructuralCouplingRecord[];
export function reportCrossBoundaryConnections(graph: StructuralGraphDocument, options?: StructuralAnalysisOptions): StructuralBoundaryConnection[];
export function suggestStructuralCommunities(graph: StructuralGraphDocument, options?: StructuralAnalysisOptions): StructuralCommunitySuggestion[];
export function diffStructuralGraphs(current: StructuralGraphDocument, baseline?: StructuralGraphDocument): StructuralGraphDiff;
export function aggregateStructuralGraph(graph: StructuralGraphDocument, options?: StructuralAnalysisOptions & { level?: StructuralAggregationLevel }): StructuralAggregate;
export function analyzeStructuralGraph(graph: StructuralGraphDocument, options?: StructuralAnalysisOptions): { generatedAt: string; scope: string; cycles: StructuralCycle[]; coupling: StructuralCouplingRecord[]; crossBoundary: StructuralBoundaryConnection[]; communities: StructuralCommunitySuggestion[]; diff: StructuralGraphDiff };
export function boundaryForEntity(entity: StructuralGraphEntity): string;
export function boundaryForPath(filePath: string): string;
