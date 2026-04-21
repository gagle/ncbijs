import type {
  BioCAnnotation,
  BioCDocument,
  BioCFormat,
  BioCLocation,
  BioCPassage,
} from './interfaces/bioc.interface';

const BASE_URL = 'https://www.ncbi.nlm.nih.gov/research/bionlp/RESTful';

interface RawBioCDocument {
  readonly id: string;
  readonly passages: ReadonlyArray<RawBioCPassage>;
}

interface RawBioCPassage {
  readonly offset: number;
  readonly text: string;
  readonly infons: Record<string, string>;
  readonly annotations: ReadonlyArray<RawBioCAnnotation>;
}

interface RawBioCAnnotation {
  readonly id: string;
  readonly text: string;
  readonly infons: Record<string, string>;
  readonly locations: ReadonlyArray<RawBioCLocation>;
}

interface RawBioCLocation {
  readonly offset: number;
  readonly length: number;
}

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

  return mapDocument(JSON.parse(text) as RawBioCDocument);
}

function mapDocument(raw: RawBioCDocument): BioCDocument {
  return {
    id: raw.id,
    passages: raw.passages.map(mapPassage),
  };
}

function mapPassage(raw: RawBioCPassage): BioCPassage {
  return {
    offset: raw.offset,
    text: raw.text,
    infons: raw.infons,
    annotations: raw.annotations.map(mapAnnotation),
  };
}

function mapAnnotation(raw: RawBioCAnnotation): BioCAnnotation {
  return {
    id: raw.id,
    text: raw.text,
    infons: raw.infons,
    locations: raw.locations.map(mapLocation),
  };
}

function mapLocation(raw: RawBioCLocation): BioCLocation {
  return {
    offset: raw.offset,
    length: raw.length,
  };
}
