export interface SnpConfig {
  readonly apiKey?: string | undefined;
  readonly maxRetries?: number;
}

export interface RefSnpReport {
  readonly refsnpId: string;
  readonly createDate: string;
  readonly placements: ReadonlyArray<SnpPlacement>;
  readonly alleleAnnotations: ReadonlyArray<SnpAlleleAnnotation>;
}

export interface SnpPlacement {
  readonly seqId: string;
  readonly assemblyName: string;
  readonly alleles: ReadonlyArray<SnpAllele>;
}

export interface SnpAllele {
  readonly seqId: string;
  readonly position: number;
  readonly deletedSequence: string;
  readonly insertedSequence: string;
}

export interface SnpAlleleAnnotation {
  readonly frequency: ReadonlyArray<SnpFrequency>;
  readonly clinical: ReadonlyArray<SnpClinicalSignificance>;
}

export interface SnpFrequency {
  readonly studyName: string;
  readonly alleleCount: number;
  readonly totalCount: number;
  readonly frequency: number;
  readonly deletedSequence: string;
  readonly insertedSequence: string;
}

export interface SnpClinicalSignificance {
  readonly significances: ReadonlyArray<string>;
  readonly diseaseNames: ReadonlyArray<string>;
  readonly reviewStatus: string;
}
