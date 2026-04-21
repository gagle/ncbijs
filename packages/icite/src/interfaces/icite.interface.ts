/** Configuration for the iCite client. */
export interface ICiteConfig {
  readonly maxRetries?: number | undefined;
}

/** Citation metrics and bibliographic data for a publication from iCite. */
export interface ICitePublication {
  readonly pmid: number;
  readonly year: number;
  readonly title: string;
  readonly authors: string;
  readonly journal: string;
  readonly isResearchArticle: boolean;
  readonly relativeCitationRatio: number | undefined;
  readonly nihPercentile: number | undefined;
  readonly citedByCount: number;
  readonly referencesCount: number;
  readonly expectedCitationsPerYear: number | undefined;
  readonly fieldCitationRate: number | undefined;
  readonly isClinicallyCited: boolean;
  readonly citedByPmids: ReadonlyArray<number>;
  readonly referencesPmids: ReadonlyArray<number>;
  readonly doi: string;
}
