<h1 align="center">@ncbijs/eutils</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/eutils"><img src="https://img.shields.io/npm/v/@ncbijs/eutils" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/eutils"><img src="https://img.shields.io/npm/dm/@ncbijs/eutils" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/eutils" alt="license" /></a>
</p>

<p align="center">
  Spec-compliant TypeScript client for all 9 NCBI E-utilities. Zero dependencies, browser + Node.js compatible.
</p>

---

## Why

NCBI E-utilities power access to PubMed, PMC, and 30+ biomedical databases. But the raw HTTP API has sharp edges:

- **Rate limits** (3 req/s, or 10 with an API key) that silently block you if exceeded
- **XML responses** that vary structurally across 9 different endpoints
- **POST switching** required when ID lists or query terms exceed URL length limits
- **History Server pagination** for large result sets that requires coordinating WebEnv tokens

`@ncbijs/eutils` handles all of this behind a typed, promise-based API. You call methods, you get typed results.

## Install

```bash
npm install @ncbijs/eutils
```

## Quick start

```typescript
import { EUtils } from '@ncbijs/eutils';

const eutils = new EUtils({
  tool: 'my-research-app', // Required by NCBI usage policy
  email: 'you@university.edu', // Required by NCBI usage policy
  apiKey: 'your-ncbi-api-key', // Optional: raises rate limit from 3 to 10 req/s
});

// Search PubMed
const search = await eutils.esearch({
  db: 'pubmed',
  term: 'CRISPR gene therapy',
  retmax: 5,
});
console.log(`Found ${search.count} results`);
console.log('Top UIDs:', search.idList);

// Fetch full records
const xml = await eutils.efetch({
  db: 'pubmed',
  id: search.idList.join(','),
  rettype: 'abstract',
  retmode: 'xml',
});
```

## API

### Constructor

```typescript
new EUtils(config: EUtilsConfig)
```

| Parameter    | Type     | Required | Description                                                                                                                   |
| ------------ | -------- | -------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tool`       | `string` | Yes      | Application name ([NCBI usage policy](https://www.ncbi.nlm.nih.gov/books/NBK25497/#chapter2.Usage_Guidelines_and_Requiremen)) |
| `email`      | `string` | Yes      | Developer contact email                                                                                                       |
| `apiKey`     | `string` | No       | [NCBI API key](https://ncbiinsights.ncbi.nlm.nih.gov/2017/11/02/new-api-keys-for-the-e-utilities/) (10 req/s vs 3 req/s)      |
| `maxRetries` | `number` | No       | Retry count with exponential backoff (default: 3)                                                                             |

### Methods

All methods return a `Promise`. The rate limiter and retry logic apply automatically.

#### `esearch(params)` &rarr; `ESearchResult`

Search an Entrez database and return matching UIDs.

```typescript
const result = await eutils.esearch({
  db: 'pubmed',
  term: 'asthma treatment',
  usehistory: 'y',
  retmax: 100,
  sort: 'pub_date',
});
// result.count, result.idList, result.webEnv, result.queryKey
```

#### `efetch(params)` &rarr; `string`

Fetch records in the requested format. Returns the raw response string (XML, text, etc.).

```typescript
const xml = await eutils.efetch({
  db: 'pubmed',
  id: '38000001,38000002',
  rettype: 'abstract',
  retmode: 'xml',
});
```

#### `esummary(params)` &rarr; `ESummaryResult`

Retrieve document summaries (DocSums) for a list of UIDs.

```typescript
const result = await eutils.esummary({
  db: 'pubmed',
  id: '38000001',
  retmode: 'json',
});
// result.docSums[0].uid, result.docSums[0]['Title']
```

#### `epost(params)` &rarr; `EPostResult`

Post UIDs to the History Server for use in subsequent queries.

```typescript
const posted = await eutils.epost({
  db: 'pubmed',
  id: '38000001,38000002,38000003',
});
// posted.webEnv, posted.queryKey
```

#### `elink(params)` &rarr; `ELinkResult`

Discover links between Entrez databases. Supports all 9 `cmd` variants: `neighbor`, `neighbor_score`, `neighbor_history`, `acheck`, `ncheck`, `lcheck`, `llinks`, `llinkslib`, `prlinks`.

```typescript
const result = await eutils.elink({
  db: 'pubmed',
  dbfrom: 'pubmed',
  id: '38000001',
  cmd: 'neighbor',
});
// result.linkSets[0].linkSetDbs[0].links
```

#### `einfo(params?)` &rarr; `EInfoResult`

List all Entrez databases (no params) or get metadata for a specific database.

```typescript
// List all databases
const all = await eutils.einfo();
// all.dbList: ['pubmed', 'protein', ...]

