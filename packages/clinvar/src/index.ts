export { ClinVarHttpError } from './http/clinvar-client';
export { ClinVar } from './http/clinvar';
export { parseVariantSummaryTsv } from './bulk-parsers/parse-variant-summary-tsv';
export type {
  ClinVarConfig,
  ClinVarGene,
  ClinVarSearchResult,
  ClinVarTrait,
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
