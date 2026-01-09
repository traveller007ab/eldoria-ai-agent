/**
 * RingBuffer - Circular buffer for O(1) time series operations
 * Replaces array.shift() which is O(n), improving simulation performance
 */

export class RingBuffer<T> {
  private buffer: (T | null)[];
  private capacity: number;
  private head: number = 0;
  private tail: number = 0;
  private length: number = 0;

  constructor(capacity: number) {
    if (capacity <= 0) {
      throw new Error('RingBuffer capacity must be positive');
    }
    this.capacity = capacity;
    this.buffer = new Array(capacity);
    this.head = 0;
    this.tail = 0;
    this.length = 0;
  }

  push(item: T): void {
    if (this.isFull()) {
      this.buffer[this.tail] = item;
      this.tail = (this.tail + 1) % this.capacity;
      this.head = (this.head + 1) % this.capacity;
    } else {
      this.buffer[this.tail] = item;
      this.tail = (this.tail + 1) % this.capacity;
      this.length++;
    }
  }

  pop(): T | undefined {
    if (this.isEmpty()) {
      return undefined;
    }
    const item = this.buffer[this.head] ?? undefined;
    this.buffer[this.head] = null;
    this.head = (this.head + 1) % this.capacity;
    this.length--;
    return item;
  }

  unshift(item: T): void {
    if (this.isFull()) {
      this.tail = (this.tail - 1 + this.capacity) % this.capacity;
      this.buffer[this.tail] = this.buffer[(this.tail - 1 + this.capacity) % this.capacity] ?? null;
      this.buffer[(this.head - 1 + this.capacity) % this.capacity] = item;
    } else {
      this.head = (this.head - 1 + this.capacity) % this.capacity;
      this.buffer[this.head] = item;
      this.length++;
    }
  }

  shift(): T | undefined {
    return this.pop();
  }

  get(index: number): T | undefined {
    if (index < 0 || index >= this.length) {
      return undefined;
    }
    const actualIndex = (this.head + index) % this.capacity;
    return this.buffer[actualIndex] ?? undefined;
  }

  set(index: number, item: T): boolean {
    if (index < 0 || index >= this.length) {
      return false;
    }
    const actualIndex = (this.head + index) % this.capacity;
    this.buffer[actualIndex] = item;
    return true;
  }

  first(): T | undefined {
    return this.get(0);
  }

  last(): T | undefined {
    return this.get(this.length - 1);
  }

  toArray(): T[] {
    const result: T[] = [];
    for (let i = 0; i < this.length; i++) {
      const item = this.get(i);
      if (item !== undefined) {
        result.push(item);
      }
    }
    return result;
  }

  clear(): void {
    this.buffer = new Array(this.capacity);
    this.head = 0;
    this.tail = 0;
    this.length = 0;
  }

  resize(newCapacity: number): void {
    if (newCapacity <= 0) {
      throw new Error('RingBuffer capacity must be positive');
    }

    const items = this.toArray();
    this.buffer = new Array(newCapacity);
    this.capacity = newCapacity;
    this.head = 0;
    this.tail = Math.min(items.length, newCapacity);
    this.length = Math.min(items.length, newCapacity);

    for (let i = 0; i < this.length; i++) {
      this.buffer[i] = items[i];
    }
  }

  isEmpty(): boolean {
    return this.length === 0;
  }

  isFull(): boolean {
    return this.length === this.capacity;
  }

  getCapacity(): number {
    return this.capacity;
  }

  getLength(): number {
    return this.length;
  }

  [Symbol.iterator](): Iterator<T> {
    let index = 0;
    return {
      next: (): IteratorResult<T> => {
        if (index < this.length) {
          const item = this.get(index);
          index++;
          return { done: false, value: item as T };
        }
        return { done: true, value: undefined as any };
      }
    };
  }
}

export class TimeSeriesRingBuffer {
  private timestamps: RingBuffer<number>;
  private dataMap: Map<string, RingBuffer<number>>;
  private maxPoints: number;

  constructor(maxPoints: number = 10000) {
    this.maxPoints = maxPoints;
    this.timestamps = new RingBuffer<number>(maxPoints);
    this.dataMap = new Map();
  }

  push(timestamp: number, values: Record<string, number>): void {
    this.timestamps.push(timestamp);

    for (const [key, value] of Object.entries(values)) {
      if (!this.dataMap.has(key)) {
        this.dataMap.set(key, new RingBuffer<number>(this.maxPoints));
      }
      this.dataMap.get(key)!.push(value);
    }

    while (this.timestamps.getLength() > this.maxPoints) {
      this.timestamps.shift();
      for (const buffer of this.dataMap.values()) {
        buffer.shift();
      }
    }
  }

  getTimestamps(): number[] {
    return this.timestamps.toArray();
  }

  getSeries(key: string): number[] | undefined {
    const buffer = this.dataMap.get(key);
    return buffer?.toArray();
  }

  getAllSeries(): Record<string, number[]> {
    const result: Record<string, number[]> = {};
    for (const [key, buffer] of this.dataMap) {
      result[key] = buffer.toArray();
    }
    return result;
  }

  getLatest(key: string): number | undefined {
    return this.dataMap.get(key)?.last();
  }

  getValueAt(key: string, index: number): number | undefined {
    return this.dataMap.get(key)?.get(index);
  }

  clear(): void {
    this.timestamps.clear();
    this.dataMap.clear();
  }

  getLength(): number {
    return this.timestamps.getLength();
  }

  getKeys(): string[] {
    return Array.from(this.dataMap.keys());
  }
}
