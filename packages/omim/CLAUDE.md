---
package: '@ncbijs/omim'
purpose: 'Typed client for NCBI OMIM (Online Mendelian Inheritance in Man) — search and fetch genetic disorder / gene catalog entries via the E-utilities `omim` database.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'Omim'
  - 'OmimHttpError'
  - 'OmimConfig'
  - 'OmimEntry'
  - 'OmimSearchResult'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-04-06'
---

# @ncbijs/omim

## Purpose

Thin domain wrapper over E-utilities (`esearch` + `esummary` against
the `omim` database) for the OMIM catalog — Mendelian disorders,
allelic variants, gene-phenotype relationships, identified by **MIM
numbers** (`100050`, `154700`, …) and prefixed with a status symbol
(`*`, `#`, `+`, `%`, `^`).

The package exists as a separate domain client (rather than asking
users to call `eutils.esearch({ db: 'omim' })` directly) because:

- It parses the `oid` field — a string like `'#154700'` — into the
  prefix and the canonical MIM number.
- It uses E-utilities credentials (`tool`, `email`, `apiKey`) but
  exposes only the OMIM-relevant subset of options.
- Higher-level integrations (citation pipelines, knowledge-graph
  enrichment) want a typed `OmimEntry`, not a raw esummary blob.

## When to use

- Look up a disorder or gene by name (`'Marfan syndrome'`,
  `'BRCA1'`).
- Fetch entry summaries for a known list of MIM numbers.
- Quickly enumerate alternative titles and the gene-map locus for an
  entry.
- Cross-reference variant findings (from ClinVar, dbSNP) to OMIM
  phenotypes.

## When NOT to use

| If you want to                                       | Use instead                                      |
| ---------------------------------------------------- | ------------------------------------------------ |
| Fetch the full clinical synopsis text of an entry    | OMIM web API (`api.omim.org`) directly — needs an OMIM API key, not exposed by NCBI E-utilities |
| Look up clinical-variant interpretations             | `@ncbijs/clinvar`                                |
| Look up a gene by symbol or NCBI Gene ID             | `@ncbijs/eutils` (`esearch` on `gene`)           |
| Get broader medical-concept metadata                 | `@ncbijs/medgen` (NCBI MedGen, broader vocabulary) |
| Find literature citations for an OMIM phenotype      | `@ncbijs/eutils` (`elink` from `omim` → `pubmed`) or `@ncbijs/pubmed` |

## Exports

| Export             | Kind      | Purpose                                                    |
| ------------------ | --------- | ---------------------------------------------------------- |
| `Omim`             | class     | Main client                                                |
| `OmimHttpError`    | class     | HTTP-level failure (extends `HttpRetryError`)              |
| `OmimConfig`       | interface | `{ apiKey?, tool?, email?, maxRetries? }`                  |
| `OmimEntry`        | interface | `{ uid, mimNumber, prefix, title, alternativeTitles, geneMapLocus }` |
| `OmimSearchResult` | interface | `{ total, ids }`                                           |

## API surface

### `new Omim(config?)`

```ts
new Omim({
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

Per-instance, not shared. Use one `Omim` per process.

### `search(term, options?): Promise<OmimSearchResult>`

GETs `esearch.fcgi?db=omim&term=...&retmode=json`. Returns total
match count and the list of UIDs.

```ts
const r = await omim.search('Marfan syndrome');
r.total; // 12
r.ids;   // ['154700', '134797', ...]

