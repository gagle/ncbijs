---
package: '@ncbijs/clinical-trials'
purpose: 'Typed client for the ClinicalTrials.gov v2 REST API. Search interventional and observational studies, fetch full study reports, query field metadata and database statistics, and parse the AllAPIJSON bulk download.'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'ClinicalTrials'
  - 'ClinicalTrialsHttpError'
  - 'parseClinicalTrialJson'
  - 'ClinicalTrialsConfig'
  - 'StudyReport'
  - 'StudySearchOptions'
  - 'StudySearchFilter'
  - 'StudyIntervention'
  - 'StudySponsor'
  - 'StudyLocation'
  - 'StudyStats'
  - 'StudyMetadata'
  - 'StudyFieldDefinition'
  - 'FieldValueCount'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-02-28'
---

# @ncbijs/clinical-trials

## Purpose

Wraps **ClinicalTrials.gov v2** (`https://clinicaltrials.gov/api/v2`) — a
public registry of interventional and observational studies operated by the
U.S. National Library of Medicine. **This is a separate API host from
NCBI E-utilities; it does not share the eutils rate budget, the
`tool`/`email` headers, the `api_key` parameter, or the eutils error
shape.**

The package exposes:

1. **HTTP client** — `study()`, `searchStudies()` (cursor-paginated),
   `studyStats()`, `studyFieldValues()`, `studyMetadata()`,
   `enumValues()`, `studySize()`.
2. **Bulk parser** — `parseClinicalTrialJson()` reads the AllAPIJSON
   download (JSON array or NDJSON) into `StudyReport[]` without HTTP.

## When to use

- Look up a single trial by NCT ID.
- Search trials with structured filters (status, phase, condition,
  intervention, sponsor, study type) and stream all results.
- Build dashboards that need study counts or field-value distributions.
- Discover the full set of v2 fields and their enum values.
- Ingest the AllAPIJSON snapshot into a local store without per-record
  HTTP calls.

## When NOT to use

| Goal                                               | Use instead                                                |
| -------------------------------------------------- | ---------------------------------------------------------- |
| Search PubMed publications about a trial           | `@ncbijs/pubmed`                                           |
| Get NIH citation metrics for a trial publication   | `@ncbijs/icite`                                            |
| Look up a drug intervention by RxCUI               | `@ncbijs/rxnorm`                                           |
| Find ClinVar variants linked to a condition        | `@ncbijs/clinvar`                                          |
| Run any NCBI Entrez query                          | `@ncbijs/eutils` (different host, different rate limit)    |
| Parse `studies.json` you already downloaded        | `parseClinicalTrialJson` from this package directly        |

## Exports

| Export                       | Kind      | Purpose                                                                |
| ---------------------------- | --------- | ---------------------------------------------------------------------- |
| `ClinicalTrials`             | class     | HTTP client; `new ClinicalTrials(config?)`                             |
| `ClinicalTrialsHttpError`    | class     | Thrown on non-2xx with `status` + `body`                               |
| `parseClinicalTrialJson`     | function  | Bulk JSON / NDJSON → `ReadonlyArray<StudyReport>`                      |
| `ClinicalTrialsConfig`       | interface | `{ maxRetries? }`                                                      |
| `StudyReport`                | interface | Mapped study record (NCT ID, title, status, phase, sponsors, ...)      |
| `StudySearchOptions`         | interface | `{ filter?, pageSize?, sort?, fields? }`                               |
| `StudySearchFilter`          | interface | `{ overallStatus?, condition?, intervention?, sponsor?, phase?, studyType? }` |
| `StudyIntervention`          | interface | `{ type, name, description }`                                          |
| `StudySponsor`               | interface | `{ name, role }` — `role` is `'lead'` or `'collaborator'`              |
| `StudyLocation`              | interface | `{ facility, city, state, country }`                                   |
| `StudyStats`                 | interface | `{ totalStudies }`                                                     |
| `StudyMetadata`              | interface | `{ fields: ReadonlyArray<StudyFieldDefinition> }`                      |
| `StudyFieldDefinition`       | interface | `{ name, type, description, sourceField, isEnum }`                     |
| `FieldValueCount`            | interface | `{ value, count }`                                                     |

