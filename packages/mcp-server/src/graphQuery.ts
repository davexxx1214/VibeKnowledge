import type {
  AgentGraphEntityRecord,
  AgentGraphEvidence,
  AgentGraphRelationRecord
} from './agentGraphStore.js';
import { canonicalizeEntityKey } from './canonicalize-entity-key.mjs';

export const GRAPH_RELATION_VERBS = [
  'uses',
  'calls',
  'extends',
  'implements',
  'depends_on',
  'contains',
  'references',
  'imports',
  'exports'
] as const;

export type GraphDirection = 'incoming' | 'outgoing' | 'both';

export interface QueryGraphOptions {
  query: string;
  groupKey?: string;
  filePath?: string;
  relationVerbs?: string[];
  depth?: number;
}

export interface NeighborQueryOptions {
  selector: string;
  groupKey?: string;
  direction?: GraphDirection;
  relationVerbs?: string[];
  depth?: number;
}

export interface ShortestPathOptions {
  source: string;
  target: string;
  groupKey?: string;
  direction?: Exclude<GraphDirection, 'incoming'>;
  relationVerbs?: string[];
  maxDepth?: number;
}

export interface GraphSliceEntity {
  entity: AgentGraphEntityRecord;
  depth: number;
  isSeed: boolean;
  score: number;
}

export interface GraphSlice {
  title: string;
  query: string;
  groupKey?: string;
  depth: number;
  entities: GraphSliceEntity[];
  relations: AgentGraphRelationRecord[];
  suppressedHubIds: string[];
  traversalTruncated: boolean;
  warnings: string[];
}

export interface PathStep {
  from: AgentGraphEntityRecord;
  to: AgentGraphEntityRecord;
  relation: AgentGraphRelationRecord;
  traversal: 'forward' | 'reverse';
}

export interface ShortestPathResult {
  sourceSelector: string;
  targetSelector: string;
  groupKey?: string;
  entities: AgentGraphEntityRecord[];
  steps: PathStep[];
  warnings: string[];
}

export interface FormatGraphOptions {
  tokenBudget?: number;
  includeEvidence?: boolean;
}

export interface FormattedGraphResult {
  text: string;
  estimatedTokens: number;
  truncated: boolean;
  displayedEntityCount: number;
  displayedRelationCount: number;
}

interface AdjacencyEntry {
  relation: AgentGraphRelationRecord;
  neighborId: string;
  traversal: 'forward' | 'reverse';
}

interface PreviousStep {
  previousId: string;
  relation: AgentGraphRelationRecord;
  traversal: 'forward' | 'reverse';
}

const DEFAULT_QUERY_DEPTH = 2;
const DEFAULT_NEIGHBOR_DEPTH = 1;
const DEFAULT_TOKEN_BUDGET = 2000;
const MIN_TOKEN_BUDGET = 200;
const MAX_TOKEN_BUDGET = 12000;
const MAX_QUERY_DEPTH = 5;
const MAX_PATH_DEPTH = 12;
const MAX_QUERY_ENTITIES = 100;
const MAX_QUERY_SEEDS = 3;
const MAX_SELECTOR_MATCHES = 20;
const HUB_DEGREE_FLOOR = 12;
const STATUS_RESERVE_TOKENS = 48;

/**
 * Query the grouped Agent graph without mutating it. Entity IDs already encode
 * group occurrence, so repeated stable keys remain isolated to their group.
 */
export class AgentGraphQueryEngine {
  private readonly entities: AgentGraphEntityRecord[];
  private readonly relations: AgentGraphRelationRecord[];
  private readonly entitiesById: Map<string, AgentGraphEntityRecord>;
  private readonly outgoing: Map<string, AdjacencyEntry[]>;
  private readonly incoming: Map<string, AdjacencyEntry[]>;
  private readonly degreeById: Map<string, number>;
  private readonly hubThreshold: number;

