import type { Gene2PubmedLink } from '../interfaces/datasets.interface';

/**
 * Parse an NCBI gene2pubmed TSV file into an array of {@link Gene2PubmedLink} records.
 *
 * @see https://ftp.ncbi.nlm.nih.gov/gene/DATA/gene2pubmed.gz
 */
export function parseGene2PubmedTsv(tsv: string): ReadonlyArray<Gene2PubmedLink> {
  const lines = tsv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = (lines[0] ?? '').replace(/^#/, '');
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const links: Array<Gene2PubmedLink> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const fields = line.split('\t');
    const taxId = parseIntSafe(fieldAt(fields, columnIndices.taxId));
    const geneId = parseIntSafe(fieldAt(fields, columnIndices.geneId));
    const pmid = parseIntSafe(fieldAt(fields, columnIndices.pmid));

    if (geneId === 0 || pmid === 0) {
      continue;
    }

    links.push({ taxId, geneId, pmid });
  }

  return links;
}

interface ColumnIndices {
  readonly taxId: number;
  readonly geneId: number;
  readonly pmid: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = headerLine.split('\t').map((header) => header.trim().toLowerCase());

  const taxId = headers.indexOf('tax_id');
  const geneId = headers.indexOf('geneid');
  const pmid = headers.indexOf('pubmed_id');

  if (geneId === -1 || pmid === -1) {
    return undefined;
  }

  return { taxId, geneId, pmid };
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
