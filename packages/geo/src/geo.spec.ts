import { afterEach, describe, expect, it, vi } from 'vitest';
import { Geo } from './geo';

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
      count: '5',
      retmax: '20',
      retstart: '0',
      idlist: ['200185090', '200100001'],
      ...overrides,
    },
  };
}

function buildSummaryResponse(
  entries: Record<string, Record<string, unknown>> = {},
  uids?: ReadonlyArray<string>,
): Record<string, unknown> {
  const entryUids = uids ?? Object.keys(entries);
  return {
    result: {
      uids: entryUids,
      ...entries,
    },
  };
}

function buildGeoEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '200185090',
    accession: 'GSE185090',
    title: 'Single-cell RNA sequencing of human brain organoids',
    summary: 'Analysis of gene expression in brain organoids',
    taxon: 'Homo sapiens',
    entrytype: 'GSE',
    gdstype: 'Expression profiling by high throughput sequencing',
    ptechtype: 'Expression profiling by high throughput sequencing',
    pdat: '2023/06/15',
    suppfile: 'CEL, TXT',
    samples: [
      { accession: 'GSM5600001', title: 'Sample 1' },
      { accession: 'GSM5600002', title: 'Sample 2' },
    ],
    n_samples: 2,
    pubmedids: [37654321, '36543210'],
    ftplink: 'ftp://ftp.ncbi.nlm.nih.gov/geo/series/GSE185nnn/GSE185090/suppl/',
    bioproject: 'PRJNA765432',
    gpl: 'GPL24247',
    gse: 'GSE185090',
    ...overrides,
  };
}

