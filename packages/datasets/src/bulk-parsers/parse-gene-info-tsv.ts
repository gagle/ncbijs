import type { GeneReport } from './interfaces/datasets.interface';

/** Parse an NCBI gene_info TSV file into an array of {@link GeneReport} records. */
export function parseGeneInfoTsv(tsv: string): ReadonlyArray<GeneReport> {
  const lines = tsv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = (lines[0] ?? '').replace(/^#/, '');
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const reports: Array<GeneReport> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const fields = line.split('\t');
    reports.push(mapGeneReport(fields, columnIndices));
  }

  return reports;
}

interface ColumnIndices {
  readonly taxId: number;
  readonly geneId: number;
  readonly symbol: number;
  readonly synonyms: number;
  readonly dbXrefs: number;
  readonly chromosome: number;
  readonly description: number;
  readonly typeOfGene: number;
  readonly fullName: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = headerLine.split('\t').map((header) => header.trim().toLowerCase());

  const geneId = headers.indexOf('geneid');
  const symbol = headers.indexOf('symbol');

  if (geneId === -1 || symbol === -1) {
    return undefined;
  }

  return {
    taxId: headers.indexOf('tax_id'),
    geneId,
    symbol,
    synonyms: headers.indexOf('synonyms'),
    dbXrefs: headers.indexOf('dbxrefs'),
    chromosome: headers.indexOf('chromosome'),
    description: headers.indexOf('description'),
    typeOfGene: headers.indexOf('type_of_gene'),
    fullName: headers.indexOf('full_name_from_nomenclature_authority'),
  };
}

function mapGeneReport(fields: ReadonlyArray<string>, indices: ColumnIndices): GeneReport {
  const dbXrefsRaw = fieldAt(fields, indices.dbXrefs);
  const xrefs = parseDbXrefs(dbXrefsRaw);

  const chromosomeRaw = fieldAt(fields, indices.chromosome);
  const chromosomes = chromosomeRaw !== '' ? [chromosomeRaw] : [];

  const synonymsRaw = fieldAt(fields, indices.synonyms);
  const synonyms = synonymsRaw !== '' ? synonymsRaw.split('|') : [];

  const fullName = fieldAt(fields, indices.fullName);
  const description = fullName !== '' ? fullName : fieldAt(fields, indices.description);

  return {
    geneId: parseIntSafe(fieldAt(fields, indices.geneId)),
    symbol: fieldAt(fields, indices.symbol),
    description,
    taxId: parseIntSafe(fieldAt(fields, indices.taxId)),
    taxName: '',
    commonName: '',
    type: fieldAt(fields, indices.typeOfGene),
    chromosomes,
    synonyms,
    swissProtAccessions: xrefs.swissProt,
    ensemblGeneIds: xrefs.ensembl,
    omimIds: xrefs.omim,
    summary: '',
    transcriptCount: 0,
    proteinCount: 0,
    geneOntology: {
      molecularFunctions: [],
      biologicalProcesses: [],
      cellularComponents: [],
    },
  };
}

interface ParsedXrefs {
  readonly swissProt: ReadonlyArray<string>;
  readonly ensembl: ReadonlyArray<string>;
  readonly omim: ReadonlyArray<string>;
}

function parseDbXrefs(raw: string): ParsedXrefs {
  if (raw === '') {
    return { swissProt: [], ensembl: [], omim: [] };
  }

  const swissProt: Array<string> = [];
  const ensembl: Array<string> = [];
  const omim: Array<string> = [];

  for (const entry of raw.split('|')) {
    const colonIndex = entry.indexOf(':');

    if (colonIndex === -1) {
      continue;
    }

    const source = entry.substring(0, colonIndex);
    const accession = entry.substring(colonIndex + 1);

    if (source === 'UniProtKB/Swiss-Prot') {
      swissProt.push(accession);
    } else if (source === 'Ensembl') {
      ensembl.push(accession);
    } else if (source === 'MIM') {
      omim.push(accession);
    }
  }

  return { swissProt, ensembl, omim };
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
