---
package: '@ncbijs/pmc'
purpose: 'PMC full-text article retrieval over three NCBI surfaces (E-utilities efetch, OA Service via S3 metadata, OAI-PMH harvesting). Parses JATS XML, normalises PMCIDs, and re-exports JATS markdown / plain-text / chunking helpers.'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/jats'
  - '@ncbijs/rate-limiter'
  - '@ncbijs/xml'
used_by:
  - '@ncbijs/http-mcp'
related_docs:
  - 'docs/ncbi-api-catalog.md'
exports:
  - 'PMC'
  - 'PMCHttpError'
  - 'pmcToMarkdown'
  - 'pmcToPlainText'
  - 'pmcToChunks'
  - 'parsePmcS3Inventory'
  - 'FullTextArticle'
  - 'OARecord'
  - 'OAIRecord'
  - 'PMCConfig'
  - 'OALookupOptions'
  - 'OAListOptions'
  - 'OAIListOptions'
  - 'PmcS3Record'
  - 'Chunk'
  - 'ChunkOptions'
last_audited: '2026-04-10'
---

# @ncbijs/pmc

## Purpose

Domain client for PubMed Central full-text content. PMC exposes three
distinct retrieval surfaces — each with its own URL scheme,
pagination model, and response format:

- **E-utilities** (`efetch?db=pmc`) — JATS XML by PMCID.
- **OA Service** (S3 metadata bucket
  `s3://pmc-oa-opendata/metadata/<PMCID>.<version>.json` exposed at
  `https://pmc-oa-opendata.s3.amazonaws.com`) — open-access lookup
  with download URLs and license codes.
- **OAI-PMH** (`https://pmc.ncbi.nlm.nih.gov/api/oai/v1/mh/`) — bulk
  metadata harvesting with resumption-token pagination.

This package unifies all three behind one client (`PMC` with `.oa.*`
and `.oai.*` namespaces) and re-exports the JATS conversion helpers
(`pmcToMarkdown`, `pmcToPlainText`, `pmcToChunks`) so callers can go
from PMCID to RAG-ready chunks in one import.

## When to use

- Fetch a single PMC article's full text by PMCID and parse it.
- Convert a parsed article to Markdown / plain text / RAG chunks.
- Look up Open Access metadata + download URLs for a PMCID.
- Iterate the OA inventory by date (`oa.since`) for incremental sync.
- Harvest large OAI-PMH metadata sets with resumption-token paging.
- Parse a downloaded PMC OA S3 inventory CSV (`parsePmcS3Inventory`).

## When NOT to use

| If you want to                                      | Use instead                                                |
| --------------------------------------------------- | ---------------------------------------------------------- |
| Search PubMed (citations, no full text)             | `@ncbijs/pubmed`                                           |
| Parse JATS XML you already have                     | `@ncbijs/jats` (`parseJATS`, `toMarkdown`, `toChunks`)     |
| Bulk-load the entire PMC OA archive into storage    | `@ncbijs/etl` + `@ncbijs/pipeline` (composes this package) |
| Call non-PMC E-utilities databases                  | `@ncbijs/eutils` directly                                  |
| Render a citation string from an article            | `@ncbijs/cite`                                             |

## Exports

| Export                | Kind      | Purpose                                                                  |
| --------------------- | --------- | ------------------------------------------------------------------------ |
| `PMC`                 | class     | Main client with `fetch()`, `oa.*`, `oai.*` namespaces                   |
| `PMCHttpError`        | class     | Extends `HttpRetryError` from `@ncbijs/rate-limiter`; carries `status`   |
| `pmcToMarkdown`       | function  | `(article: FullTextArticle) => string` — wraps `@ncbijs/jats` toMarkdown |
| `pmcToPlainText`      | function  | `(article: FullTextArticle) => string` — wraps JATS toPlainText          |
| `pmcToChunks`         | function  | `(article, opts?) => ReadonlyArray<Chunk>` — wraps JATS toChunks         |
| `parsePmcS3Inventory` | function  | `(csv: string) => ReadonlyArray<PmcS3Record>` (bulk-parser)              |
| `FullTextArticle`     | interface | Parsed article: `pmcid`, `front`, `body`, `back`, `license`              |
| `OARecord`            | interface | Open-access metadata + download URLs                                     |
| `OAIRecord`           | interface | Header (identifier/datestamp/setSpec) + raw `metadata` XML payload       |
| `PMCConfig`           | interface | Constructor config (mirrors `EUtilsConfig`)                              |
| `OALookupOptions`     | interface | `{ version?: number }` for `oa.lookup`                                   |
| `OAListOptions`       | interface | `{ until?: string }` for `oa.since`                                      |
| `OAIListOptions`      | interface | `{ from?, until?, set?, metadataPrefix? }` for `oai.listRecords`         |
| `PmcS3Record`         | interface | One row from the OA S3 inventory CSV                                     |
| `Chunk`, `ChunkOptions` | re-export | Type-only re-export from `@ncbijs/jats` for caller convenience         |

