import * as vscode from 'vscode';
import { ScenarioManager } from '../services/scenarioManager';
import { currentLang } from '../i18n';

/**
 * 切换 AI 场景命令
 */
export async function switchAIScenarioCommand(): Promise<void> {
  const manager = ScenarioManager.getInstance();
  const currentScenario = manager.getCurrentScenario();
  const scenarios = manager.getAvailableScenarios();
  const locale = currentLang();

  // 构建 QuickPick 选项
  const items: vscode.QuickPickItem[] = scenarios.map(scenario => {
    const isCurrent = scenario.id === currentScenario;
    const label = locale === 'zh'
      ? `${scenario.icon} ${scenario.name}`
      : `${scenario.icon} ${scenario.nameEn}`;
    const description = isCurrent
      ? (locale === 'zh' ? '当前' : 'Current')
      : '';
    const detail = locale === 'zh' ? scenario.description : scenario.descriptionEn;

    return {
      label,
      description,
      detail,
      picked: isCurrent,
      // 使用 iconPath 字段存储场景ID，便于后续识别
      // @ts-ignore - 使用自定义字段
      scenarioId: scenario.id
    };
  });

  // 显示选择框
  const selected = await vscode.window.showQuickPick(items, {
    placeHolder: locale === 'zh'
      ? '选择 AI 场景模板'
      : 'Select AI Scenario Template',
    title: locale === 'zh'
      ? '切换 AI 场景'
      : 'Switch AI Scenario',
    matchOnDescription: true,
    matchOnDetail: true
  });

  if (selected) {
    // @ts-ignore
    const scenarioId = selected.scenarioId as string;

    // 如果选择的是当前场景，不需要切换
    if (scenarioId === currentScenario) {
      const message = locale === 'zh'
        ? '已经是当前场景'
        : 'Already in this scenario';
      vscode.window.showInformationMessage(message);
      return;
    }

    // 切换场景
    await manager.switchScenario(scenarioId);

    // 提示用户重新生成 AI 配置
    const regenerateMessage = locale === 'zh'
      ? '场景已切换。是否重新生成 AI 配置文件？'
      : 'Scenario switched. Regenerate AI config files?';

    const yesLabel = locale === 'zh' ? '生成' : 'Generate';
    const noLabel = locale === 'zh' ? '稍后' : 'Later';

    const answer = await vscode.window.showInformationMessage(
      regenerateMessage,
      yesLabel,
      noLabel
    );

    if (answer === yesLabel) {
      await vscode.commands.executeCommand('knowledge.generateAllAIConfigs');
    }
  }
}

/**
 * 显示当前场景命令
 */
export async function showCurrentScenarioCommand(): Promise<void> {
  const manager = ScenarioManager.getInstance();
  const scenarioId = manager.getCurrentScenario();
  const scenario = manager.getScenarioDefinition(scenarioId);
  const locale = currentLang();

  if (!scenario) {
    vscode.window.showErrorMessage(`Unknown scenario: ${scenarioId}`);
    return;
  }

  const name = locale === 'zh' ? scenario.name : scenario.nameEn;
  const description = locale === 'zh' ? scenario.description : scenario.descriptionEn;

  // 读取模板内容预览
  const template = manager.getScenarioTemplate(scenarioId);
  const preview = template ? template.substring(0, 500) + '...' :
    (locale === 'zh' ? '(模板内容未找到)' : '(Template not found)');

  const title = locale === 'zh'
    ? `当前 AI 场景: ${scenario.icon} ${name}`
    : `Current AI Scenario: ${scenario.icon} ${name}`;

  const message = `${title}\n\n${description}\n\n---\n\n${preview}`;

  // 创建输出通道显示完整内容
  const outputChannel = vscode.window.createOutputChannel('AI Scenario');
  outputChannel.clear();
  outputChannel.appendLine(title);
  outputChannel.appendLine('='.repeat(50));
  outputChannel.appendLine('');
  outputChannel.appendLine(description);
  outputChannel.appendLine('');
  outputChannel.appendLine('='.repeat(50));
  outputChannel.appendLine('');
  if (template) {
    outputChannel.appendLine(template);
  }
  outputChannel.show();

  vscode.window.showInformationMessage(title);
}

/**
 * 注册场景相关命令
 */
export function registerScenarioCommands(context: vscode.ExtensionContext): void {
  context.subscriptions.push(
    vscode.commands.registerCommand('knowledge.switchAIScenario', switchAIScenarioCommand)
  );

  context.subscriptions.push(
    vscode.commands.registerCommand('knowledge.showCurrentScenario', showCurrentScenarioCommand)
  );
}

