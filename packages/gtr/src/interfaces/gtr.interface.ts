/** Configuration options for the GTR client. */
export interface GtrConfig {
  readonly apiKey?: string;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

/** GTR search result containing matched test IDs and total count. */
export interface GtrSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

/** A genetic test record from the Genetic Testing Registry. */
export interface GtrTest {
  readonly uid: string;
  readonly accession: string;
  readonly testName: string;
  readonly testType: string;
  readonly conditions: ReadonlyArray<GtrCondition>;
  readonly analytes: ReadonlyArray<GtrAnalyte>;
  readonly offerer: string;
  readonly offererLocation: GtrLocation;
  readonly methods: ReadonlyArray<GtrMethod>;
  readonly certifications: ReadonlyArray<GtrCertification>;
  readonly specimens: ReadonlyArray<string>;
  readonly testPurposes: ReadonlyArray<string>;
  readonly clinicalValidity: string;
  readonly country: string;
}

/** A condition tested by a GTR genetic test. */
export interface GtrCondition {
  readonly name: string;
  readonly acronym: string;
  readonly cui: string;
}

/** An analyte (gene or region) targeted by a GTR genetic test. */
export interface GtrAnalyte {
  readonly analyteType: string;
  readonly name: string;
  readonly geneId: number;
  readonly location: string;
}

/** Geographic location of a GTR test provider. */
export interface GtrLocation {
  readonly city: string;
  readonly state: string;
  readonly country: string;
}

/** A testing method used in a GTR genetic test. */
export interface GtrMethod {
  readonly name: string;
  readonly categories: ReadonlyArray<GtrMethodCategory>;
}

/** A category grouping related testing methods. */
export interface GtrMethodCategory {
  readonly name: string;
  readonly methods: ReadonlyArray<string>;
}

/** A certification held by a GTR test provider. */
export interface GtrCertification {
  readonly certificationType: string;
  readonly id: string;
}
