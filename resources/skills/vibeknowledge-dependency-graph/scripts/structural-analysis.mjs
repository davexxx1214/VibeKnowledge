const DEPENDENCY_VERBS = new Set([
  'imports',
  'extends',
  'implements',
  'calls',
  'references'
]);

/** Resolve a structural entity by exact key, name, or file path. */
export function resolveStructuralEntity(graph, selector) {
  const normalized = normalize(selector);
  if (!normalized) return undefined;
  const exact = graph.entities.find((entity) =>
    [entity.key, entity.name, entity.filePath].some(
      (value) => normalize(value) === normalized
    )
  );
  if (exact) return exact;
  return graph.entities.find((entity) =>
    [entity.key, entity.name, entity.filePath].some((value) =>
      normalize(value).includes(normalized)
    )
  );
}

/** Find strongly connected dependency components. */
export function findStructuralCycles(graph, options = {}) {
  const relations = dependencyRelations(graph, options.relationVerbs);
  const adjacency = adjacencyFor(relations, 'outgoing');
  const reverseAdjacency = adjacencyFor(relations, 'incoming');
  const entityByKey = entityMap(graph);
  const selfLoops = new Set(
    relations
      .filter((relation) => relation.source === relation.target)
      .map((relation) => relation.source)
  );
  const keys = [...new Set(relations.flatMap((relation) => [relation.source, relation.target]))]
    .filter((key) => entityByKey.has(key))
    .sort(compareText);
  const visited = new Set();
  const finishOrder = [];
  const components = [];

  // Iterative Kosaraju traversal avoids overflowing the JS stack on large graphs.
  for (const start of keys) {
    if (visited.has(start)) continue;
    visited.add(start);
    const stack = [{ key: start, index: 0, neighbors: outgoingKeys(adjacency, start) }];
    while (stack.length > 0) {
      const frame = stack[stack.length - 1];
      const next = frame.neighbors[frame.index];
      if (next === undefined) {
        finishOrder.push(frame.key);
        stack.pop();
        continue;
      }
      frame.index += 1;
      if (visited.has(next)) continue;
      visited.add(next);
      stack.push({ key: next, index: 0, neighbors: outgoingKeys(adjacency, next) });
    }
  }

  const assigned = new Set();
  for (const start of finishOrder.reverse()) {
    if (assigned.has(start)) continue;
    assigned.add(start);
    const component = [];
    const stack = [start];
    while (stack.length > 0) {
      const key = stack.pop();
      component.push(key);
      for (const next of incomingKeys(reverseAdjacency, key)) {
        if (!assigned.has(next)) {
          assigned.add(next);
          stack.push(next);
        }
      }
    }
    const hasSelfLoop = component.length === 1 && selfLoops.has(start);
    if (component.length > 1 || hasSelfLoop) components.push(component.sort(compareText));
  }

  return components
    .map((entityKeys, index) => {
      const members = new Set(entityKeys);
      return {
        id: `cycle-${index + 1}`,
        entityKeys,
        entities: entityKeys.map((key) => entityByKey.get(key)),
        relations: relations.filter(
          (relation) => members.has(relation.source) && members.has(relation.target)
        ),
        boundaries: stableUnique(
          entityKeys.map((key) => boundaryForEntity(entityByKey.get(key)))
        )
      };
    })
    .sort((left, right) =>
      right.entityKeys.length - left.entityKeys.length ||
      compareText(left.entityKeys.join('\0'), right.entityKeys.join('\0'))
    );
}

