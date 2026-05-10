---
package: '@ncbijs/pubtator'
purpose: 'Client for the PubTator3 text-mining API — biomedical entity autocomplete, publication search, and BioC annotation export plus pure parsers for BioC (XML/JSON) and PubTator TSV output.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
  - '@ncbijs/xml'
used_by:
  - '@ncbijs/http-mcp'
exports:
  - 'PubTator'
  - 'PubTatorHttpError'
  - 'parseBioC'
  - 'parsePubTatorTsv'
  - 'ENTITY_TYPES'
  - 'CONCEPT_TYPES'
related_docs:
last_audited: '2026-04-19'
---

# @ncbijs/pubtator

## Purpose

PubTator3 is NCBI's text-mining service: ~1B entity annotations across
36M PubMed abstracts and 6M PMC full-text articles. It identifies
genes, diseases, chemicals, mutations (variants), species, and cell
lines via pre-computed annotations on existing literature, plus an
on-demand annotator for arbitrary text.

This package wraps the three layers of the PubTator3 API surface
(entity autocomplete, publication search, BioC export) into one
typed client and provides pure parsers for both BioC (JSON/XML) and
the legacy PubTator TSV format. No mode switching, no storage backend
— it is a thin HTTP client plus stateless parsers.

## When to use

- Resolve a free-text entity name to a normalised concept ID
  (`'BRCA1'` -> `{ id: '672', type: 'gene' }`).
- Pull pre-computed gene / disease / chemical mentions for a known
  PubMed article without re-running NER yourself.
- Submit ad-hoc free text and get back annotated spans (PubTator's
  on-the-fly annotator).
- Parse a BioC dump (e.g. local file) into typed `BioDocument` /
  `BioPassage` / `Annotation` objects.
- Parse a PubTator TSV export into typed `PubTatorAnnotation` rows.

## When NOT to use

| If you want to                                          | Use instead                                                |
| ------------------------------------------------------- | ---------------------------------------------------------- |
| Search PubMed metadata or pull article XML              | `@ncbijs/pubmed`                                           |
| Fetch full-text JATS XML for PMC articles               | `@ncbijs/pmc`                                              |
| Look up MeSH descriptors / expand a query term          | `@ncbijs/mesh`                                             |
| Run any other Entrez / E-utilities call                 | `@ncbijs/eutils`                                           |
| Format a citation in RIS / MEDLINE / CSL                | `@ncbijs/cite`                                             |
| Convert between PMID / PMCID / DOI / MID                | `@ncbijs/id-converter`                                     |
| Parse arbitrary BioC files **without** an HTTP client   | Import `parseBioC` directly (no `PubTator` instance needed)|

## Exports

| Export               | Kind      | Purpose                                                                |
| -------------------- | --------- | ---------------------------------------------------------------------- |
| `PubTator`           | class     | Main HTTP client; `new PubTator(config?)`                              |
| `PubTatorHttpError`  | class     | Thrown on non-2xx responses; carries `status` + `body`                 |
| `parseBioC`          | function  | Pure parser: BioC JSON or XML string -> `BioDocument`                  |
| `parsePubTatorTsv`   | function  | Pure parser: PubTator tab-separated lines -> `PubTatorAnnotation[]`    |
| `ENTITY_TYPES`       | const     | Map of friendly key -> wire value for the autocomplete `type` filter   |
| `CONCEPT_TYPES`      | const     | Map of friendly key -> wire value for the export `concepts` filter     |
| `EntityType`         | type      | Union of `ENTITY_TYPES` values                                         |
| `ConceptType`        | type      | Union of `CONCEPT_TYPES` values                                        |
| `BioDocument`        | interface | `{ documents: [{ id, passages: [...] }] }`                             |
| `BioPassage`         | interface | `{ type, text, offset, annotations: Annotation[] }`                    |
| `Annotation`         | interface | `{ text, type, id, offset, length }`                                   |
| `EntityMatch`        | interface | `{ id, name, type }` — one row from `findEntity`                       |
| `SearchResult`       | interface | `{ total, page, pageSize, results: [...] }`                            |
| `SearchOptions`      | interface | `{ page?, pageSize? }`                                                 |
| `ExportOptions`      | interface | `{ format?: 'json' \| 'xml', full?: boolean }`                         |
| `AnnotateOptions`    | interface | `{ concept?, format? }`                                                |
| `AnnotateFormat`     | type      | `'pubtator' \| 'biocjson' \| 'biocxml'`                                |
| `PubTatorAnnotation` | interface | `{ pmid, start, end, text, type, id }` — TSV row                       |
| `PubtatorConfig`     | interface | `{ maxRetries? }`                                                      |

