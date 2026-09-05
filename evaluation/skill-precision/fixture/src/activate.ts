import type { Host, Store } from './host';
import { ShelfExporter } from './exporter';
import { ShelfCommands, type ShelfState } from './commands';

export function activate(host: Host, store: Store, state: ShelfState): void {
  if (!host.workspace) {
    host.register('shelf.export', async () => { host.notify('Open a project and reload'); });
    return;
  }
  const commands = new ShelfCommands(host, new ShelfExporter(store), state);
  host.register('shelf.export', () => commands.export());
  host.register('shelf.preview', async () => { host.notify(commands.preview()); });
}
