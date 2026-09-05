import { afterEach, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ExportService } from '../src/services/exportService';
import { buildKnowledgeCodeLensModels } from '../src/providers/knowledgeCodeLensModel';
import type { Entity, Observation, Relation } from '../src/utils/types';
import type { KnowledgeEntity } from '../src/services/knowledgeGraphService';
import type { EntityService } from '../src/services/entityService';
import type { RelationService } from '../src/services/relationService';
import type { ObservationService } from '../src/services/observationService';
import type { KnowledgeGraphService } from '../src/services/knowledgeGraphService';

// Evaluator-only: copy as tests/method-context-acceptance.test.ts in an isolated
// grading checkout AFTER candidate execution. No service/network is needed.
vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: () => ({
      get: (_key: string, fallback: unknown) => fallback,
    }),
    onDidChangeConfiguration: () => ({ dispose() {} }),
  },
  window: { showInformationMessage: vi.fn() },
}));

const temporaryDirectories: string[] = [];
afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
  vi.restoreAllMocks();
});

function entity(id: string): Entity {
  return {
    id,
    name: `Entity ${id}`,
    type: 'function',
    filePath: `src/${id}.ts`,
    startLine: 1,
    endLine: 4,
    createdAt: 100,
    updatedAt: 200,
    description: `Description ${id}`,
    metadata: { retained: id },
  };
}

function observation(entityId: string, index: number): Observation {
  return {
    id: `observation-${entityId}-${index}`,
    entityId,
    content: `Note ${index} about ${entityId}`,
    createdAt: 100,
    updatedAt: 200,
  };
}

function relation(id: string, sourceEntityId: string, targetEntityId: string): Relation {
  return { id, sourceEntityId, targetEntityId, verb: 'calls', createdAt: 100 };
}

function graphFixture() {
  const entities = [entity('b'), entity('a'), entity('c')];
  const relations = [
    relation('ba', 'b', 'a'),
    relation('ab', 'a', 'b'),
    relation('bc', 'b', 'c'),
    relation('cb', 'c', 'b'),
    relation('bb', 'b', 'b'),
  ];
  const observations: Record<string, Observation[]> = {
    b: [observation('b', 1), observation('b', 2)],
    a: [],
    c: [observation('c', 1)],
  };
  return { entities, relations, observations };
}

function exportService(useAggregate: boolean) {
  const fixture = graphFixture();
  const manual = {
    listEntities: vi.fn(() => fixture.entities),
    getAllRelations: vi.fn(() => fixture.relations),
    getObservations: vi.fn((id: string) => fixture.observations[id] || []),
  };
  const aggregate = {
    listEntities: vi.fn(() => fixture.entities),
    listRelations: vi.fn(() => fixture.relations),
    getObservations: vi.fn((id: string) => fixture.observations[id] || []),
  };
  if (useAggregate) {
    manual.listEntities.mockImplementation(() => { throw new Error('Wrong entity source'); });
    manual.getAllRelations.mockImplementation(() => { throw new Error('Wrong relation source'); });
    manual.getObservations.mockImplementation(() => { throw new Error('Wrong observation source'); });
  }
  const service = new ExportService(
    manual as unknown as EntityService,
    manual as unknown as RelationService,
    manual as unknown as ObservationService,
    useAggregate ? aggregate as unknown as KnowledgeGraphService : undefined
  );
  return { service, fixture, manual, aggregate };
}

interface ExportDocument {
  exportTime: string;
  version: string;
  statistics: { entityCount: number; relationCount: number; observationCount: number };
  entities: Entity[];
  relations: Relation[];
  observations: Record<string, Observation[]>;
}

async function writeExport(service: ExportService, options?: { entityIds?: readonly string[] }) {
  const directory = mkdtempSync(join(tmpdir(), 'vibeknowledge-method-acceptance-'));
  temporaryDirectories.push(directory);
  const outputPath = join(directory, 'selected.json');
  // The cast lets the frozen baseline execute and fail behaviorally before the
  // candidate adds the requested optional parameter to the public signature.
  const invoke = service.exportToJSON.bind(service) as (
    path: string, options?: { entityIds?: readonly string[] }
  ) => Promise<void>;
  await invoke(outputPath, options);
  return JSON.parse(readFileSync(outputPath, 'utf8')) as ExportDocument;
}

