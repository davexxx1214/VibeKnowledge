import { describe, expect, it } from 'vitest';
import type {
  AgentGraphEntityRecord,
  AgentGraphRelationRecord
} from '../src/agentGraphStore.js';
import {
  AgentGraphQueryEngine,
  estimateTokenCount,
  formatGraphSlice,
  formatShortestPath
} from '../src/graphQuery.js';

describe('AgentGraphQueryEngine', () => {
  it('selects at most three seeds and traverses only the requested group', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);

    const result = engine.queryGraph({
      query: 'checkout user request',
      groupKey: 'checkout',
      depth: 2
    });

    expect(result.entities.filter((item) => item.isSeed).length).toBeLessThanOrEqual(3);
    expect(result.entities.length).toBeGreaterThan(0);
    expect(
      result.entities.every((item) => item.entity.groupKey === 'checkout')
    ).toBe(true);
    expect(result.relations.every((relation) => relation.groupKey === 'checkout')).toBe(
      true
    );
    expect(result.entities.map((item) => item.entity.name)).toContain('OrderService');
  });

  it('supports file and relation filters', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);

    const result = engine.queryGraph({
      query: 'service',
      groupKey: 'checkout',
      filePath: 'src/checkout',
      relationVerbs: ['calls'],
      depth: 2
    });

    expect(result.entities.filter((item) => item.isSeed)).not.toHaveLength(0);
    expect(result.relations.every((relation) => relation.verb === 'calls')).toBe(true);
  });

  it('matches Chinese natural-language questions against descriptions', () => {
    const userService = makeEntity(
      'user-management',
      1,
      'user-service',
      'UserService',
      'src/user/user.service.ts',
      '处理用户注册、登录、密码认证和 JWT 签发。'
    );
    const engine = new AgentGraphQueryEngine([userService], []);

    const result = engine.queryGraph({
      query: '用户登录和认证依赖哪些组件',
      groupKey: 'user-management'
    });

    expect(result.entities.map((item) => item.entity.name)).toEqual([
      'UserService'
    ]);
  });

  it('returns direction-aware neighbors', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);

    const outgoing = engine.getNeighbors({
      selector: 'OrderService',
      groupKey: 'checkout',
      direction: 'outgoing',
      depth: 1
    });
    const incoming = engine.getNeighbors({
      selector: 'OrderService',
      groupKey: 'checkout',
      direction: 'incoming',
      depth: 1
    });

    expect(outgoing.entities.map((item) => item.entity.name)).toEqual([
      'OrderService',
      'PaymentGateway'
    ]);
    expect(incoming.entities.map((item) => item.entity.name)).toEqual([
      'OrderService',
      'CheckoutController'
    ]);
  });

  it('resolves a stable key through its canonical alias', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);

    const result = engine.getEntities(' ORDER---SERVICE ', 'checkout');

    expect(result.entities.map((item) => item.entity.key)).toEqual([
      'order-service'
    ]);
  });

  it('finds a shortest path in either direction and preserves relation direction', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);

    const forward = engine.shortestPath({
      source: 'CheckoutController',
      target: 'PaymentGateway',
      groupKey: 'checkout',
      direction: 'outgoing'
    });
    const reverse = engine.shortestPath({
      source: 'PaymentGateway',
      target: 'CheckoutController',
      groupKey: 'checkout',
      direction: 'both'
    });

    expect(forward.entities.map((entity) => entity.name)).toEqual([
      'CheckoutController',
      'OrderService',
      'PaymentGateway'
    ]);
    expect(forward.steps.map((step) => step.traversal)).toEqual([
      'forward',
      'forward'
    ]);
    expect(reverse.steps.map((step) => step.traversal)).toEqual([
      'reverse',
      'reverse'
    ]);
    expect(formatShortestPath(reverse).text).toContain('<--calls--');
  });

  it('reports missing paths without leaking another group into the search', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);

    const result = engine.shortestPath({
      source: 'Application',
      target: 'PaymentGateway',
      maxDepth: 8
    });

    expect(result.entities).toEqual([]);
    expect(result.warnings).toContain('在 8 跳内没有找到连接路径。');
  });

  it('keeps ambiguous entity occurrences separated by group', () => {
    const graph = sampleGraph();
    const duplicate = makeEntity(
      'framework',
      0,
      'order-service',
      'OrderService',
      'src/checkout/module.ts'
    );
    const engine = new AgentGraphQueryEngine(
      [...graph.entities, duplicate],
      graph.relations
    );

    const result = engine.getEntities('OrderService');

    expect(result.entities.map((item) => item.entity.groupKey)).toEqual([
      'framework',
      'checkout'
    ]);
    expect(new Set(result.entities.map((item) => item.entity.id)).size).toBe(2);
  });

  it('terminates traversal when relations contain a cycle', () => {
    const graph = sampleGraph();
    const controller = graph.entities.find(
      (entity) => entity.name === 'CheckoutController'
    )!;
    const payment = graph.entities.find(
      (entity) => entity.name === 'PaymentGateway'
    )!;
    graph.relations.push(
      makeRelation(
        'checkout',
        1,
        'payment-controller',
        payment,
        controller,
        'calls'
      )
    );
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);

    const result = engine.getNeighbors({
      selector: 'CheckoutController',
      groupKey: 'checkout',
      depth: 5
    });

    expect(result.entities).toHaveLength(3);
    expect(result.relations).toHaveLength(3);
  });

  it('returns an explicit warning for an empty graph', () => {
    const engine = new AgentGraphQueryEngine([], []);

    const result = engine.queryGraph({ query: 'anything' });

    expect(result.entities).toEqual([]);
    expect(result.relations).toEqual([]);
    expect(result.warnings).toContain('没有找到可作为图遍历起点的实体。');
  });

  it('does not expand a high-degree hub reached after the seed', () => {
    const entities = [
      makeEntity('framework', 0, 'leaf-0', 'LeafZero', 'src/leaf-0.ts'),
      makeEntity('framework', 0, 'hub', 'SharedHub', 'src/hub.ts'),
      ...Array.from({ length: 12 }, (_, index) =>
        makeEntity(
          'framework',
          0,
          `leaf-${index + 1}`,
          `Leaf${index + 1}`,
          `src/leaf-${index + 1}.ts`
        )
      )
    ];
    const relations = entities
      .filter((entity) => entity.key !== 'hub')
      .map((entity, index) =>
        makeRelation(
          'framework',
          0,
          `hub-edge-${index}`,
          entities[1],
          entity,
          'uses'
        )
      );
    const engine = new AgentGraphQueryEngine(entities, relations);

    const result = engine.getNeighbors({
      selector: 'LeafZero',
      groupKey: 'framework',
      direction: 'both',
      depth: 2
    });

    expect(result.entities.map((item) => item.entity.name)).toEqual([
      'LeafZero',
      'SharedHub'
    ]);
    expect(result.suppressedHubIds).toEqual([entities[1].id]);
  });
});

