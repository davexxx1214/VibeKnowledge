import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { EntityService } from './entityService';
import { RelationService } from './relationService';
import { ObservationService } from './observationService';
import { DependencyAnalyzer } from './dependencyAnalyzer';
import { Entity, Relation, Observation } from '../utils/types';
import type { KnowledgeGraphService } from './knowledgeGraphService';
import { t, getLocale } from '../i18n/i18nService';

/**
 * 导出服务
 * 负责将知识图谱导出为不同格式
 */
export class ExportService {
  private dependencyAnalyzer: DependencyAnalyzer;

  constructor(
    private entityService: EntityService,
    private relationService: RelationService,
    private observationService: ObservationService,
    private knowledgeGraphService?: KnowledgeGraphService
  ) {
    this.dependencyAnalyzer = new DependencyAnalyzer(entityService, relationService);
  }

  /**
   * 导出为 Markdown 格式
   */
  public async exportToMarkdown(
    outputPath: string,
    options: { includeDependencyAnalysis?: boolean } = {}
  ): Promise<void> {
    const entities = this.getEntities();
    const allRelations = this.getAllRelations();

    let markdown = this.generateMarkdownHeader();
    markdown += this.generateOverview(entities, allRelations);
    markdown += this.generateEntitySections(entities);
    markdown += this.generateRelationSection(allRelations, entities);

    // 添加依赖链分析（如果需要）
    if (options.includeDependencyAnalysis) {
      markdown += this.generateDependencyAnalysisSection();
    }

    // 写入文件
    fs.writeFileSync(outputPath, markdown, 'utf-8');
  }

  /**
   * 生成 Markdown 文件头部
   */
  private generateMarkdownHeader(): string {
    const translations = t().export;
    const timestamp = new Date().toLocaleString(getLocale());
    return `# ${translations.title}

> ${translations.exportedAt}：${timestamp}

---

`;
  }

  /**
   * 生成概览部分
   */
  private generateOverview(entities: Entity[], relations: Relation[]): string {
    const translations = t().export.overview;
    const entityTypeCount = this.countEntityTypes(entities);
    
    let overview = `## ${translations.title}\n\n`;
    overview += `- **${translations.totalEntities}**：${entities.length}\n`;
    overview += `- **${translations.totalRelations}**：${relations.length}\n`;
    overview += `- **${translations.entityTypeDistribution}**：\n`;
    
    for (const [type, count] of Object.entries(entityTypeCount)) {
      overview += `  - ${this.getTypeIcon(type)} ${type}: ${count}\n`;
    }
    
    overview += `\n---\n\n`;
    return overview;
  }

  /**
   * 生成实体部分
   */
  private generateEntitySections(entities: Entity[]): string {
    const translations = t().export.entityList;
    // 按类型分组
    const entitiesByType = this.groupEntitiesByType(entities);
    
    let sections = `## ${translations.title}\n\n`;
    
    for (const [type, typeEntities] of Object.entries(entitiesByType)) {
      sections += `### ${this.getTypeIcon(type)} ${type.toUpperCase()} (${typeEntities.length})\n\n`;
      
      for (const entity of typeEntities) {
        sections += this.generateEntityDetail(entity);
      }
      
      sections += `---\n\n`;
    }
    
    return sections;
  }

