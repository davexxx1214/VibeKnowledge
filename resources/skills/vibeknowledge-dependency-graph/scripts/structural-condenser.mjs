import { canonicalizeEntityKey } from './canonicalize-entity-key.mjs';
import { assertStructuralGraphDocument } from './structural-graph-schema.mjs';

const INFRASTRUCTURE_PATTERN =
  /(config|database|persistence|typeorm|prisma|sequelize|cache|redis|logger|logging|telemetry|observability|queue|messag|eventbus|storage|mail|search)/i;
const IMPORTANT_EXTERNAL_PATTERN =
  /(@nestjs\/core|swagger|openapi|typeorm|prisma|sequelize|postgres|mysql|mariadb|mongodb|redis|kafka|rabbit|nats|s3|dynamodb|elasticsearch|opensearch)/i;
const DETAIL_EXTERNAL_PATTERN =
  /(typeorm|prisma|sequelize|postgres|mysql|mariadb|mongodb|redis|kafka|rabbit|nats|s3|dynamodb|elasticsearch|opensearch)/i;
const DETAIL_ENTITY_PATTERN =
  /(module|controller|service|repository|repo|entity|model|gateway|resolver|usecase|use-case|handler|adapter|store)$/i;

/** Build a deterministic curated group candidate from a validated structural graph. */
export function convergeStructuralGraph(structuralGraph, options = {}) {
  assertStructuralGraphDocument(structuralGraph);
  const kind = options.kind ?? 'framework';
  if (!['framework', 'module', 'feature'].includes(kind)) {
    throw new Error('kind must be framework, module, or feature');
  }
  const scope = normalizeScope(options.scope ?? structuralGraph.scope ?? '.');
  if (kind !== 'framework' && scope === '.') {
    throw new Error('module and feature convergence require a narrower --scope');
  }

  const context = createContext(structuralGraph);
  const result =
    kind === 'framework'
      ? convergeFramework(context, options)
      : convergeDetailedGroup(context, { ...options, kind, scope });
  return {
    group: result.group,
    statistics: {
      structuralEntities: structuralGraph.entities.length,
      structuralRelations: structuralGraph.relations.length,
      curatedEntities: result.group.entities.length,
      curatedRelations: result.group.relations.length,
      collapsedRelations: result.collapsedRelations
    },
    warnings: result.warnings
  };
}

/** Replace one target group while preserving every unrelated group byte-for-byte semantically. */
export function mergeCuratedGroup(existingDocument, candidateGroup, options = {}) {
  const document = normalizeExistingDocument(existingDocument, options.generatedAt);
  if (candidateGroup.kind !== 'framework' && document.groups.length === 0) {
    throw new Error('Generate the framework group before a module or feature group');
  }
  const existingIndex = document.groups.findIndex(
    (group) => group.key === candidateGroup.key
  );
  const existing = existingIndex >= 0 ? document.groups[existingIndex] : undefined;
  const nextOrder =
    candidateGroup.kind === 'framework'
      ? 0
      : existing?.order ??
        Math.max(0, ...document.groups.map((group) => group.order)) + 1;
  const hydrated = preserveSemanticCuration(
    {
      ...candidateGroup,
      key: candidateGroup.kind === 'framework' ? 'framework' : candidateGroup.key,
      order: nextOrder
    },
    existing
  );

  let groups;
  if (existingIndex >= 0) {
    groups = document.groups.map((group, index) =>
      index === existingIndex ? hydrated : group
    );
  } else {
    groups = [...document.groups, hydrated];
  }
  groups.sort((left, right) => left.order - right.order || compareText(left.key, right.key));

  const frameworks = groups.filter((group) => group.kind === 'framework');
  if (
    frameworks.length !== 1 ||
    groups[0]?.key !== 'framework' ||
    groups[0]?.order !== 0
  ) {
    throw new Error('The merged graph must contain exactly one framework group at order 0');
  }
  return {
    version: 1,
    generatedAt: options.generatedAt ?? new Date().toISOString(),
    scope: document.scope ?? '.',
    groups
  };
}

export function serializeCuratedGraph(document) {
  return `${JSON.stringify(document, null, 2)}\n`;
}

