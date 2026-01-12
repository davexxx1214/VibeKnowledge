import { DatabaseService } from './database';
import { Observation } from '../utils/types';
import { EntityService } from './entityService';
import { randomUUID } from 'crypto';

/**
 * 观察记录服务
 */
export class ObservationService {
  constructor(
    private dbService: DatabaseService,
    private entityService: EntityService
  ) {}

  /**
   * 添加观察记录
   */
  public addObservation(entityId: string, content: string): Observation {
    // 验证实体是否存在
    const entity = this.entityService.getEntity(entityId);
    if (!entity) {
      throw new Error('Entity not found');
    }

    const db = this.dbService.getDatabase();
    const now = Date.now();

    const observation: Observation = {
      id: this.generateId(),
      entityId,
      content,
      createdAt: now,
      updatedAt: now,
    };

    const stmt = db.prepare(`
      INSERT INTO observations (id, entity_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    stmt.run([
      observation.id,
      observation.entityId,
      observation.content,
      observation.createdAt,
      observation.updatedAt
    ]);

    this.dbService.save(); // 保存到文件
    return observation;
  }

  /**
   * 更新观察记录
   */
  public updateObservation(observationId: string, content: string): Observation | null {
    const db = this.dbService.getDatabase();
    const existing = this.getObservation(observationId);

    if (!existing) {
      return null;
    }

    const updated: Observation = {
      ...existing,
      content,
      updatedAt: Date.now(),
    };

    const stmt = db.prepare(`
      UPDATE observations 
      SET content = ?, updated_at = ?
      WHERE id = ?
    `);

    stmt.run([updated.content, updated.updatedAt, observationId]);

    this.dbService.save(); // 保存到文件
    return updated;
  }

  /**
   * 删除观察记录
   */
  public deleteObservation(observationId: string): boolean {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('DELETE FROM observations WHERE id = ?');
    stmt.run([observationId]);
    this.dbService.save(); // 保存到文件
    return true;
  }

  /**
   * 获取单个观察记录
   */
  public getObservation(observationId: string): Observation | null {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT * FROM observations WHERE id = ?');
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
   * 获取实体的所有观察记录
   */
  public getObservations(entityId: string): Observation[] {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(`
      SELECT * FROM observations 
      WHERE entity_id = ? 
      ORDER BY created_at DESC
    `);
    stmt.bind([entityId]);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map(row => this.rowToObservation(row));
  }

  /**
   * 获取观察记录数量
   */
  public getObservationCount(entityId: string): number {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM observations WHERE entity_id = ?');
    stmt.bind([entityId]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as any;
      stmt.free();
      return result.count;
    }

    stmt.free();
    return 0;
  }

  /**
   * 搜索观察记录
   */
  public searchObservations(query: string): Observation[] {
    const db = this.dbService.getDatabase();
    
    // sql.js 不支持 FTS5，使用 LIKE 搜索
    const stmt = db.prepare(`
      SELECT * FROM observations 
      WHERE content LIKE ?
      ORDER BY created_at DESC
    `);
    
    stmt.bind([`%${query}%`]);

    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();

    return rows.map(row => this.rowToObservation(row));
  }

  /**
   * 将数据库行转换为 Observation 对象
   */
  private rowToObservation(row: any): Observation {
    return {
      id: row.id,
      entityId: row.entity_id,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * 生成唯一 ID
   */
  private generateId(): string {
    return randomUUID();
  }
}

