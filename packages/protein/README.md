# @ncbijs/protein

Typed client for NCBI Protein database. Fetch protein sequences in FASTA and GenBank formats with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/protein
```

## Usage

```ts
import { Protein } from '@ncbijs/protein';

const protein = new Protein({ apiKey: process.env.NCBI_API_KEY });

const fasta = await protein.fetchFasta('NP_000537.3');
console.log(fasta.id); // 'NP_000537.3'
console.log(fasta.description); // 'cellular tumor antigen p53 isoform a [Homo sapiens]'
console.log(fasta.sequence); // 'MEEPQSDP...'

const genbank = await protein.fetchGenBank('NP_000537.3');
console.log(genbank.accession); // 'NP_000537'
console.log(genbank.organism); // 'Homo sapiens'
console.log(genbank.features[0].key); // 'source'
```

## API

### `new Protein(config?)`

| Option       | Default | Description                                         |
| ------------ | ------- | --------------------------------------------------- |
| `apiKey`     | --      | NCBI API key (raises rate limit from 3 to 10 req/s) |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors                 |

### Fetch FASTA

#### `fetchFasta(accession: string): Promise<FastaRecord>`

Fetch a single protein sequence in FASTA format. Returns an empty record if the accession is not found.

#### `fetchFastaBatch(accessions: ReadonlyArray<string>): Promise<ReadonlyArray<FastaRecord>>`

Fetch multiple protein sequences in FASTA format in a single request.

### Fetch GenBank

#### `fetchGenBank(accession: string): Promise<GenBankRecord>`

Fetch a single protein record in GenPept (GenBank protein) format. Returns an empty record if the accession is not found.

#### `fetchGenBankBatch(accessions: ReadonlyArray<string>): Promise<ReadonlyArray<GenBankRecord>>`

Fetch multiple protein records in GenPept format in a single request.

## Error handling

```ts
import { Protein, ProteinHttpError } from '@ncbijs/protein';

try {
  await protein.fetchFasta('NP_000537.3');
} catch (err) {
  if (err instanceof ProteinHttpError) {
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
