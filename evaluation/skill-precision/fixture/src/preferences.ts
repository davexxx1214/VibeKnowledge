export interface Preferences { format: 'plain' | 'structured'; autoOpen: boolean }
export function formatTag(preferences: Preferences): string {
  return preferences.format === 'structured' ? 'application/json' : 'text/plain';
}
