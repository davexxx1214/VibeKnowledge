import { describe, expect, it } from 'vitest';
import type { StructuralGraphDocument } from './structuralGraphService';
import {
  aggregateStructuralGraph,
  analyzeStructuralImpact,
  diffStructuralGraphs,
  findStructuralCycles,
  findStructuralPath,
  reportCrossBoundaryConnections,
  reportStructuralCoupling,
  suggestStructuralCommunities,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-analysis.mjs';

describe('structural graph analysis', () => {
  it('detects cycles and returns source-backed impact and paths', () => {
    const graph = fixtureGraph();
    const cycles = findStructuralCycles(graph);

    expect(cycles).toHaveLength(1);
    expect(cycles[0].entityKeys).toEqual(['src/a/a.ts#A', 'src/b/b.ts#B']);
    expect(cycles[0].relations).toHaveLength(2);

    const impact = analyzeStructuralImpact(graph, 'A', {
      direction: 'upstream',
      maxDepth: 2,
    });
    expect(impact.upstream.entities.map((entity) => entity.key)).toContain(
      'src/consumer/consumer.ts#Consumer'
    );
    expect(impact.upstream.relations[0].location.filePath).toMatch(/^src\//);

    const path = findStructuralPath(graph, 'Consumer', 'B', {
      direction: 'outgoing',
    });
    expect(path.found).toBe(true);
    expect(path.steps.map((step) => step.relation.verb)).toEqual([
      'calls',
      'calls',
    ]);
  });

  it('reports coupling and cross-boundary connections deterministically', () => {
    const graph = fixtureGraph();
    const coupling = reportStructuralCoupling(graph);
    const crossBoundary = reportCrossBoundaryConnections(graph);

    expect(coupling[0]).toMatchObject({ key: 'src/a/a.ts#A' });
    expect(crossBoundary).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourceBoundary: 'src/a',
          targetBoundary: 'src/b',
          count: 1,
        }),
      ])
    );
    expect(crossBoundary[0].relations[0].location).toBeDefined();
  });

  it('suggests communities and aggregates large graphs without replacing groups', () => {
    const graph = fixtureGraph();
    const communities = suggestStructuralCommunities(graph);
    const aggregate = aggregateStructuralGraph(graph, {
      level: 'boundary',
      limit: 3,
    });

    expect(communities.length).toBeGreaterThan(0);
    expect(communities[0]).toMatchObject({
      suggestedKey: expect.any(String),
      files: expect.any(Array),
    });
    expect(aggregate.nodes).toHaveLength(3);
    expect(aggregate.truncated).toBe(true);
    expect(aggregate.relations.every((relation) => relation.count > 0)).toBe(true);
  });

  it('diffs stable entities and relation changes against the previous snapshot', () => {
    const baseline = fixtureGraph();
    const current = structuredClone(baseline);
    current.generatedAt = '2026-09-03T01:00:00.000Z';
    current.entities.find((entity) => entity.key === 'src/a/a.ts#A')!.endLine = 12;
    current.entities.push(entity('src/new/new.ts#New', 'New', 'src/new/new.ts'));
    current.relations.pop();

    const diff = diffStructuralGraphs(current, baseline);
    expect(diff.available).toBe(true);
    expect(diff.addedEntities.map((item) => item.key)).toEqual([
      'src/new/new.ts#New',
    ]);
    expect(diff.changedEntities).toHaveLength(1);
    expect(diff.removedRelations).toHaveLength(1);
  });

  it('analyzes a deep graph without recursive traversal', () => {
    const graph = fixtureGraph();
    graph.entities = Array.from({ length: 6000 }, (_, index) =>
      entity(`src/deep/n${index}.ts#N${index}`, `N${index}`, `src/deep/n${index}.ts`)
    );
    graph.relations = Array.from({ length: 5999 }, (_, index) =>
      relation(
        `src/deep/n${index}.ts#N${index}`,
        `src/deep/n${index + 1}.ts#N${index + 1}`,
        'calls',
        `src/deep/n${index}.ts`,
        1
      )
    );

    expect(findStructuralCycles(graph)).toEqual([]);
  });

  it('uses containment as a navigation bridge between symbols and importing files', () => {
    const graph = fixtureGraph();
    graph.entities.push(
      entity('src/a/a.ts', 'src/a/a.ts', 'src/a/a.ts', 'file'),
      entity('src/module/module.ts', 'src/module/module.ts', 'src/module/module.ts', 'file')
    );
    graph.relations.push(
      relation('src/a/a.ts', 'src/a/a.ts#A', 'contains', 'src/a/a.ts', 1),
      relation('src/module/module.ts', 'src/a/a.ts', 'imports', 'src/module/module.ts', 1)
    );

    const impact = analyzeStructuralImpact(graph, 'src/a/a.ts#A', {
      direction: 'upstream',
      maxDepth: 2,
    });
    expect(impact.upstream.entities.map((entity) => entity.key)).toContain(
      'src/module/module.ts'
    );
  });
});

function fixtureGraph(): StructuralGraphDocument {
  const entities = [
    entity('src/a/a.ts#A', 'A', 'src/a/a.ts'),
    entity('src/b/b.ts#B', 'B', 'src/b/b.ts'),
    entity('src/consumer/consumer.ts#Consumer', 'Consumer', 'src/consumer/consumer.ts'),
    entity('src/shared/logger.ts#Logger', 'Logger', 'src/shared/logger.ts'),
    entity('external:database', 'Database', '@external', 'external'),
  ];
  return {
    version: 1,
    generatedAt: '2026-09-03T00:00:00.000Z',
    scope: '.',
    extractor: {
      name: 'typescript-compiler-api',
      version: 1,
      typescriptVersion: '5.9.2',
    },
    files: [],
    entities,
    relations: [
      relation('src/a/a.ts#A', 'src/b/b.ts#B', 'calls', 'src/a/a.ts', 4),
      relation('src/b/b.ts#B', 'src/a/a.ts#A', 'calls', 'src/b/b.ts', 5),
      relation(
        'src/consumer/consumer.ts#Consumer',
        'src/a/a.ts#A',
        'calls',
        'src/consumer/consumer.ts',
        8
      ),
      relation(
        'src/a/a.ts#A',
        'src/shared/logger.ts#Logger',
        'references',
        'src/a/a.ts',
        7
      ),
      relation(
        'src/a/a.ts#A',
        'external:database',
        'references',
        'src/a/a.ts',
        9
      ),
    ],
    diagnostics: [],
  };
}

function entity(
  key: string,
  name: string,
  filePath: string,
  kind: 'class' | 'external' | 'file' = 'class'
) {
  return { key, name, kind, filePath, startLine: 1, endLine: 10 };
}

function relation(
  source: string,
  target: string,
  verb: 'calls' | 'references' | 'contains' | 'imports',
  filePath: string,
  startLine: number
) {
  return {
    source,
    target,
    verb,
    origin: 'resolver' as const,
    confidence: 'extracted' as const,
    location: { filePath, startLine, endLine: startLine },
  };
}
