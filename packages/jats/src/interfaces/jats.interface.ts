/** A date that may have only year, year-month, or full year-month-day precision. */
export interface PartialDate {
  readonly year: number;
  readonly month?: number | undefined;
  readonly day?: number | undefined;
}

/** An article author with name components, ORCID, and affiliations. */
export interface Author {
  readonly lastName?: string | undefined;
  readonly foreName?: string | undefined;
  readonly initials?: string | undefined;
  readonly collectiveName?: string | undefined;
  readonly orcid?: string | undefined;
  readonly affiliations: ReadonlyArray<string>;
}

/** Journal-level metadata from the JATS front matter. */
export interface JournalMeta {
  readonly title: string;
  readonly isoAbbrev?: string | undefined;
  readonly publisher?: string | undefined;
  readonly issn?: string | undefined;
}

/** Article-level metadata from the JATS front matter. */
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

/** Back matter of a JATS article containing references, acknowledgements, and appendices. */
export interface Back {
  readonly references: ReadonlyArray<Readonly<Reference>>;
  readonly acknowledgements?: string | undefined;
  readonly appendices?: ReadonlyArray<Readonly<Section>> | undefined;
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
  readonly maxTokens?: number | undefined;
  readonly overlap?: number | undefined;
  readonly includeSectionTitle?: boolean | undefined;
}