describe('export_subset', () => {
  it('EX1 EX2: selects existing entities and the induced relation set without changing graph order', async () => {
    const { service, fixture } = exportService(false);
    const before = JSON.stringify(fixture);
    const output = await writeExport(service, { entityIds: Object.freeze(['a', 'unknown', 'b', 'a']) });
    expect(output.entities).toEqual([fixture.entities[0], fixture.entities[1]]);
    expect(output.relations).toEqual([
      fixture.relations[0], fixture.relations[1], fixture.relations[4],
    ]);
    expect(output.observations).toEqual({ b: fixture.observations.b, a: [] });
    expect(output.statistics).toEqual({ entityCount: 2, relationCount: 3, observationCount: 2 });
    expect(JSON.stringify(fixture)).toBe(before);
  });

  it('EX1 EX2: empty and unknown-only selections produce an empty export', async () => {
    for (const entityIds of [[], ['not-in-graph']]) {
      const { service } = exportService(false);
      const output = await writeExport(service, { entityIds });
      expect(output.entities).toEqual([]);
      expect(output.relations).toEqual([]);
      expect(output.observations).toEqual({});
      expect(output.statistics).toEqual({ entityCount: 0, relationCount: 0, observationCount: 0 });
    }
  });

  it('EX3: keeps the aggregate graph as the source when that service is present', async () => {
    const { service, fixture, manual, aggregate } = exportService(true);
    const output = await writeExport(service, { entityIds: ['b'] });
    expect(output.entities).toEqual([fixture.entities[0]]);
    expect(output.relations).toEqual([fixture.relations[4]]);
    expect(output.observations).toEqual({ b: fixture.observations.b });
    expect(output.statistics).toEqual({ entityCount: 1, relationCount: 1, observationCount: 2 });
    expect(manual.listEntities).not.toHaveBeenCalled();
    expect(manual.getAllRelations).not.toHaveBeenCalled();
    expect(manual.getObservations).not.toHaveBeenCalled();
    expect(aggregate.getObservations).toHaveBeenCalledWith('b');
  });

  it('EX4: preserves the existing full-export envelope when no IDs are provided', async () => {
    for (const options of [undefined, {}, { entityIds: undefined }]) {
      const { service, fixture } = exportService(false);
      const output = await writeExport(service, options);
      expect(output.entities).toEqual(fixture.entities);
      expect(output.relations).toEqual(fixture.relations);
      expect(output.observations).toEqual(fixture.observations);
      expect(output.statistics).toEqual({ entityCount: 3, relationCount: 5, observationCount: 3 });
      expect(output.version).toBe('1.0');
      expect(Number.isNaN(Date.parse(output.exportTime))).toBe(false);
      expect(Object.keys(output).sort()).toEqual([
        'entities', 'exportTime', 'observations', 'relations', 'statistics', 'version',
      ]);
    }
  });
});

function lensDescription(description: string | undefined) {
  const source: KnowledgeEntity = { ...entity('description'), name: 'FallbackName', description, origin: 'agent' };
  return buildKnowledgeCodeLensModels([source], [], 4, () => 2)[0];
}

describe('codelens_unicode', () => {
  it('CU1: does not truncate descriptions that fit in 96 Unicode code points', () => {
    for (const description of ['a'.repeat(96), '😀'.repeat(96), 'x'.repeat(94) + '😀🧭']) {
      expect(lensDescription(description).title).toBe(`🧠 KG: ${description} · 📝 2 · 🔗 0`);
    }
  });

  it('CU2: keeps 95 whole code points before an ellipsis for over-limit descriptions', () => {
    for (const description of ['a'.repeat(97), '😀'.repeat(97), 'x'.repeat(94) + '😀tail']) {
      const expected = Array.from(description).slice(0, 95).join('') + '…';
      expect(lensDescription(description).title).toBe(`🧠 KG: ${expected} · 📝 2 · 🔗 0`);
    }
  });

  it('CU3: preserves whitespace compaction, fallback, and surrounding model fields', () => {
    expect(lensDescription('  hello\n\t😀   world  ')).toEqual({
      entityId: 'description', line: 0, title: '🧠 KG: hello 😀 world · 📝 2 · 🔗 0',
    });
    for (const description of [undefined, '', '  \n\t ']) {
      expect(lensDescription(description).title).toBe('🧠 KG: FallbackName · 📝 2 · 🔗 0');
    }
    const outside: KnowledgeEntity = { ...entity('outside'), startLine: 5, origin: 'agent' };
    expect(buildKnowledgeCodeLensModels([outside], [], 4, () => 2)).toEqual([]);
  });
});
