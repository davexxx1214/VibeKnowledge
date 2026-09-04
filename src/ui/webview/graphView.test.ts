import vm from 'node:vm';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GraphView } from './graphView';
import * as vscode from 'vscode';

const mock = vi.hoisted(() => ({
    mode: 'low',
    update: vi.fn(),
    onConfiguration: vi.fn(),
    onMessage: vi.fn(),
    postMessage: vi.fn(),
    showErrorMessage: vi.fn(),
}));

/* eslint-disable @typescript-eslint/naming-convention -- Match the VS Code public API. */
vi.mock('vscode', () => ({
    workspace: {
        getConfiguration: () => ({ get: () => mock.mode, update: mock.update }),
        onDidChangeConfiguration: mock.onConfiguration,
    },
    window: { createWebviewPanel: vi.fn(), showErrorMessage: mock.showErrorMessage },
    ConfigurationTarget: { Global: 1 },
    ViewColumn: { One: 1 },
    Uri: { joinPath: (...parts: string[]) => parts.join('/') },
}));
/* eslint-enable @typescript-eslint/naming-convention */
vi.mock('../../i18n/i18nService', async () => {
    const { zh } = await import('../../i18n/zh');
    return { t: () => zh };
});

function panel() {
    return {
        title: '',
        webview: {
            html: '',
            cspSource: 'http://graph.test',
            asWebviewUri: () => 'http://graph.test/d3.min.js',
            onDidReceiveMessage: mock.onMessage,
            postMessage: mock.postMessage,
        },
        onDidDispose: vi.fn(),
        reveal: vi.fn(),
        dispose: vi.fn(),
    };
}

beforeEach(() => {
    vi.clearAllMocks();
    mock.mode = 'low';
    mock.update.mockImplementation(async (_key, value) => { mock.mode = value; });
});
afterEach(() => GraphView.currentPanel?.dispose());

describe('graph display mode integration', () => {
    it('contributes a machine-local low default and renders both UI choices with valid JavaScript', () => {
        const manifest = JSON.parse(readFileSync(resolve('package.json'), 'utf8'));
        expect(manifest.contributes.configuration.properties['knowledgeGraph.visualization.performanceMode'])
            .toMatchObject({ default: 'low', enum: ['low', 'high'], scope: 'machine' });
        const view = panel();
        vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(view as unknown as vscode.WebviewPanel);
        GraphView.createOrShow('extension' as unknown as vscode.Uri);
        expect(view.webview.html).toContain('<body class="low-performance">');
        expect(view.webview.html).toContain('低性能模式');
        expect(view.webview.html).toContain('高性能模式');
        const inline = [...view.webview.html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
            .map(match => match[1]).filter(Boolean);
        expect(inline).toHaveLength(1);
        expect(() => new vm.Script(inline[0])).not.toThrow();
        // Optional artifact for the real-browser smoke test; never used by the extension.
        if (process.env.VIBE_GRAPH_PREVIEW === '1') {
            mkdirSync(resolve('.vscode-test'), { recursive: true });
            writeFileSync(resolve('.vscode-test/graph-preview.html'), view.webview.html);
        }
    });

    it('persists UI selection globally, reuses it when reopened and does not reload an existing document', async () => {
        const view = panel();
        vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(view as unknown as vscode.WebviewPanel);
        GraphView.createOrShow('extension' as unknown as vscode.Uri);
        const receive = mock.onMessage.mock.calls[0][0];
        receive({ type: 'setPerformanceMode', mode: 'high' });
        await vi.waitFor(() => expect(mock.postMessage).toHaveBeenCalledWith({ type: 'performanceMode', mode: 'high' }));
        expect(mock.update).toHaveBeenCalledWith('performanceMode', 'high', vscode.ConfigurationTarget.Global);
        view.webview.html = 'existing document';
        GraphView.createOrShow('extension' as unknown as vscode.Uri);
        expect(view.webview.html).toBe('existing document');
        GraphView.currentPanel?.dispose();
        GraphView.createOrShow('extension' as unknown as vscode.Uri);
        expect(view.webview.html).toContain('let performanceMode = "high";');
        expect(view.webview.html).toContain('<body class="">');
    });

    it('synchronizes Settings UI changes and rolls back failed saves', async () => {
        const view = panel();
        vi.mocked(vscode.window.createWebviewPanel).mockReturnValue(view as unknown as vscode.WebviewPanel);
        GraphView.createOrShow('extension' as unknown as vscode.Uri);
        mock.mode = 'high';
        mock.onConfiguration.mock.calls[0][0]({ affectsConfiguration: () => true });
        expect(mock.postMessage).toHaveBeenLastCalledWith({ type: 'performanceMode', mode: 'high' });
        mock.update.mockRejectedValueOnce(new Error('read only'));
        mock.onMessage.mock.calls[0][0]({ type: 'setPerformanceMode', mode: 'low' });
        await vi.waitFor(() => expect(mock.showErrorMessage).toHaveBeenCalledOnce());
        expect(mock.postMessage).toHaveBeenLastCalledWith({ type: 'performanceMode', mode: 'high' });
        mock.onMessage.mock.calls[0][0]({ type: 'setPerformanceMode', mode: 'unexpected' });
        expect(mock.update).toHaveBeenCalledTimes(1);
    });
});
