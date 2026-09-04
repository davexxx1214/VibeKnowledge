import { mkdtemp, mkdir, writeFile, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import * as path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse } from 'jsonc-parser';
import { mergeMcpConfig, nodeEnvironment, runProcess, setupMcp, validateNode, type McpSetupOptions, type ProcessRunner } from '../src/services/mcpSetupService';

describe('MCP config editing', () => {
  it.each(['vscode', 'cursor'] as const)('preserves comments, other servers and settings for %s', client => {
    const key = client === 'vscode' ? 'servers' : 'mcpServers';
    const original = `{
      // user-owned settings
      "inputs": [{"id":"secret"}],
      "${key}": {"other": {"command":"untouched"}, "vibeknowledge":{"command":"old"}},
    }`;
    const updated = mergeMcpConfig(original, client, 'D:\\Node & Tools\\node.exe', 'D:\\runtime\\index.js', 'D:\\工程 & pages');
    expect(updated).toContain('// user-owned settings');
    const result = parse(updated);
    expect(result.inputs).toEqual([{ id: 'secret' }]);
    expect(result[key].other).toEqual({ command: 'untouched' });
    expect(result[key].vibeknowledge.args).toEqual(['D:\\runtime\\index.js', '--workspace', 'D:\\工程 & pages', '--rag-mode', 'none']);
    expect(result[key].vibeknowledge.type).toBe(client === 'vscode' ? 'stdio' : undefined);
  });

  it.each(['{broken', 'null', '[]', '{"servers":[]}', '{"servers":null}'])('rejects invalid existing configuration: %s', value => {
    expect(() => mergeMcpConfig(value, 'vscode', '', '', '')).toThrow();
  });

  it('creates an empty config and accepts a JSONC trailing comma', () => {
    expect(parse(mergeMcpConfig('', 'vscode', 'node', 'index.js', 'workspace')).servers.vibeknowledge.command).toBe('node');
    expect(() => mergeMcpConfig('{"servers":{},}', 'vscode', 'node', 'index.js', 'workspace')).not.toThrow();
  });

  it.each(['v26.1.0', '26.8.1'])('allows %s', value => expect(() => validateNode(value)).not.toThrow());
  it.each(['v24.9.0', 'v26.0.0', 'v27.0.0', 'v26.1.0-pre'])('rejects %s', value => expect(() => validateNode(value)).toThrow());

  it('uses the selected Node for subprocess PATH without mutating inherited environment', () => {
    const env = { Path: 'original', NODE_EXTRA_CA_CERTS: '/company/ca.pem' };
    const actual = nodeEnvironment(path.resolve('node folder', 'node.exe'), env);
    expect(actual.Path).toBe(`${path.resolve('node folder')}${path.delimiter}original`);
    expect(actual.NODE_EXTRA_CA_CERTS).toBe(env.NODE_EXTRA_CA_CERTS);
    expect(env.Path).toBe('original');
  });
});

