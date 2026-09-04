import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
import { canonicalizeEntityKey, normalizeEntityIdentity } from './canonicalize-entity-key.mjs';
import type {
  EntityRecord,
  RelationRecord,
  SearchEntitiesParams,
  SearchRelationsParams
} from './database.js';

export const AGENT_GRAPH_RELATIVE_PATH = join(
  '.vscode',
  '.knowledge',
  'agent-graph.json'
);

const nonEmptyString = z
  .string()
  .refine((value) => value.trim().length > 0, 'must be a non-empty string');
const positiveLine = z.number().int().min(1);
const scopeSchema = nonEmptyString.refine(
  (value) => value === '.' || isValidRelativePath(value),
  'must be . or a normalized workspace-relative path using /'
);
const entityTypeSchema = z.enum([
  'function',
  'class',
  'interface',
  'variable',
  'file',
  'api',
  'service',
  'component',
  'external'
]);
const relationVerbSchema = z.enum([
  'calls',
  'extends',
  'implements',
  'depends_on',
  'contains',
  'references',
  'imports',
  'exports'
]);
const relationOriginSchema = z.enum(['ast', 'resolver', 'agent']);
const relationConfidenceSchema = z.enum([
  'extracted',
  'inferred',
  'review_required'
]);
const groupKindSchema = z.enum(['framework', 'module', 'feature']);
const relativePathSchema = nonEmptyString.refine(
  isValidRelativePath,
  'must be a normalized workspace-relative path using /'
);

const entitySchema = z
  .object({
    key: nonEmptyString,
    name: nonEmptyString,
    type: entityTypeSchema,
    filePath: relativePathSchema,
    startLine: positiveLine,
    endLine: positiveLine,
    description: nonEmptyString.optional()
  })
  .refine((entity) => entity.endLine >= entity.startLine, {
    message: 'endLine must be greater than or equal to startLine'
  });

const evidenceSchema = z
  .object({
    filePath: relativePathSchema,
    startLine: positiveLine,
    endLine: positiveLine.optional(),
    detail: nonEmptyString.optional()
  })
  .refine(
    (evidence) =>
      evidence.endLine === undefined || evidence.endLine >= evidence.startLine,
    { message: 'endLine must be greater than or equal to startLine' }
  );

const structuralHopSchema = z
  .object({
    source: nonEmptyString,
    target: nonEmptyString,
    verb: relationVerbSchema,
    filePath: relativePathSchema,
    startLine: positiveLine,
    endLine: positiveLine,
    traversal: z.enum(['forward', 'reverse']).optional()
  })
  .refine((hop) => hop.endLine >= hop.startLine, {
    message: 'endLine must be greater than or equal to startLine'
  });

const relationSchema = z
  .object({
    source: nonEmptyString,
    target: nonEmptyString,
    verb: relationVerbSchema,
    origin: relationOriginSchema,
    confidence: relationConfidenceSchema,
    evidence: z.array(evidenceSchema).min(1),
    structuralPath: z.array(structuralHopSchema).min(1).optional(),
    description: nonEmptyString.optional()
  })
  .superRefine((relation, context) => {
    if (relation.origin !== 'agent' && relation.structuralPath === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['structuralPath'],
        message: `is required for ${relation.origin} relations`
      });
    }
  });

const groupSchema = z
  .object({
    key: nonEmptyString.refine(
      (value) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value),
      'must use lowercase kebab-case'
    ),
    name: nonEmptyString,
    kind: groupKindSchema,
    order: z.number().int().min(0),
    description: nonEmptyString.optional(),
    scope: scopeSchema.optional(),
    entities: z.array(entitySchema),
    relations: z.array(relationSchema)
  })
  .superRefine((group, context) => {
    validateGroupContents(group, context, []);
  });

const groupedDocumentSchema = z
  .object({
    version: z.literal(1),
    generatedAt: nonEmptyString.refine(
      isIsoTimestamp,
      'must be a valid ISO-8601 timestamp'
    ),
    scope: scopeSchema.optional(),
    groups: z.array(groupSchema).min(1)
  })
  .superRefine((document, context) => {
    const keys = new Set<string>();
    const orders = new Set<number>();
    document.groups.forEach((group, index) => {
      if (keys.has(group.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['groups', index, 'key'],
          message: 'duplicate group key'
        });
      }
      if (orders.has(group.order)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['groups', index, 'order'],
          message: 'duplicate group order'
        });
      }
      keys.add(group.key);
      orders.add(group.order);
    });

    const sortedGroups = [...document.groups].sort(
      (left, right) => left.order - right.order
    );
    const frameworkGroups = sortedGroups.filter(
      (group) => group.kind === 'framework'
    );
    const first = sortedGroups[0];
    if (
      frameworkGroups.length !== 1 ||
      !first ||
      first.key !== 'framework' ||
      first.kind !== 'framework' ||
      first.order !== 0
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['groups'],
        message:
          'must start with exactly one framework group using key framework and order 0'
      });
    }
  });