/** Traverse upstream dependants and/or downstream dependencies from one entity. */
export function analyzeStructuralImpact(graph, selector, options = {}) {
  const seed = resolveStructuralEntity(graph, selector);
  if (!seed) {
    throw new Error(`Structural entity not found: ${selector}`);
  }
  const direction = options.direction ?? 'both';
  const maxDepth = clampInteger(options.maxDepth, 1, 8, 3);
  const relations = traversableRelations(graph, options.relationVerbs);
  const entityByKey = entityMap(graph);
  const incoming = adjacencyFor(relations, 'incoming');
  const outgoing = adjacencyFor(relations, 'outgoing');

  const traverse = (mode) => {
    const adjacency = mode === 'upstream' ? incoming : outgoing;
    const seen = new Map([[seed.key, 0]]);
    const queue = [seed.key];
    const selectedRelations = [];
    for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
      const current = queue[queueIndex];
      const depth = seen.get(current);
      if (depth >= maxDepth) continue;
      for (const relation of adjacency.get(current) ?? []) {
        const next = mode === 'upstream' ? relation.source : relation.target;
        selectedRelations.push(relation);
        if (!seen.has(next) && entityByKey.has(next)) {
          seen.set(next, depth + 1);
          queue.push(next);
        }
      }
    }
    seen.delete(seed.key);
    return {
      entities: [...seen]
        .sort((left, right) => left[1] - right[1] || compareText(left[0], right[0]))
        .map(([key, depth]) => ({ ...entityByKey.get(key), depth })),
      relations: uniqueRelations(selectedRelations)
    };
  };

  return {
    seed,
    direction,
    maxDepth,
    upstream: direction === 'downstream' ? emptySlice() : traverse('upstream'),
    downstream: direction === 'upstream' ? emptySlice() : traverse('downstream')
  };
}

/** Find a shortest dependency path while preserving relation direction. */
export function findStructuralPath(graph, sourceSelector, targetSelector, options = {}) {
  const source = resolveStructuralEntity(graph, sourceSelector);
  const target = resolveStructuralEntity(graph, targetSelector);
  if (!source) throw new Error(`Structural entity not found: ${sourceSelector}`);
  if (!target) throw new Error(`Structural entity not found: ${targetSelector}`);
  const direction = options.direction ?? 'both';
  const maxDepth = clampInteger(options.maxDepth, 1, 20, 10);
  const relations = traversableRelations(graph, options.relationVerbs);
  const outgoing = adjacencyFor(relations, 'outgoing');
  const incoming = adjacencyFor(relations, 'incoming');
  const queue = [{ key: source.key, path: [] }];
  const seen = new Set([source.key]);

  for (let queueIndex = 0; queueIndex < queue.length; queueIndex += 1) {
    const current = queue[queueIndex];
    if (current.key === target.key) {
      return { source, target, found: true, steps: current.path };
    }
    if (current.path.length >= maxDepth) continue;
    const candidates = [
      ...(outgoing.get(current.key) ?? []).map((relation) => ({
        relation,
        next: relation.target,
        traversal: 'forward'
      })),
      ...(direction === 'both'
        ? (incoming.get(current.key) ?? []).map((relation) => ({
            relation,
            next: relation.source,
            traversal: 'reverse'
          }))
        : [])
    ].sort((left, right) =>
      compareText(relationIdentity(left.relation), relationIdentity(right.relation))
    );
    for (const candidate of candidates) {
      if (seen.has(candidate.next)) continue;
      seen.add(candidate.next);
      queue.push({
        key: candidate.next,
        path: [...current.path, {
          from: current.key,
          to: candidate.next,
          traversal: candidate.traversal,
          relation: candidate.relation
        }]
      });
    }
  }
  return { source, target, found: false, steps: [] };
}

/** Rank high-coupling entities with cross-boundary edges weighted more heavily. */
export function reportStructuralCoupling(graph, options = {}) {
  const limit = clampInteger(options.limit, 1, 200, 20);
  const entityByKey = entityMap(graph);
  const records = new Map();
  for (const relation of dependencyRelations(graph, options.relationVerbs)) {
    const source = entityByKey.get(relation.source);
    const target = entityByKey.get(relation.target);
    if (!source || !target) continue;
    const sourceBoundary = boundaryForEntity(source);
    const targetBoundary = boundaryForEntity(target);
    const crossesBoundary = sourceBoundary !== targetBoundary;
    const sourceRecord = couplingRecord(records, source, sourceBoundary);
    const targetRecord = couplingRecord(records, target, targetBoundary);
    sourceRecord.outgoing += 1;
    targetRecord.incoming += 1;
    if (crossesBoundary) {
      sourceRecord.crossBoundary += 1;
      targetRecord.crossBoundary += 1;
    }
  }
  return [...records.values()]
    .map((record) => ({
      ...record,
      total: record.incoming + record.outgoing,
      score: record.incoming + record.outgoing + record.crossBoundary * 2
    }))
    .sort((left, right) =>
      right.score - left.score || right.total - left.total || compareText(left.key, right.key)
    )
    .slice(0, limit);
}

