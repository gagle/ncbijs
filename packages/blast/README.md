# @ncbijs/blast

> **Runtime**: Browser + Node.js

Typed client for the NCBI BLAST URL API. Submit sequence alignment searches, poll for results, and retrieve structured hits with a simple async workflow.

## Installation

```bash
npm install @ncbijs/blast
```

## Usage

```ts
import { Blast } from '@ncbijs/blast';

const blast = new Blast();

// Full search: submit, poll, retrieve in one call
const result = await blast.search('ATCGATCGATCGATCG', 'blastn', 'nt', {
  pollIntervalMs: 60_000,
  maxPollAttempts: 30,
});

for (const hit of result.hits) {
  console.log(hit.accession, hit.title);
  for (const hsp of hit.hsps) {
    console.log(`  E-value: ${hsp.evalue}, Identity: ${hsp.identity}/${hsp.alignLen}`);
  }
}
```

### Step-by-step workflow

```ts
// 1. Submit
const { rid, estimatedSeconds } = await blast.submit('ATCGATCG', 'blastn', 'nt');

// 2. Poll until ready
let status = 'waiting';
while (status === 'waiting') {
  const poll = await blast.poll(rid);
  status = poll.status;
}

// 3. Retrieve results
const result = await blast.retrieve(rid);
```

## API

### `new Blast(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

### `submit(query, program, database, options?)`

Submit a BLAST search. Returns `{ rid, estimatedSeconds }`.

| Parameter                            | Type               | Description                                                                                                                             |
| ------------------------------------ | ------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| `query`                              | `string`           | Sequence query (FASTA or plain)                                                                                                         |
| `program`                            | `BlastProgram`     | `'blastn'`, `'blastp'`, `'blastx'`, `'tblastn'`, `'tblastx'`, `'megablast'`, `'psiblast'`, `'deltablast'`, `'rpsblast'`, `'rpstblastn'` |
| `database`                           | `string`           | Target database (`'nt'`, `'nr'`, `'swissprot'`, etc.)                                                                                   |
| `options.entrezQuery`                | `string`           | Entrez query to limit search                                                                                                            |
| `options.expect`                     | `number`           | E-value threshold                                                                                                                       |
| `options.hitListSize`                | `number`           | Max number of hits                                                                                                                      |
| `options.matrix`                     | `string`           | Scoring matrix (e.g., `'BLOSUM62'`)                                                                                                     |
| `options.wordSize`                   | `number`           | Word size for seeding alignments                                                                                                        |
| `options.compositionBasedStatistics` | `0 \| 1 \| 2 \| 3` | Composition-based statistics mode                                                                                                       |
| `options.seg`                        | `boolean`          | Enable SEG low-complexity filtering                                                                                                     |
| `options.softMasking`                | `boolean`          | Enable soft masking of query sequence                                                                                                   |
| `options.gapOpen`                    | `number`           | Gap opening penalty (use with `gapExtend`)                                                                                              |
| `options.gapExtend`                  | `number`           | Gap extension penalty (use with `gapOpen`)                                                                                              |
| `options.threshold`                  | `number`           | Neighboring word score threshold                                                                                                        |
| `options.numIterations`              | `number`           | Number of PSI-BLAST iterations                                                                                                          |

### `poll(rid)`

Check the status of a submitted search. Returns `{ status }` where status is `'waiting'`, `'ready'`, `'failed'`, or `'unknown'`.

### `retrieve(rid)`

Retrieve results for a completed search. Returns `BlastResult`.

### `search(query, program, database, options?)`

Convenience method: submits, polls until ready, then retrieves. Accepts all `submit` options plus:

| Option            | Default | Description                          |
| ----------------- | ------- | ------------------------------------ |
| `pollIntervalMs`  | `60000` | Milliseconds between poll requests   |
| `maxPollAttempts` | `30`    | Maximum poll attempts before timeout |

## Response types

### `BlastResult`

```ts
interface BlastResult {
  readonly hits: ReadonlyArray<BlastHit>;
}
```

### `BlastHit`

```ts
interface BlastHit {
  readonly accession: string;
  readonly title: string;
  readonly length: number;
  readonly hsps: ReadonlyArray<BlastHsp>;
}
```

### `BlastHsp`

```ts
interface BlastHsp {
  readonly bitScore: number;
  readonly score: number;
  readonly evalue: number;
  readonly queryFrom: number;
  readonly queryTo: number;
  readonly hitFrom: number;
  readonly hitTo: number;
  readonly identity: number;
  readonly gaps: number;
  readonly alignLen: number;
  readonly qseq: string;
  readonly hseq: string;
  readonly midline: string;
}
```

## Error handling

```ts
import { Blast, BlastHttpError, BlastTimeoutError, BlastSearchError } from '@ncbijs/blast';

try {
  await blast.search('ATCG', 'blastn', 'nt');
} catch (err) {
  if (err instanceof BlastTimeoutError) {
    console.error('Search timed out after max poll attempts');
  } else if (err instanceof BlastSearchError) {
    console.error('BLAST search failed on the server');
  } else if (err instanceof BlastHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter.

## Rate limits

Built-in rate limiting enforces NCBI guidelines:

- Submit: max 1 request per 10 seconds
- Poll: max 1 request per 60 seconds
