---
package: '@ncbijs/icite'
purpose: 'Typed client for the NIH iCite API. Retrieve citation metrics — Relative Citation Ratio (RCR), NIH percentile, expected/field citation rates, clinical-citation flags, and translation potential (APT) — for PubMed publications, plus a parser for the monthly Figshare CSV snapshot.'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
exports:
  - 'ICite'
  - 'ICiteHttpError'
  - 'parseIciteCsv'
  - 'ICiteConfig'
  - 'ICitePublication'
  - 'ICiteAuthor'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-03-22'
---

# @ncbijs/icite

## Purpose

Wraps the **NIH Office of Portfolio Analysis iCite API**
(`https://icite.od.nih.gov/api/pubs`) — bibliometric scoring for
PubMed-indexed articles. **iCite is hosted by NIH OD, not NCBI; it
does not share the eutils host, rate budget, `tool`/`email` headers,
or `api_key` mechanism.**

The package exposes:

1. **HTTP client** — `publications()` (batch by PMID, ≤1000 per call),
   plus convenience wrappers `citedBy()` and `references()` that
   resolve a source PMID and re-batch its forward / backward citations.
2. **Bulk parser** — `parseIciteCsv()` reads the monthly Figshare CSV
   snapshot into `ICitePublication[]` without HTTP.

## When to use

- Look up RCR, NIH percentile, citation counts, or APT for a known set
  of PMIDs.
- Walk forward citations (`citedBy(pmid)`) or backward references
  (`references(pmid)`) with full metrics on every neighbour.
- Build dashboards comparing translational impact (clinical-citation
  flags, APT) across a portfolio.
- Ingest the iCite Figshare snapshot offline for analytics that don't
  fit the 1000-PMID per-request envelope.

## When NOT to use

| Goal                                              | Use instead                                      |
| ------------------------------------------------- | ------------------------------------------------ |
| Fetch the article's title, authors, and MeSH      | `@ncbijs/pubmed`                                 |
| Find variants mentioned in a publication          | `@ncbijs/litvar`                                 |
| Run any NCBI Entrez query                         | `@ncbijs/eutils` (different host, different rate limit) |
| Find clinical trials backed by a publication      | `@ncbijs/clinical-trials`                        |
| Pre-formatted bibliographic citation              | `@ncbijs/cite`                                   |
| Parse the iCite snapshot you already have         | `parseIciteCsv` from this package directly       |

## Exports

| Export             | Kind      | Purpose                                                            |
| ------------------ | --------- | ------------------------------------------------------------------ |
| `ICite`            | class     | HTTP client; `new ICite(config?)`                                  |
| `ICiteHttpError`   | class     | Thrown on non-2xx with `status` + `body`                           |
| `parseIciteCsv`    | function  | Figshare CSV → `ReadonlyArray<ICitePublication>` (pure, no HTTP)   |
| `ICiteConfig`      | interface | `{ maxRetries? }`                                                  |
| `ICitePublication` | interface | Mapped publication record (PMID, RCR, percentile, citers, ...)    |
| `ICiteAuthor`      | interface | `{ firstName, lastName, fullName }`                                |

## API surface

### `new ICite(config?)`

```ts
const icite = new ICite({ maxRetries: 3 });
```

No required fields. The constructor builds a private `TokenBucket`
sized to **2 req/s** (NIH iCite fair-use cap) and is not shared across
instances.

### `publications(pmids): Promise<ReadonlyArray<ICitePublication>>`

```ts
const records = await icite.publications([33533846, 25613900]);
```

- Returns `[]` immediately if `pmids` is empty.
- Throws a plain `Error` synchronously when `pmids.length > 1000` —
  callers that need larger batches must shard themselves.
- Each record is mapped from snake_case wire fields to camelCase domain
  fields. `relative_citation_ratio` and `nih_percentile` are mapped to
  `undefined` when the wire value is `null` (article too new to score).

### `citedBy(pmid: number): Promise<ReadonlyArray<ICitePublication>>`

Two-step: fetches the source publication first to read its
`citedByPmids`, then batches those forward citations through
`publications()` (1000 per request). Returns `[]` if the source is
unknown or has no recorded citers.

### `references(pmid: number): Promise<ReadonlyArray<ICitePublication>>`

Same pattern as `citedBy`, but reads `referencesPmids` (the article's
own bibliography).

### `parseIciteCsv(csv): ReadonlyArray<ICitePublication>`

Pure function. Resolves columns by header name (case-insensitive,
trimmed), so the order can vary between snapshots. Returns `[]` if the
header line is missing the `pmid` column. PMIDs in `cited_by`,
`cited_by_clin`, and `references` are space-separated in the CSV and
parsed into number arrays; entries that fail to parse are dropped (not
preserved as `0`).

