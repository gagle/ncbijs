import { afterEach, describe, expect, it, vi } from 'vitest';
import { Gtr } from './gtr';

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

function buildSearchResponse(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    esearchresult: {
      count: '10',
      retmax: '20',
      retstart: '0',
      idlist: ['21517', '50000'],
      ...overrides,
    },
  };
}

function buildSummaryResponse(
  entries: Record<string, Record<string, unknown>> = {},
): Record<string, unknown> {
  const uids = Object.keys(entries);
  return {
    result: {
      uids,
      ...entries,
    },
  };
}

function buildGtrEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '21517',
    accession: 'GTR000021517',
    testname: 'BRCA1',
    testtype: 'Clinical',
    conditionlist: [
      {
        name: 'Breast-ovarian cancer, familial, susceptibility to, 1',
        acronym: '',
        cui: 'C2676676',
      },
    ],
    analytes: [
      {
        analytetype: 'Gene',
        name: 'BRCA1',
        geneid: 672,
        location: '17q21.31',
      },
    ],
    offerer: 'Molecular Genetics Laboratory',
    offererlocation: {
      city: 'London',
      state: 'Ontario',
      country: 'Canada',
    },
    method: [
      {
        name: 'Molecular Genetics',
        categorylist: [
          {
            name: 'Deletion/duplication analysis',
            methodlist: ['MLPA'],
          },
        ],
      },
    ],
    certifications: [{ certificationtype: 'ISO15189', id: '731' }],
    specimens: ['Isolated DNA', 'Peripheral (whole) blood'],
    testpurpose: ['Diagnosis', 'Predictive'],
    clinicalvalidity: {
      description: 'A germline mutation in BRCA1 predisposes to breast cancer.',
    },
    country: 'Canada',
    ...overrides,
  };
}

