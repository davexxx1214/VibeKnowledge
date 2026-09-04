import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Database from 'better-sqlite3';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

// Runs in the selected external Node runtime, not Electron's extension host.
const root = fileURLToPath(new URL('.', import.meta.url));
const db = new Database(':memory:');
try {
  if (db.prepare('SELECT 1 AS ok').get().ok !== 1) throw new Error('SQLite health check failed');
} finally {
  db.close();
}
const client = new Client({ name: 'vibeknowledge-setup', version: '1.0.0' }, { capabilities: {} });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [resolve(root, 'dist/index.js'), '--workspace', process.argv[2], '--rag-mode', 'none'],
  stderr: 'pipe',
});
transport.stderr?.on('data', chunk => process.stderr.write(chunk));
try {
  await client.connect(transport, { timeout: 15000 });
  const { tools } = await client.listTools();
  for (const name of ['query_graph', 'get_entity', 'list_relations']) {
    if (!tools.some(tool => tool.name === name)) throw new Error(`Missing MCP tool: ${name}`);
  }
  const overview = await client.readResource({ uri: 'knowledge://overview' });
  if (!overview.contents.length) throw new Error('MCP overview is empty');
  console.log(JSON.stringify({ server: client.getServerVersion(), tools: tools.length, sqlite: 'ok' }));
} finally {
  await client.close();
}
