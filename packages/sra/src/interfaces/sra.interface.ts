/** Configuration options for the SRA client. */
export interface SraConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** SRA search result containing matched experiment IDs and total count. */
export interface SraSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** An SRA sequencing experiment with library and run metadata. */
export interface SraExperiment {
  readonly uid: string;
  readonly title: string;
  readonly experimentAccession: string;
  readonly studyAccession: string;
  readonly sampleAccession: string;
  readonly organism: SraOrganism;
  readonly platform: string;
  readonly instrumentModel: string;
  readonly libraryStrategy: string;
  readonly librarySource: string;
  readonly librarySelection: string;
  readonly libraryLayout: string;
  readonly bioproject: string;
  readonly biosample: string;
  readonly runs: ReadonlyArray<SraRun>;
  readonly createDate: string;
  readonly updateDate: string;
}

/** Organism associated with an SRA experiment. */
export interface SraOrganism {
  readonly taxId: number;
  readonly scientificName: string;
}

/** A sequencing run within an SRA experiment. */
export interface SraRun {
  readonly accession: string;
  readonly totalSpots: number;
  readonly totalBases: number;
  readonly isPublic: boolean;
}
