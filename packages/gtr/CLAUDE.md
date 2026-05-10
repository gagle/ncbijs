---
package: '@ncbijs/gtr'
purpose: 'Typed client for the NCBI Genetic Testing Registry (GTR) — search and fetch genetic-test records (conditions, analytes, methods, certifications, lab provider) via the E-utilities `gtr` database.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'Gtr'
  - 'GtrHttpError'
  - 'GtrConfig'
  - 'GtrSearchResult'
  - 'GtrTest'
  - 'GtrCondition'
  - 'GtrAnalyte'
  - 'GtrLocation'
  - 'GtrMethod'
  - 'GtrMethodCategory'
  - 'GtrCertification'
related_docs:
  - 'docs/ncbi-api-catalog.md'
  - 'docs/package-architecture.md'
last_audited: '2026-03-19'
---

# @ncbijs/gtr

## Purpose

Domain wrapper over the NCBI Entrez `gtr` database — the Genetic
Testing Registry, NCBI's catalog of clinical and research genetic
tests offered by laboratories worldwide. Each GTR test record
(`GTR000508942.2`, …) describes:

- the condition(s) the test addresses (with UMLS CUIs and acronyms),
- the analyte(s) under test (gene, region, variant), with NCBI Gene
  IDs and cytogenetic location,
- the methodology (sequence analysis, MLPA, FISH, …) grouped under
  named categories,
- the offering laboratory, its city/state/country, and held
  certifications (CLIA, CAP, ISO, …),
- accepted specimen types, test purposes (diagnostic, predictive,
  carrier, …), and a free-text clinical-validity description.

The package exists as a separate domain client (rather than asking
users to call `eutils.esearch({ db: 'gtr' })` directly) because:

- The `esummary` response is heavily nested JSON with NCBI's
  lowercase field names (`testname`, `conditionlist`, `categorylist`,
  `methodlist`). `mapGtrTest` flattens this into camelCase and
  normalises every field with safe defaults (`?? ''`, `?? 0`, `?? []`).
- Six small mappers (`mapCondition`, `mapAnalyte`, `mapLocation`,
  `mapMethod`, `mapMethodCategory`, `mapCertification`) keep the
  shape predictable for downstream consumers.

## When to use

- Find which laboratories offer a test for a given gene
  (`'BRCA1'` → list of `GtrTest` records).
- Enumerate testing methodologies available for a condition.
- Look up a specific test by its GTR accession.
- Check certifications and country of a testing laboratory.
- Cross-reference variant findings (from ClinVar, MedGen) to
  available clinical tests.

## When NOT to use

| If you want to                                       | Use instead                                                              |
| ---------------------------------------------------- | ------------------------------------------------------------------------ |
| Look up clinical-variant interpretations             | `@ncbijs/clinvar` (variant-level pathogenicity)                          |
| Resolve a disease name to a CUI / phenotype set      | `@ncbijs/medgen` (medical-genetics concepts + HPO features)              |
| Browse Mendelian disorders by MIM number             | `@ncbijs/omim`                                                           |
| Look up a gene by symbol or NCBI Gene ID             | `@ncbijs/eutils` (`esearch` / `esummary` on `gene`)                      |
| Find clinical trials for a condition                 | `@ncbijs/clinical-trials` (ClinicalTrials.gov)                           |
| Find literature about a test or condition            | `@ncbijs/eutils` (`elink` from `gtr` → `pubmed`) or `@ncbijs/pubmed`     |

## Exports

| Export              | Kind      | Purpose                                                              |
| ------------------- | --------- | -------------------------------------------------------------------- |
| `Gtr`               | class     | Main HTTP client (`search`, `fetch`, `searchAndFetch`)               |
| `GtrHttpError`      | class     | HTTP-level failure (extends `HttpRetryError`)                        |
| `GtrConfig`         | interface | `{ apiKey?, tool?, email?, maxRetries? }`                            |
| `GtrSearchResult`   | interface | `{ total, ids }`                                                     |
| `GtrTest`           | interface | Flattened test record — see API surface below                        |
| `GtrCondition`      | interface | `{ name, acronym, cui }`                                             |
| `GtrAnalyte`        | interface | `{ analyteType, name, geneId, location }`                            |
| `GtrLocation`       | interface | `{ city, state, country }`                                           |
| `GtrMethod`         | interface | `{ name, categories }` — top-level methodology grouping              |
| `GtrMethodCategory` | interface | `{ name, methods }` — sub-method names within a category             |
| `GtrCertification`  | interface | `{ certificationType, id }`                                          |

## API surface

### `new Gtr(config?)`

```ts
new Gtr({
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

Per-instance bucket. Use one `Gtr` per process.

### `search(term, options?): Promise<GtrSearchResult>`

GETs `esearch.fcgi?db=gtr&term=...&retmode=json`. Returns total match
count and the list of UIDs.

```ts
const r = await gtr.search('BRCA1');
r.total; // 150
r.ids;   // ['508942', '509012', ...]