  constructor(
    entities: AgentGraphEntityRecord[],
    relations: AgentGraphRelationRecord[]
  ) {
    this.entities = [...entities].sort(compareEntities);
    this.relations = [...relations].sort(compareRelations);
    this.entitiesById = new Map(
      this.entities.map((entity) => [entity.id, entity])
    );
    this.outgoing = new Map();
    this.incoming = new Map();
    this.degreeById = new Map(
      this.entities.map((entity) => [entity.id, 0])
    );

    for (const relation of this.relations) {
      if (
        !this.entitiesById.has(relation.sourceEntityId) ||
        !this.entitiesById.has(relation.targetEntityId)
      ) {
        continue;
      }
      appendAdjacency(this.outgoing, relation.sourceEntityId, {
        relation,
        neighborId: relation.targetEntityId,
        traversal: 'forward'
      });
      appendAdjacency(this.incoming, relation.targetEntityId, {
        relation,
        neighborId: relation.sourceEntityId,
        traversal: 'reverse'
      });
      this.degreeById.set(
        relation.sourceEntityId,
        (this.degreeById.get(relation.sourceEntityId) ?? 0) + 1
      );
      this.degreeById.set(
        relation.targetEntityId,
        (this.degreeById.get(relation.targetEntityId) ?? 0) + 1
      );
    }

    for (const entries of [...this.outgoing.values(), ...this.incoming.values()]) {
      entries.sort(compareAdjacency);
    }
    this.hubThreshold = calculateHubThreshold([...this.degreeById.values()]);
  }

  queryGraph(options: QueryGraphOptions): GraphSlice {
    const query = options.query.trim();
    const depth = clampInteger(options.depth, 0, MAX_QUERY_DEPTH, DEFAULT_QUERY_DEPTH);
    const relationVerbs = normalizeRelationVerbs(options.relationVerbs);
    const normalizedFilePath = normalize(options.filePath ?? '');
    const candidates = this.entities.filter(
      (entity) =>
        matchesGroup(entity, options.groupKey) &&
        (!normalizedFilePath ||
          normalize(entity.filePath).includes(normalizedFilePath))
    );
    const scored = candidates
      .map((entity) => ({ entity, score: scoreEntity(entity, query) }))
      .filter((item) => item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || compareEntities(left.entity, right.entity)
      );
    const seeds = scored.slice(0, MAX_QUERY_SEEDS);
    const warnings: string[] = [];

    if (query.length === 0) {
      warnings.push('查询内容为空。');
    } else if (seeds.length === 0) {
      warnings.push('没有找到可作为图遍历起点的实体。');
    }
    if (options.groupKey && !this.hasGroup(options.groupKey)) {
      warnings.push(`分组不存在：${options.groupKey}`);
    }

    return this.traverse({
      title: '知识图谱局部查询',
      query,
      groupKey: options.groupKey,
      seeds,
      depth,
      direction: 'both',
      relationVerbs,
      warnings
    });
  }

  getEntities(selector: string, groupKey?: string): GraphSlice {
    const matches = this.resolveEntities(selector, groupKey).slice(
      0,
      MAX_SELECTOR_MATCHES
    );
    const warnings: string[] = [];
    if (matches.length === 0) {
      warnings.push(`没有找到实体：${selector}`);
    }
    if (groupKey && !this.hasGroup(groupKey)) {
      warnings.push(`分组不存在：${groupKey}`);
    }
    return this.traverse({
      title: '实体详情',
      query: selector,
      groupKey,
      seeds: matches.map((entity) => ({ entity, score: 0 })),
      depth: 0,
      direction: 'both',
      relationVerbs: null,
      warnings
    });
  }

  getNeighbors(options: NeighborQueryOptions): GraphSlice {
    const depth = clampInteger(
      options.depth,
      1,
      MAX_QUERY_DEPTH,
      DEFAULT_NEIGHBOR_DEPTH
    );
    const matches = this.resolveEntities(options.selector, options.groupKey).slice(
      0,
      MAX_SELECTOR_MATCHES
    );
    const warnings: string[] = [];
    if (matches.length === 0) {
      warnings.push(`没有找到实体：${options.selector}`);
    }
    if (options.groupKey && !this.hasGroup(options.groupKey)) {
      warnings.push(`分组不存在：${options.groupKey}`);
    }

    return this.traverse({
      title: '实体邻居查询',
      query: options.selector,
      groupKey: options.groupKey,
      seeds: matches.map((entity) => ({ entity, score: 0 })),
      depth,
      direction: options.direction ?? 'both',
      relationVerbs: normalizeRelationVerbs(options.relationVerbs),
      warnings
    });
  }

