import { describe, expect, it } from 'vitest';
import { parseGeneInfoTsv } from './parse-gene-info-tsv';

const HEADER =
  '#tax_id\tGeneID\tSymbol\tLocusTag\tSynonyms\tdbXrefs\tchromosome\tmap_location\tdescription\ttype_of_gene\tSymbol_from_nomenclature_authority\tFull_name_from_nomenclature_authority\tNomenclature_status\tOther_designations\tModification_date\tFeature_type';

const ROW_BRCA2 =
  '9606\t675\tBRCA2\t-\tBRCC2|FANCD1|FAD|FAD1|BRCC2\tMIM:600185|HGNC:HGNC:1101|Ensembl:ENSG00000139618|UniProtKB/Swiss-Prot:P51587\t13\t13q13.1\tBRCA2 DNA repair associated\tprotein-coding\tBRCA2\tBRCA2 DNA repair associated\tO\tbreast cancer type 2 susceptibility protein\t20240101\t-';

const ROW_TP53 =
  '9606\t7157\tTP53\t-\tBCC7|LFS1|P53|TRP53\tMIM:191170|HGNC:HGNC:11998|Ensembl:ENSG00000141510\t17\t17p13.1\ttumor protein p53\tprotein-coding\tTP53\ttumor protein p53\tO\tcellular tumor antigen p53\t20240201\t-';

const ROW_NO_XREFS =
  '10090\t11287\tPzp\t-\tA1m|A2m|MAM\t-\t6\t6 B3\tPZP, alpha-2-macroglobulin like\tprotein-coding\tPzp\tPZP, alpha-2-macroglobulin like\tO\t-\t20231201\t-';

const SAMPLE_TSV = [HEADER, ROW_BRCA2, ROW_TP53, ROW_NO_XREFS].join('\n');

describe('parseGeneInfoTsv', () => {
  it('parses all data rows', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result).toHaveLength(3);
  });

  it('extracts GeneID', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.geneId).toBe(675);
    expect(result[1]!.geneId).toBe(7157);
  });

  it('extracts Symbol', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.symbol).toBe('BRCA2');
  });

  it('prefers Full_name over description', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.description).toBe('BRCA2 DNA repair associated');
  });

  it('extracts tax_id', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.taxId).toBe(9606);
    expect(result[2]!.taxId).toBe(10090);
  });

  it('extracts type_of_gene', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.type).toBe('protein-coding');
  });

  it('extracts chromosome', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.chromosomes).toEqual(['13']);
    expect(result[1]!.chromosomes).toEqual(['17']);
  });

  it('extracts pipe-delimited synonyms', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.synonyms).toEqual(['BRCC2', 'FANCD1', 'FAD', 'FAD1', 'BRCC2']);
  });

  it('parses Swiss-Prot accessions from dbXrefs', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.swissProtAccessions).toEqual(['P51587']);
  });

  it('parses Ensembl gene IDs from dbXrefs', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.ensemblGeneIds).toEqual(['ENSG00000139618']);
    expect(result[1]!.ensemblGeneIds).toEqual(['ENSG00000141510']);
  });

  it('parses OMIM IDs from dbXrefs', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[0]!.omimIds).toEqual(['600185']);
    expect(result[1]!.omimIds).toEqual(['191170']);
  });

  it('handles dash (empty) dbXrefs', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);

    expect(result[2]!.swissProtAccessions).toEqual([]);
    expect(result[2]!.ensemblGeneIds).toEqual([]);
    expect(result[2]!.omimIds).toEqual([]);
  });

  it('sets unavailable fields to defaults', () => {
    const result = parseGeneInfoTsv(SAMPLE_TSV);
    const gene = result[0]!;

    expect(gene.taxName).toBe('');
    expect(gene.commonName).toBe('');
    expect(gene.summary).toBe('');
    expect(gene.transcriptCount).toBe(0);
    expect(gene.proteinCount).toBe(0);
    expect(gene.geneOntology).toEqual({
      molecularFunctions: [],
      biologicalProcesses: [],
      cellularComponents: [],
    });
  });

  it('returns empty array for empty input', () => {
    expect(parseGeneInfoTsv('')).toEqual([]);
  });

  it('returns empty array for header-only input', () => {
    expect(parseGeneInfoTsv(HEADER)).toEqual([]);
  });

  it('returns empty array when required columns are missing', () => {
    const badHeader = 'tax_id\tSomething\n9606\ttest';

    expect(parseGeneInfoTsv(badHeader)).toEqual([]);
  });

  it('skips blank and comment lines', () => {
    const tsvWithBlanks = [HEADER, ROW_BRCA2, '', '# comment', ROW_TP53].join('\n');
    const result = parseGeneInfoTsv(tsvWithBlanks);

    expect(result).toHaveLength(2);
  });

  it('handles dash synonyms as empty', () => {
    const noSynonyms = ROW_BRCA2.replace('BRCC2|FANCD1|FAD|FAD1|BRCC2', '-');
    const tsv = [HEADER, noSynonyms].join('\n');
    const result = parseGeneInfoTsv(tsv);

    expect(result[0]!.synonyms).toEqual([]);
  });

  it('handles dash chromosome as empty array', () => {
    const noChr = ROW_BRCA2.replace('\t13\t', '\t-\t');
    const tsv = [HEADER, noChr].join('\n');
    const result = parseGeneInfoTsv(tsv);

    expect(result[0]!.chromosomes).toEqual([]);
  });

  it('falls back to description when Full_name is dash', () => {
    const noFullName = ROW_BRCA2.replace('BRCA2 DNA repair associated\tO', '-\tO');
    const tsv = [HEADER, noFullName].join('\n');
    const result = parseGeneInfoTsv(tsv);

    expect(result[0]!.description).toBe('BRCA2 DNA repair associated');
  });
});