## API surface

### `new ClinicalTrials(config?)`

```ts
const ct = new ClinicalTrials({ maxRetries: 3 });
```

No required fields. The constructor builds a private `TokenBucket`
sized to **2 req/s** (the published ClinicalTrials.gov fair-use cap)
and is not shared across instances.

### `study(nctId): Promise<StudyReport>`

```ts
const report = await ct.study('NCT04280705');
report.nctId;          // 'NCT04280705'
report.overallStatus;  // 'COMPLETED'
report.phase;          // 'PHASE3' (joined with '/' for multi-phase)
```

Throws `ClinicalTrialsHttpError` on non-2xx. Missing wire fields are
mapped to empty strings or `0`, never `undefined`.

### `searchStudies(query, options?): AsyncIterableIterator<StudyReport>`

Cursor-paginated stream. Drives `nextPageToken` automatically until the
server stops emitting one.

```ts
for await (const trial of ct.searchStudies('CRISPR', {
  filter: {
    overallStatus: ['RECRUITING', 'ACTIVE_NOT_RECRUITING'],
    phase: ['PHASE2', 'PHASE3'],
    condition: ['Sickle Cell Disease'],
  },
  pageSize: 100,
})) {
  process(trial);
}
```

| Filter key    | Wire param              | Notes                                  |
| ------------- | ----------------------- | -------------------------------------- |
| `overallStatus` | `filter.overallStatus` | Comma-joined                           |
| `phase`       | `filter.phase`          | Comma-joined                           |
| `studyType`   | `filter.studyType`      | Single value                           |
| `condition`   | `query.cond`            | OR-joined into a query string          |
| `intervention`| `query.intr`            | OR-joined into a query string          |
| `sponsor`     | `query.spons`           | Single value                           |

### `studyStats(): Promise<StudyStats>`

```ts
(await ct.studyStats()).totalStudies; // e.g. 528_433
```

### `studyFieldValues(field): Promise<ReadonlyArray<FieldValueCount>>`

Top distinct values for a study field with counts.

### `studyMetadata(): Promise<StudyMetadata>`

Recursively flattens the metadata tree into dotted-path field
definitions (`protocolSection.designModule.phases`, ...). `isEnum` is
derived from `sourceType === 'ENUM'`.

### `enumValues(field): Promise<ReadonlyArray<string>>`

Allowed string values for an enum field — convenience for
`studyFieldValues(field).then(v => v.map(e => e.value))`.

### `studySize(query?, filter?): Promise<number>`

Result count for a search without paging. Sets `pageSize=0` and
`countTotal=true` server-side.

### `parseClinicalTrialJson(json: string): ReadonlyArray<StudyReport>`

Pure function — no HTTP, no rate limiter. Auto-detects array vs. NDJSON
on the first non-whitespace character (`[` → array, otherwise NDJSON).
Returns `[]` on empty input or invalid JSON. Raw mappers are
**duplicated** from the HTTP layer on purpose; see "Common pitfalls".

## Configuration

| Field        | Type     | Default | Notes                                              |
| ------------ | -------- | ------- | -------------------------------------------------- |
| `maxRetries` | `number` | `3`     | Exponential backoff with jitter on 429 / 5xx       |

No `tool`, `email`, or `apiKey` — ClinicalTrials.gov has no
registration concept. Do not paste an `NCBI_API_KEY` here; it has no
effect and risks leaking in logs.

## Rate limiting & credentials

- Token bucket refills at **2 req/s**, per instance. Distinct from the
  3 req/s (10 with key) eutils budget — running both clients in the
  same process is fine, they don't share quota.
