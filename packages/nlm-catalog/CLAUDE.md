---
package: '@ncbijs/nlm-catalog'
purpose: 'Typed client for NLM Catalog — search and fetch journal and serial bibliographic records (NLM Unique IDs, ISSNs, MEDLINE / ISO abbreviations, country, indexing status, start/end years) via the E-utilities `nlmcatalog` database.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'NlmCatalog'
  - 'NlmCatalogHttpError'
  - 'NlmCatalogConfig'
  - 'NlmCatalogIssn'
  - 'NlmCatalogRecord'
  - 'NlmCatalogSearchResult'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-04-02'
---

# @ncbijs/nlm-catalog

## Purpose

Domain wrapper over the NCBI Entrez `nlmcatalog` database — the NLM
Catalog is the National Library of Medicine's bibliographic record
of journals, books, audiovisuals, and electronic resources held at
NLM or indexed in MEDLINE / PubMed. Each record carries an
**NLM Unique ID** (`0410462` for *Nature*), one or more **ISSNs**
typed as `Print` / `Electronic` / `Linking`, the canonical title plus
alternates, **MEDLINE** and **ISO** abbreviations (`Nature`,
`Nat. Genet.`), country of publication, and the journal's
**current indexing status** for MEDLINE.

The package exists as a separate domain client (rather than asking
users to call `eutils.esearch({ db: 'nlmcatalog' })` directly) because:

- The `esummary` response wraps the canonical title in
  `titlemainlist[0].title` and the alternates in
  `titleotherlist[*].titlealternate` — the mapper flattens both.
- ISSNs come back as `[{ issn, issntype }, ...]` and are surfaced as
  the typed `NlmCatalogIssn` array (`{ issn, type }`).
- `resourceinfolist[0].typeofresource` is flattened to a single
  `resourceType` string — most journal records carry exactly one.

## When to use

- Look up a journal by name, abbreviation, or ISSN
  (`'Nature'`, `'0028-0836'`, `'Nat. Genet.'`).
- Resolve a MEDLINE abbreviation to its NLM Unique ID for joining
  with PubMed metadata.
- Validate that a journal is currently indexed in MEDLINE
  (`currentIndexingStatus`).
- Pull the canonical and alternate titles for citation rendering.
- Discover when a serial began / ended publication
  (`startYear` / `endYear`).

## When NOT to use

| If you want to                                       | Use instead                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Search articles published in a given journal         | `@ncbijs/pubmed` (search by `<MedlineTA>[ta]`)                               |
| Fetch citation metadata for an article               | `@ncbijs/pubmed` or `@ncbijs/eutils` (`esummary` on `pubmed`)                |
| Fetch open-access full text                          | `@ncbijs/pmc` (JATS XML)                                                     |
| Look up an NCBI Bookshelf textbook or chapter        | `@ncbijs/books` (Bookshelf — `NBK*` accessions)                              |
| Format a citation string from raw fields             | `@ncbijs/cite`                                                               |
| Resolve an article DOI / PMID / PMCID                | `@ncbijs/id-converter`                                                       |
| Find articles linked to a journal record             | `@ncbijs/eutils` (`elink` from `nlmcatalog` → `pubmed`) or `@ncbijs/pubmed`  |

## Exports

| Export                  | Kind      | Purpose                                                              |
| ----------------------- | --------- | -------------------------------------------------------------------- |
| `NlmCatalog`            | class     | Main HTTP client (`search`, `fetch`, `searchAndFetch`)               |
| `NlmCatalogHttpError`   | class     | HTTP-level failure (extends `HttpRetryError`)                        |
| `NlmCatalogConfig`      | interface | `{ apiKey?, tool?, email?, maxRetries? }`                            |
| `NlmCatalogIssn`        | interface | `{ issn, type }` — type is `'Print'` / `'Electronic'` / `'Linking'` |
| `NlmCatalogRecord`      | interface | Flat journal/serial record                                           |
| `NlmCatalogSearchResult`| interface | `{ total, ids }`                                                     |

## API surface

### `new NlmCatalog(config?)`

```ts
new NlmCatalog({
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

Per-instance bucket. Use one `NlmCatalog` per process.

### `search(term, options?): Promise<NlmCatalogSearchResult>`

GETs `esearch.fcgi?db=nlmcatalog&term=...&retmode=json`. Returns total
match count and the list of UIDs.

```ts
const r = await nlmCatalog.search('Nature');
r.total; // 83
r.ids;   // ['0410462', '101563288', ...]

