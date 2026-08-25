import * as vscode from 'vscode';
import type { EntityType } from '../utils/types';
import type {
  KnowledgeEntity,
  KnowledgeGraphOrigin,
  KnowledgeRelation,
} from '../services/knowledgeGraphService';
import { KnowledgeGraphService } from '../services/knowledgeGraphService';
import type { AgentGraphEvidence } from '../services/agentGraph';
import { t } from '../i18n/i18nService';

type ItemType = 'root' | 'category' | 'entity' | 'relation' | 'observation';
type RootKind = 'entities' | 'relations';

interface RelationDisplay {
  relation: KnowledgeRelation;
  sourceEntity: KnowledgeEntity;
  targetEntity: KnowledgeEntity;
  description?: string;
  evidence?: AgentGraphEvidence[];
}

interface TreeItemOptions {
  type: ItemType;
  rootKind?: RootKind;
  entityType?: EntityType;
  entity?: KnowledgeEntity;
  origin?: KnowledgeGraphOrigin;
  relationData?: RelationDisplay;
  observationData?: { id: string; content: string; entityId: string };
  parent?: KnowledgeTreeItem;
}

export class KnowledgeTreeItem extends vscode.TreeItem {
  public readonly type: ItemType;
  public readonly rootKind?: RootKind;
  public readonly entityType?: EntityType;
  public readonly entity?: KnowledgeEntity;
  public readonly origin?: KnowledgeGraphOrigin;
  public readonly relationData?: RelationDisplay;
  public readonly observationData?: {
    id: string;
    content: string;
    entityId: string;
  };
  public readonly parent?: KnowledgeTreeItem;

  constructor(
    label: string,
    collapsibleState: vscode.TreeItemCollapsibleState,
    options: TreeItemOptions
  ) {
    super(label, collapsibleState);
    this.type = options.type;
    this.rootKind = options.rootKind;
    this.entityType = options.entityType;
    this.entity = options.entity;
    this.origin = options.origin;
    this.relationData = options.relationData;
    this.observationData = options.observationData;
    this.parent = options.parent;

    if (options.type === 'observation' && options.observationData) {
      this.tooltip = options.observationData.content;
      this.contextValue = 'observation';
      this.iconPath = new vscode.ThemeIcon('note');
      return;
    }

    if (options.type === 'entity' && options.entity) {
      const tooltip = [
        `${options.entity.name} (${options.entity.type})`,
        `${options.entity.filePath}:${options.entity.startLine}`,
      ];
      if (options.entity.description !== undefined) {
        tooltip.push(options.entity.description || '(empty description)');
      }
      this.tooltip = tooltip.join('\n');
      this.description = `${options.entity.filePath}:${options.entity.startLine}`;
      // Provenance stays internal so generated records cannot be deleted as if
      // they were SQLite rows, while both appear in one Knowledge Graph.
      this.contextValue = options.entity.origin === 'agent'
        ? 'agentEntity'
        : 'entity';
      this.command = {
        command: 'knowledge.jumpToEntity',
        title: 'Jump to Entity',
        arguments: [options.entity],
      };
      this.iconPath = new vscode.ThemeIcon(
        KnowledgeTreeItem.getIconForType(options.entity.type)
      );
      return;
    }

    if (options.type === 'relation' && options.relationData) {
      const { relation, sourceEntity, targetEntity } = options.relationData;
      const tooltipLines = [
        `${sourceEntity.name} ${relation.verb} ${targetEntity.name}`,
      ];
      if (options.relationData.description) {
        tooltipLines.push(options.relationData.description);
      }
      if (options.relationData.evidence?.length) {
        const evidenceLabel = t().agentGraph.treeView.evidence;
        tooltipLines.push(
          `${evidenceLabel}:`,
          ...options.relationData.evidence.map(
            (evidence) =>
              `• ${evidence.filePath}:${evidence.startLine}${
                evidence.endLine ? `-${evidence.endLine}` : ''
              }${evidence.detail ? ` — ${evidence.detail}` : ''}`
          )
        );
      }
      this.tooltip = tooltipLines.join('\n');
      this.description = relation.verb;
      this.contextValue = relation.origin === 'agent'
        ? 'agentRelation'
        : 'relation';
      this.iconPath = new vscode.ThemeIcon('arrow-right');
      this.command = {
        command: 'knowledge.jumpToEntity',
        title: 'Jump to Source Entity',
        arguments: [sourceEntity],
      };
      return;
    }

    if (options.type === 'root') {
      this.contextValue = 'root';
      this.iconPath = new vscode.ThemeIcon(
        options.rootKind === 'entities' ? 'symbol-namespace' : 'references'
      );
    } else if (options.type === 'category' && options.entityType) {
      this.contextValue = 'category';
      this.iconPath = new vscode.ThemeIcon(
        KnowledgeTreeItem.getIconForType(options.entityType)
      );
    }
  }

  private static getIconForType(type: EntityType): string {
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
      external: 'package',
      other: 'symbol-misc',
    };
    return iconMap[type];
  }
}

