# @ncbijs/eutils — E-utilities Spec Reference

## Overview

HTTP client for all 9 NCBI E-utilities. Zero dependencies. Uses native `fetch`.

**Base URL:** `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/`

## Global Configuration

```typescript
EUtils({
  apiKey?: string,      // NCBI API key (10 req/s vs 3 req/s)
  tool: string,         // App name (REQUIRED by NCBI policy)
  email: string,        // Developer email (REQUIRED by NCBI policy)
  maxRetries?: number,  // Retry count with exponential backoff (default: 3)
})
```

## Rate Limiting

- Without API key: 3 requests/second per IP
- With API key: 10 requests/second per IP
- Exceeding returns HTTP 429: `{"error":"API rate limit exceeded","count":"11"}`
- Implementation: token bucket algorithm, global across all method calls
- SEPARATE rate limits for Citation Exporter (3 req/s) — not shared

## 9 E-utility Endpoints

### 1. ESearch (`esearch.fcgi`)

Search and retrieve UIDs matching a text query.

**Parameters:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| db | string | yes | Entrez database name |
| term | string | yes | Search query (Entrez syntax) |
| usehistory | 'y' | no | Store results on History Server |
| WebEnv | string | no | Existing WebEnv for appending |
| query_key | number | no | Existing query key for combining |
| retstart | number | no | Index of first UID to return (default: 0) |
| retmax | number | no | Max UIDs to return (default: 20, max: 10000) |
| rettype | 'uilist' \| 'count' | no | Return type |
| retmode | 'xml' \| 'json' | no | Return format |
| sort | string | no | PubMed: relevance, pub_date, Author, JournalName |
| field | string | no | Restrict search to specific field |
| datetype | 'mdat' \| 'pdat' \| 'edat' | no | Date type for range |
| reldate | number | no | Relative date (days back from today) |
| mindate | string | no | Start date (YYYY/MM/DD) |
| maxdate | string | no | End date (YYYY/MM/DD) |
| idtype | 'acc' | no | Return accession.version instead of GI |

**Response (XML):**

```xml
<eSearchResult>
  <Count>N</Count>
  <RetMax>N</RetMax>
  <RetStart>N</RetStart>
  <IdList><Id>PMID</Id>...</IdList>
  <TranslationSet>...</TranslationSet>
  <QueryTranslation>expanded query</QueryTranslation>
  <WebEnv>WEBENV_STRING</WebEnv>
  <QueryKey>N</QueryKey>
</eSearchResult>
```

**PubMed/PMC constraint:** `retstart + retmax <= 10,000` (Feb 2026 change). Other DBs allow higher.

### 2. EFetch (`efetch.fcgi`)

Retrieve full records in specified format.

**Parameters:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| db | string | yes | |
| id | string | yes* | Comma-separated UIDs |
| WebEnv | string | yes* | Alternative to id |
| query_key | number | yes\* | Used with WebEnv |
| rettype | string | no | DB-specific (PubMed: xml, medline, abstract, uilist) |
| retmode | string | no | xml, text (NO JSON for EFetch) |
| retstart | number | no | For pagination |
| retmax | number | no | Default varies by DB |
| idtype | 'acc' | no | |

**PubMed rettype/retmode combinations:**

- `rettype=xml` → PubMed XML (PubmedArticleSet)
- `rettype=medline` → MEDLINE tagged format
- `rettype=abstract&retmode=text` → Plain text abstracts
- `rettype=uilist` → UID list only

**HTTP POST required when:** >200 UIDs or long term strings. `id`/`term` go in POST body.

### 3. ESummary (`esummary.fcgi`)

Retrieve document summaries.

**Parameters:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| db | string | yes | |
| id | string | yes* | |
| WebEnv | string | yes* | |
| query_key | number | yes\* | |
| retstart | number | no | |
| retmax | number | no | |
| retmode | 'xml' \| 'json' | no | JSON natively supported |
| version | '2.0' | no | Richer DocSums with IsTruncatable, IsRangeable |

