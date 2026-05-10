---
package: '@ncbijs/clinvar'
purpose: 'NCBI ClinVar clinical variant data — search and fetch variants via E-utilities, plus NCBI Variation Services for RefSNP / SPDI / HGVS / ALFA frequency, plus bulk parsers for variant_summary.txt and clinvar.vcf.'
layout: 'split'
storage_mode: true
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
  - '@ncbijs/etl'
exports:
  - 'ClinVar'
  - 'ClinVarHttpError'
  - 'StorageModeError'
  - 'parseVariantSummaryTsv'
  - 'parseClinVarVcf'
  - 'ClinVarConfig'
  - 'ClinVarSearchResult'
  - 'VariantReport'
  - 'ClinVarGene'
  - 'ClinVarTrait'
  - 'TraitXref'
  - 'VariantLocation'
  - 'RefSnpReport'
  - 'RefSnpPlacement'
  - 'RefSnpAllele'
  - 'SpdiAllele'
  - 'FrequencyReport'
  - 'AlleleFrequency'
  - 'PopulationFrequency'
  - 'ClinVarVcfVariant'
  - 'DataStorage'
related_docs:
  - 'docs/ncbi-api-catalog.md'
  - 'packages/clinvar/README.md'
last_audited: '2026-03-02'
---

# @ncbijs/clinvar

## Purpose

Typed client for the ClinVar clinical-variant database. ClinVar is
queried through E-utilities (`esearch` + `esummary` on the `clinvar`
db) and combined with the NCBI **Variation Services API**
(`api.ncbi.nlm.nih.gov/variation/v0`) for RefSNP / SPDI / HGVS
conversions and ALFA allele frequencies. Bulk parsers cover the FTP
`variant_summary.txt` TSV release and the `clinvar.vcf.gz` VCF
release.

Coverage:

1. **Search** — `clinvar` E-utilities `esearch` returning UIDs.
2. **Fetch** — `esummary` on UIDs returning typed `VariantReport[]`
   (germline classification, genes, traits, locations).
3. **Variation Services** — RefSNP reports, SPDI ↔ HGVS bidirectional
   conversion, allele frequencies (ALFA).
4. **Storage mode** — `ClinVar.fromStorage(storage)` reads cached
   variants from local DuckDB.
5. **Bulk parsing** — `variant_summary.txt` (TSV) and `clinvar.vcf`
   (VCF, with INFO field decoding).

## When to use

- Looking up clinical significance of a specific variant
  (Pathogenic / Likely benign / VUS / Conflicting).
- Resolving a gene → all known ClinVar variants (`searchAndFetch('TP53')`).
- Converting between coordinate notations: rsID, SPDI, HGVS.
- Pulling population allele frequencies from ALFA for a RefSNP.
- ETL of the yearly ClinVar VCF + variant_summary releases into a
  local store.

## When NOT to use

| Goal                                            | Use instead                                       |
| ----------------------------------------------- | ------------------------------------------------- |
| Generic dbSNP RefSNP records (no clinical lens) | `@ncbijs/snp`                                     |
| Generic Entrez `clinvar` query with raw UIDs    | `@ncbijs/eutils` directly                         |
| Gene metadata / GO ontology                     | `@ncbijs/datasets`                                |
| MedGen condition / disease records              | `@ncbijs/medgen`                                  |
| Drug → variant pharmacogenomics                 | `@ncbijs/dailymed` or `@ncbijs/rxnorm`            |
| Large-scale bulk ETL                            | `@ncbijs/etl` + `@ncbijs/pipeline`                |

## Exports

| Export                       | Kind       | Purpose                                                                  |
| ---------------------------- | ---------- | ------------------------------------------------------------------------ |
| `ClinVar`                    | class      | Main client; `new ClinVar(config?)` or `ClinVar.fromStorage()`           |
| `ClinVarHttpError`           | class      | Thrown on E-utilities / Variation Services HTTP failures                 |
| `StorageModeError`           | class      | Thrown when an HTTP-only method is called on a storage instance          |
| `ClinVarConfig`              | interface  | `{ apiKey?, tool?, email?, maxRetries? }`                                |
| `parseVariantSummaryTsv`     | function   | `variant_summary.txt` → `ReadonlyArray<VariantReport>`                   |
| `parseClinVarVcf`            | function   | `clinvar.vcf` text → `ReadonlyArray<ClinVarVcfVariant>`                  |
| `VariantReport`              | interface  | esummary-derived report (UID, germline classification, genes, traits)    |
| `ClinVarVcfVariant`          | interface  | VCF record with decoded `INFO` fields                                    |
| `RefSnpReport` / `Placement` / `Allele` | interfaces | Variation Services RefSNP shapes                              |
| `SpdiAllele`                 | interface  | SPDI-style allele                                                        |
| `FrequencyReport` / `AlleleFrequency` / `PopulationFrequency` | interfaces | ALFA allele frequencies          |
| `DataStorage`                | interface  | Structural read contract for `fromStorage()`                             |

