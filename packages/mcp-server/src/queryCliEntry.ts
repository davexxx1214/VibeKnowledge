import { main } from './queryCli.js';

main().catch((error: unknown) => {
  console.error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
