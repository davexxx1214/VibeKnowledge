// Offline CLI fixture; never accesses a registry or mutates npm configuration.
const command = process.argv[2];
if (command === 'hang') setInterval(() => {}, 1000);
else if (command === 'config') console.log('https://registry.example/');
else if (command === 'ping') console.log('{}');
else if (command === 'audit') {
  const scenario = process.env.AUDIT_TEST_SCENARIO;
  if (scenario === 'tls') {
    console.error('SELF_SIGNED_CERT_IN_CHAIN');
    process.exitCode = 1;
  } else {
    const high = scenario === 'vulnerable' ? 1 : 0;
    console.log(JSON.stringify({ metadata: { vulnerabilities: { info: 0, low: 0, moderate: 0, high, critical: 0, total: high } } }));
    process.exitCode = high;
  }
} else process.exitCode = 9;
