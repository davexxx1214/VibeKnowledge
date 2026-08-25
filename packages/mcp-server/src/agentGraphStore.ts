import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { isAbsolute, join, resolve } from 'node:path';
import { z } from 'zod';
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
const entityTypeSchema = z.enum([
  'function',
  'class',
  'interface',
  'variable',
  'file',
  'directory',
  'api',
  'config',
  'database',
  'service',
  'component',
  'external',
  'other'
]);
const relationVerbSchema = z.enum([
  'uses',
  'calls',
  'extends',
  'implements',
  'depends_on',
  'contains',
  'references',
  'imports',
  'exports'
]);
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

const relationSchema = z
  .object({
    source: nonEmptyString,
    target: nonEmptyString,
    verb: relationVerbSchema,
    evidence: z.array(evidenceSchema).min(1),
    description: nonEmptyString.optional()
  });

const documentSchema = z
  .object({
    version: z.literal(1),
    generatedAt: nonEmptyString.refine(
      isIsoTimestamp,
      'must be a valid ISO-8601 timestamp'
    ),
    scope: nonEmptyString
      .refine(
        (value) => value === '.' || isValidRelativePath(value),
        'must be . or a normalized workspace-relative path using /'
      )
      .optional(),
    entities: z.array(entitySchema),
    relations: z.array(relationSchema)
  })
  .superRefine((document, context) => {
    const entityKeys = new Set<string>();
    document.entities.forEach((entity, index) => {
      if (entityKeys.has(entity.key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['entities', index, 'key'],
          message: 'duplicate entity key'
        });
      }
      entityKeys.add(entity.key);
    });

    const relationKeys = new Set<string>();
    document.relations.forEach((relation, index) => {
      if (!entityKeys.has(relation.source)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relations', index, 'source'],
          message: 'does not reference an entity key'
        });
      }
      if (!entityKeys.has(relation.target)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relations', index, 'target'],
          message: 'does not reference an entity key'
        });
      }
      if (relation.source === relation.target) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relations', index],
          message: 'must not be a self relation'
        });
      }

      const key = `${relation.source}\u0000${relation.target}\u0000${relation.verb}`;
      if (relationKeys.has(key)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['relations', index],
          message: 'duplicate relation'
        });
      }
      relationKeys.add(key);
    });
  });

type ParsedEntity = z.infer<typeof entitySchema>;
type ParsedRelation = z.infer<typeof relationSchema>;

export interface AgentGraphEvidence {
  filePath: string;
  startLine: number;
  endLine?: number;
  detail?: string;
}

export interface AgentGraphEntityRecord extends EntityRecord {
  source: 'agent';
  key: string;
  generatedAt: string;
}

export interface AgentGraphRelationRecord extends RelationRecord {
  source: 'agent';
  sourceKey: string;
  targetKey: string;
  evidence: AgentGraphEvidence[];
  description: string | null;
  generatedAt: string;
}

export interface AgentGraphOverview {
  entityCount: number;
  relationCount: number;
  generatedAt: string | null;
  scope: string | null;
}

interface LoadedAgentGraph {
  generatedAt: string;
  scope: string | null;
  entities: AgentGraphEntityRecord[];
  relations: AgentGraphRelationRecord[];
}

const EMPTY_OVERVIEW: AgentGraphOverview = {
  entityCount: 0,
  relationCount: 0,
  generatedAt: null,
  scope: null
};

/**
 * Read-only view of the graph generated by an agent skill.
 *
 * The file is parsed on every public operation so a running MCP process sees a
 * newly generated graph without being restarted. A missing, unreadable, or
 * structurally invalid file behaves like an empty graph. Validation is atomic:
 * one invalid entity, relation, endpoint, or evidence item hides the whole
 * sidecar rather than exposing a misleading partial graph.
 */
export class AgentGraphStore {
  readonly filePath: string;

  constructor(workspaceRoot: string) {
    this.filePath = resolve(workspaceRoot, AGENT_GRAPH_RELATIVE_PATH);
  }

  getOverview(): AgentGraphOverview {
    const graph = this.load();
    if (!graph) {
      return { ...EMPTY_OVERVIEW };
    }

    return {
      entityCount: graph.entities.length,
      relationCount: graph.relations.length,
      generatedAt: graph.generatedAt,
      scope: graph.scope
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
          !includesNormalized(entity.description ?? '', query)
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
    const limit = clampLimit(params.limit);

    return graph.relations
      .filter((relation) => {
        if (verb && relation.verb !== verb) {
          return false;
        }
        if (
          source &&
          !includesNormalized(relation.sourceName, source) &&
          !includesNormalized(relation.sourceKey, source)
        ) {
          return false;
        }
        if (
          target &&
          !includesNormalized(relation.targetName, target) &&
          !includesNormalized(relation.targetKey, target)
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

    const generatedAt = documentResult.data.generatedAt;
    const generatedAtTimestamp = Date.parse(generatedAt);
    const entities = documentResult.data.entities.map((entity) =>
      toEntityRecord(entity, generatedAt, generatedAtTimestamp)
    );
    const entityRecordsByKey = new Map(
      entities.map((entity) => [entity.key, entity])
    );

    const relations = documentResult.data.relations.map((relation) =>
      toRelationRecord(
        relation,
        entityRecordsByKey.get(relation.source)!,
        entityRecordsByKey.get(relation.target)!,
        generatedAt,
        generatedAtTimestamp
      )
    );

    return {
      generatedAt,
      scope: documentResult.data.scope ?? null,
      entities,
      relations
    };
  }
}

function applyDescriptionOverrides(
  entities: AgentGraphEntityRecord[],
  overrides: ReadonlyMap<string, string>
): AgentGraphEntityRecord[] {
  if (overrides.size === 0) {
    return entities;
  }
  return entities.map((entity) => {
    const description = overrides.get(entity.key);
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

function toEntityRecord(
  entity: ParsedEntity,
  generatedAt: string,
  generatedAtTimestamp: number
): AgentGraphEntityRecord {
  return {
    id: stableId('entity', entity.key),
    key: entity.key,
    name: entity.name,
    type: entity.type,
    filePath: entity.filePath,
    startLine: entity.startLine,
    endLine: entity.endLine,
    description: entity.description ?? null,
    metadata: { agentGraphKey: entity.key },
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
  generatedAt: string,
  generatedAtTimestamp: number
): AgentGraphRelationRecord {
  return {
    id: stableId(
      'relation',
      `${relation.source}\u0000${relation.target}\u0000${relation.verb}`
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
    evidence: relation.evidence,
    description: relation.description ?? null,
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
