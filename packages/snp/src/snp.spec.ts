import { afterEach, describe, expect, it, vi } from 'vitest';
import { Snp } from './snp';

function mockFetchJson(data: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(data),
    }),
  );
}

function buildRefSnpResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    refsnp_id: '7412',
    create_date: '2000/09/19',
    primary_snapshot_data: {
      placements_with_allele: [
        {
          seq_id: 'NC_000019.10',
          placement_annot: {
            seq_type: 'refseq_chromosome',
            seq_id_traits_by_assembly: [{ assembly_name: 'GRCh38.p14' }],
          },
          alleles: [
            {
              allele: {
                spdi: {
                  seq_id: 'NC_000019.10',
                  position: 44908821,
                  deleted_sequence: 'C',
                  inserted_sequence: 'C',
                },
              },
            },
            {
              allele: {
                spdi: {
                  seq_id: 'NC_000019.10',
                  position: 44908821,
                  deleted_sequence: 'C',
                  inserted_sequence: 'T',
                },
              },
            },
          ],
        },
      ],
      allele_annotations: [
        {
          frequency: [
            {
              study_name: 'GnomAD',
              allele_count: 19350,
              total_count: 152256,
              observation: {
                deleted_sequence: 'C',
                inserted_sequence: 'T',
              },
            },
          ],
          clinical: [
            {
              clinical_significances: ['pathogenic'],
              disease_names: ['Alzheimer disease'],
              review_status: 'criteria provided, multiple submitters, no conflicts',
            },
          ],
        },
      ],
    },
    ...overrides,
  };
}

