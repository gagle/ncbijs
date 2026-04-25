# @ncbijs/datasets

> **Runtime**: Browser + Node.js

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

### Assembly

#### `assemblyDescriptors(accessions: Array<string>): Promise<Array<AssemblyDescriptor>>`

Fetch lightweight assembly descriptors by accession numbers.

### Gene links

#### `geneLinks(geneIds: Array<number>): Promise<Array<GeneLink>>`

Fetch external database links for genes by NCBI Gene IDs.

### Catalog

#### `datasetCatalog(): Promise<Array<DatasetInfo>>`

List available NCBI datasets from the catalog.

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

## Bulk parsers

Parse large NCBI gene annotation flat files without making HTTP requests.

### `parseGeneInfoTsv(tsv)`

Parses `gene_info.gz` into an array of gene records.

```ts
import { parseGeneInfoTsv } from '@ncbijs/datasets';
import { readFileSync } from 'fs';

const tsv = readFileSync('gene_info.gz.decompressed', 'utf8');
const genes = parseGeneInfoTsv(tsv);
console.log(genes[0].symbol); // 'A1BG'
console.log(genes[0].geneId); // 1
```

### `parseTaxonomyDump(tsv)`

Parses `names.dmp` + `nodes.dmp` from the NCBI taxonomy dump.

```ts
import { parseTaxonomyDump } from '@ncbijs/datasets';
import { readFileSync } from 'fs';

const names = readFileSync('names.dmp', 'utf8');
const nodes = readFileSync('nodes.dmp', 'utf8');
const taxonomy = parseTaxonomyDump(names, nodes);
console.log(taxonomy[0].scientificName); // 'root'
```

### `parseGene2PubmedTsv(tsv)`

Parses `gene2pubmed.gz` into gene-to-PubMed links.

```ts
import { parseGene2PubmedTsv } from '@ncbijs/datasets';
import { readFileSync } from 'fs';

const tsv = readFileSync('gene2pubmed.gz.decompressed', 'utf8');
const links = parseGene2PubmedTsv(tsv);
console.log(links[0].taxId); // 9606
console.log(links[0].geneId); // 672
console.log(links[0].pmid); // 7566098
```

### `parseGene2GoTsv(tsv)`

Parses `gene2go.gz` into Gene Ontology annotations.

```ts
import { parseGene2GoTsv } from '@ncbijs/datasets';
import { readFileSync } from 'fs';

const tsv = readFileSync('gene2go.gz.decompressed', 'utf8');
const annotations = parseGene2GoTsv(tsv);
console.log(annotations[0].geneId); // 672
console.log(annotations[0].goId); // 'GO:0003674'
console.log(annotations[0].evidence); // 'ND'
console.log(annotations[0].category); // 'Function'
```

### `parseGeneOrthologsTsv(tsv)`

Parses `gene_orthologs.gz` into ortholog relationships between genes across taxa.

```ts
import { parseGeneOrthologsTsv } from '@ncbijs/datasets';
import { readFileSync } from 'fs';

const tsv = readFileSync('gene_orthologs.gz.decompressed', 'utf8');
const orthologs = parseGeneOrthologsTsv(tsv);
console.log(orthologs[0].geneId); // 672
console.log(orthologs[0].relationship); // 'Ortholog'
console.log(orthologs[0].otherTaxId); // 10090
console.log(orthologs[0].otherGeneId); // 12189
```

### `parseGeneHistoryTsv(tsv)`

Parses `gene_history.gz` into a record of discontinued or merged gene IDs.

```ts
import { parseGeneHistoryTsv } from '@ncbijs/datasets';
import { readFileSync } from 'fs';

const tsv = readFileSync('gene_history.gz.decompressed', 'utf8');
const history = parseGeneHistoryTsv(tsv);
console.log(history[0].discontinuedGeneId); // 11
console.log(history[0].discontinuedSymbol); // 'NAIP'
console.log(history[0].discontinueDate); // '20040515'
```

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

### `AssemblyDescriptor`

```ts
interface AssemblyDescriptor {
  accession: string;
  assemblyName: string;
  assemblyLevel: string;
  organism: string;
  taxId: number;
  submitter: string;
  releaseDate: string;
}
```

### `GeneLink`

```ts
interface GeneLink {
  geneId: number;
  links: Array<ExternalLink>;
}
```

### `ExternalLink`

```ts
interface ExternalLink {
  resourceName: string;
  url: string;
}
```

### `DatasetInfo`

```ts
interface DatasetInfo {
  name: string;
  description: string;
  version: string;
}
```

### `Gene2PubmedLink`

```ts
interface Gene2PubmedLink {
  taxId: number;
  geneId: number;
  pmid: number;
}
```

### `Gene2GoAnnotation`

```ts
interface Gene2GoAnnotation {
  taxId: number;
  geneId: number;
  goId: string;
  goTerm: string;
  evidence: string;
  qualifier: string;
  category: string;
  pmids: ReadonlyArray<number>;
}
```

### `GeneOrtholog`

```ts
interface GeneOrtholog {
  taxId: number;
  geneId: number;
  relationship: string;
  otherTaxId: number;
  otherGeneId: number;
}
```

### `GeneHistoryEntry`

```ts
interface GeneHistoryEntry {
  taxId: number;
  geneId: number;
  discontinuedGeneId: number;
  discontinuedSymbol: string;
  discontinueDate: string;
}
```
