import { DatabaseService } from './database';
import { Entity, EntityType, EntityFilters, CodeLocation } from '../utils/types';
import { randomUUID } from 'crypto';

/**
 * 实体管理服务
 */
export class EntityService {
  constructor(private dbService: DatabaseService) { }

  /**
   * 创建实体
   */
  public createEntity(
    name: string,
    type: EntityType,
    location: CodeLocation,
    description?: string,
    metadata?: Record<string, any>
  ): Entity {
    const db = this.dbService.getDatabase();
    const now = Date.now();

    // Check for duplicate entity name
    const checkStmt = db.prepare('SELECT id FROM entities WHERE name = ?');
    checkStmt.bind([name]);
    if (checkStmt.step()) {
      checkStmt.free();
      throw new Error(`Entity with name "${name}" already exists`);
    }
    checkStmt.free();

    const entity: Entity = {
      id: this.generateId(),
      name,
      type,
      filePath: location.filePath,
      startLine: location.startLine,
      endLine: location.endLine,
      description,
      createdAt: now,
      updatedAt: now,
      metadata,
    };

    const stmt = db.prepare(`
      INSERT INTO entities (
        id, name, type, file_path, start_line, end_line, 
        description, created_at, updated_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      entity.id,
      entity.name,
      entity.type,
      entity.filePath,
      entity.startLine,
      entity.endLine,
      entity.description || null,
      entity.createdAt,
      entity.updatedAt,
      entity.metadata ? JSON.stringify(entity.metadata) : null
    ]);

    console.log('Entity created in database:', entity.name);
    this.dbService.save(); // 保存到文件

    // 验证是否成功保存
    const count = this.getEntityCount();
    console.log('Total entities in database:', count);

    return entity;
  }

  /**
   * 更新实体
   */
  public updateEntity(entityId: string, updates: Partial<Entity>): Entity | null {
    const db = this.dbService.getDatabase();
    const existing = this.getEntity(entityId);

    if (!existing) {
      return null;
    }

    const updated: Entity = {
      ...existing,
      ...updates,
      id: entityId, // 确保 ID 不被修改
      updatedAt: Date.now(),
    };

    const stmt = db.prepare(`
      UPDATE entities 
      SET name = ?, type = ?, file_path = ?, start_line = ?, end_line = ?,
          description = ?, updated_at = ?, metadata = ?
      WHERE id = ?
    `);

    stmt.run([
      updated.name,
      updated.type,
      updated.filePath,
      updated.startLine,
      updated.endLine,
      updated.description || null,
      updated.updatedAt,
      updated.metadata ? JSON.stringify(updated.metadata) : null,
      entityId
    ]);

    this.dbService.save(); // 保存到文件
    return updated;
  }

  /**
   * 删除实体
   */
  public deleteEntity(entityId: string): boolean {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('DELETE FROM entities WHERE id = ?');
    stmt.run([entityId]);
    this.dbService.save(); // 保存到文件
    return true;
  }

  /**
   * 获取单个实体
   */
  public getEntity(entityId: string): Entity | null {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT * FROM entities WHERE id = ?');
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
   * 列出实体（支持过滤）
   */
  public listEntities(filters?: EntityFilters): Entity[] {
    const db = this.dbService.getDatabase();
    let query = 'SELECT * FROM entities WHERE 1=1';
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

    query += ' ORDER BY created_at DESC';

    console.log('Querying entities with filters:', filters);
    const stmt = db.prepare(query);
    stmt.bind(params);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    console.log('Found entities:', rows.length);
    return rows.map(row => this.rowToEntity(row));
  }

  /**
   * 通过文件路径获取实体
   */
  public getEntitiesByFile(filePath: string): Entity[] {
    return this.listEntities({ filePath });
  }

  /**
   * 通过类型获取实体
   */
  public getEntitiesByType(type: EntityType): Entity[] {
    return this.listEntities({ type });
  }

  /**
   * 在指定位置查找实体
   */
  public findEntityAtLocation(filePath: string, line: number): Entity | null {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM entities 
      WHERE file_path = ? 
        AND start_line <= ? 
        AND end_line >= ?
      ORDER BY (end_line - start_line) ASC
      LIMIT 1
    `);

    stmt.bind([filePath, line, line]);

    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return this.rowToEntity(row);
    }

    stmt.free();
    return null;
  }

  /**
   * 获取所有实体数量
   */
  public getEntityCount(): number {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM entities');

    if (stmt.step()) {
      const result = stmt.getAsObject() as any;
      stmt.free();
      return result.count;
    }

    stmt.free();
    return 0;
  }

  /**
   * 将数据库行转换为 Entity 对象
   */
  private rowToEntity(row: any): Entity {
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

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return randomUUID();
  }
}