## API surface

### `new PubTator(config?)`

```ts
new PubTator({
  maxRetries?: number; // default 3 — exponential backoff with jitter on 429/5xx
})
```

No credentials, no `tool` / `email` / `apiKey`. PubTator3 does not
expose an API-key concept; rate is fixed at 3 req/s and enforced
locally via a private `TokenBucket`.

### `findEntity(query, entityType?): Promise<ReadonlyArray<EntityMatch>>`

Autocomplete biomedical entities by name.

```ts
const hits = await pubtator.findEntity('aspirin', 'chemical');
// [{ id: 'MESH:D001241', name: 'aspirin', type: 'chemical' }, ...]
```

The wire response contains both `_id` (PubTator concept key) and
`db_id` (source DB ID). The client surfaces `db_id` as `id` because
that is the value most callers want to round-trip into MeSH /
Entrez / RxNorm.

### `search(query, options?): Promise<SearchResult>`

Full-text search over PubTator-indexed publications. Query syntax
supports keywords and `@ENTITY_ID` tokens (e.g.
`@DISEASE_Hypertension`).

```ts
const r = await pubtator.search('BRCA1 breast cancer', { page: 1, pageSize: 50 });
// { total, page, pageSize, results: [{ pmid, title, journal, year, authors }, ...] }
```

`page_size` is capped at 200 by the API; the total result window
is capped at 1,000.

### `export(pmids, options?): Promise<BioDocument>`

Fetch BioC annotations for a list of PMIDs and parse them eagerly.

```ts
const bioc = await pubtator.export(['33024307', '32919527'], {
  format: 'json', // default — also 'xml'
  full: false,    // true = full-text annotations (PMC only)
});
```

Empty server responses return `{ documents: [] }` instead of
throwing — this is intentional; PubTator returns an empty body when
none of the PMIDs are indexed yet.

### `annotateByPmid(pmids, options?): Promise<string>`

Pre-computed annotations for known PMIDs. Returns the **raw response
body** (string) so callers can choose between feeding it to
`parseBioC` (for `biocjson` / `biocxml`) or `parsePubTatorTsv` (for
the default `pubtator` format).

### `annotateText(text, options?): Promise<string>`

POSTs free text to PubTator's on-demand NER. Same string-returning
contract as `annotateByPmid`.

```ts
const tsv = await pubtator.annotateText(
  'BRCA1 mutations are associated with breast cancer.',
  { concept: 'Disease' },
);
const annotations = parsePubTatorTsv(tsv);
```

### `parseBioC(input: string): BioDocument`

Stateless. Auto-detects JSON vs XML by the first non-whitespace
character (`{` / `[` -> JSON, `<` -> XML). Throws on empty input or
on XML lacking a `<document>` / `<collection>` root. JSON input may
be wrapped under either `documents` or `PubTator3` (PubTator3 emits
the latter at the time of writing).

### `parsePubTatorTsv(input: string): ReadonlyArray<PubTatorAnnotation>`

Stateless. One annotation per line. Lines that don't match
`pmid \t start \t end \t text \t type \t id` are silently skipped
(headers, blank lines, document text rows).

## Configuration

| Field        | Type     | Default | Notes                                       |
| ------------ | -------- | ------- | ------------------------------------------- |
| `maxRetries` | `number` | `3`     | Exponential backoff with jitter on 429 / 5xx |

Rate is fixed at 3 req/s per instance via a private `TokenBucket`
from `@ncbijs/rate-limiter`. There is no API-key path that raises it.

## Rate limiting & credentials

- **No credentials.** PubTator3 ignores `tool` / `email` / `api_key`.
- **3 req/s, per instance.** Two `PubTator` instances in the same
  process collectively exceed the limit; share a single instance
  per process.
- **Retries.** 429 / 5xx -> exponential backoff via the shared
  `fetchWithRetry` from `@ncbijs/rate-limiter`. Retries beyond
  `maxRetries` surface as `PubTatorHttpError`.
