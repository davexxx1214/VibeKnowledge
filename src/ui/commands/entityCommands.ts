import * as vscode from 'vscode';
import * as path from 'path';
import { EntityService } from '../../services/entityService';
import { RelationService } from '../../services/relationService';
import { ObservationService } from '../../services/observationService';
import { ExportService } from '../../services/exportService';
import { AIIntegrationService, GraphData } from '../../services/aiIntegrationService';
import { AutoGraphService } from '../../services/autoGraph';
import { Entity, EntityType, Observation, Relation } from '../../utils/types';
import { t } from '../../i18n/i18nService';

/** 图谱数据源类型 */
export type GraphSourceType = 'manual' | 'auto' | 'merged';

/**
 * 实体相关的命令处理器
 */
export class EntityCommands {
  private exportService: ExportService;
  private aiIntegrationService: AIIntegrationService;
  private autoGraphService?: AutoGraphService;

  constructor(
    private entityService: EntityService,
    private relationService: RelationService,
    private observationService: ObservationService,
    autoGraphService?: AutoGraphService
  ) {
    this.autoGraphService = autoGraphService;
    this.exportService = new ExportService(
      entityService,
      relationService,
      observationService
    );
    this.aiIntegrationService = new AIIntegrationService(
      entityService,
      relationService,
      observationService
    );
  }

  /**
   * 选择图谱数据源
   */
  private async selectGraphSource(): Promise<GraphSourceType | undefined> {
    const translations = t().commands.selectGraphSource;
    
    const options: (vscode.QuickPickItem & { value: GraphSourceType })[] = [
      {
        label: translations.manual.label,
        description: translations.manual.description,
        value: 'manual'
      },
      {
        label: translations.auto.label,
        description: translations.auto.description,
        value: 'auto'
      },
      {
        label: translations.merged.label,
        description: translations.merged.description,
        value: 'merged'
      }
    ];

    const selected = await vscode.window.showQuickPick(options, {
      placeHolder: translations.title
    });

    return selected?.value;
  }