function createContext(graph) {
  const entities = new Map(graph.entities.map((entity) => [entity.key, entity]));
  const outgoing = new Map();
  const incoming = new Map();
  const degree = new Map();
  for (const relation of graph.relations) {
    appendMapArray(outgoing, relation.source, relation);
    appendMapArray(incoming, relation.target, relation);
    degree.set(relation.source, (degree.get(relation.source) ?? 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) ?? 0) + 1);
  }
  return { graph, entities, outgoing, incoming, degree };
}

function convergeFramework(context, options) {
  const warnings = [];
  const modules = [...context.entities.values()]
    .filter((entity) => entity.metadata?.nest?.role === 'module')
    .sort(compareEntities);
  const selected = new Map();
  const priorities = new Map();
  const select = (entity, priority) => {
    if (!entity) return;
    selected.set(entity.key, entity);
    priorities.set(entity.key, Math.min(priority, priorities.get(entity.key) ?? priority));
  };

  const startups = findStartupEntities(context);
  startups.forEach((entity) => select(entity, 0));

  let roots = [];
  let directModules = [];
  if (modules.length > 0) {
    const moduleKeys = new Set(modules.map((entity) => entity.key));
    const moduleRelations = context.graph.relations.filter(
      (relation) =>
        relation.verb === 'imports' &&
        moduleKeys.has(relation.source) &&
        moduleKeys.has(relation.target)
    );
    const incomingCounts = new Map(modules.map((entity) => [entity.key, 0]));
    for (const relation of moduleRelations) {
      incomingCounts.set(
        relation.target,
        (incomingCounts.get(relation.target) ?? 0) + 1
      );
    }
    const rootCandidates = modules
      .filter((entity) => (incomingCounts.get(entity.key) ?? 0) === 0)
      .sort((left, right) =>
        rootModuleScore(right, context) - rootModuleScore(left, context) ||
        compareEntities(left, right)
      );
    const strongRoots = rootCandidates.filter(
      (entity) => rootModuleScore(entity, context) > 0
    );
    roots = (strongRoots.length > 0 ? strongRoots : rootCandidates.slice(0, 1)).slice(
      0,
      3
    );
    roots.forEach((entity) => select(entity, 1));
    const rootKeys = new Set(roots.map((entity) => entity.key));
    directModules = moduleRelations
      .filter((relation) => rootKeys.has(relation.source))
      .map((relation) => context.entities.get(relation.target))
      .filter(Boolean)
      .sort(compareEntities);
    directModules.forEach((entity) => select(entity, 2));

    for (const entity of modules) {
      if (
        INFRASTRUCTURE_PATTERN.test(entity.name) &&
        (directModules.some((candidate) => candidate.key === entity.key) ||
          countBoundaryImporters(entity.key, moduleRelations) >= 2)
      ) {
        select(entity, 3);
      }
    }
  } else {
    for (const entity of findGenericBoundaries(context)) {
      select(entity, 2);
    }
    roots = startups.slice(0, 1);
  }

  const membership = buildBoundaryMembership(context, [...selected.values()], modules);
  const importantExternals = [...context.entities.values()]
    .filter(
      (entity) =>
        entity.kind === 'external' &&
        isPackageBoundaryExternal(entity) &&
        IMPORTANT_EXTERNAL_PATTERN.test(`${entity.name} ${entity.filePath}`) &&
        isConnectedToSelectedBoundary(entity.key, context, membership, selected)
    )
    .filter(
      (entity, _index, values) =>
        entity.key !== 'external:typeorm' ||
        !values.some((candidate) => candidate.key === 'external:@nestjs/typeorm')
    )
    .sort(compareEntities);
  importantExternals.forEach((entity) => {
    select(entity, 4);
    membership.set(entity.key, entity.key);
  });

  const relationChoices = new Map();
  const directModuleKeys = new Set(directModules.map((entity) => entity.key));
  const startupExternalKeys = new Set(
    context.graph.relations
      .filter(
        (relation) =>
          startups.some((startup) => startup.key === relation.source) &&
          importantExternals.some((external) => external.key === relation.target)
      )
      .map((relation) => relation.target)
  );
  for (const startup of startups) {
    for (const root of roots) {
      const path = findStructuralPath(context, startup.key, root.key, 5);
      if (path.length > 0) {
        chooseFrameworkRelation(relationChoices, {
          source: startup.key,
          target: root.key,
          verb: 'calls',
          structuralRelations: path,
          description: `${startup.name} reaches the ${root.name} root composition boundary.`
        }, 0);
      }
    }
  }

  for (const relation of context.graph.relations) {
    let sourceBoundary = membership.get(relation.source);
    const targetBoundary = membership.get(relation.target);
    if (
      targetBoundary &&
      selected.get(targetBoundary)?.kind === 'external' &&
      directModuleKeys.has(sourceBoundary) &&
      roots[0]
    ) {
      sourceBoundary = roots[0].key;
    }
    if (
      targetBoundary &&
      startupExternalKeys.has(targetBoundary) &&
      !startups.some((startup) => startup.key === sourceBoundary)
    ) {
      continue;
    }
    if (
      !sourceBoundary ||
      !targetBoundary ||
      sourceBoundary === targetBoundary ||
      !selected.has(sourceBoundary) ||
      !selected.has(targetBoundary)
    ) {
      continue;
    }
    const direct =
      relation.source === sourceBoundary && relation.target === targetBoundary;
    const structuralRelations = direct
      ? [{ ...relation, _traversal: 'forward' }]
      : findStructuralPath(context, sourceBoundary, targetBoundary, 7);
    const verb = direct ? curatedVerb(relation.verb) : collapsedVerb(relation.verb);
    chooseFrameworkRelation(relationChoices, {
      source: sourceBoundary,
      target: targetBoundary,
      verb,
      structuralRelations:
        structuralRelations.length > 0
          ? structuralRelations
          : [relation],
      description: direct
        ? relation.detail
        : `${selected.get(sourceBoundary).name} depends on ${selected.get(targetBoundary).name} through a direct cross-boundary code relation.`
    }, frameworkRelationPriority(verb, relation));
  }

  const frameworkRelations = [...relationChoices.values()].map(
    (choice) => choice.relation
  );

  const orderedEntities = [...selected.values()].sort(
    (left, right) =>
      (priorities.get(left.key) ?? 9) - (priorities.get(right.key) ?? 9) ||
      compareEntities(left, right)
  );
  if (orderedEntities.length > 15) {
    warnings.push(
      `Framework candidate contains ${orderedEntities.length} entities; review whether additional boundaries should be collapsed.`
    );
  }
  if (frameworkRelations.length > 20) {
    warnings.push(
      `Framework candidate contains ${frameworkRelations.length} relations; review cross-boundary noise before finalizing.`
    );
  }
  return {
    group: {
      key: 'framework',
      name: options.name ?? 'Framework',
      kind: 'framework',
      order: 0,
      description:
        'Deterministically selected startup, root composition, top-level boundaries, shared infrastructure, and external systems.',
      scope: normalizeScope(options.scope ?? context.graph.scope ?? '.'),
      entities: orderedEntities.map(toCuratedEntity),
      relations: frameworkRelations.sort(compareCuratedRelations)
    },
    collapsedRelations: frameworkRelations.filter(
      (relation) => relation.confidence === 'inferred'
    ).length,
    warnings
  };
}

