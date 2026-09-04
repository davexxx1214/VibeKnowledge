import { describe, expect, it } from 'vitest';
import { toCli } from './run.mjs';

describe('paired benchmark argument mapping', () => {
  it('preserves budgets, group, depth and evidence rather than comparing different queries', () => {
    expect(toCli({ mcp: { tool: 'get_neighbors', arguments: { selector: 'src/foo bar.ts#中文', groupKey: 'some-feature', direction: 'outgoing', depth: 2, tokenBudget: 900, includeEvidence: true, relationVerbs: ['imports', 'calls'] } } })).toEqual([
      'neighbors', '--selector', 'src/foo bar.ts#中文', '--group', 'some-feature', '--direction', 'outgoing', '--depth', '2', '--budget', '900', '--evidence', '--verbs', 'imports,calls'
    ]);
  });
  it('omits false switches and maps raw depth correctly', () => {
    expect(toCli({ mcp: { tool: 'find_structural_path', arguments: { source: 'a', target: 'b', maxDepth: 4, includeEvidence: false } } })).toEqual(['structural-path', '--source', 'a', '--target', 'b', '--depth', '4']);
    expect(() => toCli({ mcp: { tool: 'ask_question', arguments: {} } })).toThrow('No CLI mapping');
  });
});
