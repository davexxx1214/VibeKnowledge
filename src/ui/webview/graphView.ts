import * as vscode from 'vscode';
import * as crypto from 'crypto';
import { EntityService } from '../../services/entityService';
import { RelationService } from '../../services/relationService';
import { ObservationService } from '../../services/observationService';
import { AgentGraphService } from '../../services/agentGraph';
import { MusicGeneratorService } from '../../services/musicGenerator';
import { StrudelView } from './strudelView';
import { t } from '../../i18n/i18nService';

/**
 * 图谱视图模式
 */
export type GraphViewMode = 'manual' | 'agent' | 'merged';

/**
 * 图谱可视化 Webview
 */
export class GraphView {
    public static currentPanel: GraphView | undefined;
    private static _agentGraphService: AgentGraphService | undefined;

    private readonly _panel: vscode.WebviewPanel;
    private readonly _extensionUri: vscode.Uri;
    private readonly _entityService: EntityService;
    private readonly _relationService: RelationService;
    private readonly _observationService: ObservationService;
    private readonly _musicGenerator: MusicGeneratorService;
    private _disposables: vscode.Disposable[] = [];
    private _currentMode: GraphViewMode = 'manual';
    private _cachedMusicCode: string = '';

    /**
     * 设置 Agent 图谱服务（用于 agent/merged 视图）
     */
    public static setAgentGraphService(service: AgentGraphService): void {
        GraphView._agentGraphService = service;
    }

    public static refresh(): void {
        GraphView.currentPanel?._sendGraphData();
    }

