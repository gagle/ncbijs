---
package: '@ncbijs/jats'
purpose: 'Parser for JATS XML (NISO Z39.96) full-text articles with markdown, plain-text, and RAG chunking output. Pure functions, no HTTP.'
layout: 'flat'
storage_mode: false
zero_dep: false
depends_on:
  - '@ncbijs/xml'
used_by:
  - '@ncbijs/pmc'
related_docs:
exports:
  - 'parseJATS'
  - 'toMarkdown'
  - 'toPlainText'
  - 'toChunks'
  - 'JATSArticle'
  - 'Front'
  - 'Back'
  - 'Section'
  - 'Author'
  - 'ArticleMeta'
  - 'JournalMeta'
  - 'PartialDate'
  - 'Reference'
  - 'Figure'
  - 'Table'
  - 'Chunk'
  - 'ChunkOptions'
last_audited: '2026-03-26'
---

# @ncbijs/jats

## Purpose

Pure-function parser for JATS (Journal Article Tag Suite) XML — the
NISO Z39.96 standard used by PMC and most modern publishers for
full-text journal articles. Produces a structured `JATSArticle`
(`front` / `body` / `back`) and offers three converters:

- `toMarkdown(article)` — section headings, GitHub-flavoured tables,
  numbered references.
- `toPlainText(article)` — depth-aware indentation, pipe-joined table
  rows.
- `toChunks(article, options?)` — token-bounded overlapping chunks
  for RAG / embedding pipelines, carrying section metadata.

No HTTP, no I/O, no NCBI coupling. Input is a JATS XML string from
**any** source (PMC efetch, JATS archives, BioC roundtrips, the
NLM bulk distributions, third-party publishers).

