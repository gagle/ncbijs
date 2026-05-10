---
package: '@ncbijs/blast'
purpose: 'NCBI BLAST sequence alignment client. Async submit/poll/retrieve workflow over the QBlast URL API with built-in rate limiting (1 submit / 10s, 1 poll / 60s) and JSON2 result parsing.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
exports:
  - 'Blast'
  - 'BlastHttpError'
  - 'BlastSearchError'
  - 'BlastTimeoutError'
  - 'BlastConfig'
  - 'BlastProgram'
  - 'BlastStatus'
  - 'BlastSubmitOptions'
  - 'BlastSearchOptions'
  - 'BlastSubmitResult'
  - 'BlastPollResult'
  - 'BlastResult'
  - 'BlastHit'
  - 'BlastHsp'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-02-18'
---

# @ncbijs/blast

## Purpose

Wraps the NCBI BLAST URL API (`Blast.cgi`, also called QBlast) with a
typed, three-step async workflow: `submit()` returns a Request ID
(RID), `poll(rid)` reports status, `retrieve(rid)` parses the JSON2
result. The convenience method `search()` chains all three with
configurable poll cadence.

BLAST is fundamentally asynchronous on the server side — there is no
synchronous endpoint. NCBI assigns each search an RID, queues it, and
expects clients to poll roughly once per minute. This package encodes
that contract and enforces the published rate limits via two separate
token buckets.

## When to use

- Sequence-similarity searches against any NCBI BLAST database (`nt`,
  `nr`, `swissprot`, `refseq_protein`, custom databases, …).
- All five program variants: `blastn`, `blastp`, `blastx`, `tblastn`,
  `tblastx`.
- Restricted searches via Entrez query (`entrezQuery` option) — e.g.
  limit `nt` hits to a single organism.
- PSI-BLAST iterations (`numIterations` option for `blastp`).
- Megablast for fast nucleotide identity searches (`megablast: true`
  with `blastn`).

## When NOT to use

| If you want to                                    | Use instead                                   |
| ------------------------------------------------- | --------------------------------------------- |
| Look up a sequence record by accession            | `@ncbijs/eutils` (`efetch` from `nuccore` / `protein`) |
| Search PubMed literature                          | `@ncbijs/pubmed`                              |
| Get genome assembly metadata                      | `@ncbijs/datasets`                            |
| Find gene/SNP cross-references                    | `@ncbijs/eutils` (`elink`)                    |
| Look up a known variant by rs ID                  | `@ncbijs/snp`                                 |
| Stream / parse FASTA files locally                | `@ncbijs/fasta`                               |

## Exports

| Export                                | Kind      | Purpose                                                                        |
| ------------------------------------- | --------- | ------------------------------------------------------------------------------ |
| `Blast`                               | class     | Main client                                                                    |
| `BlastHttpError`                      | class     | HTTP-level failure (extends `HttpRetryError` from `@ncbijs/rate-limiter`)      |
| `BlastSearchError`                    | class     | Server reported `Status=FAILED` or `UNKNOWN` for the RID                       |
| `BlastTimeoutError`                   | class     | Exceeded `maxPollAttempts` while polling                                       |
| `BlastConfig`                         | interface | Constructor config (`maxRetries`)                                              |
| `BlastProgram`                        | type      | `'blastn' \| 'blastp' \| 'blastx' \| 'tblastn' \| 'tblastx'`                   |
| `BlastStatus`                         | type      | `'waiting' \| 'ready' \| 'failed' \| 'unknown'`                                |
| `BlastSubmitOptions`                  | interface | All `submit()` knobs (e-value, matrix, gap costs, megablast, …)                |
| `BlastSearchOptions`                  | interface | Extends `BlastSubmitOptions` with `pollIntervalMs`, `maxPollAttempts`          |
| `BlastSubmitResult`                   | interface | `{ rid, estimatedSeconds }` from the `Put` response                            |
| `BlastPollResult`                     | interface | `{ status }` from the `Get FORMAT_OBJECT=SearchInfo` response                  |
| `BlastResult`                         | interface | `{ hits: BlastHit[] }` from the `Get FORMAT_TYPE=JSON2` response               |
| `BlastHit`                            | interface | `{ accession, title, length, hsps }`                                           |
| `BlastHsp`                            | interface | High-scoring segment pair (alignment block)                                    |

## API surface

### `new Blast(config?)`

```ts
new Blast({
  maxRetries?: number; // default 3, exponential backoff with jitter
});
```

No required fields. The constructor builds two private `TokenBucket`
instances:

- **submit limiter** — `0.1` req/s (one submission every 10 seconds)
- **poll/retrieve limiter** — `1/60` req/s (one poll every 60 seconds)

These are deliberately strict per NCBI's QBlast usage policy. Both are
per-instance — sharing a `Blast` across all callers in a process is
the supported pattern.

### `submit(query, program, database, options?): Promise<BlastSubmitResult>`

POSTs to `Blast.cgi` with `CMD=Put`. Encodes options into the
form-urlencoded body. Returns the parsed `RID` and `RTOE` (estimated
time, seconds).

```ts
const { rid, estimatedSeconds } = await blast.submit(
  'ATCGATCGATCGATCG',
  'blastn',
  'nt',
  { megablast: true, hitListSize: 50 },
);
```

Throws `BlastHttpError` on non-2xx. Throws a plain `Error` if the
response body lacks an `RID=` line.

### `poll(rid): Promise<BlastPollResult>`

GET with `CMD=Get` + `FORMAT_OBJECT=SearchInfo`. Parses the
`Status=...` line into a typed `BlastStatus`. Throws if the response
body lacks a `Status=` line, or if the value is none of the four
recognised statuses.