function convergeDetailedGroup(context, options) {
  const warnings = [];
  const inScope = [...context.entities.values()]
    .filter(
      (entity) =>
        entity.kind !== 'external' &&
        !isTestPath(entity.filePath) &&
        isPathInScope(entity.filePath, options.scope)
    )
    .sort(compareEntities);
  if (inScope.length === 0) {
    throw new Error(`No structural entities were found under scope '${options.scope}'`);
  }
  const selected = new Map();
  const select = (entity) => {
    if (
      entity &&
      !['file', 'method'].includes(entity.kind) &&
      !isTestPath(entity.filePath)
    ) {
      selected.set(entity.key, entity);
    }
  };
  for (const entity of inScope) {
    if (isDetailedEntity(entity, context)) {
      select(entity);
    }
  }
  if (selected.size === 0) {
    const representative = inScope
      .filter((entity) => entity.kind !== 'file')
      .sort((left, right) =>
        (context.degree.get(right.key) ?? 0) - (context.degree.get(left.key) ?? 0) ||
        compareEntities(left, right)
      )[0];
    if (representative) select(representative);
  }

  // Lift method-level structural facts to their owning public components. The
  // detailed graph deliberately omits methods and constructors.
  const coreSelected = new Map(selected);
  for (const relation of context.graph.relations) {
    const sourceRepresentative = selectedRepresentative(
      relation.source,
      coreSelected,
      context
    );
    if (
      sourceRepresentative &&
      !selectedRepresentative(relation.target, coreSelected, context)
    ) {
      selectDetailedNeighbor(
        relation.target,
        relation,
        options.scope,
        context,
        select
      );
    }
  }
  if (selected.has('external:@nestjs/typeorm')) {
    selected.delete('external:typeorm');
  }

  const relations = new Map();
  for (const relation of context.graph.relations) {
    const source = selectedRepresentative(relation.source, selected, context);
    const target = selectedRepresentative(relation.target, selected, context);
    if (
      source &&
      target &&
      source !== target &&
      (isPathInScope(
        context.entities.get(source)?.filePath ?? '',
        options.scope
      ) ||
        isPathInScope(
          context.entities.get(target)?.filePath ?? '',
          options.scope
        ))
    ) {
      const direct = relation.source === source && relation.target === target;
      const structuralRelations = direct
        ? [{ ...relation, _traversal: 'forward' }]
        : findStructuralPath(context, source, target, 7);
      chooseDetailedRelation(relations, {
        source,
        target,
        verb: curatedVerb(relation.verb),
        structuralRelations,
        description: direct
          ? relation.detail
          : `${selected.get(source).name} ${curatedVerb(relation.verb)} ${selected.get(target).name} through implementation details omitted from this view.`
      });
    }
  }

  const key = options.key ?? slugify(options.name ?? lastScopeSegment(options.scope));
  const name = options.name ?? titleCase(key);
  if (selected.size > 25) {
    warnings.push(
      `Detailed candidate contains ${selected.size} entities; narrow the scope or split the group at a stable feature boundary.`
    );
  }
  if (relations.size > 45) {
    warnings.push(
      `Detailed candidate contains ${relations.size} relations; narrow the scope or split the group at a stable feature boundary.`
    );
  }
  return {
    group: {
      key,
      name,
      kind: options.kind,
      order: 1,
      description: `Public components and component-level dependencies under ${options.scope}; methods, constructors, tests, and low-value internals are collapsed.`,
      scope: options.scope,
      entities: [...selected.values()].sort(compareEntities).map(toCuratedEntity),
      relations: [...relations.values()].sort(compareCuratedRelations)
    },
    collapsedRelations: [...relations.values()].filter(
      (relation) => relation.confidence === 'inferred'
    ).length,
    warnings
  };
}

