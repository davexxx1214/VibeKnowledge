import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { buildTaskContext } from '../packages/mcp-server/src/taskContext';
import { runQuery } from '../packages/mcp-server/src/queryCli';
import { estimateTokenCount } from '../packages/mcp-server/src/graphQuery';
import type { StructuralGraphDocument } from '../packages/mcp-server/src/structuralGraphStore';

const dirs: string[] = [];
afterEach(() => { for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'task-context-')); dirs.push(root);
  const graph: StructuralGraphDocument = { version: 1, generatedAt: '2026-09-04T00:00:00Z', scope: '.',
    extractor: { name: 'typescript-compiler-api', version: 2, typescriptVersion: '5.9.3' }, files: [], entities: [], relations: [], diagnostics: [] };
  function file(name: string, symbol = name.replace(/\W/g, ''), content = `export function ${symbol}() { return 1; }\n`) {
    const path = `src/${name}.ts`;
    mkdirSync(join(root, 'src'), { recursive: true }); writeFileSync(join(root, path), content);
    graph.files.push({ filePath: path, language: 'typescript', contentHash: createHash('sha256').update(content).digest('hex') });
    graph.entities.push({ key: `${path}#${symbol}`, name: symbol, kind: 'function', filePath: path, startLine: 1, endLine: 1, exported: true });
    return `${path}#${symbol}`;
  }
  function edge(source: string, target: string, verb: 'calls' | 'imports' = 'calls') {
    graph.relations.push({ source, target, verb, origin: 'ast', confidence: 'extracted', location: { filePath: source.split('#')[0], startLine: 1, endLine: 1 } });
  }
  const core = file('core', 'core'), api = file('api', 'api'), app = file('app', 'app'), spec = file('core.test', 'spec'), other = file('unrelated', 'other');
  edge(api, core); edge(app, api); edge(spec, core);
  return { root, graph, file, edge, core, api, app, spec, other };
}

