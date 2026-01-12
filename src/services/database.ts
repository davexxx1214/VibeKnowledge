import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';

/**
 * 数据库服务
 * 负责数据库的初始化、连接管理和底层操作
 */
export class DatabaseService {
  private db: SqlJsDatabase | null = null;
  private dbPath: string = '';

  /**
   * 初始化数据库
   */
  public async initialize(workspaceRoot: string): Promise<void> {
    try {
      // 创建 .vscode/.knowledge 目录
      const knowledgeDir = path.join(workspaceRoot, '.vscode', '.knowledge');
      if (!fs.existsSync(knowledgeDir)) {
        fs.mkdirSync(knowledgeDir, { recursive: true });
      }

      // 数据库文件路径
      this.dbPath = path.join(knowledgeDir, 'graph.sqlite');

      // 初始化 SQL.js
      // 需要指定 WASM 文件的位置
      const SQL = await initSqlJs({
        locateFile: (file) => {
          // WASM 文件在 node_modules 中
          return require.resolve(`sql.js/dist/${file}`);
        }
      });

      // 如果数据库文件存在，加载它；否则创建新的
      if (fs.existsSync(this.dbPath)) {
        const buffer = fs.readFileSync(this.dbPath);
        this.db = new SQL.Database(buffer);
      } else {
        this.db = new SQL.Database();
      }
      
      // 启用外键约束
      this.db.run('PRAGMA foreign_keys = ON');

      // 创建表结构
      this.createTables();

      console.log(`Database initialized at: ${this.dbPath}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to initialize database: ${error}`);
      throw error;
    }
  }

  /**
   * 创建数据库表结构
   */
  private createTables(): void {
    if (!this.db) {
      throw new Error('Database not initialized');
    }

    // 创建 entities 表
    this.db.run(`
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
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_entities_type ON entities(type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_entities_file_path ON entities(file_path)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_entities_name ON entities(name)');

    // 创建 relations 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS relations (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        verb TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (source_entity_id) REFERENCES entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_entity_id) REFERENCES entities(id) ON DELETE CASCADE
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_relations_source ON relations(source_entity_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_relations_target ON relations(target_entity_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_relations_verb ON relations(verb)');

    // 创建 observations 表
    this.db.run(`
      CREATE TABLE IF NOT EXISTS observations (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES entities(id) ON DELETE CASCADE
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_observations_entity ON observations(entity_id)');

    // ============================================================
    // 自动依赖图谱表（Auto Graph）- 与手动图谱完全隔离
    // ============================================================

    // 创建 auto_entities 表（自动生成的实体）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS auto_entities (
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
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_auto_entities_type ON auto_entities(type)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_auto_entities_file_path ON auto_entities(file_path)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_auto_entities_name ON auto_entities(name)');
    // 为自动图谱添加唯一约束，防止重复（同一文件、同一名称、同一类型）
    this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_entities_unique ON auto_entities(file_path, name, type, start_line)');

    // 创建 auto_relations 表（自动生成的关系）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS auto_relations (
        id TEXT PRIMARY KEY,
        source_entity_id TEXT NOT NULL,
        target_entity_id TEXT NOT NULL,
        verb TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        metadata TEXT,
        FOREIGN KEY (source_entity_id) REFERENCES auto_entities(id) ON DELETE CASCADE,
        FOREIGN KEY (target_entity_id) REFERENCES auto_entities(id) ON DELETE CASCADE
      )
    `);

    this.db.run('CREATE INDEX IF NOT EXISTS idx_auto_relations_source ON auto_relations(source_entity_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_auto_relations_target ON auto_relations(target_entity_id)');
    this.db.run('CREATE INDEX IF NOT EXISTS idx_auto_relations_verb ON auto_relations(verb)');
    // 防止重复关系
    this.db.run('CREATE UNIQUE INDEX IF NOT EXISTS idx_auto_relations_unique ON auto_relations(source_entity_id, target_entity_id, verb)');

    // 创建 auto_file_cache 表（文件分析缓存，用于增量分析）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS auto_file_cache (
        file_path TEXT PRIMARY KEY,
        content_hash TEXT NOT NULL,
        analyzed_at INTEGER NOT NULL
      )
    `);

    // 创建 auto_observations 表（自动图谱的观察记录）
    this.db.run(`
      CREATE TABLE IF NOT EXISTS auto_observations (
        id TEXT PRIMARY KEY,
        entity_id TEXT NOT NULL,
        content TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL,
        FOREIGN KEY (entity_id) REFERENCES auto_entities(id) ON DELETE CASCADE
      )
    `);
    this.db.run('CREATE INDEX IF NOT EXISTS idx_auto_observations_entity ON auto_observations(entity_id)');

    // 保存数据库到文件
    this.save();
  }

  /**
   * 获取数据库实例
   */
  public getDatabase(): SqlJsDatabase {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    return this.db;
  }

  /**
   * 执行事务
   */
  public transaction<T>(fn: () => T): T {
    if (!this.db) {
      throw new Error('Database not initialized');
    }
    
    try {
      this.db.run('BEGIN TRANSACTION');
      const result = fn();
      this.db.run('COMMIT');
      this.save(); // 保存到文件
      return result;
    } catch (error) {
      this.db.run('ROLLBACK');
      throw error;
    }
  }

  /**
   * 保存数据库到文件
   */
  public save(): void {
    if (!this.db) {
      return;
    }
    
    try {
      const data = this.db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(this.dbPath, buffer);
      console.log('Database saved successfully');
    } catch (error) {
      console.error('Failed to save database:', error);
      throw error;
    }
  }

  /**
   * 关闭数据库连接
   */
  public close(): void {
    if (this.db) {
      this.save(); // 最后保存一次
      this.db.close();
      this.db = null;
    }
  }

  /**
   * 获取数据库路径
   */
  public getDbPath(): string {
    return this.dbPath;
  }
}
