---
package: '@ncbijs/pubmed'
purpose: 'High-level PubMed search and retrieval client. Fluent query builder, History Server pagination, automatic date segmentation past the 10K result cap, and citation-graph traversal (related / cited-by / references).'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/pubmed-xml'
used_by:
  - '@ncbijs/http-mcp'
related_docs:
  - 'docs/ncbi-api-catalog.md'
exports:
  - 'PubMed'
  - 'PubMedQueryBuilder'
  - 'Article'
  - 'RelatedArticle'
  - 'PubMedSort'
  - 'PublicationType'
last_audited: '2026-04-17'
---

# @ncbijs/pubmed

## Purpose

Domain client for the PubMed bibliographic database (37M+ citations).
Wraps `@ncbijs/eutils` (esearch + efetch + elink) and
`@ncbijs/pubmed-xml` (XML parser) into a fluent surface:
`pubmed.search('CRISPR').author('Doudna').fetchAll()`. Hides
History-Server tokens, batches efetch calls automatically, and
transparently bypasses the NCBI 10,000-result `retmax` ceiling by
year-segmenting the query.

This is a **higher-level** wrapper — when you only need raw esearch
UIDs or non-PubMed E-utilities access, drop down to `@ncbijs/eutils`.

## When to use

- Search PubMed with structured filters (author, journal, MeSH,
  publication type, date range, free-full-text, proximity).
- Retrieve full parsed `Article` objects (not raw XML).
- Stream large result sets in batches for RAG / embedding pipelines.
- Walk the citation graph from a known PMID:
  `related()` (similarity-scored), `citedBy()`, `references()`.
- Build the canonical query string with `.buildQuery()` for logging
  or reuse, without executing it.

## When NOT to use

| If you want to                                           | Use instead                                              |
| -------------------------------------------------------- | -------------------------------------------------------- |
| Call any non-pubmed E-utilities database                 | `@ncbijs/eutils` directly                                |
| Parse PubMed XML you already have on disk                | `@ncbijs/pubmed-xml` (`parsePubmedXml`)                  |
| Fetch PMC full text                                      | `@ncbijs/pmc`                                            |
| Bulk-load the PubMed baseline / daily updates            | `@ncbijs/etl` + `@ncbijs/pipeline` + `@ncbijs/pubmed-xml`|
| Render a citation string from an `Article`               | `@ncbijs/cite`                                           |

## Exports

| Export               | Kind      | Purpose                                                                |
| -------------------- | --------- | ---------------------------------------------------------------------- |
| `PubMed`             | class     | Main client; constructed with the same config as `EUtils`              |
| `PubMedQueryBuilder` | class     | Fluent filter chain returned by `pubmed.search(term)`                  |
| `Article`            | interface | Parsed PubMed article (PMID, title, abstract, authors, journal, MeSH…) |
| `RelatedArticle`     | interface | `Article` + `relevancyScore: number`                                   |
| `PubMedSort`         | type      | `'relevance' \| 'pub_date' \| 'Author' \| 'JournalName'`               |
| `PublicationType`    | type      | Closed union of common publication-type filter values                  |

## API surface

### `new PubMed(config)`

Same config as `@ncbijs/eutils` — `tool` and `email` required, `apiKey`
and `maxRetries` optional. Internally constructs a private `EUtils`
instance; the rate-limit budget is therefore per-`PubMed`-instance.

```ts
const pubmed = new PubMed({
  tool: 'my-app',
  email: 'user@example.com',
  apiKey: process.env.NCBI_API_KEY,
});
```

### `pubmed.search(term): PubMedQueryBuilder`

Start a fluent query. The `term` is the free-text base; subsequent
filter calls append `AND <filter>` clauses to it.

### `PubMedQueryBuilder`

Filter chain. Every filter returns `this` so calls compose; terminal
methods are `.fetchAll()` and `.batches()`.

