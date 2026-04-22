export type {
  BioCAnnotation,
  BioCDocument,
  BioCFormat,
  BioCLocation,
  BioCPassage,
  EntitySearchResult,
} from './interfaces/bioc.interface';
export { entitySearch, pmc, pmcBatch, pubmed, pubmedBatch } from './bioc';
