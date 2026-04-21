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