```ts
const articles = await pubmed
  .search('CRISPR')
  .author('Doudna JA')
  .meshTerm('Genome Editing')
  .dateRange('2020/01/01', '2024/12/31')
  .freeFullText()
  .sort('pub_date')
  .limit(500)
  .fetchAll();
```

| Method                                  | Adds                                                  |
| --------------------------------------- | ----------------------------------------------------- |
| `.author(name)`                         | `<name>[au]`                                          |
| `.journal(isoAbbrev)`                   | `"<isoAbbrev>"[ta]`                                   |
| `.meshTerm(descriptor)`                 | `"<descriptor>"[mesh]`                                |
| `.dateRange(from, to)`                  | `("<from>"[dp] : "<to>"[dp])`                         |
| `.publicationType(type)`                | `"<type>"[pt]`                                        |
| `.freeFullText()`                       | `free full text[sb]`                                  |
| `.proximity(terms, field, distance)`    | `"<terms>"[<field>:~<distance>]`                      |
| `.sort(field)`                          | sets esearch `sort` param (default `'relevance'`)     |
| `.limit(n)`                             | caps total fetched to `n`                             |
| `.buildQuery()`                         | returns the composed Entrez query string              |

### `.fetchAll(): Promise<ReadonlyArray<Article>>`

Run the query and return all matching articles. Internally:

1. `esearch(usehistory='y', retmax=0)` to learn `count` + `webEnv` +
   `queryKey`.
2. If `count <= 10_000`: paginate History Server with batch size 500.
3. If `count > 10_000`: **date segmentation** — re-issue the query
   year-by-year (current year → 1900) and stitch results until
   `limit` (or all years exhausted). Each year is independently
   capped at the 10K limit; years that exceed it are silently
   truncated.

### `.batches(size = 500): AsyncIterableIterator<ReadonlyArray<Article>>`

Yield articles batch-by-batch via the History Server. **Does not
support date segmentation** — throws if `count > 10_000`. Use
`.fetchAll()` (or add filters) for queries above the cap.

```ts
for await (const batch of pubmed.search('oncology').batches(200)) {
  await embed(batch);
}
```

Hard cap of 10,000 iterations as a safety net (mirrors `efetchBatches`
in `@ncbijs/eutils`).

### `pubmed.related(pmid): Promise<ReadonlyArray<RelatedArticle>>`

`elink` with `cmd='neighbor_score'` from `pubmed → pubmed`. Each
result carries the NCBI similarity `relevancyScore`; results are
sorted descending by score. Returns `[]` if the PMID has no
neighbors.

### `pubmed.citedBy(pmid): Promise<ReadonlyArray<Article>>`

`elink` with `linkname='pubmed_pubmed_citedin'`. Returns articles that
cite the input PMID.

### `pubmed.references(pmid): Promise<ReadonlyArray<Article>>`

`elink` with `linkname='pubmed_pubmed_refs'`. Returns articles in the
input PMID's reference section.

All three citation-graph methods funnel through a private
`fetchArticlesByIds()` that batches efetch calls at
`EFETCH_ID_BATCH_SIZE = 200` IDs per request.

## Configuration

| Field        | Type     | Required | Default | Notes                                                         |
| ------------ | -------- | -------- | ------- | ------------------------------------------------------------- |
| `tool`       | `string` | yes      | —       | Per NCBI usage policy                                         |
| `email`      | `string` | yes      | —       | Contact for abuse / quota issues                              |
| `apiKey`     | `string` | no       | —       | Raises rate from 3 → 10 req/s                                 |
| `maxRetries` | `number` | no       | `3`     | Forwarded to the internal `EUtils` instance                   |

Identical surface to `EUtilsConfig`. The constructor only forwards
to `new EUtils(config)`; PubMed adds no extra options.

## Rate limiting & credentials

- Owned by the internal `EUtils` instance — one private `TokenBucket`
  per `PubMed`. Two `PubMed` instances in the same process will
  collectively exceed the rate limit. **Use one `PubMed` per
  process.**
