---
package: '@ncbijs/mesh'
purpose: 'NLM Medical Subject Headings (MeSH) vocabulary — tree traversal, query expansion, SPARQL, and storage-mode lookup. Split layout (http + bulk parsers).'
layout: 'split'
storage_mode: true
zero_dep: false
depends_on:
  - '@ncbijs/rate-limiter'
used_by:
  - '@ncbijs/etl'
  - '@ncbijs/http-mcp'
exports:
  - 'MeSH'
  - 'MeSHHttpError'
  - 'StorageModeError'
  - 'parseMeshDescriptorXml'
  - 'MeSHConfig'
  - 'MeshDescriptor'
  - 'MeshQualifier'
  - 'MeshTreeData'
  - 'SparqlBinding'
  - 'SparqlResult'
  - 'DataStorage'
related_docs:
last_audited: '2026-04-01'
---

# @ncbijs/mesh

## Purpose

The MeSH (Medical Subject Headings) vocabulary is the controlled
terminology for indexing biomedical literature in PubMed. This package
provides:

1. **Tree navigation** — descriptors are nodes in a hierarchical tree
   (`A03.556.875.500` style). Walk up (ancestors), down (children),
   sideways (siblings), or expand-all-descendants for query expansion.
2. **HTTP lookup** — descriptor metadata via NLM's `/mesh/lookup/descriptor`
   endpoint.
3. **SPARQL** — full-vocabulary queries against `id.nlm.nih.gov/mesh/sparql`.
4. **Storage mode** — when MeSH descriptors are pre-loaded into local
   storage (DuckDB via `@ncbijs/store`), the same `lookupOnline()` API
   reads from disk instead.
5. **Bulk parsing** — `parseMeshDescriptorXml` ingests the yearly
   `desc<year>.xml` distribution from NLM into typed `MeshDescriptor[]`.

### Record types in the MeSH vocabulary

| Kind                                  | Count   | Update cadence | Notes                                                              |
| ------------------------------------- | ------- | -------------- | ------------------------------------------------------------------ |
| **Descriptors**                       | ~30,000 | annual         | Main controlled vocabulary; 16 top-level categories (`A`–`N`, `Z`) |
| **Qualifiers** (subheadings)          | 78      | annual         | Constrained pairing — only allowed with specific descriptors       |
| **Supplementary Concept Records**     | many    | daily          | New chemicals, drugs, rare diseases; mapped to one or more descriptors |

Tree numbers are dotted paths: `C` = Diseases (top), `C12` =
Urogenital Diseases, `C12.050.078` = Bartholin's Glands Disease. A
single descriptor can carry **multiple** tree numbers (it appears in
multiple hierarchies) — e.g. `Asthma` has `C08.127.108` and
`C08.381.495.108`.

The ASCII MeSH distribution was **discontinued in January 2026**.
Current formats: XML (`desc<year>.xml`, what `parseMeshDescriptorXml`
consumes) and RDF / N-Triples.

## When to use

- Expand a search term into all narrower MeSH descriptors
  (`mesh.expand('Hypertension')` → array including `'Essential
  Hypertension'`, `'Renovascular Hypertension'`, ...).
- Build an Entrez search query from a tree subset
  (`mesh.toQuery(descriptors)`).
- Resolve PubMed `MeshHeading` records to canonical descriptor IDs.
- ETL the yearly MeSH XML distribution into DuckDB.

## When NOT to use

| Goal                                    | Use instead                                        |
| --------------------------------------- | -------------------------------------------------- |
| Search PubMed with a MeSH term          | `@ncbijs/pubmed` (it accepts MeSH terms directly)  |
| Run other Entrez E-utility queries      | `@ncbijs/eutils`                                   |
| Lookup arbitrary biomedical concepts    | `@ncbijs/medgen` (NCBI MedGen, broader scope)      |
| Format a citation                       | `@ncbijs/cite`                                     |

## Exports

| Export                       | Kind       | Purpose                                                            |
| ---------------------------- | ---------- | ------------------------------------------------------------------ |
| `MeSH`                       | class      | Main client; `new MeSH(treeData, config?)` or `MeSH.fromStorage()` |
| `MeSHHttpError`              | class      | Thrown on HTTP failures with status + body                         |
| `StorageModeError`           | class      | Thrown when an HTTP-only method is called on a storage instance    |
| `parseMeshDescriptorXml`     | function   | XML → `{ descriptors: MeshDescriptor[] }` (bulk parser)            |
| `MeSHConfig`                 | interface  | `{ maxRetries? }`                                                  |
| `MeshDescriptor`             | interface  | Tree node: `{ id, name, treeNumbers[], qualifiers[], ... }`        |
| `MeshQualifier`              | interface  | Allowed subheading attached to a descriptor                        |
| `MeshTreeData`               | interface  | `{ descriptors: MeshDescriptor[] }` — feed into constructor       |
| `SparqlBinding`              | interface  | One row of a SPARQL result                                         |
| `SparqlResult`               | interface  | `{ head, results: { bindings: SparqlBinding[] } }`                 |
| `DataStorage`                | interface  | Storage adapter contract for `fromStorage()`                       |

## API surface

### `new MeSH(treeData, config?)` — HTTP / in-memory mode

Takes pre-parsed tree data (typically from `parseMeshDescriptorXml`).
All methods available.

