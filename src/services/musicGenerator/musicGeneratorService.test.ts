import { describe, expect, it } from 'vitest';
import { MusicGeneratorService } from './musicGeneratorService';

describe('MusicGeneratorService', () => {
  it('generates a valid empty composition', () => {
    const result = new MusicGeneratorService().generateMusic([], []);

    expect(result.stats).toMatchObject({
      totalEntities: 0,
      totalRelations: 0,
      mode: 'agent',
    });
    expect(result.layers).toEqual([]);
    expect(result.code).toContain('setcps(');
    expect(result.code).toContain('stack(');
  });

  it('creates one layer for entities of the same type', () => {
    const result = new MusicGeneratorService({ bpm: 72 }).generateMusic([
      {
        id: 'class-1',
        name: 'KnowledgeStore',
        type: 'class',
        filePath: 'src/store.ts',
        startLine: 1,
        endLine: 20,
        observationCount: 2,
      },
      {
        id: 'class-2',
        name: 'GraphStore',
        type: 'class',
        filePath: 'src/graph.ts',
        startLine: 1,
        endLine: 20,
      },
    ], []);

    expect(result.bpm).toBe(72);
    expect(result.stats.entitiesByType).toEqual({ class: 2 });
    expect(result.layers).toHaveLength(1);
    expect(result.layers[0]).toMatchObject({ entityType: 'class', entityCount: 2 });
  });

  it('can omit relation chords while preserving relation statistics', () => {
    const result = new MusicGeneratorService({ includeRelations: false }).generateMusic([], [
      {
        id: 'relation-1',
        sourceId: 'a',
        targetId: 'b',
        verb: 'uses',
      },
    ], 'manual');

    expect(result.stats).toMatchObject({
      totalRelations: 1,
      relationsByVerb: { uses: 1 },
      mode: 'manual',
    });
    expect(result.code).not.toContain('Relations Chord Progression');
  });
});
