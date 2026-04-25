# @ncbijs/genbank

> **Runtime**: Browser + Node.js

Zero-dependency parser for NCBI GenBank flat file format. Extracts locus metadata, features, qualifiers, references and nucleotide/protein sequences into typed records.

## Installation

```bash
npm install @ncbijs/genbank
```

## Usage

```ts
import { parseGenBank } from '@ncbijs/genbank';

const text = `LOCUS       SCU49845     5028 bp    DNA             PLN       21-JUN-1999
DEFINITION  Saccharomyces cerevisiae TCP1-beta gene, partial cds.
ACCESSION   U49845
VERSION     U49845.1
...
//`;

const records = parseGenBank(text);
console.log(records[0].accession); // 'U49845'
console.log(records[0].locus.length); // 5028
console.log(records[0].locus.moleculeType); // 'DNA'
console.log(records[0].definition); // 'Saccharomyces cerevisiae TCP1-beta gene, partial cds.'
console.log(records[0].organism); // 'Saccharomyces cerevisiae'
console.log(records[0].features[0].key); // 'source'
console.log(records[0].features[0].qualifiers[0].name); // 'organism'
```

## API

### `parseGenBank(text: string): ReadonlyArray<GenBankRecord>`

Parse one or more GenBank flat file records separated by `//`. Returns a typed array of `GenBankRecord` objects.

### `createEmptyGenBankRecord(accession: string): GenBankRecord`

Create an empty record with default values for the given accession. Useful as a fallback when a fetch returns no data.

## Response types

### `GenBankRecord`

```ts
interface GenBankRecord {
  readonly locus: GenBankLocus;
  readonly definition: string;
  readonly accession: string;
  readonly version: string;
  readonly dbSource: string;
  readonly keywords: string;
  readonly source: string;
  readonly organism: string;
  readonly lineage: string;
  readonly references: ReadonlyArray<GenBankReference>;
  readonly features: ReadonlyArray<GenBankFeature>;
  readonly sequence: string;
}
```

### `GenBankLocus`

```ts
interface GenBankLocus {
  readonly name: string;
  readonly length: number;
  readonly moleculeType: string;
  readonly topology: string;
  readonly division: string;
  readonly date: string;
}
```

### `GenBankReference`

```ts
interface GenBankReference {
  readonly number: number;
  readonly range: string;
  readonly authors: string;
  readonly title: string;
  readonly journal: string;
  readonly pubmedId: string;
}
```

### `GenBankFeature`

```ts
interface GenBankFeature {
  readonly key: string;
  readonly location: string;
  readonly qualifiers: ReadonlyArray<GenBankQualifier>;
}
```

### `GenBankQualifier`

```ts
interface GenBankQualifier {
  readonly name: string;
  readonly value: string;
}
```
