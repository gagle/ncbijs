import type { ConvertedId, ConvertParams } from './interfaces/id-converter.interface';
import type { paths } from './schema';

type ApiRecord =
  paths['/']['get']['responses'][200]['content']['application/json']['records'][number];

const BASE_URL = 'https://pmc.ncbi.nlm.nih.gov/tools/idconv/api/v1/articles/';
const MAX_IDS_PER_REQUEST = 200;

/** Convert article identifiers between PMID, PMCID, DOI, and Manuscript ID formats. */
export async function convert(
  ids: ReadonlyArray<string>,
  options?: Omit<ConvertParams, 'ids'>,
): Promise<ReadonlyArray<ConvertedId>> {
  if (ids.length === 0) {
    throw new Error('ids array must not be empty');
  }

  if (ids.length > MAX_IDS_PER_REQUEST) {
    throw new Error(`Cannot convert more than ${MAX_IDS_PER_REQUEST} IDs per request`);
  }

  const url = buildRequestUrl(ids, options);
  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(`ID Converter API returned status ${response.status}`);
  }

  let body: unknown;
  try {
    body = await response.json();
  } catch {
    throw new Error('ID Converter API returned malformed response');
  }

  return parseApiResponse(body);
}

function buildRequestUrl(ids: ReadonlyArray<string>, options?: Omit<ConvertParams, 'ids'>): URL {
  const url = new URL(BASE_URL);
  url.searchParams.set('ids', ids.join(','));
  url.searchParams.set('format', 'json');

  if (options?.idtype !== undefined) {
    url.searchParams.set('idtype', options.idtype);
  }
  if (options?.versions === true) {
    url.searchParams.set('versions', 'yes');
  }
  if (options?.showaiid === true) {
    url.searchParams.set('showaiid', 'yes');
  }
  if (options?.tool !== undefined) {
    url.searchParams.set('tool', options.tool);
  }
  if (options?.email !== undefined) {
    url.searchParams.set('email', options.email);
  }

  return url;
}

function parseApiResponse(body: unknown): ReadonlyArray<ConvertedId> {
  if (typeof body !== 'object' || body === null || !('records' in body)) {
    throw new Error('ID Converter API returned malformed response');
  }

  const { records } = body as { records: ReadonlyArray<ApiRecord> };
  if (!Array.isArray(records)) {
    throw new Error('ID Converter API returned malformed response');
  }

  return records.filter((record) => record.errmsg === undefined).map(mapRecordToConvertedId);
}

function mapRecordToConvertedId(record: ApiRecord): ConvertedId {
  const live = record.live === true || record.live === 'true';
  const releaseDate = record['release-date'] ?? '';

  const versions = record.versions?.map((version) => ({
    pmcid: version.pmcid,
    current: version.current === true || version.current === 'true',
  }));

  return {
    pmid: record.pmid !== undefined ? String(record.pmid) : null,
    pmcid: record.pmcid ?? null,
    doi: record.doi ?? null,
    mid: record.mid ?? null,
    live,
    releaseDate,
    ...(versions !== undefined ? { versions } : {}),
    ...(record.aiid !== undefined ? { aiid: record.aiid } : {}),
  };
}
