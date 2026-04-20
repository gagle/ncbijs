export interface GeoConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface GeoSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

export interface GeoRecord {
  readonly uid: string;
  readonly accession: string;
  readonly title: string;
  readonly summary: string;
  readonly taxon: string;
  readonly entryType: string;
  readonly datasetType: string;
  readonly platformTechnologyType: string;
  readonly publicationDate: string;
  readonly supplementaryFiles: string;
  readonly samples: ReadonlyArray<GeoSample>;
  readonly sampleCount: number;
  readonly pubmedIds: ReadonlyArray<string>;
  readonly ftpLink: string;
  readonly bioproject: string;
  readonly platformId: string;
  readonly seriesId: string;
}

export interface GeoSample {
  readonly accession: string;
  readonly title: string;
}
