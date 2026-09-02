import { isAbsolute } from 'node:path';
import { canonicalizeEntityKey } from './canonicalize-entity-key.mjs';

export const STRUCTURAL_GRAPH_VERSION = 1;
export const STRUCTURAL_ENTITY_KINDS = Object.freeze([
  'file',
  'class',
  'interface',
  'function',
  'method',
  'variable',
  'external'
]);
export const STRUCTURAL_RELATION_VERBS = Object.freeze([
  'imports',
  'exports',
  'contains',
  'extends',
  'implements',
  'calls',
  'references'
]);
export const STRUCTURAL_RELATION_ORIGINS = Object.freeze(['ast', 'resolver']);
export const STRUCTURAL_RELATION_CONFIDENCES = Object.freeze([
  'extracted',
  'inferred',
  'review_required'
]);

const ENTITY_KINDS = new Set(STRUCTURAL_ENTITY_KINDS);
const RELATION_VERBS = new Set(STRUCTURAL_RELATION_VERBS);
const RELATION_ORIGINS = new Set(STRUCTURAL_RELATION_ORIGINS);
const RELATION_CONFIDENCES = new Set(STRUCTURAL_RELATION_CONFIDENCES);
const DIAGNOSTIC_CATEGORIES = new Set(['warning', 'error']);
const LANGUAGES = new Set(['typescript', 'typescriptreact', 'javascript', 'javascriptreact']);

/**
 * Validate an in-memory structural graph without touching the filesystem.
 * Returns every discovered error so callers can reject the whole output.
 *
 * @param {unknown} value
 * @returns {string[]}
 */
