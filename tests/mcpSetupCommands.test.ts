import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  commands: new Map<string, () => Promise<void>>(),
  trusted: true,
  setup: vi.fn(),
  quickPick: vi.fn(),
  info: vi.fn(),
  warning: vi.fn(),
  update: vi.fn(),
  execute: vi.fn(),
}));
vi.mock('vscode', () => ({
  workspace: {
    get isTrusted() { return mocks.trusted; },
    getConfiguration: () => ({
      get: (key: string, fallback: unknown) => key === 'workspacePath' ? 'D:\\target-project' : fallback,
      update: mocks.update,
    }),
  },
  window: {
    createOutputChannel: () => ({ append: vi.fn(), appendLine: vi.fn(), clear: vi.fn(), show: vi.fn(), dispose: vi.fn() }),
    showQuickPick: mocks.quickPick,
    showInformationMessage: mocks.info,
    showWarningMessage: mocks.warning,
  },
  commands: {
    registerCommand: (name: string, callback: () => Promise<void>) => { mocks.commands.set(name, callback); return { dispose() {} }; },
    executeCommand: mocks.execute,
  },
  env: { appName: 'Visual Studio Code' },
  ConfigurationTarget: { Global: 1 },
}));
vi.mock('../src/services/mcpSetupService', () => ({ setupMcp: mocks.setup }));
vi.mock('../src/services/database', () => ({ DatabaseService: vi.fn() }));

import { registerMcpSetupCommands } from '../src/commands/mcpSetupCommands';
import type * as vscode from 'vscode';

describe('MCP settings UI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.commands.clear();
    mocks.trusted = true;
    registerMcpSetupCommands({ subscriptions: [] } as unknown as vscode.ExtensionContext);
  });

  it('registers real settings and setup commands without an open workspace or database', () => {
    expect([...mocks.commands.keys()]).toEqual(['knowledge.setupMcp', 'knowledge.settings']);
    expect(mocks.setup).not.toHaveBeenCalled();
  });

  it('blocks installation in untrusted workspaces', async () => {
    mocks.trusted = false;
    await mocks.commands.get('knowledge.setupMcp')!();
    expect(mocks.warning).toHaveBeenCalledOnce();
    expect(mocks.setup).not.toHaveBeenCalled();
    expect(mocks.update).not.toHaveBeenCalled();
  });

  it('opens native MCP settings from the menu', async () => {
    mocks.quickPick.mockResolvedValue({ action: 'mcp' });
    await mocks.commands.get('knowledge.settings')!();
    expect(mocks.execute).toHaveBeenCalledWith('workbench.action.openSettings', 'knowledgeGraph.mcp');
  });
});
