import type { CitationFormat, CitationSource, CSLData } from './interfaces/cite.interface';

const BASE_URL = 'https://api.ncbi.nlm.nih.gov/lit/ctxp/v1';
const REQUEST_DELAY_MS = 334;

export function cite(id: string, format: 'csl', source?: CitationSource): Promise<CSLData>;
export function cite(
  id: string,
  format: Exclude<CitationFormat, 'csl'>,
  source?: CitationSource,
): Promise<string>;
export function cite(
  id: string,
  format: CitationFormat,
  source?: CitationSource,
): Promise<string | CSLData> {
  return fetchCitation(id, format, source);
}

export async function* citeMany(
  ids: ReadonlyArray<string>,
  format: CitationFormat,
  source?: CitationSource,
): AsyncIterableIterator<Readonly<{ id: string; citation: string | CSLData }>> {
  for (const [index, id] of ids.entries()) {
    if (index > 0) {
      await delay(REQUEST_DELAY_MS);
    }

    const citation = await fetchCitation(id, format, source);
    yield { id, citation };
  }
}

async function fetchCitation(
  id: string,
  format: CitationFormat,
  source?: CitationSource,
): Promise<string | CSLData> {
  if (!id) {
    throw new Error('id must not be empty');
  }

  const resolvedSource = source ?? 'pubmed';
  const url = buildCitationUrl(id, format, resolvedSource);
  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Article not found: ${id}`);
    }
    throw new Error(`Citation Exporter API returned status ${response.status}`);
  }

  const text = await response.text();

  if (format === 'csl') {
    return parseCSLResponse(text);
  }

  return text;
}

function buildCitationUrl(id: string, format: CitationFormat, source: CitationSource): string {
  const url = new URL(`${BASE_URL}/${source}/`);
  url.searchParams.set('format', format);
  url.searchParams.set('id', id);
  return url.toString();
}

function parseCSLResponse(text: string): CSLData {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('Citation Exporter API returned malformed CSL JSON');
  }

  if (typeof parsed !== 'object' || parsed === null || !('type' in parsed)) {
    throw new Error('Citation Exporter API returned malformed CSL JSON');
  }

  return parsed as CSLData;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