describe('Geo', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const geo = new Geo();

      const result = await geo.search('brain organoid');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['200185090', '200100001']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const geo = new Geo();

      await geo.search('single cell RNA-seq');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=gds');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=single+cell+RNA-seq');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const geo = new Geo();

      await geo.search('brain organoid', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const geo = new Geo();

      await geo.search('brain organoid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const geo = new Geo({ apiKey: 'test-key' });

      await geo.search('brain organoid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const geo = new Geo({ tool: 'my-app', email: 'user@example.com' });

      await geo.search('brain organoid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const geo = new Geo();

      const result = await geo.search('brain organoid');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const geo = new Geo();

      const result = await geo.search('brain organoid');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch GEO records and map all fields', async () => {
      const entry = buildGeoEntry();
      mockFetchJson(buildSummaryResponse({ '200185090': entry as Record<string, unknown> }));
      const geo = new Geo();

      const records = await geo.fetch(['200185090']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('200185090');
      expect(records[0]!.accession).toBe('GSE185090');
      expect(records[0]!.title).toBe('Single-cell RNA sequencing of human brain organoids');
      expect(records[0]!.summary).toBe('Analysis of gene expression in brain organoids');
      expect(records[0]!.taxon).toBe('Homo sapiens');
      expect(records[0]!.entryType).toBe('GSE');
      expect(records[0]!.datasetType).toBe('Expression profiling by high throughput sequencing');
      expect(records[0]!.platformTechnologyType).toBe(
        'Expression profiling by high throughput sequencing',
      );
      expect(records[0]!.publicationDate).toBe('2023/06/15');
      expect(records[0]!.supplementaryFiles).toBe('CEL, TXT');
      expect(records[0]!.sampleCount).toBe(2);
      expect(records[0]!.ftpLink).toBe(
        'ftp://ftp.ncbi.nlm.nih.gov/geo/series/GSE185nnn/GSE185090/suppl/',
      );
      expect(records[0]!.bioproject).toBe('PRJNA765432');
      expect(records[0]!.platformId).toBe('GPL24247');
      expect(records[0]!.seriesId).toBe('GSE185090');
    });

    it('should map samples with accession and title', async () => {
      const entry = buildGeoEntry();
      mockFetchJson(buildSummaryResponse({ '200185090': entry as Record<string, unknown> }));
      const geo = new Geo();

      const records = await geo.fetch(['200185090']);

      expect(records[0]!.samples).toHaveLength(2);
      expect(records[0]!.samples[0]!.accession).toBe('GSM5600001');
      expect(records[0]!.samples[0]!.title).toBe('Sample 1');
      expect(records[0]!.samples[1]!.accession).toBe('GSM5600002');
      expect(records[0]!.samples[1]!.title).toBe('Sample 2');
    });

    it('should convert pubmedIds to strings', async () => {
      const entry = buildGeoEntry();
      mockFetchJson(buildSummaryResponse({ '200185090': entry as Record<string, unknown> }));
      const geo = new Geo();

      const records = await geo.fetch(['200185090']);

      expect(records[0]!.pubmedIds).toEqual(['37654321', '36543210']);
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const geo = new Geo();

      await geo.fetch(['200185090', '200100001']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=gds');
      expect(url).toContain('id=200185090%2C200100001');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const geo = new Geo();

      const records = await geo.fetch([]);

      expect(records).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildGeoEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '200185090': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['200185090', '999'],
        ),
      );
      const geo = new Geo();

      const records = await geo.fetch(['200185090', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('200185090');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const geo = new Geo();

      const records = await geo.fetch(['200185090']);

      expect(records).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const geo = new Geo();

      const records = await geo.fetch(['200185090']);

      expect(records).toEqual([]);
    });

    it('should handle entry with missing optional fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const geo = new Geo();

      const records = await geo.fetch(['1']);

      expect(records[0]!.uid).toBe('1');
      expect(records[0]!.accession).toBe('');
      expect(records[0]!.title).toBe('');
      expect(records[0]!.summary).toBe('');
      expect(records[0]!.taxon).toBe('');
      expect(records[0]!.entryType).toBe('');
      expect(records[0]!.datasetType).toBe('');
      expect(records[0]!.platformTechnologyType).toBe('');
      expect(records[0]!.publicationDate).toBe('');
      expect(records[0]!.supplementaryFiles).toBe('');
      expect(records[0]!.samples).toEqual([]);
      expect(records[0]!.sampleCount).toBe(0);
      expect(records[0]!.pubmedIds).toEqual([]);
      expect(records[0]!.ftpLink).toBe('');
      expect(records[0]!.bioproject).toBe('');
      expect(records[0]!.platformId).toBe('');
      expect(records[0]!.seriesId).toBe('');
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { title: 'Some GEO dataset' } }, ['1']));
      const geo = new Geo();

      const records = await geo.fetch(['1']);

      expect(records[0]!.uid).toBe('');
      expect(records[0]!.title).toBe('Some GEO dataset');
    });

    it('should handle samples with missing fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', samples: [{}] } }, ['1']));
      const geo = new Geo();

      const records = await geo.fetch(['1']);

      expect(records[0]!.samples[0]!.accession).toBe('');
      expect(records[0]!.samples[0]!.title).toBe('');
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['200185090', '999'],
          '200185090': buildGeoEntry(),
        },
      });
      const geo = new Geo();

      const records = await geo.fetch(['200185090', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('200185090');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch GEO records in one call', async () => {
      const entry = buildGeoEntry();
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSearchResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () =>
            Promise.resolve(
              buildSummaryResponse({ '200185090': entry as Record<string, unknown> }, [
                '200185090',
              ]),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const geo = new Geo();

      const records = await geo.searchAndFetch('brain organoid');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('200185090');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const geo = new Geo();

      const records = await geo.searchAndFetch('nonexistent_dataset_xyz');

      expect(records).toEqual([]);
      expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
    });

    it('should pass retmax option to search', async () => {
      const fetchMock = vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSearchResponse()),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: () => Promise.resolve(buildSummaryResponse({}, [])),
        });
      vi.stubGlobal('fetch', fetchMock);
      const geo = new Geo();

      await geo.searchAndFetch('brain organoid', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const geo = new Geo();

      await geo.search('brain organoid');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include all credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const geo = new Geo({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await geo.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
