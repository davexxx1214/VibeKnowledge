import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { getLocale, currentLang } from '../i18n';

/**
 * 场景定义
 */
export interface ScenarioDefinition {
  id: string;                    // 'frontend'
  name: string;                  // '前端开发'
  nameEn: string;                // 'Frontend Development'
  icon: string;                  // '🎨'
  description: string;           // 简短描述
  descriptionEn: string;         // 英文描述
}

/**
 * 场景管理器
 */
export class ScenarioManager {
  private static instance: ScenarioManager;
  private readonly STATE_FILE = '.current-scenario';
  private extensionPath: string | undefined;

  private readonly _onDidChangeScenario = new vscode.EventEmitter<string>();
  public readonly onDidChangeScenario = this._onDidChangeScenario.event;

  /**
   * 所有可用场景
   */
  private readonly scenarios: ScenarioDefinition[] = [
    {
      id: 'customized_project_practice',
      name: '定制化项目实践',
      nameEn: 'Customized Project Practice',
      icon: '🔹',
      description: '项目通用规范和最佳实践',
      descriptionEn: 'General project guidelines and best practices'
    },
    {
      id: 'frontend',
      name: '前端开发',
      nameEn: 'Frontend Development',
      icon: '🎨',
      description: 'UI组件、样式、状态管理',
      descriptionEn: 'UI components, styles, state management'
    },
    {
      id: 'backend',
      name: '后端开发',
      nameEn: 'Backend Development',
      icon: '⚙️',
      description: '数据库、中间件、服务集成',
      descriptionEn: 'Database, middleware, service integration'
    },
    {
      id: 'api',
      name: 'API 开发',
      nameEn: 'API Development',
      icon: '🔌',
      description: '路由设计、参数验证、错误处理',
      descriptionEn: 'Route design, validation, error handling'
    },
    {
      id: 'testing',
      name: '测试场景',
      nameEn: 'Testing',
      icon: '🧪',
      description: '测试用例、TDD、覆盖率',
      descriptionEn: 'Test cases, TDD, coverage'
    },
    {
      id: 'debugging',
      name: '调试优化',
      nameEn: 'Debugging & Optimization',
      icon: '🐛',
      description: '错误诊断、性能优化、代码审查',
      descriptionEn: 'Error diagnosis, performance, code review'
    },
    {
      id: 'documentation',
      name: '文档编写',
      nameEn: 'Documentation',
      icon: '📚',
      description: 'API文档、代码注释、README',
      descriptionEn: 'API docs, code comments, README'
    },
    {
      id: 'devops',
      name: 'DevOps',
      nameEn: 'DevOps',
      icon: '🚀',
      description: '环境配置、CI/CD、Docker',
      descriptionEn: 'Environment, CI/CD, Docker'
    }
  ];

  private constructor() { }

  public static getInstance(): ScenarioManager {
    if (!ScenarioManager.instance) {
      ScenarioManager.instance = new ScenarioManager();
    }
    return ScenarioManager.instance;
  }

  /**
   * 设置扩展路径（在扩展激活时调用）
   */
  public setExtensionPath(path: string): void {
    this.extensionPath = path;
    console.log(`📁 ScenarioManager extension path set to: ${path}`);
  }

  /**
   * 获取所有可用场景
   */
  public getAvailableScenarios(): ScenarioDefinition[] {
    return this.scenarios;
  }

  /**
   * 获取场景定义
   */
  public getScenarioDefinition(scenarioId: string): ScenarioDefinition | undefined {
    return this.scenarios.find(s => s.id === scenarioId);
  }

  /**
   * 获取当前场景ID
   */
  public getCurrentScenario(): string {
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        return 'customized_project_practice';
      }

      const stateFile = path.join(workspaceRoot, '.vscode', '.knowledge', this.STATE_FILE);

      if (fs.existsSync(stateFile)) {
        const scenarioId = fs.readFileSync(stateFile, 'utf-8').trim();
        // 验证场景是否有效
        if (this.scenarios.some(s => s.id === scenarioId)) {
          console.log(`📋 Current scenario: ${scenarioId}`);
          return scenarioId;
        }
      }