### 4. EPost (`epost.fcgi`)

Upload UIDs to History Server.

**Parameters:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| db | string | yes | |
| id | string | yes | UID list |
| WebEnv | string | no | Append to existing set |

**Response:** `{ webEnv: string, queryKey: number }`

**Limits:** PubMed/PMC max 10,000 UIDs per request. HTTP POST for >200 UIDs.
**Note:** Does NOT accept PMCIDs directly — use native PMC UIDs only.

### 5. ELink (`elink.fcgi`)

Discover related records across or within databases.

**Parameters:**
| Param | Type | Required | Notes |
|-------|------|----------|-------|
| db | string | yes | Target database |
| dbfrom | string | yes | Source database |
| id | string | yes* | Source UIDs |
| WebEnv | string | yes* | |
| query_key | number | yes\* | |
| cmd | ELinkCmd | no | Default: 'neighbor' |
| linkname | string | no | Specific link type (format: `dbfrom_db_subset`) |
| retmode | 'xml' \| 'json' | no | |
| idtype | 'acc' | no | |
| term | string | no | Filter linked results by query |
| holding | string | no | Library holdings filter |
| datetype | string | no | PubMed only |
| reldate | number | no | PubMed only |
| mindate | string | no | PubMed only |
| maxdate | string | no | PubMed only |

**9 cmd variants:**

1. `neighbor` — Related UIDs (default)
2. `neighbor_score` — Related UIDs + relevancy scores
3. `neighbor_history` — Posts results to History Server
4. `acheck` — Checks existence of all links
5. `ncheck` — Checks existence of neighbor links
6. `lcheck` — Checks existence of LinkOut links
7. `llinks` — LinkOut URLs + attributes (all providers)
8. `llinkslib` — LinkOut URLs + attributes (libraries only)
9. `prlinks` — Primary LinkOut provider URL

### 6. EInfo (`einfo.fcgi`)

Database statistics and field information.

**Without db param:** Returns list of all valid Entrez database names.
**With db param:** Returns field list, link list, db statistics.
**Supports:** `version=2.0` for extended fields, `retmode=json`.

### 7. ESpell (`espell.fcgi`)

Spelling suggestions for search terms.

**Parameters:** `db` (defaults to pubmed), `term` (required).
**Response XML:** `<CorrectedQuery>` and `<SpelledQuery>` with `<Replaced>` tags.

### 8. EGQuery (`egquery.fcgi`)

Count of records across ALL Entrez databases for a query.

**Parameters:** `term` (required).
**Response:** List of database names with record counts.

### 9. ECitMatch (`ecitmatch.cgi`)

Batch citation matching to PMIDs.

**Input format:** `journal|year|volume|first_page|author_name|your_key|` separated by `\r`.
**Parameters:** `bdata` (citation data), `db` (default: pubmed).
**Response:** Pipe-delimited rows with matched PMIDs.

## History Server

Used for large result sets. Flow:

1. `ESearch` with `usehistory=y` → returns `webEnv` + `queryKey`
2. Pass `webEnv` + `queryKey` to `EFetch`/`ESummary`/`ELink` instead of UID lists
3. Multiple queries can share one WebEnv (pass existing WebEnv to subsequent calls)
4. Query keys combined in ESearch term with `%23` prefix: `%231+AND+%232`

## Auto-Pagination (`efetchBatches`)

```
AsyncIterableIterator that:
1. Calls ESearch with usehistory=y
2. Iterates with retstart += retmax
3. Yields raw response pages
4. Handles the 10K PubMed cap (date segmentation for larger sets)
```

## URL Encoding Rules

- Spaces → `+`
- `#` → `%23`
- `"` → `%22`
- All params lowercase except `&WebEnv`

## Error Handling

- HTTP 429: Rate limit exceeded (JSON error body)
- HTTP 400: Bad request (undocumented XML format)
- HTTP 500: Server error (undocumented)
- Retry with exponential backoff on 5xx and 429
- HTTPS mandatory (HTTP deprecated)
