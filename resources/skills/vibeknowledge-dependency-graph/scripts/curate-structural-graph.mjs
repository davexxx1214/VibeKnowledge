#!/usr/bin/env node

import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  convergeStructuralGraph,
  mergeCuratedGroup,
  serializeCuratedGraph
} from './structural-condenser.mjs';

let temporaryPath;
try {
  const args = parseArguments(process.argv.slice(2));
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const workspaceRoot = resolve(args.workspace ?? process.cwd());
  const structuralPath = resolveWorkspacePath(
    workspaceRoot,
    args.structural ?? '.vscode/.knowledge/structural-graph.json',
    'structural graph'
  );
  const outputPath = resolveWorkspacePath(
    workspaceRoot,
    args.output ?? '.vscode/.knowledge/agent-graph.json',
    'agent graph output'
  );
  if (!existsSync(structuralPath)) {
    throw new Error(`Structural graph does not exist: ${structuralPath}`);
  }

  const structuralGraph = readJson(structuralPath, 'structural graph');
  const existingDocument = existsSync(outputPath)
    ? readJson(outputPath, 'existing agent graph')
    : undefined;
  const result = convergeStructuralGraph(structuralGraph, {
    kind: args.kind ?? 'framework',
    scope: args.scope,
    key: args.key,
    name: args.name
  });
  const document = mergeCuratedGroup(existingDocument, result.group);

  mkdirSync(dirname(outputPath), { recursive: true });
  temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`;
  writeFileSync(temporaryPath, serializeCuratedGraph(document), 'utf8');
  validateCandidate(temporaryPath, workspaceRoot, structuralPath);
  renameSync(temporaryPath, outputPath);
  temporaryPath = undefined;

  const statistics = result.statistics;
  console.log(
    `Curated ${result.group.kind} group '${result.group.key}': ${statistics.curatedEntities} entities, ${statistics.curatedRelations} relations, ${statistics.collapsedRelations} collapsed relations -> ${outputPath}`
  );
  for (const warning of result.warnings) {
    console.warn(`Warning: ${warning}`);
  }
} catch (error) {
  if (temporaryPath && existsSync(temporaryPath)) {
    try {
      unlinkSync(temporaryPath);
    } catch {
      // Keep the original failure as the actionable error.
    }
  }
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Structural curation failed: ${message}`);
  process.exit(1);
}

function validateCandidate(candidatePath, workspaceRoot, structuralPath) {
  const validatorPath = resolve(
    dirname(fileURLToPath(import.meta.url)),
    'validate-graph.mjs'
  );
  const validation = spawnSync(
    process.execPath,
    [validatorPath, candidatePath, workspaceRoot, structuralPath],
    { encoding: 'utf8' }
  );
  if (validation.status !== 0) {
    const details = [validation.stdout, validation.stderr]
      .filter(Boolean)
      .join('\n')
      .trim();
    throw new Error(`candidate validation failed${details ? `:\n${details}` : ''}`);
  }
}

function readJson(path, label) {
  try {
    return JSON.parse(readFileSync(path, 'utf8').replace(/^\uFEFF/, ''));
  } catch (error) {
    throw new Error(
      `Cannot read valid JSON from ${label} ${path}: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

function resolveWorkspacePath(workspaceRoot, value, label) {
  const absolutePath = resolve(workspaceRoot, value);
  const relativePath = relative(workspaceRoot, absolutePath);
  if (
    relativePath === '..' ||
    relativePath.startsWith(`..\\`) ||
    relativePath.startsWith('../') ||
    /^[A-Za-z]:/.test(relativePath)
  ) {
    throw new Error(`${label} must stay inside the workspace`);
  }
  return absolutePath;
}

function parseArguments(values) {
  const result = {};
  for (let index = 0; index < values.length; index += 1) {
    const value = values[index];
    if (value === '--help' || value === '-h') {
      result.help = true;
      continue;
    }
    const key = value.startsWith('--') ? value.slice(2) : '';
    if (!['workspace', 'structural', 'output', 'kind', 'scope', 'key', 'name'].includes(key)) {
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
  console.log(`Usage: node curate-structural-graph.mjs [options]

Options:
  --workspace <path>   Workspace root (default: current directory)
  --structural <path>  Structural graph input (default: .vscode/.knowledge/structural-graph.json)
  --output <path>      Curated agent graph (default: .vscode/.knowledge/agent-graph.json)
  --kind <kind>        framework, module, or feature (default: framework)
  --scope <path>       Workspace-relative scope; required for module and feature
  --key <key>          Stable group key (recommended for module and feature)
  --name <name>        Human-readable group name
  --help               Show this help`);
}