// Database detail
const detail = await eutils.einfo({ db: 'pubmed' });
// detail.dbInfo.fieldList, detail.dbInfo.linkList
```

#### `espell(params)` &rarr; `ESpellResult`

Check spelling of a search term.

```typescript
const result = await eutils.espell({ db: 'pubmed', term: 'asthmaa' });
// result.correctedQuery === 'asthma'
```

#### `egquery(params)` &rarr; `EGQueryResult`

Query all Entrez databases at once and return per-database hit counts.

```typescript
const result = await eutils.egquery({ term: 'BRCA1' });
// result.eGQueryResultItems: [{ dbName: 'pubmed', count: 25000 }, ...]
```

#### `ecitmatch(params)` &rarr; `ECitMatchResult`

Match citation strings to PubMed IDs.

```typescript
const result = await eutils.ecitmatch({
  bdata: 'Ann Intern Med|1998|129|103|Feigelson HS|key1|',
});
// result.citations[0].pmid === '9652966'
```

#### `efetchBatches(params)` &rarr; `AsyncIterableIterator<string>`

Auto-paginate large result sets via the History Server.

```typescript
// Fetch 10,000 records in batches of 500
const search = await eutils.esearch({
  db: 'pubmed',
  term: 'COVID-19 vaccine',
  usehistory: 'y',
});

for await (const batch of eutils.efetchBatches({
  db: 'pubmed',
  WebEnv: search.webEnv,
  query_key: search.queryKey,
  rettype: 'abstract',
  retmode: 'xml',
  batchSize: 500,
})) {
  // Process each batch of XML records
  processBatch(batch);
}
```

#### `searchAndFetch(params)` &rarr; `AsyncIterableIterator<string>`

Convenience pipeline: ESearch with History Server &rarr; stream EFetch batches. Combines `esearch` + `efetchBatches` in a single call.

```typescript
for await (const batch of eutils.searchAndFetch({
  db: 'pubmed',
  term: 'CRISPR gene therapy',
  rettype: 'abstract',
  retmode: 'xml',
  batchSize: 500,
})) {
  processBatch(batch);
}
```

#### `searchAndSummarize(params)` &rarr; `AsyncIterableIterator<ESummaryResult>`

Convenience pipeline: ESearch with History Server &rarr; stream ESummary batches.

```typescript
for await (const batch of eutils.searchAndSummarize({
  db: 'pubmed',
  term: 'COVID-19 vaccine',
  retmode: 'json',
  batchSize: 100,
})) {
  for (const docSum of batch.docSums) {
    console.log(docSum.uid, docSum['Title']);
  }
}
```

## Error handling

```typescript
import { EUtils, EUtilsHttpError } from '@ncbijs/eutils';

try {
  await eutils.esearch({ db: 'pubmed', term: 'test' });
} catch (err) {
  if (err instanceof EUtilsHttpError) {
    console.error(`HTTP ${err.statusCode}: ${err.responseBody}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors (DNS failures, connection resets) with exponential backoff + jitter.

## Rate limiting

Rate limiting is automatic. The built-in token bucket enforces:

- **3 requests/second** without an API key
- **10 requests/second** with an API key

Concurrent calls from the same `EUtils` instance are queued in FIFO order. No manual throttling needed.

## Known limitations

### PMC ESearch/EPost 10K record cap (February 2026)

As of early February 2026, NCBI restricts ESearch and EPost for the PMC database (`db=pmc`):

- **ESearch**: `retmax` must be &le; 10,000, and `retstart + retmax` must be &le; 10,000
- **EPost**: accepts a maximum of 10,000 PMCIDs per request

This only affects PMC (`db=pmc`). PubMed and all other databases are unaffected.

For queries that return more than 10,000 PMC results, break your search into smaller batches or use more specific search terms. See [NCBI's announcement](https://ncbiinsights.ncbi.nlm.nih.gov/2026/01/06/updated-pmc-e-utilities/) for details.

## Spec compliance

Every method maps directly to an [NCBI E-utility endpoint](https://www.ncbi.nlm.nih.gov/books/NBK25499/):

| Method      | Endpoint        | Spec                                                                         |
| ----------- | --------------- | ---------------------------------------------------------------------------- |
| `esearch`   | `esearch.fcgi`  | [ESearch](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESearch)     |
| `efetch`    | `efetch.fcgi`   | [EFetch](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EFetch)       |
| `esummary`  | `esummary.fcgi` | [ESummary](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESummary)   |
| `epost`     | `epost.fcgi`    | [EPost](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EPost)         |
| `elink`     | `elink.fcgi`    | [ELink](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ELink)         |
| `einfo`     | `einfo.fcgi`    | [EInfo](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EInfo)         |
| `espell`    | `espell.fcgi`   | [ESpell](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ESpell)       |
| `egquery`   | `egquery.fcgi`  | [EGQuery](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.EGQuery)     |
| `ecitmatch` | `ecitmatch.cgi` | [ECitMatch](https://www.ncbi.nlm.nih.gov/books/NBK25499/#chapter4.ECitMatch) |
