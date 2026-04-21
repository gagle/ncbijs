# @ncbijs/icite

Typed client for the NIH iCite API. Retrieve citation metrics including Relative Citation Ratio (RCR), NIH percentile, and clinical citation data for PubMed articles.

## Installation

```bash
npm install @ncbijs/icite
```

## Usage

```ts
import { ICite } from '@ncbijs/icite';

const icite = new ICite();

const pubs = await icite.publications([33533846, 25613900]);
for (const pub of pubs) {
  console.log(`${pub.pmid}: RCR=${pub.relativeCitationRatio}, cited by ${pub.citedByCount}`);
}
```

## API

### `new ICite(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

iCite is a fully public API with no API key required. Rate limit: 2 requests/second.

### Publications

#### `publications(pmids: ReadonlyArray<number>): Promise<ReadonlyArray<ICitePublication>>`

Get citation metrics for up to 1000 PMIDs in a single request.

## Error handling

```ts
import { ICite, ICiteHttpError } from '@ncbijs/icite';

try {
  await icite.publications([0]);
} catch (err) {
  if (err instanceof ICiteHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter. iCite is rate-limited to 2 requests/second.

## Response types

### `ICitePublication`

```ts
interface ICitePublication {
  pmid: number;
  year: number;
  title: string;
  authors: string;
  journal: string;
  isResearchArticle: boolean;
  relativeCitationRatio: number | undefined;
  nihPercentile: number | undefined;
  citedByCount: number;
  referencesCount: number;
  expectedCitationsPerYear: number | undefined;
  fieldCitationRate: number | undefined;
  isClinicallyCited: boolean;
  citedByPmids: Array<number>;
  referencesPmids: Array<number>;
  doi: string;
}
```
