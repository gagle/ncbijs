import type { ICitePublication } from '../interfaces/icite.interface';

/**
 * Parse an iCite CSV export into an array of {@link ICitePublication} records.
 *
 * @see https://icite.od.nih.gov/api (Figshare monthly snapshots)
 */
export function parseIciteCsv(csv: string): ReadonlyArray<ICitePublication> {
  const lines = csv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = (lines[0] ?? '').trim();
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const publications: Array<ICitePublication> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '') {
      continue;
    }

    const fields = parseCsvLine(line);
    publications.push(mapPublication(fields, columnIndices));
  }

  return publications;
}

interface ColumnIndices {
  readonly pmid: number;
  readonly year: number;
  readonly title: number;
  readonly authors: number;
  readonly journal: number;
  readonly isResearchArticle: number;
  readonly relativeCitationRatio: number;
  readonly nihPercentile: number;
  readonly citationCount: number;
  readonly referencesCount: number;
  readonly expectedCitationsPerYear: number;
  readonly fieldCitationRate: number;
  readonly citationsPerYear: number;
  readonly isClinical: number;
  readonly provisional: number;
  readonly human: number;
  readonly animal: number;
  readonly molecularCellular: number;
  readonly apt: number;
  readonly citedBy: number;
  readonly references: number;
  readonly doi: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = parseCsvLine(headerLine).map((header) => header.trim().toLowerCase());

  const pmid = headers.indexOf('pmid');

  if (pmid === -1) {
    return undefined;
  }

  return {
    pmid,
    year: headers.indexOf('year'),
    title: headers.indexOf('title'),
    authors: headers.indexOf('authors'),
    journal: headers.indexOf('journal'),
    isResearchArticle: headers.indexOf('is_research_article'),
    relativeCitationRatio: headers.indexOf('relative_citation_ratio'),
    nihPercentile: headers.indexOf('nih_percentile'),
    citationCount: headers.indexOf('citation_count'),
    referencesCount: headers.indexOf('references_count'),
    expectedCitationsPerYear: headers.indexOf('expected_citations_per_year'),
    fieldCitationRate: headers.indexOf('field_citation_rate'),
    citationsPerYear: headers.indexOf('citations_per_year'),
    isClinical: headers.indexOf('is_clinical'),
    provisional: headers.indexOf('provisional'),
    human: headers.indexOf('human'),
    animal: headers.indexOf('animal'),
    molecularCellular: headers.indexOf('molecular_cellular'),
    apt: headers.indexOf('apt'),
    citedBy: headers.indexOf('cited_by'),
    references: headers.indexOf('references'),
    doi: headers.indexOf('doi'),
  };
}

function mapPublication(fields: ReadonlyArray<string>, indices: ColumnIndices): ICitePublication {
  const relativeCitationRatio = parseFloatOptional(fieldAt(fields, indices.relativeCitationRatio));
  const nihPercentile = parseFloatOptional(fieldAt(fields, indices.nihPercentile));
  const expectedCitationsPerYear = parseFloatOptional(
    fieldAt(fields, indices.expectedCitationsPerYear),
  );
  const fieldCitationRate = parseFloatOptional(fieldAt(fields, indices.fieldCitationRate));
  const citationsPerYear = parseFloatOptional(fieldAt(fields, indices.citationsPerYear));

  return {
    pmid: parseIntSafe(fieldAt(fields, indices.pmid)),
    year: parseIntSafe(fieldAt(fields, indices.year)),
    title: fieldAt(fields, indices.title),
    authors: fieldAt(fields, indices.authors),
    journal: fieldAt(fields, indices.journal),
    isResearchArticle: parseBool(fieldAt(fields, indices.isResearchArticle)),
    relativeCitationRatio,
    nihPercentile,
    citedByCount: parseIntSafe(fieldAt(fields, indices.citationCount)),
    referencesCount: parseIntSafe(fieldAt(fields, indices.referencesCount)),
    expectedCitationsPerYear,
    fieldCitationRate,
    citationsPerYear,
    isClinicallyCited: parseBool(fieldAt(fields, indices.isClinical)),
    provisional: parseBool(fieldAt(fields, indices.provisional)),
    human: parseFloatSafe(fieldAt(fields, indices.human)),
    animal: parseFloatSafe(fieldAt(fields, indices.animal)),
    molecularCellular: parseFloatSafe(fieldAt(fields, indices.molecularCellular)),
    apt: parseFloatSafe(fieldAt(fields, indices.apt)),
    citedByPmids: parsePmidList(fieldAt(fields, indices.citedBy)),
    referencesPmids: parsePmidList(fieldAt(fields, indices.references)),
    doi: fieldAt(fields, indices.doi),
  };
}

/** Parse a CSV line respecting double-quote escaping. */
function parseCsvLine(line: string): ReadonlyArray<string> {
  const fields: Array<string> = [];
  let current = '';
  let inQuotes = false;

  for (let charIndex = 0; charIndex < line.length; charIndex++) {
    const char = line.charAt(charIndex);

    if (inQuotes) {
      if (char === '"') {
        if (charIndex + 1 < line.length && line[charIndex + 1] === '"') {
          current += '"';
          charIndex++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ',') {
      fields.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  fields.push(current);

  return fields;
}

function fieldAt(fields: ReadonlyArray<string>, index: number): string {
  if (index < 0 || index >= fields.length) {
    return '';
  }

  return (fields[index] ?? '').trim();
}

function parseIntSafe(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseFloatSafe(value: string): number {
  const parsed = Number.parseFloat(value);

  return Number.isNaN(parsed) ? 0 : parsed;
}

function parseFloatOptional(value: string): number | undefined {
  if (value === '') {
    return undefined;
  }

  const parsed = Number.parseFloat(value);

  return Number.isNaN(parsed) ? undefined : parsed;
}

function parseBool(value: string): boolean {
  return value.toLowerCase() === 'true' || value === '1';
}

function parsePmidList(value: string): ReadonlyArray<number> {
  if (value === '') {
    return [];
  }

  return value
    .split(' ')
    .map((pmid) => parseIntSafe(pmid.trim()))
    .filter((pmid) => pmid !== 0);
}
