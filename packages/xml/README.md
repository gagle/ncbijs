<h1 align="center">@ncbijs/xml</h1>

> **Runtime**: Browser + Node.js

<p align="center">
  <a href="https://www.npmjs.com/package/@ncbijs/xml"><img src="https://img.shields.io/npm/v/@ncbijs/xml" alt="npm version" /></a>
  <a href="https://www.npmjs.com/package/@ncbijs/xml"><img src="https://img.shields.io/npm/dm/@ncbijs/xml" alt="npm downloads" /></a>
  <a href="https://github.com/gagle/ncbijs/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/@ncbijs/xml" alt="license" /></a>
</p>

<p align="center">
  Zero-dependency regex-based XML reader for NCBI document formats.
</p>

---

## Why

DOM parsers like DOMParser or xml2js are heavy dependencies that need a runtime or polyfills. NCBI XML responses have predictable, well-documented structure — a targeted regex reader is faster, lighter, and works everywhere.

`@ncbijs/xml` extracts tags, blocks, and attributes from NCBI XML without external dependencies or platform assumptions.

- **Tag extraction** — text content of leaf elements
- **Block extraction** — full inner content including nested tags, with correct handling of same-name nesting
- **Attribute reading** — attribute values from opening tags, with entity decoding
- **Entity decoding** — `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, and numeric entities (`&#x...;`, `&#...;`)
- **Tag stripping** — remove all XML tags and decode entities in one call

## Install

```bash
npm install @ncbijs/xml
```

## Quick start

```typescript
import { readTag, readBlock, readAllTags, stripTags } from '@ncbijs/xml';

const xml = `
<PubmedArticle>
  <MedlineCitation>
    <PMID>12345678</PMID>
    <Article>
      <ArticleTitle>A <i>novel</i> approach</ArticleTitle>
      <Language>eng</Language>
    </Article>
  </MedlineCitation>
</PubmedArticle>`;

readTag(xml, 'PMID');
// => '12345678'

readBlock(xml, 'ArticleTitle');
// => 'A <i>novel</i> approach'

stripTags('A <i>novel</i> approach');
// => 'A novel approach'

readAllTags(xml, 'Language');
// => ['eng']
```

## API

### `readTag(xml, tagName)`

Extract the text content of the first matching tag. Only captures text between the open and close tags — no nested elements.

```typescript
readTag('<PMID Version="1">12345678</PMID>', 'PMID');
// => '12345678'
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to search. |
| `tagName` | `string` | Tag name to find.     |

Returns `string | undefined`.

### `readAllTags(xml, tagName)`

Extract text content of all matching tags.

```typescript
readAllTags('<Keyword>cancer</Keyword><Keyword>genomics</Keyword>', 'Keyword');
// => ['cancer', 'genomics']
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to search. |
| `tagName` | `string` | Tag name to find.     |

Returns `ReadonlyArray<string>`.

### `readBlock(xml, tagName)`

Extract the full inner content (including nested tags) between the first matching open/close pair. Handles nested same-name tags correctly.

```typescript
readBlock('<Abstract><p>First.</p><p>Second.</p></Abstract>', 'Abstract');
// => '<p>First.</p><p>Second.</p>'
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to search. |
| `tagName` | `string` | Tag name to find.     |

Returns `string | undefined`.

### `readAllBlocks(xml, tagName)`

Extract inner content of all matching blocks.

```typescript
readAllBlocks('<sec><p>A</p></sec><sec><p>B</p></sec>', 'sec');
// => ['<p>A</p>', '<p>B</p>']
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to search. |
| `tagName` | `string` | Tag name to find.     |

Returns `ReadonlyArray<string>`.

### `readAttribute(xml, tagName, attrName)`

Extract the value of an attribute from the first matching tag.

```typescript
readAttribute('<PMID Version="1">12345678</PMID>', 'PMID', 'Version');
// => '1'
```

| Parameter  | Type     | Description             |
| ---------- | -------- | ----------------------- |
| `xml`      | `string` | XML string to search.   |
| `tagName`  | `string` | Tag name to find.       |
| `attrName` | `string` | Attribute name to read. |

Returns `string | undefined`.

### `readTagWithAttributes(xml, tagName)`

Extract text content and all attributes from the first matching tag.

```typescript
readTagWithAttributes('<Keyword MajorTopicYN="Y">cancer</Keyword>', 'Keyword');
// => { text: 'cancer', attributes: { MajorTopicYN: 'Y' } }
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to search. |
| `tagName` | `string` | Tag name to find.     |

Returns `TagWithAttributes | null`.

### `readAllTagsWithAttributes(xml, tagName)`

Extract text content and attributes from all matching tags.

```typescript
readAllTagsWithAttributes(
  '<DescriptorName UI="D009369" MajorTopicYN="Y">Neoplasms</DescriptorName>',
  'DescriptorName',
);
// => [{ text: 'Neoplasms', attributes: { UI: 'D009369', MajorTopicYN: 'Y' } }]
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to search. |
| `tagName` | `string` | Tag name to find.     |

Returns `ReadonlyArray<TagWithAttributes>`.

### `readAllBlocksWithAttributes(xml, tagName)`

Extract inner content and attributes from all matching blocks.

```typescript
readAllBlocksWithAttributes(
  '<article-id pub-id-type="doi">10.1234/example</article-id>',
  'article-id',
);
// => [{ content: '10.1234/example', attributes: { 'pub-id-type': 'doi' } }]
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to search. |
| `tagName` | `string` | Tag name to find.     |

Returns `ReadonlyArray<BlockWithAttributes>`.

### `stripTags(xml)`

Remove all XML tags from a string.

```typescript
stripTags('<p>A <b>bold</b> statement</p>');
// => 'A bold statement'
```

| Parameter | Type     | Description          |
| --------- | -------- | -------------------- |
| `xml`     | `string` | XML string to strip. |

Returns `string`.

### `removeAllBlocks(xml, tagName)`

Remove all occurrences of a block (open tag through close tag, including content). Also removes self-closing elements.

```typescript
removeAllBlocks('<body><xref>1</xref> text</body>', 'xref');
// => '<body> text</body>'
```

| Parameter | Type     | Description           |
| --------- | -------- | --------------------- |
| `xml`     | `string` | XML string to modify. |
| `tagName` | `string` | Tag name to remove.   |

Returns `string`.

### `decodeEntities(text)`

Decode XML entities: `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&apos;`, and numeric character references (`&#123;`, `&#x1F4A1;`).

```typescript
decodeEntities('Smith &amp; Jones &#x2014; 2024');
// => 'Smith & Jones — 2024'
```

| Parameter | Type     | Description     |
| --------- | -------- | --------------- |
| `text`    | `string` | Text to decode. |

Returns `string`.

## Types

All types are exported for use in your own interfaces:

```typescript
import type { TagWithAttributes, BlockWithAttributes } from '@ncbijs/xml';
```
