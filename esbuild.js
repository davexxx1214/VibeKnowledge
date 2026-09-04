const esbuild = require('esbuild');
const fs = require('fs/promises');
const path = require('path');
const { buildMcpRuntime } = require('./scripts/build-mcp-runtime.cjs');

const production = process.argv.includes('--production');
const watch = process.argv.includes('--watch');
const distDir = path.resolve(__dirname, 'dist');

async function copyRuntimeAssets() {
  const d3Entry = require.resolve('d3');
  await fs.mkdir(distDir, { recursive: true });
  await Promise.all([
    buildMcpRuntime(__dirname, path.join(distDir, 'mcp-server')),
    fs.copyFile(
      require.resolve('sql.js/dist/sql-wasm.wasm'),
      path.join(distDir, 'sql-wasm.wasm')
    ),
    fs.copyFile(
      path.resolve(path.dirname(d3Entry), '..', 'dist', 'd3.min.js'),
      path.join(distDir, 'd3.min.js')
    )
  ]);
}

async function main() {
  await fs.rm(distDir, { recursive: true, force: true });

  const ctx = await esbuild.context({
    entryPoints: ['src/extension.ts'],
    bundle: true,
    format: 'cjs',
    minify: production,
    sourcemap: !production,
    sourcesContent: false,
    platform: 'node',
    outfile: path.join(distDir, 'extension.js'),
    external: ['vscode', 'better-sqlite3'],
    // The UMD entry contains runtime-relative require() calls; bundle its ESM entry.
    alias: { 'jsonc-parser': require.resolve('jsonc-parser/lib/esm/main.js') },
    logLevel: 'info',
    plugins: [],
  });

  if (watch) {
    await copyRuntimeAssets();
    await ctx.watch();
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
    await copyRuntimeAssets();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

