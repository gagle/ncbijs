# @ncbijs/datasets

Typed client for the NCBI Datasets API v2. Access genes, genomes, taxonomy, viruses, BioProjects, and BioSamples with zero XML parsing.

## Installation

```bash
npm install @ncbijs/datasets
```

## Usage

```ts
import { Datasets } from '@ncbijs/datasets';

const datasets = new Datasets({ apiKey: process.env.NCBI_API_KEY });

const genes = await datasets.geneById([672, 7157]);
console.log(genes[0].symbol); // 'BRCA1'
console.log(genes[0].description); // 'BRCA1 DNA repair associated'

const taxonomy = await datasets.taxonomy([9606]);
console.log(taxonomy[0].organismName); // 'Homo sapiens'
console.log(taxonomy[0].rank); // 'species'

const genomes = await datasets.genomeByAccession(['GCF_000001405.40']);
console.log(genomes[0].assemblyInfo.assemblyName); // 'GRCh38.p14'
```

## API

### `new Datasets(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 5 to 10 req/s) |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Gene

#### `geneById(geneIds: Array<number>): Promise<Array<GeneReport>>`

Fetch gene metadata by NCBI Gene IDs.

#### `geneBySymbol(symbols: Array<string>, taxon: number | string): Promise<Array<GeneReport>>`

Fetch gene metadata by gene symbol and taxon (ID or name).

### Taxonomy

#### `taxonomy(taxons: Array<number | string>): Promise<Array<TaxonomyReport>>`

Fetch taxonomy data by taxon IDs or names.

### Genome

#### `genomeByAccession(accessions: Array<string>): Promise<Array<GenomeReport>>`

Fetch genome assembly reports by accession (e.g., `GCF_000001405.40`).

#### `genomeByTaxon(taxon: number | string): Promise<Array<GenomeReport>>`

Fetch genome assembly reports for all assemblies of a taxon.

### Virus

#### `virusByAccession(accessions: Array<string>): Promise<Array<VirusReport>>`

Fetch virus genome reports by accessions.

#### `virusByTaxon(taxon: number | string): Promise<Array<VirusReport>>`

Fetch virus genome reports for all viruses of a taxon.

### BioProject

#### `bioproject(accessions: Array<string>): Promise<Array<BioProjectReport>>`

Fetch BioProject reports by accessions (e.g., `PRJNA12345`).

### BioSample

#### `biosample(accessions: Array<string>): Promise<Array<BioSampleReport>>`

Fetch BioSample reports by accessions (e.g., `SAMN12345`).

## Error handling

```ts
import { Datasets, DatasetsHttpError } from '@ncbijs/datasets';

try {
  await datasets.geneById([672]);
} catch (err) {
  if (err instanceof DatasetsHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `GeneReport`

```ts
interface GeneReport {
  geneId: number;
  symbol: string;
  description: string;
  taxId: number;
  taxName: string;
  commonName: string;
  type: string;
  chromosomes: Array<string>;
  synonyms: Array<string>;
  swissProtAccessions: Array<string>;
  ensemblGeneIds: Array<string>;
  omimIds: Array<string>;
  summary: string;
  transcriptCount: number;
  proteinCount: number;
  geneOntology: GeneOntology;
}
```

### `TaxonomyReport`

```ts
interface TaxonomyReport {
  taxId: number;
  organismName: string;
  commonName: string;
  rank: string;
  lineage: Array<number>;
  children: Array<number>;
  counts: Array<TaxonomyCount>;
}
```

### `GenomeReport`

```ts
interface GenomeReport {
  accession: string;
  currentAccession: string;
  sourceDatabase: string;
  organism: GenomeOrganism;
  assemblyInfo: AssemblyInfo;
  assemblyStats: AssemblyStats;
}
```

### `VirusReport`

```ts
interface VirusReport {
  accession: string;
  taxId: number;
  organismName: string;
  isolateName: string;
  host: string;
  collectionDate: string;
  geoLocation: string;
  completeness: string;
  length: number;
  bioprojectAccession: string;
  biosampleAccession: string;
}
```

### `BioProjectReport`

```ts
interface BioProjectReport {
  accession: string;
  title: string;
  description: string;
  organismName: string;
  taxId: number;
  projectType: string;
  registrationDate: string;
}
```

### `BioSampleReport`

```ts
interface BioSampleReport {
  accession: string;
  title: string;
  description: string;
  organismName: string;
  taxId: number;
  ownerName: string;
  submissionDate: string;
  publicationDate: string;
  attributes: Array<BioSampleAttribute>;
}
```

### `BioSampleAttribute`

```ts
interface BioSampleAttribute {
  name: string;
  value: string;
}
```
