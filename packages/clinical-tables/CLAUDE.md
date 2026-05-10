---
package: '@ncbijs/clinical-tables'
purpose: 'Typed client for the NLM Clinical Tables Search API. Autocomplete medical code systems (ICD-10, LOINC, SNOMED, RxTerms, conditions, drug ingredients) with rate limiting and retry.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'search'
  - 'ClinicalTablesHttpError'
  - 'ClinicalTablesConfig'
  - 'ClinicalTablesResult'
  - 'ClinicalTablesSearchOptions'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-02-26'
---

# @ncbijs/clinical-tables

## Purpose

Wraps the NLM Clinical Tables Search Service (`https://clinicaltables.nlm.nih.gov/api`)
in a typed, rate-limited TypeScript function. The upstream API returns a
positional 4-tuple `[totalCount, codes, extras, displayRows]`; this package
flattens that shape into a named `ClinicalTablesResult` and pivots the
column-major `extras` map into row-major arrays.

It is **not** an NCBI E-utilities endpoint and does not share rate limits
with `@ncbijs/eutils`. Hosted by NLM but governed by its own service.

## When to use

- Autocomplete a medical code system in a UI (`icd10cm`, `icd9cm_dx`,
  `loinc_items`, `rxterms`, `conditions`, `drug_ingredients`, `procedures`,
  `gard_conditions`, etc.).
- Map free-text user input to standardized codes for downstream queries.
- Pull alternative human-readable strings (display vs. consumer name) and
  optional extra fields like `STATUS`, `COMPONENT`, or `SYSTEM`.

## When NOT to use

| If you want to                                | Use instead                            |
| --------------------------------------------- | -------------------------------------- |
| Map drug names to RxNorm CUIs / RXCUIs        | `@ncbijs/rxnorm`                       |
| Get FDA structured product labels             | `@ncbijs/dailymed`                     |
| Cross-database biomedical ID conversion       | `@ncbijs/id-converter`                 |
| Look up MeSH descriptors / CUIs               | `@ncbijs/mesh`                         |
| Search clinical trials                        | `@ncbijs/clinical-trials`              |
| Variant-level clinical significance           | `@ncbijs/clinvar`                      |

## Exports

| Export                        | Kind      | Purpose                                                       |
| ----------------------------- | --------- | ------------------------------------------------------------- |
| `search`                      | function  | Single entry point — query a Clinical Tables resource         |
| `ClinicalTablesHttpError`     | class     | Thrown on non-2xx or non-JSON responses; carries `status`+`body` |
| `ClinicalTablesConfig`        | interface | Optional config (`maxRetries`)                                |
| `ClinicalTablesSearchOptions` | interface | Pagination + extra fields (`maxList`, `count`, `offset`, `extraFields`) |
| `ClinicalTablesResult`        | interface | Flattened response (`totalCount`, `codes`, `displayStrings`, `extras`) |

No class. No constructor. The package exports a single `search()` function.

## API surface

### `search(table, term, options?, config?): Promise<ClinicalTablesResult>`

```ts
function search(
  table: string,                          // required — e.g. 'icd10cm', 'loinc_items'
  term: string,                           // search term (passed as ?terms=)
  options?: ClinicalTablesSearchOptions,  // pagination + ?ef= extra fields
  config?: ClinicalTablesConfig,          // optional client config
): Promise<ClinicalTablesResult>;
```

Throws synchronously (well, rejects) with `Error('table must not be empty')`
if `table` is empty. URL is `${BASE_URL}/${encodeURIComponent(table)}/v3/search`.

```ts
import { search } from '@ncbijs/clinical-tables';

const result = await search('icd10cm', 'diabetes', {
  maxList: 20,
  extraFields: ['STATUS'],
});
result.totalCount;     // 42
result.codes;          // ['E11', 'E11.0', ...]
result.displayStrings; // ['Type 2 diabetes mellitus', ...]
result.extras;         // [['Active'], ['Active'], ...]   row-major, parallel to codes
```

### Response shape transformation

The Clinical Tables API returns a 4-tuple:

```
[totalCount, codes[], extras{fieldName: column[]} | null, displayRows[][]]
```

The package:

1. Picks `[0]` as `totalCount`.
2. Picks `[1]` as `codes`.
3. Picks `[3][i][0]` (first cell of each row) as `displayStrings[i]` —
   subsequent cells in `[3]` are dropped.
4. Pivots `[2]` from column-major to row-major using `options.extraFields`
   as the column order. If `extraFields` is omitted or `[2]` is null,
   `extras` is `[]`.

If you pass `extraFields: ['STATUS', 'COMPONENT']`, every row in `extras`
is `[status, component]` in that order.

## Configuration

