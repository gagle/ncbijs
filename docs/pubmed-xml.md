# @ncbijs/pubmed-xml — PubMed XML Parser Guide

## Overview

Parser for PubMed/MEDLINE XML and MEDLINE text format, compliant with the official PubMed DTD. Handles all edge cases in the DTD: structured abstracts, MedlineDate fallbacks, collective authors, multiple affiliations, and BookDocument elements. Zero dependencies.

**DTD:** `pubmed_250101.dtd` — http://dtd.nlm.nih.gov/ncbi/pubmed/out/pubmed_250101.dtd
**Element docs:** https://www.nlm.nih.gov/bsd/licensee/elements_descriptions.html

## Public API

```
parsePubmedXml(xml: string) → ReadonlyArray<PubmedArticle>
createPubmedXmlStream(input: ReadableStream) → AsyncIterableIterator<PubmedArticle>
parseMedlineText(text: string) → ReadonlyArray<PubmedArticle>
```

## PubmedArticle Domain Type

```
PubmedArticle:
  pmid: string
  title: string
  vernacularTitle?: string               // non-English original title
  abstract: AbstractContent
  authors: ReadonlyArray<Author>
  journal: JournalInfo
  publicationDate: PartialDate
  mesh: ReadonlyArray<MeshHeading>
  articleIds: ArticleIds
  publicationTypes: ReadonlyArray<string>
  grants: ReadonlyArray<Grant>
  keywords: ReadonlyArray<Keyword>
  commentsCorrections: ReadonlyArray<CommentCorrection>
  dataBanks: ReadonlyArray<DataBank>
  language: string
  dateRevised?: PartialDate
  dateCompleted?: PartialDate
```

## DTD Edge Cases to Handle

### 1. Abstracts: Structured vs Flat

**Structured (labeled sections):**

```xml
<Abstract>
  <AbstractText Label="BACKGROUND" NlmCategory="BACKGROUND">...</AbstractText>
  <AbstractText Label="METHODS" NlmCategory="METHODS">...</AbstractText>
  <AbstractText Label="RESULTS" NlmCategory="RESULTS">...</AbstractText>
</Abstract>
```

**Flat (single text):**

```xml
<Abstract>
  <AbstractText>Full abstract text here.</AbstractText>
</Abstract>
```

Domain type: `AbstractContent = { structured: boolean; text: string; sections?: AbstractSection[] }`

### 2. Dates: Multiple Formats

**Full date:**

```xml
<PubDate><Year>2024</Year><Month>Mar</Month><Day>15</Day></PubDate>
```

**Partial date:**

```xml
<PubDate><Year>2024</Year><Season>Winter</Season></PubDate>
```

**MedlineDate fallback (when Year/Month/Day aren't available):**

```xml
<PubDate><MedlineDate>2024 Mar-Apr</MedlineDate></PubDate>
```

Domain type: `PartialDate = { year: number; month?: number; day?: number; raw?: string }`

### 3. Authors: Individual vs Collective

**Individual:**

```xml
<Author><LastName>Smith</LastName><ForeName>John A</ForeName><Initials>JA</Initials>
  <AffiliationInfo><Affiliation>Harvard...</Affiliation></AffiliationInfo>
</Author>
```

**Collective:**

```xml
<Author><CollectiveName>WHO Consortium</CollectiveName></Author>
```

### 4. MeSH Headings with Qualifiers

```xml
<MeshHeading>
  <DescriptorName UI="D001249" MajorTopicYN="N">Asthma</DescriptorName>
  <QualifierName UI="Q000188" MajorTopicYN="Y">drug therapy</QualifierName>
  <QualifierName UI="Q000503" MajorTopicYN="N">physiopathology</QualifierName>
</MeshHeading>
```

### 5. ArticleId Variants

```xml
<ArticleIdList>
  <ArticleId IdType="pubmed">12345678</ArticleId>
  <ArticleId IdType="doi">10.1000/example</ArticleId>
  <ArticleId IdType="pmc">PMC1234567</ArticleId>
  <ArticleId IdType="pii">S0140-6736(24)00001-1</ArticleId>
  <ArticleId IdType="mid">NIHMS123456</ArticleId>
</ArticleIdList>
```

### 6. CommentsCorrectionsList

```xml
<CommentsCorrectionsList>
  <CommentsCorrections RefType="ErratumIn">
    <RefSource>J Example. 2024;10:100</RefSource>
    <PMID>99999999</PMID>
  </CommentsCorrections>
</CommentsCorrectionsList>
```

RefTypes: ErratumIn, ErratumFor, RetractionIn, RetractionOf, UpdateIn, UpdateOf, CommentIn, CommentOn, etc.

### 7. DataBankList + AccessionNumbers

```xml
<DataBankList>
  <DataBank><DataBankName>ClinicalTrials.gov</DataBankName>
    <AccessionNumberList><AccessionNumber>NCT01234567</AccessionNumber></AccessionNumberList>
  </DataBank>
</DataBankList>
```

### 8. Keywords with Owner

```xml
<KeywordList Owner="NOTNLM">
  <Keyword MajorTopicYN="N">cytokines</Keyword>
</KeywordList>
```

Owner: `NLM` (MeSH-derived) or `NOTNLM` (author-provided).

### 9. BookDocument (NCBI Books)

Distinct from MedlineCitation. Child elements: PMID, ArticleIdList, Book, LocationLabel, ArticleTitle, VernacularTitle, Pagination, Language, AuthorList, Abstract, Sections, KeywordList, etc.

## MEDLINE Text Format (2-letter tags)

```
PMID- 12345678
TI  - Article title here
AU  - Smith JA
AU  - Jones B
AB  - Abstract text here
MH  - Asthma/drug therapy*
DP  - 2024 Mar 15
TA  - J Example
VI  - 10
IP  - 3
PG  - 100-110
AID - 10.1000/example [doi]
PT  - Journal Article
GR  - R01 AI12345/AI/NIAID/United States
OT  - cytokines
```

## Streaming Parser

`createPubmedXmlStream()` uses SAX-style parsing:

- Constant memory regardless of input size
- Yields one `PubmedArticle` at a time
- Designed for MEDLINE bulk files (multiple GB)
- Uses `ReadableStream` (Web Streams API, not node:stream)
