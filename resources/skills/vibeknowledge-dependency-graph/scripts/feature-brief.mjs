import { createHash, randomUUID } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, relative, resolve } from 'node:path';

const ROOT = '.vscode/.knowledge/feature-briefs';
const KINDS = new Set(['capability', 'dependency', 'framework', 'test', 'constraint']);
const MAX_SOURCE_BYTES = 2 * 1024 * 1024, MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_ARTIFACT_BYTES = 8 * 1024 * 1024, MAX_FEATURES = 5000;
const hash = text => createHash('sha256').update(text).digest('hex');
const validKey = key => typeof key === 'string' && key !== 'index' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key) && key.length <= 100;
function fail(message) { throw new Error(`Feature brief: ${message}`); }
function string(value, label, maximum = 600) {
  if (typeof value !== 'string' || !value.trim() || value.length > maximum) fail(`${label} must be nonempty text <= ${maximum} characters`);
  return value;
}
function inside(root, candidate) {
  const p = relative(root, candidate);
  return p !== '..' && !p.startsWith('../') && !p.startsWith('..\\') && !isAbsolute(p);
}
function safePath(root, path, mustExist = true) {
  if (typeof path !== 'string' || isAbsolute(path) || /^[a-z]:/i.test(path) || path.includes('\\') || path.split('/').some(p => !p || p === '.' || p === '..')) fail(`unsafe path ${path}`);
  const absolute = resolve(root, path);
  if (!inside(root, absolute)) fail(`path leaves workspace: ${path}`);
  let ancestor = absolute;
  while (!existsSync(ancestor) && ancestor !== root) ancestor = dirname(ancestor);
  if (!inside(root, realpathSync(ancestor))) fail(`symlink leaves workspace: ${path}`);
  if (mustExist && !existsSync(absolute)) fail(`missing file ${path}`);
  return absolute;
}
function readText(path, maximum) {
  const info = statSync(path);
  if (!info.isFile() || info.size > maximum) fail('file is not regular or exceeds read limit');
  // Reject unsupported encodings instead of hashing lossy replacement characters:
  // distinct non-UTF-8 bytes must not silently look like an unchanged source.
  return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(readFileSync(path));
}
function readJson(path) { return JSON.parse(readText(path, MAX_ARTIFACT_BYTES).replace(/^\uFEFF/, '')); }
function evidence(value) {
  if (!value || typeof value !== 'object') fail('evidence must be an object');
  string(value.filePath, 'evidence.filePath', 500);
  if (!Number.isInteger(value.startLine) || value.startLine < 1 || !Number.isInteger(value.endLine) || value.endLine < value.startLine) fail('invalid evidence line range');
  return { filePath: value.filePath, startLine: value.startLine, endLine: value.endLine };
}
function validateDraft(input) {
  if (!input || !validKey(input.key)) fail('key must use lowercase kebab-case');
  string(input.name, 'name', 120); string(input.summary, 'summary', 500);
  if (!Array.isArray(input.keywords) || input.keywords.length > 20) fail('keywords must be an array of up to 20 strings');
  input.keywords.forEach(v => string(v, 'keyword', 80));
  if (!Array.isArray(input.entries) || !input.entries.length || input.entries.length > 12) fail('entries must contain 1..12 source locations');
  if (!Array.isArray(input.facts) || !input.facts.length || input.facts.length > 30) fail('facts must contain 1..30 items');
  if (!Array.isArray(input.limitations) || !input.limitations.length || input.limitations.length > 8) fail('state 1..8 concrete scope limitations');
  input.limitations.forEach(v => string(v, 'limitation', 400));
  return {
    key: input.key, name: input.name, summary: input.summary, keywords: input.keywords,
    entries: input.entries.map(evidence), limitations: input.limitations,
    facts: input.facts.map(f => {
      if (!f || !KINDS.has(f.kind) || !['observed', 'inferred'].includes(f.certainty)) fail('fact needs a supported kind and observed/inferred certainty');
      string(f.text, 'fact.text');
      if (!Array.isArray(f.evidence) || !f.evidence.length || f.evidence.length > 6) fail('each fact needs 1..6 evidence locations');
      return { kind: f.kind, text: f.text, certainty: f.certainty, evidence: f.evidence.map(evidence) };
    }),
  };
}
function readIndex(root) {
  const path = safePath(root, `${ROOT}/index.json`, false);
  if (!existsSync(path)) return { version: 1, features: [] };
  const data = readJson(path);
  if (data?.version !== 1 || !Array.isArray(data.features) || data.features.length > MAX_FEATURES) fail('invalid index');
  const keys = new Set();
  for (const f of data.features) {
    if (!f || !validKey(f.key) || keys.has(f.key) || !/^[a-f0-9]{64}$/.test(f.contentHash)) fail('invalid index entry');
    keys.add(f.key); string(f.name, 'index name', 120); string(f.summary, 'index summary', 500);
    if (!Array.isArray(f.keywords) || f.keywords.length > 20) fail('invalid index keywords');
    f.keywords.forEach(v => string(v, 'index keyword', 80));
  }
  return data;
}
function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temp = `${path}.${randomUUID()}.tmp`;
  try {
    writeFileSync(temp, content, { encoding: 'utf8', flag: 'wx' }); renameSync(temp, path);
  } finally { if (existsSync(temp)) unlinkSync(temp); }
}