- No authentication header. The API is unauthenticated.
- The `Accept: application/json` header is set automatically by
  `clinical-trials-client.ts`.

## Cross-package wiring

- **Imports.** `import { ClinicalTrials, parseClinicalTrialJson } from '@ncbijs/clinical-trials'`.
- **Composes with `@ncbijs/rate-limiter`** — uses `TokenBucket` and
  `fetchWithRetry`; `ClinicalTrialsHttpError` extends `HttpRetryError`.
- **Not currently registered in `@ncbijs/http-mcp`.** If you wire it up,
  add tools alongside `icite-tools.ts` / `rxnorm-tools.ts` and update
  `register-tools.ts`.
- **Bulk-parser layer is HTTP-independent.** ETL pipelines can import
  `parseClinicalTrialJson` directly without instantiating the client.

## Common pitfalls

1. **Don't mix this client's quota with eutils.** ClinicalTrials.gov is
   2 req/s; eutils is 3 (or 10) req/s. The token buckets are
   per-instance and per-host — a separate `EUtils` instance does not
   draw from this one. Conversely, do not pass an NCBI `apiKey` here:
   it is silently ignored.

2. **Empty-string defaults across all fields.** `mapStudyReport` writes
   `''` (or `0`, or `[]`) when wire fields are missing, never
   `undefined`. Downstream code that uses `??` to detect missing values
   will see the falsy default instead. If you need real
   "missing-vs-empty" disambiguation, read the raw response from a
   custom fetch.

3. **`searchStudies` filter shapes are not symmetric.** `condition`,
   `intervention`, and `sponsor` are routed through the **`query.*`**
   params (full-text search); `overallStatus`, `phase`, and `studyType`
   are **`filter.*`** (exact match). A "Sickle Cell Disease" condition
   filter is a free-text token search, not a controlled-vocabulary
   match.

4. **Mappers duplicated between `http/` and `bulk-parsers/`.** This is
   intentional — `bulk-parsers/` must not import from `http/`. If you
   change the `RawProtocolSection` shape or the mapping logic, edit
   **both** files. There is a comment at the top of each mapper marking
   this contract.

5. **NDJSON detection is naive.** `parseClinicalTrialJson` decides on
   the first non-whitespace character. A JSON object that is not
   wrapped in an array (`{ "studies": [...] }`) will be parsed as
   single-line NDJSON and dropped. Wrap your bulk file in `[...]` or
   emit one study per line.

6. **`pageSize` is server-clamped.** ClinicalTrials.gov caps page size
   server-side (~1000). Requesting `10_000` silently returns the
   server's max. The pagination loop still terminates correctly via
   `nextPageToken`; only your assumptions about per-page count are
   wrong.

## Testing

```bash
pnpm nx run @ncbijs/clinical-trials:test
pnpm nx run @ncbijs/clinical-trials:typecheck
pnpm nx run @ncbijs/clinical-trials:lint
pnpm nx run @ncbijs/clinical-trials:build

# E2E (real ClinicalTrials.gov)
pnpm nx run ncbijs-e2e:e2e -- clinical-trials
```

HTTP unit tests stub `fetch` via `vi.stubGlobal`. Bulk-parser tests use
small inline JSON fixtures for both array and NDJSON forms. Coverage
target: 100% across statements, branches, functions, lines.

## Files

```
packages/clinical-trials/src/
  index.ts                                       # public re-exports
  interfaces/
    clinical-trials.interface.ts                 # shared domain types
  http/
    clinical-trials.ts                           # ClinicalTrials class
    clinical-trials-client.ts                    # fetchJson + ClinicalTrialsHttpError
    clinical-trials.spec.ts
    clinical-trials-client.spec.ts
  bulk-parsers/
    parse-clinical-trial-json.ts                 # JSON / NDJSON → StudyReport[]
    parse-clinical-trial-json.spec.ts
```