```ts
const xml = await fetch('https://nlmpubs.nlm.nih.gov/.../desc2026.xml').then(r => r.text());
const treeData = parseMeshDescriptorXml(xml);
const mesh = new MeSH(treeData, { maxRetries: 3 });
```

### `MeSH.fromStorage(storage): MeSH` — storage mode

Backs the instance with `DataStorage`. Only `lookupOnline()` works;
tree-navigation methods throw `StorageModeError`.

```ts
import { ReadableStorage } from '@ncbijs/store';
const storage = await ReadableStorage.open('ncbi.duckdb');
const mesh = MeSH.fromStorage(storage);
const descriptor = await mesh.lookupOnline('D006973'); // reads DuckDB
```

### Tree navigation (HTTP / in-memory mode only)

| Method                      | Purpose                                                                   |
| --------------------------- | ------------------------------------------------------------------------- |
| `lookup(idOrName)`          | Find a descriptor by ID or case-insensitive name                          |
| `expand(idOrName)`          | All descendants (transitive children)                                     |
| `ancestors(idOrName)`       | Path from root to this descriptor                                         |
| `children(idOrName)`        | Direct children only                                                      |
| `treePath(treeNumber)`      | Walk a `A03.556` tree number → ordered ancestors                          |
| `toQuery(descriptors)`      | Build an Entrez `MeSH Terms` boolean query string                         |

### `lookupOnline(descriptorId): Promise<MeshDescriptor | null>`

Both modes. HTTP mode hits `lookup/descriptor`; storage mode reads
DuckDB. Network/DB errors throw.

### `sparql(query: string): Promise<SparqlResult>`

HTTP mode only. POSTs to `id.nlm.nih.gov/mesh/sparql` with the given
SPARQL query; returns parsed JSON result.

```sparql
PREFIX mesh: <http://id.nlm.nih.gov/mesh/>
PREFIX meshv: <http://id.nlm.nih.gov/mesh/vocab#>
SELECT ?descriptor ?label WHERE {
  ?descriptor meshv:broaderDescriptor mesh:D013315 .
  ?descriptor rdfs:label ?label .
}
```

### `parseMeshDescriptorXml(xml: string): MeshTreeData`

Pure function (no HTTP). Parses the yearly NLM distribution
(`desc<year>.xml`) into typed objects. Use as input to the constructor.

## Configuration

| Field        | Type     | Default | Notes                                              |
| ------------ | -------- | ------- | -------------------------------------------------- |
| `maxRetries` | `number` | `3`     | Exponential backoff with jitter on 429 / 5xx       |

Rate limit is fixed at 3 req/s (NLM SPARQL endpoint policy). No API
key concept on the MeSH side.

## Storage mode

`fromStorage(storage)` accepts any object satisfying `DataStorage`
(structurally typed — no import from `@ncbijs/store` needed). The
contract is the minimal subset of read methods required to look up
descriptors by ID. `ReadableStorage` from `@ncbijs/store` satisfies it.

The MeSH DuckDB schema is populated via `@ncbijs/etl`'s `load('mesh',
sink)` pipeline — see `docs/pipeline-architecture.md`.

## Cross-package wiring

- **Imports.** `import { MeSH, parseMeshDescriptorXml } from '@ncbijs/mesh'`.
- **Used by `@ncbijs/etl`** in the `mesh` ETL job: chains
  `createHttpSource(NLM URL)` → `parseMeshDescriptorXml` → DuckDB sink.
- **Composes with `@ncbijs/store`** via `fromStorage()` for offline
  query mode.
- **Pairs with `@ncbijs/pubmed`** when expanding queries before search
  (call `mesh.expand()` then pass the union of names into
  `pubmed.search()`).

## Common pitfalls

1. **Calling tree methods on a storage-mode instance.** `mesh.lookup()`,
   `mesh.expand()`, etc. throw `StorageModeError` because the in-memory
   tree is empty. Use `lookupOnline()` for storage mode, or construct
   with `new MeSH(treeData)` for tree navigation.

2. **Yearly version skew.** MeSH ships annually (e.g. `desc2025.xml`,
   `desc2026.xml`). Tree numbers can change between years (descriptor
   moves in the hierarchy). Pin the year in your ETL pipeline and
   re-load when bumping.

3. **SPARQL endpoint rate limiting.** NLM has been known to block
   abusive clients. Keep `maxRetries` modest and don't parallelise
   SPARQL across multiple instances.

4. **`expand()` on broad terms is huge.** `expand('Diseases')` returns
   thousands of descriptors. Always pair with `limit` on downstream
   query consumers, or filter by tree depth.

5. **Case in `lookup(name)`.** The name index is case-insensitive but
   NLM's canonical names use specific capitalisation. Always read
   `descriptor.name` for the canonical form before logging or
   displaying.

## Testing

```bash
pnpm nx run @ncbijs/mesh:test
pnpm nx run ncbijs-e2e:e2e -- mesh
```

Bulk parser tests use a small inline XML fixture; HTTP tests stub
`fetch`. Storage-mode tests use an in-memory `DataStorage` mock.

## Files

```
packages/mesh/src/
  index.ts                                  # public re-exports
  interfaces/mesh.interface.ts              # shared types + StorageModeError
  http/
    mesh.ts                                 # MeSH class
    mesh-client.ts                          # fetchJson + MeSHHttpError
  bulk-parsers/
    parse-mesh-descriptor-xml.ts            # NLM XML → MeshTreeData
    __fixtures__/desc-sample.xml            # small test fixture
```
