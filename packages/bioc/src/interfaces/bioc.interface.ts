/** Response format for BioC API requests. */
export type BioCFormat = 'json' | 'xml';

/** An annotated document returned by the BioC API. */
export interface BioCDocument {
  readonly id: string;
  readonly passages: ReadonlyArray<BioCPassage>;
}

/** A text passage within a BioC document. */
export interface BioCPassage {
  readonly offset: number;
  readonly text: string;
  readonly infons: Readonly<Record<string, string>>;
  readonly annotations: ReadonlyArray<BioCAnnotation>;
}

/** A named entity annotation within a BioC passage. */
export interface BioCAnnotation {
  readonly id: string;
  readonly text: string;
  readonly infons: Readonly<Record<string, string>>;
  readonly locations: ReadonlyArray<BioCLocation>;
}

/** Character offset and length of an annotation within a passage. */
export interface BioCLocation {
  readonly offset: number;
  readonly length: number;
}

/** Raw entity shape returned by the PubTator3 autocomplete API. */
export interface RawEntitySearchResult {
  readonly _id: string;
  readonly biotype: string;
  readonly db_id: string;
  readonly db: string;
  readonly name: string;
  readonly description: string;
  readonly match: string;
}

/** A mapped entity returned by the PubTator3 autocomplete search. */
export interface EntitySearchResult {
  readonly id: string;
  readonly name: string;
  readonly type: string;
}

/** Raw collection wrapper returned by the BioC RESTful API. */
export interface BioCCollection {
  readonly source: string;
  readonly date: string;
  readonly key: string;
  readonly infons: Readonly<Record<string, string>>;
  readonly documents: ReadonlyArray<BioCDocument>;
}

/** Configuration for the BioC client. */
export interface BioCConfig {
  readonly maxRetries?: number;
}
