import * as vscode from 'vscode';
import { RAGService, SearchResult, QuestionAnswerResult, StoreInfo } from '../../services/ragService';
import { GeminiClient } from '../../services/geminiClient';
import { t, getLocale } from '../../i18n/i18nService';

/**
 * RAG 相关命令处理器
 */
export class RAGCommands {
  constructor(
    private ragService: RAGService,
    private geminiClient: GeminiClient
  ) {}

  /**
   * 智能问答
   */
  public async askQuestion(): Promise<void> {
    const translations = t().rag.askQuestion;
    const mode = this.ragService.getMode();

    // 确保客户端已初始化 (仅 Cloud 模式)
    if (mode === 'cloud') {
        if (!this.geminiClient.isInitialized()) {
        await this.geminiClient.initialize();
        if (!this.geminiClient.isInitialized()) {
            vscode.window.showWarningMessage(
            translations.notInitialized.message,
            translations.notInitialized.openSettings
            ).then(action => {
            if (action === translations.notInitialized.openSettings) {
                vscode.commands.executeCommand('workbench.action.openSettings', 'knowledgeGraph.gemini.apiKey');
            }
            });
            return;
        }
        }
    }

    // 检查是否有已索引的文档
    const indexedFiles = this.ragService.getIndexedFiles();
    if (indexedFiles.length === 0) {
      vscode.window.showWarningMessage(translations.noDocuments);
      return;
    }

    // 输入问题
    const question = await vscode.window.showInputBox({
      prompt: translations.prompt,
      placeHolder: translations.placeholder,
      validateInput: (value) => {
        return value.trim() ? null : translations.validateEmpty;
      },
    });

    if (!question) {
      return;
    }

    try {
      // 显示进度
      const result = await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: translations.thinking,
          cancellable: false,
        },
        async () => {
          return await this.ragService.askQuestion(question);
        }
      );