      return 'customized_project_practice';
    } catch (error) {
      console.error('Failed to read current scenario:', error);
      return 'customized_project_practice';
    }
  }

  /**
   * 切换场景
   */
  public async switchScenario(scenarioId: string): Promise<void> {
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        throw new Error('No workspace folder found');
      }

      // 验证场景是否有效
      const scenario = this.getScenarioDefinition(scenarioId);
      if (!scenario) {
        throw new Error(`Invalid scenario: ${scenarioId}`);
      }

      // 确保目录存在
      const knowledgeDir = path.join(workspaceRoot, '.vscode', '.knowledge');
      if (!fs.existsSync(knowledgeDir)) {
        fs.mkdirSync(knowledgeDir, { recursive: true });
      }

      // 保存当前场景
      const stateFile = path.join(knowledgeDir, this.STATE_FILE);
      fs.writeFileSync(stateFile, scenarioId, 'utf-8');

      console.log(`✅ Switched to scenario: ${scenarioId}`);

      const locale = currentLang();
      const scenarioName = locale === 'zh' ? scenario.name : scenario.nameEn;
      const message = locale === 'zh'
        ? `已切换到场景: ${scenario.icon} ${scenarioName}`
        : `Switched to scenario: ${scenario.icon} ${scenarioName}`;

      vscode.window.showInformationMessage(message);

      // 触发场景切换事件
      this._onDidChangeScenario.fire(scenarioId);
    } catch (error) {
      console.error('Failed to switch scenario:', error);
      const locale = currentLang();
      const message = locale === 'zh'
        ? `切换场景失败: ${error}`
        : `Failed to switch scenario: ${error}`;
      vscode.window.showErrorMessage(message);
      throw error;
    }
  }

  /**
   * 读取场景模板内容
   * 
   * 优先级：
   * 1. customized_project_practice 场景：优先读取用户自定义的 .vscode/.knowledge/ai-template.md
   * 2. 其他场景：使用内置模板 resources/scenarios/{locale}/{scenarioId}.md
   * 
   * 根据当前语言设置自动选择中文或英文模板
   */
  public getScenarioTemplate(scenarioId: string): string | null {
    try {
      const locale = currentLang();
      console.log(`🔍 Reading template for scenario: ${scenarioId} (locale: ${locale})`);

      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;

      // customized_project_practice 场景特殊处理：优先读取用户自定义模板
      if (scenarioId === 'customized_project_practice' && workspaceRoot) {
        const customTemplatePath = path.join(workspaceRoot, '.vscode', '.knowledge', 'ai-template.md');
        if (fs.existsSync(customTemplatePath)) {
          const content = fs.readFileSync(customTemplatePath, 'utf-8').trim();
          if (content) {
            console.log(`✅ Using custom base template: ${customTemplatePath}`);
            return content;
          }
        }
      }

      // 获取扩展路径
      if (!this.extensionPath) {
        console.error('❌ Extension path not set! Call setExtensionPath() first.');
        // 尝试使用相对路径作为后备
        this.extensionPath = path.join(__dirname, '..', '..');
        console.log(`⚠️ Using fallback path: ${this.extensionPath}`);
      }

      // 根据语言选择模板目录: resources/scenarios/zh/ 或 resources/scenarios/en/
      const builtInTemplatePath = path.join(
        this.extensionPath,
        'resources',
        'scenarios',
        locale,  // 'zh' or 'en'
        `${scenarioId}.md`
      );

      console.log(`🔍 Looking for template at: ${builtInTemplatePath}`);

      if (fs.existsSync(builtInTemplatePath)) {
        const content = fs.readFileSync(builtInTemplatePath, 'utf-8').trim();
        console.log(`✅ Using built-in ${locale} template: ${builtInTemplatePath}`);
        return content;
      }

      // 如果没找到对应语言的模板，尝试使用英文作为后备
      if (locale !== 'en') {
        const fallbackPath = path.join(
          this.extensionPath,
          'resources',
          'scenarios',
          'en',
          `${scenarioId}.md`
        );

        console.log(`🔍 Trying fallback English template at: ${fallbackPath}`);

        if (fs.existsSync(fallbackPath)) {
          const content = fs.readFileSync(fallbackPath, 'utf-8').trim();
          console.log(`⚠️ Fallback to English template: ${fallbackPath}`);
          return content;
        }
      }

      console.log(`⚠️ Template not found for scenario: ${scenarioId} (locale: ${locale})`);
      return null;
    } catch (error) {
      console.error(`Failed to read template for scenario ${scenarioId}:`, error);
      return null;
    }
  }

  /**
   * 获取当前场景的显示名称
   */
  public getCurrentScenarioDisplayName(): string {
    const scenarioId = this.getCurrentScenario();
    const scenario = this.getScenarioDefinition(scenarioId);
    if (!scenario) {
      return scenarioId;
    }

    const locale = currentLang();
    const name = locale === 'zh' ? scenario.name : scenario.nameEn;
    return `${scenario.icon} ${name}`;
  }
}
