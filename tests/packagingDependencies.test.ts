import { createRequire } from 'node:module';
import { mkdtemp, readFile, rm, utimes, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileFromSync } from 'node-fetch';
import { describe, expect, it } from 'vitest';

const require = createRequire(import.meta.url);
// Exercise Cheerio exactly as the CommonJS vsce packager loads it on Node 26.
const vsceRequire = createRequire(require.resolve('@vscode/vsce/package.json'));
const cheerio = vsceRequire('cheerio') as typeof import('cheerio');

const vectors = [
  ['UTF-8 meta', Buffer.from('<meta charset="utf-8"><h1>帮助 &amp; café 😀</h1>'), '帮助 & café 😀'],
  ['long UTF-8 stream', Buffer.from(`<meta charset="utf-8"><h1>${'帮助😀'.repeat(400)}</h1>`), '帮助😀'.repeat(400)],
  ['UTF-8 BOM', Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from('<h1>帮助</h1>')]), '帮助'],
  ['UTF-16 BOM', Buffer.concat([Buffer.from([0xff, 0xfe]), Buffer.from('<h1>帮助</h1>', 'utf16le')]), '帮助'],
  ['windows-1252 meta', Buffer.concat([Buffer.from('<meta charset="windows-1252"><h1>caf'), Buffer.from([0xe9, 0x20, 0x80]), Buffer.from('</h1>')]), 'café €'],
  ['default HTML encoding', Buffer.concat([Buffer.from('<h1>caf'), Buffer.from([0xe9, 0x20, 0x80]), Buffer.from('</h1>')]), 'café €'],
  ['GBK meta', Buffer.concat([Buffer.from('<meta charset="gbk"><h1>'), Buffer.from([0xd6, 0xd0, 0xce, 0xc4]), Buffer.from('</h1>')]), '中文'],
] as const;

describe('packaging dependency compatibility', () => {
  it('pins only the vsce encoding chain and removes whatwg-encoding from the lockfile', async () => {
    const manifest = JSON.parse(await readFile('package.json', 'utf8'));
    expect(manifest.overrides['@vscode/vsce'].cheerio['encoding-sniffer']).toBe('1.0.2');
    expect(manifest.overrides).not.toHaveProperty('encoding-sniffer');
    const lock = JSON.parse(await readFile('package-lock.json', 'utf8'));
    expect(lock.packages['node_modules/encoding-sniffer'].version).toBe('1.0.2');
    expect(Object.keys(lock.packages).some(key => key.endsWith('/whatwg-encoding'))).toBe(false);
  });

  it('preserves the HTML selectors and attributes used by README packaging', () => {
    const $ = cheerio.load('<h1>帮助 &amp; Test</h1><a href="./README.md">Docs</a><img src="./resources/icon.png">');
    expect($('h1').text()).toBe('帮助 & Test');
    expect($('a').attr('href')).toBe('./README.md');
    expect($('img').attr('src')).toBe('./resources/icon.png');
  });

  it.each(vectors)('decodes %s in both buffers and split streams', async (_name, buffer, expected) => {
    expect(cheerio.loadBuffer(buffer)('h1').text()).toBe(expected);
    const title = await new Promise<string>((resolve, reject) => {
      const stream = cheerio.decodeStream({}, (error, $) => error ? reject(error) : resolve($('h1').text()));
      stream.on('error', reject);
      for (let offset = 0; offset < buffer.length; offset += 3) stream.write(buffer.subarray(offset, offset + 3));
      stream.end();
    });
    expect(title).toBe(expected);
  });

  it('retains the DOMException constructor contract required by fetch-blob', async () => {
    // node-domexception 2.x exports no constructor and breaks this failure path.
    expect(require('node-domexception')).toBe(globalThis.DOMException);
    const directory = await mkdtemp(path.join(tmpdir(), 'vibeknowledge-blob-regression-'));
    try {
      const file = path.join(directory, 'file.txt');
      await writeFile(file, 'content');
      const blob = fileFromSync(file);
      const future = new Date(Date.now() + 5000);
      await utimes(file, future, future);
      await expect(blob.text()).rejects.toMatchObject({ name: 'NotReadableError' });
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