    private constructor(
        panel: vscode.WebviewPanel,
        extensionUri: vscode.Uri,
        entityService: EntityService,
        relationService: RelationService,
        observationService: ObservationService
    ) {
        this._panel = panel;
        this._extensionUri = extensionUri;
        this._entityService = entityService;
        this._relationService = relationService;
        this._observationService = observationService;
        this._musicGenerator = new MusicGeneratorService({ ambientStyle: true });

        // 设置初始内容
        this._update();

        // 监听来自 webview 的消息
        this._panel.webview.onDidReceiveMessage(
            (message) => {
                this._handleMessage(message);
            },
            null,
            this._disposables
        );

        // 监听面板关闭
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    public static createOrShow(
        extensionUri: vscode.Uri,
        entityService: EntityService,
        relationService: RelationService,
        observationService: ObservationService
    ) {
        // 如果已经存在，则更新数据并显示
        if (GraphView.currentPanel) {
            GraphView.currentPanel._panel.reveal(vscode.ViewColumn.One);
            GraphView.currentPanel._update();
            return;
        }

        // 创建新的面板
        const panel = vscode.window.createWebviewPanel(
            'knowledgeGraph',
            'Knowledge Graph Visualization',
            vscode.ViewColumn.One,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        GraphView.currentPanel = new GraphView(
            panel,
            extensionUri,
            entityService,
            relationService,
            observationService
        );
    }

    public dispose() {
        GraphView.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }

    private _update() {
        const webview = this._panel.webview;
        this._panel.title = t().graphView.title;
        this._panel.webview.html = this._getHtmlForWebview(webview);
    }

    private _handleMessage(message: any) {
        switch (message.type) {
            case 'ready':
                // Webview 准备好了，发送图谱数据
                this._sendGraphData();
                break;
            case 'jumpToEntity':
                // 跳转到实体位置
                this._jumpToEntity(message.entityId, message.isAgent);
                break;
            case 'refresh':
                // 刷新图谱数据
                this._sendGraphData();
                break;
            case 'switchMode':
                // 切换视图模式
                if (message.mode === 'manual' || message.mode === 'agent' || message.mode === 'merged') {
                    this._currentMode = message.mode;
                    this._sendGraphData();
                }
                break;
            case 'requestMusicCode':
                // 请求生成音乐代码
                this._sendMusicCode();
                break;
            case 'copyMusicCode':
                // 复制音乐代码到剪贴板
                if (this._cachedMusicCode) {
                    vscode.env.clipboard.writeText(this._cachedMusicCode);
                    vscode.window.showInformationMessage(t().graphView?.music?.codeCopied || 'Music code copied to clipboard');
                }
                break;
            case 'openStrudelRepl':
            case 'openStrudelUrl':
                // 在新的 VS Code tab 中打开 Strudel 播放器
                if (this._cachedMusicCode) {
                    StrudelView.createOrShow(this._extensionUri, this._cachedMusicCode);
                }
                break;
        }
    }

    private _sendGraphData() {
        const { entities, relations } = this._collectGraphData();

        // 发送数据到 webview
        this._panel.webview.postMessage({
            type: 'graphData',
            data: {
                entities,
                relations,
                mode: this._currentMode,
            },
        });
    }

    /**
     * 生成并发送音乐代码
     */
    private _sendMusicCode() {
        const { entities, relations } = this._collectGraphData();

        // 生成音乐代码
        const music = this._musicGenerator.generateMusic(entities, relations, this._currentMode);
        this._cachedMusicCode = music.code;

        // 发送到 webview
        this._panel.webview.postMessage({
            type: 'musicCode',
            data: {
                code: music.code,
                stats: music.stats,
                bpm: music.bpm,
            },
        });
    }

    /**
     * Build one consistent view model for visualization and sonification.
     * In merged mode, human-maintained entities win and Agent relation
     * endpoints are remapped to them before duplicate relations are removed.
     */
    private _collectGraphData(): { entities: any[]; relations: any[] } {
        const entities: any[] = [];
        const relations: any[] = [];
        const entityIds = new Set<string>();
        const entityByIdentity = new Map<string, string>();
        const agentIdRemap = new Map<string, string>();

        if (this._currentMode === 'manual' || this._currentMode === 'merged') {
            for (const entity of this._entityService.listEntities()) {
                const observations = this._observationService.getObservations(entity.id);
                entities.push({
                    id: entity.id,
                    name: entity.name,
                    type: entity.type,
                    filePath: entity.filePath,
                    startLine: entity.startLine,
                    endLine: entity.endLine,
                    description: entity.description,
                    isAgent: false,
                    observations: observations.map(o => ({
                        id: o.id,
                        content: o.content,
                        createdAt: o.createdAt,
                        updatedAt: o.updatedAt,
                    })),
                    observationCount: observations.length,
                });
                entityIds.add(entity.id);
                entityByIdentity.set(this._getEntityIdentity(entity), entity.id);
            }

            for (const relation of this._relationService.getAllRelations()) {
                if (!entityIds.has(relation.sourceEntityId) || !entityIds.has(relation.targetEntityId)) {
                    continue;
                }
                relations.push({
                    id: relation.id,
                    sourceId: relation.sourceEntityId,
                    targetId: relation.targetEntityId,
                    verb: relation.verb,
                    isAgent: false,
                });
            }
        }

        if ((this._currentMode === 'agent' || this._currentMode === 'merged') && GraphView._agentGraphService) {
            for (const entity of GraphView._agentGraphService.listEntities()) {
                const identity = this._getEntityIdentity(entity);
                const manualId = this._currentMode === 'merged'
                    ? entityByIdentity.get(identity)
                    : undefined;
                if (manualId) {
                    agentIdRemap.set(entity.id, manualId);
                    continue;
                }

                agentIdRemap.set(entity.id, entity.id);
                entityIds.add(entity.id);
                entityByIdentity.set(identity, entity.id);
                entities.push({
                    id: entity.id,
                    name: entity.name,
                    type: entity.type,
                    filePath: entity.filePath,
                    startLine: entity.startLine,
                    endLine: entity.endLine,
                    description: entity.description,
                    isAgent: true,
                    observations: [],
                    observationCount: 0,
                });
            }

            const relationKeys = new Set(
                relations.map(relation =>
                    `${relation.sourceId}\u0000${relation.targetId}\u0000${relation.verb}`
                )
            );
            for (const relation of GraphView._agentGraphService.listRelations()) {
                const sourceId = agentIdRemap.get(relation.sourceEntityId);
                const targetId = agentIdRemap.get(relation.targetEntityId);
                if (!sourceId || !targetId || sourceId === targetId) {
                    continue;
                }
                const relationKey = `${sourceId}\u0000${targetId}\u0000${relation.verb}`;
                if (relationKeys.has(relationKey)) {
                    continue;
                }
                relationKeys.add(relationKey);
                relations.push({
                    id: relation.id,
                    sourceId,
                    targetId,
                    verb: relation.verb,
                    isAgent: true,
                    description: relation.metadata?.description,
                    evidence: relation.metadata?.evidence || [],
                });
            }
        }

        return { entities, relations };
    }

    private _getEntityIdentity(entity: { name: string; filePath: string }): string {
        const normalizedPath = entity.filePath.replace(/\\/g, '/').replace(/^\.\//, '');
        return `${normalizedPath.toLocaleLowerCase()}\u0000${entity.name.toLocaleLowerCase()}`;
    }

    private async _jumpToEntity(entityId: string, isAgent: boolean = false) {
        let entity;
        if (isAgent && GraphView._agentGraphService) {
            entity = GraphView._agentGraphService.getEntity(entityId);
        } else {
            entity = this._entityService.getEntity(entityId);
        }
        
        if (!entity) {
            return;
        }

        // 外部实体不能跳转到文件
        if (entity.filePath === '@external' || entity.type === 'external') {
            vscode.window.showInformationMessage(
                `"${entity.name}" is an external type from a third-party module.`
            );
            return;
        }

        const workspaceFolders = vscode.workspace.workspaceFolders;
        if (!workspaceFolders) {
            return;
        }

        const uri = vscode.Uri.joinPath(workspaceFolders[0].uri, entity.filePath);
        if (entity.type === 'directory') {
            await vscode.commands.executeCommand('revealInExplorer', uri);
            return;
        }

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

    private _getHtmlForWebview(webview: vscode.Webview) {
        const nonce = crypto.randomBytes(16).toString('base64');
        const d3Uri = webview.asWebviewUri(
            vscode.Uri.joinPath(this._extensionUri, 'dist', 'd3.min.js')
        );
        const translations = t().graphView;
        const agentGraphTranslations = t().agentGraph?.graphView || {
            manualGraph: 'Manual Graph',
            agentGraph: 'Agent Graph',
            mergedView: 'Merged View',
            source: 'Source',
            humanSource: 'Human-maintained',
            agentSource: 'Agent',
            evidence: 'Evidence'
        };
        const musicTranslations = (t().graphView as any)?.music || {
            play: 'Play Code Music',
            stop: 'Stop',
            copyCode: 'Copy Strudel Code',
            openRepl: 'Open in Strudel REPL',
            generating: 'Generating...',
            noData: 'No data to play'
        };

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src ${webview.cspSource} 'nonce-${nonce}'; style-src ${webview.cspSource} 'unsafe-inline';">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${translations.title}</title>
    <script nonce="${nonce}" src="${d3Uri}"></script>
    <style>
        body {
            margin: 0;
            padding: 0;
            font-family: var(--vscode-font-family);
            color: var(--vscode-foreground);
            background-color: var(--vscode-editor-background);
            overflow: hidden;
            width: 100vw;
            height: 100vh;
        }
        
        #toolbar {
            position: absolute;
            top: 15px;
            right: 15px;
            z-index: 1000;
            display: flex;
            gap: 8px;
        }
        
        #mode-switcher {
            position: absolute;
            top: 15px;
            left: 15px;
            z-index: 1000;
            display: flex;
            gap: 4px;
            background-color: rgba(30, 30, 30, 0.9);
            padding: 4px;
            border-radius: 6px;
            border: 1px solid var(--vscode-panel-border);
        }
        
        .mode-btn {
            background-color: transparent;
            color: var(--vscode-foreground);
            border: none;
            padding: 6px 12px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 12px;
            width: auto;
            height: auto;
            transition: all 0.2s;
        }
        
        .mode-btn:hover {
            background-color: rgba(255, 255, 255, 0.1);
            transform: none;
            box-shadow: none;
        }
        
        .mode-btn.active {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        button {
            background-color: rgba(30, 30, 30, 0.8);
            color: var(--vscode-foreground);
            border: 1px solid var(--vscode-panel-border);
            width: 36px;
            height: 36px;
            cursor: pointer;
            border-radius: 4px;
            font-size: 18px;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s;
        }
        
        button:hover {
            background-color: rgba(50, 50, 50, 0.9);
            transform: scale(1.05);
            box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
        }
        
        #graph-container {
            width: 100%;
            height: 100%;
            cursor: grab;
        }

        #graph-container:active {
            cursor: grabbing;
        }
        
        #loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 999;
            pointer-events: none;
        }
        
        #loading.hidden {
            display: none;
        }
        
