import { describe, expect, it } from 'vitest';
import { validateStructuralGraphDocument } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-graph-schema.mjs';

describe('structural graph schema', () => {
  it('rejects dangling endpoints, missing provenance, and duplicate identities', () => {
    const errors = validateStructuralGraphDocument({
      version: 1,
      generatedAt: '2026-09-02T12:00:00.000Z',
      scope: '.',
      extractor: {
        name: 'typescript-compiler-api',
        version: 1,
        typescriptVersion: '5.9.3',
      },
      files: [
        {
          filePath: 'src/a.ts',
          language: 'typescript',
          contentHash: 'a'.repeat(64),
        },
      ],
      entities: [
        {
          key: 'src/a.ts#A',
          name: 'A',
          kind: 'class',
          filePath: 'src/a.ts',
          startLine: 1,
          endLine: 2,
        },
        {
          key: './src\\a.ts#A',
          name: 'A alias',
          kind: 'class',
          filePath: 'src/a.ts',
          startLine: 3,
          endLine: 4,
        },
      ],
      relations: [
        {
          source: 'src/a.ts#A',
          target: 'missing',
          verb: 'calls',
          location: { filePath: 'src/a.ts', startLine: 1, endLine: 1 },
        },
      ],
      diagnostics: [],
    });

    expect(errors).toEqual(
      expect.arrayContaining([
        expect.stringContaining('after path normalization'),
        expect.stringContaining('target does not reference an entity'),
        expect.stringContaining('origin must be ast or resolver'),
        expect.stringContaining('confidence is not supported'),
      ])
    );
  });
});
