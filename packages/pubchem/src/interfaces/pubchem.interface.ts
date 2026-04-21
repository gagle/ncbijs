export interface PubChemConfig {
  readonly maxRetries?: number;
}

export interface CompoundProperty {
  readonly cid: number;
  readonly molecularFormula: string;
  readonly molecularWeight: number;
  readonly iupacName: string;
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string;
  readonly inchi: string;
  readonly inchiKey: string;
  readonly xLogP: number;
  readonly exactMass: number;
  readonly monoisotopicMass: number;
  readonly tpsa: number;
  readonly complexity: number;
  readonly hBondDonorCount: number;
  readonly hBondAcceptorCount: number;
  readonly rotatableBondCount: number;
  readonly heavyAtomCount: number;
}

export interface CompoundSynonyms {
  readonly cid: number;
  readonly synonyms: ReadonlyArray<string>;
}

export interface CompoundDescription {
  readonly cid: number;
  readonly title: string;
  readonly description: string;
}

export interface SubstanceRecord {
  readonly sid: number;
  readonly sourceName: string;
  readonly sourceId: string;
  readonly description: string;
}

export interface SubstanceSynonyms {
  readonly sid: number;
  readonly synonyms: ReadonlyArray<string>;
}

export interface AssayRecord {
  readonly aid: number;
  readonly name: string;
  readonly description: string;
  readonly protocol: string;
  readonly sourceName: string;
  readonly sourceId: string;
}

export interface AssaySummary {
  readonly aid: number;
  readonly name: string;
  readonly sidCount: number;
  readonly cidCount: number;
}

export interface AnnotationRecord {
  readonly recordType: string;
  readonly recordNumber: number;
  readonly recordTitle: string;
  readonly sections: ReadonlyArray<AnnotationSection>;
}

export interface AnnotationSection {
  readonly tocHeading: string;
  readonly description: string;
  readonly sections: ReadonlyArray<AnnotationSection>;
  readonly information: ReadonlyArray<AnnotationData>;
}

export interface AnnotationData {
  readonly referenceNumber: number;
  readonly name: string;
  readonly value: string;
  readonly url: string;
}
