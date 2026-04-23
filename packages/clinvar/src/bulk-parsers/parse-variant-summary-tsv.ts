import type {
  ClinVarGene,
  ClinVarTrait,
  VariantLocation,
  VariantReport,
} from '../interfaces/clinvar.interface';

/** Parse a ClinVar variant_summary.txt TSV file into an array of {@link VariantReport} records. */
export function parseVariantSummaryTsv(tsv: string): ReadonlyArray<VariantReport> {
  const lines = tsv.split('\n');

  if (lines.length < 2) {
    return [];
  }

  const headerLine = (lines[0] ?? '').replace(/^#/, '');
  const columnIndices = resolveColumnIndices(headerLine);

  if (columnIndices === undefined) {
    return [];
  }

  const reports: Array<VariantReport> = [];

  for (let lineIndex = 1; lineIndex < lines.length; lineIndex++) {
    const line = (lines[lineIndex] ?? '').trim();

    if (line === '' || line.startsWith('#')) {
      continue;
    }

    const fields = line.split('\t');
    reports.push(mapVariantReport(fields, columnIndices));
  }

  return reports;
}

interface ColumnIndices {
  readonly variationId: number;
  readonly name: number;
  readonly type: number;
  readonly geneId: number;
  readonly geneSymbol: number;
  readonly clinicalSignificance: number;
  readonly rcvAccession: number;
  readonly phenotypeList: number;
  readonly assembly: number;
  readonly chromosome: number;
  readonly start: number;
  readonly stop: number;
}

function resolveColumnIndices(headerLine: string): ColumnIndices | undefined {
  const headers = headerLine.split('\t').map((header) => header.trim().toLowerCase());

  const variationId = headers.indexOf('variationid');
  const name = headers.indexOf('name');
  const type = headers.indexOf('type');

  if (variationId === -1 || name === -1) {
    return undefined;
  }

  return {
    variationId,
    name,
    type,
    geneId: headers.indexOf('geneid'),
    geneSymbol: headers.indexOf('genesymbol'),
    clinicalSignificance: headers.indexOf('clinicalsignificance'),
    rcvAccession: headers.indexOf('rcvaccession'),
    phenotypeList: headers.indexOf('phenotypelist'),
    assembly: headers.indexOf('assembly'),
    chromosome: headers.indexOf('chromosome'),
    start: headers.indexOf('start'),
    stop: headers.indexOf('stop'),
  };
}

function mapVariantReport(fields: ReadonlyArray<string>, indices: ColumnIndices): VariantReport {
  const geneIdRaw = fieldAt(fields, indices.geneId);
  const geneSymbol = fieldAt(fields, indices.geneSymbol);
  const genes: Array<ClinVarGene> = [];

  if (geneSymbol !== '' && geneSymbol !== '-') {
    genes.push({
      geneId: parseIntSafe(geneIdRaw),
      symbol: geneSymbol,
    });
  }

  const phenotypeRaw = fieldAt(fields, indices.phenotypeList);
  const traits: Array<ClinVarTrait> = parsePhenotypeList(phenotypeRaw);

  const locations: Array<VariantLocation> = [];
  const assembly = fieldAt(fields, indices.assembly);
  const chromosome = fieldAt(fields, indices.chromosome);

  if (assembly !== '' && assembly !== 'na') {
    locations.push({
      assemblyName: assembly,
      chromosome,
      start: parseIntSafe(fieldAt(fields, indices.start)),
      stop: parseIntSafe(fieldAt(fields, indices.stop)),
    });
  }

  return {
    uid: fieldAt(fields, indices.variationId),
    title: fieldAt(fields, indices.name),
    objectType: fieldAt(fields, indices.type),
    accession: fieldAt(fields, indices.rcvAccession),
    accessionVersion: '',
    clinicalSignificance: fieldAt(fields, indices.clinicalSignificance),
    genes,
    traits,
    locations,
    supportingSubmissions: [],
  };
}

function parsePhenotypeList(raw: string): Array<ClinVarTrait> {
  if (raw === '' || raw === '-') {
    return [];
  }

  return raw.split(';').map((phenotype) => ({
    name: phenotype.trim(),
    xrefs: [],
  }));
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