function findStartupEntities(context) {
  const candidates = [...context.entities.values()].filter((entity) => {
    if (entity.kind === 'external' || entity.kind === 'file') return false;
    const fileName = entity.filePath.split('/').pop()?.toLowerCase() ?? '';
    return (
      /^(bootstrap|main|start|run)$/i.test(entity.name) ||
      /^(main|bootstrap|index)\.[cm]?[jt]sx?$/.test(fileName)
    );
  });
  return candidates
    .sort((left, right) => startupScore(right) - startupScore(left) || compareEntities(left, right))
    .slice(0, 3);
}

function startupScore(entity) {
  return (
    (/^bootstrap$/i.test(entity.name) ? 20 : 0) +
    (/^main$/i.test(entity.name) ? 15 : 0) +
    (/\/main\.[cm]?[jt]sx?$/.test(`/${entity.filePath.toLowerCase()}`) ? 10 : 0)
  );
}

function rootModuleScore(entity, context) {
  const outgoingImports = (context.outgoing.get(entity.key) ?? []).filter(
    (relation) => relation.verb === 'imports'
  ).length;
  return (
    (/^(app|application|root).*module$/i.test(entity.name) ? 50 : 0) +
    outgoingImports * 2 +
    (INFRASTRUCTURE_PATTERN.test(entity.name) ? -10 : 0)
  );
}

function countBoundaryImporters(targetKey, relations) {
  return new Set(
    relations
      .filter((relation) => relation.target === targetKey)
      .map((relation) => relation.source)
  ).size;
}

