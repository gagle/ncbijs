---
package: '@ncbijs/dbvar'
purpose: 'Typed client for NCBI dbVar — search and fetch structural variation records (CNVs, deletions, insertions, inversions, translocations) via the E-utilities `dbvar` database.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'DbVar'
  - 'DbVarHttpError'
  - 'DbVarConfig'
  - 'DbVarSearchResult'
  - 'DbVarRecord'
  - 'DbVarPlacement'
  - 'DbVarGene'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-03-07'
---

# @ncbijs/dbvar

## Purpose

Thin domain wrapper over E-utilities (`esearch` + `esummary` against the
`dbvar` database) for NCBI's Database of Structural Variation. dbVar
catalogues large-scale genomic variants — copy number variants (CNVs),
insertions, deletions, inversions, translocations, and complex
rearrangements — submitted as **studies** (`nstd*`) containing
**variants** (`nsv*`) with chromosomal placements on one or more
assemblies (typically GRCh38 + GRCh37).

The package exists as a separate domain client (rather than asking
users to call `eutils.esummary({ db: 'dbvar' })` directly) because:

- The esummary response embeds five parallel arrays
  (`dbvarplacementlist`, `dbvargenelist`, `dbvarmethodlist`,
  `dbvarclinicalsignificancelist`, `dbvarvarianttypelist`) plus
  `snake_case` field names that need normalising into a typed
  `DbVarRecord`.
- It uses E-utilities credentials (`tool`, `email`, `apiKey`) but
  exposes only the dbVar-relevant subset of options.
- Higher-level integrations (variant-effect pipelines,
  structural-variant browsers) want a typed `DbVarRecord` with parsed
  placements and gene overlaps, not a raw esummary blob.

## When to use

- Look up a structural-variant study by gene name, phenotype, or
  accession (`'BRCA1 deletion'`, `'nstd186'`).
- Fetch placement coordinates (chromosome, start, end, assembly) for
  known dbVar UIDs.
- Enumerate gene overlaps and variant-type categorisations.
- Cross-reference dbSNP / ClinVar findings against larger structural
  context (CNVs, complex rearrangements).

## When NOT to use

| If you want to                                         | Use instead                                    |
| ------------------------------------------------------ | ---------------------------------------------- |
| Look up a single-nucleotide / small-indel variant       | `@ncbijs/snp` (dbSNP)                          |
| Fetch clinical interpretation of a variant              | `@ncbijs/clinvar`                              |
| Look up a gene by symbol or NCBI Gene ID                | `@ncbijs/eutils` (`esearch` on `gene`)         |
| Find literature citations for a structural variant      | `@ncbijs/eutils` (`elink` from `dbvar` → `pubmed`) or `@ncbijs/pubmed` |
| Bulk-download dbVar TSV / VCF archives                  | NCBI dbVar FTP directly — no package wraps it  |

## Exports

| Export               | Kind      | Purpose                                                      |
| -------------------- | --------- | ------------------------------------------------------------ |
| `DbVar`              | class     | Main client                                                  |
| `DbVarHttpError`     | class     | HTTP-level failure (extends `HttpRetryError`)                |
| `DbVarConfig`        | interface | `{ apiKey?, tool?, email?, maxRetries? }`                    |
| `DbVarSearchResult`  | interface | `{ total, ids }`                                             |
| `DbVarRecord`        | interface | Variant or study record with placements, genes, methods      |
| `DbVarPlacement`     | interface | `{ chromosome, start, end, assembly }`                       |
| `DbVarGene`          | interface | `{ id, name }`                                               |

## API surface

### `new DbVar(config?)`

```ts
new DbVar({
  apiKey?: string;     // E-utilities API key (raises rate 3 → 10 req/s)
  tool?: string;       // application name — included in every request
  email?: string;      // contact email — included in every request
  maxRetries?: number; // default 3
});
```

Constructs a private `TokenBucket` whose rate is selected from the
shared E-utilities constants:

- no key → `EUTILS_REQUESTS_PER_SECOND` (3)
- with key → `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` (10)

Per-instance, not shared. Use one `DbVar` per process.

### `search(term, options?): Promise<DbVarSearchResult>`

GETs `esearch.fcgi?db=dbvar&term=...&retmode=json`. Returns total
match count and the list of UIDs.

```ts
const r = await dbvar.search('BRCA1 deletion');
r.total; // 15
r.ids;   // ['12345678', '87654321', ...]

const limited = await dbvar.search('17q12 microdeletion', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID
list. Defaults to NCBI's default (typically 20).

### `fetch(ids): Promise<ReadonlyArray<DbVarRecord>>`

GETs `esummary.fcgi?db=dbvar&id=...&retmode=json`. Maps each entry
into `DbVarRecord`:

```ts
{
  uid: string;                                  // numeric UID
  objectType: string;                           // 'study' | 'variant_region' | 'variant_call'
  studyAccession: string;                       // e.g. 'nstd186'
  variantAccession: string;                     // e.g. 'nsv1234567'
  studyType: string;                            // e.g. 'Case-Set'
  variantCount: number;                         // members in this study (0 for variants)
  taxId: number;                                // 9606 for Homo sapiens
  organism: string;                             // 'Homo sapiens'
  placements: ReadonlyArray<DbVarPlacement>;    // one per assembly (GRCh38 + GRCh37)
  genes: ReadonlyArray<DbVarGene>;              // gene overlaps
  methods: ReadonlyArray<string>;               // discovery methods, e.g. ['Sequencing']
  clinicalSignificances: ReadonlyArray<string>; // e.g. ['Pathogenic']
  variantTypes: ReadonlyArray<string>;          // e.g. ['copy number loss']
  variantCallCount: number;
}
```

Empty input → empty output (no HTTP call). Entries that come back
with an `error` field are skipped silently.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<DbVarRecord>>`

