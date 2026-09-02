import { resolve } from 'path';
import initSqlJs from 'sql.js';
import { describe, expect, it, vi } from 'vitest';
import type { DatabaseService } from '../database';
import { AgentEntityOverrideService } from './agentEntityOverrideService';

describe('AgentEntityOverrideService canonical aliases', () => {
  it('reapplies and resets an override through a key spelling variant', async () => {
    const SQL = await initSqlJs({
      locateFile: (file) =>
        resolve(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });
    const database = new SQL.Database();
    database.run(`
      CREATE TABLE agent_entity_overrides (
        agent_key TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    const save = vi.fn();
    const databaseService = {
      getDatabase: () => database,
      save,
    } as unknown as DatabaseService;
    const overrides = new AgentEntityOverrideService(databaseService);

    overrides.setDescription(
      'src/auth/auth.service.ts#AuthService',
      'Human description'
    );

    expect(
      overrides.getDescription(' SRC\\AUTH//auth.service.ts ## authservice() ')
    ).toBe('Human description');

    overrides.deleteDescription(
      ' SRC\\AUTH//auth.service.ts ## authservice() '
    );
    expect(
      overrides.getDescription('src/auth/auth.service.ts#AuthService')
    ).toBeUndefined();
    expect(save).toHaveBeenCalledTimes(2);
    database.close();
  });

  it('does not choose between ambiguous canonical override rows', async () => {
    const SQL = await initSqlJs({
      locateFile: (file) =>
        resolve(process.cwd(), 'node_modules', 'sql.js', 'dist', file),
    });
    const database = new SQL.Database();
    database.run(`
      CREATE TABLE agent_entity_overrides (
        agent_key TEXT PRIMARY KEY,
        description TEXT NOT NULL,
        updated_at INTEGER NOT NULL
      )
    `);
    database.run(
      `INSERT INTO agent_entity_overrides VALUES
        ('core:user-service', 'First', 1),
        ('CORE::USER---SERVICE', 'Second', 2)`
    );
    const overrides = new AgentEntityOverrideService({
      getDatabase: () => database,
      save: vi.fn(),
    } as unknown as DatabaseService);

    expect(overrides.getDescription('core : user--service')).toBeUndefined();
    expect(overrides.getDescription('core:user-service')).toBe('First');
    database.close();
  });
});
