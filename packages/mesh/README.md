<h1 align="center">@ncbijs/mesh</h1>

> **Runtime**: Browser + Node.js

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/mesh"><img src="https://img.shields.io/npm/v/@ncbijs/mesh" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/mesh"><img src="https://img.shields.io/npm/dm/@ncbijs/mesh" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/mesh" alt="license" /></a>
</p>

<p align="center">
  MeSH vocabulary tree traversal, query expansion, and descriptor lookup.
</p>

---

## Why

Searching PubMed without MeSH expansion misses relevant articles. A search for "Stress" won't find articles tagged with "Stress, Psychological", "Stress, Physiological", or any of their narrower children.

`@ncbijs/mesh` provides tree traversal, query expansion, and descriptor lookup using the MeSH vocabulary. It can expand a term to all its descendant descriptors, build properly formatted PubMed MeSH queries, and traverse the tree hierarchy. SPARQL and lookup APIs support advanced online queries.

- **Tree traversal** — expand, ancestors, children, and full tree path
- **Query building** — format descriptors as PubMed `[Mesh]` queries with qualifier support
- **SPARQL** — execute arbitrary SPARQL queries against the official NLM MeSH endpoint
- **Online lookup** — search descriptors via the NLM MeSH Lookup API

## Install

```bash
npm install @ncbijs/mesh
```

## Quick start

```typescript
import { MeSH } from '@ncbijs/mesh';
import type { MeshTreeData } from '@ncbijs/mesh';

const treeData: MeshTreeData = {
  descriptors: [
    /* your MeSH data */
  ],
};
const mesh = new MeSH(treeData);

// Look up a descriptor by name or ID
const descriptor = mesh.lookup('Asthma');
console.log(descriptor?.id); // "D001249"
console.log(descriptor?.treeNumbers); // ["C08.127.108"]

// Expand to all descendant terms
const terms = mesh.expand('Asthma');
console.log(terms); // ["Asthma", "Asthma, Exercise-Induced", "Asthma, Occupational", ...]

// Build a PubMed MeSH query
const query = mesh.toQuery('Asthma');
console.log(query); // '"Asthma"[Mesh]'
```

## API

### `new MeSH(treeData)`

Creates a new MeSH instance from a tree dataset. The `MeshTreeData` object must contain a `descriptors` array conforming to the `MeshDescriptor` interface.

```typescript
import { MeSH } from '@ncbijs/mesh';

const mesh = new MeSH(treeData);
```

| Parameter  | Type           | Required | Description                                        |
| ---------- | -------------- | -------- | -------------------------------------------------- |
| `treeData` | `MeshTreeData` | Yes      | MeSH tree data containing an array of descriptors. |

### `lookup(descriptorIdOrName)`

Find a descriptor by ID (e.g., `"D001249"`) or name (case-insensitive).

```typescript
mesh.lookup('D001249'); // by ID
mesh.lookup('Asthma'); // by name
mesh.lookup('asthma'); // case-insensitive
```

| Parameter            | Type     | Required | Description                    |
| -------------------- | -------- | -------- | ------------------------------ |
| `descriptorIdOrName` | `string` | Yes      | Descriptor ID or display name. |

Returns `MeshDescriptor | null`.

### `expand(term)`

Expand a term to all its descendant descriptor names, including itself.

```typescript
const allTerms = mesh.expand('Asthma');
// ["Asthma", "Asthma, Exercise-Induced", "Asthma, Occupational", ...]
```

| Parameter | Type     | Required | Description                    |
| --------- | -------- | -------- | ------------------------------ |
| `term`    | `string` | Yes      | Descriptor ID or display name. |

Returns `ReadonlyArray<string>`. Throws if the term is not found.

### `ancestors(term)`

Get all ancestor descriptor names (from root to parent, excluding the term itself).

```typescript
const parents = mesh.ancestors('Asthma');
// ["Respiratory Tract Diseases", "Bronchial Diseases", ...]
```

| Parameter | Type     | Required | Description                    |
| --------- | -------- | -------- | ------------------------------ |
| `term`    | `string` | Yes      | Descriptor ID or display name. |

Returns `ReadonlyArray<string>`. Throws if the term is not found.

### `children(term)`

Get direct children only (one level down).