Convenience wrapper: chains `search` + `fetch`. Returns `[]` if the
search produced no IDs (no second HTTP call is made).

## Configuration

| Field        | Type     | Required | Default | Notes                                                     |
| ------------ | -------- | -------- | ------- | --------------------------------------------------------- |
| `apiKey`     | `string` | no       | —       | Raises rate from 3 → 10 req/s (E-utilities tiering)       |
| `tool`       | `string` | no       | —       | NCBI usage policy asks for one — supply when known        |
| `email`      | `string` | no       | —       | Contact for abuse / quota issues                          |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx              |

`appendEUtilsCredentials` adds whichever credentials are present to
every query string.

## Rate limiting & credentials

- **E-utilities tiering applies.** This package shares the
  `EUTILS_REQUESTS_PER_SECOND` and `EUTILS_REQUESTS_PER_SECOND_WITH_KEY`
  constants from `@ncbijs/eutils/config` — currently 3 (no key) / 10
  (with key).
- **Credentials appended to every request.** `tool`, `email`,
  `api_key` ride on the URL via `appendEUtilsCredentials`. Same
  helper used by `@ncbijs/eutils`.
- **Per-instance bucket.** Don't run two `DbVar` instances against
  the same key in one process.

## Cross-package wiring

- **Imports.** `import { DbVar } from '@ncbijs/dbvar'`.
- **Composes with `@ncbijs/eutils`.** Imports `EUTILS_BASE_URL`, the
  rate constants, the `EUtilsCredentials` type, and the
  `appendEUtilsCredentials` helper from `@ncbijs/eutils/config` —
  the package's `/config` subpath export. Does **not** instantiate
  the full `EUtils` class.
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `DbVarHttpError` extends
  `HttpRetryError`.
- **No internal consumers.** `@ncbijs/http-mcp` does **not** currently
  expose dbVar tools; if/when added, the wiring will mirror
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/dbvar-variant.ts`.

## Common pitfalls

1. **Three object types share one record shape.** `objectType` can
   be `'study'`, `'variant_region'`, or `'variant_call'`. Studies
   carry `variantCount > 0` and rarely have `placements`; individual
   variants carry placements but `variantCount == 0`. Filter on
   `objectType` before aggregating counts.

2. **Multiple placements per variant.** dbVar reports placements on
   every supported assembly — typically GRCh38 + GRCh37 — so the
   same variant appears twice in `placements` with different
   `assembly` values. Filter or pick the assembly you want; do not
   assume `placements[0]` is GRCh38.

3. **`variantTypes` is a controlled vocabulary.** Common values:
   `'copy number loss'`, `'copy number gain'`, `'deletion'`,
   `'insertion'`, `'inversion'`, `'translocation'`,
   `'complex chromosomal rearrangement'`. Treat as a string union
   you discover; the API may add new types over time.

4. **Numeric coercion is permissive.** `variantCount`, `taxId`,
   `variantCallCount`, and gene `id` are coerced via
   `Number(value) || 0` — non-numeric or missing values become `0`
   rather than throwing. Don't use `0` as a meaningful sentinel.

5. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment.

6. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. Useful, but be aware that
   `total: 0` from `search` short-circuits without a second
   round-trip.

7. **No bulk / FTP access.** This client only covers the Entrez
   `dbvar` database (search + summary). The full structural-variant
   archives, VCFs, and supplementary submitter files live on the
   dbVar FTP site and are not wrapped by any `@ncbijs/*` package.

8. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class when consumers only
   need the dbVar client. Don't refactor to `from '@ncbijs/eutils'` —
   it would bloat the bundle.

## Testing

```bash
pnpm nx run @ncbijs/dbvar:test          # unit
pnpm nx run ncbijs-e2e:e2e -- dbvar     # E2E (live NCBI)
pnpm nx run @ncbijs/dbvar:typecheck
pnpm nx run @ncbijs/dbvar:lint
pnpm nx run @ncbijs/dbvar:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, multi-placement records, missing list fields, numeric
coercion, entries with `error` field, and `searchAndFetch`
short-circuit. The E2E spec in `e2e/dbvar.spec.ts` exercises live
NCBI with `ncbiApiKey` from `e2e/test-config.ts`.

## Files

```
packages/dbvar/src/
  index.ts                       # public re-exports
  dbvar.ts                       # DbVar class + esearch/esummary + record mappers
  dbvar.spec.ts
  dbvar-client.ts                # fetchJson + DbVarHttpError
  dbvar-client.spec.ts
  interfaces/
    dbvar.interface.ts           # DbVarConfig, DbVarSearchResult, DbVarRecord, DbVarPlacement, DbVarGene
```
