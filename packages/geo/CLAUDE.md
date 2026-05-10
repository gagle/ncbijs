---
package: '@ncbijs/geo'
purpose: 'Typed client for NCBI Gene Expression Omnibus (GEO) — search and fetch dataset/series records (microarray, RNA-seq, ChIP-seq metadata, sample lists, FTP links, BioProject cross-refs) via the E-utilities `gds` database.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'Geo'
  - 'GeoHttpError'
  - 'GeoConfig'
  - 'GeoSearchResult'
  - 'GeoRecord'
  - 'GeoSample'
related_docs:
  - 'docs/ncbi-api-catalog.md'
  - 'docs/package-architecture.md'
last_audited: '2026-03-17'
---

# @ncbijs/geo

## Purpose

Domain wrapper over the NCBI Entrez `gds` database — Gene Expression
Omnibus, NCBI's archive of high-throughput functional-genomics
experiments (microarray, RNA-seq, ChIP-seq, ATAC-seq, single-cell, …).
Each GEO record carries:

- the accession (`GSE...` series, `GDS...` curated dataset,
  `GPL...` platform, `GSM...` sample),
- the source organism (taxon),
- the dataset type (`'Expression profiling by high throughput
  sequencing'`, `'Genome binding/occupancy profiling by high
  throughput sequencing'`, …) and platform technology,
- publication date and supplementary-file pointers,
- the list of samples and the total sample count,
- linked PubMed IDs and the parent BioProject,
- direct FTP path for downloading raw / processed data.

The package exists as a separate domain client (rather than asking
users to call `eutils.esearch({ db: 'gds' })` directly) because:

- The Entrez database name (`gds` — for "Gene-expression DataSets") is
  not the obvious user-facing name (`geo`); having a typed `Geo` class
  hides this mismatch.
- The `esummary` JSON uses NCBI lowercase / under-scored field names
  (`entrytype`, `gdstype`, `ptechtype`, `pdat`, `n_samples`,
  `pubmedids`, `ftplink`, `gpl`, `gse`); `mapGeoRecord` flattens
  these into a stable camelCase shape with safe defaults.
- `pubmedids` arrives as a mixed `string | number` array depending on
  the record; the mapper coerces every element to `string` so
  consumers never have to think about it.

## When to use

- Discover datasets matching a biological term
  (`'RNA-seq human liver'`).
- Fetch metadata + sample lists for known GEO accessions.
- Resolve a GEO series → linked PubMed publications → BioProject in
  one chain.
- Get the FTP download URL for a dataset's raw files.
- Cross-reference clinical or variant findings to expression studies.

## When NOT to use

| If you want to                                       | Use instead                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Download raw FASTQ / SRA reads                       | `@ncbijs/eutils` (`efetch` on `sra`) — GEO surfaces only the FTP URL    |
| Parse processed expression matrices                  | Out of scope — fetch the supplementary file from `record.ftpLink` and   |
|                                                      | parse it yourself (TSV, MTX, HDF5, …)                                    |
| Find genes with differential expression              | Out of scope — query GEO Profiles or compute from raw data               |
| Look up a gene by symbol or NCBI Gene ID             | `@ncbijs/eutils` (`esearch` / `esummary` on `gene`)                      |
| Find clinical-variant interpretations                | `@ncbijs/clinvar`                                                        |
| Find literature about a dataset                      | `record.pubmedIds` + `@ncbijs/pubmed`, or `elink` from `gds` → `pubmed`  |

## Exports

| Export            | Kind      | Purpose                                                              |
| ----------------- | --------- | -------------------------------------------------------------------- |
| `Geo`             | class     | Main HTTP client (`search`, `fetch`, `searchAndFetch`)               |
| `GeoHttpError`    | class     | HTTP-level failure (extends `HttpRetryError`)                        |
| `GeoConfig`       | interface | `{ apiKey?, tool?, email?, maxRetries? }`                            |
| `GeoSearchResult` | interface | `{ total, ids }`                                                     |
| `GeoRecord`       | interface | Flattened dataset/series/platform/sample record — see API surface    |
| `GeoSample`       | interface | `{ accession, title }` — entries inside `GeoRecord.samples`          |

