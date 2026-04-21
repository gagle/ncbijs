# @ncbijs/sra

Typed client for NCBI Sequence Read Archive (SRA). Search sequencing experiments and fetch detailed metadata with automatic rate limiting, retry logic, and built-in XML parsing of embedded experiment descriptors.

## Installation

```bash
npm install @ncbijs/sra
```

## Usage

```ts
import { Sra } from '@ncbijs/sra';

const sra = new Sra({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await sra.search('RNA-seq Homo sapiens liver');
console.log(searchResult.total); // 128
console.log(searchResult.ids); // ['18012345', '18067890']

const experiments = await sra.fetch(searchResult.ids);
console.log(experiments[0].title); // 'RNA-seq of human liver tissue'
console.log(experiments[0].experimentAccession); // 'SRX1234567'
console.log(experiments[0].studyAccession); // 'SRP123456'
console.log(experiments[0].organism.scientificName); // 'Homo sapiens'
console.log(experiments[0].platform); // 'ILLUMINA'
console.log(experiments[0].libraryStrategy); // 'RNA-Seq'
console.log(experiments[0].runs[0].accession); // 'SRR1234567'
console.log(experiments[0].runs[0].totalBases); // 5432100000
```

## API

### `new Sra(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<SraSearchResult>`

Search SRA by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<SraExperiment>>`

Fetch experiment details by UIDs. The client automatically parses embedded experiment XML (`expxml`) and run XML (`runs`) from the E-utilities summary response into typed objects. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<ReadonlyArray<SraExperiment>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { Sra, SraHttpError } from '@ncbijs/sra';

try {
  await sra.search('RNA-seq Homo sapiens liver');
} catch (err) {
  if (err instanceof SraHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `SraSearchResult`

```ts
interface SraSearchResult {
  total: number;
  ids: ReadonlyArray<string>;
}
```

### `SraExperiment`

```ts
interface SraExperiment {
  uid: string;
  title: string;
  experimentAccession: string;
  studyAccession: string;
  sampleAccession: string;
  organism: SraOrganism;
  platform: string;
  instrumentModel: string;
  libraryStrategy: string;
  librarySource: string;
  librarySelection: string;
  libraryLayout: string;
  bioproject: string;
  biosample: string;
  runs: ReadonlyArray<SraRun>;
  createDate: string;
  updateDate: string;
}
```

### `SraOrganism`

```ts
interface SraOrganism {
  taxId: number;
  scientificName: string;
}
```

### `SraRun`

```ts
interface SraRun {
  accession: string;
  totalSpots: number;
  totalBases: number;
  isPublic: boolean;
}
```
