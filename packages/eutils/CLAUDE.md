---
package: '@ncbijs/eutils'
purpose: 'Spec-compliant client for all 9 NCBI E-utilities (esearch, efetch, esummary, epost, elink, einfo, espell, egquery, ecitmatch) with rate limiting, retries, and History Server batching.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
  - 'openapi-fetch'
used_by:
  - '@ncbijs/books'
  - '@ncbijs/cdd'
  - '@ncbijs/clinvar'
  - '@ncbijs/dbvar'
  - '@ncbijs/geo'
  - '@ncbijs/gtr'
  - '@ncbijs/medgen'
  - '@ncbijs/nlm-catalog'
  - '@ncbijs/nucleotide'
  - '@ncbijs/omim'
  - '@ncbijs/pmc'
  - '@ncbijs/protein'
  - '@ncbijs/pubmed'
  - '@ncbijs/sra'
  - '@ncbijs/structure'
exports:
  - 'EUtils'
  - 'EUtilsHttpError'
  - 'TokenBucket'
  - 'EUTILS_BASE_URL'
  - 'EUTILS_REQUESTS_PER_SECOND'
  - 'EUTILS_REQUESTS_PER_SECOND_WITH_KEY'
  - 'appendEUtilsCredentials'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-03-11'
---

# @ncbijs/eutils

## Purpose

Foundation package for NCBI Entrez Programming Utilities (E-utilities) — the
HTTP API behind PubMed, PMC, dbSNP, and 30+ biomedical databases. Wraps all
9 endpoints (esearch, efetch, esummary, epost, elink, einfo, espell,
egquery, ecitmatch) with strict rate limiting, exponential-backoff retries,
History Server pagination, and typed XML/JSON parsing.

This is the **lowest-level** ncbijs API. Higher-level packages
(`@ncbijs/pubmed`, `@ncbijs/pmc`, `@ncbijs/clinvar`) build on it.

## When to use

- Direct Entrez access to any database not covered by a domain package
  (`gene`, `taxonomy`, `nuccore`, `protein`, `mesh`, `pubmed_pubmed`, ...).
- Custom search/fetch param combinations not exposed by higher-level APIs.
- Multi-database link traversal via `elink`.
- Citation-string → PMID matching (`ecitmatch`).
- Building new domain packages on top of E-utilities.

## When NOT to use

| If you want to                                | Use instead                                      |
| --------------------------------------------- | ------------------------------------------------ |
| Search PubMed and parse article XML           | `@ncbijs/pubmed` (fluent builder + XML parser)   |
| Fetch PMC full text                           | `@ncbijs/pmc` (OA Service + OAI-PMH + JATS)      |
| Query ClinVar variants                        | `@ncbijs/clinvar`                                |
| Bulk-download FTP archives                    | `@ncbijs/etl` + `@ncbijs/pipeline`               |
| Parse PubMed XML you already have             | `@ncbijs/pubmed-xml` directly                    |

## Exports

| Export                                | Kind       | Purpose                                                                    |
| ------------------------------------- | ---------- | -------------------------------------------------------------------------- |
| `EUtils`                              | class      | Main client                                                                |
| `EUtilsHttpError`                     | class      | Thrown on HTTP-level failures with `status` + `body`                       |
| `EUtilsConfig`                        | interface  | Constructor config (`tool`, `email`, optional `apiKey`, `maxRetries`)      |
| `ESearchParams` … `ESummaryParams`    | interfaces | One per endpoint — exact wire-format types                                 |
| `ESearchResult` … `ESummaryResult`    | interfaces | Parsed responses (XML or JSON depending on `retmode`)                      |
| `appendEUtilsCredentials`             | function   | Helper: appends `tool`, `email`, `api_key` to query params                 |
| `EUTILS_BASE_URL`                     | constant   | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils`                            |
| `EUTILS_REQUESTS_PER_SECOND`          | constant   | `3` (no key)                                                               |
| `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` | constant   | `10` (with key)                                                            |
| `TokenBucket`                         | class      | Re-export from `@ncbijs/rate-limiter` for convenience                      |

## API surface

**Base URL.** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`. HTTPS mandatory.

**URL encoding.** Spaces -> `+`, `#` -> `%23`, `"` -> `%22`. All param names
lowercase except `&WebEnv` (proper-case). Query keys combined inside an
`esearch` term as `%231+AND+%232`.

**History Server flow.** `esearch(usehistory: 'y')` -> `{ webEnv, queryKey }`
-> pass to `efetch` / `esummary` / `elink` instead of `id`. Multiple queries
can share one WebEnv by passing the existing value back in. Tokens last ~1h.

