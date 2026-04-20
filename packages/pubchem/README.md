# @ncbijs/pubchem

Typed client for the PubChem PUG REST API. Look up compound properties, synonyms, and descriptions by CID or name.

## Installation

```bash
npm install @ncbijs/pubchem
```

## Usage

```ts
import { PubChem } from '@ncbijs/pubchem';

const pubchem = new PubChem();

const aspirin = await pubchem.compoundByCid(2244);
console.log(aspirin.molecularFormula); // 'C9H8O4'
console.log(aspirin.iupacName); // '2-acetyloxybenzoic acid'
console.log(aspirin.molecularWeight); // 180.16

const byName = await pubchem.compoundByName('caffeine');
console.log(byName.cid); // 2519

const synonyms = await pubchem.synonyms(2244);
console.log(synonyms.synonyms[0]); // 'aspirin'

const description = await pubchem.description(2244);
console.log(description.title); // 'Aspirin'
```

## API

### `new PubChem(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

PubChem is a fully public API with no API key required. Rate limit: 5 requests/second.

### Compound

#### `compoundByCid(cid: number): Promise<CompoundProperty>`

Fetch compound properties by PubChem CID.

#### `compoundByName(name: string): Promise<CompoundProperty>`

Fetch compound properties by compound name.

#### `compoundByCidBatch(cids: Array<number>): Promise<Array<CompoundProperty>>`

Fetch properties for multiple compounds by CID in a single request.

#### `compoundBySmiles(smiles: string): Promise<CompoundProperty>`

Fetch compound properties by SMILES string.

#### `compoundByInchiKey(inchiKey: string): Promise<CompoundProperty>`

Fetch compound properties by InChIKey.

#### `cidsByName(name: string): Promise<Array<number>>`

Look up PubChem CIDs matching a compound name.

### Synonyms

#### `synonyms(cid: number): Promise<CompoundSynonyms>`

Fetch all known synonyms for a compound by CID.

### Description

#### `description(cid: number): Promise<CompoundDescription>`

Fetch the title and description for a compound by CID.

## Error handling

```ts
import { PubChem, PubChemHttpError } from '@ncbijs/pubchem';

try {
  await pubchem.compoundByName('notarealcompound');
} catch (err) {
  if (err instanceof PubChemHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter. PubChem is rate-limited to 5 requests/second.

## Response types

### `CompoundProperty`

```ts
interface CompoundProperty {
  cid: number;
  molecularFormula: string;
  molecularWeight: number;
  iupacName: string;
  canonicalSmiles: string;
  isomericSmiles: string;
  inchi: string;
  inchiKey: string;
  xLogP: number;
  exactMass: number;
  monoisotopicMass: number;
  tpsa: number;
  complexity: number;
  hBondDonorCount: number;
  hBondAcceptorCount: number;
  rotatableBondCount: number;
  heavyAtomCount: number;
}
```

### `CompoundSynonyms`

```ts
interface CompoundSynonyms {
  cid: number;
  synonyms: Array<string>;
}
```

### `CompoundDescription`

```ts
interface CompoundDescription {
  cid: number;
  title: string;
  description: string;
}
```
