import { describe, expect, it } from 'vitest';
import { parseRefSnpJson, parseRefSnpNdjson } from './parse-refsnp-json';

const SAMPLE_JSON = JSON.stringify({
  refsnp_id: '328',
  create_date: '2000-09-19T17:02',
  primary_snapshot_data: {
    placements_with_allele: [
      {
        seq_id: 'NC_000022.11',
        placement_annot: {
          seq_type: 'refseq_chromosome',
          seq_id_traits_by_assembly: [{ assembly_name: 'GRCh38.p14' }],
        },
        alleles: [
          {
            allele: {
              spdi: {
                seq_id: 'NC_000022.11',
                position: 36265860,
                deleted_sequence: 'T',
                inserted_sequence: 'T',
              },
            },
          },
          {
            allele: {
              spdi: {
                seq_id: 'NC_000022.11',
                position: 36265860,
                deleted_sequence: 'T',
                inserted_sequence: 'C',
              },
            },
          },
        ],
      },
      {
        seq_id: 'NT_187607.1',
        placement_annot: {
          seq_type: 'refseq_patchfix',
          seq_id_traits_by_assembly: [{ assembly_name: 'GRCh38.p14' }],
        },
        alleles: [],
      },
    ],
    allele_annotations: [
      {
        frequency: [
          {
            study_name: 'ALFA',
            allele_count: 5000,
            total_count: 10000,
            observation: { deleted_sequence: 'T', inserted_sequence: 'C' },
          },
        ],
        clinical: [
          {
            clinical_significances: ['Benign'],
            disease_names: ['not provided'],
            review_status: 'criteria provided, single submitter',
          },
        ],
      },
    ],
  },
});

describe('parseRefSnpJson', () => {
  it('extracts refsnpId', () => {
    const result = parseRefSnpJson(SAMPLE_JSON);

    expect(result.refsnpId).toBe('328');
  });

  it('extracts createDate', () => {
    const result = parseRefSnpJson(SAMPLE_JSON);

    expect(result.createDate).toBe('2000-09-19T17:02');
  });

  it('filters to chromosome placements only', () => {
    const result = parseRefSnpJson(SAMPLE_JSON);

    expect(result.placements).toHaveLength(1);
    expect(result.placements[0].seqId).toBe('NC_000022.11');
  });

  it('extracts assembly name from placement', () => {
    const result = parseRefSnpJson(SAMPLE_JSON);

    expect(result.placements[0].assemblyName).toBe('GRCh38.p14');
  });

  it('extracts SPDI alleles', () => {
    const result = parseRefSnpJson(SAMPLE_JSON);

    expect(result.placements[0].alleles).toHaveLength(2);
    expect(result.placements[0].alleles[1]).toEqual({
      seqId: 'NC_000022.11',
      position: 36265860,
      deletedSequence: 'T',
      insertedSequence: 'C',
    });
  });

  it('extracts frequency annotations', () => {
    const result = parseRefSnpJson(SAMPLE_JSON);

    expect(result.alleleAnnotations[0].frequency[0]).toEqual({
      studyName: 'ALFA',
      alleleCount: 5000,
      totalCount: 10000,
      frequency: 0.5,
      deletedSequence: 'T',
      insertedSequence: 'C',
    });
  });

  it('extracts clinical annotations', () => {
    const result = parseRefSnpJson(SAMPLE_JSON);

    expect(result.alleleAnnotations[0].clinical[0]).toEqual({
      significances: ['Benign'],
      diseaseNames: ['not provided'],
      reviewStatus: 'criteria provided, single submitter',
    });
  });

  it('handles missing primary_snapshot_data', () => {
    const result = parseRefSnpJson(JSON.stringify({ refsnp_id: '999' }));

    expect(result.refsnpId).toBe('999');
    expect(result.placements).toEqual([]);
    expect(result.alleleAnnotations).toEqual([]);
  });

  it('handles empty alleles and annotations', () => {
    const json = JSON.stringify({
      refsnp_id: '100',
      primary_snapshot_data: {
        placements_with_allele: [
          {
            seq_id: 'NC_000001.11',
            placement_annot: {
              seq_type: 'refseq_chromosome',
              seq_id_traits_by_assembly: [],
            },
            alleles: [],
          },
        ],
        allele_annotations: [{ frequency: [], clinical: [] }],
      },
    });

    const result = parseRefSnpJson(json);

    expect(result.placements[0].assemblyName).toBe('');
    expect(result.placements[0].alleles).toEqual([]);
    expect(result.alleleAnnotations[0].frequency).toEqual([]);
    expect(result.alleleAnnotations[0].clinical).toEqual([]);
  });

  it('computes frequency as 0 when totalCount is 0', () => {
    const json = JSON.stringify({
      refsnp_id: '101',
      primary_snapshot_data: {
        allele_annotations: [
          {
            frequency: [{ study_name: 'TEST', allele_count: 0, total_count: 0, observation: {} }],
          },
        ],
      },
    });

    const result = parseRefSnpJson(json);

    expect(result.alleleAnnotations[0].frequency[0].frequency).toBe(0);
  });
});

describe('parseRefSnpNdjson', () => {
  it('parses multiple lines of NDJSON', () => {
    const ndjson = [
      JSON.stringify({ refsnp_id: '1' }),
      JSON.stringify({ refsnp_id: '2' }),
      JSON.stringify({ refsnp_id: '3' }),
    ].join('\n');

    const result = parseRefSnpNdjson(ndjson);

    expect(result).toHaveLength(3);
    expect(result[0].refsnpId).toBe('1');
    expect(result[2].refsnpId).toBe('3');
  });

  it('skips blank lines', () => {
    const ndjson = [
      JSON.stringify({ refsnp_id: '1' }),
      '',
      '  ',
      JSON.stringify({ refsnp_id: '2' }),
    ].join('\n');

    const result = parseRefSnpNdjson(ndjson);

    expect(result).toHaveLength(2);
  });

  it('returns empty array for empty input', () => {
    expect(parseRefSnpNdjson('')).toEqual([]);
  });
});
