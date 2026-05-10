---
package: '@ncbijs/id-converter'
purpose: 'Batch conversion between PMID, PMCID, DOI, and NIH Manuscript ID via the NCBI PMC ID Converter API. Includes pure validators, a bulk PMC-ids.csv parser, and a storage-mode factory.'
layout: 'split'
storage_mode: true
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/etl'
  - '@ncbijs/http-mcp'
exports:
  - 'convert'
  - 'createConverter'
  - 'IdConverterHttpError'
  - 'parsePmcIdsCsv'
  - 'isPMID'
  - 'isPMCID'
  - 'isDOI'
  - 'isMID'
  - 'ConvertedId'
  - 'ConvertParams'
  - 'IdConverterConfig'
  - 'IdType'
  - 'OutputFormat'
  - 'VersionedId'
  - 'DataStorage'
related_docs:
last_audited: '2026-03-24'
---

# @ncbijs/id-converter

## Purpose

Biomedical articles surface under four different identifier systems —
PMID (PubMed), PMCID (PubMed Central, optionally versioned as
`PMC1234567.2`), DOI (publisher-issued), and MID (NIH Manuscript ID,
e.g. `NIHMS123456`). Round-tripping between them is needed for every
non-trivial literature pipeline.

This package wraps NCBI's PMC ID Converter API
(`pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/`) into:

1. A typed `convert(ids, options?)` function (HTTP).
2. A `createConverter(storage)` factory that returns the same
   `(ids) => ConvertedId[]` shape but reads from local storage —
   used by `@ncbijs/etl` to query the offline `id-mappings` dataset.
3. Stateless validators (`isPMID`, `isPMCID`, `isDOI`, `isMID`) for
   pre-flight format detection without a network call.
4. A bulk parser for the `PMC-ids.csv.gz` archive published by NCBI.

## When to use

- Convert a heterogeneous mix of identifiers (`['35266103',
  'PMC9012345', '10.1038/...']`) in one request — the API
  auto-detects per-row.
