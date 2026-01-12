/**
 * 代码位置信息
 */
export interface CodeLocation {
  filePath: string;
  startLine: number;
  endLine: number;
}

/**
 * 实体类型
 */
export type EntityType = 
  | 'function'
  | 'class'
  | 'interface'
  | 'variable'
  | 'file'
  | 'directory'
  | 'api'
  | 'config'
  | 'database'
  | 'service'
  | 'component'
  | 'external'  // 外部模块的类/接口
  | 'other';

/**
 * 实体
 */
export interface Entity {
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
 * 关系动词类型
 */
export type RelationVerb = 
  | 'uses'
  | 'calls'
  | 'extends'
  | 'implements'
  | 'depends_on'
  | 'contains'
  | 'references'
  | 'imports'
  | 'exports';

/**
 * 关系
 */
export interface Relation {
  id: string;
  sourceEntityId: string;
  targetEntityId: string;
  verb: RelationVerb;
  createdAt: number;
  metadata?: Record<string, any>;
}

/**
 * 观察记录
 */
export interface Observation {
  id: string;
  entityId: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * 实体过滤器
 */
export interface EntityFilters {
  type?: EntityType;
  filePath?: string;
  name?: string;
}

/**
 * 搜索结果
 */
export interface SearchResult {
  entity: Entity;
  score: number;
  matchedFields: string[];
}

/**
 * 关联的实体信息
 */
export interface RelatedEntity {
  entity: Entity;
  relation: Relation;
  direction: 'incoming' | 'outgoing';
}

