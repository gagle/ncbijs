# @ncbijs/clinvar

Typed client for NCBI ClinVar clinical variant data. Search variants and fetch detailed reports with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/clinvar
```

## Usage

```ts
import { ClinVar } from '@ncbijs/clinvar';

const clinvar = new ClinVar({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await clinvar.search('TP53 pathogenic');
console.log(searchResult.total); // 5
console.log(searchResult.ids); // ['846933', '123456']

const variants = await clinvar.fetch(searchResult.ids);
console.log(variants[0].title); // 'NM_000546.6(TP53):c.743G>A (p.Arg248Gln)'
console.log(variants[0].clinicalSignificance); // 'Pathogenic/Likely pathogenic'
console.log(variants[0].genes[0].symbol); // 'TP53'
console.log(variants[0].traits[0].name); // 'Li-Fraumeni syndrome'
console.log(variants[0].locations[0].chromosome); // '17'
```

## API

### `new ClinVar(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<ClinVarSearchResult>`

Search ClinVar by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: Array<string>): Promise<Array<VariantReport>>`

Fetch variant details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<Array<VariantReport>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Error handling

```ts
import { ClinVar, ClinVarHttpError } from '@ncbijs/clinvar';

try {
  await clinvar.search('TP53 pathogenic');
} catch (err) {
  if (err instanceof ClinVarHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `ClinVarSearchResult`

```ts
interface ClinVarSearchResult {
  total: number;
  ids: Array<string>;
}
```

### `VariantReport`

```ts
interface VariantReport {
  uid: string;
  title: string;
  objectType: string;
  accession: string;
  accessionVersion: string;
  clinicalSignificance: string;
  genes: Array<ClinVarGene>;
  traits: Array<ClinVarTrait>;
  locations: Array<VariantLocation>;
  supportingSubmissions: Array<string>;
}
```

### `ClinVarGene`

```ts
interface ClinVarGene {
  geneId: number;
  symbol: string;
}
```

### `ClinVarTrait`

```ts
interface ClinVarTrait {
  name: string;
  xrefs: Array<TraitXref>;
}
```

### `VariantLocation`

```ts
interface VariantLocation {
  assemblyName: string;
  chromosome: string;
  start: number;
  stop: number;
}
```
