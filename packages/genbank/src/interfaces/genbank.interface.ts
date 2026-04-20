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

export interface GenBankLocus {
  readonly name: string;
  readonly length: number;
  readonly moleculeType: string;
  readonly topology: string;
  readonly division: string;
  readonly date: string;
}

export interface GenBankReference {
  readonly number: number;
  readonly range: string;
  readonly authors: string;
  readonly title: string;
  readonly journal: string;
  readonly pubmedId: string;
}

export interface GenBankFeature {
  readonly key: string;
  readonly location: string;
  readonly qualifiers: ReadonlyArray<GenBankQualifier>;
}

export interface GenBankQualifier {
  readonly name: string;
  readonly value: string;
}
