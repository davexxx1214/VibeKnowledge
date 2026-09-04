const esbuild = require('esbuild');
const fs = require('node:fs/promises');
const path = require('node:path');

async function buildQuerySkill(root, output) {
  await fs.cp(path.join(root, 'resources/skills/vibeknowledge-query'), output, { recursive: true });
  const result = await esbuild.build({
    entryPoints: [path.join(root, 'packages/mcp-server/src/queryCliEntry.ts')],
    outfile: path.join(output, 'scripts/query.cjs'),
    bundle: true, format: 'cjs', platform: 'node', target: 'node26', minify: true,
    // The extension CI installs only root dependencies, never the MCP package.
    alias: { zod: require.resolve('zod', { paths: [root] }) },
    legalComments: 'eof', metafile: true,
  });
  const forbidden = Object.keys(result.metafile.inputs).filter(file => /node_modules\/(?:better-sqlite3|@modelcontextprotocol|@google)/.test(file.replaceAll('\\', '/')));
  if (forbidden.length) throw new Error(`Query skill unexpectedly bundles server dependencies: ${forbidden.join(', ')}`);
  await fs.copyFile(path.join(root, 'LICENSE'), path.join(output, 'LICENSE'));
  await fs.copyFile(path.join(root, 'node_modules/zod/LICENSE'), path.join(output, 'ZOD-LICENSE'));
  return result.metafile;
}
module.exports = { buildQuerySkill };
if (require.main === module) {
  const root = path.resolve(__dirname, '..');
  buildQuerySkill(root, path.join(root, 'dist/skills/vibeknowledge-query')).catch(error => { console.error(error); process.exitCode = 1; });
}