function findGenericBoundaries(context) {
  const groups = new Map();
  for (const entity of context.entities.values()) {
    if (entity.kind === 'external') continue;
    const boundary = boundaryPath(entity.filePath);
    if (boundary) appendMapArray(groups, boundary, entity);
  }
  return [...groups.values()]
    .map((entities) =>
      entities
        .filter((entity) => entity.kind !== 'method')
        .sort((left, right) =>
          genericBoundaryScore(right, context) - genericBoundaryScore(left, context) ||
          compareEntities(left, right)
        )[0]
    )
    .filter(Boolean)
    .sort(compareEntities);
}

function genericBoundaryScore(entity, context) {
  return (
    (entity.metadata?.nest ? 30 : 0) +
    (entity.exported ? 10 : 0) +
    (/index\.[cm]?[jt]sx?$/.test(entity.filePath) ? 8 : 0) +
    (context.degree.get(entity.key) ?? 0) -
    (entity.kind === 'file' ? 2 : 0)
  );
}

function boundaryPath(filePath) {
  const parts = filePath.split('/');
  if (parts.length <= 1) return filePath;
  const offset = ['src', 'lib', 'apps', 'packages'].includes(parts[0]) ? 1 : 0;
  return parts.slice(0, Math.min(parts.length, offset + 1)).join('/');
}

function buildBoundaryMembership(context, boundaries, allModules) {
  const membership = new Map();
  const boundaryKeys = new Set(boundaries.map((entity) => entity.key));
  for (const boundary of boundaries) {
    membership.set(boundary.key, boundary.key);
  }
  for (const module of allModules) {
    if (!boundaryKeys.has(module.key)) continue;
    for (const entity of context.entities.values()) {
      if (entity.filePath === module.filePath) {
        membership.set(entity.key, module.key);
      }
    }
    for (const relation of context.outgoing.get(module.key) ?? []) {
      if (['contains', 'exports'].includes(relation.verb)) {
        membership.set(relation.target, module.key);
      }
    }
  }
  let changed = true;
  while (changed) {
    changed = false;
    for (const relation of context.graph.relations) {
      if (relation.verb !== 'contains') continue;
      const owner = membership.get(relation.source);
      if (owner && !membership.has(relation.target)) {
        membership.set(relation.target, owner);
        changed = true;
      }
    }
  }

  const directoryBoundaries = boundaries
    .map((entity) => ({
      key: entity.key,
      directory: entity.filePath.includes('/')
        ? entity.filePath.slice(0, entity.filePath.lastIndexOf('/'))
        : '.'
    }))
    .filter((item) => item.directory !== '.')
    .sort(
      (left, right) =>
        right.directory.length - left.directory.length || compareText(left.key, right.key)
    );
  for (const entity of context.entities.values()) {
    if (membership.has(entity.key) || entity.kind === 'external') continue;
    const matches = directoryBoundaries.filter((item) =>
      isPathInScope(entity.filePath, item.directory)
    );
    if (matches.length > 0 && matches[0].directory !== 'src') {
      membership.set(entity.key, matches[0].key);
    }
  }

  for (const boundary of boundaries) {
    if (!allModules.some((module) => module.key === boundary.key)) {
      const prefix = boundaryPath(boundary.filePath);
      for (const entity of context.entities.values()) {
        if (boundaryPath(entity.filePath) === prefix) {
          membership.set(entity.key, boundary.key);
        }
      }
    }
  }
  return membership;
}

function isConnectedToSelectedBoundary(
  externalKey,
  context,
  membership,
  selected
) {
  return context.graph.relations.some((relation) => {
    if (relation.source === externalKey) {
      return selected.has(membership.get(relation.target));
    }
    if (relation.target === externalKey) {
      return selected.has(membership.get(relation.source));
    }
    return false;
  });
}

function isPackageBoundaryExternal(entity) {
  const packageName = entity.key.startsWith('external:')
    ? entity.key.slice('external:'.length)
    : entity.name;
  const segments = packageName.split('/').filter(Boolean);
  return packageName.startsWith('@') ? segments.length === 2 : segments.length === 1;
}

