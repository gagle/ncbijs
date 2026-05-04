import type { GeneOrtholog } from '../interfaces/datasets.interface';

/**
 * Parse an NCBI gene_orthologs TSV file into an array of {@link GeneOrtholog} records.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene_orthologs.gz
 */
export function parseGeneOrthologsTsv(tsv: string): ReadonlyArray<GeneOrtholog> {
  const lines = tsv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = (lines[0] ?? '').replace(/^#/, '');
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const orthologs: Array<GeneOrtholog> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const fields = line.split('\t');
    const taxId = parseIntSafe(fieldAt(fields, columnIndices.taxId));
    const geneId = parseIntSafe(fieldAt(fields, columnIndices.geneId));
    const otherTaxId = parseIntSafe(fieldAt(fields, columnIndices.otherTaxId));
    const otherGeneId = parseIntSafe(fieldAt(fields, columnIndices.otherGeneId));

    if (geneId === 0 || otherGeneId === 0) {
      continue;
    }

    orthologs.push({
      taxId,
      geneId,
      relationship: fieldAt(fields, columnIndices.relationship),
      otherTaxId,
      otherGeneId,
    });
  }

  return orthologs;
}

interface ColumnIndices {
  readonly taxId: number;
  readonly geneId: number;
  readonly relationship: number;
  readonly otherTaxId: number;
  readonly otherGeneId: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = headerLine.split('\t').map((header) => header.trim().toLowerCase());

  const geneId = headers.indexOf('geneid');
  const otherGeneId = headers.indexOf('other_geneid');

  if (geneId === -1 || otherGeneId === -1) {
    return undefined;
  }

  return {
    taxId: headers.indexOf('tax_id'),
    geneId,
    relationship: headers.indexOf('relationship'),
    otherTaxId: headers.indexOf('other_tax_id'),
    otherGeneId,
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
