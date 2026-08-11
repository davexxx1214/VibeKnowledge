/**
 * English language pack
 */
export const en = {
  extension: {
    name: 'Knowledge Graph',
    description: 'Transform your workspace into an intelligent knowledge network',
    activated: '✅ Knowledge Graph extension activated successfully!',
    noWorkspace: 'Knowledge Graph: Please open a folder to use this extension',
    refresh: 'Knowledge Graph refreshed',
    placeholder: 'Please open a folder to use Knowledge Graph features',

    rag: {
      enabled: '✅ Knowledge Graph RAG enabled! New documents will be automatically indexed to cloud.',
      viewStoreInfo: 'View Store info',
      notEnabled: {
        title: '⚠️ RAG not enabled: Please configure Gemini API Key',
        configure: 'Configure API Key',
        viewTutorial: 'View tutorial'
      },
      initializationFailed: (error: string) => `❌ RAG initialization failed: ${error}`,
      viewLogs: 'View logs',
      retry: 'Retry',
      reconnected: '✅ Gemini API reconnected, RAG enabled!',
      invalidKey: '⚠️ API Key is invalid, please check configuration',
      indexFile: {
        success: (fileName: string) => `✅ Indexed successfully: ${fileName}`,
        successLocal: (fileName: string) => `✅ Locally indexed: ${fileName}`,
        uploadTimeout: (fileName: string) => `Upload timeout for ${fileName}`,
        embeddingFailed: (fileName: string) => `Embedding failed for ${fileName}`,
        parseFailed: (fileName: string) => `Failed to extract text from ${fileName}`
      },
      removeFile: {
        success: (fileName: string) => `✅ Removed from index: ${fileName}`,
        failed: (fileName: string) => `Failed to remove index: ${fileName}`,
        notFound: (fileName: string) => `⚠️ File not found in index: ${fileName}`
      },
      askQuestion: {
        title: 'Knowledge: Ask Question',
        notInitialized: {
          message: 'Please configure Gemini API Key in settings first',
          openSettings: 'Open settings'
        },
        noDocuments: 'No indexed documents. Please add documents to the Knowledge/ folder.',
        prompt: 'Ask a question',
        placeholder: 'e.g., What database does this project use?',
        validateEmpty: 'Question cannot be empty',
        thinking: 'Thinking...',
        success: '✅ Question answered',
        fallbackAnswer: 'Unable to generate answer',
        noRelevantDocuments: 'No relevant documents found locally.',
        citationSource: (title: string) => `Source: ${title}`,
        copyToClipboard: 'Copy to clipboard',
      }
    }
  },

  commands: {
    createEntity: {
      title: 'Knowledge: Create Entity from Selection',
      prompt: 'Enter entity name',
      validateEmpty: 'Name cannot be empty',
      success: (name: string) => `Entity "${name}" created successfully`,
      error: (error: string) => `Failed to create entity: ${error}`
    },

    addObservation: {
      title: 'Knowledge: Add Observation to Entity...',
      prompt: 'Enter observation',
      placeholder: 'e.g., Performance issue: N+1 query problem',
      validateEmpty: 'Observation cannot be empty',
      success: 'Observation added successfully',
      error: (error: string) => `Failed to add observation: ${error}`
    },

    addRelation: {
      title: 'Knowledge: Add Relation',
      placeholder: 'Select entity type',
      relationExists: (source: string, verb: string, target: string) =>
        `Relation already exists: ${source} ${verb} ${target}`,
      success: (source: string, verb: string, target: string) =>
        `✅ Relation created: ${source} ${verb} ${target}`,
      error: (error: string) => `Failed to create relation: ${error}`,
      needAtLeastTwo: 'Need at least 2 entities to create a relation'
    },

    linkToEntity: {
      title: 'Knowledge: Link Selection to Entity...',
      success: (source: string, verb: string, target: string) =>
        `✅ Linked: ${source} ${verb} ${target}`,
      error: (error: string) => `Failed to link entities: ${error}`,
      noEntityAtLocation: 'No entity found at current location. Create an entity first using "Knowledge: Create Entity from Selection"',
      noOtherEntities: 'No other entities to link to. Create more entities first.'
    },

    viewEntityDetails: {
      title: 'Knowledge: View Entity Details',
      error: (error: string) => `Error viewing entity: ${error}`,
      notFound: 'Entity not found'
    },

    searchGraph: {
      title: 'Knowledge: Search Graph',
      prompt: 'Search entities by name',
      placeholder: 'Enter search query',
      noResults: 'No entities found'
    },

    deleteEntity: {
      title: 'Knowledge: Delete Entity',
      confirm: (name: string) => `Are you sure you want to delete entity "${name}"?`,
      willAlsoDelete: (obsCount: number, relCount: number) => {
        let msg = 'This will also delete:\n';
        if (obsCount > 0) {msg += `- ${obsCount} observation(s)\n`;}
        if (relCount > 0) {msg += `- ${relCount} relation(s)\n`;}
        msg += '\nContinue?';
        return msg;
      },
      deleteAll: 'Delete All',
      success: (name: string) => `✅ Entity "${name}" deleted successfully`,
      error: (message: string) => `Error deleting entity: ${message}`
    },

    deleteRelation: {
      title: 'Knowledge: Delete Relation',
      confirm: (label: string) => `Delete relation: ${label}?`,
      success: (label: string) => `✅ Relation deleted: ${label}`,
      error: (error: string) => `Failed to delete relation: ${error}`,
      noRelations: 'No relations to delete'
    },

    deleteRelationFromTree: {
      title: 'Delete Relation',
      error: (error: string) => `Failed to delete relation: ${error}`,
      invalidData: 'Invalid relation data'
    },

    deleteObservation: {
      title: 'Knowledge: Delete Observation',
      confirm: (content: string, entityName: string) =>
        `Delete observation?\n\n"${content}"\n\nFrom: ${entityName}`,
      success: (entityName: string) => `✅ Observation deleted from ${entityName}`,
      error: (error: string) => `Failed to delete observation: ${error}`,
      noObservations: 'No observations to delete'
    },

    editObservation: {
      title: 'Knowledge: Edit Observation',
      selectPlaceholder: 'Select an observation to edit',
      noObservations: 'This entity has no observations yet',
      prompt: 'Update observation content',
      placeholder: 'e.g., Add caching for findOne',
      validateEmpty: 'Observation cannot be empty',
      editorHint: 'Use the editor below to update the note. Press Ctrl/Cmd + Enter to save quickly.',
      success: (entityName: string) => `✅ Observation updated for ${entityName}`,
      error: (error: string) => `Failed to update observation: ${error}`
    },

    visualizeGraph: {
      title: 'Knowledge: Visualize Graph',
      error: (error: string) => `Error opening graph: ${error}`
    },

    exportGraph: {
      title: 'Knowledge: Export Graph',
      format: {
        markdown: { label: 'Markdown', description: 'Export as Markdown format (.md)' },
        markdownWithDeps: { label: 'Markdown with Dependency Analysis', description: 'Include dependency chain analysis (.md)' },
        json: { label: 'JSON', description: 'Export as JSON format (.json)' }
      },
      placeholder: 'Select export format',
      noWorkspace: 'Please open a workspace first',
      saveLabel: 'Export',
      progress: {
        title: 'Exporting knowledge graph...',
        collecting: 'Collecting data...',
        generatingMarkdown: 'Generating Markdown...',
        generatingJSON: 'Generating JSON...',
        complete: 'Complete!'
      },
      success: (fileName: string) => `✅ Knowledge graph successfully exported to ${fileName}`,
      error: (error: string) => `Export failed: ${error}`,
      openFile: 'Open File',
      showInFolder: 'Show in Folder'
    },

    importGraph: {
      title: 'Knowledge: Import Graph',
      comingSoon: 'Import Graph - Coming soon!'
    },

    clearGraph: {
      title: 'Knowledge: Clear Graph',
      confirm: 'Are you sure you want to clear the entire knowledge graph?',
      yes: 'Yes',
      no: 'No',
      comingSoon: 'Clear Graph - Coming soon!'
    },

    settings: {
      title: 'Knowledge: Settings',
      comingSoon: 'Settings - Coming soon!'
    },

    refresh: {
      title: 'Knowledge: Refresh',
      success: 'Knowledge Graph refreshed'
    },

    generateCursorRules: {
      title: 'Knowledge: Generate Cursor Rules',
      success: (fileName: string) => `✅ Cursor Rules generated: ${fileName}`,
      error: (error: string) => `Failed to generate Cursor Rules: ${error}`,
      noWorkspace: 'Please open a workspace first',
      openFile: 'Open file',
      showInFolder: 'Show in folder'
    },

    selectGraphSource: {
      title: 'Select Graph Source',
      manual: {
        label: '📝 Manual Graph',
        description: 'Design decisions, observations, manually maintained relations'
      },
      auto: {
        label: '⚡ Auto Graph',
        description: 'Code structure and dependencies from static analysis'
      },
      merged: {
        label: '🔗 Merged Graph',
        description: 'Manual + Auto, most complete context'
      }
    },

    generateCopilotInstructions: {
      title: 'Knowledge: Generate Copilot Instructions',
      success: (fileName: string) => `✅ Copilot Instructions generated: .github/${fileName}`,
      error: (error: string) => `Failed to generate Copilot Instructions: ${error}`,
      noWorkspace: 'Please open a workspace first',
      openFile: 'Open file',
      showInFolder: 'Show in folder'
    },

    generateAllAIConfigs: {
      title: 'Knowledge: Generate All AI Configs',
      progress: 'Generating AI configuration files...',
      success: '✅ All AI configuration files generated:\n- .cursorrules\n- .github/copilot-instructions.md',
      error: (error: string) => `Failed to generate AI configs: ${error}`,
      noWorkspace: 'Please open a workspace first',
      viewCursorRules: 'View .cursorrules',
      viewCopilotInstructions: 'View Copilot Instructions'
    },

    copyEntityContext: {
      title: 'Knowledge: Copy Entity Context to Clipboard',
      success: (entityName: string) => `✅ Context of "${entityName}" copied to clipboard`,
      error: (error: string) => `Failed to copy entity context: ${error}`,
      noEntity: 'No entity found'
    },

    exportCurrentFileContext: {
      title: 'Knowledge: Export Current File Context',
      noFile: 'Please open a file first',
      noWorkspace: 'File is not in workspace',
      copyToClipboard: '📋 Copy to clipboard',
      saveToFile: '💾 Save to file',
      successCopy: (fileName: string) => `✅ Context of "${fileName}" copied to clipboard`,
      successSave: (fileName: string) => `✅ File context saved to ${fileName}`,
      error: (error: string) => `Failed to export file context: ${error}`
    },

    generateAISummary: {
      title: 'Knowledge: Generate AI Summary',
      error: (error: string) => `Failed to generate AI summary: ${error}`,
      copyToClipboard: '📋 Copy to clipboard',
      preview: '👁️ Preview',
      saveToFile: '💾 Save to file',
      successCopy: '✅ AI summary copied to clipboard',
      successSave: (fileName: string) => `✅ AI summary saved to ${fileName}`
    },

    switchLanguage: {
      title: 'Knowledge: Switch Language',
      placeholder: '选择语言 / Select Language',
      error: (error: string) => `Failed to switch language: ${error}`
    },

    expandAll: {
      title: 'Knowledge: Expand All'
    }
  },

  rag: {
    askQuestion: {
      title: 'Knowledge: Ask Question',
      notInitialized: {
        message: 'Please configure Gemini API Key in settings first',
        openSettings: 'Open settings'
      },
      noDocuments: 'No indexed documents. Please add documents to the Knowledge/ folder.',
      prompt: 'Ask a question',
      placeholder: 'e.g., What database does this project use?',
      validateEmpty: 'Question cannot be empty',
      thinking: 'Thinking...',
      success: '✅ Question answered',
      copyToClipboard: 'Copy to clipboard',
      saveToFile: 'Save as file',
      result: {
        title: '# Question & Answer Result\n\n',
        questionLabel: '**Question**',
        answerLabel: '## Answer\n\n',
        sourcesLabel: '## References\n\n',
        citationsLabel: '\n## Citations\n\n',
        storeIdLabel: (id: string) => `_Store ID: ${id}_`,
        generatedAt: (date: string) => `_Generated at: ${date}_\n`
      },
      saved: (filename: string) => `✅ Saved to ${filename}`,
      copiedToClipboard: 'Copied to clipboard',
      error: (error: string) => `Question answering failed: ${error}`
    },

    viewIndexedDocuments: {
      title: 'Knowledge: View Indexed Documents',
      noDocuments: 'No indexed documents. Please add documents to the Knowledge/ folder.',
      placeholder: (count: number) => `Indexed ${count} documents`,
      sizeKB: (size: number) => `Size: ${size.toFixed(2)} KB`,
      indexedAt: (date: string) => `Indexed at: ${date}`
    },

    testConnection: {
      title: 'Knowledge: Test Gemini API Connection',
      notInitialized: {
        message: 'Gemini client not initialized. Please configure API Key in settings.',
        openSettings: 'Open settings'
      },
      testing: 'Testing API connection...',
      error: (error: string) => `Test failed: ${error}`
    },

    diagnose: {
      title: 'Knowledge: Diagnose RAG Status',
      error: (error: string) => `Diagnosis failed: ${error}`,
      reportTitle: '# RAG Diagnostic Report\n',
      clientStatus: {
        title: '## 1. Gemini Client Status\n',
        initialized: '✅ Initialized',
        notInitialized: '❌ Not initialized',
        configuredModel: (model: string) => `Configured model: ${model}`,
        apiKeyConfigured: (prefix: string) => `API Key: ${prefix}... (configured)`,
        issue: '⚠️ Issue: Gemini Client not initialized',
        solution: '**Solution**: Please configure Gemini API Key',
        settingsPath: 'Settings path: `knowledgeGraph.gemini.apiKey`\n'
      },
      storeStatus: {
        title: '## 2. Store Status\n',
        storeName: (name: string) => `Store name: \`${name}\``,
        projectName: (name: string) => `Project name: ${name}`,
        localFiles: (count: number) => `Local files: ${count}`,
        createdAt: (date: string) => `Created at: ${date}`,
        checkingCloud: '\n**Querying cloud status...**\n',
        cloudData: '### Cloud Real-time Data\n',
        activeDocuments: (count: number) => `Active documents: ${count}`,
        pendingDocuments: (n) => `Processing documents: ${n}`,
        failedDocuments: (count: number) => `Failed documents: ${count}`,
        totalDocuments: (total: number) => `Total: ${total}`,
        noActiveDocuments: '⚠️ **Hint**: No active documents in cloud. Please add documents to `Knowledge/` folder',
        cloudOK: '✅ **Status**: Cloud Store is normal, search function available',
        cannotGetCloudInfo: '⚠️ **Cannot get cloud info** (network issue or Store does not exist)',
        storeInfoUnavailable: '❌ **Store information unavailable**\n',
        possibleReasons: '**Possible reasons**:',
        reason1: '1. RAG Service not properly initialized',
        reason2: '2. Store creation failed',
        reason3: '3. Database corrupted\n',
        suggestedActions: '**Suggested actions**:',
        action1: '1. Check OUTPUT panel "Knowledge Graph" logs',
        action2: '2. Reload VS Code window',
        action3: '3. Delete `.vscode/.knowledge/graph.sqlite` and restart'
      },
      indexedFiles: {
        title: '## 3. Indexed Files\n',
        hasFiles: (count: number) => `✅ **Local records**: ${count} files\n`,
        noFiles: '⚠️ **No local file records**\n',
        note: '**Note**: Even if no local records, cloud may have documents.',
        checkCloud: 'Please check cloud status ("Cloud Real-time Data" above).'
      },
      troubleshooting: {
        title: '## 💡 Troubleshooting Steps\n',
        step1: '1. **Configure API Key**: Settings → Search "gemini" → Configure API Key',
        step2: '2. **Test connection**: Run command "Knowledge: Test Gemini API Connection"',
        step3: '3. **Add documents**: Add test documents to `Knowledge/` folder',
        step4: '4. **View logs**: OUTPUT panel → Knowledge Graph',
        step5: '5. **View tutorial**: [QUICKSTART_RAG.md](./QUICKSTART_RAG.md)'
      }
    },

    openDocument: {
      title: 'Open Document',
      error: (error: string) => `Failed to open file: ${error}`
    },

    reindex: {
      title: 'Knowledge: Rebuild RAG Index',
      confirm: {
        title: '⚠️ This will delete cloud Store and reindex all documents.\n\nOperation will:\n1. Delete all indexed documents in cloud\n2. Clear local index records\n3. Rescan Knowledge/ folder\n4. Reupload all documents to cloud\n\nThis may take several minutes. Continue?',
        confirm: 'Confirm reindex',
        cancel: 'Cancel'
      },
      progress: 'Reindexing RAG documents...',
      deleteCloudStore: 'Deleting cloud Store...',
      clearLocalDB: 'Clearing local database...',
      createNewStore: 'Creating new Store...',
      scanAndUpload: 'Scanning and uploading documents...',
      success: {
        message: '✅ Reindex complete! Cloud and local data synchronized.',
        viewStoreInfo: 'View Store info'
      },
      error: (error: string) => `Reindex failed: ${error}`
    },

    viewStoreInfo: {
      title: 'Knowledge: View RAG Store Info',
      error: (error: string) => `Failed to view Store info: ${error}`,
      document: {
        title: '# RAG Store Information\n',
        projectName: (name: string) => `Project name: ${name}`,
        storeName: (name: string) => `Store name: \`${name}\``,
        displayName: (name: string) => `Display Name: \`${name || 'N/A'}\``,
        workspacePath: (path: string) => `Workspace path: \`${path}\``
      },
      stats: {
        title: '## 📊 Document Statistics (Cloud Real-time)\n',
        active: (count: number) => `Active documents: ${count}`,
        pending: (count: number) => `Processing documents: ${count}`,
        failed: (count: number) => `Failed documents: ${count}`,
        total: (total: number) => `Total: ${total}`
      },
      local: {
        title: '## 📝 Local Metadata\n',
        fileCount: (count: number) => `Local file records: ${count}`,
        createdAt: (date: string) => `Created at: ${date}`,
        lastSync: (date: string) => `Last sync: ${date}`
      },
      isolation: {
        title: '## 🔐 Project Isolation\n',
        description1: 'Each project has a unique **File Search Store**, ensuring documents are not mixed with other projects.',
        description2: '\nStore is automatically created based on project path. Even using the same API Key,',
        description3: 'documents from different projects are completely isolated in independent Stores.'
      },
      cloud: {
        title: '## ☁️ Cloud RAG\n',
        description: 'Documents have been uploaded to **Google Gemini File Search Store**:',
        vectorSearch: '- ✅ True vector semantic search',
        autoChunking: '- ✅ Auto chunking and embedding',
        multiFormat: '- ✅ Supports 100+ file formats',
        noLocalProcessing: '- ✅ No local processing required',
        tip: '\n💡 **Tip**: Only metadata is saved locally, actual documents and indexes are in cloud.'
      },
      storeStatus: {
        cannotGetCloudInfo: '⚠️ **Cannot get cloud info** (network issue or Store does not exist)'
      }
    }
  },

  common: {
    select: 'Select',
    cancel: 'Cancel',
    delete: 'Delete',
    continue: 'Continue',
    continueAnyway: 'Continue Anyway',
    openFile: 'Open file',
    showInFolder: 'Show in folder',
    copyToClipboard: 'Copy to clipboard',
    saveToFile: 'Save to file',
    save: 'Save',
    close: 'Close',
    yes: 'Yes',
    no: 'No',
    error: 'Error',
    warning: 'Warning',
    info: 'Information',
    success: 'Success',
    noActiveEditor: 'No active editor',
    fileNotInWorkspace: 'File is not in workspace',
    noWorkspace: 'No workspace folder open',
    noEntities: 'No entities found',
    type: 'Type',
    description: 'Description',
    location: 'Location',
    name: 'Name',
    observations: 'Observations',
    relations: 'Relations',
    details: 'Details',
    entity: 'Entity',
    size: 'Size',
    indexedAt: 'Indexed at',
    openDocument: 'Open Document',
    indexed: (count: number, sizeMB: number) => `📊 Indexed ${count} document${count > 1 ? 's' : ''} (${sizeMB.toFixed(2)} MB)`
  },

  entityTypes: {
    function: { label: 'function', description: 'Function or method' },
    class: { label: 'class', description: 'Class definition' },
    interface: { label: 'interface', description: 'Interface definition' },
    variable: { label: 'variable', description: 'Variable or constant' },
    component: { label: 'component', description: 'UI Component' },
    service: { label: 'service', description: 'Service class' },
    api: { label: 'api', description: 'API endpoint' },
    config: { label: 'config', description: 'Configuration' },
    other: { label: 'other', description: 'Other type' }
  },

  relationTypes: {
    uses: { label: 'uses', description: 'Uses or utilizes' },
    calls: { label: 'calls', description: 'Calls or invokes' },
    extends: { label: 'extends', description: 'Extends or inherits from' },
    implements: { label: 'implements', description: 'Implements an interface' },
    depends_on: { label: 'depends_on', description: 'Depends on' },
    contains: { label: 'contains', description: 'Contains or includes' },
    references: { label: 'references', description: 'References or mentions' },
    imports: { label: 'imports', description: 'Imports from' },
    exports: { label: 'exports', description: 'Exports to' }
  },

  graphView: {
    title: 'Knowledge Graph Visualization',
    toolbar: {
      fit: 'Fit to window',
      refresh: 'Refresh'
    },
    loading: 'Loading knowledge graph...',
    emptyState: {
      title: '📊 Knowledge Graph is Empty',
      description: 'Please create entities and relations first',
      hint: 'Use right-click menu "Knowledge: Create Entity" to start'
    },
    tooltip: {
      type: 'Type',
      file: 'File',
      description: 'Description',
      observations: 'Observations',
      noObservations: 'No observations yet',
      more: '+{count} more'
    },
    cyclicDependency: 'Cyclic Dependency',
    music: {
      play: 'Play Code Music',
      stop: 'Stop Playing',
      copyCode: 'Copy Strudel Code',
      openRepl: 'Open in Strudel REPL',
      generating: 'Generating music...',
      noData: 'No data to play',
      codeCopied: '✅ Strudel code copied to clipboard'
    }
  },

  autoGraph: {
    title: 'Auto Dependency Graph',
    commands: {
      analyzeWorkspace: {
        title: 'Analyzing workspace',
        completed: (entities: number, relations: number, files: number) =>
          `✅ Analysis complete: ${entities} entities, ${relations} relations, ${files} files`,
        completedWithErrors: (entities: number, relations: number, errors: number) =>
          `⚠️ Analysis complete (with errors): ${entities} entities, ${relations} relations, ${errors} errors`,
        viewErrors: 'View Errors'
      },
      analyzeFile: {
        title: (fileName: string) => `Analyzing file: ${fileName}`,
        noActiveFile: 'Please open a file first',
        unsupportedType: (fileName: string) => `Unsupported file type: ${fileName}`,
        unchanged: (fileName: string) => `File unchanged: ${fileName}`,
        completed: (fileName: string, entities: number, relations: number) =>
          `✅ ${fileName}: ${entities} entities, ${relations} relations`,
        error: (fileName: string, message: string) => `Analysis failed ${fileName}: ${message}`
      },
      clear: {
        confirm: 'Are you sure you want to clear the auto graph? This will delete all auto-generated entities and relations.',
        yes: 'Yes',
        no: 'No',
        completed: '✅ Auto graph cleared'
      },
      viewStats: {
        title: 'View Auto Graph Stats'
      },
      addObservation: {
        noEntities: 'No entities in auto graph, please run analysis first',
        selectEntity: 'Select entity to add observation',
        entityNotFound: 'Entity not found',
        prompt: (entityName: string) => `Add observation for "${entityName}"`,
        placeholder: 'Enter observation content...',
        validateEmpty: 'Observation cannot be empty',
        success: (entityName: string) => `✅ Observation added for "${entityName}"`,
        error: 'Failed to add observation',
        errorDetail: (message: string) => `Failed to add observation: ${message}`
      },
      editObservation: {
        notFound: 'Observation not found',
        prompt: 'Edit observation',
        success: '✅ Observation updated',
        error: (message: string) => `Failed to update observation: ${message}`
      },
      deleteObservation: {
        confirm: 'Are you sure you want to delete this observation?',
        yes: 'Yes',
        no: 'No',
        success: '✅ Observation deleted'
      }
    },
    treeView: {
      manualGraph: 'Manual Graph',
      autoGraph: 'Auto Graph',
      entities: 'Entities',
      relations: 'Relations'
    },
    graphView: {
      manualGraph: 'Manual Graph',
      autoGraph: 'Auto Graph',
      mergedView: 'Merged View'
    }
  },

  export: {
    title: 'Knowledge Graph Export',
    exportedAt: 'Exported At',
    overview: {
      title: '📊 Overview',
      totalEntities: 'Total Entities',
      totalRelations: 'Total Relations',
      entityTypeDistribution: 'Entity Type Distribution'
    },
    entityList: {
      title: '📦 Entity List',
      type: 'Type',
      location: 'Location',
      description: 'Description',
      createdAt: 'Created At',
      observations: '📝 Observations',
      relations: '🔗 Relations',
      outgoing: 'Outgoing (Source)',
      incoming: 'Incoming (Target)'
    },
    relationGraph: {
      title: '🔗 Relation Graph',
      source: 'Source',
      target: 'Target'
    },
    statistics: {
      title: '📊 Statistics Overview',
      totalEntities: 'Total Entities',
      totalRelations: 'Total Relations',
      typeDistribution: 'Entity Type Distribution'
    },
    architectureOverview: '🔗 Architecture Overview'
  }
};
