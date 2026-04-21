/** Configuration options for the Structure database client. */
export interface StructureConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** Structure search result containing matched record IDs and total count. */
export interface StructureSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** A macromolecular 3D structure record with PDB and MMDB metadata. */
export interface StructureRecord {
  readonly uid: string;
  readonly pdbAccession: string;
  readonly description: string;
  readonly enzymeClassification: string;
  readonly resolution: string;
  readonly experimentalMethod: string;
  readonly pdbClass: string;
  readonly pdbDepositDate: string;
  readonly mmdbEntryDate: string;
  readonly mmdbModifyDate: string;
  readonly organisms: ReadonlyArray<string>;
  readonly pdbAccessionSynonyms: ReadonlyArray<string>;
  readonly ligandCode: string;
  readonly ligandCount: number;
  readonly modifiedProteinResidueCount: number;
  readonly modifiedDnaResidueCount: number;
  readonly modifiedRnaResidueCount: number;
  readonly proteinMoleculeCount: number;
  readonly dnaMoleculeCount: number;
  readonly rnaMoleculeCount: number;
  readonly biopolymerCount: number;
  readonly otherMoleculeCount: number;
}
