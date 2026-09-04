import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import { extractStructuralGraph, updateStructuralGraph } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';
import { convergeStructuralGraph } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-condenser.mjs';
import { resolveStructuralEntity } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-analysis.mjs';

const fixture = resolve('src/services/structuralGraph/fixtures/frontend-project');
const directories: string[] = [];
const generatedAt = '2026-09-04T00:00:00.000Z';
function copyFixture() {
  const directory = mkdtempSync(join(tmpdir(), 'vibeknowledge-frontend-'));
  directories.push(directory);
  cpSync(fixture, directory, { recursive: true });
  return directory;
}
afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

describe('React/Vite structural boundaries', () => {
  it('preserves case-sensitive symbol identities and resolves exact keys before fuzzy aliases', () => {
    const graph = extractStructuralGraph({ workspaceRoot: fixture, generatedAt });
    for (const name of ['PartnerShip', 'Partnership', 'SelectCodeH', 'SelectCodeh']) {
      const key = `src/constants/Variants.ts#${name}`;
      expect(resolveStructuralEntity(graph, key)?.key).toBe(key);
    }
    expect(() => resolveStructuralEntity(graph, 'partnership')).toThrow('Ambiguous');
    expect(graph.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'src/constants/Variants.ts#useUpper', target: 'src/constants/Variants.ts#PartnerShip' }),
      expect.objectContaining({ source: 'src/constants/Variants.ts#useLower', target: 'src/constants/Variants.ts#Partnership' }),
    ]));
  });

  it('keeps runtime roots, root router/layout and generated API, but not dev artifacts or every page', () => {
    const graph = extractStructuralGraph({ workspaceRoot: fixture, generatedAt });
    const { group } = convergeStructuralGraph(graph, { kind: 'framework' });
    const keys = group.entities.map((entity) => entity.key);
    expect(keys).toEqual(expect.arrayContaining([
      'src/main.tsx', 'src/export-app.tsx', 'src/App.tsx#App',
      'src/router.tsx#router', 'src/Layout.tsx#Layout',
    ]));
    expect(group.entities.some((entity) => entity.filePath === 'src/api/generated/client.ts')).toBe(true);
    expect(keys.some((key) => /(?:archive|tests|mock|pages|constants)\//.test(key))).toBe(false);
    expect(keys.some((key) => key.includes('#enableMocking'))).toBe(false);
    expect(graph.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'src/router.tsx', target: 'src/pages/Help.tsx', verb: 'imports', metadata: expect.objectContaining({ dynamic: true }) }),
      expect.objectContaining({ source: 'src/main.tsx', target: 'src/mock/handlers.ts', verb: 'imports', metadata: expect.objectContaining({ dynamic: true }) }),
    ]));
    expect(group.relations).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'src/main.tsx', target: 'src/export-app.tsx' }),
      expect.objectContaining({ source: 'src/export-app.tsx', target: 'src/App.tsx#App' }),
      expect.objectContaining({ source: 'src/App.tsx#App', target: 'src/router.tsx#router' }),
      expect.objectContaining({ source: 'src/router.tsx#router', target: 'src/Layout.tsx#Layout' }),
    ]));
    const selected = new Set(keys);
    for (const relation of group.relations) {
      const path = relation.structuralPath ?? [];
      const walked = path.map((hop) => ({ from: hop.traversal === 'reverse' ? hop.target : hop.source, to: hop.traversal === 'reverse' ? hop.source : hop.target }));
      expect(walked[0].from).toBe(relation.source);
      expect(walked.at(-1)?.to).toBe(relation.target);
      for (let i = 1; i < walked.length; i++) {
        expect(walked[i].from).toBe(walked[i - 1].to);
      }
      for (const hop of walked.slice(0, -1)) {
        expect(selected.has(hop.to) && hop.to !== relation.source).toBe(false);
      }
    }
    const reversed = convergeStructuralGraph({ ...graph, entities: [...graph.entities].reverse(), relations: [...graph.relations].reverse() }, { kind: 'framework' });
    expect(reversed.group).toEqual(group);
    expect(group.relations.some((relation) => relation.source === 'src/App.tsx#App' && relation.target === 'src/Layout.tsx#Layout')).toBe(false);
  });

  it('keeps warm-cache facts identical, re-resolves dynamic dependants, and invalidates HTML entry changes', () => {
    const workspaceRoot = copyFixture();
    const options = { workspaceRoot, generatedAt };
    const first = updateStructuralGraph(options);
    const second = updateStructuralGraph(options);
    expect(second.graph).toEqual(first.graph);
    expect(second.statistics.resolvedFiles).toBe(0);
    writeFileSync(join(workspaceRoot, 'src/pages/Help.tsx'), readFileSync(join(workspaceRoot, 'src/pages/Help.tsx'), 'utf8') + '\nexport const revision = 1;\n');
    const changed = updateStructuralGraph(options);
    expect(changed.statistics.resolvedFiles).toBeGreaterThan(1);
    expect(changed.graph).toEqual(extractStructuralGraph(options));
    writeFileSync(join(workspaceRoot, 'index.html'), '<script type="module" src="/src/export-app.tsx"></script>');
    const htmlChanged = updateStructuralGraph(options);
    expect(htmlChanged.statistics.cacheMode).toBe('rebuild');
    expect(htmlChanged.graph.entities.find((entity) => entity.key === 'src/main.tsx')?.metadata?.runtimeEntry).toBeUndefined();
  });

  it('reports computed dynamic imports without inventing an endpoint', () => {
    const workspaceRoot = copyFixture();
    writeFileSync(join(workspaceRoot, 'src/computed.ts'), 'export function load(name: string) { return import(name); }');
    const graph = extractStructuralGraph({ workspaceRoot, generatedAt });
    expect(graph.diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'unresolved-dynamic-import', filePath: 'src/computed.ts' })]));
    expect(graph.relations.some((relation) => relation.location.filePath === 'src/computed.ts' && relation.verb === 'imports')).toBe(false);
  });

  it('does not rename legitimate symbols when declaration order changes', () => {
    const workspaceRoot = copyFixture();
    const options = { workspaceRoot, generatedAt };
    const before = updateStructuralGraph(options);
    const file = join(workspaceRoot, 'src/constants/Variants.ts');
    const lines = readFileSync(file, 'utf8').trim().split('\n');
    [lines[0], lines[1]] = [lines[1], lines[0]];
    writeFileSync(file, lines.join('\n') + '\n');
    const after = updateStructuralGraph(options);
    const keys = (graph: typeof before.graph) => graph.entities.filter((entity) => entity.filePath === 'src/constants/Variants.ts').map((entity) => entity.key).sort();
    expect(keys(after.graph)).toEqual(keys(before.graph));
    expect(after.graph).toEqual(extractStructuralGraph(options));
  });

  it('does not treat an uncalled render helper or a type-only import as a runtime boundary', () => {
    const workspaceRoot = copyFixture();
    writeFileSync(join(workspaceRoot, 'src/render-helper.tsx'), "import { createRoot } from 'react-dom/client';\nimport { App } from './App';\nexport function preview() { createRoot(document.body).render(<App />); }\n");
    writeFileSync(join(workspaceRoot, 'src/contracts.ts'), 'export interface Contract { id: string }\n');
    const entry = join(workspaceRoot, 'src/main.tsx');
    writeFileSync(entry, readFileSync(entry, 'utf8') + "\nimport { type Contract } from './contracts';\n");
    const graph = extractStructuralGraph({ workspaceRoot, generatedAt });
    expect(graph.entities.find((entity) => entity.key === 'src/render-helper.tsx')?.metadata?.runtimeEntry).toBeUndefined();
    const { group } = convergeStructuralGraph(graph, { kind: 'framework' });
    expect(group.entities.some((entity) => /render-helper|contracts/.test(entity.key))).toBe(false);
  });

  it('uses internal imports as ownership evidence without inventing transitive boundary edges', () => {
    const workspaceRoot = copyFixture();
    writeFileSync(join(workspaceRoot, 'src/request/credentials.ts'), "export function credentials() { return 'token'; }\n");
    writeFileSync(join(workspaceRoot, 'src/request/index.ts'), "import { credentials } from './credentials';\nexport function request(path: string) { return fetch(path, { headers: { Authorization: credentials() } }); }\n");
    writeFileSync(join(workspaceRoot, 'src/api/generated/client.ts'), "import { credentials } from '../../request/credentials';\nexport function getHelp() { return credentials(); }\n");
    const graph = extractStructuralGraph({ workspaceRoot, generatedAt });
    const { group, warnings } = convergeStructuralGraph(graph, { kind: 'framework' });
    const relation = group.relations.find((edge) => edge.source === 'src/api/generated/client.ts#getHelp' && edge.target === 'src/request/index.ts#request');
    expect(relation).toBeDefined();
    expect(relation?.structuralPath).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: 'src/request/index.ts', target: 'src/request/credentials.ts', verb: 'imports', traversal: 'reverse' }),
    ]));
    expect(warnings.some((warning) => warning.includes('without a continuous direct boundary path'))).toBe(false);
  });
});