  shortestPath(options: ShortestPathOptions): ShortestPathResult {
    const sourceMatches = this.resolveEntities(
      options.source,
      options.groupKey
    ).slice(0, MAX_SELECTOR_MATCHES);
    const targetMatches = this.resolveEntities(
      options.target,
      options.groupKey
    ).slice(0, MAX_SELECTOR_MATCHES);
    const warnings: string[] = [];

    if (sourceMatches.length === 0) {
      warnings.push(`没有找到起点实体：${options.source}`);
    }
    if (targetMatches.length === 0) {
      warnings.push(`没有找到终点实体：${options.target}`);
    }
    if (options.groupKey && !this.hasGroup(options.groupKey)) {
      warnings.push(`分组不存在：${options.groupKey}`);
    }
    if (sourceMatches.length === 0 || targetMatches.length === 0) {
      return emptyPath(options, warnings);
    }

    const targetIds = new Set(targetMatches.map((entity) => entity.id));
    const visited = new Set<string>();
    const distance = new Map<string, number>();
    const previous = new Map<string, PreviousStep>();
    const queue: string[] = [];

    for (const source of sourceMatches) {
      visited.add(source.id);
      distance.set(source.id, 0);
      queue.push(source.id);
    }

    const immediateTarget = queue.find((entityId) => targetIds.has(entityId));
    if (immediateTarget) {
      return {
        sourceSelector: options.source,
        targetSelector: options.target,
        groupKey: options.groupKey,
        entities: [this.entitiesById.get(immediateTarget)!],
        steps: [],
        warnings
      };
    }

    const relationVerbs = normalizeRelationVerbs(options.relationVerbs);
    const direction = options.direction ?? 'both';
    const maxDepth = clampInteger(options.maxDepth, 1, MAX_PATH_DEPTH, 8);
    let foundTargetId: string | undefined;
    let cursor = 0;

    while (cursor < queue.length && !foundTargetId) {
      const currentId = queue[cursor++];
      const currentDepth = distance.get(currentId) ?? 0;
      if (currentDepth >= maxDepth) {
        continue;
      }
      for (const entry of this.getAdjacency(currentId, direction)) {
        if (
          relationVerbs &&
          !relationVerbs.has(normalize(entry.relation.verb))
        ) {
          continue;
        }
        if (visited.has(entry.neighborId)) {
          continue;
        }
        visited.add(entry.neighborId);
        distance.set(entry.neighborId, currentDepth + 1);
        previous.set(entry.neighborId, {
          previousId: currentId,
          relation: entry.relation,
          traversal: entry.traversal
        });
        queue.push(entry.neighborId);
        if (targetIds.has(entry.neighborId)) {
          foundTargetId = entry.neighborId;
          break;
        }
      }
    }

    if (!foundTargetId) {
      warnings.push(`在 ${maxDepth} 跳内没有找到连接路径。`);
      return emptyPath(options, warnings);
    }

    const reversedEntityIds = [foundTargetId];
    const reversedSteps: PreviousStep[] = [];
    let currentId = foundTargetId;
    while (previous.has(currentId)) {
      const step = previous.get(currentId)!;
      reversedSteps.push(step);
      currentId = step.previousId;
      reversedEntityIds.push(currentId);
    }
    const entityIds = reversedEntityIds.reverse();
    const stepMetadata = reversedSteps.reverse();
    const entities = entityIds.map((entityId) => this.entitiesById.get(entityId)!);
    const steps = stepMetadata.map((step, index) => ({
      from: entities[index],
      to: entities[index + 1],
      relation: step.relation,
      traversal: step.traversal
    }));

    return {
      sourceSelector: options.source,
      targetSelector: options.target,
      groupKey: options.groupKey,
      entities,
      steps,
      warnings
    };
  }

