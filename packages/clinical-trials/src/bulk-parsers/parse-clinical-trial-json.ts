import type {
  StudyIntervention,
  StudyLocation,
  StudyReport,
  StudySponsor,
} from '../interfaces/clinical-trials.interface';

/**
 * Parse ClinicalTrials.gov bulk JSON into an array of {@link StudyReport} records.
 *
 * Accepts both a JSON array of studies and newline-delimited JSON (NDJSON).
 * The JSON structure matches the ClinicalTrials.gov API v2 response format.
 *
 * @see https://clinicaltrials.gov/data-api/about-api/api-data-downloads
 */
export function parseClinicalTrialJson(json: string): ReadonlyArray<StudyReport> {
  const trimmed = json.trim();

  if (trimmed === '') {
    return [];
  }

  if (trimmed.startsWith('[')) {
    return parseJsonArray(trimmed);
  }

  return parseNdjson(trimmed);
}

function parseJsonArray(json: string): ReadonlyArray<StudyReport> {
  let parsed: unknown;

  try {
    parsed = JSON.parse(json);
  } catch {
    return [];
  }

  if (!Array.isArray(parsed)) {
    return [];
  }

  return (parsed as ReadonlyArray<RawStudyResponse>).map(mapStudyReport);
}

function parseNdjson(ndjson: string): ReadonlyArray<StudyReport> {
  const reports: Array<StudyReport> = [];

  for (const line of ndjson.split('\n')) {
    const trimmedLine = line.trim();

    if (trimmedLine === '') {
      continue;
    }

    try {
      const raw = JSON.parse(trimmedLine) as RawStudyResponse;
      reports.push(mapStudyReport(raw));
    } catch {
      // noop
    }
  }

  return reports;
}

// Raw interfaces and mappers below are intentionally duplicated from
// ../http/clinical-trials.ts to keep bulk-parsers independent of the HTTP layer.

interface RawStudyResponse {
  readonly protocolSection?: RawProtocolSection;
}

interface RawProtocolSection {
  readonly identificationModule?: {
    readonly nctId?: string;
    readonly briefTitle?: string;
    readonly officialTitle?: string;
  };
  readonly statusModule?: {
    readonly overallStatus?: string;
    readonly startDateStruct?: { readonly date?: string };
    readonly completionDateStruct?: { readonly date?: string };
  };
  readonly designModule?: {
    readonly phases?: ReadonlyArray<string>;
    readonly studyType?: string;
    readonly enrollmentInfo?: { readonly count?: number };
  };
  readonly conditionsModule?: {
    readonly conditions?: ReadonlyArray<string>;
  };
  readonly armsInterventionsModule?: {
    readonly interventions?: ReadonlyArray<{
      readonly type?: string;
      readonly name?: string;
      readonly description?: string;
    }>;
  };
  readonly sponsorCollaboratorsModule?: {
    readonly leadSponsor?: { readonly name?: string };
    readonly collaborators?: ReadonlyArray<{ readonly name?: string }>;
  };
  readonly contactsLocationsModule?: {
    readonly locations?: ReadonlyArray<{
      readonly facility?: string;
      readonly city?: string;
      readonly state?: string;
      readonly country?: string;
    }>;
  };
}

function mapStudyReport(raw: RawStudyResponse): StudyReport {
  const protocol = raw.protocolSection;
  const identification = protocol?.identificationModule;
  const status = protocol?.statusModule;
  const design = protocol?.designModule;
  const conditions = protocol?.conditionsModule;
  const arms = protocol?.armsInterventionsModule;
  const sponsors = protocol?.sponsorCollaboratorsModule;
  const contacts = protocol?.contactsLocationsModule;

  const sponsorsList: Array<StudySponsor> = [];

  if (sponsors?.leadSponsor?.name !== undefined) {
    sponsorsList.push({ name: sponsors.leadSponsor.name, role: 'lead' });
  }

  for (const collaborator of sponsors?.collaborators ?? []) {
    if (collaborator.name !== undefined) {
      sponsorsList.push({ name: collaborator.name, role: 'collaborator' });
    }
  }

  return {
    nctId: identification?.nctId ?? '',
    briefTitle: identification?.briefTitle ?? '',
    officialTitle: identification?.officialTitle ?? '',
    overallStatus: status?.overallStatus ?? '',
    phase: (design?.phases ?? []).join('/'),
    studyType: design?.studyType ?? '',
    startDate: status?.startDateStruct?.date ?? '',
    completionDate: status?.completionDateStruct?.date ?? '',
    enrollment: design?.enrollmentInfo?.count ?? 0,
    conditions: conditions?.conditions ?? [],
    interventions: (arms?.interventions ?? []).map(mapIntervention),
    sponsors: sponsorsList,
    locations: (contacts?.locations ?? []).map(mapLocation),
  };
}

function mapIntervention(raw: {
  readonly type?: string;
  readonly name?: string;
  readonly description?: string;
}): StudyIntervention {
  return {
    type: raw.type ?? '',
    name: raw.name ?? '',
    description: raw.description ?? '',
  };
}

function mapLocation(raw: {
  readonly facility?: string;
  readonly city?: string;
  readonly state?: string;
  readonly country?: string;
}): StudyLocation {
  return {
    facility: raw.facility ?? '',
    city: raw.city ?? '',
    state: raw.state ?? '',
    country: raw.country ?? '',
  };
}
