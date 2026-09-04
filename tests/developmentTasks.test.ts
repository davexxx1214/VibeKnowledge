import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

interface DevelopmentTask {
  label: string;
  type: string;
  command: string;
  args: string[];
  options: { cwd: string; shell?: unknown };
  windows: {
    command: string;
    options: { shell: { executable: string; args: string[] } };
  };
  group: string | { kind: string; isDefault?: boolean };
}

const { tasks } = JSON.parse(
  readFileSync(resolve('.vscode/tasks.json'), 'utf8')
) as { tasks: DevelopmentTask[] };
const { configurations } = JSON.parse(
  readFileSync(resolve('.vscode/launch.json'), 'utf8')
) as { configurations: { preLaunchTask: string }[] };

describe('development tasks', () => {
  it.each(['compile', 'watch'])('runs %s through CMD on Windows', (script) => {
    const task = tasks.find((candidate) => candidate.label === `npm: ${script}`);
    expect(task).toMatchObject({
      type: 'shell',
      args: ['run', script],
      options: { cwd: '${workspaceFolder}' },
      windows: {
        command: 'npm.cmd',
        options: {
          shell: {
            executable: '${env:windir}\\System32\\cmd.exe',
            args: ['/d', '/c'],
          },
        },
      },
    });
  });

  it('keeps F5 attached to the configured default compile task', () => {
    const defaults = tasks.filter((task) => (
      typeof task.group !== 'string' && task.group.isDefault
    ));
    expect(defaults).toHaveLength(1);
    expect(defaults[0].label).toBe('npm: compile');
    expect(defaults[0].group).toMatchObject({ kind: 'build' });
    expect(configurations.length).toBeGreaterThan(0);
    for (const configuration of configurations) {
      expect(configuration.preLaunchTask).toBe('${defaultBuildTask}');
    }
  });

  it('does not force CMD on non-Windows platforms', () => {
    for (const task of tasks) {
      expect(task.command).toBe('npm');
      expect(task.options.shell).toBeUndefined();
    }
  });
});