## Configuration

| Field        | Type     | Default | Notes                                              |
| ------------ | -------- | ------- | -------------------------------------------------- |
| `maxRetries` | `number` | `3`     | Exponential backoff with jitter on 429 / 5xx       |

No authentication. Do not pass `apiKey`, `tool`, or `email` here —
iCite has no such concept and any extra fields are silently ignored.

## Rate limiting & credentials

- Token bucket refills at **2 req/s**, per instance. Distinct from the
  3 / 10 req/s eutils budget. A single process running both `EUtils`
  and `ICite` does not interfere — they have separate buckets and
  separate hosts.
- No authentication header. The API is unauthenticated.
- The client sets `Accept: application/json`. Other formats
  (XML, CSV) are not exposed by this package — use `parseIciteCsv` for
  the Figshare snapshot instead.

## Cross-package wiring

- **Imports.** `import { ICite, parseIciteCsv } from '@ncbijs/icite'`.
- **Composes with `@ncbijs/rate-limiter`** — uses `TokenBucket` and
  `fetchWithRetry`; `ICiteHttpError` extends `HttpRetryError`.
- **Used by `@ncbijs/http-mcp`** — `register-tools.ts` imports `ICite`
  and `tools/icite-tools.ts` exposes `citation-metrics`,
  `get-cited-by`, and `get-references` MCP tools.
- **Pairs with `@ncbijs/pubmed`** when you need full bibliographic
  records: use PubMed for metadata (title, abstract, MeSH) and iCite
  for impact scores on the same PMIDs.

## Common pitfalls

1. **1000-PMID hard cap on `publications()`.** This is enforced
   client-side with a thrown `Error` (not `ICiteHttpError`). Catching
   only `ICiteHttpError` will leak this. Shard large lists into chunks
   of 1000 yourself, or use `citedBy` / `references` which already
   batch internally.

2. **Provisional articles return `undefined` metrics.** Articles
   published in the last ~2 years may have `relativeCitationRatio` and
   `nihPercentile` of `undefined`, with `provisional: true`. Don't
   default these to `0` — that flattens the score distribution and
   misrepresents new work.

3. **`citedByPmids` is the only forward-citation source.** Don't
   confuse it with `citedByClinicalPmids` (a strict subset — clinical
   articles only). The bulk-CSV column `cited_by_clin` maps to
   `citedByClinicalPmids`. The `isClinical` flag (and the duplicated
   `citedByClinicalArticle` mapping in the CSV parser) are
   article-level booleans, not PMID lists.

4. **CSV column index `citedByClinicalArticle` aliases `is_clinical`.**
   In `parse-icite-csv.ts` the `citedByClinicalArticle` index resolves
   to the `is_clinical` column — the snapshot does not ship a separate
   "cited by a clinical article" boolean column. If you need the
   citers' clinical flags, read `citedByClinicalPmids` and look up each
   PMID. The HTTP path uses the wire field `citedByClinicalArticle`
   directly and is independent of this CSV alias.

5. **`citedBy(pmid)` charges two round-trip waves of the rate budget.**
   First the source publication, then `ceil(citers / 1000)` batch
   calls. For an article with 5,000 citers, that's 6 calls — at 2 req/s
   the bucket alone gates this to ≥ 3 s plus network.

6. **No NDJSON / JSON-Lines support.** The bulk parser only handles
   CSV. The Figshare snapshot is canonical CSV; if a future format ever
   ships JSON Lines, write a separate parser rather than overloading
   `parseIciteCsv`.

## Testing

```bash
pnpm nx run @ncbijs/icite:test
pnpm nx run @ncbijs/icite:typecheck
pnpm nx run @ncbijs/icite:lint
pnpm nx run @ncbijs/icite:build

# E2E (real iCite API)
pnpm nx run ncbijs-e2e:e2e -- icite
```

HTTP unit tests stub `fetch`. Bulk-parser tests use small inline CSV
fixtures covering varied column orders and missing optional values.
Coverage target: 100% across statements, branches, functions, lines.

## Files

```
packages/icite/src/
  index.ts                              # public re-exports
  interfaces/
    icite.interface.ts                  # ICitePublication, ICiteAuthor, ICiteConfig
  http/
    icite.ts                            # ICite class
    icite-client.ts                     # fetchJson + ICiteHttpError
    icite.spec.ts
    icite-client.spec.ts
  bulk-parsers/
    parse-icite-csv.ts                  # CSV → ICitePublication[]
    parse-icite-csv.spec.ts
```
