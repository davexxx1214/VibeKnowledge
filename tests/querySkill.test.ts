import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, cpSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { publishFeatureBrief } from '../resources/skills/vibeknowledge-dependency-graph/scripts/feature-brief.mjs';
const require = createRequire(import.meta.url);
const { buildQuerySkill } = require('../scripts/build-query-skill.cjs');

describe('portable dependency query Skill', () => {
  let root: string, workspace: string, script: string;
  const graph = {
    version: 1, generatedAt: '2026-09-04T00:00:00Z', scope: '.',
    groups: [{ key: 'framework', name: 'Framework', kind: 'framework', order: 0,
      entities: ['A', 'B'].map(name => ({ key: `src/${name}.ts#${name}`, name, type: 'component', filePath: `src/${name}.ts`, startLine: 1, endLine: 2, description: `${name} original` })),
      relations: [{ source: 'src/A.ts#A', target: 'src/B.ts#B', verb: 'imports', origin: 'ast', confidence: 'extracted', evidence: [{ filePath: 'src/A.ts', startLine: 1 }], structuralPath: [{ source: 'src/A.ts#A', target: 'src/B.ts#B', verb: 'imports', filePath: 'src/A.ts', startLine: 1, endLine: 1 }] }]
    }]
  };
  function run(args: string[], target = workspace) {
    return spawnSync(process.execPath, [script, ...args, '--workspace', target], { encoding: 'utf8', timeout: 10000, windowsHide: true });
  }
  beforeAll(async () => {
    root = mkdtempSync(join(tmpdir(), 'vibeknowledge query-'));
    workspace = join(root, 'project 中文');
    mkdirSync(join(workspace, '.vscode/.knowledge'), { recursive: true });
    mkdirSync(join(workspace, 'src'));
    writeFileSync(join(workspace, 'src/A.ts'), "import { B } from './B';\nexport const A = B;\n");
    writeFileSync(join(workspace, 'src/B.ts'), 'export const B = 1;\n');
    writeFileSync(join(workspace, '.vscode/.knowledge/agent-graph.json'), JSON.stringify(graph));
    const output = join(root, 'bundle');
    const meta = await buildQuerySkill(resolve('.'), output);
    expect(Object.keys(meta.inputs).some(p => /better-sqlite3|modelcontextprotocol|google.genai/.test(p))).toBe(false);
    expect(Object.keys(meta.inputs).some(p => p.replaceAll('\\', '/').includes('packages/mcp-server/node_modules'))).toBe(false);
    cpSync(output, join(root, 'installed'), { recursive: true });
    script = join(root, 'installed/scripts/query.cjs');
  });
  afterAll(() => rmSync(root, { recursive: true, force: true }));

  it('runs from a copied Skill with no node_modules, supports spaces and Unicode', () => {
    expect(existsSync(join(root, 'node_modules'))).toBe(false);
    const result = run(['overview']);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain('framework | Framework');
    expect(result.stdout).toContain('snapshot, not live source');
    expect(existsSync(join(root, 'installed/LICENSE'))).toBe(true);
    expect(existsSync(join(root, 'installed/ZOD-LICENSE'))).toBe(true);
  });
  it.each([
    ['query', '--query', 'A'], ['entity', '--selector', 'src/A.ts#A'],
    ['neighbors', '--selector', 'src/A.ts#A', '--direction', 'outgoing'],
    ['path', '--source', 'src/A.ts#A', '--target', 'src/B.ts#B', '--direction', 'outgoing'],
    ['search', '--query', 'A'], ['relations', '--source', 'A']
  ])('executes %s with read-only graph queries', (...args) => {
    const result = run(args);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('src/A.ts#A');
    expect(readFileSync(join(workspace, '.vscode/.knowledge/agent-graph.json'), 'utf8')).toBe(JSON.stringify(graph));
    expect(existsSync(join(workspace, '.vscode/.knowledge/graph.sqlite'))).toBe(false);
  });
  it.each([
    ['query', '--query', 'A', '--budget', '-1'], ['query', '--query', 'A', '--depth', '99'],
    ['query', '--query', 'A', '--group', 'missing'], ['query', '--query', 'A', '--typo', 'x'],
    ['entity', '--selector', 'A', '--depth', '1'], ['constructor'],
    ['neighbors', '--selector', 'A', '--direction', 'upstream']
  ])('rejects invalid arguments %j', (...args) => {
    const result = run(args);
    expect(result.status).not.toBe(0);
    expect(result.stdout).toBe('');
    expect(result.stderr).toContain('Query failed:');
  });
  it('emits JSON only when requested and defaults to no Evidence', () => {
    const result = run(['query', '--query', 'A', '--json']);
    const parsed = JSON.parse(result.stdout);
    expect(parsed.text).toContain('src/A.ts#A');
    expect(parsed.text).not.toContain('Evidence:');
  });
  it('queries feature briefs from a copied Skill without a graph, SQLite or node_modules', () => {
    const fixture = join(root, 'brief-only'); mkdirSync(join(fixture, 'src'), { recursive: true });
    writeFileSync(join(fixture, 'src/help.ts'), 'export const help = "docs";');
    const evidence = { filePath: 'src/help.ts', startLine: 1, endLine: 1 };
    publishFeatureBrief(fixture, { key: 'help', name: 'Help', summary: 'Local help content', keywords: ['docs'],
      entries: [evidence], limitations: ['Only local content; runtime was not executed.'],
      facts: [{ kind: 'capability', text: 'Exports help content.', certainty: 'observed', evidence: [evidence] }] });
    const before = readFileSync(join(fixture, '.vscode/.knowledge/feature-briefs/help.json'));
    expect(run(['features', '--query', 'docs'], fixture).stdout).toContain('help | Help');
    const result = run(['brief', '--feature', 'help', '--json'], fixture);
    expect(result.status, result.stderr).toBe(0);
    expect(JSON.parse(result.stdout).text).toContain('Exports help content.');
    expect(readFileSync(join(fixture, '.vscode/.knowledge/feature-briefs/help.json')).equals(before)).toBe(true);
    expect(existsSync(join(fixture, '.vscode/.knowledge/graph.sqlite'))).toBe(false);
  });
  it('fails explicitly for absent/corrupt artifacts without creating them', () => {
    const empty = join(root, 'empty'); mkdirSync(empty);
    expect(run(['overview'], empty).stderr).toContain('missing');
    expect(existsSync(join(empty, '.vscode'))).toBe(false);
    expect(run(['impact', '--selector', 'A'], empty).status).not.toBe(0);
    const invalid = join(root, 'invalid'); mkdirSync(join(invalid, '.vscode/.knowledge'), { recursive: true });
    writeFileSync(join(invalid, '.vscode/.knowledge/agent-graph.json'), '{bad');
    expect(run(['overview'], invalid).status).not.toBe(0);
  });
  it('reads live human overrides with built-in SQLite and never replaces the database', () => {
    const fixture = join(root, 'with-overrides'); cpSync(workspace, fixture, { recursive: true });
    const file = join(fixture, '.vscode/.knowledge/graph.sqlite');
    const setup = spawnSync(process.execPath, ['-e', `const {DatabaseSync}=require('node:sqlite'); const db=new DatabaseSync(process.argv[1]); db.exec('CREATE TABLE agent_entity_overrides(agent_key TEXT, description TEXT)'); db.prepare('INSERT INTO agent_entity_overrides VALUES (?,?)').run('src/A.ts#A','human override'); db.close();`, file], { encoding: 'utf8' });
    expect(setup.status, setup.stderr).toBe(0);
    const before = readFileSync(file);
    const result = run(['entity', '--selector', 'A'], fixture);
    expect(result.status, result.stderr).toBe(0);
    expect(result.stdout).toContain('human override');
    expect(readFileSync(file).equals(before)).toBe(true);
    writeFileSync(file, 'corrupt sqlite');
    expect(run(['entity', '--selector', 'A'], fixture).status).not.toBe(0);
  });
});
