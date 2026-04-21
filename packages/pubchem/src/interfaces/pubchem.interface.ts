/** Configuration for the PubChem client. */
export interface PubChemConfig {
  readonly maxRetries?: number;
}

/** Computed molecular properties for a PubChem compound. */
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

/** List of synonyms for a PubChem compound. */
export interface CompoundSynonyms {
  readonly cid: number;
  readonly synonyms: ReadonlyArray<string>;
}

/** Title and textual description for a PubChem compound. */
export interface CompoundDescription {
  readonly cid: number;
  readonly title: string;
  readonly description: string;
}

/** PubChem substance record with source information. */
export interface SubstanceRecord {
  readonly sid: number;
  readonly sourceName: string;
  readonly sourceId: string;
  readonly description: string;
}

/** List of synonyms for a PubChem substance. */
export interface SubstanceSynonyms {
  readonly sid: number;
  readonly synonyms: ReadonlyArray<string>;
}

/** PubChem bioassay record with protocol and source information. */
export interface AssayRecord {
  readonly aid: number;
  readonly name: string;
  readonly description: string;
  readonly protocol: string;
  readonly sourceName: string;
  readonly sourceId: string;
}

/** Summary counts of substances and compounds tested in a bioassay. */
export interface AssaySummary {
  readonly aid: number;
  readonly name: string;
  readonly sidCount: number;
  readonly cidCount: number;
}

/** Full annotation record from PUG View with hierarchical sections. */
export interface AnnotationRecord {
  readonly recordType: string;
  readonly recordNumber: number;
  readonly recordTitle: string;
  readonly sections: ReadonlyArray<AnnotationSection>;
}

/** A section within a PUG View annotation record. */
export interface AnnotationSection {
  readonly tocHeading: string;
  readonly description: string;
  readonly sections: ReadonlyArray<AnnotationSection>;
  readonly information: ReadonlyArray<AnnotationData>;
}

/** A single data item within a PUG View annotation section. */
export interface AnnotationData {
  readonly referenceNumber: number;
  readonly name: string;
  readonly value: string;
  readonly url: string;
}
