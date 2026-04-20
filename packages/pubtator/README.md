<h1 align="center">@ncbijs/pubtator</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/pubtator"><img src="https://img.shields.io/npm/v/@ncbijs/pubtator" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/pubtator"><img src="https://img.shields.io/npm/dm/@ncbijs/pubtator" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/pubtator" alt="license" /></a>
</p>

<p align="center">
  TypeScript client for PubTator3 text mining — entity search and BioC annotation export.
</p>

---

## Why

PubTator3 has over 1 billion entity annotations across 36 million PubMed articles and 6 million PMC full-text articles. It identifies genes, diseases, chemicals, mutations, species, and cell lines. But the API has multiple layers (entity autocomplete, publication export) with different response formats.

`@ncbijs/pubtator` wraps them into a typed, promise-based client.

- **Entity search** — autocomplete entities by name with optional type filter
- **Publication search** — search PubTator-indexed publications
- **BioC export** — export annotations in BioC XML or JSON
- **Free-text annotation** — annotate arbitrary text with entity recognition
- **TSV parsing** — parse PubTator tab-separated annotation format

## Install

```bash
npm install @ncbijs/pubtator
```

## Quick start

```typescript
import { PubTator } from '@ncbijs/pubtator';

const pubtator = new PubTator();

// Search for gene entities
const genes = await pubtator.findEntity('BRCA1', 'gene');
console.log(genes[0].name); // "BRCA1"

// Export BioC annotations for PubMed articles
const bioc = await pubtator.export(['33024307', '32919527']);
for (const doc of bioc.documents) {
  for (const passage of doc.passages) {
    console.log(passage.annotations);
  }
}
```

## API

### `new PubTator()`

Creates a new PubTator3 client. No configuration required.

### `findEntity(query, entityType?)`

Search entities by name via the PubTator3 autocomplete API.

```typescript
const results = await pubtator.findEntity('aspirin', 'chemical');
```

| Parameter    | Type         | Required | Description                        |
| ------------ | ------------ | -------- | ---------------------------------- |
| `query`      | `string`     | Yes      | Entity name or partial name.       |
| `entityType` | `EntityType` | No       | Filter by entity type (see below). |

Returns `Promise<ReadonlyArray<EntityMatch>>`.

#### `EntityType` values

| Constant                | API value     |
| ----------------------- | ------------- |
| `ENTITY_TYPES.Gene`     | `'gene'`      |
| `ENTITY_TYPES.Disease`  | `'disease'`   |
| `ENTITY_TYPES.Chemical` | `'chemical'`  |
| `ENTITY_TYPES.Variant`  | `'variant'`   |
| `ENTITY_TYPES.Species`  | `'species'`   |
| `ENTITY_TYPES.CellLine` | `'cell_line'` |

### `search(query, options?)`

Search PubTator-indexed publications by text.

```typescript
const results = await pubtator.search('BRCA1 breast cancer', { page: 1, pageSize: 10 });
console.log(results.total);
```

| Parameter | Type            | Required | Description  |
| --------- | --------------- | -------- | ------------ |
| `query`   | `string`        | Yes      | Search text. |
| `options` | `SearchOptions` | No       | Pagination.  |

**`SearchOptions`**

| Option     | Type     | Default | Description       |
| ---------- | -------- | ------- | ----------------- |
| `page`     | `number` | --      | Page number.      |
| `pageSize` | `number` | --      | Results per page. |

Returns `Promise<SearchResult>`.

### `export(pmids, options?)`

Export BioC annotations for a list of PMIDs.

```typescript
const bioc = await pubtator.export(['33024307'], { format: 'xml', full: true });
```

| Parameter | Type                    | Required | Description                         |
| --------- | ----------------------- | -------- | ----------------------------------- |
| `pmids`   | `ReadonlyArray<string>` | Yes      | PubMed IDs to export.               |
| `options` | `ExportOptions`         | No       | Format and full-text configuration. |

**`ExportOptions`**

| Option   | Type                | Default  | Description                                   |
| -------- | ------------------- | -------- | --------------------------------------------- |
| `format` | `'json'` \| `'xml'` | `'json'` | BioC output format.                           |
| `full`   | `boolean`           | --       | Include full-text annotations when available. |

Returns `Promise<BioDocument>`.

### `annotateByPmid(pmids, options?)`

Annotate articles by their PubMed IDs.

```typescript
const annotations = await pubtator.annotateByPmid(['33024307'], {
  concept: 'Gene',
  format: 'PubTator',
});
```

| Parameter | Type                    | Required | Description                |
| --------- | ----------------------- | -------- | -------------------------- |
| `pmids`   | `ReadonlyArray<string>` | Yes      | PubMed IDs to annotate.    |
| `options` | `AnnotateOptions`       | No       | Concept filter and format. |

**`AnnotateOptions`**

| Option    | Type                                 | Default | Description                                    |
| --------- | ------------------------------------ | ------- | ---------------------------------------------- |
| `concept` | `ConceptType`                        | --      | Filter to a specific concept type (see below). |
| `format`  | `'PubTator'` \| `'BioC'` \| `'JSON'` | --      | Output format.                                 |

Returns `Promise<string>`.

#### `ConceptType` values

| Constant                   | API value      |
| -------------------------- | -------------- |
| `CONCEPT_TYPES.Gene`       | `'Gene'`       |
| `CONCEPT_TYPES.Disease`    | `'Disease'`    |
| `CONCEPT_TYPES.Chemical`   | `'Chemical'`   |
| `CONCEPT_TYPES.Mutation`   | `'Mutation'`   |
| `CONCEPT_TYPES.Species`    | `'Species'`    |
| `CONCEPT_TYPES.BioConcept` | `'BioConcept'` |

### `annotateText(text, options?)`

Annotate free text with entity recognition.

```typescript
const annotated = await pubtator.annotateText(
  'BRCA1 is associated with breast cancer susceptibility.',
  { concept: 'Disease' },
);
```

| Parameter | Type              | Required | Description                |
| --------- | ----------------- | -------- | -------------------------- |
| `text`    | `string`          | Yes      | Free text to annotate.     |
| `options` | `AnnotateOptions` | No       | Concept filter and format. |

Returns `Promise<string>`.

### `parseBioC(input)`

Parse a BioC XML or JSON string into a typed `BioDocument`.

```typescript
import { parseBioC } from '@ncbijs/pubtator';

const bioc = parseBioC(xmlString);
```

| Parameter | Type     | Required | Description                       |
| --------- | -------- | -------- | --------------------------------- |
| `input`   | `string` | Yes      | BioC XML or JSON string to parse. |

Returns `BioDocument`.

### `parsePubTatorTsv(input)`

Parse PubTator tab-separated annotation format.

```typescript
import { parsePubTatorTsv } from '@ncbijs/pubtator';

const annotations = parsePubTatorTsv(tsvString);
```

| Parameter | Type     | Required | Description                   |
| --------- | -------- | -------- | ----------------------------- |
| `input`   | `string` | Yes      | PubTator TSV string to parse. |

Returns `ReadonlyArray<PubTatorAnnotation>`.

## Types

All types are exported for use in your own interfaces:

```typescript
import type {
  AnnotateOptions,
  Annotation,
  BioDocument,
  BioPassage,
  ConceptType,
  EntityMatch,
  EntityType,
  ExportOptions,
  PubTatorAnnotation,
  SearchOptions,
  SearchResult,
} from '@ncbijs/pubtator';
```

## License

MIT
