import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { TokenBucket, TokenBucketTimeoutError } from './token-bucket.js';

describe('TokenBucket', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create from requestsPerSecond shorthand', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(bucket).toBeInstanceOf(TokenBucket);
      expect(bucket.availableTokens).toBe(3);
    });

    it('should create from requestsPerSecond with high rate', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10 });
      expect(bucket.availableTokens).toBe(10);
    });

    it('should create from requestsPerSecond with fractional rate', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 0.5 });
      expect(bucket.availableTokens).toBe(1);
    });

    it('should create from full options', () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 2, interval: 500 });
      expect(bucket.availableTokens).toBe(5);
    });

    it('should default interval to 1000ms when omitted', () => {
      const bucket = new TokenBucket({ capacity: 3, refillRate: 3 });
      expect(bucket.availableTokens).toBe(3);
    });

    it('should throw on requestsPerSecond <= 0', () => {
      expect(() => new TokenBucket({ requestsPerSecond: 0 })).toThrow(
        'requestsPerSecond must be positive',
      );
      expect(() => new TokenBucket({ requestsPerSecond: -1 })).toThrow(
        'requestsPerSecond must be positive',
      );
    });

    it('should throw on capacity <= 0', () => {
      expect(() => new TokenBucket({ capacity: 0, refillRate: 1 })).toThrow(
        'capacity must be positive',
      );
      expect(() => new TokenBucket({ capacity: -5, refillRate: 1 })).toThrow(
        'capacity must be positive',
      );
    });

    it('should throw on refillRate <= 0', () => {
      expect(() => new TokenBucket({ capacity: 5, refillRate: 0 })).toThrow(
        'refillRate must be positive',
      );
      expect(() => new TokenBucket({ capacity: 5, refillRate: -1 })).toThrow(
        'refillRate must be positive',
      );
    });

    it('should throw on interval <= 0', () => {
      expect(() => new TokenBucket({ capacity: 5, refillRate: 1, interval: 0 })).toThrow(
        'interval must be positive',
      );
      expect(() => new TokenBucket({ capacity: 5, refillRate: 1, interval: -100 })).toThrow(
        'interval must be positive',
      );
    });
  });

  describe('acquire — basic behavior', () => {
    it('should resolve immediately when tokens available', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      await expect(bucket.acquire()).resolves.toBeUndefined();
    });

    it('should allow burst up to capacity', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      await bucket.acquire();
      await bucket.acquire();
      await bucket.acquire();
      expect(bucket.availableTokens).toBe(0);
    });

    it('should queue when tokens exhausted', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      await bucket.acquire();
      await bucket.acquire();
      await bucket.acquire();

      const promise = bucket.acquire();
      expect(bucket.pendingCount).toBe(1);

      await vi.runAllTimersAsync();
      await promise;
    });

    it('should process queue in FIFO order', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const order: Array<number> = [];
      const p1 = bucket.acquire().then(() => {
        order.push(1);
      });
      const p2 = bucket.acquire().then(() => {
        order.push(2);
      });
      const p3 = bucket.acquire().then(() => {
        order.push(3);
      });

      await vi.runAllTimersAsync();
      await Promise.all([p1, p2, p3]);

      expect(order).toEqual([1, 2, 3]);
    });

    it('should refill tokens over time', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      await bucket.acquire();
      await bucket.acquire();
      await bucket.acquire();

      await vi.advanceTimersByTimeAsync(1000);
      expect(bucket.availableTokens).toBe(3);

      await bucket.acquire();
      await bucket.acquire();
      await bucket.acquire();
    });

    it('should handle concurrent acquires', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      const promises = Array.from({ length: 6 }, () => bucket.acquire());

      await vi.runAllTimersAsync();
      await expect(Promise.all(promises)).resolves.toBeDefined();
    });

    it('should not exceed capacity during refill', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      await vi.advanceTimersByTimeAsync(5000);
      expect(bucket.availableTokens).toBeLessThanOrEqual(3);
    });

    it('should credit fractional tokens for sub-integer refill periods', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      await bucket.acquire({ cost: 3 });
      expect(bucket.availableTokens).toBe(0);

      // 200ms at 3 tokens/s = 0.6 tokens — enough for cost 0.5
      await vi.advanceTimersByTimeAsync(200);
      expect(bucket.availableTokens).toBeCloseTo(0.6, 1);
      expect(bucket.tryAcquire(0.5)).toBe(true);
    });
  });

  describe('acquire — weighted cost', () => {
    it('should consume multiple tokens at once', async () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 10 });
      await bucket.acquire({ cost: 3 });
      expect(bucket.availableTokens).toBe(7);
    });

    it('should queue if cost > available but cost <= capacity', async () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 5 });
      await bucket.acquire({ cost: 4 });

      const promise = bucket.acquire({ cost: 3 });
      expect(bucket.pendingCount).toBe(1);

      await vi.runAllTimersAsync();
      await promise;
    });

    it('should throw immediately if cost > capacity', () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 5 });
      expect(() => bucket.acquire({ cost: 6 })).toThrow(
        'cost (6) exceeds capacity (5) and can never be satisfied',
      );
    });

    it('should default cost to 1', async () => {
      const bucket = new TokenBucket({ capacity: 3, refillRate: 3 });
      await bucket.acquire();
      expect(bucket.availableTokens).toBe(2);
    });

    it('should support fractional cost', async () => {
      const bucket = new TokenBucket({ capacity: 3, refillRate: 3 });
      await bucket.acquire({ cost: 0.5 });
      expect(bucket.availableTokens).toBe(2.5);
    });

    it('should drain proportionally with multiple weighted acquires', async () => {
      const bucket = new TokenBucket({ capacity: 10, refillRate: 10 });
      await bucket.acquire({ cost: 3 });
      await bucket.acquire({ cost: 4 });
      await bucket.acquire({ cost: 2 });
      expect(bucket.availableTokens).toBe(1);
    });

    it('should process queued weighted requests in order', async () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 5 });
      await bucket.acquire({ cost: 5 });

      const order: Array<number> = [];
      const p1 = bucket.acquire({ cost: 2 }).then(() => {
        order.push(1);
      });
      const p2 = bucket.acquire({ cost: 1 }).then(() => {
        order.push(2);
      });

      await vi.runAllTimersAsync();
      await Promise.all([p1, p2]);
      expect(order).toEqual([1, 2]);
    });

    it('should throw on negative cost', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(() => bucket.acquire({ cost: -1 })).toThrow('cost must be positive');
    });

    it('should throw on zero cost', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(() => bucket.acquire({ cost: 0 })).toThrow('cost must be positive');
    });

    it('should throw on NaN cost', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(() => bucket.acquire({ cost: NaN })).toThrow('cost must be positive');
    });
  });

  describe('acquire — AbortSignal', () => {
    it('should reject with AbortError when signal fires while queued', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const controller = new AbortController();
      const promise = bucket.acquire({ signal: controller.signal });
      expect(bucket.pendingCount).toBe(1);

      controller.abort();

      await expect(promise).rejects.toThrow();
      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
      expect(bucket.pendingCount).toBe(0);
    });

    it('should remove aborted entry from queue without blocking others', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const controller = new AbortController();
      const abortedPromise = bucket.acquire({ signal: controller.signal });
      const normalPromise = bucket.acquire();

      controller.abort();
      await expect(abortedPromise).rejects.toMatchObject({ name: 'AbortError' });

      expect(bucket.pendingCount).toBe(1);

      await vi.runAllTimersAsync();
      await normalPromise;
    });

    it('should reject immediately with already-aborted signal', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      const controller = new AbortController();
      controller.abort();

      await expect(bucket.acquire({ signal: controller.signal })).rejects.toMatchObject({
        name: 'AbortError',
      });
      expect(bucket.pendingCount).toBe(0);
    });

    it('should not affect other queued acquires', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const order: Array<string> = [];
      const controller = new AbortController();

      const p1 = bucket.acquire().then(() => {
        order.push('first');
      });
      const p2 = bucket.acquire({ signal: controller.signal }).catch(() => {
        order.push('aborted');
      });
      const p3 = bucket.acquire().then(() => {
        order.push('third');
      });

      controller.abort();
      await p2;

      await vi.runAllTimersAsync();
      await Promise.all([p1, p3]);

      expect(order).toEqual(['aborted', 'first', 'third']);
    });

    it('should use custom abort reason when provided', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const controller = new AbortController();
      const promise = bucket.acquire({ signal: controller.signal });

      controller.abort(new Error('custom reason'));

      await expect(promise).rejects.toThrow('custom reason');
    });
  });

  describe('acquire — timeout', () => {
    it('should reject with TokenBucketTimeoutError after timeout', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      let caught: unknown;
      const promise = bucket.acquire({ timeout: 100 }).catch((error: unknown) => {
        caught = error;
      });

      await vi.advanceTimersByTimeAsync(100);
      await promise;

      expect(caught).toBeInstanceOf(TokenBucketTimeoutError);
      expect(bucket.pendingCount).toBe(0);
    });

    it('should remove from queue on timeout', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      let caught: unknown;
      const timedOut = bucket.acquire({ timeout: 50 }).catch((error: unknown) => {
        caught = error;
      });
      const normal = bucket.acquire();

      expect(bucket.pendingCount).toBe(2);

      await vi.advanceTimersByTimeAsync(50);
      await timedOut;
      expect(caught).toBeInstanceOf(TokenBucketTimeoutError);
      expect(bucket.pendingCount).toBe(1);

      await vi.runAllTimersAsync();
      await normal;
    });

    it('should resolve normally if tokens arrive before timeout', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10 });
      await bucket.acquire({ cost: 10 });

      const promise = bucket.acquire({ timeout: 5000 });

      await vi.advanceTimersByTimeAsync(200);
      await promise;
    });

    it('should reject immediately with timeout 0 when no tokens available', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      await expect(bucket.acquire({ timeout: 0 })).rejects.toBeInstanceOf(TokenBucketTimeoutError);
      expect(bucket.pendingCount).toBe(0);
    });

    it('should not affect other queued acquires when timing out', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const order: Array<string> = [];
      const p1 = bucket.acquire().then(() => {
        order.push('first');
      });
      const p2 = bucket.acquire({ timeout: 50 }).catch(() => {
        order.push('timed-out');
      });
      const p3 = bucket.acquire().then(() => {
        order.push('third');
      });

      await vi.advanceTimersByTimeAsync(50);
      await p2;

      await vi.runAllTimersAsync();
      await Promise.all([p1, p3]);

      expect(order).toEqual(['timed-out', 'first', 'third']);
    });
  });

  describe('tryAcquire', () => {
    it('should return true and consume token when available', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(bucket.tryAcquire()).toBe(true);
      expect(bucket.availableTokens).toBe(2);
    });

    it('should return false when insufficient tokens', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      expect(bucket.tryAcquire()).toBe(true);
      expect(bucket.tryAcquire()).toBe(false);
    });

    it('should support weighted cost', () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 5 });
      expect(bucket.tryAcquire(3)).toBe(true);
      expect(bucket.availableTokens).toBe(2);
      expect(bucket.tryAcquire(3)).toBe(false);
    });

    it('should not affect the queue', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const queued = bucket.acquire();
      expect(bucket.pendingCount).toBe(1);

      expect(bucket.tryAcquire()).toBe(false);
      expect(bucket.pendingCount).toBe(1);

      await vi.runAllTimersAsync();
      await queued;
    });

    it('should trigger refill before checking', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      bucket.tryAcquire();
      bucket.tryAcquire();
      bucket.tryAcquire();
      expect(bucket.tryAcquire()).toBe(false);

      await vi.advanceTimersByTimeAsync(1000);
      expect(bucket.tryAcquire()).toBe(true);
    });

    it('should default cost to 1', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      bucket.tryAcquire();
      expect(bucket.availableTokens).toBe(2);
    });

    it('should throw on negative cost', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(() => bucket.tryAcquire(-1)).toThrow('cost must be positive');
    });

    it('should throw on zero cost', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(() => bucket.tryAcquire(0)).toThrow('cost must be positive');
    });

    it('should throw on NaN cost', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(() => bucket.tryAcquire(NaN)).toThrow('cost must be positive');
    });
  });

  describe('availableTokens getter', () => {
    it('should return capacity on fresh instance', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 5 });
      expect(bucket.availableTokens).toBe(5);
    });

    it('should decrease after acquire', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 5 });
      await bucket.acquire();
      expect(bucket.availableTokens).toBe(4);
    });

    it('should reflect refill over time', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 5 });
      await bucket.acquire({ cost: 5 });
      expect(bucket.availableTokens).toBe(0);

      await vi.advanceTimersByTimeAsync(1000);
      expect(bucket.availableTokens).toBe(5);
    });
  });

  describe('pendingCount getter', () => {
    it('should return 0 on fresh instance', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      expect(bucket.pendingCount).toBe(0);
    });

    it('should increase when acquires queue', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      bucket.acquire();
      expect(bucket.pendingCount).toBe(1);

      bucket.acquire();
      expect(bucket.pendingCount).toBe(2);

      await vi.runAllTimersAsync();
    });

    it('should decrease as queue drains', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const p1 = bucket.acquire();
      const p2 = bucket.acquire();
      expect(bucket.pendingCount).toBe(2);

      await vi.runAllTimersAsync();
      await Promise.all([p1, p2]);
      expect(bucket.pendingCount).toBe(0);
    });

    it('should return 0 after dispose', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const promise = bucket.acquire().catch(() => {});
      expect(bucket.pendingCount).toBe(1);

      bucket.dispose();
      await promise;
      expect(bucket.pendingCount).toBe(0);
    });
  });

  describe('dispose', () => {
    it('should reject all pending acquires with AbortError', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const p1 = bucket.acquire();
      const p2 = bucket.acquire();

      bucket.dispose();

      await expect(p1).rejects.toMatchObject({ name: 'AbortError' });
      await expect(p2).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('should make subsequent acquire throw', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      bucket.dispose();
      expect(() => bucket.acquire()).toThrow('TokenBucket has been disposed');
    });

    it('should make subsequent tryAcquire throw', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      bucket.dispose();
      expect(() => bucket.tryAcquire()).toThrow('TokenBucket has been disposed');
    });

    it('should be a no-op when called twice', () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      bucket.dispose();
      expect(() => bucket.dispose()).not.toThrow();
    });

    it('should clear the internal timer', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      bucket.acquire().catch(() => {});

      bucket.dispose();

      const timerCount = vi.getTimerCount();
      expect(timerCount).toBe(0);
    });
  });

  describe('reset', () => {
    it('should restore tokens to capacity', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 5 });
      await bucket.acquire({ cost: 5 });
      expect(bucket.availableTokens).toBe(0);

      bucket.reset();
      expect(bucket.availableTokens).toBe(5);
    });

    it('should reject all pending acquires with AbortError', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const p1 = bucket.acquire();
      const p2 = bucket.acquire();

      bucket.reset();

      await expect(p1).rejects.toMatchObject({ name: 'AbortError' });
      await expect(p2).rejects.toMatchObject({ name: 'AbortError' });
    });

    it('should remain usable after reset', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      bucket.dispose();
      bucket.reset();

      await bucket.acquire();
      expect(bucket.availableTokens).toBe(2);
    });

    it('should clear the internal timer', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      bucket.acquire().catch(() => {});

      bucket.reset();
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should work normally for new acquires after reset', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 3 });
      await bucket.acquire();
      await bucket.acquire();
      await bucket.acquire();

      bucket.reset();

      await bucket.acquire();
      await bucket.acquire();
      await bucket.acquire();
      expect(bucket.availableTokens).toBe(0);
    });
  });

  describe('edge cases', () => {
    it('should handle very low rate (1 request per 10 seconds)', async () => {
      const bucket = new TokenBucket({ capacity: 1, refillRate: 1, interval: 10_000 });
      await bucket.acquire();

      const promise = bucket.acquire();
      expect(bucket.pendingCount).toBe(1);

      await vi.advanceTimersByTimeAsync(10_000);
      await promise;
    });

    it('should handle very high rate', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 10000 });
      for (let index = 0; index < 10000; index++) {
        await bucket.acquire();
      }
      expect(bucket.availableTokens).toBe(0);
    });

    it('should handle sub-second intervals', async () => {
      const bucket = new TokenBucket({ capacity: 5, refillRate: 10, interval: 100 });
      await bucket.acquire({ cost: 5 });

      await vi.advanceTimersByTimeAsync(100);
      expect(bucket.availableTokens).toBe(5);
    });

    it('should handle rapid acquire/dispose cycles', () => {
      for (let index = 0; index < 100; index++) {
        const bucket = new TokenBucket({ requestsPerSecond: 10 });
        bucket.tryAcquire();
        bucket.acquire().catch(() => {});
        bucket.dispose();
      }
      expect(vi.getTimerCount()).toBe(0);
    });

    it('should handle acquire with both signal and timeout', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const controller = new AbortController();
      const promise = bucket.acquire({ signal: controller.signal, timeout: 1000 });

      controller.abort();

      await expect(promise).rejects.toMatchObject({ name: 'AbortError' });
      expect(bucket.pendingCount).toBe(0);
    });

    it('should handle timeout firing before abort', async () => {
      const bucket = new TokenBucket({ requestsPerSecond: 1 });
      await bucket.acquire();

      const controller = new AbortController();
      let caught: unknown;
      const promise = bucket
        .acquire({ signal: controller.signal, timeout: 50 })
        .catch((error: unknown) => {
          caught = error;
        });

      await vi.advanceTimersByTimeAsync(50);
      await promise;

      expect(caught).toBeInstanceOf(TokenBucketTimeoutError);
      expect(bucket.pendingCount).toBe(0);
    });
  });

  describe('performance', () => {
    it('should handle 10000 immediate acquires under 50ms', () => {
      vi.useRealTimers();
      const bucket = new TokenBucket({ requestsPerSecond: 10000 });
      const start = performance.now();

      for (let index = 0; index < 10000; index++) {
        bucket.tryAcquire();
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(50);
    });

    it('should handle 1000 queued acquires draining under 200ms', async () => {
      vi.useRealTimers();
      const bucket = new TokenBucket({ requestsPerSecond: 100000 });
      await bucket.acquire({ cost: 100000 });

      const start = performance.now();
      const promises: Array<Promise<void>> = [];

      for (let index = 0; index < 1000; index++) {
        promises.push(bucket.acquire());
      }

      await Promise.all(promises);
      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
    });

    it('should not leak memory after rapid create/dispose cycles', () => {
      vi.useRealTimers();
      const start = performance.now();

      for (let index = 0; index < 10000; index++) {
        const bucket = new TokenBucket({ requestsPerSecond: 10 });
        bucket.tryAcquire();
        bucket.dispose();
      }

      const elapsed = performance.now() - start;
      expect(elapsed).toBeLessThan(200);
    });
  });
});
