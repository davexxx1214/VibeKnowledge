import * as vscode from 'vscode';
import { DatabaseService } from './services/database';
import { EntityService } from './services/entityService';
import { RelationService } from './services/relationService';
import { ObservationService } from './services/observationService';
import { GeminiClient } from './services/geminiClient';
import { RAGService } from './services/ragService';
import {
  AgentEntityOverrideService,
  AgentGraphService,
} from './services/agentGraph';
import { AgentSkillService } from './services/agentSkillService';
import { KnowledgeGraphService } from './services/knowledgeGraphService';
import {
  CuratedGraphService,
  DebouncedStructuralGraphUpdater,
  StructuralGraphService,
} from './services/structuralGraph';
import { KnowledgeHoverProvider } from './providers/hoverProvider';
import { KnowledgeCodeLensProvider } from './providers/codeLensProvider';
import { KnowledgeTreeDataProvider } from './providers/treeDataProvider';
import { RAGTreeDataProvider } from './providers/ragTreeDataProvider';
import { EntityCommands } from './ui/commands/entityCommands';
import { RAGCommands } from './ui/commands/ragCommands';
import { registerScenarioCommands } from './commands/scenarioCommands';
import { ScenarioManager } from './services/scenarioManager';
import { GraphView } from './ui/webview/graphView';
import { I18nService } from './i18n/i18nService';
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

    // Agent 刷新生成清单；人工描述保存在 SQLite 覆盖层并始终优先。
    const agentEntityOverrides = new AgentEntityOverrideService(dbService);
    const agentGraphService = new AgentGraphService(
      workspaceRoot,
      agentEntityOverrides
    );
    const knowledgeGraphService = new KnowledgeGraphService(agentGraphService);
    const agentSkillService = new AgentSkillService(context.extensionPath);
    const structuralGraphService = new StructuralGraphService(workspaceRoot);
    const curatedGraphService = new CuratedGraphService(workspaceRoot);
    const structuralGraphUpdater = new DebouncedStructuralGraphUpdater(
      async (changedPaths) => {
        if (!structuralGraphService.hasGraph()) {
          return;
        }
        try {
          structuralGraphService.generate();
          const statistics = structuralGraphService.getLastStatistics();
          console.log(
            `Structural graph incrementally refreshed after ${changedPaths.length} source event(s):`,
            statistics
          );
        } catch (error) {
          console.warn(
            'Structural graph background refresh was skipped; the previous graph was preserved:',
            error
          );
        }
      },
      500
    );
    const structuralSourceWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        workspaceFolders[0],
        '**/*.{ts,tsx,js,jsx,html,htm}'
      )
    );
    const structuralConfigWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        workspaceFolders[0],
        '**/{tsconfig,jsconfig}*.json'
      )
    );
    const queueStructuralRefresh = (uri: vscode.Uri) => {
      const relativePath = vscode.workspace
        .asRelativePath(uri, false)
        .replace(/\\/g, '/');
      if (
        relativePath.startsWith('../') ||
        /(^|\/)(node_modules|dist|out|build|coverage|\.git|\.vscode)(\/|$)/.test(
          relativePath
        )
      ) {
        return;
      }
      structuralGraphUpdater.notify(relativePath);
    };
    context.subscriptions.push(
      structuralGraphUpdater,
      structuralSourceWatcher,
      structuralConfigWatcher,
      structuralSourceWatcher.onDidCreate(queueStructuralRefresh),
      structuralSourceWatcher.onDidChange(queueStructuralRefresh),
      structuralSourceWatcher.onDidDelete(queueStructuralRefresh),
      structuralConfigWatcher.onDidCreate(queueStructuralRefresh),
      structuralConfigWatcher.onDidChange(queueStructuralRefresh),
      structuralConfigWatcher.onDidDelete(queueStructuralRefresh)
    );
    GraphView.setKnowledgeGraphService(knowledgeGraphService);
    GraphView.setStructuralGraphService(structuralGraphService);

    // 初始化命令处理器
    const entityCommands = new EntityCommands(
      entityService,
      relationService,
      observationService,
      knowledgeGraphService
    );
    const showAgentManagedGraphNotice = () =>
      vscode.window.showInformationMessage(t().commands.agentManagedStructure);

    const ragCommands = new RAGCommands(ragService, geminiClient);

    // 注册树视图
    const treeDataProvider = new KnowledgeTreeDataProvider(knowledgeGraphService);
    const treeView = vscode.window.createTreeView('knowledgeGraphExplorer', {
      treeDataProvider,
      showCollapseAll: true,
    });
    context.subscriptions.push(treeView);

    // Agent 写入 sidecar 后立即刷新树和已打开的图谱视图。
    const agentGraphWatcher = vscode.workspace.createFileSystemWatcher(
      new vscode.RelativePattern(
        workspaceFolders[0],
        '.vscode/.knowledge/agent-graph.json'
      )
    );
    const refreshAgentGraph = () => {
      treeDataProvider.refresh();
      GraphView.refresh();
      codeLensProvider.refresh();
    };
    context.subscriptions.push(
      agentGraphWatcher,
      agentGraphWatcher.onDidCreate(refreshAgentGraph),
      agentGraphWatcher.onDidChange(refreshAgentGraph),
      agentGraphWatcher.onDidDelete(refreshAgentGraph)
    );

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
      knowledgeGraphService
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
        'knowledge.addObservation',
        async () => {
          try {
            console.log('Executing: knowledge.addObservation');
            await showAgentManagedGraphNotice();
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
        async () => {
          try {
            console.log('Executing: knowledge.editObservation');
            await showAgentManagedGraphNotice();
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
        'knowledge.generateStructuralGraph',
        async () => {
          const translations = t().commands.generateStructuralGraph;
          try {
            const generate = (force = false) =>
              vscode.window.withProgress(
                {
                  location: vscode.ProgressLocation.Notification,
                  title: translations.progress,
                  cancellable: false,
                },
                async () => structuralGraphService.generate({ force })
              );
            let graph;
            try {
              graph = await generate();
            } catch (error) {
              if (!isStructuralGraphRecoveryError(error)) {
                throw error;
              }
              const action = await vscode.window.showWarningMessage(
                translations.recoveryRequired(String(error)),
                { modal: true },
                translations.forceRebuild,
                translations.cancel
              );
              if (action !== translations.forceRebuild) {
                return;
              }
              graph = await generate(true);
            }
            const action = await vscode.window.showInformationMessage(
              translations.success(
                graph.files.length,
                graph.entities.length,
                graph.relations.length,
                graph.diagnostics.length
              ),
              translations.openGraph
            );
            if (action === translations.openGraph) {
              const document = await vscode.workspace.openTextDocument(
                structuralGraphService.getOutputPath()
              );
              await vscode.window.showTextDocument(document);
            }
          } catch (error) {
            console.error('Error generating structural graph:', error);
            vscode.window.showErrorMessage(translations.error(String(error)));
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.curateStructuralGraph',
        async () => {
          const translations = t().commands.curateStructuralGraph;
          try {
            const selection = await vscode.window.showQuickPick(
              [
                {
                  label: translations.frameworkKind,
                  description: translations.frameworkDescription,
                  kind: 'framework' as const,
                },
                {
                  label: translations.moduleKind,
                  description: translations.moduleDescription,
                  kind: 'module' as const,
                },
                {
                  label: translations.featureKind,
                  description: translations.featureDescription,
                  kind: 'feature' as const,
                },
              ],
              { placeHolder: translations.kindPlaceholder }
            );
            if (!selection) {
              return;
            }

            let scope: string | undefined;
            let key: string | undefined;
            let name: string | undefined;
            if (selection.kind !== 'framework') {
              const activeRelativePath = vscode.window.activeTextEditor
                ? vscode.workspace
                    .asRelativePath(
                      vscode.window.activeTextEditor.document.uri,
                      false
                    )
                    .replace(/\\/g, '/')
                : '';
              const separatorIndex = activeRelativePath.lastIndexOf('/');
              const suggestedScope =
                separatorIndex > 0
                  ? activeRelativePath.slice(0, separatorIndex)
                  : undefined;
              scope = await vscode.window.showInputBox({
                title: translations.scopePrompt,
                prompt: translations.scopePrompt,
                placeHolder: translations.scopePlaceholder,
                value: suggestedScope,
                validateInput: (value) =>
                  !value.trim() || value.trim() === '.'
                    ? translations.scopeRequired
                    : undefined,
              });
              if (!scope) {
                return;
              }
              scope = scope.trim().replace(/\\/g, '/').replace(/^\.\//, '');
              const suggestedKey =
                scope
                  .split('/')
                  .filter(Boolean)
                  .pop()
                  ?.toLocaleLowerCase()
                  .replace(/[^\p{L}\p{N}]+/gu, '-') ?? '';
              key = await vscode.window.showInputBox({
                title: translations.keyPrompt,
                prompt: translations.keyPrompt,
                placeHolder: translations.keyPlaceholder,
                value: suggestedKey,
                validateInput: (value) =>
                  value.trim() ? undefined : translations.keyRequired,
              });
              if (!key) {
                return;
              }
              key = key.trim();
              name = await vscode.window.showInputBox({
                title: translations.namePrompt,
                prompt: translations.namePrompt,
                value: key,
              });
              if (name === undefined) {
                return;
              }
              name = name.trim() || key;
            }

            const run = (force = false) =>
              vscode.window.withProgress(
                {
                  location: vscode.ProgressLocation.Notification,
                  title: translations.progress,
                  cancellable: false,
                },
                async () => {
                  const graph = structuralGraphService.generate({ force });
                  return curatedGraphService.curate(graph, {
                    kind: selection.kind,
                    scope,
                    key,
                    name,
                  });
                }
              );
            let result;
            try {
              result = await run();
            } catch (error) {
              if (!isStructuralGraphRecoveryError(error)) {
                throw error;
              }
              const action = await vscode.window.showWarningMessage(
                translations.recoveryRequired(String(error)),
                { modal: true },
                translations.forceRebuild,
                translations.cancel
              );
              if (action !== translations.forceRebuild) {
                return;
              }
              result = await run(true);
            }

            agentGraphService.refresh();
            treeDataProvider.refresh();
            GraphView.refresh();
            codeLensProvider.refresh();
            const action = await vscode.window.showInformationMessage(
              translations.success(
                result.group.name,
                result.group.entities.length,
                result.group.relations.length
              ),
              translations.openGraph
            );
            if (action === translations.openGraph) {
              const document = await vscode.workspace.openTextDocument(
                curatedGraphService.getOutputPath()
              );
              await vscode.window.showTextDocument(document);
            }
          } catch (error) {
            console.error('Error curating structural graph:', error);
            vscode.window.showErrorMessage(translations.error(String(error)));
          }
        }
      )
    );

    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.editEntityDescription',
        async (treeItem) => {
          try {
            await entityCommands.editEntityDescription(treeItem);
            treeDataProvider.refresh();
            GraphView.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error editing entity description:', error);
            vscode.window.showErrorMessage(`Error editing description: ${error}`);
          }
        }
      ),
      vscode.commands.registerCommand(
        'knowledge.resetEntityDescription',
        async (treeItem) => {
          try {
            await entityCommands.resetEntityDescription(treeItem);
            treeDataProvider.refresh();
            GraphView.refresh();
            codeLensProvider.refresh();
          } catch (error) {
            console.error('Error resetting entity description:', error);
            vscode.window.showErrorMessage(`Error resetting description: ${error}`);
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
        'knowledge.deleteObservation',
        async () => {
          try {
            console.log('Executing: knowledge.deleteObservation');
            await showAgentManagedGraphNotice();
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
      vscode.commands.registerCommand('knowledge.visualizeGraph', () => {
        try {
          console.log('Executing: knowledge.visualizeGraph');
          GraphView.createOrShow(context.extensionUri);
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
    const hoverProvider = new KnowledgeHoverProvider(knowledgeGraphService);
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

    // 将内置 Agent Skill 安装到当前项目的标准 .agents/skills 目录。
    context.subscriptions.push(
      vscode.commands.registerCommand(
        'knowledge.installDependencyGraphSkill',
        async () => {
          const translations = t().commands.installDependencyGraphSkill;
          try {
            let overwrite = false;
            if (agentSkillService.isInstalled(workspaceRoot)) {
              const action = await vscode.window.showWarningMessage(
                translations.alreadyInstalled,
                { modal: true },
                translations.update,
                translations.cancel
              );
              if (action !== translations.update) {
                return;
              }
              overwrite = true;
            }

            const skillPath = agentSkillService.install(workspaceRoot, overwrite);
            const action = await vscode.window.showInformationMessage(
              translations.success,
              translations.openSkill
            );
            if (action === translations.openSkill) {
              const document = await vscode.workspace.openTextDocument(skillPath);
              await vscode.window.showTextDocument(document);
            }
          } catch (error) {
            console.error('Error installing dependency graph skill:', error);
            vscode.window.showErrorMessage(translations.error(String(error)));
          }
        }
      )
    );

    // 场景切换命令
    registerScenarioCommands(context);

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

function isStructuralGraphRecoveryError(
  error: unknown
): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: unknown }).code ===
      'STRUCTURAL_GRAPH_RECOVERY_REQUIRED'
  );
}

/**
 * 注册占位命令
 */
function registerPlaceholderCommands(context: vscode.ExtensionContext) {
  const placeholderCommands = [
    'knowledge.addObservation',
    'knowledge.viewEntityDetails',
    'knowledge.jumpToEntity',
    'knowledge.searchGraph',
    'knowledge.deleteObservation',
    'knowledge.visualizeGraph',
    'knowledge.exportGraph',
    'knowledge.settings',
    'knowledge.refresh',
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
    'knowledge.installDependencyGraphSkill',
    'knowledge.generateStructuralGraph',
    'knowledge.curateStructuralGraph',
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

