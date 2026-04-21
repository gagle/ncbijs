export interface ClinicalTrialsConfig {
  readonly maxRetries?: number | undefined;
}

export interface StudySearchOptions {
  readonly filter?: StudySearchFilter | undefined;
  readonly pageSize?: number | undefined;
  readonly sort?: string | undefined;
  readonly fields?: ReadonlyArray<string> | undefined;
}

export interface StudySearchFilter {
  readonly overallStatus?: ReadonlyArray<string> | undefined;
  readonly condition?: ReadonlyArray<string> | undefined;
  readonly intervention?: ReadonlyArray<string> | undefined;
  readonly sponsor?: string | undefined;
  readonly phase?: ReadonlyArray<string> | undefined;
  readonly studyType?: string | undefined;
}

export interface StudyReport {
  readonly nctId: string;
  readonly briefTitle: string;
  readonly officialTitle: string;
  readonly overallStatus: string;
  readonly phase: string;
  readonly studyType: string;
  readonly startDate: string;
  readonly completionDate: string;
  readonly enrollment: number;
  readonly conditions: ReadonlyArray<string>;
  readonly interventions: ReadonlyArray<StudyIntervention>;
  readonly sponsors: ReadonlyArray<StudySponsor>;
  readonly locations: ReadonlyArray<StudyLocation>;
}

export interface StudyIntervention {
  readonly type: string;
  readonly name: string;
  readonly description: string;
}

export interface StudySponsor {
  readonly name: string;
  readonly role: string;
}

export interface StudyLocation {
  readonly facility: string;
  readonly city: string;
  readonly state: string;
  readonly country: string;
}

export interface StudyStats {
  readonly totalStudies: number;
}

export interface FieldValueCount {
  readonly value: string;
  readonly count: number;
}
