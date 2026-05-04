import type { GeneHistoryEntry } from '../interfaces/datasets.interface';

/**
 * Parse an NCBI gene_history TSV file into an array of {@link GeneHistoryEntry} records.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_history.gz
 */
export function parseGeneHistoryTsv(tsv: string): ReadonlyArray<GeneHistoryEntry> {
  const lines = tsv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = (lines[0] ?? '').replace(/^#/, '');
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const entries: Array<GeneHistoryEntry> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const fields = line.split('\t');
    entries.push(mapHistoryEntry(fields, columnIndices));
  }

  return entries;
}

interface ColumnIndices {
  readonly taxId: number;
  readonly geneId: number;
  readonly discontinuedGeneId: number;
  readonly discontinuedSymbol: number;
  readonly discontinueDate: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = headerLine.split('\t').map((header) => header.trim().toLowerCase());

  const geneId = headers.indexOf('geneid');
  const discontinuedGeneId = headers.indexOf('discontinued_geneid');

  if (geneId === -1 || discontinuedGeneId === -1) {
    return undefined;
  }

  return {
    taxId: headers.indexOf('tax_id'),
    geneId,
    discontinuedGeneId,
    discontinuedSymbol: headers.indexOf('discontinued_symbol'),
    discontinueDate: headers.indexOf('discontinue_date'),
  };
}

function mapHistoryEntry(fields: ReadonlyArray<string>, indices: ColumnIndices): GeneHistoryEntry {
  return {
    taxId: parseIntSafe(fieldAt(fields, indices.taxId)),
    geneId: parseIntSafe(fieldAt(fields, indices.geneId)),
    discontinuedGeneId: parseIntSafe(fieldAt(fields, indices.discontinuedGeneId)),
    discontinuedSymbol: fieldAt(fields, indices.discontinuedSymbol),
    discontinueDate: fieldAt(fields, indices.discontinueDate),
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
