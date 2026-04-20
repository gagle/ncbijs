import { afterEach, describe, expect, it, vi } from 'vitest';
import { Sra } from './sra';

const SAMPLE_EXPXML =
  '<Summary>' +
  '<Title>RNA-Seq of human liver</Title>' +
  '<Platform instrument_model="Illumina HiSeq 2500">ILLUMINA</Platform>' +
  '<Experiment acc="SRX1234567" />' +
  '<Organism taxid="9606" ScientificName="Homo sapiens" />' +
  '<Sample acc="SRS1234567" />' +
  '<Study acc="SRP123456" />' +
  '<Bioproject>PRJNA123456</Bioproject>' +
  '<Biosample>SAMN12345678</Biosample>' +
  '<LIBRARY_STRATEGY>RNA-Seq</LIBRARY_STRATEGY>' +
  '<LIBRARY_SOURCE>TRANSCRIPTOMIC</LIBRARY_SOURCE>' +
  '<LIBRARY_SELECTION>cDNA</LIBRARY_SELECTION>' +
  '<LIBRARY_LAYOUT><PAIRED /></LIBRARY_LAYOUT>' +
  '</Summary>';

const SAMPLE_RUNS_XML =
  '<Run acc="SRR1234567" total_spots="25000000" total_bases="5000000000" is_public="true" />';

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
      idlist: ['12345', '67890'],
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

function buildSraEntry(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    uid: '12345',
    expxml: SAMPLE_EXPXML,
    runs: SAMPLE_RUNS_XML,
    createdate: '2023/01/15',
    updatedate: '2023/06/20',
    ...overrides,
  };
}

