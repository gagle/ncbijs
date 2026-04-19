export const ENTITY_TYPES = {
  Gene: 'gene',
  Disease: 'disease',
  Chemical: 'chemical',
  Variant: 'variant',
  Species: 'species',
  CellLine: 'cell_line',
} as const satisfies Record<string, string>;

export type EntityType = (typeof ENTITY_TYPES)[keyof typeof ENTITY_TYPES];

export const RELATION_TYPES = {
  Treat: 'treat',
  Cause: 'cause',
  Cotreat: 'cotreat',
  Convert: 'convert',
  Compare: 'compare',
  Interact: 'interact',
  Associate: 'associate',
  PositiveCorrelate: 'positive_correlate',
  NegativeCorrelate: 'negative_correlate',
  Prevent: 'prevent',
  Inhibit: 'inhibit',
  Stimulate: 'stimulate',
  DrugInteract: 'drug_interact',
} as const satisfies Record<string, string>;

export type RelationType = (typeof RELATION_TYPES)[keyof typeof RELATION_TYPES];

export const CONCEPT_TYPES = {
  Gene: 'Gene',
  Disease: 'Disease',
  Chemical: 'Chemical',
  Mutation: 'Mutation',
  Species: 'Species',
  BioConcept: 'BioConcept',
} as const satisfies Record<string, string>;

export type ConceptType = (typeof CONCEPT_TYPES)[keyof typeof CONCEPT_TYPES];

export interface EntityMatch {
  readonly id: string;
  readonly name: string;
  readonly type: EntityType;
  readonly score: number;
}

export interface RelatedEntity {
  readonly id: string;
  readonly name: string;
  readonly type: EntityType;
  readonly relationType: RelationType;
  readonly pmids: ReadonlyArray<string>;
  readonly score: number;
}

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

export interface SearchOptions {
  readonly page?: number | undefined;
  readonly pageSize?: number | undefined;
}

export interface ExportOptions {
  readonly format?: 'json' | 'xml' | undefined;
  readonly full?: boolean | undefined;
}

export interface Annotation {
  readonly text: string;
  readonly type: string;
  readonly id: string;
  readonly offset: number;
  readonly length: number;
}

export interface BioPassage {
  readonly type: string;
  readonly text: string;
  readonly offset: number;
  readonly annotations: ReadonlyArray<Readonly<Annotation>>;
}

export interface BioDocument {
  readonly documents: ReadonlyArray<
    Readonly<{
      id: string;
      passages: ReadonlyArray<Readonly<BioPassage>>;
    }>
  >;
}

export interface PubTatorAnnotation {
  readonly pmid: string;
  readonly start: number;
  readonly end: number;
  readonly text: string;
  readonly type: string;
  readonly id: string;
}

export interface AnnotateOptions {
  readonly concept?: ConceptType | undefined;
  readonly format?: 'PubTator' | 'BioC' | 'JSON' | undefined;
}

export interface BiocOptions {
  readonly format?: 'xml' | 'json' | undefined;
  readonly encoding?: 'unicode' | 'ascii' | undefined;
}
