import { createHash } from 'node:crypto';
import { readFileSync, realpathSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve } from 'node:path';
import type { StructuralGraphDocument } from './structuralGraphStore.js';
import { estimateTokenCount } from './graphQuery.js';

type Entity = StructuralGraphDocument['entities'][number];
type Relation = StructuralGraphDocument['relations'][number];
type Link = { from: string; to: string; relations: Relation[] };
type Visit = { file: string; depth: number; path: Link[] };
export interface TaskContextOptions {
  selector: string;
  mode?: 'change' | 'understand';
  depth?: number;
  budget?: number;
  snippets?: boolean;
}

// File-level navigation, not a call/data-flow analysis.
const DEPENDENCIES = new Set(['imports', 'exports', 'calls', 'references', 'extends', 'implements']);
const TEST_FILE = /(?:^|\/)(?:__tests__|tests?|spec)(?:\/|$)|\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const MAX_SOURCE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;

function validateTopology(graph: StructuralGraphDocument): void {
  const files = new Set(graph.files.map(f => f.filePath));
  const keys = new Set(graph.entities.map(e => e.key));
  if (files.size !== graph.files.length || keys.size !== graph.entities.length) throw new Error('Invalid structural graph: duplicate file/entity identities.');
  for (const entity of graph.entities) {
    if (entity.kind !== 'external' && !files.has(entity.filePath)) throw new Error(`Invalid structural graph: unindexed entity ${entity.key}.`);
    if (entity.endLine < entity.startLine) throw new Error(`Invalid structural graph: reversed source range ${entity.key}.`);
  }
  for (const relation of graph.relations) {
    if (!keys.has(relation.source) || !keys.has(relation.target)) throw new Error('Invalid structural graph: dangling relation endpoint.');
    if (!files.has(relation.location.filePath) || relation.location.endLine < relation.location.startLine) throw new Error('Invalid structural graph: invalid relation evidence location.');
  }
}

const shortLabel = (value: string, length: number) => value.replace(/\s+/g, ' ').slice(0, length) + (value.length > length ? '…' : '');

/** Never follow graph-controlled paths or symlinks outside the workspace. */
function sourcePath(root: string, file: string): string {
  if (isAbsolute(file) || /^[a-z]:/i.test(file) || file.includes('\0')) throw new Error(`Unsafe graph path: ${file}`);
  const path = resolve(root, file);
  const inside = (candidate: string) => {
    const rel = relative(root, candidate);
    return rel !== '..' && !rel.startsWith('../') && !rel.startsWith('..\\') && !isAbsolute(rel);
  };
  if (!inside(path)) throw new Error(`Unsafe graph path: ${file}`);
  const actual = realpathSync(path);
  if (!inside(actual)) throw new Error(`Graph path leaves workspace: ${file}`);
  return actual;
}

function inspectSources(root: string, graph: StructuralGraphDocument) {
  const texts = new Map<string, string>();
  const changed: string[] = [], unavailable: string[] = [];
  let bytes = 0;
  for (const file of graph.files) {
    try {
      const path = sourcePath(root, file.filePath);
      const stat = statSync(path);
      if (!stat.isFile() || stat.size > MAX_SOURCE_BYTES || bytes + stat.size > MAX_TOTAL_BYTES) {
        unavailable.push(file.filePath); continue;
      }
      const content = readFileSync(path);
      bytes += content.byteLength;
      // Match the extractor/validator's UTF-8-text hashing convention.
      const decoded = content.toString('utf8');
      if (createHash('sha256').update(decoded).digest('hex') !== file.contentHash) changed.push(file.filePath);
      else texts.set(file.filePath, decoded);
    } catch { unavailable.push(file.filePath); }
  }
  return { texts, changed, unavailable };
}

