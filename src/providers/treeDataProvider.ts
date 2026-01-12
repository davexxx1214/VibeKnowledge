import * as vscode from 'vscode';
import { Entity, EntityType } from '../utils/types';
import { EntityService } from '../services/entityService';
import { RelationService } from '../services/relationService';
import { ObservationService } from '../services/observationService';
import { AutoGraphService, AutoEntity } from '../services/autoGraph';
import { t } from '../i18n/i18nService';

/**
 * 树视图项
 */
export class KnowledgeTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState,
    public readonly entity?: Entity | AutoEntity,
    public readonly type?: 'root' | 'graph-root' | 'category' | 'entity' | 'relation' | 'observation',
    public readonly relationData?: any,
    public readonly isAuto?: boolean,
    public readonly observationData?: { id: string; content: string; entityId: string }
  ) {
    super(label, collapsibleState);

    if (type === 'observation' && observationData) {
      // 观察记录节点
      this.tooltip = observationData.content;
      this.description = '';
      this.contextValue = isAuto ? 'autoObservation' : 'observation';
      this.iconPath = new vscode.ThemeIcon('note');
    } else if (entity && (type === 'entity' || !type)) {
      this.tooltip = `${entity.name} (${entity.type})${isAuto ? ' [Auto]' : ''}`;
      this.description = `${entity.filePath}:${entity.startLine}`;
      this.contextValue = isAuto ? 'autoEntity' : 'entity';
      
      // 设置命令：点击时跳转到代码位置
      this.command = {
        command: 'knowledge.jumpToEntity',
        title: 'Jump to Entity',
        arguments: [entity],
      };

      // 设置图标
      this.iconPath = new vscode.ThemeIcon(this.getIconForType(entity.type as EntityType));
    } else if (type === 'relation' && relationData) {
      // 关系节点
      this.tooltip = `${relationData.sourceName} ${relationData.verb} ${relationData.targetName}${isAuto ? ' [Auto]' : ''}`;
      this.description = relationData.verb;
      this.contextValue = isAuto ? 'autoRelation' : 'relation';
      this.iconPath = new vscode.ThemeIcon('arrow-right');
      
      // 设置命令：点击时跳转到源实体
      if (relationData.sourceEntity) {
        this.command = {
          command: 'knowledge.jumpToEntity',
          title: 'Jump to Source Entity',
          arguments: [relationData.sourceEntity],
        };
      }
    } else if (type === 'graph-root') {
      // 图谱根节点（手动/自动）
      this.contextValue = 'graphRoot';
      this.iconPath = new vscode.ThemeIcon(isAuto ? 'zap' : 'edit');
    } else if (type === 'root') {
      // 分类根节点（Entities/Relations）
      this.contextValue = 'root';
      this.iconPath = new vscode.ThemeIcon(
        label.includes('Entities') || label.includes('实体') ? 'symbol-namespace' : 'references'
      );
    } else if (type === 'category') {
      this.contextValue = 'category';
      this.iconPath = new vscode.ThemeIcon('folder');
    }
  }

  private getIconForType(type: EntityType): string {
    const iconMap: Record<EntityType, string> = {
      function: 'symbol-function',
      class: 'symbol-class',
      interface: 'symbol-interface',
      variable: 'symbol-variable',
      file: 'file',
      directory: 'folder',
      api: 'globe',
      config: 'settings-gear',
      database: 'database',
      service: 'server',
      component: 'symbol-module',
      other: 'symbol-misc',
    };

    return iconMap[type] || 'symbol-misc';
  }
}

/**
 * 树视图数据提供者
 */
