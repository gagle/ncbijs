# @ncbijs/litvar

> **Runtime**: Browser + Node.js

Typed client for the LitVar2 API. Find literature linked to genetic variants and retrieve publication IDs mentioning specific rsIDs.

## Installation

```bash
pnpm install @ncbijs/litvar
```

## Usage

```ts
import { LitVar } from '@ncbijs/litvar';

const litvar = new LitVar();

const info = await litvar.variant('rs328');
console.log(`${info.gene.join(', ')}: ${info.name}`);

const pubs = await litvar.publications('rs328');
console.log(`${pubs.count} publications, first PMID: ${pubs.pmids[0]}`);
```

## API

### `new LitVar(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

### `variant(rsid: string): Promise<LitVarVariant>`

Get variant information by rsID. Returns gene associations, HGVS notation, and clinical significance.

### `publications(rsid: string): Promise<LitVarPublicationResult>`

Get publication IDs (PMIDs and PMCIDs) associated with a variant by rsID.

### `search(query: string): Promise<ReadonlyArray<LitVarSearchResult>>`

Search LitVar for variants matching a text query (gene name, rsID prefix, HGVS notation, etc.).

## Bulk parsing

### `parseLitVarJson(json: string): ReadonlyArray<LitVarVariant>`

Parses a LitVar2 bulk variant file. Accepts either a JSON array or NDJSON format (e.g. `litvar2_variants.json.gz` after decompression).

```ts
import { parseLitVarJson } from '@ncbijs/litvar';
const variants = parseLitVarJson(fs.readFileSync('litvar2_variants.json', 'utf-8'));
```

## Error handling

```ts
import { LitVar, LitVarHttpError } from '@ncbijs/litvar';

const litvar = new LitVar();

try {
  await litvar.variant('rs000000000');
} catch (err) {
  if (err instanceof LitVarHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

## Response types

### `LitVarVariant`

```ts
interface LitVarVariant {
  rsid: string;
  gene: ReadonlyArray<string>;
  name: string;
  hgvs: string;
  clinicalSignificance: ReadonlyArray<string>;
}
```

### `LitVarPublicationResult`

```ts
interface LitVarPublicationResult {
  pmids: ReadonlyArray<number>;
  pmcids: ReadonlyArray<string>;
  count: number;
}
```

### `LitVarSearchResult`

```ts
interface LitVarSearchResult {
  rsid: string;
  gene: ReadonlyArray<string>;
  name: string;
  hgvs: string;
  publicationCount: number;
  clinicalSignificance: ReadonlyArray<string>;
  match: string;
}
```