### `retrieve(rid): Promise<BlastResult>`

GET with `CMD=Get` + `FORMAT_TYPE=JSON2`. Parses the JSON, walks
`BlastOutput2[0].report.results.search.hits`, and maps to typed
`BlastHit[]`.

Only the **first** entry of `BlastOutput2` is consumed. For
multi-query submissions you must currently retrieve and parse the JSON
yourself; mapping each entry is on the package's TODO list.

### `search(query, program, database, options?): Promise<BlastResult>`

Convenience wrapper: `submit()` → wait `pollIntervalMs` → `poll()` →
loop until `ready` / `failed` / timeout → `retrieve()`.

```ts
const result = await blast.search('ATCGATCG', 'blastn', 'nt', {
  pollIntervalMs: 60_000,    // default — one minute between polls
  maxPollAttempts: 30,       // default — 30 minutes total
  hitListSize: 100,
});
```

On `failed` or `unknown` status: throws `BlastSearchError(rid)` —
inspect `err.rid` to retry manually if desired. On timeout: throws
`BlastTimeoutError(rid, attempts)`.

## Configuration

| Field        | Type     | Default | Notes                                              |
| ------------ | -------- | ------- | -------------------------------------------------- |
| `maxRetries` | `number` | `3`     | Per-request retries on 429 / 5xx (network-level)   |

`maxRetries` is independent of `maxPollAttempts`. The first applies to
each individual HTTP call (transient network failures); the second
governs how long `search()` waits for the BLAST job itself to finish.

## Rate limiting & credentials

- **No API key concept.** BLAST does not honour the E-utilities
  `api_key` parameter. Rate is fixed by the URL API documentation.
- **Two token buckets per instance.** Submissions and polls/retrieves
  are limited independently because they have different policy
  ceilings.
- **Per-instance, not global.** Multiple `Blast` instances in one
  process collectively exceed the rate. Use a single shared instance.
- **Long-running jobs.** Real searches against `nt` typically take
  30–90 seconds. The default `pollIntervalMs` of 60 seconds matches
  NCBI's recommendation; do not lower it.

## Cross-package wiring

- **Imports.** `import { Blast } from '@ncbijs/blast'`.
- **Composes with `@ncbijs/rate-limiter`** — uses `TokenBucket`,
  `fetchWithRetry`, and `HttpRetryError`. `BlastHttpError` extends
  `HttpRetryError` so generic retry-error handling works uniformly
  across packages.
- **Used by `@ncbijs/http-mcp`** — `packages/http-mcp/src/tools/blast-tools.ts`
  exposes `blast-search` as an MCP tool. The tool accepts
  `query`, `program`, `database`, `megablast`, `expect`,
  `hitlistSize` and delegates to `blast.search()`.
- **Pairs with `@ncbijs/fasta`** — see
  `examples/fasta-blast-pipeline.ts`: stream a FASTA file, BLAST each
  record.

## Common pitfalls

1. **Don't tighten `pollIntervalMs` below 60 s.** The poll token
   bucket refills at `1/60` req/s. Setting `pollIntervalMs: 5_000`
   does not speed anything up — the limiter blocks every poll for the
   missing 55 seconds. It only adds latency.

2. **`megablast` is `blastn`-only.** The flag is silently ignored on
   protein programs. The README documents this; the runtime client
   does not validate it. Pair `megablast: true` with `program:
   'blastn'`.

3. **`search()` aborts on first non-`waiting` non-`ready` status.**
   `failed` and `unknown` both throw `BlastSearchError` immediately —
   no retry loop, no fallback. If you want resilience, catch the
   error, inspect `err.rid`, and re-submit.

4. **Multi-query results are silently truncated.** If you submit a
   FASTA with multiple records, NCBI returns multiple
   `BlastOutput2[]` entries; this client only maps `[0]`. Either
   submit one record at a time, or call `retrieve()` and parse the
   JSON yourself.

5. **Empty `description[]` and `hsps[]` collapse to defaults.** When
   NCBI returns a hit with no description, `accession` and `title`
   become `''` and `length` becomes `0`. The mapping is permissive —
   do not rely on truthiness checks; check semantic meaning instead.

6. **RIDs expire.** NCBI keeps results for ~36 hours. Stale RIDs
   return an empty result rather than an error — `retrieve(rid)` on a
   long-expired RID yields `{ hits: [] }`.

7. **`BLAST_BASE_URL` is hard-coded.** No env override. If NCBI ever
   moves the endpoint (or you need to point at a mirror) you have to
   patch the source.

## Testing

```bash
pnpm nx run @ncbijs/blast:test         # unit (mocked fetch)
pnpm nx run ncbijs-e2e:e2e -- blast    # E2E hits live NCBI
pnpm nx run @ncbijs/blast:typecheck
pnpm nx run @ncbijs/blast:lint
pnpm nx run @ncbijs/blast:build
```

Unit tests live alongside source: `blast.spec.ts` and
`parse-qblast-info.spec.ts`. They stub `fetch` via `vi.stubGlobal` and
cover all status branches, all option flags, and JSON2 mapping edge
cases (missing `BlastOutput2`, missing description, missing hsps).

## Files

```
packages/blast/src/
  index.ts                       # public re-exports
  blast.ts                       # Blast class + error classes + JSON2 mappers
  blast.spec.ts
  parse-qblast-info.ts           # extractField + parseSubmitResponse + parsePollResponse
  parse-qblast-info.spec.ts
  interfaces/
    blast.interface.ts           # BlastConfig, BlastProgram, BlastStatus, options, results
```