describe('isolated one-click MCP setup', () => {
  let root: string;
  let options: McpSetupOptions;
  let run: ReturnType<typeof vi.fn<ProcessRunner>>;
  let controller: AbortController;
  let file: string;
  const previous = '{\n  // existing setup\n  "servers": {"other":{"command":"keep"},"vibeknowledge":{"command":"old"}}\n}';

  beforeEach(async () => {
    root = await mkdtemp(path.join(tmpdir(), 'vibeknowledge-mcp-test-'));
    const bundle = path.join(root, 'extension', 'dist', 'mcp-server');
    const workspace = path.join(root, '工程 & target');
    await mkdir(path.join(bundle, 'dist'), { recursive: true });
    await mkdir(path.join(workspace, '.vscode'), { recursive: true });
    await writeFile(path.join(bundle, 'package-lock.json'), '{"lockfileVersion":3}');
    await writeFile(path.join(bundle, 'package.json'), '{"name":"test"}');
    await writeFile(path.join(bundle, 'dist', 'index.js'), '// test');
    await writeFile(path.join(bundle, 'health-check.mjs'), '// test');
    await writeFile(path.join(root, 'npm-cli.js'), '// fake npm');
    file = path.join(workspace, '.vscode', 'mcp.json');
    await writeFile(file, previous);
    controller = new AbortController();
    options = {
      bundlePath: bundle, storagePath: path.join(root, 'storage'), workspacePath: workspace,
      nodePath: process.execPath, npmCliPath: path.join(root, 'npm-cli.js'), client: 'vscode',
      signal: controller.signal, log: vi.fn(), ensureDatabase: vi.fn(async () => {}),
    };
    run = vi.fn(async (_command, args) => {
      if (args[0] === '-p') return JSON.stringify({ version: 'v26.1.0', execPath: process.execPath, abi: '147', platform: process.platform, arch: process.arch });
      if (args.includes('--version')) return '11.19.0';
      return '';
    });
  });

  afterEach(async () => { await rm(root, { recursive: true, force: true }); });

  it('installs production dependencies, requires audit and handshake before writing config', async () => {
    const result = await setupMcp(options, run);
    expect(result).toBe(file);
    const commands = run.mock.calls.map(call => call[1]);
    expect(commands[2]).toEqual(expect.arrayContaining(['ci', '--omit=dev', '--audit', '--ignore-scripts']));
    expect(commands[2]).not.toContain('--foreground-scripts');
    expect(commands[3][0]).toMatch(/audit-dependencies\.cjs$/);
    expect(commands[3][1]).toBe(options.npmCliPath);
    expect(run.mock.calls[3][2].env?.VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS).toBe('60000');
    expect(run.mock.calls[3][2].timeoutMs).toBe(270000);
    expect(commands[4][0]).toMatch(/health-check\.mjs$/);
    expect(commands.flat().join(' ')).not.toMatch(/no-audit|powershell|run build/);
    for (const call of run.mock.calls.slice(2)) {
      expect(call[0]).toBe(process.execPath);
      expect(call[2].cwd.startsWith(options.storagePath)).toBe(true);
      expect(call[2].cwd).not.toBe(options.workspacePath);
    }
    const updated = await readFile(file, 'utf8');
    expect(updated).toContain('// existing setup');
    const entry = parse(updated).servers.vibeknowledge;
    expect(entry.command).toBe(process.execPath);
    expect(entry.args[0]).toContain(options.storagePath);
    expect(options.ensureDatabase).toHaveBeenCalledOnce();
    const backups = (await readdir(path.dirname(file))).filter(name => name.endsWith('.bak'));
    expect(backups).toHaveLength(1);
    expect(await readFile(path.join(path.dirname(file), backups[0]), 'utf8')).toBe(previous);
  });

  it.each(['install', 'audit', 'health'])('preserves previous configuration and removes only staging on %s failure', async stage => {
    const initial = run.getMockImplementation()!;
    run.mockImplementation(async (command, args, context) => {
      if ((stage === 'install' && args.includes('ci')) || (stage === 'audit' && args[0].endsWith('audit-dependencies.cjs')) || (stage === 'health' && args[0].endsWith('health-check.mjs'))) throw new Error(`${stage} failed`);
      return initial(command, args, context);
    });
    await mkdir(path.join(options.storagePath, 'previous-install'), { recursive: true });
    await expect(setupMcp(options, run)).rejects.toThrow(`${stage} failed`);
    expect(await readFile(file, 'utf8')).toBe(previous);
    expect(await readdir(options.storagePath)).toEqual(['previous-install']);
    if (stage !== 'health') expect(options.ensureDatabase).not.toHaveBeenCalled();
    if (stage === 'install') expect(run.mock.calls.some(([, args]) => args.includes('audit'))).toBe(false);
  });

  it('honors the configured audit timeout without the old five-minute cap', async () => {
    options.auditTimeoutSeconds = 120;
    await setupMcp(options, run);
    const auditOptions = run.mock.calls[3][2];
    expect(auditOptions.env?.VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS).toBe('120000');
    expect(auditOptions.timeoutMs).toBe(450000);
    expect(run.mock.calls[2][2].env?.VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS).toBe(process.env.VIBEKNOWLEDGE_AUDIT_TIMEOUT_MS);
  });

  it.each([0, 9, 121, 30.5, NaN])('rejects invalid audit timeout %s before running processes', async timeout => {
    options.auditTimeoutSeconds = timeout;
    await expect(setupMcp(options, run)).rejects.toThrow('auditTimeoutSeconds');
    expect(run).not.toHaveBeenCalled();
    expect(await readFile(file, 'utf8')).toBe(previous);
  });

  it('preserves concurrent client/user edits', async () => {
    const initial = run.getMockImplementation()!;
    run.mockImplementation(async (command, args, context) => {
      if (args[0].endsWith('health-check.mjs')) await writeFile(file, '{"servers":{"new":{"command":"user"}}}');
      return initial(command, args, context);
    });
    await expect(setupMcp(options, run)).rejects.toThrow('changed during setup');
    expect(parse(await readFile(file, 'utf8')).servers.new.command).toBe('user');
  });

  it('stops before publishing when cancelled', async () => {
    const initial = run.getMockImplementation()!;
    run.mockImplementation(async (command, args, context) => {
      if (args.includes('ci')) controller.abort();
      return initial(command, args, context);
    });
    await expect(setupMcp(options, run)).rejects.toThrow();
    expect(await readFile(file, 'utf8')).toBe(previous);
    expect(await readdir(options.storagePath)).toEqual([]);
  });

  it('rejects malformed config before executing processes', async () => {
    await writeFile(file, 'broken');
    await expect(setupMcp(options, run)).rejects.toThrow('invalid');
    expect(run).not.toHaveBeenCalled();
  });

  it('runs shell metacharacters as plain arguments and reports a failed process', async () => {
    const processOptions = { cwd: root, signal: controller.signal, log: vi.fn() };
    const result = await runProcess(process.execPath, ['-e', 'console.log(process.argv[1])', 'spaces & %PATH% | 中文'], processOptions);
    expect(result).toBe('spaces & %PATH% | 中文');
    await expect(runProcess(process.execPath, ['-e', 'process.exit(3)'], processOptions)).rejects.toThrow('code 3');
  });

  it('cancels a running process instead of leaving it behind', async () => {
    const log = vi.fn(() => controller.abort());
    await expect(runProcess(process.execPath, ['-e', 'console.log("ready");setInterval(()=>{},1000)'], {
      cwd: root, signal: controller.signal, log, timeoutMs: 5000,
    })).rejects.toThrow('cancelled');
    expect(log).toHaveBeenCalled();
  });
});
