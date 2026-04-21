# @ncbijs/structure

Typed client for NCBI Structure (MMDB/PDB) macromolecular data. Search structures and fetch detailed records with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/structure
```

## Usage

```ts
import { Structure } from '@ncbijs/structure';

const structure = new Structure({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await structure.search('hemoglobin');
console.log(searchResult.total); // 1234
console.log(searchResult.ids); // ['12345', '67890']

const records = await structure.fetch(searchResult.ids);
console.log(records[0].pdbAccession); // '1HBB'
console.log(records[0].description); // 'DEOXY HUMAN HEMOGLOBIN'
console.log(records[0].experimentalMethod); // 'X-Ray Diffraction'
console.log(records[0].resolution); // '1.80'
console.log(records[0].organisms[0]); // 'Homo sapiens'
```

## API

### `new Structure(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<StructureSearchResult>`

Search Structure by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: Array<string>): Promise<Array<StructureRecord>>`

Fetch structure details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<Array<StructureRecord>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { Structure, StructureHttpError } from '@ncbijs/structure';

try {
  await structure.search('hemoglobin');
} catch (err) {
  if (err instanceof StructureHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `StructureSearchResult`

```ts
interface StructureSearchResult {
  total: number;
  ids: Array<string>;
}
```

### `StructureRecord`

```ts
interface StructureRecord {
  uid: string;
  pdbAccession: string;
  description: string;
  enzymeClassification: string;
  resolution: string;
  experimentalMethod: string;
  pdbClass: string;
  pdbDepositDate: string;
  mmdbEntryDate: string;
  mmdbModifyDate: string;
  organisms: Array<string>;
  pdbAccessionSynonyms: Array<string>;
  ligandCode: string;
  ligandCount: number;
  modifiedProteinResidueCount: number;
  modifiedDnaResidueCount: number;
  modifiedRnaResidueCount: number;
  proteinMoleculeCount: number;
  dnaMoleculeCount: number;
  rnaMoleculeCount: number;
  biopolymerCount: number;
  otherMoleculeCount: number;
}
```