  private traverse(options: {
    title: string;
    query: string;
    groupKey?: string;
    seeds: Array<{ entity: AgentGraphEntityRecord; score: number }>;
    depth: number;
    direction: GraphDirection;
    relationVerbs: Set<string> | null;
    warnings: string[];
  }): GraphSlice {
    const selected = new Map<string, GraphSliceEntity>();
    const selectedRelations = new Map<string, AgentGraphRelationRecord>();
    const suppressedHubIds = new Set<string>();
    const queue: Array<{ entityId: string; depth: number }> = [];
    let traversalTruncated = false;

    for (const seed of options.seeds) {
      if (selected.has(seed.entity.id)) {
        continue;
      }
      selected.set(seed.entity.id, {
        entity: seed.entity,
        depth: 0,
        isSeed: true,
        score: seed.score
      });
      queue.push({ entityId: seed.entity.id, depth: 0 });
    }

    let cursor = 0;
    while (cursor < queue.length) {
      const current = queue[cursor++];
      if (current.depth >= options.depth) {
        continue;
      }
      const isSeed = current.depth === 0;
      const degree = this.degreeById.get(current.entityId) ?? 0;
      if (!isSeed && degree > this.hubThreshold) {
        suppressedHubIds.add(current.entityId);
        continue;
      }

      for (const entry of this.getAdjacency(current.entityId, options.direction)) {
        if (
          options.relationVerbs &&
          !options.relationVerbs.has(normalize(entry.relation.verb))
        ) {
          continue;
        }
        const neighbor = this.entitiesById.get(entry.neighborId);
        if (!neighbor || !matchesGroup(neighbor, options.groupKey)) {
          continue;
        }
        if (!selected.has(neighbor.id)) {
          if (selected.size >= MAX_QUERY_ENTITIES) {
            traversalTruncated = true;
            continue;
          }
          selected.set(neighbor.id, {
            entity: neighbor,
            depth: current.depth + 1,
            isSeed: false,
            score: 0
          });
          queue.push({ entityId: neighbor.id, depth: current.depth + 1 });
        }
        selectedRelations.set(entry.relation.id, entry.relation);
      }
    }

    const entities = [...selected.values()].sort(
      (left, right) =>
        Number(right.isSeed) - Number(left.isSeed) ||
        left.depth - right.depth ||
        right.score - left.score ||
        compareEntities(left.entity, right.entity)
    );
    const selectedIds = new Set(entities.map((item) => item.entity.id));
    const relations = [...selectedRelations.values()]
      .filter(
        (relation) =>
          selectedIds.has(relation.sourceEntityId) &&
          selectedIds.has(relation.targetEntityId)
      )
      .sort(compareRelations);

    return {
      title: options.title,
      query: options.query,
      groupKey: options.groupKey,
      depth: options.depth,
      entities,
      relations,
      suppressedHubIds: [...suppressedHubIds].sort(),
      traversalTruncated,
      warnings: options.warnings
    };
  }

  private resolveEntities(
    selector: string,
    groupKey?: string
  ): AgentGraphEntityRecord[] {
    const normalizedSelector = normalize(selector);
    const canonicalSelector = canonicalizeEntityKey(selector);
    if (!normalizedSelector) {
      return [];
    }
    const candidates = this.entities.filter((entity) =>
      matchesGroup(entity, groupKey)
    );
    const exact = candidates.filter(
      (entity) =>
        normalize(entity.id) === normalizedSelector ||
        canonicalizeEntityKey(entity.key) === canonicalSelector ||
        normalize(entity.name) === normalizedSelector
    );
    if (exact.length > 0) {
      return exact.sort(compareEntities);
    }

    return candidates
      .map((entity) => ({ entity, score: scoreEntity(entity, selector) }))
      .filter((item) => item.score > 0)
      .sort(
        (left, right) =>
          right.score - left.score || compareEntities(left.entity, right.entity)
      )
      .map((item) => item.entity);
  }

  private getAdjacency(
    entityId: string,
    direction: GraphDirection
  ): AdjacencyEntry[] {
    if (direction === 'outgoing') {
      return this.outgoing.get(entityId) ?? [];
    }
    if (direction === 'incoming') {
      return this.incoming.get(entityId) ?? [];
    }
    const deduplicated = new Map<string, AdjacencyEntry>();
    for (const entry of [
      ...(this.outgoing.get(entityId) ?? []),
      ...(this.incoming.get(entityId) ?? [])
    ]) {
      deduplicated.set(`${entry.relation.id}\u0000${entry.neighborId}`, entry);
    }
    return [...deduplicated.values()].sort(compareAdjacency);
  }

  private hasGroup(groupKey: string): boolean {
    const normalizedGroupKey = normalize(groupKey);
    return this.entities.some(
      (entity) => normalize(entity.groupKey) === normalizedGroupKey
    );
  }
}

