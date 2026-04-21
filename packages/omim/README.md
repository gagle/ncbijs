# @ncbijs/omim

Typed client for NCBI OMIM (Online Mendelian Inheritance in Man). Search genetic disorders and genes, and fetch detailed entry reports with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/omim
```

## Usage

```ts
import { Omim } from '@ncbijs/omim';

const omim = new Omim({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await omim.search('Marfan syndrome');
console.log(searchResult.total); // 12
console.log(searchResult.ids); // ['154700', '134797']

const entries = await omim.fetch(searchResult.ids);
console.log(entries[0].title); // 'MARFAN SYNDROME; MFS'
console.log(entries[0].mimNumber); // '154700'
console.log(entries[0].prefix); // '#'
console.log(entries[0].geneMapLocus); // '15q21.1'
```

## API

### `new Omim(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<OmimSearchResult>`

Search OMIM by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<OmimEntry>>`

Fetch OMIM entry details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<ReadonlyArray<OmimEntry>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { Omim, OmimHttpError } from '@ncbijs/omim';

try {
  await omim.search('Marfan syndrome');
} catch (err) {
  if (err instanceof OmimHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `OmimSearchResult`

```ts
interface OmimSearchResult {
  total: number;
  ids: ReadonlyArray<string>;
}
```

### `OmimEntry`

```ts
interface OmimEntry {
  uid: string;
  mimNumber: string;
  prefix: string;
  title: string;
  alternativeTitles: string;
  geneMapLocus: string;
}
```
