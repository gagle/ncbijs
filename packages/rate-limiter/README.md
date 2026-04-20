<h1 align="center">@ncbijs/rate-limiter</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/rate-limiter"><img src="https://img.shields.io/npm/v/@ncbijs/rate-limiter" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/rate-limiter"><img src="https://img.shields.io/npm/dm/@ncbijs/rate-limiter" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/rate-limiter" alt="license" /></a>
</p>

<p align="center">
  Zero-dependency token bucket rate limiter for browser and Node.js.
</p>

---

## Why

Rate limiting is a universal problem: API clients, web scrapers, background jobs, browser-side throttling. Most solutions pull in dependencies or are tied to a specific runtime.

`@ncbijs/rate-limiter` is a pure TypeScript token bucket that works everywhere `setTimeout` does. No dependencies, no polyfills, no platform assumptions.

- **Token bucket algorithm** with configurable burst capacity and refill rate
- **FIFO queue** for pending callers when the bucket is empty
- **AbortSignal** and **timeout** support for cancellation
- **Non-blocking `tryAcquire`** for "check before acting" patterns
- **Weighted requests** via configurable cost per acquire

## Install

```bash
npm install @ncbijs/rate-limiter
```

## Quick start

```typescript
import { TokenBucket } from '@ncbijs/rate-limiter';

const bucket = new TokenBucket({ requestsPerSecond: 10 });

// Each call waits for a token before proceeding
await bucket.acquire();
await fetch('https://api.example.com/data');
```

## API

### `new TokenBucket(options)`

Two constructor shapes via a union type:

#### Shorthand (common case)

```typescript
new TokenBucket({ requestsPerSecond: 10 });
```

| Parameter           | Type     | Required | Description                                                                         |
| ------------------- | -------- | -------- | ----------------------------------------------------------------------------------- |
| `requestsPerSecond` | `number` | Yes      | Sets refill rate. Capacity is `max(1, requestsPerSecond)` with a 1-second interval. |

#### Full configuration

```typescript
new TokenBucket({ capacity: 20, refillRate: 5, interval: 1000 });
```

| Parameter    | Type     | Required | Description                                          |
| ------------ | -------- | -------- | ---------------------------------------------------- |
| `capacity`   | `number` | Yes      | Maximum tokens the bucket can hold (burst capacity). |
| `refillRate` | `number` | Yes      | Tokens added per interval.                           |
| `interval`   | `number` | No       | Refill interval in milliseconds. Default: `1000`.    |

### `acquire(options?)`

Wait until tokens are available, then consume them. Queued in FIFO order.

```typescript
await bucket.acquire();
await bucket.acquire({ cost: 3 });
await bucket.acquire({ signal: controller.signal });
await bucket.acquire({ timeout: 5000 });
```

| Option    | Type          | Default | Description                                                       |
| --------- | ------------- | ------- | ----------------------------------------------------------------- |
| `cost`    | `number`      | `1`     | Tokens to consume. Throws if `cost > capacity`.                   |
| `signal`  | `AbortSignal` | —       | Rejects with `AbortError` when triggered.                         |
| `timeout` | `number`      | —       | Milliseconds. Rejects with `TokenBucketTimeoutError` if exceeded. |

Returns `Promise<void>`.

### `tryAcquire(cost?)`

Non-blocking: consume tokens if available, return `false` otherwise. Does not queue.

```typescript
if (bucket.tryAcquire()) {
  // proceed
} else {
  // back off or skip
}
```

Returns `boolean`.

### `availableTokens`

Current token count (reflects real-time refill). Read-only getter.

```typescript
console.log(bucket.availableTokens); // e.g. 7.5
```

### `pendingCount`

Number of `acquire()` calls waiting in the queue. Read-only getter.

```typescript
console.log(bucket.pendingCount); // e.g. 3
```

### `dispose()`

Cancel all pending acquires (rejects with `AbortError`) and clear internal timers. The instance becomes unusable — subsequent calls throw.

```typescript
bucket.dispose();
```

### `reset()`

Restore the bucket to full capacity and reject all pending acquires. The instance remains usable after reset.

```typescript
bucket.reset();
```

## Error types

### `TokenBucketTimeoutError`

Thrown when an `acquire()` call exceeds its `timeout`.

```typescript
import { TokenBucketTimeoutError } from '@ncbijs/rate-limiter';

try {
  await bucket.acquire({ timeout: 1000 });
} catch (err) {
  if (err instanceof TokenBucketTimeoutError) {
    // Handle timeout
  }
}
```

### `AbortError`

Standard `DOMException` with `name: 'AbortError'`. Thrown when:

- An `AbortSignal` is triggered while queued
- `dispose()` or `reset()` is called with pending acquires

## Examples

### API client rate limiting

```typescript
const bucket = new TokenBucket({ requestsPerSecond: 3 });

async function fetchWithRateLimit(url: string): Promise<Response> {
  await bucket.acquire();
  return fetch(url);
}
```

### Weighted requests

Some APIs count differently based on the operation. Use `cost` to consume multiple tokens per request.

```typescript
const bucket = new TokenBucket({ capacity: 100, refillRate: 10 });

// Light read: 1 token
await bucket.acquire({ cost: 1 });

// Heavy batch write: 10 tokens
await bucket.acquire({ cost: 10 });
```

### Timeout

Bail out if a token isn't available within a deadline.

```typescript
import { TokenBucketTimeoutError } from '@ncbijs/rate-limiter';

try {
  await bucket.acquire({ timeout: 5000 });
  await sendRequest();
} catch (err) {
  if (err instanceof TokenBucketTimeoutError) {
    console.warn('Rate limit wait exceeded 5s, skipping');
  }
}
```

### AbortSignal cancellation

Cancel a pending acquire when the user navigates away or a parent operation is aborted.

```typescript
const controller = new AbortController();

// In a UI handler
cancelButton.addEventListener('click', () => controller.abort());

try {
  await bucket.acquire({ signal: controller.signal });
  await performAction();
} catch (err) {
  if (err instanceof DOMException && err.name === 'AbortError') {
    console.log('Cancelled by user');
  }
}
```

### Non-blocking check

Use `tryAcquire` when you'd rather skip or use a fallback than wait.

```typescript
if (bucket.tryAcquire()) {
  await liveSearch(query);
} else {
  showCachedResults(query);
}
```

### Custom interval

Rate limit to 100 requests per minute with a burst of 20.

```typescript
const bucket = new TokenBucket({
  capacity: 20,
  refillRate: 100,
  interval: 60_000,
});
```

### Sub-second rates

For slow APIs that allow one request every few seconds.

```typescript
// 1 request every 2 seconds
const bucket = new TokenBucket({ requestsPerSecond: 0.5 });
```

### Parallel workers with shared limiter

```typescript
const bucket = new TokenBucket({ requestsPerSecond: 10 });

const urls = ['https://api.example.com/1', 'https://api.example.com/2' /* ... */];

await Promise.all(
  urls.map(async (url) => {
    await bucket.acquire();
    return fetch(url);
  }),
);
```

### Cleanup

Always dispose when the limiter is no longer needed to prevent timer leaks.

```typescript
const bucket = new TokenBucket({ requestsPerSecond: 5 });

try {
  for (const item of items) {
    await bucket.acquire();
    await process(item);
  }
} finally {
  bucket.dispose();
}
```

## Types

All types are exported for use in your own interfaces:

```typescript
import type { TokenBucketOptions, RateLimiterOptions, AcquireOptions } from '@ncbijs/rate-limiter';
```
