/** Configuration for the iCite client. */
export interface ICiteConfig {
  readonly maxRetries?: number;
}

/** Author information from iCite. */
export interface ICiteAuthor {
  readonly firstName: string;
  readonly lastName: string;
  readonly fullName: string;
}

/** Citation metrics and bibliographic data for a publication from iCite. */
export interface ICitePublication {
  readonly pmid: number;
  readonly year: number;
  readonly title: string;
  readonly authors: ReadonlyArray<ICiteAuthor>;
  readonly journal: string;
  readonly isResearchArticle: boolean;
  /** Whether this article itself reports clinical research. */
  readonly isClinical: boolean;
  readonly relativeCitationRatio: number | undefined;
  readonly nihPercentile: number | undefined;
  readonly citedByCount: number;
  readonly referencesCount: number;
  readonly expectedCitationsPerYear: number | undefined;
  readonly fieldCitationRate: number | undefined;
  /** Average citations received per year since publication. */
  readonly citationsPerYear: number | undefined;
  /** Whether this article has been cited by at least one clinical article. */
  readonly citedByClinicalArticle: boolean;
  /** Whether the citation metrics are provisional (article published within the last two years). */
  readonly provisional: boolean;
  /** Weighted percentage of supporting references that study humans (0-1). */
  readonly human: number;
  /** Weighted percentage of supporting references that study animals (0-1). */
  readonly animal: number;
  /** Weighted percentage of supporting references studying molecular or cellular biology (0-1). */
  readonly molecularCellular: number;
  /** Approximate Potential to Translate score (clinical relevance of basic science research). */
  readonly apt: number;
  readonly citedByPmids: ReadonlyArray<number>;
  /** PubMed IDs of clinical articles that cite this publication. */
  readonly citedByClinicalPmids: ReadonlyArray<number>;
  readonly referencesPmids: ReadonlyArray<number>;
  readonly doi: string;
}
