---
package: '@ncbijs/rate-limiter'
purpose: 'Zero-dependency token-bucket rate limiter and retry-aware fetch helper for browser and Node.js. Project-agnostic, designed for extraction into a standalone library.'
layout: 'flat'
storage_mode: false
zero_dep: true
depends_on: []
used_by:
  - '@ncbijs/eutils'
  - '@ncbijs/pmc'
  - '@ncbijs/clinvar'
  - '@ncbijs/datasets'
  - '@ncbijs/blast'
  - '@ncbijs/snp'
  - '@ncbijs/pubchem'
  - '@ncbijs/clinical-trials'
  - '@ncbijs/icite'
  - '@ncbijs/rxnorm'
  - '@ncbijs/dailymed'
  - '@ncbijs/litvar'
  - '@ncbijs/bioc'
  - '@ncbijs/cite'
  - '@ncbijs/mesh'
  - '@ncbijs/id-converter'
  - '@ncbijs/pubtator'
  - '@ncbijs/clinical-tables'
  - '@ncbijs/medgen'
  - '@ncbijs/cdd'
  - '@ncbijs/dbvar'
  - '@ncbijs/geo'
  - '@ncbijs/gtr'
  - '@ncbijs/sra'
  - '@ncbijs/omim'
  - '@ncbijs/books'
  - '@ncbijs/nlm-catalog'
  - '@ncbijs/nucleotide'
  - '@ncbijs/protein'
  - '@ncbijs/structure'
exports:
  - 'TokenBucket'
  - 'TokenBucketTimeoutError'
  - 'fetchWithRetry'
  - 'HttpRetryError'
  - 'TokenBucketOptions'
  - 'RateLimiterOptions'
  - 'AcquireOptions'
  - 'RetryConfig'
  - 'FetchRetryOptions'
related_docs:
  - 'packages/rate-limiter/README.md'
last_audited: '2026-04-21'
---

# @ncbijs/rate-limiter

## Purpose

Pure-TypeScript token-bucket rate limiter and retry-aware fetch
helper. Works wherever `setTimeout` and `fetch` exist — browser,
Node.js, edge runtimes, workers. Zero runtime dependencies, zero
polyfills, zero platform assumptions.

