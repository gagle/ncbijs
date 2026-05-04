import { afterEach, describe, expect, it, vi } from 'vitest';
import { Structure } from './structure';

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
      idlist: ['279144', '279145'],
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

function buildStructureEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '279144',
    pdbacc: '9S9Q',
    pdbdescr: 'Crystal structure of p53 cancer mutant Y220N in complex with rezatapopt',
    ec: '2.7.1.37',
    resolution: '1.87',
    expmethod: 'X-ray Diffraction',
    pdbclass: 'TRANSCRIPTION',
    pdbdepositdate: '2025/08/06 00:00',
    mmdbentrydate: '2026/03/18 00:00',
    mmdbmodifydate: '2026/04/06 00:00',
    organismlist: ['Homo sapiens'],
    pdbaccsynlist: [],
    ligcode: 'A1JMR|EDO|PEG|ZN',
    ligcount: '5',
    modproteinrescount: '',
    moddnarescount: '',
    modrnarescount: '',
    proteinmoleculecount: 1,
    dnamoleculecount: '',
    rnamoleculecount: '',
    biopolymercount: 1,
    othermoleculecount: 1,
    ...overrides,
  };
}

describe('Structure', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const structure = new Structure();

      const result = await structure.search('p53');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['279144', '279145']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const structure = new Structure();

      await structure.search('crystal structure');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=structure');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=crystal+structure');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const structure = new Structure();

      await structure.search('p53', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const structure = new Structure();

      await structure.search('p53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const structure = new Structure({ apiKey: 'test-key' });

      await structure.search('p53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const structure = new Structure({ tool: 'my-app', email: 'user@example.com' });

      await structure.search('p53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const structure = new Structure();

      const result = await structure.search('p53');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const structure = new Structure();

      const result = await structure.search('p53');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch record details and map all fields', async () => {
      const entry = buildStructureEntry();
      mockFetchJson(buildSummaryResponse({ '279144': entry as Record<string, unknown> }));
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('279144');
      expect(records[0]!.pdbAccession).toBe('9S9Q');
      expect(records[0]!.description).toBe(
        'Crystal structure of p53 cancer mutant Y220N in complex with rezatapopt',
      );
      expect(records[0]!.enzymeClassification).toBe('2.7.1.37');
      expect(records[0]!.resolution).toBe('1.87');
      expect(records[0]!.experimentalMethod).toBe('X-ray Diffraction');
      expect(records[0]!.pdbClass).toBe('TRANSCRIPTION');
      expect(records[0]!.pdbDepositDate).toBe('2025/08/06 00:00');
      expect(records[0]!.mmdbEntryDate).toBe('2026/03/18 00:00');
      expect(records[0]!.mmdbModifyDate).toBe('2026/04/06 00:00');
      expect(records[0]!.organisms).toEqual(['Homo sapiens']);
      expect(records[0]!.pdbAccessionSynonyms).toEqual([]);
      expect(records[0]!.ligandCode).toBe('A1JMR|EDO|PEG|ZN');
      expect(records[0]!.ligandCount).toBe(5);
      expect(records[0]!.modifiedProteinResidueCount).toBe(0);
      expect(records[0]!.modifiedDnaResidueCount).toBe(0);
      expect(records[0]!.modifiedRnaResidueCount).toBe(0);
      expect(records[0]!.proteinMoleculeCount).toBe(1);
      expect(records[0]!.dnaMoleculeCount).toBe(0);
      expect(records[0]!.rnaMoleculeCount).toBe(0);
      expect(records[0]!.biopolymerCount).toBe(1);
      expect(records[0]!.otherMoleculeCount).toBe(1);
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const structure = new Structure();

      await structure.fetch(['279144', '279145']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=structure');
      expect(url).toContain('id=279144%2C279145');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const structure = new Structure();

      const records = await structure.fetch([]);

      expect(records).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildStructureEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '279144': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['279144', '999'],
        ),
      );
      const structure = new Structure();

      const records = await structure.fetch(['279144', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('279144');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records).toEqual([]);
    });

    it('should handle record with missing optional fields', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const structure = new Structure();

      const records = await structure.fetch(['1']);

      expect(records[0]!.uid).toBe('1');
      expect(records[0]!.pdbAccession).toBe('');
      expect(records[0]!.description).toBe('');
      expect(records[0]!.enzymeClassification).toBe('');
      expect(records[0]!.resolution).toBe('');
      expect(records[0]!.experimentalMethod).toBe('');
      expect(records[0]!.pdbClass).toBe('');
      expect(records[0]!.pdbDepositDate).toBe('');
      expect(records[0]!.mmdbEntryDate).toBe('');
      expect(records[0]!.mmdbModifyDate).toBe('');
      expect(records[0]!.organisms).toEqual([]);
      expect(records[0]!.pdbAccessionSynonyms).toEqual([]);
      expect(records[0]!.ligandCode).toBe('');
      expect(records[0]!.ligandCount).toBe(0);
      expect(records[0]!.modifiedProteinResidueCount).toBe(0);
      expect(records[0]!.modifiedDnaResidueCount).toBe(0);
      expect(records[0]!.modifiedRnaResidueCount).toBe(0);
      expect(records[0]!.proteinMoleculeCount).toBe(0);
      expect(records[0]!.dnaMoleculeCount).toBe(0);
      expect(records[0]!.rnaMoleculeCount).toBe(0);
      expect(records[0]!.biopolymerCount).toBe(0);
      expect(records[0]!.otherMoleculeCount).toBe(0);
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { pdbacc: '9S9Q' } }, ['1']));
      const structure = new Structure();

      const records = await structure.fetch(['1']);

      expect(records[0]!.uid).toBe('');
      expect(records[0]!.pdbAccession).toBe('9S9Q');
    });

    it('should convert ligcount from string to number', async () => {
      const entry = buildStructureEntry({ ligcount: '12' });
      mockFetchJson(buildSummaryResponse({ '279144': entry as Record<string, unknown> }));
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records[0]!.ligandCount).toBe(12);
    });

    it('should convert dnamoleculecount from empty string to 0', async () => {
      const entry = buildStructureEntry({ dnamoleculecount: '' });
      mockFetchJson(buildSummaryResponse({ '279144': entry as Record<string, unknown> }));
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records[0]!.dnaMoleculeCount).toBe(0);
    });

    it('should convert rnamoleculecount from string to number', async () => {
      const entry = buildStructureEntry({ rnamoleculecount: '3' });
      mockFetchJson(buildSummaryResponse({ '279144': entry as Record<string, unknown> }));
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records[0]!.rnaMoleculeCount).toBe(3);
    });

    it('should convert modproteinrescount from string to number', async () => {
      const entry = buildStructureEntry({ modproteinrescount: '7' });
      mockFetchJson(buildSummaryResponse({ '279144': entry as Record<string, unknown> }));
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records[0]!.modifiedProteinResidueCount).toBe(7);
    });

    it('should convert moddnarescount from string to number', async () => {
      const entry = buildStructureEntry({ moddnarescount: '2' });
      mockFetchJson(buildSummaryResponse({ '279144': entry as Record<string, unknown> }));
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records[0]!.modifiedDnaResidueCount).toBe(2);
    });

    it('should convert modrnarescount from string to number', async () => {
      const entry = buildStructureEntry({ modrnarescount: '4' });
      mockFetchJson(buildSummaryResponse({ '279144': entry as Record<string, unknown> }));
      const structure = new Structure();

      const records = await structure.fetch(['279144']);

      expect(records[0]!.modifiedRnaResidueCount).toBe(4);
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['279144', '999'],
          '279144': buildStructureEntry(),
        },
      });
      const structure = new Structure();

      const records = await structure.fetch(['279144', '999']);

      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('279144');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch records in one call', async () => {
      const entry = buildStructureEntry();
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
              buildSummaryResponse({ '279144': entry as Record<string, unknown> }, ['279144']),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const structure = new Structure();

      const records = await structure.searchAndFetch('p53');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(records).toHaveLength(1);
      expect(records[0]!.uid).toBe('279144');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const structure = new Structure();

      const records = await structure.searchAndFetch('nonexistent_structure_xyz');

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
      const structure = new Structure();

      await structure.searchAndFetch('p53', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const structure = new Structure();

      await structure.search('p53');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include all credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const structure = new Structure({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await structure.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
