# @ncbijs/medgen

> **Runtime**: Browser + Node.js

Typed client for NCBI MedGen medical genetics concepts. Search conditions and fetch detailed concept reports including genes, inheritance modes, clinical features, and definitions with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/medgen
```

## Usage

```ts
import { MedGen } from '@ncbijs/medgen';

const medgen = new MedGen({ apiKey: process.env.NCBI_API_KEY });

const searchResult = await medgen.search('cystic fibrosis');
console.log(searchResult.total); // 25
console.log(searchResult.ids); // ['41393', '346004']

const concepts = await medgen.fetch(searchResult.ids);
console.log(concepts[0].title); // 'Cystic fibrosis'
console.log(concepts[0].conceptId); // 'C0010674'
console.log(concepts[0].semanticType); // 'Disease or Syndrome'
console.log(concepts[0].associatedGenes[0].symbol); // 'CFTR'
console.log(concepts[0].modesOfInheritance[0].name); // 'Autosomal recessive inheritance'
console.log(concepts[0].clinicalFeatures[0].name); // 'Recurrent respiratory infections'
```

## API

### `new MedGen(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `tool`       | --      | Tool name for NCBI E-utilities identification       |
| `email`      | --      | Contact email for NCBI E-utilities identification   |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Search

#### `search(term: string, options?): Promise<MedGenSearchResult>`

Search MedGen by query term. Returns total count and matching UIDs.

| Option   | Default | Description                      |
| -------- | ------- | -------------------------------- |
| `retmax` | --      | Maximum number of UIDs to return |

### Fetch

#### `fetch(ids: ReadonlyArray<string>): Promise<ReadonlyArray<MedGenConcept>>`

Fetch concept details by UIDs. Entries with errors are automatically skipped.

### Convenience

#### `searchAndFetch(term: string, options?): Promise<ReadonlyArray<MedGenConcept>>`

Search and fetch in one call. Combines `search` + `fetch`. Returns empty array if no results.

## Bulk parsing (RRF files)

### `parseMedGenRrf(files): ReadonlyArray<MedGenConcept>`

Parses MedGen RRF bulk data files downloaded from the [NCBI FTP server](https://ftp.ncbi.nlm.nih.gov/pub/medgen/). `MGCONSO.RRF` is required; `MGDEF.RRF` and `MGSTY.RRF` are optional.

```ts
import { parseMedGenRrf } from '@ncbijs/medgen';

const concepts = parseMedGenRrf({
  mgconso: fs.readFileSync('MGCONSO.RRF', 'utf-8'),
  mgdef: fs.readFileSync('MGDEF.RRF', 'utf-8'),
  mgsty: fs.readFileSync('MGSTY.RRF', 'utf-8'),
});
```

Returns the same `MedGenConcept` shape as the HTTP `fetch()` method.

## Error handling

```ts
import { MedGen, MedGenHttpError } from '@ncbijs/medgen';

try {
  await medgen.search('cystic fibrosis');
} catch (err) {
  if (err instanceof MedGenHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `MedGenSearchResult`

```ts
interface MedGenSearchResult {
  total: number;
  ids: ReadonlyArray<string>;
}
```

### `MedGenConcept`

```ts
interface MedGenConcept {
  uid: string;
  conceptId: string;
  title: string;
  definition: string;
  semanticType: string;
  associatedGenes: ReadonlyArray<MedGenGene>;
  modesOfInheritance: ReadonlyArray<MedGenInheritance>;
  clinicalFeatures: ReadonlyArray<MedGenClinicalFeature>;
  omimIds: ReadonlyArray<string>;
  definitions: ReadonlyArray<MedGenDefinition>;
  names: ReadonlyArray<MedGenName>;
}
```

### `MedGenGene`

```ts
interface MedGenGene {
  geneId: number;
  symbol: string;
  chromosome: string;
  cytogeneticLocation: string;
}
```

### `MedGenInheritance`

```ts
interface MedGenInheritance {
  name: string;
  cui: string;
}
```

### `MedGenClinicalFeature`

```ts
interface MedGenClinicalFeature {
  name: string;
  hpoId: string;
  cui: string;
}
```

### `MedGenDefinition`

```ts
interface MedGenDefinition {
  source: string;
  text: string;
}
```

### `MedGenName`

```ts
interface MedGenName {
  name: string;
  source: string;
  type: string;
}
```

### `MedGenRrfInput`

```ts
interface MedGenRrfInput {
  mgconso: string;
  mgdef?: string;
  mgsty?: string;
}
```
