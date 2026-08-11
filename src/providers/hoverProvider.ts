import * as vscode from 'vscode';
import * as path from 'path';
import { EntityService } from '../services/entityService';
import { RelationService } from '../services/relationService';
import { ObservationService } from '../services/observationService';

/**
 * 悬浮提示提供者
 * 当鼠标悬停在代码上时，显示实体的相关信息
 */
export class KnowledgeHoverProvider implements vscode.HoverProvider {
  constructor(
    private entityService: EntityService,
    private relationService: RelationService,
    private observationService: ObservationService
  ) {}

  public provideHover(
    document: vscode.TextDocument,
    position: vscode.Position,
    _token: vscode.CancellationToken
  ): vscode.ProviderResult<vscode.Hover> {
    // 查找当前位置的实体
    const relativePath = this.getRelativePath(document);
    if (!relativePath) {
      return null;
    }

    const line = position.line + 1; // VSCode 行号从 0 开始，数据库从 1 开始

    const entity = this.entityService.findEntityAtLocation(relativePath, line);
    if (!entity) {
      return null;
    }

    // 构建悬浮提示内容
    const markdown = new vscode.MarkdownString();
    markdown.isTrusted = true;

    // 实体基本信息
    markdown.appendMarkdown(`### 🧠 Knowledge Graph\n\n`);
    markdown.appendMarkdown(`**${entity.name}** (${entity.type})\n\n`);

    if (entity.description) {
      markdown.appendMarkdown(`${entity.description}\n\n`);
    }

    // 观察记录
    const observations = this.observationService.getObservations(entity.id);
    if (observations.length > 0) {
      markdown.appendMarkdown(`#### 📝 Observations (${observations.length})\n\n`);
      observations.slice(0, 3).forEach(obs => {
        markdown.appendMarkdown(`- ${obs.content}\n`);
      });
      if (observations.length > 3) {
        markdown.appendMarkdown(`- *...and ${observations.length - 3} more*\n`);
      }
      markdown.appendMarkdown('\n');
    }

    // 关系信息
    const relations = this.relationService.getRelatedEntities(entity.id);
    if (relations.length > 0) {
      markdown.appendMarkdown(`#### 🔗 Relations (${relations.length})\n\n`);
      
      const outgoing = relations.filter(r => r.direction === 'outgoing');
      const incoming = relations.filter(r => r.direction === 'incoming');

      if (outgoing.length > 0) {
        markdown.appendMarkdown(`**Outgoing:**\n`);
        outgoing.slice(0, 3).forEach(rel => {
          markdown.appendMarkdown(`- ${rel.relation.verb} → ${rel.entity.name}\n`);
        });
        if (outgoing.length > 3) {
          markdown.appendMarkdown(`- *...and ${outgoing.length - 3} more*\n`);
        }
      }

      if (incoming.length > 0) {
        markdown.appendMarkdown(`\n**Incoming:**\n`);
        incoming.slice(0, 3).forEach(rel => {
          markdown.appendMarkdown(`- ${rel.entity.name} → ${rel.relation.verb}\n`);
        });
        if (incoming.length > 3) {
          markdown.appendMarkdown(`- *...and ${incoming.length - 3} more*\n`);
        }
      }
    }

    return new vscode.Hover(markdown);
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
}

