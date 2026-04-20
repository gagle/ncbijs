# @ncbijs/cite — Citation Formatting Guide

## Overview

Citation generation via NCBI's Literature Citation Exporter API. Zero dependencies.

**Base URL:** `https://api.ncbi.nlm.nih.gov/lit/ctxp/`
**Docs:** https://pmc.ncbi.nlm.nih.gov/api/ctxp/

## Rate Limit

3 requests/second, no concurrent requests.
**SEPARATE from E-utilities rate limit** — has its own quota.

## Endpoint

```
GET /v1/{source}/?format={fmt}&id={id}
```

## 2 Sources

- `pubmed` (default) — PubMed articles
- `pmc` — PubMed Central articles (requires numeric PMC ID, e.g., `7886120` not `PMC7886120`)

## 4 Citation Formats

| Format code | Style                                       | Response Content-Type | Return type  |
| ----------- | ------------------------------------------- | --------------------- | ------------ |
| `ris`       | RIS tagged format                           | text/plain            | string       |
| `medline`   | MEDLINE display format                      | text/plain            | string       |
| `csl`       | CSL-JSON                                    | application/json      | CSLData      |
| `citation`  | Pre-rendered citations (AMA, APA, MLA, NLM) | application/json      | CitationData |

The `citation` format returns a JSON object with pre-rendered citation strings in four styles:

```typescript
interface CitationData {
  id: string;
  ama: { orig: string; format: string };
  apa: { orig: string; format: string };
  mla: { orig: string; format: string };
  nlm: { orig: string; format: string };
}
```

## Public API

```typescript
cite(id: string, format: 'csl', source?: CitationSource): Promise<CSLData>;
cite(id: string, format: 'citation', source?: CitationSource): Promise<CitationData>;
cite(id: string, format: 'ris' | 'medline', source?: CitationSource): Promise<string>;

citeMany(ids: ReadonlyArray<string>, format: CitationFormat, source?: CitationSource):
  AsyncIterableIterator<Readonly<{ id: string; citation: string | CSLData | CitationData }>>
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

## citeMany() Behavior

Rate-limited serial iteration (3 req/s):

1. For each ID, call `cite(id, format, source)`
2. Wait to respect rate limit
3. Yield `{ id, citation }` after each
4. No concurrent requests

## Error Handling

- HTTP 400: Invalid ID or format
- HTTP 404: ID not found in source
- HTTP 500: Server error
