import * as vscode from 'vscode';
import { buildStrudelWebviewHtml } from './strudelWebviewHtml';

/**
 * Strudel 音乐播放器 Webview
 * 在独立的 tab 中显示 Strudel REPL
 */
export class StrudelView {
    public static currentPanel: StrudelView | undefined;
    private readonly _panel: vscode.WebviewPanel;
    private _disposables: vscode.Disposable[] = [];

    private constructor(panel: vscode.WebviewPanel, code: string) {
        this._panel = panel;

        // 设置 HTML 内容
        this._panel.webview.html = buildStrudelWebviewHtml(
            code,
            this._panel.webview.cspSource
        );

        // 监听面板关闭
        this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
    }

    /**
     * 创建或显示 Strudel 播放器
     */
    public static createOrShow(extensionUri: vscode.Uri, code: string) {
        const column = vscode.ViewColumn.Beside;

        // 如果已有面板，更新代码
        if (StrudelView.currentPanel) {
            StrudelView.currentPanel._panel.reveal(column);
            StrudelView.currentPanel._updateCode(code);
            return;
        }

        // 创建新面板
        const panel = vscode.window.createWebviewPanel(
            'strudelPlayer',
            '🎵 Strudel Player',
            column,
            {
                enableScripts: true,
                retainContextWhenHidden: true,
            }
        );

        StrudelView.currentPanel = new StrudelView(panel, code);
    }

    /**
     * 更新代码
     */
    private _updateCode(code: string) {
        this._panel.webview.html = buildStrudelWebviewHtml(
            code,
            this._panel.webview.cspSource
        );
    }

    /**
     * 释放资源
     */
    public dispose() {
        StrudelView.currentPanel = undefined;

        this._panel.dispose();

        while (this._disposables.length) {
            const disposable = this._disposables.pop();
            if (disposable) {
                disposable.dispose();
            }
        }
    }
}