- `tool`, `email`, `api_key` are appended to every esearch / efetch
  / elink call by `appendEUtilsCredentials` inside `@ncbijs/eutils`.

## Cross-package wiring

- **Imports.**
  - `EUtils`, `EUtilsConfig`, `ESearchResult` from `@ncbijs/eutils`.
  - `parsePubmedXml`, `PubmedArticle` from `@ncbijs/pubmed-xml`.
- **Used by.**
  - `@ncbijs/http-mcp/src/tools/pubmed-tools.ts` — exposes
    `search-pubmed`, `get-citation`, related/cited-by/references as
    MCP tools.
  - `@ncbijs/cite/src/bulk-parsers/format-citation.ts` — uses the
    `Article` shape to render formatted citations (type-only
    coupling).
- **Composes with.**
  - `@ncbijs/pubmed-xml` for XML → `PubmedArticle` parsing; this
    package's `convertArticle()` then narrows `PubmedArticle` to the
    leaner `Article` shape (e.g. flattens MeSH qualifier objects to
    plain strings, lifts `keyword.text` to bare strings).

## Common pitfalls

1. **`.batches()` throws for queries above 10K.** Only `.fetchAll()`
   triggers date segmentation. If you need to stream a 50K-result
   set, either narrow with filters, run `.fetchAll()` and buffer,
   or call `.batches()` once per year inside your own loop.

2. **Date segmentation truncates years that themselves exceed 10K.**
   `fetchWithDateSegmentation` caps each year at
   `min(yearSearch.count, 10_000, totalRemaining)`. A single year
   with > 10K matches loses anything past the 10,000th — narrow with
   `meshTerm()` / `journal()` to be safe.

3. **History-Server tokens expire after ~1 hour.** Both `.fetchAll()`
   and `.batches()` complete the full pagination inside one call to
   stay under the TTL. Do not pickle the builder, sleep an hour,
   then iterate.

4. **`articleIds.pmid` may differ from `pmid` in edge cases.** The
   top-level `pmid` is the primary PubMed ID; `articleIds` carries
   the full ID bundle (`doi`, `pmc`, `pii`) and re-emits `pmid` for
   parity. Use `article.pmid` as the canonical identifier.

5. **Author filter is case-sensitive on initials.** PubMed treats
   `Doudna J` and `Doudna JA` as distinct queries. The builder
   appends `[au]` verbatim — pass the form NCBI expects.

6. **`buildQuery()` does NOT include `sort`, `limit`, or
   `usehistory`.** Those are esearch params, not part of the term.
   The string returned is what goes into `term=`; everything else is
   passed alongside.

7. **`PublicationType` union is closed but PubMed has more values.**
   The exported union is the curated common set. If you need
   `'Journal Article'` or another type, drop one level down to
   `@ncbijs/eutils` and call `esearch` directly.

## Testing

```bash
pnpm nx run @ncbijs/pubmed:test
pnpm nx run ncbijs-e2e:e2e -- pubmed
pnpm nx run @ncbijs/pubmed:typecheck
pnpm nx run @ncbijs/pubmed:lint
pnpm nx run @ncbijs/pubmed:build
```

Specs are co-located. The query-builder spec covers each filter and
the date-segmentation path; the `pubmed.spec.ts` mocks `EUtils` to
exercise `related`, `citedBy`, and `references`. E2E tests live in
`e2e/pubmed.spec.ts` and require `NCBI_API_KEY`.

## Files

```
packages/pubmed/src/
  index.ts                          # public re-exports
  pubmed.ts                         # PubMed class (search + elink methods)
  query-builder.ts                  # PubMedQueryBuilder (fluent chain + paging)
  convert-article.ts                # PubmedArticle → Article narrower
  pubmed.spec.ts
  query-builder.spec.ts
  convert-article.spec.ts
  interfaces/
    pubmed.interface.ts             # Article, RelatedArticle, PubMedSort, PublicationType
```
