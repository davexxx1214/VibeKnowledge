import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

const { classifyAudit, auditDependencies } = createRequire(import.meta.url)('../scripts/audit-dependencies.cjs');
const report = (high = 0, moderate = 0) => ({
  metadata: { vulnerabilities: { info: 0, low: 0, moderate, high, critical: 0, total: high + moderate } },
});
const result = (high = 0) => ({ code: high ? 1 : 0, stdout: JSON.stringify(report(high)), stderr: '' });

describe('dependency audit gate', () => {
  it('accepts a valid clean report only, with the existing high severity threshold', () => {
    expect(classifyAudit(result()).state).toBe('clean');
    expect(classifyAudit({ code: 0, stdout: JSON.stringify(report(0, 1)) }).state).toBe('clean');
    for (const stdout of ['', '{}', 'not json', '{"error":{"code":"E400"}}', '{"metadata":{"vulnerabilities":{"high":0}}}']) {
      expect(classifyAudit({ code: 0, stdout }).state).toBe('unavailable');
    }
  });
  it('does not retry a vulnerable result into a pass', async () => {
    const run = vi.fn(async () => result(1));
    await expect(auditDependencies(run, vi.fn())).rejects.toThrow('vulnerabilities');
    expect(run).toHaveBeenCalledOnce();
  });
  it('retries a transient service failure and validates the next report', async () => {
    const run = vi.fn().mockResolvedValueOnce({ code: 1, stdout: '', stderr: '503' }).mockResolvedValueOnce(result());
    await expect(auditDependencies(run, vi.fn())).resolves.toEqual(report());
    expect(run).toHaveBeenCalledTimes(2);
  });
  it('fails closed after bounded retries when the registry is unavailable', async () => {
    const run = vi.fn(async () => ({ code: 1, stdout: '', stderr: 'timeout' }));
    await expect(auditDependencies(run, vi.fn())).rejects.toThrow('unavailable after 3 attempts');
    expect(run).toHaveBeenCalledTimes(3);
  });
  it('enables install auditing and explicit security gates in both CI jobs', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(workflow).not.toContain('--no-audit');
    expect(workflow.match(/run: npm run audit:dependencies/g)).toHaveLength(2);
    expect(workflow.match(/run: npm ci\s*$/gm)).toHaveLength(2);
    for (const directory of ['.', 'packages/mcp-server']) {
      expect(readFileSync(`${directory}/.npmrc`, 'utf8')).toContain('audit=true');
    }
  });
});