  /**
   * 生成单个实体的详细信息
   */
  private generateEntityDetail(entity: Entity): string {
    const translations = t().export.entityList;
    let detail = `#### ${entity.name}\n\n`;
    
    // 基本信息
    detail += `**${translations.type}**：${entity.type}  \n`;
    detail += `**${translations.location}**：\`${entity.filePath}\` (行 ${entity.startLine}-${entity.endLine})  \n`;
    
    if (entity.description) {
      detail += `**${translations.description}**：${entity.description}  \n`;
    }
    
    detail += `**${translations.createdAt}**：${new Date(entity.createdAt).toLocaleString(getLocale())}  \n`;
    
    // 观察记录
    const observations = this.getObservations(entity.id);
    if (observations.length > 0) {
      detail += `\n**${translations.observations}** (${observations.length})：\n\n`;
      for (const obs of observations) {
        const obsTime = new Date(obs.createdAt).toLocaleString(getLocale());
        detail += `- ${obs.content} _(${obsTime})_\n`;
      }
    }
    
    // 关系
    const relations = this.getRelationsByEntity(entity.id);
    if (relations.length > 0) {
      detail += `\n**${translations.relations}** (${relations.length})：\n\n`;
      
      // 出边（作为源）
      const outgoing = relations.filter(r => r.sourceEntityId === entity.id);
      if (outgoing.length > 0) {
        detail += `_${translations.outgoing}：_\n`;
        for (const rel of outgoing) {
          const target = this.getEntity(rel.targetEntityId);
          if (target) {
            detail += `- ${entity.name} **${rel.verb}** → ${target.name} (\`${target.type}\`)\n`;
          }
        }
      }
      
      // 入边（作为目标）
      const incoming = relations.filter(r => r.targetEntityId === entity.id);
      if (incoming.length > 0) {
        detail += `\n_${translations.incoming}：_\n`;
        for (const rel of incoming) {
          const source = this.getEntity(rel.sourceEntityId);
          if (source) {
            detail += `- ${source.name} (\`${source.type}\`) **${rel.verb}** → ${entity.name}\n`;
          }
        }
      }
    }
    
    detail += `\n`;
    return detail;
  }

  /**
   * 生成关系部分
   */
  private generateRelationSection(relations: Relation[], _entities: Entity[]): string {
    const translations = t().export.relationGraph;
    let section = `## ${translations.title}\n\n`;
    
    if (relations.length === 0) {
      section += `_暂无关系_\n\n`;
      return section;
    }
    
    // 按关系类型分组
    const relationsByVerb = this.groupRelationsByVerb(relations);
    
    for (const [verb, verbRelations] of Object.entries(relationsByVerb)) {
      section += `### ${verb.toUpperCase()} (${verbRelations.length})\n\n`;
      
      for (const rel of verbRelations) {
        const source = this.getEntity(rel.sourceEntityId);
        const target = this.getEntity(rel.targetEntityId);
        
        if (source && target) {
          section += `- **${source.name}** (\`${source.type}\`) → **${target.name}** (\`${target.type}\`)\n`;
          section += `  - ${translations.source}：\`${source.filePath}:${source.startLine}\`\n`;
          section += `  - ${translations.target}：\`${target.filePath}:${target.startLine}\`\n`;
        }
      }
      
      section += `\n`;
    }
    
    section += `---\n\n`;
    return section;
  }

  /**
   * 统计实体类型数量
   */
  private countEntityTypes(entities: Entity[]): Record<string, number> {
    const count: Record<string, number> = {};
    for (const entity of entities) {
      count[entity.type] = (count[entity.type] || 0) + 1;
    }
    return count;
  }

  /**
   * 按类型分组实体
   */
  private groupEntitiesByType(entities: Entity[]): Record<string, Entity[]> {
    const grouped: Record<string, Entity[]> = {};
    for (const entity of entities) {
      if (!grouped[entity.type]) {
        grouped[entity.type] = [];
      }
      grouped[entity.type].push(entity);
    }
    
    // 按名称排序每个分组
    for (const type in grouped) {
      grouped[type].sort((a, b) => a.name.localeCompare(b.name));
    }
    
    return grouped;
  }

  /**
   * 按关系类型分组
   */
  private groupRelationsByVerb(relations: Relation[]): Record<string, Relation[]> {
    const grouped: Record<string, Relation[]> = {};
    for (const rel of relations) {
      if (!grouped[rel.verb]) {
        grouped[rel.verb] = [];
      }
      grouped[rel.verb].push(rel);
    }
    return grouped;
  }

