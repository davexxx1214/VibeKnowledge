import { afterEach, describe, expect, it, vi } from 'vitest';
import { DebouncedStructuralGraphUpdater } from './debouncedStructuralGraphUpdater';

afterEach(() => {
  vi.useRealTimers();
});

describe('DebouncedStructuralGraphUpdater', () => {
  it('coalesces duplicate paths and resets the debounce window', async () => {
    vi.useFakeTimers();
    const updates: string[][] = [];
    const updater = new DebouncedStructuralGraphUpdater((paths) => {
      updates.push([...paths]);
    }, 100);

    updater.notify('src/b.ts');
    await vi.advanceTimersByTimeAsync(75);
    updater.notify('src/a.ts');
    updater.notify('src/b.ts');
    await vi.advanceTimersByTimeAsync(99);
    expect(updates).toEqual([]);

    await vi.advanceTimersByTimeAsync(1);
    await updater.flush();
    expect(updates).toEqual([['src/a.ts', 'src/b.ts']]);
    updater.dispose();
  });

  it('serializes updates that arrive during an active callback', async () => {
    const resolvers: Array<() => void> = [];
    const updates: string[][] = [];
    const updater = new DebouncedStructuralGraphUpdater(async (paths) => {
      updates.push([...paths]);
      await new Promise<void>((resolve) => resolvers.push(resolve));
    }, 10_000);

    updater.notify('src/first.ts');
    const first = updater.flush();
    updater.notify('src/second.ts');
    const second = updater.flush();
    await Promise.resolve();
    await Promise.resolve();
    expect(updates).toEqual([['src/first.ts']]);

    resolvers.shift()!();
    await first;
    await Promise.resolve();
    await Promise.resolve();
    expect(updates).toEqual([['src/first.ts'], ['src/second.ts']]);
    resolvers.shift()!();
    await second;
    updater.dispose();
  });
});
