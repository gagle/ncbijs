export { ClinVarHttpError } from './http/clinvar-client';
export { ClinVar } from './http/clinvar';
export { StorageModeError } from './interfaces/clinvar.interface';
export { parseVariantSummaryTsv } from './bulk-parsers/parse-variant-summary-tsv';
export { parseClinVarVcf } from './bulk-parsers/parse-clinvar-vcf';
export type {
  AlleleFrequency,
  ClinVarConfig,
  ClinVarGene,
  ClinVarSearchResult,
  ClinVarTrait,
  ClinVarVcfVariant,
  DataStorage,
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
