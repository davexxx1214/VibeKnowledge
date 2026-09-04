/**
 * Build a fuzzy search alias for a serialized entity key, NOT an identity.
 *
 * Never persist the returned value in place of the original key. Stable keys
 * remain the durable link to human description overrides.
 *
 * @param {string} value
 * @returns {string}
 */
export function canonicalizeEntityKey(value) {
  if (typeof value !== 'string') {
    throw new TypeError('Entity key must be a string');
  }

  return value
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .normalize('NFKC')
    .replace(/\\/gu, '/')
    .replace(/\s*([/#.:@_-])\s*/gu, '$1')
    .replace(/[^\p{L}\p{M}\p{N}/#.:@_-]+/gu, '-')
    .replace(/\/+/gu, '/')
    .replace(/#+/gu, '#')
    .replace(/\.+/gu, '.')
    .replace(/_+/gu, '_')
    .replace(/-+/gu, '-')
    .replace(/:+/gu, ':')
    .replace(/@+/gu, '@')
    .replace(/^(?:\.\/)+/u, '')
    .replace(/^-+|-+$/gu, '');
}

/**
 * Normalize only portable path spelling. Symbol case, Unicode and punctuation
 * are semantic in JavaScript/TypeScript and must survive identity comparisons.
 * Path case is also retained so distinct files on case-sensitive systems stay
 * distinct. Do not persist this comparison value over the original key.
 */
export function normalizeEntityIdentity(value) {
  if (typeof value !== 'string') throw new TypeError('Entity key must be a string');
  const separator = value.indexOf('#');
  const path = separator < 0 ? value : value.slice(0, separator);
  const symbol = separator < 0 ? '' : value.slice(separator);
  return path.replace(/\\/gu, '/').replace(/\/+/gu, '/').replace(/^(?:\.\/)+/u, '') + symbol;
}