const documentSchema = groupedDocumentSchema;

type ParsedEntity = z.infer<typeof entitySchema>;
type ParsedRelation = z.infer<typeof relationSchema>;
type ParsedGroup = z.infer<typeof groupSchema>;
type AgentGraphGroupKind = z.infer<typeof groupKindSchema>;
export type AgentGraphRelationOrigin = z.infer<typeof relationOriginSchema>;
export type AgentGraphRelationConfidence = z.infer<
  typeof relationConfidenceSchema
>;

interface NormalizedDocument {
  generatedAt: string;
  scope?: string;
  groups: ParsedGroup[];
}

export interface AgentGraphEvidence {
  filePath: string;
  startLine: number;
  endLine?: number;
  detail?: string;
}

export interface AgentGraphStructuralHop {
  source: string;
  target: string;
  verb: z.infer<typeof relationVerbSchema>;
  filePath: string;
  startLine: number;
  endLine: number;
  traversal?: 'forward' | 'reverse';
}

export interface AgentGraphGroupOverview {
  key: string;
  name: string;
  kind: AgentGraphGroupKind;
  order: number;
  entityCount: number;
  relationCount: number;
}

export interface AgentGraphEntityRecord extends EntityRecord {
  source: 'agent';
  key: string;
  groupKey: string;
  groupName: string;
  groupKind: AgentGraphGroupKind;
  groupOrder: number;
  generatedAt: string;
}

export interface AgentGraphRelationRecord extends RelationRecord {
  source: 'agent';
  sourceKey: string;
  targetKey: string;
  groupKey: string;
  groupName: string;
  groupKind: AgentGraphGroupKind;
  groupOrder: number;
  evidence: AgentGraphEvidence[];
  structuralPath?: AgentGraphStructuralHop[];
  description: string | null;
  origin: AgentGraphRelationOrigin;
  confidence: AgentGraphRelationConfidence;
  generatedAt: string;
}

export interface AgentGraphOverview {
  groupCount: number;
  entityCount: number;
  relationCount: number;
  generatedAt: string | null;
  scope: string | null;
  groups: AgentGraphGroupOverview[];
}

interface LoadedAgentGraph {
  generatedAt: string;
  scope: string | null;
  groups: AgentGraphGroupOverview[];
  entities: AgentGraphEntityRecord[];
  relations: AgentGraphRelationRecord[];
}

const EMPTY_OVERVIEW: AgentGraphOverview = {
  groupCount: 0,
  entityCount: 0,
  relationCount: 0,
  generatedAt: null,
  scope: null,
  groups: []
};

/** Read-only view of the grouped graph generated by the Agent Skill. */
export class AgentGraphStore {
  readonly filePath: string;

  constructor(workspaceRoot: string) {
    this.filePath = resolve(workspaceRoot, AGENT_GRAPH_RELATIVE_PATH);
  }

  getOverview(): AgentGraphOverview {
    const graph = this.load();
    if (!graph) {
      return { ...EMPTY_OVERVIEW, groups: [] };
    }

    return {
      groupCount: graph.groups.length,
      entityCount: graph.entities.length,
      relationCount: graph.relations.length,
      generatedAt: graph.generatedAt,
      scope: graph.scope,
      groups: graph.groups
    };
  }

  listAllEntities(
    descriptionOverrides: ReadonlyMap<string, string> = new Map()
  ): AgentGraphEntityRecord[] {
    return applyDescriptionOverrides(
      this.load()?.entities ?? [],
      descriptionOverrides
    );
  }

  listAllRelations(): AgentGraphRelationRecord[] {
    return this.load()?.relations ?? [];
  }

  searchEntities(
    params: SearchEntitiesParams = {},
    descriptionOverrides: ReadonlyMap<string, string> = new Map()
  ): AgentGraphEntityRecord[] {
    const graph = this.load();
    if (!graph) {
      return [];
    }

    const query = normalizeFilter(params.query);
    const canonicalQuery = query ? canonicalizeEntityKey(query) : '';
    const type = params.type?.trim();
    const filePath = normalizeFilter(params.filePath);
    const limit = clampLimit(params.limit);

    return applyDescriptionOverrides(graph.entities, descriptionOverrides)
      .filter((entity) => {
        if (
          query &&
          !includesNormalized(entity.name, query) &&
          !includesNormalized(entity.key, query) &&
          !includesNormalized(entity.filePath, query) &&
          !includesNormalized(entity.groupName, query) &&
          !includesNormalized(entity.description ?? '', query) &&
          !(
            canonicalQuery &&
            canonicalizeEntityKey(entity.key).includes(canonicalQuery)
          )
        ) {
          return false;
        }
        if (type && entity.type !== type) {
          return false;
        }
        if (filePath && !includesNormalized(entity.filePath, filePath)) {
          return false;
        }
        return true;
      })
      .slice(0, limit);
  }

