import { DatabaseService } from './database';
import { Relation, RelationVerb, RelatedEntity } from '../utils/types';
import { EntityService } from './entityService';
import { randomUUID } from 'crypto';

/**
 * 关系管理服务
 */
export class RelationService {
  constructor(
    private dbService: DatabaseService,
    private entityService: EntityService
  ) {}

  /**
   * 添加关系
   */
  public addRelation(
    sourceId: string,
    targetId: string,
    verb: RelationVerb,
    metadata?: Record<string, any>
  ): Relation {
    // 验证实体是否存在
    const source = this.entityService.getEntity(sourceId);
    const target = this.entityService.getEntity(targetId);

    if (!source || !target) {
      throw new Error('Source or target entity not found');
    }

    const db = this.dbService.getDatabase();
    const now = Date.now();

    const relation: Relation = {
      id: this.generateId(),
      sourceEntityId: sourceId,
      targetEntityId: targetId,
      verb,
      createdAt: now,
      metadata,
    };

    const stmt = db.prepare(`
      INSERT INTO relations (
        id, source_entity_id, target_entity_id, verb, created_at, metadata
      ) VALUES (?, ?, ?, ?, ?, ?)
    `);

    stmt.run([
      relation.id,
      relation.sourceEntityId,
      relation.targetEntityId,
      relation.verb,
      relation.createdAt,
      relation.metadata ? JSON.stringify(relation.metadata) : null
    ]);

    this.dbService.save(); // 保存到文件
    return relation;
  }

  /**
   * 删除关系
   */
  public removeRelation(relationId: string): boolean {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('DELETE FROM relations WHERE id = ?');
    stmt.run([relationId]);
    this.dbService.save(); // 保存到文件
    return true;
  }

  /**
   * 获取实体的所有关系
   */
  public getRelations(entityId: string, direction?: 'outgoing' | 'incoming'): Relation[] {
    const db = this.dbService.getDatabase();
    let query = 'SELECT * FROM relations WHERE ';
    
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
    
    return rows.map(row => this.rowToRelation(row));
  }

  /**
   * 获取所有关系
   */
  public getAllRelations(): Relation[] {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare('SELECT * FROM relations ORDER BY created_at DESC');
    
    const rows: any[] = [];
    while (stmt.step()) {
      rows.push(stmt.getAsObject());
    }
    stmt.free();
    
    return rows.map(row => this.rowToRelation(row));
  }

  /**
   * 获取实体的所有关系（别名，与 getRelations 相同）
   */
  public getRelationsByEntity(entityId: string): Relation[] {
    return this.getRelations(entityId);
  }

  /**
   * 获取关联的实体
   */
  public getRelatedEntities(
    entityId: string,
    relationType?: RelationVerb
  ): RelatedEntity[] {
    const relations = this.getRelations(entityId);
    const relatedEntities: RelatedEntity[] = [];

    for (const relation of relations) {
      if (relationType && relation.verb !== relationType) {
        continue;
      }

      const isOutgoing = relation.sourceEntityId === entityId;
      const relatedEntityId = isOutgoing ? relation.targetEntityId : relation.sourceEntityId;
      const entity = this.entityService.getEntity(relatedEntityId);

      if (entity) {
        relatedEntities.push({
          entity,
          relation,
          direction: isOutgoing ? 'outgoing' : 'incoming',
        });
      }
    }

    return relatedEntities;
  }

  /**
   * 检查关系是否存在
   */
  public relationExists(
    sourceId: string,
    targetId: string,
    verb?: RelationVerb
  ): boolean {
    const db = this.dbService.getDatabase();
    let query = 'SELECT COUNT(*) as count FROM relations WHERE source_entity_id = ? AND target_entity_id = ?';
    const params: any[] = [sourceId, targetId];

    if (verb) {
      query += ' AND verb = ?';
      params.push(verb);
    }

    const stmt = db.prepare(query);
    stmt.bind(params);
    
    if (stmt.step()) {
      const result = stmt.getAsObject() as any;
      stmt.free();
      return result.count > 0;
    }
    
    stmt.free();
    return false;
  }

  /**
   * 获取特定类型的关系数量
   */
  public getRelationCount(entityId: string, verb?: RelationVerb): number {
    const db = this.dbService.getDatabase();
    let query = 'SELECT COUNT(*) as count FROM relations WHERE (source_entity_id = ? OR target_entity_id = ?)';
    const params: any[] = [entityId, entityId];

    if (verb) {
      query += ' AND verb = ?';
      params.push(verb);
    }

    const stmt = db.prepare(query);
    stmt.bind(params);
    
    if (stmt.step()) {
      const result = stmt.getAsObject() as any;
      stmt.free();
      return result.count;
    }
    
    stmt.free();
    return 0;
  }

  /**
   * 将数据库行转换为 Relation 对象
   */
  private rowToRelation(row: any): Relation {
    return {
      id: row.id,
      sourceEntityId: row.source_entity_id,
      targetEntityId: row.target_entity_id,
      verb: row.verb as RelationVerb,
      createdAt: row.created_at,
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

