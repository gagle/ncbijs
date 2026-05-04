# @ncbijs/gtr

> **Runtime**: Browser + Node.js

Typed client for NCBI GTR (Genetic Testing Registry). Search genetic tests and fetch detailed test reports including conditions, analytes, methods, and certifications with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/gtr
```

## Usage

```ts
import { Gtr } from '@ncbijs/gtr';

const gtr = new Gtr({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await gtr.search('BRCA1');
console.log(searchResult.total); // 150
console.log(searchResult.ids); // ['508942', '509012']

const tests = await gtr.fetch(searchResult.ids);
console.log(tests[0].testName); // 'BRCA1 gene full sequence analysis'
console.log(tests[0].accession); // 'GTR000508942.2'
console.log(tests[0].testType); // 'Clinical'
console.log(tests[0].conditions[0].name); // 'Hereditary breast and ovarian cancer syndrome'
console.log(tests[0].analytes[0].name); // 'BRCA1'
console.log(tests[0].offerer); // 'GeneDx'
console.log(tests[0].methods[0].name); // 'Sequence analysis'
```

## API

### `new Gtr(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<GtrSearchResult>`

Search GTR by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<GtrTest>>`

Fetch test details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<ReadonlyArray<GtrTest>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { Gtr, GtrHttpError } from '@ncbijs/gtr';

try {
  await gtr.search('BRCA1');
} catch (err) {
  if (err instanceof GtrHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `GtrSearchResult`

```ts
interface GtrSearchResult {
  total: number;
  ids: ReadonlyArray<string>;
}
```

### `GtrTest`

```ts
interface GtrTest {
  uid: string;
  accession: string;
  testName: string;
  testType: string;
  conditions: ReadonlyArray<GtrCondition>;
  analytes: ReadonlyArray<GtrAnalyte>;
  offerer: string;
  offererLocation: GtrLocation;
  methods: ReadonlyArray<GtrMethod>;
  certifications: ReadonlyArray<GtrCertification>;
  specimens: ReadonlyArray<string>;
  testPurposes: ReadonlyArray<string>;
  clinicalValidity: string;
  country: string;
}
```

### `GtrCondition`

```ts
interface GtrCondition {
  name: string;
  acronym: string;
  cui: string;
}
```

### `GtrAnalyte`

```ts
interface GtrAnalyte {
  analyteType: string;
  name: string;
  geneId: number;
  location: string;
}
```

### `GtrLocation`

```ts
interface GtrLocation {
  city: string;
  state: string;
  country: string;
}
```

### `GtrMethod`

```ts
interface GtrMethod {
  name: string;
  categories: ReadonlyArray<GtrMethodCategory>;
}
```

### `GtrMethodCategory`

```ts
interface GtrMethodCategory {
  name: string;
  methods: ReadonlyArray<string>;
}
```

### `GtrCertification`

```ts
interface GtrCertification {
  certificationType: string;
  id: string;
}
```