## API surface

### `new ClinVar(config?)` — HTTP mode

```ts
new ClinVar({
  apiKey?: string;     // raises rate from 3 → 10 req/s on E-utilities
  tool?: string;       // E-utilities tool identifier
  email?: string;      // E-utilities contact email
  maxRetries?: number; // default 3
});
```

`tool` and `email` are forwarded to the E-utilities credential helper
(`appendEUtilsCredentials`) on every `clinvar` esearch / esummary
call. They are NOT sent to the Variation Services endpoints (which
have no credential concept).

### `ClinVar.fromStorage(storage): ClinVar` — storage mode

| Method                           | Storage path                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `fetch(ids)`                     | `getRecord('clinvar', uid)` per ID                                                                      |
| `searchAndFetch(term, opts?)`    | `searchRecords('clinvar', { field: 'title', op: 'contains' })` ∪ `searchRecords({ field: 'genes' })`, deduped by `uid`, capped by `retmax` |

All other methods (`search`, `refsnp`, `spdi`, `spdiToHgvs`,
`hgvsToSpdi`, `frequency`) throw `StorageModeError`. Note: `search`
itself is HTTP-only — only `searchAndFetch` has a storage path.

### Search & fetch (E-utilities)

| Method                           | Returns                              |
| -------------------------------- | ------------------------------------ |
| `search(term, { retmax? })`      | `ClinVarSearchResult` (HTTP only)    |
| `fetch(ids: string[])`           | `ReadonlyArray<VariantReport>`       |
| `searchAndFetch(term, { retmax? })` | `ReadonlyArray<VariantReport>`    |

`fetch([])` short-circuits to `[]`. Entries with an `error` field in
the esummary response are silently skipped.

### Variation Services (HTTP only)

| Method                                | Returns                       |
| ------------------------------------- | ----------------------------- |
| `refsnp(rsid: number)`                | `RefSnpReport`                |
| `spdi(spdiExpression: string)`        | `SpdiAllele`                  |
| `spdiToHgvs(spdiExpression: string)`  | `string`                      |
| `hgvsToSpdi(hgvs, assembly?)`         | `ReadonlyArray<SpdiAllele>`   |
| `frequency(rsid: number)`             | `FrequencyReport`             |

All hit `https://api.ncbi.nlm.nih.gov/variation/v0/...` and are
unaffected by the E-utilities rate limit (separate service, but the
same `TokenBucket` instance throttles them).

### Bulk parsers (pure)

| Function                  | Input                                            | Output                            |
| ------------------------- | ------------------------------------------------ | --------------------------------- |
| `parseVariantSummaryTsv`  | decompressed `variant_summary.txt`               | `ReadonlyArray<VariantReport>`    |
| `parseClinVarVcf`         | decompressed `clinvar.vcf` (VCF 4.x text)        | `ReadonlyArray<ClinVarVcfVariant>` |

`parseClinVarVcf` decodes percent-escaped INFO values
(`%2C` → `,`, `%3D` → `=`, etc.) and skips records with fewer than 8
required VCF columns.

## Configuration

| Field        | Type     | Required | Default | Notes                                                              |
| ------------ | -------- | -------- | ------- | ------------------------------------------------------------------ |
| `apiKey`     | `string` | no       | —       | E-utilities API key. 3 → 10 req/s. Sent as query string parameter. |
| `tool`       | `string` | no       | —       | NCBI usage-policy field appended to E-utilities calls.             |
| `email`      | `string` | no       | —       | NCBI usage-policy contact field.                                   |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx                       |

## Rate limiting & credentials

- Single `TokenBucket` per instance. Sized from the E-utilities rate
  table (`EUTILS_REQUESTS_PER_SECOND` = 3, or
  `EUTILS_REQUESTS_PER_SECOND_WITH_KEY` = 10).
- The same bucket throttles BOTH E-utilities calls and Variation
  Services calls — heavy usage of `frequency()` will reduce headroom
  for `search()`.
- Credentials are appended to E-utilities calls only via
  `appendEUtilsCredentials(params, config)`. Variation Services calls
  carry no credentials.
- `ClinVarHttpError extends HttpRetryError` from
  `@ncbijs/rate-limiter`.

## Storage mode

`ClinVar.fromStorage(storage)` accepts any object satisfying the
local `DataStorage` interface (structurally typed — no import from
`@ncbijs/store` required). `ReadableStorage` from `@ncbijs/store`
satisfies it.

