import { DatabaseService } from '../database';
import { EntityType, RelationVerb } from '../../utils/types';
import { randomUUID } from 'crypto';
import {
  AutoEntity,
  AutoRelation,
  AutoObservation,
  FileCache,
  AutoEntityFilters,
  AutoRelationFilters,
  AutoGraphStats,
} from './types';

/**
 * 自动图谱服务
 * 管理自动生成的实体和关系，与手动图谱完全隔离
 */
export class AutoGraphService {
  constructor(private dbService: DatabaseService) {}

  // ============================================================
  // 实体操作
  // ============================================================

  /**
   * 创建或更新自动实体（幂等操作）
   */
  public upsertEntity(
    name: string,
    type: EntityType,
    filePath: string,
    startLine: number,
    endLine: number,
    description?: string,
    metadata?: Record<string, any>
  ): AutoEntity {
    const db = this.dbService.getDatabase();
    const now = Date.now();

    // 检查是否已存在相同实体
    const existingStmt = db.prepare(`
      SELECT id FROM auto_entities 
      WHERE file_path = ? AND name = ? AND type = ? AND start_line = ?
    `);
    existingStmt.bind([filePath, name, type, startLine]);

    let entityId: string;
    if (existingStmt.step()) {
      // 更新现有实体
      const row = existingStmt.getAsObject() as any;
      entityId = row.id;
      existingStmt.free();

      const updateStmt = db.prepare(`
        UPDATE auto_entities 
        SET end_line = ?, description = ?, updated_at = ?, metadata = ?
        WHERE id = ?
      `);
      updateStmt.run([
        endLine,
        description || null,
        now,
        metadata ? JSON.stringify(metadata) : null,
        entityId,
      ]);
    } else {
      existingStmt.free();
      // 创建新实体
      entityId = this.generateId();

      const insertStmt = db.prepare(`
        INSERT INTO auto_entities (
          id, name, type, file_path, start_line, end_line, 
          description, created_at, updated_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run([
        entityId,
        name,
        type,
        filePath,
        startLine,
        endLine,
        description || null,
        now,
        now,
        metadata ? JSON.stringify(metadata) : null,
      ]);
    }

    return {
      id: entityId,
      name,
      type,
      filePath,
      startLine,
      endLine,
      description,
      createdAt: now,
      updatedAt: now,
      metadata,
    };
  }

  /**
   * 获取单个自动实体
   */
  public getEntity(entityId: string): AutoEntity | null {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT * FROM auto_entities WHERE id = ?');
    stmt.bind([entityId]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToEntity(row);
    }

    stmt.free();
    return null;
  }

  /**
   * 通过名称查找实体
   * @param name 实体名称
   * @param filePath 可选的文件路径，如果不提供则在所有实体中搜索
   */
  public findEntityByName(name: string, filePath?: string): AutoEntity | null {
    const db = this.dbService.getDatabase();
    let query = 'SELECT * FROM auto_entities WHERE name = ?';
    const params: any[] = [name];

    if (filePath) {
      query += ' AND file_path = ?';
      params.push(filePath);
    }

    // 优先匹配精确路径，如果没有则取第一个匹配的
    query += ' ORDER BY file_path LIMIT 1';

    const stmt = db.prepare(query);
    stmt.bind(params);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToEntity(row);
    }

    stmt.free();
    return null;
  }

  /**
   * 通过名称查找所有匹配的实体
   */
  public findAllEntitiesByName(name: string): AutoEntity[] {
    const db = this.dbService.getDatabase();
    const query = 'SELECT * FROM auto_entities WHERE name = ?';
    
    const stmt = db.prepare(query);
    stmt.bind([name]);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * 列出自动实体（支持过滤）
   */
  public listEntities(filters?: AutoEntityFilters): AutoEntity[] {
    const db = this.dbService.getDatabase();
    let query = 'SELECT * FROM auto_entities WHERE 1=1';
    const params: any[] = [];

    if (filters?.type) {
      query += ' AND type = ?';
      params.push(filters.type);
    }

    if (filters?.filePath) {
      query += ' AND file_path = ?';
      params.push(filters.filePath);
    }

    if (filters?.name) {
      query += ' AND name LIKE ?';
      params.push(`%${filters.name}%`);
    }

    query += ' ORDER BY file_path, start_line';

    const stmt = db.prepare(query);
    stmt.bind(params);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map((row) => this.rowToEntity(row));
  }

  /**
   * 删除文件的所有自动实体
   */
  public deleteEntitiesByFile(filePath: string): number {
    const db = this.dbService.getDatabase();

    // 首先获取要删除的实体 ID（用于级联删除关系）
    const countStmt = db.prepare(
      'SELECT COUNT(*) as count FROM auto_entities WHERE file_path = ?'
    );
    countStmt.bind([filePath]);
    let count = 0;
    if (countStmt.step()) {
      count = (countStmt.getAsObject() as any).count;
    }
    countStmt.free();

    // 删除实体（关系会通过外键级联删除）
    const deleteStmt = db.prepare('DELETE FROM auto_entities WHERE file_path = ?');
    deleteStmt.run([filePath]);

    return count;
  }

  /**
   * 删除单个实体
   */
  public deleteEntityById(entityId: string): boolean {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('DELETE FROM auto_entities WHERE id = ?');
    stmt.run([entityId]);
    return db.getRowsModified() > 0;
  }

  /**
   * 生成实体唯一键（用于增量更新比较）
   */
  public static generateEntityKey(name: string, type: EntityType, filePath: string): string {
    return `${filePath}::${type}::${name}`;
  }

  /**
   * 获取所有实体的 Map（按唯一键索引）
   */
  public getAllEntitiesMap(): Map<string, AutoEntity> {
    const entities = this.listEntities();
    const map = new Map<string, AutoEntity>();
    for (const entity of entities) {
      const key = AutoGraphService.generateEntityKey(entity.name, entity.type, entity.filePath);
      map.set(key, entity);
    }
    return map;
  }

  /**
   * 迁移观察记录到新实体
   */
  public migrateObservations(oldEntityId: string, newEntityId: string): number {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(`
      UPDATE auto_observations SET entity_id = ? WHERE entity_id = ?
    `);
    stmt.run([newEntityId, oldEntityId]);
    return db.getRowsModified();
  }

  /**
   * 清空所有自动实体
   */
  public clearAllEntities(): void {
    const db = this.dbService.getDatabase();
    db.run('DELETE FROM auto_entities');
  }

  // ============================================================
  // 关系操作
  // ============================================================

  /**
   * 创建或更新自动关系（幂等操作）
   */
  public upsertRelation(
    sourceEntityId: string,
    targetEntityId: string,
    verb: RelationVerb,
    metadata?: Record<string, any>
  ): AutoRelation | null {
    const db = this.dbService.getDatabase();
    const now = Date.now();

    // 验证源和目标实体都存在
    const sourceExists = this.getEntity(sourceEntityId);
    const targetExists = this.getEntity(targetEntityId);

    if (!sourceExists || !targetExists) {
      console.warn(
        `Cannot create relation: source or target entity not found. Source: ${sourceEntityId}, Target: ${targetEntityId}`
      );
      return null;
    }

    // 检查是否已存在相同关系
    const existingStmt = db.prepare(`
      SELECT id FROM auto_relations 
      WHERE source_entity_id = ? AND target_entity_id = ? AND verb = ?
    `);
    existingStmt.bind([sourceEntityId, targetEntityId, verb]);

    let relationId: string;
    if (existingStmt.step()) {
      // 已存在，返回现有关系
      const row = existingStmt.getAsObject() as any;
      relationId = row.id;
      existingStmt.free();
    } else {
      existingStmt.free();
      // 创建新关系
      relationId = this.generateId();

      const insertStmt = db.prepare(`
        INSERT INTO auto_relations (
          id, source_entity_id, target_entity_id, verb, created_at, metadata
        ) VALUES (?, ?, ?, ?, ?, ?)
      `);
      insertStmt.run([
        relationId,
        sourceEntityId,
        targetEntityId,
        verb,
        now,
        metadata ? JSON.stringify(metadata) : null,
      ]);
    }

    return {
      id: relationId,
      sourceEntityId,
      targetEntityId,
      verb,
      createdAt: now,
      metadata,
    };
  }

  /**
   * 列出自动关系（支持过滤）
   */
  public listRelations(filters?: AutoRelationFilters): AutoRelation[] {
    const db = this.dbService.getDatabase();
    let query = 'SELECT * FROM auto_relations WHERE 1=1';
    const params: any[] = [];

    if (filters?.verb) {
      query += ' AND verb = ?';
      params.push(filters.verb);
    }

    if (filters?.sourceEntityId) {
      query += ' AND source_entity_id = ?';
      params.push(filters.sourceEntityId);
    }

    if (filters?.targetEntityId) {
      query += ' AND target_entity_id = ?';
      params.push(filters.targetEntityId);
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    stmt.bind(params);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map((row) => this.rowToRelation(row));
  }

  /**
   * 获取实体的所有关系
   */
  public getRelationsByEntity(
    entityId: string,
    direction?: 'outgoing' | 'incoming'
  ): AutoRelation[] {
    const db = this.dbService.getDatabase();
    let query = 'SELECT * FROM auto_relations WHERE ';

    if (direction === 'outgoing') {
      query += 'source_entity_id = ?';
    } else if (direction === 'incoming') {
      query += 'target_entity_id = ?';
    } else {
      query += '(source_entity_id = ? OR target_entity_id = ?)';
    }

    const stmt = db.prepare(query);
    const params = direction ? [entityId] : [entityId, entityId];
    stmt.bind(params);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map((row) => this.rowToRelation(row));
  }

  /**
   * 清空所有自动关系
   */
  public clearAllRelations(): void {
    const db = this.dbService.getDatabase();
    db.run('DELETE FROM auto_relations');
  }

  // ============================================================
  // 观察记录操作
  // ============================================================

  /**
   * 添加观察记录
   */
  public addObservation(entityId: string, content: string): AutoObservation | null {
    const db = this.dbService.getDatabase();
    const now = Date.now();

    // 验证实体存在
    const entity = this.getEntity(entityId);
    if (!entity) {
      console.warn(`Cannot add observation: entity not found. EntityId: ${entityId}`);
      return null;
    }

    const observationId = this.generateId();

    const stmt = db.prepare(`
      INSERT INTO auto_observations (id, entity_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run([observationId, entityId, content, now, now]);

    return {
      id: observationId,
      entityId,
      content,
      createdAt: now,
      updatedAt: now,
    };
  }

  /**
   * 获取实体的所有观察记录
   */
  public getObservationsByEntity(entityId: string): AutoObservation[] {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(
      'SELECT * FROM auto_observations WHERE entity_id = ? ORDER BY created_at DESC'
    );
    stmt.bind([entityId]);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map((row) => this.rowToObservation(row));
  }

  /**
   * 获取单个观察记录
   */
  public getObservation(observationId: string): AutoObservation | null {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT * FROM auto_observations WHERE id = ?');
    stmt.bind([observationId]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToObservation(row);
    }

    stmt.free();
    return null;
  }

  /**
   * 更新观察记录
   */
  public updateObservation(observationId: string, content: string): AutoObservation | null {
    const db = this.dbService.getDatabase();
    const now = Date.now();

    const existing = this.getObservation(observationId);
    if (!existing) {
      return null;
    }

    const stmt = db.prepare(`
      UPDATE auto_observations SET content = ?, updated_at = ? WHERE id = ?
    `);
    stmt.run([content, now, observationId]);

    return {
      ...existing,
      content,
      updatedAt: now,
    };
  }

  /**
   * 删除观察记录
   */
  public deleteObservation(observationId: string): boolean {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('DELETE FROM auto_observations WHERE id = ?');
    stmt.run([observationId]);
    return db.getRowsModified() > 0;
  }

  /**
   * 获取所有观察记录
   */
  public listAllObservations(): AutoObservation[] {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT * FROM auto_observations ORDER BY created_at DESC');

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map((row) => this.rowToObservation(row));
  }

  /**
   * 清空所有观察记录
   */
  public clearAllObservations(): void {
    const db = this.dbService.getDatabase();
    db.run('DELETE FROM auto_observations');
  }

  // ============================================================
  // 文件缓存操作
  // ============================================================

  /**
   * 更新文件缓存
   */
  public updateFileCache(filePath: string, contentHash: string): void {
    const db = this.dbService.getDatabase();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT OR REPLACE INTO auto_file_cache (file_path, content_hash, analyzed_at)
      VALUES (?, ?, ?)
    `);
    stmt.run([filePath, contentHash, now]);
  }

  /**
   * 获取文件缓存
   */
  public getFileCache(filePath: string): FileCache | null {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT * FROM auto_file_cache WHERE file_path = ?');
    stmt.bind([filePath]);

    if (stmt.step()) {
      const row = stmt.getAsObject() as any;
      stmt.free();
      return {
        filePath: row.file_path,
        contentHash: row.content_hash,
        analyzedAt: row.analyzed_at,
      };
    }

    stmt.free();
    return null;
  }

  /**
   * 删除文件缓存
   */
  public deleteFileCache(filePath: string): void {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('DELETE FROM auto_file_cache WHERE file_path = ?');
    stmt.run([filePath]);
  }

  /**
   * 清空所有文件缓存
   */
  public clearAllFileCache(): void {
    const db = this.dbService.getDatabase();
    db.run('DELETE FROM auto_file_cache');
  }

  // ============================================================
  // 统计和工具方法
  // ============================================================

  /**
   * 获取自动图谱统计信息
   */
  public getStats(): AutoGraphStats {
    const db = this.dbService.getDatabase();

    // 实体总数
    const entityCountStmt = db.prepare('SELECT COUNT(*) as count FROM auto_entities');
    entityCountStmt.step();
    const entityCount = (entityCountStmt.getAsObject() as any).count;
    entityCountStmt.free();

    // 关系总数
    const relationCountStmt = db.prepare('SELECT COUNT(*) as count FROM auto_relations');
    relationCountStmt.step();
    const relationCount = (relationCountStmt.getAsObject() as any).count;
    relationCountStmt.free();

    // 文件数
    const fileCountStmt = db.prepare(
      'SELECT COUNT(DISTINCT file_path) as count FROM auto_entities'
    );
    fileCountStmt.step();
    const fileCount = (fileCountStmt.getAsObject() as any).count;
    fileCountStmt.free();

    // 最后分析时间
    const lastAnalyzedStmt = db.prepare(
      'SELECT MAX(analyzed_at) as last FROM auto_file_cache'
    );
    lastAnalyzedStmt.step();
    const lastAnalyzedAt = (lastAnalyzedStmt.getAsObject() as any).last || undefined;
    lastAnalyzedStmt.free();

    // 按类型分组的实体数
    const entitiesByType: Record<string, number> = {};
    const typeStmt = db.prepare(
      'SELECT type, COUNT(*) as count FROM auto_entities GROUP BY type'
    );
    while (typeStmt.step()) {
      const row = typeStmt.getAsObject() as any;
      entitiesByType[row.type] = row.count;
    }
    typeStmt.free();

    // 按动词分组的关系数
    const relationsByVerb: Record<string, number> = {};
    const verbStmt = db.prepare(
      'SELECT verb, COUNT(*) as count FROM auto_relations GROUP BY verb'
    );
    while (verbStmt.step()) {
      const row = verbStmt.getAsObject() as any;
      relationsByVerb[row.verb] = row.count;
    }
    verbStmt.free();

    return {
      entityCount,
      relationCount,
      fileCount,
      lastAnalyzedAt,
      entitiesByType,
      relationsByVerb,
    };
  }

  /**
   * 清空整个自动图谱（保留观察记录）
   */
  public clearAll(): void {
    this.dbService.transaction(() => {
      this.clearAllRelations();
      this.clearAllEntities();
      this.clearAllFileCache();
      // 注意：不清除观察记录，因为它们是用户手动添加的
    });
    this.dbService.save();
  }

  /**
   * 清空整个自动图谱（包括观察记录）
   */
  public clearAllIncludingObservations(): void {
    this.dbService.transaction(() => {
      this.clearAllObservations();
      this.clearAllRelations();
      this.clearAllEntities();
      this.clearAllFileCache();
    });
    this.dbService.save();
  }

  /**
   * 保存数据库
   */
  public save(): void {
    this.dbService.save();
  }

  /**
   * 执行事务
   */
  public transaction<T>(fn: () => T): T {
    return this.dbService.transaction(fn);
  }

  // ============================================================
  // 私有方法
  // ============================================================

  private rowToEntity(row: any): AutoEntity {
    return {
      id: row.id,
      name: row.name,
      type: row.type as EntityType,
      filePath: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      description: row.description,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private rowToRelation(row: any): AutoRelation {
    return {
      id: row.id,
      sourceEntityId: row.source_entity_id,
      targetEntityId: row.target_entity_id,
      verb: row.verb as RelationVerb,
      createdAt: row.created_at,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
    };
  }

  private rowToObservation(row: any): AutoObservation {
    return {
      id: row.id,
      entityId: row.entity_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  private generateId(): string {
    return randomUUID();
  }
}

