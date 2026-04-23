export { ClinVarHttpError } from './http/clinvar-client';
export { ClinVar } from './http/clinvar';
export { parseVariantSummaryTsv } from './bulk-parsers/parse-variant-summary-tsv';
export { parseClinVarVcf } from './bulk-parsers/parse-clinvar-vcf';
export type {
  ClinVarConfig,
  ClinVarGene,
  ClinVarSearchResult,
  ClinVarTrait,
  ClinVarVcfVariant,
  FrequencyReport,
  PopulationFrequency,
  RefSnpAllele,
  RefSnpPlacement,
  RefSnpReport,
  SpdiAllele,
  TraitXref,
  VariantLocation,
  VariantReport,
} from './interfaces/clinvar.interface';
