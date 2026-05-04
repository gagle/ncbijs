import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson } from './dailymed-client';
import type { DailyMedClientConfig } from './dailymed-client';
import type {
  DailyMedConfig,
  DailyMedDrugClass,
  DailyMedDrugName,
  DailyMedNdc,
  DailyMedPage,
  DailyMedPageOptions,
  DailyMedPagination,
  DailyMedSpl,
} from './interfaces/dailymed.interface';

const BASE_URL = 'https://dailymed.nlm.nih.gov/dailymed/services/v2';
const REQUESTS_PER_SECOND = 5;

/** DailyMed REST API v2 client for drug labels, NDC codes, and drug classes. */
export class DailyMed {
  private readonly _config: DailyMedClientConfig;

  constructor(config?: DailyMedConfig) {
    this._config = {
      maxRetries: config?.maxRetries ?? 3,
      rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
    };
  }

  /** Search drug names by keyword. */
  public async drugNames(
    drugName: string,
    options?: DailyMedPageOptions,
  ): Promise<DailyMedPage<DailyMedDrugName>> {
    const params = new URLSearchParams({ drug_name: drugName });
    appendPageOptions(params, options);

    const url = `${BASE_URL}/drugnames.json?${params.toString()}`;
    const raw = await fetchJson<RawDailyMedResponse<RawDrugName>>(url, this._config);

    return {
      data: (raw.data ?? []).map((entry) => ({
        drugName: entry.drug_name ?? '',
        nameType: entry.name_type ?? '',
      })),
      pagination: mapPagination(raw.metadata),
    };
  }

  /** Search Structured Product Labels (SPLs) by drug name. */
  public async spls(
    drugName: string,
    options?: DailyMedPageOptions,
  ): Promise<DailyMedPage<DailyMedSpl>> {
    const params = new URLSearchParams({ drug_name: drugName });
    appendPageOptions(params, options);

    const url = `${BASE_URL}/spls.json?${params.toString()}`;
    const raw = await fetchJson<RawDailyMedResponse<RawSpl>>(url, this._config);

    return {
      data: (raw.data ?? []).map((entry) => ({
        setId: entry.setid ?? '',
        title: entry.title ?? '',
        publishedDate: entry.published_date ?? '',
        splVersion: entry.spl_version ?? 0,
      })),
      pagination: mapPagination(raw.metadata),
    };
  }

  /** Search NDC codes by drug name. */
  public async ndcs(
    drugName: string,
    options?: DailyMedPageOptions,
  ): Promise<DailyMedPage<DailyMedNdc>> {
    const params = new URLSearchParams({ drug_name: drugName });
    appendPageOptions(params, options);

    const url = `${BASE_URL}/ndcs.json?${params.toString()}`;
    const raw = await fetchJson<RawDailyMedResponse<RawNdc>>(url, this._config);

    return {
      data: (raw.data ?? []).map((entry) => ({
        ndc: entry.ndc ?? '',
      })),
      pagination: mapPagination(raw.metadata),
    };
  }

  /** List all Established Pharmacologic Classes (EPCs). */
  public async drugClasses(
    options?: DailyMedPageOptions,
  ): Promise<DailyMedPage<DailyMedDrugClass>> {
    const params = new URLSearchParams();
    appendPageOptions(params, options);

    const queryString = params.toString();
    const url = queryString
      ? `${BASE_URL}/drugclasses.json?${queryString}`
      : `${BASE_URL}/drugclasses.json`;
    const raw = await fetchJson<RawDailyMedResponse<RawDrugClass>>(url, this._config);

    return {
      data: (raw.data ?? []).map((entry) => ({
        code: entry.code ?? '',
        codingSystem: entry.codingSystem ?? '',
        classType: entry.type ?? '',
        name: entry.name ?? '',
      })),
      pagination: mapPagination(raw.metadata),
    };
  }
}

function appendPageOptions(params: URLSearchParams, options?: DailyMedPageOptions): void {
  if (options?.page !== undefined) {
    params.set('page', String(options.page));
  }

  if (options?.pageSize !== undefined) {
    params.set('pagesize', String(options.pageSize));
  }
}

interface RawDailyMedResponse<T> {
  readonly data?: ReadonlyArray<T>;
  readonly metadata?: RawMetadata;
}

interface RawMetadata {
  readonly total_elements?: number;
  readonly total_pages?: number;
  readonly current_page?: number;
  readonly elements_per_page?: number;
}

interface RawDrugName {
  readonly drug_name?: string;
  readonly name_type?: string;
}

interface RawSpl {
  readonly setid?: string;
  readonly title?: string;
  readonly published_date?: string;
  readonly spl_version?: number;
}

interface RawNdc {
  readonly ndc?: string;
}

interface RawDrugClass {
  readonly code?: string;
  readonly codingSystem?: string;
  readonly type?: string;
  readonly name?: string;
}

function mapPagination(raw?: RawMetadata): DailyMedPagination {
  return {
    totalElements: raw?.total_elements ?? 0,
    totalPages: raw?.total_pages ?? 0,
    currentPage: raw?.current_page ?? 0,
    elementsPerPage: raw?.elements_per_page ?? 0,
  };
}
