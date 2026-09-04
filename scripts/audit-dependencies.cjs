const { spawn } = require('node:child_process');

function npmAudit(npmCli) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [npmCli, 'audit', '--json', '--audit', '--omit=dev', '--audit-level=high', '--fetch-retries=0', '--fetch-timeout=30000'], {
      stdio: ['ignore', 'pipe', 'pipe'], shell: false, windowsHide: true,
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => child.kill(), 45000);
    child.stdout.on('data', chunk => { stdout = (stdout + chunk).slice(-4 * 1024 * 1024); });
    child.stderr.on('data', chunk => { stderr = (stderr + chunk).slice(-4000); });
    child.on('error', error => { clearTimeout(timer); reject(error); });
    child.on('close', code => { clearTimeout(timer); resolve({ code, stdout, stderr }); });
  });
}

function classifyAudit(result) {
  let report;
  try { report = JSON.parse(result.stdout); } catch { /* A broken service is not a clean audit. */ }
  const counts = report?.metadata?.vulnerabilities;
  if (counts && ['info', 'low', 'moderate', 'high', 'critical', 'total'].every(key => Number.isInteger(counts[key]) && counts[key] >= 0)) {
    if (counts.high || counts.critical) return { state: 'vulnerable', report };
    if (result.code === 0 && !report.error) return { state: 'clean', report };
  }
  return { state: 'unavailable', report };
}

async function auditDependencies(run, log = console.log) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    log(`Dependency audit: attempt ${attempt}/3 (production dependencies, high/critical gate)`);
    const result = await run();
    const { state, report } = classifyAudit(result);
    if (state !== 'unavailable') {
      log(JSON.stringify(report, null, 2));
      if (state === 'vulnerable') throw new Error('High/critical dependency vulnerabilities found. Update the affected dependencies; auditing has not been skipped.');
      return report;
    }
    // Retry only missing/invalid reports, never retry a real vulnerability into a pass.
    if (attempt < 3) log('Audit service did not return a valid report; retrying.');
    else {
      log(result.stderr);
      throw new Error('Dependency audit unavailable after 3 attempts. Check npm registry/proxy/CA connectivity and retry. No successful security result was obtained; auditing remains enabled.');
    }
  }
}

module.exports = { classifyAudit, auditDependencies };
if (require.main === module) {
  const npmCli = process.argv[2] || process.env.npm_execpath;
  if (!npmCli) {
    console.error('Run through npm run audit:dependencies, or pass the absolute npm-cli.js path.');
    process.exitCode = 2;
  } else auditDependencies(() => npmAudit(npmCli)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