        .spinner {
            border: 4px solid var(--vscode-panel-border);
            border-top: 4px solid var(--vscode-button-background);
            border-radius: 50%;
            width: 40px;
            height: 40px;
            animation: spin 1s linear infinite;
            margin: 0 auto 10px;
        }
        
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
        
        #empty-state {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            text-align: center;
            z-index: 999;
            pointer-events: none;
        }
        
        #empty-state.hidden {
            display: none;
        }
        
        /* Tooltip */
        .tooltip {
            position: absolute;
            padding: 8px;
            background: rgba(0, 0, 0, 0.9);
            color: #fff;
            border: 1px solid var(--vscode-panel-border);
            border-radius: 4px;
            pointer-events: none;
            font-size: 12px;
            max-width: 300px;
            z-index: 1000;
            opacity: 0;
            transition: opacity 0.2s;
            box-shadow: 0 2px 10px rgba(0,0,0,0.5);
        }

        .tooltip .obs-section {
            margin-top: 8px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            padding-top: 6px;
        }

        .tooltip .obs-title {
            font-weight: bold;
            margin-bottom: 4px;
            font-size: 12px;
        }

        .tooltip .obs-list {
            margin: 0;
            padding-left: 16px;
            max-width: 260px;
        }

        .tooltip .obs-list li {
            margin-bottom: 4px;
            line-height: 1.4;
        }

        .tooltip .obs-more,
        .tooltip .obs-empty {
            font-size: 11px;
            opacity: 0.8;
        }

        @keyframes flow {
            from {
                stroke-dashoffset: 10;
            }
            to {
                stroke-dashoffset: 0;
            }
        }
        
        .link-flow {
            animation: flow 1s linear infinite;
        }

        .particle {
            fill: #fff;
            pointer-events: none;
        }
        
        .node-dimmed {
            opacity: 0.1;
            transition: opacity 0.3s;
        }
        
        .link-dimmed {
            opacity: 0.05;
            transition: opacity 0.3s;
        }
        
        .text-dimmed {
            opacity: 0.1;
            transition: opacity 0.3s;
        }
        
        /* Music player styles */
        #playBtn.playing {
            background-color: var(--vscode-button-background);
            color: var(--vscode-button-foreground);
        }
        
        #music-status {
            position: absolute;
            bottom: 15px;
            left: 15px;
            z-index: 1000;
            display: none;
            background-color: rgba(30, 30, 30, 0.9);
            padding: 8px 12px;
            border-radius: 6px;
            border: 1px solid var(--vscode-panel-border);
            font-size: 12px;
        }
        
        #music-status.visible {
            display: block;
        }
        
        #music-status .status-icon {
            margin-right: 6px;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        .music-playing {
            animation: pulse 1s ease-in-out infinite;
        }
        
        /* Sync particles with beat */
        .beat-sync {
            animation-duration: 1s !important;
        }
    </style>
