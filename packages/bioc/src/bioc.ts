import type { BioCDocument, BioCFormat } from './interfaces/bioc.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful';

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