export class KnowledgeTreeDataProvider
  implements vscode.TreeDataProvider<KnowledgeTreeItem>
{
  private readonly _onDidChangeTreeData = new vscode.EventEmitter<
    KnowledgeTreeItem | undefined | null | void
  >();
  public readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  private searchQuery = '';
  private expandAllState = false;

  constructor(private readonly graphService: KnowledgeGraphService) {}

  public refresh(): void {
    this.graphService.refresh();
    this._onDidChangeTreeData.fire();
  }

  public setSearchQuery(query: string): void {
    this.searchQuery = query;
    this.refresh();
  }

  public async expandAll(): Promise<void> {
    this.expandAllState = true;
    this.refresh();
  }

  public getTreeItem(element: KnowledgeTreeItem): vscode.TreeItem {
    return element;
  }

  public getParent(
    element: KnowledgeTreeItem
  ): vscode.ProviderResult<KnowledgeTreeItem> {
    return element.parent;
  }

  public getChildren(element?: KnowledgeTreeItem): Thenable<KnowledgeTreeItem[]> {
    if (!element) {
      return Promise.resolve(this.getRoots());
    }
    if (element.type === 'root') {
      return Promise.resolve(
        element.rootKind === 'entities'
          ? this.getEntityCategories(element)
          : this.getRelations(element)
      );
    }
    if (element.type === 'category' && element.entityType) {
      return Promise.resolve(this.getEntities(element.entityType, element));
    }
    if (
      element.type === 'entity' &&
      element.entity?.origin === 'manual'
    ) {
      return Promise.resolve(this.getObservations(element.entity, element));
    }
    return Promise.resolve([]);
  }

  private getRoots(): KnowledgeTreeItem[] {
    const snapshot = this.graphService.getSnapshot();
    const translations = t().agentGraph.treeView;
    const agentError = this.graphService.getGenerationError();
    const entities = new KnowledgeTreeItem(
      `${agentError ? '⚠️ ' : ''}${translations.entities} (${snapshot.entities.length})`,
      vscode.TreeItemCollapsibleState.Expanded,
      { type: 'root', rootKind: 'entities' }
    );
    if (agentError) {
      entities.tooltip = `${translations.invalidManifest}: ${agentError.message}`;
    }
    return [
      entities,
      new KnowledgeTreeItem(
        `${translations.relations} (${snapshot.relations.length})`,
        this.expandAllState
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
        { type: 'root', rootKind: 'relations' }
      ),
    ];
  }

  private getEntityCategories(parent: KnowledgeTreeItem): KnowledgeTreeItem[] {
    const counts = new Map<EntityType, number>();
    for (const entity of this.getFilteredEntities()) {
      counts.set(entity.type, (counts.get(entity.type) || 0) + 1);
    }
    return Array.from(counts.entries())
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([entityType, count]) =>
          new KnowledgeTreeItem(
            `${this.capitalizeFirst(entityType)} (${count})`,
            this.expandAllState
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.Collapsed,
            { type: 'category', entityType, parent }
          )
      );
  }

  private getEntities(
    entityType: EntityType,
    parent: KnowledgeTreeItem
  ): KnowledgeTreeItem[] {
    return this.getFilteredEntities()
      .filter((entity) => entity.type === entityType)
      .map((entity) => {
        const observations = this.graphService.getObservations(entity.id);
        return new KnowledgeTreeItem(
          observations.length > 0
            ? `${entity.name} (${observations.length})`
            : entity.name,
          observations.length > 0
            ? this.expandAllState
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          { type: 'entity', entity, origin: entity.origin, parent }
        );
      });
  }

  private getObservations(
    entity: KnowledgeEntity,
    parent: KnowledgeTreeItem
  ): KnowledgeTreeItem[] {
    return this.graphService.getObservations(entity.id).map(
      (observation) =>
        new KnowledgeTreeItem(
          observation.content.length > 50
            ? `${observation.content.substring(0, 50)}...`
            : observation.content,
          vscode.TreeItemCollapsibleState.None,
          {
            type: 'observation',
            entity,
            observationData: {
              id: observation.id,
              content: observation.content,
              entityId: observation.entityId,
            },
            parent,
          }
        )
    );
  }

  private getRelations(parent: KnowledgeTreeItem): KnowledgeTreeItem[] {
    const snapshot = this.graphService.getSnapshot();
    const visibleEntities = this.getFilteredEntities();
    const entityById = new Map(visibleEntities.map((entity) => [entity.id, entity]));
    return snapshot.relations.flatMap((relation) => {
      const sourceEntity = entityById.get(relation.sourceEntityId);
      const targetEntity = entityById.get(relation.targetEntityId);
      if (!sourceEntity || !targetEntity) {
        return [];
      }
      const relationData: RelationDisplay = {
        relation,
        sourceEntity,
        targetEntity,
        description:
          typeof relation.metadata?.description === 'string'
            ? relation.metadata.description
            : undefined,
        evidence: Array.isArray(relation.metadata?.evidence)
          ? (relation.metadata.evidence as AgentGraphEvidence[])
          : undefined,
      };
      return [
        new KnowledgeTreeItem(
          `${sourceEntity.name} → ${targetEntity.name}`,
          vscode.TreeItemCollapsibleState.None,
          { type: 'relation', relationData, origin: relation.origin, parent }
        ),
      ];
    });
  }

  private getFilteredEntities(): KnowledgeEntity[] {
    const entities = this.graphService.listEntities();
    if (!this.searchQuery) {
      return entities;
    }
    const query = this.searchQuery.toLocaleLowerCase();
    return entities.filter(
      (entity) =>
        entity.name.toLocaleLowerCase().includes(query) ||
        entity.filePath.toLocaleLowerCase().includes(query) ||
        entity.description?.toLocaleLowerCase().includes(query)
    );
  }

  private capitalizeFirst(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
