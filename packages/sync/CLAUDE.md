---
package: '@ncbijs/sync'
purpose: 'NCBI update detection and scheduled re-sync. Polls upstream sources via HTTP HEAD timestamps or MD5 companions and triggers user-supplied callbacks (typically a re-run of an @ncbijs/etl loader) on change.'
layout: 'flat'
storage_mode: false
zero_dep: true
depends_on: []
used_by:
  - '@ncbijs/etl'
exports:
  - 'SyncScheduler'
  - 'InMemorySyncState'
  - 'HttpTimestampChecker'
  - 'Md5ChecksumChecker'
  - 'parseMd5'
  - 'DatasetSyncState'
  - 'SyncSchedulerConfig'
  - 'SyncStateStore'
  - 'UpdateCheckResult'
  - 'UpdateChecker'
related_docs:
  - 'packages/sync/README.md'
  - 'docs/data-pipelines.md'
last_audited: '2026-05-04'
---

# @ncbijs/sync

## Purpose

Phase 2 of the data-pipeline workflow. Phase 1 (`@ncbijs/etl`)
populates a local store from NCBI archives. Phase 2 (this package)
keeps it fresh by polling upstream for change signals and invoking a
user-supplied `onUpdate` callback — typically a re-run of an ETL
loader.

Zero runtime dependencies. **No NCBI URLs hardcoded** — checkers are
constructed with arbitrary `dataset` names and URLs by the caller.
`@ncbijs/etl` provides a `createCheckers([...datasets])` helper that
fills in the canonical NCBI URLs for the well-known datasets.

The package itself is generic: it can watch any HTTP-addressable
resource that exposes `Last-Modified` or a companion `.md5` file.
Bring your own checker by implementing `UpdateChecker` for other
change signals (ETag, `_v`-versioned API, last-id-in-feed, etc.).

## When to use

- Watching one or more NCBI datasets for upstream releases and
  triggering an ETL re-run on change.
- Building a long-running daemon that keeps a local DuckDB store
  in sync with NCBI FTP.
- Implementing a custom update checker for a non-NCBI source that
  exposes any change signal.

## When NOT to use

| If you want to                                | Use instead                                                  |
| --------------------------------------------- | ------------------------------------------------------------ |
| Initial bulk load from NCBI                   | `@ncbijs/etl`                                                |
| Stream a single archive into a sink           | `@ncbijs/pipeline`                                           |
| Persist sync state (production)               | Implement `SyncStateStore` against your own DB / file        |
| Distributed scheduling / cron                 | Out of scope — wrap `SyncScheduler` in your scheduler        |
| Real-time push (NCBI does not offer this)     | Out of scope                                                 |

## Exports

| Export                  | Kind       | Purpose                                                                  |
| ----------------------- | ---------- | ------------------------------------------------------------------------ |
| `SyncScheduler`         | class      | Polls registered checkers on an interval; calls `onUpdate` on change     |
| `HttpTimestampChecker`  | class      | `UpdateChecker` that compares HTTP `Last-Modified` headers               |
| `Md5ChecksumChecker`    | class      | `UpdateChecker` that compares MD5 hashes from a companion `.md5` URL    |
| `parseMd5`              | function   | Extracts a 32-char hex hash from `md5sum`-style output                   |
| `InMemorySyncState`     | class      | Reference `SyncStateStore` — non-persistent; for tests and dev           |
| `UpdateChecker`         | interface  | `{ dataset, check(currentState) }` — implement to support new signals    |
| `UpdateCheckResult`     | interface  | `{ hasUpdate, sourceTimestamp?, checksum? }`                             |
| `DatasetSyncState`      | interface  | Per-dataset persisted state: timestamps, checksum, status, last error    |
| `SyncStateStore`        | interface  | Persistence contract: `getState`, `setState`, `getAllStates`             |
| `SyncSchedulerConfig`   | interface  | `{ checkIntervalMs, datasets, signal?, onUpdate?, onError? }`            |

## API surface

### `new SyncScheduler(stateStore, checkers, config)`

