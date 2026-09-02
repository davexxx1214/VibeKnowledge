import { DatabaseService } from '../database';
import { canonicalizeEntityKey } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/canonicalize-entity-key.mjs';

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
    const exactDescription = this.getExactDescription(agentKey);
    if (exactDescription !== undefined) {
      return exactDescription;
    }
    return this.findCanonicalOverride(agentKey)?.description;
  }

  private getExactDescription(agentKey: string): string | undefined {
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
    const storedKey =
      this.getExactDescription(agentKey) !== undefined
        ? agentKey
        : this.findCanonicalOverride(agentKey)?.agentKey;
    if (storedKey === undefined) {
      return;
    }
    const stmt = db.prepare(
      'DELETE FROM agent_entity_overrides WHERE agent_key = ?'
    );
    stmt.run([storedKey]);
    stmt.free();
    this.dbService.save();
  }

  private findCanonicalOverride(
    agentKey: string
  ): { agentKey: string; description: string } | undefined {
    const canonicalKey = canonicalizeEntityKey(agentKey);
    const db = this.dbService.getDatabase();
    const stmt = db.prepare(
      'SELECT agent_key, description FROM agent_entity_overrides'
    );
    const matches: Array<{ agentKey: string; description: string }> = [];
    while (stmt.step()) {
      const row = stmt.getAsObject();
      const storedKey = String(row.agent_key);
      if (canonicalizeEntityKey(storedKey) === canonicalKey) {
        matches.push({
          agentKey: storedKey,
          description: String(row.description),
        });
      }
    }
    stmt.free();
    return matches.length === 1 ? matches[0] : undefined;
  }
}
