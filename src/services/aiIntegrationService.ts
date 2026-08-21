import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EntityService } from './entityService';
import { RelationService } from './relationService';
import { ObservationService } from './observationService';
import { DependencyAnalyzer } from './dependencyAnalyzer';
import { ScenarioManager } from './scenarioManager';
import { Entity, Relation } from '../utils/types';
import { getLocale } from '../i18n/i18nService';

/**
 * 图谱数据源类型
 */
export type GraphSourceType = 'manual' | 'agent' | 'merged';

/**
 * 图谱数据
 */
export interface GraphData {
  entities: Entity[];
  relations: Relation[];
  observations: Array<{ entityId: string; entityName: string; content: string }>;
  sourceType: GraphSourceType;
}

/**
 * 技术栈信息
 */
interface TechStack {
  language?: string;
  runtime?: string;
  frameworks: Array<{ name: string; version: string }>;
  database?: string;
  keyLibraries: Array<{ name: string; version: string }>;
  testing?: string;
  otherDependencies?: Array<{ name: string; version: string }>;
}

/**
 * AI 集成服务
 * 负责生成 AI 编程工具的配置文件和上下文
 */
export class AIIntegrationService {
  private dependencyAnalyzer: DependencyAnalyzer;

  constructor(
    private entityService: EntityService,
    private relationService: RelationService,
    private observationService: ObservationService
  ) {
    this.dependencyAnalyzer = new DependencyAnalyzer(entityService, relationService);
  }

