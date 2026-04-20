export type {
  AnnotateOptions,
  Annotation,
  BioDocument,
  BioPassage,
  ConceptType,
  EntityMatch,
  EntityType,
  ExportOptions,
  PubTatorAnnotation,
  SearchOptions,
  SearchResult,
} from './interfaces/pubtator.interface.js';
export { CONCEPT_TYPES, ENTITY_TYPES } from './interfaces/pubtator.interface.js';
export { PubTator } from './pubtator.js';
export { parseBioC } from './parse-bioc.js';
export { parsePubTatorTsv } from './parse-pubtator-tsv.js';
