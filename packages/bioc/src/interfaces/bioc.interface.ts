export type BioCFormat = 'json' | 'xml';

export interface BioCDocument {
  readonly id: string;
  readonly passages: ReadonlyArray<BioCPassage>;
}

export interface BioCPassage {
  readonly offset: number;
  readonly text: string;
  readonly infons: Readonly<Record<string, string>>;
  readonly annotations: ReadonlyArray<BioCAnnotation>;
}

export interface BioCAnnotation {
  readonly id: string;
  readonly text: string;
  readonly infons: Readonly<Record<string, string>>;
  readonly locations: ReadonlyArray<BioCLocation>;
}

export interface BioCLocation {
  readonly offset: number;
  readonly length: number;
}
