import * as vscode from 'vscode';
import * as path from 'path';
import { KnowledgeGraphService } from '../services/knowledgeGraphService';
import { buildKnowledgeCodeLensModels } from './knowledgeCodeLensModel';

/**
 * CodeLens 提供者
 * 在代码上方显示实体的统计信息
 */
export class KnowledgeCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(private readonly graphService: KnowledgeGraphService) {}

  public provideCodeLenses(
    document: vscode.TextDocument,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.CodeLens[]> {
    const codeLenses: vscode.CodeLens[] = [];

    // 获取当前文件的所有实体
    const relativePath = this.getRelativePath(document);
    if (!relativePath) {
      return codeLenses;
    }
    
    const models = buildKnowledgeCodeLensModels(
      this.graphService.getEntitiesByFile(relativePath),
      this.graphService.listRelations(),
      document.lineCount,
      (entityId) => this.graphService.getObservations(entityId).length
    );

    for (const model of models) {
      const range = new vscode.Range(
        model.line,
        0,
        model.line,
        0
      );
      const codeLens = new vscode.CodeLens(range, {
        title: model.title,
        tooltip: 'Edit knowledge graph description',
        command: 'knowledge.editEntityDescription',
        arguments: [model.entityId],
      });

      codeLenses.push(codeLens);
    }

    return codeLenses;
  }

  /**
   * 获取文件相对于工作区的路径
   */
  private getRelativePath(document: vscode.TextDocument): string | null {
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(document.uri);
    if (!workspaceFolder) {
      return null;
    }
    
    // 使用 path.relative 计算相对路径，确保返回字符串
    const absolutePath = document.uri.fsPath;
    const workspacePath = workspaceFolder.uri.fsPath;
    const relativePath = path.relative(workspacePath, absolutePath);
    
    // 统一使用正斜杠（跨平台兼容）
    return relativePath.replace(/\\/g, '/');
  }

  public refresh(): void {
    this._onDidChangeCodeLenses.fire();
  }
}

