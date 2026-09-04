import * as fs from 'fs';
import * as path from 'path';

export const DEPENDENCY_GRAPH_SKILL_NAME = 'vibeknowledge-dependency-graph';
export const QUERY_SKILL_NAME = 'vibeknowledge-query';

/** Installs the bundled project skill into the standard Agent Skills folder. */
export class AgentSkillService {
  private readonly sourceDirectory: string;

  constructor(extensionPath: string, private readonly skillName = DEPENDENCY_GRAPH_SKILL_NAME) {
    if (![DEPENDENCY_GRAPH_SKILL_NAME, QUERY_SKILL_NAME].includes(skillName)) {
      throw new Error(`Unknown bundled skill: ${skillName}`);
    }
    this.sourceDirectory = path.join(
      extensionPath,
      skillName === QUERY_SKILL_NAME ? 'dist' : 'resources',
      'skills',
      skillName
    );
  }

  public getInstallDirectory(workspaceRoot: string): string {
    return path.join(
      workspaceRoot,
      '.agents',
      'skills',
      this.skillName
    );
  }

  public getInstalledSkillPath(workspaceRoot: string): string {
    return path.join(this.getInstallDirectory(workspaceRoot), 'SKILL.md');
  }

  public isInstalled(workspaceRoot: string): boolean {
    return fs.existsSync(this.getInstallDirectory(workspaceRoot));
  }

  public install(workspaceRoot: string, overwrite = false): string {
    const sourceSkill = path.join(this.sourceDirectory, 'SKILL.md');
    if (!fs.existsSync(sourceSkill)) {
      throw new Error(`Bundled skill is missing: ${sourceSkill}`);
    }
    if (this.skillName === QUERY_SKILL_NAME && !fs.existsSync(path.join(this.sourceDirectory, 'scripts', 'query.cjs'))) {
      throw new Error('Bundled query runtime is missing. Rebuild the extension before installing the Skill.');
    }

    const targetDirectory = this.getInstallDirectory(workspaceRoot);
    if (this.isInstalled(workspaceRoot) && !overwrite) {
      throw new Error(`Skill is already installed: ${targetDirectory}`);
    }

    this.copyDirectory(this.sourceDirectory, targetDirectory, overwrite);
    return this.getInstalledSkillPath(workspaceRoot);
  }

  private copyDirectory(
    sourceDirectory: string,
    targetDirectory: string,
    overwrite: boolean
  ): void {
    fs.mkdirSync(targetDirectory, { recursive: true });

    for (const entry of fs.readdirSync(sourceDirectory, { withFileTypes: true })) {
      const sourcePath = path.join(sourceDirectory, entry.name);
      const targetPath = path.join(targetDirectory, entry.name);

      if (entry.isDirectory()) {
        this.copyDirectory(sourcePath, targetPath, overwrite);
        continue;
      }
      if (!entry.isFile()) {
        continue;
      }
      if (!overwrite && fs.existsSync(targetPath)) {
        throw new Error(`Skill file already exists: ${targetPath}`);
      }
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}