## API surface

### `new Geo(config?)`

```ts
new Geo({
  apiKey?: string;     // E-utilities API key — raises rate 3 → 10 req/s
  tool?: string;       // application name — included on every request
  email?: string;      // contact email — included on every request
  maxRetries?: number; // default 3
});
```

Constructs a private `TokenBucket` whose rate is selected from the
shared E-utilities constants:

- no key → `EUTILS_REQUESTS_PER_SECOND` (3)
- with key → `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` (10)

Per-instance bucket. Use one `Geo` per process.

### `search(term, options?): Promise<GeoSearchResult>`

GETs `esearch.fcgi?db=gds&term=...&retmode=json`. Returns total match
count and the list of UIDs.

```ts
const r = await geo.search('RNA-seq human liver');
r.total; // 42
r.ids;   // ['200198674', '200198321', ...]

const limited = await geo.search('single-cell', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID list
(NCBI default ≈ 20). The Entrez DB is `gds` even though the package
and accessions are called "GEO".

### `fetch(ids): Promise<ReadonlyArray<GeoRecord>>`

GETs `esummary.fcgi?db=gds&id=...&retmode=json`. Returns one
`GeoRecord` per UID with NCBI's response flattened into camelCase:

```ts
{
  uid: string;                    // numeric Entrez UID (NOT the GSE/GDS accession)
  accession: string;              // 'GDS6063', 'GSE12345', 'GPL570', 'GSM98765'
  title: string;
  summary: string;                // free-text abstract
  taxon: string;                  // 'Homo sapiens', …
  entryType: string;              // 'GSE' | 'GDS' | 'GPL' | 'GSM'
  datasetType: string;            // gdstype — 'Expression profiling by high throughput sequencing'
  platformTechnologyType: string; // ptechtype — 'high-throughput sequencing', 'in situ oligonucleotide'
  publicationDate: string;        // pdat — string, format varies
  supplementaryFiles: string;     // raw NCBI string — may be CSV-like
  samples: ReadonlyArray<GeoSample>;
  sampleCount: number;            // n_samples
  pubmedIds: ReadonlyArray<string>; // coerced from mixed string|number array
  ftpLink: string;
  bioproject: string;             // 'PRJNA…' or '' if absent
  platformId: string;             // gpl — 'GPL570'
  seriesId: string;               // gse — 'GSE12345'
}
```

Empty input → empty output (no HTTP call). Entries returned with an
`error` field are silently skipped — the result array length may be
smaller than `ids.length`.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<GeoRecord>>`

Convenience wrapper: chains `search` + `fetch`. Returns `[]` if the
search yields no IDs (no second round-trip).

## Configuration

| Field        | Type     | Required | Default | Notes                                                 |
| ------------ | -------- | -------- | ------- | ----------------------------------------------------- |
| `apiKey`     | `string` | no       | —       | Raises rate 3 → 10 req/s (E-utilities tiering)        |
| `tool`       | `string` | no       | —       | NCBI usage policy — supply when known                 |
| `email`      | `string` | no       | —       | Contact for abuse / quota issues                      |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx          |

Env vars are NOT read by the client itself — pass them in. The E2E
suite reads `NCBI_API_KEY` via `e2e/test-config.ts`.

## Rate limiting & credentials

- **E-utilities tiering applies.** This package shares the
  `EUTILS_REQUESTS_PER_SECOND` and `EUTILS_REQUESTS_PER_SECOND_WITH_KEY`
  constants from `@ncbijs/eutils/config` — currently 3 (no key) / 10
  (with key).
- **Credentials appended to every request.** `tool`, `email`,
  `api_key` ride on the URL via `appendEUtilsCredentials` from the
  `/config` subpath. Same helper used by `@ncbijs/eutils`.
- **Per-instance bucket.** Don't run two `Geo` instances against
  the same key in one process — the buckets don't coordinate.

## Cross-package wiring