describe('graph query formatting', () => {
  it('omits Evidence by default and includes it on demand', () => {
    const graph = sampleGraph();
    graph.relations.forEach((relation) => {
      relation.origin = 'resolver';
      relation.confidence = 'inferred';
      relation.structuralPath = [
        {
          source: relation.sourceKey,
          target: relation.targetKey,
          verb: 'calls',
          filePath: relation.sourceFilePath,
          startLine: 5,
          endLine: 7,
          traversal: 'forward'
        }
      ];
    });
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);
    const slice = engine.getNeighbors({
      selector: 'OrderService',
      groupKey: 'checkout',
      direction: 'both'
    });

    expect(formatGraphSlice(slice).text).not.toContain('Evidence:');
    expect(formatGraphSlice(slice).text).not.toContain('Structural path:');
    expect(formatGraphSlice(slice).text).toContain('[resolver/inferred]');
    expect(
      formatGraphSlice(slice, { includeEvidence: true }).text
    ).toContain('Evidence:');
    expect(
      formatGraphSlice(slice, { includeEvidence: true }).text
    ).toContain('Structural path:');
  });

  it('prioritizes graph relations ahead of non-seed entity detail', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);
    const slice = engine.queryGraph({
      query: 'checkout',
      groupKey: 'checkout',
      depth: 2
    });

    const formatted = formatGraphSlice(slice, { tokenBudget: 300 });

    expect(formatted.displayedRelationCount).toBeGreaterThan(0);
    expect(formatted.text).toContain('--calls-->');
  });

  it('enforces the token budget and emits stable output', () => {
    const graph = sampleGraph(1200);
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);
    const slice = engine.queryGraph({ query: 'checkout', depth: 2 });

    const first = formatGraphSlice(slice, { tokenBudget: 200 });
    const second = formatGraphSlice(slice, { tokenBudget: 200 });

    expect(first.text).toBe(second.text);
    expect(first.estimatedTokens).toBe(estimateTokenCount(first.text));
    expect(first.estimatedTokens).toBeLessThanOrEqual(200);
    expect(first.truncated).toBe(true);
    expect(first.text).toContain('状态: 已截断');
  });

  it('keeps an unusually long query header inside the minimum budget', () => {
    const graph = sampleGraph();
    const engine = new AgentGraphQueryEngine(graph.entities, graph.relations);
    const slice = engine.queryGraph({
      query: `用户${'影响分析'.repeat(120)}`,
      depth: 2
    });

    const formatted = formatGraphSlice(slice, { tokenBudget: 200 });

    expect(formatted.estimatedTokens).toBeLessThanOrEqual(200);
    expect(formatted.text).toContain('…');
  });
});