describe('Snp', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('refsnp', () => {
    it('should fetch a refsnp and map top-level fields', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp();

      const report = await snp.refsnp(7412);

      expect(report.refsnpId).toBe('7412');
      expect(report.createDate).toBe('2000/09/19');
    });

    it('should build correct URL with encoded rsId', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp();

      await snp.refsnp(7412);

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const url = fetchCall[0] as string;
      expect(url).toBe('https://api.ncbi.nlm.nih.gov/variation/v0/refsnp/7412');
    });

    it('should filter placements to refseq_chromosome only', async () => {
      mockFetchJson({
        refsnp_id: '7412',
        primary_snapshot_data: {
          placements_with_allele: [
            {
              seq_id: 'NC_000019.10',
              placement_annot: {
                seq_type: 'refseq_chromosome',
                seq_id_traits_by_assembly: [{ assembly_name: 'GRCh38.p14' }],
              },
              alleles: [],
            },
            {
              seq_id: 'NG_000042.1',
              placement_annot: {
                seq_type: 'refseq_genomic',
                seq_id_traits_by_assembly: [{ assembly_name: 'GRCh38.p14' }],
              },
              alleles: [],
            },
          ],
          allele_annotations: [],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(7412);

      expect(report.placements).toHaveLength(1);
      expect(report.placements[0]!.seqId).toBe('NC_000019.10');
    });

    it('should map placement fields correctly', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp();

      const report = await snp.refsnp(7412);
      const placement = report.placements[0]!;

      expect(placement.seqId).toBe('NC_000019.10');
      expect(placement.assemblyName).toBe('GRCh38.p14');
      expect(placement.alleles).toHaveLength(2);
    });

    it('should map allele SPDI fields correctly', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp();

      const report = await snp.refsnp(7412);
      const allele = report.placements[0]!.alleles[1]!;

      expect(allele.seqId).toBe('NC_000019.10');
      expect(allele.position).toBe(44908821);
      expect(allele.deletedSequence).toBe('C');
      expect(allele.insertedSequence).toBe('T');
    });

    it('should map frequency data with computed ratio', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp();

      const report = await snp.refsnp(7412);
      const freq = report.alleleAnnotations[0]!.frequency[0]!;

      expect(freq.studyName).toBe('GnomAD');
      expect(freq.alleleCount).toBe(19350);
      expect(freq.totalCount).toBe(152256);
      expect(freq.frequency).toBeCloseTo(19350 / 152256);
      expect(freq.deletedSequence).toBe('C');
      expect(freq.insertedSequence).toBe('T');
    });

    it('should map clinical significance data', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp();

      const report = await snp.refsnp(7412);
      const clinical = report.alleleAnnotations[0]!.clinical[0]!;

      expect(clinical.significances).toEqual(['pathogenic']);
      expect(clinical.diseaseNames).toEqual(['Alzheimer disease']);
      expect(clinical.reviewStatus).toBe('criteria provided, multiple submitters, no conflicts');
    });

    it('should handle missing primary_snapshot_data', async () => {
      mockFetchJson({ refsnp_id: '123' });
      const snp = new Snp();

      const report = await snp.refsnp(123);

      expect(report.refsnpId).toBe('123');
      expect(report.placements).toEqual([]);
      expect(report.alleleAnnotations).toEqual([]);
    });

    it('should handle missing top-level fields', async () => {
      mockFetchJson({});
      const snp = new Snp();

      const report = await snp.refsnp(1);

      expect(report.refsnpId).toBe('');
      expect(report.createDate).toBe('');
      expect(report.placements).toEqual([]);
      expect(report.alleleAnnotations).toEqual([]);
    });

    it('should handle placement with missing alleles', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [
            {
              seq_id: 'NC_000001.11',
              placement_annot: {
                seq_type: 'refseq_chromosome',
                seq_id_traits_by_assembly: [],
              },
            },
          ],
          allele_annotations: [],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);

      expect(report.placements[0]!.alleles).toEqual([]);
      expect(report.placements[0]!.assemblyName).toBe('');
    });

    it('should handle placement with missing seq_id_traits_by_assembly', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [
            {
              seq_id: 'NC_000001.11',
              placement_annot: {
                seq_type: 'refseq_chromosome',
              },
              alleles: [],
            },
          ],
          allele_annotations: [],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);

      expect(report.placements[0]!.assemblyName).toBe('');
    });

    it('should handle allele with missing spdi', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [
            {
              seq_id: 'NC_000001.11',
              placement_annot: {
                seq_type: 'refseq_chromosome',
                seq_id_traits_by_assembly: [{ assembly_name: 'GRCh38.p14' }],
              },
              alleles: [{ allele: {} }, {}],
            },
          ],
          allele_annotations: [],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);
      const alleleWithEmptySpdi = report.placements[0]!.alleles[0]!;
      const alleleWithNoAllele = report.placements[0]!.alleles[1]!;

      expect(alleleWithEmptySpdi.seqId).toBe('');
      expect(alleleWithEmptySpdi.position).toBe(0);
      expect(alleleWithEmptySpdi.deletedSequence).toBe('');
      expect(alleleWithEmptySpdi.insertedSequence).toBe('');
      expect(alleleWithNoAllele.seqId).toBe('');
    });

    it('should handle allele annotation with missing frequency and clinical', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [],
          allele_annotations: [{}],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);
      const annotation = report.alleleAnnotations[0]!;

      expect(annotation.frequency).toEqual([]);
      expect(annotation.clinical).toEqual([]);
    });

    it('should handle frequency with zero total count', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [],
          allele_annotations: [
            {
              frequency: [
                {
                  study_name: 'TestStudy',
                  allele_count: 0,
                  total_count: 0,
                  observation: {},
                },
              ],
              clinical: [],
            },
          ],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);
      const freq = report.alleleAnnotations[0]!.frequency[0]!;

      expect(freq.frequency).toBe(0);
    });

    it('should handle frequency with missing observation', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [],
          allele_annotations: [
            {
              frequency: [{ study_name: 'TestStudy' }],
              clinical: [],
            },
          ],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);
      const freq = report.alleleAnnotations[0]!.frequency[0]!;

      expect(freq.alleleCount).toBe(0);
      expect(freq.totalCount).toBe(0);
      expect(freq.frequency).toBe(0);
      expect(freq.deletedSequence).toBe('');
      expect(freq.insertedSequence).toBe('');
    });

    it('should handle frequency with missing study_name', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [],
          allele_annotations: [
            {
              frequency: [{ allele_count: 10, total_count: 100 }],
              clinical: [],
            },
          ],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);
      const freq = report.alleleAnnotations[0]!.frequency[0]!;

      expect(freq.studyName).toBe('');
      expect(freq.frequency).toBeCloseTo(0.1);
    });

    it('should handle clinical with missing fields', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [],
          allele_annotations: [
            {
              frequency: [],
              clinical: [{}],
            },
          ],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);
      const clinical = report.alleleAnnotations[0]!.clinical[0]!;

      expect(clinical.significances).toEqual([]);
      expect(clinical.diseaseNames).toEqual([]);
      expect(clinical.reviewStatus).toBe('');
    });

    it('should handle placement with missing placement_annot', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [{ seq_id: 'NC_000001.11' }],
          allele_annotations: [],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);

      expect(report.placements).toEqual([]);
    });

    it('should handle placement with missing seq_id', async () => {
      mockFetchJson({
        refsnp_id: '1',
        primary_snapshot_data: {
          placements_with_allele: [
            {
              placement_annot: {
                seq_type: 'refseq_chromosome',
                seq_id_traits_by_assembly: [{ assembly_name: 'GRCh38.p14' }],
              },
              alleles: [],
            },
          ],
          allele_annotations: [],
        },
      });
      const snp = new Snp();

      const report = await snp.refsnp(1);

      expect(report.placements[0]!.seqId).toBe('');
    });
  });

  describe('refsnpBatch', () => {
    it('should fetch multiple refsnps sequentially', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildRefSnpResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildRefSnpResponse({ refsnp_id: '429358' })),
        });
      vi.stubGlobal('fetch', fetchMock);

      const snp = new Snp();
      const reports = await snp.refsnpBatch([7412, 429358]);

      expect(reports).toHaveLength(2);
      expect(reports[0]!.refsnpId).toBe('7412');
      expect(reports[1]!.refsnpId).toBe('429358');
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    it('should return empty array for empty input', async () => {
      const snp = new Snp();
      const reports = await snp.refsnpBatch([]);

      expect(reports).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should accept API key in config', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp({ apiKey: 'my-key' });

      await snp.refsnp(7412);

      const fetchCall = vi.mocked(fetch).mock.calls[0]!;
      const headers = fetchCall[1]?.headers as Record<string, string>;
      expect(headers['api-key']).toBe('my-key');
    });

    it('should work without any config', async () => {
      mockFetchJson(buildRefSnpResponse());
      const snp = new Snp();

      await snp.refsnp(7412);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