export function validateStructuralGraphDocument(value) {
  const errors = [];
  if (!isRecord(value)) {
    return ['root must be an object'];
  }

  if (value.version !== STRUCTURAL_GRAPH_VERSION) {
    errors.push(`version must be ${STRUCTURAL_GRAPH_VERSION}`);
  }
  if (!isIsoTimestamp(value.generatedAt)) {
    errors.push('generatedAt must be a valid ISO-8601 timestamp');
  }
  validateScope(value.scope, 'scope', errors);
  validateExtractor(value.extractor, errors);

  const files = Array.isArray(value.files) ? value.files : [];
  if (!Array.isArray(value.files)) {
    errors.push('files must be an array');
  }
  const filePaths = new Set();
  files.forEach((file, index) => {
    const label = `files[${index}]`;
    if (!isRecord(file)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (validatePath(file.filePath, `${label}.filePath`, errors)) {
      if (filePaths.has(file.filePath)) {
        errors.push(`${label}.filePath duplicates '${file.filePath}'`);
      }
      filePaths.add(file.filePath);
    }
    if (!LANGUAGES.has(file.language)) {
      errors.push(`${label}.language is not supported`);
    }
    if (typeof file.contentHash !== 'string' || !/^[a-f0-9]{64}$/.test(file.contentHash)) {
      errors.push(`${label}.contentHash must be a lowercase SHA-256 digest`);
    }
  });

  const entities = Array.isArray(value.entities) ? value.entities : [];
  if (!Array.isArray(value.entities)) {
    errors.push('entities must be an array');
  }
  const entityKeys = new Set();
  const entityKeysByCanonicalAlias = new Map();
  entities.forEach((entity, index) => {
    const label = `entities[${index}]`;
    if (!isRecord(entity)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!nonEmptyString(entity.key)) {
      errors.push(`${label}.key must be a non-empty string`);
    } else {
      if (entityKeys.has(entity.key)) {
        errors.push(`${label}.key duplicates '${entity.key}'`);
      }
      const canonicalAlias = canonicalizeEntityKey(entity.key);
      const collidingKey = entityKeysByCanonicalAlias.get(canonicalAlias);
      if (!canonicalAlias) {
        errors.push(`${label}.key must contain a canonical identity`);
      } else if (collidingKey !== undefined) {
        errors.push(`${label}.key collides with '${collidingKey}' after canonicalization`);
      } else {
        entityKeysByCanonicalAlias.set(canonicalAlias, entity.key);
      }
      entityKeys.add(entity.key);
    }
    if (!nonEmptyString(entity.name)) {
      errors.push(`${label}.name must be a non-empty string`);
    }
    if (!ENTITY_KINDS.has(entity.kind)) {
      errors.push(`${label}.kind is not supported`);
    }
    const validEntityPath = validatePath(entity.filePath, `${label}.filePath`, errors);
    if (
      validEntityPath &&
      entity.kind !== 'external' &&
      !filePaths.has(entity.filePath)
    ) {
      errors.push(`${label}.filePath must reference a declared source file`);
    }
    validateLineRange(entity, label, errors);
    if (entity.exported !== undefined && typeof entity.exported !== 'boolean') {
      errors.push(`${label}.exported must be boolean when provided`);
    }
    if (entity.containerKey !== undefined && !nonEmptyString(entity.containerKey)) {
      errors.push(`${label}.containerKey must be a non-empty string when provided`);
    }
    if (entity.metadata !== undefined && !isRecord(entity.metadata)) {
      errors.push(`${label}.metadata must be an object when provided`);
    }
  });

  entities.forEach((entity, index) => {
    if (
      isRecord(entity) &&
      entity.containerKey !== undefined &&
      !entityKeys.has(entity.containerKey)
    ) {
      errors.push(`entities[${index}].containerKey does not reference an entity`);
    }
  });

  const relations = Array.isArray(value.relations) ? value.relations : [];
  if (!Array.isArray(value.relations)) {
    errors.push('relations must be an array');
  }
  const relationKeys = new Set();
  relations.forEach((relation, index) => {
    const label = `relations[${index}]`;
    if (!isRecord(relation)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!entityKeys.has(relation.source)) {
      errors.push(`${label}.source does not reference an entity`);
    }
    if (!entityKeys.has(relation.target)) {
      errors.push(`${label}.target does not reference an entity`);
    }
    if (relation.source === relation.target) {
      errors.push(`${label} must not be a self relation`);
    }
    if (!RELATION_VERBS.has(relation.verb)) {
      errors.push(`${label}.verb is not supported`);
    }
    if (!RELATION_ORIGINS.has(relation.origin)) {
      errors.push(`${label}.origin must be ast or resolver`);
    }
    if (!RELATION_CONFIDENCES.has(relation.confidence)) {
      errors.push(`${label}.confidence is not supported`);
    }
    if (!isRecord(relation.location)) {
      errors.push(`${label}.location must be an object`);
    } else {
      const validLocationPath = validatePath(
        relation.location.filePath,
        `${label}.location.filePath`,
        errors
      );
      if (validLocationPath && !filePaths.has(relation.location.filePath)) {
        errors.push(`${label}.location.filePath must reference a declared source file`);
      }
      validateLineRange(relation.location, `${label}.location`, errors);
    }
    if (relation.detail !== undefined && !nonEmptyString(relation.detail)) {
      errors.push(`${label}.detail must be a non-empty string when provided`);
    }
    if (relation.metadata !== undefined && !isRecord(relation.metadata)) {
      errors.push(`${label}.metadata must be an object when provided`);
    }
    const location = isRecord(relation.location)
      ? `${relation.location.filePath}:${relation.location.startLine}:${relation.location.endLine ?? relation.location.startLine}`
      : 'invalid';
    const relationKey = `${relation.source}\u0000${relation.target}\u0000${relation.verb}\u0000${location}`;
    if (relationKeys.has(relationKey)) {
      errors.push(`${label} duplicates an earlier relation occurrence`);
    }
    relationKeys.add(relationKey);
  });

  const diagnostics = Array.isArray(value.diagnostics) ? value.diagnostics : [];
  if (!Array.isArray(value.diagnostics)) {
    errors.push('diagnostics must be an array');
  }
  diagnostics.forEach((diagnostic, index) => {
    const label = `diagnostics[${index}]`;
    if (!isRecord(diagnostic)) {
      errors.push(`${label} must be an object`);
      return;
    }
    if (!nonEmptyString(diagnostic.code)) {
      errors.push(`${label}.code must be a non-empty string`);
    }
    if (!DIAGNOSTIC_CATEGORIES.has(diagnostic.category)) {
      errors.push(`${label}.category must be warning or error`);
    }
    if (!nonEmptyString(diagnostic.message)) {
      errors.push(`${label}.message must be a non-empty string`);
    }
    if (diagnostic.filePath !== undefined) {
      const validDiagnosticPath = validatePath(
        diagnostic.filePath,
        `${label}.filePath`,
        errors
      );
      if (validDiagnosticPath && !filePaths.has(diagnostic.filePath)) {
        errors.push(`${label}.filePath must reference a declared source file`);
      }
    }
    if (diagnostic.startLine !== undefined) {
      validateLineRange(diagnostic, label, errors);
    } else if (diagnostic.endLine !== undefined) {
      errors.push(`${label}.endLine requires startLine`);
    }
  });

  return errors;
}

/** @param {unknown} value */
export function assertStructuralGraphDocument(value) {
  const errors = validateStructuralGraphDocument(value);
  if (errors.length > 0) {
    throw new Error(
      `Invalid structural graph (${errors.length} error${errors.length === 1 ? '' : 's'}):\n${errors.map((error) => `- ${error}`).join('\n')}`
    );
  }
  return value;
}

function validateExtractor(value, errors) {
  if (!isRecord(value)) {
    errors.push('extractor must be an object');
    return;
  }
  if (!nonEmptyString(value.name)) {
    errors.push('extractor.name must be a non-empty string');
  }
  if (!Number.isInteger(value.version) || value.version < 1) {
    errors.push('extractor.version must be a positive integer');
  }
  if (!nonEmptyString(value.typescriptVersion)) {
    errors.push('extractor.typescriptVersion must be a non-empty string');
  }
}

function validateScope(value, label, errors) {
  if (value === undefined || value === '.') {
    return;
  }
  validatePath(value, label, errors);
}

function validatePath(value, label, errors) {
  if (!nonEmptyString(value)) {
    errors.push(`${label} must be a non-empty string`);
    return false;
  }
  let valid = true;
  if (isAbsolute(value) || value.includes('\\')) {
    errors.push(`${label} must be workspace-relative and use '/'`);
    valid = false;
  }
  const segments = value.split('/');
  if (segments.some((segment) => segment === '' || segment === '.' || segment === '..')) {
    errors.push(`${label} contains an invalid path segment`);
    valid = false;
  }
  return valid;
}

function validateLineRange(value, label, errors) {
  if (!positiveLine(value.startLine)) {
    errors.push(`${label}.startLine must be a positive integer`);
  }
  if (!positiveLine(value.endLine)) {
    errors.push(`${label}.endLine must be a positive integer`);
  }
  if (
    positiveLine(value.startLine) &&
    positiveLine(value.endLine) &&
    value.endLine < value.startLine
  ) {
    errors.push(`${label}.endLine must be greater than or equal to startLine`);
  }
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function positiveLine(value) {
  return Number.isInteger(value) && value >= 1;
}

function isIsoTimestamp(value) {
  return (
    nonEmptyString(value) &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}
