interface Timestamped {
  serverTime: number;
}

export class JitterBuffer<T extends Timestamped> {
  private readonly items: T[] = [];

  constructor(private readonly delayMs = 100, private readonly capacity = 12) {}

  push(item: T): void {
    this.items.push(item);
    this.items.sort((a, b) => a.serverTime - b.serverTime);
    while (this.items.length > this.capacity) this.items.shift();
  }

  take(now: number): T | null {
    const deadline = now - this.delayMs;
    if (this.items.length === 0 || this.items[0].serverTime > deadline) return null;
    let latest: T | null = null;
    while (this.items.length > 0 && this.items[0].serverTime <= deadline) {
      latest = this.items.shift() as T;
    }
    return latest;
  }

  reset(): void {
    this.items.length = 0;
  }
}
