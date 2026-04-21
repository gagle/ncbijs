/** Configuration options for the MedGen client. */
export interface MedGenConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** MedGen search result containing matched concept IDs and total count. */
export interface MedGenSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** A MedGen concept with associated genes, inheritance, and clinical features. */
export interface MedGenConcept {
  readonly uid: string;
  readonly conceptId: string;
  readonly title: string;
  readonly definition: string;
  readonly semanticType: string;
  readonly associatedGenes: ReadonlyArray<MedGenGene>;
  readonly modesOfInheritance: ReadonlyArray<MedGenInheritance>;
  readonly clinicalFeatures: ReadonlyArray<MedGenClinicalFeature>;
  readonly omimIds: ReadonlyArray<string>;
  readonly definitions: ReadonlyArray<MedGenDefinition>;
  readonly names: ReadonlyArray<MedGenName>;
}

/** A gene associated with a MedGen concept. */
export interface MedGenGene {
  readonly geneId: number;
  readonly symbol: string;
  readonly chromosome: string;
  readonly cytogeneticLocation: string;
}

/** A mode of inheritance for a MedGen concept. */
export interface MedGenInheritance {
  readonly name: string;
  readonly cui: string;
}

/** A clinical feature (phenotype) linked to a MedGen concept. */
export interface MedGenClinicalFeature {
  readonly name: string;
  readonly hpoId: string;
  readonly cui: string;
}

/** A sourced definition for a MedGen concept. */
export interface MedGenDefinition {
  readonly source: string;
  readonly text: string;
}

/** An alternative name for a MedGen concept from a specific source. */
export interface MedGenName {
  readonly name: string;
  readonly source: string;
  readonly type: string;
}