export function formatGraphSlice(
  slice: GraphSlice,
  options: FormatGraphOptions = {}
): FormattedGraphResult {
  const tokenBudget = clampTokenBudget(options.tokenBudget);
  const contentBudget = Math.max(
    MIN_TOKEN_BUDGET - STATUS_RESERVE_TOKENS,
    tokenBudget - STATUS_RESERVE_TOKENS
  );
  const blocks: Array<{
    kind: 'header' | 'entity' | 'relation' | 'warning';
    id?: string;
    text: string;
  }> = [
    { kind: 'header', text: slice.title },
    {
      kind: 'header',
      text: `查询: ${truncateToTokenBudget(slice.query || '(empty)', Math.max(24, Math.floor(contentBudget / 3)))} | 分组: ${truncateToTokenBudget(slice.groupKey ?? '全部', Math.max(12, Math.floor(contentBudget / 6)))} | 深度: ${slice.depth}`
    }
  ];
  let rejectedByBudget = false;

  for (const warning of slice.warnings) {
    if (!tryAppendBlock(blocks, { kind: 'warning', text: `警告: ${warning}` }, contentBudget)) {
      rejectedByBudget = true;
    }
  }

  const seedEntities = slice.entities.filter((item) => item.isSeed);
  const neighborEntities = slice.entities.filter((item) => !item.isSeed);

  for (const item of seedEntities) {
    const block = {
      kind: 'entity' as const,
      id: item.entity.id,
      text: formatEntityLine(item)
    };
    if (!tryAppendBlock(blocks, block, contentBudget)) {
      rejectedByBudget = true;
    }
  }

  const depthByEntityId = new Map(
    slice.entities.map((item) => [item.entity.id, item.depth])
  );
  const relationsByProximity = [...slice.relations].sort(
    (left, right) =>
      relationDepth(left, depthByEntityId) -
        relationDepth(right, depthByEntityId) ||
      compareRelations(left, right)
  );
  for (const relation of relationsByProximity) {
    const block = {
      kind: 'relation' as const,
      id: relation.id,
      text: formatRelationLine(relation, options.includeEvidence ?? false)
    };
    if (!tryAppendBlock(blocks, block, contentBudget)) {
      rejectedByBudget = true;
    }
  }

  for (const item of neighborEntities) {
    const block = {
      kind: 'entity' as const,
      id: item.entity.id,
      text: formatEntityLine(item)
    };
    if (!tryAppendBlock(blocks, block, contentBudget)) {
      rejectedByBudget = true;
    }
  }

  const finalize = () => {
    const displayedEntityCount = blocks.filter(
      (block) => block.kind === 'entity'
    ).length;
    const displayedRelationCount = blocks.filter(
      (block) => block.kind === 'relation'
    ).length;
    const truncated =
      rejectedByBudget ||
      slice.traversalTruncated ||
      displayedEntityCount < slice.entities.length ||
      displayedRelationCount < slice.relations.length;
    const status = `状态: ${truncated ? '已截断' : '完整'} | 实体: ${displayedEntityCount}/${slice.entities.length} | 关系: ${displayedRelationCount}/${slice.relations.length}${slice.suppressedHubIds.length > 0 ? ` | 抑制 hub: ${slice.suppressedHubIds.length}` : ''}`;
    const text = [...blocks.map((block) => block.text), status].join('\n');
    return {
      text,
      estimatedTokens: estimateTokenCount(text),
      truncated,
      displayedEntityCount,
      displayedRelationCount
    };
  };

  let result = finalize();
  while (result.estimatedTokens > tokenBudget) {
    const removableIndex = findLastRemovableBlock(blocks);
    if (removableIndex < 0) {
      break;
    }
    blocks.splice(removableIndex, 1);
    rejectedByBudget = true;
    result = finalize();
  }
  return result;
}

