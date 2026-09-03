import { afterEach, describe, expect, it } from 'vitest';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { spawnSync } from 'child_process';

const validatorPath = resolve(
  process.cwd(),
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'validate-graph.mjs'
);
const rendererPath = resolve(
  process.cwd(),
  'resources',
  'skills',
  'vibeknowledge-dependency-graph',
  'scripts',
  'render-graph-md.mjs'
);
const tempDirs: string[] = [];

function createFixture() {
  const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-skill-validator-'));
  tempDirs.push(workspace);
  mkdirSync(join(workspace, 'src'), { recursive: true });
  mkdirSync(join(workspace, '.vscode', '.knowledge'), { recursive: true });
  writeFileSync(join(workspace, 'src', 'a.ts'), 'one\ntwo\nthree\n', 'utf8');
  writeFileSync(join(workspace, 'src', 'b.ts'), 'export const b = 1;\n', 'utf8');
  return {
    workspace,
    graphPath: join(workspace, '.vscode', '.knowledge', 'agent-graph.json'),
  };
}

function graphWithEvidence(evidence: Array<Record<string, unknown>>) {
  return {
    version: 1,
    generatedAt: '2026-08-21T12:00:00.000Z',
    scope: '.',
    groups: [
      {
        key: 'framework',
        name: 'Framework',
        kind: 'framework',
        order: 0,
        entities: [
          {
            key: 'src/a.ts#A',
            name: 'A',
            type: 'function',
            filePath: 'src/a.ts',
            startLine: 1,
            endLine: 3,
          },
          {
            key: 'src/b.ts#B',
            name: 'B',
            type: 'variable',
            filePath: 'src/b.ts',
            startLine: 1,
            endLine: 1,
          },
        ],
        relations: [
          {
            source: 'src/a.ts#A',
            target: 'src/b.ts#B',
            verb: 'calls',
            origin: 'agent',
            confidence: 'review_required',
            evidence,
          },
        ],
      },
    ],
  };
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('dependency graph skill validator', () => {
  it('accepts evidence that points inside an existing workspace file', () => {
    const fixture = createFixture();
    writeFileSync(
      fixture.graphPath,
      `\uFEFF${JSON.stringify(
        graphWithEvidence([{ filePath: 'src/a.ts', startLine: 2, endLine: 3 }])
      )}`,
      'utf8'
    );

    const result = spawnSync(process.execPath, [validatorPath, fixture.graphPath], {
      cwd: fixture.workspace,
      encoding: 'utf8',
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain(
      'Valid grouped Knowledge Graph: 1 groups, 2 entity occurrences, 1 relations'
    );
  });

  it('rejects missing evidence files and out-of-range lines', () => {
    const fixture = createFixture();
    writeFileSync(
      fixture.graphPath,
      JSON.stringify(
        graphWithEvidence([
          { filePath: 'src/missing.ts', startLine: 1 },
          { filePath: 'src/a.ts', startLine: 99 },
        ])
      ),
      'utf8'
    );

    const result = spawnSync(process.execPath, [validatorPath, fixture.graphPath], {
      cwd: fixture.workspace,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('does not exist in the workspace');
    expect(result.stderr).toContain('but the file has 4 lines');
  });

  it('rejects canonical key collisions and invalid relation provenance', () => {
    const fixture = createFixture();
    const graph = graphWithEvidence([
      { filePath: 'src/a.ts', startLine: 2 },
    ]);
    graph.groups[0].entities[1].key = ' SRC\\A.ts ## a() ';
    Object.assign(graph.groups[0].relations[0], {
      origin: 'parser',
      confidence: 'certain',
    });
    writeFileSync(fixture.graphPath, JSON.stringify(graph), 'utf8');

    const result = spawnSync(process.execPath, [validatorPath, fixture.graphPath], {
      cwd: fixture.workspace,
      encoding: 'utf8',
    });

    expect(result.status).toBe(1);
    expect(result.stderr).toContain('after canonicalization');
    expect(result.stderr).toContain('.origin must be ast, resolver, or agent');
    expect(result.stderr).toContain(
      '.confidence must be extracted, inferred, or review_required'
    );
  });

  it('accepts only structural paths that trace exact raw relations', () => {
    const fixture = createFixture();
    const graph = graphWithEvidence([
      { filePath: 'src/a.ts', startLine: 2 },
    ]);
    Object.assign(graph.groups[0].relations[0], {
      structuralPath: [
        {
          source: 'src/a.ts#A',
          target: 'src/b.ts#B',
          verb: 'calls',
          filePath: 'src/a.ts',
          startLine: 2,
          endLine: 2,
          traversal: 'forward',
        },
      ],
    });
    writeFileSync(fixture.graphPath, JSON.stringify(graph), 'utf8');
    writeFileSync(
      join(
        fixture.workspace,
        '.vscode',
        '.knowledge',
        'structural-graph.json'
      ),
      JSON.stringify({
        relations: [
          {
            source: 'src/a.ts#A',
            target: 'src/b.ts#B',
            verb: 'calls',
            location: {
              filePath: 'src/a.ts',
              startLine: 2,
              endLine: 2,
            },
          },
        ],
      }),
      'utf8'
    );

    const valid = spawnSync(process.execPath, [validatorPath, fixture.graphPath], {
      cwd: fixture.workspace,
      encoding: 'utf8',
    });
    expect(valid.status, valid.stderr).toBe(0);

    (
      graph.groups[0].relations[0] as (typeof graph.groups)[number]['relations'][number] & {
        structuralPath: Array<{ startLine: number }>;
      }
    ).structuralPath[0].startLine = 3;
    writeFileSync(fixture.graphPath, JSON.stringify(graph), 'utf8');
    const invalid = spawnSync(
      process.execPath,
      [validatorPath, fixture.graphPath],
      { cwd: fixture.workspace, encoding: 'utf8' }
    );
    expect(invalid.status).toBe(1);
    expect(invalid.stderr).toContain(
      'does not match a relation in structural-graph.json'
    );
  });

  it('renders a complete audit report and compact per-group Agent views', () => {
    const fixture = createFixture();
    const graph = graphWithEvidence([
      { filePath: 'src/a.ts', startLine: 2 },
    ]);
    Object.assign(graph.groups[0].relations[0], {
      origin: 'agent',
      confidence: 'extracted',
      structuralPath: [
        {
          source: 'src/a.ts#A',
          target: 'src/b.ts#B',
          verb: 'calls',
          filePath: 'src/a.ts',
          startLine: 2,
          endLine: 2,
          traversal: 'forward',
        },
      ],
    });
    graph.groups.push({
      key: 'sample-feature',
      name: 'Sample Feature',
      kind: 'feature',
      order: 1,
      entities: graph.groups[0].entities.map((entity) => ({ ...entity })),
      relations: graph.groups[0].relations.map((relation) => ({
        ...relation,
        evidence: relation.evidence.map((item) => ({ ...item })),
      })),
    });
    writeFileSync(fixture.graphPath, JSON.stringify(graph), 'utf8');
    writeFileSync(
      join(
        fixture.workspace,
        '.vscode',
        '.knowledge',
        'structural-graph.json'
      ),
      JSON.stringify({
        relations: [
          {
            source: 'src/a.ts#A',
            target: 'src/b.ts#B',
            verb: 'calls',
            location: {
              filePath: 'src/a.ts',
              startLine: 2,
              endLine: 2,
            },
          },
        ],
      }),
      'utf8'
    );

    const validation = spawnSync(
      process.execPath,
      [validatorPath, fixture.graphPath],
      { cwd: fixture.workspace, encoding: 'utf8' }
    );
    const markdownPath = join(
      fixture.workspace,
      '.vscode',
      '.knowledge',
      'knowledge-graph.md'
    );
    const agentContextDirectory = join(
      fixture.workspace,
      '.vscode',
      '.knowledge',
      'agent-context'
    );
    mkdirSync(agentContextDirectory, { recursive: true });
    writeFileSync(
      join(agentContextDirectory, 'stale-group.md'),
      'stale',
      'utf8'
    );
    const rendering = spawnSync(
      process.execPath,
      [rendererPath, fixture.graphPath, markdownPath],
      { cwd: fixture.workspace, encoding: 'utf8' }
    );
    const rerendering = spawnSync(
      process.execPath,
      [rendererPath, fixture.graphPath, markdownPath],
      { cwd: fixture.workspace, encoding: 'utf8' }
    );

    expect(validation.status).toBe(0);
    expect(validation.stdout).toContain('2 groups, 4 entity occurrences');
    expect(rendering.status).toBe(0);
    expect(rerendering.status).toBe(0);
    const markdown = readFileSync(markdownPath, 'utf8');
    expect(markdown).toContain('# Knowledge Graph');
    expect(markdown).toContain('## 1. Framework');
    expect(markdown).toContain('## 2. Sample Feature');
    expect(markdown).toContain('Entity occurrences: 4 (2 unique keys)');
    expect(markdown).toContain(
      '| Source | Verb | Target | Origin | Confidence | Description | Evidence | Structural path |'
    );
    expect(markdown).toContain('| A | calls | B | agent | extracted |');
    expect(markdown).toContain(
      'src/a.ts#A --calls--> src/b.ts#B @ src/a.ts:2-2'
    );

    const index = readFileSync(join(agentContextDirectory, 'index.md'), 'utf8');
    const framework = readFileSync(
      join(agentContextDirectory, 'framework.md'),
      'utf8'
    );
    const feature = readFileSync(
      join(agentContextDirectory, 'sample-feature.md'),
      'utf8'
    );
    expect(index).toContain('should not be loaded by default');
    expect(index).toContain('use `query_graph` first');
    expect(index).toContain('`get_neighbors`');
    expect(index).toContain('Evidence through MCP only when auditing');
    expect(index).toContain('[framework](./framework.md)');
    expect(index).toContain('[sample-feature](./sample-feature.md)');
    expect(framework).toContain('| A | function | src/a.ts:1-3 |');
    expect(framework).toContain(
      '| A | calls | B | agent | extracted |'
    );
    expect(framework).not.toContain('Evidence');
    expect(framework).not.toContain('Structural path');
    expect(framework).not.toContain('Dependency is used here');
    expect(feature).toContain('| A | calls | B | agent | extracted |');
    expect(existsSync(join(agentContextDirectory, 'stale-group.md'))).toBe(
      false
    );
  });
});
