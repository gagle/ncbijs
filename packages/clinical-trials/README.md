# @ncbijs/clinical-trials

Typed client for the ClinicalTrials.gov v2 API. Search clinical trials, retrieve study details, and query database statistics with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/clinical-trials
```

## Usage

```ts
import { ClinicalTrials } from '@ncbijs/clinical-trials';

const ct = new ClinicalTrials();

const study = await ct.study('NCT04280705');
console.log(study.briefTitle);
console.log(study.overallStatus);

for await (const trial of ct.searchStudies('COVID-19 vaccine', {
  filter: { phase: ['PHASE3'], overallStatus: ['COMPLETED'] },
  pageSize: 10,
})) {
  console.log(`${trial.nctId}: ${trial.briefTitle}`);
}

const stats = await ct.studyStats();
console.log(`Total studies: ${stats.totalStudies}`);

const phases = await ct.studyFieldValues('phase');
for (const entry of phases) {
  console.log(`${entry.value}: ${entry.count}`);
}
```

## API

### `new ClinicalTrials(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

ClinicalTrials.gov is a fully public API with no API key required. Rate limit: 2 requests/second.

### Study

#### `study(nctId: string): Promise<StudyReport>`

Fetch a single study by NCT ID.

#### `searchStudies(query: string, options?): AsyncIterableIterator<StudyReport>`

Search studies with cursor-based pagination. Automatically paginates through all results.

**`StudySearchOptions`**

| Option     | Type                    | Description                   |
| ---------- | ----------------------- | ----------------------------- |
| `filter`   | `StudySearchFilter`     | Filter by status, phase, etc. |
| `pageSize` | `number`                | Results per page              |
| `sort`     | `string`                | Sort expression               |
| `fields`   | `ReadonlyArray<string>` | Fields to include in response |

**`StudySearchFilter`**

| Field           | Type            |
| --------------- | --------------- |
| `overallStatus` | `Array<string>` |
| `condition`     | `Array<string>` |
| `intervention`  | `Array<string>` |
| `sponsor`       | `Array<string>` |
| `phase`         | `Array<string>` |
| `studyType`     | `Array<string>` |

### Statistics

#### `studyStats(): Promise<StudyStats>`

Get total study count and other database-level statistics.

#### `studyFieldValues(field: string): Promise<ReadonlyArray<FieldValueCount>>`

Get distinct values and their counts for a study field.

## Error handling

```ts
import { ClinicalTrials, ClinicalTrialsHttpError } from '@ncbijs/clinical-trials';

try {
  await ct.study('NCT00000000');
} catch (err) {
  if (err instanceof ClinicalTrialsHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter. ClinicalTrials.gov is rate-limited to 2 requests/second.

## Response types

### `StudyReport`

```ts
interface StudyReport {
  nctId: string;
  briefTitle: string;
  officialTitle: string;
  overallStatus: string;
  phase: string;
  studyType: string;
  startDate: string;
  completionDate: string;
  enrollmentCount: number;
  conditions: Array<string>;
  interventions: Array<StudyIntervention>;
  sponsors: Array<StudySponsor>;
  locations: Array<StudyLocation>;
}
```

### `StudyIntervention`

```ts
interface StudyIntervention {
  type: string;
  name: string;
  description: string;
}
```

### `StudySponsor`

```ts
interface StudySponsor {
  name: string;
  class: string;
}
```

### `StudyLocation`

```ts
interface StudyLocation {
  facility: string;
  city: string;
  state: string;
  country: string;
}
```

### `StudyStats`

```ts
interface StudyStats {
  totalStudies: number;
}
```

### `FieldValueCount`

```ts
interface FieldValueCount {
  value: string;
  count: number;
}
```

### `StudySearchFilter`

```ts
interface StudySearchFilter {
  overallStatus?: Array<string>;
  condition?: Array<string>;
  intervention?: Array<string>;
  sponsor?: Array<string>;
  phase?: Array<string>;
  studyType?: Array<string>;
}
```

### `StudySearchOptions`

```ts
interface StudySearchOptions {
  filter?: StudySearchFilter;
  pageSize?: number;
  sort?: string;
  fields?: ReadonlyArray<string>;
}
```
