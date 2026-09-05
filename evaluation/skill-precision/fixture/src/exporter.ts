import { formatTag, type Preferences } from './preferences';
import type { Store } from './host';

export class ShelfExporter {
  constructor(private readonly store: Store) {}

  render(items: readonly string[], preferences: Preferences): string {
    const tag = formatTag(preferences);
    return tag === 'json' ? JSON.stringify({ items }) : items.join('\n');
  }

  async save(root: string, items: readonly string[], preferences: Preferences): Promise<string> {
    const path = `${root}/shelf-export.txt`;
    await this.store.write(path, this.render(items, preferences));
    await this.store.appendIndex(path);
    return path;
  }
}