**Per-endpoint `retmode` support.** `esearch`, `esummary`, `elink`, `einfo`
support `xml` and `json`. `efetch`, `epost`, `espell`, `egquery`, `ecitmatch`
are XML-only — `json` is silently downgraded server-side.

**ELink `cmd` variants** (default `neighbor`): `neighbor_score` (with
relevancy), `neighbor_history` (posts to History Server), `acheck` /
`ncheck` / `lcheck` (existence checks), `llinks` / `llinkslib` /
`prlinks` (LinkOut URLs).

**PubMed `efetch` rettype/retmode shortcuts.** `xml` -> PubmedArticleSet,
`medline` -> MEDLINE tagged, `abstract&retmode=text` -> plain abstracts,
`uilist` -> UID list only.

### `new EUtils(config)`

```ts
new EUtils({
  tool: string;        // required — application name (NCBI usage policy)
  email: string;       // required — developer contact
  apiKey?: string;     // optional — raises rate limit 3 → 10 req/s
  maxRetries?: number; // optional — default 3
})
```

Throws synchronously if `tool` or `email` is missing. Constructs a private
`TokenBucket` sized to the rate limit; never shared across instances.

### `esearch(params): Promise<ESearchResult>`

Search a database; returns matching UIDs.

```ts
const r = await eutils.esearch({
  db: 'pubmed',
  term: 'CRISPR gene therapy',
  retmax: 100,
  usehistory: 'y',  // store in History Server for chained efetch/esummary
});
// r.idList: string[], r.count: number, r.webEnv?, r.queryKey?
```

Key params: `db`, `term`, `retmax` (default 20, max 10K), `retstart`,
`usehistory`, `WebEnv`, `query_key`, `datetype`, `reldate`, `mindate`,
`maxdate`, `sort`, `field`, `idtype`, `retmode` (`xml` | `json`).

Returns parsed result or throws `EUtilsHttpError` on non-2xx.

### `efetch(params): Promise<string>`

Fetch raw records. Always returns a **string** — caller parses based on
`rettype`/`retmode`. For PubMed, pass to `@ncbijs/pubmed-xml`.

```ts
const xml = await eutils.efetch({
  db: 'pubmed',
  id: '12345,67890',
  rettype: 'abstract',
  retmode: 'xml',
});
```

Switches automatically to **POST** when `id` exceeds URL-length safe
threshold; the History Server (`WebEnv` + `query_key`) is preferred for
large ID lists.

### `efetchBatches(params): AsyncIterableIterator<string>`

Stream-fetch a posted ID set in batches (default 500/batch). Yields raw
response strings.

```ts
const post = await eutils.epost({ db: 'pubmed', id: '...' });
for await (const xml of eutils.efetchBatches({
  db: 'pubmed',
  WebEnv: post.webEnv,
  query_key: post.queryKey,
  rettype: 'abstract',
  retmode: 'xml',
})) {
  // process batch
}
```

Hard cap of 10,000 iterations as a safety net.

### `esummary(params): Promise<ESummaryResult>`

Document summaries (lighter than `efetch`). Supports `version: '2.0'`
for the modern JSON-friendly schema.

### `epost(params): Promise<EPostResult>`

POST UIDs to History Server. Returns `{ webEnv, queryKey }` for use with
later `efetch`/`esummary`/`elink` calls.

### `elink(params): Promise<ELinkResult>`

Discover links between databases (e.g. `pubmed → pmc`, `gene → snp`).
Accepts `cmd` for variants like `neighbor_history`.

### `einfo(params?): Promise<EInfoResult>`

Database metadata or list-all-databases (when called without params).

### `espell(params): Promise<ESpellResult>`

Spelling correction for a search term.

### `egquery(params): Promise<EGQueryResult>`

Cross-database hit counts for a term.

### `ecitmatch(params): Promise<ECitMatchResult>`

Citation-string → PMID. Always XML format internally; returns parsed
object.

### `searchAndFetch(params): AsyncIterableIterator<string>`

Convenience: chains `esearch(usehistory=y)` → `efetchBatches()`. Yields
raw response batches.

### `searchAndSummarize(params): AsyncIterableIterator<ESummaryResult>`

Convenience: chains `esearch(usehistory=y)` → `esummary()` in batches.

## Configuration

| Field        | Type     | Required | Default | Notes                                                              |
| ------------ | -------- | -------- | ------- | ------------------------------------------------------------------ |
| `tool`       | `string` | yes      | —       | NCBI requires per their usage policy                               |
| `email`      | `string` | yes      | —       | Contact for abuse / quota issues                                   |
| `apiKey`     | `string` | no       | —       | Raises rate from 3 → 10 req/s. [Get one][apikey].                  |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429/5xx                         |

