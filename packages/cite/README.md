<h1 align="center">@ncbijs/cite</h1>

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/cite"><img src="https://img.shields.io/npm/v/@ncbijs/cite" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/cite"><img src="https://img.shields.io/npm/dm/@ncbijs/cite" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/cite" alt="license" /></a>
</p>

<p align="center">
  Citation formatting via the NCBI Literature Citation Exporter — RIS, MEDLINE, CSL-JSON, and pre-rendered citations (AMA, APA, MLA, NLM).
</p>

---

## Why

Generating correctly formatted citations is error-prone — each style has its own rules for author ordering, date formatting, journal abbreviation, and punctuation. NCBI's Citation Exporter API renders authoritative citations directly from their article metadata.

`@ncbijs/cite` wraps it with typed functions and built-in rate limiting.

- **4 citation formats** — RIS, MEDLINE, CSL-JSON, Citation (pre-rendered AMA/APA/MLA/NLM)
- **2 sources** — PubMed and PMC
- **Built-in rate limiting** — 334ms delay between requests in batch mode
- **Format-dependent return types** — `csl` returns `CSLData`, `citation` returns `CitationData`, others return `string`
- **Zero dependencies** — just `fetch`

## Install

```bash
npm install @ncbijs/cite
```

## Quick start

```typescript
import { cite } from '@ncbijs/cite';

// Get a MEDLINE citation for a PubMed article
const medline = await cite('33024307', 'medline');
console.log(medline);

// Get structured CSL-JSON data
const csl = await cite('33024307', 'csl');
console.log(csl.title);
console.log(csl.author);
console.log(csl.DOI);

// Get pre-rendered citations in APA, MLA, AMA, and NLM styles
const rendered = await cite('33024307', 'citation');
console.log(rendered.apa.format);
console.log(rendered.mla.format);
```

## API

### `cite(id, format, source?)`

Fetch a single citation.

```typescript
const ris = await cite('33024307', 'ris');
const medline = await cite('33024307', 'medline');
const csl = await cite('33024307', 'csl'); // returns CSLData
const rendered = await cite('33024307', 'citation'); // returns CitationData
const pmcCite = await cite('7886120', 'ris', 'pmc');
```

| Parameter | Type             | Required | Description                          |
| --------- | ---------------- | -------- | ------------------------------------ |
| `id`      | `string`         | Yes      | PMID or numeric PMC ID.              |
| `format`  | `CitationFormat` | Yes      | Output format (see below).           |
| `source`  | `CitationSource` | No       | Article source. Default: `'pubmed'`. |

Returns `Promise<string>` for `ris` and `medline`, `Promise<CSLData>` for `csl`, `Promise<CitationData>` for `citation`.

#### `CitationFormat` values

| Value        | Description                                                    |
| ------------ | -------------------------------------------------------------- |
| `'ris'`      | RIS (Research Information Systems)                             |
| `'medline'`  | MEDLINE display format                                         |
| `'csl'`      | CSL-JSON (returns typed `CSLData`)                             |
| `'citation'` | Pre-rendered AMA, APA, MLA, NLM (returns typed `CitationData`) |

#### `CitationSource` values

| Value      | Description      |
| ---------- | ---------------- |
| `'pubmed'` | PubMed (default) |
| `'pmc'`    | PubMed Central   |

### `citeMany(ids, format, source?)`

Iterate over citations for multiple IDs with automatic 334ms rate limiting between requests.

```typescript
import { citeMany } from '@ncbijs/cite';

const ids = ['33024307', '32919527', '31602479'];

for await (const { id, citation } of citeMany(ids, 'ris')) {
  console.log(`${id}: ${citation}`);
}
```

| Parameter | Type                    | Required | Description                          |
| --------- | ----------------------- | -------- | ------------------------------------ |
| `ids`     | `ReadonlyArray<string>` | Yes      | PMIDs or numeric PMC IDs.            |
| `format`  | `CitationFormat`        | Yes      | Output format.                       |
| `source`  | `CitationSource`        | No       | Article source. Default: `'pubmed'`. |

Returns `AsyncIterableIterator<{ id: string; citation: string | CSLData | CitationData }>`.

## Examples

### Batch export to RIS

```typescript
import { citeMany } from '@ncbijs/cite';

const pmids = ['33024307', '32919527', '31602479'];
const risEntries: Array<string> = [];

for await (const { citation } of citeMany(pmids, 'ris')) {
  risEntries.push(citation as string);
}

const risFile = risEntries.join('\n');
```

### Structured metadata via CSL-JSON

```typescript
const csl = await cite('33024307', 'csl');

console.log(csl.type); // "article-journal"
console.log(csl.title); // "Database resources of the ..."
console.log(csl.author[0].family); // "Sayers"
console.log(csl.DOI); // "10.1093/nar/gkaa941"
console.log(csl.PMID); // "33095870"
```

### Pre-rendered citation styles

```typescript
const rendered = await cite('33024307', 'citation');

console.log(rendered.apa.format); // APA 7th edition
console.log(rendered.mla.format); // MLA 9th edition
console.log(rendered.ama.format); // AMA style
console.log(rendered.nlm.format); // NLM style
```

## Types

All types are exported for use in your own interfaces:

```typescript
import type {
  CitationData,
  CitationFormat,
  CitationSource,
  CitationStyle,
  CSLData,
} from '@ncbijs/cite';
```

### `CSLData`

```typescript
interface CSLData {
  readonly type: string;
  readonly id: string;
  readonly title: string;
  readonly author: ReadonlyArray<Readonly<{ family: string; given: string }>>;
  readonly issued: Readonly<{ 'date-parts': ReadonlyArray<ReadonlyArray<number>> }>;
  readonly 'container-title'?: string;
  readonly volume?: string;
  readonly issue?: string;
  readonly page?: string;
  readonly DOI?: string;
  readonly PMID?: string;
  readonly PMCID?: string;
  readonly URL?: string;
  readonly abstract?: string;
}
```

### `CitationData`

```typescript
interface CitationData {
  readonly id: string;
  readonly ama: CitationStyle;
  readonly apa: CitationStyle;
  readonly mla: CitationStyle;
  readonly nlm: CitationStyle;
}

interface CitationStyle {
  readonly orig: string;
  readonly format: string;
}
```

## License

MIT
