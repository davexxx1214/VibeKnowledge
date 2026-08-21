#!/usr/bin/env node

import { readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';

const ENTITY_TYPES = new Set([
  'function', 'class', 'interface', 'variable', 'file', 'directory',
  'api', 'config', 'database', 'service', 'component', 'external', 'other'
]);
const RELATION_VERBS = new Set([
  'uses', 'calls', 'extends', 'implements', 'depends_on',
  'contains', 'references', 'imports', 'exports'
]);

const inputPath = process.argv[2];
if (!inputPath) {
  console.error('Usage: node validate-graph.mjs <agent-graph.json> [workspace-root]');
  process.exit(2);
}
const workspaceRoot = resolve(process.argv[3] || process.cwd());

let graph;
try {
  graph = JSON.parse(readFileSync(inputPath, 'utf8').replace(/^\uFEFF/, ''));
} catch (error) {
  console.error(`Cannot read valid JSON from ${inputPath}: ${error.message}`);
  process.exit(1);
}

const errors = [];
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const nonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;
const positiveLine = (value) => Number.isInteger(value) && value >= 1;
const isoTimestamp = (value) =>
  nonEmptyString(value) &&
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
  !Number.isNaN(Date.parse(value));
const sourceLineCounts = new Map();

function validatePath(value, label) {
  let valid = true;
  if (!nonEmptyString(value)) {
    errors.push(`${label} must be a non-empty string`);
    return false;
  }
  if (isAbsolute(value) || value.includes('\\')) {
    errors.push(`${label} must be a workspace-relative path using '/'`);
    valid = false;
  }
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    errors.push(`${label} must not contain empty, '.' or '..' path segments`);
    valid = false;
  }
  return valid;
}

function validateEvidenceLocation(evidence, label) {
  const absolutePath = resolve(workspaceRoot, evidence.filePath);
  let lineCount = sourceLineCounts.get(absolutePath);
  if (lineCount === undefined) {
    try {
      if (!statSync(absolutePath).isFile()) {
        errors.push(`${label}.filePath must reference a workspace file`);
        sourceLineCounts.set(absolutePath, null);
        return;
      }
      const content = readFileSync(absolutePath, 'utf8');
      lineCount = content.length === 0 ? 0 : content.split(/\r\n|\r|\n/).length;
      sourceLineCounts.set(absolutePath, lineCount);
    } catch {
      errors.push(`${label}.filePath does not exist in the workspace`);
      sourceLineCounts.set(absolutePath, null);
      return;
    }
  }
  if (lineCount === null) {
    return;
  }

  const lastLine = evidence.endLine ?? evidence.startLine;
  if (lastLine > lineCount) {
    errors.push(`${label} ends at line ${lastLine}, but the file has ${lineCount} lines`);
  }
}

if (!isRecord(graph)) {
  errors.push('root must be an object');
} else {
  if (graph.version !== 1) errors.push('version must be 1');
  if (!isoTimestamp(graph.generatedAt)) {
    errors.push('generatedAt must be a valid ISO-8601 timestamp');
  }
  if (graph.scope !== undefined && graph.scope !== '.') validatePath(graph.scope, 'scope');
  if (!Array.isArray(graph.entities)) errors.push('entities must be an array');
  if (!Array.isArray(graph.relations)) errors.push('relations must be an array');
}

const keys = new Set();
if (Array.isArray(graph?.entities)) {
  graph.entities.forEach((entity, index) => {
    const label = `entities[${index}]`;
    if (!isRecord(entity)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!nonEmptyString(entity.key)) errors.push(`${label}.key must be a non-empty string`);
    else if (keys.has(entity.key)) errors.push(`${label}.key duplicates '${entity.key}'`);
    else keys.add(entity.key);
    if (!nonEmptyString(entity.name)) errors.push(`${label}.name must be a non-empty string`);
    if (!ENTITY_TYPES.has(entity.type)) errors.push(`${label}.type is not supported`);
    validatePath(entity.filePath, `${label}.filePath`);
    if (!positiveLine(entity.startLine)) errors.push(`${label}.startLine must be a positive integer`);
    if (!positiveLine(entity.endLine)) errors.push(`${label}.endLine must be a positive integer`);
    if (positiveLine(entity.startLine) && positiveLine(entity.endLine) && entity.endLine < entity.startLine) {
      errors.push(`${label}.endLine must be greater than or equal to startLine`);
    }
    if (entity.description !== undefined && !nonEmptyString(entity.description)) {
      errors.push(`${label}.description must be a non-empty string when provided`);
    }
  });
}

const relationKeys = new Set();
if (Array.isArray(graph?.relations)) {
  graph.relations.forEach((relation, index) => {
    const label = `relations[${index}]`;
    if (!isRecord(relation)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!keys.has(relation.source)) errors.push(`${label}.source does not reference an entity key`);
    if (!keys.has(relation.target)) errors.push(`${label}.target does not reference an entity key`);
    if (relation.source === relation.target) errors.push(`${label} must not be a self relation`);
    if (!RELATION_VERBS.has(relation.verb)) errors.push(`${label}.verb is not supported`);
    const relationKey = `${relation.source}\u0000${relation.target}\u0000${relation.verb}`;
    if (relationKeys.has(relationKey)) errors.push(`${label} duplicates an earlier relation`);
    relationKeys.add(relationKey);
    if (relation.description !== undefined && !nonEmptyString(relation.description)) {
      errors.push(`${label}.description must be a non-empty string when provided`);
    }
    if (!Array.isArray(relation.evidence) || relation.evidence.length === 0) {
      errors.push(`${label}.evidence must contain at least one item`);
      return;
    }
    relation.evidence.forEach((evidence, evidenceIndex) => {
      const evidenceLabel = `${label}.evidence[${evidenceIndex}]`;
      if (!isRecord(evidence)) {
        errors.push(`${evidenceLabel} must be an object`);
        return;
      }
      const validEvidencePath = validatePath(evidence.filePath, `${evidenceLabel}.filePath`);
      if (!positiveLine(evidence.startLine)) errors.push(`${evidenceLabel}.startLine must be a positive integer`);
      if (evidence.endLine !== undefined && !positiveLine(evidence.endLine)) {
        errors.push(`${evidenceLabel}.endLine must be a positive integer when provided`);
      }
      if (positiveLine(evidence.startLine) && positiveLine(evidence.endLine) && evidence.endLine < evidence.startLine) {
        errors.push(`${evidenceLabel}.endLine must be greater than or equal to startLine`);
      }
      if (evidence.detail !== undefined && !nonEmptyString(evidence.detail)) {
        errors.push(`${evidenceLabel}.detail must be a non-empty string when provided`);
      }
      if (
        validEvidencePath &&
        positiveLine(evidence.startLine) &&
        (evidence.endLine === undefined || positiveLine(evidence.endLine))
      ) {
        validateEvidenceLocation(evidence, evidenceLabel);
      }
    });
  });
}

if (errors.length > 0) {
  console.error(`Invalid Agent Graph (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

console.log(`Valid Agent Graph: ${graph.entities.length} entities, ${graph.relations.length} relations`);
