export { Snp } from './http/snp';
export { SnpHttpError } from './http/snp-client';
export { parseRefSnpJson, parseRefSnpNdjson } from './bulk-parsers/parse-refsnp-json';
export type {
  HgvsResult,
  RefSnpReport,
  SnpAllele,
  SnpAlleleAnnotation,
  SnpClinicalSignificance,
  SnpConfig,
  SnpFrequency,
  SnpPlacement,
  SpdiContextual,
  VcfFields,
} from './interfaces/snp.interface';
