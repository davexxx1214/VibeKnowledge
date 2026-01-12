import * as vscode from 'vscode';
import { AutoGraphService, CodeAnalyzer, AutoGraphStats } from '../../services/autoGraph';
import { t } from '../../i18n/i18nService';

/**
 * 自动图谱命令处理器
 */
export class AutoGraphCommands {
  constructor(
    private autoGraphService: AutoGraphService,
    private codeAnalyzer: CodeAnalyzer
  ) {}

  /**
   * 分析整个工作区
   */
  public async analyzeWorkspace(): Promise<void> {
    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t().autoGraph.commands.analyzeWorkspace.title,
        cancellable: false,
      },
      async (progress) => {
        return await this.codeAnalyzer.analyzeWorkspace(progress);
      }
    );

    if (result.errors.length > 0) {
      const errorMessages = result.errors
        .slice(0, 5)
        .map((e) => `${e.filePath}: ${e.message}`)
        .join('\n');
      
      vscode.window.showWarningMessage(
        t().autoGraph.commands.analyzeWorkspace.completedWithErrors(
          result.entities.length,
          result.relations.length,
          result.errors.length
        ),
        t().autoGraph.commands.analyzeWorkspace.viewErrors
      ).then((action) => {
        if (action === t().autoGraph.commands.analyzeWorkspace.viewErrors) {
          const outputChannel = vscode.window.createOutputChannel('Auto Graph Errors');
          outputChannel.appendLine('Analysis Errors:');
          result.errors.forEach((e) => {
            outputChannel.appendLine(`${e.filePath}:${e.line || ''} - ${e.message}`);
          });
          outputChannel.show();
        }
      });
    } else {
      vscode.window.showInformationMessage(
        t().autoGraph.commands.analyzeWorkspace.completed(
          result.entities.length,
          result.relations.length,
          result.filesCached
        )
      );
    }
  }

  /**
   * 分析当前文件
   */
  public async analyzeCurrentFile(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(t().autoGraph.commands.analyzeFile.noActiveFile);
      return;
    }

    const uri = editor.document.uri;
    const fileName = vscode.workspace.asRelativePath(uri);

    // 检查文件类型
    if (!this.isAnalyzableFile(uri.fsPath)) {
      vscode.window.showWarningMessage(
        t().autoGraph.commands.analyzeFile.unsupportedType(fileName)
      );
      return;
    }

    const result = await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: t().autoGraph.commands.analyzeFile.title(fileName),
        cancellable: false,
      },
      async () => {
        return await this.codeAnalyzer.analyzeFile(uri, true);
      }
    );

    if (!result) {
      vscode.window.showInformationMessage(
        t().autoGraph.commands.analyzeFile.unchanged(fileName)
      );
      return;
    }

    if (result.errors.length > 0) {
      vscode.window.showWarningMessage(
        t().autoGraph.commands.analyzeFile.error(fileName, result.errors[0].message)
      );
    } else {
      vscode.window.showInformationMessage(
        t().autoGraph.commands.analyzeFile.completed(
          fileName,
          result.entities.length,
          result.relations.length
        )
      );
    }
  }

  /**
   * 清空自动图谱
   */
  public async clearAutoGraph(): Promise<void> {
    const answer = await vscode.window.showWarningMessage(
      t().autoGraph.commands.clear.confirm,
      { modal: true },
      t().autoGraph.commands.clear.yes,
      t().autoGraph.commands.clear.no
    );

    if (answer === t().autoGraph.commands.clear.yes) {
      this.autoGraphService.clearAll();
      vscode.window.showInformationMessage(t().autoGraph.commands.clear.completed);
    }
  }

  /**
   * 查看自动图谱统计
   */
  public async viewAutoGraphStats(): Promise<void> {
    const stats = this.autoGraphService.getStats();

    const statsContent = this.formatStats(stats);

    const doc = await vscode.workspace.openTextDocument({
      content: statsContent,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc, { preview: true });
  }

  /**
   * 格式化统计信息
   */
  private formatStats(stats: AutoGraphStats): string {
    const lines: string[] = [
      '# Auto Graph Statistics',
      '',
      `## Overview`,
      '',
      `| Metric | Count |`,
      `|--------|-------|`,
      `| **Entities** | ${stats.entityCount} |`,
      `| **Relations** | ${stats.relationCount} |`,
      `| **Files** | ${stats.fileCount} |`,
      '',
    ];

    if (stats.lastAnalyzedAt) {
      lines.push(`**Last Analyzed:** ${new Date(stats.lastAnalyzedAt).toLocaleString()}`);
      lines.push('');
    }

    if (Object.keys(stats.entitiesByType).length > 0) {
      lines.push('## Entities by Type');
      lines.push('');
      lines.push('| Type | Count |');
      lines.push('|------|-------|');
      for (const [type, count] of Object.entries(stats.entitiesByType)) {
        lines.push(`| ${type} | ${count} |`);
      }
      lines.push('');
    }

    if (Object.keys(stats.relationsByVerb).length > 0) {
      lines.push('## Relations by Verb');
      lines.push('');
      lines.push('| Verb | Count |');
      lines.push('|------|-------|');
      for (const [verb, count] of Object.entries(stats.relationsByVerb)) {
        lines.push(`| ${verb} | ${count} |`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }

  /**
   * 为自动图谱实体添加观察记录
   */
  public async addObservationToAutoEntity(entityId?: string): Promise<void> {
    let targetEntityId: string | undefined;

    // 如果提供了实体 ID，使用它
    if (entityId && typeof entityId === 'string') {
      targetEntityId = entityId;
    }

    // 如果没有提供实体 ID，让用户选择
    if (!targetEntityId) {
      const entities = this.autoGraphService.listEntities();
      if (entities.length === 0) {
        vscode.window.showWarningMessage(t().autoGraph.commands.addObservation.noEntities);
        return;
      }

      const items = entities.map((e) => ({
        label: e.name,
        description: `${e.type} - ${e.filePath}:${e.startLine}`,
        entityId: e.id,
      }));

      const selected = await vscode.window.showQuickPick(items, {
        placeHolder: t().autoGraph.commands.addObservation.selectEntity,
      });

      if (!selected) {
        return;
      }

      targetEntityId = selected.entityId;
    }

    // 验证实体存在
    const entity = this.autoGraphService.getEntity(targetEntityId);
    if (!entity) {
      vscode.window.showErrorMessage(t().autoGraph.commands.addObservation.entityNotFound);
      return;
    }

    // 使用多行编辑面板输入观察内容
    const translations = t().autoGraph.commands.editObservation;
    const content = await this.openObservationEditorPanel('', entity.name);

    if (!content) {
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      vscode.window.showWarningMessage(t().autoGraph.commands.addObservation.validateEmpty);
      return;
    }

    try {
      const observation = this.autoGraphService.addObservation(targetEntityId, trimmedContent);
      if (observation) {
        this.autoGraphService.save();
        vscode.window.showInformationMessage(
          t().autoGraph.commands.addObservation.success(entity.name)
        );
      } else {
        vscode.window.showErrorMessage(t().autoGraph.commands.addObservation.error);
      }
    } catch (error) {
      vscode.window.showErrorMessage(
        t().autoGraph.commands.addObservation.errorDetail(String(error))
      );
    }
  }

  /**
   * 编辑自动图谱观察记录
   */
  public async editAutoObservation(observationId: string): Promise<void> {
    const observation = this.autoGraphService.getObservation(observationId);
    if (!observation) {
      vscode.window.showErrorMessage(t().autoGraph.commands.editObservation.notFound);
      return;
    }

    // 获取实体名称用于标题
    const entity = this.autoGraphService.getEntity(observation.entityId);
    const entityName = entity?.name || 'Unknown';

    // 使用多行编辑面板
    const content = await this.openObservationEditorPanel(observation.content, entityName);

    if (content === undefined) {
      return;
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      vscode.window.showWarningMessage(t().autoGraph.commands.addObservation.validateEmpty);
      return;
    }

    try {
      this.autoGraphService.updateObservation(observationId, trimmedContent);
      this.autoGraphService.save();
      vscode.window.showInformationMessage(t().autoGraph.commands.editObservation.success);
    } catch (error) {
      vscode.window.showErrorMessage(
        t().autoGraph.commands.editObservation.error(String(error))
      );
    }
  }

  /**
   * 打开多行观察记录编辑面板
   */
  private async openObservationEditorPanel(
    initialContent: string,
    entityName: string
  ): Promise<string | undefined> {
    const translations = t().autoGraph.commands.editObservation;
    const title = `${translations.prompt} - ${entityName}`;
    
    const panel = vscode.window.createWebviewPanel(
      'autoObservationEditor',
      title,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: false
      }
    );

    panel.webview.html = this.getObservationEditorHtml(panel.webview, initialContent, entityName);

    return new Promise<string | undefined>((resolve) => {
      let resolved = false;
      const finalize = (value?: string) => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve(value);
      };

      panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'save') {
          finalize(message.content as string);
          panel.dispose();
        } else if (message.type === 'cancel') {
          finalize(undefined);
          panel.dispose();
        }
      });

      panel.onDidDispose(() => {
        finalize(undefined);
      });
    });
  }

  /**
   * 获取观察记录编辑器 HTML
   */
  private getObservationEditorHtml(
    webview: vscode.Webview,
    initialContent: string,
    entityName: string
  ): string {
    const nonce = this.getNonce();
    const translations = t().autoGraph.commands.editObservation;
    const title = translations.prompt;
    const hint = t().commands?.editObservation?.editorHint || 
      '在下方文本框中自由编辑，可使用 Ctrl/Cmd + Enter 快速保存。';
    const saveLabel = t().common.save;
    const cancelLabel = t().common.cancel;
    const placeholder = t().autoGraph.commands.addObservation.placeholder;

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      margin: 0;
      padding: 16px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    h2 {
      font-size: 16px;
      margin: 0 0 8px;
    }
    .hint {
      font-size: 12px;
      opacity: 0.85;
      margin-bottom: 12px;
    }
    textarea {
      width: 100%;
      height: calc(100vh - 150px);
      box-sizing: border-box;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      border: 1px solid var(--vscode-input-border, var(--vscode-editorWidget-border));
      border-radius: 4px;
      padding: 12px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      line-height: 1.5;
      resize: vertical;
    }
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    button {
      border: none;
      border-radius: 4px;
      padding: 6px 16px;
      cursor: pointer;
      font-size: 13px;
    }
    button.save {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button.save:hover {
      background: var(--vscode-button-hoverBackground, var(--vscode-button-background));
    }
    button.cancel {
      background: transparent;
      border: 1px solid var(--vscode-button-border, var(--vscode-editorWidget-border));
      color: var(--vscode-editor-foreground);
    }
  </style>
</head>
<body>
  <h2>知识图谱: 编辑观察记录</h2>
  <p class="hint">${hint}</p>
  <textarea id="content" placeholder="${placeholder}">${this.escapeHtml(initialContent)}</textarea>
  <div class="actions">
    <button class="cancel" id="cancelBtn">${cancelLabel}</button>
    <button class="save" id="saveBtn">${saveLabel}</button>
  </div>
  <script nonce="${nonce}">
    (function() {
      const vscode = acquireVsCodeApi();
      const textarea = document.getElementById('content');
      const saveBtn = document.getElementById('saveBtn');
      const cancelBtn = document.getElementById('cancelBtn');
      
      textarea.focus();

      function save() {
        vscode.postMessage({ type: 'save', content: textarea.value });
      }

      function cancel() {
        vscode.postMessage({ type: 'cancel' });
      }

      saveBtn.addEventListener('click', save);
      cancelBtn.addEventListener('click', cancel);

      textarea.addEventListener('keydown', function(e) {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          save();
        }
      });
    })();
  </script>
</body>
</html>`;
  }

  /**
   * 生成随机 nonce
   */
  private getNonce(): string {
    let text = '';
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (let i = 0; i < 32; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  /**
   * 转义 HTML
   */
  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * 删除自动图谱观察记录
   */
  public async deleteAutoObservation(observationId: string): Promise<void> {
    const answer = await vscode.window.showWarningMessage(
      t().autoGraph.commands.deleteObservation.confirm,
      { modal: true },
      t().autoGraph.commands.deleteObservation.yes,
      t().autoGraph.commands.deleteObservation.no
    );

    if (answer === t().autoGraph.commands.deleteObservation.yes) {
      this.autoGraphService.deleteObservation(observationId);
      this.autoGraphService.save();
      vscode.window.showInformationMessage(t().autoGraph.commands.deleteObservation.success);
    }
  }

  /**
   * 检查文件是否可分析
   */
  private isAnalyzableFile(filePath: string): boolean {
    const extensions = ['.ts', '.tsx', '.js', '.jsx'];
    return extensions.some((ext) => filePath.endsWith(ext));
  }
}