describe('Sra', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('search', () => {
    it('should search by term and return parsed result', async () => {
      mockFetchJson(buildSearchResponse());
      const sra = new Sra();

      const result = await sra.search('RNA-Seq human');

      expect(result.total).toBe(5);
      expect(result.ids).toEqual(['12345', '67890']);
    });

    it('should build correct URL with term', async () => {
      mockFetchJson(buildSearchResponse());
      const sra = new Sra();

      await sra.search('RNA-Seq human liver');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esearch.fcgi');
      expect(url).toContain('db=sra');
      expect(url).toContain('retmode=json');
      expect(url).toContain('term=RNA-Seq+human+liver');
    });

    it('should include retmax in URL when specified', async () => {
      mockFetchJson(buildSearchResponse());
      const sra = new Sra();

      await sra.search('RNA-Seq', { retmax: 50 });

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('retmax=50');
    });

    it('should not include retmax when not specified', async () => {
      mockFetchJson(buildSearchResponse());
      const sra = new Sra();

      await sra.search('RNA-Seq');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('retmax');
    });

    it('should include api_key in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const sra = new Sra({ apiKey: 'test-key' });

      await sra.search('RNA-Seq');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=test-key');
    });

    it('should include tool and email in URL when configured', async () => {
      mockFetchJson(buildSearchResponse());
      const sra = new Sra({ tool: 'my-app', email: 'user@example.com' });

      await sra.search('RNA-Seq');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('tool=my-app');
      expect(url).toContain('email=user%40example.com');
    });

    it('should handle missing esearchresult', async () => {
      mockFetchJson({});
      const sra = new Sra();

      const result = await sra.search('RNA-Seq');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });

    it('should handle missing count and idlist', async () => {
      mockFetchJson({ esearchresult: {} });
      const sra = new Sra();

      const result = await sra.search('RNA-Seq');

      expect(result.total).toBe(0);
      expect(result.ids).toEqual([]);
    });
  });

  describe('fetch', () => {
    it('should fetch experiment details and map all fields', async () => {
      const entry = buildSraEntry();
      mockFetchJson(buildSummaryResponse({ '12345': entry as Record<string, unknown> }));
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments).toHaveLength(1);
      expect(experiments[0]!.uid).toBe('12345');
      expect(experiments[0]!.title).toBe('RNA-Seq of human liver');
      expect(experiments[0]!.experimentAccession).toBe('SRX1234567');
      expect(experiments[0]!.studyAccession).toBe('SRP123456');
      expect(experiments[0]!.sampleAccession).toBe('SRS1234567');
      expect(experiments[0]!.platform).toBe('ILLUMINA');
      expect(experiments[0]!.instrumentModel).toBe('Illumina HiSeq 2500');
      expect(experiments[0]!.libraryStrategy).toBe('RNA-Seq');
      expect(experiments[0]!.librarySource).toBe('TRANSCRIPTOMIC');
      expect(experiments[0]!.librarySelection).toBe('cDNA');
      expect(experiments[0]!.bioproject).toBe('PRJNA123456');
      expect(experiments[0]!.biosample).toBe('SAMN12345678');
      expect(experiments[0]!.createDate).toBe('2023/01/15');
      expect(experiments[0]!.updateDate).toBe('2023/06/20');
    });

    it('should parse organism from expxml', async () => {
      const entry = buildSraEntry();
      mockFetchJson(buildSummaryResponse({ '12345': entry as Record<string, unknown> }));
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments[0]!.organism.taxId).toBe(9606);
      expect(experiments[0]!.organism.scientificName).toBe('Homo sapiens');
    });

    it('should return empty platform when Platform tag has no text content', async () => {
      const xmlWithoutPlatformText =
        '<Summary>' +
        '<Title>WGS of E. coli</Title>' +
        '<Experiment acc="SRX0000001" />' +
        '</Summary>';
      const entry = buildSraEntry({ expxml: xmlWithoutPlatformText });
      mockFetchJson(buildSummaryResponse({ '12345': entry as Record<string, unknown> }));
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments[0]!.platform).toBe('');
    });

    it('should parse instrument model from expxml', async () => {
      const entry = buildSraEntry();
      mockFetchJson(buildSummaryResponse({ '12345': entry as Record<string, unknown> }));
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments[0]!.instrumentModel).toBe('Illumina HiSeq 2500');
    });

    it('should parse library layout from expxml', async () => {
      const entry = buildSraEntry();
      mockFetchJson(buildSummaryResponse({ '12345': entry as Record<string, unknown> }));
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments[0]!.libraryLayout).toBe('PAIRED');
    });

    it('should parse runs from runs XML', async () => {
      const entry = buildSraEntry();
      mockFetchJson(buildSummaryResponse({ '12345': entry as Record<string, unknown> }));
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments[0]!.runs).toHaveLength(1);
      expect(experiments[0]!.runs[0]!.accession).toBe('SRR1234567');
      expect(experiments[0]!.runs[0]!.totalSpots).toBe(25000000);
      expect(experiments[0]!.runs[0]!.totalBases).toBe(5000000000);
      expect(experiments[0]!.runs[0]!.isPublic).toBe(true);
    });

    it('should build correct URL for multiple UIDs', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const sra = new Sra();

      await sra.fetch(['12345', '67890']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('esummary.fcgi');
      expect(url).toContain('db=sra');
      expect(url).toContain('id=12345%2C67890');
      expect(url).toContain('retmode=json');
    });

    it('should return empty array for empty ids', async () => {
      const sra = new Sra();

      const experiments = await sra.fetch([]);

      expect(experiments).toEqual([]);
    });

    it('should skip entries with error field', async () => {
      const validEntry = buildSraEntry();
      const errorEntry = { error: 'Invalid uid 999' };
      mockFetchJson(
        buildSummaryResponse(
          {
            '12345': validEntry as Record<string, unknown>,
            '999': errorEntry,
          },
          ['12345', '999'],
        ),
      );
      const sra = new Sra();

      const experiments = await sra.fetch(['12345', '999']);

      expect(experiments).toHaveLength(1);
      expect(experiments[0]!.uid).toBe('12345');
    });

    it('should handle missing result key', async () => {
      mockFetchJson({});
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments).toEqual([]);
    });

    it('should handle missing uids in result', async () => {
      mockFetchJson({ result: {} });
      const sra = new Sra();

      const experiments = await sra.fetch(['12345']);

      expect(experiments).toEqual([]);
    });

    it('should default to empty strings and zero when expxml and runs are missing', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1' } }, ['1']));
      const sra = new Sra();

      const experiments = await sra.fetch(['1']);

      expect(experiments[0]!.uid).toBe('1');
      expect(experiments[0]!.title).toBe('');
      expect(experiments[0]!.experimentAccession).toBe('');
      expect(experiments[0]!.studyAccession).toBe('');
      expect(experiments[0]!.sampleAccession).toBe('');
      expect(experiments[0]!.organism.taxId).toBe(0);
      expect(experiments[0]!.organism.scientificName).toBe('');
      expect(experiments[0]!.platform).toBe('');
      expect(experiments[0]!.instrumentModel).toBe('');
      expect(experiments[0]!.libraryStrategy).toBe('');
      expect(experiments[0]!.librarySource).toBe('');
      expect(experiments[0]!.librarySelection).toBe('');
      expect(experiments[0]!.libraryLayout).toBe('');
      expect(experiments[0]!.bioproject).toBe('');
      expect(experiments[0]!.biosample).toBe('');
      expect(experiments[0]!.runs).toEqual([]);
      expect(experiments[0]!.createDate).toBe('');
      expect(experiments[0]!.updateDate).toBe('');
    });

    it('should handle empty expxml with all fields defaulting', async () => {
      mockFetchJson(buildSummaryResponse({ '1': { uid: '1', expxml: '', runs: '' } }, ['1']));
      const sra = new Sra();

      const experiments = await sra.fetch(['1']);

      expect(experiments[0]!.title).toBe('');
      expect(experiments[0]!.experimentAccession).toBe('');
      expect(experiments[0]!.studyAccession).toBe('');
      expect(experiments[0]!.sampleAccession).toBe('');
      expect(experiments[0]!.organism.taxId).toBe(0);
      expect(experiments[0]!.organism.scientificName).toBe('');
      expect(experiments[0]!.platform).toBe('');
      expect(experiments[0]!.instrumentModel).toBe('');
      expect(experiments[0]!.libraryStrategy).toBe('');
      expect(experiments[0]!.librarySource).toBe('');
      expect(experiments[0]!.librarySelection).toBe('');
      expect(experiments[0]!.libraryLayout).toBe('');
      expect(experiments[0]!.bioproject).toBe('');
      expect(experiments[0]!.biosample).toBe('');
      expect(experiments[0]!.runs).toEqual([]);
    });

    it('should handle LIBRARY_LAYOUT block without self-closing tag', async () => {
      const xmlWithEmptyLayout =
        '<Summary>' + '<LIBRARY_LAYOUT>unknown</LIBRARY_LAYOUT>' + '</Summary>';
      const entry = buildSraEntry({ expxml: xmlWithEmptyLayout });
      mockFetchJson(buildSummaryResponse({ '1': entry as Record<string, unknown> }, ['1']));
      const sra = new Sra();

      const experiments = await sra.fetch(['1']);

      expect(experiments[0]!.libraryLayout).toBe('');
    });

    it('should parse multiple runs', async () => {
      const multipleRunsXml =
        '<Run acc="SRR1111111" total_spots="10000" total_bases="2000000" is_public="true" />' +
        '<Run acc="SRR2222222" total_spots="20000" total_bases="4000000" is_public="true" />';
      const entry = buildSraEntry({ runs: multipleRunsXml });
      mockFetchJson(buildSummaryResponse({ '1': entry as Record<string, unknown> }, ['1']));
      const sra = new Sra();

      const experiments = await sra.fetch(['1']);

      expect(experiments[0]!.runs).toHaveLength(2);
      expect(experiments[0]!.runs[0]!.accession).toBe('SRR1111111');
      expect(experiments[0]!.runs[0]!.totalSpots).toBe(10000);
      expect(experiments[0]!.runs[0]!.totalBases).toBe(2000000);
      expect(experiments[0]!.runs[1]!.accession).toBe('SRR2222222');
      expect(experiments[0]!.runs[1]!.totalSpots).toBe(20000);
      expect(experiments[0]!.runs[1]!.totalBases).toBe(4000000);
    });

    it('should parse run with is_public false', async () => {
      const privateRunXml =
        '<Run acc="SRR9999999" total_spots="5000" total_bases="1000000" is_public="false" />';
      const entry = buildSraEntry({ runs: privateRunXml });
      mockFetchJson(buildSummaryResponse({ '1': entry as Record<string, unknown> }, ['1']));
      const sra = new Sra();

      const experiments = await sra.fetch(['1']);

      expect(experiments[0]!.runs[0]!.isPublic).toBe(false);
    });

    it('should handle run with missing attributes', async () => {
      const runXml = '<Run ></Run>';
      const entry = buildSraEntry({ runs: runXml });
      mockFetchJson(buildSummaryResponse({ '1': entry as Record<string, unknown> }, ['1']));
      const sra = new Sra();

      const experiments = await sra.fetch(['1']);

      expect(experiments[0]!.runs).toHaveLength(1);
      expect(experiments[0]!.runs[0]!.accession).toBe('');
      expect(experiments[0]!.runs[0]!.totalSpots).toBe(0);
      expect(experiments[0]!.runs[0]!.totalBases).toBe(0);
      expect(experiments[0]!.runs[0]!.isPublic).toBe(false);
    });

    it('should default uid to empty string when missing', async () => {
      mockFetchJson(
        buildSummaryResponse({ '1': { expxml: SAMPLE_EXPXML, runs: SAMPLE_RUNS_XML } }, ['1']),
      );
      const sra = new Sra();

      const experiments = await sra.fetch(['1']);

      expect(experiments[0]!.uid).toBe('');
      expect(experiments[0]!.title).toBe('RNA-Seq of human liver');
    });

    it('should skip uid when entry is undefined in result', async () => {
      mockFetchJson({
        result: {
          uids: ['12345', '999'],
          '12345': buildSraEntry(),
        },
      });
      const sra = new Sra();

      const experiments = await sra.fetch(['12345', '999']);

      expect(experiments).toHaveLength(1);
      expect(experiments[0]!.uid).toBe('12345');
    });
  });

  describe('searchAndFetch', () => {
    it('should search and fetch experiment reports in one call', async () => {
      const entry = buildSraEntry();
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
              buildSummaryResponse({ '12345': entry as Record<string, unknown> }, ['12345']),
            ),
        });
      vi.stubGlobal('fetch', fetchMock);
      const sra = new Sra();

      const experiments = await sra.searchAndFetch('RNA-Seq');

      expect(fetchMock).toHaveBeenCalledTimes(2);
      expect(experiments).toHaveLength(1);
      expect(experiments[0]!.uid).toBe('12345');
    });

    it('should return empty array when search finds no results', async () => {
      mockFetchJson({ esearchresult: { count: '0', idlist: [] } });
      const sra = new Sra();

      const experiments = await sra.searchAndFetch('nonexistent_experiment_xyz');

      expect(experiments).toEqual([]);
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
      const sra = new Sra();

      await sra.searchAndFetch('RNA-Seq', { retmax: 5 });

      const searchUrl = fetchMock.mock.calls[0]![0] as string;
      expect(searchUrl).toContain('retmax=5');
    });
  });

  describe('configuration', () => {
    it('should work without any config', async () => {
      mockFetchJson(buildSearchResponse());
      const sra = new Sra();

      await sra.search('RNA-Seq');

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).not.toContain('api_key');
      expect(url).not.toContain('tool=');
      expect(url).not.toContain('email=');
    });

    it('should include credentials in fetch URL', async () => {
      mockFetchJson(buildSummaryResponse({}, []));
      const sra = new Sra({ apiKey: 'key', tool: 'app', email: 'a@b.com' });

      await sra.fetch(['1']);

      const url = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(url).toContain('api_key=key');
      expect(url).toContain('tool=app');
      expect(url).toContain('email=a%40b.com');
    });
  });
});
