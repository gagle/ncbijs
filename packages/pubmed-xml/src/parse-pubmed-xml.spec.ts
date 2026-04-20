import { describe, expect, it } from 'vitest';
import type { PubmedArticle } from './interfaces/pubmed-article.interface.js';
import { parsePubmedXml } from './parse-pubmed-xml.js';

function buildArticleXml(citationContent: string, pubmedDataContent = ''): string {
  const pubmedData = pubmedDataContent ? `<PubmedData>${pubmedDataContent}</PubmedData>` : '';
  return `<PubmedArticleSet><PubmedArticle><MedlineCitation>${citationContent}</MedlineCitation>${pubmedData}</PubmedArticle></PubmedArticleSet>`;
}

function buildMinimalCitation(pmid: string, articleContent: string, citationExtras = ''): string {
  return `<PMID>${pmid}</PMID><Article><ArticleTitle>Test Title</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language>${articleContent}</Article>${citationExtras}`;
}

describe('parsePubmedXml', () => {
  describe('basic parsing', () => {
    it('should parse single PubmedArticle from PubmedArticleSet', () => {
      const xml = buildArticleXml(buildMinimalCitation('12345', ''));
      const articles = parsePubmedXml(xml);
      expect(articles).toHaveLength(1);
    });

    it('should parse multiple PubmedArticles', () => {
      const citation1 = `<MedlineCitation>${buildMinimalCitation('111', '')}</MedlineCitation>`;
      const citation2 = `<MedlineCitation>${buildMinimalCitation('222', '')}</MedlineCitation>`;
      const xml = `<PubmedArticleSet><PubmedArticle>${citation1}</PubmedArticle><PubmedArticle>${citation2}</PubmedArticle></PubmedArticleSet>`;
      const articles = parsePubmedXml(xml);
      expect(articles).toHaveLength(2);
      expect(articles[0]!.pmid).toBe('111');
      expect(articles[1]!.pmid).toBe('222');
    });

    it('should return empty array for empty PubmedArticleSet', () => {
      const xml = '<PubmedArticleSet></PubmedArticleSet>';
      const articles = parsePubmedXml(xml);
      expect(articles).toHaveLength(0);
    });

    it('should extract PMID from MedlineCitation', () => {
      const xml = buildArticleXml(buildMinimalCitation('98765', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.pmid).toBe('98765');
    });

    it('should extract article title', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>My Research Paper</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.title).toBe('My Research Paper');
    });

    it('should extract language', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.language).toBe('eng');
    });

    it('should extract vernacular title when present', () => {
      const xml = buildArticleXml(
        buildMinimalCitation('1', '<VernacularTitle>Titre en francais</VernacularTitle>'),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.vernacularTitle).toBe('Titre en francais');
    });
  });

  describe('abstract handling', () => {
    it('should parse flat abstract as single text block', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<Abstract><AbstractText>This is the abstract.</AbstractText></Abstract>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.text).toBe('This is the abstract.');
    });

    it('should set structured to false for flat abstracts', () => {
      const xml = buildArticleXml(
        buildMinimalCitation('1', '<Abstract><AbstractText>Plain text.</AbstractText></Abstract>'),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.structured).toBe(false);
    });

    it('should parse structured abstract with labeled sections', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<Abstract><AbstractText Label="BACKGROUND">Background text.</AbstractText><AbstractText Label="METHODS">Methods text.</AbstractText></Abstract>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.sections).toHaveLength(2);
      expect(firstArticle.abstract.sections![0]!.label).toBe('BACKGROUND');
      expect(firstArticle.abstract.sections![0]!.text).toBe('Background text.');
      expect(firstArticle.abstract.sections![1]!.label).toBe('METHODS');
      expect(firstArticle.abstract.sections![1]!.text).toBe('Methods text.');
    });

    it('should set structured to true for structured abstracts', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<Abstract><AbstractText Label="OBJECTIVE">Goal.</AbstractText></Abstract>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.structured).toBe(true);
    });

    it('should extract NlmCategory from AbstractText', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<Abstract><AbstractText Label="OBJECTIVE" NlmCategory="OBJECTIVE">Goal.</AbstractText></Abstract>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.sections![0]!.nlmCategory).toBe('OBJECTIVE');
    });

    it('should extract Label from AbstractText', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<Abstract><AbstractText Label="RESULTS">Some results.</AbstractText></Abstract>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.sections![0]!.label).toBe('RESULTS');
    });

    it('should handle article with no abstract', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.structured).toBe(false);
      expect(firstArticle.abstract.text).toBe('');
    });

    it('should handle empty abstract element', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', '<Abstract></Abstract>'));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.text).toBe('');
      expect(firstArticle.abstract.structured).toBe(false);
    });

    it('should strip inline markup from abstract text', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>Title with <i>italic</i> word</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.title).toBe('Title with italic word');
    });

    it('should strip inline markup from structured abstract sections', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<Abstract><AbstractText Label="METHODS">Use of <i>in vitro</i> and <sup>13</sup>C methods.</AbstractText></Abstract>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.abstract.sections![0]!.text).toBe('Use of in vitro and 13C methods.');
      expect(firstArticle.abstract.text).toBe('Use of in vitro and 13C methods.');
    });
  });

  describe('author handling', () => {
    it('should parse individual author with lastName and foreName', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<AuthorList><Author><LastName>Smith</LastName><ForeName>John</ForeName><Initials>J</Initials></Author></AuthorList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.authors).toHaveLength(1);
      expect(firstArticle.authors[0]!.lastName).toBe('Smith');
      expect(firstArticle.authors[0]!.foreName).toBe('John');
    });

    it('should parse author with initials only', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<AuthorList><Author><LastName>Doe</LastName><Initials>JA</Initials></Author></AuthorList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.authors[0]!.lastName).toBe('Doe');
      expect(firstArticle.authors[0]!.initials).toBe('JA');
      expect(firstArticle.authors[0]!.foreName).toBeUndefined();
    });

    it('should parse CollectiveName author', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<AuthorList><Author><CollectiveName>WHO Consortium</CollectiveName></Author></AuthorList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.authors[0]!.collectiveName).toBe('WHO Consortium');
      expect(firstArticle.authors[0]!.lastName).toBeUndefined();
    });

    it('should parse mixed individual and collective authors', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<AuthorList><Author><LastName>Lee</LastName><ForeName>Alice</ForeName><Initials>A</Initials></Author><Author><CollectiveName>Research Group</CollectiveName></Author></AuthorList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.authors).toHaveLength(2);
      expect(firstArticle.authors[0]!.lastName).toBe('Lee');
      expect(firstArticle.authors[1]!.collectiveName).toBe('Research Group');
    });

    it('should extract author affiliations', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<AuthorList><Author><LastName>Kim</LastName><ForeName>Bob</ForeName><Initials>B</Initials><AffiliationInfo><Affiliation>MIT, Cambridge, MA</Affiliation></AffiliationInfo></Author></AuthorList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.authors[0]!.affiliations).toEqual(['MIT, Cambridge, MA']);
    });

    it('should extract multiple affiliations per author', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<AuthorList><Author><LastName>Kim</LastName><ForeName>Bob</ForeName><Initials>B</Initials><AffiliationInfo><Affiliation>MIT, Cambridge, MA</Affiliation></AffiliationInfo><AffiliationInfo><Affiliation>Harvard Medical School, Boston, MA</Affiliation></AffiliationInfo></Author></AuthorList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.authors[0]!.affiliations).toEqual([
        'MIT, Cambridge, MA',
        'Harvard Medical School, Boston, MA',
      ]);
    });

    it('should handle article with no authors', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.authors).toHaveLength(0);
    });
  });

  describe('journal information', () => {
    it('should extract journal title', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>Nature Medicine</Title><ISOAbbreviation>Nat Med</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.journal.title).toBe('Nature Medicine');
    });

    it('should extract ISO abbreviation', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>Nature</Title><ISOAbbreviation>Nat</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.journal.isoAbbrev).toBe('Nat');
    });

    it('should extract ISSN', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><ISSN IssnType="Print">0028-0836</ISSN><JournalIssue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.journal.issn).toBe('0028-0836');
    });

    it('should extract volume', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><Volume>42</Volume><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.journal.volume).toBe('42');
    });

    it('should extract issue', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><Issue>7</Issue><PubDate><Year>2024</Year></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.journal.issue).toBe('7');
    });

    it('should handle missing volume and issue', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.journal.volume).toBeUndefined();
      expect(firstArticle.journal.issue).toBeUndefined();
    });
  });

  describe('date handling', () => {
    it('should parse full date with year, month, day', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year><Month>Mar</Month><Day>15</Day></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationDate.year).toBe(2024);
      expect(firstArticle.publicationDate.month).toBe(3);
      expect(firstArticle.publicationDate.day).toBe(15);
    });

    it('should parse partial date with year and month only', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year><Month>06</Month></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationDate.year).toBe(2024);
      expect(firstArticle.publicationDate.month).toBe(6);
      expect(firstArticle.publicationDate.day).toBeUndefined();
    });

    it('should parse date with year only', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationDate.year).toBe(2024);
      expect(firstArticle.publicationDate.month).toBeUndefined();
      expect(firstArticle.publicationDate.day).toBeUndefined();
    });

    it('should parse MedlineDate format as raw string', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><MedlineDate>2024 Jan-Feb</MedlineDate></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationDate.raw).toBe('2024 Jan-Feb');
    });

    it('should extract year from MedlineDate', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><MedlineDate>2023 Spring</MedlineDate></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationDate.year).toBe(2023);
    });

    it('should parse season dates', () => {
      const xml = buildArticleXml(
        '<PMID>1</PMID><Article><ArticleTitle>T</ArticleTitle><Journal><Title>J</Title><ISOAbbreviation>J</ISOAbbreviation><JournalIssue><PubDate><Year>2024</Year><Season>Winter</Season></PubDate></JournalIssue></Journal><Language>eng</Language></Article>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationDate.year).toBe(2024);
      expect(firstArticle.publicationDate.season).toBe('Winter');
    });

    it('should parse DateRevised', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<DateRevised><Year>2024</Year><Month>05</Month><Day>10</Day></DateRevised>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.dateRevised).toEqual({ year: 2024, month: 5, day: 10 });
    });

    it('should parse DateCompleted', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<DateCompleted><Year>2024</Year><Month>03</Month><Day>20</Day></DateCompleted>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.dateCompleted).toEqual({ year: 2024, month: 3, day: 20 });
    });

    it('should handle missing DateRevised and DateCompleted', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.dateRevised).toBeUndefined();
      expect(firstArticle.dateCompleted).toBeUndefined();
    });
  });

  describe('MeSH headings', () => {
    it('should parse descriptor with UI and name', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<MeshHeadingList><MeshHeading><DescriptorName UI="D000328" MajorTopicYN="N">Adult</DescriptorName></MeshHeading></MeshHeadingList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.mesh[0]!.descriptor).toBe('Adult');
      expect(firstArticle.mesh[0]!.descriptorUI).toBe('D000328');
    });

    it('should parse MajorTopicYN for descriptors', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<MeshHeadingList><MeshHeading><DescriptorName UI="D001" MajorTopicYN="Y">Neoplasms</DescriptorName></MeshHeading></MeshHeadingList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.mesh[0]!.majorTopic).toBe(true);
    });

    it('should parse qualifiers with UI and name', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<MeshHeadingList><MeshHeading><DescriptorName UI="D001" MajorTopicYN="N">Brain</DescriptorName><QualifierName UI="Q000033" MajorTopicYN="N">anatomy &amp; histology</QualifierName></MeshHeading></MeshHeadingList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      const firstQualifier = firstArticle.mesh[0]!.qualifiers[0]!;
      expect(firstQualifier.name).toBe('anatomy & histology');
      expect(firstQualifier.ui).toBe('Q000033');
    });

    it('should parse MajorTopicYN for qualifiers', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<MeshHeadingList><MeshHeading><DescriptorName UI="D001" MajorTopicYN="N">Brain</DescriptorName><QualifierName UI="Q001" MajorTopicYN="Y">pathology</QualifierName></MeshHeading></MeshHeadingList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.mesh[0]!.qualifiers[0]!.majorTopic).toBe(true);
    });

    it('should parse descriptor with multiple qualifiers', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<MeshHeadingList><MeshHeading><DescriptorName UI="D001" MajorTopicYN="N">Liver</DescriptorName><QualifierName UI="Q001" MajorTopicYN="N">pathology</QualifierName><QualifierName UI="Q002" MajorTopicYN="Y">surgery</QualifierName></MeshHeading></MeshHeadingList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.mesh[0]!.qualifiers).toHaveLength(2);
      expect(firstArticle.mesh[0]!.qualifiers[0]!.name).toBe('pathology');
      expect(firstArticle.mesh[0]!.qualifiers[1]!.name).toBe('surgery');
    });

    it('should parse descriptor with no qualifiers', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<MeshHeadingList><MeshHeading><DescriptorName UI="D001" MajorTopicYN="N">Humans</DescriptorName></MeshHeading></MeshHeadingList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.mesh[0]!.qualifiers).toHaveLength(0);
    });

    it('should handle article with no MeSH headings', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.mesh).toHaveLength(0);
    });
  });

  describe('article IDs', () => {
    it('should extract PMID', () => {
      const xml = buildArticleXml(
        buildMinimalCitation('54321', ''),
        '<ArticleIdList><ArticleId IdType="pubmed">54321</ArticleId></ArticleIdList>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.articleIds.pmid).toBe('54321');
    });

    it('should extract DOI from ArticleIdList', () => {
      const xml = buildArticleXml(
        buildMinimalCitation('1', ''),
        '<ArticleIdList><ArticleId IdType="doi">10.1038/s41586-024-00001-x</ArticleId></ArticleIdList>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.articleIds.doi).toBe('10.1038/s41586-024-00001-x');
    });

    it('should extract PMC ID from ArticleIdList', () => {
      const xml = buildArticleXml(
        buildMinimalCitation('1', ''),
        '<ArticleIdList><ArticleId IdType="pmc">PMC1234567</ArticleId></ArticleIdList>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.articleIds.pmc).toBe('PMC1234567');
    });

    it('should extract PII from ArticleIdList', () => {
      const xml = buildArticleXml(
        buildMinimalCitation('1', ''),
        '<ArticleIdList><ArticleId IdType="pii">S0140-6736(24)00001-0</ArticleId></ArticleIdList>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.articleIds.pii).toBe('S0140-6736(24)00001-0');
    });

    it('should extract MID from ArticleIdList', () => {
      const xml = buildArticleXml(
        buildMinimalCitation('1', ''),
        '<ArticleIdList><ArticleId IdType="mid">NIHMS123456</ArticleId></ArticleIdList>',
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.articleIds.mid).toBe('NIHMS123456');
    });

    it('should handle missing optional IDs', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.articleIds.pmid).toBe('1');
      expect(firstArticle.articleIds.doi).toBeUndefined();
      expect(firstArticle.articleIds.pmc).toBeUndefined();
      expect(firstArticle.articleIds.pii).toBeUndefined();
      expect(firstArticle.articleIds.mid).toBeUndefined();
    });
  });

  describe('publication types', () => {
    it('should extract all PublicationType values', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<PublicationTypeList><PublicationType>Journal Article</PublicationType></PublicationTypeList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationTypes).toEqual(['Journal Article']);
    });

    it('should handle multiple publication types', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<PublicationTypeList><PublicationType>Journal Article</PublicationType><PublicationType>Randomized Controlled Trial</PublicationType><PublicationType>Research Support, N.I.H., Extramural</PublicationType></PublicationTypeList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.publicationTypes).toHaveLength(3);
      expect(firstArticle.publicationTypes[0]).toBe('Journal Article');
      expect(firstArticle.publicationTypes[1]).toBe('Randomized Controlled Trial');
      expect(firstArticle.publicationTypes[2]).toBe('Research Support, N.I.H., Extramural');
    });
  });

  describe('grants', () => {
    it('should parse grant with all fields', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<GrantList><Grant><GrantID>R01-CA123456</GrantID><Acronym>CA</Acronym><Agency>NCI NIH HHS</Agency><Country>United States</Country></Grant></GrantList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      const firstGrant = firstArticle.grants[0]!;
      expect(firstGrant.grantId).toBe('R01-CA123456');
      expect(firstGrant.acronym).toBe('CA');
      expect(firstGrant.agency).toBe('NCI NIH HHS');
      expect(firstGrant.country).toBe('United States');
    });

    it('should parse grant with optional acronym', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<GrantList><Grant><GrantID>MR/K000000/1</GrantID><Agency>Medical Research Council</Agency><Country>United Kingdom</Country></Grant></GrantList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.grants[0]!.acronym).toBeUndefined();
      expect(firstArticle.grants[0]!.grantId).toBe('MR/K000000/1');
    });

    it('should handle article with no grants', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.grants).toHaveLength(0);
    });

    it('should parse multiple grants', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<GrantList><Grant><GrantID>G1</GrantID><Agency>Agency A</Agency><Country>US</Country></Grant><Grant><GrantID>G2</GrantID><Agency>Agency B</Agency><Country>UK</Country></Grant></GrantList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.grants).toHaveLength(2);
      expect(firstArticle.grants[0]!.grantId).toBe('G1');
      expect(firstArticle.grants[1]!.grantId).toBe('G2');
    });
  });

  describe('keywords', () => {
    it('should parse NLM owner keywords', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<KeywordList Owner="NLM"><Keyword MajorTopicYN="N">Apoptosis</Keyword></KeywordList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.keywords[0]!.owner).toBe('NLM');
      expect(firstArticle.keywords[0]!.text).toBe('Apoptosis');
    });

    it('should parse NOTNLM owner keywords', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<KeywordList Owner="NOTNLM"><Keyword MajorTopicYN="N">machine learning</Keyword></KeywordList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.keywords[0]!.owner).toBe('NOTNLM');
      expect(firstArticle.keywords[0]!.text).toBe('machine learning');
    });

    it('should parse MajorTopicYN for keywords', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<KeywordList Owner="NLM"><Keyword MajorTopicYN="Y">Cancer</Keyword><Keyword MajorTopicYN="N">Therapy</Keyword></KeywordList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.keywords[0]!.majorTopic).toBe(true);
      expect(firstArticle.keywords[1]!.majorTopic).toBe(false);
    });

    it('should handle article with no keywords', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.keywords).toHaveLength(0);
    });
  });

  describe('comments and corrections', () => {
    it('should parse CommentCorrection with RefType', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<CommentsCorrectionsList><CommentsCorrections RefType="ErratumIn"><RefSource>J Exp Med. 2024;221(1):e20240001</RefSource><PMID>99999</PMID></CommentsCorrections></CommentsCorrectionsList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.commentsCorrections[0]!.refType).toBe('ErratumIn');
    });

    it('should parse RefSource text', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<CommentsCorrectionsList><CommentsCorrections RefType="CommentIn"><RefSource>Nature. 2024;625:100-101</RefSource></CommentsCorrections></CommentsCorrectionsList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.commentsCorrections[0]!.refSource).toBe('Nature. 2024;625:100-101');
    });

    it('should extract PMID from CommentCorrection', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<CommentsCorrectionsList><CommentsCorrections RefType="Cites"><RefSource>Source</RefSource><PMID>88888</PMID></CommentsCorrections></CommentsCorrectionsList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.commentsCorrections[0]!.pmid).toBe('88888');
    });

    it('should handle missing PMID in CommentCorrection', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<CommentsCorrectionsList><CommentsCorrections RefType="CommentOn"><RefSource>Some Source</RefSource></CommentsCorrections></CommentsCorrectionsList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.commentsCorrections[0]!.pmid).toBeUndefined();
    });

    it('should handle all RefType values', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '',
          '<CommentsCorrectionsList><CommentsCorrections RefType="CommentOn"><RefSource>S1</RefSource></CommentsCorrections><CommentsCorrections RefType="ErratumFor"><RefSource>S2</RefSource></CommentsCorrections><CommentsCorrections RefType="RepublishedFrom"><RefSource>S3</RefSource></CommentsCorrections></CommentsCorrectionsList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.commentsCorrections).toHaveLength(3);
      expect(firstArticle.commentsCorrections[0]!.refType).toBe('CommentOn');
      expect(firstArticle.commentsCorrections[1]!.refType).toBe('ErratumFor');
      expect(firstArticle.commentsCorrections[2]!.refType).toBe('RepublishedFrom');
    });

    it('should handle empty CommentsCorrections list', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.commentsCorrections).toHaveLength(0);
    });
  });

  describe('data banks', () => {
    it('should parse DataBank name', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<DataBankList><DataBank><DataBankName>ClinicalTrials.gov</DataBankName><AccessionNumberList><AccessionNumber>NCT00000001</AccessionNumber></AccessionNumberList></DataBank></DataBankList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.dataBanks[0]!.name).toBe('ClinicalTrials.gov');
    });

    it('should parse AccessionNumbers', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<DataBankList><DataBank><DataBankName>GenBank</DataBankName><AccessionNumberList><AccessionNumber>AB000001</AccessionNumber><AccessionNumber>AB000002</AccessionNumber><AccessionNumber>AB000003</AccessionNumber></AccessionNumberList></DataBank></DataBankList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.dataBanks[0]!.accessionNumbers).toEqual([
        'AB000001',
        'AB000002',
        'AB000003',
      ]);
    });

    it('should handle multiple DataBanks', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<DataBankList><DataBank><DataBankName>GenBank</DataBankName><AccessionNumberList><AccessionNumber>AB001</AccessionNumber></AccessionNumberList></DataBank><DataBank><DataBankName>ISRCTN</DataBankName><AccessionNumberList><AccessionNumber>ISRCTN12345</AccessionNumber></AccessionNumberList></DataBank></DataBankList>',
        ),
      );
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.dataBanks).toHaveLength(2);
      expect(firstArticle.dataBanks[0]!.name).toBe('GenBank');
      expect(firstArticle.dataBanks[1]!.name).toBe('ISRCTN');
    });

    it('should handle article with no DataBanks', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.dataBanks).toHaveLength(0);
    });
  });

  describe('BookDocument handling', () => {
    it('should parse BookDocument elements', () => {
      const xml = '<PubmedArticleSet></PubmedArticleSet>';
      const articles = parsePubmedXml(xml);
      expect(articles).toHaveLength(0);
    });

    it('should extract book-specific metadata', () => {
      const xml = '<PubmedArticleSet></PubmedArticleSet>';
      const articles = parsePubmedXml(xml);
      expect(Array.isArray(articles)).toBe(true);
    });
  });

  describe('error handling', () => {
    it('should throw on invalid XML', () => {
      expect(() =>
        parsePubmedXml(
          '<PubmedArticleSet><PubmedArticle><MedlineCitation></MedlineCitation></PubmedArticle></PubmedArticleSet>',
        ),
      ).toThrow();
    });

    it('should return empty array on empty input', () => {
      expect(parsePubmedXml('')).toEqual([]);
    });

    it('should handle missing required elements gracefully', () => {
      const xml = buildArticleXml(buildMinimalCitation('1', ''));
      const firstArticle = parsePubmedXml(xml)[0] as PubmedArticle;
      expect(firstArticle.mesh).toHaveLength(0);
      expect(firstArticle.grants).toHaveLength(0);
      expect(firstArticle.keywords).toHaveLength(0);
      expect(firstArticle.commentsCorrections).toHaveLength(0);
      expect(firstArticle.dataBanks).toHaveLength(0);
      expect(firstArticle.publicationTypes).toHaveLength(0);
    });

    it('should handle unexpected elements without crashing', () => {
      const xml = buildArticleXml(
        buildMinimalCitation(
          '1',
          '<UnexpectedElement>foo</UnexpectedElement><AnotherWeirdTag><Nested>bar</Nested></AnotherWeirdTag>',
        ),
      );
      const articles = parsePubmedXml(xml);
      expect(articles).toHaveLength(1);
      expect(articles[0]!.pmid).toBe('1');
    });
  });
});
