import { existsSync } from 'node:fs';
import Database from 'better-sqlite3';

export interface KnowledgeOverview {
  entityCount: number;
  relationCount: number;
  observationCount: number;
  lastUpdatedAt: string | null;
}

export interface EntityRecord {
  id: string;
  name: string;
  type: string;
  filePath: string;
  startLine: number;
  endLine: number;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: number;
  updatedAt: number;
}

export interface ObservationRecord {
  id: string;
  entityId: string;
  entityName: string;
  entityType: string;
  filePath: string;
  content: string;
  createdAt: number;
  updatedAt: number;
}

export interface RelationRecord {
  id: string;
  verb: string;
  createdAt: number;
  sourceEntityId: string;
  sourceName: string;
  sourceType: string;
  sourceFilePath: string;
  targetEntityId: string;
  targetName: string;
  targetType: string;
  targetFilePath: string;
}

export interface SearchEntitiesParams {
  query?: string;
  type?: string;
  filePath?: string;
  limit?: number;
}

export interface SearchObservationsParams {
  query?: string;
  entityId?: string;
  limit?: number;
}

export interface SearchRelationsParams {
  verb?: string;
  source?: string;
  target?: string;
  limit?: number;
}

type OverviewRow = {
  entityCount: number | null;
  relationCount: number | null;
  observationCount: number | null;
  lastUpdatedAt: number | null;
};

type EntityRow = {
  id: string;
  name: string;
  type: string;
  file_path: string;
  start_line: number;
  end_line: number;
  description: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
};

type ObservationRow = {
  id: string;
  entity_id: string;
  content: string;
  created_at: number;
  updated_at: number;
  entity_name: string;
  entity_type: string;
  file_path: string;
};

type RelationRow = {
  id: string;
  source_entity_id: string;
  target_entity_id: string;
  verb: string;
  created_at: number;
  source_name: string;
  source_type: string;
  source_file_path: string;
  target_name: string;
  target_type: string;
  target_file_path: string;
};

export class GraphDatabase {
  private db: Database.Database | undefined;

  constructor(private readonly dbPath: string) {}

  open(): void {
    if (!existsSync(this.dbPath)) {
      throw new Error(
        `未找到 graph.sqlite。请确认已在 VS Code 中运行过 VibeKnowledge 插件。\n期望路径：${this.dbPath}`
      );
    }

    this.db = new Database(this.dbPath, {
      readonly: true,
      fileMustExist: true
    });
  }

  close(): void {
    this.db?.close();
    this.db = undefined;
  }

  getOverview(): KnowledgeOverview {
    const row = this.ensureDb()
      .prepare(
        `
        SELECT
          (SELECT COUNT(*) FROM entities) AS entityCount,
          (SELECT COUNT(*) FROM relations) AS relationCount,
          (SELECT COUNT(*) FROM observations) AS observationCount,
          (
            SELECT MAX(ts)
            FROM (
              SELECT MAX(updated_at) AS ts FROM entities
              UNION ALL
              SELECT MAX(updated_at) FROM observations
            )
          ) AS lastUpdatedAt
      `
      )
      .get() as OverviewRow | undefined;

    return {
      entityCount: row?.entityCount ?? 0,
      relationCount: row?.relationCount ?? 0,
      observationCount: row?.observationCount ?? 0,
      lastUpdatedAt: row?.lastUpdatedAt
        ? new Date(row.lastUpdatedAt).toISOString()
        : null
    };
  }

