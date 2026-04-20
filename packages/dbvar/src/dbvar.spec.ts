import { afterEach, describe, expect, it, vi } from 'vitest';
import { DbVar } from './dbvar';

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
      idlist: ['18602965', '18602966'],
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

function buildDbVarEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '18602965',
    obj_type: 'variant_region',
    st: 'nstd186',
    sv: 'nsv4568923',
    study_type: 'Case Set',
    variant_count: '150',
    tax_id: 9606,
    organism: 'Homo sapiens',
    dbvarplacementlist: [{ chr: '1', chr_start: 1000000, chr_end: 2000000, assembly: 'GRCh38' }],
    dbvargenelist: [{ id: 672, name: 'BRCA1' }],
    dbvarmethodlist: ['Sequencing'],
    dbvarclinicalsignificancelist: ['Pathogenic'],
    dbvarvarianttypelist: ['copy number loss'],
    variant_call_count: 25,
    ...overrides,
  };
}

describe('DbVar', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const dbvar = new DbVar();

      const result = await dbvar.search('nstd186');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['18602965', '18602966']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const dbvar = new DbVar();

      await dbvar.search('copy number loss');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=dbvar');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=copy+number+loss');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const dbvar = new DbVar();

      await dbvar.search('nstd186', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const dbvar = new DbVar();

      await dbvar.search('nstd186');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const dbvar = new DbVar({ apiKey: 'test-key' });

      await dbvar.search('nstd186');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const dbvar = new DbVar({ tool: 'my-app', email: 'user@example.com' });

      await dbvar.search('nstd186');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const dbvar = new DbVar();

      const result = await dbvar.search('nstd186');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const dbvar = new DbVar();

      const result = await dbvar.search('nstd186');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch record details and map all fields', async () => {
      const entry = buildDbVarEntry();
      mockFetchJson(buildSummaryResponse({ '18602965': entry as Record<string, unknown> }));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('18602965');
      expect(records[0]!.objectType).toBe('variant_region');
      expect(records[0]!.studyAccession).toBe('nstd186');
      expect(records[0]!.variantAccession).toBe('nsv4568923');
      expect(records[0]!.studyType).toBe('Case Set');
      expect(records[0]!.variantCount).toBe(150);
      expect(records[0]!.taxId).toBe(9606);
      expect(records[0]!.organism).toBe('Homo sapiens');
      expect(records[0]!.methods).toEqual(['Sequencing']);
      expect(records[0]!.clinicalSignificances).toEqual(['Pathogenic']);
      expect(records[0]!.variantTypes).toEqual(['copy number loss']);
      expect(records[0]!.variantCallCount).toBe(25);
    });

    it('should map placement fields', async () => {
      const entry = buildDbVarEntry();
      mockFetchJson(buildSummaryResponse({ '18602965': entry as Record<string, unknown> }));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records[0]!.placements).toHaveLength(1);
      expect(records[0]!.placements[0]!.chromosome).toBe('1');
      expect(records[0]!.placements[0]!.start).toBe(1000000);
      expect(records[0]!.placements[0]!.end).toBe(2000000);
      expect(records[0]!.placements[0]!.assembly).toBe('GRCh38');
    });

    it('should map gene fields', async () => {
      const entry = buildDbVarEntry();
      mockFetchJson(buildSummaryResponse({ '18602965': entry as Record<string, unknown> }));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records[0]!.genes).toHaveLength(1);
      expect(records[0]!.genes[0]!.id).toBe(672);
      expect(records[0]!.genes[0]!.name).toBe('BRCA1');
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const dbvar = new DbVar();

      await dbvar.fetch(['18602965', '18602966']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=dbvar');
      expect(url).toContain('id=18602965%2C18602966');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const dbvar = new DbVar();

      const records = await dbvar.fetch([]);

      expect(records).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildDbVarEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '18602965': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['18602965', '999'],
        ),
      );
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('18602965');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records).toEqual([]);
    });

    it('should handle record with missing optional fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['1']);

      expect(records[0]!.uid).toBe('1');
      expect(records[0]!.objectType).toBe('');
      expect(records[0]!.studyAccession).toBe('');
      expect(records[0]!.variantAccession).toBe('');
      expect(records[0]!.studyType).toBe('');
      expect(records[0]!.variantCount).toBe(0);
      expect(records[0]!.taxId).toBe(0);
      expect(records[0]!.organism).toBe('');
      expect(records[0]!.placements).toEqual([]);
      expect(records[0]!.genes).toEqual([]);
      expect(records[0]!.methods).toEqual([]);
      expect(records[0]!.clinicalSignificances).toEqual([]);
      expect(records[0]!.variantTypes).toEqual([]);
      expect(records[0]!.variantCallCount).toBe(0);
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { obj_type: 'variant_region' } }, ['1']));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['1']);

      expect(records[0]!.uid).toBe('');
      expect(records[0]!.objectType).toBe('variant_region');
    });

    it('should handle placement with missing fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', dbvarplacementlist: [{}] } }, ['1']));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['1']);

      expect(records[0]!.placements[0]!.chromosome).toBe('');
      expect(records[0]!.placements[0]!.start).toBe(0);
      expect(records[0]!.placements[0]!.end).toBe(0);
      expect(records[0]!.placements[0]!.assembly).toBe('');
    });

    it('should handle gene with missing fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', dbvargenelist: [{}] } }, ['1']));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['1']);

      expect(records[0]!.genes[0]!.id).toBe(0);
      expect(records[0]!.genes[0]!.name).toBe('');
    });

    it('should convert variant_count from string to number', async () => {
      const entry = buildDbVarEntry({ variant_count: '42' });
      mockFetchJson(buildSummaryResponse({ '18602965': entry as Record<string, unknown> }));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records[0]!.variantCount).toBe(42);
    });

    it('should convert tax_id from string to number', async () => {
      const entry = buildDbVarEntry({ tax_id: '9606' });
      mockFetchJson(buildSummaryResponse({ '18602965': entry as Record<string, unknown> }));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records[0]!.taxId).toBe(9606);
    });

    it('should convert empty string tax_id to 0 for STUDY records', async () => {
      const entry = buildDbVarEntry({ tax_id: '' });
      mockFetchJson(buildSummaryResponse({ '18602965': entry as Record<string, unknown> }));
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965']);

      expect(records[0]!.taxId).toBe(0);
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['18602965', '999'],
          '18602965': buildDbVarEntry(),
        },
      });
      const dbvar = new DbVar();

      const records = await dbvar.fetch(['18602965', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('18602965');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch records in one call', async () => {
      const entry = buildDbVarEntry();
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
              buildSummaryResponse({ '18602965': entry as Record<string, unknown> }, ['18602965']),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const dbvar = new DbVar();

      const records = await dbvar.searchAndFetch('nstd186');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('18602965');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const dbvar = new DbVar();

      const records = await dbvar.searchAndFetch('nonexistent_variant_xyz');

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
      const dbvar = new DbVar();

      await dbvar.searchAndFetch('nstd186', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const dbvar = new DbVar();

      await dbvar.search('nstd186');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include all credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const dbvar = new DbVar({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await dbvar.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
