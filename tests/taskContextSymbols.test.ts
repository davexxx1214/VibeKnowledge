import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createHash } from 'node:crypto';
import { buildTaskContext } from '../packages/mcp-server/src/taskContext';
import { estimateTokenCount } from '../packages/mcp-server/src/graphQuery';
import type { StructuralGraphDocument } from '../packages/mcp-server/src/structuralGraphStore';
import { extractStructuralGraph } from '../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';

const roots: string[] = [];
afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }); });
function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'symbol-context-')); roots.push(root);
  const graph: StructuralGraphDocument = { version: 1, generatedAt: '2026-09-05', scope: '.',
    extractor: { name: 'typescript-compiler-api', version: 2, typescriptVersion: '5.9' }, files: [], entities: [], relations: [], diagnostics: [] };
  function file(filePath: string) {
    const text = 'export const placeholder = 1;\n'.repeat(25);
    mkdirSync(join(root, filePath, '..'), { recursive: true }); writeFileSync(join(root, filePath), text);
    graph.files.push({ filePath, language: 'typescript', contentHash: createHash('sha256').update(text).digest('hex') });
  }
  function symbol(filePath: string, name: string, kind: StructuralGraphDocument['entities'][number]['kind'] = 'function', containerKey?: string, keyName = name) {
    if (kind !== 'external' && !graph.files.some(f => f.filePath === filePath)) file(filePath);
    const key = kind === 'file' ? filePath : `${filePath}#${keyName}`;
    graph.entities.push({ key, name, kind, filePath, startLine: 2, endLine: 5, ...(containerKey ? { containerKey } : {}) });
    return key;
  }
  function edge(source: string, target: string, verb: StructuralGraphDocument['relations'][number]['verb'] = 'calls', metadata?: Record<string, unknown>) {
    graph.relations.push({ source, target, verb, origin: 'ast', confidence: 'extracted', location: { filePath: graph.entities.find(e => e.key === source)!.filePath, startLine: 3, endLine: 3 }, metadata });
  }
  const owner = symbol('src/service.ts', 'Service', 'class');
  const method = symbol('src/service.ts', 'save', 'method', owner, 'Service.save');
  const helper = symbol('src/service.ts', 'render', 'method', owner, 'Service.render');
  const sibling = symbol('src/service.ts', 'unrelated', 'method', owner, 'Service.unrelated');
  const constructor = symbol('src/service.ts', 'constructor', 'method', owner, 'Service.constructor');
  const dependency = symbol('src/request.ts', 'request');
  const noise = symbol('src/noise.ts', 'noise');
  const caller = symbol('src/command.ts', 'command');
  const test = symbol('tests/save.test.ts', 'save.test.ts', 'file');
  edge(method, helper); edge(helper, dependency); edge(sibling, noise);
  edge(caller, method); edge(test, method); edge(method, owner, 'references', { receiver: true });
  edge(owner, sibling, 'contains'); edge(owner, constructor, 'contains'); edge(constructor, noise);
  return { root, graph, symbol, edge, owner, method, helper, sibling, constructor, dependency, noise, caller, test };
}

