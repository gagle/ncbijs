# @ncbijs/clinvar

> **Runtime**: Browser + Node.js

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

#### `spdi(spdiExpression: string): Promise<SpdiAllele>`

Validate and resolve an SPDI expression. Returns the parsed sequence accession, position, deleted sequence, and inserted sequence.

```ts
const result = await clinvar.spdi('NC_000011.10:5227001:C:T');
console.log(result.sequenceAccession); // 'NC_000011.10'
console.log(result.position); // 5227001
console.log(result.deletedSequence); // 'C'
console.log(result.insertedSequence); // 'T'
```

#### `spdiToHgvs(spdiExpression: string): Promise<string>`

Convert an SPDI expression to HGVS notation.

```ts
const hgvs = await clinvar.spdiToHgvs('NC_000011.10:5227001:C:T');
console.log(hgvs); // 'NC_000011.10:g.5227002C>T'
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

## Storage mode

Query locally stored ClinVar variants with the same API — no network, no rate limits.

```ts
import { ClinVar } from '@ncbijs/clinvar';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('./ncbijs.duckdb');
const clinvar = ClinVar.fromStorage(storage);

const variants = await clinvar.searchAndFetch('BRCA1');
```

### Available methods in storage mode

| Method             | Supported |
| ------------------ | --------- |
| `searchAndFetch()` | Yes       |
| `fetch()`          | Yes       |
| `search()`         | No        |
| `refsnp()`         | No        |
| `spdi()`           | No        |
| `spdiToHgvs()`     | No        |
| `hgvsToSpdi()`     | No        |
| `frequency()`      | No        |

Methods not available in storage mode throw a `StorageModeError`.

## Bulk parsers

### `parseVariantSummaryTsv(tsv)`

Parses a ClinVar `variant_summary.txt` TSV file into an array of `VariantReport` records.

```ts
import { parseVariantSummaryTsv } from '@ncbijs/clinvar';
import fs from 'node:fs';

const variants = parseVariantSummaryTsv(fs.readFileSync('variant_summary.txt', 'utf-8'));
console.log(variants[0].clinicalSignificance); // 'Pathogenic'
```

### `parseClinVarVcf(vcf)`

Parses a ClinVar VCF file (`clinvar.vcf.gz`) into an array of `ClinVarVcfVariant` records.

```ts
import { parseClinVarVcf } from '@ncbijs/clinvar';
import fs from 'node:fs';

const variants = parseClinVarVcf(fs.readFileSync('clinvar.vcf', 'utf-8'));
console.log(variants[0].chrom); // '1'
console.log(variants[0].clinicalSignificance); // 'Pathogenic'
console.log(variants[0].geneInfo); // 'BRCA1:672'
```

Returns `ReadonlyArray<ClinVarVcfVariant>` with fields: `chrom`, `pos`, `id`, `ref`, `alt`, `qual`, `filter`, `clinicalSignificance`, `diseaseNames`, `geneInfo`, `rsId`, `variantClass`.

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

### `ClinVarVcfVariant`

```ts
interface ClinVarVcfVariant {
  chrom: string;
  pos: number;
  id: string;
  ref: string;
  alt: string;
  qual: string;
  filter: string;
  clinicalSignificance: string;
  diseaseNames: string;
  geneInfo: string;
  rsId: string;
  variantClass: string;
}
```
