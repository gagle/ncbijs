import type { ConvertedId } from '../interfaces/id-converter.interface';

/**
 * Parse an NCBI PMC-ids.csv file into an array of {@link ConvertedId} records.
 *
 * The CSV columns are: Journal Title, ISSN, eISSN, Year, Volume, Issue, Page,
 * DOI, PMCID, PMID, Manuscript Id, Release Date.
 */
export function parsePmcIdsCsv(csv: string): ReadonlyArray<ConvertedId> {
  const lines = csv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = lines[0] ?? '';
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const records: Array<ConvertedId> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '') {
      continue;
    }

    const fields = parseCsvLine(line);
    records.push(mapConvertedId(fields, columnIndices));
  }

  return records;
}

interface ColumnIndices {
  readonly doi: number;
  readonly pmcid: number;
  readonly pmid: number;
  readonly mid: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = parseCsvLine(headerLine).map((header) => header.trim().toLowerCase());

  const doi = headers.indexOf('doi');
  const pmcid = headers.indexOf('pmcid');
  const pmid = headers.indexOf('pmid');
  const mid = headers.indexOf('manuscript id');

  if (pmcid === -1 || pmid === -1) {
    return undefined;
  }

  return { doi, pmcid, pmid, mid };
}

function mapConvertedId(fields: ReadonlyArray<string>, indices: ColumnIndices): ConvertedId {
  const midValue = fieldAt(fields, indices.mid);

  return {
    pmid: emptyToNull(fieldAt(fields, indices.pmid)),
    pmcid: emptyToNull(fieldAt(fields, indices.pmcid)),
    doi: emptyToNull(fieldAt(fields, indices.doi)),
    ...(midValue !== '' ? { mid: midValue } : {}),
  };
}

function fieldAt(fields: ReadonlyArray<string>, index: number): string {
  if (index < 0 || index >= fields.length) {
    return '';
  }

  return (fields[index] ?? '').trim();
}

function emptyToNull(value: string): string | null {
  return value === '' ? null : value;
}

function parseCsvLine(line: string): ReadonlyArray<string> {
  const fields: Array<string> = [];
  let current = '';
  let inQuotes = false;

  for (let charIndex = 0; charIndex < line.length; charIndex++) {
    const character = line.charAt(charIndex);

    if (inQuotes) {
      if (character === '"') {
        if (charIndex + 1 < line.length && line.charAt(charIndex + 1) === '"') {
          current += '"';
          charIndex++;
        } else {
          inQuotes = false;
        }
      } else {
        current += character;
      }
    } else if (character === '"') {
      inQuotes = true;
    } else if (character === ',') {
      fields.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  fields.push(current);

  return fields;
}
