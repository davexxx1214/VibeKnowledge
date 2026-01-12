/**
 * 国际化类型定义
 */

// 语言代码
export type Language = 'en' | 'zh';

// 命令相关的翻译接口
export interface CommandTranslations {
  title: string;
  prompt?: string;
  placeholder?: string;
  validateEmpty?: string;
  success?: ((...args: any[]) => string) | string;
  error?: ((error: string) => string) | string;
  [key: string]: any;
}

// 实体类型翻译
export interface EntityTypeTranslation {
  label: string;
  description: string;
}

// 关系类型翻译
export interface RelationTypeTranslation {
  label: string;
  description: string;
}

// 完整的语言包接口
export interface LanguagePack {
  extension: {
    name: string;
    description: string;
  };

  commands: {
    createEntity: CommandTranslations & {
      success: (name: string) => string;
      error: (error: string) => string;
    };
    addObservation: CommandTranslations & {
      success: string;
      error: (error: string) => string;
    };
    addRelation: CommandTranslations & {
      relationExists: (source: string, verb: string, target: string) => string;
      success: (source: string, verb: string, target: string) => string;
      error: (error: string) => string;
      needAtLeastTwo: string;
    };
    linkToEntity: CommandTranslations & {
      success: (source: string, verb: string, target: string) => string;
      error: (error: string) => string;
      noEntityAtLocation: string;
      noOtherEntities: string;
    };
    viewEntityDetails: CommandTranslations & {
      error: (error: string) => string;
      notFound: string;
    };
    searchGraph: CommandTranslations & {
      noResults: string;
    };
    deleteEntity: CommandTranslations & {
      confirm: (name: string) => string;
      willAlsoDelete: (obsCount: number, relCount: number) => string;
      deleteAll: string;
      success: (name: string) => string;
      error: (message: string) => string;
    };
    deleteRelation: CommandTranslations & {
      confirm: (label: string) => string;
      success: (label: string) => string;
      error: (error: string) => string;
      noRelations: string;
    };
    deleteRelationFromTree: CommandTranslations & {
      error: (error: string) => string;
      invalidData: string;
    };
    deleteObservation: CommandTranslations & {
      confirm: (content: string, entityName: string) => string;
      success: (entityName: string) => string;
      error: (error: string) => string;
      noObservations: string;
    };
    editObservation: CommandTranslations & {
      selectPlaceholder: string;
      noObservations: string;
      success: (entityName: string) => string;
      error: (error: string) => string;
      editorHint?: string;
    };
    visualizeGraph: CommandTranslations & {
      error: (error: string) => string;
    };
    exportGraph: CommandTranslations & {
      format: {
        markdown: { label: string; description: string };
        markdownWithDeps: { label: string; description: string };
        json: { label: string; description: string };
      };
      placeholder: string;
      noWorkspace: string;
      saveLabel: string;
      progress: {
        title: string;
        collecting: string;
        generatingMarkdown: string;
        generatingJSON: string;
        complete: string;
      };
      success: (fileName: string) => string;
      error: (error: string) => string;
      openFile: string;
      showInFolder: string;
    };
    importGraph: CommandTranslations & {
      comingSoon: string;
    };
    clearGraph: CommandTranslations & {
      confirm: string;
      yes: string;
      no: string;
      comingSoon: string;
    };
    settings: CommandTranslations & {
      comingSoon: string;
    };
    refresh: CommandTranslations & {
      success: string;
    };
    generateCursorRules: CommandTranslations & {
      success: (fileName: string) => string;
      error: (error: string) => string;
      noWorkspace: string;
      openFile: string;
      showInFolder: string;
    };
    selectGraphSource: {
      title: string;
      manual: {
        label: string;
        description: string;
      };
      auto: {
        label: string;
        description: string;
      };
      merged: {
        label: string;
        description: string;
      };
    };
    generateCopilotInstructions: CommandTranslations & {
      success: (fileName: string) => string;
      error: (error: string) => string;
      noWorkspace: string;
      openFile: string;
      showInFolder: string;
    };
    generateAllAIConfigs: CommandTranslations & {
      progress: string;
      success: string;
      error: (error: string) => string;
      noWorkspace: string;
      viewCursorRules: string;
      viewCopilotInstructions: string;
    };
    copyEntityContext: CommandTranslations & {
      success: (entityName: string) => string;
      error: (error: string) => string;
      noEntity: string;
    };
    exportCurrentFileContext: CommandTranslations & {
      noFile: string;
      noWorkspace: string;
      copyToClipboard: string;
      saveToFile: string;
      successCopy: (fileName: string) => string;
      successSave: (fileName: string) => string;
      error: (error: string) => string;
    };
    generateAISummary: CommandTranslations & {
      error: (error: string) => string;
      copyToClipboard: string;
      preview: string;
      saveToFile: string;
      successCopy: string;
      successSave: (fileName: string) => string;
    };
    switchLanguage: CommandTranslations & {
      placeholder: string;
      error: (error: string) => string;
    };
    expandAll: CommandTranslations;
  };

