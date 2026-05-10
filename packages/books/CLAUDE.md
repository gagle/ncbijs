---
package: '@ncbijs/books'
purpose: 'Typed client for NCBI Bookshelf — search and fetch biomedical book and chapter records (textbooks, NIH reports, drug monographs, GeneReviews chapters) via the E-utilities `books` database.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/eutils'
  - '@ncbijs/rate-limiter'
used_by: []
exports:
  - 'Books'
  - 'BooksHttpError'
  - 'BooksConfig'
  - 'BooksRecord'
  - 'BooksSearchResult'
related_docs:
  - 'docs/ncbi-api-catalog.md'
last_audited: '2026-02-20'
---

# @ncbijs/books

## Purpose

Domain wrapper over the NCBI Entrez `books` database — Bookshelf is
NCBI's free, full-text archive of biomedical books, textbooks, NIH
reports, government documents, drug monographs, and clinically curated
chapter sets like GeneReviews. Each record is identified by a numeric
UID, a Bookshelf accession (`NBK21054`, `NBK1116`, `NBK548968`), and a
resource type (`Book`, `Chapter`, `Section`). Chapter records carry
back-pointers to their parent book via `bookAccessionId` and
`bookName`.

The package exists as a separate domain client (rather than asking
users to call `eutils.esearch({ db: 'books' })` directly) because:

- The `esummary` response interleaves book-level fields (`bookid`,
  `bookaccessionid`, `book`) with chapter-level fields (`chapterid`,
  `chapteraccessionid`, `parents`, `navigation`) and the mapper
  surfaces both flat on `BooksRecord`.
- Several fields (`bookid`, `chapterid`) come back as raw `number`
  from NCBI; everything else is `string`. The mapper preserves both
  shapes intentionally.

## When to use

- Search Bookshelf by topic, author, or chapter title
  (`'molecular biology'`, `'GeneReviews'`).
- Fetch chapter metadata for a known list of `NBK*` accessions.
- Resolve a chapter UID to its parent book (`bookAccessionId`,
  `bookName`).
- Build chapter-level navigation breadcrumbs from the `parents` and
  `navigation` fields.

## When NOT to use

| If you want to                                       | Use instead                                                                  |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Fetch the full XML or HTML body of a chapter         | Out of scope — Bookshelf full text is served from `ncbi.nlm.nih.gov/books/` and is not exposed by E-utilities `efetch` for `books` |
| Search PubMed-indexed journal articles               | `@ncbijs/pubmed` (article-level metadata + abstract XML)                     |
| Fetch PMC open-access full text                      | `@ncbijs/pmc` (JATS XML)                                                     |
| Look up a journal record by ISSN                     | `@ncbijs/nlm-catalog`                                                        |
| Resolve the OMIM Mendelian-disorder catalog          | `@ncbijs/omim`                                                               |
| Find clinical-variant interpretations                | `@ncbijs/clinvar`                                                            |
| Find literature for a Bookshelf chapter              | `@ncbijs/eutils` (`elink` from `books` → `pubmed`) or `@ncbijs/pubmed`       |

## Exports

| Export              | Kind      | Purpose                                                    |
| ------------------- | --------- | ---------------------------------------------------------- |
| `Books`             | class     | Main HTTP client (`search`, `fetch`, `searchAndFetch`)     |
| `BooksHttpError`    | class     | HTTP-level failure (extends `HttpRetryError`)              |
| `BooksConfig`       | interface | `{ apiKey?, tool?, email?, maxRetries? }`                  |
| `BooksRecord`       | interface | Flat record — book fields + chapter fields + navigation    |
| `BooksSearchResult` | interface | `{ total, ids }`                                           |

## API surface

### `new Books(config?)`

```ts
new Books({
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

Per-instance bucket. Use one `Books` per process.

### `search(term, options?): Promise<BooksSearchResult>`

GETs `esearch.fcgi?db=books&term=...&retmode=json`. Returns total
match count and the list of UIDs.

```ts
const r = await books.search('molecular biology');
r.total; // 256
r.ids;   // ['1', '2', ...]

