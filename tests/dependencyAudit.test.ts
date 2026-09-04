import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';

const { readAuditOptions, runNpm, npmAudit, classifyAudit, failureReason, diagnoseConnectivity, auditDependencies, redact } = createRequire(import.meta.url)('../scripts/audit-dependencies.cjs');
const immediate = { wait: async () => {} };
const fakeNpm = path.resolve('tests/fixtures/audit-npm.cjs');
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
    const wait = vi.fn(async () => {});
    await expect(auditDependencies(run, vi.fn(), { wait })).resolves.toEqual(report());
    expect(run).toHaveBeenCalledTimes(2);
    expect(wait).toHaveBeenCalledExactlyOnceWith(2000);
  });
  it('fails closed after bounded retries when the registry is unavailable', async () => {
    const run = vi.fn(async () => ({ code: 1, stdout: '', stderr: 'timeout' }));
    const wait = vi.fn(async () => {});
    const diagnose = vi.fn(async () => {});
    await expect(auditDependencies(run, vi.fn(), { wait, diagnose })).rejects.toMatchObject({ code: 'AUDIT_UNAVAILABLE', exitCode: 2 });
    expect(run).toHaveBeenCalledTimes(3);
    expect(wait.mock.calls).toEqual([[2000], [4000]]);
    expect(diagnose).toHaveBeenCalledOnce();
  });
  it('enables install auditing and explicit security gates in both CI jobs', () => {
    const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
    expect(workflow).not.toContain('--no-audit');
    expect(workflow.match(/run: npm run audit:dependencies/g)).toHaveLength(2);
    expect(workflow.match(/run: npm ci\s*$/gm)).toHaveLength(2);
    expect(workflow).toContain("VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS: '60000'");
    expect(workflow).not.toContain('continue-on-error');
    for (const directory of ['.', 'packages/mcp-server']) {
      expect(readFileSync(`${directory}/.npmrc`, 'utf8')).toContain('audit=true');
    }
  });

  it('defaults to 60 seconds with a larger subprocess deadline', () => {
    expect(readAuditOptions({})).toEqual({ timeoutMs: 60000, processTimeoutMs: 75000 });
    expect(readAuditOptions({ VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS: '120000' })).toEqual({ timeoutMs: 120000, processTimeoutMs: 135000 });
  });

  it.each(['', '0', '-1', '9999', '120001', '60000.5', 'NaN'])('rejects an invalid timeout: %s', value => {
    expect(() => readAuditOptions({ VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS: value })).toThrow('10000 to 120000');
  });

  it('passes timeout settings to npm without disabling audits, TLS or the configured registry', async () => {
    const runner = vi.fn(async () => result());
    const options = readAuditOptions({ VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS: '90000' });
    await npmAudit('npm-cli.js', options, runner);
    expect(runner).toHaveBeenCalledWith('npm-cli.js', expect.arrayContaining([
      'audit', '--audit', '--json', '--omit=dev', '--fetch-retries=0', '--fetch-timeout=90000',
    ]), { timeoutMs: 90000, processTimeoutMs: 105000 });
    expect(runner.mock.calls[0][1].join(' ')).not.toMatch(/no-audit|strict-ssl|--registry|powershell/);
  });

  it.each([
    ['network timeout at: https://registry.npmjs.org/', 'REQUEST_TIMEOUT', true],
    ['ENOTFOUND', 'DNS', true],
    ['ECONNRESET', 'NETWORK', true],
    ['503 Service Unavailable', 'REGISTRY_SERVICE', true],
    ['SELF_SIGNED_CERT_IN_CHAIN', 'TLS_CERTIFICATE', false],
    ['E401', 'AUTH_OR_ACCESS', false],
    ['ENOLOCK', 'LOCAL_INPUT', false],
  ])('classifies %s separately from a vulnerability', (stderr, kind, retry) => {
    expect(failureReason({ code: 1, stderr })).toEqual({ kind, retry });
  });

  it('does not retry certificate failures or execute a security bypass', async () => {
    const run = vi.fn(async () => ({ code: 1, stderr: 'SELF_SIGNED_CERT_IN_CHAIN' }));
    const wait = vi.fn();
    await expect(auditDependencies(run, vi.fn(), { wait })).rejects.toMatchObject({ code: 'AUDIT_UNAVAILABLE', exitCode: 2 });
    expect(run).toHaveBeenCalledOnce();
    expect(wait).not.toHaveBeenCalled();
  });

  it('never accepts timed-out or truncated output as a clean audit', () => {
    expect(classifyAudit({ ...result(), timedOut: true }).state).toBe('unavailable');
    expect(classifyAudit({ ...result(), truncated: true }).state).toBe('unavailable');
  });

  it('keeps vulnerability failures distinct and does not run connectivity diagnostics', async () => {
    const diagnose = vi.fn();
    await expect(auditDependencies(async () => result(1), vi.fn(), { diagnose })).rejects.toMatchObject({ code: 'AUDIT_VULNERABILITIES', exitCode: 1 });
    expect(diagnose).not.toHaveBeenCalled();
  });

  it('does not turn successful connectivity diagnostics into an audit pass', async () => {
    const log = vi.fn();
    const runner = vi.fn().mockResolvedValueOnce({ code: 0, stdout: 'https://user:secret@registry.example/npm/?token=private' }).mockResolvedValueOnce({ code: 0 });
    const diagnose = () => diagnoseConnectivity('npm-cli.js', log, runner);
    await expect(auditDependencies(async () => ({ code: 1, stderr: 'timeout' }), log, { ...immediate, diagnose })).rejects.toMatchObject({ exitCode: 2 });
    const output = log.mock.calls.flat().join('\n');
    expect(output).toContain('Configured npm registry: https://registry.example/npm/');
    expect(output).toContain('npm ping: OK');
    expect(output).toContain('does NOT prove');
    expect(output).not.toMatch(/secret|private|user:/);
    expect(runner.mock.calls[1][1][0]).toBe('ping');
  });

  it('still fails when diagnostics themselves fail', async () => {
    await expect(auditDependencies(async () => ({ code: 1, stderr: 'timeout' }), vi.fn(), {
      ...immediate, diagnose: async () => { throw new Error('diagnostic failed'); },
    })).rejects.toMatchObject({ code: 'AUDIT_UNAVAILABLE', exitCode: 2 });
  });

  it('redacts tokens, authorization headers and URL credentials from logs', () => {
    const output = redact('Authorization: Bearer secret\n_authToken=secret\nhttps://user:password@registry.example/npm?token=secret\nnpm_secrettoken');
    expect(output).not.toMatch(/secret|password|user:/);
    expect(output).toContain('https://registry.example/npm');
  });

  it('terminates a hung npm process at the hard deadline', async () => {
    const response = await runNpm(fakeNpm, ['hang'], { processTimeoutMs: 250 });
    expect(response.timedOut).toBe(true);
    expect(response.code).not.toBe(0);
    expect(failureReason(response).kind).toBe('PROCESS_TIMEOUT');
  });

  it.each([
    ['clean', 0, 'AUDIT_PASSED'],
    ['vulnerable', 1, 'AUDIT_VULNERABILITIES'],
    ['tls', 2, 'AUDIT_UNAVAILABLE'],
  ])('returns the correct CLI exit code for %s', (scenario, status, message) => {
    const response = spawnSync(process.execPath, ['scripts/audit-dependencies.cjs', fakeNpm], {
      encoding: 'utf8', timeout: 10000, windowsHide: true,
      env: { ...process.env, VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS: '10000', AUDIT_TEST_SCENARIO: scenario },
    });
    expect(response.error).toBeUndefined();
    expect(response.status, response.stderr).toBe(status);
    expect(response.stdout + response.stderr).toContain(message);
    if (scenario === 'tls') expect(response.stdout).toContain('npm ping: OK');
  });

  it('rejects invalid CLI configuration before starting npm', () => {
    const response = spawnSync(process.execPath, ['scripts/audit-dependencies.cjs', 'missing-npm.js'], {
      encoding: 'utf8', timeout: 10000, windowsHide: true,
      env: { ...process.env, VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS: '0' },
    });
    expect(response.status).toBe(3);
    expect(response.stderr).toContain('AUDIT_CONFIG_ERROR');
  });
});