- **Two upstream base URLs.** Search/autocomplete live on
  `pubtator3-api`; export lives on the same host but a different
  path (`/publications/export/bioc{format}`). The constants are
  internal to `pubtator.ts`.

## Cross-package wiring

- **Imports.** `import { PubTator, parseBioC, parsePubTatorTsv } from '@ncbijs/pubtator'`.
- **Composes with `@ncbijs/xml`** — `parseBioC` uses `readAllBlocks`,
  `readTag`, `readAttribute`, `readAllTagsWithAttributes` for the XML
  branch. `xml` is a runtime dep, not optional.
- **Composes with `@ncbijs/rate-limiter`** — `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError` (extended as `PubTatorHttpError`).
- **Used by `@ncbijs/http-mcp`** — `pubtator-tools.ts` wires
  `find-entity`, `search-litvar`-adjacent, `annotate-text`, and
  `export-annotations` MCP tools onto a single shared `PubTator`
  instance.
- **Common pairing:** call `@ncbijs/eutils` esearch / `@ncbijs/pubmed`
  search to get a PMID list, then hand the IDs to
  `pubtator.export(...)` for entity context.

## Common pitfalls

1. **Two ID concepts in `findEntity` results.** The wire row carries
   both `_id` (a PubTator concept key like `@CHEMICAL_aspirin`) and
   `db_id` (the underlying NCBI / MeSH / Cell Line Ontology ID).
   The client returns `db_id` as `EntityMatch.id`. If you need to
   round-trip back into PubTator's own search via `@ENTITY_ID`
   syntax, you need the `_id` form — this client does not surface it,
   so use `pubtator.search(query)` directly.

2. **`export()` swallows empty bodies as `{ documents: [] }`.** When
   none of the PMIDs are indexed (or all are very new), PubTator
   returns an empty body and HTTP 200. This is **not** an error in
   the wire protocol but it can mask a typo in the PMID list.
   Validate IDs (`@ncbijs/id-converter` `isPMID`) before calling.

3. **`annotateByPmid` and `annotateText` return raw strings.** Unlike
   `export()` they do not parse. The default format is `'pubtator'`
   (TSV); pass `{ format: 'biocjson' }` or `{ format: 'biocxml' }`
   if you want to feed the result into `parseBioC`. Callers that
   forget often try to `JSON.parse` a TSV body and fail.

4. **Format casing for `concepts` filter.** The autocomplete
   `entityType` parameter uses lowercase wire values
   (`'gene'`, `'disease'`, `'chemical'`, `'variant'`, `'species'`,
   `'cell_line'`) while the export `concepts` filter uses
   PascalCase wire values (`'Gene'`, `'Disease'`, ...). Use
   `ENTITY_TYPES` and `CONCEPT_TYPES` rather than hardcoding —
   they encode the right casing per endpoint.

5. **`parseBioC` JSON wrapper key.** PubTator3 returns the document
   array under `PubTator3`, not `documents`. The parser accepts
   either, plus a top-level `Array` form, so existing callers
   migrating from BioC v1 don't break — but downstream code that
   walks the response shape itself must check both keys.

6. **`year: 0` on undated articles.** `search()` derives year via
   `new Date(date).getFullYear()`. When the upstream `date` field
   is empty, the result is `0`, not `undefined`. Treat `0` as
   "missing year" if you display it.

## Testing

```bash
pnpm nx run @ncbijs/pubtator:test
pnpm nx run ncbijs-e2e:e2e -- pubtator
```

Unit tests stub `fetch` via `vi.stubGlobal`. BioC parser tests use
small inline JSON / XML fixtures alongside the spec. E2E hits the
real PubTator3 host — no API key required.

## Files

```
packages/pubtator/src/
  index.ts                     # public re-exports
  pubtator.ts                  # PubTator class + private API response interfaces
  pubtator-client.ts           # PubTatorHttpError, fetchJson, fetchText
  parse-bioc.ts                # JSON + XML BioC parser (auto-detect)
  parse-pubtator-tsv.ts        # PubTator TSV row parser
  interfaces/
    pubtator.interface.ts      # all public types + ENTITY_TYPES/CONCEPT_TYPES
```
