import * as vscode from 'vscode';
import * as path from 'node:path';
import { existsSync } from 'node:fs';
import { DatabaseService } from '../services/database';
import { setupMcp, McpClient } from '../services/mcpSetupService';

/** A native settings/QuickPick UI, available even before graph initialization. */
export function registerMcpSetupCommands(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel('VibeKnowledge MCP Setup');
  let active: AbortController | undefined;
  let selecting = false;
  const text = (zh: string, en: string) => vscode.workspace.getConfiguration('knowledgeGraph').get('language', 'zh') === 'zh' ? zh : en;
  context.subscriptions.push(output, { dispose: () => active?.abort() });

  async function install(): Promise<void> {
    if (selecting || active) { output.show(true); return; }
    if (!vscode.workspace.isTrusted) {
      await vscode.window.showWarningMessage(text('请先信任此工作区，再安装 MCP。', 'Trust this workspace before installing MCP.'));
      return;
    }
    selecting = true;
    try {
      const config = vscode.workspace.getConfiguration('knowledgeGraph.mcp');
      let workspace = config.get<string>('workspacePath', '').trim();
      if (!workspace) {
        const choices = (vscode.workspace.workspaceFolders ?? []).filter(folder => folder.uri.scheme === 'file')
          .map(folder => ({ label: folder.name, description: folder.uri.fsPath, workspace: folder.uri.fsPath }));
        const choice = await vscode.window.showQuickPick([
          ...choices, { label: text('选择其他文件夹…', 'Choose another folder…'), description: '', workspace: '' },
        ], { title: text('MCP：选择要分析的工程', 'MCP: select the project to analyze') });
        if (!choice) {return;}
        workspace = choice.workspace;
        if (!workspace) {
          const selected = await vscode.window.showOpenDialog({ canSelectFolders: true, canSelectFiles: false, canSelectMany: false });
          if (!selected?.[0] || selected[0].scheme !== 'file') {return;}
          workspace = selected[0].fsPath;
        }
      }
      if (!path.isAbsolute(workspace)) {throw new Error(text('Workspace 必须是绝对目录路径。', 'Workspace must be an absolute directory path.'));}
      const configuredClient = config.get<string>('client', 'auto');
      const client: McpClient = configuredClient === 'cursor' || (configuredClient === 'auto' && /cursor/i.test(vscode.env.appName)) ? 'cursor' : 'vscode';
      const targetConfig = path.join(workspace, client === 'cursor' ? '.cursor' : '.vscode', 'mcp.json');
      const confirm = text('安装并配置', 'Install and configure');
      const accepted = await vscode.window.showInformationMessage(
        text('为此工程安装 VibeKnowledge MCP？', 'Install VibeKnowledge MCP for this project?'),
        { modal: true, detail: text(
          `目标工程：${workspace}\n配置：${targetConfig}\n\n将下载锁定依赖，不运行依赖的安装生命周期脚本；启用安全审计并验证连接。仅替换 vibeknowledge 配置项并备份原文件；不会安装依赖到业务工程，也不会重新生成图谱。首次使用会初始化缺失的图谱数据库。`,
          `Project: ${workspace}\nConfig: ${targetConfig}\n\nDownloads locked dependencies without running dependency lifecycle scripts, with auditing enabled, then verifies the connection. Only replaces the vibeknowledge entry, with a backup. Does not install into the business project or regenerate graphs. Initializes the graph database if missing.`
        ) }, confirm
      );
      if (accepted !== confirm) {return;}
      await config.update('workspacePath', workspace, vscode.ConfigurationTarget.Global);
      active = new AbortController();
      const controller = active;
      output.clear();
      output.show(true);
      const result = await vscode.window.withProgress({
        location: vscode.ProgressLocation.Notification,
        title: text('准备 VibeKnowledge MCP', 'Preparing VibeKnowledge MCP'), cancellable: true,
      }, async (progress, token) => {
        const cancellation = token.onCancellationRequested(() => controller.abort());
        if (token.isCancellationRequested) {controller.abort();}
        try {
          return await setupMcp({
            bundlePath: path.join(context.extensionPath, 'dist', 'mcp-server'),
            storagePath: path.join(context.globalStorageUri.fsPath, 'mcp'),
            workspacePath: workspace,
            nodePath: config.get<string>('nodePath', 'node').trim() || 'node',
            npmCliPath: config.get<string>('npmCliPath', '').trim() || undefined,
            auditTimeoutSeconds: config.get<number>('auditTimeoutSeconds', 60),
            client, signal: controller.signal,
            log: message => { output.append(message); progress.report({ message: message.split('\n')[0].slice(0, 120) }); },
            ensureDatabase: async () => {
              if (!existsSync(path.join(workspace, '.vscode', '.knowledge', 'graph.sqlite'))) {
                const database = new DatabaseService();
                try { await database.initialize(workspace); } finally { database.close(); }
              }
            },
          });
        } finally { cancellation.dispose(); }
      });
      const open = text('查看配置', 'View configuration');
      const action = await vscode.window.showInformationMessage(text(
        'MCP 已安装，审计和连接检查通过。请在客户端确认信任并启动/重启 vibeknowledge；知识图谱仍由 Skill 生成。',
        'MCP installed; audit and connection checks passed. Trust and start/restart vibeknowledge in your client. The Skill still generates the knowledge graph.'
      ), open);
      if (action === open) {await vscode.window.showTextDocument(vscode.Uri.file(result));}
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      output.appendLine(message);
      const settings = text('打开 MCP 设置', 'Open MCP settings');
      const action = await vscode.window.showErrorMessage(text(
        'MCP 安装未完成，原配置未替换。请查看 VibeKnowledge MCP Setup 日志；审计/网络失败不会按成功处理，SQLite 加载失败请检查平台是否受预编译包支持及依赖下载是否完整。',
        'MCP setup did not finish; previous configuration was preserved. See VibeKnowledge MCP Setup. Audit/network failures are not treated as success; for SQLite loading failures, check prebuilt platform support and dependency download integrity.'
      ), settings);
      if (action === settings) {await vscode.commands.executeCommand('workbench.action.openSettings', 'knowledgeGraph.mcp');}
    } finally { active = undefined; selecting = false; }
  }

  context.subscriptions.push(
    vscode.commands.registerCommand('knowledge.setupMcp', install),
    vscode.commands.registerCommand('knowledge.settings', async () => {
      const selection = await vscode.window.showQuickPick([
        { label: text('$(plug) 一键安装 / 重新配置 MCP', '$(plug) Install / reconfigure MCP'), action: 'install' },
        { label: text('$(settings-gear) MCP 设置（Workspace / Node / 客户端 / 审计超时）', '$(settings-gear) MCP settings (Workspace / Node / client / audit timeout)'), action: 'mcp' },
        { label: text('$(settings-gear) 全部 Knowledge 设置', '$(settings-gear) All Knowledge settings'), action: 'all' },
      ], { title: 'Knowledge: Settings' });
      if (selection?.action === 'install') {await install();}
      else if (selection) {await vscode.commands.executeCommand('workbench.action.openSettings', selection.action === 'mcp' ? 'knowledgeGraph.mcp' : 'knowledgeGraph');}
    }),
  );
}