## API surface

### `new PMC(config)`

```ts
new PMC({
  tool: string;        // required
  email: string;       // required
  apiKey?: string;     // optional — same effect as on EUtils
  maxRetries?: number; // optional — default 3
})
```

Internally constructs:

- A private `EUtils` instance for `db=pmc` efetch / esearch.
- A private `TokenBucket` at `REQUESTS_PER_SECOND = 3` for direct
  HTTP calls to S3 (OA) and OAI-PMH — these endpoints are **not**
  routed through E-utilities and have their own rate budget.

### `pmc.fetch(pmcid): Promise<FullTextArticle>`

```ts
const article = await pmc.fetch('PMC7096803');
// or pmc.fetch('7096803') — both work
```

Calls `efetch(db='pmc', id=<normalized>, retmode='xml')`, runs the
result through `@ncbijs/jats:parseJATS`, and extracts the license
text by reading the `<license>` block (preferring the
`license-type` attribute, then `<license-p>`, then any `<p>`,
falling back to stripped text). Throws if the response body is
empty or whitespace.

### `pmc.oa.lookup(pmcid, options?): Promise<OARecord>`

```ts
const record = await pmc.oa.lookup('PMC7096803');
// record.xmlUrl, record.textUrl, record.pdfUrl?, record.license, …
```

GETs `https://pmc-oa-opendata.s3.amazonaws.com/metadata/<PMCID>.<version>.json`
(default `version = 1`). Maps the raw S3 metadata to `OARecord`,
rewriting any `s3://pmc-oa-opendata/...` URLs to their
`https://...` equivalents (and stripping query strings). Translates
HTTP 403/404 into `Error('No OA record found for <PMCID>')` and
malformed JSON into `Error('OA lookup returned malformed response …')`.

### `pmc.oa.since(date, options?): AsyncIterableIterator<OARecord>`

```ts
for await (const rec of pmc.oa.since('2024/01/01', { until: '2024/12/31' })) {
  // rec.xmlUrl, rec.license, …
}
```

Uses esearch with the term
`<from>:<until>[pmcrdat] AND (open_access[filter] OR author_manuscript[filter])`
(`until` defaults to the sentinel `'3000'`). Iterates UIDs in pages
of `ESEARCH_BATCH_SIZE = 500`, then for each PMCID fetches the OA
metadata JSON and yields the mapped `OARecord`. **Failed lookups
are silently skipped** — see Common pitfall #4.

### `pmc.oai.listRecords(options): AsyncIterableIterator<OAIRecord>`

```ts
for await (const rec of pmc.oai.listRecords({
  from: '2024-01-01',
  set: 'pmc-open',
  metadataPrefix: 'pmc',
})) {
  // rec.identifier, rec.datestamp, rec.metadata (raw XML)
}
```

Issues `verb=ListRecords` against the OAI-PMH endpoint, follows
`<resumptionToken>` until exhausted, parses each `<record>` block
into header + raw `metadata` XML. Stops on any `<error>` block.

### `pmc.oai.getRecord(pmcid, metadataPrefix?): Promise<OAIRecord>`

`verb=GetRecord` with `identifier=oai:pubmedcentral.nih.gov:<numeric>`.
Throws on HTTP error or `<error>` block; throws `'No record found
for <pmcid>'` if neither `<GetRecord>` nor `<record>` is present.

### `pmcToMarkdown(article)` / `pmcToPlainText(article)` / `pmcToChunks(article, options?)`

Adapters that strip the `pmcid` and `license` fields off
`FullTextArticle` and forward to `@ncbijs/jats`. Use these when
calling code already has a `FullTextArticle`; if you only have raw
JATS XML, call `parseJATS` + `toMarkdown` directly from
`@ncbijs/jats` and skip the indirection.

### `parsePmcS3Inventory(csv): ReadonlyArray<PmcS3Record>`

Bulk parser for the inventory CSV at
`s3://pmc-oa-opendata/inventory-reports/`. Skips empty lines and
`#` comments, decodes quoted CSV fields (handles `""` escapes),
extracts `pmcid` (`PMC\d+` segment), `version` (`v\d+` segment),
and `format` (file extension) from the S3 key path.

## Configuration

| Field        | Type     | Required | Default | Notes                                                                  |
| ------------ | -------- | -------- | ------- | ---------------------------------------------------------------------- |
| `tool`       | `string` | yes      | —       | NCBI usage policy; also sent on OAI-PMH as a query param               |
| `email`      | `string` | yes      | —       | Same                                                                   |
| `apiKey`     | `string` | no       | —       | Forwarded to the internal `EUtils` only                                |
| `maxRetries` | `number` | no       | `3`     | Used for both `EUtils` and the direct OA / OAI-PMH `fetchWithRetry`    |

## Rate limiting & credentials

