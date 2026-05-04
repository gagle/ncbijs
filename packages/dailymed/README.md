# @ncbijs/dailymed

> **Runtime**: Browser + Node.js

Typed client for the DailyMed REST API v2. Search drug names, look up Structured Product Labels (SPLs), query NDC codes, and list Established Pharmacologic Classes (EPCs) with automatic rate limiting and retry logic.

## Installation

```bash
pnpm install @ncbijs/dailymed
```

## Usage

```ts
import { DailyMed } from '@ncbijs/dailymed';

const dailymed = new DailyMed();

const names = await dailymed.drugNames('aspirin');
for (const entry of names.data) {
  console.log(`${entry.drugName} (${entry.nameType})`);
}

const spls = await dailymed.spls('metformin');
for (const spl of spls.data) {
  console.log(`${spl.setId}: ${spl.title}`);
}

const ndcs = await dailymed.ndcs('ibuprofen', { pageSize: 5 });
for (const ndc of ndcs.data) {
  console.log(ndc.ndc);
}

const classes = await dailymed.drugClasses({ pageSize: 10 });
for (const drugClass of classes.data) {
  console.log(`${drugClass.code}: ${drugClass.name}`);
}
```

## API

### `new DailyMed(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

DailyMed is a fully public API with no API key required. Rate limit: 5 requests/second.

### `drugNames(drugName: string, options?: DailyMedPageOptions): Promise<DailyMedPage<DailyMedDrugName>>`

Search drug names by keyword. Returns matching drug name entries with name type.

### `spls(drugName: string, options?: DailyMedPageOptions): Promise<DailyMedPage<DailyMedSpl>>`

Search Structured Product Labels (SPLs) by drug name. Returns set IDs, titles, published dates, and SPL versions.

### `ndcs(drugName: string, options?: DailyMedPageOptions): Promise<DailyMedPage<DailyMedNdc>>`

Search NDC (National Drug Code) codes by drug name.

### `drugClasses(options?: DailyMedPageOptions): Promise<DailyMedPage<DailyMedDrugClass>>`

List all Established Pharmacologic Classes (EPCs) with codes and coding systems.

### Pagination

All methods accept `DailyMedPageOptions`:

| Option     | Type     | Description             |
| ---------- | -------- | ----------------------- |
| `page`     | `number` | Page number (1-indexed) |
| `pageSize` | `number` | Results per page        |

All methods return `DailyMedPage<T>` with:

| Field        | Type                 | Description              |
| ------------ | -------------------- | ------------------------ |
| `data`       | `ReadonlyArray<T>`   | Results for this page    |
| `pagination` | `DailyMedPagination` | Total elements and pages |

## Error handling

```ts
import { DailyMed, DailyMedHttpError } from '@ncbijs/dailymed';

try {
  await dailymed.drugNames('nonexistent-drug-xyz');
} catch (err) {
  if (err instanceof DailyMedHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter. DailyMed is rate-limited to 5 requests/second.

## Response types

### `DailyMedDrugName`

```ts
interface DailyMedDrugName {
  drugName: string;
  nameType: string;
}
```

### `DailyMedSpl`

```ts
interface DailyMedSpl {
  setId: string;
  title: string;
  publishedDate: string;
  splVersion: number;
}
```

### `DailyMedNdc`

```ts
interface DailyMedNdc {
  ndc: string;
}
```

### `DailyMedDrugClass`

```ts
interface DailyMedDrugClass {
  code: string;
  codingSystem: string;
  classType: string;
  name: string;
}
```

### `DailyMedPagination`

```ts
interface DailyMedPagination {
  totalElements: number;
  totalPages: number;
  currentPage: number;
  elementsPerPage: number;
}
```
