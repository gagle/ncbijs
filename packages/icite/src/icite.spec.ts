import { afterEach, describe, expect, it, vi } from 'vitest';
import { ICite } from './icite';

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

function buildPublicationResponse(): Record<string, unknown> {
  return {
    data: [
      {
        pmid: 33533846,
        year: 2021,
        title: 'SARS-CoV-2 mRNA vaccine design',
        authors: 'Corbett KS, Edwards DK',
        journal: 'Nature',
        is_research_article: true,
        relative_citation_ratio: 85.2,
        nih_percentile: 99.9,
        citation_count: 1500,
        references_count: 45,
        expected_citations_per_year: 12.5,
        field_citation_rate: 5.3,
        citations_per_year: 375.0,
        is_clinical: true,
        provisional: false,
        human: 0.85,
        animal: 0.05,
        molecular_cellular: 0.1,
        apt: 0.72,
        cited_by: [34000001, 34000002],
        references: [32000001],
        doi: '10.1038/s41586-020-03049-6',
      },
    ],
  };
}

describe('ICite', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('publications', () => {
    it('should fetch publication metrics and map fields', async () => {
      mockFetchJson(buildPublicationResponse());
      const icite = new ICite();

      const pubs = await icite.publications([33533846]);

      expect(pubs).toHaveLength(1);
      expect(pubs[0]!.pmid).toBe(33533846);
      expect(pubs[0]!.title).toBe('SARS-CoV-2 mRNA vaccine design');
      expect(pubs[0]!.relativeCitationRatio).toBe(85.2);
      expect(pubs[0]!.nihPercentile).toBe(99.9);
      expect(pubs[0]!.citedByCount).toBe(1500);
      expect(pubs[0]!.isClinicallyCited).toBe(true);
      expect(pubs[0]!.doi).toBe('10.1038/s41586-020-03049-6');
      expect(pubs[0]!.citationsPerYear).toBe(375.0);
      expect(pubs[0]!.provisional).toBe(false);
      expect(pubs[0]!.human).toBe(0.85);
      expect(pubs[0]!.animal).toBe(0.05);
      expect(pubs[0]!.molecularCellular).toBe(0.1);
      expect(pubs[0]!.apt).toBe(0.72);
    });

    it('should build correct URL with encoded PMIDs', async () => {
      mockFetchJson({ data: [] });
      const icite = new ICite();

      await icite.publications([33533846, 12345678]);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toBe('https://icite.od.nih.gov/api/pubs?pmids=33533846%2C12345678&format=json');
    });

    it('should return empty array for empty input', async () => {
      const icite = new ICite();

      const pubs = await icite.publications([]);

      expect(pubs).toEqual([]);
    });

    it('should throw when exceeding 1000 PMIDs', async () => {
      const icite = new ICite();
      const tooManyPmids = Array.from({ length: 1001 }, (_, i) => i + 1);

      await expect(icite.publications(tooManyPmids)).rejects.toThrow(
        'Maximum 1000 PMIDs per request',
      );
    });

    it('should handle missing data array', async () => {
      mockFetchJson({});
      const icite = new ICite();

      const pubs = await icite.publications([12345]);

      expect(pubs).toEqual([]);
    });

    it('should handle null RCR and percentile', async () => {
      mockFetchJson({
        data: [
          {
            pmid: 12345,
            relative_citation_ratio: null,
            nih_percentile: null,
            expected_citations_per_year: null,
            field_citation_rate: null,
          },
        ],
      });
      const icite = new ICite();

      const pubs = await icite.publications([12345]);

      expect(pubs[0]!.relativeCitationRatio).toBeUndefined();
      expect(pubs[0]!.nihPercentile).toBeUndefined();
      expect(pubs[0]!.expectedCitationsPerYear).toBeUndefined();
      expect(pubs[0]!.fieldCitationRate).toBeUndefined();
    });

    it('should handle missing fields with defaults', async () => {
      mockFetchJson({ data: [{}] });
      const icite = new ICite();

      const pubs = await icite.publications([1]);

      expect(pubs[0]!.pmid).toBe(0);
      expect(pubs[0]!.year).toBe(0);
      expect(pubs[0]!.title).toBe('');
      expect(pubs[0]!.authors).toBe('');
      expect(pubs[0]!.journal).toBe('');
      expect(pubs[0]!.isResearchArticle).toBe(false);
      expect(pubs[0]!.citedByCount).toBe(0);
      expect(pubs[0]!.referencesCount).toBe(0);
      expect(pubs[0]!.isClinicallyCited).toBe(false);
      expect(pubs[0]!.provisional).toBe(false);
      expect(pubs[0]!.human).toBe(0);
      expect(pubs[0]!.animal).toBe(0);
      expect(pubs[0]!.molecularCellular).toBe(0);
      expect(pubs[0]!.apt).toBe(0);
      expect(pubs[0]!.citedByPmids).toEqual([]);
      expect(pubs[0]!.referencesPmids).toEqual([]);
      expect(pubs[0]!.doi).toBe('');
    });

    it('should handle null citations_per_year', async () => {
      mockFetchJson({ data: [{ pmid: 1, citations_per_year: null }] });
      const icite = new ICite();

      const pubs = await icite.publications([1]);

      expect(pubs[0]!.citationsPerYear).toBeUndefined();
    });

    it('should map cited_by and references arrays', async () => {
      mockFetchJson(buildPublicationResponse());
      const icite = new ICite();

      const pubs = await icite.publications([33533846]);

      expect(pubs[0]!.citedByPmids).toEqual([34000001, 34000002]);
      expect(pubs[0]!.referencesPmids).toEqual([32000001]);
    });
  });

  describe('citedBy', () => {
    it('should fetch full publications for all citers', async () => {
      const calls: Array<string> = [];
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          calls.push(url);
          if (url.includes('pmids=33533846')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(buildPublicationResponse()),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: [
                  { pmid: 34000001, title: 'Citer A' },
                  { pmid: 34000002, title: 'Citer B' },
                ],
              }),
          });
        }),
      );
      const icite = new ICite();

      const citers = await icite.citedBy(33533846);

      expect(citers).toHaveLength(2);
      expect(citers[0]!.pmid).toBe(34000001);
      expect(citers[1]!.pmid).toBe(34000002);
      expect(calls).toHaveLength(2);
    });

    it('should return empty array when source has no citers', async () => {
      mockFetchJson({ data: [{ pmid: 12345, cited_by: [] }] });
      const icite = new ICite();

      const citers = await icite.citedBy(12345);

      expect(citers).toEqual([]);
    });

    it('should return empty array when source not found', async () => {
      mockFetchJson({ data: [] });
      const icite = new ICite();

      const citers = await icite.citedBy(99999);

      expect(citers).toEqual([]);
    });

    it('should batch-fetch when citers exceed 1000', async () => {
      const citedByPmids = Array.from({ length: 1500 }, (_, i) => i + 1);
      let callCount = 0;
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation(() => {
          callCount++;
          if (callCount === 1) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () =>
                Promise.resolve({
                  data: [{ pmid: 1, cited_by: citedByPmids }],
                }),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: [{ pmid: callCount }],
              }),
          });
        }),
      );
      const icite = new ICite();

      await icite.citedBy(1);

      expect(callCount).toBe(3);
    });
  });

  describe('references', () => {
    it('should fetch full publications for all references', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockImplementation((url: string) => {
          if (url.includes('pmids=33533846')) {
            return Promise.resolve({
              ok: true,
              status: 200,
              json: () => Promise.resolve(buildPublicationResponse()),
            });
          }
          return Promise.resolve({
            ok: true,
            status: 200,
            json: () =>
              Promise.resolve({
                data: [{ pmid: 32000001, title: 'Reference A' }],
              }),
          });
        }),
      );
      const icite = new ICite();

      const refs = await icite.references(33533846);

      expect(refs).toHaveLength(1);
      expect(refs[0]!.pmid).toBe(32000001);
    });

    it('should return empty array when source has no references', async () => {
      mockFetchJson({ data: [{ pmid: 12345, references: [] }] });
      const icite = new ICite();

      const refs = await icite.references(12345);

      expect(refs).toEqual([]);
    });

    it('should return empty array when source not found', async () => {
      mockFetchJson({ data: [] });
      const icite = new ICite();

      const refs = await icite.references(99999);

      expect(refs).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson({ data: [] });
      const icite = new ICite();

      await icite.publications([1]);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should accept custom maxRetries', async () => {
      mockFetchJson({ data: [] });
      const icite = new ICite({ maxRetries: 5 });

      await icite.publications([1]);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });
  });
});
