/** A date that may have only year, year-month, or full year-month-day precision. */
export interface PartialDate {
  readonly year: number;
  readonly month?: number;
  readonly day?: number;
}

/** An article author with name components, ORCID, and affiliations. */
export interface Author {
  readonly lastName?: string;
  readonly foreName?: string;
  readonly initials?: string;
  readonly collectiveName?: string;
  readonly orcid?: string;
  readonly affiliations: ReadonlyArray<string>;
}

/** Journal-level metadata from the JATS front matter. */
export interface JournalMeta {
  readonly title: string;
  readonly isoAbbrev?: string;
  readonly publisher?: string;
  readonly issn?: string;
}

/** Article-level metadata from the JATS front matter. */
export interface ArticleMeta {
  readonly title: string;
  readonly authors: ReadonlyArray<Readonly<Author>>;
  readonly abstract?: string;
  readonly keywords?: ReadonlyArray<string>;
  readonly doi?: string;
  readonly pmid?: string;
  readonly pmcid?: string;
  readonly publicationDate?: Readonly<PartialDate>;
}

/** Combined journal and article metadata from the JATS front element. */
export interface Front {
  readonly journal: Readonly<JournalMeta>;
  readonly article: Readonly<ArticleMeta>;
}

/** A table extracted from a JATS article section. */
export interface Table {
  readonly caption: string;
  readonly headers: ReadonlyArray<string>;
  readonly rows: ReadonlyArray<ReadonlyArray<string>>;
}

/** A figure reference extracted from a JATS article section. */
export interface Figure {
  readonly id: string;
  readonly label: string;
  readonly caption: string;
}

/** A section of the article body containing paragraphs, tables, figures, and subsections. */
export interface Section {
  readonly title: string;
  readonly depth: number;
  readonly paragraphs: ReadonlyArray<string>;
  readonly tables: ReadonlyArray<Readonly<Table>>;
  readonly figures: ReadonlyArray<Readonly<Figure>>;
  readonly subsections: ReadonlyArray<Readonly<Section>>;
}

/** A bibliographic reference from the article's back matter. */
export interface Reference {
  readonly id: string;
  readonly label?: string;
  readonly authors: ReadonlyArray<string>;
  readonly title: string;
  readonly source: string;
  readonly year?: number;
  readonly volume?: string;
  readonly pages?: string;
  readonly doi?: string;
  readonly pmid?: string;
}

/** Back matter of a JATS article containing references, acknowledgements, and appendices. */
export interface Back {
  readonly references: ReadonlyArray<Readonly<Reference>>;
  readonly acknowledgements?: string;
  readonly appendices?: ReadonlyArray<Readonly<Section>>;
}

/** A fully parsed JATS article with front matter, body sections, and back matter. */
export interface JATSArticle {
  readonly front: Readonly<Front>;
  readonly body: ReadonlyArray<Readonly<Section>>;
  readonly back: Readonly<Back>;
}

/** A text chunk produced by splitting article body content for embedding or retrieval. */
export interface Chunk {
  readonly text: string;
  readonly section: string;
  readonly tokenCount: number;
  readonly metadata: Readonly<Record<string, unknown>>;
}

/** Configuration options for the toChunks chunking strategy. */
export interface ChunkOptions {
  readonly maxTokens?: number;
  readonly overlap?: number;
  readonly includeSectionTitle?: boolean;
}
