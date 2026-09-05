// Same read/search output and 18k cap as the Skill A/B; actual MCP bridge added.
const { readFileSync, appendFileSync, existsSync } = require('node:fs');
const { resolve, relative, join } = require('node:path');
const { spawnSync } = require('node:child_process');
const workspace = process.cwd(), argv = process.argv.slice(2);
let phase = 'unspecified';
if (argv[0] === '--phase') { argv.shift(); phase = argv.shift(); }
const [operation, ...args] = argv;
const started = Date.now();
let output = '', exitCode = 0, metadata = {};
function local(file) {
  const absolute = resolve(workspace, file), rel = relative(workspace, absolute);
  if (rel.startsWith('..') || rel.includes(':')) throw new Error('Path must stay in this trial workspace.');
  return absolute;
}
function run(command, commandArgs) {
  const result = spawnSync(command, commandArgs, { cwd: workspace, encoding: 'utf8', windowsHide: true, timeout: 60000, maxBuffer: 8 * 1024 * 1024 });
  exitCode = result.status ?? 1;
  output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error) output += `\n${result.error.message}`;
}
try {
  if (operation === 'read') {
    const [file, first = '1', last] = args;
    const lines = readFileSync(local(file), 'utf8').split(/\r?\n/);
    const start = Number(first), end = last ? Number(last) : lines.length;
    if (!Number.isInteger(start) || start < 1 || !Number.isInteger(end) || end < start) throw new Error('Invalid line range.');
    output = lines.slice(start - 1, end).map((line, index) => `${start + index}: ${line}`).join('\n');
    metadata = { file, start, end: Math.min(end, lines.length) };
  } else if (operation === 'rg') run('rg', args);
  else if (['mcp-list', 'mcp', 'mcp-resource'].includes(operation)) {
    if (!existsSync(local('mcp-eval.json'))) throw new Error('MCP is not available in this arm.');
    const action = operation === 'mcp-list' ? 'list' : operation === 'mcp-resource' ? 'resource' : 'call';
    metadata = { tool: operation === 'mcp' ? args[0] : undefined };
    run(process.execPath, [local('mcp-client.mjs'), action, ...args]);
  } else throw new Error('Operations: read FILE [START END], rg ARGS..., mcp-list, mcp TOOL --inputName VALUE..., mcp-resource URI.');
} catch (error) { exitCode = 1; output = String(error.message ?? error); }
const truncated = output.length > 18000;
if (truncated) output = output.slice(0, 18000) + '\n[Observation output truncated at 18000 characters; narrow the next query.]';
const displayed = `${output.trimEnd()}\n[exit ${exitCode}]\n`;
appendFileSync(join(workspace, 'ab-observations.jsonl'), JSON.stringify({ at: new Date().toISOString(), elapsedMs: Date.now() - started, phase, operation, args, metadata, exitCode, truncated, displayed }) + '\n');
process.stdout.write(displayed);
process.exitCode = exitCode;
