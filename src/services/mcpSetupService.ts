import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import { applyEdits, modify, parse, ParseError } from 'jsonc-parser';

export type McpClient = 'vscode' | 'cursor';
export interface McpSetupOptions {
  bundlePath: string;
  storagePath: string;
  workspacePath: string;
  nodePath: string;
  npmCliPath?: string;
  client: McpClient;
  log: (message: string) => void;
  signal: AbortSignal;
  ensureDatabase: () => Promise<void>;
}

export interface ProcessOptions {
  cwd: string;
  env?: NodeJS.ProcessEnv;
  signal: AbortSignal;
  log: (message: string) => void;
  timeoutMs?: number;
}

export type ProcessRunner = (command: string, args: string[], options: ProcessOptions) => Promise<string>;

function redact(text: string): string {
  return text.replace(/(https?:\/\/)[^\s/@]+:[^\s/@]+@/gi, '$1[redacted]@')
    .replace(/((?:_authToken|authorization|api[_-]?key)\s*[:=]\s*)\S+/gi, '$1[redacted]');
}

/** No shell interpolation; paths containing spaces/metacharacters remain arguments. */
export const runProcess: ProcessRunner = (command, args, options) => new Promise((resolve, reject) => {
  options.signal.throwIfAborted();
  const child = spawn(command, args, {
    cwd: options.cwd, env: options.env, windowsHide: true, shell: false,
    detached: process.platform !== 'win32',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let tail = '';
  let failure: Error | undefined;
  let hardStop: ReturnType<typeof setTimeout> | undefined;
  const stop = (error: Error) => {
    if (failure) {return;}
    failure = error;
    if (process.platform === 'win32' && child.pid) {
      // End npm's child tree too, without PowerShell or a command-string shell.
      const taskkill = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe');
      const killer = spawn(taskkill, ['/pid', String(child.pid), '/t', '/f'], { windowsHide: true, stdio: 'ignore' });
      killer.on('error', () => child.kill());
    } else {
      try { if (child.pid) { process.kill(-child.pid, 'SIGTERM'); } } catch { child.kill('SIGTERM'); }
    }
    hardStop = setTimeout(() => {
      if (process.platform !== 'win32' && child.pid) {
        try { process.kill(-child.pid, 'SIGKILL'); } catch { /* Already stopped. */ }
      } else { child.kill('SIGKILL'); }
    }, 3000);
  };
  const abort = () => stop(new Error('MCP setup cancelled'));
  options.signal.addEventListener('abort', abort, { once: true });
  if (options.signal.aborted) {abort();}
  const timer = setTimeout(() => stop(new Error('MCP setup step timed out; check the setup log and registry connectivity')), options.timeoutMs ?? 300000);
  const output = (chunk: Buffer, isStdout: boolean) => {
    const value = chunk.toString();
    if (isStdout) {stdout = (stdout + value).slice(-256 * 1024);}
    tail = (tail + redact(value)).slice(-4000);
    options.log(redact(value));
  };
  child.stdout.on('data', chunk => output(chunk, true));
  child.stderr.on('data', chunk => output(chunk, false));
  const cleanup = () => {
    clearTimeout(timer);
    clearTimeout(hardStop);
    options.signal.removeEventListener('abort', abort);
  };
  child.on('error', error => { cleanup(); reject(error); });
  child.on('close', code => {
    cleanup();
    if (failure) {reject(failure);}
    else if (code !== 0) {reject(new Error(`Process exited with code ${code}:\n${tail}`));}
    else {resolve(stdout.trim());}
  });
});

export function nodeEnvironment(nodePath: string, env: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const result = { ...env };
  const key = Object.keys(result).find(name => name.toLowerCase() === 'path') ?? 'PATH';
  result[key] = `${path.dirname(nodePath)}${path.delimiter}${result[key] ?? ''}`;
  return result;
}

export function validateNode(version: string): void {
  if (!/^v?26\.(?:[1-9]\d*)\.\d+$/.test(version)) {
    throw new Error(`Node ${version} is unsupported. Select Node >=26.1.0 <27 in Knowledge: Settings.`);
  }
}

async function findNpmCli(nodePath: string, configured: string | undefined): Promise<string> {
  const realNode = await fs.realpath(nodePath);
  const candidates = configured ? [configured] : [
    path.join(path.dirname(realNode), 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(path.dirname(realNode), '..', 'lib', 'node_modules', 'npm', 'bin', 'npm-cli.js'),
    path.resolve(path.dirname(realNode), '..', 'share', 'nodejs', 'npm', 'bin', 'npm-cli.js'),
  ];
  for (const candidate of candidates) {
    if (!path.isAbsolute(candidate)) {continue;}
    if (await fs.stat(candidate).then(s => s.isFile(), () => false)) {return candidate;}
  }
  throw new Error('npm-cli.js was not found beside Node. Set knowledgeGraph.mcp.npmCliPath to its absolute path.');
}

function configPath(workspace: string, client: McpClient): string {
  return path.join(workspace, client === 'cursor' ? '.cursor' : '.vscode', 'mcp.json');
}

export function mergeMcpConfig(text: string, client: McpClient, node: string, entry: string, workspace: string): string {
  const errors: ParseError[] = [];
  const document = parse(text || '{}', errors, { allowTrailingComma: true, disallowComments: false });
  if (errors.length || !document || typeof document !== 'object' || Array.isArray(document)) {
    throw new Error('mcp.json is invalid. Repair it first; the existing file has not been overwritten.');
  }
  const key = client === 'cursor' ? 'mcpServers' : 'servers';
  if (document[key] !== undefined && (!document[key] || typeof document[key] !== 'object' || Array.isArray(document[key]))) {
    throw new Error(`mcp.json: ${key} must be an object.`);
  }
  const server = {
    ...(client === 'vscode' ? { type: 'stdio' } : {}),
    command: node,
    args: [entry, '--workspace', workspace, '--rag-mode', 'none'],
  };
  return applyEdits(text || '{}', modify(text || '{}', [key, 'vibeknowledge'], server, {
    formattingOptions: { insertSpaces: true, tabSize: 2, eol: text.includes('\r\n') ? '\r\n' : '\n' },
  }));
}

async function readConfig(file: string): Promise<string> {
  try { return await fs.readFile(file, 'utf8'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') {return '';} throw error; }
}

/** Isolated, versioned installs: never runs npm in the user's business project. */
export async function setupMcp(options: McpSetupOptions, run: ProcessRunner = runProcess): Promise<string> {
  const { log, signal } = options;
  const workspace = await fs.realpath(options.workspacePath);
  if (!(await fs.stat(workspace)).isDirectory()) {throw new Error('Workspace must be a directory');}
  const file = configPath(workspace, options.client);
  const originalConfig = await readConfig(file);
  // Validate before downloading anything, including preservation of JSONC comments.
  mergeMcpConfig(originalConfig, options.client, '', '', workspace);
  const processOptions: ProcessOptions = { cwd: options.storagePath, signal, log };
  await fs.mkdir(options.storagePath, { recursive: true });
  log('Checking external Node runtime…\n');
  const runtime = JSON.parse(await run(options.nodePath, ['-p', 'JSON.stringify({version:process.version,execPath:process.execPath,abi:process.versions.modules,platform:process.platform,arch:process.arch})'], processOptions));
  validateNode(runtime.version);
  const node: string = runtime.execPath;
  const npm = await findNpmCli(node, options.npmCliPath);
  const env = nodeEnvironment(node);
  const npmVersion = await run(node, [npm, '--version'], { ...processOptions, env });
  if (Number(npmVersion.split('.')[0]) < 11) {throw new Error(`npm ${npmVersion} is too old. Use the npm bundled with Node 26 (npm 11+); legacy audit fallback endpoints are retired.`);}
  log(`Node ${runtime.version}; npm ${npmVersion}; ${runtime.platform}/${runtime.arch}; ABI ${runtime.abi}\n`);
  const lock = await fs.readFile(path.join(options.bundlePath, 'package-lock.json'));
  const identity = createHash('sha256').update(lock).update(`${node}:${runtime.version}:${runtime.platform}:${runtime.arch}`).digest('hex').slice(0, 16);
  const directory = await fs.mkdtemp(path.join(options.storagePath, `mcp-${identity}-`));
  let published = false;
  try {
    for (const entry of await fs.readdir(options.bundlePath)) {
      await fs.cp(path.join(options.bundlePath, entry), path.join(directory, entry), { recursive: true, errorOnExist: true, force: false });
    }
    const stepOptions = { ...processOptions, cwd: directory, env };
    log('Installing locked MCP runtime dependencies (audit enabled)…\n');
    const shellArgs = process.platform === 'win32'
      ? [`--script-shell=${path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'cmd.exe')}`] : [];
    await run(node, [npm, 'ci', '--omit=dev', '--audit', '--foreground-scripts', ...shellArgs], stepOptions);
    signal.throwIfAborted();
    log('Auditing production dependencies; high/critical vulnerabilities or unavailable audit service block setup…\n');
    await run(node, [path.join(directory, 'audit-dependencies.cjs'), npm], stepOptions);
    signal.throwIfAborted();
    await options.ensureDatabase();
    log('Checking native SQLite and MCP protocol/tools (RAG disabled)…\n');
    await run(node, [path.join(directory, 'health-check.mjs'), workspace], { ...stepOptions, timeoutMs: 45000 });
    signal.throwIfAborted();
    // Do not overwrite concurrent user/client edits made during installation.
    if (await readConfig(file) !== originalConfig) {throw new Error('mcp.json changed during setup. Run setup again; your changes were preserved.');}
    const updated = mergeMcpConfig(originalConfig, options.client, node, path.join(directory, 'dist', 'index.js'), workspace);
    await fs.mkdir(path.dirname(file), { recursive: true });
    if (originalConfig) {await fs.writeFile(`${file}.${Date.now()}.bak`, originalConfig, { flag: 'wx' });}
    const temporary = `${file}.${path.basename(directory)}.tmp`;
    try {
      await fs.writeFile(temporary, updated, { flag: 'wx' });
      await fs.rename(temporary, file);
    } finally {
      await fs.rm(temporary, { force: true });
    }
    published = true;
    log(`MCP ready. Configuration: ${file}\nPrevious installations were preserved so existing MCP processes keep working.\n`);
    return file;
  } finally {
    // Only remove this attempt's uniquely-created staging directory, never old installs.
    if (!published) {await fs.rm(directory, { recursive: true, force: true }).catch(error => log(`Could not remove failed staging directory: ${error}\n`));}
  }
}