/** Aggregate direct connections that cross inferred module/package boundaries. */
export function reportCrossBoundaryConnections(graph, options = {}) {
  const entityByKey = entityMap(graph);
  const aggregate = new Map();
  for (const relation of dependencyRelations(graph, options.relationVerbs)) {
    const source = entityByKey.get(relation.source);
    const target = entityByKey.get(relation.target);
    if (!source || !target) continue;
    const sourceBoundary = boundaryForEntity(source);
    const targetBoundary = boundaryForEntity(target);
    if (sourceBoundary === targetBoundary) continue;
    const key = `${sourceBoundary}\0${targetBoundary}`;
    const record = aggregate.get(key) ?? {
      sourceBoundary,
      targetBoundary,
      count: 0,
      verbs: {},
      relations: []
    };
    record.count += 1;
    record.verbs[relation.verb] = (record.verbs[relation.verb] ?? 0) + 1;
    if (record.relations.length < 10) record.relations.push(relation);
    aggregate.set(key, record);
  }
  return [...aggregate.values()].sort((left, right) =>
    right.count - left.count ||
    compareText(`${left.sourceBoundary}\0${left.targetBoundary}`, `${right.sourceBoundary}\0${right.targetBoundary}`)
  );
}

/** Detect deterministic file communities as suggestions only. */
export function suggestStructuralCommunities(graph, options = {}) {
  const minimumSize = clampInteger(options.minimumSize, 2, 100, 2);
  const maximumIterations = clampInteger(options.maximumIterations, 1, 50, 12);
  const files = stableUnique(
    graph.entities
      .filter((entity) => entity.kind !== 'external')
      .map((entity) => entity.filePath)
      .filter(Boolean)
  ).sort(compareText);
  const neighbors = new Map(files.map((file) => [file, new Map()]));
  const entityByKey = entityMap(graph);
  for (const relation of dependencyRelations(graph, options.relationVerbs)) {
    const sourceFile = entityByKey.get(relation.source)?.filePath;
    const targetFile = entityByKey.get(relation.target)?.filePath;
    if (!sourceFile || !targetFile || sourceFile === '@external' || targetFile === '@external' || sourceFile === targetFile) continue;
    incrementWeight(neighbors, sourceFile, targetFile);
    incrementWeight(neighbors, targetFile, sourceFile);
  }
  const labels = new Map(files.map((file) => [file, file]));
  for (let iteration = 0; iteration < maximumIterations; iteration += 1) {
    let changed = false;
    for (const file of files) {
      const scores = new Map();
      for (const [neighbor, weight] of neighbors.get(file) ?? []) {
        const label = labels.get(neighbor);
        scores.set(label, (scores.get(label) ?? 0) + weight);
      }
      const best = [...scores]
        .sort((left, right) => right[1] - left[1] || compareText(left[0], right[0]))[0];
      if (best && best[0] !== labels.get(file)) {
        labels.set(file, best[0]);
        changed = true;
      }
    }
    if (!changed) break;
  }
  const groups = new Map();
  for (const file of files) {
    append(groups, labels.get(file), file);
  }
  return [...groups.values()]
    .filter((communityFiles) => communityFiles.length >= minimumSize)
    .map((communityFiles, index) => {
      communityFiles.sort(compareText);
      const scope = commonDirectory(communityFiles);
      return {
        id: `community-${index + 1}`,
        suggestedKey: slug(scope === '.' ? communityFiles[0] : scope),
        suggestedName: scope === '.' ? `Community ${index + 1}` : scope,
        scope,
        files: communityFiles,
        boundaries: stableUnique(communityFiles.map(boundaryForPath)),
        relationCount: countInternalFileRelations(graph, new Set(communityFiles), entityByKey)
      };
    })
    .sort((left, right) =>
      right.files.length - left.files.length || compareText(left.suggestedKey, right.suggestedKey)
    );
}

