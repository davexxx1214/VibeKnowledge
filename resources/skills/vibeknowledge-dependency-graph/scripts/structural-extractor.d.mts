export interface StructuralExtractionOptions {
  workspaceRoot: string;
  scope?: string;
  tsconfigPath?: string;
  generatedAt?: string;
}

export interface StructuralUpdateOptions extends StructuralExtractionOptions {
  outputPath?: string;
  cacheDirectory?: string;
  force?: boolean;
}

export interface StructuralUpdateStatistics {
  scannedFiles: number;
  parsedFiles: number;
  reusedFiles: number;
  resolvedFiles: number;
  deletedFiles: number;
  cacheMode: 'incremental' | 'rebuild';
}

export interface StructuralCacheIndex {
  version: 1;
  schemaVersion: 1;
  extractorVersion: number;
  scope: string;
  configurationHash: string;
  generatedAt: string;
  files: Array<{
    filePath: string;
    contentHash: string;
    cacheKey: string;
  }>;
}

export interface StructuralUpdateResult {
  graph: StructuralGraphDocument;
  statistics: StructuralUpdateStatistics;
  cacheIndex: StructuralCacheIndex;
}

export interface StructuralGraphFile {
  filePath: string;
  language: 'typescript' | 'typescriptreact' | 'javascript' | 'javascriptreact';
  contentHash: string;
}

export interface StructuralGraphEntity {
  key: string;
  name: string;
  kind: 'file' | 'class' | 'interface' | 'function' | 'method' | 'variable' | 'external';
  filePath: string;
  startLine: number;
  endLine: number;
  exported?: boolean;
  containerKey?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuralGraphRelation {
  source: string;
  target: string;
  verb: 'imports' | 'exports' | 'contains' | 'extends' | 'implements' | 'calls' | 'references';
  origin: 'ast' | 'resolver';
  confidence: 'extracted' | 'inferred' | 'review_required';
  location: { filePath: string; startLine: number; endLine: number };
  detail?: string;
  metadata?: Record<string, unknown>;
}

export interface StructuralGraphDiagnostic {
  filePath?: string;
  code: string;
  category: 'warning' | 'error';
  message: string;
  startLine?: number;
  endLine?: number;
}

export interface StructuralGraphDocument {
  version: 1;
  generatedAt: string;
  scope: string;
  extractor: {
    name: 'typescript-compiler-api';
    version: number;
    typescriptVersion: string;
  };
  files: StructuralGraphFile[];
  entities: StructuralGraphEntity[];
  relations: StructuralGraphRelation[];
  diagnostics: StructuralGraphDiagnostic[];
}

export const TYPESCRIPT_STRUCTURAL_EXTRACTOR_VERSION: number;
export const STRUCTURAL_CACHE_VERSION: number;

export class StructuralGraphRecoveryRequiredError extends Error {
  readonly code: 'STRUCTURAL_GRAPH_RECOVERY_REQUIRED';
  readonly reason: string;
}

export class TypeScriptStructuralAdapter {
  readonly id: 'typescript-compiler-api';
  readonly extensions: readonly string[];
  extract(options: StructuralExtractionOptions): StructuralGraphDocument;
}

export function extractStructuralGraph(
  options: StructuralExtractionOptions
): StructuralGraphDocument;
export function updateStructuralGraph(
  options: StructuralUpdateOptions
): StructuralUpdateResult;
export function createStructuralCacheKey(
  filePath: string,
  contentHash: string
): string;
export function writeStructuralGraphAtomically(
  document: StructuralGraphDocument,
  outputPath: string
): void;
export function serializeStructuralGraph(
  document: StructuralGraphDocument
): string;
