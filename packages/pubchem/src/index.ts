export type {
  AnnotationData,
  AnnotationRecord,
  AnnotationSection,
  AssayRecord,
  AssaySummary,
  ClassificationNode,
  CompoundDescription,
  CompoundProperty,
  CompoundSynonyms,
  GeneRecord,
  PatentRecord,
  ProteinRecord,
  PubChemConfig,
  SubstanceRecord,
  SubstanceSynonyms,
} from './interfaces/pubchem.interface';
export { PubChemHttpError } from './pubchem-client';
export { PubChem } from './pubchem';
export { parseCompoundExtras } from './parse-compound-extras';
export type { CompoundExtrasInput, CompoundExtrasProperty } from './parse-compound-extras';