const limited = await gtr.search('cardiomyopathy', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID list
(NCBI default ≈ 20).

### `fetch(ids): Promise<ReadonlyArray<GtrTest>>`

GETs `esummary.fcgi?db=gtr&id=...&retmode=json`. Returns one `GtrTest`
per UID with NCBI's nested response flattened into camelCase:

```ts
{
  uid: string;                                // numeric GTR UID
  accession: string;                          // 'GTR000508942.2'
  testName: string;
  testType: string;                           // 'Clinical' | 'Research' | …
  conditions: ReadonlyArray<GtrCondition>;
  analytes: ReadonlyArray<GtrAnalyte>;
  offerer: string;                            // laboratory name
  offererLocation: GtrLocation;               // always present (empty strings if unknown)
  methods: ReadonlyArray<GtrMethod>;          // each method has nested categories
  certifications: ReadonlyArray<GtrCertification>;
  specimens: ReadonlyArray<string>;
  testPurposes: ReadonlyArray<string>;
  clinicalValidity: string;                   // free-text description
  country: string;
}
```

Empty input → empty output (no HTTP call). Entries returned with an
`error` field are silently skipped — the result array length may be
smaller than `ids.length`.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<GtrTest>>`

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
- **Per-instance bucket.** Don't run two `Gtr` instances against
  the same key in one process — the buckets don't coordinate.

## Cross-package wiring

- **Imports.** `import { Gtr } from '@ncbijs/gtr'`.
- **Composes with `@ncbijs/eutils`** via the `/config` subpath only —
  imports `EUTILS_BASE_URL`, the rate constants, the
  `EUtilsCredentials` type, and `appendEUtilsCredentials`. Does **not**
  instantiate the full `EUtils` class (avoids pulling in the full
  client surface for a JSON-only consumer).
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `GtrHttpError` extends
  `HttpRetryError`.
- **No XML dependency.** Unlike `@ncbijs/medgen`, the GTR esummary
  response is pure JSON — no embedded XML — so this package does
  not depend on `@ncbijs/xml`.
- **No internal consumers.** `@ncbijs/http-mcp` does not currently
  expose GTR tools; `@ncbijs/etl` does not register a GTR dataset.
  If/when MCP tools are added, follow the pattern in
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/gtr-search.ts`.

## Common pitfalls

1. **GTR has no bulk download path here.** Unlike `@ncbijs/medgen`,
   this package only supports the live HTTP API — there is no
   equivalent to `parseMedGenRrf`. NCBI does publish GTR FTP dumps,
   but they are not parsed by this package. If you need offline
   bulk access, write your own parser; do not assume `Gtr` has a
   `fromStorage()` / bulk-parser entry point (`storage_mode: false`).

2. **`offererLocation` is always present even when unknown.** The
   mapper returns `{ city: '', state: '', country: '' }` rather than
   `undefined` when NCBI omits the location block. Check
   `country !== ''` (or compare individual fields) — do not check
   for `undefined`.

3. **`country` is duplicated.** GTR returns the lab's country both
   inside `offererlocation.country` (mapped to `offererLocation.country`)
   and as a top-level `country` field. Both are surfaced. They
   usually agree but are not normalised against each other — pick
   one and stick with it.

4. **Method shape is nested two levels deep.** `methods[i].categories[j].methods[k]`
   is a `string` (the method-name within a category), not another
   `GtrMethod`. The naming is a little confusing because GTR reuses
   the word "method" at three nesting levels. The TypeScript types
   (`GtrMethod` → `GtrMethodCategory` → `string`) match NCBI's wire
   format exactly.

5. **`analytes[i].geneId` is `0` when the analyte is not a gene.**
   Some analytes are chromosomal regions, mtDNA, or non-coding
   elements. `geneId === 0` is the sentinel — don't blindly join
   to `@ncbijs/eutils` `gene` lookups without filtering.

6. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment with the request.

7. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class. Don't refactor to
   `from '@ncbijs/eutils'` — it would bloat the bundle and break the
   convention shared by `@ncbijs/omim`, `@ncbijs/medgen`, `@ncbijs/geo`.

8. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. Useful, but be aware that
   `total: 0` from `search` short-circuits without a second
   round-trip — you cannot observe a "search succeeded but fetch
   failed" state through this method.

## Testing

```bash
pnpm nx run @ncbijs/gtr:test          # unit (mocked fetch)
pnpm nx run ncbijs-e2e:e2e -- gtr     # E2E (live NCBI, needs NCBI_API_KEY)
pnpm nx run @ncbijs/gtr:typecheck
pnpm nx run @ncbijs/gtr:lint
pnpm nx run @ncbijs/gtr:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, all six sub-mappers (`mapCondition`, `mapAnalyte`,
`mapLocation`, `mapMethod`, `mapMethodCategory`, `mapCertification`),
missing `offererlocation`, entries with `error` field, and
`searchAndFetch` short-circuit.

## Files

```
packages/gtr/src/
  index.ts                       # public re-exports
  gtr.ts                         # Gtr class + esearch/esummary + GtrTest mappers
  gtr.spec.ts
  gtr-client.ts                  # fetchJson + GtrHttpError + GtrClientConfig
  gtr-client.spec.ts
  interfaces/
    gtr.interface.ts             # GtrConfig, GtrSearchResult, GtrTest, GtrCondition,
                                 # GtrAnalyte, GtrLocation, GtrMethod, GtrMethodCategory,
                                 # GtrCertification
```
