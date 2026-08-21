import * as vscode from 'vscode';
import { Entity, EntityType } from '../utils/types';
import { EntityService } from '../services/entityService';
import { RelationService } from '../services/relationService';
import { ObservationService } from '../services/observationService';
import {
  AgentEntity,
  AgentGraphEvidence,
  AgentGraphService,
} from '../services/agentGraph';
import { t } from '../i18n/i18nService';

type GraphKind = 'manual' | 'agent';
type ItemType =
  | 'graph-root'
  | 'root'
  | 'category'
  | 'entity'
  | 'relation'
  | 'observation';
type RootKind = 'entities' | 'relations';

interface RelationDisplay {
  id: string;
  sourceId: string;
  sourceName: string;
  sourceEntity: Entity | AgentEntity;
  verb: string;
  targetId: string;
  targetName: string;
  targetEntity: Entity | AgentEntity;
  description?: string;
  evidence?: AgentGraphEvidence[];
}

interface TreeItemOptions {
  type: ItemType;
  graphKind?: GraphKind;
  rootKind?: RootKind;
  entityType?: EntityType;
  entity?: Entity | AgentEntity;
  relationData?: RelationDisplay;
  observationData?: { id: string; content: string; entityId: string };
  parent?: KnowledgeTreeItem;
}

export class KnowledgeTreeItem extends vscode.TreeItem {
  public readonly type: ItemType;
  public readonly graphKind?: GraphKind;
  public readonly rootKind?: RootKind;
  public readonly entityType?: EntityType;
  public readonly entity?: Entity | AgentEntity;
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
    this.graphKind = options.graphKind;
    this.rootKind = options.rootKind;
    this.entityType = options.entityType;
    this.entity = options.entity;
    this.relationData = options.relationData;
    this.observationData = options.observationData;
    this.parent = options.parent;
    const isAgent = options.graphKind === 'agent';

    if (options.type === 'observation' && options.observationData) {
      this.tooltip = options.observationData.content;
      this.contextValue = 'observation';
      this.iconPath = new vscode.ThemeIcon('note');
      return;
    }

    if (options.type === 'entity' && options.entity) {
      this.tooltip = `${options.entity.name} (${options.entity.type})${
        isAgent ? ' [Agent]' : ''
      }`;
      this.description = `${options.entity.filePath}:${options.entity.startLine}`;
      this.contextValue = isAgent ? 'agentEntity' : 'entity';
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
      const tooltipLines = [
        `${options.relationData.sourceName} ${options.relationData.verb} ${options.relationData.targetName}${
          isAgent ? ' [Agent]' : ''
        }`,
      ];
      if (options.relationData.description) {
        tooltipLines.push(options.relationData.description);
      }
      if (options.relationData.evidence?.length) {
        const evidenceLabel = t().agentGraph?.treeView.evidence || 'Evidence';
        tooltipLines.push(
          `${evidenceLabel}:`,
          ...options.relationData.evidence.map((evidence) =>
            `• ${evidence.filePath}:${evidence.startLine}${
              evidence.endLine ? `-${evidence.endLine}` : ''
            }${evidence.detail ? ` — ${evidence.detail}` : ''}`
          )
        );
      }
      this.tooltip = tooltipLines.join('\n');
      this.description = options.relationData.verb;
      this.contextValue = isAgent ? 'agentRelation' : 'relation';
      this.iconPath = new vscode.ThemeIcon('arrow-right');
      this.command = {
        command: 'knowledge.jumpToEntity',
        title: 'Jump to Source Entity',
        arguments: [options.relationData.sourceEntity],
      };
      return;
    }

    if (options.type === 'graph-root') {
      this.contextValue = 'graphRoot';
      this.iconPath = new vscode.ThemeIcon(isAgent ? 'sparkle' : 'edit');
    } else if (options.type === 'root') {
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

  constructor(
    private readonly entityService: EntityService,
    private readonly relationService: RelationService,
    private readonly observationService: ObservationService,
    private readonly agentGraphService: AgentGraphService
  ) {}

  public refresh(): void {
    this.agentGraphService.refresh();
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
      return Promise.resolve(this.getGraphRoots());
    }

    if (element.type === 'graph-root' && element.graphKind) {
      return Promise.resolve(this.getSectionRoots(element.graphKind, element));
    }

    if (element.type === 'root' && element.graphKind) {
      if (element.rootKind === 'entities') {
        return Promise.resolve(this.getEntityCategories(element.graphKind, element));
      }
      return Promise.resolve(this.getRelations(element.graphKind, element));
    }

    if (
      element.type === 'category' &&
      element.graphKind &&
      element.entityType
    ) {
      return Promise.resolve(
        this.getEntities(element.graphKind, element.entityType, element)
      );
    }

    if (
      element.type === 'entity' &&
      element.graphKind === 'manual' &&
      element.entity
    ) {
      return Promise.resolve(this.getObservations(element.entity, element));
    }

    return Promise.resolve([]);
  }

