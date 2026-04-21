# @ncbijs/nucleotide

Typed client for NCBI Nucleotide database. Fetch nucleotide sequences in FASTA and GenBank formats with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/nucleotide
```

## Usage

```ts
import { Nucleotide } from '@ncbijs/nucleotide';

const nucleotide = new Nucleotide({ apiKey: process.env.NCBI_API_KEY });

const fasta = await nucleotide.fetchFasta('NM_000546.6');
console.log(fasta.id); // 'NM_000546.6'
console.log(fasta.description); // 'Homo sapiens tumor protein p53 (TP53), mRNA'
console.log(fasta.sequence); // 'GATGGGATTG...'

const genbank = await nucleotide.fetchGenBank('NM_000546.6');
console.log(genbank.accession); // 'NM_000546'
console.log(genbank.organism); // 'Homo sapiens'
console.log(genbank.features[0].key); // 'source'
```

## API

### `new Nucleotide(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Fetch FASTA

#### `fetchFasta(accession: string): Promise<FastaRecord>`

Fetch a single nucleotide sequence in FASTA format. Returns an empty record if the accession is not found.

#### `fetchFastaBatch(accessions: ReadonlyArray<string>): Promise<ReadonlyArray<FastaRecord>>`

Fetch multiple nucleotide sequences in FASTA format in a single request.

### Fetch GenBank

#### `fetchGenBank(accession: string): Promise<GenBankRecord>`

Fetch a single nucleotide record in GenBank format. Returns an empty record if the accession is not found.

#### `fetchGenBankBatch(accessions: ReadonlyArray<string>): Promise<ReadonlyArray<GenBankRecord>>`

Fetch multiple nucleotide records in GenBank format in a single request.

## Error handling

```ts
import { Nucleotide, NucleotideHttpError } from '@ncbijs/nucleotide';

try {
  await nucleotide.fetchFasta('NM_000546.6');
} catch (err) {
  if (err instanceof NucleotideHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Response types

### `FastaRecord`

```ts
interface FastaRecord {
  readonly id: string;
  readonly description: string;
  readonly sequence: string;
}
```

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

See [`@ncbijs/genbank`](../genbank/README.md) and [`@ncbijs/fasta`](../fasta/README.md) for full sub-interface definitions.
