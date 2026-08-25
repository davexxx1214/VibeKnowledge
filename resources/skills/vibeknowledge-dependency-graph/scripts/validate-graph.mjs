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
const GROUP_KINDS = new Set(['framework', 'module', 'feature']);

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

function validateScope(value, label) {
  if (value !== undefined && value !== '.') {
    validatePath(value, label);
  }
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
  if (lineCount === null) return;

  const lastLine = evidence.endLine ?? evidence.startLine;
  if (lastLine > lineCount) {
    errors.push(`${label} ends at line ${lastLine}, but the file has ${lineCount} lines`);
  }
}

function validateGroup(group, groupIndex) {
  const label = `groups[${groupIndex}]`;
  if (!isRecord(group)) {
    errors.push(`${label} must be an object`);
    return;
  }
  if (!nonEmptyString(group.key)) {
    errors.push(`${label}.key must be a non-empty string`);
  } else if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(group.key)) {
    errors.push(`${label}.key must use lowercase kebab-case`);
  }
  if (!nonEmptyString(group.name)) errors.push(`${label}.name must be a non-empty string`);
  if (!GROUP_KINDS.has(group.kind)) errors.push(`${label}.kind must be framework, module, or feature`);
  if (!Number.isInteger(group.order) || group.order < 0) {
    errors.push(`${label}.order must be a non-negative integer`);
  }
  if (group.description !== undefined && !nonEmptyString(group.description)) {
    errors.push(`${label}.description must be a non-empty string when provided`);
  }
  validateScope(group.scope, `${label}.scope`);
  if (!Array.isArray(group.entities)) errors.push(`${label}.entities must be an array`);
  if (!Array.isArray(group.relations)) errors.push(`${label}.relations must be an array`);

  const keys = new Set();
  if (Array.isArray(group.entities)) {
    group.entities.forEach((entity, entityIndex) => {
      const entityLabel = `${label}.entities[${entityIndex}]`;
      if (!isRecord(entity)) {
        errors.push(`${entityLabel} must be an object`);
        return;
      }
      if (!nonEmptyString(entity.key)) {
        errors.push(`${entityLabel}.key must be a non-empty string`);
      } else if (keys.has(entity.key)) {
        errors.push(`${entityLabel}.key duplicates '${entity.key}' inside this group`);
      } else {
        keys.add(entity.key);
      }
      if (!nonEmptyString(entity.name)) errors.push(`${entityLabel}.name must be a non-empty string`);
      if (!ENTITY_TYPES.has(entity.type)) errors.push(`${entityLabel}.type is not supported`);
      validatePath(entity.filePath, `${entityLabel}.filePath`);
      if (!positiveLine(entity.startLine)) errors.push(`${entityLabel}.startLine must be a positive integer`);
      if (!positiveLine(entity.endLine)) errors.push(`${entityLabel}.endLine must be a positive integer`);
      if (positiveLine(entity.startLine) && positiveLine(entity.endLine) && entity.endLine < entity.startLine) {
        errors.push(`${entityLabel}.endLine must be greater than or equal to startLine`);
      }
      if (entity.description !== undefined && !nonEmptyString(entity.description)) {
        errors.push(`${entityLabel}.description must be a non-empty string when provided`);
      }
    });
  }

  const relationKeys = new Set();
  if (Array.isArray(group.relations)) {
    group.relations.forEach((relation, relationIndex) => {
      const relationLabel = `${label}.relations[${relationIndex}]`;
      if (!isRecord(relation)) {
        errors.push(`${relationLabel} must be an object`);
        return;
      }
      if (!keys.has(relation.source)) errors.push(`${relationLabel}.source does not reference an entity key in this group`);
      if (!keys.has(relation.target)) errors.push(`${relationLabel}.target does not reference an entity key in this group`);
      if (relation.source === relation.target) errors.push(`${relationLabel} must not be a self relation`);
      if (!RELATION_VERBS.has(relation.verb)) errors.push(`${relationLabel}.verb is not supported`);
      const relationKey = `${relation.source}\u0000${relation.target}\u0000${relation.verb}`;
      if (relationKeys.has(relationKey)) errors.push(`${relationLabel} duplicates an earlier relation in this group`);
      relationKeys.add(relationKey);
      if (relation.description !== undefined && !nonEmptyString(relation.description)) {
        errors.push(`${relationLabel}.description must be a non-empty string when provided`);
      }
      if (!Array.isArray(relation.evidence) || relation.evidence.length === 0) {
        errors.push(`${relationLabel}.evidence must contain at least one item`);
        return;
      }
      relation.evidence.forEach((evidence, evidenceIndex) => {
        const evidenceLabel = `${relationLabel}.evidence[${evidenceIndex}]`;
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
}

if (!isRecord(graph)) {
  errors.push('root must be an object');
} else {
  if (graph.version !== 2) errors.push('version must be 2');
  if (!isoTimestamp(graph.generatedAt)) {
    errors.push('generatedAt must be a valid ISO-8601 timestamp');
  }
  validateScope(graph.scope, 'scope');
  if (!Array.isArray(graph.groups) || graph.groups.length === 0) {
    errors.push('groups must be a non-empty array');
  }
}

if (Array.isArray(graph?.groups)) {
  const groupKeys = new Set();
  const groupOrders = new Set();
  graph.groups.forEach((group, index) => {
    validateGroup(group, index);
    if (!isRecord(group)) return;
    if (nonEmptyString(group.key)) {
      if (groupKeys.has(group.key)) errors.push(`groups[${index}].key duplicates '${group.key}'`);
      groupKeys.add(group.key);
    }
    if (Number.isInteger(group.order)) {
      if (groupOrders.has(group.order)) errors.push(`groups[${index}].order duplicates ${group.order}`);
      groupOrders.add(group.order);
    }
  });

  const sortedGroups = graph.groups
    .filter(isRecord)
    .sort((left, right) => left.order - right.order);
  const frameworks = sortedGroups.filter((group) => group.kind === 'framework');
  const first = sortedGroups[0];
  if (
    frameworks.length !== 1 ||
    !first ||
    first.key !== 'framework' ||
    first.kind !== 'framework' ||
    first.order !== 0
  ) {
    errors.push('groups must start with exactly one framework group using key framework and order 0');
  }
}

if (errors.length > 0) {
  console.error(`Invalid generated Knowledge Graph (${errors.length} error${errors.length === 1 ? '' : 's'}):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exit(1);
}

const entityCount = graph.groups.reduce((sum, group) => sum + group.entities.length, 0);
const relationCount = graph.groups.reduce((sum, group) => sum + group.relations.length, 0);
console.log(
  `Valid grouped Knowledge Graph: ${graph.groups.length} groups, ${entityCount} entity occurrences, ${relationCount} relations`
);