function locate(graph: StructuralGraphDocument, selector: string): Entity[] {
  const normalized = selector.replaceAll('\\', '/').replace(/^\.\//, '');
  const exact = graph.entities.filter(e => e.kind !== 'external' && e.key === normalized);
  if (exact.length && exact.some(e => e.kind !== 'file')) return exact;
  const file = graph.files.find(f => f.filePath === normalized);
  if (file) return graph.entities.filter(e => e.filePath === file.filePath && e.kind !== 'external');
  return graph.entities.filter(e => e.kind !== 'external' && e.name === selector);
}

function fileLinks(graph: StructuralGraphDocument) {
  const entities = new Map(graph.entities.map(e => [e.key, e]));
  const files = new Set(graph.files.map(f => f.filePath));
  const links = new Map<string, Link>();
  for (const relation of graph.relations) {
    if (!DEPENDENCIES.has(relation.verb)) continue;
    const source = entities.get(relation.source), target = entities.get(relation.target);
    if (!source || !target || source.filePath === target.filePath || !files.has(source.filePath) || !files.has(target.filePath)) continue;
    const id = `${source.filePath}\0${target.filePath}`;
    let link = links.get(id);
    if (!link) { link = { from: source.filePath, to: target.filePath, relations: [] }; links.set(id, link); }
    link.relations.push(relation);
  }
  const incoming = new Map<string, Link[]>(), outgoing = new Map<string, Link[]>();
  for (const link of links.values()) {
    outgoing.set(link.from, [...(outgoing.get(link.from) ?? []), link]);
    incoming.set(link.to, [...(incoming.get(link.to) ?? []), link]);
  }
  for (const list of [...incoming.values(), ...outgoing.values()]) list.sort((a, b) => a.from.localeCompare(b.from) || a.to.localeCompare(b.to));
  return { entities, incoming, outgoing };
}

function walk(seed: string, direction: 'upstream' | 'downstream', adjacency: Map<string, Link[]>, maxDepth: number) {
  const seen = new Set([seed]);
  const queue: Visit[] = [{ file: seed, depth: 0, path: [] }];
  let frontier = false;
  for (let index = 0; index < queue.length; index++) {
    const current = queue[index];
    // Tests are consumers, not bridges into unrelated production subsystems.
    if (current.depth && TEST_FILE.test(current.file)) continue;
    for (const link of adjacency.get(current.file) ?? []) {
      const next = direction === 'upstream' ? link.from : link.to;
      if (seen.has(next)) continue;
      if (current.depth >= maxDepth) { frontier = true; continue; }
      seen.add(next);
      queue.push({ file: next, depth: current.depth + 1, path: [...current.path, link] });
    }
  }
  return { visits: queue.slice(1), frontier };
}

function bestRelation(link: Link): Relation {
  const priority = (r: Relation) => (r.confidence === 'extracted' ? 0 : 5) + (r.metadata?.typeOnly === true ? 4 : 0) + (r.verb === 'calls' ? 0 : r.verb === 'imports' ? 2 : 1);
  return [...link.relations].sort((a, b) => priority(a) - priority(b) || a.location.startLine - b.location.startLine)[0];
}

function relationReason(link: Link, entities: Map<string, Entity>): string {
  const r = bestRelation(link);
  const source = entities.get(r.source), target = entities.get(r.target);
  return `${source?.name ?? link.from} --${r.verb}${r.metadata?.typeOnly ? '/type-only' : ''}--> ${target?.name ?? link.to} @ ${r.location.filePath}:${r.location.startLine} [${r.confidence}]`;
}

function excerpt(texts: Map<string, string>, file: string, start: number, end: number, maximum = 18): string {
  const source = texts.get(file);
  if (!source) return '';
  const lines = source.split(/\r\n|\r|\n/);
  const last = Math.min(end, start + maximum - 1, lines.length);
  if (start > last) return '';
  return lines.slice(start - 1, last).map((line, i) => `${start + i}: ${line}`).join('\n') + (last < end ? `\n[excerpt ends; declaration continues to ${end}]` : '');
}

/** One bounded, source-backed navigation packet. No source/graph/database writes. */
export function buildTaskContext(workspace: string, graph: StructuralGraphDocument, options: TaskContextOptions): string {
  validateTopology(graph);
  const root = realpathSync(workspace);
  const seeds = locate(graph, options.selector);
  const seedFiles = [...new Set(seeds.map(e => e.filePath))];
  if (!seeds.length) throw new Error(`No exact graph file/symbol '${options.selector}'. Locate its source path with rg; graph absence is not independence.`);
  if (seedFiles.length !== 1) throw new Error(`Ambiguous selector '${options.selector}': ${seedFiles.slice(0, 12).join(', ')}. Use an exact file path or entity key.`);
  const seedFile = seedFiles[0];
  const mode = options.mode ?? 'change', depth = options.depth ?? 2, budget = options.budget ?? 1600;
  const { entities, incoming, outgoing } = fileLinks(graph);
  const sources = inspectSources(root, graph);
  const up = walk(seedFile, 'upstream', incoming, depth);
  const down = walk(seedFile, 'downstream', outgoing, depth);
  const visits = mode === 'understand' ? [...down.visits, ...up.visits.filter(v => v.depth === 1)] : [...up.visits, ...down.visits];
  const relevant = new Set([seedFile, ...visits.map(v => v.file)]);
  const diagnostics = graph.diagnostics.filter(d => !d.filePath || relevant.has(d.filePath));
  const warnings: string[] = [];
  if (sources.changed.length) warnings.push(`STALE: ${sources.changed.length} indexed files changed (${sources.changed.slice(0, 5).join(', ')}). Dependencies may be missing; changed-file excerpts withheld.`);
  if (sources.unavailable.length) warnings.push(`UNVERIFIED: ${sources.unavailable.length} indexed files unreadable/unsafe/over size limit (${sources.unavailable.slice(0, 5).join(', ')}).`);
  for (const diagnostic of diagnostics) warnings.push(`${diagnostic.code} @ ${diagnostic.filePath ?? 'configuration'}${diagnostic.startLine ? ':' + diagnostic.startLine : ''}: ${diagnostic.message}`);
  const cyclicFiles = up.visits.filter(v => down.visits.some(d => d.file === v.file) && !TEST_FILE.test(v.file));
  if (cyclicFiles.length) warnings.push(`REVIEW: file-level dependency cycle reaches ${cyclicFiles.slice(0, 4).map(v => v.file).join(', ')}; this is not proof of a runtime recursion.`);
  const uncertain = [...incoming.values()].flat().filter(l => relevant.has(l.from) && relevant.has(l.to)).flatMap(l => l.relations).filter(r => r.confidence !== 'extracted');
  if (uncertain.length) warnings.push(`REVIEW: ${uncertain.length} inferred/review_required relations in this neighborhood; verify their source before treating them as calls.`);
  const header = [
    `Task context | ${mode} | ${shortLabel(seedFile, 160)} | depth ${depth}`,
    `Snapshot ${shortLabel(graph.generatedAt, 40)}; indexed hashes: ${sources.texts.size}/${graph.files.length} match. New/unindexed files, configuration and runtime behavior NOT certified.`,
    'File-level dependency paths, NOT execution/data flow. Tests below are candidates, NOT measured coverage.',
  ];
  const blocks: { kind: string; text: string }[] = [];
  for (const warning of warnings) blocks.push({ kind: 'warning', text: `! ${warning}` });
  const declarations = seeds.filter(e => e.kind !== 'file').sort((a, b) => Number(b.exported === true) - Number(a.exported === true) || a.startLine - b.startLine);
  if (declarations.length) blocks.push({ kind: 'source', text: `ENTRY ${seedFile}: ${declarations.slice(0, 8).map(e => `${e.name}:${e.startLine}-${e.endLine}`).join('; ')}${declarations.length > 8 ? ` (+${declarations.length - 8} declarations)` : ''}` });
  const unique = new Set<string>();
  const directionRank = (v: Visit) => mode === 'understand' && !down.visits.includes(v) ? 1 : 0;
  const ordered = [...visits].sort((a, b) => directionRank(a) - directionRank(b) || a.depth - b.depth || Number(TEST_FILE.test(a.file)) - Number(TEST_FILE.test(b.file)) || a.file.localeCompare(b.file));
  for (const visit of ordered) {
    if (unique.has(visit.file)) continue;
    unique.add(visit.file);
    const upstream = up.visits.includes(visit);
    const last = visit.path[visit.path.length - 1];
    const r = bestRelation(last);
    const member = entities.get(upstream ? r.source : r.target);
    const prefix = TEST_FILE.test(visit.file) ? 'TEST candidate' : upstream ? 'UPSTREAM' : 'DEPENDENCY';
    const via = visit.path.length > 1 ? ` via ${visit.path.slice(0, -1).map(l => upstream ? l.from : l.to).join(' -> ')}` : '';
    const anchors = [...new Set(last.relations.filter(edge => edge.location.filePath === visit.file).map(edge => edge.location.startLine))].sort((a, b) => a - b);
    const location = upstream ? `:${anchors.slice(0, 4).join(',')}${anchors.length > 4 ? ` (+${anchors.length - 4} sites)` : ''}` : member ? `:${member.startLine}-${member.endLine}` : '';
    blocks.push({ kind: 'file', text: `${prefix} ${visit.file}${location} (${visit.depth} hop${visit.depth === 1 ? '' : 's'}${via})\n  ${relationReason(last, entities)}` });
    if (options.snippets === true && upstream && visit.depth === 1) {
      const start = Math.max(1, r.location.startLine - 3);
      const snippet = excerpt(sources.texts, visit.file, start, r.location.endLine + 4, 12);
      if (snippet) blocks.push({ kind: 'snippet', text: `SOURCE use site ${visit.file}:${start}\n${snippet}` });
    }
  }
  if (!visits.some(v => TEST_FILE.test(v.file))) blocks.push({ kind: 'warning', text: '! No graph-linked tests in this slice. Locate tests separately; no coverage conclusion.' });
  if (options.snippets === true) {
    const first = declarations.find(e => e.kind === 'class' || e.kind === 'function') ?? declarations[0];
    if (first) {
      const snippet = excerpt(sources.texts, seedFile, first.startLine, first.endLine);
      if (snippet) blocks.push({ kind: 'snippet', text: `SOURCE ${seedFile}:${first.startLine}\n${snippet}` });
    }
  }
  const included: typeof blocks = [];
  const footer = () => {
    const omitted = blocks.length - included.length;
    const omittedWarnings = blocks.filter(b => b.kind === 'warning' && !included.includes(b)).length;
    return `Scope: ${unique.size} related files; shown ${included.filter(b => b.kind === 'file').length}. ${omitted} blocks omitted (${omittedWarnings} warnings). Depth frontier: ${up.frontier || down.frontier ? 'YES' : 'no known frontier'}. ${omitted || up.frontier || down.frontier ? 'INCOMPLETE; narrow selector or expand depth/budget as needed.' : 'Snapshot slice only; not proof of complete impact.'}`;
  };
  const output = () => [...header, ...included.map(b => b.text), footer()].join('\n');
  for (const block of blocks) {
    included.push(block);
    if (estimateTokenCount(output()) > budget) included.pop();
  }
  return output();
}
