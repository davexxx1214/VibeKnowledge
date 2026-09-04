import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);

describe('SQLite 13 runtime', () => {
  it('ships N-API bindings without the retired download installer', () => {
    const manifest = require('better-sqlite3/package.json');
    expect(manifest.version).toMatch(/^13\./);
    expect(manifest.dependencies['node-addon-api']).toBeDefined();
    expect(manifest.dependencies['prebuild-install']).toBeUndefined();
    const npmrc = readFileSync('.npmrc', 'utf8');
    expect(npmrc).toContain('ignore-scripts=true');
    expect(npmrc).toContain('audit=true');
  });

  it('loads the npm-packaged native binary in a fresh Node process', () => {
    const script = `
      const Database = require('better-sqlite3');
      const db = new Database(':memory:');
      try {
        db.exec('CREATE TABLE probe (value TEXT NOT NULL)');
        db.prepare('INSERT INTO probe VALUES (?)').run('SQLite 13');
        console.log(JSON.stringify({
          value: db.prepare('SELECT value FROM probe').get().value,
          bindings: Object.keys(require.cache).filter(file => file.endsWith('.node')),
        }));
      } finally { db.close(); }
    `;
    const result = spawnSync(process.execPath, ['-e', script], {
      cwd: process.cwd(), encoding: 'utf8', timeout: 15000, windowsHide: true,
    });
    expect(result.error).toBeUndefined();
    expect(result.status, result.stderr).toBe(0);
    const output = JSON.parse(result.stdout);
    expect(output.value).toBe('SQLite 13');
    expect(output.bindings).toEqual(expect.arrayContaining([
      expect.stringMatching(/better-sqlite3[/\\]prebuilds[/\\].+\.node$/),
    ]));
  });
});
