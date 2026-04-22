/** Mapping of entity type names to their PubTator3 API identifiers. */
export const ENTITY_TYPES = {
  Gene: 'gene',
  Disease: 'disease',
  Chemical: 'chemical',
  Variant: 'variant',
  Species: 'species',
  CellLine: 'cell_line',
} as const satisfies Record<string, string>;

/** Biomedical entity type identifier used by the PubTator3 API. */
export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

/** Mapping of concept type names to their PubTator3 annotation concept identifiers. */
export const CONCEPT_TYPES = {
  Gene: 'Gene',
  Disease: 'Disease',
  Chemical: 'Chemical',
  Mutation: 'Mutation',
  Species: 'Species',
  BioConcept: 'BioConcept',
} as const satisfies Record<string, string>;

/** Concept type identifier used for PubTator3 annotation filtering. */
export type ConceptType = (typeof CONCEPT_TYPES)[keyof typeof CONCEPT_TYPES];

/** A biomedical entity matched by the PubTator3 autocomplete search. */
export interface EntityMatch {
  readonly id: string;
  readonly name: string;
  readonly type: EntityType;
}

/** Paginated search results from the PubTator3 search API. */
export interface SearchResult {
  readonly total: number;
  readonly page: number;
  readonly pageSize: number;
  readonly results: ReadonlyArray<
    Readonly<{
      pmid: string;
      title: string;
      journal: string;
      year: number;
      authors: ReadonlyArray<string>;
    }>
  >;
}

/** Pagination options for a PubTator3 search request. */
export interface SearchOptions {
  readonly page?: number;
  readonly pageSize?: number;
}

/** Options for exporting annotated documents from PubTator3. */
export interface ExportOptions {
  readonly format?: 'json' | 'xml';
  readonly full?: boolean;
}

/** A named entity annotation within a BioC passage. */
export interface Annotation {
  readonly text: string;
  readonly type: string;
  readonly id: string;
  readonly offset: number;
  readonly length: number;
}

/** A passage (title, abstract, or body section) within a BioC document. */
export interface BioPassage {
  readonly type: string;
  readonly text: string;
  readonly offset: number;
  readonly annotations: ReadonlyArray<Readonly<Annotation>>;
}

/** A BioC document collection containing annotated passages. */
export interface BioDocument {
  readonly documents: ReadonlyArray<
    Readonly<{
      id: string;
      passages: ReadonlyArray<Readonly<BioPassage>>;
    }>
  >;
}

/** A single annotation record parsed from PubTator TSV format. */
export interface PubTatorAnnotation {
  readonly pmid: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly type: string;
  readonly id: string;
}

/** Options for controlling annotation output format and concept filtering. */
export interface AnnotateOptions {
  readonly concept?: ConceptType;
  readonly format?: 'PubTator' | 'BioC' | 'JSON';
}