- Resolve a DOI to a PMID before calling `@ncbijs/eutils` /
  `@ncbijs/pubmed` (those don't accept DOIs directly).
- Detect ID format client-side before deciding how to query
  (`isPMID(value) ? eutils.efetch(...) : convert([value])`).
- Ingest the `PMC-ids.csv.gz` distribution into local storage.
- Run conversions against an offline DuckDB-backed
  `@ncbijs/store` instead of hitting NCBI.

## When NOT to use

| If you want to                                    | Use instead                                          |
| ------------------------------------------------- | ---------------------------------------------------- |
| Search PubMed metadata or full text               | `@ncbijs/pubmed`                                     |
| Fetch PMC full-text JATS                          | `@ncbijs/pmc`                                        |
| Extract IDs from an XML response you already have | `readTag(xml, 'PMID')` from `@ncbijs/xml`            |
| Resolve dbSNP rsIDs, ClinVar VCV, gene IDs        | `@ncbijs/snp`, `@ncbijs/clinvar`, `@ncbijs/datasets` |
| Run any other Entrez E-utility                    | `@ncbijs/eutils`                                     |

## Exports

| Export                  | Kind      | Purpose                                                                     |
| ----------------------- | --------- | --------------------------------------------------------------------------- |
| `convert`               | function  | HTTP conversion: `(ids, options?, config?) => Promise<ConvertedId[]>`       |
| `createConverter`       | function  | Storage-mode factory: `(storage) => (ids) => Promise<ConvertedId[]>`        |
| `IdConverterHttpError`  | class     | Thrown on non-2xx responses; carries `status` + `body`                      |
| `parsePmcIdsCsv`        | function  | Bulk parser: `PMC-ids.csv` text -> `ConvertedId[]`                          |
| `isPMID`                | function  | Validator: positive integer                                                 |
| `isPMCID`               | function  | Validator: `PMC<digits>` optionally `.<version>` (case-insensitive)         |
| `isDOI`                 | function  | Validator: `10.<registrant>/<suffix>`                                       |
| `isMID`                 | function  | Validator: `NIHMS<digits>` (case-insensitive)                               |
| `ConvertedId`           | interface | `{ pmid, pmcid, doi, mid?, versions?, aiid? }`                              |
| `ConvertParams`         | interface | Per-request options accepted by `convert`                                   |
| `IdConverterConfig`     | interface | `{ maxRetries? }` — top-level client config                                 |
| `IdType`                | type      | `'pmid' \| 'pmcid' \| 'doi' \| 'mid'`                                       |
| `OutputFormat`          | type      | `'json' \| 'xml' \| 'csv' \| 'html'`                                        |
| `VersionedId`           | interface | `{ pmcid, current }` — element of `ConvertedId.versions`                    |
| `DataStorage`           | interface | Structural contract for `createConverter` (mirrors `@ncbijs/store`)         |

## API surface

**Endpoint.** `GET https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/?ids={csv}&format=json&idtype={t}&versions={yes|no}&showaiid={yes|no}&tool={tool}&email={email}`.
Always sent as `format=json` regardless of `options.format`.

### `convert(ids, options?, config?): Promise<ReadonlyArray<ConvertedId>>`

```ts
const records = await convert(['35266103', '10.1038/s41586-022-04569-1', 'PMC9012345']);
// [{ pmid: '35266103', pmcid: 'PMC...', doi: '10.1038/...', ... }]
```

| Param         | Type                       | Required | Notes                                          |
| ------------- | -------------------------- | -------- | ---------------------------------------------- |
| `ids`         | `ReadonlyArray<string>`    | yes      | 1..200 entries; throws on `0` or `>200`        |
| `options.idtype`    | `IdType`             | no       | Hint when input format is ambiguous            |
| `options.versions`  | `boolean`            | no       | Include all PMCID versions in `versions[]`     |
| `options.showaiid`  | `boolean`            | no       | Include `aiid` (Article Instance ID)           |
| `options.tool`      | `string`             | no       | NCBI usage-policy hint (recommended)           |
| `options.email`     | `string`             | no       | NCBI usage-policy hint (recommended)           |
| `config.maxRetries` | `number`             | no       | Default 3                                      |

Records with `errmsg` set on the wire are filtered out — you get
back only successful conversions, never an error sentinel mixed
into the array. Length of the result array can therefore be `<` the
input length.

### `createConverter(storage): (ids) => Promise<ConvertedId[]>` — storage mode

Returns a function with the same external shape as `convert(ids)`
but backed by a `DataStorage` adapter (typically `ReadableStorage`
from `@ncbijs/store`).

```ts
import { ReadableStorage } from '@ncbijs/store';
const storage = await ReadableStorage.open('ncbi.duckdb');
const lookup = createConverter(storage);
const records = await lookup(['35266103']);
```

The storage adapter must expose an `id-mappings` dataset whose row
shape matches `ConvertedId`. `@ncbijs/etl`'s ETL job populates this
dataset from `PMC-ids.csv.gz` via `parsePmcIdsCsv`.

### `parsePmcIdsCsv(csv: string): ReadonlyArray<ConvertedId>` — bulk parser

Stateless. Parses NCBI's monthly `PMC-ids.csv` export. Resolves
column indices from the header row (column order has changed
historically — never index by position) and tolerates quoted
fields with embedded commas / escaped quotes. Returns `[]` when
the header row is missing or the required `pmcid` / `pmid`
columns are absent.

### Validators

```ts
isPMID('35266103');                  // true   — /^\d{1,8}$/
isPMID('PMC9012345');                // false  — leading non-digit
isPMCID('PMC9012345');               // true   — /^PMC\d+(\.\d+)?$/i
isPMCID('PMC9012345.2');             // true   — versioned
isDOI('10.1038/s41586-022-04569-1'); // true   — /^10\.\d{4,9}\/[^\s]+$/
isMID('NIHMS123456');                // true   — /^(NIHMS|EMS)\d+$/i
```

Pure regex tests; no network. Case-insensitive for `PMC...` and
`NIHMS...` / `EMS...`.

### `IdConverterHttpError`

Extends `HttpRetryError` from `@ncbijs/rate-limiter`. Thrown when
the underlying `fetchWithRetry` exhausts retries. Carries `status`
and `body` for diagnostics. `convert()` re-throws it as-is; if the
upstream returns 200 with an unparseable body, `convert()` instead
throws a plain `Error('ID Converter API returned malformed response')`
with the underlying parse failure attached as `cause`.

## Configuration

| Field        | Type     | Default | Notes                                       |
| ------------ | -------- | ------- | ------------------------------------------- |
| `maxRetries` | `number` | `3`     | Exponential backoff with jitter on 429 / 5xx |

`tool` and `email` are per-request options on `ConvertParams`, not
client-level config — pass them through `options` on every call
where they matter.

## Rate limiting & credentials

- Rate limit: **3 req/s**, enforced by a private `TokenBucket`. The
  PMC ID Converter does not document a public rate limit; 3 req/s
  matches the conservative E-utilities default and avoids quota
  conflicts when sharing a process.
- Module-level default config (`defaultConfig` in
  `id-converter-client.ts`) is shared across calls that don't pass
  an explicit `config` argument — so a 1000-call ETL loop reusing
  the default does **not** spin up 1000 token buckets.
- No API-key concept; pass `tool` + `email` per request to comply
  with NCBI's usage policy.

## Storage mode

`createConverter(storage)` accepts any object satisfying the local
`DataStorage` interface — `ReadableStorage` from `@ncbijs/store`
matches by structure, no runtime import needed. The storage backend
must expose a dataset named `id-mappings` keyed by **PMID** (the
ETL job loads each row under `record.pmid`).

| Method                         | HTTP mode (`convert`)              | Storage mode (`createConverter` returned fn) |
| ------------------------------ | ---------------------------------- | -------------------------------------------- |
| Round-trip ID conversion       | yes                                | yes (subset — see below)                     |
| Network call                   | yes                                | no                                           |
| Auto-detect input `idtype`     | yes (server-side)                  | no — caller must pass PMIDs                  |
| `versions[]` PMCID history     | yes when `options.versions: true`  | yes if storage row carries it                |
| `aiid` Article Instance ID     | yes when `options.showaiid: true`  | yes if storage row carries it                |
| `tool` / `email` policy hints  | yes                                | n/a                                          |

In storage mode, lookup is performed via `storage.getRecord('id-mappings', id)`
**per ID, sequentially**. There is no batch path — for high-volume
offline lookups, prefer `searchRecords` directly on
`ReadableStorage` if you need predicate queries.

Unlike `@ncbijs/mesh`, this package does **not** define a
`StorageModeError`; the HTTP-only methods (`convert`,
`parsePmcIdsCsv`) and the storage-only path (`createConverter`)
are entirely separate functions, so there is no instance whose
mode could be mismatched.

## Cross-package wiring

- **Imports.** `import { convert, createConverter, isPMID, parsePmcIdsCsv } from '@ncbijs/id-converter'`.
- **Composes with `@ncbijs/rate-limiter`** for token-bucket-paced
  retries.
- **Used by `@ncbijs/etl`** — the `id-converter` ETL job in
  `dataset-registry.ts` chains
  `createHttpSource(PMC-ids.csv.gz)` -> `parsePmcIdsCsv`
  -> DuckDB sink, populating the `id-mappings` dataset that
  `createConverter` reads.
- **Used by `@ncbijs/http-mcp`** — `utility-tools.ts` exposes a
  `convert-ids` MCP tool calling `convert` directly.
- **Pairs with `@ncbijs/pubmed`** — convert a DOI to a PMID before
  searching, since the PubMed search API does not accept DOIs
  natively.

## Common pitfalls

1. **`MAX_IDS_PER_REQUEST = 200` is a hard throw, not a slice.**
   Passing 201 IDs throws synchronously before any HTTP call. The
   client does **not** auto-batch; callers chunking large lists
   must implement their own loop.

2. **Empty array also throws.** `convert([])` rejects with
   `Error('ids array must not be empty')`. The same holds for the
   `createConverter` returned function. Validate upstream.

3. **PMCIDs require the `PMC` prefix unless `idtype: 'pmcid'` is
   explicit.** The API treats bare numeric strings as PMIDs by
   default, so `convert(['9012345'])` resolves the wrong article.
   Use `isPMCID` to decide whether to prefix.

4. **`live=false` and `release-date` are not on `ConvertedId`.** The
   wire response carries them (article-under-embargo signal) but
   the typed interface drops them. The full wire row shape is:

   ```json
   {
     "pmid": "12345678",
     "pmcid": "PMC1234567",
     "doi": "10.1000/example",
     "mid": null,
     "live": true,
     "release-date": null,
     "versions": [{ "pmcid": "PMC1234567.1", "current": true }],
     "aiid": "1234567",
     "errmsg": null
   }
   ```

   If you need embargo awareness, call `fetchJson` from
   `id-converter-client.ts` directly and read the raw object.

5. **Records with errors are silently filtered.** When an ID is not
   found, the wire row carries `errmsg` and the client drops it
   from the result array. The result-array length is therefore
   `<= ids.length`. Cross-reference by `pmid` / `pmcid` / `doi`,
   not by index.

6. **Versioned PMCIDs.** `versions[]` is only populated when
   `options.versions: true`. Without the flag the response includes
   only the canonical (non-versioned) `pmcid`, even for articles
   with corrected versions. Pipelines that build URLs to specific
   article versions must opt in.

7. **`parsePmcIdsCsv` resolves columns by header name.** Do not
   reorder the CSV before parsing, but also do not assume a fixed
   position — NCBI has shipped column-order changes across years.
   The parser returns `[]` if `pmcid` or `pmid` columns are
   missing entirely.

8. **`'csv'` / `'xml'` / `'html'` formats are documented but
   unimplemented.** `convert` always sends `format=json` regardless
   of `options.format`. The `OutputFormat` type is exported for
   wire-shape completeness, not as a switch on `convert`. If you
   need raw CSV / XML, call `fetchJson` (rename it!) directly or
   bypass the package.

## Testing

```bash
pnpm nx run @ncbijs/id-converter:test
pnpm nx run ncbijs-e2e:e2e -- id-converter
```

`convert.spec.ts` stubs `fetch`. `convert-storage.spec.ts` uses an
in-memory `DataStorage` mock. `parse-pmc-ids-csv.spec.ts` uses a
small inline CSV fixture covering quoted fields and embedded
commas. E2E hits the real NCBI host.

## Files

```
packages/id-converter/src/
  index.ts                              # public re-exports
  validate.ts                           # isPMID / isPMCID / isDOI / isMID
  validators.spec.ts
  interfaces/
    id-converter.interface.ts           # ConvertedId, ConvertParams, DataStorage, ...
  http/
    convert.ts                          # convert + createConverter
    convert.spec.ts
    convert-storage.spec.ts
    id-converter-client.ts              # IdConverterHttpError, fetchJson, defaultConfig
    schema.ts                           # openapi-typescript output (do not edit by hand)
  bulk-parsers/
    parse-pmc-ids-csv.ts                # PMC-ids.csv -> ConvertedId[]
    parse-pmc-ids-csv.spec.ts
```
