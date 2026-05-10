---
package: '@ncbijs/dailymed'
purpose: 'Typed client for the FDA DailyMed REST API v2 — drug name search, Structured Product Labels (SPLs), NDC codes, and Established Pharmacologic Classes (EPCs).'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'DailyMed'
  - 'DailyMedHttpError'
  - 'DailyMedConfig'
  - 'DailyMedDrugClass'
  - 'DailyMedDrugName'
  - 'DailyMedNdc'
  - 'DailyMedPage'
  - 'DailyMedPageOptions'
  - 'DailyMedPagination'
  - 'DailyMedSpl'
related_docs: []
last_audited: '2026-03-03'
---

# @ncbijs/dailymed

## Purpose

DailyMed is the National Library of Medicine's repository of FDA-approved
drug labeling. It is **not** an NCBI Entrez API — there is no `tool`/
`email`/`api_key` concept and no E-utilities involvement. The base host
is `dailymed.nlm.nih.gov`, separate from the `eutils.ncbi.nlm.nih.gov`
infrastructure.

This package wraps four endpoints of the DailyMed REST API v2:

1. `drugnames.json` — keyword search over drug names
2. `spls.json` — Structured Product Label summaries by drug name
3. `ndcs.json` — National Drug Code packaging data by drug name
4. `drugclasses.json` — Established Pharmacologic Class (EPC) catalog

Every method maps DailyMed's snake_case wire format into typed
camelCase domain objects and is rate-limited at 5 req/s per instance.

## When to use

- Look up FDA-approved labeling text and metadata for a marketed drug.
- Resolve a drug name to one or more SPL set IDs (the canonical
  identifier for a labeling document) for downstream document fetches.
- Query NDC packaging codes for a brand or generic drug.
- Enumerate EPCs (e.g. `'Histamine H2 Receptor Antagonist'`) and their
  codes to classify drugs by mechanism.

## When NOT to use

| If you want to                                  | Use instead                                        |
| ----------------------------------------------- | -------------------------------------------------- |
| Normalize a drug name to RxNorm (RxCUI) codes   | `@ncbijs/rxnorm`                                   |
| Look up chemical structures or PubChem CIDs     | `@ncbijs/pubchem`                                  |
| Find variants associated with a drug response   | `@ncbijs/clinvar` or `@ncbijs/snp`                 |
| Search literature about a medication            | `@ncbijs/pubmed`                                   |
| Run any NCBI Entrez E-utility query             | `@ncbijs/eutils`                                   |
| Fetch the full SPL XML document                 | Out of scope — this client returns summaries only  |

## Exports

| Export                | Kind      | Purpose                                                                |
| --------------------- | --------- | ---------------------------------------------------------------------- |
| `DailyMed`            | class     | Main client                                                            |
| `DailyMedHttpError`   | class     | Thrown on non-2xx responses; carries `status` + `body`                 |
| `DailyMedConfig`      | interface | Constructor config (`maxRetries?`)                                     |
| `DailyMedPageOptions` | interface | `{ page?, pageSize? }` passed to every search method                   |
| `DailyMedPage<T>`     | interface | Paginated envelope: `{ data: ReadonlyArray<T>, pagination }`           |
| `DailyMedPagination`  | interface | `{ totalElements, totalPages, currentPage, elementsPerPage }`          |
| `DailyMedDrugName`    | interface | `{ drugName, nameType }`                                               |
| `DailyMedSpl`         | interface | `{ setId, title, publishedDate, splVersion }`                          |
| `DailyMedNdc`         | interface | `{ ndc }`                                                              |
| `DailyMedDrugClass`   | interface | `{ code, codingSystem, classType, name }`                              |

## API surface

### `new DailyMed(config?)`

```ts
new DailyMed({
  maxRetries?: number; // default 3 — exponential backoff with jitter on 429/5xx
});
```

Constructs a private `TokenBucket` capped at 5 req/s; never shared
across instances. There are no required credentials.

### `drugNames(drugName, options?): Promise<DailyMedPage<DailyMedDrugName>>`

Keyword search over drug names. Returns matching entries with the
`nameType` discriminator (e.g. brand vs. generic). Pagination via
`options.page` (1-indexed) and `options.pageSize`.

```ts
const page = await dailymed.drugNames('aspirin', { pageSize: 25 });
for (const entry of page.data) {
  console.log(`${entry.drugName} (${entry.nameType})`);
}
console.log(`page ${page.pagination.currentPage} of ${page.pagination.totalPages}`);
```

### `spls(drugName, options?): Promise<DailyMedPage<DailyMedSpl>>`

Search Structured Product Labels by drug name. The `setId` field is
the canonical SPL identifier and is the join key for any downstream
SPL document fetch.

