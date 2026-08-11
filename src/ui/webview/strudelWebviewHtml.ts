/**
 * Build the host page for the Strudel player.
 *
 * The extension host page contains no executable script. Strudel runs in its
 * own HTTPS iframe, while the CSP prevents any other remote content from being
 * loaded by the VS Code webview.
 */
export function buildStrudelWebviewHtml(code: string, cspSource: string): string {
  const encodedCode = Buffer.from(code, 'utf8').toString('base64');
  const strudelUrl = `https://strudel.cc/#${encodedCode}`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${cspSource} 'unsafe-inline'; frame-src https://strudel.cc;">
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
    </style>
</head>
<body>
    <iframe
        title="Strudel music player"
        src="${strudelUrl}"
        allow="autoplay"
        referrerpolicy="no-referrer"
        sandbox="allow-forms allow-popups allow-same-origin allow-scripts"
    ></iframe>
</body>
</html>`;
}
