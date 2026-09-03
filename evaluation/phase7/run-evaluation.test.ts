import { createHash } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  checkStructuralFreshness,
  checkCuratedFreshness,
  estimateTokens,
  recommendBudget,
  scoreEvidence,
  tokenize,
} from './run-evaluation.mjs';

const temporaryDirectories: string[] = [];

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('Phase 7 evaluation helpers', () => {
  it('tokenizes camel case and simple plurals for source retrieval', () => {
    expect(tokenize('ArticleControllers update users')).toEqual(
      expect.arrayContaining(['article', 'controllers', 'controller', 'users', 'user'])
    );
    expect(estimateTokens('hello world')).toBeGreaterThan(0);
  });

  it('scores expected file precision, recall, and evidence terms', () => {
    const score = scoreEvidence(
      {
        id: 'test',
        expectedFiles: ['src/a.ts', 'src/b.ts'],
        expectedTerms: ['Alpha', 'Beta'],
      },
      ['src/a.ts', 'src/noise.ts'],
      'class Alpha {}'
    );

    expect(score.fileRecall).toBe(0.5);
    expect(score.filePrecision).toBe(0.5);
    expect(score.termRecall).toBe(0.5);
    expect(score.correctness).toBe(0.5);
  });

  it('detects a stale structural source through its content hash', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-eval-'));
    temporaryDirectories.push(workspace);
    const filePath = join(workspace, 'source.ts');
    const content = 'export const value = 1;\n';
    writeFileSync(filePath, content, 'utf8');
    const graph = {
      files: [{
        filePath: 'source.ts',
        contentHash: createHash('sha256').update(content).digest('hex'),
      }],
    };

    expect(checkStructuralFreshness(graph, workspace).fresh).toBe(true);
    expect(checkStructuralFreshness(
      graph,
      workspace,
      new Map([['source.ts', 'export const value = 2;\n']])
    )).toMatchObject({ fresh: false, changedFiles: ['source.ts'] });
  });

  it('distinguishes curated source freshness from graph generation order', () => {
    const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-eval-'));
    temporaryDirectories.push(workspace);
    mkdirSync(join(workspace, 'src'));
    writeFileSync(join(workspace, 'src', 'feature.ts'), 'export class Feature {}\n', 'utf8');
    const graph = {
      generatedAt: new Date(Date.now() + 60_000).toISOString(),
      groups: [{ entities: [
        { filePath: 'src/feature.ts' },
        { filePath: 'external/database' },
      ] }],
    };

    expect(checkCuratedFreshness(graph, workspace)).toMatchObject({
      fresh: true,
      referencedFileCount: 1,
    });
    expect(checkCuratedFreshness(
      { ...graph, generatedAt: '2000-01-01T00:00:00.000Z' },
      workspace
    )).toMatchObject({ fresh: false, changedFiles: ['src/feature.ts'] });
  });

  it('rejects a universally truncated low budget in favor of the safer knee', () => {
    expect(recommendBudget([
      {
        budget: 400,
        taskCount: 5,
        averageCorrectness: 0.89,
        averageOmissionRate: 0.116,
        truncatedTasks: 5,
      },
      {
        budget: 600,
        taskCount: 5,
        averageCorrectness: 0.88,
        averageOmissionRate: 0.086,
        truncatedTasks: 3,
      },
      {
        budget: 1000,
        taskCount: 5,
        averageCorrectness: 0.86,
        averageOmissionRate: 0.1,
        truncatedTasks: 3,
      },
    ])).toBe(600);
  });
});