  /**
   * 获取实体类型对应的图标
   */
  private getTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      function: '📁',
      class: '🏛️',
      interface: '📋',
      variable: '📌',
      component: '🧩',
      service: '⚙️',
      api: '🌐',
      config: '⚙️',
      database: '🗄️',
      other: '📄',
    };
    return icons[type] || '📄';
  }

  /**
   * 导出为 JSON 格式
   */
  public async exportToJSON(outputPath: string): Promise<void> {
    const entities = this.getEntities();
    const relations = this.getAllRelations();
    
    // 收集所有观察记录
    const observations: Record<string, Observation[]> = {};
    for (const entity of entities) {
      observations[entity.id] = this.getObservations(entity.id);
    }
    
    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.0',
      statistics: {
        entityCount: entities.length,
        relationCount: relations.length,
        observationCount: Object.values(observations).flat().length,
      },
      entities,
      relations,
      observations,
    };
    
    const json = JSON.stringify(exportData, null, 2);
    fs.writeFileSync(outputPath, json, 'utf-8');
  }

  /**
   * 生成依赖链分析部分
   */
  private generateDependencyAnalysisSection(): string {
    let section = `## 📊 依赖链分析\n\n`;

    // 全局统计
    const stats = this.dependencyAnalyzer.getGlobalDependencyStats();
    section += `### 全局统计\n\n`;
    section += `- **总实体数**：${stats.totalEntities}\n`;
    section += `- **有依赖的实体**：${stats.entitiesWithDependencies}\n`;
    section += `- **平均依赖数**：${stats.averageDependencies}\n`;
    section += `- **最大依赖深度**：${stats.maxDependencyDepth}\n`;
    section += `- **循环依赖数**：${stats.circularDependencyCount}\n\n`;

    // 依赖最多的实体
    if (stats.topDependencies.length > 0) {
      section += `### 📈 依赖最多的实体 (Top ${Math.min(10, stats.topDependencies.length)})\n\n`;
      for (let i = 0; i < stats.topDependencies.length; i++) {
        const item = stats.topDependencies[i];
        section += `${i + 1}. **${item.entity.name}** (\`${item.entity.type}\`) - ${item.dependencyCount} 个依赖\n`;
        section += `   - 位置：\`${item.entity.filePath}:${item.entity.startLine}\`\n`;
      }
      section += `\n`;
    }

    // 详细依赖树（只显示依赖数量 > 0 的实体）
    const entities = this.getEntities();
    const entitiesWithDeps = entities.filter(entity => {
      const chain = this.dependencyAnalyzer.analyzeDependencyChain(entity.id);
      return chain && chain.totalDependencies > 0;
    });

    if (entitiesWithDeps.length > 0) {
      section += `### 🌳 依赖树（前 ${Math.min(5, entitiesWithDeps.length)} 个）\n\n`;
      
      // 按依赖数量排序，只显示前5个
      const sortedEntities = entitiesWithDeps.slice(0, 5);
      
      for (const entity of sortedEntities) {
        const tree = this.dependencyAnalyzer.buildDependencyTree(entity.id, 3); // 限制深度为3
        if (tree) {
          section += `#### ${entity.name}\n\n`;
          section += '```\n';
          section += this.dependencyAnalyzer.treeToString(tree);
          section += '```\n\n';
        }
      }
    }

    // 循环依赖检测
    const allCircular = this.detectAllCircularDependencies();
    if (allCircular.length > 0) {
      section += `### ⚠️ 循环依赖警告\n\n`;
      section += `检测到 ${allCircular.length} 个循环依赖：\n\n`;
      
      for (let i = 0; i < allCircular.length; i++) {
        const circular = allCircular[i];
        section += `#### 循环 ${i + 1}\n\n`;
        const entityNames = circular.chain.map(e => `**${e.name}**`).join(' → ');
        section += `${entityNames} → **${circular.chain[0].name}**\n\n`;
        section += `_关系链：_\n`;
        for (let j = 0; j < circular.relations.length; j++) {
          const rel = circular.relations[j];
          const source = circular.chain[j];
          const target = circular.chain[j + 1] || circular.chain[0];
          section += `- ${source.name} **${rel.verb}** ${target.name}\n`;
        }
        section += `\n`;
      }
    }

    section += `---\n\n`;
    return section;
  }

  /**
   * 检测所有循环依赖
   */
  private detectAllCircularDependencies() {
    const entities = this.getEntities();
    const allCircular = new Map<string, any>();

    for (const entity of entities) {
      const circular = this.dependencyAnalyzer.detectCircularDependencies(entity.id);
      for (const circ of circular) {
        // 使用排序后的ID作为key，避免重复
        const key = circ.chain.map(e => e.id).sort().join('-');
        if (!allCircular.has(key)) {
          allCircular.set(key, circ);
        }
      }
    }

    return Array.from(allCircular.values());
  }

  /**
   * 生成导出文件名
   */
  public generateExportFileName(format: 'md' | 'json'): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
    const workspaceName = vscode.workspace.workspaceFolders?.[0]?.name || 'knowledge-graph';
    return `${workspaceName}-export-${timestamp}.${format}`;
  }

  /**
   * 生成实体上下文（用于复制到剪贴板）
   * 格式化单个实体的完整信息，适合粘贴给 AI
   */
  public generateEntityContext(entityId: string): string {
    const entity = this.getEntity(entityId);
    if (!entity) {
      throw new Error('实体不存在');
    }

    let context = `# 实体上下文：${entity.name}\n\n`;
    context += `**类型**：${entity.type}\n`;
    context += `**位置**：\`${entity.filePath}\`（第 ${entity.startLine}-${entity.endLine} 行）\n\n`;

    if (entity.description) {
      context += `**描述**：${entity.description}\n\n`;
    }

    // 观察记录
    const observations = this.getObservations(entity.id);
    if (observations.length > 0) {
      context += `## 观察记录 (${observations.length})\n\n`;
      observations.forEach((obs, i) => {
        context += `${i + 1}. ${obs.content}\n`;
      });
      context += `\n`;
    }

    // 关系
    const relations = this.getRelationsByEntity(entity.id);
    if (relations.length > 0) {
      context += `## 关系 (${relations.length})\n\n`;

      // 出边
      const outgoing = relations.filter(r => r.sourceEntityId === entity.id);
      if (outgoing.length > 0) {
        context += `### 依赖项（此实体使用的其他实体）\n\n`;
        outgoing.forEach(rel => {
          const target = this.getEntity(rel.targetEntityId);
          if (target) {
            context += `- **${rel.verb}** → ${target.name} (\`${target.type}\` 在 \`${target.filePath}:${target.startLine}\`)\n`;
          }
        });
        context += `\n`;
      }

      // 入边
      const incoming = relations.filter(r => r.targetEntityId === entity.id);
      if (incoming.length > 0) {
        context += `### 被依赖项（依赖此实体的其他实体）\n\n`;
        incoming.forEach(rel => {
          const source = this.getEntity(rel.sourceEntityId);
          if (source) {
            context += `- ${source.name} (\`${source.type}\` 在 \`${source.filePath}:${source.startLine}\`) **${rel.verb}** → 此实体\n`;
          }
        });
        context += `\n`;
      }
    }

    context += `---\n`;
    context += `_生成时间：${new Date().toLocaleString(getLocale())}_\n`;

    return context;
  }

  /**
   * 生成当前文件上下文
   * 导出当前文件中的所有实体、关系和观察记录
   */
  public generateFileContext(filePath: string): string {
    // 获取文件中的所有实体
    const allEntities = this.getEntities();
    const fileEntities = allEntities.filter(e => e.filePath === filePath);

    if (fileEntities.length === 0) {
      return `# 文件上下文：${filePath}\n\n_此文件中暂无知识图谱数据_\n`;
    }

    let context = `# 文件上下文：${path.basename(filePath)}\n\n`;
    context += `**完整路径**：\`${filePath}\`\n`;
    context += `**实体数量**：${fileEntities.length}\n\n`;
    context += `---\n\n`;

    // 按类型分组
    const entitiesByType = this.groupEntitiesByType(fileEntities);

    for (const [type, entities] of Object.entries(entitiesByType)) {
      context += `## ${this.getTypeIcon(type)} ${type.toUpperCase()} (${entities.length})\n\n`;

      for (const entity of entities) {
        context += `### ${entity.name}\n\n`;
        context += `**位置**：第 ${entity.startLine}-${entity.endLine} 行\n`;

        if (entity.description) {
          context += `**描述**：${entity.description}\n`;
        }

        // 观察记录
        const observations = this.getObservations(entity.id);
        if (observations.length > 0) {
          context += `\n**观察记录** (${observations.length})：\n`;
          observations.forEach(obs => {
            context += `- ${obs.content}\n`;
          });
        }

        // 关系
        const relations = this.getRelationsByEntity(entity.id);
        if (relations.length > 0) {
          context += `\n**关系** (${relations.length})：\n`;
          
          const outgoing = relations.filter(r => r.sourceEntityId === entity.id);
          if (outgoing.length > 0) {
            outgoing.forEach(rel => {
              const target = this.getEntity(rel.targetEntityId);
              if (target) {
                context += `- ${rel.verb} → ${target.name} (\`${target.filePath}\`)\n`;
              }
            });
          }

          const incoming = relations.filter(r => r.targetEntityId === entity.id);
          if (incoming.length > 0) {
            incoming.forEach(rel => {
              const source = this.getEntity(rel.sourceEntityId);
              if (source) {
                context += `- ← ${rel.verb} ${source.name} (\`${source.filePath}\`)\n`;
              }
            });
          }
        }

        context += `\n`;
      }

      context += `---\n\n`;
    }

    context += `_生成时间：${new Date().toLocaleString(getLocale())}_\n`;

    return context;
  }

  /**
   * 生成 AI 摘要
   * 生成简洁的项目概览，适合作为 AI 对话的上下文
   */
  public generateAISummary(): string {
    const entities = this.getEntities();
    const relations = this.getAllRelations();
    
    if (entities.length === 0) {
      return `# 项目知识图谱摘要\n\n_此项目暂无知识图谱数据_\n`;
    }

    let summary = `# 项目知识图谱摘要\n\n`;
    
    // 统计信息
    const stats = {
      totalEntities: entities.length,
      totalRelations: relations.length,
      totalObservations: 0,
      entityTypes: this.countEntityTypes(entities),
    };

    // 统计所有观察记录
    entities.forEach(entity => {
      const observations = this.getObservations(entity.id);
      stats.totalObservations += observations.length;
    });

    const translations = t().export.statistics;
    summary += `## ${translations.title}\n\n`;
    summary += `- ${translations.totalEntities}：${stats.totalEntities}\n`;
    summary += `- ${translations.totalRelations}：${stats.totalRelations}\n`;
    summary += `- 观察记录：${stats.totalObservations}\n\n`;

    summary += `**${translations.typeDistribution}：**\n`;
    for (const [type, count] of Object.entries(stats.entityTypes)) {
      summary += `- ${this.getTypeIcon(type)} ${type}: ${count}\n`;
    }
    summary += `\n`;

    // 关键组件（有观察记录或关系多的实体）
    const keyEntities = entities
      .map(entity => {
        const observations = this.getObservations(entity.id);
        const relations = this.getRelationsByEntity(entity.id);
        return {
          entity,
          score: observations.length * 2 + relations.length,
          observations,
          relations,
        };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    if (keyEntities.length > 0) {
      summary += `## 🎯 关键组件\n\n`;
      keyEntities.forEach((item, i) => {
        const { entity, observations, relations } = item;
        summary += `${i + 1}. **${entity.name}** (\`${entity.type}\`)\n`;
        summary += `   - 位置：\`${entity.filePath}:${entity.startLine}\`\n`;
        
        if (entity.description) {
          summary += `   - 描述：${entity.description}\n`;
        }

        if (observations.length > 0) {
          summary += `   - 观察记录 (${observations.length})：\n`;
          observations.slice(0, 2).forEach(obs => {
            const preview = obs.content.length > 60 
              ? obs.content.substring(0, 60) + '...'
              : obs.content;
            summary += `     · ${preview}\n`;
          });
          if (observations.length > 2) {
            summary += `     · ...还有 ${observations.length - 2} 条\n`;
          }
        }

        if (relations.length > 0) {
          summary += `   - 关系数量：${relations.length}\n`;
        }

        summary += `\n`;
      });
    }

    // 重要观察记录（包含 TODO、FIXME、WARNING 等关键词）
    const importantKeywords = ['todo', 'fixme', 'bug', 'warning', 'performance', '性能', '问题', '待办', '优化'];
    const importantObservations: Array<{ entity: Entity; observation: Observation }> = [];

    entities.forEach(entity => {
      const observations = this.getObservations(entity.id);
      observations.forEach(obs => {
        const lowerContent = obs.content.toLowerCase();
        if (importantKeywords.some(keyword => lowerContent.includes(keyword))) {
          importantObservations.push({ entity, observation: obs });
        }
      });
    });

    if (importantObservations.length > 0) {
      summary += `## ⚠️ 重要提示\n\n`;
      importantObservations.slice(0, 5).forEach(({ entity, observation }, i) => {
        summary += `${i + 1}. **${entity.name}**：${observation.content}\n`;
      });
      if (importantObservations.length > 5) {
        summary += `\n_...还有 ${importantObservations.length - 5} 条重要观察记录_\n`;
      }
      summary += `\n`;
    }

    // 架构概览（显示主要关系）
    const relationsByVerb = this.groupRelationsByVerb(relations);
    if (Object.keys(relationsByVerb).length > 0) {
      summary += `## ${t().export.architectureOverview}\n\n`;
      for (const [verb, verbRelations] of Object.entries(relationsByVerb)) {
        summary += `**${verb}** (${verbRelations.length} 个关系)\n`;
      }
      summary += `\n`;
    }

    summary += `---\n`;
    summary += `_生成时间：${new Date().toLocaleString(getLocale())}_\n`;
    summary += `\n`;
    summary += `> 💡 **使用提示**：此摘要包含了项目的关键信息，您可以：\n`;
    summary += `> - 将其作为 AI 对话的上下文，帮助 AI 更好地理解项目结构\n`;
    summary += `> - 用于快速了解项目的核心组件和重要注意事项\n`;
    summary += `> - 分享给团队成员作为项目概览\n`;

    return summary;
  }

  private getEntities(): Entity[] {
    return this.knowledgeGraphService
      ? this.knowledgeGraphService.listEntities()
      : this.entityService.listEntities({});
  }

  private getAllRelations(): Relation[] {
    return this.knowledgeGraphService
      ? this.knowledgeGraphService.listRelations()
      : this.relationService.getAllRelations();
  }

  private getEntity(entityId: string): Entity | null {
    return this.knowledgeGraphService
      ? this.knowledgeGraphService.getEntity(entityId)
      : this.entityService.getEntity(entityId);
  }

  private getObservations(entityId: string): Observation[] {
    return this.knowledgeGraphService
      ? this.knowledgeGraphService.getObservations(entityId)
      : this.observationService.getObservations(entityId);
  }

  private getRelationsByEntity(entityId: string): Relation[] {
    if (this.knowledgeGraphService) {
      return this.knowledgeGraphService
        .listRelations()
        .filter(
          (relation) =>
            relation.sourceEntityId === entityId ||
            relation.targetEntityId === entityId
        );
    }
    return this.relationService.getRelationsByEntity(entityId);
  }
}

