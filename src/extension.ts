import * as vscode from 'vscode';
import { DatabaseService } from './services/database';
import { EntityService } from './services/entityService';
import { RelationService } from './services/relationService';
import { ObservationService } from './services/observationService';
import { GeminiClient } from './services/geminiClient';
import { RAGService } from './services/ragService';
import { AutoGraphService, CodeAnalyzer } from './services/autoGraph';
import { KnowledgeHoverProvider } from './providers/hoverProvider';
import { KnowledgeCodeLensProvider } from './providers/codeLensProvider';
import { KnowledgeTreeDataProvider } from './providers/treeDataProvider';
import { RAGTreeDataProvider } from './providers/ragTreeDataProvider';
import { EntityCommands } from './ui/commands/entityCommands';
import { RAGCommands } from './ui/commands/ragCommands';
import { AutoGraphCommands } from './ui/commands/autoGraphCommands';
import { registerScenarioCommands } from './commands/scenarioCommands';
import { ScenarioManager } from './services/scenarioManager';
import { GraphView } from './ui/webview/graphView';
import { I18nService, currentLang } from './i18n/i18nService';
import { Language } from './i18n/types';
import { t } from './i18n/i18nService';

/**
 * 插件激活时调用
 */
export async function activate(context: vscode.ExtensionContext) {
  console.log('Knowledge Graph extension is now active');

  // 初始化 ScenarioManager 并设置扩展路径
  const scenarioManager = ScenarioManager.getInstance();
  scenarioManager.setExtensionPath(context.extensionPath);

  // 初始化国际化服务
  const i18nService = I18nService.getInstance();
  console.log(`Current language: ${i18nService.getCurrentLanguage()}`);

  // 检查是否有工作区
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders) {
    vscode.window.showWarningMessage(t().extension.noWorkspace);
    // 注册占位命令，避免命令未定义错误
    registerPlaceholderCommands(context);
    return;
  }

  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  console.log('Workspace root:', workspaceRoot);

  try {
    // 初始化服务层
    console.log('Initializing database...');
    const dbService = new DatabaseService();
    await dbService.initialize(workspaceRoot);
    console.log('Database initialized successfully');

    const entityService = new EntityService(dbService);
    const relationService = new RelationService(dbService, entityService);
    const observationService = new ObservationService(dbService, entityService);

    // 初始化 Gemini 客户端和 RAG 服务
    const geminiClient = new GeminiClient();
    const ragService = new RAGService(dbService, geminiClient);

    // 尝试初始化 Gemini 客户端和 RAG 服务（可选功能）
    let ragInitialized = false;
    try {
      // 先尝试初始化 Gemini，无论是否使用
      const geminiInitialized = await geminiClient.initialize(true);
      console.log(`Gemini client initialized: ${geminiInitialized}`);

      // 获取 RAG 模式
      const config = vscode.workspace.getConfiguration('knowledgeGraph.rag');
      const mode = config.get<string>('mode', 'cloud');

      // 决定是否初始化 RAG Service
      let shouldInitRAG = false;
      if (mode === 'local') {
        shouldInitRAG = true;
      } else {
        // Cloud 模式需要 Gemini 初始化成功
        if (geminiInitialized) {
          shouldInitRAG = true;
        } else {
          console.log('⚠️ Cloud RAG Service not initialized (Gemini API Key not configured)');
          vscode.window.showWarningMessage(
            t().extension.rag.notEnabled.title,
            t().extension.rag.notEnabled.configure,
            t().extension.rag.notEnabled.viewTutorial
          ).then(action => {
            if (action === t().extension.rag.notEnabled.configure) {
              vscode.commands.executeCommand('workbench.action.openSettings', 'knowledgeGraph.gemini.apiKey');
            } else if (action === t().extension.rag.notEnabled.viewTutorial) {
              vscode.env.openExternal(vscode.Uri.parse('https://makersuite.google.com/app/apikey'));
            }
          });
        }
      }

      if (shouldInitRAG) {
        await ragService.initialize(workspaceRoot);
        console.log('✅ RAG Service initialized successfully');
        ragInitialized = true;

        // 显示初始化成功的弹窗
        vscode.window.showInformationMessage(
          t().extension.rag.enabled,
          t().extension.rag.viewStoreInfo
        ).then(action => {
          if (action === t().extension.rag.viewStoreInfo) {
            vscode.commands.executeCommand('knowledge.rag.viewStoreInfo');
          }
        });
      }
    } catch (error) {
      console.error('⚠️ RAG Service initialization failed:', error);

      // 显示详细的错误信息
      const errorMessage = error instanceof Error ? error.message : String(error);
      vscode.window.showErrorMessage(
        t().extension.rag.initializationFailed(errorMessage),
        t().extension.rag.viewLogs,
        t().extension.rag.retry
      ).then(action => {
        if (action === t().extension.rag.viewLogs) {
          vscode.commands.executeCommand('workbench.action.output.show');
        } else if (action === t().extension.rag.retry) {
          vscode.commands.executeCommand('workbench.action.reloadWindow');
        }
      });
      // RAG 功能是可选的，初始化失败不影响主功能
    }

    // 监听配置变化，当 API Key 改变时重新初始化
    context.subscriptions.push(
      vscode.workspace.onDidChangeConfiguration(async (e) => {
        if (e.affectsConfiguration('knowledgeGraph.gemini.apiKey')) {
          console.log('Gemini API Key changed, reinitializing...');

          try {
            const success = await geminiClient.initialize(true);
            if (success) {
              // 重新初始化 RAG Service
              await ragService.initialize(workspaceRoot);

              vscode.window.showInformationMessage(
                t().extension.rag.reconnected,
                t().extension.rag.viewStoreInfo
              ).then(action => {
                if (action === t().extension.rag.viewStoreInfo) {
                  vscode.commands.executeCommand('knowledge.rag.viewStoreInfo');
                }
              });

              ragTreeDataProvider.refresh();
            } else {
              vscode.window.showWarningMessage(t().extension.rag.invalidKey);
            }
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            vscode.window.showErrorMessage(t().extension.rag.initializationFailed(errorMessage));
          }
        }
      })
    );

    // 初始化自动图谱服务（需要在 EntityCommands 之前初始化）
    const autoGraphService = new AutoGraphService(dbService);
    const codeAnalyzer = new CodeAnalyzer(autoGraphService);
    codeAnalyzer.initialize(workspaceRoot);
    const autoGraphCommands = new AutoGraphCommands(autoGraphService, codeAnalyzer);
    
    // 设置 AutoGraphService 到 GraphView 以支持视图切换
    GraphView.setAutoGraphService(autoGraphService);

    // 初始化命令处理器
    const entityCommands = new EntityCommands(
      entityService,
      relationService,
      observationService,
      autoGraphService
    );

    const ragCommands = new RAGCommands(ragService, geminiClient);

    // 注册树视图
    const treeDataProvider = new KnowledgeTreeDataProvider(
      entityService,
      relationService,
      observationService
    );
    treeDataProvider.setAutoGraphService(autoGraphService);
    const treeView = vscode.window.createTreeView('knowledgeGraphExplorer', {
      treeDataProvider,
      showCollapseAll: true,
    });
    treeDataProvider.setTreeView(treeView);
    context.subscriptions.push(treeView);

    // 注册 RAG 树视图
    const ragTreeDataProvider = new RAGTreeDataProvider(ragService);
    const ragTreeView = vscode.window.createTreeView('knowledgeRAGExplorer', {
      treeDataProvider: ragTreeDataProvider,
      showCollapseAll: true,
    });
    ragTreeDataProvider.setTreeView(ragTreeView);
    context.subscriptions.push(ragTreeView);

    // 注册 CodeLens Provider
    const codeLensProvider = new KnowledgeCodeLensProvider(
      entityService,
      relationService,
      observationService
    );
    context.subscriptions.push(
      vscode.languages.registerCodeLensProvider(
        { scheme: 'file' },
        codeLensProvider
      )
    );

    // 注册命令
    console.log('Registering commands...');
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.createEntity',
        async () => {
          try {
            console.log('Executing: knowledge.createEntity');
            await entityCommands.createEntityFromSelection();
            // 刷新树视图和 CodeLens
            treeDataProvider.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in createEntity:', error);
            vscode.window.showErrorMessage(`Error creating entity: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.addObservation',
        async (entityId?: string) => {
          try {
            console.log('Executing: knowledge.addObservation');
            await entityCommands.addObservationToEntity(entityId);
            // 刷新 CodeLens 显示更新的统计
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in addObservation:', error);
            vscode.window.showErrorMessage(`Error adding observation: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.editObservation',
        async (treeItem) => {
          try {
            console.log('Executing: knowledge.editObservation');
            await entityCommands.editObservation(treeItem);
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in editObservation:', error);
            vscode.window.showErrorMessage(`Error editing observation: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.addRelation',
        async () => {
          try {
            console.log('Executing: knowledge.addRelation');
            await entityCommands.addRelation();
            // 刷新树视图和 CodeLens 显示新的关系
            treeDataProvider.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in addRelation:', error);
            vscode.window.showErrorMessage(`Error adding relation: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.viewEntityDetails',
        async (entityId?: string) => {
          try {
            console.log('Executing: knowledge.viewEntityDetails');
            await entityCommands.viewEntityDetails(entityId);
          } catch (error) {
            console.error('Error in viewEntityDetails:', error);
            vscode.window.showErrorMessage(`Error viewing entity: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.jumpToEntity',
        async (entity) => {
          try {
            console.log('Executing: knowledge.jumpToEntity');
            await entityCommands.jumpToEntity(entity);
          } catch (error) {
            console.error('Error in jumpToEntity:', error);
            vscode.window.showErrorMessage(`Error jumping to entity: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.searchGraph',
        async () => {
          try {
            console.log('Executing: knowledge.searchGraph');
            await entityCommands.searchGraph();
          } catch (error) {
            console.error('Error in searchGraph:', error);
            vscode.window.showErrorMessage(`Error searching graph: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.deleteEntity',
        async (treeItem) => {
          try {
            console.log('Executing: knowledge.deleteEntity');
            await entityCommands.deleteEntity(treeItem);
            // 刷新树视图和 CodeLens
            treeDataProvider.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in deleteEntity:', error);
            vscode.window.showErrorMessage(`Error deleting entity: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.deleteRelation',
        async () => {
          try {
            console.log('Executing: knowledge.deleteRelation');
            await entityCommands.deleteRelation();
            // 刷新树视图和 CodeLens
            treeDataProvider.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in deleteRelation:', error);
            vscode.window.showErrorMessage(`Error deleting relation: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.deleteRelationFromTree',
        async (treeItem) => {
          try {
            console.log('Executing: knowledge.deleteRelationFromTree');
            await entityCommands.deleteRelationFromTree(treeItem);
            // 刷新树视图和 CodeLens
            treeDataProvider.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in deleteRelationFromTree:', error);
            vscode.window.showErrorMessage(`Error deleting relation: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.deleteObservation',
        async () => {
          try {
            console.log('Executing: knowledge.deleteObservation');
            await entityCommands.deleteObservation();
            // 刷新树视图和 CodeLens
            treeDataProvider.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in deleteObservation:', error);
            vscode.window.showErrorMessage(`Error deleting observation: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.linkToEntity',
        async () => {
          try {
            console.log('Executing: knowledge.linkToEntity');
            await entityCommands.linkToEntity();
            // 刷新树视图和 CodeLens 显示新的关系
            treeDataProvider.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error in linkToEntity:', error);
            vscode.window.showErrorMessage(`Error linking to entity: ${error}`);
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.visualizeGraph', () => {
        try {
          console.log('Executing: knowledge.visualizeGraph');
          GraphView.createOrShow(
            context.extensionUri,
            entityService,
            relationService,
            observationService
          );
        } catch (error) {
          console.error('Error in visualizeGraph:', error);
          vscode.window.showErrorMessage(`Error opening graph: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.exportGraph', async () => {
        try {
          console.log('Executing: knowledge.exportGraph');
          await entityCommands.exportGraph();
        } catch (error) {
          console.error('Error in exportGraph:', error);
          vscode.window.showErrorMessage(`Error exporting graph: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.importGraph', () => {
        vscode.window.showInformationMessage('Import Graph - Coming soon!');
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.clearGraph', async () => {
        const answer = await vscode.window.showWarningMessage(
          'Are you sure you want to clear the entire knowledge graph?',
          'Yes', 'No'
        );
        if (answer === 'Yes') {
          vscode.window.showInformationMessage('Clear Graph - Coming soon!');
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.settings', () => {
        vscode.window.showInformationMessage('Settings - Coming soon!');
      })
    );

    // AI 集成命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.generateCursorRules', async () => {
        try {
          console.log('Executing: knowledge.generateCursorRules');
          await entityCommands.generateCursorRules();
        } catch (error) {
          console.error('Error in generateCursorRules:', error);
          vscode.window.showErrorMessage(`Error generating Cursor Rules: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.generateCopilotInstructions', async () => {
        try {
          console.log('Executing: knowledge.generateCopilotInstructions');
          await entityCommands.generateCopilotInstructions();
        } catch (error) {
          console.error('Error in generateCopilotInstructions:', error);
          vscode.window.showErrorMessage(`Error generating Copilot Instructions: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.generateAllAIConfigs', async () => {
        try {
          console.log('Executing: knowledge.generateAllAIConfigs');
          await entityCommands.generateAllAIConfigs();
        } catch (error) {
          console.error('Error in generateAllAIConfigs:', error);
          vscode.window.showErrorMessage(`Error generating AI configs: ${error}`);
        }
      })
    );

    // 快速上下文导出命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.copyEntityContext', async (entityId?: string) => {
        try {
          console.log('Executing: knowledge.copyEntityContext');
          await entityCommands.copyEntityContext(entityId);
        } catch (error) {
          console.error('Error in copyEntityContext:', error);
          vscode.window.showErrorMessage(`Error copying entity context: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.exportCurrentFileContext', async () => {
        try {
          console.log('Executing: knowledge.exportCurrentFileContext');
          await entityCommands.exportCurrentFileContext();
        } catch (error) {
          console.error('Error in exportCurrentFileContext:', error);
          vscode.window.showErrorMessage(`Error exporting file context: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.generateAISummary', async () => {
        try {
          console.log('Executing: knowledge.generateAISummary');
          await entityCommands.generateAISummary();
        } catch (error) {
          console.error('Error in generateAISummary:', error);
          vscode.window.showErrorMessage(`Error generating AI summary: ${error}`);
        }
      })
    );

    // 注册 Hover Provider
    const hoverProvider = new KnowledgeHoverProvider(
      entityService,
      relationService,
      observationService
    );
    context.subscriptions.push(
      vscode.languages.registerHoverProvider(
        { scheme: 'file' },
        hoverProvider
      )
    );

    // 注册刷新命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.refresh', () => {
        treeDataProvider.refresh();
        codeLensProvider.refresh();
        vscode.window.showInformationMessage('Knowledge Graph refreshed');
      })
    );

    // RAG 命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.rag.askQuestion', async () => {
        try {
          await ragCommands.askQuestion();
        } catch (error) {
          console.error('Error in askQuestion:', error);
          vscode.window.showErrorMessage(t().rag.askQuestion.error(String(error)));
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.rag.viewIndexedDocuments', async () => {
        try {
          await ragCommands.viewIndexedDocuments();
        } catch (error) {
          console.error('Error in viewIndexedDocuments:', error);
          vscode.window.showErrorMessage(t().rag.viewIndexedDocuments.error(String(error)));
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.rag.testConnection', async () => {
        try {
          await ragCommands.testConnection();
        } catch (error) {
          console.error('Error in testConnection:', error);
          vscode.window.showErrorMessage(t().rag.testConnection.error(String(error)));
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.rag.diagnose', async () => {
        try {
          await ragCommands.diagnoseRAGStatus();
        } catch (error) {
          console.error('Error in diagnoseRAGStatus:', error);
          vscode.window.showErrorMessage(t().rag.diagnose.error(String(error)));
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.rag.openDocument', async (filePath: string) => {
        try {
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (workspaceFolder) {
            const uri = vscode.Uri.joinPath(workspaceFolder.uri, filePath);
            const doc = await vscode.workspace.openTextDocument(uri);
            await vscode.window.showTextDocument(doc);
          }
        } catch (error) {
          console.error('Error opening document:', error);
          vscode.window.showErrorMessage(t().rag.openDocument.error(String(error)));
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.rag.refresh', async () => {
        try {
          await ragCommands.reindexAll();
          // 刷新树视图以显示更新
          ragTreeDataProvider.refresh();
        } catch (error) {
          console.error('Error in reindexAll:', error);
          vscode.window.showErrorMessage(t().rag.reindex.error(String(error)));
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.rag.viewStoreInfo', async () => {
        try {
          await ragCommands.viewStoreInfo();
        } catch (error) {
          console.error('Error in viewStoreInfo:', error);
          vscode.window.showErrorMessage(t().rag.viewStoreInfo.error(String(error)));
        }
      })
    );

    // 自动图谱命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.autoGraph.analyzeWorkspace', async () => {
        try {
          await autoGraphCommands.analyzeWorkspace();
          treeDataProvider.refresh();
        } catch (error) {
          console.error('Error in analyzeWorkspace:', error);
          vscode.window.showErrorMessage(`Error analyzing workspace: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.autoGraph.analyzeCurrentFile', async () => {
        try {
          await autoGraphCommands.analyzeCurrentFile();
          treeDataProvider.refresh();
        } catch (error) {
          console.error('Error in analyzeCurrentFile:', error);
          vscode.window.showErrorMessage(`Error analyzing file: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.autoGraph.clear', async () => {
        try {
          await autoGraphCommands.clearAutoGraph();
          treeDataProvider.refresh();
        } catch (error) {
          console.error('Error in clearAutoGraph:', error);
          vscode.window.showErrorMessage(`Error clearing auto graph: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.autoGraph.viewStats', async () => {
        try {
          await autoGraphCommands.viewAutoGraphStats();
        } catch (error) {
          console.error('Error in viewAutoGraphStats:', error);
          vscode.window.showErrorMessage(`Error viewing stats: ${error}`);
        }
      })
    );

    // 自动图谱观察记录命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.autoGraph.addObservation', async (treeItem?: any) => {
        try {
          // 从树视图项获取实体 ID
          const entityId = treeItem?.entity?.id || (typeof treeItem === 'string' ? treeItem : undefined);
          await autoGraphCommands.addObservationToAutoEntity(entityId);
          treeDataProvider.refresh();
        } catch (error) {
          console.error('Error in autoGraph.addObservation:', error);
          vscode.window.showErrorMessage(`Error adding observation: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.autoGraph.editObservation', async (treeItem?: any) => {
        try {
          // 从树视图项获取观察记录 ID
          const observationId = treeItem?.observationData?.id || (typeof treeItem === 'string' ? treeItem : undefined);
          if (!observationId) {
            vscode.window.showWarningMessage('No observation selected');
            return;
          }
          await autoGraphCommands.editAutoObservation(observationId);
          treeDataProvider.refresh();
        } catch (error) {
          console.error('Error in autoGraph.editObservation:', error);
          vscode.window.showErrorMessage(`Error editing observation: ${error}`);
        }
      })
    );

    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.autoGraph.deleteObservation', async (treeItem?: any) => {
        try {
          // 从树视图项获取观察记录 ID
          const observationId = treeItem?.observationData?.id || (typeof treeItem === 'string' ? treeItem : undefined);
          if (!observationId) {
            vscode.window.showWarningMessage('No observation selected');
            return;
          }
          await autoGraphCommands.deleteAutoObservation(observationId);
          treeDataProvider.refresh();
        } catch (error) {
          console.error('Error in autoGraph.deleteObservation:', error);
          vscode.window.showErrorMessage(`Error deleting observation: ${error}`);
        }
      })
    );

    // 监听文件保存事件，自动分析
    const autoAnalyzeConfig = vscode.workspace.getConfiguration('knowledgeGraph.autoAnalyze');
    if (autoAnalyzeConfig.get<boolean>('enabled') && autoAnalyzeConfig.get<boolean>('onSave')) {
      context.subscriptions.push(
        vscode.workspace.onDidSaveTextDocument(async (document) => {
          const filePath = document.uri.fsPath;
          if (codeAnalyzer['isAnalyzableFile'] && 
              (filePath.endsWith('.ts') || filePath.endsWith('.tsx') || 
               filePath.endsWith('.js') || filePath.endsWith('.jsx'))) {
            try {
              await codeAnalyzer.analyzeFile(document.uri);
              treeDataProvider.refresh();
            } catch (error) {
              console.error('Auto-analyze on save failed:', error);
            }
          }
        })
      );
    }

    // 场景切换命令
    registerScenarioCommands(context);

    // 创建状态栏显示当前场景
    const scenarioStatusBar = vscode.window.createStatusBarItem(
    );

    // 切换语言命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.switchLanguage', async () => {
        try {
          const i18nService = I18nService.getInstance();
          const currentLang = i18nService.getCurrentLanguage();
          const availableLangs = i18nService.getAvailableLanguages();

          const selected = await vscode.window.showQuickPick(
            availableLangs.map(lang => ({
              label: lang.label,
              code: lang.code,
              picked: lang.code === currentLang
            })),
            {
              placeHolder: t().commands.switchLanguage.placeholder
            }
          );

          if (selected && selected.code !== currentLang) {
            await i18nService.setLanguage(selected.code as Language);
          }
        } catch (error) {
          console.error('Error in switchLanguage:', error);
          vscode.window.showErrorMessage(t().commands.switchLanguage.error(String(error)));
        }
      })
    );

    // 展开所有命令
    context.subscriptions.push(
      vscode.commands.registerCommand('knowledge.expandAll', async () => {
        try {
          await treeDataProvider.expandAll();
          await ragTreeDataProvider.expandAll();
        } catch (error) {
          console.error('Error in expandAll:', error);
        }
      })
    );

    // 清理资源
    context.subscriptions.push({
      dispose: () => {
        dbService.close();
        ragService.dispose();
      },
    });

    console.log('All commands registered successfully');
    vscode.window.showInformationMessage(t().extension.activated);
  } catch (error) {
    console.error('Failed to activate Knowledge Graph:', error);
    vscode.window.showErrorMessage(`Failed to activate Knowledge Graph: ${error}`);
    // 即使激活失败，也注册占位命令
    registerPlaceholderCommands(context);
  }
}

/**
 * 注册占位命令
 */
function registerPlaceholderCommands(context: vscode.ExtensionContext) {
  const placeholderCommands = [
    'knowledge.createEntity',
    'knowledge.addObservation',
    'knowledge.addRelation',
    'knowledge.viewEntityDetails',
    'knowledge.jumpToEntity',
    'knowledge.searchGraph',
    'knowledge.deleteEntity',
    'knowledge.deleteRelation',
    'knowledge.deleteObservation',
    'knowledge.linkToEntity',
    'knowledge.visualizeGraph',
    'knowledge.exportGraph',
    'knowledge.importGraph',
    'knowledge.clearGraph',
    'knowledge.settings',
    'knowledge.refresh',
    'knowledge.deleteRelationFromTree',
    'knowledge.generateCursorRules',
    'knowledge.generateCopilotInstructions',
    'knowledge.generateAllAIConfigs',
    'knowledge.copyEntityContext',
    'knowledge.exportCurrentFileContext',
    'knowledge.generateAISummary',
    'knowledge.rag.askQuestion',
    'knowledge.rag.viewIndexedDocuments',
    'knowledge.rag.testConnection',
    'knowledge.rag.openDocument',
    'knowledge.rag.refresh',
    'knowledge.rag.viewStoreInfo',
    'knowledge.switchLanguage',
    'knowledge.expandAll',
    'knowledge.switchAIScenario',
    'knowledge.showCurrentScenario',
    'knowledge.autoGraph.analyzeWorkspace',
    'knowledge.autoGraph.analyzeCurrentFile',
    'knowledge.autoGraph.clear',
    'knowledge.autoGraph.viewStats',
  ];

  placeholderCommands.forEach(commandId => {
    context.subscriptions.push(
      vscode.commands.registerCommand(commandId, () => {
        vscode.window.showWarningMessage('Please open a folder to use Knowledge Graph features');
      })
    );
  });
}

/**
 * 插件停用时调用
 */
export function deactivate() {
  console.log('Knowledge Graph extension is now deactivated');
}

