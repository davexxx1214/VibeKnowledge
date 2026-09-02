#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, relative, resolve, sep } from 'node:path';
import { validateStructuralGraphDocument } from './structural-graph-schema.mjs';

const inputPath = resolve(
  process.argv[2] ?? '.vscode/.knowledge/structural-graph.json'
);
const workspaceRoot = resolve(process.argv[3] ?? process.cwd());

let graph;
try {
  graph = JSON.parse(readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  console.error(
    `Cannot read valid structural graph JSON from ${inputPath}: ${error instanceof Error ? error.message : String(error)}`
  );
  process.exit(1);
}

const errors = validateStructuralGraphDocument(graph);
const lineCounts = new Map();
if (Array.isArray(graph?.files)) {
  for (const [index, file] of graph.files.entries()) {
    if (!file || typeof file.filePath !== 'string') {
      continue;
    }
    const absolutePath = resolve(workspaceRoot, file.filePath);
    if (!isInside(workspaceRoot, absolutePath)) {
      errors.push(`files[${index}].filePath escapes the workspace`);
      continue;
    }
    try {
      if (!statSync(absolutePath).isFile()) {
        errors.push(`files[${index}].filePath must reference a workspace file`);
        continue;
      }
      const content = readFileSync(absolutePath, 'utf8');
      const hash = createHash('sha256').update(content).digest('hex');
      if (file.contentHash !== hash) {
        errors.push(`files[${index}].contentHash does not match current source`);
      }
      lineCounts.set(
        file.filePath,
        content.length === 0 ? 1 : content.split(/\r\n|\r|\n/).length
      );
    } catch {
      errors.push(`files[${index}].filePath does not exist in the workspace`);
    }
  }
}

if (Array.isArray(graph?.entities)) {
  graph.entities.forEach((entity, index) => {
    if (entity?.kind !== 'external') {
      validateLocation(entity, `entities[${index}]`, lineCounts, errors);
    }
  });
}
if (Array.isArray(graph?.relations)) {
  graph.relations.forEach((relation, index) => {
    validateLocation(
      relation?.location,
      `relations[${index}].location`,
      lineCounts,
      errors
    );
  });
}
if (Array.isArray(graph?.diagnostics)) {
  graph.diagnostics.forEach((diagnostic, index) => {
    if (diagnostic?.filePath && diagnostic?.startLine) {
      validateLocation(diagnostic, `diagnostics[${index}]`, lineCounts, errors);
    }
  });
}

if (errors.length > 0) {
  console.error(
    `Invalid structural graph (${errors.length} error${errors.length === 1 ? '' : 's'}):`
  );
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(
  `Valid structural graph: ${graph.files.length} files, ${graph.entities.length} entities, ${graph.relations.length} relations, ${graph.diagnostics.length} diagnostics`
);

function validateLocation(location, label, counts, errors) {
  if (!location || typeof location.filePath !== 'string') {
    return;
  }
  const lineCount = counts.get(location.filePath);
  if (lineCount === undefined) {
    return;
  }
  const endLine = location.endLine ?? location.startLine;
  if (endLine > lineCount) {
    errors.push(`${label} ends at line ${endLine}, but the file has ${lineCount} lines`);
  }
}

function isInside(parent, target) {
  if (isAbsolute(relative(parent, target))) {
    return false;
  }
  const relativePath = relative(parent, target);
  return (
    relativePath === '' ||
    (relativePath !== '..' && !relativePath.startsWith(`..${sep}`))
  );
}