/** Compare stable nodes and edges between two structural snapshots. */
export function diffStructuralGraphs(current, baseline) {
  if (!baseline) {
    return {
      available: false,
      addedEntities: [],
      removedEntities: [],
      changedEntities: [],
      addedRelations: [],
      removedRelations: [],
      changedRelations: []
    };
  }
  const currentEntities = entityMap(current);
  const baselineEntities = entityMap(baseline);
  const entityKeys = stableUnique([...currentEntities.keys(), ...baselineEntities.keys()]);
  const addedEntities = [];
  const removedEntities = [];
  const changedEntities = [];
  for (const key of entityKeys.sort(compareText)) {
    const after = currentEntities.get(key);
    const before = baselineEntities.get(key);
    if (!before) addedEntities.push(after);
    else if (!after) removedEntities.push(before);
    else if (stableJson(before) !== stableJson(after)) changedEntities.push({ before, after });
  }

  const relationDiffKey = (relation) => `${relation.source}\0${relation.target}\0${relation.verb}`;
  const currentRelations = groupedMap(current.relations, relationDiffKey);
  const baselineRelations = groupedMap(baseline.relations, relationDiffKey);
  const relationKeys = stableUnique([...currentRelations.keys(), ...baselineRelations.keys()]).sort(compareText);
  const addedRelations = [];
  const removedRelations = [];
  const changedRelations = [];
  for (const key of relationKeys) {
    const after = currentRelations.get(key) ?? [];
    const before = baselineRelations.get(key) ?? [];
    if (before.length === 0) addedRelations.push(...after);
    else if (after.length === 0) removedRelations.push(...before);
    else if (stableJson(before) !== stableJson(after)) changedRelations.push({ before, after });
  }
  return {
    available: true,
    baselineGeneratedAt: baseline.generatedAt,
    currentGeneratedAt: current.generatedAt,
    addedEntities,
    removedEntities,
    changedEntities,
    addedRelations,
    removedRelations,
    changedRelations
  };
}

/** Aggregate a large graph before rendering it. */
export function aggregateStructuralGraph(graph, options = {}) {
  const level = options.level ?? 'boundary';
  const limit = clampInteger(options.limit, 2, 250, 80);
  const entityByKey = entityMap(graph);
  const communityByFile = new Map();
  if (level === 'community') {
    for (const community of suggestStructuralCommunities(graph, options)) {
      for (const file of community.files) communityByFile.set(file, community.id);
    }
  }
  const groupFor = (entity) => {
    if (level === 'file') return entity.filePath || '@external';
    if (level === 'community') return communityByFile.get(entity.filePath) ?? boundaryForEntity(entity);
    return boundaryForEntity(entity);
  };
  const nodeStats = new Map();
  const edges = new Map();
  for (const entity of graph.entities) {
    const id = groupFor(entity);
    const record = nodeStats.get(id) ?? { id, name: id, entityCount: 0, files: new Set(), rawKeys: [] };
    record.entityCount += 1;
    if (entity.filePath && entity.filePath !== '@external') record.files.add(entity.filePath);
    if (record.rawKeys.length < 20) record.rawKeys.push(entity.key);
    nodeStats.set(id, record);
  }
  for (const relation of dependencyRelations(graph, options.relationVerbs)) {
    const sourceEntity = entityByKey.get(relation.source);
    const targetEntity = entityByKey.get(relation.target);
    if (!sourceEntity || !targetEntity) continue;
    const source = groupFor(sourceEntity);
    const target = groupFor(targetEntity);
    if (source === target) continue;
    const key = `${source}\0${target}\0${relation.verb}`;
    const record = edges.get(key) ?? { source, target, verb: relation.verb, count: 0, relations: [] };
    record.count += 1;
    if (record.relations.length < 8) record.relations.push(relation);
    edges.set(key, record);
  }
  const rankedNodes = [...nodeStats.values()]
    .map((node) => ({ ...node, files: [...node.files].sort(compareText) }))
    .sort((left, right) => right.entityCount - left.entityCount || compareText(left.id, right.id))
    .slice(0, limit);
  const included = new Set(rankedNodes.map((node) => node.id));
  return {
    level,
    truncated: nodeStats.size > rankedNodes.length,
    totalNodeCount: nodeStats.size,
    nodes: rankedNodes,
    relations: [...edges.values()]
      .filter((relation) => included.has(relation.source) && included.has(relation.target))
      .sort((left, right) => right.count - left.count || compareText(`${left.source}\0${left.target}\0${left.verb}`, `${right.source}\0${right.target}\0${right.verb}`))
  };
}

export function analyzeStructuralGraph(graph, options = {}) {
  return {
    generatedAt: graph.generatedAt,
    scope: graph.scope,
    cycles: findStructuralCycles(graph, options),
    coupling: reportStructuralCoupling(graph, options),
    crossBoundary: reportCrossBoundaryConnections(graph, options),
    communities: suggestStructuralCommunities(graph, options),
    diff: diffStructuralGraphs(graph, options.baseline)
  };
}