const limited = await omim.search('cardiomyopathy', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID
list. Defaults to whatever NCBI's default is (typically 20).

### `fetch(ids): Promise<ReadonlyArray<OmimEntry>>`

GETs `esummary.fcgi?db=omim&id=...&retmode=json`. Maps each entry
into `OmimEntry`:

```ts
{
  uid: string;               // numeric UID (== MIM number for OMIM)
  mimNumber: string;         // digits extracted from `oid`
  prefix: string;            // status symbol from `oid` ('*' | '#' | '+' | '%' | '^' | '')
  title: string;             // canonical title
  alternativeTitles: string; // semicolon-delimited alternatives (raw from NCBI)
  geneMapLocus: string;      // cytogenetic locus (e.g. '15q21.1')
}
```

Empty input → empty output (no HTTP call). Entries that come back
with an `error` field are skipped silently.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<OmimEntry>>`

Convenience wrapper: chains `search` + `fetch`. Returns `[]` if the
search produced no IDs (no second HTTP call is made).

## Configuration

| Field        | Type     | Required | Default | Notes                                                     |
| ------------ | -------- | -------- | ------- | --------------------------------------------------------- |
| `apiKey`     | `string` | no       | —       | Raises rate from 3 → 10 req/s (E-utilities tiering)       |
| `tool`       | `string` | no       | —       | NCBI usage policy asks for one — supply when known        |
| `email`      | `string` | no       | —       | Contact for abuse / quota issues                          |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx              |

`tool` and `email` are not enforced by NCBI for OMIM specifically,
but the E-utilities usage policy applies. `appendEUtilsCredentials`
adds whichever are present to every query string.

## Rate limiting & credentials

- **E-utilities tiering applies.** This package shares the
  `EUTILS_REQUESTS_PER_SECOND` and `EUTILS_REQUESTS_PER_SECOND_WITH_KEY`
  constants from `@ncbijs/eutils/config` — currently 3 (no key) / 10
  (with key).
- **Credentials appended to every request.** `tool`, `email`,
  `api_key` ride on the URL via `appendEUtilsCredentials`. Same
  helper used by `@ncbijs/eutils`.
- **Per-instance bucket.** Don't run two `Omim` instances against
  the same key in one process.

## Cross-package wiring

- **Imports.** `import { Omim } from '@ncbijs/omim'`.
- **Composes with `@ncbijs/eutils`.** Imports
  `EUTILS_BASE_URL`, the rate constants, the `EUtilsCredentials`
  type, and the `appendEUtilsCredentials` helper from
  `@ncbijs/eutils/config` — the package's `/config` subpath
  export. Does **not** instantiate the full `EUtils` class.
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `OmimHttpError` extends
  `HttpRetryError`.
- **No internal consumers.** `@ncbijs/http-mcp` does **not**
  currently expose OMIM tools; if/when added, the wiring will mirror
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/omim-search.ts`.

## Common pitfalls

1. **`mimNumber` and `uid` are usually the same — but typed as
   different fields.** For OMIM, NCBI uses the MIM number as the
   UID. The package still parses `oid` separately because the prefix
   character (`*`, `#`, `+`, `%`, `^`) is meaningful and absent from
   `uid`. Don't drop one field thinking it's redundant.

2. **`prefix` decodes the OMIM status symbol.** Common values:
   - `*` — gene with known sequence
   - `#` — phenotype, molecular basis known
   - `+` — gene + phenotype combined
   - `%` — phenotype, distinct mendelian, molecular basis unknown
   - `^` — entry was moved or removed
   - `''` — no prefix

   The regex `/^([*#+%^]?)/` extracts the prefix character; an entry
   with no prefix yields `prefix: ''`.

3. **`alternativeTitles` is a raw string, not an array.** NCBI
   returns a semicolon-delimited string in the esummary response;
   the package surfaces it as-is. Split on `;` yourself if needed.

4. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment.

5. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. Useful, but be aware that
   `total: 0` from `search` short-circuits without a second
   round-trip.

6. **No full-text or clinical-synopsis access.** This client uses
   the NCBI Entrez `omim` database, which only carries the catalog
   summary. The OMIM full text and detailed clinical synopsis live
   at `api.omim.org` and require an OMIM-issued API key — not
   covered by this package.

7. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class when consumers only
   need the OMIM client. Don't refactor to `from '@ncbijs/eutils'` —
   it would bloat the bundle.

## Testing

```bash
pnpm nx run @ncbijs/omim:test          # unit
pnpm nx run ncbijs-e2e:e2e -- omim     # E2E (live NCBI)
pnpm nx run @ncbijs/omim:typecheck
pnpm nx run @ncbijs/omim:lint
pnpm nx run @ncbijs/omim:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, prefix parsing for each status symbol, entries with `error`
field, and `searchAndFetch` short-circuit.

## Files

```
packages/omim/src/
  index.ts                       # public re-exports
  omim.ts                        # Omim class + esearch/esummary + entry mapper
  omim.spec.ts
  omim-client.ts                 # fetchJson + OmimHttpError
  omim-client.spec.ts
  interfaces/
    omim.interface.ts            # OmimConfig, OmimEntry, OmimSearchResult
```