```typescript
const kids = mesh.children('Asthma');
// ["Asthma, Exercise-Induced", "Asthma, Occupational", ...]
```

| Parameter | Type     | Required | Description                    |
| --------- | -------- | -------- | ------------------------------ |
| `term`    | `string` | Yes      | Descriptor ID or display name. |

Returns `ReadonlyArray<string>`. Throws if the term is not found.

### `treePath(term)`

Full path from root to the term, including all ancestors and the term itself.

```typescript
const path = mesh.treePath('Asthma');
// ["Diseases", "Respiratory Tract Diseases", "Bronchial Diseases", "Asthma"]
```

| Parameter | Type     | Required | Description                    |
| --------- | -------- | -------- | ------------------------------ |
| `term`    | `string` | Yes      | Descriptor ID or display name. |

Returns `ReadonlyArray<string>`. Throws if the term is not found.

### `toQuery(term)`

Format a descriptor as a PubMed MeSH query string. Supports qualifier abbreviations with slash syntax.

```typescript
mesh.toQuery('Asthma'); // '"Asthma"[Mesh]'
mesh.toQuery('Asthma/DT'); // '"Asthma/Drug Therapy"[Mesh]'
```

| Parameter | Type     | Required | Description                                                   |
| --------- | -------- | -------- | ------------------------------------------------------------- |
| `term`    | `string` | Yes      | Descriptor name, ID, or `"name/qualifier"` with abbreviation. |

Returns `string`. Throws if the descriptor is not found.

### `sparql(query)`

Execute a SPARQL query against the official NLM MeSH SPARQL endpoint (`https://id.nlm.nih.gov/mesh/sparql`).

```typescript
const result = await mesh.sparql(`
  SELECT ?descriptor ?label WHERE {
    ?descriptor a meshv:TopicalDescriptor .
    ?descriptor rdfs:label ?label .
    FILTER(CONTAINS(LCASE(?label), "asthma"))
  } LIMIT 10
`);

for (const binding of result.results.bindings) {
  console.log(binding.label.value);
}
```

| Parameter | Type     | Required | Description          |
| --------- | -------- | -------- | -------------------- |
| `query`   | `string` | Yes      | SPARQL query string. |

Returns `Promise<SparqlResult>`.

### `lookupOnline(query)`

Search descriptors via the NLM MeSH Lookup API. Returns descriptors with basic metadata (no tree numbers or qualifiers).

```typescript
const descriptors = await mesh.lookupOnline('asthma');
console.log(descriptors[0].name); // "Asthma"
```

| Parameter | Type     | Required | Description  |
| --------- | -------- | -------- | ------------ |
| `query`   | `string` | Yes      | Search term. |

Returns `Promise<ReadonlyArray<MeshDescriptor>>`.

## Storage mode

Search locally stored MeSH descriptors with the same API — no network, no rate limits.

```ts
import { MeSH } from '@ncbijs/mesh';
import { DuckDbFileStorage } from '@ncbijs/store';

const storage = await DuckDbFileStorage.open('./ncbijs.duckdb');
const mesh = MeSH.fromStorage(storage);

const descriptors = await mesh.lookupOnline('Asthma');
```

### Available methods in storage mode

| Method           | Supported |
| ---------------- | --------- |
| `lookupOnline()` | Yes       |
| `lookup()`       | No        |
| `expand()`       | No        |
| `ancestors()`    | No        |
| `children()`     | No        |
| `treePath()`     | No        |
| `toQuery()`      | No        |
| `sparql()`       | No        |

Methods not available in storage mode throw a `StorageModeError`.

## Types

All types are exported for use in your own interfaces:

```typescript
import type {
  MeshDescriptor,
  MeshQualifier,
  MeshTreeData,
  SparqlBinding,
  SparqlResult,
} from '@ncbijs/mesh';
```

### `MeshDescriptor`

```typescript
interface MeshDescriptor {
  readonly id: string;
  readonly name: string;
  readonly treeNumbers: ReadonlyArray<string>;
  readonly qualifiers: ReadonlyArray<Readonly<MeshQualifier>>;
  readonly pharmacologicalActions: ReadonlyArray<string>;
  readonly supplementaryConcepts: ReadonlyArray<string>;
}
```

### `MeshQualifier`

```typescript
interface MeshQualifier {
  readonly name: string;
  readonly abbreviation: string;
}
```