function sampleGraph(descriptionLength = 0): {
  entities: AgentGraphEntityRecord[];
  relations: AgentGraphRelationRecord[];
} {
  const longDescription = descriptionLength > 0 ? 'x'.repeat(descriptionLength) : '';
  const application = makeEntity(
    'framework',
    0,
    'app',
    'Application',
    'src/main.ts',
    'Application bootstrap'
  );
  const checkoutModule = makeEntity(
    'framework',
    0,
    'checkout-module',
    'CheckoutModule',
    'src/checkout/module.ts',
    'Checkout boundary'
  );
  const controller = makeEntity(
    'checkout',
    1,
    'checkout-controller',
    'CheckoutController',
    'src/checkout/controller.ts',
    `Accepts checkout requests ${longDescription}`
  );
  const orderService = makeEntity(
    'checkout',
    1,
    'order-service',
    'OrderService',
    'src/checkout/order-service.ts',
    `Coordinates checkout orders ${longDescription}`
  );
  const paymentGateway = makeEntity(
    'checkout',
    1,
    'payment-gateway',
    'PaymentGateway',
    'external/payment-gateway',
    `External checkout payment API ${longDescription}`
  );
  const entities = [
    application,
    checkoutModule,
    controller,
    orderService,
    paymentGateway
  ];
  const relations = [
    makeRelation(
      'framework',
      0,
      'application-checkout',
      application,
      checkoutModule,
      'imports'
    ),
    makeRelation(
      'checkout',
      1,
      'controller-order',
      controller,
      orderService,
      'calls'
    ),
    makeRelation(
      'checkout',
      1,
      'order-payment',
      orderService,
      paymentGateway,
      'calls'
    )
  ];
  return { entities, relations };
}

function makeEntity(
  groupKey: string,
  groupOrder: number,
  key: string,
  name: string,
  filePath: string,
  description: string | null = null
): AgentGraphEntityRecord {
  return {
    id: `${groupKey}:${key}`,
    key,
    groupKey,
    groupName: groupKey === 'framework' ? 'Framework' : 'Checkout',
    groupKind: groupKey === 'framework' ? 'framework' : 'feature',
    groupOrder,
    generatedAt: '2026-09-02T00:00:00.000Z',
    source: 'agent',
    name,
    type: name.endsWith('Service') ? 'service' : 'component',
    filePath,
    startLine: 1,
    endLine: 20,
    description,
    metadata: null,
    createdAt: 1,
    updatedAt: 1
  };
}

function makeRelation(
  groupKey: string,
  groupOrder: number,
  id: string,
  source: AgentGraphEntityRecord,
  target: AgentGraphEntityRecord,
  verb: string
): AgentGraphRelationRecord {
  return {
    id,
    verb,
    createdAt: 1,
    sourceEntityId: source.id,
    sourceKey: source.key,
    sourceName: source.name,
    sourceType: source.type,
    sourceFilePath: source.filePath,
    targetEntityId: target.id,
    targetKey: target.key,
    targetName: target.name,
    targetType: target.type,
    targetFilePath: target.filePath,
    groupKey,
    groupName: groupKey === 'framework' ? 'Framework' : 'Checkout',
    groupKind: groupKey === 'framework' ? 'framework' : 'feature',
    groupOrder,
    evidence: [
      {
        filePath: source.filePath,
        startLine: 5,
        endLine: 7,
        detail: `${source.name} references ${target.name}`
      }
    ],
    description: `${source.name} ${verb} ${target.name}`,
    generatedAt: '2026-09-02T00:00:00.000Z',
    source: 'agent'
  };
}
