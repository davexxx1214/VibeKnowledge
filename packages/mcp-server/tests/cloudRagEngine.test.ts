import { beforeEach, describe, expect, it, vi } from 'vitest';
import type Database from 'better-sqlite3';

const generate = vi.hoisted(() => vi.fn());
vi.mock('@google/genai', () => ({ GoogleGenAI: class { models = { generateContent: generate }; } }));
import { CloudRagEngine } from '../src/rag/cloudRagEngine.js';

describe('typed cloud RAG response handling', () => {
  beforeEach(() => vi.clearAllMocks());
  function engine() {
    const database = {
      prepare: () => ({ get: () => ({ store_name: 'fileSearchStores/test' }), all: () => [] }),
    } as unknown as Database.Database;
    const instance = new CloudRagEngine(database, '/project', { apiKey: 'test-only', model: 'test' }, { info: vi.fn(), debug: vi.fn(), error: vi.fn() });
    instance.initialize();
    return instance;
  }
  it('reads the SDK text field and grounding support scores', async () => {
    generate.mockResolvedValue({ text: 'answer', candidates: [{ groundingMetadata: {
      groundingChunks: [{ retrievedContext: { title: 'Help', text: 'Help content' } }],
      groundingSupports: [{ groundingChunkIndices: [0], confidenceScores: [0.87] }],
    } }] });
    const result = await engine().ask('question');
    expect(result.answer).toContain('answer');
    expect(result.sources).toEqual([{ filePath: 'Help', relativePath: 'Help', snippet: 'Help content', relevance: 0.87 }]);
  });
  it('validates legacy optional content instead of casting the response to any', async () => {
    generate.mockResolvedValue({ text: 'answer', candidates: [{ groundingMetadata: {
      groundingChunks: [{ score: 0.91, retrievedContext: { title: 'Help', content: { parts: [{ text: 'legacy content' }] } } }],
    } }] });
    expect((await engine().ask('question')).sources[0]).toMatchObject({ snippet: 'legacy content', relevance: 0.91 });
  });
});