### `ndcs(drugName, options?): Promise<DailyMedPage<DailyMedNdc>>`

Search National Drug Codes by drug name. NDCs identify a specific
package (manufacturer + product + package size).

### `drugClasses(options?): Promise<DailyMedPage<DailyMedDrugClass>>`

List all Established Pharmacologic Classes. Unlike the other methods,
this takes no required argument — pass only pagination options.

## Configuration

| Field        | Type     | Required | Default | Notes                                            |
| ------------ | -------- | -------- | ------- | ------------------------------------------------ |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx     |

## Rate limiting & credentials

- Token bucket sized at **5 requests per second** (DailyMed has no
  documented public rate but this is a conservative default per the
  NLM service tier observations).
- **No API key concept.** DailyMed is a fully public API; do not pass
  `tool`, `email`, or `apiKey` — they are silently ignored by the
  upstream and not part of this package's config interface.
- Per-instance bucket — running multiple `DailyMed` instances in the
  same process collectively exceeds 5 req/s. Use one instance per
  process when possible.
- Retries cover HTTP 429, 500, 502, 503 and network errors via the
  shared `@ncbijs/rate-limiter` `fetchWithRetry` helper.

## Cross-package wiring

- **Imports.** `import { DailyMed } from '@ncbijs/dailymed'`.
- **No internal consumers.** Not yet exposed by `@ncbijs/http-mcp` —
  to add MCP tools, follow the pattern in
  `packages/http-mcp/src/tools/litvar-tools.ts` (lazy `await import`,
  `registerTool` per method) and update both
  `packages/http-mcp/src/register-tools.ts` and the server's
  top-level `instructions` prose.
- **Not in the ETL pipeline.** Not registered in
  `packages/etl/src/dataset-registry.ts`. There is no bulk parser —
  the FDA distributes SPL data as nightly XML zips outside of
  DailyMed's REST API, which would belong in a separate package if
  ever added.

## Common pitfalls

1. **Confusing DailyMed with Entrez.** This is **not** an
   `eutils.ncbi.nlm.nih.gov` endpoint. The base URL is
   `https://dailymed.nlm.nih.gov/dailymed/services/v2`. Do not pass
   `tool`/`email`/`apiKey` — the config interface does not accept
   them and the upstream has no usage-policy registration concept.

2. **`pageSize` is `pagesize` on the wire.** The client maps
   `options.pageSize` to the `pagesize` query string parameter. If
   you bypass the client and craft URLs by hand, do not write
   `pageSize=…`; DailyMed will silently ignore it and fall back to
   the default.

3. **Pagination defaults from the upstream are non-zero.** When you
   omit `options`, the client appends nothing and DailyMed returns
   page 1 at its default size (~100 elements). Always consult
   `pagination.totalPages` before issuing follow-up queries — there
   is no "all results in one call" mode.

4. **Missing fields on the wire are coerced to empty values.** Every
   raw field is optional — the mapper applies `?? ''` (strings) and
   `?? 0` (numbers). A real, well-formed DailyMed response always has
   them present, but inspect `data.length === 0` rather than trusting
   any single record's content.

5. **`nameType` is a free-text discriminator.** It is not enumerated
   on the wire and the upstream may add new values (`'BN'`, `'IN'`,
   `'PIN'`, `'SY'`, etc.). Treat it as `string`, not a union, when
   branching on it.

6. **`drugClasses()` distinct from `classType` on a class.**
   `classType` is the EPC sub-category on a single class record (e.g.
   `'EPC'`, `'MoA'`, `'PE'`). It is **not** a filter parameter on the
   list endpoint — there is no way to ask DailyMed for "only EPCs".
   Filter client-side.

## Testing

```bash
# Unit tests (mocked fetchWithRetry)
pnpm nx run @ncbijs/dailymed:test

# E2E (real DailyMed; no API key required)
pnpm nx run ncbijs-e2e:e2e -- dailymed

# Type-check + lint + build
pnpm nx run @ncbijs/dailymed:typecheck
pnpm nx run @ncbijs/dailymed:lint
pnpm nx run @ncbijs/dailymed:build
```

Unit tests stub `@ncbijs/rate-limiter`'s `fetchWithRetry` directly
rather than `globalThis.fetch`, since the retry/rate machinery lives
in the shared package and is exercised by its own suite.

## Files

```
packages/dailymed/src/
  index.ts                                  # public re-exports
  dailymed.ts                               # DailyMed class + raw → domain mappers
  dailymed-client.ts                        # fetchJson + DailyMedHttpError
  interfaces/dailymed.interface.ts          # all public types
  dailymed.spec.ts                          # class behaviour tests
  dailymed-client.spec.ts                   # HTTP / retry / error tests
```
