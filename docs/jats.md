# @ncbijs/jats — JATS XML Full-Text Parser Spec Reference

## Overview

Parser for JATS (Journal Article Tag Suite) XML. Zero dependencies.

**Spec:** NISO Z39.96 — https://jats.nlm.nih.gov/
**Versions in PMC:** 1.0, 1.1, 1.2, 1.3, 1.4 (all must be handled)
**Tag sets:** Archiving (PMC uses this) and Publishing (subset, more restrictive)

## Public API

```
parseJATS(xml: string) → JATSArticle

JATSArticle:
  front: { journal: JournalMeta; article: ArticleMeta }
  body: ReadonlyArray<Section>
  back: { references: ReadonlyArray<Reference>; acknowledgements?: string; appendices?: ReadonlyArray<Section> }

  .toMarkdown() → string
  .toPlainText() → string
  .toChunks(options) → ReadonlyArray<Chunk>
```

## Section Type

```
Section:
  title: string
  depth: number           // 1, 2, 3... from nesting level
  paragraphs: ReadonlyArray<string>
  tables: ReadonlyArray<Table>
  figures: ReadonlyArray<Figure>
  subsections: ReadonlyArray<Section>  // recursive nesting

Table:
  caption: string
  headers: ReadonlyArray<string>
  rows: ReadonlyArray<ReadonlyArray<string>>

Figure:
  id: string
  label: string
  caption: string
```

## Chunk Type (for RAG)

```
Chunk:
  text: string
  section: string          // section title path: "Introduction > Background"
  tokenCount: number       // estimated token count
  metadata: Readonly<Record<string, unknown>>

ChunkOptions:
  maxTokens: number        // default: 512
  overlap: number          // default: 64
  includeSectionTitle: boolean  // default: true
```

## Chunking Algorithm

1. Walk sections depth-first
2. For each paragraph, estimate token count (word count \* 1.3)
3. If paragraph fits in current chunk, append
4. If not, split at sentence boundary closest to maxTokens
5. Overlap: repeat last N tokens at start of next chunk
6. Section titles prepended if `includeSectionTitle` is true
7. Tables serialized as pipe-delimited rows
8. Figures included as `[Figure N: caption]`

## Parsing Challenges

### Arbitrary Section Nesting

JATS allows `<sec>` elements nested to any depth. Each may or may not have a `<title>`.

### Inline References

`<xref>` elements appear mid-text: `cortisol levels<xref ref-type="bibr" rid="B12">12</xref>`
Must be cleaned to: `cortisol levels [12]` or stripped entirely.

### MathML

`<mml:math>` blocks may contain complex formulas.
Strategy: extract `<mml:annotation encoding="text">` as text fallback, or render as `[Formula]`.

### Tables with Markup

Tables may contain nested markup (bold, italic, subscript/superscript, even sub-tables).
Strategy: strip markup, extract plain text content.

### Supplementary Materials

`<supplementary-material>` elements contain links to external files.
Included in metadata but not in body text.

## toMarkdown() Strategy

- Section titles → `# Title` (depth → heading level)
- Paragraphs → plain text with double newline
- Tables → GitHub-flavored Markdown tables
- Figures → `![label](caption)`
- References → numbered list
- Inline `<xref>` → `[N]` superscript format

## toPlainText() Strategy

Same as Markdown but:

- No heading markers
- Tables as tab-delimited
- No image syntax
- Section titles as `=== TITLE ===` format