</head>
<body>
    <div id="mode-switcher">
        <button class="mode-btn active" data-mode="manual" onclick="switchMode('manual')" title="${agentGraphTranslations.manualGraph}">📝 ${agentGraphTranslations.manualGraph}</button>
        <button class="mode-btn" data-mode="agent" onclick="switchMode('agent')" title="${agentGraphTranslations.agentGraph}">🤖 ${agentGraphTranslations.agentGraph}</button>
        <button class="mode-btn" data-mode="merged" onclick="switchMode('merged')" title="${agentGraphTranslations.mergedView}">🔗 ${agentGraphTranslations.mergedView}</button>
    </div>
    
    <div id="toolbar">
        <button id="playBtn" onclick="toggleMusic()" title="${musicTranslations.openRepl}">🎵</button>
        <button onclick="fitGraph()" title="${translations.toolbar.fit}">⛶</button>
        <button onclick="refreshGraph()" title="${translations.toolbar.refresh}">↻</button>
    </div>
    
    <div id="loading">
        <div class="spinner"></div>
        <div>${translations.loading}</div>
    </div>
    
    <div id="empty-state" class="hidden">
        <h2>${translations.emptyState.title}</h2>
        <p>${translations.emptyState.description}</p>
        <p style="margin-top: 10px;">${translations.emptyState.hint}</p>
    </div>
    
    <div id="graph-container"></div>
    <div id="tooltip" class="tooltip"></div>
    <div id="music-status">
        <span class="status-icon">🎵</span>
        <span id="music-status-text">Ready</span>
    </div>

    <script nonce="${nonce}">
        const vscode = acquireVsCodeApi();
        let simulation, svg, g, zoom;
        let width, height;
        
        // Music state
        let isPlaying = false;
        let strudelApi = null;
        let currentMusicCode = '';
        let strudelInitialized = false;
        
        // Music i18n
        const musicI18n = {
            play: '${musicTranslations.play}',
            stop: '${musicTranslations.stop}',
            generating: '${musicTranslations.generating}',
            noData: '${musicTranslations.noData}'
        };
        
        const i18n = {
            tooltip: {
                type: '${translations.tooltip.type}',
                file: '${translations.tooltip.file}',
                description: '${translations.tooltip.description}',
                observations: '${translations.tooltip.observations}',
                noObservations: '${translations.tooltip.noObservations}',
                more: '${translations.tooltip.more}',
                source: '${agentGraphTranslations.source}',
                humanSource: '${agentGraphTranslations.humanSource}',
                agentSource: '${agentGraphTranslations.agentSource}',
                evidence: '${agentGraphTranslations.evidence}'
            },
            cyclicDependency: '${translations.cyclicDependency}'
        };
        
        const typeColors = {
            'function': '#61AFEF',
            'class': '#E06C75',
            'interface': '#C678DD',
            'variable': '#98C379',
            'component': '#E5C07B',
            'service': '#56B6C2',
            'api': '#D19A66',
            'config': '#ABB2BF',
            'external': '#888888',  // 外部模块使用灰色
            'other': '#5C6370'
        };

        window.addEventListener('load', () => {
            vscode.postMessage({ type: 'ready' });
            initGraph();
        });

        window.addEventListener('resize', () => {
            if (svg) {
                width = window.innerWidth;
                height = window.innerHeight;
                svg.attr('width', width).attr('height', height)
                   .attr('viewBox', [0, 0, width, height]);
                
                if (simulation) {
                    simulation.force('center', d3.forceCenter(width / 2, height / 2));
                    simulation.alpha(0.3).restart();
                }
            }
        });
        
        window.addEventListener('message', event => {
            const message = event.data;
            switch (message.type) {
                case 'graphData':
                    renderGraph(message.data);
                    break;
                case 'musicCode':
                    handleMusicCode(message.data);
                    break;
            }
        });

        function initGraph() {
            width = window.innerWidth;
            height = window.innerHeight;
            
            const container = d3.select('#graph-container');
            container.selectAll('*').remove();
            
            svg = container.append('svg')
                .attr('width', width)
                .attr('height', height)
                .attr('viewBox', [0, 0, width, height])
                .style('width', '100%')
                .style('height', '100%');
                
            // Glow filter
            const defs = svg.append('defs');
            const filter = defs.append('filter')
                .attr('id', 'glow');
            filter.append('feGaussianBlur')
                .attr('stdDeviation', '2.5')
                .attr('result', 'coloredBlur');
            const feMerge = filter.append('feMerge');
            feMerge.append('feMergeNode').attr('in', 'coloredBlur');
            feMerge.append('feMergeNode').attr('in', 'SourceGraphic');

            // Arrow markers
            // Create markers for each type color
            Object.entries(typeColors).forEach(([type, color]) => {
                defs.append('marker')
                    .attr('id', 'arrow-' + type)
                    .attr('viewBox', '0 -5 10 10')
                    .attr('refX', 28) 
                    .attr('refY', 0)
                    .attr('markerWidth', 6)
                    .attr('markerHeight', 6)
                    .attr('orient', 'auto')
                    .append('path')
                    .attr('d', 'M0,-5L10,0L0,5')
                    .attr('fill', color);
            });

            // Default marker
            defs.append('marker')
                .attr('id', 'arrow')
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 28) 
                .attr('refY', 0)
                .attr('markerWidth', 6)
                .attr('markerHeight', 6)
                .attr('orient', 'auto')
                .append('path')
                .attr('d', 'M0,-5L10,0L0,5')
                .attr('fill', '#ccc'); // Brighter grey

            g = svg.append('g');
            
            zoom = d3.zoom()
                .scaleExtent([0.1, 4])
                .on('zoom', (event) => {
                    g.attr('transform', event.transform);
                });
                
            svg.call(zoom).on('dblclick.zoom', null);
        }

        function renderGraph(data) {
            document.getElementById('loading').classList.add('hidden');
            
            const { entities, relations } = data;
            
            if (!entities || entities.length === 0) {
                document.getElementById('empty-state').classList.remove('hidden');
                return;
            } else {
                document.getElementById('empty-state').classList.add('hidden');
            }

            // Prepare links (D3 requires object references or IDs)
            const links = relations.map(r => ({
                source: r.sourceId,
                target: r.targetId,
                ...r
            }));
            
            // Detect multiple links between same nodes
            const linkGroups = {};
            links.forEach(link => {
                const key = [link.source, link.target].sort().join('-');
                if (!linkGroups[key]) {
                    linkGroups[key] = [];
                }
                linkGroups[key].push(link);
            });

            // Detect cyclic dependencies
            const linkMap = new Set();
            links.forEach(l => {
                linkMap.add(l.source + '|' + l.target);
            });

            links.forEach(l => {
                if (linkMap.has(l.target + '|' + l.source)) {
                    // Only show warning on one of the links to avoid clutter
                    if (l.source < l.target) {
                        l.isCyclic = true;
                    }
                }
            });
            
            links.forEach(link => {
                const key = [link.source, link.target].sort().join('-');
                const group = linkGroups[key];
                // Calculate index in the group
                link.linkIndex = group.indexOf(link);
                link.linkCount = group.length;
                
                // Determine direction relative to sorted key to handle A->B vs B->A
                // If source < target, we use index as is
                // If source > target, we need to be careful if we want symmetric curves
                // For now, just using index/count is enough to separate them
            });
            
            const nodes = entities.map(e => ({
                ...e
            }));

            // Simulation
            if (simulation) {
                simulation.stop();
            }
            
            simulation = d3.forceSimulation(nodes)
                .force('link', d3.forceLink(links).id(d => d.id).distance(200)) // Increased distance
                .force('charge', d3.forceManyBody().strength(-500))
                .force('center', d3.forceCenter(width / 2, height / 2))
                .force('collide', d3.forceCollide().radius(50));

            g.selectAll('*').remove();

            // Links (Paths instead of Lines)
            const linkGroup = g.append('g')
                .attr('class', 'links');
                
            const link = linkGroup.selectAll('path')
                .data(links)
                .join('path')
                .attr('id', d => 'link-' + d.id) // Add ID for textPath
                .attr('fill', 'none')
                .attr('stroke', d => {
                    // Link color same as source node, but darker/transparent
                    const color = typeColors[entities.find(e => e.id === d.sourceId)?.type] || typeColors['other'];
                    return color;
                })
                .attr('stroke-opacity', d => d.isAgent ? 0.75 : 0.4)
                .attr('stroke-width', d => d.isAgent ? 2.5 : 1.5)
                .attr('stroke-dasharray', d => d.isAgent ? '4, 4' : null)
                .attr('class', 'link-flow')       
                .attr('marker-end', d => {
                    const type = entities.find(e => e.id === d.sourceId)?.type || 'other';
                    return 'url(#arrow-' + type + ')';
                });

            link.append('title').text(formatRelationTooltip);

            // Particles
            const particleGroup = g.append('g')
                .attr('class', 'particles');
            
            // Create particles for each link
            const particles = particleGroup.selectAll('circle')
                .data(links)
                .join('circle')
                .attr('r', 2)
                .attr('class', 'particle');

            // Animation loop for particles
            function animateParticles() {
                particles.each(function(d) {
                    const path = document.getElementById('link-' + d.id);
                    if (!path) return;
                    
                    // Get path length
                    const len = path.getTotalLength();
                    if (!len) return;
                    
                    // Calculate position based on time
                    const t = (Date.now() % 2000) / 2000; // 2s cycle
                    const p = path.getPointAtLength(t * len);
                    
                    d3.select(this)
                        .attr('cx', p.x)
                        .attr('cy', p.y)
                        .attr('fill', typeColors[entities.find(e => e.id === d.sourceId)?.type] || '#fff');
                });
                requestAnimationFrame(animateParticles);
            }
            animateParticles();

            // Link Labels
            const linkLabelGroup = g.append('g')
                .attr('class', 'link-labels');

            const linkLabel = linkLabelGroup.selectAll('g')
                .data(links)
                .join('g');
            
            // Label background (halo) to make text readable over lines
            linkLabel.append('text')
                .text(d => d.verb)
                .attr('font-size', 10)
                .attr('text-anchor', 'middle')
                .attr('dy', -5)
                .attr('stroke', '#1e1e1e') // Dark theme background color
                .attr('stroke-width', 3)
                .attr('opacity', 0.8);

            // Actual label text
            linkLabel.append('text')
                .text(d => d.verb)
                .attr('font-size', 10)
                .attr('fill', '#aaa')
                .attr('text-anchor', 'middle')
                .attr('dy', -5);

            linkLabel.style('cursor', 'help')
                .append('title')
                .text(formatRelationTooltip);

            // Warning Icon for Cyclic Dependencies
            linkLabel.filter(d => d.isCyclic)
                .append('text')
                .text('⚠️')
                .attr('font-size', 12)
                .attr('x', 15)
                .attr('y', 0)
                .attr('dy', -2)
                .attr('text-anchor', 'middle')
                .style('cursor', 'help')
                .append('title')
                .text(i18n.cyclicDependency);

            // Nodes
            const nodeGroup = g.append('g')
                .attr('class', 'nodes');

            const node = nodeGroup.selectAll('g')
                .data(nodes)
                .join('g')
                .call(drag(simulation));

            // Node circles
            node.append('circle')
                .attr('r', 20)
                .attr('fill', d => typeColors[d.type] || typeColors['other'])
                .attr('stroke', d => d.isAgent ? '#FFD166' : '#fff')
                .attr('stroke-width', 1.5)
                .attr('stroke-dasharray', d => d.isAgent ? '4, 2' : null)
                .style('filter', 'url(#glow)')
                .style('cursor', 'pointer')
                .on('mouseover', function(event, d) {
                    d3.select(this).transition().duration(200).attr('r', 25);
                    showTooltip(event, d);
                    
                    // Highlight connected nodes
                    const connectedNodeIds = new Set();
                    connectedNodeIds.add(d.id);
                    
                    links.forEach(l => {
                        if (l.sourceId === d.id || l.targetId === d.id) {
                            connectedNodeIds.add(l.sourceId);
                            connectedNodeIds.add(l.targetId);
                        }
                    });
                    
                    node.classed('node-dimmed', n => !connectedNodeIds.has(n.id));
                    link.classed('link-dimmed', l => l.sourceId !== d.id && l.targetId !== d.id);
                    particles.style('opacity', l => (l.sourceId === d.id || l.targetId === d.id) ? 1 : 0);
                    linkLabel.classed('text-dimmed', l => l.sourceId !== d.id && l.targetId !== d.id);
                })
                .on('mouseout', function(event, d) {
                    d3.select(this).transition().duration(200).attr('r', 20);
                    hideTooltip();
                    
                    // Reset highlight
                    node.classed('node-dimmed', false);
                    link.classed('link-dimmed', false);
                    particles.style('opacity', 1);
                    linkLabel.classed('text-dimmed', false);
                })
                .on('dblclick', (event, d) => {
                    vscode.postMessage({
                        type: 'jumpToEntity',
                        entityId: d.id,
                        isAgent: d.isAgent || false
                    });
                });

            // Node labels
            node.append('text')
                .text(d => d.name)
                .attr('x', 28)
                .attr('y', 5)
                .attr('fill', '#fff')
                .attr('stroke', 'none')
                .attr('font-size', 14)
                .attr('font-weight', 'bold')
                .style('pointer-events', 'none')
                .style('text-shadow', '1px 1px 2px #000');

            // Icon/Text inside node
            node.append('text')
                .text(d => getIconForType(d.type))
                .attr('text-anchor', 'middle')
                .attr('dy', 6)
                .attr('fill', '#fff')
                .attr('stroke', 'none')
                .attr('font-size', 16)
                .attr('font-weight', 'bold')
                .style('pointer-events', 'none');

            simulation.on('tick', () => {
                link.attr('d', d => {
                    const x1 = d.source.x;
                    const y1 = d.source.y;
                    const x2 = d.target.x;
                    const y2 = d.target.y;
                    
                    if (d.linkCount > 1) {
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        const dr = Math.sqrt(dx * dx + dy * dy);
                        
                        // Calculate curve amount based on index
                        // We want to spread them out
                        
                        // Midpoint
                        const mx = (x1 + x2) / 2;
                        const my = (y1 + y2) / 2;
                        
                        // Normal vector
                        const normX = -dy;
                        const normY = dx;
                        
                        // Normalize
                        const len = Math.sqrt(normX * normX + normY * normY);
                        const nx = normX / len;
                        const ny = normY / len;
                        
                        let curveFactor = 0;
                        if (d.linkCount === 2) {
                            curveFactor = d.linkIndex === 0 ? 30 : -30;
                        } else {
                            // General case
                            const spread = 30;
                            const center = (d.linkCount - 1) / 2;
                            curveFactor = (d.linkIndex - center) * spread;
                        }
                        
                        const cx = mx + nx * curveFactor;
                        const cy = my + ny * curveFactor;
                        
                        return \`M\${x1},\${y1} Q\${cx},\${cy} \${x2},\${y2}\`;
                    } else {
                        // Single link - straight line
                        return \`M\${x1},\${y1} L\${x2},\${y2}\`;
                    }
                });

                linkLabel.attr('transform', d => {
                    if (d.linkCount > 1) {
                        const x1 = d.source.x;
                        const y1 = d.source.y;
                        const x2 = d.target.x;
                        const y2 = d.target.y;
                        
                        const dx = x2 - x1;
                        const dy = y2 - y1;
                        
                        const mx = (x1 + x2) / 2;
                        const my = (y1 + y2) / 2;
                        
                        const normX = -dy;
                        const normY = dx;
                        const len = Math.sqrt(normX * normX + normY * normY);
                        const nx = normX / len;
                        const ny = normY / len;
                        
                        let curveFactor = 0;
                        if (d.linkCount === 2) {
                            curveFactor = d.linkIndex === 0 ? 30 : -30;
                        } else {
                            const spread = 30;
                            const center = (d.linkCount - 1) / 2;
                            curveFactor = (d.linkIndex - center) * spread;
                        }
                        
                        const cx = mx + nx * curveFactor;
                        const cy = my + ny * curveFactor;
                        
                        // Find point on quadratic bezier at t=0.5
                        const tx = 0.25 * x1 + 0.5 * cx + 0.25 * x2;
                        const ty = 0.25 * y1 + 0.5 * cy + 0.25 * y2;
                        
                        return \`translate(\${tx},\${ty})\`;
                    } else {
                        const x = (d.source.x + d.target.x) / 2;
                        const y = (d.source.y + d.target.y) / 2;
                        return \`translate(\${x},\${y})\`;
                    }
                });

                node
                    .attr('transform', d => \`translate(\${d.x},\${d.y})\`);
            });
            
            // Initial fit
            setTimeout(fitGraph, 1000);
        }

        function drag(simulation) {
            function dragstarted(event) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                event.subject.fx = event.subject.x;
                event.subject.fy = event.subject.y;
            }
            
            function dragged(event) {
                event.subject.fx = event.x;
                event.subject.fy = event.y;
            }
            
            function dragended(event) {
                if (!event.active) simulation.alphaTarget(0);
                event.subject.fx = null;
                event.subject.fy = null;
            }
            
            return d3.drag()
                .on('start', dragstarted)
                .on('drag', dragged)
                .on('end', dragended);
        }

        function getIconForType(type) {
            const icons = {
                'function': 'ƒ',
                'class': 'C',
                'interface': 'I',
                'variable': 'v',
                'component': '◆',
                'service': 'S',
                'api': 'A',
                'config': '⚙',
                'external': '📦',  // 外部模块图标
                'other': '?'
            };
            return icons[type] || '?';
        }

        const tooltip = document.getElementById('tooltip');
        
        function showTooltip(event, d) {
            tooltip.style.opacity = 1;
            tooltip.style.left = (event.pageX + 10) + 'px';
            tooltip.style.top = (event.pageY + 10) + 'px';

            let html = \`
                <strong>\${escapeHtml(d.name)}</strong><br>
                \${i18n.tooltip.type}: \${escapeHtml(d.type)}<br>
                \${i18n.tooltip.file}: \${escapeHtml(d.filePath)}:\${d.startLine}<br>
                \${i18n.tooltip.source}: \${d.isAgent ? i18n.tooltip.agentSource : i18n.tooltip.humanSource}<br>
            \`;

            if (d.description) {
                html += \`\${i18n.tooltip.description}: \${escapeHtml(d.description)}<br>\`;
            }

            html += renderObservations(d);
            tooltip.innerHTML = html;
        }

        function formatRelationTooltip(relation) {
            const lines = [relation.verb];
            lines.push(i18n.tooltip.source + ': ' + (
                relation.isAgent ? i18n.tooltip.agentSource : i18n.tooltip.humanSource
            ));
            if (relation.description) {
                lines.push(relation.description);
            }
            if (Array.isArray(relation.evidence) && relation.evidence.length > 0) {
                lines.push(i18n.tooltip.evidence + ':');
                relation.evidence.forEach(item => {
                    const endLine = item.endLine ? '-' + item.endLine : '';
                    const detail = item.detail ? ' — ' + item.detail : '';
                    lines.push('• ' + item.filePath + ':' + item.startLine + endLine + detail);
                });
            }
            return lines.join('\\n');
        }
        
        function hideTooltip() {
            tooltip.style.opacity = 0;
        }

        function renderObservations(entity) {
            const observations = entity.observations || [];
            const total = entity.observationCount || observations.length || 0;

            if (!total) {
                return '';
            }

            let html = '<div class="obs-section">';
            html += \`<div class="obs-title">\${i18n.tooltip.observations}\${total ? ' (' + total + ')' : ''}</div>\`;

            const maxItems = 3;
            const visible = observations.slice(0, maxItems);

            html += '<ul class="obs-list">';
            visible.forEach(item => {
                html += \`<li>\${escapeHtml(item.content || '')}</li>\`;
            });
            html += '</ul>';

            const remaining = Math.max(total - visible.length, 0);
            if (remaining > 0) {
                html += \`<div class="obs-more">\${i18n.tooltip.more.replace('{count}', remaining)}</div>\`;
            }

            html += '</div>';
            return html;
        }

        function escapeHtml(value) {
            if (typeof value !== 'string') {
                return '';
            }
            return value
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(/\\n/g, '<br>');
        }

        function fitGraph() {
            if (!g) return;
            
            // Use D3 zoom to fit
            const bounds = g.node().getBBox();
            const parent = svg.node().parentElement;
            const fullWidth = parent.clientWidth;
            const fullHeight = parent.clientHeight;
            
            const width = bounds.width;
            const height = bounds.height;
            
            if (width === 0 || height === 0) return;
            
            const midX = bounds.x + width / 2;
            const midY = bounds.y + height / 2;
            
            const scale = 0.85 / Math.max(width / fullWidth, height / fullHeight);
            const translate = [fullWidth / 2 - scale * midX, fullHeight / 2 - scale * midY];
            
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        }

        function refreshGraph() {
            document.getElementById('loading').classList.remove('hidden');
            vscode.postMessage({ type: 'refresh' });
        }
        
        let currentMode = 'manual';
        
        function switchMode(mode) {
            if (mode === currentMode) return;
            
            currentMode = mode;
            
            // 更新按钮状态
            document.querySelectorAll('.mode-btn').forEach(btn => {
                btn.classList.remove('active');
                if (btn.dataset.mode === mode) {
                    btn.classList.add('active');
                }
            });
            
            // 显示加载状态
            document.getElementById('loading').classList.remove('hidden');
            
            // 停止当前播放的音乐
            if (isPlaying) {
                stopMusic();
            }
            
            // 通知后端切换模式
            vscode.postMessage({ type: 'switchMode', mode: mode });
        }
        
        // ============================================================
        // Music Control Functions
        // ============================================================
        
        async function toggleMusic() {
            // Always open in browser (no toggle needed)
            await playMusic();
        }
        
        async function playMusic() {
            const playBtn = document.getElementById('playBtn');
            const statusEl = document.getElementById('music-status');
            const statusText = document.getElementById('music-status-text');
            
            // Show generating status
            statusEl.classList.add('visible');
            statusText.textContent = musicI18n.generating;
            
            // Request music code from backend
            vscode.postMessage({ type: 'requestMusicCode' });
        }
        
        function stopMusic() {
            // Music plays in external browser, nothing to stop here
            isPlaying = false;
            document.getElementById('music-status').classList.remove('visible');
            
            // Remove beat sync class
            document.querySelectorAll('.particle').forEach(p => {
                p.classList.remove('beat-sync');
            });
        }
        
        // Handle music code from backend
        async function handleMusicCode(data) {
            const { code, stats, bpm } = data;
            currentMusicCode = code;
            
            const playBtn = document.getElementById('playBtn');
            const statusEl = document.getElementById('music-status');
            const statusText = document.getElementById('music-status-text');
            
            if (!code || stats.totalEntities === 0) {
                statusText.textContent = musicI18n.noData;
                setTimeout(() => statusEl.classList.remove('visible'), 2000);
                return;
            }
            
            try {
                statusText.textContent = musicI18n.opening || 'Opening Strudel...';
                
                // Send message to open Strudel in a new VS Code tab
                vscode.postMessage({ type: 'openStrudelUrl' });
                
                strudelInitialized = true;
                
                // Update status
                statusText.textContent = \`Opened: \${stats.totalEntities} entities, \${stats.totalRelations} relations\`;
                statusEl.classList.add('visible');
                
                // Auto-hide status after 3 seconds
                setTimeout(() => {
                    statusEl.classList.remove('visible');
                }, 3000);
                
            } catch (error) {
                console.error('Strudel error:', error);
                statusText.textContent = 'Error: ' + error.message;
                setTimeout(() => statusEl.classList.remove('visible'), 3000);
            }
        }
        
        // Expose functions to global scope for onclick handlers
        window.toggleMusic = toggleMusic;
        window.fitGraph = fitGraph;
        window.refreshGraph = refreshGraph;
        window.switchMode = switchMode;
    </script>
</body>
</html>`;
    }
}