export class KnowledgeTreeDataProvider implements vscode.TreeDataProvider<KnowledgeTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<KnowledgeTreeItem | undefined | null | void> = 
    new vscode.EventEmitter<KnowledgeTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<KnowledgeTreeItem | undefined | null | void> = 
    this._onDidChangeTreeData.event;

  private searchQuery: string = '';
  private expandAllState: boolean = false;
  private treeView?: vscode.TreeView<KnowledgeTreeItem>;
  private cachedRootNodes: KnowledgeTreeItem[] = [];
  private cachedCategoryNodes: Map<string, KnowledgeTreeItem> = new Map();
  private autoGraphService?: AutoGraphService;

  constructor(
    private entityService: EntityService,
    private relationService: RelationService,
    private observationService: ObservationService
  ) {}

  /**
   * 设置自动图谱服务
   */
  public setAutoGraphService(service: AutoGraphService): void {
    this.autoGraphService = service;
  }

  public setTreeView(treeView: vscode.TreeView<KnowledgeTreeItem>): void {
    this.treeView = treeView;
  }

  public refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.refresh();
  }

  public async expandAll(): Promise<void> {
    if (!this.treeView) {
      return;
    }

    this.expandAllState = true;
    this.refresh();

    // 等待视图刷新完成后展开节点
    setTimeout(async () => {
      try {
        // 使用缓存的节点引用来展开
        if (this.cachedRootNodes.length > 1) {
          const relationsNode = this.cachedRootNodes[1];
          await this.treeView?.reveal(relationsNode, { 
            expand: 2,
            select: false, 
            focus: false 
          }).catch((err) => {
            console.log('Failed to expand Relations node:', err);
          });
        }

        // 展开所有缓存的分类节点
        for (const [type, node] of this.cachedCategoryNodes.entries()) {
          await this.treeView?.reveal(node, { 
            expand: 1,
            select: false, 
            focus: false 
          }).catch((err) => {
            console.log(`Failed to expand ${type} node:`, err);
          });
        }
      } catch (error) {
        console.error('Error expanding all:', error);
      }
    }, 200); // 增加延迟到 200ms
  }

  getTreeItem(element: KnowledgeTreeItem): vscode.TreeItem {
    return element;
  }

  getParent(element: KnowledgeTreeItem): vscode.ProviderResult<KnowledgeTreeItem> {
    // 如果是分类节点，返回 Entities 根节点
    if (element.type === 'category') {
      return this.cachedRootNodes[0]; // Entities 节点
    }
    
    // 如果是实体节点，找到它的分类节点
    if (element.type === 'entity' && element.entity) {
      return this.cachedCategoryNodes.get(element.entity.type);
    }
    
    // 如果是关系节点，返回 Relations 根节点
    if (element.type === 'relation') {
      return this.cachedRootNodes[1]; // Relations 节点
    }
    
    // 根节点没有父节点
    return undefined;
  }

  getChildren(element?: KnowledgeTreeItem): Thenable<KnowledgeTreeItem[]> {
    if (!element) {
      // 最顶层：显示手动图谱和自动图谱两个根节点
      return Promise.resolve(this.getGraphRootNodes());
    } else if (element.type === 'graph-root') {
      // 图谱根节点：显示 Entities 和 Relations
      return Promise.resolve(this.getRootNodes(element.isAuto || false));
    } else if (element.type === 'root') {
      // 根节点：Entities 或 Relations
      const isAuto = element.isAuto || false;
      if (element.label.includes('Entities') || element.label.includes('实体')) {
        return Promise.resolve(this.getEntityCategories(isAuto));
      } else if (element.label.includes('Relations') || element.label.includes('关系')) {
        return Promise.resolve(this.getRelations(isAuto));
      }
    } else if (element.type === 'entity' && element.entity) {
      // 实体节点：显示观察记录
      const isAuto = element.isAuto || false;
      
      if (isAuto && this.autoGraphService) {
        const observations = this.autoGraphService.getObservationsByEntity(element.entity.id);
        return Promise.resolve(
          observations.map(obs => 
            new KnowledgeTreeItem(
              obs.content.length > 50 ? obs.content.substring(0, 50) + '...' : obs.content,
              vscode.TreeItemCollapsibleState.None,
              element.entity,
              'observation',
              undefined,
              true,
              { id: obs.id, content: obs.content, entityId: obs.entityId }
            )
          )
        );
      } else {
        const observations = this.observationService.getObservations(element.entity.id);
        return Promise.resolve(
          observations.map(obs => 
            new KnowledgeTreeItem(
              obs.content.length > 50 ? obs.content.substring(0, 50) + '...' : obs.content,
              vscode.TreeItemCollapsibleState.None,
              element.entity,
              'observation',
              undefined,
              false,
              { id: obs.id, content: obs.content, entityId: obs.entityId }
            )
          )
        );
      }
    } else if (element.type === 'category' && element.entity) {
      // 类别节点：显示该类型的所有实体
      const entityType = element.entity.type as EntityType;
      const isAuto = element.isAuto || false;
      
      if (isAuto && this.autoGraphService) {
        const entities = this.autoGraphService.listEntities({ type: entityType });
        return Promise.resolve(
          entities.map(entity => {
            // 检查是否有观察记录
            const observations = this.autoGraphService!.getObservationsByEntity(entity.id);
            const hasObservations = observations.length > 0;
            
            return new KnowledgeTreeItem(
              hasObservations ? `${entity.name} (${observations.length})` : entity.name,
              hasObservations ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
              entity,
              'entity',
              undefined,
              true
            );
          })
        );
      } else {
        const entities = this.entityService.getEntitiesByType(entityType);
        return Promise.resolve(
          entities.map(entity => 
            new KnowledgeTreeItem(
              entity.name,
              vscode.TreeItemCollapsibleState.None,
              entity,
              'entity',
              undefined,
              false
            )
          )
        );
      }
    }

    return Promise.resolve([]);
  }

  /**
   * 获取图谱根节点：手动图谱和自动图谱
   */
  private getGraphRootNodes(): KnowledgeTreeItem[] {
    const translations = t().autoGraph?.treeView || {
      manualGraph: 'Manual Graph',
      autoGraph: 'Auto Graph'
    };
    
    const manualEntities = this.entityService.listEntities();
    const manualRelations = this.getAllRelations(false);
    
    const autoEntities = this.autoGraphService?.listEntities() || [];
    const autoRelations = this.autoGraphService?.listRelations() || [];
    
    const nodes = [
      new KnowledgeTreeItem(
        `📝 ${translations.manualGraph} (${manualEntities.length} / ${manualRelations.length})`,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'graph-root',
        undefined,
        false
      ),
      new KnowledgeTreeItem(
        `⚡ ${translations.autoGraph} (${autoEntities.length} / ${autoRelations.length})`,
        this.autoGraphService ? vscode.TreeItemCollapsibleState.Collapsed : vscode.TreeItemCollapsibleState.None,
        undefined,
        'graph-root',
        undefined,
        true
      )
    ];
    
    this.cachedRootNodes = nodes;
    return nodes;
  }

  /**
   * 获取根节点：Entities 和 Relations
   */
  private getRootNodes(isAuto: boolean): KnowledgeTreeItem[] {
    const translations = t().autoGraph?.treeView || {
      entities: 'Entities',
      relations: 'Relations'
    };
    
    let entityCount: number;
    let relationCount: number;
    
    if (isAuto && this.autoGraphService) {
      entityCount = this.autoGraphService.listEntities().length;
      relationCount = this.autoGraphService.listRelations().length;
    } else {
      entityCount = this.entityService.listEntities().length;
      relationCount = this.getAllRelations(false).length;
    }
    
    const nodes = [
      new KnowledgeTreeItem(
        `${translations.entities} (${entityCount})`,
        vscode.TreeItemCollapsibleState.Expanded,
        undefined,
        'root',
        undefined,
        isAuto
      ),
      new KnowledgeTreeItem(
        `${translations.relations} (${relationCount})`,
        this.expandAllState ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
        undefined,
        'root',
        undefined,
        isAuto
      )
    ];
    
    return nodes;
  }

  /**
   * 获取实体分类
   */
  private getEntityCategories(isAuto: boolean): KnowledgeTreeItem[] {
    let entities: (Entity | AutoEntity)[];
    
    if (isAuto && this.autoGraphService) {
      entities = this.searchQuery 
        ? this.autoGraphService.listEntities({ name: this.searchQuery })
        : this.autoGraphService.listEntities();
    } else {
      entities = this.searchQuery 
        ? this.entityService.listEntities({ name: this.searchQuery })
        : this.entityService.listEntities();
    }

    // 按类型分组
    const groupedByType = new Map<EntityType, number>();
    entities.forEach(entity => {
      const count = groupedByType.get(entity.type as EntityType) || 0;
      groupedByType.set(entity.type as EntityType, count + 1);
    });

    // 创建类别节点
    const categories: KnowledgeTreeItem[] = [];
    groupedByType.forEach((count, type) => {
      const label = `${this.capitalizeFirst(type)} (${count})`;
      // 创建一个临时实体对象来存储类型信息
      const categoryEntity: Entity = {
        id: `category-${type}${isAuto ? '-auto' : ''}`,
        name: label,
        type: type,
        filePath: '',
        startLine: 0,
        endLine: 0,
        createdAt: 0,
        updatedAt: 0,
      };
      
      const categoryNode = new KnowledgeTreeItem(
        label,
        this.expandAllState ? vscode.TreeItemCollapsibleState.Expanded : vscode.TreeItemCollapsibleState.Collapsed,
        categoryEntity,
        'category',
        undefined,
        isAuto
      );
      
      // 缓存分类节点
      this.cachedCategoryNodes.set(`${type}${isAuto ? '-auto' : ''}`, categoryNode);
      categories.push(categoryNode);
    });

    return categories;
  }

  /**
   * 获取所有关系
   */
  private getAllRelations(isAuto: boolean): any[] {
    if (isAuto && this.autoGraphService) {
      const entities = this.autoGraphService.listEntities();
      const relations: any[] = [];
      
      entities.forEach(entity => {
        const outgoingRelations = this.autoGraphService!.getRelationsByEntity(entity.id, 'outgoing');
        outgoingRelations.forEach(relation => {
          const targetEntity = this.autoGraphService!.getEntity(relation.targetEntityId);
          if (targetEntity) {
            relations.push({
              id: relation.id,
              sourceId: entity.id,
              sourceName: entity.name,
              sourceEntity: entity,
              verb: relation.verb,
              targetId: targetEntity.id,
              targetName: targetEntity.name,
              targetEntity: targetEntity,
              isAuto: true
            });
          }
        });
      });
      
      return relations;
    } else {
      const entities = this.entityService.listEntities();
      const relations: any[] = [];
      
      entities.forEach(entity => {
        const outgoingRelations = this.relationService.getRelations(entity.id, 'outgoing');
        outgoingRelations.forEach(relation => {
          const targetEntity = this.entityService.getEntity(relation.targetEntityId);
          if (targetEntity) {
            relations.push({
              id: relation.id,
              sourceId: entity.id,
              sourceName: entity.name,
              sourceEntity: entity,
              verb: relation.verb,
              targetId: targetEntity.id,
              targetName: targetEntity.name,
              targetEntity: targetEntity,
              isAuto: false
            });
          }
        });
      });
      
      return relations;
    }
  }

  /**
   * 获取关系列表
   */
  private getRelations(isAuto: boolean): KnowledgeTreeItem[] {
    const relations = this.getAllRelations(isAuto);
    
    return relations.map(relation => 
      new KnowledgeTreeItem(
        `${relation.sourceName} → ${relation.targetName}`,
        vscode.TreeItemCollapsibleState.None,
        undefined,
        'relation',
        relation,
        isAuto
      )
    );
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

