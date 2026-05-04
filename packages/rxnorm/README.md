# @ncbijs/rxnorm

> **Runtime**: Browser + Node.js

Typed client for the RxNorm REST API. Normalize drug names, look up concept properties, find drug classes via RxClass, and map NDC codes with automatic rate limiting and retry logic.

## Installation

```bash
pnpm install @ncbijs/rxnorm
```

## Usage

```ts
import { RxNorm } from '@ncbijs/rxnorm';

const rxnorm = new RxNorm();

const rxcui = await rxnorm.rxcui('aspirin');
console.log(rxcui); // '1191'

const props = await rxnorm.properties('1191');
console.log(props.name); // 'aspirin'

const related = await rxnorm.relatedByType('1191', ['SBD', 'SCD']);
for (const concept of related) {
  console.log(`${concept.rxcui}: ${concept.name}`);
}

const classes = await rxnorm.classByDrugName('aspirin', 'ATC');
for (const drugClass of classes) {
  console.log(`${drugClass.classId}: ${drugClass.className}`);
}

const suggestions = await rxnorm.spelling('asprin');
console.log(suggestions); // ['aspirin', ...]

const ndcCodes = await rxnorm.ndcByRxcui('1191');
console.log(ndcCodes);
```

## API

### `new RxNorm(config?)`

| Option       | Default | Description                         |
| ------------ | ------- | ----------------------------------- |
| `maxRetries` | `3`     | Number of retries on 429/5xx errors |

RxNorm is a fully public API with no API key required. Rate limit: 2 requests/second.

### Concept lookup

#### `rxcui(name: string): Promise<RxConcept | undefined>`

Get the RxNorm concept identifier (RXCUI) from a drug name. Returns `undefined` if not found.

#### `properties(rxcui: string): Promise<RxConceptProperties>`

Get full concept properties by RXCUI.

#### `relatedByType(rxcui: string, types: ReadonlyArray<string>): Promise<ReadonlyArray<RxConcept>>`

Get related concepts filtered by relationship type (e.g. `'SBD'`, `'SCD'`, `'IN'`).

### Drug search

#### `drugs(name: string): Promise<DrugGroup>`

Get the drug group with all associated concepts for a drug name.

#### `spelling(name: string): Promise<ReadonlyArray<string>>`

Get spelling suggestions for a drug name.

### Drug classes (RxClass)

#### `classByDrugName(drugName: string, relaSource?: string): Promise<ReadonlyArray<RxClassDrugInfo>>`

Find drug classes associated with a drug name. Filter by relationship source (`'ATC'`, `'VA'`, `'MEDRT'`, `'FDASPL'`).

#### `classByRxcui(rxcui: string, relaSource?: string): Promise<ReadonlyArray<RxClassDrugInfo>>`

Find drug classes associated with an RxCUI. Filter by relationship source.

#### `classMembers(classId: string, relaSource?: string): Promise<ReadonlyArray<RxClassMember>>`

Fetch drug members of a drug class (e.g., all drugs in ATC class `'N02BA'`).

### Fuzzy search

#### `approximateTerm(name: string, options?: ApproximateTermOptions): Promise<ReadonlyArray<RxTermCandidate>>`

Fuzzy drug name lookup returning ranked candidates with scores.

**`ApproximateTermOptions`**

| Option       | Type     | Description                                      |
| ------------ | -------- | ------------------------------------------------ |
| `maxEntries` | `number` | Maximum number of candidates to return           |
| `option`     | `0 \| 1` | Search option (0 = best, 1 = all approximations) |

### History

#### `history(rxcui: string): Promise<RxConceptHistory>`

Get historical status of an RxCUI including remapping information.

### Properties

#### `allProperties(rxcui: string, properties: ReadonlyArray<string>): Promise<ReadonlyArray<RxProperty>>`

Fetch all properties for an RxCUI filtered by property category (e.g., `'NAMES'`, `'SOURCES'`).

### NDC mapping

#### `ndcByRxcui(rxcui: string): Promise<ReadonlyArray<string>>`

Get National Drug Code (NDC) identifiers mapped to an RXCUI.

## Error handling

```ts
import { RxNorm, RxNormHttpError } from '@ncbijs/rxnorm';

try {
  await rxnorm.properties('invalid');
} catch (err) {
  if (err instanceof RxNormHttpError) {
    console.error(`HTTP ${err.status}: ${err.body}`);
  }
}
```

The client automatically retries on HTTP 429, 500, 502, 503 and network errors with exponential backoff + jitter. RxNorm is rate-limited to 2 requests/second.

## Response types

### `RxConcept`

```ts
interface RxConcept {
  rxcui: string;
  name: string;
  tty: string;
}
```

### `RxConceptProperties`

```ts
interface RxConceptProperties {
  rxcui: string;
  name: string;
  synonym: string;
  tty: string;
  language: string;
  suppress: string;
}
```

### `DrugGroup`

```ts
interface DrugGroup {
  name: string;
  conceptGroup: Array<ConceptGroup>;
}
```

### `ConceptGroup`

```ts
interface ConceptGroup {
  tty: string;
  conceptProperties: Array<RxConcept>;
}
```

### `RxClassDrugInfo`

```ts
interface RxClassDrugInfo {
  rxcui: string;
  drugName: string;
  tty: string;
  classId: string;
  className: string;
  classType: string;
  rela: string;
  relaSource: string;
}
```

### `RxClassMember`

```ts
interface RxClassMember {
  rxcui: string;
  name: string;
  tty: string;
}
```

### `ApproximateTermOptions`

```ts
interface ApproximateTermOptions {
  maxEntries?: number;
  option?: 0 | 1;
}
```

### `RxTermCandidate`

```ts
interface RxTermCandidate {
  rxcui: string;
  name: string;
  score: number;
  rank: number;
}
```

### `RxConceptHistory`

```ts
interface RxConceptHistory {
  rxcui: string;
  name: string;
  status: string;
  remappedTo: Array<string>;
}
```

### `RxProperty`

```ts
interface RxProperty {
  category: string;
  name: string;
  value: string;
}
```
