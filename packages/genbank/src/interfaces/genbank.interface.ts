/** A parsed GenBank flat file record with all standard sections. */
export interface GenBankRecord {
  readonly locus: GenBankLocus;
  readonly definition: string;
  readonly accession: string;
  readonly version: string;
  readonly dbSource: string;
  readonly keywords: string;
  readonly source: string;
  readonly organism: string;
  readonly lineage: string;
  readonly references: ReadonlyArray<GenBankReference>;
  readonly features: ReadonlyArray<GenBankFeature>;
  readonly sequence: string;
}

/** Parsed LOCUS line of a GenBank record with sequence metadata. */
export interface GenBankLocus {
  readonly name: string;
  readonly length: number;
  readonly moleculeType: string;
  readonly topology: string;
  readonly division: string;
  readonly date: string;
}

/** A bibliographic reference cited in a GenBank record. */
export interface GenBankReference {
  readonly number: number;
  readonly range: string;
  readonly authors: string;
  readonly title: string;
  readonly journal: string;
  readonly pubmedId: string;
}

/** A sequence feature annotation from the FEATURES table of a GenBank record. */
export interface GenBankFeature {
  readonly key: string;
  readonly location: string;
  readonly qualifiers: ReadonlyArray<GenBankQualifier>;
}

/** A key-value qualifier attached to a GenBank feature. */
export interface GenBankQualifier {
  readonly name: string;
  readonly value: string;
}
