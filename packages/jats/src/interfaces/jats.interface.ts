export interface PartialDate {
  readonly year: number;
  readonly month?: number | undefined;
  readonly day?: number | undefined;
}

export interface Author {
  readonly lastName?: string | undefined;
  readonly foreName?: string | undefined;
  readonly initials?: string | undefined;
  readonly collectiveName?: string | undefined;
  readonly orcid?: string | undefined;
  readonly affiliations: ReadonlyArray<string>;
}

export interface JournalMeta {
  readonly title: string;
  readonly isoAbbrev?: string | undefined;
  readonly publisher?: string | undefined;
  readonly issn?: string | undefined;
}

export interface ArticleMeta {
  readonly title: string;
  readonly authors: ReadonlyArray<Readonly<Author>>;
  readonly abstract?: string | undefined;
  readonly keywords?: ReadonlyArray<string> | undefined;
  readonly doi?: string | undefined;
  readonly pmid?: string | undefined;
  readonly pmcid?: string | undefined;
  readonly publicationDate?: Readonly<PartialDate> | undefined;
}

export interface Front {
  readonly journal: Readonly<JournalMeta>;
  readonly article: Readonly<ArticleMeta>;
}

export interface Table {
  readonly caption: string;
  readonly headers: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

export interface Figure {
  readonly id: string;
  readonly label: string;
  readonly caption: string;
}

export interface Section {
  readonly title: string;
  readonly depth: number;
  readonly paragraphs: ReadonlyArray<string>;
  readonly tables: ReadonlyArray<Readonly<Table>>;
  readonly figures: ReadonlyArray<Readonly<Figure>>;
  readonly subsections: ReadonlyArray<Readonly<Section>>;
}

export interface Reference {
  readonly id: string;
  readonly label?: string | undefined;
  readonly authors: ReadonlyArray<string>;
  readonly title: string;
  readonly source: string;
  readonly year?: number | undefined;
  readonly volume?: string | undefined;
  readonly pages?: string | undefined;
  readonly doi?: string | undefined;
  readonly pmid?: string | undefined;
}

export interface Back {
  readonly references: ReadonlyArray<Readonly<Reference>>;
  readonly acknowledgements?: string | undefined;
  readonly appendices?: ReadonlyArray<Readonly<Section>> | undefined;
}

export interface JATSArticle {
  readonly front: Readonly<Front>;
  readonly body: ReadonlyArray<Readonly<Section>>;
  readonly back: Readonly<Back>;
}

export interface Chunk {
  readonly text: string;
  readonly section: string;
  readonly tokenCount: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

export interface ChunkOptions {
  readonly maxTokens?: number | undefined;
  readonly overlap?: number | undefined;
  readonly includeSectionTitle?: boolean | undefined;
}