const limited = await books.search('GeneReviews', { retmax: 5 });
```

`retmax` is the only documented option; it caps the returned ID list
(NCBI default ≈ 20).

### `fetch(ids): Promise<ReadonlyArray<BooksRecord>>`

GETs `esummary.fcgi?db=books&id=...&retmode=json`. Returns one
`BooksRecord` per UID:

```ts
{
  uid: string;                  // numeric Books UID
  title: string;                // record-level title (book or chapter)
  publicationDate: string;      // raw 'pubdate'
  entryId: string;              // raw 'id' field
  accessionId: string;          // 'NBK21054', 'NBK1116', ...
  parents: string;              // breadcrumb path for chapters (raw string)
  resourceType: string;         // 'Book' | 'Chapter' | 'Section' | ...
  resourceId: string;           // raw 'rid'
  text: string;                 // raw 'text' field
  bookId: number;               // numeric ID of the parent book
  bookAccessionId: string;      // parent book's NBK accession
  chapterId: number;            // numeric chapter ID (0 for book records)
  chapterAccessionId: string;   // chapter NBK accession
  bookName: string;             // human-readable book title
  navigation: string;           // raw chapter navigation hint
}
```

Empty input → empty output (no HTTP call). Entries returned with an
`error` field are silently skipped — the result array length may be
smaller than `ids.length`.

### `searchAndFetch(term, options?): Promise<ReadonlyArray<BooksRecord>>`

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
- **Per-instance bucket.** Don't run two `Books` instances against the
  same key in one process — the buckets don't coordinate.

## Cross-package wiring

- **Imports.** `import { Books } from '@ncbijs/books'`.
- **Composes with `@ncbijs/eutils`** via the `/config` subpath only —
  imports `EUTILS_BASE_URL`, the rate constants, the
  `EUtilsCredentials` type, and `appendEUtilsCredentials`. Does **not**
  instantiate the full `EUtils` class (avoids pulling in the full
  client surface for a JSON-only consumer).
- **Composes with `@ncbijs/rate-limiter`** via `TokenBucket`,
  `fetchWithRetry`, `HttpRetryError`. `BooksHttpError` extends
  `HttpRetryError`.
- **No internal consumers.** `@ncbijs/http-mcp` does not currently
  expose Books tools; `@ncbijs/etl` does not register a Books dataset.
  If/when MCP tools are added, follow the pattern in
  `clinvar-tools.ts` (search + fetch as separate MCP tools).
- **Example** — `examples/books-search.ts`.

## Common pitfalls

1. **`accessionId` is the human-facing identifier, not `uid`.** The
   `NBK*` accession is what Bookshelf URLs and citations use
   (`https://www.ncbi.nlm.nih.gov/books/NBK21054/`). The numeric
   `uid` is internal. Always index, link, and display by
   `accessionId`. The mapper deliberately surfaces both.

2. **`bookId` and `chapterId` are `number`; everything else is
   `string`.** NCBI returns mixed types in the same JSON record.
   The mapper preserves the raw shape: numeric fields default to
   `0` when absent, string fields default to `''`. A `chapterId`
   of `0` typically means "this record is a Book, not a Chapter"
   — cross-check against `resourceType`.

3. **Book vs Chapter records share the same shape.** Both come back
   as `BooksRecord`. For a Book record, `chapterId === 0`,
   `chapterAccessionId === ''`, and `parents === ''`. For a
   Chapter record, `bookAccessionId` and `bookName` point at the
   parent. Don't assume one shape per result set — a single
   search can return both kinds.

4. **No full-text access.** This client only exposes `esearch` +
   `esummary`. Bookshelf does not serve full chapter content via
   `efetch` for the `books` database. The full HTML/XML is
   available only at `ncbi.nlm.nih.gov/books/<NBK*>/` and is not
   covered by this package or by E-utilities. For literature full
   text, use `@ncbijs/pmc` (PMC OA Service / JATS).

5. **`parents` and `navigation` are raw strings.** NCBI returns
   chapter breadcrumb paths and navigation hints as opaque
   strings (sometimes pipe-delimited, sometimes nested HTML
   fragments). The package surfaces them as-is — parse defensively
   if you need a structured breadcrumb.

6. **Entries with errors are silently dropped.** If `esummary`
   returns `{ "<uid>": { error: "..." } }` for an ID, the mapping
   skips it. The returned array may be shorter than the input
   `ids` — never assume positional alignment with the request.

7. **`@ncbijs/eutils/config` subpath import.** The client deliberately
   imports from the `/config` subpath, not the package root, to
   avoid pulling in the full `EUtils` class. Don't refactor to
   `from '@ncbijs/eutils'` — it would bloat the bundle and break the
   convention shared by `@ncbijs/omim`, `@ncbijs/medgen`, `@ncbijs/cdd`,
   `@ncbijs/nlm-catalog`.

8. **`searchAndFetch` short-circuits on empty search.** Zero IDs →
   no `esummary` call → empty array. You cannot observe a "search
   succeeded but fetch failed" state through this method.

## Testing

```bash
pnpm nx run @ncbijs/books:test          # unit (mocked fetch)
pnpm nx run ncbijs-e2e:e2e -- books     # E2E (live NCBI, needs NCBI_API_KEY)
pnpm nx run @ncbijs/books:typecheck
pnpm nx run @ncbijs/books:lint
pnpm nx run @ncbijs/books:build
```

Unit tests stub `fetch` and cover: search → fetch happy path, empty
search, entries with `error` field, `searchAndFetch` short-circuit,
and the mixed `string | number` field handling (`bookid`,
`chapterid` defaults).

## Files

```
packages/books/src/
  index.ts                       # public re-exports
  books.ts                       # Books class + esearch/esummary + record mapper
  books.spec.ts
  books-client.ts                # fetchJson + BooksHttpError + BooksClientConfig
  books-client.spec.ts
  interfaces/
    books.interface.ts           # BooksConfig, BooksRecord, BooksSearchResult
```