```ts
const scheduler = new SyncScheduler(
  new InMemorySyncState(),
  [
    new Md5ChecksumChecker('clinvar', 'https://.../variant_summary.txt.gz.md5'),
    new HttpTimestampChecker('genes', 'https://.../gene_info.gz'),
  ],
  {
    checkIntervalMs: 3_600_000,
    datasets: ['clinvar', 'genes'],
    signal: controller.signal,
    onUpdate: async (dataset) => { await load(dataset, sink); },
    onError: (dataset, error) => { logger.error({ dataset, error }); },
  },
);
```

Methods:

- **`start(): Promise<void>`** — runs an immediate check, then polls
  at `checkIntervalMs`. Idempotent (no-op if already started).
  Wires `config.signal` to call `stop()` on abort.
- **`stop(): void`** — clears the interval. Does **not** abort an
  in-flight check.
- **`checkOnce(): Promise<ReadonlyArray<string>>`** — runs a single
  check cycle across all configured datasets and returns the names
  that had updates. Re-entrancy guarded — concurrent calls return
  `[]` instead of double-running.

State machine per dataset, transitioned via `stateStore.setState`:

```
idle  →  checking  →  syncing  →  idle    (on hasUpdate=true, onUpdate succeeds)
idle  →  checking  →  idle               (on hasUpdate=false)
*     →  error                           (on thrown error; onError fired)
```

On success the new `DatasetSyncState` is persisted with
`lastSyncedAt`, `lastSourceTimestamp`, `lastChecksum`, and cleared
`lastError`. The two checkers populate timestamp **or** checksum
(not both) — the scheduler stores whichever the checker returned.

### Checkers

- **`HttpTimestampChecker(dataset, url)`** — sends `HEAD url` with
  `User-Agent: ncbijs-sync` and reads `Last-Modified`. Reports
  `hasUpdate` when the header differs from the stored value.
  Treats a missing header as "always changed" (returns `hasUpdate:
  true` with `sourceTimestamp: undefined`) — safe default; some NCBI
  CDNs strip the header.
- **`Md5ChecksumChecker(dataset, md5Url)`** — `GET`s a tiny `.md5`
  companion file (typically <100 bytes), parses the hash via
  `parseMd5`, and compares to the stored checksum. More reliable
  than timestamps for detecting actual content change.
- **`parseMd5(text)`** — extracts the first 32-char hex run from
  `md5sum` output (`<hash>  <filename>`). Throws if no hash found.
  Exported for tests and custom checkers.

Both built-in checkers throw on non-2xx HTTP. The scheduler catches,
records `status: 'error'` + `lastError`, and invokes `config.onError`.

### `InMemorySyncState`

Reference `SyncStateStore`. State is held in a `Map<string, DatasetSyncState>`
and lost on restart — every restart triggers a full re-check (every
checker reports `hasUpdate: true` because the stored value is
`undefined`). Acceptable for development, tests, short-lived jobs.

For production, implement `SyncStateStore` against persistent storage
(a DuckDB table, a JSON file, Redis, etc.). The interface is
intentionally three async methods so any backend fits.

## Configuration

| Field             | Type                                       | Required | Default | Notes                                              |
| ----------------- | ------------------------------------------ | -------- | ------- | -------------------------------------------------- |
| `checkIntervalMs` | `number`                                   | yes      | —       | Poll interval in ms (e.g. `3_600_000` for hourly)  |
| `datasets`        | `ReadonlyArray<string>`                    | yes      | —       | Names to check; must match `checker.dataset` to fire |
| `signal`          | `AbortSignal`                              | no       | —       | Calls `stop()` on abort; in-flight check completes |
| `onUpdate`        | `(dataset) => Promise<void>`               | no       | —       | Fires on `hasUpdate: true`. Awaited before state is committed |
| `onError`         | `(dataset, error) => void`                 | no       | —       | Synchronous; receives the original `Error` instance |

A dataset listed in `config.datasets` with no matching checker is
silently skipped — typo guard yourself in tests.

## Cross-package wiring

