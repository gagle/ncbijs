# @ncbijs/geo

> **Runtime**: Browser + Node.js

Typed client for NCBI Gene Expression Omnibus (GEO) datasets. Search GEO records and fetch detailed dataset summaries with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/geo
```

## Usage

```ts
import { Geo } from '@ncbijs/geo';

const geo = new Geo({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await geo.search('RNA-seq human liver');
console.log(searchResult.total); // 42
console.log(searchResult.ids); // ['200198674', '200198321']

const records = await geo.fetch(searchResult.ids);
console.log(records[0].title); // 'RNA-seq of human liver tissue'
console.log(records[0].accession); // 'GDS6063'
console.log(records[0].taxon); // 'Homo sapiens'
console.log(records[0].datasetType); // 'Expression profiling by high throughput sequencing'
console.log(records[0].samples[0].accession); // 'GSM7654321'
console.log(records[0].sampleCount); // 12
console.log(records[0].bioproject); // 'PRJNA123456'
```

## API

### `new Geo(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<GeoSearchResult>`

Search GEO by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<GeoRecord>>`

Fetch dataset details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<ReadonlyArray<GeoRecord>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { Geo, GeoHttpError } from '@ncbijs/geo';

try {
  await geo.search('RNA-seq human liver');
} catch (err) {
  if (err instanceof GeoHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `GeoSearchResult`

```ts
interface GeoSearchResult {
  total: number;
  ids: ReadonlyArray<string>;
}
```

### `GeoRecord`

```ts
interface GeoRecord {
  uid: string;
  accession: string;
  title: string;
  summary: string;
  taxon: string;
  entryType: string;
  datasetType: string;
  platformTechnologyType: string;
  publicationDate: string;
  supplementaryFiles: string;
  samples: ReadonlyArray<GeoSample>;
  sampleCount: number;
  pubmedIds: ReadonlyArray<string>;
  ftpLink: string;
  bioproject: string;
  platformId: string;
  seriesId: string;
}
```

### `GeoSample`

```ts
interface GeoSample {
  accession: string;
  title: string;
}
```
