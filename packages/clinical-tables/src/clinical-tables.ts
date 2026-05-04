import { TokenBucket } from '@ncbijs/rate-limiter';
import { fetchJson, resolveConfig } from './clinical-tables-client';
import type { ClinicalTablesClientConfig } from './clinical-tables-client';
import type {
  ClinicalTablesConfig,
  ClinicalTablesResult,
  ClinicalTablesSearchOptions,
} from './interfaces/clinical-tables.interface';

const BASE_URL = 'https://clinicaltables.nlm.nih.gov/api';
const REQUESTS_PER_SECOND = 3;

type RawSearchResponse = [
  number,
  ReadonlyArray<string>,
  Record<string, ReadonlyArray<string>> | null,
  ReadonlyArray<ReadonlyArray<string>>,
];

/**
 * Search an NLM Clinical Tables resource by term with optional pagination and extra fields.
 * @param table - The Clinical Tables resource name (e.g., 'conditions', 'drug_ingredients').
 * @param term - The search term to match against.
 */
export async function search(
  table: string,
  term: string,
  options?: ClinicalTablesSearchOptions,
  config?: ClinicalTablesConfig,
): Promise<ClinicalTablesResult> {
  if (!table) {
    throw new Error('table must not be empty');
  }

  const clientConfig: ClinicalTablesClientConfig = config
    ? {
        maxRetries: config.maxRetries ?? 3,
        rateLimiter: new TokenBucket({ requestsPerSecond: REQUESTS_PER_SECOND }),
      }
    : resolveConfig();

  const url = new URL(`${BASE_URL}/${encodeURIComponent(table)}/v3/search`);
  url.searchParams.set('terms', term);

  if (options?.maxList !== undefined) {
    url.searchParams.set('maxList', String(options.maxList));
  }
  if (options?.count !== undefined) {
    url.searchParams.set('count', String(options.count));
  }
  if (options?.offset !== undefined) {
    url.searchParams.set('offset', String(options.offset));
  }
  if (options?.extraFields !== undefined && options.extraFields.length > 0) {
    url.searchParams.set('ef', options.extraFields.join(','));
  }

  const raw = await fetchJson<RawSearchResponse>(url.toString(), clientConfig);

  return {
    totalCount: raw[0],
    codes: raw[1],
    displayStrings: raw[3].map((entry) => entry[0] ?? ''),
    extras:
      options?.extraFields !== undefined && raw[2] !== null
        ? mapExtras(raw[2], options.extraFields)
        : [],
  };
}

function mapExtras(
  rawExtras: Record<string, ReadonlyArray<string>>,
  fields: ReadonlyArray<string>,
): ReadonlyArray<ReadonlyArray<string>> {
  const firstField = fields[0];

  if (firstField === undefined) {
    return [];
  }

  const length = rawExtras[firstField]?.length ?? 0;
  const result: Array<Array<string>> = [];

  for (let rowIndex = 0; rowIndex < length; rowIndex++) {
    const row: Array<string> = [];
    for (const field of fields) {
      row.push(rawExtras[field]?.[rowIndex] ?? '');
    }
    result.push(row);
  }

  return result;
}