      // 显示问答结果
      await this.showQuestionAnswerResult(result, question);
    } catch (error) {
      console.error('Question answering error:', error);
      vscode.window.showErrorMessage(translations.error(String(error)));
    }
  }

  /**
   * 显示问答结果
   */
  private async showQuestionAnswerResult(
    result: QuestionAnswerResult,
    question: string
  ): Promise<void> {
    const translations = t().rag.askQuestion;
    const storeId = this.ragService.getStoreInfo()?.storeId ?? 'unknown';

    // 构建 Markdown 格式的答案
    let markdown = translations.result.title;
    markdown += `${translations.result.questionLabel}：${question}\n\n`;
    markdown += `---\n\n`;
    markdown += translations.result.answerLabel;
    markdown += `${result.answer}\n\n`;
    markdown += `${translations.result.storeIdLabel(storeId)}\n\n`;

    if (result.sources.length > 0) {
      markdown += `---\n\n`;
      markdown += translations.result.sourcesLabel;
      result.sources.forEach((source, i) => {
        markdown += `${i + 1}. ${source}\n`;
      });
    }

    if (result.citations.length > 0) {
      markdown += translations.result.citationsLabel;
      result.citations.forEach((citation) => {
        if (typeof citation === 'string') {
          markdown += `> ${citation}\n\n`;
        } else if (citation) {
          const fileName = citation.fileName || 'unknown';
          const snippet = citation.snippet || '';
          markdown += `**${fileName}**:\n`;
          markdown += snippet ? `> ${snippet}\n\n` : '\n';
        }
      });
    }

    markdown += `---\n\n`;
    markdown += translations.result.generatedAt(new Date().toLocaleString(getLocale()));

    // 在新标签页显示
    const doc = await vscode.workspace.openTextDocument({
      content: markdown,
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc, { preview: false });

    // 提供操作选项
    const action = await vscode.window.showInformationMessage(
      translations.success,
      translations.copyToClipboard,
      translations.saveToFile
    );

    if (action === translations.copyToClipboard) {
      await vscode.env.clipboard.writeText(markdown);
      vscode.window.showInformationMessage(translations.copiedToClipboard);
    } else if (action === translations.saveToFile) {
      await this.saveAnswerToFile(markdown, question);
    }
  }

  /**
   * 保存答案到文件
   */
  private async saveAnswerToFile(
    markdown: string,
    question: string
  ): Promise<void> {
    const translations = t().rag.askQuestion;
    const common = t().common;

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    // 生成文件名
    const safeQuestion = question.substring(0, 30).replace(/[^a-zA-Z0-9\u4e00-\u9fa5]/g, '_');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const fileName = `qa-${safeQuestion}-${timestamp}.md`;

    const defaultUri = vscode.Uri.joinPath(workspaceFolder.uri, 'Knowledge', fileName);

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: { 'Markdown': ['md'] },
      saveLabel: common.save,
    });

    if (saveUri) {
      const fs = require('fs');
      fs.writeFileSync(saveUri.fsPath, markdown, 'utf-8');

      const openAction = await vscode.window.showInformationMessage(
        translations.saved(require('path').basename(saveUri.fsPath)),
        common.openFile
      );

      if (openAction === common.openFile) {
        const doc = await vscode.workspace.openTextDocument(saveUri);
        await vscode.window.showTextDocument(doc);
      }
    }
  }

  /**
   * 查看已索引的文档
   */
  public async viewIndexedDocuments(): Promise<void> {
    const translations = t().rag.viewIndexedDocuments;
    const indexedFiles = this.ragService.getIndexedFiles();

    if (indexedFiles.length === 0) {
      vscode.window.showInformationMessage(translations.noDocuments);
      return;
    }

    const items = indexedFiles.map(file => ({
      label: `$(file-text) ${file.fileName}`,
      description: file.filePath,
      detail: `${translations.sizeKB(file.fileSize / 1024)} | ${translations.indexedAt(
        new Date(file.indexedAt).toLocaleString(getLocale())
      )}`,
      file,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: translations.placeholder(indexedFiles.length),
      matchOnDescription: true,
      matchOnDetail: true,
    });

    if (selected) {
      await this.openDocument(selected.file.filePath);
    }
  }

  /**
   * 打开文档
   */
  private async openDocument(relativePath: string): Promise<void> {
    const translations = t().rag.openDocument;
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      return;
    }

    const uri = vscode.Uri.joinPath(workspaceFolder.uri, relativePath);

    try {
      const doc = await vscode.workspace.openTextDocument(uri);
      await vscode.window.showTextDocument(doc);
    } catch (error) {
      vscode.window.showErrorMessage(translations.error(String(error)));
    }
  }

  /**
   * 诊断 RAG 状态
   */
  public async diagnoseRAGStatus(): Promise<void> {
    const translations = t().rag.diagnose;
    const mode = this.ragService.getMode();
    
    const diagnosticInfo: string[] = [
      translations.reportTitle,
      `**${translations.clientStatus.title.trim()}** ${new Date().toLocaleString(getLocale())}\n`,
      `**RAG Mode**: ${mode.toUpperCase()}`,
      '---\n',
      translations.clientStatus.title
    ];

    if (mode === 'cloud') {
        // 检查 Gemini Client
        const clientInitialized = this.geminiClient.isInitialized();
        diagnosticInfo.push(`- **初始化状态**: ${clientInitialized ? translations.clientStatus.initialized : translations.clientStatus.notInitialized}`);
        
        if (clientInitialized) {
        diagnosticInfo.push(`- **${translations.clientStatus.configuredModel(this.geminiClient.getConfiguredModel())}`);
        const apiKey = this.geminiClient.getApiKey();
        if (apiKey) {
            diagnosticInfo.push(`- **${translations.clientStatus.apiKeyConfigured(apiKey.substring(0, 10))}`);
        }
        } else {
        diagnosticInfo.push(`\n${translations.clientStatus.issue}`);
        diagnosticInfo.push(translations.clientStatus.solution);
        diagnosticInfo.push(translations.clientStatus.settingsPath);
        }
    } else {
        // Local Mode Diagnosis
        const config = vscode.workspace.getConfiguration('knowledgeGraph.rag.local');
        diagnosticInfo.push(`- **API Base**: ${config.get('apiBase')}`);
        diagnosticInfo.push(`- **Embedding Model**: ${config.get('embeddingModel')}`);
        diagnosticInfo.push(`- **Inference Model**: ${config.get('inferenceModel')}`);
        
        // Test Connection
        try {
            const connected = await this.ragService.testConnection();
             diagnosticInfo.push(`- **Connection Test**: ${connected ? '✅ Success' : '❌ Failed'}`);
        } catch (e) {
             diagnosticInfo.push(`- **Connection Test**: ❌ Failed (${e})`);
        }
    }

    diagnosticInfo.push(`\n${translations.storeStatus.title}`);

    // 检查 Store 信息
    const storeInfo = this.ragService.getStoreInfo();
    if (storeInfo) {
      diagnosticInfo.push(`- **${translations.storeStatus.storeName(storeInfo.storeName)}`);
      diagnosticInfo.push(`- **${translations.storeStatus.projectName(storeInfo.projectName)}`);
      diagnosticInfo.push(`- **${translations.storeStatus.localFiles(storeInfo.fileCount)}`);
      diagnosticInfo.push(`- **${translations.storeStatus.createdAt(new Date(storeInfo.createdAt).toLocaleString(getLocale()))}`);
      
      if (mode === 'cloud') {
        // 尝试获取云端信息
        diagnosticInfo.push(translations.storeStatus.checkingCloud);
        
        try {
            const cloudInfo = await this.ragService.getStoreInfoFromCloud();
            if (cloudInfo) {
            diagnosticInfo.push(translations.storeStatus.cloudData);
            diagnosticInfo.push(`- **${translations.storeStatus.activeDocuments(cloudInfo.activeDocumentsCount)}`);
            diagnosticInfo.push(`- **${translations.storeStatus.pendingDocuments(cloudInfo.pendingDocumentsCount)}`);
            diagnosticInfo.push(`- **${translations.storeStatus.failedDocuments(cloudInfo.failedDocumentsCount)}`);
            
            if (cloudInfo.activeDocumentsCount === 0) {
                diagnosticInfo.push(`\n${translations.storeStatus.noActiveDocuments}`);
            } else {
                diagnosticInfo.push(`\n${translations.storeStatus.cloudOK}`);
            }
            } else {
            diagnosticInfo.push(`\n${translations.storeStatus.cannotGetCloudInfo}`);
            }
        } catch (error) {
            diagnosticInfo.push(`\n${translations.error(error instanceof Error ? error.message : String(error))}`);
        }
      } else {
          diagnosticInfo.push('\n(Local Store uses local vector database)');
      }
    } else {
      diagnosticInfo.push(translations.storeStatus.storeInfoUnavailable);
      diagnosticInfo.push(translations.storeStatus.possibleReasons);
      diagnosticInfo.push(translations.storeStatus.reason1);
      diagnosticInfo.push(translations.storeStatus.reason2);
      diagnosticInfo.push(translations.storeStatus.reason3);
      diagnosticInfo.push(translations.storeStatus.suggestedActions);
      diagnosticInfo.push(translations.storeStatus.action1);
      diagnosticInfo.push(translations.storeStatus.action2);
      diagnosticInfo.push(translations.storeStatus.action3);
    }

    diagnosticInfo.push(`\n${translations.indexedFiles.title}`);
    const indexedFiles = this.ragService.getIndexedFiles();
    if (indexedFiles.length > 0) {
      diagnosticInfo.push(translations.indexedFiles.hasFiles(indexedFiles.length));
      indexedFiles.slice(0, 10).forEach(file => {
        diagnosticInfo.push(`- ${file.fileName} (${(file.fileSize / 1024).toFixed(2)} KB)`);
      });
      if (indexedFiles.length > 10) {
        diagnosticInfo.push(`\n...${translations.indexedFiles.hasFiles(indexedFiles.length - 10).replace(/✅ \*\*本地记录\*\*: /, '')}`);
      }
    } else {
      diagnosticInfo.push(translations.indexedFiles.noFiles);
      diagnosticInfo.push(translations.indexedFiles.note);
      diagnosticInfo.push(translations.indexedFiles.checkCloud);
    }

    diagnosticInfo.push('\n---\n');
    diagnosticInfo.push(translations.troubleshooting.title);
    diagnosticInfo.push(translations.troubleshooting.step1);
    diagnosticInfo.push(translations.troubleshooting.step2);
    diagnosticInfo.push(translations.troubleshooting.step3);
    diagnosticInfo.push(translations.troubleshooting.step4);
    diagnosticInfo.push(translations.troubleshooting.step5);

    // 显示诊断报告
    const doc = await vscode.workspace.openTextDocument({
      content: diagnosticInfo.join('\n'),
      language: 'markdown',
    });

    await vscode.window.showTextDocument(doc, { preview: false });
  }

  /**
   * 测试 API 连接
   */
  public async testConnection(): Promise<void> {
    const translations = t().rag.testConnection;
    const mode = this.ragService.getMode();

    // Cloud mode checks
    if (mode === 'cloud') {
        if (!this.geminiClient.isInitialized()) {
            await this.geminiClient.initialize();
        }

        if (!this.geminiClient.isInitialized()) {
             vscode.window.showWarningMessage(
                translations.notInitialized.message,
                translations.notInitialized.openSettings
              ).then(action => {
                if (action === translations.notInitialized.openSettings) {
                  vscode.commands.executeCommand('workbench.action.openSettings', 'knowledgeGraph.gemini.apiKey');
                }
              });
              return;
        }
    }

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: translations.testing,
        cancellable: false,
      },
      async () => {
        const success = await this.ragService.testConnection();
        if (success) {
            vscode.window.showInformationMessage(`Connection successful (${mode} mode)`);
        } else {
            vscode.window.showErrorMessage(`Connection failed (${mode} mode). Please check settings.`);
        }
      }
    );
  }

  /**
   * 重新索引所有文档
   */
  public async reindexAll(): Promise<void> {
    const translations = t().rag.reindex;

    const answer = await vscode.window.showWarningMessage(
      translations.confirm.title,
      { modal: true },
      translations.confirm.confirm,
      translations.confirm.cancel
    );

    if (answer !== translations.confirm.confirm) {
      return;
    }

    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(t().common.noWorkspace);
      return;
    }

    try {
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: translations.progress,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ message: translations.deleteCloudStore });
          await new Promise(resolve => setTimeout(resolve, 500));
          
          progress.report({ message: translations.clearLocalDB });
          await new Promise(resolve => setTimeout(resolve, 500));
          
          progress.report({ message: translations.createNewStore });
          await new Promise(resolve => setTimeout(resolve, 500));
          
          progress.report({ message: translations.scanAndUpload });
          await this.ragService.reindexAll();
        }
      );

      vscode.window.showInformationMessage(
        translations.success.message,
        translations.success.viewStoreInfo
      ).then(action => {
        if (action === translations.success.viewStoreInfo) {
          vscode.commands.executeCommand('knowledge.rag.viewStoreInfo');
        }
      });
    } catch (error) {
      console.error('Reindex failed:', error);
      vscode.window.showErrorMessage(translations.error(String(error)));
    }
  }

  /**
   * 查看 Store 信息
   */
  public async viewStoreInfo(): Promise<void> {
    const translations = t().rag.viewStoreInfo;
    const mode = this.ragService.getMode();
    const isCloudMode = mode === 'cloud';

    await vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: translations.title,
      },
      async () => {
        const storeInfo = this.ragService.getStoreInfo();
        
        if (!storeInfo) {
          vscode.window.showWarningMessage(translations.error('Store information unavailable'));
          return;
        }

        // 仅云模式下获取实时信息
        const cloudInfo = isCloudMode ? await this.ragService.getStoreInfoFromCloud() : null;

        // 构建信息文本
        const infoLines: string[] = [
          translations.document.title,
          `**${translations.document.projectName(storeInfo.projectName)}`,
          `**${translations.document.storeName(storeInfo.storeName)}`,
          `**${translations.document.displayName(cloudInfo?.displayName || 'N/A')}`,
          `**${translations.document.workspacePath(storeInfo.workspaceRoot)}`
        ];

        if (isCloudMode) {
          infoLines.push(
            `\n${translations.stats.title}`,
            cloudInfo
              ? [
                  `- **${translations.stats.active(cloudInfo.activeDocumentsCount)}`,
                  `- **${translations.stats.pending(cloudInfo.pendingDocumentsCount)}`,
                  `- **${translations.stats.failed(cloudInfo.failedDocumentsCount)}`,
                  `- **${translations.stats.total(cloudInfo.activeDocumentsCount + cloudInfo.pendingDocumentsCount + cloudInfo.failedDocumentsCount)}`,
                ].join('\n')
              : translations.storeStatus.cannotGetCloudInfo
          );
        }

        infoLines.push(
          `\n${translations.local.title}`,
          `- **${translations.local.fileCount(storeInfo.fileCount)}`,
          `- **${translations.local.createdAt(new Date(storeInfo.createdAt).toLocaleString(getLocale()))}`,
          storeInfo.lastSyncAt 
            ? `- **${translations.local.lastSync(new Date(storeInfo.lastSyncAt).toLocaleString(getLocale()))}` 
            : '',
          `\n---\n`,
          translations.isolation.title,
          translations.isolation.description1,
          translations.isolation.description2,
          translations.isolation.description3,
        );

        if (isCloudMode) {
          infoLines.push(
            `\n${translations.cloud.title}`,
            translations.cloud.description,
            translations.cloud.vectorSearch,
            translations.cloud.autoChunking,
            translations.cloud.multiFormat,
            translations.cloud.noLocalProcessing,
            translations.cloud.tip,
          );
        }

        const content = infoLines.filter(Boolean).join('\n');

        // 显示在新标签页
        const doc = await vscode.workspace.openTextDocument({
          content,
          language: 'markdown',
        });

        await vscode.window.showTextDocument(doc, { preview: false });
      }
    );
  }
}