| Field        | Type     | Required | Default | Notes                                              |
| ------------ | -------- | -------- | ------- | -------------------------------------------------- |
| `maxRetries` | `number` | no       | `3`     | Exponential-backoff retries on 429/5xx via `fetchWithRetry` |

`ClinicalTablesConfig` is a public-facing config; internally it resolves
into a `ClinicalTablesClientConfig = RetryConfig` from
`@ncbijs/rate-limiter` with a fresh `TokenBucket({ requestsPerSecond: 3 })`
per call when an explicit `config` is passed. Without an explicit `config`,
calls share a module-level default `TokenBucket` (capacity 3 req/s).

## Rate limiting & credentials

- **Default rate**: 3 req/s. The Clinical Tables service is public and
  has no API key concept — the rate is a defensive default, not a service-
  imposed cap.
- **Module-level default bucket**: `resolveConfig()` returns a singleton
  `TokenBucket`. Calls without a custom `config` share this bucket
  process-wide (good — they truly throttle to 3 req/s).
- **Custom-config bucket leak**: passing a `config` argument creates a
  **new** `TokenBucket` per `search()` call. Calling `search(..., {}, { maxRetries: 5 })`
  in a loop bypasses rate limiting because each invocation gets a fresh
  bucket. Call without a config, or hoist a shared one outside the loop.
- No credentials or env vars are read.
- Browser-safe: relies only on `fetch` and standard URL/headers.

## Cross-package wiring

- **Imports.** `import { search } from '@ncbijs/clinical-tables'`.
- **Composes with `@ncbijs/rate-limiter`** — `TokenBucket`, `fetchWithRetry`,
  `HttpRetryError`, `RetryConfig`. `ClinicalTablesHttpError` extends
  `HttpRetryError`.
- **Used by:** no other `@ncbijs/*` package consumes it. It is a leaf
  client. The MCP tool registry (`scripts/ncbi-api-monitor/detect.ts`)
  references the upstream URL for change detection.
- **Not source-agnostic.** No `fromStorage()` mode — Clinical Tables is
  purely an HTTP autocomplete service.

## Common pitfalls

1. **Empty `table` argument.** `search('', 'foo')` rejects with
   `Error('table must not be empty')`. The error message is plain `Error`,
   not `ClinicalTablesHttpError` — the rejection is synchronous-style
   inside the `async` function before any HTTP work.

2. **Per-call `TokenBucket` when passing custom `config`.** See "Rate
   limiting" above. If you need both custom retries and proper throttling,
   construct the bucket once and reuse it via the internal client (or omit
   `config` entirely).

3. **`displayStrings` flattens multi-cell rows.** The wire format's `[3]`
   is `string[][]` (rows of cells) but the package only exposes
   `row[0]`. If a table returns multi-column display rows, you lose
   the additional columns through the `search()` API.

4. **`extras` ordering coupling.** The pivot uses the order of
   `options.extraFields` to lay out each row. Reordering `extraFields`
   between calls changes column positions in `extras`. Use named access
   only via your own re-pivot if you need stability — or pass
   `extraFields` from a single source of truth.

5. **`extras` is `[]` when `extraFields` is omitted, even if the API
   returned a non-null `[2]`.** The pivot is gated on the caller having
   declared the field order. NCBI/NLM occasionally returns extras
   unsolicited; they are dropped.

6. **Content-type guard.** The client throws `ClinicalTablesHttpError`
   when the response content-type does not contain `'json'`, even on
   200s. Some NLM error pages return HTML with 200 — these surface as
   `ClinicalTablesHttpError` with the misleading status `200`.

7. **Browser CORS.** The Clinical Tables service supports CORS. Verified
   via the demo app — no proxy required for browser usage.

## Testing

```bash
pnpm nx run @ncbijs/clinical-tables:test
pnpm nx run @ncbijs/clinical-tables:lint
pnpm nx run @ncbijs/clinical-tables:typecheck
pnpm nx run @ncbijs/clinical-tables:build

pnpm nx run ncbijs-e2e:e2e -- clinical-tables
```

Unit tests in `clinical-tables.spec.ts` mock `fetch` via `vi.stubGlobal`
and exercise the 4-tuple response transformation, the extras pivot, the
empty-table guard, and the content-type guard. E2E lives in
`e2e/clinical-tables.spec.ts` and hits the live NLM service.

## Files

```
packages/clinical-tables/src/
  index.ts                                 # public re-exports
  clinical-tables.ts                       # search() + extras pivot
  clinical-tables.spec.ts                  # unit tests
  clinical-tables-client.ts                # ClinicalTablesHttpError + fetchJson + resolveConfig
  interfaces/
    clinical-tables.interface.ts           # ClinicalTablesConfig / Options / Result
```