  searchRelations(
    params: SearchRelationsParams = {}
  ): AgentGraphRelationRecord[] {
    const graph = this.load();
    if (!graph) {
      return [];
    }

    const verb = params.verb?.trim();
    const source = normalizeFilter(params.source);
    const target = normalizeFilter(params.target);
    const canonicalSource = source ? canonicalizeEntityKey(source) : '';
    const canonicalTarget = target ? canonicalizeEntityKey(target) : '';
    const limit = clampLimit(params.limit);

    return graph.relations
      .filter((relation) => {
        if (verb && relation.verb !== verb) {
          return false;
        }
        if (
          source &&
          !includesNormalized(relation.sourceName, source) &&
          !includesNormalized(relation.sourceKey, source) &&
          !(
            canonicalSource &&
            canonicalizeEntityKey(relation.sourceKey).includes(canonicalSource)
          )
        ) {
          return false;
        }
        if (
          target &&
          !includesNormalized(relation.targetName, target) &&
          !includesNormalized(relation.targetKey, target) &&
          !(
            canonicalTarget &&
            canonicalizeEntityKey(relation.targetKey).includes(canonicalTarget)
          )
        ) {
          return false;
        }
        return true;
      })
      .slice(0, limit);
  }

  private load(): LoadedAgentGraph | null {
    if (!existsSync(this.filePath)) {
      return null;
    }

    let input: unknown;
    try {
      const content = readFileSync(this.filePath, 'utf8').replace(/^\uFEFF/, '');
      input = JSON.parse(content);
    } catch {
      return null;
    }

    const documentResult = documentSchema.safeParse(input);
    if (!documentResult.success) {
      return null;
    }

    const document = normalizeDocument(documentResult.data);
    const generatedAtTimestamp = Date.parse(document.generatedAt);
    const entities: AgentGraphEntityRecord[] = [];
    const relations: AgentGraphRelationRecord[] = [];
    const groups: AgentGraphGroupOverview[] = [];

    for (const group of document.groups) {
      const groupEntities = group.entities.map((entity) =>
        toEntityRecord(entity, group, document.generatedAt, generatedAtTimestamp)
      );
      const entityRecordsByKey = new Map(
        groupEntities.map((entity) => [entity.key, entity])
      );
      const groupRelations = group.relations.map((relation) =>
        toRelationRecord(
          relation,
          entityRecordsByKey.get(relation.source)!,
          entityRecordsByKey.get(relation.target)!,
          group,
          document.generatedAt,
          generatedAtTimestamp
        )
      );

      entities.push(...groupEntities);
      relations.push(...groupRelations);
      groups.push({
        key: group.key,
        name: group.name,
        kind: group.kind,
        order: group.order,
        entityCount: groupEntities.length,
        relationCount: groupRelations.length
      });
    }

    return {
      generatedAt: document.generatedAt,
      scope: document.scope ?? null,
      groups,
      entities,
      relations
    };
  }
}

function validateGroupContents(
  group: Pick<ParsedGroup, 'entities' | 'relations'>,
  context: z.RefinementCtx,
  pathPrefix: Array<string | number>
): void {
  const entityKeys = new Set<string>();
  const entityKeysByIdentity = new Map<string, string>();
  group.entities.forEach((entity, index) => {
    if (entityKeys.has(entity.key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pathPrefix, 'entities', index, 'key'],
        message: 'duplicate entity key'
      });
    }
    const identity = normalizeEntityIdentity(entity.key);
    if (!identity) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pathPrefix, 'entities', index, 'key'],
        message: 'must contain a path-normalized identity'
      });
    }
    const collidingKey = entityKeysByIdentity.get(identity);
    if (collidingKey !== undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pathPrefix, 'entities', index, 'key'],
        message: `collides with '${collidingKey}' after path normalization`
      });
    }
    entityKeys.add(entity.key);
    entityKeysByIdentity.set(identity, entity.key);
  });

  const relationKeys = new Set<string>();
  group.relations.forEach((relation, index) => {
    if (!entityKeys.has(relation.source)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pathPrefix, 'relations', index, 'source'],
        message: 'does not reference an entity key in the same group'
      });
    }
    if (!entityKeys.has(relation.target)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pathPrefix, 'relations', index, 'target'],
        message: 'does not reference an entity key in the same group'
      });
    }
    if (relation.source === relation.target) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pathPrefix, 'relations', index],
        message: 'must not be a self relation'
      });
    }

    const key = `${relation.source}\u0000${relation.target}\u0000${relation.verb}`;
    if (relationKeys.has(key)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...pathPrefix, 'relations', index],
        message: 'duplicate relation'
      });
    }
    relationKeys.add(key);
  });
}

