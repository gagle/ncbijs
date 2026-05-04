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

/** A drug-to-class relationship from the RxClass API. */
export interface RxClassDrugInfo {
  readonly rxcui: string;
  readonly drugName: string;
  readonly tty: string;
  readonly classId: string;
  readonly className: string;
  readonly classType: string;
  readonly rela: string;
  readonly relaSource: string;
}

/** A minimal RxClass concept (class ID, name, and type). */
export interface RxClassConcept {
  readonly classId: string;
  readonly className: string;
  readonly classType: string;
}

/** A drug member of an RxClass drug class. */
export interface RxClassMember {
  readonly rxcui: string;
  readonly name: string;
  readonly tty: string;
}