- **Imports.** `import { Geo } from '@ncbijs/geo'`.
- **Composes with `@ncbijs/eutils`** via the `/config` subpath only —
  imports `EUTILS_BASE_URL`, the rate constants, the
  `EUtilsCredentials` type, and `appendEUtilsCredentials`. Does **not**
  instantiate the full `EUtils` class (avoids pulling in the full
  client surface for a JSON-only consumer).
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `GeoHttpError` extends
  `HttpRetryError`.
- **No XML dependency.** The GEO esummary response is pure JSON, so
  this package does not depend on `@ncbijs/xml`.
- **No internal consumers.** `@ncbijs/http-mcp` does not currently
  expose GEO tools; `@ncbijs/etl` does not register a GEO dataset.
  If/when MCP tools are added, follow the pattern in
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/geo-search.ts`.

## Common pitfalls

1. **The Entrez DB is `gds`, not `geo`.** Both `esearch` and
   `esummary` calls go to `db=gds`. If you bypass this client and
   hand-write E-utilities calls, using `db=geo` will fail. The
   package name and the accession prefix (`GSE...`, `GDS...`) are
   "GEO"; the underlying database name is `gds`.

2. **`uid` is the Entrez UID, NOT the user-visible GEO accession.**
   The Entrez UID for a series like `GSE12345` is a long synthetic
   number such as `200012345`. The user-visible accession lives on
   `accession`. When persisting records, key by `accession` — UIDs
   are stable but opaque, accessions are the canonical public ID.

3. **`pubmedIds` is normalised to strings.** NCBI returns the
   `pubmedids` array with mixed types (some entries are numbers,
   some are strings) depending on the record. The mapper coerces
   every element via `String()` for stability — don't try to use
   strict-equality against a numeric PMID.

4. **`entryType` is a string union in practice.** Common values are
   `'GSE'` (series), `'GDS'` (curated dataset), `'GPL'` (platform),
   `'GSM'` (sample). The interface types it as `string` (matches the
   wire format), but downstream callers can safely narrow to the
   union if NCBI introduces no new entry types.

5. **`supplementaryFiles` is a raw string, not an array.** NCBI
   returns a delimited string (often semicolon- or comma-separated)
   listing supplementary file URLs. The package surfaces it as-is;
   split it yourself if needed. Format is not strictly defined.

6. **Many fields can be empty strings or `0`.** Records that NCBI
   has not enriched (e.g. very old GDS entries, third-party
   submissions) often have empty `summary`, `taxon`, `bioproject`,
   `platformTechnologyType`, or `sampleCount: 0`. The mapper
   defaults preserve presence (the field is always there) — check
   for empty values, not `undefined`.

7. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment with the request.

8. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class. Don't refactor to
   `from '@ncbijs/eutils'` — it would bloat the bundle and break the
   convention shared by `@ncbijs/omim`, `@ncbijs/medgen`, `@ncbijs/gtr`.

9. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. Useful, but be aware that
   `total: 0` from `search` short-circuits without a second
   round-trip — you cannot observe a "search succeeded but fetch
   failed" state through this method.

## Testing

```bash
pnpm nx run @ncbijs/geo:test          # unit (mocked fetch)
pnpm nx run ncbijs-e2e:e2e -- geo     # E2E (live NCBI, needs NCBI_API_KEY)
pnpm nx run @ncbijs/geo:typecheck
pnpm nx run @ncbijs/geo:lint
pnpm nx run @ncbijs/geo:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, mapping with all fields populated, missing optional fields,
mixed numeric/string `pubmedids` coercion, entries with `error` field,
and `searchAndFetch` short-circuit.

## Files

```
packages/geo/src/
  index.ts                       # public re-exports
  geo.ts                         # Geo class + esearch/esummary + GeoRecord/GeoSample mappers
  geo.spec.ts
  geo-client.ts                  # fetchJson + GeoHttpError + GeoClientConfig
  geo-client.spec.ts
  interfaces/
    geo.interface.ts             # GeoConfig, GeoSearchResult, GeoRecord, GeoSample
```
