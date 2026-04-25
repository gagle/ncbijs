# @ncbijs/nlm-catalog

> **Runtime**: Browser + Node.js

Typed client for the NLM Catalog (journal and serial records). Search catalog entries and fetch detailed records with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/nlm-catalog
```

## Usage

```ts
import { NlmCatalog } from '@ncbijs/nlm-catalog';

const nlmCatalog = new NlmCatalog({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await nlmCatalog.search('Nature');
console.log(searchResult.total); // 83
console.log(searchResult.ids); // ['0410462', '101563288']

const records = await nlmCatalog.fetch(searchResult.ids);
console.log(records[0].title); // 'Nature'
console.log(records[0].medlineAbbreviation); // 'Nature'
console.log(records[0].isoAbbreviation); // 'Nature'
console.log(records[0].country); // 'England'
console.log(records[0].issns[0].issn); // '0028-0836'
console.log(records[0].issns[0].type); // 'Print'
```

## API

### `new NlmCatalog(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<NlmCatalogSearchResult>`

Search NLM Catalog by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: Array<string>): Promise<Array<NlmCatalogRecord>>`

Fetch catalog record details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<Array<NlmCatalogRecord>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { NlmCatalog, NlmCatalogHttpError } from '@ncbijs/nlm-catalog';

try {
  await nlmCatalog.search('Nature');
} catch (err) {
  if (err instanceof NlmCatalogHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `NlmCatalogSearchResult`

```ts
interface NlmCatalogSearchResult {
  total: number;
  ids: Array<string>;
}
```

### `NlmCatalogRecord`

```ts
interface NlmCatalogRecord {
  uid: string;
  nlmUniqueId: string;
  dateRevised: string;
  title: string;
  titleSort: string;
  alternateTitles: Array<string>;
  issns: Array<NlmCatalogIssn>;
  isbn: string;
  country: string;
  currentIndexingStatus: string;
  medlineAbbreviation: string;
  isoAbbreviation: string;
  startYear: string;
  endYear: string;
  journalId: string;
  language: string;
  continuationNotes: string;
  resourceType: string;
}
```

### `NlmCatalogIssn`

```ts
interface NlmCatalogIssn {
  issn: string;
  type: string;
}
```