describe('Gtr', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const gtr = new Gtr();

      const result = await gtr.search('BRCA1');

      expect(result.total).toBe(10);
      expect(result.ids).toEqual(['21517', '50000']);
    });

    it('should build correct search URL', async () => {
      mockFetchJson(buildSearchResponse());
      const gtr = new Gtr();

      await gtr.search('cystic fibrosis');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=gtr');
      expect(url).toContain('retmode=json');
    });

    it('should include retmax when provided', async () => {
      mockFetchJson(buildSearchResponse());
      const gtr = new Gtr();

      await gtr.search('test', { retmax: 5 });

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('retmax=5');
    });

    it('should include credentials when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const gtr = new Gtr({
        apiKey: 'test-key',
        tool: 'my-tool',
        email: 'test@example.com',
      });

      await gtr.search('BRCA1');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('api_key=test-key');
      expect(url).toContain('tool=my-tool');
      expect(url).toContain('email=test%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const gtr = new Gtr();

      const result = await gtr.search('nonexistent');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch and parse test entries', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests).toHaveLength(1);
      const test = tests[0]!;
      expect(test.uid).toBe('21517');
      expect(test.accession).toBe('GTR000021517');
      expect(test.testName).toBe('BRCA1');
      expect(test.testType).toBe('Clinical');
      expect(test.country).toBe('Canada');
    });

    it('should parse conditions', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.conditions).toHaveLength(1);
      expect(tests[0]!.conditions[0]?.name).toBe(
        'Breast-ovarian cancer, familial, susceptibility to, 1',
      );
      expect(tests[0]!.conditions[0]?.cui).toBe('C2676676');
    });

    it('should parse analytes', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.analytes).toHaveLength(1);
      expect(tests[0]!.analytes[0]?.analyteType).toBe('Gene');
      expect(tests[0]!.analytes[0]?.name).toBe('BRCA1');
      expect(tests[0]!.analytes[0]?.geneId).toBe(672);
      expect(tests[0]!.analytes[0]?.location).toBe('17q21.31');
    });

    it('should parse offerer location', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.offerer).toBe('Molecular Genetics Laboratory');
      expect(tests[0]!.offererLocation.city).toBe('London');
      expect(tests[0]!.offererLocation.state).toBe('Ontario');
      expect(tests[0]!.offererLocation.country).toBe('Canada');
    });

    it('should parse methods with categories', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.methods).toHaveLength(1);
      expect(tests[0]!.methods[0]?.name).toBe('Molecular Genetics');
      expect(tests[0]!.methods[0]?.categories).toHaveLength(1);
      expect(tests[0]!.methods[0]?.categories[0]?.name).toBe('Deletion/duplication analysis');
      expect(tests[0]!.methods[0]?.categories[0]?.methods).toEqual(['MLPA']);
    });

    it('should parse certifications', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.certifications).toHaveLength(1);
      expect(tests[0]!.certifications[0]?.certificationType).toBe('ISO15189');
      expect(tests[0]!.certifications[0]?.id).toBe('731');
    });

    it('should parse specimens and test purposes', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.specimens).toEqual(['Isolated DNA', 'Peripheral (whole) blood']);
      expect(tests[0]!.testPurposes).toEqual(['Diagnosis', 'Predictive']);
    });

    it('should parse clinical validity', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.clinicalValidity).toBe(
        'A germline mutation in BRCA1 predisposes to breast cancer.',
      );
    });

    it('should build correct fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({ '21517': buildGtrEntry() }));
      const gtr = new Gtr();

      await gtr.fetch(['21517', '50000']);

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=gtr');
      expect(url).toContain('id=21517%2C50000');
    });

    it('should return empty array for empty ids', async () => {
      const gtr = new Gtr();

      const tests = await gtr.fetch([]);

      expect(tests).toEqual([]);
    });

    it('should skip entries with errors', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '21517': { error: 'some error' },
        }),
      );
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests).toEqual([]);
    });

    it('should skip non-object entries', async () => {
      mockFetchJson({
        result: {
          uids: ['21517'],
          '21517': 'not-an-object',
        },
      });
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests).toEqual([]);
    });

    it('should handle missing result', async () => {
      mockFetchJson({});
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests).toEqual([]);
    });

    it('should handle nested objects with missing fields', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '21517': buildGtrEntry({
            conditionlist: [{}],
            analytes: [{}],
            method: [{ categorylist: [{}] }],
            certifications: [{}],
          }),
        }),
      );
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]!.conditions[0]?.name).toBe('');
      expect(tests[0]!.conditions[0]?.acronym).toBe('');
      expect(tests[0]!.conditions[0]?.cui).toBe('');
      expect(tests[0]!.analytes[0]?.analyteType).toBe('');
      expect(tests[0]!.analytes[0]?.name).toBe('');
      expect(tests[0]!.analytes[0]?.geneId).toBe(0);
      expect(tests[0]!.analytes[0]?.location).toBe('');
      expect(tests[0]!.methods[0]?.name).toBe('');
      expect(tests[0]!.methods[0]?.categories[0]?.name).toBe('');
      expect(tests[0]!.methods[0]?.categories[0]?.methods).toEqual([]);
      expect(tests[0]!.certifications[0]?.certificationType).toBe('');
      expect(tests[0]!.certifications[0]?.id).toBe('');
    });

    it('should handle missing optional fields', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '21517': { uid: '21517' },
        }),
      );
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]?.accession).toBe('');
      expect(tests[0]?.testName).toBe('');
      expect(tests[0]?.testType).toBe('');
      expect(tests[0]?.conditions).toEqual([]);
      expect(tests[0]?.analytes).toEqual([]);
      expect(tests[0]?.offerer).toBe('');
      expect(tests[0]?.offererLocation.city).toBe('');
      expect(tests[0]?.methods).toEqual([]);
      expect(tests[0]?.certifications).toEqual([]);
      expect(tests[0]?.specimens).toEqual([]);
      expect(tests[0]?.testPurposes).toEqual([]);
      expect(tests[0]?.clinicalValidity).toBe('');
    });

    it('should handle missing offerer location', async () => {
      mockFetchJson(
        buildSummaryResponse({
          '21517': buildGtrEntry({ offererlocation: undefined }),
        }),
      );
      const gtr = new Gtr();

      const tests = await gtr.fetch(['21517']);

      expect(tests[0]?.offererLocation.city).toBe('');
      expect(tests[0]?.offererLocation.state).toBe('');
      expect(tests[0]?.offererLocation.country).toBe('');
    });
  });

  describe('searchAndFetch', () => {
    it('should search then fetch results', async () => {
      const searchResponse = buildSearchResponse({ idlist: ['21517'] });
      const summaryResponse = buildSummaryResponse({
        '21517': buildGtrEntry(),
      });

      vi.stubGlobal(
        'fetch',
        vi
          .fn()
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(searchResponse),
          })
          .mockResolvedValueOnce({
            ok: true,
            status: 200,
            json: () => Promise.resolve(summaryResponse),
          }),
      );

      const gtr = new Gtr();
      const tests = await gtr.searchAndFetch('BRCA1');

      expect(tests).toHaveLength(1);
      expect(tests[0]?.testName).toBe('BRCA1');
    });

    it('should return empty array when search finds nothing', async () => {
      mockFetchJson(buildSearchResponse({ count: '0', idlist: [] }));
      const gtr = new Gtr();

      const tests = await gtr.searchAndFetch('nonexistent');

      expect(tests).toEqual([]);
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const gtr = new Gtr();

      await gtr.search('test');

      const url = vi.mocked(fetch).mock.calls[0]?.[0] as string;
      expect(url).not.toContain('api_key');
    });
  });
});
