import type { Store } from './host';

export interface Transport { put(key: string, body: string): Promise<void>; append(key: string): Promise<void> }

export class RemoteStore implements Store {
  constructor(private transport: Transport) {}
  async write(path: string, content: string): Promise<void> {
    await this.transport.put(path, content);
  }
  async appendIndex(path: string): Promise<void> {
    await this.transport.append(path);
  }
}
