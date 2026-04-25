# @ncbijs/bioc

> **Runtime**: Browser + Node.js

Typed client for the BioC RESTful API. Retrieve annotated PubMed and PMC articles with named entity recognition (diseases, chemicals, genes, mutations).

## Installation

```bash
npm install @ncbijs/bioc
```

## Usage

```ts
import { pubmed, pmc } from '@ncbijs/bioc';

const doc = await pubmed('33533846');
console.log(doc.id); // '33533846'
for (const passage of doc.passages) {
  console.log(`${passage.infons.type}: ${passage.annotations.length} annotations`);
}

const xml = await pubmed('33533846', 'xml');
console.log(xml); // raw BioC XML

const pmcDoc = await pmc('PMC7096724');
console.log(pmcDoc.passages.length);
```

## API

#### `pubmed(pmid: string, format?: 'json'): Promise<BioCDocument>`

Get an annotated PubMed article as a parsed JSON document.

#### `pubmed(pmid: string, format: 'xml'): Promise<string>`

Get an annotated PubMed article as raw BioC XML.

#### `pmc(pmcid: string, format?: 'json'): Promise<BioCDocument>`

Get an annotated PMC article as a parsed JSON document.

#### `pmc(pmcid: string, format: 'xml'): Promise<string>`

Get an annotated PMC article as raw BioC XML.

#### `pubmedBatch(pmids: ReadonlyArray<string>, format?: 'json'): Promise<ReadonlyArray<BioCDocument>>`

Batch fetch BioC annotations for multiple PubMed articles via PubTator3.

#### `pubmedBatch(pmids: ReadonlyArray<string>, format: 'xml'): Promise<string>`

Batch fetch BioC annotations for multiple PubMed articles as raw BioC XML via PubTator3.

#### `pmcBatch(pmcids: ReadonlyArray<string>, format?: 'json'): Promise<ReadonlyArray<BioCDocument>>`

Batch fetch BioC annotations for multiple PMC articles via PubTator3.

#### `pmcBatch(pmcids: ReadonlyArray<string>, format: 'xml'): Promise<string>`

Batch fetch BioC annotations for multiple PMC articles as raw BioC XML via PubTator3.

#### `entitySearch(query: string, type?: string): Promise<ReadonlyArray<EntitySearchResult>>`

Search for biomedical entities by name using the PubTator3 autocomplete API. Optionally filter by entity type (e.g., `'gene'`, `'disease'`, `'chemical'`).

## Error handling

```ts
import { pubmed } from '@ncbijs/bioc';

try {
  await pubmed('0000000');
} catch (err) {
  if (err instanceof Error) {
    console.error(err.message);
  }
}
```

## Response types

### `BioCDocument`

```ts
interface BioCDocument {
  id: string;
  passages: Array<BioCPassage>;
}
```

### `BioCPassage`

```ts
interface BioCPassage {
  offset: number;
  text: string;
  infons: Record<string, string>;
  annotations: Array<BioCAnnotation>;
}
```

### `BioCAnnotation`

```ts
interface BioCAnnotation {
  id: string;
  text: string;
  infons: Record<string, string>;
  locations: Array<BioCLocation>;
}
```

### `BioCLocation`

```ts
interface BioCLocation {
  offset: number;
  length: number;
}
```

### `EntitySearchResult`

```ts
interface EntitySearchResult {
  identifier: string;
  name: string;
  type: string;
}
```

### `BioCFormat`

```ts
type BioCFormat = 'json' | 'xml';
```
