import { existsSync, realpathSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { parseArgs } from 'node:util';
import { z } from 'zod';
import { AgentGraphStore } from './agentGraphStore.js';
import { StructuralGraphStore } from './structuralGraphStore.js';
import { buildTaskContext } from './taskContext.js';
import { featureBrief, featureIndex } from './featureBriefQuery.js';
import { AgentGraphQueryEngine, GRAPH_RELATION_VERBS, formatGraphSlice, formatShortestPath } from './graphQuery.js';
import {
  analyzeStructuralImpact, findStructuralPath, findStructuralCycles,
  reportStructuralCoupling, reportCrossBoundaryConnections,
  suggestStructuralCommunities, diffStructuralGraphs
} from './structural-analysis.mjs';
import {
  formatImpact, formatPath, formatCycles, formatCoupling, formatCrossBoundary,
  formatCommunities, formatDiff, withinBudget
} from './tools/registerStructuralAnalysisTools.js';

const text = z.string().trim().min(1).max(500);
const integer = (max: number) => z.coerce.number().int().min(1).max(max);
const budget = z.coerce.number().int().min(200).max(12000).default(1200);
const verbs = z.string().transform(value => value.split(',')).pipe(z.array(z.enum(GRAPH_RELATION_VERBS)).min(1).max(8)).optional();
const dependencyVerbs = z.string().transform(value => value.split(',')).pipe(z.array(z.enum(['imports', 'extends', 'implements', 'calls', 'references'])).min(1).max(5)).optional();
const common = { workspace: text.optional(), budget, json: z.boolean().optional() };
const scoped = { ...common, group: text.optional() };
const graphOptions = { ...scoped, verbs, evidence: z.boolean().optional() };
const schemas = {
  features: z.object({ ...common, query: text.optional() }).strict(),
  brief: z.object({ ...common, budget: z.coerce.number().int().min(600).max(12000).default(1800), feature: text }).strict(),
  context: z.object({ ...common, budget: z.coerce.number().int().min(400).max(12000).default(1600), selector: text, mode: z.enum(['change', 'understand']).optional(), depth: integer(6).optional(), snippets: z.boolean().optional() }).strict(),
  overview: z.object(common).strict(),
  query: z.object({ ...graphOptions, query: text, file: text.optional(), depth: z.coerce.number().int().min(0).max(5).optional() }).strict(),
  entity: z.object({ ...scoped, selector: text }).strict(),
  neighbors: z.object({ ...graphOptions, selector: text, direction: z.enum(['incoming', 'outgoing', 'both']).optional(), depth: integer(5).optional() }).strict(),
  path: z.object({ ...graphOptions, source: text, target: text, direction: z.enum(['outgoing', 'both']).optional(), depth: integer(12).optional() }).strict(),
  impact: z.object({ ...common, selector: text, direction: z.enum(['upstream', 'downstream', 'both']).optional(), depth: integer(8).optional(), verbs: dependencyVerbs }).strict(),
  'structural-path': z.object({ ...common, source: text, target: text, direction: z.enum(['outgoing', 'both']).optional(), depth: integer(20).optional(), verbs: dependencyVerbs }).strict(),
  structure: z.object({ ...common, analysis: z.enum(['cycles', 'coupling', 'cross_boundary', 'diff', 'communities']), limit: integer(100).optional(), verbs: dependencyVerbs }).strict(),
  search: z.object({ ...scoped, query: text.optional(), file: text.optional(), type: text.optional(), limit: integer(100).default(20) }).strict(),
  relations: z.object({ ...scoped, source: text.optional(), target: text.optional(), verb: z.enum(GRAPH_RELATION_VERBS).optional(), limit: integer(100).default(20), evidence: z.boolean().optional() }).strict()
};

// The only database data used by dependency queries is human description prose.
// Use Node's built-in, read-only SQLite reader: no npm/native addon installation.
interface SqliteReader {
  prepare(sql: string): { all(): Record<string, unknown>[]; get(): Record<string, unknown> | undefined };
  close(): void;
}
export async function readDescriptionOverrides(workspace: string): Promise<Map<string, string>> {
  const file = join(workspace, '.vscode', '.knowledge', 'graph.sqlite');
  if (!existsSync(file)) return new Map();
  const moduleName: string = 'node:sqlite';
  const sqlite = await import(moduleName) as { DatabaseSync: new (file: string, options: { readOnly: boolean; timeout: number }) => SqliteReader };
  const db = new sqlite.DatabaseSync(file, { readOnly: true, timeout: 1000 });
  try {
    if (!db.prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='agent_entity_overrides'").get()) return new Map();
    const rows = z.array(z.object({ agent_key: z.string(), description: z.string() })).parse(
      db.prepare('SELECT agent_key, description FROM agent_entity_overrides').all()
    );
    return new Map(rows.map(row => [row.agent_key, row.description]));
  } finally { db.close(); }
}

export async function runQuery(command: string, raw: Record<string, unknown>): Promise<string> {
  if (!Object.prototype.hasOwnProperty.call(schemas, command)) throw new Error(`Unknown command: ${command}. Use --help.`);
  const schema = schemas[command as keyof typeof schemas];
  // Parse before any file/database access; each command rejects irrelevant flags.
  const options = schema.parse(raw);
  const workspace = realpathSync(resolve(options.workspace ?? process.cwd()));
  if (!statSync(workspace).isDirectory()) throw new Error('Workspace must be a directory.');
  const format = { tokenBudget: options.budget, includeEvidence: raw.evidence === true };
  if (command === 'features') {
    const o = schemas.features.parse(raw);
    return featureIndex(workspace, o.query ?? '', o.budget);
  }
  if (command === 'brief') {
    const o = schemas.brief.parse(raw);
    return featureBrief(workspace, o.feature, o.budget);
  }
  if (command === 'context') {
    const o = schemas.context.parse(raw);
    return buildTaskContext(workspace, new StructuralGraphStore(workspace).read(), o);
  }
  if (['impact', 'structural-path', 'structure'].includes(command)) {
    const store = new StructuralGraphStore(workspace);
    const graph = store.read();
    if (command === 'impact') {
      const o = schemas.impact.parse(raw);
      return withinBudget(formatImpact(analyzeStructuralImpact(graph, o.selector, { direction: o.direction, maxDepth: o.depth, relationVerbs: o.verbs })), o.budget);
    }
    if (command === 'structural-path') {
      const o = schemas['structural-path'].parse(raw);
      return withinBudget(formatPath(findStructuralPath(graph, o.source, o.target, { direction: o.direction, maxDepth: o.depth, relationVerbs: o.verbs })), o.budget);
    }
    const o = schemas.structure.parse(raw);
    const filter = { limit: o.limit ?? 20, relationVerbs: o.verbs };
    let lines: string[];
    switch (o.analysis) {
      case 'cycles': lines = formatCycles(findStructuralCycles(graph, filter), graph.generatedAt); break;
      case 'coupling': lines = formatCoupling(reportStructuralCoupling(graph, filter), graph.generatedAt); break;
      case 'cross_boundary': lines = formatCrossBoundary(reportCrossBoundaryConnections(graph, filter).slice(0, filter.limit), graph.generatedAt); break;
      case 'communities': lines = formatCommunities(suggestStructuralCommunities(graph, filter).slice(0, filter.limit), graph.generatedAt); break;
      case 'diff': lines = formatDiff(diffStructuralGraphs(graph, store.readPrevious())); break;
    }
    return withinBudget(lines, o.budget);
  }
  const store = new AgentGraphStore(workspace);
  if (!existsSync(store.filePath)) throw new Error('agent-graph.json is missing. Generate the graph first; this query does not modify the workspace.');
  const overview = store.getOverview(); // validates the graph before reading overrides
  if (!overview.generatedAt) throw new Error('Invalid agent-graph.json: JSON/schema validation failed. Preserve the file and validate or refresh it before querying.');
  if (command === 'overview') {
    return withinBudget([
      `Knowledge graph | generated ${overview.generatedAt} | snapshot, not live source`,
      ...overview.groups.map(g => `${g.key} | ${g.name} | ${g.kind} | ${g.entityCount} entities | ${g.relationCount} relations`)
    ], options.budget);
  }
  const overrides = await readDescriptionOverrides(workspace);
  const entities = store.listAllEntities(overrides);
  const relations = store.listAllRelations();
  const group = 'group' in options ? options.group : undefined;
  if (group && !overview.groups.some(g => g.key === group)) throw new Error(`Unknown group: ${group}. Run overview to select a current group key.`);
  const engine = new AgentGraphQueryEngine(entities, relations);
  if (command === 'query') {
    const o = schemas.query.parse(raw);
    return formatGraphSlice(engine.queryGraph({ query: o.query, groupKey: o.group, filePath: o.file, relationVerbs: o.verbs, depth: o.depth }), format).text;
  }
  if (command === 'entity') {
    const o = schemas.entity.parse(raw);
    return formatGraphSlice(engine.getEntities(o.selector, o.group), format).text;
  }
  if (command === 'neighbors') {
    const o = schemas.neighbors.parse(raw);
    return formatGraphSlice(engine.getNeighbors({ selector: o.selector, groupKey: o.group, direction: o.direction, relationVerbs: o.verbs, depth: o.depth }), format).text;
  }
  if (command === 'path') {
    const o = schemas.path.parse(raw);
    return formatShortestPath(engine.shortestPath({ source: o.source, target: o.target, groupKey: o.group, direction: o.direction, relationVerbs: o.verbs, maxDepth: o.depth }), format).text;
  }
  if (command === 'search') {
    const o = schemas.search.parse(raw);
    const contains = (value: string, query?: string) => !query || value.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    const matches = entities.filter(e => (!o.group || e.groupKey === o.group) && (!o.type || e.type === o.type) && contains(e.filePath, o.file) && contains(`${e.name} ${e.filePath} ${e.description ?? ''}`, o.query)).slice(0, o.limit);
    return withinBudget(matches.length ? matches.map(e => `N ${e.name} <${e.key}> | ${e.type} | ${e.filePath}:${e.startLine}-${e.endLine} | ${e.groupKey}${e.description ? ` | ${e.description}` : ''}`) : ['No matching entities.'], o.budget);
  }
  const o = schemas.relations.parse(raw);
  const matches = relations.filter(r => (!o.group || r.groupKey === o.group) && (!o.verb || r.verb === o.verb) && (!o.source || r.sourceName.toLocaleLowerCase().includes(o.source.toLocaleLowerCase())) && (!o.target || r.targetName.toLocaleLowerCase().includes(o.target.toLocaleLowerCase()))).slice(0, o.limit);
  return withinBudget(matches.length ? matches.map(r => `R ${r.sourceKey} --${r.verb}--> ${r.targetKey} | ${r.groupKey} | ${r.origin}/${r.confidence}${o.evidence ? ` | ${r.evidence.map(e => `${e.filePath}:${e.startLine}`).join(', ')}` : ''}`) : ['No matching relations.'], o.budget);
}

const HELP = `VibeKnowledge read-only dependency queries (Node >=26.1 <27; no MCP or npm install)
node query.cjs <command> [--workspace PATH] [--budget 1200] [--json]
features [--query PAGE_OR_FEATURE]
brief --feature KEY [--budget 1800]
context --selector FILE_OR_SYMBOL [--mode change|understand] [--depth 1..6] [--snippets]
overview
query --query TEXT [--group KEY] [--file PATH] [--depth 0..5] [--evidence]
entity --selector KEY [--group KEY]
neighbors --selector KEY [--group KEY] [--direction incoming|outgoing|both] [--depth 1..5]
path --source KEY --target KEY [--group KEY] [--direction outgoing|both] [--depth 1..12]
impact --selector KEY [--direction upstream|downstream|both] [--depth 1..8]
structural-path --source KEY --target KEY [--direction outgoing|both] [--depth 1..20]
structure --analysis cycles|coupling|cross_boundary|diff|communities [--limit 20]
search [--query TEXT] [--file PATH] [--type TYPE] [--group KEY] [--limit 20]
relations [--source TEXT] [--target TEXT] [--verb VERB] [--group KEY] [--limit 20] [--evidence]
Traversal commands accept --verbs imports,calls,...; evidence is opt-in for curated queries.
--json returns {text}; default stdout is compact text. Errors go to stderr, exit 1.
Graphs are snapshots: verify relevant source before editing; missing paths do not prove independence.`;

export async function main(argv = process.argv.slice(2)): Promise<void> {
  if (argv.length === 0 || argv.includes('--help')) { process.stdout.write(HELP + '\n'); return; }
  const [major, minor] = process.versions.node.split('.').map(Number);
  if (major !== 26 || minor < 1) throw new Error('Use Node >=26.1.0 <27. No package installation is needed.');
  const { values, positionals } = parseArgs({ args: argv, allowPositionals: true, strict: true, options: {
    ...Object.fromEntries(['workspace', 'budget', 'group', 'query', 'file', 'depth', 'selector', 'source', 'target', 'direction', 'analysis', 'limit', 'type', 'verb', 'verbs', 'mode', 'feature'].map(key => [key, { type: 'string' as const }])),
    evidence: { type: 'boolean' }, json: { type: 'boolean' }, snippets: { type: 'boolean' }
  } });
  if (positionals.length !== 1) throw new Error('Expected exactly one command; quote selectors/paths containing spaces. Use --help.');
  const result = await runQuery(positionals[0], values);
  process.stdout.write((values.json ? JSON.stringify({ text: result }) : result) + '\n');
}
