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
  /** Normalized identifier for the entity (e.g., NCBI Gene ID, MeSH ID). */
  readonly id: string;
  /** Display name of the matched entity. */
  readonly name: string;
  /** Biomedical entity type (gene, disease, chemical, variant, species, or cell_line). */
  readonly type: EntityType;
}

/** Paginated search results from the PubTator3 search API. */
export interface SearchResult {
  /** Total number of matching articles across all pages. */
  readonly total: number;
  /** Current page number (1-based). */
  readonly page: number;
  /** Number of results per page. */
  readonly pageSize: number;
  /** Article summaries for the current page. */
  readonly results: ReadonlyArray<
    Readonly<{
      /** PubMed identifier. */
      pmid: string;
      /** Article title. */
      title: string;
      /** Journal name. */
      journal: string;
      /** Publication year. */
      year: number;
      /** List of author names. */
      authors: ReadonlyArray<string>;
    }>
  >;
}

/** Pagination options for a PubTator3 search request. */
export interface SearchOptions {
  /** Page number to retrieve (1-based). */
  readonly page?: number;
  /** Number of results per page. */
  readonly pageSize?: number;
}

/** Options for exporting annotated documents from PubTator3. */
export interface ExportOptions {
  /** Output format for the export (defaults to JSON). */
  readonly format?: 'json' | 'xml';
  /** When true, include full-text annotations instead of title/abstract only. */
  readonly full?: boolean;
}

/** A named entity annotation within a BioC passage. */
export interface Annotation {
  /** Surface text of the annotated span. */
  readonly text: string;
  /** Entity type (e.g., Gene, Disease, Chemical, Mutation, Species). */
  readonly type: string;
  /** Normalized concept identifier for the annotated entity. */
  readonly id: string;
  /** Character offset of the annotation start within the passage. */
  readonly offset: number;
  /** Length of the annotated text span in characters. */
  readonly length: number;
}

/** A passage (title, abstract, or body section) within a BioC document. */
export interface BioPassage {
  /** Passage role (e.g., "title", "abstract", "paragraph"). */
  readonly type: string;
  /** Full text content of the passage. */
  readonly text: string;
  /** Character offset of this passage within the document. */
  readonly offset: number;
  /** Named entity annotations found in this passage. */
  readonly annotations: ReadonlyArray<Readonly<Annotation>>;
}

/** A BioC document collection containing annotated passages. */
export interface BioDocument {
  /** Individual documents in the collection. */
  readonly documents: ReadonlyArray<
    Readonly<{
      /** Document identifier (typically a PMID). */
      id: string;
      /** Annotated passages (title, abstract, body sections). */
      passages: ReadonlyArray<Readonly<BioPassage>>;
    }>
  >;
}

/** A single annotation record parsed from PubTator TSV format. */
export interface PubTatorAnnotation {
  /** PubMed identifier of the annotated article. */
  readonly pmid: string;
  /** Character offset where the annotation starts. */
  readonly start: number;
  /** Character offset where the annotation ends. */
  readonly end: number;
  /** Surface text of the annotated span. */
  readonly text: string;
  /** Entity type (e.g., Gene, Disease, Chemical). */
  readonly type: string;
  /** Normalized concept identifier for the entity. */
  readonly id: string;
}

/** Options for controlling annotation output format and concept filtering. */
export interface AnnotateOptions {
  /** Limit annotations to a specific concept type. */
  readonly concept?: ConceptType;
  /** Output format for the annotation response. */
  readonly format?: 'PubTator' | 'BioC' | 'JSON';
}

/** Configuration for the PubTator3 client. */
export interface PubtatorConfig {
  readonly maxRetries?: number;
}
