import {
  appendFileSync,
  cpSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  renameSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join, resolve } from 'path';
import { afterEach, describe, expect, it } from 'vitest';
import {
  StructuralGraphRecoveryRequiredError,
  createStructuralCacheKey,
  extractStructuralGraph,
  updateStructuralGraph,
} from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/structural-extractor.mjs';

const temporaryDirectories: string[] = [];
const fixtureRoot = resolve(
  process.cwd(),
  'src',
  'services',
  'structuralGraph',
  'fixtures',
  'nest-project'
);
const generatedAt = '2026-09-03T00:00:00.000Z';

afterEach(() => {
  while (temporaryDirectories.length > 0) {
    rmSync(temporaryDirectories.pop()!, { recursive: true, force: true });
  }
});

describe('incremental structural graph cache', () => {
  it('reuses unchanged files and reparses only a changed leaf', () => {
    const workspace = createWorkspace();
    const initial = update(workspace);
    const unchanged = update(workspace);

    expect(initial.statistics.cacheMode).toBe('rebuild');
    expect(initial.statistics.parsedFiles).toBe(initial.graph.files.length);
    const userDescriptor = initial.cacheIndex.files.find(
      (file) => file.filePath === 'src/user.service.ts'
    )!;
    const userEntry = JSON.parse(
      readFileSync(
        join(
          workspace,
          '.vscode',
          '.knowledge',
          'cache',
          'structural',
          'entries',
          `${userDescriptor.cacheKey}.json`
        ),
        'utf8'
      )
    );
    expect(userEntry).toMatchObject({
      file: { filePath: 'src/user.service.ts' },
      entities: expect.any(Array),
      baseRelations: expect.any(Array),
      resolvedRelations: expect.any(Array),
      summary: {
        dependencies: ['src/contracts.ts'],
        imports: expect.any(Array),
        reexports: [],
        exports: expect.any(Array),
      },
    });
    expect(unchanged.statistics).toMatchObject({
      parsedFiles: 0,
      reusedFiles: initial.graph.files.length,
      resolvedFiles: 0,
      deletedFiles: 0,
      cacheMode: 'incremental',
    });

    appendFileSync(join(workspace, 'src', 'legacy.js'), '\n// leaf edit\n');
    const incremental = update(workspace);
    const full = extractStructuralGraph({ workspaceRoot: workspace, generatedAt });

    expect(incremental.statistics).toMatchObject({
      parsedFiles: 1,
      reusedFiles: initial.graph.files.length - 1,
      resolvedFiles: 1,
    });
    expect(incremental.graph).toEqual(full);

    const descriptor = incremental.cacheIndex.files.find(
      (file) => file.filePath === 'src/legacy.js'
    )!;
    expect(descriptor.cacheKey).toBe(
      createStructuralCacheKey(descriptor.filePath, descriptor.contentHash)
    );
  });

  it('re-resolves the transitive importer closure and removes deleted facts', () => {
    const workspace = createWorkspace();
    update(workspace);

    appendFileSync(join(workspace, 'src', 'user.service.ts'), '\n// provider edit\n');
    const providerUpdate = update(workspace);
    expect(providerUpdate.statistics.parsedFiles).toBe(1);
    expect(providerUpdate.statistics.resolvedFiles).toBeGreaterThan(1);

    unlinkSync(join(workspace, 'src', 'duplicate-b.ts'));
    const deletionUpdate = update(workspace);
    const full = extractStructuralGraph({ workspaceRoot: workspace, generatedAt });

    expect(deletionUpdate.statistics.deletedFiles).toBe(1);
    expect(
      deletionUpdate.graph.entities.some((entity) =>
        entity.key.startsWith('src/duplicate-b.ts')
      )
    ).toBe(false);
    expect(
      deletionUpdate.graph.relations.some(
        (relation) => relation.target === 'src/duplicate-a.ts#Duplicate'
      )
    ).toBe(true);
    expect(deletionUpdate.graph).toEqual(full);
  });

  it('reuses a copied cache without absolute checkout paths', () => {
    const source = createWorkspace();
    const initial = update(source);
    const clone = mkdtempSync(join(tmpdir(), 'vibeknowledge-cache-clone-'));
    temporaryDirectories.push(clone);
    cpSync(source, clone, { recursive: true });

    const cloned = update(clone);
    expect(cloned.statistics).toMatchObject({
      parsedFiles: 0,
      reusedFiles: initial.graph.files.length,
      cacheMode: 'incremental',
    });
    const cacheText = readFileSync(
      join(clone, '.vscode', '.knowledge', 'cache', 'structural', 'index.json'),
      'utf8'
    );
    expect(cacheText).not.toContain(source.replace(/\\/g, '/'));
    expect(cacheText).not.toContain(source);
  });

  it('treats a rename as one deletion plus one new file', () => {
    const workspace = createWorkspace();
    update(workspace);
    renameSync(
      join(workspace, 'src', 'duplicate-b.ts'),
      join(workspace, 'src', 'duplicate-c.ts')
    );

    const renamed = update(workspace);
    const full = extractStructuralGraph({ workspaceRoot: workspace, generatedAt });
    expect(renamed.statistics).toMatchObject({
      parsedFiles: 1,
      deletedFiles: 1,
    });
    expect(
      renamed.graph.entities.some((entity) =>
        entity.key.startsWith('src/duplicate-b.ts')
      )
    ).toBe(false);
    expect(
      renamed.graph.entities.some((entity) =>
        entity.key.startsWith('src/duplicate-c.ts')
      )
    ).toBe(true);
    expect(renamed.graph).toEqual(full);
  });

  it('preserves the old graph for corrupt cache, broken source, and abnormal shrink', () => {
    const workspace = createWorkspace();
    update(workspace);
    const graphPath = join(
      workspace,
      '.vscode',
      '.knowledge',
      'structural-graph.json'
    );
    const indexPath = join(
      workspace,
      '.vscode',
      '.knowledge',
      'cache',
      'structural',
      'index.json'
    );
    const originalGraph = readFileSync(graphPath, 'utf8');

    writeFileSync(indexPath, '{broken', 'utf8');
    expectRecovery(() => update(workspace), 'cache-corrupt');
    expect(readFileSync(graphPath, 'utf8')).toBe(originalGraph);
    update(workspace, true);

    writeFileSync(
      join(workspace, 'src', 'contracts.ts'),
      'export interface Broken {',
      'utf8'
    );
    const beforeBrokenSource = readFileSync(graphPath, 'utf8');
    expectRecovery(() => update(workspace), 'changed-file-parse-failed');
    expect(readFileSync(graphPath, 'utf8')).toBe(beforeBrokenSource);
    update(workspace, true);

    for (const name of readdirSync(join(workspace, 'src')).slice(0, 9)) {
      rmSync(join(workspace, 'src', name), { recursive: true, force: true });
    }
    const beforeShrink = readFileSync(graphPath, 'utf8');
    expectRecovery(() => update(workspace), 'abnormal-shrink');
    expect(readFileSync(graphPath, 'utf8')).toBe(beforeShrink);
    expect(() => update(workspace, true)).not.toThrow();
  });
});

function createWorkspace(): string {
  const workspace = mkdtempSync(join(tmpdir(), 'vibeknowledge-incremental-'));
  temporaryDirectories.push(workspace);
  cpSync(fixtureRoot, workspace, { recursive: true });
  return workspace;
}

function update(workspaceRoot: string, force = false) {
  return updateStructuralGraph({ workspaceRoot, generatedAt, force });
}

function expectRecovery(run: () => unknown, reason: string): void {
  try {
    run();
    throw new Error('Expected recovery protection to reject the update');
  } catch (error) {
    expect(error).toBeInstanceOf(StructuralGraphRecoveryRequiredError);
    expect((error as StructuralGraphRecoveryRequiredError).reason).toBe(reason);
  }
}
