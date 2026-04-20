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
