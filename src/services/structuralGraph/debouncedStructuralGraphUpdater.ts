export type StructuralGraphUpdateCallback = (
  changedPaths: readonly string[]
) => void | Promise<void>;

/** Coalesces rapid source events and serializes background graph updates. */
export class DebouncedStructuralGraphUpdater {
  private readonly changedPaths = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<void> = Promise.resolve();
  private disposed = false;

  constructor(
    private readonly callback: StructuralGraphUpdateCallback,
    private readonly delayMs = 500
  ) {}

  public notify(filePath: string): void {
    if (this.disposed) {
      return;
    }
    this.changedPaths.add(filePath);
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = undefined;
      void this.flush();
    }, this.delayMs);
  }

  public flush(): Promise<void> {
    if (this.disposed || this.changedPaths.size === 0) {
      return this.running;
    }
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
    const paths = [...this.changedPaths].sort((left, right) =>
      left.localeCompare(right, 'en')
    );
    this.changedPaths.clear();
    this.running = this.running
      .catch(() => undefined)
      .then(() => this.callback(paths));
    return this.running;
  }

  public dispose(): void {
    this.disposed = true;
    this.changedPaths.clear();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = undefined;
    }
  }
}
