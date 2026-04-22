import type { BioCDocument, BioCFormat, EntitySearchResult } from './interfaces/bioc.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful';
const PUBTATOR3_BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/pubtator3-api';

/** Fetch BioC annotations for a PubMed article by PMID. */
export function pubmed(pmid: string, format?: 'json'): Promise<BioCDocument>;
export function pubmed(pmid: string, format: 'xml'): Promise<string>;
export function pubmed(pmid: string, format: BioCFormat = 'json'): Promise<BioCDocument | string> {
  return fetchBioC('pmid', pmid, format);
}

/** Fetch BioC annotations for a PMC article by PMCID. */
export function pmc(pmcid: string, format?: 'json'): Promise<BioCDocument>;
export function pmc(pmcid: string, format: 'xml'): Promise<string>;
export function pmc(pmcid: string, format: BioCFormat = 'json'): Promise<BioCDocument | string> {
  return fetchBioC('pmcid', pmcid, format);
}

/** Batch fetch BioC annotations for multiple PubMed articles. */
export function pubmedBatch(
  pmids: ReadonlyArray<string>,
  format?: 'json',
): Promise<ReadonlyArray<BioCDocument>>;
export function pubmedBatch(pmids: ReadonlyArray<string>, format: 'xml'): Promise<string>;
export function pubmedBatch(
  pmids: ReadonlyArray<string>,
  format: BioCFormat = 'json',
): Promise<ReadonlyArray<BioCDocument> | string> {
  return fetchBioCBatch('pmids', pmids, format);
}

/** Batch fetch BioC annotations for multiple PMC articles. */
export function pmcBatch(
  pmcids: ReadonlyArray<string>,
  format?: 'json',
): Promise<ReadonlyArray<BioCDocument>>;
export function pmcBatch(pmcids: ReadonlyArray<string>, format: 'xml'): Promise<string>;
export function pmcBatch(
  pmcids: ReadonlyArray<string>,
  format: BioCFormat = 'json',
): Promise<ReadonlyArray<BioCDocument> | string> {
  return fetchBioCBatch('pmcids', pmcids, format);
}

/** Search for entities by name using the PubTator3 autocomplete API. */
export async function entitySearch(
  query: string,
  type?: string,
): Promise<ReadonlyArray<EntitySearchResult>> {
  if (!query) {
    throw new Error('query must not be empty');
  }

  let url = `${PUBTATOR3_BASE_URL}/entity/autocomplete/?query=${encodeURIComponent(query)}`;

  if (type) {
    url += `&type=${encodeURIComponent(type)}`;
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubTator3 API returned status ${response.status}`);
  }

  return (await response.json()) as ReadonlyArray<EntitySearchResult>;
}

async function fetchBioC(
  idType: string,
  id: string,
  format: BioCFormat,
): Promise<BioCDocument | string> {
  if (!id) {
    throw new Error('id must not be empty');
  }

  const url = `${BASE_URL}/${idType}/get/${encodeURIComponent(id)}/${format}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`BioC API returned status ${response.status}`);
  }

  const text = await response.text();

  if (format === 'xml') {
    return text;
  }

  return JSON.parse(text) as BioCDocument;
}

async function fetchBioCBatch(
  idParam: string,
  ids: ReadonlyArray<string>,
  format: BioCFormat,
): Promise<ReadonlyArray<BioCDocument> | string> {
  if (ids.length === 0) {
    throw new Error('ids must not be empty');
  }

  const formatSegment = format === 'xml' ? 'biocxml' : 'biocjson';
  const commaSeparated = ids.map((id) => encodeURIComponent(id)).join(',');
  const url = `${PUBTATOR3_BASE_URL}/publications/export/${formatSegment}?${idParam}=${commaSeparated}`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`PubTator3 API returned status ${response.status}`);
  }

  const text = await response.text();

  if (format === 'xml') {
    return text;
  }

  return JSON.parse(text) as ReadonlyArray<BioCDocument>;
}
