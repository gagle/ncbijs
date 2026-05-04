import type { Gene2GoAnnotation } from '../interfaces/datasets.interface';

/**
 * Parse an NCBI gene2go TSV file into an array of {@link Gene2GoAnnotation} records.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene2go.gz
 */
export function parseGene2GoTsv(tsv: string): ReadonlyArray<Gene2GoAnnotation> {
  const lines = tsv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = (lines[0] ?? '').replace(/^#/, '');
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const annotations: Array<Gene2GoAnnotation> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const fields = line.split('\t');
    annotations.push(mapAnnotation(fields, columnIndices));
  }

  return annotations;
}

interface ColumnIndices {
  readonly taxId: number;
  readonly geneId: number;
  readonly goId: number;
  readonly evidence: number;
  readonly qualifier: number;
  readonly goTerm: number;
  readonly pubmed: number;
  readonly category: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = headerLine.split('\t').map((header) => header.trim().toLowerCase());

  const geneId = headers.indexOf('geneid');
  const goId = headers.indexOf('go_id');

  if (geneId === -1 || goId === -1) {
    return undefined;
  }

  return {
    taxId: headers.indexOf('tax_id'),
    geneId,
    goId,
    evidence: headers.indexOf('evidence'),
    qualifier: headers.indexOf('qualifier'),
    goTerm: headers.indexOf('go_term'),
    pubmed: headers.indexOf('pubmed'),
    category: headers.indexOf('category'),
  };
}

function mapAnnotation(fields: ReadonlyArray<string>, indices: ColumnIndices): Gene2GoAnnotation {
  const pubmedRaw = fieldAt(fields, indices.pubmed);
  const pmids =
    pubmedRaw !== ''
      ? pubmedRaw
          .split('|')
          .map((pmid) => parseIntSafe(pmid.trim()))
          .filter((pmid) => pmid !== 0)
      : [];

  return {
    taxId: parseIntSafe(fieldAt(fields, indices.taxId)),
    geneId: parseIntSafe(fieldAt(fields, indices.geneId)),
    goId: fieldAt(fields, indices.goId),
    goTerm: fieldAt(fields, indices.goTerm),
    evidence: fieldAt(fields, indices.evidence),
    qualifier: fieldAt(fields, indices.qualifier),
    category: fieldAt(fields, indices.category),
    pmids,
  };
}

function fieldAt(fields: ReadonlyArray<string>, index: number): string {
  if (index < 0 || index >= fields.length) {
    return '';
  }

  const value = (fields[index] ?? '').trim();

  return value === '-' ? '' : value;
}

function parseIntSafe(value: string): number {
  const parsed = Number.parseInt(value, 10);

  return Number.isNaN(parsed) ? 0 : parsed;
}
