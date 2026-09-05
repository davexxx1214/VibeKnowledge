// Evaluation-only bridge. Calls the frozen candidate server over actual MCP stdio.
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const config = JSON.parse(readFileSync(join(process.cwd(), 'mcp-eval.json'), 'utf8'));
const require = createRequire(join(config.runtimeRoot, 'package.json'));
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StdioClientTransport } = require('@modelcontextprotocol/sdk/client/stdio.js');
const [operation, name, ...flags] = process.argv.slice(2);
const client = new Client({ name: 'vibeknowledge-matched-evaluation', version: '1.0.0' });
const transport = new StdioClientTransport({
  command: process.execPath,
  args: [join(config.runtimeRoot, 'dist/index.js'), '--workspace', process.cwd(), '--rag-mode', 'none', '--log-level', 'error'],
  stderr: 'pipe'
});
let stderr = '';
transport.stderr?.on('data', chunk => { stderr += String(chunk); });
try {
  await client.connect(transport);
  if (operation === 'list') {
    process.stdout.write(JSON.stringify(await client.listTools()) + '\n');
  } else if (operation === 'resource') {
    const result = await client.readResource({ uri: name });
    process.stdout.write(result.contents.map(item => item.text ?? '').join('\n') + '\n');
  } else if (operation === 'call') {
    const args = {};
    for (let i = 0; i < flags.length; i += 2) {
      if (!/^--[a-zA-Z]+$/.test(flags[i]) || flags[i + 1] === undefined) throw new Error('Use --inputName VALUE pairs.');
      const key = flags[i].slice(2), raw = flags[i + 1];
      args[key] = key === 'relationVerbs' ? raw.split(',') : /^(tokenBudget|limit|depth|maxDepth)$/.test(key) ? Number(raw) : raw === 'true' ? true : raw === 'false' ? false : raw;
    }
    const result = await client.callTool({ name, arguments: args });
    process.stdout.write(result.content.filter(item => item.type === 'text').map(item => item.text).join('\n') + '\n');
    if (result.isError) process.exitCode = 1;
  } else throw new Error('Expected list, call TOOL, or resource URI');
} catch (error) {
  process.stderr.write(String(error.message ?? error) + '\n' + stderr);
  process.exitCode = 1;
} finally {
  await client.close();
}