Stored dataset:

| Dataset name | Populated by                                     | Read by                       |
| ------------ | ------------------------------------------------ | ----------------------------- |
| `clinvar`    | `etl/load('clinvar', sink)` → `parseVariantSummaryTsv` | `fetch`, `searchAndFetch` |

Variation Services calls (`refsnp`, `spdi*`, `hgvs*`, `frequency`)
have no offline equivalent and throw `StorageModeError`.

## Cross-package wiring

- **Imports.** `import { ClinVar } from '@ncbijs/clinvar'`. Bulk
  parsers from `@ncbijs/clinvar` directly.
- **Imports from `@ncbijs/eutils/config`** — pulls
  `EUTILS_BASE_URL`, the rate constants, the `EUtilsCredentials`
  interface, and the `appendEUtilsCredentials` helper. (Listed as a
  runtime dep in `package.json`.) This is the only NCBI-specific
  cross-package coupling.
- **Composes with `@ncbijs/rate-limiter`** — `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`.
- **Used by `@ncbijs/http-mcp`** — `tools/clinvar-tools.ts` registers
  MCP tools `search-clinvar`, `lookup-refsnp`, `lookup-variant`,
  `lookup-frequency` over the `ClinVar` class.
- **Used by `@ncbijs/etl`** — `dataset-registry.ts` references
  `parseVariantSummaryTsv` for the `clinvar` ETL job.

## Common pitfalls

1. **`search()` throws in storage mode but `searchAndFetch()` does
   not.** `search()` is HTTP-only because it returns UIDs (which are
   meaningless without a paired esummary call). `searchAndFetch()` in
   storage mode does NOT call `search()` internally — it runs two
   `searchRecords()` calls (`title` contains + `genes` contains),
   merges by UID, and slices to `retmax` (default 20). The storage
   path also does NOT consult the Variation Services API.

2. **`fetch([])` returns `[]` synchronously, but
   `geneById([])`-style emptiness checks come AFTER the storage
   short-circuit.** In HTTP mode, `fetch([])` returns `[]`. The empty
   guard is the first line — no `Error` thrown.

3. **esummary returns per-UID `error` entries instead of failing the
   request.** Bad UIDs surface as `entry.error === '...'` inside the
   result map; the SDK silently skips them. Track total vs. returned
   length if you need detection.

4. **Variation Services share the E-utilities token bucket.**
   Hot-pathing `frequency()` in a loop will starve `search()` /
   `fetch()`. Both endpoints share the same per-instance budget.

5. **`hgvsToSpdi(hgvs)` without `assembly`.** Returns *all* contextual
   alleles across all assemblies (typically GRCh37 + GRCh38). Pass
   `assembly: 'GCF_000001405.40'` for GRCh38-only.

6. **Storage-mode dedup hides equal-UID records from different
   `searchRecords` shards.** The storage merge uses `Set<uid>` to
   dedupe between the title and genes search results — the FIRST
   match wins. If both shards yield the same UID with different
   payloads (shouldn't happen with sane data), the title-search copy
   is kept.

7. **VCF parser silently drops short rows.** `parseClinVarVcf` skips
   any line with fewer than 8 tab-separated fields without
   reporting — corrupt rows are NOT signalled. Consider validating
   line counts upstream when ingesting partial files.

8. **`spdiToHgvs` returns `''` (empty string) on missing data.** The
   SDK never throws for a "not found" SPDI; the API responds 200 with
   `data: undefined`, and the SDK maps it to `''`. Check for empty
   strings, not exceptions.

## Testing

```bash
pnpm nx run @ncbijs/clinvar:test
pnpm nx run ncbijs-e2e:e2e -- clinvar

pnpm nx run @ncbijs/clinvar:typecheck
pnpm nx run @ncbijs/clinvar:lint
pnpm nx run @ncbijs/clinvar:build
```

Unit tests stub `fetch` for the HTTP paths (`clinvar.spec.ts`) and
use an in-memory `DataStorage` mock for storage mode
(`clinvar-storage.spec.ts`). VCF parser tests use small inline
fixtures.

## Files

```
packages/clinvar/src/
  index.ts                                       # public re-exports
  interfaces/clinvar.interface.ts                # all domain types + StorageModeError
  http/
    clinvar.ts                                   # ClinVar class
    clinvar-client.ts                            # fetchJson + ClinVarHttpError
    clinvar.spec.ts                              # HTTP-mode unit tests
    clinvar-storage.spec.ts                     # storage-mode unit tests
    clinvar-client.spec.ts
  bulk-parsers/
    parse-variant-summary-tsv.ts                 # variant_summary.txt
    parse-clinvar-vcf.ts                         # clinvar.vcf
    *.spec.ts
```
