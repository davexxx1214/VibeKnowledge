import { afterEach, describe, expect, it } from 'vitest';
import {
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { AgentSkillService } from './agentSkillService';

const tempDirs: string[] = [];

function createTempDir(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  tempDirs.push(directory);
  return directory;
}

function createExtensionFixture(): string {
  const extensionPath = createTempDir('vibeknowledge-extension-');
  const skillPath = join(
    extensionPath,
    'resources',
    'skills',
    'vibeknowledge-dependency-graph'
  );
  mkdirSync(join(skillPath, 'references'), { recursive: true });
  writeFileSync(join(skillPath, 'SKILL.md'), 'version one', 'utf8');
  writeFileSync(join(skillPath, 'references', 'schema.md'), 'schema', 'utf8');
  return extensionPath;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    rmSync(tempDirs.pop()!, { recursive: true, force: true });
  }
});

describe('AgentSkillService', () => {
  it('installs the complete skill under .agents/skills', () => {
    const workspace = createTempDir('vibeknowledge-workspace-');
    const service = new AgentSkillService(createExtensionFixture());

    const installedSkill = service.install(workspace);

    expect(installedSkill).toBe(
      join(
        workspace,
        '.agents',
        'skills',
        'vibeknowledge-dependency-graph',
        'SKILL.md'
      )
    );
    expect(readFileSync(installedSkill, 'utf8')).toBe('version one');
    expect(
      readFileSync(join(installedSkill, '..', 'references', 'schema.md'), 'utf8')
    ).toBe('schema');
  });

  it('requires an explicit overwrite before updating an installed skill', () => {
    const workspace = createTempDir('vibeknowledge-workspace-');
    const extensionPath = createExtensionFixture();
    const service = new AgentSkillService(extensionPath);
    const installedSkill = service.install(workspace);
    writeFileSync(installedSkill, 'user edit', 'utf8');

    expect(() => service.install(workspace)).toThrow(/already installed/i);
    service.install(workspace, true);
    expect(readFileSync(installedSkill, 'utf8')).toBe('version one');
  });

  it('detects and recovers a partial installation', () => {
    const workspace = createTempDir('vibeknowledge-workspace-');
    const service = new AgentSkillService(createExtensionFixture());
    const partialDirectory = join(
      service.getInstallDirectory(workspace),
      'references'
    );
    mkdirSync(partialDirectory, { recursive: true });
    writeFileSync(join(partialDirectory, 'schema.md'), 'partial', 'utf8');

    expect(service.isInstalled(workspace)).toBe(true);
    expect(() => service.install(workspace)).toThrow(/already installed/i);

    const installedSkill = service.install(workspace, true);
    expect(readFileSync(installedSkill, 'utf8')).toBe('version one');
    expect(
      readFileSync(join(partialDirectory, 'schema.md'), 'utf8')
    ).toBe('schema');
  });

  it('fails clearly when the extension package does not contain the skill', () => {
    const workspace = createTempDir('vibeknowledge-workspace-');
    const service = new AgentSkillService(createTempDir('empty-extension-'));
    expect(() => service.install(workspace)).toThrow(/bundled skill is missing/i);
  });
});
