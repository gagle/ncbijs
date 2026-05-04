# @ncbijs/cdd

> **Runtime**: Browser + Node.js

Typed client for NCBI Conserved Domain Database (CDD). Search conserved domains and fetch detailed records with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/cdd
```

## Usage

```ts
import { Cdd } from '@ncbijs/cdd';

const cdd = new Cdd({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await cdd.search('zinc finger');
console.log(searchResult.total); // 42
console.log(searchResult.ids); // ['12345', '67890']

const records = await cdd.fetch(searchResult.ids);
console.log(records[0].title); // 'zf-C2H2'
console.log(records[0].accession); // 'cd00024'
console.log(records[0].abstract); // 'Zinc finger, C2H2 type...'
console.log(records[0].database); // 'CDD'
console.log(records[0].pssmLength); // 23
```

## API

### `new Cdd(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<CddSearchResult>`

Search CDD by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: Array<string>): Promise<Array<CddRecord>>`

Fetch domain details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<Array<CddRecord>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Bulk parser

### `parseCddDomains(tsv: string): ReadonlyArray<ConservedDomain>`

Parses CDD tab-separated domain list files from the NCBI FTP site (`/pub/mmdb/cdd/`, e.g. `cddid.tbl`). Each row yields a `ConservedDomain` with accession, short name, description, PSSM length, and source database.

```ts
import { parseCddDomains } from '@ncbijs/cdd';
const domains = parseCddDomains(fs.readFileSync('cddid.tbl', 'utf-8'));
console.log(domains[0].accession); // 'cd00001'
console.log(domains[0].shortName); // 'CBS'
console.log(domains[0].database); // 'CDD'
```

## Error handling

```ts
import { Cdd, CddHttpError } from '@ncbijs/cdd';

try {
  await cdd.search('zinc finger');
} catch (err) {
  if (err instanceof CddHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `ConservedDomain`

```ts
interface ConservedDomain {
  accession: string;
  shortName: string;
  description: string;
  pssmLength: number;
  database: string;
}
```

### `CddSearchResult`

```ts
interface CddSearchResult {
  total: number;
  ids: Array<string>;
}
```

### `CddRecord`

```ts
interface CddRecord {
  uid: string;
  accession: string;
  title: string;
  subtitle: string;
  abstract: string;
  database: string;
  organism: string;
  publicationDate: string;
  entrezDate: string;
  pssmLength: number;
  structureRepresentative: string;
  numberOfSites: number;
  siteDescriptions: Array<string>;
  status: string;
  livePssmId: string;
}
```