  /**
   * 生成 Cursor Rules 文件
   * @param workspaceRoot 工作区根目录
   * @param graphData 可选的图谱数据，如果不提供则使用默认服务获取
   */
  public async generateCursorRules(workspaceRoot: string, graphData?: GraphData): Promise<string> {
    const filePath = path.join(workspaceRoot, '.cursorrules');
    const content = this.buildCursorRulesContent(graphData);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * 生成 GitHub Copilot Instructions 文件
   * @param workspaceRoot 工作区根目录
   * @param graphData 可选的图谱数据，如果不提供则使用默认服务获取
   */
  public async generateCopilotInstructions(workspaceRoot: string, graphData?: GraphData): Promise<string> {
    const githubDir = path.join(workspaceRoot, '.github');
    if (!fs.existsSync(githubDir)) {
      fs.mkdirSync(githubDir, { recursive: true });
    }

    const filePath = path.join(githubDir, 'copilot-instructions.md');
    const content = this.buildCopilotInstructionsContent(graphData);
    
    fs.writeFileSync(filePath, content, 'utf-8');
    return filePath;
  }

  /**
   * 生成所有 AI 配置文件
   * @param workspaceRoot 工作区根目录
   * @param graphData 可选的图谱数据，如果不提供则使用默认服务获取
   */
  public async generateAllAIConfigs(workspaceRoot: string, graphData?: GraphData): Promise<string[]> {
    const files: string[] = [];
    
    files.push(await this.generateCursorRules(workspaceRoot, graphData));
    files.push(await this.generateCopilotInstructions(workspaceRoot, graphData));
    
    return files;
  }

  /**
   * 构建 Cursor Rules 内容
   */
  private buildCursorRulesContent(graphData?: GraphData): string {
    const locale = getLocale();
    return locale === 'zh' ? this.buildCursorRulesContentCN(graphData) : this.buildCursorRulesContentEN(graphData);
  }

  /**
   * 构建 Cursor Rules 内容（中文）
   */
  private buildCursorRulesContentCN(graphData?: GraphData): string {
    const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name || 'Project';
    const entities = graphData?.entities || this.entityService.listEntities({});
    const relations = graphData?.relations || this.relationService.getAllRelations();
    const stats = this.calculateStatsFromGraphData(graphData);
    const techStack = this.extractTechStack();
    const sourceLabel = this.getSourceLabel(graphData?.sourceType, 'zh');

    let content = `# ${workspaceName} - Cursor AI Rules\n\n`;
    content += `> 自动生成时间：${new Date().toLocaleString('zh-CN')}\n`;
    content += `> 来源：Knowledge Graph Extension\n`;
    content += `> 数据源：${sourceLabel}\n\n`;
    content += `---\n\n`;

    // 技术栈
    content += this.formatTechStackCN(techStack);

    // 项目概览
    content += `## 📊 项目概览\n\n`;
    content += `- **项目名称**：${workspaceName}\n`;
    content += `- **实体总数**：${entities.length}\n`;
    content += `- **关系总数**：${relations.length}\n`;
    content += `- **有依赖的实体**：${stats.entitiesWithDependencies}\n`;
    content += `- **平均依赖数**：${stats.averageDependencies}\n`;
    content += `- **最大依赖深度**：${stats.maxDependencyDepth}\n`;
    if (stats.circularDependencyCount > 0) {
      content += `- **⚠️ 循环依赖数**：${stats.circularDependencyCount}\n`;
    }
    content += `\n`;

    // 实体类型分布
    const typeCount = this.getEntityTypeDistribution(entities);
    if (Object.keys(typeCount).length > 0) {
      content += `### 实体类型分布\n\n`;
      for (const [type, count] of Object.entries(typeCount)) {
        content += `- **${type}**: ${count}\n`;
      }
      content += `\n`;
    }

    // 实体关系图谱
    content += this.buildEntityRelationsCN(entities, relations);

    // 关键组件（依赖最多的）
    if (stats.topDependencies.length > 0) {
      content += `## 🏗️ 关键组件 (Top ${Math.min(10, stats.topDependencies.length)})\n\n`;
      content += `这些是项目中最核心的组件，依赖关系最复杂：\n\n`;
      for (let i = 0; i < Math.min(10, stats.topDependencies.length); i++) {
        const item = stats.topDependencies[i];
        content += `${i + 1}. **${item.entity.name}** (\`${item.entity.type}\`)\n`;
        content += `   - 位置：\`${item.entity.filePath}:${item.entity.startLine}\`\n`;
        content += `   - 依赖数：${item.dependencyCount}\n`;
        if (item.entity.description) {
          content += `   - 说明：${item.entity.description}\n`;
        }
        content += `\n`;
      }
    }

    // 观察记录分类
    const observations = this.categorizeObservations(graphData);
    
    if (observations.warnings.length > 0) {
      content += `## ⚠️ 重要警告 (${observations.warnings.length})\n\n`;
      content += `在编码时请特别注意以下问题：\n\n`;
      for (const obs of observations.warnings.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.warnings.length > 10) {
        content += `\n_... 还有 ${observations.warnings.length - 10} 个警告_\n`;
      }
      content += `\n`;
    }

    if (observations.todos.length > 0) {
      content += `## 📝 待办事项 (${observations.todos.length})\n\n`;
      for (const obs of observations.todos.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.todos.length > 10) {
        content += `\n_... 还有 ${observations.todos.length - 10} 个待办_\n`;
      }
      content += `\n`;
    }

    if (observations.bugs.length > 0) {
      content += `## 🐛 已知问题 (${observations.bugs.length})\n\n`;
      for (const obs of observations.bugs.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.bugs.length > 10) {
        content += `\n_... 还有 ${observations.bugs.length - 10} 个问题_\n`;
      }
      content += `\n`;
    }

    if (observations.others.length > 0) {
      content += `## 📌 其他备注 (${observations.others.length})\n\n`;
      for (const obs of observations.others.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.others.length > 10) {
        content += `\n_... 还有 ${observations.others.length - 10} 个备注_\n`;
      }
      content += `\n`;
    }

    // 循环依赖警告
    if (stats.circularDependencyCount > 0) {
      content += `## 🔄 循环依赖警告\n\n`;
      content += `⚠️ 检测到 ${stats.circularDependencyCount} 个循环依赖。这可能导致：\n`;
      content += `- 代码难以理解和维护\n`;
      content += `- 潜在的内存泄漏\n`;
      content += `- 模块加载问题\n\n`;
      content += `建议：在重构或添加新功能时，优先解决这些循环依赖。\n\n`;
    }

    // 自定义 AI 模板（如果存在）
    console.log('📋 Checking for custom AI template (CN)...');
    const customTemplate = this.readCustomAITemplate();
    if (customTemplate) {
      console.log('✅ Adding custom template to Cursor Rules (CN)');
      content += customTemplate;
      content += `\n\n`;
    } else {
      console.log('ℹ️ No custom template found, skipping (CN)');
    }

    // 使用知识图谱
    content += `## 📚 使用知识图谱\n\n`;
    content += `本项目使用 Knowledge Graph 扩展来管理代码知识。你可以：\n\n`;
    content += `- 使用命令 \`Knowledge: Export Graph\` 导出完整的知识图谱\n`;
    content += `- 查看 \`.vscode/.knowledge/graph.sqlite\` 了解实体和关系\n`;
    content += `- 在提供建议时，参考实体的观察记录和依赖关系\n\n`;

    content += `---\n\n`;
    content += `_此文件由 Knowledge Graph Extension 自动生成。_\n`;
    content += `_建议定期运行 \`Knowledge: Generate Cursor Rules\` 更新此文件。_\n`;

    return content;
  }

  /**
   * 构建 Cursor Rules 内容（英文）
   */
  private buildCursorRulesContentEN(graphData?: GraphData): string {
    const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name || 'Project';
    const entities = graphData?.entities || this.entityService.listEntities({});
    const relations = graphData?.relations || this.relationService.getAllRelations();
    const stats = this.calculateStatsFromGraphData(graphData);
    const techStack = this.extractTechStack();
    const sourceLabel = this.getSourceLabel(graphData?.sourceType, 'en');

    let content = `# ${workspaceName} - Cursor AI Rules\n\n`;
    content += `> Generated: ${new Date().toLocaleString('en-US')}\n`;
    content += `> Source: Knowledge Graph Extension\n`;
    content += `> Data Source: ${sourceLabel}\n\n`;
    content += `---\n\n`;

    // Tech Stack
    content += this.formatTechStackEN(techStack);

    // Project Overview
    content += `## 📊 Project Overview\n\n`;
    content += `- **Project Name**: ${workspaceName}\n`;
    content += `- **Total Entities**: ${entities.length}\n`;
    content += `- **Total Relations**: ${relations.length}\n`;
    content += `- **Entities with Dependencies**: ${stats.entitiesWithDependencies}\n`;
    content += `- **Average Dependencies**: ${stats.averageDependencies}\n`;
    content += `- **Max Dependency Depth**: ${stats.maxDependencyDepth}\n`;
    if (stats.circularDependencyCount > 0) {
      content += `- **⚠️ Circular Dependencies**: ${stats.circularDependencyCount}\n`;
    }
    content += `\n`;

    // Entity Type Distribution
    const typeCount = this.getEntityTypeDistribution(entities);
    if (Object.keys(typeCount).length > 0) {
      content += `### Entity Type Distribution\n\n`;
      for (const [type, count] of Object.entries(typeCount)) {
        content += `- **${type}**: ${count}\n`;
      }
      content += `\n`;
    }

    // Entity Relationship Graph
    content += this.buildEntityRelationsEN(entities, relations);

    // Key Components (Most Dependencies)
    if (stats.topDependencies.length > 0) {
      content += `## 🏗️ Key Components (Top ${Math.min(10, stats.topDependencies.length)})\n\n`;
      content += `These are the core components with the most complex dependency relationships:\n\n`;
      for (let i = 0; i < Math.min(10, stats.topDependencies.length); i++) {
        const item = stats.topDependencies[i];
        content += `${i + 1}. **${item.entity.name}** (\`${item.entity.type}\`)\n`;
        content += `   - Location: \`${item.entity.filePath}:${item.entity.startLine}\`\n`;
        content += `   - Dependencies: ${item.dependencyCount}\n`;
        if (item.entity.description) {
          content += `   - Description: ${item.entity.description}\n`;
        }
        content += `\n`;
      }
    }

    // Categorized Observations
    const observations = this.categorizeObservations(graphData);
    
    if (observations.warnings.length > 0) {
      content += `## ⚠️ Important Warnings (${observations.warnings.length})\n\n`;
      content += `Please pay special attention to the following issues when coding:\n\n`;
      for (const obs of observations.warnings.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.warnings.length > 10) {
        content += `\n_... and ${observations.warnings.length - 10} more warnings_\n`;
      }
      content += `\n`;
    }

    if (observations.todos.length > 0) {
      content += `## 📝 TODO Items (${observations.todos.length})\n\n`;
      for (const obs of observations.todos.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.todos.length > 10) {
        content += `\n_... and ${observations.todos.length - 10} more todos_\n`;
      }
      content += `\n`;
    }

    if (observations.bugs.length > 0) {
      content += `## 🐛 Known Issues (${observations.bugs.length})\n\n`;
      for (const obs of observations.bugs.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.bugs.length > 10) {
        content += `\n_... and ${observations.bugs.length - 10} more issues_\n`;
      }
      content += `\n`;
    }

    if (observations.others.length > 0) {
      content += `## 📌 Other Notes (${observations.others.length})\n\n`;
      for (const obs of observations.others.slice(0, 10)) {
        content += `- **[${obs.entity.name}]** ${obs.content}\n`;
      }
      if (observations.others.length > 10) {
        content += `\n_... and ${observations.others.length - 10} more notes_\n`;
      }
      content += `\n`;
    }

    // Circular Dependency Warning
    if (stats.circularDependencyCount > 0) {
      content += `## 🔄 Circular Dependency Warning\n\n`;
      content += `⚠️ Detected ${stats.circularDependencyCount} circular dependencies. This may cause:\n`;
      content += `- Code that's difficult to understand and maintain\n`;
      content += `- Potential memory leaks\n`;
      content += `- Module loading issues\n\n`;
      content += `Suggestion: Prioritize resolving these circular dependencies when refactoring or adding new features.\n\n`;
    }

    // Custom AI Template (if exists)
    console.log('📋 Checking for custom AI template (EN)...');
    const customTemplate = this.readCustomAITemplate();
    if (customTemplate) {
      console.log('✅ Adding custom template to Cursor Rules (EN)');
      content += customTemplate;
      content += `\n\n`;
    } else {
      console.log('ℹ️ No custom template found, skipping (EN)');
    }

    // Using Knowledge Graph
    content += `## 📚 Using the Knowledge Graph\n\n`;
    content += `This project uses the Knowledge Graph extension to manage code knowledge. You can:\n\n`;
    content += `- Use command \`Knowledge: Export Graph\` to export the complete knowledge graph\n`;
    content += `- Check \`.vscode/.knowledge/graph.sqlite\` for entities and relations\n`;
    content += `- Reference entity observation records and dependency relationships when providing suggestions\n\n`;

    content += `---\n\n`;
    content += `_This file is automatically generated by Knowledge Graph Extension._\n`;
    content += `_It's recommended to run \`Knowledge: Generate Cursor Rules\` periodically to update this file._\n`;

    return content;
  }

  /**
   * 构建 Copilot Instructions 内容
   */
  private buildCopilotInstructionsContent(graphData?: GraphData): string {
    const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name || 'Project';
    const entities = graphData?.entities || this.entityService.listEntities({});
    const relations = graphData?.relations || this.relationService.getAllRelations();
    const stats = this.calculateStatsFromGraphData(graphData);
    const techStack = this.extractTechStack();
    const sourceLabel = this.getSourceLabel(graphData?.sourceType, 'en');

    let content = `# GitHub Copilot Instructions for ${workspaceName}\n\n`;
    content += `> Auto-generated: ${new Date().toISOString()}\n`;
    content += `> Source: Knowledge Graph Extension\n`;
    content += `> Data Source: ${sourceLabel}\n\n`;
    content += `---\n\n`;

    // Tech Stack
    content += this.formatTechStackEN(techStack);

    // Project Context
    content += `## Project Context\n\n`;
    content += `This project uses a **Knowledge Graph** to track code entities, relationships, and observations.\n\n`;
    content += `**Statistics:**\n`;
    content += `- Total Entities: ${entities.length}\n`;
    content += `- Total Relations: ${relations.length}\n`;
    content += `- Entities with Dependencies: ${stats.entitiesWithDependencies}\n`;
    content += `- Average Dependencies: ${stats.averageDependencies}\n`;
    content += `- Max Dependency Depth: ${stats.maxDependencyDepth}\n`;
    if (stats.circularDependencyCount > 0) {
      content += `- ⚠️ Circular Dependencies: ${stats.circularDependencyCount}\n`;
    }
    content += `\n`;

    // Architecture Overview
    content += `## Architecture Overview\n\n`;
    const typeCount = this.getEntityTypeDistribution(entities);
    if (Object.keys(typeCount).length > 0) {
      content += `**Entity Distribution:**\n\n`;
      for (const [type, count] of Object.entries(typeCount)) {
        content += `- ${type}: ${count}\n`;
      }
      content += `\n`;
    }

    // Entity Relationship Graph
    content += this.buildEntityRelationsEN(entities, relations);

    // Key Components
    if (stats.topDependencies.length > 0) {
      content += `## Key Components\n\n`;
      content += `These are the most important components in the codebase (by dependency count):\n\n`;
      for (let i = 0; i < Math.min(5, stats.topDependencies.length); i++) {
        const item = stats.topDependencies[i];
        content += `### ${i + 1}. ${item.entity.name}\n\n`;
        content += `- **Type:** \`${item.entity.type}\`\n`;
        content += `- **Location:** \`${item.entity.filePath}:${item.entity.startLine}\`\n`;
        content += `- **Dependencies:** ${item.dependencyCount}\n`;
        if (item.entity.description) {
          content += `- **Description:** ${item.entity.description}\n`;
        }
        content += `\n`;
      }
    }

    // Important Notes
    const observations = this.categorizeObservations(graphData);
    const hasNotes = observations.warnings.length > 0 || 
                     observations.todos.length > 0 || 
                     observations.bugs.length > 0 ||
                     observations.others.length > 0;

    if (hasNotes) {
      content += `## Important Notes\n\n`;

      if (observations.warnings.length > 0) {
        content += `### ⚠️ Warnings (${observations.warnings.length})\n\n`;
        for (const obs of observations.warnings.slice(0, 5)) {
          content += `- **[${obs.entity.name}]** ${obs.content}\n`;
        }
        if (observations.warnings.length > 5) {
          content += `\n_... and ${observations.warnings.length - 5} more warnings_\n`;
        }
        content += `\n`;
      }

      if (observations.bugs.length > 0) {
        content += `### 🐛 Known Issues (${observations.bugs.length})\n\n`;
        for (const obs of observations.bugs.slice(0, 5)) {
          content += `- **[${obs.entity.name}]** ${obs.content}\n`;
        }
        if (observations.bugs.length > 5) {
          content += `\n_... and ${observations.bugs.length - 5} more issues_\n`;
        }
        content += `\n`;
      }

      if (observations.todos.length > 0) {
        content += `### 📝 TODOs (${observations.todos.length})\n\n`;
        for (const obs of observations.todos.slice(0, 5)) {
          content += `- **[${obs.entity.name}]** ${obs.content}\n`;
        }
        if (observations.todos.length > 5) {
          content += `\n_... and ${observations.todos.length - 5} more todos_\n`;
        }
        content += `\n`;
      }

      if (observations.others.length > 0) {
        content += `### 📌 Other Notes (${observations.others.length})\n\n`;
        for (const obs of observations.others.slice(0, 5)) {
          content += `- **[${obs.entity.name}]** ${obs.content}\n`;
        }
        if (observations.others.length > 5) {
          content += `\n_... and ${observations.others.length - 5} more notes_\n`;
        }
        content += `\n`;
      }
    }

    // Custom AI Template (if exists)
    console.log('📋 Checking for custom AI template (Copilot)...');
    const customTemplate = this.readCustomAITemplate();
    if (customTemplate) {
      console.log('✅ Adding custom template to Copilot Instructions');
      content += customTemplate;
      content += `\n\n`;
    } else {
      console.log('ℹ️ No custom template found, skipping (Copilot)');
    }

    // Common Patterns
    content += `## Common Patterns\n\n`;
    content += `**Entity Types in this project:**\n\n`;
    for (const [type, count] of Object.entries(typeCount)) {
      content += `- \`${type}\`: ${count} entities\n`;
    }
    content += `\n`;

    // Additional Context
    content += `## Additional Context\n\n`;
    content += `- This project uses **Knowledge Graph Extension** to manage code knowledge\n`;
    content += `- Entities, relationships, and observations are stored in \`.vscode/.knowledge/graph.sqlite\`\n`;
    content += `- Run \`Knowledge: Export Graph\` command to see the full knowledge graph\n`;
    content += `- Observations contain important notes, warnings, and TODOs about each entity\n\n`;

    content += `---\n\n`;
    content += `_This file is auto-generated by Knowledge Graph Extension._\n`;
    content += `_Run \`Knowledge: Generate Copilot Instructions\` to update._\n`;

    return content;
  }

  /**
   * 获取实体类型分布
   */
  private getEntityTypeDistribution(entities: Entity[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    for (const entity of entities) {
      distribution[entity.type] = (distribution[entity.type] || 0) + 1;
    }
    return distribution;
  }

  /**
   * 构建实体关系图谱内容（中文）
   * 展示实体之间的依赖关系和层次结构
   */
  private buildEntityRelationsCN(entities: Entity[], relations: Relation[]): string {
    if (relations.length === 0) {
      return '';
    }

    // 创建实体 ID 到名称的映射
    const entityMap = new Map<string, Entity>();
    for (const entity of entities) {
      entityMap.set(entity.id, entity);
    }

    let content = `## 🔗 实体关系图谱\n\n`;
    content += `以下展示了代码实体之间的依赖和调用关系：\n\n`;

    // 按关系类型分组
    const relationsByType = new Map<string, Relation[]>();
    for (const relation of relations) {
      const type = relation.verb;
      if (!relationsByType.has(type)) {
        relationsByType.set(type, []);
      }
      relationsByType.get(type)!.push(relation);
    }

    // 显示关系类型说明
    content += `### 关系类型说明\n\n`;
    const relationTypeDescCN: Record<string, string> = {
      'uses': '使用/依赖',
      'calls': '调用',
      'implements': '实现',
      'extends': '继承',
      'references': '引用',
      'contains': '包含',
      'creates': '创建',
      'imports': '导入'
    };

    for (const [type, rels] of relationsByType.entries()) {
      const desc = relationTypeDescCN[type] || type;
      content += `- **${type}** (${desc}): ${rels.length} 个关系\n`;
    }
    content += `\n`;

    // 显示依赖关系列表
    content += `### 依赖关系详情\n\n`;
    content += `\`\`\`\n`;
    
    const maxRelations = this.getMaxRelationsDisplay();
    for (const relation of relations.slice(0, maxRelations)) {
      const sourceEntity = entityMap.get(relation.sourceEntityId);
      const targetEntity = entityMap.get(relation.targetEntityId);
      
      if (sourceEntity && targetEntity) {
        content += `${sourceEntity.name} --[${relation.verb}]--> ${targetEntity.name}\n`;
      }
    }
    
    if (relations.length > maxRelations) {
      content += `\n... 还有 ${relations.length - maxRelations} 个关系\n`;
    }
    
    content += `\`\`\`\n\n`;

    // 构建层次结构（入度为0的实体是顶层）
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    
    for (const entity of entities) {
      inDegree.set(entity.id, 0);
      outDegree.set(entity.id, 0);
    }
    
    for (const relation of relations) {
      inDegree.set(relation.targetEntityId, (inDegree.get(relation.targetEntityId) || 0) + 1);
      outDegree.set(relation.sourceEntityId, (outDegree.get(relation.sourceEntityId) || 0) + 1);
    }

    // 找出顶层实体（调用其他实体但不被调用的）
    const topLevel = entities.filter(e => 
      (inDegree.get(e.id) || 0) === 0 && (outDegree.get(e.id) || 0) > 0
    );

    // 找出底层实体（被调用但不调用其他的）
    const bottomLevel = entities.filter(e => 
      (outDegree.get(e.id) || 0) === 0 && (inDegree.get(e.id) || 0) > 0
    );

    if (topLevel.length > 0 || bottomLevel.length > 0) {
      content += `### 层次结构分析\n\n`;
      
      if (topLevel.length > 0) {
        content += `**入口层（Controllers/入口点）：**\n`;
        for (const entity of topLevel.slice(0, 10)) {
          content += `- \`${entity.name}\` (${entity.type}) - 调用 ${outDegree.get(entity.id)} 个实体\n`;
        }
        content += `\n`;
      }

      if (bottomLevel.length > 0) {
        content += `**基础层（Entities/基础组件）：**\n`;
        for (const entity of bottomLevel.slice(0, 10)) {
          content += `- \`${entity.name}\` (${entity.type}) - 被 ${inDegree.get(entity.id)} 个实体依赖\n`;
        }
        content += `\n`;
      }
    }

    return content;
  }

  /**
   * 构建实体关系图谱内容（英文）
   * 展示实体之间的依赖关系和层次结构
   */
  private buildEntityRelationsEN(entities: Entity[], relations: Relation[]): string {
    if (relations.length === 0) {
      return '';
    }

    // 创建实体 ID 到名称的映射
    const entityMap = new Map<string, Entity>();
    for (const entity of entities) {
      entityMap.set(entity.id, entity);
    }

    let content = `## 🔗 Entity Relationship Graph\n\n`;
    content += `The following shows the dependency and call relationships between code entities:\n\n`;

    // 按关系类型分组
    const relationsByType = new Map<string, Relation[]>();
    for (const relation of relations) {
      const type = relation.verb;
      if (!relationsByType.has(type)) {
        relationsByType.set(type, []);
      }
      relationsByType.get(type)!.push(relation);
    }

    // 显示关系类型说明
    content += `### Relationship Types\n\n`;
    const relationTypeDescEN: Record<string, string> = {
      'uses': 'Uses/Depends on',
      'calls': 'Calls',
      'implements': 'Implements',
      'extends': 'Extends',
      'references': 'References',
      'contains': 'Contains',
      'creates': 'Creates',
      'imports': 'Imports'
    };

    for (const [type, rels] of relationsByType.entries()) {
      const desc = relationTypeDescEN[type] || type;
      content += `- **${type}** (${desc}): ${rels.length} relations\n`;
    }
    content += `\n`;

    // 显示依赖关系列表
    content += `### Dependency Details\n\n`;
    content += `\`\`\`\n`;
    
    const maxRelations = this.getMaxRelationsDisplay();
    for (const relation of relations.slice(0, maxRelations)) {
      const sourceEntity = entityMap.get(relation.sourceEntityId);
      const targetEntity = entityMap.get(relation.targetEntityId);
      
      if (sourceEntity && targetEntity) {
        content += `${sourceEntity.name} --[${relation.verb}]--> ${targetEntity.name}\n`;
      }
    }
    
    if (relations.length > maxRelations) {
      content += `\n... and ${relations.length - maxRelations} more relations\n`;
    }
    
    content += `\`\`\`\n\n`;

    // 构建层次结构（入度为0的实体是顶层）
    const inDegree = new Map<string, number>();
    const outDegree = new Map<string, number>();
    
    for (const entity of entities) {
      inDegree.set(entity.id, 0);
      outDegree.set(entity.id, 0);
    }
    
    for (const relation of relations) {
      inDegree.set(relation.targetEntityId, (inDegree.get(relation.targetEntityId) || 0) + 1);
      outDegree.set(relation.sourceEntityId, (outDegree.get(relation.sourceEntityId) || 0) + 1);
    }

    // 找出顶层实体（调用其他实体但不被调用的）
    const topLevel = entities.filter(e => 
      (inDegree.get(e.id) || 0) === 0 && (outDegree.get(e.id) || 0) > 0
    );

    // 找出底层实体（被调用但不调用其他的）
    const bottomLevel = entities.filter(e => 
      (outDegree.get(e.id) || 0) === 0 && (inDegree.get(e.id) || 0) > 0
    );

    if (topLevel.length > 0 || bottomLevel.length > 0) {
      content += `### Hierarchy Analysis\n\n`;
      
      if (topLevel.length > 0) {
        content += `**Entry Layer (Controllers/Entry Points):**\n`;
        for (const entity of topLevel.slice(0, 10)) {
          content += `- \`${entity.name}\` (${entity.type}) - calls ${outDegree.get(entity.id)} entities\n`;
        }
        content += `\n`;
      }

      if (bottomLevel.length > 0) {
        content += `**Foundation Layer (Entities/Base Components):**\n`;
        for (const entity of bottomLevel.slice(0, 10)) {
          content += `- \`${entity.name}\` (${entity.type}) - depended by ${inDegree.get(entity.id)} entities\n`;
        }
        content += `\n`;
      }
    }

    return content;
  }

  /**
   * 读取 AI 场景模板
   * 使用 ScenarioManager 获取当前场景的模板内容
   */
  private readCustomAITemplate(): string | null {
    try {
      const scenarioManager = ScenarioManager.getInstance();
      const currentScenario = scenarioManager.getCurrentScenario();
      const scenarioDisplay = scenarioManager.getCurrentScenarioDisplayName();
      
      console.log(`📋 Reading AI template for scenario: ${scenarioDisplay}`);
      
      const template = scenarioManager.getScenarioTemplate(currentScenario);
      
      if (template) {
        console.log(`✅ Scenario template loaded! Length: ${template.length} characters`);
        console.log(`📝 Template preview (first 100 chars): ${template.substring(0, 100)}...`);
        return template;
      } else {
        console.log(`⚠️ No template found for scenario: ${currentScenario}`);
        return null;
      }
    } catch (error) {
      console.error('❌ Failed to read scenario template:', error);
      return null;
    }
  }

  /**
   * 获取配置中的最大关系显示数量
   */
  private getMaxRelationsDisplay(): number {
    const config = vscode.workspace.getConfiguration('knowledgeGraph');
    return config.get<number>('aiConfig.maxRelationsDisplay', 50);
  }

  /**
   * 获取数据源显示标签
   */
  private getSourceLabel(sourceType: GraphSourceType | undefined, locale: 'zh' | 'en'): string {
    if (!sourceType) {
      return locale === 'zh' ? '人工维护图谱（默认）' : 'Human-maintained Graph (default)';
    }
    
    const labels = {
      manual: { zh: '📝 人工维护图谱', en: '📝 Human-maintained Graph' },
      agent: { zh: '🤖 Agent 图谱', en: '🤖 Agent Graph' },
      merged: { zh: '🔗 合并图谱', en: '🔗 Merged Graph' }
    };
    
    return labels[sourceType][locale];
  }

  /**
   * 根据图谱数据计算统计信息
   */
  private calculateStatsFromGraphData(graphData?: GraphData): {
    entitiesWithDependencies: number;
    averageDependencies: number;
    maxDependencyDepth: number;
    circularDependencyCount: number;
    topDependencies: Array<{ entity: Entity; dependencyCount: number }>;
  } {
    // 如果没有传入 graphData 或者是手动图谱，使用原有的 dependencyAnalyzer
    if (!graphData || graphData.sourceType === 'manual') {
      return this.dependencyAnalyzer.getGlobalDependencyStats();
    }

    // 对于 Agent 图谱或合并图谱，根据传入的数据计算统计
    const { entities, relations } = graphData;
    
    // 计算每个实体的依赖数（出边数量）
    const dependencyCounts = new Map<string, number>();
    for (const entity of entities) {
      dependencyCounts.set(entity.id, 0);
    }
    
    for (const relation of relations) {
      const count = dependencyCounts.get(relation.sourceEntityId) || 0;
      dependencyCounts.set(relation.sourceEntityId, count + 1);
    }

    // 计算统计数据
    let totalDependencies = 0;
    let entitiesWithDeps = 0;
    
    for (const count of dependencyCounts.values()) {
      totalDependencies += count;
      if (count > 0) {
        entitiesWithDeps++;
      }
    }

    const averageDependencies = entities.length > 0 
      ? Math.round((totalDependencies / entities.length) * 10) / 10 
      : 0;

    // 获取依赖最多的实体
    const sortedDeps = Array.from(dependencyCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    const topDependencies = sortedDeps
      .filter(([, count]) => count > 0)
      .map(([entityId, count]) => {
        const entity = entities.find(e => e.id === entityId);
        return {
          entity: entity!,
          dependencyCount: count,
        };
      })
      .filter(item => item.entity);

    return {
      entitiesWithDependencies: entitiesWithDeps,
      averageDependencies,
      maxDependencyDepth: 1, // 简化计算，不做深度分析
      circularDependencyCount: 0, // 简化计算
      topDependencies,
    };
  }

  /**
   * 分类观察记录
   * @param graphData 可选的图谱数据，如果提供则使用传入的观察记录
   */
  private categorizeObservations(graphData?: GraphData) {
    const warnings: Array<{ entity: { name: string }; content: string }> = [];
    const todos: Array<{ entity: { name: string }; content: string }> = [];
    const bugs: Array<{ entity: { name: string }; content: string }> = [];
    const others: Array<{ entity: { name: string }; content: string }> = [];

    if (graphData?.observations) {
      // 使用传入的观察记录
      for (const obs of graphData.observations) {
        const content = obs.content.toLowerCase();
        const item = { entity: { name: obs.entityName }, content: obs.content };

        if (content.includes('warning') || content.includes('warn') || content.includes('⚠️')) {
          warnings.push(item);
        } else if (content.includes('todo') || content.includes('待办') || content.includes('📝')) {
          todos.push(item);
        } else if (content.includes('bug') || content.includes('issue') || content.includes('问题') || content.includes('🐛')) {
          bugs.push(item);
        } else {
          others.push(item);
        }
      }
    } else {
      // 使用默认服务获取
      const entities = this.entityService.listEntities({});

      for (const entity of entities) {
        const observations = this.observationService.getObservations(entity.id);
        for (const obs of observations) {
          const content = obs.content.toLowerCase();
          const item = { entity: { name: entity.name }, content: obs.content };

          if (content.includes('warning') || content.includes('warn') || content.includes('⚠️')) {
            warnings.push(item);
          } else if (content.includes('todo') || content.includes('待办') || content.includes('📝')) {
            todos.push(item);
          } else if (content.includes('bug') || content.includes('issue') || content.includes('问题') || content.includes('🐛')) {
            bugs.push(item);
          } else {
            others.push(item);
          }
        }
      }
    }

    return { warnings, todos, bugs, others };
  }

  /**
   * 提取技术栈信息（支持 JavaScript/TypeScript、Java Maven 和 Python 项目）
   */
  private extractTechStack(): TechStack | null {
    try {
      const workspaceRoot = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
      if (!workspaceRoot) {
        return null;
      }

      // 尝试检测 JavaScript/TypeScript 项目
      const packageJsonPath = path.join(workspaceRoot, 'package.json');
      if (fs.existsSync(packageJsonPath)) {
        return this.extractJavaScriptTechStack(packageJsonPath);
      }

      // 尝试检测 Java Maven 项目
      const pomXmlPath = path.join(workspaceRoot, 'pom.xml');
      if (fs.existsSync(pomXmlPath)) {
        return this.extractJavaMavenTechStack(pomXmlPath);
      }

      // 尝试检测 Python 项目
      const requirementsPath = path.join(workspaceRoot, 'requirements.txt');
      const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');
      const setupPyPath = path.join(workspaceRoot, 'setup.py');
      
      if (fs.existsSync(requirementsPath) || fs.existsSync(pyprojectPath) || fs.existsSync(setupPyPath)) {
        return this.extractPythonTechStack(workspaceRoot);
      }

      return null;
    } catch (error) {
      console.error('Failed to extract tech stack:', error);
      return null;
    }
  }

  /**
   * 提取 JavaScript/TypeScript 项目的技术栈信息
   */
  private extractJavaScriptTechStack(packageJsonPath: string): TechStack | null {
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
      const allDeps = {
        ...(packageJson.dependencies || {}),
        ...(packageJson.devDependencies || {})
      };

      const techStack: TechStack = {
        frameworks: [],
        keyLibraries: [],
      };

      // 检测语言
      if (allDeps['typescript']) {
        const version = this.extractVersion(allDeps['typescript']);
        techStack.language = `TypeScript ${version}`;
      } else {
        techStack.language = 'JavaScript';
      }

      // 检测运行时
      if (packageJson.engines?.node) {
        techStack.runtime = `Node.js ${packageJson.engines.node}`;
      } else if (allDeps['@types/node']) {
        const version = this.extractVersion(allDeps['@types/node']);
        techStack.runtime = `Node.js ${version}`;
      }

      // 检测前端框架
      if (allDeps['react']) {
        techStack.frameworks.push({
          name: 'React',
          version: this.extractVersion(allDeps['react'])
        });
      }
      if (allDeps['vue']) {
        techStack.frameworks.push({
          name: 'Vue',
          version: this.extractVersion(allDeps['vue'])
        });
      }
      if (allDeps['@angular/core']) {
        techStack.frameworks.push({
          name: 'Angular',
          version: this.extractVersion(allDeps['@angular/core'])
        });
      }
      if (allDeps['svelte']) {
        techStack.frameworks.push({
          name: 'Svelte',
          version: this.extractVersion(allDeps['svelte'])
        });
      }

      // 检测前端元框架
      if (allDeps['next']) {
        techStack.frameworks.push({
          name: 'Next.js',
          version: this.extractVersion(allDeps['next'])
        });
      }
      if (allDeps['nuxt']) {
        techStack.frameworks.push({
          name: 'Nuxt',
          version: this.extractVersion(allDeps['nuxt'])
        });
      }

      // 检测后端框架
      if (allDeps['@nestjs/core']) {
        techStack.frameworks.push({
          name: 'NestJS',
          version: this.extractVersion(allDeps['@nestjs/core'])
        });
      }
      if (allDeps['express']) {
        techStack.frameworks.push({
          name: 'Express',
          version: this.extractVersion(allDeps['express'])
        });
      }
      if (allDeps['koa']) {
        techStack.frameworks.push({
          name: 'Koa',
          version: this.extractVersion(allDeps['koa'])
        });
      }
      if (allDeps['fastify']) {
        techStack.frameworks.push({
          name: 'Fastify',
          version: this.extractVersion(allDeps['fastify'])
        });
      }

      // 检测数据库
      const databases: string[] = [];
      if (allDeps['pg'] || allDeps['postgres']) {
        databases.push('PostgreSQL');
      }
      if (allDeps['mysql'] || allDeps['mysql2']) {
        databases.push('MySQL');
      }
      if (allDeps['mongodb'] || allDeps['mongoose']) {
        databases.push('MongoDB');
      }
      if (allDeps['redis']) {
        databases.push('Redis');
      }
      if (allDeps['sqlite3'] || allDeps['better-sqlite3'] || allDeps['sql.js']) {
        databases.push('SQLite');
      }

      // ORM/Query Builders
      if (allDeps['prisma']) {
        databases.push('Prisma ORM');
      }
      if (allDeps['typeorm']) {
        databases.push('TypeORM');
      }
      if (allDeps['sequelize']) {
        databases.push('Sequelize');
      }
      if (allDeps['knex']) {
        databases.push('Knex.js');
      }

      if (databases.length > 0) {
        techStack.database = databases.join(', ');
      }

      // 检测测试框架
      const testFrameworks: string[] = [];
      if (allDeps['jest']) {
        testFrameworks.push(`Jest ${this.extractVersion(allDeps['jest'])}`);
      }
      if (allDeps['vitest']) {
        testFrameworks.push(`Vitest ${this.extractVersion(allDeps['vitest'])}`);
      }
      if (allDeps['mocha']) {
        testFrameworks.push(`Mocha ${this.extractVersion(allDeps['mocha'])}`);
      }

      if (testFrameworks.length > 0) {
        techStack.testing = testFrameworks.join(', ');
      }

      // 关键库
      const keyLibs = [
        { patterns: ['axios', 'fetch'], name: 'HTTP Client' },
        { patterns: ['lodash', 'underscore'], name: 'Utility' },
        { patterns: ['date-fns', 'moment', 'dayjs'], name: 'Date' },
        { patterns: ['zod', 'yup', 'joi'], name: 'Validation' },
        { patterns: ['graphql', '@apollo/client', 'apollo-server'], name: 'GraphQL' },
        { patterns: ['socket.io', 'ws'], name: 'WebSocket' }
      ];

      for (const lib of keyLibs) {
        for (const pattern of lib.patterns) {
          if (allDeps[pattern]) {
            techStack.keyLibraries.push({
              name: lib.name,
              version: this.extractVersion(allDeps[pattern])
            });
            break;
          }
        }
      }

      return techStack;
    } catch (error) {
      console.error('Failed to extract JavaScript tech stack:', error);
      return null;
    }
  }

  /**
   * 提取 Java Maven 项目的技术栈信息
   */
  private extractJavaMavenTechStack(pomXmlPath: string): TechStack | null {
    try {
      const pomContent = fs.readFileSync(pomXmlPath, 'utf-8');
      
      const techStack: TechStack = {
        frameworks: [],
        keyLibraries: [],
      };

      // 检测 Java 版本
      const javaVersionMatch = pomContent.match(/<maven\.compiler\.(source|target|release)>(\d+(?:\.\d+)?)</i) ||
                              pomContent.match(/<java\.version>(\d+(?:\.\d+)?)</i);
      if (javaVersionMatch) {
        const version = javaVersionMatch[javaVersionMatch.length - 1];
        techStack.language = `Java ${version}`;
      } else {
        techStack.language = 'Java';
      }

      // 检测 Maven 版本（从 wrapper 或项目信息）
      techStack.runtime = 'Maven';

      // 提取所有依赖
      const dependenciesMatch = pomContent.match(/<dependencies>([\s\S]*?)<\/dependencies>/i);
      if (!dependenciesMatch) {
        return techStack;
      }

      const dependenciesBlock = dependenciesMatch[1];
      const dependencyPattern = /<dependency>[\s\S]*?<groupId>(.*?)<\/groupId>[\s\S]*?<artifactId>(.*?)<\/artifactId>[\s\S]*?(?:<version>(.*?)<\/version>)?[\s\S]*?<\/dependency>/gi;
      
      const dependencies: Array<{ groupId: string; artifactId: string; version?: string }> = [];
      let match;
      while ((match = dependencyPattern.exec(dependenciesBlock)) !== null) {
        dependencies.push({
          groupId: match[1].trim(),
          artifactId: match[2].trim(),
          version: match[3]?.trim()
        });
      }

      // 检测 Spring 框架
      const springBootDep = dependencies.find(d => 
        d.groupId === 'org.springframework.boot' && d.artifactId.includes('spring-boot-starter')
      );
      if (springBootDep) {
        const version = springBootDep.version ? this.extractMavenVersion(springBootDep.version) : '';
        techStack.frameworks.push({
          name: 'Spring Boot',
          version: version
        });
      } else {
        const springDep = dependencies.find(d => d.groupId.includes('springframework'));
        if (springDep) {
          const version = springDep.version ? this.extractMavenVersion(springDep.version) : '';
          techStack.frameworks.push({
            name: 'Spring Framework',
            version: version
          });
        }
      }

      // 检测其他常见框架
      const frameworkMappings = [
        { groupIds: ['io.micronaut'], name: 'Micronaut' },
        { groupIds: ['io.quarkus'], name: 'Quarkus' },
        { groupIds: ['com.vaadin'], name: 'Vaadin' },
        { groupIds: ['io.vertx'], name: 'Vert.x' },
        { groupIds: ['com.google.gwt'], name: 'GWT' },
        { groupIds: ['org.apache.struts'], name: 'Struts' },
        { groupIds: ['javax.servlet', 'jakarta.servlet'], name: 'Servlet' }
      ];

      for (const mapping of frameworkMappings) {
        const dep = dependencies.find(d => mapping.groupIds.some(gid => d.groupId.includes(gid)));
        if (dep && !techStack.frameworks.some(f => f.name === mapping.name)) {
          const version = dep.version ? this.extractMavenVersion(dep.version) : '';
          techStack.frameworks.push({
            name: mapping.name,
            version: version
          });
        }
      }

      // 检测数据库驱动和 ORM
      const databases: string[] = [];
      
      if (dependencies.some(d => d.artifactId.includes('mysql') || d.groupId.includes('mysql'))) {
        databases.push('MySQL');
      }
      if (dependencies.some(d => d.artifactId.includes('postgresql') || d.groupId.includes('postgresql'))) {
        databases.push('PostgreSQL');
      }
      if (dependencies.some(d => d.artifactId.includes('h2database') || d.artifactId === 'h2')) {
        databases.push('H2');
      }
      if (dependencies.some(d => d.artifactId.includes('mongodb'))) {
        databases.push('MongoDB');
      }
      if (dependencies.some(d => d.artifactId.includes('redis') || d.groupId.includes('redis'))) {
        databases.push('Redis');
      }
      if (dependencies.some(d => d.artifactId.includes('sqlite'))) {
        databases.push('SQLite');
      }
      if (dependencies.some(d => d.artifactId.includes('oracle'))) {
        databases.push('Oracle');
      }
      if (dependencies.some(d => d.artifactId.includes('mssql') || d.groupId.includes('sqlserver'))) {
        databases.push('SQL Server');
      }

      // ORM 和持久化框架
      if (dependencies.some(d => d.artifactId.includes('hibernate') || d.groupId.includes('hibernate'))) {
        databases.push('Hibernate');
      }
      if (dependencies.some(d => d.artifactId.includes('mybatis') || d.groupId.includes('mybatis'))) {
        databases.push('MyBatis');
      }
      if (dependencies.some(d => d.artifactId === 'spring-data-jpa')) {
        databases.push('Spring Data JPA');
      }
      if (dependencies.some(d => d.artifactId.includes('jooq'))) {
        databases.push('jOOQ');
      }

      if (databases.length > 0) {
        techStack.database = databases.join(', ');
      }

      // 检测测试框架
      const testFrameworks: string[] = [];
      const junitDep = dependencies.find(d => d.groupId === 'junit' || d.groupId === 'org.junit.jupiter');
      if (junitDep) {
        const version = junitDep.version ? this.extractMavenVersion(junitDep.version) : '';
        if (junitDep.groupId === 'org.junit.jupiter') {
          testFrameworks.push(`JUnit 5 ${version}`);
        } else {
          testFrameworks.push(`JUnit ${version}`);
        }
      }
      if (dependencies.some(d => d.artifactId.includes('testng'))) {
        testFrameworks.push('TestNG');
      }
      if (dependencies.some(d => d.artifactId.includes('mockito'))) {
        testFrameworks.push('Mockito');
      }
      if (dependencies.some(d => d.artifactId.includes('spring-boot-starter-test'))) {
        testFrameworks.push('Spring Test');
      }

      if (testFrameworks.length > 0) {
        techStack.testing = testFrameworks.join(', ');
      }

      // 关键库
      const keyLibMappings = [
        { artifactIds: ['httpclient', 'httpclient5', 'okhttp'], name: 'HTTP Client' },
        { artifactIds: ['jackson-databind', 'gson', 'fastjson'], name: 'JSON' },
        { artifactIds: ['lombok'], name: 'Lombok' },
        { artifactIds: ['slf4j-api', 'logback-classic', 'log4j'], name: 'Logging' },
        { artifactIds: ['guava'], name: 'Guava' },
        { artifactIds: ['commons-lang3', 'commons-collections4'], name: 'Apache Commons' },
        { artifactIds: ['spring-security'], name: 'Spring Security' },
        { artifactIds: ['spring-cloud'], name: 'Spring Cloud' },
        { artifactIds: ['kafka-clients'], name: 'Kafka' },
        { artifactIds: ['rabbitmq'], name: 'RabbitMQ' }
      ];

      for (const mapping of keyLibMappings) {
        const dep = dependencies.find(d => 
          mapping.artifactIds.some(aid => d.artifactId.includes(aid))
        );
        if (dep && !techStack.keyLibraries.some(l => l.name === mapping.name)) {
          const version = dep.version ? this.extractMavenVersion(dep.version) : '';
          techStack.keyLibraries.push({
            name: mapping.name,
            version: version
          });
        }
      }

      return techStack;
    } catch (error) {
      console.error('Failed to extract Java Maven tech stack:', error);
      return null;
    }
  }

  /**
   * 从版本字符串中提取版本号
   */
  private extractVersion(versionString: string): string {
    // 移除 ^, ~, >= 等前缀
    return versionString.replace(/^[\^~>=<]+/, '').split('.').slice(0, 2).join('.');
  }

  /**
   * 从 Maven 版本字符串中提取版本号（处理属性占位符）
   */
  private extractMavenVersion(versionString: string): string {
    // 如果是属性占位符（如 ${spring.version}），返回空字符串
    if (versionString.startsWith('${')) {
      return '';
    }
    // 提取主版本和次版本号
    const parts = versionString.split('.');
    return parts.slice(0, Math.min(2, parts.length)).join('.');
  }

  /**
   * 提取 Python 项目的技术栈信息
   */
  private extractPythonTechStack(workspaceRoot: string): TechStack | null {
    try {
      const techStack: TechStack = {
        frameworks: [],
        keyLibraries: [],
      };

      // 读取依赖信息
      const dependencies: Map<string, string> = new Map();

      // 1. 尝试从 requirements.txt 读取
      const requirementsPath = path.join(workspaceRoot, 'requirements.txt');
      if (fs.existsSync(requirementsPath)) {
        const content = fs.readFileSync(requirementsPath, 'utf-8');
        const lines = content.split('\n');
        
        for (const line of lines) {
          const trimmed = line.trim();
          // 跳过注释和空行
          if (!trimmed || trimmed.startsWith('#')) {
            continue;
          }
          
          // 解析包名和版本 (支持 package==1.0.0, package>=1.0.0 等格式)
          const match = trimmed.match(/^([a-zA-Z0-9_-]+)([><=!]+)?([0-9.]+)?/);
          if (match) {
            const packageName = match[1].toLowerCase();
            const version = match[3] || '';
            dependencies.set(packageName, version);
          }
        }
      }

      // 2. 尝试从 pyproject.toml 读取（Poetry 或 PEP 518）
      const pyprojectPath = path.join(workspaceRoot, 'pyproject.toml');
      if (fs.existsSync(pyprojectPath)) {
        const content = fs.readFileSync(pyprojectPath, 'utf-8');
        
        // 简单解析 [tool.poetry.dependencies] 部分
        const depsMatch = content.match(/\[tool\.poetry\.dependencies\]([\s\S]*?)(\[|$)/);
        if (depsMatch) {
          const depsSection = depsMatch[1];
          const lines = depsSection.split('\n');
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith('#')) {
              continue;
            }
            
            const match = trimmed.match(/^([a-zA-Z0-9_-]+)\s*=\s*["']([^"']+)["']/);
            if (match) {
              const packageName = match[1].toLowerCase();
              const versionSpec = match[2];
              // 提取版本号
              const versionMatch = versionSpec.match(/[0-9.]+/);
              const version = versionMatch ? versionMatch[0] : '';
              dependencies.set(packageName, version);
            }
          }
        }
        
        // 检查 Python 版本要求
        const pythonMatch = content.match(/python\s*=\s*["'][\^~>=<]*([0-9.]+)/);
        if (pythonMatch) {
          techStack.language = `Python ${pythonMatch[1]}`;
        }
      }

      // 3. 尝试从 setup.py 读取
      const setupPyPath = path.join(workspaceRoot, 'setup.py');
      if (fs.existsSync(setupPyPath)) {
        const content = fs.readFileSync(setupPyPath, 'utf-8');
        
        // 查找 install_requires
        const installReqMatch = content.match(/install_requires\s*=\s*\[([\s\S]*?)\]/);
        if (installReqMatch) {
          const reqsSection = installReqMatch[1];
          const matches = reqsSection.matchAll(/["']([a-zA-Z0-9_-]+)([><=!]+)?([0-9.]+)?["']/g);
          
          for (const match of matches) {
            const packageName = match[1].toLowerCase();
            const version = match[3] || '';
            dependencies.set(packageName, version);
          }
        }
      }

      // 如果没有读取到依赖，至少标记为 Python 项目
      if (dependencies.size === 0) {
        techStack.language = 'Python';
        return techStack;
      }

      // 检测 Python 版本（从 .python-version 或 runtime.txt）
      if (!techStack.language) {
        const pythonVersionPath = path.join(workspaceRoot, '.python-version');
        if (fs.existsSync(pythonVersionPath)) {
          const version = fs.readFileSync(pythonVersionPath, 'utf-8').trim();
          techStack.language = `Python ${version}`;
        } else {
          techStack.language = 'Python';
        }
      }

      // 检测 Web 框架
      if (dependencies.has('django')) {
        techStack.frameworks.push({
          name: 'Django',
          version: this.extractPythonVersion(dependencies.get('django') || '')
        });
      }
      if (dependencies.has('flask')) {
        techStack.frameworks.push({
          name: 'Flask',
          version: this.extractPythonVersion(dependencies.get('flask') || '')
        });
      }
      if (dependencies.has('fastapi')) {
        techStack.frameworks.push({
          name: 'FastAPI',
          version: this.extractPythonVersion(dependencies.get('fastapi') || '')
        });
      }
      if (dependencies.has('tornado')) {
        techStack.frameworks.push({
          name: 'Tornado',
          version: this.extractPythonVersion(dependencies.get('tornado') || '')
        });
      }
      if (dependencies.has('pyramid')) {
        techStack.frameworks.push({
          name: 'Pyramid',
          version: this.extractPythonVersion(dependencies.get('pyramid') || '')
        });
      }
      if (dependencies.has('sanic')) {
        techStack.frameworks.push({
          name: 'Sanic',
          version: this.extractPythonVersion(dependencies.get('sanic') || '')
        });
      }

      // 检测数据库和 ORM
      const databases: string[] = [];
      
      if (dependencies.has('sqlalchemy')) {
        databases.push('SQLAlchemy');
      }
      if (dependencies.has('django')) {
        databases.push('Django ORM');
      }
      if (dependencies.has('pymongo') || dependencies.has('motor')) {
        databases.push('MongoDB');
      }
      if (dependencies.has('psycopg2') || dependencies.has('psycopg2-binary')) {
        databases.push('PostgreSQL');
      }
      if (dependencies.has('mysqlclient') || dependencies.has('pymysql')) {
        databases.push('MySQL');
      }
      if (dependencies.has('redis')) {
        databases.push('Redis');
      }
      if (dependencies.has('elasticsearch')) {
        databases.push('Elasticsearch');
      }
      if (dependencies.has('tortoise-orm')) {
        databases.push('Tortoise ORM');
      }
      if (dependencies.has('peewee')) {
        databases.push('Peewee');
      }

      if (databases.length > 0) {
        techStack.database = databases.join(', ');
      }

      // 检测测试框架
      const testFrameworks: string[] = [];
      
      if (dependencies.has('pytest')) {
        testFrameworks.push(`pytest ${this.extractPythonVersion(dependencies.get('pytest') || '')}`);
      }
      if (dependencies.has('unittest2')) {
        testFrameworks.push('unittest');
      }
      if (dependencies.has('nose') || dependencies.has('nose2')) {
        testFrameworks.push('nose');
      }
      if (dependencies.has('pytest-cov')) {
        testFrameworks.push('Coverage');
      }

      if (testFrameworks.length > 0) {
        techStack.testing = testFrameworks.join(', ');
      }

      // 关键库检测（扩充了更多常见库）
      const keyLibMappings = [
        // HTTP 客户端
        { packages: ['requests', 'httpx', 'aiohttp'], name: 'HTTP Client' },
        
        // 数据科学
        { packages: ['numpy'], name: 'NumPy' },
        { packages: ['pandas'], name: 'Pandas' },
        { packages: ['scipy'], name: 'SciPy' },
        
        // 机器学习 / AI
        { packages: ['tensorflow', 'tf'], name: 'TensorFlow' },
        { packages: ['torch', 'pytorch'], name: 'PyTorch' },
        { packages: ['scikit-learn', 'sklearn'], name: 'scikit-learn' },
        { packages: ['keras'], name: 'Keras' },
        { packages: ['transformers'], name: 'Transformers' },
        
        // LLM / AI 框架
        { packages: ['langchain', 'langchain-core'], name: 'LangChain' },
        { packages: ['langchain-openai'], name: 'LangChain OpenAI' },
        { packages: ['openai'], name: 'OpenAI' },
        { packages: ['anthropic'], name: 'Anthropic' },
        { packages: ['llama-index', 'llama_index'], name: 'LlamaIndex' },
        
        // 异步 / 任务队列
        { packages: ['celery'], name: 'Celery' },
        { packages: ['asyncio'], name: 'AsyncIO' },
        { packages: ['aiofiles'], name: 'Async Files' },
        
        // 数据验证
        { packages: ['pydantic'], name: 'Pydantic' },
        { packages: ['marshmallow'], name: 'Marshmallow' },
        
        // 图像处理
        { packages: ['pillow', 'pil'], name: 'Pillow' },
        { packages: ['opencv-python', 'cv2'], name: 'OpenCV' },
        
        // 网络爬虫
        { packages: ['beautifulsoup4', 'bs4'], name: 'BeautifulSoup' },
        { packages: ['scrapy'], name: 'Scrapy' },
        { packages: ['selenium'], name: 'Selenium' },
        
        // 可视化
        { packages: ['matplotlib'], name: 'Matplotlib' },
        { packages: ['seaborn'], name: 'Seaborn' },
        { packages: ['plotly'], name: 'Plotly' },
        
        // 配置 / 环境
        { packages: ['python-dotenv'], name: 'Dotenv' },
        { packages: ['pydantic-settings'], name: 'Pydantic Settings' },
        
        // 日志
        { packages: ['loguru'], name: 'Loguru' },
        
        // API 文档
        { packages: ['fastapi'], name: 'FastAPI (detected as framework)' },
      ];

      // 收集已识别的库
      const recognizedPackages = new Set<string>();
      
      for (const mapping of keyLibMappings) {
        for (const pkg of mapping.packages) {
          if (dependencies.has(pkg)) {
            if (!techStack.keyLibraries.some(l => l.name === mapping.name)) {
              techStack.keyLibraries.push({
                name: mapping.name,
                version: this.extractPythonVersion(dependencies.get(pkg) || '')
              });
              recognizedPackages.add(pkg);
            }
            break;
          }
        }
      }

      // 收集未识别的依赖（其他主要依赖）
      // 排除一些太基础或内部使用的包
      const excludePackages = new Set([
        'pip', 'setuptools', 'wheel', 'certifi', 'charset-normalizer',
        'idna', 'urllib3', 'six', 'python-dateutil', 'pytz',
        'typing-extensions', 'packaging', 'pyparsing', 'attrs'
      ]);

      const otherDependencies: Array<{ name: string; version: string }> = [];
      
      for (const [pkg, version] of dependencies.entries()) {
        // 跳过已识别的、框架包、数据库包和排除列表中的包
        if (recognizedPackages.has(pkg) || excludePackages.has(pkg)) {
          continue;
        }
        
        // 跳过已经在框架中识别的包
        const frameworkPackages = techStack.frameworks.map(f => f.name.toLowerCase());
        if (frameworkPackages.some(fw => pkg.includes(fw.toLowerCase()))) {
          continue;
        }

        otherDependencies.push({
          name: pkg,
          version: this.extractPythonVersion(version)
        });
      }

      // 存储其他依赖
      if (otherDependencies.length > 0) {
        techStack.otherDependencies = otherDependencies;
      }

      return techStack;
    } catch (error) {
      console.error('Failed to extract Python tech stack:', error);
      return null;
    }
  }

  /**
   * 从 Python 版本字符串中提取版本号
   */
  private extractPythonVersion(versionString: string): string {
    if (!versionString) {
      return '';
    }
    // 提取第一个出现的版本号
    const match = versionString.match(/[0-9]+\.[0-9]+/);
    return match ? match[0] : '';
  }

  /**
   * 格式化技术栈为 Markdown（中文）
   */
  private formatTechStackCN(techStack: TechStack | null): string {
    if (!techStack) {
      return '';
    }

    let content = `## 🛠️ 技术栈\n\n`;

    if (techStack.language) {
      content += `**语言与运行时：**\n`;
      content += `- ${techStack.language}`;
      if (techStack.runtime) {
        content += ` + ${techStack.runtime}`;
      }
      content += `\n\n`;
    }

    if (techStack.frameworks.length > 0) {
      content += `**框架：**\n`;
      for (const fw of techStack.frameworks) {
        content += `- ${fw.name} ${fw.version}\n`;
      }
      content += `\n`;
    }

    if (techStack.database) {
      content += `**数据库：**\n`;
      content += `- ${techStack.database}\n\n`;
    }

    if (techStack.testing) {
      content += `**测试：**\n`;
      content += `- ${techStack.testing}\n\n`;
    }

    if (techStack.keyLibraries.length > 0) {
      content += `**关键依赖：**\n`;
      for (const lib of techStack.keyLibraries) {
        content += `- ${lib.name}`;
        if (lib.version) {
          content += ` (${lib.version})`;
        }
        content += `\n`;
      }
      content += `\n`;
    }

    if (techStack.otherDependencies && techStack.otherDependencies.length > 0) {
      content += `**其他主要依赖：**\n`;
      for (const dep of techStack.otherDependencies) {
        content += `- ${dep.name}`;
        if (dep.version) {
          content += ` (${dep.version})`;
        }
        content += `\n`;
      }
      content += `\n`;
    }

    content += `_完整依赖列表请参考项目配置文件（\`package.json\`、\`pom.xml\` 或 \`requirements.txt\`）_\n\n`;
    content += `---\n\n`;

    return content;
  }

  /**
   * 格式化技术栈为 Markdown（英文）
   */
  private formatTechStackEN(techStack: TechStack | null): string {
    if (!techStack) {
      return '';
    }

    let content = `## 🛠️ Tech Stack\n\n`;

    if (techStack.language) {
      content += `**Language & Runtime:**\n`;
      content += `- ${techStack.language}`;
      if (techStack.runtime) {
        content += ` + ${techStack.runtime}`;
      }
      content += `\n\n`;
    }

    if (techStack.frameworks.length > 0) {
      content += `**Frameworks:**\n`;
      for (const fw of techStack.frameworks) {
        content += `- ${fw.name} ${fw.version}\n`;
      }
      content += `\n`;
    }

    if (techStack.database) {
      content += `**Database:**\n`;
      content += `- ${techStack.database}\n\n`;
    }

    if (techStack.testing) {
      content += `**Testing:**\n`;
      content += `- ${techStack.testing}\n\n`;
    }

    if (techStack.keyLibraries.length > 0) {
      content += `**Key Dependencies:**\n`;
      for (const lib of techStack.keyLibraries) {
        content += `- ${lib.name}`;
        if (lib.version) {
          content += ` (${lib.version})`;
        }
        content += `\n`;
      }
      content += `\n`;
    }

    if (techStack.otherDependencies && techStack.otherDependencies.length > 0) {
      content += `**Other Dependencies:**\n`;
      for (const dep of techStack.otherDependencies) {
        content += `- ${dep.name}`;
        if (dep.version) {
          content += ` (${dep.version})`;
        }
        content += `\n`;
      }
      content += `\n`;
    }

    content += `_For complete dependencies, see project configuration file (\`package.json\`, \`pom.xml\`, or \`requirements.txt\`)_\n\n`;
    content += `---\n\n`;

    return content;
  }
}