The whole package is **project-agnostic**: there is no NCBI URL, no
NCBI rate constant, no domain header, no business rule baked in. The
intent is that this package can be extracted as a standalone published
library at any time without changes. **This is a load-bearing
constraint** — see [Common pitfalls](#common-pitfalls) item 1.

## When to use

- Throttling outbound HTTP from any client to a configured rate
  (`requestsPerSecond` or `capacity` + `refillRate` + `interval`).
- Adding exponential-backoff retry with `Retry-After` honoring,
  jitter, and 429/5xx classification to a `fetch` call.
- Coordinating burst-vs-sustained traffic via configurable bucket
  capacity (e.g. burst 20, sustained 5/s).
- Cancelling pending acquires via `AbortSignal` or per-call `timeout`.
- Non-blocking "skip if no capacity" patterns via `tryAcquire`.

## When NOT to use

| If you want to                                | Use instead                                                  |
| --------------------------------------------- | ------------------------------------------------------------ |
| Call NCBI E-utilities (auto-rate-limited)     | `@ncbijs/eutils`                                             |
| Stream a large NCBI archive into a sink       | `@ncbijs/pipeline` (composes its own rate strategy)          |
| Schedule recurring sync checks                | `@ncbijs/sync` (`SyncScheduler`)                             |
| A pre-wired NCBI dataset loader               | `@ncbijs/etl`                                                |
| Distributed rate limiting across processes    | Out of scope — bring a Redis-backed limiter                  |

## Exports

| Export                    | Kind       | Purpose                                                                |
| ------------------------- | ---------- | ---------------------------------------------------------------------- |
| `TokenBucket`             | class      | Token-bucket limiter with FIFO queue, abort, timeout, weighted cost    |
| `TokenBucketTimeoutError` | class      | Thrown by `acquire({ timeout })` when the wait exceeds the deadline    |
| `fetchWithRetry`          | function   | `fetch` wrapper that acquires a token then retries 429/5xx with jitter |
| `HttpRetryError`          | class      | Thrown by `fetchWithRetry` on terminal HTTP failure (`status`, `body`) |
| `TokenBucketOptions`      | interface  | Full config: `{ capacity, refillRate, interval? }`                     |
| `RateLimiterOptions`      | interface  | Shorthand config: `{ requestsPerSecond }`                              |
| `AcquireOptions`          | interface  | Per-acquire options: `{ cost?, signal?, timeout? }`                    |
| `RetryConfig`             | interface  | `{ maxRetries, rateLimiter }` — required by `fetchWithRetry`           |
| `FetchRetryOptions`       | interface  | `{ request?, createError?, sensitiveParams? }`                         |

## API surface

### `new TokenBucket(options)`

Two constructor shapes via a discriminated union.

```ts
new TokenBucket({ requestsPerSecond: 10 });
new TokenBucket({ capacity: 20, refillRate: 5, interval: 1000 });
```

- Shorthand sets `capacity = max(1, requestsPerSecond)` with a
  1-second refill interval. Refill is computed continuously
  (`tokensPerMs`), not in discrete ticks.
- Throws synchronously on non-positive `requestsPerSecond`,
  `capacity`, `refillRate`, or `interval`.

Methods:

- **`acquire(options?: AcquireOptions): Promise<void>`** — wait until
  `cost` (default 1) tokens are available. Honors `signal` and
  `timeout`. Throws synchronously if `cost > capacity` (unsatisfiable).
- **`tryAcquire(cost = 1): boolean`** — non-blocking; returns `false`
  instead of queueing.
- **`availableTokens` / `pendingCount`** — getters; `availableTokens`
  triggers a refill on read.
- **`dispose()`** — cancels pending acquires with `AbortError`,
  clears the refill timer, makes the instance unusable. Call from a
  `finally` block to avoid timer leaks.
- **`reset()`** — restores full capacity, cancels pending. Instance
  remains usable.

### `fetchWithRetry(input, config, options?)`

```ts
const response = await fetchWithRetry(
  'https://api.example.com/data',
  { rateLimiter: bucket, maxRetries: 3 },
  {
    request: { method: 'GET', headers: { Accept: 'application/json' } },
    sensitiveParams: ['api_key'],
    createError: (status, body) => new MyDomainError(status, body),
  },
);
```

Behavior:

- Acquires a token from `config.rateLimiter` before every attempt
  (including retries).
- Retries on **429, 500, 502, 503** up to `maxRetries` total attempts.
  Other 4xx/5xx throw immediately.
- Two backoff curves: `429`/`503` use the longer "server busy" curve
  (2s → 30s); `500`/`502` use the shorter "transient" curve
  (500ms → 8s). Each adds up to 500ms of jitter.
- Honors `Retry-After` (numeric seconds or HTTP-date), capped at 60s.
- Network errors (`TypeError` from `fetch`) are retried up to
  `maxRetries` on the transient curve.
- `sensitiveParams` redacts named query params from any thrown
  `TypeError` message (URL leak protection).
- `createError` overrides the default `HttpRetryError` for terminal
  failures (lets domain packages throw `EUtilsHttpError`,
  `BlastHttpError`, etc.).

## Configuration

| Field               | Type     | Required | Default | Notes                                                       |
| ------------------- | -------- | -------- | ------- | ----------------------------------------------------------- |
| `requestsPerSecond` | `number` | yes\*    | —       | Shorthand. Mutually exclusive with the full form.           |
| `capacity`          | `number` | yes\*    | —       | Burst size. Required in the full form.                      |
| `refillRate`        | `number` | yes\*    | —       | Tokens added per `interval`. Required in the full form.     |
| `interval`          | `number` | no       | `1000`  | Refill interval in milliseconds.                            |
| `cost`              | `number` | no       | `1`     | Per-`acquire` weight. Throws if `cost > capacity`.          |
| `signal`            | `AbortSignal` | no   | —       | Cancels a queued acquire with `AbortError`.                 |
| `timeout`           | `number` | no       | —       | Per-`acquire` deadline in ms. Rejects with `TokenBucketTimeoutError`. |
| `maxRetries`        | `number` | yes      | —       | Required for `fetchWithRetry`. Total attempts = `1 + maxRetries`. |

\* Either `requestsPerSecond` (shorthand) or `capacity` + `refillRate`
(full form). Pass exactly one shape.

## Cross-package wiring

Every HTTP-backed `@ncbijs/*` package follows the same pattern:

1. Create a private `TokenBucket` sized to the API's published rate.
2. Pass it as `RetryConfig.rateLimiter` to `fetchWithRetry`.
3. Use `FetchRetryOptions.createError` to throw a domain-specific
   error type so callers can `instanceof` it.

Examples:

- `@ncbijs/eutils` — `EUTILS_REQUESTS_PER_SECOND` (3) or
  `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` (10). Re-exports
  `TokenBucket` for downstream convenience.
- `@ncbijs/blast`, `@ncbijs/datasets`, `@ncbijs/pubchem`, etc. —
  package-local rate constants (NCBI publishes per-API limits).
- `@ncbijs/clinical-trials`, `@ncbijs/icite`, `@ncbijs/rxnorm`,
  `@ncbijs/dailymed`, `@ncbijs/litvar`, `@ncbijs/clinical-tables` —
  same pattern with non-NCBI hosts.

`fetchWithRetry` does **not** know about NCBI. The caller chooses
the rate, the retry budget, the error type, and the redaction list.

## Common pitfalls

1. **Adding NCBI-specific code to this package.** No NCBI URLs, no
   `tool`/`email` parameters, no `api_key` helpers, no domain
   constants. Everything project-specific lives in the consuming
   package's `*-client.ts`. The whole point of this package is that
   it ships standalone — treat the boundary as load-bearing. If you
   feel a constant or helper "would fit nicely here," it almost
   certainly belongs in the consumer.

2. **Sharing a single bucket across processes.** A `TokenBucket` is
   in-process state. Two processes each holding a 10/s bucket against
   the same API key will collectively exceed 10/s and trigger 429s.
   Solution: a single shared process, or an out-of-process limiter
   (Redis, etc.) — out of scope for this package.

3. **Forgetting `dispose()`.** The refill timer keeps the event loop
   alive in Node.js. Long-lived buckets are fine, but short-lived
   ones (e.g. created per-request, per-test) leak handles. Call
   `dispose()` in a `finally` block, or use `reset()` if the
   instance will be reused.

4. **`cost > capacity`.** Throws synchronously rather than queuing
   forever. If you need a high-cost operation, the bucket's
   `capacity` must be large enough — refilling never lets you exceed
   capacity.

5. **`fetchWithRetry` and idempotency.** Retry assumes the request is
   idempotent. POSTs that mutate server state should not pass
   `maxRetries > 0` unless the upstream guarantees idempotency
   (e.g. via an idempotency key). The library does not introspect the
   HTTP method.

6. **Sub-second rates.** `requestsPerSecond: 0.5` is valid (one
   request every 2s). The constructor clamps `capacity` to
   `max(1, requestsPerSecond)`, so very low rates still allow at
   least one immediate token.

7. **`Retry-After` clamping.** A server returning `Retry-After: 3600`
   is clamped to 60s by this library — we do not pause for an hour.
   If you genuinely need to honor multi-minute delays, build that
   logic outside `fetchWithRetry`.

## Testing

```bash
pnpm nx run @ncbijs/rate-limiter:test
pnpm nx run @ncbijs/rate-limiter:typecheck
pnpm nx run @ncbijs/rate-limiter:lint
pnpm nx run @ncbijs/rate-limiter:build
```

Unit tests cover both constructor shapes, all `acquire` paths
(immediate, queued, abort, timeout, dispose, reset), `tryAcquire`,
weighted cost, every retryable status, `Retry-After` parsing
(numeric + HTTP-date), backoff classification, and the redaction
helper. No live network — all tests use `vi.stubGlobal('fetch', ...)`
and mocked timers where appropriate.

## Files

```
packages/rate-limiter/src/
  index.ts                                  # public re-exports
  token-bucket.ts                           # TokenBucket + TokenBucketTimeoutError
  token-bucket.spec.ts
  fetch-with-retry.ts                       # fetchWithRetry + HttpRetryError
  fetch-with-retry.spec.ts
  interfaces/
    fetch-retry.interface.ts                # RetryConfig + FetchRetryOptions
```
