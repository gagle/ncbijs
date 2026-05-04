# @ncbijs/dbvar

> **Runtime**: Browser + Node.js

Typed client for NCBI Database of Structural Variation (dbVar). Search structural variants and fetch detailed reports with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/dbvar
```

## Usage

```ts
import { DbVar } from '@ncbijs/dbvar';

const dbvar = new DbVar({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await dbvar.search('BRCA1 deletion');
console.log(searchResult.total); // 15
console.log(searchResult.ids); // ['12345678', '87654321']

const records = await dbvar.fetch(searchResult.ids);
console.log(records[0].variantAccession); // 'nsv1234567'
console.log(records[0].studyAccession); // 'nstd186'
console.log(records[0].organism); // 'Homo sapiens'
console.log(records[0].placements[0].chromosome); // '17'
console.log(records[0].placements[0].assembly); // 'GRCh38'
console.log(records[0].genes[0].name); // 'BRCA1'
console.log(records[0].variantTypes); // ['deletion']
```

## API

### `new DbVar(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<DbVarSearchResult>`

Search dbVar by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<DbVarRecord>>`

Fetch structural variant details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<ReadonlyArray<DbVarRecord>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { DbVar, DbVarHttpError } from '@ncbijs/dbvar';

try {
  await dbvar.search('BRCA1 deletion');
} catch (err) {
  if (err instanceof DbVarHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `DbVarSearchResult`

```ts
interface DbVarSearchResult {
  total: number;
  ids: ReadonlyArray<string>;
}
```

### `DbVarRecord`

```ts
interface DbVarRecord {
  uid: string;
  objectType: string;
  studyAccession: string;
  variantAccession: string;
  studyType: string;
  variantCount: number;
  taxId: number;
  organism: string;
  placements: ReadonlyArray<DbVarPlacement>;
  genes: ReadonlyArray<DbVarGene>;
  methods: ReadonlyArray<string>;
  clinicalSignificances: ReadonlyArray<string>;
  variantTypes: ReadonlyArray<string>;
  variantCallCount: number;
}
```

### `DbVarPlacement`

```ts
interface DbVarPlacement {
  chromosome: string;
  start: number;
  end: number;
  assembly: string;
}
```

### `DbVarGene`

```ts
interface DbVarGene {
  id: number;
  name: string;
}
```
