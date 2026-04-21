/** Configuration for the ClinicalTrials client. */
export interface ClinicalTrialsConfig {
  readonly maxRetries?: number | undefined;
}

/** Options for searching clinical trial studies. */
export interface StudySearchOptions {
  readonly filter?: StudySearchFilter | undefined;
  readonly pageSize?: number | undefined;
  readonly sort?: string | undefined;
  readonly fields?: ReadonlyArray<string> | undefined;
}

/** Filter criteria for study searches. */
export interface StudySearchFilter {
  readonly overallStatus?: ReadonlyArray<string> | undefined;
  readonly condition?: ReadonlyArray<string> | undefined;
  readonly intervention?: ReadonlyArray<string> | undefined;
  readonly sponsor?: string | undefined;
  readonly phase?: ReadonlyArray<string> | undefined;
  readonly studyType?: string | undefined;
}

/** Full report for a clinical trial study. */
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

/** Intervention applied in a clinical trial. */
export interface StudyIntervention {
  readonly type: string;
  readonly name: string;
  readonly description: string;
}

/** Sponsor or collaborator of a clinical trial. */
export interface StudySponsor {
  readonly name: string;
  readonly role: string;
}

/** Geographic location of a clinical trial site. */
export interface StudyLocation {
  readonly facility: string;
  readonly city: string;
  readonly state: string;
  readonly country: string;
}

/** Aggregate statistics about the ClinicalTrials.gov database. */
export interface StudyStats {
  readonly totalStudies: number;
}

/** Distinct value and its occurrence count for a study field. */
export interface FieldValueCount {
  readonly value: string;
  readonly count: number;
}
