import { DatabaseService } from '../database';

export interface AgentEntityDescriptionOverrideStore {
  getDescription(agentKey: string): string | undefined;
  setDescription(agentKey: string, description: string): void;
  deleteDescription(agentKey: string): void;
}

/**
 * Stores human-authored descriptions for Agent-generated entities.
 *
 * The generated manifest may be replaced wholesale. Keeping manual prose in
 * graph.sqlite makes it durable and lets the extension reapply it by stable
 * Agent key after every generation.
 */
export class AgentEntityOverrideService
  implements AgentEntityDescriptionOverrideStore
{
  constructor(private readonly dbService: DatabaseService) {}

  public getDescription(agentKey: string): string | undefined {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(
      'SELECT description FROM agent_entity_overrides WHERE agent_key = ?'
    );
    stmt.bind([agentKey]);

    if (!stmt.step()) {
      stmt.free();
      return undefined;
    }

    const row = stmt.getAsObject();
    stmt.free();
    return String(row.description);
  }

  public setDescription(agentKey: string, description: string): void {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(`
      INSERT INTO agent_entity_overrides (agent_key, description, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(agent_key) DO UPDATE SET
        description = excluded.description,
        updated_at = excluded.updated_at
    `);
    stmt.run([agentKey, description, Date.now()]);
    stmt.free();
    this.dbService.save();
  }

  public deleteDescription(agentKey: string): void {
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(
      'DELETE FROM agent_entity_overrides WHERE agent_key = ?'
    );
    stmt.run([agentKey]);
    stmt.free();
    this.dbService.save();
  }
}
