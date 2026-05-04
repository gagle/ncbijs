import { describe, expect, it } from 'vitest';
import { parseVariantSummaryTsv } from './parse-variant-summary-tsv';

const HEADER =
  '#AlleleID\tType\tName\tGeneID\tGeneSymbol\tHGNC_ID\tClinicalSignificance\tClinSigSimple\tLastEvaluated\tRS# (dbSNP)\tnsv/esv (dbVar)\tRCVaccession\tPhenotypeIDs\tPhenotypeList\tOrigin\tOriginSimple\tAssembly\tChromosomeAccession\tChromosome\tStart\tStop\tReferenceAllele\tAlternateAllele\tCytogenetic\tReviewStatus\tNumberSubmitters\tGuidelines\tTestedInGTR\tOtherIDs\tSubmitterCategories\tVariationID\tPositionVCF\tReferenceAlleleVCF\tAlternateAlleleVCF';

const ROW_1 =
  '15041\tDeletion\tNM_014855.3(AP5Z1):c.80_83del (p.Arg27fs)\t9907\tAP5Z1\tHGNC:22197\tPathogenic\t0\t2023-07-15\t397704705\t-\tRCV000000012\tMeSH:C567462\tSpastic paraplegia 48\tgermline\tgermline\tGRCh38\tNC_000007.14\t7\t4775606\t4775609\tACTC\t-\t7p22.1\tcriteria provided, single submitter\t2\t-\tN\t-\t1\t2\t4775605\tCACTC\tC';

const ROW_2 =
  '15042\tSingle nucleotide variant\tNM_152486.4(SAMD11):c.376C>T (p.Arg126Trp)\t148398\tSAMD11\tHGNC:28706\tLikely benign\t0\t2021-11-01\t-\t-\tRCV000000013\t-\t-\tgermline\tgermline\tGRCh37\tNC_000001.10\t1\t861332\t861332\tG\tA\t1p36.33\tcriteria provided, single submitter\t1\t-\tN\t-\t1\t3\t861332\tG\tA';

const SAMPLE_TSV = [HEADER, ROW_1, ROW_2].join('\n');

describe('parseVariantSummaryTsv', () => {
  it('parses all data rows', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);

    expect(result).toHaveLength(2);
  });

  it('extracts VariationID as uid', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const firstVariant = result[0]!;
    const secondVariant = result[1]!;

    expect(firstVariant.uid).toBe('2');
    expect(secondVariant.uid).toBe('3');
  });

  it('extracts Name as title', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.title).toBe('NM_014855.3(AP5Z1):c.80_83del (p.Arg27fs)');
  });

  it('extracts Type as objectType', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const firstVariant = result[0]!;
    const secondVariant = result[1]!;

    expect(firstVariant.objectType).toBe('Deletion');
    expect(secondVariant.objectType).toBe('Single nucleotide variant');
  });

  it('extracts ClinicalSignificance', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const firstVariant = result[0]!;
    const secondVariant = result[1]!;

    expect(firstVariant.clinicalSignificance).toBe('Pathogenic');
    expect(secondVariant.clinicalSignificance).toBe('Likely benign');
  });

  it('extracts ReviewStatus', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.reviewStatus).toBe('criteria provided, single submitter');
  });

  it('extracts LastEvaluated', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.lastEvaluated).toBe('2023-07-15');
  });

  it('extracts RCVaccession as accession', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.accession).toBe('RCV000000012');
  });

  it('extracts gene info', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.genes).toEqual([{ geneId: 9907, symbol: 'AP5Z1' }]);
  });

  it('extracts phenotype list as traits', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.traits).toEqual([{ name: 'Spastic paraplegia 48', xrefs: [] }]);
  });

  it('returns empty traits when phenotype is dash', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[1]!;

    expect(variant.traits).toEqual([]);
  });

  it('extracts genomic location', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.locations).toEqual([
      { assemblyName: 'GRCh38', chromosome: '7', start: 4775606, stop: 4775609 },
    ]);
  });

  it('sets accessionVersion to empty string', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.accessionVersion).toBe('');
  });

  it('sets supportingSubmissions to empty array', () => {
    const result = parseVariantSummaryTsv(SAMPLE_TSV);
    const variant = result[0]!;

    expect(variant.supportingSubmissions).toEqual([]);
  });

  it('returns empty array for empty input', () => {
    expect(parseVariantSummaryTsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseVariantSummaryTsv(HEADER)).toEqual([]);
  });

  it('returns empty array when required columns are missing', () => {
    const badHeader = 'AlleleID\tType\n15041\tDeletion';

    expect(parseVariantSummaryTsv(badHeader)).toEqual([]);
  });

  it('skips blank lines', () => {
    const tsvWithBlanks = [HEADER, ROW_1, '', '  ', ROW_2].join('\n');
    const result = parseVariantSummaryTsv(tsvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('skips comment lines', () => {
    const tsvWithComment = [HEADER, '# This is a comment', ROW_1].join('\n');
    const result = parseVariantSummaryTsv(tsvWithComment);

    expect(result).toHaveLength(1);
  });

  it('handles multiple phenotypes separated by semicolons', () => {
    const multiPhenotype = ROW_1.replace('Spastic paraplegia 48', 'Condition A;Condition B');
    const tsv = [HEADER, multiPhenotype].join('\n');
    const result = parseVariantSummaryTsv(tsv);
    const variant = result[0]!;

    expect(variant.traits).toEqual([
      { name: 'Condition A', xrefs: [] },
      { name: 'Condition B', xrefs: [] },
    ]);
  });

  it('skips gene when GeneSymbol is dash', () => {
    const noGene = ROW_1.replace('9907\tAP5Z1', '-\t-');
    const tsv = [HEADER, noGene].join('\n');
    const result = parseVariantSummaryTsv(tsv);
    const variant = result[0]!;

    expect(variant.genes).toEqual([]);
  });

  it('skips location when Assembly is na', () => {
    const noAssembly = ROW_1.replace('GRCh38', 'na');
    const tsv = [HEADER, noAssembly].join('\n');
    const result = parseVariantSummaryTsv(tsv);
    const variant = result[0]!;

    expect(variant.locations).toEqual([]);
  });
});
