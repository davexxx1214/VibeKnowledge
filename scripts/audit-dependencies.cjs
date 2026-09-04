const { spawn } = require('node:child_process');

const MAX_ATTEMPTS = 3;
const RETRY_DELAYS_MS = [2000, 4000];

function readAuditOptions(env = process.env) {
  const raw = env.VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS ?? '60000';
  if (!/^\d+$/.test(raw) || Number(raw) < 10000 || Number(raw) > 120000) {
    throw new Error('VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS must be an integer from 10000 to 120000 (default 60000).');
  }
  const timeoutMs = Number(raw);
  return { timeoutMs, processTimeoutMs: timeoutMs + 15000 };
}

function redact(text) {
  return String(text ?? '')
    .replace(/https?:\/\/[^\s"'<>]+/gi, value => {
      try {
        const url = new URL(value);
        url.username = ''; url.password = ''; url.search = ''; url.hash = '';
        return url.href;
      } catch { return '[redacted URL]'; }
    })
    .replace(/((?:_authToken|_auth|authorization|password|api[_-]?key)["']?\s*[:=]\s*)[^\r\n]+/gi, '$1[redacted]')
    .replace(/\bnpm_[A-Za-z0-9]+\b/g, '[redacted token]');
}

// Use npm so registry, proxy, credentials and CA settings are respected.
// No shell/PowerShell; diagnostics never change npm config.
function runNpm(npmCli, args, { processTimeoutMs = 15000 } = {}) {
  return new Promise(resolve => {
    const child = spawn(process.execPath, [npmCli, ...args], {
      stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let truncated = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, processTimeoutMs);
    child.stdout.on('data', chunk => {
      stdout += chunk;
      if (stdout.length > 4 * 1024 * 1024) { truncated = true; stdout = stdout.slice(-4 * 1024 * 1024); }
    });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    child.on('error', error => {
      clearTimeout(timer);
      resolve({ code: null, stdout, stderr: error.message, spawnError: true });
    });
    child.on('close', code => {
      clearTimeout(timer);
      resolve({ code, stdout, stderr, timedOut, truncated });
    });
  });
}

function npmAudit(npmCli, options, runner = runNpm) {
  return runner(npmCli, [
    'audit', '--json', '--audit', '--omit=dev', '--audit-level=high',
    '--fetch-retries=0', `--fetch-timeout=${options.timeoutMs}`,
  ], options);
}

function classifyAudit(result) {
  let report;
  try { report = JSON.parse(result.stdout); } catch { /* A broken service is not a clean audit. */ }
  const counts = report?.metadata?.vulnerabilities;
  if (!result.truncated && counts && ['info', 'low', 'moderate', 'high', 'critical', 'total'].every(key => Number.isInteger(counts[key]) && counts[key] >= 0)) {
    if (counts.high || counts.critical) return { state: 'vulnerable', report };
    if (result.code === 0 && !result.timedOut && !report.error) return { state: 'clean', report };
  }
  return { state: 'unavailable', report };
}

function failureReason(result) {
  if (result.spawnError) return { kind: 'PROCESS_START_FAILED', retry: false };
  if (result.timedOut) return { kind: 'PROCESS_TIMEOUT', retry: true };
  let error;
  try { error = JSON.parse(result.stdout)?.error; } catch { /* Use npm's stderr instead. */ }
  const detail = `${error?.code ?? ''} ${error?.summary ?? ''} ${error?.detail ?? ''} ${result.stderr ?? ''}`;
  if (/CERT_|SELF_SIGNED|UNABLE_TO_VERIFY|ERR_TLS|certificate/i.test(detail)) return { kind: 'TLS_CERTIFICATE', retry: false };
  if (/E401|E403|\b401\b|\b403\b|ENEEDAUTH/i.test(detail)) return { kind: 'AUTH_OR_ACCESS', retry: false };
  if (/ENOLOCK|EUSAGE|EINVALID|Invalid package tree/i.test(detail)) return { kind: 'LOCAL_INPUT', retry: false };
  if (/ENOTFOUND|EAI_AGAIN/i.test(detail)) return { kind: 'DNS', retry: true };
  if (/timeout|timed out|ETIMEDOUT/i.test(detail)) return { kind: 'REQUEST_TIMEOUT', retry: true };
  if (/ECONNRESET|ECONNREFUSED|ENETUNREACH|EHOSTUNREACH|socket hang up/i.test(detail)) return { kind: 'NETWORK', retry: true };
  if (/\b5\d\d\b|\b429\b|E429|E5\d\d/i.test(detail)) return { kind: 'REGISTRY_SERVICE', retry: true };
  return { kind: 'INVALID_OR_MISSING_REPORT', retry: true };
}

async function diagnoseConnectivity(npmCli, log = console.log, runner = runNpm) {
  log('Connectivity diagnostics (not a security verdict):');
  const registry = await runner(npmCli, ['config', 'get', 'registry'], { processTimeoutMs: 5000 });
  if (registry.code === 0) {
    try {
      const url = new URL(registry.stdout.trim());
      if (!['https:', 'http:'].includes(url.protocol)) throw new Error('invalid registry');
      log(`Configured npm registry: ${redact(url.href)}`);
    } catch { log('Could not identify the configured npm registry.'); }
  } else { log('Could not read the configured npm registry.'); }
  const ping = await runner(npmCli, ['ping', '--json', '--fetch-retries=0', '--fetch-timeout=10000'], { processTimeoutMs: 15000 });
  if (ping.code === 0 && !ping.timedOut) {
    log('npm ping: OK. Registry reachability does NOT prove the Bulk Advisory POST endpoint works.');
  } else {
    log(`npm ping: FAILED (${failureReason(ping).kind}). Check the configured registry, approved proxy and CA connectivity.`);
  }
  log('Compare the same npm run audit:dependencies command in CI or another approved network. Do not disable TLS verification or auditing.');
}

function auditError(message, code, exitCode) {
  return Object.assign(new Error(message), { code, exitCode });
}

async function auditDependencies(run, log = console.log, options = {}) {
  const { timeoutMs, processTimeoutMs } = readAuditOptions({
    VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS: String(options.timeoutMs ?? 60000),
  });
  const wait = options.wait ?? (ms => new Promise(resolve => setTimeout(resolve, ms)));
  let attempts = 0;
  let lastResult;
  let reason;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    attempts = attempt;
    log(`Dependency audit: attempt ${attempt}/${MAX_ATTEMPTS}; request timeout ${timeoutMs}ms, process limit ${processTimeoutMs}ms (production dependencies, high/critical gate)`);
    const started = Date.now();
    try { lastResult = await run(); }
    catch (error) { lastResult = { code: null, stderr: error.message, spawnError: true }; }
    const { state, report } = classifyAudit(lastResult);
    if (state !== 'unavailable') {
      log(redact(JSON.stringify(report, null, 2)));
      if (state === 'vulnerable') throw auditError('AUDIT_VULNERABILITIES: High/critical dependency vulnerabilities found. Update affected dependencies; auditing has not been skipped.', 'AUDIT_VULNERABILITIES', 1);
      log('AUDIT_PASSED: A valid security report was received; no high/critical vulnerabilities.');
      return report;
    }
    reason = failureReason(lastResult);
    log(`Audit attempt failed: ${reason.kind}; elapsed ${Date.now() - started}ms. No valid security verdict was obtained.`);
    if (!reason.retry || attempt === MAX_ATTEMPTS) break;
    const delay = RETRY_DELAYS_MS[attempt - 1];
    log(`Retrying after ${delay}ms…`);
    await wait(delay);
  }
  if (lastResult.stderr) log(redact(lastResult.stderr));
  if (options.diagnose) {
    try { await options.diagnose(); }
    catch (error) { log(`Connectivity diagnostics could not finish: ${redact(error.message)}`); }
  }
  throw auditError(`AUDIT_UNAVAILABLE: Dependency audit unavailable after ${attempts} attempts (${reason.kind}). No successful security result was obtained; auditing remains enabled.`, 'AUDIT_UNAVAILABLE', 2);
}

module.exports = { readAuditOptions, runNpm, npmAudit, classifyAudit, failureReason, diagnoseConnectivity, auditDependencies, redact };
if (require.main === module) {
  const npmCli = process.argv[2] || process.env.npm_execpath;
  if (!npmCli) {
    console.error('Run through npm run audit:dependencies, or pass the absolute npm-cli.js path.');
    process.exitCode = 3;
  } else {
    let options;
    try { options = readAuditOptions(); }
    catch (error) { console.error(`AUDIT_CONFIG_ERROR: ${error.message}`); process.exitCode = 3; }
    if (options) {
      console.log(`Audit runtime: Node ${process.version}; ${process.platform}/${process.arch}. Audit errors and vulnerability findings both block installation/CI.`);
      auditDependencies(() => npmAudit(npmCli, options), console.log, {
        ...options, diagnose: () => diagnoseConnectivity(npmCli),
      }).catch(error => { console.error(error.message); process.exitCode = error.exitCode ?? 2; });
    }
  }
}
