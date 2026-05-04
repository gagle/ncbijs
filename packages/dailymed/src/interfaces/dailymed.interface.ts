/** Configuration for the DailyMed client. */
export interface DailyMedConfig {
  readonly maxRetries?: number;
}

/** Pagination options for DailyMed list endpoints. */
export interface DailyMedPageOptions {
  readonly page?: number;
  readonly pageSize?: number;
}

/** Paginated response metadata from DailyMed. */
export interface DailyMedPagination {
  readonly totalElements: number;
  readonly totalPages: number;
  readonly currentPage: number;
  readonly elementsPerPage: number;
}

/** A paginated result from DailyMed containing data and pagination metadata. */
export interface DailyMedPage<T> {
  readonly data: ReadonlyArray<T>;
  readonly pagination: DailyMedPagination;
}

/** A drug name entry from DailyMed. */
export interface DailyMedDrugName {
  readonly drugName: string;
  readonly nameType: string;
}

/** A Structured Product Label (SPL) summary from DailyMed. */
export interface DailyMedSpl {
  readonly setId: string;
  readonly title: string;
  readonly publishedDate: string;
  readonly splVersion: number;
}

/** A National Drug Code from DailyMed. */
export interface DailyMedNdc {
  readonly ndc: string;
}

/** A drug class from the DailyMed Established Pharmacologic Class (EPC) system. */
export interface DailyMedDrugClass {
  readonly code: string;
  readonly codingSystem: string;
  readonly classType: string;
  readonly name: string;
}
