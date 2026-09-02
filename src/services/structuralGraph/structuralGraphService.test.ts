import { cpSync, mkdtempSync, readFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  extractStructuralGraph,
  serializeStructuralGraph,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';
import { validateStructuralGraphDocument } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-graph-schema.mjs';
import { StructuralGraphService } from './structuralGraphService';

const temporaryDirectories: string[] = [];
const fixtureRoot = resolve(
  process.cwd(),
  'src',
  'services',
  'structuralGraph',
  'fixtures',
  'nest-project'
);
const generatedAt = '2026-09-02T12:00:00.000Z';

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('TypeScript structural extractor', () => {
  it('extracts stable TypeScript, JavaScript, resolver, and NestJS facts', () => {
    const first = extractStructuralGraph({
      workspaceRoot: fixtureRoot,
      generatedAt,
    });
    const second = extractStructuralGraph({
      workspaceRoot: fixtureRoot,
      generatedAt,
    });

    expect(serializeStructuralGraph(first)).toBe(serializeStructuralGraph(second));
    expect(validateStructuralGraphDocument(first)).toEqual([]);
    expect(first.version).toBe(1);
    expect(first.files.map((file) => file.language)).toEqual(
      expect.arrayContaining(['typescript', 'javascript', 'javascriptreact'])
    );
    expect(first.entities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: 'src/user.service.ts#UserService',
          metadata: expect.objectContaining({
            nest: { framework: 'nestjs', role: 'provider' },
          }),
        }),
        expect.objectContaining({
          key: 'src/user.controller.ts#UserController.getUser',
          metadata: expect.objectContaining({
            nest: expect.objectContaining({ role: 'route-handler' }),
          }),
        }),
        expect.objectContaining({ key: 'src/legacy.js#normalize' }),
        expect.objectContaining({ key: 'src/view.jsx#View' }),
        expect.objectContaining({ key: 'external:@nestjs/common' }),
      ])
    );

    expect(first.relations).toEqual(
      expect.arrayContaining([
        relation('src/user.service.ts', 'src/contracts.ts', 'imports', 'resolver'),
        relation(
          'src/user.service.ts#UserService',
          'src/contracts.ts#BaseService',
          'extends',
          'resolver'
        ),
        relation(
          'src/user.service.ts#UserService',
          'src/contracts.ts#UserPort',
          'implements',
          'resolver'
        ),
        relation(
          'src/user.module.ts#UserModule',
          'src/user.controller.ts#UserController',
          'contains',
          'resolver'
        ),
        relation(
          'src/user.controller.ts#UserController.getUser',
          'src/user.service.ts#UserService.find',
          'calls',
          'resolver'
        ),
        relation(
          'src/cycle-a.ts#cycleA',
          'src/cycle-b.ts#cycleB',
          'calls',
          'resolver'
        ),
        expect.objectContaining({
          source: 'src/index.ts',
          target: 'src/user.module.ts',
          verb: 'exports',
          origin: 'resolver',
          confidence: 'inferred',
        }),
      ])
    );
    expect(
      first.entities.some((entity) => entity.key === 'src/broken.ts#Broken')
    ).toBe(false);
    expect(first.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: 'src/broken.ts',
          code: expect.stringContaining('syntax-error'),
          category: 'error',
        }),
      ])
    );
  });

  it('does not guess an ambiguous wildcard re-export target', () => {
    const graph = extractStructuralGraph({
      workspaceRoot: fixtureRoot,
      generatedAt,
    });
    const consumerKey = 'src/consumer.ts#makeDuplicate';

    expect(
      graph.relations.some(
        (item) =>
          item.source === consumerKey &&
          (item.target === 'src/duplicate-a.ts#Duplicate' ||
            item.target === 'src/duplicate-b.ts#Duplicate')
      )
    ).toBe(false);
    expect(graph.diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          filePath: 'src/consumer.ts',
          code: 'ambiguous-import-target',
          category: 'warning',
        }),
      ])
    );
  });
});

describe('StructuralGraphService', () => {
  it('validates before atomically writing structural-graph.json', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-structural-'));
    temporaryDirectories.push(workspace);
    cpSync(fixtureRoot, workspace, { recursive: true });
    const service = new StructuralGraphService(workspace);

    const graph = service.generate({ generatedAt });
    const written = JSON.parse(readFileSync(service.getOutputPath(), 'utf8'));

    expect(written).toEqual(graph);
    expect(written.version).toBe(1);
  });
});

function relation(
  source: string,
  target: string,
  verb: string,
  origin: string
) {
  return expect.objectContaining({
    source,
    target,
    verb,
    origin,
    confidence: 'extracted',
    location: expect.objectContaining({
      filePath: expect.stringMatching(/^src\//),
      startLine: expect.any(Number),
      endLine: expect.any(Number),
    }),
  });
}
