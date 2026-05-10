---
package: '@ncbijs/pubmed-xml'
purpose: 'Spec-compliant pure parser for PubMed/MEDLINE XML and MEDLINE plain-text formats. No HTTP, no I/O — string in, typed PubmedArticle out. Plus a streaming variant for chunked input.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/xml'
used_by:
  - '@ncbijs/pubmed'
  - '@ncbijs/cite'
exports:
  - 'parsePubmedXml'
  - 'createPubmedXmlStream'
  - 'parseMedlineText'
  - 'AbstractContent'
  - 'AbstractSection'
  - 'ArticleIds'
  - 'Author'
  - 'CommentCorrection'
  - 'DataBank'
  - 'Grant'
  - 'JournalInfo'
  - 'Keyword'
  - 'MeshHeading'
  - 'MeshQualifier'
  - 'PartialDate'
  - 'PubmedArticle'
related_docs:
last_audited: '2026-04-16'
---

# @ncbijs/pubmed-xml

## Purpose

Parse the two formats NCBI emits for PubMed records:

- **PubmedArticleSet XML** — the standard EFetch response for `db=pubmed`,
  `rettype=xml`. Hand-curated, schema-violating in places, but stable
  in shape.
- **MEDLINE plain-text** — the legacy tagged format (`PMID- ...`,
  `TI  - ...`) returned by `rettype=medline`.

Both parsers return the same `PubmedArticle` shape, so downstream code
(citation formatting, indexing, full-text linking) doesn't need to know
which format it came from.

This package is the **canonical PubMed parser** in the ncbijs ecosystem.
Higher-level packages compose it; bulk pipelines stream into it.

**Spec references.**

