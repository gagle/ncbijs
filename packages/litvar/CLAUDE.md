---
package: '@ncbijs/litvar'
purpose: 'LitVar2 client — links genetic variants (rsIDs) to PubMed/PMC literature, plus a bulk-file parser for the FTP variant catalog. Split layout (http + bulk-parsers).'
layout: 'split'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/http-mcp'
exports:
  - 'LitVar'
  - 'LitVarHttpError'
  - 'parseLitVarJson'
  - 'LitVarConfig'
  - 'LitVarVariant'
  - 'LitVarPublicationResult'
  - 'LitVarSearchResult'
related_docs: []
last_audited: '2026-03-28'
---

# @ncbijs/litvar

## Purpose

LitVar2 is the NCBI service that mines biomedical literature for
mentions of genetic variants and links them back to PubMed/PMC. It
runs at `https://www.ncbi.nlm.nih.gov/research/litvar2-api` —
distinct from the Entrez E-utilities — and exposes a small set of
JSON endpoints centred on dbSNP rsIDs.

This package provides:

1. **HTTP client** — three endpoints (variant detail, publications,
   autocomplete search) with rate limiting and retries.
2. **Bulk parser** — `parseLitVarJson` ingests the daily FTP dump
   (`litvar2_variants.json.gz`) into typed records. The bulk format
   is a slightly different shape from the HTTP format (see "Common
   pitfalls").

## When to use

- Given an rsID, retrieve the canonical variant metadata
  (gene, HGVS, clinical significance) as LitVar has indexed it.
- Given an rsID, list the PMIDs and PMCIDs of articles that mention
  it — the foundation for variant-aware literature queries.
- Autocomplete a partial rsID, gene name, or HGVS string into ranked
  variant suggestions.
- Bulk-load the FTP variant dump into a local store (e.g. for
  offline rsID → PMID joins).

## When NOT to use

| If you want to                                  | Use instead                                       |
| ----------------------------------------------- | ------------------------------------------------- |
| Look up dbSNP variant metadata canonically      | `@ncbijs/snp` (RefSNP records, HGVS/SPDI/VCF)     |
| Search PubMed by free text or MeSH              | `@ncbijs/pubmed`                                  |
| Get clinical interpretations for a variant      | `@ncbijs/clinvar`                                 |
| Convert variant notations (HGVS/SPDI/VCF)       | `@ncbijs/snp` conversion endpoints                |
| Fetch full text of a linked article             | `@ncbijs/pmc`                                     |
| Run any NCBI Entrez E-utility query             | `@ncbijs/eutils`                                  |

## Exports

| Export                    | Kind      | Purpose                                                              |
| ------------------------- | --------- | -------------------------------------------------------------------- |
| `LitVar`                  | class     | Main HTTP client                                                     |
| `LitVarHttpError`         | class     | Thrown on non-2xx responses; carries `status` + `body`               |
| `parseLitVarJson`         | function  | Pure parser for the FTP bulk dump (JSON array or NDJSON)             |
| `LitVarConfig`            | interface | Constructor config (`maxRetries?`)                                   |
| `LitVarVariant`           | interface | `{ rsid, gene[], name, hgvs, clinicalSignificance[] }`               |
| `LitVarPublicationResult` | interface | `{ pmids[], pmcids[], count }`                                       |
| `LitVarSearchResult`      | interface | Autocomplete result with `publicationCount` and `match`              |

## API surface

### `new LitVar(config?)`

```ts
new LitVar({
  maxRetries?: number; // default 3 — exponential backoff with jitter on 429/5xx
});
```

Constructs a private `TokenBucket` capped at 3 req/s; never shared
across instances. There are no required credentials.

### `variant(rsid: string): Promise<LitVarVariant>`

Variant detail by rsID. The wire path uses an opaque encoded id
(`litvar@<rsid>%23%23`) — the client builds this for you, so callers
pass the bare `'rs328'` form.

```ts
const v = await litvar.variant('rs328');
// v.rsid: 'rs328', v.gene: ['LPL'], v.hgvs: 'NM_…', v.clinicalSignificance: [...]
```

Throws synchronously if `rsid` is empty.

### `publications(rsid: string): Promise<LitVarPublicationResult>`

PMIDs and PMCIDs that mention this rsID. `count` is the total PMID
count as reported by the upstream (which is the same as `pmids.length`
in practice but is sourced from a separate field for forward
compatibility). Throws on empty `rsid`.

### `search(query: string): Promise<ReadonlyArray<LitVarSearchResult>>`

Autocomplete over the LitVar variant index. Accepts gene names,
partial rsIDs, HGVS notations. Returns ranked suggestions; the
upstream caps the result count, so this is for prefix-style discovery,
not full enumeration. Throws on empty `query`.

### `parseLitVarJson(json: string): ReadonlyArray<LitVarVariant>`

Pure function (no HTTP). Parses a decompressed bulk dump
(`litvar2_variants.json.gz` → unpacked text) into the same
`LitVarVariant` shape as the HTTP client.

```ts
import { gunzipSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
const text = gunzipSync(readFileSync('litvar2_variants.json.gz')).toString('utf-8');
const variants = parseLitVarJson(text);
```

Accepts both:

- A JSON array (`[{...}, {...}]`)
- NDJSON (one JSON object per line)

Auto-detects from the first non-whitespace character. Malformed lines
in NDJSON mode are silently skipped — a malformed JSON array returns
`[]`.

## Configuration

| Field        | Type     | Required | Default | Notes                                            |
| ------------ | -------- | -------- | ------- | ------------------------------------------------ |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx     |

## Rate limiting & credentials

- Token bucket sized at **3 requests per second** per instance.
- **No API key concept.** Although LitVar2 is hosted on
  `ncbi.nlm.nih.gov`, it is not behind the E-utilities API key
  scheme — there is no `tool`/`email`/`api_key` parameter and no way
  to raise the rate. Treat 3 req/s as a hard ceiling.
- Per-instance bucket — running multiple `LitVar` instances in the
  same process will collectively exceed 3 req/s. Use one per process.

## Cross-package wiring

- **Imports.**
  ```ts
  import { LitVar, parseLitVarJson } from '@ncbijs/litvar';
  ```
- **Used by `@ncbijs/http-mcp`** —
  `packages/http-mcp/src/tools/litvar-tools.ts` registers the
  `search-litvar` MCP tool, which lazy-imports `LitVar` and calls
  `variant()` + `publications()` in parallel for a given rsID.
- **Pairs with `@ncbijs/snp`** — when an agent has only an rsID and
  needs to disambiguate it, fetch the canonical RefSNP record from
  `@ncbijs/snp` first, then ask `@ncbijs/litvar` for literature.
- **Pairs with `@ncbijs/pubmed`** — `LitVarPublicationResult.pmids`
  feeds directly into `pubmed.fetch(pmids)` for downstream article
  retrieval.
- **Not in the ETL pipeline.** Not registered in
  `packages/etl/src/dataset-registry.ts`, but the bulk parser is the
  natural integration point if a future ETL job loads the variant
  catalog into DuckDB.

## Common pitfalls

1. **Bulk format ≠ HTTP format.** The FTP dump uses `gene: string`
   (a single name) and `hgvs: ReadonlyArray<string>` (variants), while
   the HTTP API uses `gene: ReadonlyArray<string>` (multiple names)
   and `hgvs: string` (single canonical form). The bulk parser
   normalises into the HTTP shape: `gene` becomes a single-element
   array, `hgvs` becomes the first element, and `name` +
   `clinicalSignificance` are filled with empty values because the
   bulk dump does not carry them. **Do not rely on `name` or
   `clinicalSignificance` after `parseLitVarJson`.**

2. **`count` vs `pmids.length`.** Upstream reports `pmids_count`
   separately from the `pmids` array. They agree today but the field
   is preserved on the wire — prefer `result.count` when displaying a
   total to a user, in case the upstream ever paginates.

3. **`buildVariantId` encodes the path segment.** The upstream path
   is `litvar@<rsid>##` with literal `#` characters URL-encoded as
   `%23%23`. Do not double-encode if you ever bypass the client and
   craft the URL yourself.

4. **NDJSON mode swallows malformed lines.** `parseLitVarJson`
   silently drops lines that fail `JSON.parse` (with a `// noop`
   catch). For data-quality auditing, parse the dump separately with
   a strict reader.

5. **Empty input strings are explicit errors, not no-ops.**
   `variant('')`, `publications('')`, and `search('')` throw
   synchronously rather than hitting the network. This is by design
   — LitVar2 returns 200-with-empty-body on missing IDs which is
   harder to detect downstream.

6. **Autocomplete is not exhaustive search.** `search()` returns the
   upstream's ranked top-N suggestions only. For full enumeration of
   variants by gene, load the FTP bulk dump via `parseLitVarJson`
   and filter in-process.

## Testing

```bash
# Unit tests (mocked fetchWithRetry / fetch)
pnpm nx run @ncbijs/litvar:test

# E2E (real LitVar2; no API key required)
pnpm nx run ncbijs-e2e:e2e -- litvar

# Type-check + lint + build
pnpm nx run @ncbijs/litvar:typecheck
pnpm nx run @ncbijs/litvar:lint
pnpm nx run @ncbijs/litvar:build
```

The bulk-parser spec exercises both the JSON-array and NDJSON
branches plus their malformed-input edge cases.

## Files

```
packages/litvar/src/
  index.ts                                       # public re-exports
  interfaces/litvar.interface.ts                 # shared domain types
  http/
    litvar.ts                                    # LitVar class + raw → domain mappers
    litvar-client.ts                             # fetchJson + LitVarHttpError
    litvar.spec.ts                               # class behaviour tests
    litvar-client.spec.ts                        # HTTP / retry / error tests
  bulk-parsers/
    parse-litvar-json.ts                         # FTP dump → ReadonlyArray<LitVarVariant>
    parse-litvar-json.spec.ts                    # array + NDJSON parser tests
```