/** Publish a reviewed, source-backed semantic projection; never infer prose from filenames. */
export function publishFeatureBrief(workspace, input) {
  const root = realpathSync(workspace), draft = validateDraft(input);
  const sources = new Map(), contents = new Map();
  let bytes = 0;
  for (const e of [...draft.entries, ...draft.facts.flatMap(f => f.evidence)]) {
    const path = safePath(root, e.filePath);
    let text = contents.get(e.filePath);
    if (text === undefined) {
      text = readText(path, MAX_SOURCE_BYTES);
      bytes += Buffer.byteLength(text);
      if (bytes > MAX_TOTAL_BYTES) fail('cited sources exceed total read limit');
      contents.set(e.filePath, text);
    }
    if (e.endLine > text.split(/\r\n|\r|\n/).length) fail(`out-of-range evidence: ${e.filePath}:${e.startLine}-${e.endLine}`);
    sources.set(e.filePath, hash(text));
  }
  const document = { version: 1, generatedAt: new Date().toISOString(), ...draft,
    sources: [...sources].sort(([a], [b]) => a.localeCompare(b)).map(([filePath, contentHash]) => ({ filePath, contentHash })) };
  const text = JSON.stringify(document, null, 2) + '\n';
  const descriptor = { key: draft.key, name: draft.name, summary: draft.summary, keywords: draft.keywords, contentHash: hash(text) };
  const cardPath = safePath(root, `${ROOT}/${draft.key}.json`, false);
  const indexPath = safePath(root, `${ROOT}/index.json`, false);
  const lockPath = safePath(root, `${ROOT}/publish.lock`, false);
  mkdirSync(dirname(lockPath), { recursive: true });
  // Never remove another publisher's lock. A crashed publisher needs explicit recovery.
  try { writeFileSync(lockPath, '', { flag: 'wx' }); }
  catch { fail('publication locked; wait for the publisher or inspect a stale publish.lock'); }
  try {
    const index = readIndex(root);
    const features = [...index.features.filter(f => f.key !== draft.key), descriptor].sort((a, b) => a.key.localeCompare(b.key));
    const indexText = JSON.stringify({ version: 1, features }, null, 2) + '\n';
    if (features.length > MAX_FEATURES || Buffer.byteLength(indexText) > MAX_ARTIFACT_BYTES) fail('feature index limit reached');
    // Per-file atomic publication. A late index failure is detectable by hash;
    // this is not a multi-file transaction or permission to delete old cards.
    atomicWrite(cardPath, text);
    atomicWrite(indexPath, indexText);
  } finally { unlinkSync(lockPath); }
  return document;
}

/** Cheap discovery: reads the small index only, never scans source or graph files. */
export function listFeatureBriefs(workspace, query = '') {
  const root = realpathSync(workspace);
  const words = query.toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return readIndex(root).features.filter(f => words.every(w => `${f.key} ${f.name} ${f.summary} ${f.keywords.join(' ')}`.toLocaleLowerCase().includes(w)));
}

/** Load one card and hash only its cited sources. Absence of other callers is not certified. */
export function readFeatureBrief(workspace, key) {
  const root = realpathSync(workspace);
  if (!validKey(key)) fail('invalid key');
  const descriptor = readIndex(root).features.find(f => f.key === key);
  if (!descriptor) fail(`no card '${key}'; use source/graph lookup, do not invent a feature`);
  const path = safePath(root, `${ROOT}/${key}.json`), text = readText(path, MAX_ARTIFACT_BYTES);
  if (hash(text) !== descriptor.contentHash) fail('card/index mismatch; regenerate or finish publishing before trusting this card');
  const parsed = JSON.parse(text), draft = validateDraft(parsed);
  if (parsed.version !== 1 || parsed.key !== key || !Array.isArray(parsed.sources) || parsed.sources.length > 192) fail('invalid card');
  const cited = new Set([...draft.entries, ...draft.facts.flatMap(f => f.evidence)].map(e => e.filePath));
  const files = new Map();
  for (const source of parsed.sources) {
    if (!source || !cited.has(source.filePath) || files.has(source.filePath) || !/^[a-f0-9]{64}$/.test(source.contentHash)) fail('invalid card source hashes');
    files.set(source.filePath, source.contentHash);
  }
  for (const e of [...draft.entries, ...draft.facts.flatMap(f => f.evidence)]) if (!files.has(e.filePath)) fail('evidence missing source fingerprint');
  const stale = [], unavailable = [];
  let bytes = 0;
  for (const [file, expected] of files) {
    try {
      const text = readText(safePath(root, file), Math.min(MAX_SOURCE_BYTES, MAX_TOTAL_BYTES - bytes));
      bytes += Buffer.byteLength(text);
      if (hash(text) !== expected) stale.push(file);
    }
    catch { unavailable.push(file); }
  }
  return { document: parsed, stale, unavailable, checkedFiles: files.size };
}
