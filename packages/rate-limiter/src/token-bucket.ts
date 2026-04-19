/**
 * Token bucket rate limiter for controlling throughput.
 *
 * Allows bursts up to a configured capacity, then refills tokens at a steady
 * rate. Pending callers queue in FIFO order and support cancellation via
 * AbortSignal or timeout.
 */

/** Full configuration for the token bucket. */
export interface TokenBucketOptions {
  /** Maximum tokens the bucket can hold (burst capacity). */
  readonly capacity: number;
  /** Tokens added per interval. */
  readonly refillRate: number;
  /** Refill interval in milliseconds. Default: `1000`. */
  readonly interval?: number | undefined;
}

/** Shorthand that sets capacity and refillRate to the given value with a 1-second interval. */
export interface RateLimiterOptions {
  /** Requests allowed per second. Sets both capacity and refillRate. */
  readonly requestsPerSecond: number;
}

/** Options for a single `acquire()` call. */
export interface AcquireOptions {
  /** Number of tokens to consume. Default: `1`. */
  readonly cost?: number | undefined;
  /** Abort signal for cancellation. Rejects with `AbortError` when triggered. */
  readonly signal?: AbortSignal | undefined;
  /** Timeout in milliseconds. Rejects with `TokenBucketTimeoutError` if exceeded. */
  readonly timeout?: number | undefined;
}

export class TokenBucketTimeoutError extends Error {
  public override readonly name = 'TokenBucketTimeoutError' as const;

  constructor() {
    super('Token bucket acquire timed out');
  }
}

interface QueueEntry {
  readonly cost: number;
  readonly resolve: () => void;
  readonly reject: (reason: unknown) => void;
  signal?: AbortSignal | undefined;
  abortHandler?: (() => void) | undefined;
  timeoutId?: ReturnType<typeof setTimeout> | undefined;
}

function isRateLimiterOptions(
  options: TokenBucketOptions | RateLimiterOptions,
): options is RateLimiterOptions {
  return 'requestsPerSecond' in options;
}

export class TokenBucket {
  private readonly capacity: number;
  private readonly tokensPerMs: number;
  private readonly msPerToken: number;
  private tokens: number;
  private lastRefillTime: number;
  private readonly queue: Array<QueueEntry> = [];
  private refillTimerId: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;

  constructor(options: TokenBucketOptions | RateLimiterOptions) {
    let intervalMs: number;

    if (isRateLimiterOptions(options)) {
      if (options.requestsPerSecond <= 0) {
        throw new Error('requestsPerSecond must be positive');
      }
      this.capacity = Math.max(1, options.requestsPerSecond);
      intervalMs = 1000;
      this.tokensPerMs = options.requestsPerSecond / intervalMs;
    } else {
      if (options.capacity <= 0) {
        throw new Error('capacity must be positive');
      }
      if (options.refillRate <= 0) {
        throw new Error('refillRate must be positive');
      }
      if (options.interval !== undefined && options.interval <= 0) {
        throw new Error('interval must be positive');
      }
      this.capacity = options.capacity;
      intervalMs = options.interval ?? 1000;
      this.tokensPerMs = options.refillRate / intervalMs;
    }

    this.msPerToken = 1 / this.tokensPerMs;
    this.tokens = this.capacity;
    this.lastRefillTime = Date.now();
  }

  public acquire(options?: AcquireOptions): Promise<void> {
    this.assertNotDisposed();

    const cost = options?.cost ?? 1;

    if (!(cost > 0)) {
      throw new Error('cost must be positive');
    }

    if (cost > this.capacity) {
      throw new Error(
        `cost (${cost}) exceeds capacity (${this.capacity}) and can never be satisfied`,
      );
    }

    if (options?.signal?.aborted) {
      return Promise.reject(options.signal.reason ?? new DOMException('Aborted', 'AbortError'));
    }

    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return Promise.resolve();
    }

    return new Promise<void>((resolve, reject) => {
      const entry: QueueEntry = { cost, resolve, reject };

      if (options?.signal) {
        const signal = options.signal;
        entry.signal = signal;
        entry.abortHandler = () => {
          this.removeFromQueue(entry);
          this.cleanupEntry(entry);
          reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
        };
        signal.addEventListener('abort', entry.abortHandler, { once: true });
      }

      if (options?.timeout !== undefined) {
        if (options.timeout <= 0) {
          this.cleanupEntry(entry);
          reject(new TokenBucketTimeoutError());
          return;
        }

        entry.timeoutId = setTimeout(() => {
          this.removeFromQueue(entry);
          this.cleanupEntry(entry);
          reject(new TokenBucketTimeoutError());
        }, options.timeout);
      }

      this.queue.push(entry);
      this.scheduleRefill();
    });
  }

  public tryAcquire(cost = 1): boolean {
    this.assertNotDisposed();

    if (!(cost > 0)) {
      throw new Error('cost must be positive');
    }

    this.refill();

    if (this.tokens >= cost) {
      this.tokens -= cost;
      return true;
    }

    return false;
  }

  public get availableTokens(): number {
    this.refill();
    return this.tokens;
  }

  public get pendingCount(): number {
    return this.queue.length;
  }

  public dispose(): void {
    if (this.disposed) {
      return;
    }
    this.disposed = true;
    this.clearTimer();
    this.rejectAllPending();
  }

  public reset(): void {
    this.clearTimer();
    this.rejectAllPending();
    this.tokens = this.capacity;
    this.lastRefillTime = Date.now();
    this.disposed = false;
  }

  private assertNotDisposed(): void {
    if (this.disposed) {
      throw new Error('TokenBucket has been disposed');
    }
  }

  private refill(): void {
    const now = Date.now();
    const elapsed = now - this.lastRefillTime;

    if (elapsed > 0) {
      this.tokens = Math.min(this.tokens + elapsed * this.tokensPerMs, this.capacity);
      this.lastRefillTime = now;
    }
  }

  private scheduleRefill(): void {
    if (this.refillTimerId !== undefined) {
      return;
    }

    this.refillTimerId = setTimeout(() => {
      this.refillTimerId = undefined;
      this.refill();
      this.drainQueue();

      if (this.queue.length > 0) {
        this.scheduleRefill();
      }
    }, this.msPerToken);
  }

  private drainQueue(): void {
    while (this.queue.length > 0) {
      const entry = this.queue[0]!;
      if (this.tokens < entry.cost) {
        break;
      }

      this.queue.shift();
      this.tokens -= entry.cost;
      this.cleanupEntry(entry);
      entry.resolve();
    }
  }

  private removeFromQueue(entry: QueueEntry): void {
    const index = this.queue.indexOf(entry);
    if (index !== -1) {
      this.queue.splice(index, 1);
    }
  }

  private cleanupEntry(entry: QueueEntry): void {
    if (entry.timeoutId !== undefined) {
      clearTimeout(entry.timeoutId);
      entry.timeoutId = undefined;
    }
    if (entry.signal && entry.abortHandler) {
      entry.signal.removeEventListener('abort', entry.abortHandler);
      entry.signal = undefined;
      entry.abortHandler = undefined;
    }
  }

  private clearTimer(): void {
    if (this.refillTimerId !== undefined) {
      clearTimeout(this.refillTimerId);
      this.refillTimerId = undefined;
    }
  }

  private rejectAllPending(): void {
    const reason = new DOMException('Aborted', 'AbortError');
    const entries = this.queue.splice(0);
    for (const entry of entries) {
      this.cleanupEntry(entry);
      entry.reject(reason);
    }
  }
}
