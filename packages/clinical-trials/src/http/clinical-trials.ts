import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './clinical-trials-client';
import type { ClinicalTrialsClientConfig } from './clinical-trials-client';
import type {
  ClinicalTrialsConfig,
  FieldValueCount,
  StudyFieldDefinition,
  StudyIntervention,
  StudyLocation,
  StudyMetadata,
  StudyReport,
  StudySearchFilter,
  StudySearchOptions,
  StudySponsor,
  StudyStats,
} from '../interfaces/clinical-trials.interface';

const BASE_URL = 'https://clinicaltrials.gov/api/v2';
const REQUESTS_PER_SECOND = 2;

/** ClinicalTrials.gov v2 API client with automatic rate limiting and retry. */
export class ClinicalTrials {
  private readonly _config: ClinicalTrialsClientConfig;

  constructor(config?: ClinicalTrialsConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Fetch a single study by NCT ID. */
  public async study(nctId: string): Promise<StudyReport> {
    const url = `${BASE_URL}/studies/${encodeURIComponent(nctId)}`;
    const raw = await fetchJson<RawStudyResponse>(url, this._config);

    return mapStudyReport(raw);
  }

  /** Search studies with cursor-based pagination. */
  public async *searchStudies(
    query: string,
    options?: StudySearchOptions,
  ): AsyncIterableIterator<StudyReport> {
    const params = new URLSearchParams();
    params.set('query.term', query);

    if (options?.pageSize !== undefined) {
      params.set('pageSize', String(options.pageSize));
    }
    if (options?.sort !== undefined) {
      params.set('sort', options.sort);
    }
    if (options?.fields !== undefined) {
      params.set('fields', options.fields.join(','));
    }

    applySearchFilters(params, options?.filter);

    let url: string | undefined = `${BASE_URL}/studies?${params.toString()}`;

    while (url !== undefined) {
      const raw: RawStudiesResponse = await fetchJson<RawStudiesResponse>(url, this._config);

      for (const study of raw.studies ?? []) {
        yield mapStudyReport(study);
      }

      url =
        raw.nextPageToken !== undefined
          ? `${BASE_URL}/studies?${params.toString()}&pageToken=${encodeURIComponent(raw.nextPageToken)}`
          : undefined;
    }
  }

  /** Fetch aggregate statistics about the study database. */
  public async studyStats(): Promise<StudyStats> {
    const url = `${BASE_URL}/stats/size`;
    const raw = await fetchJson<RawStatsResponse>(url, this._config);

    return { totalStudies: raw.totalStudies ?? 0 };
  }

  /** Fetch distinct values and their counts for a study field. */
  public async studyFieldValues(field: string): Promise<ReadonlyArray<FieldValueCount>> {
    const url = `${BASE_URL}/stats/fieldValues/${encodeURIComponent(field)}`;
    const raw = await fetchJson<RawFieldValuesResponse>(url, this._config);

    return (raw.topValues ?? []).map((entry) => ({
      value: entry.value ?? '',
      count: entry.studiesCount ?? 0,
    }));
  }

  /** Fetch field definitions for the studies API. */
  public async studyMetadata(): Promise<StudyMetadata> {
    const url = `${BASE_URL}/studies/metadata`;
    const raw = await fetchJson<ReadonlyArray<RawMetadataNode>>(url, this._config);

    return {
      fields: flattenMetadataTree(raw),
    };
  }

  /** Fetch valid enum values for a specific study field. */
  public async enumValues(field: string): Promise<ReadonlyArray<string>> {
    const url = `${BASE_URL}/stats/fieldValues/${encodeURIComponent(field)}`;
    const raw = await fetchJson<RawFieldValuesResponse>(url, this._config);

    return (raw.topValues ?? []).map((entry) => entry.value ?? '');
  }

  /** Get total count of studies matching a query without fetching results. */
  public async studySize(query?: string, filter?: StudySearchFilter): Promise<number> {
    const params = new URLSearchParams();
    params.set('countTotal', 'true');
    params.set('pageSize', '0');

    if (query !== undefined) {
      params.set('query.term', query);
    }

    applySearchFilters(params, filter);

    const url = `${BASE_URL}/studies?${params.toString()}`;
    const raw = await fetchJson<RawStudySizeResponse>(url, this._config);

    return raw.totalCount ?? 0;
  }
}

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

interface RawStudiesResponse {
  readonly studies?: ReadonlyArray<RawStudyResponse>;
  readonly nextPageToken?: string;
}

interface RawStatsResponse {
  readonly totalStudies?: number;
}

interface RawFieldValuesResponse {
  readonly topValues?: ReadonlyArray<{
    readonly value?: string;
    readonly studiesCount?: number;
  }>;
}

interface RawMetadataNode {
  readonly name?: string;
  readonly piece?: string;
  readonly sourceType?: string;
  readonly children?: ReadonlyArray<RawMetadataNode>;
}

interface RawStudySizeResponse {
  readonly totalCount?: number;
}

function applySearchFilters(params: URLSearchParams, filter?: StudySearchFilter): void {
  if (filter?.overallStatus !== undefined) {
    params.set('filter.overallStatus', filter.overallStatus.join(','));
  }
  if (filter?.condition !== undefined) {
    params.set('query.cond', filter.condition.join(' OR '));
  }
  if (filter?.intervention !== undefined) {
    params.set('query.intr', filter.intervention.join(' OR '));
  }
  if (filter?.sponsor !== undefined) {
    params.set('query.spons', filter.sponsor);
  }
  if (filter?.phase !== undefined) {
    params.set('filter.phase', filter.phase.join(','));
  }
  if (filter?.studyType !== undefined) {
    params.set('filter.studyType', filter.studyType);
  }
}

// Mappers below are duplicated in ../bulk-parsers/parse-clinical-trial-json.ts
// to keep bulk-parsers independent of the HTTP layer. Update both when changing.
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

function flattenMetadataTree(
  nodes: ReadonlyArray<RawMetadataNode>,
  parentPath = '',
): ReadonlyArray<StudyFieldDefinition> {
  const result: Array<StudyFieldDefinition> = [];

  for (const node of nodes) {
    const nodeName = node.name ?? '';
    const path = parentPath !== '' ? `${parentPath}.${nodeName}` : nodeName;
    const sourceType = node.sourceType ?? '';
    const isLeaf = node.children === undefined || node.children.length === 0;

    result.push({
      name: path,
      type: sourceType,
      description: node.piece ?? '',
      sourceField: path,
      isEnum: sourceType === 'ENUM',
    });

    if (!isLeaf) {
      const childFields = flattenMetadataTree(node.children ?? [], path);
      for (const child of childFields) {
        result.push(child);
      }
    }
  }

  return result;
}
