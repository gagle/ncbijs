export interface GtrConfig {
  readonly apiKey?: string | undefined;
  readonly tool?: string;
  readonly email?: string;
  readonly maxRetries?: number;
}

export interface GtrSearchResult {
  readonly total: number;
  readonly ids: ReadonlyArray<string>;
}

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

export interface GtrCondition {
  readonly name: string;
  readonly acronym: string;
  readonly cui: string;
}

export interface GtrAnalyte {
  readonly analyteType: string;
  readonly name: string;
  readonly geneId: number;
  readonly location: string;
}

export interface GtrLocation {
  readonly city: string;
  readonly state: string;
  readonly country: string;
}

export interface GtrMethod {
  readonly name: string;
  readonly categories: ReadonlyArray<GtrMethodCategory>;
}

export interface GtrMethodCategory {
  readonly name: string;
  readonly methods: ReadonlyArray<string>;
}

export interface GtrCertification {
  readonly certificationType: string;
  readonly id: string;
}
