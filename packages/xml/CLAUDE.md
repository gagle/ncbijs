---
package: '@ncbijs/xml'
purpose: 'Zero-dependency regex-based XML reader for NCBI formats — no HTTP, no streaming, no schema. Pure functions for tag/block/attribute extraction.'
layout: 'flat'
storage_mode: false
zero_dep: true
depends_on: []
used_by:
  - '@ncbijs/jats'
  - '@ncbijs/medgen'
  - '@ncbijs/pmc'
  - '@ncbijs/pubmed-xml'
  - '@ncbijs/pubtator'
  - '@ncbijs/sra'
exports:
  - 'readTag'
  - 'readTagWithAttributes'
  - 'readAllTags'
  - 'readAllTagsWithAttributes'
  - 'readBlock'
  - 'readAllBlocks'
  - 'readAllBlocksWithAttributes'
  - 'readAttribute'
  - 'removeAllBlocks'
  - 'stripTags'
  - 'decodeEntities'
  - 'BlockWithAttributes'
  - 'TagWithAttributes'
related_docs: []
last_audited: '2026-05-06'
---

# @ncbijs/xml

## Purpose

A tiny, pragmatic XML reader for NCBI's hand-edited XML formats
(PubMed, MEDLINE, JATS). Zero dependencies, zero validation, no DOM.
Just regex helpers for the patterns NCBI actually emits.

Built for **lenient extraction**, not validation. NCBI XML is
hand-curated and frequently violates schemas — a strict parser would
choke on real production data. This package extracts what's there
and ignores what isn't.

## When to use

- Parsing NCBI XML where you know the structure ahead of time
  (PubMed `<Article>`, JATS `<article>`, MeSH `<DescriptorRecord>`,
  ClinVar `<VariationArchive>`).
- Reading specific tags or attributes without instantiating a DOM.
- Building a higher-level NCBI XML parser
  (`@ncbijs/pubmed-xml`, `@ncbijs/jats` use this).

## When NOT to use

| Goal                                    | Use instead                                      |
| --------------------------------------- | ------------------------------------------------ |
| Validate against an XSD                 | `libxmljs` or `fast-xml-parser` with schema mode |
| Parse arbitrary unknown XML             | `fast-xml-parser` or `xml2js`                    |
| Stream a multi-GB XML file              | `sax`, `node-xml-stream-parser`, or compose this with `@ncbijs/pipeline` and a stream parser |
| Mutate / write XML                      | This package is read-only                        |

## Exports

| Export                          | Purpose                                                                       |
| ------------------------------- | ----------------------------------------------------------------------------- |
| `readTag(xml, tag)`             | First occurrence of `<tag>...</tag>` content as string. `null` if absent.    |
| `readTagWithAttributes(xml, tag)` | Same but also returns parsed attributes                                     |
| `readAllTags(xml, tag)`         | Every occurrence of `<tag>...</tag>` content as string array                  |
| `readAllTagsWithAttributes`     | Every occurrence with attributes                                              |
| `readBlock(xml, tag)`           | First `<tag>...</tag>` **including the wrapping tag** (preserves attributes) |
| `readAllBlocks(xml, tag)`       | Every block including wrapping tags                                           |
| `readAllBlocksWithAttributes`   | Every block + parsed attributes                                               |
| `readAttribute(xml, name)`      | Read a single attribute value from the first opening tag in `xml`             |
| `removeAllBlocks(xml, tag)`     | Strip every `<tag>...</tag>` block. Useful before extracting outer text.     |
| `stripTags(xml)`                | Remove all tags, return inner text                                            |
| `decodeEntities(text)`          | Decode `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#nnn;`, `&#xhh;`                 |

## API surface

All functions are pure and synchronous. They take an XML string and
a tag name (where applicable) and return strings, arrays, or
`{ text, attributes }` objects. **None of them throw on malformed
input** — they return `null` or `[]`.

```ts
import { readTag, readAllBlocks, readAttribute, decodeEntities } from '@ncbijs/xml';

const xml = '<Article><Title>Hello &amp; world</Title><Author>A</Author><Author>B</Author></Article>';

readTag(xml, 'Title');             // 'Hello &amp; world'
decodeEntities(readTag(xml, 'Title')!); // 'Hello & world'
readAllTags(xml, 'Author');        // ['A', 'B']
readAllBlocks(xml, 'Author');      // ['<Author>A</Author>', '<Author>B</Author>']
```

### `readTagWithAttributes(xml, tag)` example

```ts
const xml = '<Author Initials="JS" ValidYN="Y">Smith</Author>';
readTagWithAttributes(xml, 'Author');
// { text: 'Smith', attributes: { Initials: 'JS', ValidYN: 'Y' } }
```

## Cross-package wiring

- **Used by `@ncbijs/pubmed-xml`** to extract PubMed/MEDLINE article
  fields, author lists, MeSH headings, grants, etc.
- **Used by `@ncbijs/jats`** to extract JATS article body, abstract,
  authors, references.
- These two packages compose this one — extending the reader with
  domain-specific helpers (e.g. `parsePubmedDate`, `parseAuthor`).

This package itself imports nothing from `@ncbijs/*`. Stays
project-agnostic.

## Common pitfalls

1. **Regex against pathological XML.** This is *not* a parser. It
   reads tag boundaries with regex. If your input contains a tag with
   the target name inside a CDATA block or comment, it will be
   matched. NCBI XML rarely does this; if you're feeding arbitrary
   user XML, use a real parser instead.

2. **Nested tags with the same name.** `readTag(xml, 'Article')` for
   `<Article>...<Article>inner</Article>...</Article>` returns the
   shortest match (typically the outer's content, but tagging is
   left-to-right greedy — verify on your fixtures).

3. **Self-closing tags.** `<tag/>` returns empty string from
   `readTag`, **not** `null`. Use `readBlock` if you need to
   distinguish "absent" from "present-but-empty".

4. **Entity decoding is not automatic.** `readTag` returns the raw
   string including entities. Wrap with `decodeEntities()` before
   displaying to humans.

5. **Memory on huge files.** This package is not streaming. Calling
   `readAllBlocks` on a 1GB XML string will scan the entire string
   per call. For huge inputs, slice the file at known boundaries
   (`<PubmedArticle>` is delimited per record in PubMed XML) before
   calling per-record helpers.

## Testing

```bash
pnpm nx run @ncbijs/xml:test
```

Unit tests are pure-string fixtures. No HTTP, no E2E required.

## Files

```
packages/xml/src/
  index.ts            # public re-exports
  xml-reader.ts       # all reader functions
  xml-reader.spec.ts  # unit tests
```