[apikey]: https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/

Env vars are NOT read by the client itself — pass them in. The E2E
suite reads `NCBI_API_KEY` via `e2e/test-config.ts`.

## Rate limiting & credentials

- Token bucket with capacity = rate. Refills smoothly (no burst beyond
  capacity).
- Per-instance, NOT shared globally. If you spin up multiple `EUtils`
  instances they will collectively exceed the rate. **Use one instance
  per process.**
- Credentials (`tool`, `email`, `api_key`) are appended to **every**
  request via `appendEUtilsCredentials`.

## Cross-package wiring

- **Imports.** `import { EUtils } from '@ncbijs/eutils'`.
- **Composes with `@ncbijs/rate-limiter`** — `TokenBucket` is internal
  but also re-exported for advanced use.
- **Used by:**
  - `@ncbijs/pubmed/src/pubmed-client.ts` — chains esearch + efetch +
    pubmed-xml parsing.
  - `@ncbijs/pmc/src/pmc-client.ts` — wraps efetch for PMC IDs and
    delegates to `@ncbijs/jats` for parsing.
  - `@ncbijs/clinvar/src/http/clinvar.ts` — uses esearch + esummary on
    `clinvar` db.

When extending eutils for a new domain, follow the pattern in `pubmed`:
keep the eutils instance private, expose a typed surface, parse the raw
string into typed objects.

## Common pitfalls

1. **Sharing instances across processes.** Each instance has its own
   token bucket. Two processes hitting the same NCBI key will exceed
   the rate limit silently (NCBI returns 429 → retried → eventually
   throws). Solve via a single shared process or a coordination layer
   outside this package.

2. **`retmode: 'json'` is unsupported on some endpoints.** `efetch`,
   `epost`, `espell`, `egquery`, `ecitmatch` are XML-only at the API
   level. Passing `retmode: 'json'` to these is silently downgraded by
   NCBI — parse as XML.

3. **History Server entries expire.** WebEnv + query_key tokens last
   ~1 hour. Long-running pipelines should re-post or paginate
   eagerly. `efetchBatches` and `searchAndFetch` handle this implicitly
   by chaining within one call.

4. **`id` parameter URL length.** Lists beyond ~2K characters of ID
   should be POSTed via `epost` first, then fetched via History Server
   — the client switches to POST automatically when needed but cannot
   recover from a server-side URL limit hit on partial requests.

5. **Empty response strings.** `efetchBatches` breaks the loop on empty
   responses (some Entrez databases return empty when retstart exceeds
   the actual count without erroring). Don't rely on `count` to drive
   termination.

6. **PubMed/PMC pagination cap: `retstart + retmax <= 10,000`** (Feb 2026
   change). Beyond the 10K window you must segment by date (`mindate` /
   `maxdate` / `datetype`) or by sub-query. Other Entrez databases still
   allow higher offsets.

7. **`epost` does NOT accept PMCIDs.** Only native PMC UIDs (numeric, no
   `PMC` prefix). For PMCID -> PMC UID, run an `esearch` against the
   `pmc` database first or convert via `@ncbijs/id-converter`.

8. **`>200 UIDs` requires POST.** The client switches automatically
   based on URL length, but for very large lists prefer the History
   Server (`epost` then `efetch` with `WebEnv` + `query_key`) over
   inline `id=` POST bodies.

## Testing

```bash
# Unit tests (mocked fetch)
pnpm nx run @ncbijs/eutils:test

# E2E (real NCBI; needs NCBI_API_KEY env var)
pnpm nx run ncbijs-e2e:e2e -- eutils

# Type-check + lint + build
pnpm nx run @ncbijs/eutils:typecheck
pnpm nx run @ncbijs/eutils:lint
pnpm nx run @ncbijs/eutils:build
```

Fixtures live in `packages/eutils/src/parsers/__fixtures__/` (one XML
sample per parser).

## Files

```
packages/eutils/src/
  index.ts                     # public re-exports
  eutils.ts                    # EUtils class
  config.ts                    # constants + appendEUtilsCredentials
  http-client.ts               # EUtilsHttpError + retry middleware
  ncbi-client.ts               # createNcbiClient (openapi-fetch wrapper)
  schema.ts                    # openapi-typescript output (do not edit by hand)
  parsers/
    {endpoint}-parser.ts       # XML / JSON parsers, one per endpoint
    __fixtures__/*.xml         # response samples
  types/
    params.ts                  # request param interfaces
    responses.ts               # parsed response interfaces
```