- **`@ncbijs/etl` exports `createCheckers(datasets)`** that returns
  the canonical NCBI checkers for the well-known datasets (ClinVar
  uses `Md5ChecksumChecker`, taxonomy uses `Md5ChecksumChecker`,
  genes / PubChem fall back to `HttpTimestampChecker`, etc.). Use
  this helper unless you need custom URLs.
- **`@ncbijs/etl`'s `load(dataset, sink)`** is the canonical
  `onUpdate` callback. Together they form the full Phase-1 + Phase-2
  workflow.
- **`@ncbijs/store`** holds the data being kept in sync, but this
  package has no compile-time dependency on it — `onUpdate` is just
  a callback, the user wires `load` + `storage.createSink(...)` in
  their own code.
- **No NCBI imports here.** All NCBI-specific URLs and dataset
  knowledge live in `@ncbijs/etl/src/checkers.ts` (or the user's
  own checker construction).

## Common pitfalls

1. **`onUpdate` errors mark the dataset as `error` and skip the
   timestamp/checksum update.** If the loader fails, the next check
   will still see `hasUpdate: true` and retry — desirable. But this
   means a permanently-broken `onUpdate` retries on every interval
   and never advances. Wrap the callback with your own retry budget
   if you want a circuit breaker.

2. **`InMemorySyncState` in production is wrong.** A restart silently
   triggers a full re-load of every dataset on the first interval
   tick. For multi-GB datasets this is expensive. Implement
   `SyncStateStore` against persistent storage; the interface is
   tiny.

3. **Re-entrancy.** Calling `checkOnce()` while a cycle is already
   running returns `[]` immediately. The scheduler guarantees only
   one cycle is in flight, but it does not queue the second call.
   If you need every tick to actually run, ensure
   `checkIntervalMs` exceeds the worst-case cycle duration.

4. **`stop()` does not abort in-flight checks.** It clears the
   interval; whatever is currently running finishes naturally
   (including the awaited `onUpdate`). Use `config.signal` and
   propagate it into your own loader if you need true cancellation.
   The two built-in checkers do **not** wire `signal` into their
   `fetch` calls — long HEAD/GET requests will block `stop()`.

5. **`HttpTimestampChecker` against a missing `Last-Modified`.**
   Returns `hasUpdate: true` with `sourceTimestamp: undefined`. The
   stored state never picks up a real timestamp, so the next check
   sees `currentState.lastSourceTimestamp === undefined` again and
   re-fires. If you control the upstream, prefer
   `Md5ChecksumChecker`. If you don't, gate `onUpdate` with your own
   debouncer.

6. **Adding NCBI-specific code to this package.** Like
   `@ncbijs/rate-limiter` and `@ncbijs/pipeline`, this package is
   project-agnostic. URLs, dataset names, MD5 companion paths — all
   belong in `@ncbijs/etl` (or in user code). Don't import this
   constraint away.

## Testing

```bash
pnpm nx run @ncbijs/sync:test
pnpm nx run @ncbijs/sync:typecheck
pnpm nx run @ncbijs/sync:lint
pnpm nx run @ncbijs/sync:build
```

Unit tests cover both checkers (success, non-2xx, missing header,
malformed MD5), `parseMd5`, the scheduler state machine
(idle→checking→syncing→idle, error path, re-entrancy guard, abort
propagation, missing-checker skip), and `InMemorySyncState`
round-trip. All HTTP via `vi.stubGlobal('fetch', ...)`.

## Files

```
packages/sync/src/
  index.ts                                  # public re-exports
  sync-scheduler.ts                         # SyncScheduler
  sync-scheduler.spec.ts
  in-memory-sync-state.ts                   # InMemorySyncState
  in-memory-sync-state.spec.ts
  update-checkers/
    http-timestamp-checker.ts               # HttpTimestampChecker
    http-timestamp-checker.spec.ts
    md5-checksum-checker.ts                 # Md5ChecksumChecker + parseMd5
    md5-checksum-checker.spec.ts
  interfaces/
    sync.interface.ts                       # all public types
```