describe('task context with source-backed limitations', () => {
  it('finds direct and transitive consumers and actual test references, not unrelated files', () => {
    const f = fixture(); const result = buildTaskContext(f.root, f.graph, { selector: 'core' });
    expect(result).toContain('UPSTREAM src/api.ts'); expect(result).toContain('UPSTREAM src/app.ts');
    expect(result).toContain('via src/api.ts'); expect(result).toContain('TEST candidate src/core.test.ts');
    expect(result).not.toContain('src/unrelated.ts'); expect(result).toContain('NOT execution/data flow');
    expect(result).toContain('NOT measured coverage');
  });
  it('deduplicates file edges without promoting references into calls', () => {
    const f = fixture(); f.edge(f.api, f.core, 'imports');
    const result = buildTaskContext(f.root, f.graph, { selector: 'core' });
    expect(result.match(/UPSTREAM src\/api.ts/g)).toHaveLength(1);
    expect(result).toContain('--calls--> core');
    f.graph.relations = f.graph.relations.map(r => ({ ...r, verb: 'references' }));
    expect(buildTaskContext(f.root, f.graph, { selector: 'core' })).not.toContain('--calls');
  });
  it('accepts exact file paths and disambiguates symbol collisions', () => {
    const f = fixture(); f.file('other-core', 'core');
    f.graph.entities.push({ key: 'src/core.ts', name: 'core.ts', kind: 'file', filePath: 'src/core.ts', startLine: 1, endLine: 1 });
    expect(() => buildTaskContext(f.root, f.graph, { selector: 'core' })).toThrow(/Ambiguous/);
    expect(buildTaskContext(f.root, f.graph, { selector: 'src\\core.ts' })).toContain('core:1-1');
    expect(buildTaskContext(f.root, f.graph, { selector: f.core })).toContain('src/core.ts');
  });
  it('detects changes outside the returned slice and withholds changed-file snippets', () => {
    const f = fixture(); writeFileSync(join(f.root, 'src/unrelated.ts'), 'new caller');
    let result = buildTaskContext(f.root, f.graph, { selector: 'core', snippets: true });
    expect(result).toContain('STALE:'); expect(result).toContain('src/unrelated.ts'); expect(result).toContain('SOURCE src/core.ts');
    writeFileSync(join(f.root, 'src/core.ts'), 'DO NOT TRUST OLD LINES');
    result = buildTaskContext(f.root, f.graph, { selector: 'core', snippets: true });
    expect(result).not.toContain('SOURCE src/core.ts'); expect(result).not.toContain('DO NOT TRUST');
  });
  it('does not claim newly added files or configuration have been certified', () => {
    const f = fixture(); writeFileSync(join(f.root, 'src/newCaller.ts'), "import './core';");
    const result = buildTaskContext(f.root, f.graph, { selector: 'core' });
    expect(result).toContain('New/unindexed files, configuration and runtime behavior NOT certified');
    expect(result).toContain('not proof of complete impact');
  });
  it('shows relevant diagnostics, not every unrelated extraction error', () => {
    const f = fixture(); f.graph.diagnostics.push(
      { filePath: 'src/api.ts', code: 'unresolved-dynamic-import', category: 'warning', message: 'not a literal' },
      { filePath: 'src/unrelated.ts', code: 'other-diagnostic', category: 'warning', message: 'irrelevant' });
    const result = buildTaskContext(f.root, f.graph, { selector: 'core' });
    expect(result).toContain('unresolved-dynamic-import'); expect(result).not.toContain('other-diagnostic');
  });
  it('keeps file-cycle and uncertain-edge warnings qualified', () => {
    const f = fixture(); f.edge(f.core, f.app);
    f.graph.relations[0].confidence = 'review_required';
    const result = buildTaskContext(f.root, f.graph, { selector: 'core', budget: 3000 });
    expect(result).toContain('not proof of a runtime recursion'); expect(result).toContain('inferred/review_required');
  });
  it('stops at depth and exposes omissions under a tight budget', () => {
    const f = fixture();
    for (let i = 0; i < 30; i++) f.edge(f.file(`caller${i}`), f.core);
    const result = buildTaskContext(f.root, f.graph, { selector: 'core', depth: 1, budget: 400 });
    expect(result).toContain('INCOMPLETE'); expect(result).toContain('Depth frontier: YES');
    expect(estimateTokenCount(result)).toBeLessThanOrEqual(400);
  });
  it('counts warnings that cannot fit and never claims a complete result', () => {
    const f = fixture(); f.graph.diagnostics.push({ code: 'oversized', category: 'warning', message: 'large '.repeat(500) });
    const result = buildTaskContext(f.root, f.graph, { selector: 'core', budget: 400 });
    expect(result).toMatch(/\([1-9]\d* warnings\)/); expect(result).toContain('INCOMPLETE');
  });
  it('does not read a graph-controlled escaping path', () => {
    const f = fixture(); const secret = 'must not be shown'; const outside = mkdtempSync(join(tmpdir(), 'context-outside-')); dirs.push(outside);
    writeFileSync(join(outside, 'secret.ts'), secret);
    f.graph.files[0].filePath = join(outside, 'secret.ts');
    f.graph.entities[0].filePath = join(outside, 'secret.ts');
    const result = buildTaskContext(f.root, f.graph, { selector: 'core', snippets: true });
    expect(result).toContain('UNVERIFIED'); expect(result).not.toContain(secret);
  });
  it('does not traverse through test fixtures into unrelated production files', () => {
    const f = fixture(); f.edge(f.other, f.spec);
    expect(buildTaskContext(f.root, f.graph, { selector: 'core' })).not.toContain('src/unrelated.ts');
  });
  it('rejects invalid topology rather than silently losing dependencies', () => {
    const f = fixture(); f.graph.relations[0].target = 'nonexistent';
    expect(() => buildTaskContext(f.root, f.graph, { selector: 'core' })).toThrow(/dangling/);
    f.graph.relations[0].target = f.core; f.graph.entities.push(f.graph.entities[0]);
    expect(() => buildTaskContext(f.root, f.graph, { selector: 'core' })).toThrow(/duplicate/);
  });
  it('preserves the minimum budget even with oversized graph-controlled labels', () => {
    const f = fixture(); const path = 'src/' + 'long'.repeat(600) + '.ts';
    f.graph.files[0].filePath = path; f.graph.entities[0].filePath = path;
    f.graph.generatedAt = 'long timestamp'.repeat(100);
    const result = buildTaskContext(f.root, f.graph, { selector: 'core', budget: 400 });
    expect(estimateTokenCount(result)).toBeLessThanOrEqual(400);
    expect(result).toContain('INCOMPLETE');
  });
  it('routes the CLI through raw facts with no curated graph or database required', async () => {
    const f = fixture(); mkdirSync(join(f.root, '.vscode/.knowledge'), { recursive: true });
    writeFileSync(join(f.root, '.vscode/.knowledge/structural-graph.json'), JSON.stringify(f.graph));
    expect(await runQuery('context', { workspace: f.root, selector: 'core' })).toContain('TEST candidate');
    await expect(runQuery('context', { workspace: f.root, selector: 'core', budget: 399 })).rejects.toThrow();
  });
  it('prioritizes dependencies ahead of consumers in understand mode', () => {
    const f = fixture(); const dependency = f.file('zDependency'); f.edge(f.core, dependency);
    for (let i = 0; i < 20; i++) f.edge(f.file(`aCaller${i}`), f.core);
    const result = buildTaskContext(f.root, f.graph, { selector: 'core', mode: 'understand', budget: 400 });
    expect(result).toContain('DEPENDENCY src/zDependency.ts');
    expect(result.indexOf('DEPENDENCY')).toBeLessThan(result.indexOf('UPSTREAM') === -1 ? Infinity : result.indexOf('UPSTREAM'));
  });
  it('uses the producer hash convention even for non-UTF8 bytes', () => {
    const f = fixture(); const bytes = Buffer.from([0xff, 0xfe, 65, 0]);
    writeFileSync(join(f.root, 'src/core.ts'), bytes);
    f.graph.files[0].contentHash = createHash('sha256').update(bytes.toString('utf8')).digest('hex');
    expect(buildTaskContext(f.root, f.graph, { selector: 'core' })).not.toContain('STALE');
  });
  it('numbers CR-only excerpts consistently with the producer', () => {
    const f = fixture(); const content = 'export const first = 1;\rexport const second = 2;\r';
    writeFileSync(join(f.root, 'src/core.ts'), content);
    f.graph.files[0].contentHash = createHash('sha256').update(content).digest('hex');
    f.graph.entities[0].startLine = 2; f.graph.entities[0].endLine = 2;
    const result = buildTaskContext(f.root, f.graph, { selector: 'core', snippets: true });
    expect(result).toContain('2: export const second = 2;'); expect(result).not.toContain('1: export const first');
  });
});