- DTD: [`pubmed_250101.dtd`](http://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd)
- Element descriptions: [NLM bibliographic services](https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html)

`@ncbijs/xml` is intentionally lenient because real PubMed XML is
hand-curated and frequently violates its own DTD.

## When to use

- Parse an XML or MEDLINE response you already fetched (via
  `@ncbijs/eutils`, `@ncbijs/pubmed`, NCBI's FTP archives, or a raw
  `fetch`).
- Stream-parse a multi-MB EFetch response without buffering the whole
  body in memory (`createPubmedXmlStream`).
- Build a custom PubMed pipeline where you want the typed `PubmedArticle`
  shape but not the HTTP client of `@ncbijs/pubmed`.

## When NOT to use

| If you want to                                                     | Use instead                                       |
| ------------------------------------------------------------------ | ------------------------------------------------- |
| Search PubMed and parse the response in one call                   | `@ncbijs/pubmed` (fluent builder, wraps this pkg) |
| Format an article into a citation string (Vancouver/AMA/APA)       | `@ncbijs/cite` (consumes `PubmedArticle`)         |
| Parse JATS XML (PMC full text)                                     | `@ncbijs/jats`                                    |
| Parse a non-NCBI XML format                                        | `fast-xml-parser` or `xml2js`                     |
| Mutate or write PubMed XML                                         | This package is read-only                         |
| Read a single tag from XML you already understand                  | `@ncbijs/xml` directly                            |

## Exports

| Export                  | Kind     | Purpose                                                                            |
| ----------------------- | -------- | ---------------------------------------------------------------------------------- |
| `parsePubmedXml`        | function | Parse a `<PubmedArticleSet>` XML string → `ReadonlyArray<PubmedArticle>`           |
| `createPubmedXmlStream` | function | Async generator: yields `PubmedArticle` as `</PubmedArticle>` tags arrive          |
| `parseMedlineText`      | function | Parse MEDLINE-tagged text (`PMID-`, `TI  -`, ...) → `ReadonlyArray<PubmedArticle>` |
| `PubmedArticle`         | type     | Top-level article record returned by every parser                                  |
| `AbstractContent`       | type     | `{ structured, text, sections? }` — flat or labeled-sections abstract              |
| `AbstractSection`       | type     | One labeled section of a structured abstract                                       |
| `Author`                | type     | Person or `collectiveName` group, with affiliations                                |
| `JournalInfo`           | type     | Journal title, ISO abbreviation, ISSN, volume, issue                               |
| `PartialDate`           | type     | Date with optional `month`/`day` plus `season`/`raw` fallback                      |
| `MeshHeading`           | type     | MeSH descriptor + qualifiers + major-topic flag                                    |
| `MeshQualifier`         | type     | A single MeSH subheading                                                           |
| `ArticleIds`            | type     | `{ pmid, doi?, pmc?, pii?, mid? }`                                                 |
| `Grant`                 | type     | Funding grant (id, agency, country)                                                |
| `Keyword`               | type     | Author or NLM keyword with major-topic flag                                        |
| `CommentCorrection`     | type     | Errata / retraction reference                                                      |
| `DataBank`              | type     | Data bank submission (e.g., GenBank accessions)                                    |

The internal field-extractor functions (`extractAbstract`, `extractAuthors`,
`parseDateBlock`, `monthTextToNumber`, …) live in
`article-field-parsers.ts` and are **intentionally not re-exported**.
They are implementation details shared between the XML and MEDLINE
parsers.

## API surface

### `parsePubmedXml(xml): ReadonlyArray<PubmedArticle>`

```ts
import { parsePubmedXml } from '@ncbijs/pubmed-xml';

const articles = parsePubmedXml(xmlString);
articles[0].pmid;             // '12345678'
articles[0].abstract.text;    // flat text
articles[0].abstract.structured;  // true if <AbstractText Label="..."> sections
articles[0].mesh[0].descriptor;
```

Splits on `<PubmedArticle>` blocks via `@ncbijs/xml.readAllBlocks`. Each
article must contain `<MedlineCitation>` and `<MedlineCitation><Article>`
— **throws synchronously** if either is missing. Returns `[]` for empty
or non-PubmedArticleSet input.

### `createPubmedXmlStream(input): AsyncIterableIterator<PubmedArticle>`

```ts
const response = await fetch(efetchUrl);
const textStream = response.body!.pipeThrough(new TextDecoderStream());

for await (const article of createPubmedXmlStream(textStream)) {
  // process each article as it arrives
}
```

Buffers chunks until a `</PubmedArticle>` tag is seen, slices the article,
wraps it in a synthetic `<PubmedArticleSet>` envelope, and runs
`parsePubmedXml` on the single-record string. Yields each article in
order. **Throws** at end-of-stream if the buffer still contains an
unclosed `<PubmedArticle` (truncated response). Uses the Web Streams
API (`ReadableStream`) — not Node's `node:stream` — so the same code
runs in browsers and workers. SAX-style: constant memory regardless of
input size; designed for multi-GB MEDLINE bulk files.

### `parseMedlineText(text): ReadonlyArray<PubmedArticle>`

Splits on blank lines (`\n\s*\n`) into records, then walks each line
with `^([A-Z]{2,4})\s*-\s(.*)$` to build a `Map<tag, values>`, then
projects into the same `PubmedArticle` shape as the XML parser.

```ts
const medline = `
PMID- 12345678
TI  - A novel approach to cancer treatment
AU  - Smith J
DP  - 2024 Mar 15
AB  - This study demonstrates...
MH  - Neoplasms/*therapy
`;
const articles = parseMedlineText(medline);
```

Field coverage is **partial** vs. the XML parser — see pitfalls.

## Cross-package wiring

- **Imports.** `import { parsePubmedXml, ... } from '@ncbijs/pubmed-xml'`.
- **Built on `@ncbijs/xml`** — uses `readAllBlocks`, `readBlock`,
  `readTag`, `readAllTags`, `readTagWithAttributes`,
  `readAllBlocksWithAttributes`, `readAllTagsWithAttributes`,
  `decodeEntities`, `stripTags`. The XML reader is intentionally lenient
  because PubMed XML is hand-curated and frequently violates its DTD.
- **Used by:**
  - `@ncbijs/pubmed/src/pubmed.ts` — fluent search API; pipes EFetch XML
    through this parser.
  - `@ncbijs/pubmed/src/convert-article.ts` — converts a single
    `PubmedArticle` into the high-level shape exposed by
    `@ncbijs/pubmed`.
  - `@ncbijs/pubmed/src/query-builder.ts` — re-exports `PubmedArticle`
    type for builder return shapes.
  - `@ncbijs/cite/src/bulk-parsers/format-citation.ts` — formats a
    `PubmedArticle` into Vancouver/AMA/APA citation strings.
- **Not used by `@ncbijs/jats`.** PMC full-text uses JATS XML, which is
  a different format with its own parser package.

## Common pitfalls

1. **Not all field extractors are exported.** Functions like
   `extractAbstract`, `extractAuthors`, `parseDateBlock`,
   `monthTextToNumber` live in `article-field-parsers.ts` but are
   **not** re-exported from `index.ts`. If consumers need them, add
   them to the barrel — don't deep-import. Deep-imports bypass the
   public API contract and break on package layout changes.

2. **`parsePubmedXml` throws on malformed records.** Specifically when
   `<MedlineCitation>` or `<MedlineCitation><Article>` is missing. The
   streaming parser propagates these throws to the consumer of the
   async iterator. Wrap in `try/catch` or pre-validate input if
   processing untrusted XML.

3. **MEDLINE parser has reduced field coverage.** `commentsCorrections`
   and `dataBanks` are always `[]`. `mesh` qualifiers have empty
   `ui`. The XML parser is the source of truth — only fall back to
   MEDLINE text when XML is unavailable.

4. **`PartialDate.year` defaults to `0`.** When MEDLINE `DP` is empty
   or unparseable, `year` is `0` rather than `undefined`. Check for
   `year === 0` (not falsy) to detect missing dates — `year === 1`
   is a real (rare) value.

5. **Streaming parser is `</PubmedArticle>`-delimited.** Nested or
   doubled-up close tags inside an article body (rare in real PubMed
   XML, never in EFetch output) would split the article incorrectly.
   This is fine for NCBI EFetch but flag it for non-NCBI sources.

6. **Entity decoding inside titles only via `decodeEntities`.**
   `parsePubmedXml` decodes the title via `decodeEntities` + `stripTags`
   on the `<ArticleTitle>` block but not all sub-fields. Affiliations,
   keywords, and abstract sections may contain raw `&amp;` etc. —
   decode at the consumer when displaying to humans.

7. **MEDLINE `AID` parsing.** Only `[doi]` and `[pii]` markers are
   captured. Other AID types (`[pmc]`, `[pubmed]`) are ignored.
   PMC-IDs come from a separate MEDLINE tag in real exports — not
   currently extracted by `parseMedlineText`.

8. **Grant parser heuristic.** MEDLINE `GR` lines split on `/`; the
   parser distinguishes 3-part vs. 4-part grants by length. Real-world
   `GR` formats with extra slashes (e.g., embedded in agency names)
   may misalign — check `grants[].agency` looks sane in production
   data.

9. **`CommentsCorrections` `RefType` is an open string.** Common
   values include `ErratumIn`, `ErratumFor`, `RetractionIn`,
   `RetractionOf`, `UpdateIn`, `UpdateOf`, `CommentIn`, `CommentOn`,
   `RepublishedIn`, `RepublishedFrom`. Treat the field as `string`
   downstream — NLM occasionally adds new ref types without notice.

10. **`BookDocument` records are not parsed.** PubMed XML can carry
    `<BookDocument>` blocks (NCBI Books / Bookshelf entries) instead
    of `<MedlineCitation>`. Their structure differs (`Book`,
    `LocationLabel`, `Sections`, …) and `parsePubmedXml` will throw
    on them via the missing-`MedlineCitation` guard. Filter Book
    documents upstream if your input mixes the two.

## Testing

```bash
pnpm nx run @ncbijs/pubmed-xml:test
pnpm nx run @ncbijs/pubmed-xml:lint
pnpm nx run @ncbijs/pubmed-xml:typecheck
pnpm nx run @ncbijs/pubmed-xml:build
```

Three large unit specs live alongside their parsers:

- `parse-pubmed-xml.spec.ts` (~50 KB) — exhaustive XML field coverage
  with inline fixture strings for each edge case.
- `parse-medline-text.spec.ts` (~16 KB) — MEDLINE tag parsing,
  multi-line continuations, author name forms.
- `parse-pubmed-xml-stream.spec.ts` (~6 KB) — chunked-input streaming.

There is **no** `e2e/pubmed-xml.spec.ts` — live PubMed responses are
exercised indirectly through `e2e/pubmed.spec.ts` (which round-trips
`@ncbijs/pubmed` against the real API).

## Files

```
packages/pubmed-xml/src/
  index.ts                              # public re-exports
  parse-pubmed-xml.ts                   # parsePubmedXml (XML entry point)
  parse-pubmed-xml.spec.ts
  parse-pubmed-xml-stream.ts            # createPubmedXmlStream (async gen)
  parse-pubmed-xml-stream.spec.ts
  parse-medline-text.ts                 # parseMedlineText (MEDLINE entry point)
  parse-medline-text.spec.ts
  article-field-parsers.ts              # shared extract* helpers (not exported)
  interfaces/
    pubmed-article.interface.ts         # PubmedArticle + sub-types
```
