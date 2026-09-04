import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { canonicalizeEntityKey, normalizeEntityIdentity } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/canonicalize-entity-key.mjs';

describe('canonicalizeEntityKey', () => {
  it('preserves semantic identity while normalizing only path spelling', () => {
    const keys = ['src/a.ts#PartnerShip', 'src/a.ts#Partnership', 'src/a.ts#Ａ', 'src/a.ts#A', 'src/a.ts#X-Y', 'src/a.ts#X_Y', 'src/A.ts#A'];
    expect(new Set(keys.map(normalizeEntityIdentity)).size).toBe(keys.length);
    expect(normalizeEntityIdentity('./src\\a.ts#PartnerShip')).toBe(keys[0]);
    expect(canonicalizeEntityKey(keys[0])).toBe(canonicalizeEntityKey(keys[1]));
    expect(normalizeEntityIdentity('src/a.ts#A//B')).toBe('src/a.ts#A//B');
  });
  it('matches the shared canonical-key contract', () => {
    const cases = JSON.parse(
      readFileSync(
        resolve(
          process.cwd(),
          'resources',
          'skills',
          'vibeknowledge-dependency-graph',
          'references',
          'canonical-key-cases.json'
        ),
        'utf8'
      )
    ) as Array<{ input: string; canonical: string }>;

    for (const fixture of cases) {
      expect(canonicalizeEntityKey(fixture.input)).toBe(fixture.canonical);
    }
  });

  it('is idempotent and does not mutate the serialized input', () => {
    const serializedKey = ' SRC\\Auth//auth.service.ts # AuthService() ';
    const canonical = canonicalizeEntityKey(serializedKey);

    expect(canonicalizeEntityKey(canonical)).toBe(canonical);
    expect(serializedKey).toBe(' SRC\\Auth//auth.service.ts # AuthService() ');
  });
});
