/**
 * Chinese language pack (Simplified)
 */
export const zh = {
  extension: {
    name: '知识图谱',
    description: '将工作区转化为智能知识网络的 VS Code 插件',
    activated: '✅ Knowledge Graph 插件激活成功！',
    noWorkspace: '知识图谱：请打开一个文件夹来使用此插件',
    refresh: '知识图谱已刷新',
    placeholder: '请打开一个文件夹来使用知识图谱功能',
    rag: {
      enabled: '✅ Knowledge Graph RAG 功能已启用！新增文档将自动索引到云端。',
      viewStoreInfo: '查看 Store 信息',
      notEnabled: {
        title: '⚠️ RAG 功能未启用：请配置 Gemini API Key',
        configure: '配置 API Key',
        viewTutorial: '查看教程'
      },
      initializationFailed: (error: string) => `❌ RAG 功能初始化失败: ${error}`,
      viewLogs: '查看日志',
      retry: '重试',
      reconnected: '✅ Gemini API 已重新连接，RAG 功能已启用！',
      invalidKey: '⚠️ API Key 无效，请检查配置',
      indexFile: {
        success: (fileName: string) => `✅ 成功索引: ${fileName}`,
        successLocal: (fileName: string) => `✅ 本地索引成功: ${fileName}`,
        uploadTimeout: (fileName: string) => `上传超时: ${fileName}`,
        embeddingFailed: (fileName: string) => `嵌入失败: ${fileName}`,
        parseFailed: (fileName: string) => `解析文本失败: ${fileName}`
      },
      removeFile: {
        success: (fileName: string) => `✅ 已从索引中删除: ${fileName}`,
        failed: (fileName: string) => `❌ 删除索引失败: ${fileName}`,
        notFound: (fileName: string) => `⚠️ 索引中未找到文件: ${fileName}`
      },
      askQuestion: {
        title: '知识图谱: 提问',
        notInitialized: {
          message: '请先在设置中配置 Gemini API Key',
          openSettings: '打开设置'
        },
        noDocuments: '没有已索引的文档。请在 Knowledge/ 文件夹中添加文档。',
        prompt: '向文档提问',
        placeholder: '例如：这个项目使用了什么数据库？',
        validateEmpty: '问题不能为空',
        thinking: '正在思考...',
        success: '✅ 问答完成',
        fallbackAnswer: '无法生成回答',
        noRelevantDocuments: '本地未找到相关文档。',
        citationSource: (title: string) => `来源：${title}`,
        copyToClipboard: '复制到剪贴板',
      }
    }
  },

  commands: {
    createEntity: {
      title: '知识图谱: 从选择创建实体',
      prompt: '输入实体名称',
      validateEmpty: '名称不能为空',
      success: (name: string) => `实体 "${name}" 创建成功`,
      error: (error: string) => `创建实体失败: ${error}`
    },

    addObservation: {
      title: '知识图谱: 添加观察记录到实体...',
      prompt: '输入观察记录',
      placeholder: '例如：性能问题：N+1 查询问题',
      validateEmpty: '观察记录不能为空',
      success: '观察记录添加成功',
      error: (error: string) => `添加观察记录失败: ${error}`
    },

    addRelation: {
      title: '知识图谱: 添加关系',
      placeholder: '选择实体类型',
      relationExists: (source: string, verb: string, target: string) =>
        `关系已存在: ${source} ${verb} ${target}`,
      success: (source: string, verb: string, target: string) =>
        `✅ 关系已创建: ${source} ${verb} ${target}`,
      error: (error: string) => `创建关系失败: ${error}`,
      needAtLeastTwo: '至少需要 2 个实体才能创建关系'
    },

    linkToEntity: {
      title: '知识图谱: 链接选择到实体...',
      success: (source: string, verb: string, target: string) =>
        `✅ 已链接: ${source} ${verb} ${target}`,
      error: (error: string) => `链接实体失败: ${error}`,
      noEntityAtLocation: '当前位置未找到实体。请先使用 "知识图谱: 从选择创建实体" 创建实体',
      noOtherEntities: '没有其他实体可以链接。请先创建更多实体。'
    },

    viewEntityDetails: {
      title: '知识图谱: 查看实体详情',
      error: (error: string) => `查看实体错误: ${error}`,
      notFound: '未找到实体'
    },

    searchGraph: {
      title: '知识图谱: 搜索图谱',
      prompt: '按名称搜索实体',
      placeholder: '输入搜索查询',
      noResults: '未找到实体'
    },

    deleteEntity: {
      title: '知识图谱: 删除实体',
      confirm: (name: string) => `确定要删除实体 "${name}" 吗?`,
      willAlsoDelete: (obsCount: number, relCount: number) => {
        let msg = '这将同时删除:\n';
        if (obsCount > 0) msg += `- ${obsCount} 个观察记录\n`;
        if (relCount > 0) msg += `- ${relCount} 个关系\n`;
        msg += '\n继续吗?';
        return msg;
      },
      deleteAll: '全部删除',
      success: (name: string) => `✅ 实体 "${name}" 删除成功`,
      error: (message: string) => `删除实体错误: ${message}`
    },

    deleteRelation: {
      title: '知识图谱: 删除关系',
      confirm: (label: string) => `删除关系: ${label}?`,
      success: (label: string) => `✅ 关系已删除: ${label}`,
      error: (error: string) => `删除关系失败: ${error}`,
      noRelations: '没有可删除的关系'
    },

    deleteRelationFromTree: {
      title: '删除关系',
      error: (error: string) => `删除关系失败: ${error}`,
      invalidData: '无效的关系数据'
    },

    deleteObservation: {
      title: '知识图谱: 删除观察记录',
      confirm: (content: string, entityName: string) =>
        `删除观察记录?\n\n"${content}"\n\n来自: ${entityName}`,
      success: (entityName: string) => `✅ 已从 ${entityName} 删除观察记录`,
      error: (error: string) => `删除观察记录失败: ${error}`,
      noObservations: '没有可删除的观察记录'
    },

    editObservation: {
      title: '知识图谱: 编辑观察记录',
      selectPlaceholder: '选择要编辑的观察记录',
      noObservations: '该实体还没有观察记录',
      prompt: '更新观察内容',
      placeholder: '例如：为 findOne 添加缓存',
      validateEmpty: '观察内容不能为空',
      editorHint: '在下方文本框中自由编辑，可使用 Ctrl/Cmd + Enter 快速保存。',
      success: (entityName: string) => `✅ 已更新 ${entityName} 的观察记录`,
      error: (error: string) => `更新观察记录失败: ${error}`
    },

    visualizeGraph: {
      title: '知识图谱: 可视化图谱',
      error: (error: string) => `打开图谱错误: ${error}`
    },

    exportGraph: {
      title: '知识图谱: 导出图谱',
      format: {
        markdown: { label: 'Markdown', description: '导出为 Markdown 格式 (.md)' },
        markdownWithDeps: { label: 'Markdown with Dependency Analysis', description: '包含依赖链分析的 Markdown (.md)' },
        json: { label: 'JSON', description: '导出为 JSON 格式 (.json)' }
      },
      placeholder: '选择导出格式',
      noWorkspace: '请先打开一个工作区',
      saveLabel: '导出',
      progress: {
        title: '正在导出知识图谱...',
        collecting: '收集数据...',
        generatingMarkdown: '生成 Markdown...',
        generatingJSON: '生成 JSON...',
        complete: '完成！'
      },
      success: (fileName: string) => `✅ 知识图谱已成功导出到 ${fileName}`,
      error: (error: string) => `导出失败: ${error}`,
      openFile: '打开文件',
      showInFolder: '在文件夹中显示'
    },

    importGraph: {
      title: '知识图谱: 导入图谱',
      comingSoon: '导入图谱 - 即将推出!'
    },

    clearGraph: {
      title: '知识图谱: 清空图谱',
      confirm: '确定要清空整个知识图谱吗?',
      yes: '是',
      no: '否',
      comingSoon: '清空图谱 - 即将推出!'
    },

    settings: {
      title: '知识图谱: 设置',
      comingSoon: '设置 - 即将推出!'
    },

    refresh: {
      title: '知识图谱: 刷新',
      success: '知识图谱已刷新'
    },

    generateCursorRules: {
      title: '知识图谱: 生成 Cursor 规则',
      success: (fileName: string) => `✅ Cursor 规则已生成: ${fileName}`,
      error: (error: string) => `生成 Cursor 规则失败: ${error}`,
      noWorkspace: '请先打开一个工作区',
      openFile: '打开文件',
      showInFolder: '在文件夹中显示'
    },

    selectGraphSource: {
      title: '选择图谱数据源',
      manual: {
        label: '📝 手动图谱',
        description: '设计决策、观察记录、手动维护的关系'
      },
      auto: {
        label: '⚡ 自动图谱',
        description: '静态分析生成的代码结构和依赖关系'
      },
      merged: {
        label: '🔗 合并图谱',
        description: '手动 + 自动，最完整的上下文'
      }
    },

    generateCopilotInstructions: {
      title: '知识图谱: 生成 Copilot 指令',
      success: (fileName: string) => `✅ Copilot 指令已生成: .github/${fileName}`,
      error: (error: string) => `生成 Copilot 指令失败: ${error}`,
      noWorkspace: '请先打开一个工作区',
      openFile: '打开文件',
      showInFolder: '在文件夹中显示'
    },

    generateAllAIConfigs: {
      title: '知识图谱: 生成所有 AI 配置',
      progress: '正在生成 AI 配置文件...',
      success: '✅ 所有 AI 配置文件已生成:\n- .cursorrules\n- .github/copilot-instructions.md',
      error: (error: string) => `生成 AI 配置失败: ${error}`,
      noWorkspace: '请先打开一个工作区',
      viewCursorRules: '查看 .cursorrules',
      viewCopilotInstructions: '查看 Copilot 指令'
    },

    copyEntityContext: {
      title: '知识图谱: 复制实体上下文到剪贴板',
      success: (entityName: string) => `✅ "${entityName}" 的上下文已复制到剪贴板`,
      error: (error: string) => `复制实体上下文失败: ${error}`,
      noEntity: '未找到实体'
    },

    exportCurrentFileContext: {
      title: '知识图谱: 导出当前文件上下文',
      noFile: '请先打开一个文件',
      noWorkspace: '文件不在工作区中',
      copyToClipboard: '📋 复制到剪贴板',
      saveToFile: '💾 保存到文件',
      successCopy: (fileName: string) => `✅ "${fileName}" 的上下文已复制到剪贴板`,
      successSave: (fileName: string) => `✅ 文件上下文已保存到 ${fileName}`,
      error: (error: string) => `导出文件上下文失败: ${error}`
    },

    generateAISummary: {
      title: '知识图谱: 生成 AI 摘要',
      error: (error: string) => `生成 AI 摘要失败: ${error}`,
      copyToClipboard: '📋 复制到剪贴板',
      preview: '👁️ 预览',
      saveToFile: '💾 保存到文件',
      successCopy: '✅ AI 摘要已复制到剪贴板',
      successSave: (fileName: string) => `✅ AI 摘要已保存到 ${fileName}`
    },

    switchLanguage: {
      title: '知识图谱: 切换语言',
      placeholder: '选择语言 / Select Language',
      error: (error: string) => `切换语言失败: ${error}`
    },

    expandAll: {
      title: '知识图谱: 展开所有'
    }
  },

  rag: {
    askQuestion: {
      title: '知识图谱: 提问',
      notInitialized: {
        message: '请先在设置中配置 Gemini API Key',
        openSettings: '打开设置'
      },
      noDocuments: '没有已索引的文档。请在 Knowledge/ 文件夹中添加文档。',
      prompt: '向文档提问',
      placeholder: '例如：这个项目使用了什么数据库？',
      validateEmpty: '问题不能为空',
      thinking: '正在思考...',
      success: '✅ 问答完成',
      copyToClipboard: '复制到剪贴板',
      saveToFile: '保存为文件',
      result: {
        title: '# 问答结果\n\n',
        questionLabel: '**问题**',
        answerLabel: '## 答案\n\n',
        sourcesLabel: '## 参考来源\n\n',
        citationsLabel: '\n## 引用\n\n',
        storeIdLabel: (id: string) => `_Store ID：${id}_`,
        generatedAt: (date: string) => `_生成时间：${date}_\n`
      },
      saved: (filename: string) => `✅ 已保存到 ${filename}`,
      copiedToClipboard: '已复制到剪贴板',
      error: (error: string) => `问答失败: ${error}`
    },

    viewIndexedDocuments: {
      title: '知识图谱: 查看已索引文档',
      noDocuments: '没有已索引的文档。请在 Knowledge/ 文件夹中添加文档。',
      placeholder: (count: number) => `已索引 ${count} 个文档`,
      sizeKB: (size: number) => `大小: ${size.toFixed(2)} KB`,
      indexedAt: (date: string) => `索引时间: ${date}`
    },

    testConnection: {
      title: '知识图谱: 测试 Gemini API 连接',
      notInitialized: {
        message: 'Gemini 客户端未初始化，请在设置中配置 API Key',
        openSettings: '打开设置'
      },
      testing: '正在测试 API 连接...',
      error: (error: string) => `测试失败: ${error}`
    },

    diagnose: {
      title: '知识图谱: 诊断 RAG 状态',
      error: (error: string) => `诊断失败: ${error}`,
      reportTitle: '# RAG 功能诊断报告\n',
      clientStatus: {
        title: '## 1. Gemini 客户端状态\n',
        initialized: '✅ 已初始化',
        notInitialized: '❌ 未初始化',
        configuredModel: (model: string) => `配置的模型: ${model}`,
        apiKeyConfigured: (prefix: string) => `API Key: ${prefix}... (已配置)`,
        issue: '⚠️ **问题**: Gemini 客户端未初始化',
        solution: '**解决方案**: 请配置 Gemini API Key',
        settingsPath: '设置路径: `knowledgeGraph.gemini.apiKey`\n'
      },
      storeStatus: {
        title: '## 2. Store 状态\n',
        storeName: (name: string) => `Store 名称: \`${name}\``,
        projectName: (name: string) => `项目名称: ${name}`,
        localFiles: (count: number) => `本地文件数: ${count}`,
        createdAt: (date: string) => `创建时间: ${date}`,
        checkingCloud: '\n**正在查询云端状态...**\n',
        cloudData: '### 云端实时数据\n',
        activeDocuments: (count: number) => `活跃文档数: ${count}`,
        pendingDocuments: (count: number) => `处理中文档数: ${count}`,
        failedDocuments: (count: number) => `失败文档数: ${count}`,
        totalDocuments: (total: number) => `总计: ${total}`,
        noActiveDocuments: '⚠️ **提示**: 云端没有活跃文档，请添加文档到 `Knowledge/` 文件夹',
        cloudOK: '✅ **状态**: 云端 Store 正常，可以使用搜索功能',
        cannotGetCloudInfo: '⚠️ **无法获取云端信息** (网络问题或 Store 不存在)',
        storeInfoUnavailable: '❌ **Store 信息不可用**\n',
        possibleReasons: '**可能原因**:',
        reason1: '1. RAG Service 未正确初始化',
        reason2: '2. Store 创建失败',
        reason3: '3. 数据库损坏\n',
        suggestedActions: '**建议操作**:',
        action1: '1. 检查 OUTPUT 面板的 "Knowledge Graph" 日志',
        action2: '2. 重新加载 VS Code 窗口',
        action3: '3. 删除 `.vscode/.knowledge/graph.sqlite` 并重启'
      },
      indexedFiles: {
        title: '## 3. 已索引文件\n',
        hasFiles: (count: number) => `✅ **本地记录**: ${count} 个文件\n`,
        noFiles: '⚠️ **本地无文件记录**\n',
        note: '**注意**: 即使本地无记录，云端可能有文档。',
        checkCloud: '请检查云端状态（上面的"云端实时数据"）。'
      },
      troubleshooting: {
        title: '## 💡 故障排查步骤\n',
        step1: '1. **配置 API Key**: 设置 → 搜索 "gemini" → 配置 API Key',
        step2: '2. **测试连接**: 运行命令 "知识图谱: 测试 Gemini API 连接"',
        step3: '3. **添加文档**: 在 `Knowledge/` 文件夹添加测试文档',
        step4: '4. **查看日志**: OUTPUT 面板 → Knowledge Graph',
        step5: '5. **查看教程**: [QUICKSTART_RAG.md](./QUICKSTART_RAG.md)'
      }
    },

    openDocument: {
      title: '打开文档',
      error: (error: string) => `无法打开文件: ${error}`
    },

    reindex: {
      title: '知识图谱: 重建 RAG 索引',
      confirm: {
        title: '⚠️ 这将删除云端 Store 并重新索引所有文档。\n\n操作将:\n1. 删除云端的所有已索引文档\n2. 清空本地索引记录\n3. 重新扫描 Knowledge/ 文件夹\n4. 重新上传所有文档到云端\n\n这可能需要几分钟时间。确定继续吗?',
        confirm: '确定重新索引',
        cancel: '取消'
      },
      progress: '重新索引 RAG 文档...',
      deleteCloudStore: '删除云端 Store...',
      clearLocalDB: '清空本地数据库...',
      createNewStore: '创建新 Store...',
      scanAndUpload: '扫描并上传文档...',
      success: {
        message: '✅ 重新索引完成!云端和本地数据已同步。',
        viewStoreInfo: '查看 Store 信息'
      },
      error: (error: string) => `重新索引失败: ${error}`
    },

    viewStoreInfo: {
      title: '知识图谱: 查看 RAG Store 信息',
      error: (error: string) => `查看 Store 信息失败: ${error}`,
      document: {
        title: '# RAG Store 信息\n',
        projectName: (name: string) => `项目名称: ${name}`,
        storeName: (name: string) => `Store 名称: \`${name}\``,
        displayName: (name: string) => `显示名称: \`${name || 'N/A'}\``,
        workspacePath: (path: string) => `工作区路径: \`${path}\``
      },
      stats: {
        title: '## 📊 文档统计（云端实时数据）\n',
        active: (count: number) => `活跃文档数: ${count}`,
        pending: (count: number) => `处理中文档数: ${count}`,
        failed: (count: number) => `失败文档数: ${count}`,
        total: (total: number) => `总计: ${total}`
      },
      local: {
        title: '## 📝 本地元数据\n',
        fileCount: (count: number) => `本地记录的文件数: ${count}`,
        createdAt: (date: string) => `创建时间: ${date}`,
        lastSync: (date: string) => `最后同步: ${date}`
      },
      isolation: {
        title: '## 🔐 项目隔离说明\n',
        description1: '每个项目都有唯一的 **File Search Store**，确保文档不会与其他项目混淆。',
        description2: '\nStore 基于项目路径自动创建，即使使用相同的 API Key,',
        description3: '不同项目的文档也完全隔离在独立的 Store 中。'
      },
      cloud: {
        title: '## ☁️ 云端 RAG\n',
        description: '文档已上传到 **Google Gemini File Search Store**：',
        vectorSearch: '- ✅ 真正的向量语义搜索',
        autoChunking: '- ✅ 自动分块和嵌入',
        multiFormat: '- ✅ 支持 100+ 种文件格式',
        noLocalProcessing: '- ✅ 无需本地处理',
        tip: '\n💡 **提示**: 本地仅保存元数据，实际文档和索引都在云端。'
      },
      storeStatus: {
        cannotGetCloudInfo: '⚠️ **无法获取云端信息** (网络问题或 Store 不存在)'
      }
    }
  },

  common: {
    select: '选择',
    cancel: '取消',
    delete: '删除',
    continue: '继续',
    continueAnyway: '仍然继续',
    openFile: '打开文件',
    showInFolder: '在文件夹中显示',
    copyToClipboard: '复制到剪贴板',
    saveToFile: '保存到文件',
    save: '保存',
    close: '关闭',
    yes: '是',
    no: '否',
    error: '错误',
    warning: '警告',
    info: '信息',
    success: '成功',
    noActiveEditor: '没有活动的编辑器',
    fileNotInWorkspace: '文件不在工作区中',
    noWorkspace: '没有打开工作区文件夹',
    noEntities: '未找到实体',
    type: '类型',
    description: '描述',
    location: '位置',
    name: '名称',
    observations: '观察记录',
    relations: '关系',
    details: '详情',
    entity: '实体',
    size: '大小',
    indexedAt: '索引时间',
    openDocument: '打开文档',
    indexed: (count: number, sizeMB: number) => `📊 已索引 ${count} 个文档 (${sizeMB.toFixed(2)} MB)`
  },

  entityTypes: {
    function: { label: 'function', description: '函数或方法' },
    class: { label: 'class', description: '类定义' },
    interface: { label: 'interface', description: '接口定义' },
    variable: { label: 'variable', description: '变量或常量' },
    component: { label: 'component', description: 'UI 组件' },
    service: { label: 'service', description: '服务类' },
    api: { label: 'api', description: 'API 端点' },
    config: { label: 'config', description: '配置' },
    other: { label: 'other', description: '其他类型' }
  },

  relationTypes: {
    uses: { label: 'uses', description: '使用或利用' },
    calls: { label: 'calls', description: '调用' },
    extends: { label: 'extends', description: '继承' },
    implements: { label: 'implements', description: '实现接口' },
    depends_on: { label: 'depends_on', description: '依赖' },
    contains: { label: 'contains', description: '包含' },
    references: { label: 'references', description: '引用' },
    imports: { label: 'imports', description: '导入' },
    exports: { label: 'exports', description: '导出' }
  },

  graphView: {
    title: '知识图谱可视化',
    toolbar: {
      fit: '适应窗口',
      refresh: '刷新'
    },
    loading: '加载知识图谱中...',
    emptyState: {
      title: '📊 知识图谱为空',
      description: '请先创建实体和关系',
      hint: '使用右键菜单 "Knowledge: Create Entity" 开始'
    },
    tooltip: {
      type: '类型',
      file: '文件',
      description: '描述',
      observations: '观察记录',
      noObservations: '暂无观察记录',
      more: '还有 {count} 条'
    },
    cyclicDependency: '循环依赖'
  },

  autoGraph: {
    title: '自动依赖图谱',
    commands: {
      analyzeWorkspace: {
        title: '分析工作区',
        completed: (entities: number, relations: number, files: number) =>
          `✅ 分析完成: ${entities} 个实体, ${relations} 个关系, ${files} 个文件`,
        completedWithErrors: (entities: number, relations: number, errors: number) =>
          `⚠️ 分析完成 (有错误): ${entities} 个实体, ${relations} 个关系, ${errors} 个错误`,
        viewErrors: '查看错误'
      },
      analyzeFile: {
        title: (fileName: string) => `分析文件: ${fileName}`,
        noActiveFile: '请先打开一个文件',
        unsupportedType: (fileName: string) => `不支持的文件类型: ${fileName}`,
        unchanged: (fileName: string) => `文件未改变: ${fileName}`,
        completed: (fileName: string, entities: number, relations: number) =>
          `✅ ${fileName}: ${entities} 个实体, ${relations} 个关系`,
        error: (fileName: string, message: string) => `分析失败 ${fileName}: ${message}`
      },
      clear: {
        confirm: '确定要清空自动图谱吗？这将删除所有自动生成的实体和关系。',
        yes: '确定',
        no: '取消',
        completed: '✅ 自动图谱已清空'
      },
      viewStats: {
        title: '查看自动图谱统计'
      },
      addObservation: {
        noEntities: '自动图谱中没有实体，请先运行分析',
        selectEntity: '选择要添加观察记录的实体',
        entityNotFound: '实体不存在',
        prompt: (entityName: string) => `为 "${entityName}" 添加观察记录`,
        placeholder: '输入观察记录内容...',
        validateEmpty: '观察记录不能为空',
        success: (entityName: string) => `✅ 已为 "${entityName}" 添加观察记录`,
        error: '添加观察记录失败',
        errorDetail: (message: string) => `添加观察记录失败: ${message}`
      },
      editObservation: {
        notFound: '观察记录不存在',
        prompt: '编辑观察记录',
        success: '✅ 观察记录已更新',
        error: (message: string) => `更新观察记录失败: ${message}`
      },
      deleteObservation: {
        confirm: '确定要删除这条观察记录吗？',
        yes: '确定',
        no: '取消',
        success: '✅ 观察记录已删除'
      }
    },
    treeView: {
      manualGraph: '手动图谱',
      autoGraph: '自动图谱',
      entities: '实体',
      relations: '关系'
    },
    graphView: {
      manualGraph: '手动图谱',
      autoGraph: '自动图谱',
      mergedView: '合并视图'
    }
  },

  export: {
    title: '知识图谱导出',
    exportedAt: '导出时间',
    overview: {
      title: '📊 概览',
      totalEntities: '实体总数',
      totalRelations: '关系总数',
      entityTypeDistribution: '实体类型分布'
    },
    entityList: {
      title: '📦 实体列表',
      type: '类型',
      location: '位置',
      description: '描述',
      createdAt: '创建时间',
      observations: '📝 观察记录',
      relations: '🔗 关系',
      outgoing: '出边 (源)',
      incoming: '入边 (目标)'
    },
    relationGraph: {
      title: '🔗 关系图谱',
      source: '源',
      target: '目标'
    },
    statistics: {
      title: '📊 统计概览',
      totalEntities: '实体总数',
      totalRelations: '关系总数',
      typeDistribution: '实体类型分布'
    },
    architectureOverview: '🔗 架构概览'
  }
};