  rag: {
    askQuestion: CommandTranslations & {
      notInitialized: {
        message: string;
        openSettings: string;
      };
      noDocuments: string;
      thinking: string;
      success: string;
      copyToClipboard: string;
      saveToFile: string;
      result: {
        title: string;
        questionLabel: string;
        answerLabel: string;
        sourcesLabel: string;
        citationsLabel: string;
        storeIdLabel: (id: string) => string;
        generatedAt: (date: string) => string;
      };
      saved: (filename: string) => string;
      copiedToClipboard: string;
    };
    viewIndexedDocuments: CommandTranslations & {
      noDocuments: string;
      placeholder: (count: number) => string;
      sizeKB: (size: number) => string;
      indexedAt: (date: string) => string;
    };
    testConnection: CommandTranslations & {
      notInitialized: {
        message: string;
        openSettings: string;
      };
      testing: string;
    };
    diagnose: CommandTranslations & {
      reportTitle: string;
      clientStatus: any;
      storeStatus: any;
      indexedFiles: any;
      troubleshooting: any;
    };
    openDocument: CommandTranslations;
    reindex: CommandTranslations & {
      confirm: {
        title: string;
        confirm: string;
        cancel: string;
      };
      progress: string;
      deleteCloudStore: string;
      clearLocalDB: string;
      createNewStore: string;
      scanAndUpload: string;
      success: {
        message: string;
        viewStoreInfo: string;
      };
    };
    viewStoreInfo: CommandTranslations & {
      document: any;
      stats: any;
      local: any;
      isolation: any;
      cloud: any;
    };
  };

  common: {
    select: string;
    cancel: string;
    delete: string;
    continue: string;
    continueAnyway: string;
    openFile: string;
    showInFolder: string;
    copyToClipboard: string;
    saveToFile: string;
    save: string;
    close: string;
    yes: string;
    no: string;
    error: string;
    warning: string;
    info: string;
    success: string;
    noActiveEditor: string;
    fileNotInWorkspace: string;
    noWorkspace: string;
    noEntities: string;
    type: string;
    description: string;
    location: string;
    name: string;
    observations: string;
    relations: string;
    details: string;
    entity: string;
    size: string;
    indexedAt: string;
    openDocument: string;
    indexed: (count: number, sizeMB: number) => string;
  };

  entityTypes: Record<string, EntityTypeTranslation>;
  relationTypes: Record<string, RelationTypeTranslation>;

  extension: {
    name: string;
    description: string;
    activated: string;
    noWorkspace: string;
    refresh: string;
    placeholder: string;
    rag: {
      enabled: string;
      viewStoreInfo: string;
      notEnabled: {
        title: string;
        configure: string;
        viewTutorial: string;
      };
      initializationFailed: (error: string) => string;
      viewLogs: string;
      retry: string;
      reconnected: string;
      invalidKey: string;
    };
  };

  graphView: {
    title: string;
    toolbar: {
      fit: string;
      refresh: string;
    };
    loading: string;
    emptyState: {
      title: string;
      description: string;
      hint: string;
    };
    tooltip: {
      type: string;
      file: string;
      description: string;
      observations: string;
      noObservations: string;
      more: string;
    };
    cyclicDependency: string;
  };

  export: {
    title: string;
    exportedAt: string;
    overview: {
      title: string;
      totalEntities: string;
      totalRelations: string;
      entityTypeDistribution: string;
    };
    entityList: {
      title: string;
      type: string;
      location: string;
      description: string;
      createdAt: string;
      observations: string;
      relations: string;
      outgoing: string;
      incoming: string;
    };
    relationGraph: {
      title: string;
      source: string;
      target: string;
    };
    statistics: {
      title: string;
      totalEntities: string;
      totalRelations: string;
      typeDistribution: string;
    };
    architectureOverview: string;
  };
}
