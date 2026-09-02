/**
 * Build a comparison-only alias for a serialized entity key.
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
