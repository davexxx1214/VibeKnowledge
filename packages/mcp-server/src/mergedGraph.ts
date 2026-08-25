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
  };
}

/** Query both stores, preserving manual records when the same entity exists. */
export function searchMergedEntities(
  db: GraphDatabase,
  agentGraph: AgentGraphStore,
  params: SearchEntitiesParams = {}
): MergedEntityRecord[] {
  const limit = clampLimit(params.limit);
  const manualResults: ManualEntityRecord[] = db
    .searchEntities({ ...params, limit: 100 })
    .map((entity) => ({ ...entity, source: 'manual' }));
  const agentResults = agentGraph.searchEntities(
    { ...params, limit: 100 },
    db.getAgentEntityDescriptionOverrides()
  );

  return mergePreferManual(
    manualResults,
    agentResults,
    entityIdentityAliases,
    limit
  );
}

/** Query both stores, preserving manual records when the same relation exists. */
export function searchMergedRelations(
  db: GraphDatabase,
  agentGraph: AgentGraphStore,
  params: SearchRelationsParams = {}
): MergedRelationRecord[] {
  const limit = clampLimit(params.limit);
  const manualResults: ManualRelationRecord[] = db
    .searchRelations({ ...params, limit: 100 })
    .map((relation) => ({ ...relation, source: 'manual' }));
  const agentResults = agentGraph.searchRelations({ ...params, limit: 100 });

  return mergePreferManual(
    manualResults,
    agentResults,
    relationIdentityAliases,
    limit
  );
}

/**
 * Report the de-duplicated unified graph. Observation counts remain
 * database-only because v1 of the generated layer does not contain them.
 */
export function getMergedOverview(
  db: GraphDatabase,
  agentGraph: AgentGraphStore
): MergedKnowledgeOverview {
  const manual = db.getOverview();
  const agent = agentGraph.getOverview();
  const mergedEntities = mergePreferManual(
    db.listAllEntities().map((entity) => ({
      ...entity,
      source: 'manual' as const
    })),
    agentGraph.listAllEntities(db.getAgentEntityDescriptionOverrides()),
    entityIdentityAliases,
    Number.MAX_SAFE_INTEGER
  );
  const mergedRelations = mergePreferManual(
    db.listAllRelations().map((relation) => ({
      ...relation,
      source: 'manual' as const
    })),
    agentGraph.listAllRelations(),
    relationIdentityAliases,
    Number.MAX_SAFE_INTEGER
  );

  return {
    entityCount: mergedEntities.length,
    relationCount: mergedRelations.length,
    observationCount: manual.observationCount,
    lastUpdatedAt: latestTimestamp(manual.lastUpdatedAt, agent.generatedAt),
    generation: {
      generatedAt: agent.generatedAt,
      scope: agent.scope
    }
  };
}

function mergePreferManual<TManual, TAgent>(
  manualResults: TManual[],
  agentResults: TAgent[],
  identityAliases: (record: TManual | TAgent) => string[],
  limit: number
): Array<TManual | TAgent> {
  const seen = new Set<string>();

  // The database is authoritative for duplicate identities, even when a
  // matching manual record would otherwise fall outside the requested limit.
  for (const record of manualResults) {
    const aliases = identityAliases(record);
    aliases.forEach((alias) => seen.add(alias));
  }

  const uniqueAgentResults: TAgent[] = [];
  for (const record of agentResults) {
    const aliases = identityAliases(record);
    if (aliases.some((alias) => seen.has(alias))) {
      continue;
    }
    aliases.forEach((alias) => seen.add(alias));
    uniqueAgentResults.push(record);
  }

  if (manualResults.length + uniqueAgentResults.length <= limit) {
    return [...manualResults, ...uniqueAgentResults];
  }
  if (manualResults.length === 0) {
    return uniqueAgentResults.slice(0, limit);
  }
  if (uniqueAgentResults.length === 0 || limit === 1) {
    return manualResults.slice(0, limit);
  }

  // A bounded merged query must not let a large manual result set hide the
  // generated records completely. Split the available slots, then give unused quota
  // back to the other source while keeping manual records first in the output.
  let manualQuota = Math.min(manualResults.length, Math.ceil(limit / 2));
  let agentQuota = Math.min(uniqueAgentResults.length, limit - manualQuota);
  let remaining = limit - manualQuota - agentQuota;

  const additionalManual = Math.min(
    remaining,
    manualResults.length - manualQuota
  );
  manualQuota += additionalManual;
  remaining -= additionalManual;
  agentQuota += Math.min(
    remaining,
    uniqueAgentResults.length - agentQuota
  );

  return [
    ...manualResults.slice(0, manualQuota),
    ...uniqueAgentResults.slice(0, agentQuota)
  ];
}

function entityIdentityAliases(
  entity: ManualEntityRecord | AgentGraphEntityRecord
): string[] {
  const aliases = [
    `symbol:${normalizePath(entity.filePath)}\u0000${normalize(entity.name)}`
  ];

  if (entity.source === 'manual') {
    aliases.push(`key:${normalize(entity.id)}`);
  } else {
    aliases.push(`key:${normalize(entity.key)}`);
  }
  return aliases;
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
    `relation-key:${normalize(sourceKey)}\u0000${normalize(
      relation.verb
    )}\u0000${normalize(targetKey)}`,
    [
      'relation',
      endpointIdentity(
        relation.sourceName,
        relation.sourceFilePath
      ),
      normalize(relation.verb),
      endpointIdentity(
        relation.targetName,
        relation.targetFilePath
      )
    ].join(':')
  ];
}

function endpointIdentity(name: string, filePath: string): string {
  return `${normalizePath(filePath)}\u0000${normalize(name)}`;
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function normalizePath(filePath: string): string {
  return normalize(filePath).replace(/\\/g, '/').replace(/^\.\//, '');
}

function clampLimit(limit?: number): number {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return 20;
  }
  return Math.max(1, Math.min(Math.trunc(limit), 100));
}

function latestTimestamp(
  first: string | null,
  second: string | null
): string | null {
  if (!first) return second;
  if (!second) return first;
  return Date.parse(first) >= Date.parse(second) ? first : second;
}