export function boundaryForEntity(entity) {
  if (!entity || entity.kind === 'external' || entity.filePath === '@external') return '@external';
  return boundaryForPath(entity.filePath);
}

export function boundaryForPath(filePath) {
  const parts = String(filePath ?? '').replace(/\\/g, '/').split('/').filter(Boolean);
  if (parts.length === 0) return '(root)';
  const packageIndex = parts.findIndex((part) => ['apps', 'packages', 'libs'].includes(part));
  if (packageIndex >= 0 && parts[packageIndex + 1]) return `${parts[packageIndex]}/${parts[packageIndex + 1]}`;
  if (parts[0] === 'src') return parts.length > 2 ? `src/${parts[1]}` : 'src/(root)';
  return parts.length > 1 ? parts[0] : '(root)';
}

function dependencyRelations(graph, verbs) {
  const allowed = verbs ? new Set(verbs) : DEPENDENCY_VERBS;
  return graph.relations.filter((relation) => allowed.has(relation.verb));
}

function traversableRelations(graph, verbs) {
  return uniqueRelations([
    ...dependencyRelations(graph, verbs),
    ...graph.relations.filter((relation) => relation.verb === 'contains')
  ]);
}

function adjacencyFor(relations, direction) {
  const result = new Map();
  for (const relation of relations) {
    append(result, direction === 'incoming' ? relation.target : relation.source, relation);
  }
  for (const values of result.values()) values.sort((left, right) => compareText(relationIdentity(left), relationIdentity(right)));
  return result;
}

function outgoingKeys(adjacency, key) {
  return stableUnique((adjacency.get(key) ?? []).map((relation) => relation.target));
}

function incomingKeys(adjacency, key) {
  return stableUnique((adjacency.get(key) ?? []).map((relation) => relation.source));
}

function couplingRecord(records, entity, boundary) {
  const current = records.get(entity.key) ?? {
    key: entity.key,
    name: entity.name,
    kind: entity.kind,
    filePath: entity.filePath,
    startLine: entity.startLine,
    boundary,
    incoming: 0,
    outgoing: 0,
    crossBoundary: 0
  };
  records.set(entity.key, current);
  return current;
}

function incrementWeight(neighbors, source, target) {
  if (!neighbors.has(source) || !neighbors.has(target)) return;
  const weights = neighbors.get(source);
  weights.set(target, (weights.get(target) ?? 0) + 1);
}

function countInternalFileRelations(graph, files, entityByKey) {
  return dependencyRelations(graph).filter((relation) => {
    const source = entityByKey.get(relation.source)?.filePath;
    const target = entityByKey.get(relation.target)?.filePath;
    return files.has(source) && files.has(target);
  }).length;
}

function commonDirectory(files) {
  const split = files.map((file) => file.split('/'));
  const result = [];
  for (let index = 0; index < Math.min(...split.map((parts) => parts.length - 1)); index += 1) {
    if (!split.every((parts) => parts[index] === split[0][index])) break;
    result.push(split[0][index]);
  }
  return result.join('/') || '.';
}

function entityMap(graph) {
  return new Map(graph.entities.map((entity) => [entity.key, entity]));
}

function groupedMap(values, keyFor) {
  const result = new Map();
  for (const value of values) append(result, keyFor(value), value);
  for (const group of result.values()) group.sort((left, right) => compareText(stableJson(left), stableJson(right)));
  return result;
}

function uniqueRelations(relations) {
  return [...new Map(relations.map((relation) => [relationIdentity(relation), relation])).values()]
    .sort((left, right) => compareText(relationIdentity(left), relationIdentity(right)));
}

function relationIdentity(relation) {
  return [relation.source, relation.target, relation.verb, relation.location?.filePath ?? '', relation.location?.startLine ?? 0, relation.location?.endLine ?? 0].join('\0');
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort(compareText).map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function append(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function stableUnique(values) {
  return [...new Set(values)];
}

function normalize(value) {
  return String(value ?? '').trim().replace(/\\/g, '/').toLocaleLowerCase('en-US');
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'en');
}

function clampInteger(value, minimum, maximum, fallback) {
  return Number.isInteger(value) ? Math.min(maximum, Math.max(minimum, value)) : fallback;
}

function emptySlice() {
  return { entities: [], relations: [] };
}

function slug(value) {
  return String(value).toLocaleLowerCase('en-US').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'community';
}
