#!/usr/bin/env node

import { existsSync, readFileSync, statSync } from 'node:fs';
import { isAbsolute, resolve } from 'node:path';
import { normalizeEntityIdentity } from './canonicalize-entity-key.mjs';

const ENTITY_TYPES = new Set([
  'function', 'class', 'interface', 'variable', 'file',
  'api', 'service', 'component', 'external'
]);
const RELATION_VERBS = new Set([
  'calls', 'extends', 'implements', 'depends_on',
  'contains', 'references', 'imports', 'exports'
]);
const GROUP_KINDS = new Set(['framework', 'module', 'feature']);
const RELATION_ORIGINS = new Set(['ast', 'resolver', 'agent']);
const RELATION_CONFIDENCES = new Set([
  'extracted', 'inferred', 'review_required'
]);

const inputPath = process.argv[2];
if (!inputPath) {
  console.error(
    'Usage: node validate-graph.mjs <agent-graph.json> [workspace-root] [structural-graph.json]'
  );
  process.exit(2);
}
const workspaceRoot = resolve(process.argv[3] || process.cwd());
const structuralGraphInputPath = process.argv[4]
  ? resolve(process.argv[4])
  : resolve(workspaceRoot, '.vscode', '.knowledge', 'structural-graph.json');

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
let structuralRelationIdentities;

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

function getStructuralRelationIdentities() {
  if (structuralRelationIdentities !== undefined) {
    return structuralRelationIdentities;
  }
  const structuralPath = structuralGraphInputPath;
  structuralRelationIdentities = new Set();
  if (!existsSync(structuralPath)) {
    errors.push('structural-graph.json is required when structuralPath is present');
    return structuralRelationIdentities;
  }
  try {
    const structuralGraph = JSON.parse(
      readFileSync(structuralPath, 'utf8').replace(/^\uFEFF/, '')
    );
    if (!Array.isArray(structuralGraph.relations)) {
      errors.push('structural-graph.json must contain a relations array');
      return structuralRelationIdentities;
    }
    for (const relation of structuralGraph.relations) {
      if (isRecord(relation) && isRecord(relation.location)) {
        structuralRelationIdentities.add(structuralIdentity({
          source: relation.source,
          target: relation.target,
          verb: relation.verb,
          filePath: relation.location.filePath,
          startLine: relation.location.startLine,
          endLine: relation.location.endLine
        }));
      }
    }
  } catch (error) {
    errors.push(`Cannot read structural-graph.json: ${error.message}`);
  }
  return structuralRelationIdentities;
}

function structuralIdentity(hop) {
  return [
    hop.source,
    hop.target,
    hop.verb,
    hop.filePath,
    hop.startLine,
    hop.endLine
  ].join('\u0000');
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
  const keysByIdentity = new Map();
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
        const identity = normalizeEntityIdentity(entity.key);
        const collidingKey = keysByIdentity.get(identity);
        if (identity.length === 0) {
          errors.push(`${entityLabel}.key must contain a path-normalized identity`);
        } else if (collidingKey !== undefined) {
          errors.push(`${entityLabel}.key collides with '${collidingKey}' after path normalization`);
        } else {
          keysByIdentity.set(identity, entity.key);
        }
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
      if (!RELATION_ORIGINS.has(relation.origin)) {
        errors.push(`${relationLabel}.origin must be ast, resolver, or agent`);
      }
      if (!RELATION_CONFIDENCES.has(relation.confidence)) {
        errors.push(`${relationLabel}.confidence must be extracted, inferred, or review_required`);
      }
      if (relation.origin !== 'agent' && relation.structuralPath === undefined) {
        errors.push(`${relationLabel}.structuralPath is required for ${relation.origin || 'non-Agent'} relations`);
      }
      const relationKey = `${relation.source}\u0000${relation.target}\u0000${relation.verb}`;
      if (relationKeys.has(relationKey)) errors.push(`${relationLabel} duplicates an earlier relation in this group`);
      relationKeys.add(relationKey);
      if (relation.description !== undefined && !nonEmptyString(relation.description)) {
        errors.push(`${relationLabel}.description must be a non-empty string when provided`);
      }
      if (relation.structuralPath !== undefined) {
        if (!Array.isArray(relation.structuralPath) || relation.structuralPath.length === 0) {
          errors.push(`${relationLabel}.structuralPath must be a non-empty array when provided`);
        } else {
          const structuralIdentities = getStructuralRelationIdentities();
          const traversedHops = [];
          relation.structuralPath.forEach((hop, hopIndex) => {
            const hopLabel = `${relationLabel}.structuralPath[${hopIndex}]`;
            if (!isRecord(hop)) {
              errors.push(`${hopLabel} must be an object`);
              return;
            }
            if (!nonEmptyString(hop.source)) errors.push(`${hopLabel}.source must be a non-empty string`);
            if (!nonEmptyString(hop.target)) errors.push(`${hopLabel}.target must be a non-empty string`);
            if (!RELATION_VERBS.has(hop.verb)) errors.push(`${hopLabel}.verb is not supported`);
            if (
              hop.traversal !== undefined &&
              !['forward', 'reverse'].includes(hop.traversal)
            ) {
              errors.push(`${hopLabel}.traversal must be forward or reverse when provided`);
            } else if (
              nonEmptyString(hop.source) &&
              nonEmptyString(hop.target) &&
              hop.traversal !== undefined
            ) {
              traversedHops.push({
                from: hop.traversal === 'reverse' ? hop.target : hop.source,
                to: hop.traversal === 'reverse' ? hop.source : hop.target
              });
            }
            const validPath = validatePath(hop.filePath, `${hopLabel}.filePath`);
            if (!positiveLine(hop.startLine)) errors.push(`${hopLabel}.startLine must be a positive integer`);
            if (!positiveLine(hop.endLine)) errors.push(`${hopLabel}.endLine must be a positive integer`);
            if (positiveLine(hop.startLine) && positiveLine(hop.endLine) && hop.endLine < hop.startLine) {
              errors.push(`${hopLabel}.endLine must be greater than or equal to startLine`);
            }
            if (
              validPath &&
              positiveLine(hop.startLine) &&
              positiveLine(hop.endLine)
            ) {
              validateEvidenceLocation(hop, hopLabel);
              if (!structuralIdentities.has(structuralIdentity(hop))) {
                errors.push(`${hopLabel} does not match a relation in structural-graph.json`);
              }
            }
          });
          if (traversedHops.length === relation.structuralPath.length) {
            if (traversedHops[0].from !== relation.source) {
              errors.push(`${relationLabel}.structuralPath must start at relation.source`);
            }
            for (let hopIndex = 1; hopIndex < traversedHops.length; hopIndex += 1) {
              if (traversedHops[hopIndex - 1].to !== traversedHops[hopIndex].from) {
                errors.push(`${relationLabel}.structuralPath is disconnected before hop ${hopIndex}`);
              }
            }
            if (traversedHops[traversedHops.length - 1].to !== relation.target) {
              errors.push(`${relationLabel}.structuralPath must end at relation.target`);
            }
          }
        }
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
  if (graph.version !== 1) errors.push('version must be 1');
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