function findStructuralPath(context, source, target, maxDepth) {
  const queue = [{ key: source, path: [] }];
  const visited = new Set([source]);
  while (queue.length > 0) {
    const current = queue.shift();
    if (current.path.length >= maxDepth) continue;
    const candidates = [];
    for (const relation of context.outgoing.get(current.key) ?? []) {
      candidates.push({
        next: relation.target,
        relation: { ...relation, _traversal: 'forward' }
      });
    }
    for (const relation of context.incoming.get(current.key) ?? []) {
      if (['contains', 'exports'].includes(relation.verb)) {
        candidates.push({
          next: relation.source,
          relation: { ...relation, _traversal: 'reverse' }
        });
      }
    }
    candidates.sort(
      (left, right) =>
        compareText(left.next, right.next) || compareRawRelations(left.relation, right.relation)
    );
    for (const candidate of candidates) {
      if (visited.has(candidate.next)) continue;
      const path = [...current.path, candidate.relation];
      if (candidate.next === target) return path;
      visited.add(candidate.next);
      queue.push({ key: candidate.next, path });
    }
  }
  return [];
}

function isDetailedEntity(entity, context) {
  if (['file', 'method', 'external'].includes(entity.kind)) return false;
  if (entity.metadata?.nest?.role) return true;
  if (DETAIL_ENTITY_PATTERN.test(entity.name)) return true;
  if (entity.exported && ['class', 'interface', 'function', 'variable'].includes(entity.kind)) {
    return true;
  }
  void context;
  return false;
}

function selectDetailedNeighbor(
  key,
  relation,
  scope,
  context,
  select
) {
  const entity = meaningfulContainer(key, context);
  if (!entity || isTestPath(entity.filePath)) return;
  if (entity.kind === 'external') {
    if (
      isPackageBoundaryExternal(entity) &&
      DETAIL_EXTERNAL_PATTERN.test(`${entity.name} ${entity.filePath}`)
    ) {
      select(entity);
    }
    return;
  }
  if (isPathInScope(entity.filePath, scope)) {
    if (['contains', 'calls', 'references', 'extends', 'implements'].includes(relation.verb)) {
      select(entity);
    }
    return;
  }
  if (['calls', 'references', 'extends', 'implements'].includes(relation.verb)) {
    select(entity);
  }
}

function meaningfulContainer(key, context) {
  let entity = context.entities.get(key);
  const visited = new Set();
  while (
    entity &&
    ['file', 'method'].includes(entity.kind) &&
    entity.containerKey &&
    !visited.has(entity.key)
  ) {
    visited.add(entity.key);
    entity = context.entities.get(entity.containerKey);
  }
  return entity && entity.kind !== 'file' ? entity : undefined;
}

function selectedRepresentative(key, selected, context) {
  let entity = context.entities.get(key);
  const visited = new Set();
  while (entity && !visited.has(entity.key)) {
    if (selected.has(entity.key)) return entity.key;
    visited.add(entity.key);
    entity = entity.containerKey
      ? context.entities.get(entity.containerKey)
      : undefined;
  }
  return undefined;
}

function isTestPath(filePath) {
  return (
    /(^|\/)(?:__tests__|test|tests)(\/|$)/i.test(filePath) ||
    /\.(?:spec|test)\.[cm]?[jt]sx?$/i.test(filePath)
  );
}

function addCuratedRelation(map, input) {
  if (!input.source || !input.target || input.source === input.target) return;
  const structuralRelations = input.structuralRelations.filter(Boolean);
  if (structuralRelations.length === 0) return;
  const key = `${input.source}\u0000${input.target}\u0000${input.verb}`;
  const structuralPath = structuralRelations.map(toStructuralHop);
  const evidence = structuralRelations
    .map((relation) => ({
      filePath: relation.location.filePath,
      startLine: relation.location.startLine,
      endLine: relation.location.endLine,
      ...(relation.detail ? { detail: relation.detail } : {})
    }))
    .filter(
      (item, index, values) =>
        values.findIndex(
          (candidate) =>
            candidate.filePath === item.filePath &&
            candidate.startLine === item.startLine &&
            candidate.endLine === item.endLine
        ) === index
    );
  const candidate = {
    source: input.source,
    target: input.target,
    verb: input.verb,
    origin:
      structuralRelations.length === 1
        ? structuralRelations[0].origin
        : 'resolver',
    confidence:
      structuralRelations.length === 1 &&
      input.source === structuralRelations[0].source &&
      input.target === structuralRelations[0].target
        ? structuralRelations[0].confidence
        : 'inferred',
    ...(input.description ? { description: input.description } : {}),
    evidence,
    structuralPath
  };
  const existing = map.get(key);
  if (
    !existing ||
    candidate.structuralPath.length < existing.structuralPath.length ||
    (candidate.structuralPath.length === existing.structuralPath.length &&
      compareText(
        JSON.stringify(candidate.structuralPath),
        JSON.stringify(existing.structuralPath)
      ) < 0)
  ) {
    map.set(key, candidate);
  }
}

