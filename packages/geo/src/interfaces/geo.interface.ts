/** Configuration options for the GEO client. */
export interface GeoConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** GEO search result containing matched record IDs and total count. */
export interface GeoSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** A GEO dataset or series record with sample and platform metadata. */
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

/** A sample within a GEO dataset or series. */
export interface GeoSample {
  readonly accession: string;
  readonly title: string;
}