export function formatShortestPath(
  result: ShortestPathResult,
  options: FormatGraphOptions = {}
): FormattedGraphResult {
  const tokenBudget = clampTokenBudget(options.tokenBudget);
  const contentBudget = Math.max(
    MIN_TOKEN_BUDGET - STATUS_RESERVE_TOKENS,
    tokenBudget - STATUS_RESERVE_TOKENS
  );
  const blocks: Array<{
    kind: 'header' | 'entity' | 'relation' | 'warning';
    id?: string;
    text: string;
  }> = [
    { kind: 'header', text: '知识图谱最短路径' },
    {
      kind: 'header',
      text: `起点: ${truncateToTokenBudget(result.sourceSelector, Math.max(18, Math.floor(contentBudget / 5)))} | 终点: ${truncateToTokenBudget(result.targetSelector, Math.max(18, Math.floor(contentBudget / 5)))} | 分组: ${truncateToTokenBudget(result.groupKey ?? '全部', Math.max(12, Math.floor(contentBudget / 8)))}`
    }
  ];
  let rejectedByBudget = false;

  for (const warning of result.warnings) {
    if (!tryAppendBlock(blocks, { kind: 'warning', text: `警告: ${warning}` }, contentBudget)) {
      rejectedByBudget = true;
    }
  }

  if (result.entities.length === 1 && result.steps.length === 0) {
    tryAppendBlock(
      blocks,
      {
        kind: 'entity',
        id: result.entities[0].id,
        text: `路径长度: 0 | ${formatEntityIdentity(result.entities[0])}`
      },
      contentBudget
    );
  }

  for (const step of result.steps) {
    const arrow =
      step.traversal === 'forward'
        ? `--${step.relation.verb}-->`
        : `<--${step.relation.verb}--`;
    const evidence = options.includeEvidence
      ? formatEvidence(step.relation.evidence)
      : '';
    const structuralPath = options.includeEvidence
      ? formatStructuralPath(step.relation)
      : '';
    const provenance = formatRelationProvenance(step.relation);
    const text = `${formatEntityIdentity(step.from)} ${arrow} ${formatEntityIdentity(step.to)}${provenance}${evidence}${structuralPath}`;
    if (
      !tryAppendBlock(
        blocks,
        { kind: 'relation', id: step.relation.id, text },
        contentBudget
      )
    ) {
      rejectedByBudget = true;
    }
  }

  const finalize = () => {
    const displayedRelationCount = blocks.filter(
      (block) => block.kind === 'relation'
    ).length;
    const displayedEntityCount =
      result.entities.length === 0
        ? 0
        : Math.min(result.entities.length, displayedRelationCount + 1);
    const truncated =
      rejectedByBudget || displayedRelationCount < result.steps.length;
    const status = `状态: ${truncated ? '已截断' : '完整'} | 路径: ${displayedRelationCount}/${result.steps.length} 跳`;
    const text = [...blocks.map((block) => block.text), status].join('\n');
    return {
      text,
      estimatedTokens: estimateTokenCount(text),
      truncated,
      displayedEntityCount,
      displayedRelationCount
    };
  };

  let formatted = finalize();
  while (formatted.estimatedTokens > tokenBudget) {
    const removableIndex = findLastRemovableBlock(blocks);
    if (removableIndex < 0) {
      break;
    }
    blocks.splice(removableIndex, 1);
    rejectedByBudget = true;
    formatted = finalize();
  }
  return formatted;
}

/** Conservative mixed CJK/Latin estimate used to enforce MCP output budgets. */
export function estimateTokenCount(value: string): number {
  const cjkCount = (value.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu) ?? []).length;
  const remaining = value.replace(
    /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu,
    ''
  );
  const latinLikeCount = Math.ceil(remaining.length / 3);
  return Math.max(1, cjkCount + latinLikeCount);
}

function scoreEntity(entity: AgentGraphEntityRecord, query: string): number {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return 0;
  }
  const terms = queryTerms(query);
  const fields = [
    { value: normalize(entity.name), weight: 14 },
    { value: normalize(entity.key), weight: 12 },
    { value: normalize(entity.filePath), weight: 10 },
    { value: normalize(entity.description ?? ''), weight: 6 },
    { value: normalize(entity.groupName), weight: 5 },
    { value: normalize(entity.groupKey), weight: 5 },
    { value: normalize(entity.type), weight: 2 }
  ];
  let score = 0;
  for (const field of fields) {
    if (!field.value) {
      continue;
    }
    if (field.value === normalizedQuery) {
      score += field.weight * 8;
    } else if (field.value.startsWith(normalizedQuery)) {
      score += field.weight * 5;
    } else if (field.value.includes(normalizedQuery)) {
      score += field.weight * 4;
    } else if (
      field.value.length >= 2 &&
      normalizedQuery.includes(field.value)
    ) {
      score += field.weight * 3;
    }
    for (const term of terms) {
      if (field.value === term) {
        score += field.weight * 3;
      } else if (field.value.includes(term)) {
        score += field.weight;
      }
    }
  }
  return score;
}

