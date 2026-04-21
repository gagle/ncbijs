/** A labeled section within a structured abstract. */
export interface AbstractSection {
  readonly label: string;
  readonly nlmCategory?: string;
  readonly text: string;
}

/** Article abstract content, either plain text or structured with labeled sections. */
export interface AbstractContent {
  readonly structured: boolean;
  readonly text: string;
  readonly sections?: ReadonlyArray<Readonly<AbstractSection>>;
}

/** An article author with name components and institutional affiliations. */
export interface Author {
  readonly lastName?: string;
  readonly foreName?: string;
  readonly initials?: string;
  readonly collectiveName?: string;
  readonly affiliations: ReadonlyArray<string>;
}

/** Journal publication metadata for a PubMed article. */
export interface JournalInfo {
  readonly title: string;
  readonly isoAbbrev: string;
  readonly issn?: string;
  readonly volume?: string;
  readonly issue?: string;
}

/** A date that may have only year, year-month, or full year-month-day precision. */
export interface PartialDate {
  readonly year: number;
  readonly month?: number;
  readonly day?: number;
  readonly season?: string;
  readonly raw?: string;
}

/** A MeSH subheading qualifier attached to a heading in a PubMed article. */
export interface MeshQualifier {
  readonly name: string;
  readonly ui: string;
  readonly majorTopic: boolean;
}

/** A MeSH subject heading assigned to a PubMed article. */
export interface MeshHeading {
  readonly descriptor: string;
  readonly descriptorUI: string;
  readonly majorTopic: boolean;
  readonly qualifiers: ReadonlyArray<Readonly<MeshQualifier>>;
}

/** Collection of article identifiers (PMID, DOI, PMC, etc.) for a PubMed article. */
export interface ArticleIds {
  readonly pmid: string;
  readonly doi?: string;
  readonly pmc?: string;
  readonly pii?: string;
  readonly mid?: string;
}

/** A funding grant associated with a PubMed article. */
export interface Grant {
  readonly grantId: string;
  readonly acronym?: string;
  readonly agency: string;
  readonly country: string;
}

/** A keyword or key phrase assigned to a PubMed article. */
export interface Keyword {
  readonly text: string;
  readonly majorTopic: boolean;
  readonly owner: 'NLM' | 'NOTNLM';
}

/** A comment, correction, or retraction linked to a PubMed article. */
export interface CommentCorrection {
  readonly refType: string;
  readonly refSource: string;
  readonly pmid?: string;
}

/** A data bank submission (e.g., GenBank, ClinicalTrials.gov) referenced by a PubMed article. */
export interface DataBank {
  readonly name: string;
  readonly accessionNumbers: ReadonlyArray<string>;
}

/** A fully parsed PubMed article with metadata, abstract, authors, and indexing terms. */
export interface PubmedArticle {
  readonly pmid: string;
  readonly title: string;
  readonly vernacularTitle?: string;
  readonly abstract: Readonly<AbstractContent>;
  readonly authors: ReadonlyArray<Readonly<Author>>;
  readonly journal: Readonly<JournalInfo>;
  readonly publicationDate: Readonly<PartialDate>;
  readonly mesh: ReadonlyArray<Readonly<MeshHeading>>;
  readonly articleIds: Readonly<ArticleIds>;
  readonly publicationTypes: ReadonlyArray<string>;
  readonly grants: ReadonlyArray<Readonly<Grant>>;
  readonly keywords: ReadonlyArray<Readonly<Keyword>>;
  readonly commentsCorrections: ReadonlyArray<Readonly<CommentCorrection>>;
  readonly dataBanks: ReadonlyArray<Readonly<DataBank>>;
  readonly language: string;
  readonly dateRevised?: Readonly<PartialDate>;
  readonly dateCompleted?: Readonly<PartialDate>;
}