- **Two separate token buckets per `PMC` instance:**
  1. The internal `EUtils` bucket (sized 3 or 10 req/s by `apiKey`).
  2. A direct `TokenBucket({ requestsPerSecond: 3 })` for OA + OAI-PMH.
- The S3 OA endpoint and OAI-PMH endpoint do **not** accept the NCBI
  API key — `apiKey` does not raise their rate. Only E-utilities
  benefits from it.
- `tool` and `email` are appended to OAI-PMH requests as query
  params (NCBI's softer convention for OAI-PMH).

## Cross-package wiring

- **Imports.**
  - `EUtils` from `@ncbijs/eutils` (efetch, esearch).
  - `parseJATS`, `toMarkdown`, `toPlainText`, `toChunks`, `JATSArticle`,
    `Chunk`, `ChunkOptions` from `@ncbijs/jats`.
  - `TokenBucket`, `HttpRetryError`, `fetchWithRetry`, `RetryConfig`
    from `@ncbijs/rate-limiter`.
  - `readBlock`, `readAllBlocks`, `readTag` from `@ncbijs/xml` (used
    for OAI-PMH envelope parsing and license extraction).
- **Used by.**
  - `@ncbijs/http-mcp/src/tools/pmc-tools.ts` — exposes `get-full-text`
    and `get-full-text-chunks` MCP tools.
- **Composes with.**
  - `@ncbijs/etl` for bulk OA archive loading (uses
    `parsePmcS3Inventory` + `pmc.oa.since` + `@ncbijs/pipeline`).

## Common pitfalls

1. **PMCID prefix handling is one-way only.** `normalizePmcid` adds
   `PMC` if missing; `numericPmcid` strips it. Pass either form to
   public methods, but if you index records yourself, normalise on
   the way in — the OA metadata JSON files are keyed
   `PMC<N>.<version>.json` (with prefix), while OAI-PMH identifiers
   are `oai:pubmedcentral.nih.gov:<N>` (without prefix). A mismatch
   silently fetches the wrong record.

2. **`oa.since` swallows per-record fetch errors.** The async
   generator wraps each S3 metadata fetch in `try { … } catch { continue }`
   to keep iteration moving across malformed entries. If you need
   to know which PMCIDs failed, run `pmc.oa.lookup` for each ID
   yourself instead of using `oa.since`.

3. **License extraction is best-effort.** `extractLicense` first
   reads the `license-type` attribute, then falls back to inner
   text. Articles with non-standard `<license>` markup yield an
   empty string. Don't assert non-empty `article.license`.

4. **OA endpoint moved to S3; legacy `oa.fcgi` URLs are deprecated.**
   This package targets the S3 metadata bucket
   (`pmc-oa-opendata`). Anything you still see referencing
   `https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi` is stale —
   legacy FTP files were moved to a `deprecated/` subdirectory on
   April 13, 2026 and removed entirely in August 2026. Don't add
   fallback code for the old endpoint.

5. **OAI-PMH page sizes are small.** NCBI returns ~10 records per
   page (down from historical 100+). `listRecords` will emit many
   resumption-token round trips for any non-trivial harvest; that's
   normal, not a bug.

6. **`PMCHttpError` is the type, but raw `Error('…', { cause })`
   leaks out.** The HTTP layer throws `PMCHttpError` (with a numeric
   `status`); the `oa` and `oai` namespaces catch and re-throw as
   plain `Error` with a contextual message and the `PMCHttpError`
   on `cause`. Walk `error.cause` to recover the status code.

7. **`parsePmcS3Inventory` silently drops malformed rows.** Lines
   with fewer than 6 fields are skipped, not reported. Pre-validate
   the inventory file size if you need a reliable count.

## Testing

```bash
pnpm nx run @ncbijs/pmc:test
pnpm nx run ncbijs-e2e:e2e -- pmc
pnpm nx run @ncbijs/pmc:typecheck
pnpm nx run @ncbijs/pmc:lint
pnpm nx run @ncbijs/pmc:build
```

Specs are co-located. `pmc.spec.ts` (33 KB) mocks `EUtils` + `fetch`
to cover all three surfaces and the error-translation paths;
`parse-pmc-s3-inventory.spec.ts` covers CSV edge cases (quoted
fields, `""` escapes, missing path segments). E2E tests live in
`e2e/pmc.spec.ts` and require `NCBI_API_KEY`.

## Files

```
packages/pmc/src/
  index.ts                                    # public re-exports
  http/
    pmc.ts                                    # PMC class (fetch, oa.*, oai.*)
    pmc-client.ts                             # fetchJson / fetchText + PMCHttpError
  bulk-parsers/
    parse-pmc-s3-inventory.ts                 # CSV → PmcS3Record[]
    parse-pmc-s3-inventory.spec.ts
  interfaces/
    pmc.interface.ts                          # FullTextArticle, OARecord, OAIRecord, …
```
