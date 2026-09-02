#!/usr/bin/env node

import { resolve } from 'node:path';

try {
  const args = parseArguments(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }
  const workspaceRoot = resolve(args.workspace ?? process.cwd());
  const outputPath = resolve(
    workspaceRoot,
    args.output ?? '.vscode/.knowledge/structural-graph.json'
  );
  const { updateStructuralGraph } = await import('./structural-extractor.mjs');
  const result = updateStructuralGraph({
    workspaceRoot,
    scope: args.scope,
    tsconfigPath: args.tsconfig,
    outputPath,
    force: args.force === true
  });
  const graph = result.graph;
  const statistics = result.statistics;
  console.log(
    `Updated structural graph: ${graph.files.length} files, ${graph.entities.length} entities, ${graph.relations.length} relations, ${graph.diagnostics.length} diagnostics; ${statistics.parsedFiles} parsed, ${statistics.reusedFiles} reused, ${statistics.resolvedFiles} resolved, ${statistics.deletedFiles} deleted (${statistics.cacheMode}) -> ${outputPath}`
  );
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (
    message.includes("Cannot find package 'typescript'") ||
    message.includes("Cannot find module 'typescript'")
  ) {
    console.error(
      'The deterministic extractor requires the TypeScript package. Run it from a TypeScript/JavaScript workspace that declares typescript, or use the bundled VibeKnowledge extension command.'
    );
  } else {
    console.error(`Structural extraction failed: ${message}`);
  }
  process.exit(1);
}

function parseArguments(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--help' || value === '-h') {
      result.help = true;
      continue;
    }
    if (value === '--force') {
      result.force = true;
      continue;
    }
    const key = value.startsWith('--') ? value.slice(2) : '';
    if (!['workspace', 'output', 'scope', 'tsconfig'].includes(key)) {
      throw new Error(`Unknown argument: ${value}`);
    }
    const next = values[index + 1];
    if (!next || next.startsWith('--')) {
      throw new Error(`Missing value for --${key}`);
    }
    result[key] = next;
    index += 1;
  }
  return result;
}

function printUsage() {
  console.log(`Usage: node extract-structural-graph.mjs [options]

Options:
  --workspace <path>  Workspace root (default: current directory)
  --scope <path>      Workspace-relative extraction scope (default: .)
  --tsconfig <path>   Workspace-relative tsconfig path
  --output <path>     Workspace-relative output path
  --force             Ignore cache and allow a reviewed recovery rebuild
  --help              Show this help`);
}
