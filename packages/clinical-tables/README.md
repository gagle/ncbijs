# @ncbijs/clinical-tables

> **Runtime**: Browser + Node.js

Typed client for the Clinical Table Search API. Autocomplete ICD-10, LOINC, SNOMED, RxTerms, and other medical code systems with optional extra field retrieval.

## Installation

```bash
npm install @ncbijs/clinical-tables
```

## Usage

```ts
import { search } from '@ncbijs/clinical-tables';

const results = await search('icd10cm', 'diabetes');
console.log(`${results.totalCount} total matches`);
for (let i = 0; i < results.codes.length; i++) {
  console.log(`${results.codes[i]}: ${results.displayStrings[i]}`);
}

const withExtras = await search('loinc_items', 'glucose', {
  maxList: 5,
  extraFields: ['COMPONENT', 'SYSTEM'],
});
```

## API

#### `search(table: string, term: string, options?): Promise<ClinicalTablesResult>`

Search any clinical table by term with optional configuration.

**Supported tables:** `icd10cm`, `icd9cm_dx`, `loinc_items`, `rxterms`, `snomed_problem_list`, and more.

**`ClinicalTablesSearchOptions`**

| Option        | Type                    | Description                            |
| ------------- | ----------------------- | -------------------------------------- |
| `maxList`     | `number`                | Maximum results to return              |
| `count`       | `number`                | Number of results per page             |
| `offset`      | `number`                | Offset for pagination                  |
| `extraFields` | `ReadonlyArray<string>` | Additional fields to include in output |

## Error handling

```ts
import { search } from '@ncbijs/clinical-tables';

try {
  await search('icd10cm', 'diabetes');
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);
  }
}
```

## Response types

### `ClinicalTablesResult`

```ts
interface ClinicalTablesResult {
  totalCount: number;
  codes: Array<string>;
  displayStrings: Array<string>;
  extras: Array<Array<string>>;
}
```

### `ClinicalTablesSearchOptions`

```ts
interface ClinicalTablesSearchOptions {
  maxList?: number;
  count?: number;
  offset?: number;
  extraFields?: ReadonlyArray<string>;
}
```
