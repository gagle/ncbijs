export interface RxNormConfig {
  readonly maxRetries?: number | undefined;
}

export interface RxConcept {
  readonly rxcui: string;
  readonly name: string;
  readonly tty: string;
}

export interface RxConceptProperties {
  readonly rxcui: string;
  readonly name: string;
  readonly synonym: string;
  readonly tty: string;
  readonly language: string;
  readonly suppress: string;
}

export interface DrugGroup {
  readonly name: string;
  readonly conceptGroup: ReadonlyArray<ConceptGroup>;
}

export interface ConceptGroup {
  readonly tty: string;
  readonly conceptProperties: ReadonlyArray<RxConcept>;
}

export interface DrugInteraction {
  readonly description: string;
  readonly severity: string;
  readonly interactionConcept: ReadonlyArray<InteractionConcept>;
}

export interface InteractionConcept {
  readonly rxcui: string;
  readonly name: string;
  readonly tty: string;
  readonly sourceConceptId: string;
  readonly sourceConceptName: string;
}
