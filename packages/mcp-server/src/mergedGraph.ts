import type {
  EntityRecord,
  GraphDatabase,
  KnowledgeOverview,
  RelationRecord,
  SearchEntitiesParams,
  SearchRelationsParams
} from './database.js';
import type {
  AgentGraphEntityRecord,
  AgentGraphRelationRecord,
  AgentGraphStore
} from './agentGraphStore.js';
import { canonicalizeEntityKey } from './canonicalize-entity-key.mjs';

export interface ManualEntityRecord extends EntityRecord {
  source: 'manual';
}

export interface ManualRelationRecord extends RelationRecord {
  source: 'manual';
}

export type MergedEntityRecord = ManualEntityRecord | AgentGraphEntityRecord;
export type MergedRelationRecord =
  | ManualRelationRecord
  | AgentGraphRelationRecord;

export interface MergedKnowledgeOverview extends KnowledgeOverview {
  generation: {
    generatedAt: string | null;
    scope: string | null;
    groupCount: number;
    groups: ReturnType<AgentGraphStore['getOverview']>['groups'];
  };
}

/** Query Agent structure and apply human descriptions stored in SQLite. */
export function searchMergedEntities(
  db: GraphDatabase,
  agentGraph: AgentGraphStore,
  params: SearchEntitiesParams = {}
): MergedEntityRecord[] {
  const limit = clampLimit(params.limit);
  const agentResults = agentGraph.searchEntities(
    { ...params, limit: 100 },
    getAgentDescriptionOverrides(db, agentGraph)
  );

  return deduplicate(agentResults, entityIdentityAliases, limit);
}

/** Query Agent-authored relations; humans do not mutate graph structure. */
export function searchMergedRelations(
  db: GraphDatabase,
  agentGraph: AgentGraphStore,
  params: SearchRelationsParams = {}
): MergedRelationRecord[] {
  const limit = clampLimit(params.limit);
  const agentResults = agentGraph.searchRelations({ ...params, limit: 100 });

  return deduplicate(agentResults, relationIdentityAliases, limit);
}

/**
 * Report the de-duplicated Agent graph. SQLite contributes human description
 * overrides only. Group summaries report occurrences, while top-level totals
 * stay de-duplicated.
 */
export function getMergedOverview(
  db: GraphDatabase,
  agentGraph: AgentGraphStore
): MergedKnowledgeOverview {
  const agent = agentGraph.getOverview();
  const mergedEntities = deduplicate(
    agentGraph.listAllEntities(getAgentDescriptionOverrides(db, agentGraph)),
    entityIdentityAliases,
    Number.MAX_SAFE_INTEGER
  );
  const mergedRelations = deduplicate(
    agentGraph.listAllRelations(),
    relationIdentityAliases,
    Number.MAX_SAFE_INTEGER
  );

  return {
    entityCount: mergedEntities.length,
    relationCount: mergedRelations.length,
    observationCount: 0,
    lastUpdatedAt: agent.generatedAt,
    generation: {
      generatedAt: agent.generatedAt,
      scope: agent.scope,
      groupCount: agent.groupCount,
      groups: agent.groups
    }
  };
}

function deduplicate<T>(
  records: T[],
  identityAliases: (record: T) => string[],
  limit: number
): T[] {
  const seen = new Set<string>();
  const uniqueResults: T[] = [];
  for (const record of records) {
    const aliases = identityAliases(record);
    if (aliases.some((alias) => seen.has(alias))) {
      continue;
    }
    aliases.forEach((alias) => seen.add(alias));
    uniqueResults.push(record);
    if (uniqueResults.length >= limit) {
      break;
    }
  }
  return uniqueResults;
}

/** Reuse old manual entity prose without treating those rows as structure. */
export function getAgentDescriptionOverrides(
  db: GraphDatabase,
  agentGraph: AgentGraphStore
): Map<string, string> {
  const overrides = new Map(db.getAgentEntityDescriptionOverrides());
  const legacyDescriptions = new Map<string, string>();
  for (const entity of db.listAllEntities()) {
    if (entity.description !== null) {
      legacyDescriptions.set(symbolIdentity(entity), entity.description);
    }
  }
  for (const entity of agentGraph.listAllEntities()) {
    if (overrides.has(entity.key)) {
      continue;
    }
    const description = legacyDescriptions.get(symbolIdentity(entity));
    if (description !== undefined) {
      overrides.set(entity.key, description);
    }
  }
  return overrides;
}

function entityIdentityAliases(
  entity: ManualEntityRecord | AgentGraphEntityRecord
): string[] {
  return entity.source === 'agent'
    ? [`key:${canonicalizeEntityKey(entity.key)}`]
    : [`key:${canonicalizeEntityKey(entity.id)}`];
}

function relationIdentityAliases(
  relation: ManualRelationRecord | AgentGraphRelationRecord
): string[] {
  const sourceKey =
    relation.source === 'manual'
      ? relation.sourceEntityId
      : relation.sourceKey;
  const targetKey =
    relation.source === 'manual'
      ? relation.targetEntityId
      : relation.targetKey;

  return [
    `relation-key:${canonicalizeEntityKey(sourceKey)}\u0000${normalize(
      relation.verb
    )}\u0000${canonicalizeEntityKey(targetKey)}`
  ];
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function symbolIdentity(entity: {
  name: string;
  filePath: string;
}): string {
  return canonicalizeEntityKey(`${entity.filePath}#${entity.name}`);
}

function clampLimit(limit?: number): number {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return 20;
  }
  return Math.max(1, Math.min(Math.trunc(limit), 100));
}
