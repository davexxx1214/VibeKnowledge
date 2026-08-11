import * as vscode from 'vscode';
import * as path from 'path';
import { EntityService } from '../services/entityService';
import { RelationService } from '../services/relationService';
import { ObservationService } from '../services/observationService';

/**
 * CodeLens 提供者
 * 在代码上方显示实体的统计信息
 */
export class KnowledgeCodeLensProvider implements vscode.CodeLensProvider {
  private _onDidChangeCodeLenses: vscode.EventEmitter<void> = new vscode.EventEmitter<void>();
  public readonly onDidChangeCodeLenses: vscode.Event<void> = this._onDidChangeCodeLenses.event;

  constructor(
    private entityService: EntityService,
    private relationService: RelationService,
    private observationService: ObservationService
  ) {}

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
    
    const entities = this.entityService.getEntitiesByFile(relativePath);

    for (const entity of entities) {
      // 获取统计信息
      const observationCount = this.observationService.getObservationCount(entity.id);
      const relationCount = this.relationService.getRelationCount(entity.id);

      // 创建 CodeLens 范围
      const range = new vscode.Range(
        entity.startLine - 1, // VSCode 行号从 0 开始
        0,
        entity.startLine - 1,
        0
      );

      // 创建 CodeLens
      const codeLens = new vscode.CodeLens(range, {
        title: `🧠 KG: ${observationCount} observations, ${relationCount} relations`,
        command: 'knowledge.viewEntityDetails',
        arguments: [entity.id],
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

