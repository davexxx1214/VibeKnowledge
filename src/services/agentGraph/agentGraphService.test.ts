import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentGraphService, parseAgentGraphDocument } from './agentGraphService';

const tempDirs: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-agent-graph-'));
  tempDirs.push(workspace);
  mkdirSync(join(workspace, '.vscode', '.knowledge'), { recursive: true });
  return workspace;
}

function validDocument() {
  return {
    version: 1,
    generatedAt: '2026-08-21T12:00:00.000Z',
    scope: 'src',
    entities: [
      {
        key: 'src/a.ts#A',
        name: 'A',
        type: 'service',
        filePath: 'src/a.ts',
        startLine: 1,
        endLine: 20,
      },
      {
        key: 'src/b.ts#B',
        name: 'B',
        type: 'service',
        filePath: 'src/b.ts',
        startLine: 2,
        endLine: 10,
      },
    ],
    relations: [
      {
        source: 'src/a.ts#A',
        target: 'src/b.ts#B',
        verb: 'depends_on',
        description: 'A needs B',
        evidence: [
          {
            filePath: 'src/a.ts',
            startLine: 5,
            detail: 'B is injected here',
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

describe('parseAgentGraphDocument', () => {
  it('accepts a valid evidence-backed graph', () => {
    const graph = parseAgentGraphDocument(validDocument());
    expect(graph.entities).toHaveLength(2);
    expect(graph.relations).toHaveLength(1);
  });

  it.each([
    ['an unsupported verb', () => ({ ...validDocument(), relations: [{ ...validDocument().relations[0], verb: 'guesses' }] })],
    ['a dangling endpoint', () => ({ ...validDocument(), relations: [{ ...validDocument().relations[0], target: 'missing' }] })],
    ['a self relation', () => ({ ...validDocument(), relations: [{ ...validDocument().relations[0], target: 'src/a.ts#A' }] })],
    ['missing evidence', () => ({ ...validDocument(), relations: [{ ...validDocument().relations[0], evidence: [] }] })],
    ['a parent path', () => ({ ...validDocument(), entities: [{ ...validDocument().entities[0], filePath: '../a.ts' }] })],
    ['a non-ISO timestamp', () => ({ ...validDocument(), generatedAt: '1' })],
  ])('rejects %s', (_label, makeDocument) => {
    expect(() => parseAgentGraphDocument(makeDocument())).toThrow();
  });
});

describe('AgentGraphService', () => {
  it('returns an empty graph when the manifest is absent', () => {
    const service = new AgentGraphService(createWorkspace());
    expect(service.getStats()).toEqual({
      entityCount: 0,
      relationCount: 0,
      generatedAt: undefined,
      scope: undefined,
    });
  });

  it('loads stable entities, relations, metadata, and filters', () => {
    const workspace = createWorkspace();
    const graphPath = join(workspace, '.vscode', '.knowledge', 'agent-graph.json');
    writeFileSync(graphPath, JSON.stringify(validDocument()), 'utf8');

    const first = new AgentGraphService(workspace);
    const second = new AgentGraphService(workspace);
    const entity = first.listEntities({ name: 'a' })[0];
    const relation = first.listRelations({ verb: 'depends_on' })[0];

    expect(entity.id).toBe(second.listEntities({ name: 'A' })[0].id);
    expect(relation.sourceEntityId).toBe(entity.id);
    expect(relation.metadata?.evidence).toHaveLength(1);
    expect(first.getRelationsByEntity(entity.id, 'outgoing')).toHaveLength(1);
    expect(first.getStats()).toMatchObject({
      entityCount: 2,
      relationCount: 1,
      scope: 'src',
    });
  });

  it('does not expose a partially invalid graph', () => {
    const workspace = createWorkspace();
    const graphPath = join(workspace, '.vscode', '.knowledge', 'agent-graph.json');
    const invalid = validDocument();
    invalid.relations[0].target = 'missing';
    writeFileSync(graphPath, JSON.stringify(invalid), 'utf8');

    const service = new AgentGraphService(workspace);
    expect(service.listEntities()).toEqual([]);
    expect(service.listRelations()).toEqual([]);
    expect(service.getLastError()).toBeDefined();
  });
});
