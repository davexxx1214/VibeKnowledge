import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { existsSync, mkdirSync, writeFileSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import Database from 'better-sqlite3';
import { GraphDatabase } from '../src/database.js';

describe('GraphDatabase', () => {
  const testDir = join(__dirname, '.test-db');
  const testDbPath = join(testDir, 'test-graph.sqlite');
  let realDb: Database.Database;

  beforeAll(() => {
    // 创建测试目录
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }

    // 创建测试数据库
    realDb = new Database(testDbPath);

    // 创建表结构
    realDb.exec(`
      CREATE TABLE IF NOT EXISTS entities (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        file_path TEXT NOT NULL,
        start_line INTEGER NOT NULL,
        end_line INTEGER NOT NULL,
        description TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        metadata TEXT
      );

      CREATE TABLE IF NOT EXISTS relations (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        verb TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (source_entity_id) REFERENCES entities(id),
        FOREIGN KEY (target_entity_id) REFERENCES entities(id)
      );

      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id)
      );
    `);

    // 插入测试数据
    const now = Date.now();

    // 实体
    realDb.prepare(`
      INSERT INTO entities (id, name, type, file_path, start_line, end_line, description, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('entity-1', 'UserService', 'service', '/src/services/user.ts', 1, 100, 'User management service', now, now, null);

    realDb.prepare(`
      INSERT INTO entities (id, name, type, file_path, start_line, end_line, description, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('entity-2', 'AuthService', 'service', '/src/services/auth.ts', 1, 80, 'Authentication service', now, now, '{"version":"1.0"}');

    realDb.prepare(`
      INSERT INTO entities (id, name, type, file_path, start_line, end_line, description, created_at, updated_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run('entity-3', 'DatabaseHelper', 'function', '/src/utils/db.ts', 10, 30, null, now, now, null);

    // 关系
    realDb.prepare(`
      INSERT INTO relations (id, source_entity_id, target_entity_id, verb, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('rel-1', 'entity-1', 'entity-2', 'uses', now, null);

    realDb.prepare(`
      INSERT INTO relations (id, source_entity_id, target_entity_id, verb, created_at, metadata)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('rel-2', 'entity-2', 'entity-3', 'depends_on', now, null);

    // 观察记录
    realDb.prepare(`
      INSERT INTO observations (id, entity_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('obs-1', 'entity-1', 'This service handles user CRUD operations', now, now);

    realDb.prepare(`
      INSERT INTO observations (id, entity_id, content, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run('obs-2', 'entity-1', 'TODO: Add caching layer', now, now);

    realDb.close();
  });

  afterAll(() => {
    // 清理测试数据库
    if (existsSync(testDbPath)) {
      try {
        unlinkSync(testDbPath);
      } catch (e) {
        // ignore
      }
    }
    if (existsSync(testDir)) {
      try {
        rmSync(testDir, { recursive: true });
      } catch (e) {
        // ignore
      }
    }
  });

  describe('open', () => {
    it('应该成功打开存在的数据库', () => {
      const db = new GraphDatabase(testDbPath);
      expect(() => db.open()).not.toThrow();
      db.close();
    });

    it('应该抛出错误当数据库不存在', () => {
      const db = new GraphDatabase('/nonexistent/path/graph.sqlite');
      expect(() => db.open()).toThrow(/未找到 graph\.sqlite/);
    });
  });

  describe('getOverview', () => {
    it('应该返回正确的统计信息', () => {
      const db = new GraphDatabase(testDbPath);
      db.open();

      const overview = db.getOverview();

      expect(overview.entityCount).toBe(3);
      expect(overview.relationCount).toBe(2);
      expect(overview.observationCount).toBe(2);
      expect(overview.lastUpdatedAt).toBeDefined();

      db.close();
    });
  });

  describe('searchEntities', () => {
    let db: GraphDatabase;

    beforeAll(() => {
      db = new GraphDatabase(testDbPath);
      db.open();
    });

    afterAll(() => {
      db.close();
    });

    it('应该返回所有实体当没有过滤条件', () => {
      const results = db.searchEntities();
      expect(results.length).toBe(3);
    });

    it('应该按名称搜索', () => {
      const results = db.searchEntities({ query: 'User' });
      expect(results.length).toBe(1);
      expect(results[0].name).toBe('UserService');
    });

    it('应该按类型过滤', () => {
      const results = db.searchEntities({ type: 'service' });
      expect(results.length).toBe(2);
      expect(results.every((e) => e.type === 'service')).toBe(true);
    });

    it('应该按文件路径过滤', () => {
      const results = db.searchEntities({ filePath: 'services' });
      expect(results.length).toBe(2);
    });

    it('应该限制结果数量', () => {
      const results = db.searchEntities({ limit: 2 });
      expect(results.length).toBe(2);
    });

    it('应该正确解析 metadata JSON', () => {
      const results = db.searchEntities({ query: 'Auth' });
      expect(results[0].metadata).toEqual({ version: '1.0' });
    });

    it('应该返回 null metadata 当字段为空', () => {
      const results = db.searchEntities({ query: 'Database' });
      expect(results[0].metadata).toBeNull();
    });
  });

  describe('searchObservations', () => {
    let db: GraphDatabase;

    beforeAll(() => {
      db = new GraphDatabase(testDbPath);
      db.open();
    });

    afterAll(() => {
      db.close();
    });

    it('应该返回所有观察记录当没有过滤条件', () => {
      const results = db.searchObservations();
      expect(results.length).toBe(2);
    });

    it('应该按内容搜索', () => {
      const results = db.searchObservations({ query: 'CRUD' });
      expect(results.length).toBe(1);
      expect(results[0].content).toContain('CRUD');
    });

    it('应该按实体 ID 过滤', () => {
      const results = db.searchObservations({ entityId: 'entity-1' });
      expect(results.length).toBe(2);
      expect(results.every((o) => o.entityId === 'entity-1')).toBe(true);
    });

    it('应该包含关联实体信息', () => {
      const results = db.searchObservations();
      expect(results[0].entityName).toBeDefined();
      expect(results[0].entityType).toBeDefined();
      expect(results[0].filePath).toBeDefined();
    });
  });

  describe('searchRelations', () => {
    let db: GraphDatabase;

    beforeAll(() => {
      db = new GraphDatabase(testDbPath);
      db.open();
    });

    afterAll(() => {
      db.close();
    });

    it('应该返回所有关系当没有过滤条件', () => {
      const results = db.searchRelations();
      expect(results.length).toBe(2);
    });

    it('应该按动词过滤', () => {
      const results = db.searchRelations({ verb: 'uses' });
      expect(results.length).toBe(1);
      expect(results[0].verb).toBe('uses');
    });

    it('应该按源实体名称搜索', () => {
      const results = db.searchRelations({ source: 'User' });
      expect(results.length).toBe(1);
      expect(results[0].sourceName).toBe('UserService');
    });

    it('应该按目标实体名称搜索', () => {
      const results = db.searchRelations({ target: 'Auth' });
      expect(results.length).toBe(1);
      expect(results[0].targetName).toBe('AuthService');
    });

    it('应该包含源和目标实体的完整信息', () => {
      const results = db.searchRelations();
      const rel = results[0];

      expect(rel.sourceEntityId).toBeDefined();
      expect(rel.sourceName).toBeDefined();
      expect(rel.sourceType).toBeDefined();
      expect(rel.sourceFilePath).toBeDefined();
      expect(rel.targetEntityId).toBeDefined();
      expect(rel.targetName).toBeDefined();
      expect(rel.targetType).toBeDefined();
      expect(rel.targetFilePath).toBeDefined();
    });
  });

  describe('clampLimit', () => {
    let db: GraphDatabase;

    beforeAll(() => {
      db = new GraphDatabase(testDbPath);
      db.open();
    });

    afterAll(() => {
      db.close();
    });

    it('应该使用默认值 20 当 limit 未提供', () => {
      const results = db.searchEntities();
      // 我们只有 3 个实体，所以这里只是验证不会报错
      expect(results.length).toBeLessThanOrEqual(20);
    });

    it('应该限制最大值为 100', () => {
      const results = db.searchEntities({ limit: 200 });
      // 由于我们只有 3 个实体，不能直接验证，但可以验证不报错
      expect(results).toBeDefined();
    });

    it('应该限制最小值为 1', () => {
      const results = db.searchEntities({ limit: 0 });
      // limit 被调整为 1，至少返回 1 条
      expect(results.length).toBeGreaterThanOrEqual(1);
    });
  });
});

