/** Configuration for the RxNorm client. */
export interface RxNormConfig {
  readonly maxRetries?: number;
}

/** An RxNorm concept identified by RxCUI, name, and term type. */
export interface RxConcept {
  readonly rxcui: string;
  readonly name: string;
  readonly tty: string;
}

/** Extended properties for an RxNorm concept. */
export interface RxConceptProperties {
  readonly rxcui: string;
  readonly name: string;
  readonly synonym: string;
  readonly tty: string;
  readonly language: string;
  readonly suppress: string;
}

/** Group of drug concepts returned by a drug name lookup. */
export interface DrugGroup {
  readonly name: string;
  readonly conceptGroup: ReadonlyArray<ConceptGroup>;
}

/** Group of RxNorm concepts sharing the same term type. */
export interface ConceptGroup {
  readonly tty: string;
  readonly conceptProperties: ReadonlyArray<RxConcept>;
}

/** A drug-drug interaction with severity and involved concepts. */
export interface DrugInteraction {
  readonly description: string;
  readonly severity: string;
  readonly interactionConcept: ReadonlyArray<InteractionConcept>;
}

/** A concept involved in a drug-drug interaction. */
export interface InteractionConcept {
  readonly rxcui: string;
  readonly name: string;
  readonly tty: string;
  readonly sourceConceptId: string;
  readonly sourceConceptName: string;
}

/** Options for fuzzy drug name lookup. */
export interface ApproximateTermOptions {
  readonly maxEntries?: number;
  readonly option?: 0 | 1;
}

/** A ranked candidate from a fuzzy drug name lookup. */
export interface RxTermCandidate {
  readonly rxcui: string;
  readonly name: string;
  readonly score: number;
  readonly rank: number;
}

/** Historical status of an RxNorm concept. */
export interface RxConceptHistory {
  readonly rxcui: string;
  readonly name: string;
  readonly status: string;
  readonly remappedTo: ReadonlyArray<string>;
}

/** A property name-value pair for an RxNorm concept. */
export interface RxProperty {
  readonly category: string;
  readonly name: string;
  readonly value: string;
}
