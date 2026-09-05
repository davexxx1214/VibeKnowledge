import type { Host } from './host';
import { ShelfExporter } from './exporter';
import type { Preferences } from './preferences';

export interface ShelfState { items: string[]; preferences: Preferences }

export class ShelfCommands {
  constructor(private host: Host, private exporter: ShelfExporter, private state: ShelfState) {}

  async export(): Promise<void> {
    const root = this.host.workspace;
    if (!root) { this.host.notify('Choose a workspace'); return; }
    try {
      const path = await this.exporter.save(root, this.state.items, this.state.preferences);
      this.host.notify('Export complete');
      if (this.state.preferences.autoOpen) await this.host.reveal(path);
    } catch {
      this.host.notify('Export failed');
    }
  }

  preview(): string {
    return this.exporter.render(this.state.items, this.state.preferences);
  }
}