function normalizeDocument(
  document: z.infer<typeof documentSchema>
): NormalizedDocument {
  return {
    generatedAt: document.generatedAt,
    scope: document.scope,
    groups: [...document.groups].sort(
      (left, right) =>
        left.order - right.order || left.name.localeCompare(right.name)
    )
  };
}

function applyDescriptionOverrides(
  entities: AgentGraphEntityRecord[],
  overrides: ReadonlyMap<string, string>
): AgentGraphEntityRecord[] {
  if (overrides.size === 0) {
    return entities;
  }
  const identityOverrides = buildIdentityDescriptionOverrides(overrides);
  return entities.map((entity) => {
    const description =
      overrides.get(entity.key) ??
      identityOverrides.get(normalizeEntityIdentity(entity.key));
    if (description === undefined) {
      return entity;
    }
    return {
      ...entity,
      description,
      metadata: {
        ...(entity.metadata ?? {}),
        generatedDescription: entity.description,
        descriptionSource: 'manual'
      }
    };
  });
}

function buildIdentityDescriptionOverrides(
  overrides: ReadonlyMap<string, string>
): Map<string, string | undefined> {
  const identityOverrides = new Map<string, string | undefined>();
  for (const [key, description] of overrides) {
    const identityKey = normalizeEntityIdentity(key);
    if (identityOverrides.has(identityKey)) {
      identityOverrides.set(identityKey, undefined);
    } else {
      identityOverrides.set(identityKey, description);
    }
  }
  return identityOverrides;
}

function toEntityRecord(
  entity: ParsedEntity,
  group: ParsedGroup,
  generatedAt: string,
  generatedAtTimestamp: number
): AgentGraphEntityRecord {
  return {
    id: stableId('entity', `${group.key}\u0000${entity.key}`),
    key: entity.key,
    groupKey: group.key,
    groupName: group.name,
    groupKind: group.kind,
    groupOrder: group.order,
    name: entity.name,
    type: entity.type,
    filePath: entity.filePath,
    startLine: entity.startLine,
    endLine: entity.endLine,
    description: entity.description ?? null,
    metadata: {
      agentGraphKey: entity.key,
      groupKey: group.key,
      groupName: group.name,
      groupKind: group.kind,
      groupOrder: group.order
    },
    createdAt: generatedAtTimestamp,
    updatedAt: generatedAtTimestamp,
    generatedAt,
    source: 'agent'
  };
}

function toRelationRecord(
  relation: ParsedRelation,
  sourceEntity: AgentGraphEntityRecord,
  targetEntity: AgentGraphEntityRecord,
  group: ParsedGroup,
  generatedAt: string,
  generatedAtTimestamp: number
): AgentGraphRelationRecord {
  return {
    id: stableId(
      'relation',
      `${group.key}\u0000${relation.source}\u0000${relation.target}\u0000${relation.verb}`
    ),
    verb: relation.verb,
    createdAt: generatedAtTimestamp,
    sourceEntityId: sourceEntity.id,
    sourceKey: relation.source,
    sourceName: sourceEntity.name,
    sourceType: sourceEntity.type,
    sourceFilePath: sourceEntity.filePath,
    targetEntityId: targetEntity.id,
    targetKey: relation.target,
    targetName: targetEntity.name,
    targetType: targetEntity.type,
    targetFilePath: targetEntity.filePath,
    groupKey: group.key,
    groupName: group.name,
    groupKind: group.kind,
    groupOrder: group.order,
    evidence: relation.evidence,
    structuralPath: relation.structuralPath,
    description: relation.description ?? null,
    origin: relation.origin,
    confidence: relation.confidence,
    generatedAt,
    source: 'agent'
  };
}

function stableId(kind: 'entity' | 'relation', value: string): string {
  const digest = createHash('sha256')
    .update(`${kind}\u0000${value}`)
    .digest('hex')
    .slice(0, 24);
  return `agent-${kind}-${digest}`;
}

function isValidRelativePath(filePath: string): boolean {
  if (isAbsolute(filePath) || filePath.includes('\\')) {
    return false;
  }
  const segments = filePath.split('/');
  return !segments.some(
    (segment) => segment === '' || segment === '.' || segment === '..'
  );
}

function isIsoTimestamp(value: string): boolean {
  return (
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function normalizeFilter(value: string | undefined): string {
  return value?.trim().toLocaleLowerCase() ?? '';
}

function includesNormalized(value: string, query: string): boolean {
  return value.toLocaleLowerCase().includes(query);
}

function clampLimit(limit?: number): number {
  if (typeof limit !== 'number' || Number.isNaN(limit)) {
    return 20;
  }
  return Math.max(1, Math.min(Math.trunc(limit), 100));
}