  /**
   * 根据选择的数据源获取图谱数据
   */
  private getGraphData(sourceType: GraphSourceType): GraphData {
    if (sourceType === 'manual') {
      // 手动图谱数据
      const entities = this.entityService.listEntities({});
      const relations = this.relationService.getAllRelations();
      const observations: Array<{ entityId: string; entityName: string; content: string }> = [];
      
      for (const entity of entities) {
        const entityObservations = this.observationService.getObservations(entity.id);
        for (const obs of entityObservations) {
          observations.push({
            entityId: entity.id,
            entityName: entity.name,
            content: obs.content
          });
        }
      }
      
      return { entities, relations, observations, sourceType: 'manual' };
    } else if (sourceType === 'auto' && this.autoGraphService) {
      // 自动图谱数据
      const autoEntities = this.autoGraphService.listEntities();
      const autoRelations = this.autoGraphService.listRelations();
      
      // 转换为通用格式
      const entities: Entity[] = autoEntities.map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        filePath: e.filePath,
        startLine: e.startLine,
        endLine: e.endLine,
        description: e.description,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt
      }));
      
      const relations: Relation[] = autoRelations.map(r => ({
        id: r.id,
        sourceEntityId: r.sourceEntityId,
        targetEntityId: r.targetEntityId,
        verb: r.verb,
        createdAt: r.createdAt
      }));
      
      // 获取自动图谱的观察记录
      const observations: Array<{ entityId: string; entityName: string; content: string }> = [];
      for (const entity of autoEntities) {
        const entityObservations = this.autoGraphService.getObservationsByEntity(entity.id);
        for (const obs of entityObservations) {
          observations.push({
            entityId: entity.id,
            entityName: entity.name,
            content: obs.content
          });
        }
      }
      
      return { entities, relations, observations, sourceType: 'auto' };
    } else if (sourceType === 'merged' && this.autoGraphService) {
      // 合并图谱数据
      const manualEntities = this.entityService.listEntities({});
      const manualRelations = this.relationService.getAllRelations();
      const autoEntities = this.autoGraphService.listEntities();
      const autoRelations = this.autoGraphService.listRelations();
      
      // 合并实体（按名称去重，手动优先）
      const entityMap = new Map<string, Entity>();
      
      // 先添加自动实体
      for (const e of autoEntities) {
        const key = `${e.name}::${e.filePath}`;
        entityMap.set(key, {
          id: e.id,
          name: e.name,
          type: e.type,
          filePath: e.filePath,
          startLine: e.startLine,
          endLine: e.endLine,
          description: e.description,
          createdAt: e.createdAt,
          updatedAt: e.updatedAt
        });
      }
      
      // 再添加手动实体（覆盖同名自动实体）
      for (const e of manualEntities) {
        const key = `${e.name}::${e.filePath}`;
        entityMap.set(key, e);
      }
      
      const entities = Array.from(entityMap.values());
      
      // 合并关系（需要映射 ID）
      const relations: Relation[] = [
        ...manualRelations,
        ...autoRelations.map(r => ({
          id: r.id,
          sourceEntityId: r.sourceEntityId,
          targetEntityId: r.targetEntityId,
          verb: r.verb,
          createdAt: r.createdAt
        }))
      ];
      
      // 合并观察记录
      const observations: Array<{ entityId: string; entityName: string; content: string }> = [];
      
      // 手动图谱的观察记录
      for (const entity of manualEntities) {
        const entityObservations = this.observationService.getObservations(entity.id);
        for (const obs of entityObservations) {
          observations.push({
            entityId: entity.id,
            entityName: entity.name,
            content: obs.content
          });
        }
      }
      
      // 自动图谱的观察记录
      for (const entity of autoEntities) {
        const entityObservations = this.autoGraphService.getObservationsByEntity(entity.id);
        for (const obs of entityObservations) {
          observations.push({
            entityId: entity.id,
            entityName: entity.name,
            content: obs.content
          });
        }
      }
      
      return { entities, relations, observations, sourceType: 'merged' };
    }
    
    // 默认返回手动图谱
    const entities = this.entityService.listEntities({});
    const relations = this.relationService.getAllRelations();
    const observations: Array<{ entityId: string; entityName: string; content: string }> = [];
    
    for (const entity of entities) {
      const entityObservations = this.observationService.getObservations(entity.id);
      for (const obs of entityObservations) {
        observations.push({
          entityId: entity.id,
          entityName: entity.name,
          content: obs.content
        });
      }
    }
    
    return { entities, relations, observations, sourceType: 'manual' };
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

  /**
   * 从选中的代码创建实体
   */
  public async createEntityFromSelection(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage(t().common.noActiveEditor);
      return;
    }

    const selection = editor.selection;
    const workspaceFolder = vscode.workspace.getWorkspaceFolder(editor.document.uri);
    if (!workspaceFolder) {
      vscode.window.showWarningMessage(t().common.fileNotInWorkspace);
      return;
    }

    // 获取选中的文本
    const selectedText = editor.document.getText(selection);
    const defaultName = selectedText.trim().split(/\s+/)[0] || 'New Entity';

    // 输入实体名称
    const name = await vscode.window.showInputBox({
      prompt: t().commands.createEntity.prompt,
      value: defaultName,
      validateInput: (value) => {
        return value.trim() ? null : t().commands.createEntity.validateEmpty;
      },
    });

    if (!name) {
      return;
    }

    // 选择实体类型
    const typeOptions: vscode.QuickPickItem[] = Object.entries(t().entityTypes).map(([key, value]) => ({
      label: value.label,
      description: value.description
    }));

    const selectedType = await vscode.window.showQuickPick(typeOptions, {
      placeHolder: t().commands.createEntity.placeholder,
    });

    if (!selectedType) {
      return;
    }

    // 输入描述（可选）
    const description = await vscode.window.showInputBox({
      prompt: t().common.description,
    });

    // 创建实体
    try {
      const relativePath = this.getRelativePath(editor.document);
      if (!relativePath) {
        vscode.window.showWarningMessage(t().common.fileNotInWorkspace);
        return;
      }

      const entity = this.entityService.createEntity(
        name,
        selectedType.label as EntityType,
        {
          filePath: relativePath,
          startLine: selection.start.line + 1,
          endLine: selection.end.line + 1,
        },
        description
      );

      vscode.window.showInformationMessage(
        t().commands.createEntity.success(entity.name)
      );
    } catch (error) {
      vscode.window.showErrorMessage(
        t().commands.createEntity.error(String(error))
      );
    }
  }

  /**
   * 为实体添加观察记录
   */
  public async addObservationToEntity(entityId?: string | any): Promise<void> {
    let targetEntityId: string | undefined;

    // 检查 entityId 参数类型
    // 如果是 URI 对象（从右键菜单调用），忽略它
    if (entityId && typeof entityId === 'string') {
      targetEntityId = entityId;
    }

    // 如果没有提供有效的实体 ID，尝试从当前位置查找
    if (!targetEntityId) {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        vscode.window.showWarningMessage(t().common.noActiveEditor);
        return;
      }

      const relativePath = this.getRelativePath(editor.document);
      if (!relativePath) {
        return;
      }

      const line = editor.selection.active.line + 1;
      const entity = this.entityService.findEntityAtLocation(relativePath, line);

      if (!entity) {
        vscode.window.showWarningMessage(t().commands.viewEntityDetails.notFound);
        return;
      }

      targetEntityId = entity.id;
    }

    // 输入观察内容
    const content = await vscode.window.showInputBox({
      prompt: t().commands.addObservation.prompt,
      placeHolder: t().commands.addObservation.placeholder,
      validateInput: (value) => {
        return value.trim() ? null : t().commands.addObservation.validateEmpty;
      },
    });

    if (!content) {
      return;
    }

    try {
      this.observationService.addObservation(targetEntityId!, content);
      vscode.window.showInformationMessage(t().commands.addObservation.success);
    } catch (error) {
      vscode.window.showErrorMessage(
        t().commands.addObservation.error(String(error))
      );
    }
  }

  /**
   * 查看实体详情
   */
  public async viewEntityDetails(entityId?: string | any): Promise<void> {
    let entity: Entity | null = null;

    // 检查 entityId 参数类型
    // 如果是 URI 对象（从右键菜单调用），忽略它
    if (entityId && typeof entityId === 'string') {
      entity = this.entityService.getEntity(entityId);
    }
    
    if (!entity) {
      // 从当前位置查找实体
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }

      const relativePath = this.getRelativePath(editor.document);
      if (!relativePath) {
        return;
      }

      const line = editor.selection.active.line + 1;
      entity = this.entityService.findEntityAtLocation(relativePath, line);
    }

    if (!entity) {
      vscode.window.showWarningMessage('Entity not found');
      return;
    }

    // 获取相关信息
    const observations = this.observationService.getObservations(entity.id);
    const relations = this.relationService.getRelatedEntities(entity.id);

    // 构建详情信息
    const lines: string[] = [
      `Entity: ${entity.name}`,
      `Type: ${entity.type}`,
      `Location: ${entity.filePath}:${entity.startLine}-${entity.endLine}`,
      '',
    ];

    if (entity.description) {
      lines.push(`Description: ${entity.description}`, '');
    }

    if (observations.length > 0) {
      lines.push(`Observations (${observations.length}):`);
      observations.forEach((obs, i) => {
        lines.push(`  ${i + 1}. ${obs.content}`);
      });
      lines.push('');
    }

    if (relations.length > 0) {
      lines.push(`Relations (${relations.length}):`);
      relations.forEach((rel) => {
        const arrow = rel.direction === 'outgoing' ? '→' : '←';
        lines.push(`  ${arrow} ${rel.relation.verb} ${arrow} ${rel.entity.name}`);
      });
    }

    // 显示在输出面板
    const output = vscode.window.createOutputChannel('Knowledge Graph');
    output.clear();
    output.appendLine(lines.join('\n'));
    output.show();
  }

  /**
   * 跳转到实体位置
   */
  public async jumpToEntity(entity: Entity): Promise<void> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders) {
      return;
    }

    const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, entity.filePath);
    
    try {
      const document = await vscode.workspace.openTextDocument(uri);
      const editor = await vscode.window.showTextDocument(document);

      // 跳转到实体位置
      const range = new vscode.Range(
        entity.startLine - 1,
        0,
        entity.endLine - 1,
        0
      );

      editor.selection = new vscode.Selection(range.start, range.end);
      editor.revealRange(range, vscode.TextEditorRevealType.InCenter);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to open file: ${error}`);
    }
  }

  /**
   * 搜索图谱
   */
  public async searchGraph(): Promise<void> {
    const query = await vscode.window.showInputBox({
      prompt: 'Search entities by name',
      placeHolder: 'Enter search query',
    });

    if (!query) {
      return;
    }

    const entities = this.entityService.listEntities({ name: query });

    if (entities.length === 0) {
      vscode.window.showInformationMessage('No entities found');
      return;
    }

    // 显示搜索结果
    const items: vscode.QuickPickItem[] = entities.map(entity => ({
      label: entity.name,
      description: `${entity.type} - ${entity.filePath}:${entity.startLine}`,
      detail: entity.description,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select an entity to view',
    });

    if (selected) {
      const entity = entities.find(e => e.name === selected.label);
      if (entity) {
        await this.jumpToEntity(entity);
      }
    }
  }

  /**
   * 从当前位置链接到实体（快捷方式）
   */
  public async linkToEntity(): Promise<void> {
    // 1. 获取当前编辑器和位置
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('No active editor');
      return;
    }

    // 2. 查找当前位置的实体
    const relativePath = this.getRelativePath(editor.document);
    if (!relativePath) {
      vscode.window.showWarningMessage('File is not in workspace');
      return;
    }

    const line = editor.selection.active.line + 1;
    const sourceEntity = this.entityService.findEntityAtLocation(relativePath, line);

    if (!sourceEntity) {
      vscode.window.showWarningMessage(
        'No entity found at current location. Create an entity first using "Knowledge: Create Entity from Selection"'
      );
      return;
    }

    // 3. 获取所有其他实体
    const allEntities = this.entityService.listEntities();
    const targetEntities = allEntities.filter(e => e.id !== sourceEntity.id);

    if (targetEntities.length === 0) {
      vscode.window.showWarningMessage(
        `No other entities to link to. Create more entities first.`
      );
      return;
    }

    // 4. 选择目标实体
    const targetItems = targetEntities.map(entity => ({
      label: entity.name,
      description: `${entity.type} - ${entity.filePath}:${entity.startLine}`,
      detail: entity.description,
      entity: entity
    }));

    const selectedTarget = await vscode.window.showQuickPick(targetItems, {
      placeHolder: `Link from: ${sourceEntity.name} → To:`,
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedTarget) {
      return;
    }

    // 5. 选择关系类型
    const verbOptions: (vscode.QuickPickItem & { verb: string })[] = [
      { 
        label: 'uses', 
        verb: 'uses',
        description: 'Uses or utilizes',
        detail: `${sourceEntity.name} uses ${selectedTarget.label}`
      },
      { 
        label: 'calls', 
        verb: 'calls',
        description: 'Calls or invokes',
        detail: `${sourceEntity.name} calls ${selectedTarget.label}`
      },
      { 
        label: 'extends', 
        verb: 'extends',
        description: 'Extends or inherits from',
        detail: `${sourceEntity.name} extends ${selectedTarget.label}`
      },
      { 
        label: 'implements', 
        verb: 'implements',
        description: 'Implements an interface',
        detail: `${sourceEntity.name} implements ${selectedTarget.label}`
      },
      { 
        label: 'depends_on', 
        verb: 'depends_on',
        description: 'Depends on',
        detail: `${sourceEntity.name} depends on ${selectedTarget.label}`
      },
      { 
        label: 'contains', 
        verb: 'contains',
        description: 'Contains or includes',
        detail: `${sourceEntity.name} contains ${selectedTarget.label}`
      },
      { 
        label: 'references', 
        verb: 'references',
        description: 'References or mentions',
        detail: `${sourceEntity.name} references ${selectedTarget.label}`
      },
      { 
        label: 'imports', 
        verb: 'imports',
        description: 'Imports from',
        detail: `${sourceEntity.name} imports ${selectedTarget.label}`
      },
      { 
        label: 'exports', 
        verb: 'exports',
        description: 'Exports to',
        detail: `${sourceEntity.name} exports ${selectedTarget.label}`
      }
    ];

    const selectedVerb = await vscode.window.showQuickPick(verbOptions, {
      placeHolder: 'Select relation type',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedVerb) {
      return;
    }

    // 6. 检查关系是否已存在
    const exists = this.relationService.relationExists(
      sourceEntity.id,
      selectedTarget.entity.id,
      selectedVerb.verb as any
    );

    if (exists) {
      const overwrite = await vscode.window.showWarningMessage(
        `Relation already exists: ${sourceEntity.name} ${selectedVerb.label} ${selectedTarget.label}`,
        'Continue Anyway',
        'Cancel'
      );
      
      if (overwrite !== 'Continue Anyway') {
        return;
      }
    }

    // 7. 创建关系
    try {
      this.relationService.addRelation(
        sourceEntity.id,
        selectedTarget.entity.id,
        selectedVerb.verb as any
      );

      vscode.window.showInformationMessage(
        `✅ Linked: ${sourceEntity.name} ${selectedVerb.label} ${selectedTarget.label}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to link entities: ${error}`);
    }
  }

  /**
   * 添加关系
   */
  public async addRelation(): Promise<void> {
    // 1. 获取所有实体
    const allEntities = this.entityService.listEntities();
    
    if (allEntities.length < 2) {
      vscode.window.showWarningMessage('Need at least 2 entities to create a relation');
      return;
    }

    // 2. 选择源实体（From）
    const sourceItems = allEntities.map(entity => ({
      label: entity.name,
      description: `${entity.type} - ${entity.filePath}:${entity.startLine}`,
      detail: entity.description,
      entity: entity
    }));

    const selectedSource = await vscode.window.showQuickPick(sourceItems, {
      placeHolder: 'Select source entity (From)',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedSource) {
      return;
    }

    // 3. 选择目标实体（To）
    const targetItems = allEntities
      .filter(e => e.id !== selectedSource.entity.id) // 排除源实体
      .map(entity => ({
        label: entity.name,
        description: `${entity.type} - ${entity.filePath}:${entity.startLine}`,
        detail: entity.description,
        entity: entity
      }));

    const selectedTarget = await vscode.window.showQuickPick(targetItems, {
      placeHolder: `Select target entity (To) - From: ${selectedSource.label}`,
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedTarget) {
      return;
    }

    // 4. 选择关系类型（Verb）
    const verbOptions: (vscode.QuickPickItem & { verb: string })[] = [
      { 
        label: 'uses', 
        verb: 'uses',
        description: 'Uses or utilizes',
        detail: `${selectedSource.label} uses ${selectedTarget.label}`
      },
      { 
        label: 'calls', 
        verb: 'calls',
        description: 'Calls or invokes',
        detail: `${selectedSource.label} calls ${selectedTarget.label}`
      },
      { 
        label: 'extends', 
        verb: 'extends',
        description: 'Extends or inherits from',
        detail: `${selectedSource.label} extends ${selectedTarget.label}`
      },
      { 
        label: 'implements', 
        verb: 'implements',
        description: 'Implements an interface',
        detail: `${selectedSource.label} implements ${selectedTarget.label}`
      },
      { 
        label: 'depends_on', 
        verb: 'depends_on',
        description: 'Depends on',
        detail: `${selectedSource.label} depends on ${selectedTarget.label}`
      },
      { 
        label: 'contains', 
        verb: 'contains',
        description: 'Contains or includes',
        detail: `${selectedSource.label} contains ${selectedTarget.label}`
      },
      { 
        label: 'references', 
        verb: 'references',
        description: 'References or mentions',
        detail: `${selectedSource.label} references ${selectedTarget.label}`
      },
      { 
        label: 'imports', 
        verb: 'imports',
        description: 'Imports from',
        detail: `${selectedSource.label} imports ${selectedTarget.label}`
      },
      { 
        label: 'exports', 
        verb: 'exports',
        description: 'Exports to',
        detail: `${selectedSource.label} exports ${selectedTarget.label}`
      }
    ];

    const selectedVerb = await vscode.window.showQuickPick(verbOptions, {
      placeHolder: 'Select relation type',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selectedVerb) {
      return;
    }

    // 5. 检查关系是否已存在
    const exists = this.relationService.relationExists(
      selectedSource.entity.id,
      selectedTarget.entity.id,
      selectedVerb.verb as any
    );

    if (exists) {
      const overwrite = await vscode.window.showWarningMessage(
        `Relation already exists: ${selectedSource.label} ${selectedVerb.label} ${selectedTarget.label}`,
        'Continue Anyway',
        'Cancel'
      );
      
      if (overwrite !== 'Continue Anyway') {
        return;
      }
    }

    // 6. 创建关系
    try {
      this.relationService.addRelation(
        selectedSource.entity.id,
        selectedTarget.entity.id,
        selectedVerb.verb as any
      );

      vscode.window.showInformationMessage(
        `✅ Relation created: ${selectedSource.label} ${selectedVerb.label} ${selectedTarget.label}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to create relation: ${error}`);
    }
  }

  /**
   * 编辑实体的观察记录
   */
  public async editObservation(treeItem?: any): Promise<void> {
    const translations = t().commands.editObservation;
    let targetEntity: Entity | null = null;

    if (treeItem?.entity) {
      targetEntity = treeItem.entity;
    } else if (treeItem && typeof treeItem === 'string') {
      targetEntity = this.entityService.getEntity(treeItem);
    }

    if (!targetEntity) {
      const editor = vscode.window.activeTextEditor;
      if (editor) {
        const relativePath = this.getRelativePath(editor.document);
        if (relativePath) {
          const line = editor.selection.active.line + 1;
          targetEntity = this.entityService.findEntityAtLocation(relativePath, line);
        }
      }
    }

    if (!targetEntity) {
      vscode.window.showWarningMessage(t().commands.viewEntityDetails.notFound);
      return;
    }

    const observations = this.observationService.getObservations(targetEntity.id);
    let selectedObservation: Observation | null = null;

    if (observations.length > 0) {
      const observationItems = observations.map((observation) => {
        const preview =
          observation.content.length > 80
            ? `${observation.content.substring(0, 80)}...`
            : observation.content;

        const timestamp = new Date(observation.updatedAt || observation.createdAt).toLocaleString();

        return {
          label: preview,
          description: timestamp,
          observation,
        } as vscode.QuickPickItem & { observation: Observation };
      });

      const selected = await vscode.window.showQuickPick(observationItems, {
        placeHolder: translations.selectPlaceholder,
        matchOnDescription: true,
      });

      if (!selected) {
        return;
      }

      selectedObservation = selected.observation;
    }

    const validationMessage =
      translations.validateEmpty || t().commands.addObservation.validateEmpty;

    const updatedContent = await this.openObservationEditorPanel(
      selectedObservation ? selectedObservation.content : '',
      translations
    );

    if (updatedContent === undefined) {
      return;
    }

    const trimmedContent = updatedContent.trim();
    if (!trimmedContent) {
      vscode.window.showWarningMessage(validationMessage);
      return;
    }

    try {
      if (selectedObservation) {
        const updated = this.observationService.updateObservation(
          selectedObservation.id,
          trimmedContent
        );

        if (!updated) {
          vscode.window.showErrorMessage(translations.error('Observation not found'));
          return;
        }

        vscode.window.showInformationMessage(translations.success(targetEntity.name));
      } else {
        this.observationService.addObservation(targetEntity.id, trimmedContent);
        const successMessage = t().commands.addObservation.success || translations.success(targetEntity.name);
        vscode.window.showInformationMessage(successMessage);
      }
    } catch (error) {
      vscode.window.showErrorMessage(translations.error(String(error)));
    }
  }

  /**
   * 删除观察记录
   */
  public async deleteObservation(): Promise<void> {
    // 1. 获取所有实体
    const allEntities = this.entityService.listEntities();
    
    if (allEntities.length === 0) {
      vscode.window.showWarningMessage('No entities found');
      return;
    }

    // 收集所有观察记录
    const allObservations: Array<{
      observation: any;
      entity: any;
      displayLabel: string;
    }> = [];

    for (const entity of allEntities) {
      const observations = this.observationService.getObservations(entity.id);
      for (const observation of observations) {
        // 截断长文本用于显示
        const preview = observation.content.length > 80 
          ? observation.content.substring(0, 80) + '...'
          : observation.content;
        
        allObservations.push({
          observation,
          entity,
          displayLabel: preview
        });
      }
    }

    if (allObservations.length === 0) {
      vscode.window.showInformationMessage('No observations to delete');
      return;
    }

    // 2. 让用户选择要删除的观察记录
    const observationItems = allObservations.map(item => ({
      label: item.displayLabel,
      description: `${item.entity.name} (${item.entity.type})`,
      detail: `${item.entity.filePath}:${item.entity.startLine}`,
      observationData: item
    }));

    const selected = await vscode.window.showQuickPick(observationItems, {
      placeHolder: 'Select observation to delete',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selected) {
      return;
    }

    // 3. 确认删除（显示完整内容）
    const fullContent = selected.observationData.observation.content;
    const answer = await vscode.window.showWarningMessage(
      `Delete observation?\n\n"${fullContent}"\n\nFrom: ${selected.observationData.entity.name}`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (answer !== 'Delete') {
      return;
    }

    // 4. 执行删除
    try {
      this.observationService.deleteObservation(selected.observationData.observation.id);
      vscode.window.showInformationMessage(
        `✅ Observation deleted from ${selected.observationData.entity.name}`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete observation: ${error}`);
    }
  }

  /**
   * 从树视图删除关系
   */
  public async deleteRelationFromTree(treeItem: any): Promise<void> {
    if (!treeItem || !treeItem.relationData) {
      vscode.window.showErrorMessage('Invalid relation data');
      return;
    }

    const relationData = treeItem.relationData;
    const displayLabel = `${relationData.sourceName} ${relationData.verb} ${relationData.targetName}`;

    // 确认删除
    const answer = await vscode.window.showWarningMessage(
      `Delete relation?\n\n${displayLabel}`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (answer !== 'Delete') {
      return;
    }

    // 执行删除
    try {
      this.relationService.removeRelation(relationData.id);
      vscode.window.showInformationMessage(`✅ Relation deleted: ${displayLabel}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete relation: ${error}`);
    }
  }

  /**
   * 删除关系（从命令面板，显示列表选择）
   */
  public async deleteRelation(): Promise<void> {
    // 1. 获取所有关系
    const allEntities = this.entityService.listEntities();
    
    if (allEntities.length === 0) {
      vscode.window.showWarningMessage('No entities found');
      return;
    }

    // 收集所有关系
    const allRelations: Array<{
      relation: any;
      sourceEntity: any;
      targetEntity: any;
      displayLabel: string;
    }> = [];

    for (const entity of allEntities) {
      const relations = this.relationService.getRelations(entity.id, 'outgoing');
      for (const relation of relations) {
        const targetEntity = this.entityService.getEntity(relation.targetEntityId);
        if (targetEntity) {
          allRelations.push({
            relation,
            sourceEntity: entity,
            targetEntity,
            displayLabel: `${entity.name} ${relation.verb} ${targetEntity.name}`
          });
        }
      }
    }

    if (allRelations.length === 0) {
      vscode.window.showInformationMessage('No relations to delete');
      return;
    }

    // 2. 让用户选择要删除的关系
    const relationItems = allRelations.map(item => ({
      label: item.displayLabel,
      description: `${item.sourceEntity.filePath}:${item.sourceEntity.startLine} → ${item.targetEntity.filePath}:${item.targetEntity.startLine}`,
      detail: `Type: ${item.relation.verb}`,
      relationData: item
    }));

    const selected = await vscode.window.showQuickPick(relationItems, {
      placeHolder: 'Select relation to delete',
      matchOnDescription: true,
      matchOnDetail: true
    });

    if (!selected) {
      return;
    }

    // 3. 确认删除
    const answer = await vscode.window.showWarningMessage(
      `Delete relation: ${selected.label}?`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (answer !== 'Delete') {
      return;
    }

    // 4. 执行删除
    try {
      this.relationService.removeRelation(selected.relationData.relation.id);
      vscode.window.showInformationMessage(`✅ Relation deleted: ${selected.label}`);
    } catch (error) {
      vscode.window.showErrorMessage(`Failed to delete relation: ${error}`);
    }
  }

  /**
   * 删除实体（从树视图右键调用）
   */
  public async deleteEntity(treeItem?: any): Promise<void> {
    let entityToDelete: Entity | null = null;

    // 如果从树视图右键调用，treeItem.entity 包含实体信息
    if (treeItem && treeItem.entity && treeItem.type === 'entity') {
      entityToDelete = treeItem.entity;
    } else {
      // 如果没有传入实体，让用户选择
      const entities = this.entityService.listEntities();
      if (entities.length === 0) {
        vscode.window.showInformationMessage('No entities to delete');
        return;
      }

      const selected = await vscode.window.showQuickPick(
        entities.map(e => ({
          label: e.name,
          description: `${e.type} - ${e.filePath}:${e.startLine}`,
          entity: e
        })),
        { placeHolder: 'Select entity to delete' }
      );

      if (!selected) {
        return;
      }

      entityToDelete = selected.entity;
    }

    if (!entityToDelete) {
      return;
    }

    // 确认删除
    const answer = await vscode.window.showWarningMessage(
      `Are you sure you want to delete entity "${entityToDelete.name}"?`,
      { modal: true },
      'Delete',
      'Cancel'
    );

    if (answer !== 'Delete') {
      return;
    }

    try {
      // 检查是否有关联的观察记录
      const observations = this.observationService.getObservations(entityToDelete.id);
      const relations = this.relationService.getRelations(entityToDelete.id);

      let confirmMessage = `Deleting entity "${entityToDelete.name}"`;
      if (observations.length > 0 || relations.length > 0) {
        confirmMessage += `\n\nThis will also delete:\n`;
        if (observations.length > 0) {
          confirmMessage += `- ${observations.length} observation(s)\n`;
        }
        if (relations.length > 0) {
          confirmMessage += `- ${relations.length} relation(s)\n`;
        }
        confirmMessage += `\nContinue?`;

        const finalConfirm = await vscode.window.showWarningMessage(
          confirmMessage,
          { modal: true },
          'Delete All',
          'Cancel'
        );

        if (finalConfirm !== 'Delete All') {
          return;
        }
      }

      // 执行删除
      const success = this.entityService.deleteEntity(entityToDelete.id);

      if (success) {
        vscode.window.showInformationMessage(`✅ Entity "${entityToDelete.name}" deleted successfully`);
      } else {
        vscode.window.showErrorMessage(`Failed to delete entity "${entityToDelete.name}"`);
      }
    } catch (error: any) {
      console.error('Error deleting entity:', error);
      vscode.window.showErrorMessage(`Error deleting entity: ${error.message}`);
    }
  }

  /**
   * 导出知识图谱
   */
  public async exportGraph(): Promise<void> {
    const translations = t().commands.exportGraph;
    
    // 选择导出格式
    const format = await vscode.window.showQuickPick(
      [
        { label: translations.format.markdown.label, description: translations.format.markdown.description, value: 'md' },
        { label: translations.format.markdownWithDeps.label, description: translations.format.markdownWithDeps.description, value: 'md-deps' },
        { label: translations.format.json.label, description: translations.format.json.description, value: 'json' },
      ],
      {
        placeHolder: translations.placeholder,
      }
    );

    if (!format) {
      return;
    }

    // 判断是否包含依赖分析
    const includeDeps = format.value === 'md-deps';
    const actualFormat = includeDeps ? 'md' : format.value;

    // 选择保存位置
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(translations.noWorkspace);
      return;
    }

    const defaultFileName = this.exportService.generateExportFileName(actualFormat as 'md' | 'json');
    const defaultUri = vscode.Uri.joinPath(workspaceFolder.uri, defaultFileName);

    const saveUri = await vscode.window.showSaveDialog({
      defaultUri,
      filters: actualFormat === 'md' 
        ? { 'Markdown': ['md'] }
        : { 'JSON': ['json'] },
      saveLabel: translations.saveLabel,
    });

    if (!saveUri) {
      return;
    }

    try {
      // 显示进度提示
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: translations.progress.title,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0, message: translations.progress.collecting });

          // 执行导出
          if (actualFormat === 'md') {
            progress.report({ increment: 30, message: translations.progress.generatingMarkdown });
            await this.exportService.exportToMarkdown(saveUri.fsPath, {
              includeDependencyAnalysis: includeDeps,
            });
          } else {
            progress.report({ increment: 30, message: translations.progress.generatingJSON });
            await this.exportService.exportToJSON(saveUri.fsPath);
          }

          progress.report({ increment: 100, message: translations.progress.complete });
        }
      );

      // 询问是否打开导出的文件
      const action = await vscode.window.showInformationMessage(
        translations.success(path.basename(saveUri.fsPath)),
        translations.openFile,
        translations.showInFolder
      );

      if (action === translations.openFile) {
        const doc = await vscode.workspace.openTextDocument(saveUri);
        await vscode.window.showTextDocument(doc);
      } else if (action === translations.showInFolder) {
        await vscode.commands.executeCommand('revealFileInOS', saveUri);
      }
    } catch (error) {
      vscode.window.showErrorMessage(translations.error(String(error)));
    }
  }

  /**
   * 生成 Cursor Rules
   */
  public async generateCursorRules(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(t().commands.generateCursorRules.noWorkspace);
      return;
    }

    // 选择图谱数据源
    const sourceType = await this.selectGraphSource();
    if (!sourceType) {
      return; // 用户取消
    }

    try {
      const graphData = this.getGraphData(sourceType);
      const filePath = await this.aiIntegrationService.generateCursorRules(
        workspaceFolder.uri.fsPath,
        graphData
      );

      const translations = t().commands.generateCursorRules;
      const action = await vscode.window.showInformationMessage(
        translations.success(path.basename(filePath)),
        translations.openFile,
        translations.showInFolder
      );

      if (action === translations.openFile) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      } else if (action === translations.showInFolder) {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
      }
    } catch (error) {
      vscode.window.showErrorMessage(t().commands.generateCursorRules.error(String(error)));
    }
  }

  /**
   * 生成 Copilot Instructions
   */
  public async generateCopilotInstructions(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(t().commands.generateCopilotInstructions.noWorkspace);
      return;
    }

    // 选择图谱数据源
    const sourceType = await this.selectGraphSource();
    if (!sourceType) {
      return; // 用户取消
    }

    try {
      const graphData = this.getGraphData(sourceType);
      const filePath = await this.aiIntegrationService.generateCopilotInstructions(
        workspaceFolder.uri.fsPath,
        graphData
      );

      const translations = t().commands.generateCopilotInstructions;
      const action = await vscode.window.showInformationMessage(
        translations.success(`.github/${path.basename(filePath)}`),
        translations.openFile,
        translations.showInFolder
      );

      if (action === translations.openFile) {
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      } else if (action === translations.showInFolder) {
        await vscode.commands.executeCommand('revealFileInOS', vscode.Uri.file(filePath));
      }
    } catch (error) {
      vscode.window.showErrorMessage(t().commands.generateCopilotInstructions.error(String(error)));
    }
  }

  /**
   * 生成所有 AI 配置
   */
  public async generateAllAIConfigs(): Promise<void> {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      vscode.window.showErrorMessage(t().commands.generateAllAIConfigs.noWorkspace);
      return;
    }

    // 选择图谱数据源
    const sourceType = await this.selectGraphSource();
    if (!sourceType) {
      return; // 用户取消
    }

    try {
      const graphData = this.getGraphData(sourceType);
      
      await vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: t().commands.generateAllAIConfigs.progress,
          cancellable: false,
        },
        async (progress) => {
          progress.report({ increment: 0, message: t().commands.generateCursorRules.title });
          await this.aiIntegrationService.generateCursorRules(workspaceFolder.uri.fsPath, graphData);

          progress.report({ increment: 50, message: t().commands.generateCopilotInstructions.title });
          await this.aiIntegrationService.generateCopilotInstructions(workspaceFolder.uri.fsPath, graphData);

          progress.report({ increment: 100, message: '✅' });
        }
      );

      const action = await vscode.window.showInformationMessage(
        t().commands.generateAllAIConfigs.success,
        t().commands.generateAllAIConfigs.viewCursorRules,
        t().commands.generateAllAIConfigs.viewCopilotInstructions
      );

      if (action === t().commands.generateAllAIConfigs.viewCursorRules) {
        const filePath = path.join(workspaceFolder.uri.fsPath, '.cursorrules');
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      } else if (action === t().commands.generateAllAIConfigs.viewCopilotInstructions) {
        const filePath = path.join(workspaceFolder.uri.fsPath, '.github', 'copilot-instructions.md');
        const doc = await vscode.workspace.openTextDocument(filePath);
        await vscode.window.showTextDocument(doc);
      }
    } catch (error) {
      vscode.window.showErrorMessage(t().commands.generateAllAIConfigs.error(String(error)));
    }
  }

  /**
   * 复制实体上下文到剪贴板
   */
  public async copyEntityContext(entityId?: string | any): Promise<void> {
    let targetEntityId: string | undefined;

    // 检查 entityId 参数类型
    if (entityId && typeof entityId === 'string') {
      targetEntityId = entityId;
    }

    // 如果没有提供有效的实体 ID，尝试从当前位置查找或让用户选择
    if (!targetEntityId) {
      const editor = vscode.window.activeTextEditor;
      
      // 尝试从当前位置查找
      if (editor) {
        const relativePath = this.getRelativePath(editor.document);
        if (relativePath) {
          const line = editor.selection.active.line + 1;
          const entity = this.entityService.findEntityAtLocation(relativePath, line);
          if (entity) {
            targetEntityId = entity.id;
          }
        }
      }

      // 如果当前位置没有实体，让用户选择
      if (!targetEntityId) {
        const entities = this.entityService.listEntities();
        if (entities.length === 0) {
          vscode.window.showWarningMessage('没有可用的实体');
          return;
        }

        const selected = await vscode.window.showQuickPick(
          entities.map(e => ({
            label: e.name,
            description: `${e.type} - ${e.filePath}:${e.startLine}`,
            detail: e.description,
            entity: e,
          })),
          {
            placeHolder: '选择要复制上下文的实体',
          }
        );

        if (!selected) {
          return;
        }

        targetEntityId = selected.entity.id;
      }
    }

    try {
      // 生成实体上下文
      const context = this.exportService.generateEntityContext(targetEntityId);
      
      // 复制到剪贴板
      await vscode.env.clipboard.writeText(context);
      
      const entity = this.entityService.getEntity(targetEntityId);
      vscode.window.showInformationMessage(
        `✅ 已将 "${entity?.name}" 的上下文复制到剪贴板`
      );
    } catch (error) {
      vscode.window.showErrorMessage(`复制实体上下文失败: ${error}`);
    }
  }

  /**
   * 导出当前文件上下文
   */
  public async exportCurrentFileContext(): Promise<void> {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showWarningMessage('请先打开一个文件');
      return;
    }

    const relativePath = this.getRelativePath(editor.document);
    if (!relativePath) {
      vscode.window.showWarningMessage('文件不在工作区中');
      return;
    }

    try {
      // 生成文件上下文
      const context = this.exportService.generateFileContext(relativePath);
      
      // 选择操作：复制到剪贴板或保存到文件
      const action = await vscode.window.showQuickPick(
        [
          {
            label: '📋 复制到剪贴板',
            description: '将文件上下文复制到剪贴板',
            action: 'copy',
          },
          {
            label: '💾 保存到文件',
            description: '将文件上下文保存为 Markdown 文件',
            action: 'save',
          },
        ],
        {
          placeHolder: '选择操作',
        }
      );

      if (!action) {
        return;
      }

      if (action.action === 'copy') {
        // 复制到剪贴板
        await vscode.env.clipboard.writeText(context);
        vscode.window.showInformationMessage(
          `✅ 已将 "${path.basename(relativePath)}" 的上下文复制到剪贴板`
        );
      } else {
        // 保存到文件
        const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
        if (!workspaceFolder) {
          return;
        }

        const fileName = `${path.basename(relativePath, path.extname(relativePath))}-context.md`;
        const defaultUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

        const saveUri = await vscode.window.showSaveDialog({
          defaultUri,
          filters: { 'Markdown': ['md'] },
          saveLabel: '保存',
        });

        if (saveUri) {
          const fs = require('fs');
          fs.writeFileSync(saveUri.fsPath, context, 'utf-8');
          
          const openAction = await vscode.window.showInformationMessage(
            `✅ 文件上下文已保存到 ${path.basename(saveUri.fsPath)}`,
            '打开文件'
          );

          if (openAction === '打开文件') {
            const doc = await vscode.workspace.openTextDocument(saveUri);
            await vscode.window.showTextDocument(doc);
          }
        }
      }
    } catch (error) {
      vscode.window.showErrorMessage(`导出文件上下文失败: ${error}`);
    }
  }

  /**
   * 生成 AI 摘要
   */
  public async generateAISummary(): Promise<void> {
    try {
      // 生成 AI 摘要
      const summary = this.exportService.generateAISummary();
      
      // 选择操作
      const action = await vscode.window.showQuickPick(
        [
          {
            label: '📋 复制到剪贴板',
            description: '将 AI 摘要复制到剪贴板，方便粘贴给 AI',
            action: 'copy',
          },
          {
            label: '👁️ 预览',
            description: '在新标签页中预览摘要内容',
            action: 'preview',
          },
          {
            label: '💾 保存到文件',
            description: '将摘要保存为 Markdown 文件',
            action: 'save',
          },
        ],
        {
          placeHolder: '选择操作',
        }
      );

      if (!action) {
        return;
      }

      switch (action.action) {
        case 'copy':
          // 复制到剪贴板
          await vscode.env.clipboard.writeText(summary);
          vscode.window.showInformationMessage('✅ AI 摘要已复制到剪贴板');
          break;

        case 'preview':
          // 在新标签页中预览
          const doc = await vscode.workspace.openTextDocument({
            content: summary,
            language: 'markdown',
          });
          await vscode.window.showTextDocument(doc, { preview: false });
          break;

        case 'save':
          // 保存到文件
          const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
          if (!workspaceFolder) {
            vscode.window.showErrorMessage('请先打开一个工作区');
            return;
          }

          const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, -5);
          const fileName = `ai-summary-${timestamp}.md`;
          const defaultUri = vscode.Uri.joinPath(workspaceFolder.uri, fileName);

          const saveUri = await vscode.window.showSaveDialog({
            defaultUri,
            filters: { 'Markdown': ['md'] },
            saveLabel: '保存',
          });

          if (saveUri) {
            const fs = require('fs');
            fs.writeFileSync(saveUri.fsPath, summary, 'utf-8');
            
            const openAction = await vscode.window.showInformationMessage(
              `✅ AI 摘要已保存到 ${path.basename(saveUri.fsPath)}`,
              '打开文件'
            );

            if (openAction === '打开文件') {
              const savedDoc = await vscode.workspace.openTextDocument(saveUri);
              await vscode.window.showTextDocument(savedDoc);
            }
          }
          break;
      }
    } catch (error) {
      vscode.window.showErrorMessage(`生成 AI 摘要失败: ${error}`);
    }
  }

  /**
   * 打开多行观察记录编辑面板
   */
  private async openObservationEditorPanel(
    initialContent: string,
    translations: ReturnType<typeof t>['commands']['editObservation']
  ): Promise<string | undefined> {
    const panel = vscode.window.createWebviewPanel(
      'knowledgeEditObservation',
      translations.title,
      vscode.ViewColumn.Active,
      {
        enableScripts: true,
        retainContextWhenHidden: false
      }
    );

    panel.webview.html = this.getObservationEditorHtml(panel.webview, initialContent, translations);

    return new Promise<string | undefined>((resolve) => {
      let resolved = false;
      const finalize = (value?: string) => {
        if (resolved) {
          return;
        }
        resolved = true;
        resolve(value);
      };

      panel.webview.onDidReceiveMessage((message) => {
        if (message.type === 'save') {
          finalize(message.content as string);
          panel.dispose();
        } else if (message.type === 'cancel') {
          finalize(undefined);
          panel.dispose();
        }
      });

      panel.onDidDispose(() => {
        finalize(undefined);
      });
    });
  }

  private getObservationEditorHtml(
    webview: vscode.Webview,
    initialContent: string,
    translations: ReturnType<typeof t>['commands']['editObservation']
  ): string {
    const nonce = this.getNonce();
    const hint =
      translations.editorHint ||
      'Edit the observation below. Press Ctrl/Cmd + Enter to save quickly.';
    const saveLabel = t().common.save;
    const cancelLabel = t().common.cancel;
    const placeholder = translations.placeholder || '';

    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} https: data:; script-src 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${translations.title}</title>
  <style>
    body {
      font-family: var(--vscode-font-family);
      margin: 0;
      padding: 16px;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
    }
    h2 {
      font-size: 16px;
      margin: 0 0 8px;
    }
    .hint {
      font-size: 12px;
      opacity: 0.85;
      margin-bottom: 12px;
    }
    textarea {
      width: 100%;
      height: calc(100vh - 150px);
      box-sizing: border-box;
      background: var(--vscode-editor-background);
      color: var(--vscode-editor-foreground);
      border: 1px solid var(--vscode-input-border, var(--vscode-editorWidget-border));
      border-radius: 4px;
      padding: 12px;
      font-family: var(--vscode-editor-font-family);
      font-size: var(--vscode-editor-font-size);
      line-height: 1.5;
      resize: vertical;
    }
    textarea:focus {
      outline: 1px solid var(--vscode-focusBorder);
    }
    .actions {
      margin-top: 12px;
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    button {
      border: none;
      border-radius: 4px;
      padding: 6px 16px;
      cursor: pointer;
      font-size: 13px;
    }
    button.save {
      background: var(--vscode-button-background);
      color: var(--vscode-button-foreground);
    }
    button.save:hover {
      background: var(--vscode-button-hoverBackground, var(--vscode-button-background));
    }
    button.cancel {
      background: transparent;
      border: 1px solid var(--vscode-button-border, var(--vscode-editorWidget-border));
      color: var(--vscode-editor-foreground);
    }
  </style>
</head>
<body>
  <h2>${translations.title}</h2>
  <div class="hint">${hint}</div>
  <textarea id="editor" placeholder="${this.escapeHtml(placeholder)}">${this.escapeHtml(initialContent)}</textarea>
  <div class="actions">
    <button class="cancel" id="cancel">${cancelLabel}</button>
    <button class="save" id="save">${saveLabel}</button>
  </div>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    const textarea = document.getElementById('editor');
    const saveButton = document.getElementById('save');
    const cancelButton = document.getElementById('cancel');

    textarea.focus();
    textarea.selectionStart = textarea.selectionEnd = textarea.value.length;

    saveButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'save', content: textarea.value });
    });

    cancelButton.addEventListener('click', () => {
      vscode.postMessage({ type: 'cancel' });
    });

    textarea.addEventListener('keydown', (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
        event.preventDefault();
        vscode.postMessage({ type: 'save', content: textarea.value });
      }
    });
  </script>
</body>
</html>
    `;
  }

  private escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  private getNonce(): string {
    const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    return Array.from({ length: 32 }, () => possible.charAt(Math.floor(Math.random() * possible.length))).join('');
  }
}