function chooseFrameworkRelation(map, input, priority) {
  const candidateMap = new Map();
  addCuratedRelation(candidateMap, input);
  const candidate = [...candidateMap.values()][0];
  if (!candidate) return;
  const key = `${candidate.source}\u0000${candidate.target}`;
  const existing = map.get(key);
  if (
    !existing ||
    priority < existing.priority ||
    (priority === existing.priority &&
      (candidate.structuralPath.length < existing.relation.structuralPath.length ||
        (candidate.structuralPath.length === existing.relation.structuralPath.length &&
          compareText(
            `${candidate.verb}\u0000${JSON.stringify(candidate.structuralPath)}`,
            `${existing.relation.verb}\u0000${JSON.stringify(existing.relation.structuralPath)}`
          ) < 0)))
  ) {
    map.set(key, { relation: candidate, priority });
  }
}

function chooseDetailedRelation(map, input) {
  const candidateMap = new Map();
  addCuratedRelation(candidateMap, input);
  const candidate = [...candidateMap.values()][0];
  if (!candidate) return;
  const key = `${candidate.source}\u0000${candidate.target}`;
  const existing = map.get(key);
  const candidatePriority = detailedRelationPriority(candidate.verb);
  const existingPriority = existing
    ? detailedRelationPriority(existing.verb)
    : Number.POSITIVE_INFINITY;
  if (
    !existing ||
    candidatePriority < existingPriority ||
    (candidatePriority === existingPriority &&
      (candidate.structuralPath.length < existing.structuralPath.length ||
        (candidate.structuralPath.length === existing.structuralPath.length &&
          compareText(
            `${candidate.verb}\u0000${JSON.stringify(candidate.structuralPath)}`,
            `${existing.verb}\u0000${JSON.stringify(existing.structuralPath)}`
          ) < 0)))
  ) {
    map.set(key, candidate);
  }
}

function detailedRelationPriority(verb) {
  if (verb === 'extends' || verb === 'implements') return 0;
  if (verb === 'imports' || verb === 'exports') return 1;
  if (verb === 'contains') return 2;
  if (verb === 'calls') return 3;
  if (verb === 'references') return 4;
  return 5;
}

function frameworkRelationPriority(verb, structuralRelation) {
  if (verb === 'imports') return 1;
  if (verb === 'exports') return 2;
  if (verb === 'calls') return structuralRelation.target.startsWith('external:') ? 2 : 3;
  if (verb === 'depends_on') return 4;
  return 5;
}

function toStructuralHop(relation) {
  return {
    source: relation.source,
    target: relation.target,
    verb: curatedVerb(relation.verb),
    filePath: relation.location.filePath,
    startLine: relation.location.startLine,
    endLine: relation.location.endLine,
    ...(relation._traversal ? { traversal: relation._traversal } : {})
  };
}

function toCuratedEntity(entity) {
  return {
    key: entity.key,
    name: entity.name,
    type: curatedEntityType(entity),
    filePath: entity.filePath,
    startLine: entity.startLine,
    endLine: entity.endLine,
    description: deterministicEntityDescription(entity)
  };
}

function curatedEntityType(entity) {
  if (entity.kind === 'external') return 'external';
  const role = entity.metadata?.nest?.role;
  if (role === 'module') return 'component';
  if (role === 'controller') return 'api';
  if (role === 'route-handler') return 'api';
  if (role === 'provider' || /(service|repository|repo)$/i.test(entity.name)) {
    return 'service';
  }
  if (['class', 'interface', 'function', 'variable', 'file'].includes(entity.kind)) {
    return entity.kind;
  }
  return 'component';
}

