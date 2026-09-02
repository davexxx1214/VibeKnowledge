import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';
import { canonicalizeEntityKey } from '../../../resources/skills/vibeknowledge-dependency-graph/scripts/canonicalize-entity-key.mjs';

describe('canonicalizeEntityKey', () => {
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
