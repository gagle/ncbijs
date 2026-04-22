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

### Variation Services

#### `refsnp(rsid: number): Promise<RefSnpReport>`

Get a RefSNP variant report by rsID. Returns variant type and placements with alleles in SPDI and HGVS notation.

```ts
const report = await clinvar.refsnp(328);
console.log(report.variantType); // 'snv'
console.log(report.placements[0].sequenceAccession); // 'NC_000011.10'
console.log(report.placements[0].alleles[0].hgvs); // 'NC_000011.10:g.5227002C>T'
```

#### `spdi(spdiExpression: string): Promise<SpdiResult>`

Validate and resolve an SPDI expression. Returns the parsed sequence accession, position, deleted sequence, and inserted sequence.

```ts
const result = await clinvar.spdi('NC_000011.10:5227001:C:T');
console.log(result.sequenceAccession); // 'NC_000011.10'
console.log(result.position); // 5227001
console.log(result.deletedSequence); // 'C'
console.log(result.insertedSequence); // 'T'
```

#### `spdiToHgvs(spdiExpression: string): Promise<Array<string>>`

Convert an SPDI expression to HGVS notation. Returns one or more HGVS expression strings.

```ts
const hgvsList = await clinvar.spdiToHgvs('NC_000011.10:5227001:C:T');
console.log(hgvsList[0]); // 'NC_000011.10:g.5227002C>T'
```

#### `hgvsToSpdi(hgvsExpression: string, assembly?: string): Promise<Array<SpdiAllele>>`

Convert an HGVS expression to contextual SPDI alleles. Optionally filter by genome assembly.

| Option     | Default | Description                                        |
| ---------- | ------- | -------------------------------------------------- |
| `assembly` | --      | Genome assembly filter (e.g. `'GCF_000001405.40'`) |

```ts
const alleles = await clinvar.hgvsToSpdi('NC_000011.10:g.5227002C>T');
console.log(alleles[0].sequenceAccession); // 'NC_000011.10'
console.log(alleles[0].position); // 5227001
```

#### `frequency(rsid: number): Promise<FrequencyReport>`

Get allele frequency data (ALFA) for a variant by rsID. Returns population-level allele counts and frequencies.

```ts
const freq = await clinvar.frequency(328);
console.log(freq.populations[0].study); // 'ALFA'
console.log(freq.populations[0].population); // 'European'
console.log(freq.populations[0].frequency); // 0.234
```

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

### `RefSnpReport`

```ts
interface RefSnpReport {
  rsid: number;
  variantType: string;
  placements: Array<RefSnpPlacement>;
}
```

### `RefSnpPlacement`

```ts
interface RefSnpPlacement {
  sequenceAccession: string;
  alleles: Array<RefSnpAllele>;
}
```

### `RefSnpAllele`

```ts
interface RefSnpAllele {
  spdi: string;
  hgvs: string;
}
```

### `SpdiResult`

```ts
interface SpdiResult {
  sequenceAccession: string;
  position: number;
  deletedSequence: string;
  insertedSequence: string;
}
```

### `SpdiAllele`

```ts
interface SpdiAllele {
  sequenceAccession: string;
  position: number;
  deletedSequence: string;
  insertedSequence: string;
}
```

### `FrequencyReport`

```ts
interface FrequencyReport {
  rsid: number;
  populations: Array<PopulationFrequency>;
}
```

### `PopulationFrequency`

```ts
interface PopulationFrequency {
  study: string;
  population: string;
  alleleCount: number;
  totalCount: number;
  frequency: number;
}
```
