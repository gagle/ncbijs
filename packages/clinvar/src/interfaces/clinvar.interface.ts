/** Configuration for the ClinVar client. */
export interface ClinVarConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** ClinVar search result with total count and matching variant IDs. */
export interface ClinVarSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** ClinVar variant report with germline classification, genes, traits, and locations. */
export interface VariantReport {
  readonly uid: string;
  readonly title: string;
  readonly objectType: string;
  readonly accession: string;
  readonly accessionVersion: string;
  readonly clinicalSignificance: string;
  readonly reviewStatus: string;
  readonly lastEvaluated: string;
  readonly genes: ReadonlyArray<ClinVarGene>;
  readonly traits: ReadonlyArray<ClinVarTrait>;
  readonly locations: ReadonlyArray<VariantLocation>;
  readonly supportingSubmissions: ReadonlyArray<string>;
}

/** Gene associated with a ClinVar variant. */
export interface ClinVarGene {
  readonly geneId: number;
  readonly symbol: string;
}

/** Clinical trait associated with a ClinVar variant. */
export interface ClinVarTrait {
  readonly name: string;
  readonly xrefs: ReadonlyArray<TraitXref>;
}

/** Cross-reference to an external database for a ClinVar trait. */
export interface TraitXref {
  readonly dbSource: string;
  readonly dbId: string;
}

/** Genomic location of a ClinVar variant on a specific assembly. */
export interface VariantLocation {
  readonly assemblyName: string;
  readonly chromosome: string;
  readonly start: number;
  readonly stop: number;
}

/** RefSNP report from the NCBI Variation Services API. */
export interface RefSnpReport {
  readonly rsid: number;
  readonly variantType: string;
  readonly placements: ReadonlyArray<RefSnpPlacement>;
}

/** Genomic placement of a RefSNP variant on a specific sequence. */
export interface RefSnpPlacement {
  readonly sequenceAccession: string;
  readonly alleles: ReadonlyArray<RefSnpAllele>;
}

/** Allele within a RefSNP placement with SPDI and HGVS notation. */
export interface RefSnpAllele {
  readonly spdi: string;
  readonly hgvs: string;
}

/** SPDI allele from SPDI validation or HGVS-to-SPDI conversion. */
export interface SpdiAllele {
  readonly sequenceAccession: string;
  readonly position: number;
  readonly deletedSequence: string;
  readonly insertedSequence: string;
}

/** Allele frequency report for a variant from the ALFA database. */
export interface FrequencyReport {
  readonly rsid: number;
  readonly alleles: ReadonlyArray<AlleleFrequency>;
}

/** Frequency data for a single allele across studies and populations. */
export interface AlleleFrequency {
  readonly alleleId: string;
  readonly referenceAllele: string;
  readonly populations: ReadonlyArray<PopulationFrequency>;
}

/** Allele counts for a specific biosample/population within a study. */
export interface PopulationFrequency {
  readonly study: string;
  readonly biosample: string;
  readonly alleleCounts: Readonly<Record<string, number>>;
  readonly totalCount: number;
}

/** ClinVar variant parsed from a VCF file. */
export interface ClinVarVcfVariant {
  readonly chrom: string;
  readonly pos: number;
  readonly id: string;
  readonly ref: string;
  readonly alt: string;
  readonly qual: string;
  readonly filter: string;
  readonly clinicalSignificance: string;
  readonly diseaseNames: string;
  readonly geneInfo: string;
  readonly rsId: string;
  readonly variantClass: string;
}