  searchEntities(params: SearchEntitiesParams = {}): EntityRecord[] {
    const { query, type, filePath, limit } = params;
    const clauses: string[] = [];
    const values: (string | number)[] = [];

    if (query?.trim()) {
      const like = `%${query.trim()}%`;
      clauses.push('(name LIKE ? OR file_path LIKE ? OR description LIKE ?)');
      values.push(like, like, like);
    }

    if (type?.trim()) {
      clauses.push('type = ?');
      values.push(type.trim());
    }

    if (filePath?.trim()) {
      clauses.push('file_path LIKE ?');
      values.push(`%${filePath.trim()}%`);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const safeLimit = this.clampLimit(limit);

    const rows = this.ensureDb()
      .prepare(
        `
        SELECT
          id,
          name,
          type,
          file_path,
          start_line,
          end_line,
          description,
          metadata,
          created_at,
          updated_at
        FROM entities
        ${whereClause}
        ORDER BY updated_at DESC
        LIMIT ?
      `
      )
      .all(...values, safeLimit) as EntityRow[];

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      filePath: row.file_path,
      startLine: row.start_line,
      endLine: row.end_line,
      description: row.description,
      metadata: row.metadata ? this.safeParseJson(row.metadata) : null,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  searchObservations(
    params: SearchObservationsParams = {}
  ): ObservationRecord[] {
    const { query, entityId, limit } = params;
    const clauses: string[] = [];
    const values: (string | number)[] = [];

    if (entityId?.trim()) {
      clauses.push('o.entity_id = ?');
      values.push(entityId.trim());
    }

    if (query?.trim()) {
      const like = `%${query.trim()}%`;
      clauses.push(
        '(o.content LIKE ? OR e.name LIKE ? OR e.file_path LIKE ?)'
      );
      values.push(like, like, like);
    }

    const whereClause = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const safeLimit = this.clampLimit(limit);

    const rows = this.ensureDb()
      .prepare(
        `
        SELECT
          o.id,
          o.entity_id,
          o.content,
          o.created_at,
          o.updated_at,
          e.name AS entity_name,
          e.type AS entity_type,
          e.file_path AS file_path
        FROM observations o
        INNER JOIN entities e ON e.id = o.entity_id
        ${whereClause}
        ORDER BY o.updated_at DESC
        LIMIT ?
      `
      )
      .all(...values, safeLimit) as ObservationRow[];

    return rows.map((row) => ({
      id: row.id,
      entityId: row.entity_id,
      entityName: row.entity_name,
      entityType: row.entity_type,
      filePath: row.file_path,
      content: row.content,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));
  }

  searchRelations(params: SearchRelationsParams = {}): RelationRecord[] {
    const { verb, source, target, limit } = params;
    const clauses: string[] = [];
    const values: (string | number)[] = [];

    if (verb?.trim()) {
      clauses.push('r.verb = ?');
      values.push(verb.trim());
    }

    if (source?.trim()) {
      const like = `%${source.trim()}%`;
      clauses.push('s.name LIKE ?');
      values.push(like);
    }

    if (target?.trim()) {
      const like = `%${target.trim()}%`;
      clauses.push('t.name LIKE ?');
      values.push(like);
    }

    const whereClause =
      clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';
    const safeLimit = this.clampLimit(limit);

    const rows = this.ensureDb()
      .prepare(
        `
        SELECT
          r.id,
          r.source_entity_id,
          r.target_entity_id,
          r.verb,
          r.created_at,
          s.name AS source_name,
          s.type AS source_type,
          s.file_path AS source_file_path,
          t.name AS target_name,
          t.type AS target_type,
          t.file_path AS target_file_path
        FROM relations r
        INNER JOIN entities s ON s.id = r.source_entity_id
        INNER JOIN entities t ON t.id = r.target_entity_id
        ${whereClause}
        ORDER BY r.created_at DESC
        LIMIT ?
      `
      )
      .all(...values, safeLimit) as RelationRow[];

    return rows.map((row) => ({
      id: row.id,
      verb: row.verb,
      createdAt: row.created_at,
      sourceEntityId: row.source_entity_id,
      sourceName: row.source_name,
      sourceType: row.source_type,
      sourceFilePath: row.source_file_path,
      targetEntityId: row.target_entity_id,
      targetName: row.target_name,
      targetType: row.target_type,
      targetFilePath: row.target_file_path
    }));
  }

  private ensureDb(): Database.Database {
    if (!this.db) {
      throw new Error('数据库尚未初始化，请先调用 open()');
    }
    return this.db;
  }

  public getConnection(): Database.Database {
    return this.ensureDb();
  }

  private clampLimit(limit?: number): number {
    if (typeof limit !== 'number' || Number.isNaN(limit)) {
      return 20;
    }
    return Math.max(1, Math.min(limit, 100));
  }

  private safeParseJson(value: string | null): Record<string, unknown> | null {
    if (!value) {
      return null;
    }
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
}

