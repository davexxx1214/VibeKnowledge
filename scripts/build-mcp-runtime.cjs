const esbuild = require('esbuild');
const fs = require('node:fs/promises');
const path = require('node:path');

// Ship portable JavaScript, never another machine's node_modules/native binaries.
async function buildMcpRuntime(root, output) {
  const packageRoot = path.join(root, 'packages', 'mcp-server');
  const source = path.join(packageRoot, 'src');
  const files = [];
  async function collect(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await collect(file);
      else if (entry.name.endsWith('.ts') && !entry.name.endsWith('.d.ts')) files.push(file);
    }
  }
  await collect(source);
  await esbuild.build({
    entryPoints: files, outbase: source, outdir: path.join(output, 'dist'),
    bundle: false, platform: 'node', format: 'esm', target: 'node26',
  });
  for (const name of ['package.json', 'package-lock.json', '.npmrc']) {
    await fs.copyFile(path.join(packageRoot, name), path.join(output, name));
  }
  const manifest = JSON.parse(await fs.readFile(path.join(output, 'package.json'), 'utf8'));
  manifest.scripts = { start: 'node dist/index.js', 'audit:dependencies': 'node audit-dependencies.cjs' };
  delete manifest.types;
  await fs.writeFile(path.join(output, 'package.json'), JSON.stringify(manifest, null, 2) + '\n');
  for (const name of ['canonicalize-entity-key.mjs', 'structural-analysis.mjs', 'feature-brief.mjs']) {
    await fs.copyFile(
      path.join(root, 'resources', 'skills', 'vibeknowledge-dependency-graph', 'scripts', name),
      path.join(output, 'dist', name)
    );
  }
  await fs.copyFile(path.join(packageRoot, 'scripts', 'health-check.mjs'), path.join(output, 'health-check.mjs'));
  await fs.copyFile(path.join(root, 'scripts', 'audit-dependencies.cjs'), path.join(output, 'audit-dependencies.cjs'));
}

module.exports = { buildMcpRuntime };
