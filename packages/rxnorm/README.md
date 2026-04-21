# @ncbijs/rxnorm

Typed client for the RxNorm REST API. Normalize drug names, look up concept properties, check drug-drug interactions, and map NDC codes with automatic rate limiting and retry logic.

## Installation

```bash
npm install @ncbijs/rxnorm
```

## Usage

```ts
import { RxNorm } from '@ncbijs/rxnorm';

const rxnorm = new RxNorm();

const rxcui = await rxnorm.rxcui('aspirin');
console.log(rxcui); // '1191'

const props = await rxnorm.properties('1191');
console.log(props.name); // 'aspirin'

const interactions = await rxnorm.interaction('1191');
for (const ix of interactions) {
  console.log(ix.description);
}

const related = await rxnorm.relatedByType('1191', ['SBD', 'SCD']);
for (const concept of related) {
  console.log(`${concept.rxcui}: ${concept.name}`);
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

#### `rxcui(name: string): Promise<string | undefined>`

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

### Interactions

#### `interaction(rxcui: string): Promise<ReadonlyArray<DrugInteraction>>`

Get drug-drug interactions for a concept.

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
  umlscui: string;
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

### `DrugInteraction`

```ts
interface DrugInteraction {
  description: string;
  severity: string;
  interactionConcept: Array<InteractionConcept>;
}
```

### `InteractionConcept`

```ts
interface InteractionConcept {
  rxcui: string;
  name: string;
  tty: string;
}
```
