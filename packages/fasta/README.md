# @ncbijs/fasta

Parse FASTA format sequences into typed records. Zero dependencies.

## Installation

```bash
npm install @ncbijs/fasta
```

## Usage

```ts
import { parseFasta } from '@ncbijs/fasta';

const text = `
>NP_000537.3 cellular tumor antigen p53 isoform a [Homo sapiens]
MEEPQSDPSVEPPLSQETFSDLWKLLPENNVLSPLPSQAMDDLMLSPDDIEQWFTEDPGP
DEAPRMPEAAPPVAPAPAAPTPAAPAPAPSWPLSSSVPSQKTYPQGLNGTVNLPGRNSFEV
`;

const records = parseFasta(text);

console.log(records[0].id); // 'NP_000537.3'
console.log(records[0].description); // 'cellular tumor antigen p53 isoform a [Homo sapiens]'
console.log(records[0].sequence); // 'MEEPQSDPSVEPPLSQETFSDLWKLL...'
```

## API

### `parseFasta(text: string): Array<FastaRecord>`

Parses a FASTA-formatted string into an array of records.

- Header lines (`>`) split into `id` (first word) and `description` (rest)
- Multi-line sequences are concatenated
- Comment lines (`;`) and blank lines are skipped
- Handles GenBank, UniProt/SwissProt, and NCBI identifier formats

### `FastaRecord`

```ts
interface FastaRecord {
  readonly id: string;
  readonly description: string;
  readonly sequence: string;
}
```
