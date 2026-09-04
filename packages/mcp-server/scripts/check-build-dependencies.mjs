import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function checkBuildDependencies(packageRoot) {
  const require = createRequire(resolve(packageRoot, 'package.json'));
  const compiler = resolve(packageRoot, 'node_modules/typescript/lib/typescript.js');
  if (!existsSync(compiler)) throw new Error('MCP local TypeScript is missing (dev dependencies were not installed).');
  const ts = require(compiler);
  const configuration = ts.parseJsonConfigFileContent(JSON.parse(readFileSync(resolve(packageRoot, 'tsconfig.json'), 'utf8')), ts.sys, packageRoot);
  for (const module of ['@modelcontextprotocol/sdk/server/mcp.js', '@modelcontextprotocol/sdk/server/stdio.js', 'zod']) {
    const result = ts.resolveModuleName(module, resolve(packageRoot, 'src/index.ts'), configuration.options, ts.sys).resolvedModule;
    if (!result || !/\.d\.[cm]?ts$/.test(result.resolvedFileName) || !existsSync(result.resolvedFileName)) {
      throw new Error(`TypeScript cannot resolve declarations for ${module}. The dependency installation is incomplete or inconsistent.`);
    }
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    checkBuildDependencies(resolve(dirname(fileURLToPath(import.meta.url)), '..'));
  } catch (error) {
    console.error(`MCP build preflight failed: ${error.message}\nFor MCP users: use Knowledge: Install / Configure MCP (no source build needed).\nFor source developers: run npm --prefix packages/mcp-server ci --include=dev from the repository root, then build again.\nDo not add an untyped declare module shim or disable strict checking.`);
    process.exitCode = 1;
  }
}
