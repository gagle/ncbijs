/** Citation output format identifier. */
export type CitationFormat = 'ris' | 'medline' | 'csl' | 'citation';

/** NCBI source database for citation retrieval. */
export type CitationSource = 'pubmed' | 'pmc' | 'books';

/** A citation rendered in a specific bibliographic style. */
export interface CitationStyle {
  readonly orig: string;
  readonly format: string;
}

/** Pre-formatted citation data containing multiple bibliographic styles. */
export interface CitationData {
  readonly id: string;
  readonly ama: CitationStyle;
  readonly apa: CitationStyle;
  readonly mla: CitationStyle;
  readonly nlm: CitationStyle;
}

/** Citation data in Citation Style Language (CSL) JSON format. */
export interface CSLData {
  readonly type: string;
  readonly id: string;
  readonly title: string;
  readonly author: ReadonlyArray<Readonly<{ family: string; given: string }>>;
  readonly issued: Readonly<{
    'date-parts': ReadonlyArray<ReadonlyArray<number>>;
  }>;
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