describe('exact-symbol task context', () => {
  it('keeps same-file helpers, their dependencies, true callers and tests without sibling expansion', () => {
    const f = fixture();
    const result = buildTaskContext(f.root, f.graph, { selector: f.method, budget: 3000 });
    for (const key of [f.helper, f.dependency, f.caller, f.test]) expect(result).toContain(key);
    expect(result).not.toContain(f.sibling); expect(result).not.toContain(f.noise);
    expect(result).toContain('OWNER'); expect(result).toContain('constructor 2-5');
    expect(result).toContain('[receiver/owner]'); expect(result).toContain('[terminal hint]');
    const file = buildTaskContext(f.root, f.graph, { selector: 'src/service.ts', budget: 3000 });
    expect(file).toContain('src/noise.ts'); expect(file).toContain('File-level');
  });
  it('does not widen the neighborhood when unrelated methods or files are added', () => {
    const f = fixture();
    const result = buildTaskContext(f.root, f.graph, { selector: f.method, budget: 3000 });
    const before = result.split('\n').filter(l => /^(UPSTREAM|DEPENDENCY|TEST candidate)/.test(l));
    const extra = f.symbol('src/service.ts', 'extra', 'method', f.owner);
    f.edge(extra, f.symbol('src/extra.ts', 'remote'));
    const after = buildTaskContext(f.root, f.graph, { selector: f.method, budget: 3000 }).split('\n').filter(l => /^(UPSTREAM|DEPENDENCY|TEST candidate)/.test(l));
    expect(after).toEqual(before);
  });
  it('rejects same-file name collisions and resolves exact keys', () => {
    const f = fixture(); f.symbol('src/service.ts', 'save', 'method', undefined, 'Other.save');
    expect(() => buildTaskContext(f.root, f.graph, { selector: 'save' })).toThrow('Ambiguous');
    expect(buildTaskContext(f.root, f.graph, { selector: f.method })).toContain(f.method);
  });
  it('keeps a type reference terminal without suppressing a later runtime path', () => {
    const f = fixture();
    const value = f.symbol('src/value.ts', 'value'), tail = f.symbol('src/tail.ts', 'tail');
    f.edge(f.method, value, 'references', { typeOnly: true }); f.edge(value, tail);
    const before = buildTaskContext(f.root, f.graph, { selector: f.method, depth: 3, budget: 4000 });
    expect(before).toContain(value); expect(before).not.toContain(tail);
    f.edge(f.helper, value);
    const after = buildTaskContext(f.root, f.graph, { selector: f.method, depth: 3, budget: 4000 });
    expect(after).toContain(tail); expect(after).toContain('references/type-only');
  });
  it('keeps imports and exports as terminal navigation hints', () => {
    const f = fixture(); const entry = f.symbol('src/index.ts', 'index.ts', 'file');
    const hidden = f.symbol('src/hidden.ts', 'hidden');
    f.edge(entry, f.method, 'exports'); f.edge(hidden, entry);
    const result = buildTaskContext(f.root, f.graph, { selector: f.method, budget: 4000 });
    expect(result).toContain(entry); expect(result).not.toContain(hidden);
    expect(result).toContain('--exports-->');
  });
  it('does not turn an external or class target into calls to all its members', () => {
    const f = fixture(); const external = f.symbol('@external', 'fs', 'external');
    f.edge(f.method, external); f.edge(f.owner, f.noise, 'references');
    const result = buildTaskContext(f.root, f.graph, { selector: f.method, budget: 3000 });
    expect(result).toContain('EXTERNAL'); expect(result).toContain(external);
    expect(result).not.toContain(f.noise);
  });
  it('retains uncertainty, frontier, budget and source freshness guards', () => {
    const f = fixture(); f.graph.relations[0].confidence = 'review_required';
    const result = buildTaskContext(f.root, f.graph, { selector: f.method, depth: 1, budget: 400 });
    expect(result).toContain('inferred/review_required'); expect(result).toContain('Depth frontier: YES');
    expect(estimateTokenCount(result)).toBeLessThanOrEqual(400);
    writeFileSync(join(f.root, 'src/service.ts'), 'STALE_CONTENT');
    const stale = buildTaskContext(f.root, f.graph, { selector: f.method, snippets: true, budget: 3000 });
    expect(stale).toContain('STALE:'); expect(stale).not.toContain('SOURCE src/service.ts');
    expect(stale).not.toContain('STALE_CONTENT');
  });
  it('follows actual extracted method/callback/test edges, not just hand-authored graph fixtures', () => {
    const root = mkdtempSync(join(tmpdir(), 'symbol-extraction-')); roots.push(root);
    writeFileSync(join(root, 'service.ts'), `import { remote, noise } from './io';
export class Service {
  save() { return this.render(); }
  render() { return remote(); }
  other() { return noise(); }
}
`);
    writeFileSync(join(root, 'io.ts'), 'export function remote() { return 1; }\nexport function noise() { return 2; }\n');
    writeFileSync(join(root, 'command.ts'), `import { Service } from './service';
export function command(service: Service) { return service.save(); }
`);
    writeFileSync(join(root, 'service.test.ts'), `import { Service } from './service';
const test = (_: string, run: () => void) => run;
const service = new Service();
test('save', () => { service.save(); });
`);
    const graph = extractStructuralGraph({ workspaceRoot: root, scope: '.' });
    const result = buildTaskContext(root, graph, { selector: 'service.ts#Service.save', depth: 2, budget: 4000 });
    for (const key of ['service.ts#Service.render', 'io.ts#remote', 'command.ts#command', 'service.test.ts']) expect(result).toContain(key);
    expect(result).not.toContain('io.ts#noise'); expect(result).not.toContain('Service.other');
  });
  it('does not invent method coverage when extraction resolves a chained construction only to its class', () => {
    const root = mkdtempSync(join(tmpdir(), 'symbol-extraction-gap-')); roots.push(root);
    writeFileSync(join(root, 'service.ts'), 'export class Service { save() { return 1; } }\n');
    writeFileSync(join(root, 'service.test.ts'), `import { Service } from './service';
new Service().save();
`);
    const graph = extractStructuralGraph({ workspaceRoot: root, scope: '.' });
    // Known extractor limitation: the imported root shortcut resolves this
    // expression to Service, not Service.save. Container fan-out would falsely
    // suggest that all methods are covered; exact-symbol queries must not do it.
    expect(graph.relations.some(r => r.source === 'service.test.ts' && r.target === 'service.ts#Service.save')).toBe(false);
    const result = buildTaskContext(root, graph, { selector: 'service.ts#Service.save' });
    expect(result).toContain('No graph-linked tests');
    expect(result).toContain('no coverage conclusion');
    expect(buildTaskContext(root, graph, { selector: 'service.ts' })).toContain('TEST candidate service.test.ts');
  });
});
