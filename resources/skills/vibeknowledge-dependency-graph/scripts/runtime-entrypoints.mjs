import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';

/** Vite-style HTML entries, including multiple HTML/package roots. No app-name heuristics. */
export function discoverHtmlEntries(workspaceRoot, sourceFiles) {
  const sources = new Map(sourceFiles.filter((file) => inside(workspaceRoot, resolve(file)))
    .map((file) => [pathIdentity(file), resolve(file)]));
  const directories = new Set();
  for (const source of sources.values()) {
    let directory = dirname(source);
    while (inside(workspaceRoot, directory)) {
      directories.add(directory);
      if (directory === workspaceRoot) break;
      directory = dirname(directory);
    }
  }
  const entries = new Map();
  const fingerprints = [];
  for (const directory of [...directories].sort()) {
    for (const file of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      if (!file.isFile() || !/\.html?$/i.test(file.name)) continue;
      const absolutePath = resolve(directory, file.name);
      const text = readFileSync(absolutePath, 'utf8');
      const filePath = relative(workspaceRoot, absolutePath).replace(/\\/g, '/');
      fingerprints.push([filePath, createHash('sha256').update(text).digest('hex')]);
      // Keep offsets intact when ignoring commented-out script tags.
      const html = text.replace(/<!--[\s\S]*?-->/g, (comment) => comment.replace(/[^\n]/g, ' '));
      for (const match of html.matchAll(/<script\b[^>]*>/gi)) {
        const attributes = new Map([...match[0].matchAll(/([\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)]
          .map((attr) => [attr[1].toLowerCase(), attr[2] ?? attr[3] ?? attr[4]]));
        const src = attributes.get('src')?.split(/[?#]/)[0];
        if (attributes.get('type') !== 'module' || !src || /^(?:[a-z]+:|\/\/)/i.test(src)) continue;
        // Absolute web paths resolve against this HTML root, not the OS drive.
        const target = sources.get(pathIdentity(resolve(directory, src.replace(/^\//, ''))));
        if (!target) continue;
        const startLine = text.slice(0, match.index).split('\n').length;
        const evidence = { filePath, startLine, endLine: startLine, kind: 'html-module-script' };
        entries.set(target, [...(entries.get(target) ?? []), evidence]);
      }
    }
  }
  return { entries, fingerprints };
}

function pathIdentity(file) {
  const absolute = resolve(file);
  return process.platform === 'win32' ? absolute.toLowerCase() : absolute;
}

function inside(root, directory) {
  const path = relative(root, directory);
  return path === '' || (!path.startsWith('..') && !/^[A-Za-z]:/.test(path));
}
