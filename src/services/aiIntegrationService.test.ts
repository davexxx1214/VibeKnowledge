import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AIIntegrationService } from './aiIntegrationService';
import type { EntityService } from './entityService';
import type { ObservationService } from './observationService';
import type { RelationService } from './relationService';

vi.mock('vscode', () => ({
  workspace: {
    workspaceFolders: undefined,
    getConfiguration: () => ({
      get: (_key: string, defaultValue: unknown) => defaultValue,
    }),
    onDidChangeConfiguration: () => ({ dispose() {} }),
  },
  window: {
    showInformationMessage: vi.fn(),
  },
  // eslint-disable-next-line @typescript-eslint/naming-convention
  EventEmitter: class {
    public event = vi.fn();
    public fire = vi.fn();
  },
}));

const tempDirs: string[] = [];

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-ai-integration-'));
  tempDirs.push(workspace);
  return workspace;
}

function createService(): AIIntegrationService {
  return new AIIntegrationService(
    {} as EntityService,
    {} as RelationService,
    {} as ObservationService
  );
}

function extractJavaScriptTechStack(
  service: AIIntegrationService,
  packageJsonPath: string
): { runtime?: string } | null {
  return (
    service as unknown as {
      extractJavaScriptTechStack(path: string): { runtime?: string } | null;
    }
  ).extractJavaScriptTechStack(packageJsonPath);
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('AIIntegrationService', () => {
  it('generates a compact Copilot router without template or graph dumps', async () => {
    const workspace = createWorkspace();
    const knowledgeDirectory = join(workspace, '.vscode', '.knowledge');
    mkdirSync(knowledgeDirectory, { recursive: true });
    writeFileSync(
      join(knowledgeDirectory, 'ai-template.md'),
      'TEMPLATE_ONLY_MARKER',
      'utf8'
    );

    const outputPath = await createService().generateCopilotInstructions(
      workspace
    );
    const content = readFileSync(outputPath, 'utf8');

    expect(content).toContain(
      '.vscode/.knowledge/agent-context/index.md'
    );
    expect(content).toContain('`query_graph`');
    expect(content).toContain('`get_neighbors`');
    expect(content).toContain('`shortest_path`');
    expect(content).toContain('`includeEvidence=true`');
    expect(content).toContain(
      'Do not load `.vscode/.knowledge/knowledge-graph.md` by default'
    );
    expect(content).toContain('load only the single best-matching group view');
    expect(content).not.toContain('TEMPLATE_ONLY_MARKER');
    expect(content).not.toContain('Tech Stack');
    expect(content).not.toContain('Dependency Details');
    expect(content).not.toContain('Total Entities');
  });

  it('generates compact query-first Cursor instructions without graph dumps', async () => {
    const workspace = createWorkspace();
    const knowledgeDirectory = join(workspace, '.vscode', '.knowledge');
    mkdirSync(knowledgeDirectory, { recursive: true });
    writeFileSync(
      join(knowledgeDirectory, 'ai-template.md'),
      'CURSOR_TEMPLATE_ONLY_MARKER',
      'utf8'
    );

    const outputPath = await createService().generateCursorRules(workspace);
    const content = readFileSync(outputPath, 'utf8');

    expect(content).toContain('`query_graph`');
    expect(content).toContain('`get_entity`');
    expect(content).toContain('.vscode/.knowledge/agent-context/index.md');
    expect(content).not.toContain('CURSOR_TEMPLATE_ONLY_MARKER');
    expect(content).not.toContain('Tech Stack');
    expect(content).not.toContain('Total Entities');
  });

  it('does not treat @types/node as the Node.js runtime version', () => {
    const workspace = createWorkspace();
    const packageJsonPath = join(workspace, 'package.json');
    writeFileSync(
      packageJsonPath,
      JSON.stringify({
        devDependencies: {
          // eslint-disable-next-line @typescript-eslint/naming-convention
          '@types/node': '^13.13.4',
          typescript: '^3.8.3',
        },
      }),
      'utf8'
    );

    const techStack = extractJavaScriptTechStack(
      createService(),
      packageJsonPath
    );

    expect(techStack?.runtime).toBeUndefined();
  });

  it('uses explicit Node.js runtime declarations', () => {
    const workspace = createWorkspace();
    const packageJsonPath = join(workspace, 'package.json');
    writeFileSync(
      packageJsonPath,
      JSON.stringify({ engines: { node: '>=18.18' } }),
      'utf8'
    );

    expect(
      extractJavaScriptTechStack(createService(), packageJsonPath)?.runtime
    ).toBe('Node.js >=18.18');

    writeFileSync(packageJsonPath, JSON.stringify({}), 'utf8');
    writeFileSync(join(workspace, '.nvmrc'), 'v20.11.1\n', 'utf8');

    expect(
      extractJavaScriptTechStack(createService(), packageJsonPath)?.runtime
    ).toBe('Node.js 20.11.1');
  });
});
