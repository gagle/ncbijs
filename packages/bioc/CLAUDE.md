---
package: '@ncbijs/bioc'
purpose: 'BioC API client — annotated PubMed and PMC articles (named entity recognition for diseases, chemicals, genes, mutations) plus PubTator3 batch + entity autocomplete.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'BioC'
  - 'BioCHttpError'
  - 'BioCAnnotation'
  - 'BioCCollection'
  - 'BioCConfig'
  - 'BioCDocument'
  - 'BioCFormat'
  - 'BioCLocation'
  - 'BioCPassage'
  - 'EntitySearchResult'
  - 'RawEntitySearchResult'
related_docs: []
last_audited: '2026-02-16'
---

# @ncbijs/bioc

## Purpose

The BioC RESTful API (NCBI BioNLP) returns PubMed and PMC articles
already enriched with named-entity annotations — diseases, chemicals,
genes, species, mutations — at character-offset precision. This
package wraps **two** related upstreams behind one client:

1. **BioC RESTful API** at
   `https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful` for
   single-article retrieval (`pubmed.cgi`, `pmcoa.cgi`).
2. **PubTator3 API** at
   `https://www.ncbi.nlm.nih.gov/research/pubtator3-api` for batch
   article export and entity autocomplete.

Both endpoints serve the same BioC document shape, in either JSON or
XML. JSON responses are parsed and unwrapped from the
`{ documents: [...] }` collection envelope; XML responses are
returned as raw strings — **this package does not parse BioC XML**.

## When to use

- Retrieve a PubMed or PMC article with pre-computed entity
  annotations (offsets + type + identifier) for an NLP / RAG
  pipeline.
- Batch-fetch annotations for many articles at once via PubTator3.
- Autocomplete an entity name to its canonical identifier (MeSH,
  NCBI Gene, dbSNP, etc.) before issuing a literature query.
- Build a "highlight entities in article text" UI on top of `passages`
  + `annotations` offsets.

## When NOT to use

| If you want to                                  | Use instead                                       |
| ----------------------------------------------- | ------------------------------------------------- |
| Get unannotated PubMed article XML              | `@ncbijs/pubmed` + `@ncbijs/pubmed-xml`           |
| Get unannotated PMC full text                   | `@ncbijs/pmc` + `@ncbijs/jats`                    |
| Run named-entity-style queries directly         | `@ncbijs/pubtator` (search + relations endpoints) |
| Search PubMed by free text or MeSH              | `@ncbijs/pubmed`                                  |
| Look up a variant by rsID and find literature   | `@ncbijs/litvar`                                  |
| Parse BioC XML into typed objects               | Out of scope — XML is returned as a raw string    |

## Exports

| Export                  | Kind      | Purpose                                                                  |
| ----------------------- | --------- | ------------------------------------------------------------------------ |
| `BioC`                  | class     | Main client                                                              |
| `BioCHttpError`         | class     | Thrown on non-2xx responses; carries `status` + `body`                   |
| `BioCConfig`            | interface | Constructor config (`maxRetries?`)                                       |
| `BioCFormat`            | type      | `'json' \| 'xml'` — selects wire format on every fetch                   |
| `BioCDocument`          | interface | `{ id, passages: ReadonlyArray<BioCPassage> }`                           |
| `BioCPassage`           | interface | `{ offset, text, infons, annotations: ReadonlyArray<BioCAnnotation> }`   |
| `BioCAnnotation`        | interface | `{ id, text, infons, locations: ReadonlyArray<BioCLocation> }`           |
| `BioCLocation`          | interface | `{ offset, length }`                                                     |
| `BioCCollection`        | interface | Raw envelope returned by the BioC API; client unwraps `documents[0]`     |
| `EntitySearchResult`    | interface | Mapped autocomplete result `{ id, name, type }`                          |
| `RawEntitySearchResult` | interface | Raw autocomplete shape from PubTator3 (`db_id`, `biotype`, …)            |

## API surface

### `new BioC(config?)`

```ts
new BioC({
  maxRetries?: number; // default 3 — exponential backoff with jitter on 429/5xx
});
```

Constructs a private `TokenBucket` capped at 3 req/s; never shared
across instances. There are no required credentials.

### `pubmed(pmid, format?): Promise<BioCDocument | string>`

Single-article fetch via the BioC RESTful API
(`/pubmed.cgi/BioC_<json|xml>/<pmid>/unicode`). Overloaded:

- `pubmed(pmid, 'json')` (default) → `Promise<BioCDocument>` — parsed
  and unwrapped from the `documents` collection.
- `pubmed(pmid, 'xml')` → `Promise<string>` — raw BioC XML.

```ts
const doc = await bioc.pubmed('33533846');
for (const passage of doc.passages) {
  for (const ann of passage.annotations) {
    console.log(`${ann.infons.type}: ${ann.text} → ${ann.infons.identifier}`);
  }
}
```

Throws `Error('id must not be empty')` on falsy input and
`BioCHttpError` on non-2xx.

### `pmc(pmcid, format?): Promise<BioCDocument | string>`

Same shape as `pubmed()` but routed to `/pmcoa.cgi/...`. Accepts a
PMCID like `'PMC7096724'`.

### `pubmedBatch(pmids, format?): Promise<ReadonlyArray<BioCDocument> | string>`

Batch retrieval via PubTator3
(`/publications/export/biocjson?pmids=…` comma-separated). Returns a
**bare array** of documents in JSON mode (no `collection` envelope —
PubTator3 already flattens). Throws `Error('ids must not be empty')`
on empty input.

### `pmcBatch(pmcids, format?): Promise<ReadonlyArray<BioCDocument> | string>`

