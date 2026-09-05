export interface Host {
  workspace?: string;
  register(id: string, handler: () => Promise<void>): void;
  notify(message: string): void;
  reveal(path: string): Promise<void>;
}
export interface Store {
  write(path: string, content: string): Promise<void>;
  appendIndex(path: string): Promise<void>;
}
