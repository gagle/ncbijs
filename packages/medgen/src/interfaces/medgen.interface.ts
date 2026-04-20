export interface MedGenConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface MedGenSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

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

export interface MedGenGene {
  readonly geneId: number;
  readonly symbol: string;
  readonly chromosome: string;
  readonly cytogeneticLocation: string;
}

export interface MedGenInheritance {
  readonly name: string;
  readonly cui: string;
}

export interface MedGenClinicalFeature {
  readonly name: string;
  readonly hpoId: string;
  readonly cui: string;
}

export interface MedGenDefinition {
  readonly source: string;
  readonly text: string;
}

export interface MedGenName {
  readonly name: string;
  readonly source: string;
  readonly type: string;
}
