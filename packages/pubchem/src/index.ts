export type {
  AnnotationData,
  AnnotationRecord,
  AnnotationSection,
  AssayRecord,
  AssaySummary,
  ClassificationNode,
  CompoundDescription,
  CompoundLiteratureLink,
  CompoundProperty,
  CompoundSynonyms,
  DataStorage,
  GeneRecord,
  PatentRecord,
  ProteinRecord,
  PubChemConfig,
  SubstanceRecord,
  SubstanceSynonyms,
} from './interfaces/pubchem.interface';
export { StorageModeError } from './interfaces/pubchem.interface';
export { PubChemHttpError } from './http/pubchem-client';
export { PubChem } from './http/pubchem';
export { parseCompoundExtras } from './bulk-parsers/parse-compound-extras';
export type {
  CompoundExtrasInput,
  CompoundExtrasProperty,
} from './bulk-parsers/parse-compound-extras';
export { parsePubchemLiteratureTsv } from './bulk-parsers/parse-pubchem-literature-tsv';
