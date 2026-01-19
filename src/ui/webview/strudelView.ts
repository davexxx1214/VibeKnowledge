import * as vscode from 'vscode';

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
        this._panel.webview.html = this._getHtmlForWebview(code);

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
        this._panel.webview.html = this._getHtmlForWebview(code);
    }

    /**
     * 生成 Webview HTML
     */
    private _getHtmlForWebview(code: string): string {
        // Base64 编码代码用于 URL
        const encodedCode = Buffer.from(code).toString('base64');
        const strudelUrl = `https://strudel.cc/#${encodedCode}`;

        return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Strudel Player</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        html, body {
            width: 100%;
            height: 100%;
            overflow: hidden;
            background: #1a1a2e;
        }
        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
        .loading {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: #888;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            font-size: 16px;
        }
    </style>
</head>
<body>
    <div class="loading" id="loading">Loading Strudel...</div>
    <iframe 
        id="strudel-frame"
        src="${strudelUrl}"
        allow="autoplay; microphone"
        onload="document.getElementById('loading').style.display='none';"
    ></iframe>
</body>
</html>`;
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
