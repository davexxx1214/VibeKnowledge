import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync, existsSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { publishFeatureBrief, readFeatureBrief, listFeatureBriefs, type FeatureBriefDraft } from '../resources/skills/vibeknowledge-dependency-graph/scripts/feature-brief.mjs';
import { featureBrief, featureIndex } from '../packages/mcp-server/src/featureBriefQuery';
import { runQuery } from '../packages/mcp-server/src/queryCli';
import { estimateTokenCount } from '../packages/mcp-server/src/graphQuery';

describe('source-backed page / feature briefs', () => {
  let root: string, workspace: string, artifacts: string;
  const loc = { filePath: 'src/help.ts', startLine: 1, endLine: 2 };
  function draft(key = 'help-page'): FeatureBriefDraft {
    return { key, name: '帮助文档', summary: 'Browse help documentation.', keywords: ['help', 'docs', '帮助'],
      entries: [loc], limitations: ['Does not certify callers outside the cited source.'],
      facts: [
        { kind: 'capability', text: 'Displays local help content.', certainty: 'observed', evidence: [loc] },
        { kind: 'test', text: 'Tests select help content; tests were not executed.', certainty: 'observed', evidence: [{ filePath: 'tests/help.test.ts', startLine: 1, endLine: 1 }] }
      ] };
  }
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), 'feature-brief-'));
    workspace = join(root, 'project 中文'); artifacts = join(workspace, '.vscode/.knowledge/feature-briefs');
    mkdirSync(join(workspace, 'src'), { recursive: true }); mkdirSync(join(workspace, 'tests'));
    writeFileSync(join(workspace, loc.filePath), 'export const help = "docs";\nshow(help);\n');
    writeFileSync(join(workspace, 'tests/help.test.ts'), 'expect(help).toBe("docs");\n');
  });
  afterEach(() => rmSync(root, { recursive: true, force: true }));
  it('publishes evidence-backed cards, preserves peers and checks only cited sources', () => {
    publishFeatureBrief(workspace, draft()); publishFeatureBrief(workspace, draft('other-page'));
    writeFileSync(join(workspace, 'src/unrelated.ts'), 'new unknown caller');
    const result = readFeatureBrief(workspace, 'help-page');
    expect(result.checkedFiles).toBe(2); expect(result.stale).toEqual([]); expect(result.unavailable).toEqual([]);
    expect(listFeatureBriefs(workspace, 'HELP docs').map(f => f.key)).toEqual(['help-page', 'other-page']);
    expect(listFeatureBriefs(workspace, 'missing')).toEqual([]);
    const text = featureBrief(workspace, 'help-page', 1800);
    expect(text).toContain('CAPABILITY [observed]'); expect(text).toContain('src/help.ts:1-2');
    expect(text).toContain('New callers/unlisted files');
    expect(existsSync(join(artifacts, 'publish.lock'))).toBe(false);
  });
  it('withholds facts when cited source changes or disappears, including tests', () => {
    publishFeatureBrief(workspace, draft());
    writeFileSync(join(workspace, 'tests/help.test.ts'), 'changed test');
    expect(featureBrief(workspace, 'help-page', 600)).toContain('NOT CURRENT');
    expect(featureBrief(workspace, 'help-page', 600)).not.toContain('Displays local help content');
    rmSync(join(workspace, loc.filePath));
    const r = readFeatureBrief(workspace, 'help-page');
    expect(r.stale).toEqual(['tests/help.test.ts']); expect(r.unavailable).toEqual(['src/help.ts']);
    expect(listFeatureBriefs(workspace, 'help')).toHaveLength(1); // Discovery does not open sources.
  });
  it('invalid drafts preserve the previous card and index', () => {
    publishFeatureBrief(workspace, draft());
    const before = readFileSync(join(artifacts, 'index.json'));
    const bad = draft(); bad.facts[0].evidence[0] = { ...loc, endLine: 999 };
    expect(() => publishFeatureBrief(workspace, bad)).toThrow('out-of-range');
    expect(readFileSync(join(artifacts, 'index.json')).equals(before)).toBe(true);
    expect(readFeatureBrief(workspace, 'help-page').stale).toEqual([]);
  });
  it.each(['../outside.ts', 'C:/outside.ts', 'src\\help.ts', '/tmp/outside'])('rejects unsafe source %s', path => {
    const bad = draft(); bad.entries = [{ ...loc, filePath: path }];
    expect(() => publishFeatureBrief(workspace, bad)).toThrow('unsafe path');
    expect(existsSync(artifacts)).toBe(false);
  });
  it('rejects source and output directory symlinks outside workspace', () => {
    const outside = join(root, 'outside'); mkdirSync(outside); writeFileSync(join(outside, 'a.ts'), 'private');
    symlinkSync(outside, join(workspace, 'escape'), 'junction');
    const bad = draft(); bad.entries = [{ ...loc, filePath: 'escape/a.ts', endLine: 1 }];
    expect(() => publishFeatureBrief(workspace, bad)).toThrow('symlink leaves workspace');
    mkdirSync(join(workspace, '.vscode'));
    symlinkSync(outside, join(workspace, '.vscode/.knowledge'), 'junction');
    expect(() => publishFeatureBrief(workspace, draft())).toThrow('symlink leaves workspace');
    expect(existsSync(join(outside, 'feature-briefs'))).toBe(false);
  });
  it('detects partial publication / edits without inventing freshness', () => {
    publishFeatureBrief(workspace, draft());
    writeFileSync(join(artifacts, 'help-page.json'), '{}');
    expect(() => readFeatureBrief(workspace, 'help-page')).toThrow('card/index mismatch');
  });
  it('does not steal another publisher lock', () => {
    publishFeatureBrief(workspace, draft());
    writeFileSync(join(artifacts, 'publish.lock'), 'existing publisher');
    expect(() => publishFeatureBrief(workspace, draft('other'))).toThrow('publication locked');
    expect(readFileSync(join(artifacts, 'publish.lock'), 'utf8')).toBe('existing publisher');
    expect(listFeatureBriefs(workspace)).toHaveLength(1);
  });
  it('reserves the index filename', () => {
    expect(() => publishFeatureBrief(workspace, draft('index'))).toThrow('key');
    expect(existsSync(artifacts)).toBe(false);
  });
  it('rejects uncited sources even if card and index hashes agree', () => {
    publishFeatureBrief(workspace, draft());
    const path = join(artifacts, 'help-page.json'), card = JSON.parse(readFileSync(path, 'utf8'));
    card.sources.push({ filePath: 'src/extra.ts', contentHash: 'a'.repeat(64) });
    const text = JSON.stringify(card); writeFileSync(path, text);
    const indexPath = join(artifacts, 'index.json'), index = JSON.parse(readFileSync(indexPath, 'utf8'));
    index.features[0].contentHash = createHash('sha256').update(text).digest('hex');
    writeFileSync(indexPath, JSON.stringify(index));
    expect(() => readFeatureBrief(workspace, 'help-page')).toThrow('source hashes');
  });
  it('caps source reads and withholds facts if a source becomes too large', () => {
    publishFeatureBrief(workspace, draft());
    writeFileSync(join(workspace, loc.filePath), 'x'.repeat(2 * 1024 * 1024 + 1));
    expect(featureBrief(workspace, 'help-page', 600)).toContain('NOT CURRENT');
    expect(() => publishFeatureBrief(workspace, draft())).toThrow('read limit');
  });
  it('rejects lossy non-UTF-8 sources instead of certifying identical replacement text', () => {
    publishFeatureBrief(workspace, draft());
    writeFileSync(join(workspace, loc.filePath), Buffer.from('\ufeffexport const café = 1;', 'utf16le'));
    expect(featureBrief(workspace, 'help-page', 600)).toContain('NOT CURRENT');
    expect(() => publishFeatureBrief(workspace, draft())).toThrow();
  });
  it('honors estimated budgets for large multilingual headers, facts, indexes and stale lists', () => {
    const big = draft(); big.name = '帮'.repeat(120); big.summary = '帮'.repeat(500);
    big.limitations = ['帮'.repeat(400)]; big.facts[0].text = '帮'.repeat(600);
    for (let i = 0; i < 5; i++) publishFeatureBrief(workspace, { ...big, key: `feature-${i}` });
    for (const budget of [600, 900, 1800]) {
      const result = featureBrief(workspace, 'feature-0', budget);
      expect(estimateTokenCount(result)).toBeLessThanOrEqual(budget); expect(result).toContain('blocks omitted');
    }
    for (const budget of [200, 300, 600]) {
      const result = featureIndex(workspace, '', budget);
      expect(estimateTokenCount(result)).toBeLessThanOrEqual(budget); expect(result).not.toContain('Shown 0/');
    }
    writeFileSync(join(workspace, loc.filePath), 'changed');
    expect(estimateTokenCount(featureBrief(workspace, 'feature-0', 600))).toBeLessThanOrEqual(600);
  });
  it('handles absent cards without creating artifacts and uses no MCP/database/raw graph', async () => {
    expect(await runQuery('features', { workspace })).toContain('No matching');
    await expect(runQuery('brief', { workspace, feature: 'help-page' })).rejects.toThrow('no card');
    expect(existsSync(artifacts)).toBe(false);
    publishFeatureBrief(workspace, draft());
    writeFileSync(join(workspace, '.vscode/.knowledge/graph.sqlite'), 'invalid database deliberately ignored by briefs');
    expect(await runQuery('brief', { workspace, feature: 'help-page' })).toContain('CAPABILITY');
    expect(await runQuery('features', { workspace, query: 'help' })).toContain('help-page');
    await expect(runQuery('brief', { workspace, feature: '../escape' })).rejects.toThrow('invalid key');
    await expect(runQuery('brief', { workspace, feature: 'help-page', budget: 599 })).rejects.toThrow();
  });
  it('keeps distinct feature facets before repeated dependencies and signals unshown kinds', () => {
    const big = draft();
    big.facts = [
      ...Array.from({ length: 10 }, (_, i) => ({ kind: 'dependency' as const, text: `Dependency ${i}: ${'implementation detail '.repeat(12)}`, certainty: 'observed' as const, evidence: [loc] })),
      { kind: 'test', text: 'TEST_ANCHOR verifies help selection.', certainty: 'observed', evidence: [loc] },
      { kind: 'constraint', text: 'CONSTRAINT_ANCHOR failure leaves selection unchanged.', certainty: 'observed', evidence: [loc] },
      { kind: 'framework', text: 'FRAMEWORK_ANCHOR relevant UI runtime.', certainty: 'observed', evidence: [loc] },
      { kind: 'capability', text: 'CAPABILITY_ANCHOR browse help.', certainty: 'observed', evidence: [loc] },
    ];
    publishFeatureBrief(workspace, big);
    const result = featureBrief(workspace, big.key, 900);
    for (const kind of ['TEST', 'CONSTRAINT', 'FRAMEWORK', 'CAPABILITY']) expect(result).toContain(`${kind}_ANCHOR`);
    expect(result).toContain('blocks omitted'); expect(estimateTokenCount(result)).toBeLessThanOrEqual(900);
    big.facts.find(f => f.kind === 'test')!.text = '帮'.repeat(600);
    publishFeatureBrief(workspace, big);
    const limited = featureBrief(workspace, big.key, 600);
    expect(limited).toMatch(/Unshown fact kinds:.*test/);
    expect(estimateTokenCount(limited)).toBeLessThanOrEqual(600);
  });
  it('bounds draft reads and runs the portable publisher CLI', () => {
    const input = join(workspace, 'draft.json');
    const script = resolve('resources/skills/vibeknowledge-dependency-graph/scripts/publish-feature-brief.mjs');
    const run = () => spawnSync(process.execPath, [script, '--workspace', workspace, '--input', input], { encoding: 'utf8', timeout: 10000, windowsHide: true });
    writeFileSync(input, JSON.stringify(draft()));
    expect(run().status).toBe(0);
    writeFileSync(input, ' '.repeat(8 * 1024 * 1024 + 1));
    const result = run(); expect(result.status).toBe(1); expect(result.stderr).toContain('<= 8 MiB');
    expect(readFeatureBrief(workspace, 'help-page').stale).toEqual([]);
  });
});