  private getGraphRoots(): KnowledgeTreeItem[] {
    const translations = t().agentGraph?.treeView || {
      manualGraph: 'Manual Graph',
      agentGraph: 'Agent Graph',
      entities: 'Entities',
      relations: 'Relations',
      evidence: 'Evidence',
      invalidManifest: 'Invalid Agent Graph manifest',
    };
    const manualEntityCount = this.entityService.listEntities().length;
    const manualRelationCount = this.relationService.getAllRelations().length;
    const agentStats = this.agentGraphService.getStats();
    const agentError = this.agentGraphService.getLastError();
    const manualRoot = new KnowledgeTreeItem(
      `📝 ${translations.manualGraph} (${manualEntityCount} / ${manualRelationCount})`,
      vscode.TreeItemCollapsibleState.Expanded,
      { type: 'graph-root', graphKind: 'manual' }
    );
    const agentRoot = new KnowledgeTreeItem(
      `${agentError ? '⚠️' : '🤖'} ${translations.agentGraph} (${agentStats.entityCount} / ${agentStats.relationCount})`,
      this.expandAllState
        ? vscode.TreeItemCollapsibleState.Expanded
        : vscode.TreeItemCollapsibleState.Collapsed,
      { type: 'graph-root', graphKind: 'agent' }
    );
    if (agentError) {
      agentRoot.iconPath = new vscode.ThemeIcon('warning');
      agentRoot.tooltip = `${translations.invalidManifest}: ${agentError.message}`;
    }

    return [manualRoot, agentRoot];
  }

  private getSectionRoots(
    graphKind: GraphKind,
    parent: KnowledgeTreeItem
  ): KnowledgeTreeItem[] {
    const translations = t().agentGraph?.treeView || {
      manualGraph: 'Manual Graph',
      agentGraph: 'Agent Graph',
      entities: 'Entities',
      relations: 'Relations',
      evidence: 'Evidence',
      invalidManifest: 'Invalid Agent Graph manifest',
    };
    const entityCount = this.getGraphEntities(graphKind).length;
    const relationCount = this.getGraphRelations(graphKind).length;

    return [
      new KnowledgeTreeItem(
        `${translations.entities} (${entityCount})`,
        vscode.TreeItemCollapsibleState.Expanded,
        { type: 'root', graphKind, rootKind: 'entities', parent }
      ),
      new KnowledgeTreeItem(
        `${translations.relations} (${relationCount})`,
        this.expandAllState
          ? vscode.TreeItemCollapsibleState.Expanded
          : vscode.TreeItemCollapsibleState.Collapsed,
        { type: 'root', graphKind, rootKind: 'relations', parent }
      ),
    ];
  }

  private getEntityCategories(
    graphKind: GraphKind,
    parent: KnowledgeTreeItem
  ): KnowledgeTreeItem[] {
    const counts = new Map<EntityType, number>();
    for (const entity of this.getGraphEntities(graphKind)) {
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
            { type: 'category', graphKind, entityType, parent }
          )
      );
  }

  private getEntities(
    graphKind: GraphKind,
    entityType: EntityType,
    parent: KnowledgeTreeItem
  ): KnowledgeTreeItem[] {
    return this.getGraphEntities(graphKind)
      .filter((entity) => entity.type === entityType)
      .map((entity) => {
        const observationCount =
          graphKind === 'manual'
            ? this.observationService.getObservations(entity.id).length
            : 0;
        return new KnowledgeTreeItem(
          observationCount > 0
            ? `${entity.name} (${observationCount})`
            : entity.name,
          observationCount > 0
            ? this.expandAllState
              ? vscode.TreeItemCollapsibleState.Expanded
              : vscode.TreeItemCollapsibleState.Collapsed
            : vscode.TreeItemCollapsibleState.None,
          { type: 'entity', graphKind, entity, parent }
        );
      });
  }

  private getObservations(
    entity: Entity | AgentEntity,
    parent: KnowledgeTreeItem
  ): KnowledgeTreeItem[] {
    return this.observationService.getObservations(entity.id).map(
      (observation) =>
        new KnowledgeTreeItem(
          observation.content.length > 50
            ? `${observation.content.substring(0, 50)}...`
            : observation.content,
          vscode.TreeItemCollapsibleState.None,
          {
            type: 'observation',
            graphKind: 'manual',
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

  private getRelations(
    graphKind: GraphKind,
    parent: KnowledgeTreeItem
  ): KnowledgeTreeItem[] {
    return this.getGraphRelations(graphKind).map(
      (relation) =>
        new KnowledgeTreeItem(
          `${relation.sourceName} → ${relation.targetName}`,
          vscode.TreeItemCollapsibleState.None,
          { type: 'relation', graphKind, relationData: relation, parent }
        )
    );
  }

  private getGraphEntities(graphKind: GraphKind): Array<Entity | AgentEntity> {
    const entities =
      graphKind === 'manual'
        ? this.entityService.listEntities()
        : this.agentGraphService.listEntities();
    if (!this.searchQuery) {
      return entities;
    }
    const query = this.searchQuery.toLocaleLowerCase();
    return entities.filter((entity) =>
      entity.name.toLocaleLowerCase().includes(query)
    );
  }

  private getGraphRelations(graphKind: GraphKind): RelationDisplay[] {
    const entities = this.getGraphEntities(graphKind);
    const entityById = new Map(entities.map((entity) => [entity.id, entity]));
    const relations =
      graphKind === 'manual'
        ? this.relationService.getAllRelations()
        : this.agentGraphService.listRelations();

    return relations.flatMap((relation) => {
      const sourceEntity = entityById.get(relation.sourceEntityId);
      const targetEntity = entityById.get(relation.targetEntityId);
      if (!sourceEntity || !targetEntity) {
        return [];
      }
      return [
        {
          id: relation.id,
          sourceId: sourceEntity.id,
          sourceName: sourceEntity.name,
          sourceEntity,
          verb: relation.verb,
          targetId: targetEntity.id,
          targetName: targetEntity.name,
          targetEntity,
          description:
            graphKind === 'agent' && typeof relation.metadata?.description === 'string'
              ? relation.metadata.description
              : undefined,
          evidence:
            graphKind === 'agent' && Array.isArray(relation.metadata?.evidence)
              ? relation.metadata.evidence as AgentGraphEvidence[]
              : undefined,
        },
      ];
    });
  }

  private capitalizeFirst(value: string): string {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }
}