Same as `pubmedBatch` but for PMCIDs. Internally routes through
`/publications/pmc_export/...` (note: different path segment than
PMID batches).

### `entitySearch(query, type?): Promise<ReadonlyArray<EntitySearchResult>>`

PubTator3 entity autocomplete. Returns ranked entities — diseases
(MeSH), genes (NCBI Gene), chemicals (MeSH/CHEBI), species (NCBI
Taxonomy), variants. Optional `type` filter (e.g. `'gene'`,
`'disease'`, `'chemical'`) narrows to one biotype.

Maps the raw upstream fields (`db_id` → `id`, `biotype` → `type`)
into the cleaner `EntitySearchResult` shape; the raw shape is
re-exported as `RawEntitySearchResult` for callers who need the
extra fields (`description`, `match`, `db`, `_id`).

## Configuration

| Field        | Type     | Required | Default | Notes                                            |
| ------------ | -------- | -------- | ------- | ------------------------------------------------ |
| `maxRetries` | `number` | no       | `3`     | Exponential backoff with jitter on 429 / 5xx     |

## Rate limiting & credentials

- Token bucket sized at **3 requests per second** per instance,
  shared across both upstreams (BioC RESTful and PubTator3) since
  one `BioC` instance owns one bucket.
- **No API key concept.** Although both upstreams are hosted on
  `ncbi.nlm.nih.gov`, neither honours the E-utilities `api_key`
  parameter. There is no way to raise the rate.
- Per-instance bucket — running multiple `BioC` instances in the
  same process collectively exceeds 3 req/s. Use one per process.

## Cross-package wiring

- **Imports.** `import { BioC } from '@ncbijs/bioc'`. The README
  shows standalone `pubmed()`/`pmc()` imports — that is **not** the
  current source-of-truth API; the package exports a class. Treat
  the README as outdated until reconciled.
- **No internal consumers.** Not yet exposed by `@ncbijs/http-mcp` —
  to add MCP tools, follow the pattern in
  `packages/http-mcp/src/tools/litvar-tools.ts` (lazy
  `await import`, `registerTool` per method) and update both
  `packages/http-mcp/src/register-tools.ts` and the server's
  top-level `instructions` prose.
- **Pairs with `@ncbijs/pubmed` / `@ncbijs/pmc`** when a workflow
  needs both raw text (via Entrez efetch) and entity overlays (via
  BioC) for the same PMIDs.
- **Pairs with `@ncbijs/pubtator`** for full PubTator3 search /
  relations functionality — `@ncbijs/bioc` only covers the export
  and autocomplete subset of PubTator3.
- **Not in the ETL pipeline.** Not registered in
  `packages/etl/src/dataset-registry.ts`. There is no bulk parser
  in this package — annotated dumps would belong in a dedicated
  package or extension if ever added.

## Common pitfalls

1. **XML mode does not parse.** `bioc.pubmed(pmid, 'xml')` returns
   the raw response body as `string`. The package depends only on
   `@ncbijs/rate-limiter` — there is no XML reader linked. If you
   need typed XML, parse it with `@ncbijs/xml` yourself or use the
   default JSON mode.

2. **Single vs batch endpoint shape mismatch.** The single-article
   endpoint returns a `{ documents: [...] }` collection wrapper that
   the client unwraps to `documents[0]`. The PubTator3 batch endpoint
   returns a bare array. The client correctly handles each, but if
   you bypass the client and call the URLs directly, do not assume
   one shape.

3. **`pmcBatch` uses a different path segment.** PMID batches go to
   `/publications/export/...` while PMCID batches go to
   `/publications/pmc_export/...`. The selector lives in the private
   `fetchBioCBatch` helper — bypassing it loses this routing.

4. **Empty `documents` is an error.** When the BioC RESTful API
   returns a collection with `documents: []` (some malformed IDs),
   the client throws `Error('BioC API returned a collection with no
   documents')`. The HTTP status is still 200 in this case, so do
   not catch only `BioCHttpError`.

5. **`infons` is a free-form string map.** Keys like `'type'`,
   `'identifier'`, `'NCBI Gene'`, `'MESH'` are upstream conventions,
   not enforced by the type system. Always default-handle missing
   keys when reading annotations across articles.

6. **Annotation `locations` is an array.** A single annotation can
   span multiple disjoint character ranges in the passage (e.g. a
   coordinated-noun mention). Iterate `locations`; do not index
   `[0]` blindly when computing highlights.

7. **README is out of date with the source.** The package README
   documents standalone `pubmed()` / `pmc()` functions, but the
   actual source exports a `BioC` class. Use the class API; treat
   any README example as a conceptual sketch only.

## Testing

```bash
# Unit tests (mocked fetchWithRetry / fetch)
pnpm nx run @ncbijs/bioc:test

# E2E (real BioC + PubTator3; no API key required)
pnpm nx run ncbijs-e2e:e2e -- bioc

# Type-check + lint + build
pnpm nx run @ncbijs/bioc:typecheck
pnpm nx run @ncbijs/bioc:lint
pnpm nx run @ncbijs/bioc:build
```

The class spec covers all four article methods × `'json'` / `'xml'`
formats, the entity autocomplete with and without `type` filter, and
URL-encoding edge cases for IDs with special characters.

## Files

```
packages/bioc/src/
  index.ts                                  # public re-exports
  bioc.ts                                   # BioC class (BioC RESTful + PubTator3)
  bioc-client.ts                            # fetchText + BioCHttpError
  interfaces/bioc.interface.ts              # all public types + raw entity shape
  bioc.spec.ts                              # class behaviour tests
  bioc-client.spec.ts                       # HTTP / retry / error tests
```