function queryTerms(value: string): string[] {
  const normalizedValue = normalize(value);
  const terms = new Set<string>([normalizedValue]);
  const lexicalTerms =
    normalizedValue.match(/[\p{L}\p{N}_./#:@-]+/gu) ?? [];
  for (const lexicalTerm of lexicalTerms) {
    if (lexicalTerm.length >= 2) {
      terms.add(lexicalTerm);
    }
    for (const part of lexicalTerm.split(/[._/#:@-]+/u)) {
      if (part.length >= 2) {
        terms.add(part);
      }
    }
  }
  const cjkRuns =
    normalizedValue.match(
      /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]+/gu
    ) ?? [];
  for (const run of cjkRuns) {
    for (const size of [2, 3]) {
      for (let index = 0; index + size <= run.length; index += 1) {
        terms.add(run.slice(index, index + size));
        if (terms.size >= 160) {
          return [...terms].filter(Boolean);
        }
      }
    }
  }
  return [...terms].filter(Boolean);
}

function formatEntityLine(item: GraphSliceEntity): string {
  const seed = item.isSeed ? ' seed' : '';
  const description = item.isSeed && item.entity.description
    ? ` — ${truncateText(item.entity.description, 220)}`
    : '';
  return `E d=${item.depth}${seed} [${item.entity.groupKey}] ${formatEntityIdentity(item.entity)} @ ${item.entity.filePath}:L${item.entity.startLine}-L${item.entity.endLine}${description}`;
}

function formatEntityIdentity(entity: AgentGraphEntityRecord): string {
  return `${entity.name} <${entity.key}> (${entity.type})`;
}

function formatRelationLine(
  relation: AgentGraphRelationRecord,
  includeEvidence: boolean
): string {
  const evidence = includeEvidence ? formatEvidence(relation.evidence) : '';
  const structuralPath = includeEvidence ? formatStructuralPath(relation) : '';
  const description = relation.description
    ? ` — ${truncateText(relation.description, 180)}`
    : '';
  const provenance = formatRelationProvenance(relation);
  return `R [${relation.groupKey}] ${relation.sourceName} <${relation.sourceKey}> --${relation.verb}--> ${relation.targetName} <${relation.targetKey}>${provenance}${description}${evidence}${structuralPath}`;
}

function formatRelationProvenance(relation: AgentGraphRelationRecord): string {
  if (!relation.origin && !relation.confidence) {
    return '';
  }
  return ` [${relation.origin ?? 'unknown'}/${relation.confidence ?? 'unknown'}]`;
}

function formatEvidence(evidence: AgentGraphEvidence[]): string {
  if (evidence.length === 0) {
    return '';
  }
  return ` | Evidence: ${evidence
    .map((item) => {
      const range = item.endLine
        ? `L${item.startLine}-L${item.endLine}`
        : `L${item.startLine}`;
      const detail = item.detail ? ` ${truncateText(item.detail, 140)}` : '';
      return `${item.filePath}:${range}${detail}`;
    })
    .join('; ')}`;
}

function formatStructuralPath(relation: AgentGraphRelationRecord): string {
  if (!relation.structuralPath || relation.structuralPath.length === 0) {
    return '';
  }
  return ` | Structural path: ${relation.structuralPath
    .map((hop) => {
      const path =
        hop.traversal === 'reverse'
          ? `${hop.target} <--${hop.verb}-- ${hop.source}`
          : `${hop.source} --${hop.verb}--> ${hop.target}`;
      return `${path} @ ${hop.filePath}:L${hop.startLine}-L${hop.endLine}`;
    })
    .join(' ; ')}`;
}

function emptyPath(
  options: ShortestPathOptions,
  warnings: string[]
): ShortestPathResult {
  return {
    sourceSelector: options.source,
    targetSelector: options.target,
    groupKey: options.groupKey,
    entities: [],
    steps: [],
    warnings
  };
}

function matchesGroup(
  entity: AgentGraphEntityRecord,
  groupKey: string | undefined
): boolean {
  return !groupKey || normalize(entity.groupKey) === normalize(groupKey);
}

function normalizeRelationVerbs(values: string[] | undefined): Set<string> | null {
  if (!values || values.length === 0) {
    return null;
  }
  return new Set(values.map(normalize));
}

function normalize(value: string): string {
  return value.normalize('NFKC').trim().toLocaleLowerCase();
}

function clampInteger(
  value: number | undefined,
  minimum: number,
  maximum: number,
  fallback: number
): number {
  if (value === undefined || !Number.isFinite(value)) {
    return fallback;
  }
  return Math.max(minimum, Math.min(Math.trunc(value), maximum));
}

function clampTokenBudget(value: number | undefined): number {
  return clampInteger(
    value,
    MIN_TOKEN_BUDGET,
    MAX_TOKEN_BUDGET,
    DEFAULT_TOKEN_BUDGET
  );
}

function appendAdjacency(
  map: Map<string, AdjacencyEntry[]>,
  entityId: string,
  entry: AdjacencyEntry
): void {
  const entries = map.get(entityId);
  if (entries) {
    entries.push(entry);
  } else {
    map.set(entityId, [entry]);
  }
}

function calculateHubThreshold(degrees: number[]): number {
  if (degrees.length === 0) {
    return HUB_DEGREE_FLOOR;
  }
  const sorted = [...degrees].sort((left, right) => left - right);
  const percentileIndex = Math.min(
    sorted.length - 1,
    Math.floor((sorted.length - 1) * 0.95)
  );
  return Math.max(HUB_DEGREE_FLOOR, sorted[percentileIndex]);
}

function compareEntities(
  left: AgentGraphEntityRecord,
  right: AgentGraphEntityRecord
): number {
  return (
    left.groupOrder - right.groupOrder ||
    left.groupKey.localeCompare(right.groupKey) ||
    left.key.localeCompare(right.key) ||
    left.id.localeCompare(right.id)
  );
}

function compareRelations(
  left: AgentGraphRelationRecord,
  right: AgentGraphRelationRecord
): number {
  return (
    left.groupOrder - right.groupOrder ||
    left.groupKey.localeCompare(right.groupKey) ||
    left.sourceKey.localeCompare(right.sourceKey) ||
    left.targetKey.localeCompare(right.targetKey) ||
    left.verb.localeCompare(right.verb) ||
    left.id.localeCompare(right.id)
  );
}

function relationDepth(
  relation: AgentGraphRelationRecord,
  depthByEntityId: ReadonlyMap<string, number>
): number {
  return Math.max(
    depthByEntityId.get(relation.sourceEntityId) ?? Number.MAX_SAFE_INTEGER,
    depthByEntityId.get(relation.targetEntityId) ?? Number.MAX_SAFE_INTEGER
  );
}

function compareAdjacency(left: AdjacencyEntry, right: AdjacencyEntry): number {
  return (
    compareRelations(left.relation, right.relation) ||
    left.neighborId.localeCompare(right.neighborId) ||
    left.traversal.localeCompare(right.traversal)
  );
}

function tryAppendBlock<T extends { text: string }>(
  blocks: T[],
  block: T,
  tokenBudget: number
): boolean {
  const candidate = [...blocks.map((item) => item.text), block.text].join('\n');
  if (estimateTokenCount(candidate) > tokenBudget) {
    return false;
  }
  blocks.push(block);
  return true;
}

function findLastRemovableBlock(
  blocks: Array<{ kind: 'header' | 'entity' | 'relation' | 'warning' }>
): number {
  for (let index = blocks.length - 1; index >= 0; index -= 1) {
    if (blocks[index].kind !== 'header') {
      return index;
    }
  }
  return -1;
}

function truncateText(value: string, maximumLength: number): string {
  const compact = value.replace(/\s+/gu, ' ').trim();
  if (compact.length <= maximumLength) {
    return compact;
  }
  return `${compact.slice(0, maximumLength - 1)}…`;
}

function truncateToTokenBudget(value: string, tokenBudget: number): string {
  const compact = value.replace(/\s+/gu, ' ').trim();
  if (estimateTokenCount(compact) <= tokenBudget) {
    return compact;
  }
  let low = 0;
  let high = compact.length;
  while (low < high) {
    const middle = Math.ceil((low + high) / 2);
    const candidate = `${compact.slice(0, middle)}…`;
    if (estimateTokenCount(candidate) <= tokenBudget) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return `${compact.slice(0, low)}…`;
}
