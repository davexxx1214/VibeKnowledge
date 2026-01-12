/**
 * 自动图谱类型定义
 * 与手动图谱类型分离，但保持兼容
 */

import { EntityType, RelationVerb } from '../../utils/types';

/**
 * 自动生成的实体
 */
export interface AutoEntity {
  id: string;
  name: string;
  type: EntityType;
  filePath: string;
  startLine: number;
  endLine: number;
  description?: string;
  createdAt: number;
  updatedAt: number;
  metadata?: Record<string, any>;
}

/**
 * 自动生成的关系
 */
export interface AutoRelation {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  verb: RelationVerb;
  createdAt: number;
  metadata?: Record<string, any>;
}

/**
 * 自动图谱的观察记录
 */
export interface AutoObservation {
  id: string;
  entityId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 文件分析缓存
 */
export interface FileCache {
  filePath: string;
  contentHash: string;
  analyzedAt: number;
}

/**
 * 自动实体过滤器
 */
export interface AutoEntityFilters {
  type?: EntityType;
  filePath?: string;
  name?: string;
}

/**
 * 自动关系过滤器
 */
export interface AutoRelationFilters {
  verb?: RelationVerb;
  sourceEntityId?: string;
  targetEntityId?: string;
}

/**
 * 分析结果
 */
export interface AnalysisResult {
  entities: AutoEntity[];
  relations: AutoRelation[];
  filesCached: number;
  errors: AnalysisError[];
}

/**
 * 分析错误
 */
export interface AnalysisError {
  filePath: string;
  message: string;
  line?: number;
}

/**
 * 分析进度回调
 */
export interface AnalysisProgress {
  current: number;
  total: number;
  currentFile: string;
  message: string;
}

/**
 * 图谱统计信息
 */
export interface AutoGraphStats {
  entityCount: number;
  relationCount: number;
  fileCount: number;
  lastAnalyzedAt?: number;
  entitiesByType: Record<string, number>;
  relationsByVerb: Record<string, number>;
}

/**
 * 提取的符号信息（用于代码分析中间结果）
 */
export interface ExtractedSymbol {
  name: string;
  type: EntityType;
  filePath: string;
  startLine: number;
  endLine: number;
  description?: string;
  metadata?: Record<string, any>;
}

/**
 * 提取的关系信息（用于代码分析中间结果）
 */
export interface ExtractedRelation {
  sourceName: string;
  sourceFilePath: string;
  targetName: string;
  targetFilePath?: string;  // 可能是外部依赖
  verb: RelationVerb;
  metadata?: Record<string, any>;
}

/**
 * 文件分析结果
 */
export interface FileAnalysisResult {
  filePath: string;
  symbols: ExtractedSymbol[];
  relations: ExtractedRelation[];
  imports: ImportInfo[];
  exports: ExportInfo[];
}

/**
 * Import 信息
 */
export interface ImportInfo {
  moduleName: string;
  importedNames: string[];
  isDefault: boolean;
  isNamespace: boolean;
  line: number;
}

/**
 * Export 信息
 */
export interface ExportInfo {
  exportedName: string;
  localName?: string;
  isDefault: boolean;
  line: number;
}


