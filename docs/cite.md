# @ncbijs/cite — Citation Formatting Spec Reference

## Overview

Citation generation in 9 formats via NCBI's Literature Citation Exporter API. Zero dependencies.

**Base URL:** `https://api.ncbi.nlm.nih.gov/lit/ctxp/`
**Docs:** https://pmc.ncbi.nlm.nih.gov/api/ctxp/

## Rate Limit

3 requests/second, no concurrent requests.
**SEPARATE from E-utilities rate limit** — has its own quota.

## Endpoint

```
GET /v1/{source}/?format={fmt}&id={id}
```

## 3 Sources

- `pubmed` (default) — PubMed articles
- `pmc` — PubMed Central articles
- `books` — NCBI Books (⚠️ unverified in public docs, include cautiously)

## 9 Citation Formats

| Format code           | Style                         | Response Content-Type | Return type |
| --------------------- | ----------------------------- | --------------------- | ----------- |
| `ris`                 | RIS tagged format             | text/plain            | string      |
| `nbib`                | PubMed/MEDLINE tagged (.nbib) | text/plain            | string      |
| `medline`             | MEDLINE display format        | text/plain            | string      |
| `apa`                 | APA 7th edition               | text/plain            | string      |
| `mla`                 | MLA 9th edition               | text/plain            | string      |
| `chicago-author-date` | Chicago Author-Date           | text/plain            | string      |
| `vancouver`           | Vancouver/ICMJE               | text/plain            | string      |
| `bibtex`              | BibTeX entry                  | text/plain            | string      |
| `csl`                 | CSL-JSON                      | application/json      | CSLData     |

## Public API

```typescript
// Overloaded for type-safe format-dependent returns
cite(id: string, format: 'csl', source?: CitationSource): Promise<CSLData>;
cite(id: string, format: Exclude<CitationFormat, 'csl'>, source?: CitationSource): Promise<string>;

citeMany(ids: ReadonlyArray<string>, format: CitationFormat, source?: CitationSource):
  AsyncIterableIterator<Readonly<{ id: string; citation: string | CSLData }>>
```

## CSLData Type (CSL-JSON)

```
CSLData:
  type: string
  id: string
  title: string
  author: ReadonlyArray<{ family: string; given: string }>
  issued: { date-parts: ReadonlyArray<ReadonlyArray<number>> }
  'container-title': string
  volume?: string
  issue?: string
  page?: string
  DOI?: string
  PMID?: string
  PMCID?: string
  URL?: string
  abstract?: string
```

## citeMany() Implementation

Rate-limited serial iteration (3 req/s):

1. For each ID, call `cite(id, format, source)`
2. Wait to respect rate limit
3. Yield `{ id, citation }` after each
4. No concurrent requests

## Error Handling

- HTTP 400: Invalid ID or format
- HTTP 404: ID not found in source
- HTTP 500: Server error
