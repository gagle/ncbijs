# @ncbijs/litvar

Typed client for the LitVar2 API. Find literature linked to genetic variants and retrieve publications mentioning specific rsIDs.

## Installation

```bash
npm install @ncbijs/litvar
```

## Usage

```ts
import { variant, publications } from '@ncbijs/litvar';

const info = await variant('rs328');
console.log(`${info.gene}: ${info.publicationCount} publications`);

const pubs = await publications('rs328');
for (const pub of pubs) {
  console.log(`PMID ${pub.pmid}: ${pub.title}`);
}
```

## API

#### `variant(rsid: string): Promise<LitVarVariant>`

Get variant information and associated publication count by rsID.

#### `publications(rsid: string): Promise<ReadonlyArray<LitVarPublication>>`

Get all publications mentioning a variant by rsID.

#### `search(query: string): Promise<ReadonlyArray<LitVarSearchResult>>`

Search LitVar for variants matching a text query (gene name, rsID prefix, HGVS notation, etc.).

#### `variantAnnotations(rsid: string): Promise<ReadonlyArray<LitVarAnnotation>>`

Get detailed annotations for a variant, including disease associations, related genes, and supporting PMIDs.

## Bulk parsing

#### `parseLitVarJson(json: string): ReadonlyArray<LitVarVariant>`

Parses a LitVar2 bulk variant file. Accepts either a JSON array or NDJSON format (e.g. `litvar2_variants.json.gz` after decompression).

```ts
import { parseLitVarJson } from '@ncbijs/litvar';
const variants = parseLitVarJson(fs.readFileSync('litvar2_variants.json', 'utf-8'));
```

## Error handling

```ts
import { variant } from '@ncbijs/litvar';

try {
  await variant('rs000000000');
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);
  }
}
```

## Response types

### `LitVarVariant`

```ts
interface LitVarVariant {
  rsid: string;
  hgvs: string;
  gene: string;
  publicationCount: number;
}
```

### `LitVarPublication`

```ts
interface LitVarPublication {
  pmid: number;
  title: string;
  journal: string;
  year: number;
}
```

### `LitVarSearchResult`

```ts
interface LitVarSearchResult {
  term: string;
  type: string;
  score: number;
}
```

### `LitVarAnnotation`

```ts
interface LitVarAnnotation {
  disease: string;
  genes: Array<string>;
  pmids: Array<number>;
}
```
