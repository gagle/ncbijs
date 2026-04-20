# @ncbijs/snp

Typed client for the NCBI Variation Services API (dbSNP). Look up RefSNP reports by RS ID with allele placements, population frequencies, and clinical significance annotations.

## Installation

```bash
npm install @ncbijs/snp
```

## Usage

```ts
import { Snp } from '@ncbijs/snp';

const snp = new Snp({ apiKey: process.env.NCBI_API_KEY });

const report = await snp.refsnp(7412);
console.log(report.refsnpId); // '7412'
console.log(report.createDate); // '2000/09/19'

const placement = report.placements[0];
console.log(placement.assemblyName); // 'GRCh38.p14'
console.log(placement.alleles); // SPDI allele representations

const freq = report.alleleAnnotations[0].frequency[0];
console.log(freq.studyName); // 'GnomAD'
console.log(freq.frequency); // 0.127 (alleleCount / totalCount)

const clinical = report.alleleAnnotations[0].clinical[0];
console.log(clinical.significances); // ['pathogenic']
console.log(clinical.diseaseNames); // ['Alzheimer disease']

const reports = await snp.refsnpBatch([7412, 429358]);
console.log(reports.length); // 2
```

## API

### `new Snp(config?)`

| Option       | Default | Description                                     |
| ------------ | ------- | ----------------------------------------------- |
| `apiKey`     | --      | NCBI API key (optional, helps with rate limits) |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors             |

### RefSNP

#### `refsnp(rsId: number): Promise<RefSnpReport>`

Fetch a single RefSNP report by numeric RS ID (without the "rs" prefix).

#### `refsnpBatch(rsIds: ReadonlyArray<number>): Promise<ReadonlyArray<RefSnpReport>>`

Fetch multiple RefSNP reports sequentially.

## Response types

### `RefSnpReport`

```ts
interface RefSnpReport {
  refsnpId: string;
  createDate: string;
  placements: Array<SnpPlacement>;
  alleleAnnotations: Array<SnpAlleleAnnotation>;
}
```

### `SnpPlacement`

```ts
interface SnpPlacement {
  seqId: string;
  assemblyName: string;
  alleles: Array<SnpAllele>;
}
```

### `SnpAllele`

```ts
interface SnpAllele {
  seqId: string;
  position: number;
  deletedSequence: string;
  insertedSequence: string;
}
```

### `SnpAlleleAnnotation`

```ts
interface SnpAlleleAnnotation {
  frequency: Array<SnpFrequency>;
  clinical: Array<SnpClinicalSignificance>;
}
```

### `SnpFrequency`

```ts
interface SnpFrequency {
  studyName: string;
  alleleCount: number;
  totalCount: number;
  frequency: number;
  deletedSequence: string;
  insertedSequence: string;
}
```

### `SnpClinicalSignificance`

```ts
interface SnpClinicalSignificance {
  significances: Array<string>;
  diseaseNames: Array<string>;
  reviewStatus: string;
}
```
