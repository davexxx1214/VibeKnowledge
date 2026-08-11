import { describe, expect, it } from 'vitest';
import { buildStrudelWebviewHtml } from './strudelWebviewHtml';

describe('buildStrudelWebviewHtml', () => {
  it('restricts host content and grants only autoplay to Strudel', () => {
    const html = buildStrudelWebviewHtml('note("c4")', 'vscode-webview://test');

    expect(html).toContain(
      "default-src 'none'; style-src vscode-webview://test 'unsafe-inline'; frame-src https://strudel.cc;"
    );
    expect(html).toContain('allow="autoplay"');
    expect(html).not.toContain('microphone');
    expect(html).not.toContain('onload=');
  });

  it('places encoded code in the Strudel URL instead of raw HTML', () => {
    const code = 'note("<c4>")';
    const encodedCode = Buffer.from(code, 'utf8').toString('base64');
    const html = buildStrudelWebviewHtml(code, 'vscode-webview://test');

    expect(html).toContain(`https://strudel.cc/#${encodedCode}`);
    expect(html).not.toContain(code);
  });
});