const limited = await nlmCatalog.search('genetics', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID list
(NCBI default ≈ 20).

### `fetch(ids): Promise<ReadonlyArray<NlmCatalogRecord>>`

GETs `esummary.fcgi?db=nlmcatalog&id=...&retmode=json`. Returns one
`NlmCatalogRecord` per UID:

```ts
{
  uid: string;                          // numeric UID
  nlmUniqueId: string;                  // canonical NLM Unique ID
  dateRevised: string;
  title: string;                        // titlemainlist[0].title
  titleSort: string;                    // sortable title
  alternateTitles: ReadonlyArray<string>;
  issns: ReadonlyArray<NlmCatalogIssn>; // { issn, type }
  isbn: string;
  country: string;
  currentIndexingStatus: string;        // 'Currently-indexed' | ...
  medlineAbbreviation: string;          // e.g. 'Nature'
  isoAbbreviation: string;              // e.g. 'Nature'
  startYear: string;
  endYear: string;
  journalId: string;                    // raw 'jrid'
  language: string;
  continuationNotes: string;
  resourceType: string;                 // resourceinfolist[0].typeofresource
}
```

Empty input → empty output (no HTTP call). Entries returned with an
`error` field are silently skipped — the result array length may be
smaller than `ids.length`.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<NlmCatalogRecord>>`

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
- **Per-instance bucket.** Don't run two `NlmCatalog` instances against
  the same key in one process — the buckets don't coordinate.

## Cross-package wiring

- **Imports.** `import { NlmCatalog } from '@ncbijs/nlm-catalog'`.
- **Composes with `@ncbijs/eutils`** via the `/config` subpath only —
  imports `EUTILS_BASE_URL`, the rate constants, the
  `EUtilsCredentials` type, and `appendEUtilsCredentials`. Does **not**
  instantiate the full `EUtils` class (avoids pulling in the full
  client surface for a JSON-only consumer).
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `NlmCatalogHttpError` extends
  `HttpRetryError`.
- **No internal consumers.** `@ncbijs/http-mcp` does not currently
  expose NLM Catalog tools; `@ncbijs/etl` does not register an
  `nlmcatalog` dataset. If/when MCP tools are added, follow the
  pattern in `clinvar-tools.ts` (search + fetch as separate MCP
  tools).
- **Natural pairing.** Combine with `@ncbijs/pubmed` to enrich article
  metadata: an article's `<MedlineTA>` ↔ this record's
  `medlineAbbreviation`, joined on `nlmUniqueId`.
- **Example** — `examples/nlm-catalog-search.ts`.

## Common pitfalls

1. **`uid` and `nlmUniqueId` look interchangeable but are not
   guaranteed to be.** For most journals NCBI uses the NLM Unique ID
   as the Entrez UID, but this is not contractually guaranteed.
   Always join external datasets on `nlmUniqueId` (the canonical
   identifier), not `uid`.

2. **`title` is flattened from `titlemainlist[0]`.** NLM Catalog
   records can technically carry multiple "main" titles in the
   underlying data model, but in practice the first entry is always
   the canonical title. The mapper takes index `0` only — additional
   main titles (extremely rare) are dropped silently. `alternateTitles`
   carries `titleotherlist` separately.

3. **`issns` may be empty.** Books, audiovisuals, and electronic-only
   resources can have no ISSN at all (use `isbn` instead). Don't
   index records by ISSN without checking `issns.length > 0` first.

4. **`type` on `NlmCatalogIssn` is a free-form string.** NCBI uses
   `'Print'`, `'Electronic'`, and `'Linking'` for the typed forms,
   but the field is not constrained at the API level. Don't narrow
   it to a TypeScript union — accept any string.

5. **`resourceType` is `resourceinfolist[0].typeofresource`.** Most
   journal records carry exactly one resource info entry, so
   flattening is safe in practice. If a record carries multiple
   (rare; mostly multi-format serials), only the first is surfaced.

6. **`medlineAbbreviation` vs `isoAbbreviation`.** Both are journal
   abbreviations but follow different standards. The MEDLINE
   abbreviation is what PubMed records carry in `<MedlineTA>` —
   join on this for PubMed enrichment. The ISO abbreviation
   follows ISO 4 punctuation rules (e.g. `Nat. Genet.`). They are
   not always equal; do not collapse them.

7. **`currentIndexingStatus` is informational, not historical.** A
   value of `'Not currently indexed for MEDLINE'` does not imply
   the journal was never indexed — it may have been deindexed.
   Cross-check with `continuationNotes` and `endYear` for full
   context.

8. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment with the request.

9. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class. Don't refactor to
   `from '@ncbijs/eutils'` — it would bloat the bundle and break the
   convention shared by `@ncbijs/omim`, `@ncbijs/medgen`, `@ncbijs/cdd`,
   `@ncbijs/books`.

10. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
    no `esummary` call → empty array. You cannot observe a "search
    succeeded but fetch failed" state through this method.

## Testing

```bash
pnpm nx run @ncbijs/nlm-catalog:test          # unit (mocked fetch)
pnpm nx run ncbijs-e2e:e2e -- nlm-catalog     # E2E (live NCBI, needs NCBI_API_KEY)
pnpm nx run @ncbijs/nlm-catalog:typecheck
pnpm nx run @ncbijs/nlm-catalog:lint
pnpm nx run @ncbijs/nlm-catalog:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, entries with `error` field, `searchAndFetch` short-circuit,
and the title / ISSN / resource-info flattening (single-entry,
multi-entry, missing-list cases).

## Files

```
packages/nlm-catalog/src/
  index.ts                              # public re-exports
  nlm-catalog.ts                        # NlmCatalog class + esearch/esummary + mappers
  nlm-catalog.spec.ts
  nlm-catalog-client.ts                 # fetchJson + NlmCatalogHttpError + NlmCatalogClientConfig
  nlm-catalog-client.spec.ts
  interfaces/
    nlm-catalog.interface.ts            # NlmCatalogConfig, NlmCatalogRecord,
                                        # NlmCatalogIssn, NlmCatalogSearchResult
```
