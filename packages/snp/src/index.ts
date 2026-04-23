export { Snp } from './http/snp';
export { SnpHttpError } from './http/snp-client';
export { parseRefSnpJson, parseRefSnpNdjson } from './bulk-parsers/parse-refsnp-json';
export { parseDbSnpVcf } from './bulk-parsers/parse-dbsnp-vcf';
export type {
  DbSnpVcfVariant,
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
