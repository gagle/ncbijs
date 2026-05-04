/** Parsed PubMed article with structured metadata. */
export interface Article {
  readonly pmid: string;
  readonly title: string;
  readonly abstract: Readonly<{
    structured: boolean;
    text: string;
    sections?: ReadonlyArray<Readonly<{ label: string; text: string }>> | undefined;
  }>;
  readonly authors: ReadonlyArray<
    Readonly<{
      lastName?: string | undefined;
      foreName?: string | undefined;
      collectiveName?: string | undefined;
      affiliations: ReadonlyArray<string>;
    }>
  >;
  readonly journal: Readonly<{
    title: string;
    isoAbbrev: string;
    issn?: string | undefined;
    volume?: string | undefined;
    issue?: string | undefined;
  }>;
  readonly publicationDate: Readonly<{
    year: number;
    month?: number | undefined;
    day?: number | undefined;
  }>;
  readonly mesh: ReadonlyArray<
    Readonly<{
      descriptor: string;
      qualifiers: ReadonlyArray<string>;
      majorTopic: boolean;
    }>
  >;
  readonly articleIds: Readonly<{
    pmid: string;
    doi?: string | undefined;
    pmc?: string | undefined;
    pii?: string | undefined;
  }>;
  readonly publicationTypes: ReadonlyArray<string>;
  readonly grants: ReadonlyArray<Readonly<{ grantId: string; agency: string; country: string }>>;
  readonly keywords: ReadonlyArray<string>;
}

/** PubMed article with an associated relevancy score from a related-articles query. */
export interface RelatedArticle extends Article {
  readonly relevancyScore: number;
}

/** Sort order for PubMed search results. */
export type PubMedSort = 'relevance' | 'pub_date' | 'Author' | 'JournalName';

/** Publication type filter values supported by PubMed. */
export type PublicationType =
  | 'Review'
  | 'Clinical Trial'
  | 'Meta-Analysis'
  | 'Randomized Controlled Trial'
  | 'Systematic Review'
  | 'Case Reports'
  | 'Letter'
  | 'Editorial'
  | 'Comment'
  | 'Practice Guideline';