function deterministicEntityDescription(entity) {
  const nest = entity.metadata?.nest;
  if (nest?.role === 'module') return `Defines the ${entity.name} NestJS composition boundary.`;
  if (nest?.role === 'controller') {
    return `Handles NestJS routes under ${nest.routePrefix || 'its configured prefix'}.`;
  }
  if (nest?.role === 'route-handler') {
    const routes = (nest.routes ?? [])
      .map((route) => `${route.method} ${route.path || '/'}`)
      .join(', ');
    return `Handles the ${routes || 'declared'} NestJS route.`;
  }
  if (nest?.role === 'provider') return `Provides ${entity.name} through NestJS dependency injection.`;
  if (entity.kind === 'external') return `External system or runtime integration represented by ${entity.name}.`;
  return `Defines the selected ${entity.kind} ${entity.name}.`;
}

function preserveSemanticCuration(candidate, existing) {
  if (!existing) return candidate;
  const existingByAlias = new Map(
    existing.entities.map((entity) => [canonicalizeEntityKey(entity.key), entity])
  );
  const entities = candidate.entities.map((entity) => {
    const prior = existingByAlias.get(canonicalizeEntityKey(entity.key));
    if (!prior) return entity;
    return {
      ...entity,
      ...(prior.description ? { description: prior.description } : {})
    };
  });
  const existingRelations = new Map(
    existing.relations.map((relation) => [curatedRelationAlias(relation), relation])
  );
  const relations = candidate.relations.map((relation) => {
    const prior = existingRelations.get(curatedRelationAlias(relation));
    if (!prior) return relation;
    return {
      ...relation,
      ...(prior.description ? { description: prior.description } : {})
    };
  });
  return {
    ...candidate,
    name: existing.name,
    order: existing.order,
    ...(existing.description ? { description: existing.description } : {}),
    entities,
    relations: relations.sort(compareCuratedRelations)
  };
}

function curatedRelationAlias(relation) {
  return [
    canonicalizeEntityKey(relation.source),
    canonicalizeEntityKey(relation.target),
    relation.verb
  ].join('\u0000');
}

function normalizeExistingDocument(value, generatedAt) {
  if (value === undefined || value === null) {
    return { version: 1, generatedAt: generatedAt ?? new Date().toISOString(), scope: '.', groups: [] };
  }
  const document = JSON.parse(JSON.stringify(value));
  if (document.version !== 1 || !Array.isArray(document.groups)) {
    throw new Error('Existing agent graph must use the version 1 grouped format');
  }
  return document;
}

function curatedVerb(verb) {
  return [
    'imports',
    'exports',
    'contains',
    'extends',
    'implements',
    'calls',
    'references'
  ].includes(verb)
    ? verb
    : 'depends_on';
}

function collapsedVerb(verb) {
  return verb === 'imports' ? 'imports' : verb === 'calls' ? 'calls' : 'depends_on';
}

function isPathInScope(filePath, scope) {
  return scope === '.' || filePath === scope || filePath.startsWith(`${scope}/`);
}

function normalizeScope(scope) {
  const normalized = String(scope)
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .replace(/\/$/, '');
  if (!normalized || normalized === '.') return '.';
  if (
    normalized.startsWith('/') ||
    /^[a-z]:\//i.test(normalized) ||
    normalized.split('/').some((part) => !part || part === '.' || part === '..')
  ) {
    throw new Error('scope must be a normalized workspace-relative path');
  }
  return normalized;
}

function lastScopeSegment(scope) {
  return scope.split('/').filter(Boolean).pop() ?? 'group';
}

function slugify(value) {
  const slug = String(value)
    .normalize('NFKD')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  if (!slug) throw new Error('A lowercase kebab-case --key is required for this scope');
  return slug;
}

function titleCase(value) {
  return String(value)
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function appendMapArray(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

function compareEntities(left, right) {
  return compareText(left.key, right.key);
}

function compareRawRelations(left, right) {
  return (
    compareText(left.source, right.source) ||
    compareText(left.target, right.target) ||
    compareText(left.verb, right.verb) ||
    compareText(left.location.filePath, right.location.filePath) ||
    left.location.startLine - right.location.startLine
  );
}

function compareCuratedRelations(left, right) {
  return (
    compareText(left.source, right.source) ||
    compareText(left.target, right.target) ||
    compareText(left.verb, right.verb)
  );
}

function compareText(left, right) {
  return String(left).localeCompare(String(right), 'en');
}