**Spec.** NISO Z39.96 (https://jats.nlm.nih.gov/). PMC ships JATS
versions 1.0–1.4; the parser handles all of them. JATS defines two
tag sets — **Archiving** (used by PMC, fully supported here) and
**Publishing** (subset, more restrictive — also accepted because it
is structurally a subset of Archiving).

## When to use

- Convert PMC / publisher JATS XML to Markdown or plain text.
- Build RAG chunks from full-text articles with section context.
- Extract structured `Front` / `Back` / `Section` data for indexing.
- Use as the parsing layer underneath a higher-level fetcher.

## When NOT to use

| If you want to                                       | Use instead                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------- |
| Fetch JATS by PMCID and parse in one step            | `@ncbijs/pmc` (`pmc.fetch()` returns a `FullTextArticle`)        |
| Parse PubMed XML (different schema, `<PubmedArticle>`) | `@ncbijs/pubmed-xml`                                             |
| Render a citation string                             | `@ncbijs/cite`                                                   |
| Parse the BioC XML interchange format                | `@ncbijs/bioc`                                                   |
| Read tags / attributes out of arbitrary XML          | `@ncbijs/xml` (this package builds on it)                        |

## Exports

| Export         | Kind      | Purpose                                                                |
| -------------- | --------- | ---------------------------------------------------------------------- |
| `parseJATS`    | function  | `(xml: string) => JATSArticle`. Throws on empty input or no `<article>`|
| `toMarkdown`   | function  | `(article: JATSArticle) => string`                                     |
| `toPlainText`  | function  | `(article: JATSArticle) => string`                                     |
| `toChunks`     | function  | `(article: JATSArticle, options?: ChunkOptions) => ReadonlyArray<Chunk>` |
| `JATSArticle`  | interface | `{ front: Front; body: ReadonlyArray<Section>; back: Back }`           |
| `Front`        | interface | `{ journal: JournalMeta; article: ArticleMeta }`                       |
| `Back`         | interface | `{ references; acknowledgements?; appendices? }`                       |
| `Section`      | interface | Body section — title, depth, paragraphs, tables, figures, subsections  |
| `ArticleMeta`  | interface | Article-level front matter (title, authors, abstract, identifiers, …)  |
| `JournalMeta`  | interface | `{ title, isoAbbrev?, publisher?, issn? }`                             |
| `Author`       | interface | Name parts, ORCID, affiliations                                        |
| `PartialDate`  | interface | `{ year, month?, day? }`                                               |
| `Reference`    | interface | One bibliographic entry from `<back><ref-list>`                        |
| `Figure`       | interface | `{ id, label, caption }`                                               |
| `Table`        | interface | `{ caption, headers, rows }`                                           |
| `Chunk`        | interface | `{ text, section, tokenCount, metadata }`                              |
| `ChunkOptions` | interface | `{ maxTokens?, overlap?, includeSectionTitle? }`                       |

## API surface

### `parseJATS(xml: string): JATSArticle`

```ts
const article = parseJATS(jatsXmlString);
article.front.article.title;
article.front.article.authors;       // ReadonlyArray<Author>
article.body;                        // top-level <sec> elements
article.back.references;
article.back.acknowledgements;       // optional
article.back.appendices;             // optional
```

Throws `Error('Empty input')` on whitespace-only input and
`Error('Invalid JATS XML: no <article> element found')` if the root
`<article>` cannot be located.

Internals: descends through `<front>` (journal-meta + article-meta),
walks `<body>` recursively (each `<sec>` produces a `Section` with
`depth = parent.depth + 1`), then collects `<back>` references,
acknowledgements, and appendices. Uses `@ncbijs/xml` primitives
(`readBlock`, `readAllBlocks`, `readAllBlocksWithAttributes`,
`readTag`, `removeAllBlocks`, `decodeEntities`) — never instantiates
a real DOM.

### `toMarkdown(article: JATSArticle): string`

Emits:

- `# <title>` followed by `**Authors:** …` (omitted when empty).
- `## Abstract` if `front.article.abstract` is set.
- One section per body element. Heading level = `min(depth, 6)`.
- GitHub-flavoured tables (`| header |` rows, `| --- |` separator).
- Figures rendered inline; references rendered as a numbered list.

### `toPlainText(article: JATSArticle): string`

Same content as Markdown but stripped of fence markers. Sections are
indented by depth, tables join cells with `|`, figures appear as
`[Figure <label>: <caption>]`.

### `toChunks(article, options?): ReadonlyArray<Chunk>`

Word-based chunker (no real tokenizer; `tokenCount` is
whitespace-split word count). Each `Chunk` carries:

```ts
{
  text: string;
  section: string;          // section.title (not a path)
  tokenCount: number;
  metadata: { depth: number };
}
```

Algorithm: depth-first walk of `article.body`. For each `Section`
with non-empty `paragraphs`, join paragraphs with `\n\n`, optionally
prepend the section title, then split into windows of `maxTokens`
words sliding by `step = max(1, maxTokens - overlap)`. Subsections
recurse independently — they do not append to the parent's chunks.
Tables and figures are **not** included in chunks (only
`paragraphs`).

| Option                | Type      | Default | Effect                                              |
| --------------------- | --------- | ------- | --------------------------------------------------- |
| `maxTokens`           | `number`  | `512`   | Max words per chunk                                 |
| `overlap`             | `number`  | `50`    | Words shared with the previous chunk                |
| `includeSectionTitle` | `boolean` | `true`  | Prepend `<title>\n\n` to each chunk                 |

## Cross-package wiring

- **Imports.** Only `@ncbijs/xml` (text-level XML primitives).
  No HTTP, no rate limiter, no DOM library.
- **Used by.**
  - `@ncbijs/pmc/src/http/pmc.ts` — calls `parseJATS` on efetch
    output and forwards `toMarkdown` / `toPlainText` / `toChunks`
    via the `pmcToMarkdown` / `pmcToPlainText` / `pmcToChunks`
    wrappers.
  - `@ncbijs/pmc/src/interfaces/pmc.interface.ts` — type-imports
    `Front`, `Back`, `Section`, `Chunk`, `ChunkOptions` to compose
    the `FullTextArticle` shape and re-export chunk types.
- **Composes with.** Anything that produces JATS XML — bulk
  archives, third-party publisher feeds, `@ncbijs/pipeline` ETL
  flows that load PMC OA dumps.

## Common pitfalls

1. **`Chunk.section` is a bare title, not a path.** The current
   implementation stores only the leaf section's `title` string —
   not a hierarchical path like `"Introduction > Background"` (an
   earlier doc draft suggested otherwise). If you need the full
   path, walk `article.body` yourself before chunking and synthesise
   it. Don't write code that substring-searches `>` in
   `Chunk.section` — it won't be there.

2. **`tokenCount` is word count, not real tokens.** The chunker uses
   `text.split(/\s+/).filter(Boolean).length` as a stand-in. For
   tiktoken-accurate counts, run a real tokenizer over `chunk.text`
   after the fact. The default `maxTokens: 512` is a generous
   under-estimate of tiktoken tokens (~600–700 for English prose).

3. **Tables and figures are dropped from chunks.** `toChunks` only
   walks `section.paragraphs`. Articles whose payload lives in
   `<table-wrap>` (review tables, methods grids) will produce
   empty / sparse chunks. Pre-flatten tables into paragraph text
   before chunking if you need them indexed.

4. **JATS allows arbitrarily deep `<sec>` nesting; `toMarkdown`
   caps headings at H6.** `Math.min(depth, 6)` is applied so depth
   ≥ 6 sections all render as `######`. The structural information
   is still present in `Section.depth` if you build a custom
   renderer.

5. **Inline `<xref>` and `<mml:math>` are stripped, not rendered.**
   The parser uses `removeAllBlocks` / regex strip to clean inline
   markup before extracting text. References inside paragraphs lose
   their bracketed numbering; equations collapse to surrounding
   prose. If you need them, drop down to `@ncbijs/xml` and parse
   the relevant blocks yourself.

6. **`parseJATS` requires a `<article>` root.** OAI-PMH responses
   wrap the article in `<record><metadata><article>…`. Pass the
   inner `<article>` block (use `readBlock(xml, 'article')` or
   `pmc.fetch()`, which already returns a normalised
   `FullTextArticle`) — feeding the OAI-PMH envelope directly
   throws.

7. **Use a real JATS / NLM-DTD parser for round-trip XML editing.**
   This package is read-only and lossy by design (no inline markup
   preservation, no namespace tracking, no DTD validation). For
   anything that needs to **emit** valid JATS, use a real XML / DOM
   library.

## Testing

```bash
pnpm nx run @ncbijs/jats:test
pnpm nx run ncbijs-e2e:e2e -- jats
pnpm nx run @ncbijs/jats:typecheck
pnpm nx run @ncbijs/jats:lint
pnpm nx run @ncbijs/jats:build
```

Specs are co-located. `parse-jats.spec.ts` (33 KB) is the deepest —
it covers every JATS element this package handles, including
edge-cases for missing `<title>`, mixed `<contrib>` types, and
back-matter variants. `to-markdown`, `to-plain-text`, and
`to-chunks` each have their own spec covering output shape and
boundary cases (heading depth cap, overlap=0, single-window
chunks).

## Files

```
packages/jats/src/
  index.ts                          # public re-exports
  parse-jats.ts                     # parseJATS(xml) → JATSArticle
  parse-jats.spec.ts
  to-markdown.ts                    # JATSArticle → Markdown string
  to-markdown.spec.ts
  to-plain-text.ts                  # JATSArticle → plain text string
  to-plain-text.spec.ts
  to-chunks.ts                      # JATSArticle + ChunkOptions → Chunk[]
  to-chunks.spec.ts
  interfaces/
    jats.interface.ts               # all public types
```
