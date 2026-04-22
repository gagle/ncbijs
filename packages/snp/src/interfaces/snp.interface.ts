/** Configuration for the dbSNP client. */
export interface SnpConfig {
  readonly apiKey?: string;
  readonly maxRetries?: number;
}

/** RefSNP report with genomic placements and allele annotations. */
export interface RefSnpReport {
  readonly refsnpId: string;
  readonly createDate: string;
  readonly placements: ReadonlyArray<SnpPlacement>;
  readonly alleleAnnotations: ReadonlyArray<SnpAlleleAnnotation>;
}

/** Genomic placement of a variant on a reference sequence. */
export interface SnpPlacement {
  readonly seqId: string;
  readonly assemblyName: string;
  readonly alleles: ReadonlyArray<SnpAllele>;
}

/** SPDI representation of a single allele at a placement. */
export interface SnpAllele {
  readonly seqId: string;
  readonly position: number;
  readonly deletedSequence: string;
  readonly insertedSequence: string;
}

/** Allele-level annotations including frequency and clinical data. */
export interface SnpAlleleAnnotation {
  readonly frequency: ReadonlyArray<SnpFrequency>;
  readonly clinical: ReadonlyArray<SnpClinicalSignificance>;
}

/** Population allele frequency from a specific study. */
export interface SnpFrequency {
  readonly studyName: string;
  readonly alleleCount: number;
  readonly totalCount: number;
  readonly frequency: number;
  readonly deletedSequence: string;
  readonly insertedSequence: string;
}

/** Clinical significance annotation from ClinVar for a variant. */
export interface SnpClinicalSignificance {
  readonly significances: ReadonlyArray<string>;
  readonly diseaseNames: ReadonlyArray<string>;
  readonly reviewStatus: string;
}

/** HGVS notation conversion result. */
export interface HgvsResult {
  readonly hgvs: string;
}

/** SPDI contextual allele representation. */
export interface SpdiContextual {
  readonly seqId: string;
  readonly position: number;
  readonly deletedSequence: string;
  readonly insertedSequence: string;
}

/** VCF-style variant representation fields. */
export interface VcfFields {
  readonly chrom: string;
  readonly pos: number;
  readonly ref: string;
  readonly alt: string;
}
