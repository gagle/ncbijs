import { afterEach, describe, expect, it, vi } from 'vitest';

import { PubTator } from './pubtator';

function mockFetchJson(body: unknown): void {
  const text = JSON.stringify(body);
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(text),
    }),
  );
}

function mockFetchText(body: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(body),
    }),
  );
}

function mockFetchError(status: number, body = ''): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(body),
    }),
  );
}

const BIOC_JSON = JSON.stringify({
  documents: [
    {
      id: '12345',
      passages: [
        {
          infons: { type: 'title' },
          text: 'Study of BRCA1',
          offset: 0,
          annotations: [
            {
              text: 'BRCA1',
              infons: { type: 'Gene', identifier: '672' },
              locations: [{ offset: 9, length: 5 }],
            },
          ],
        },
      ],
    },
  ],
});

const BIOC_XML = `<?xml version="1.0"?>
<collection>
  <document>
    <id>12345</id>
    <passage>
      <infon key="type">title</infon>
      <text>Study of BRCA1</text>
      <offset>0</offset>
      <annotation>
        <infon key="type">Gene</infon>
        <infon key="identifier">672</infon>
        <text>BRCA1</text>
        <location offset="9" length="5" />
      </annotation>
    </passage>
  </document>
</collection>`;

describe('PubTator', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create instance', () => {
      const client = new PubTator();
      expect(client).toBeInstanceOf(PubTator);
    });
  });

  describe('findEntity', () => {
    it('should search for entities by query string', async () => {
      mockFetchJson([
        {
          _id: '@GENE_BRCA1',
          biotype: 'gene',
          db_id: '672',
          db: 'ncbi_gene',
          name: 'BRCA1',
          description: 'All Species',
          match: 'Matched on name <m>BRCA1</m>',
        },
      ]);
      const client = new PubTator();
      const result = await client.findEntity('BRCA1');
      expect(result).toHaveLength(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/entity/autocomplete/?query=BRCA1'),
        expect.anything(),
      );
    });

    it('should return EntityMatch array with id, name, type', async () => {
      mockFetchJson([
        {
          _id: '@GENE_BRCA1',
          biotype: 'gene',
          db_id: '672',
          db: 'ncbi_gene',
          name: 'BRCA1',
          description: 'All Species',
          match: 'Matched on name <m>BRCA1</m>',
        },
      ]);
      const client = new PubTator();
      const result = await client.findEntity('BRCA1');
      expect(result[0]).toEqual({
        id: '672',
        name: 'BRCA1',
        type: 'gene',
      });
    });

    it('should filter by entityType when provided', async () => {
      mockFetchJson([]);
      const client = new PubTator();
      await client.findEntity('BRCA1', 'gene');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=gene'), expect.anything());
    });

    it('should handle empty results', async () => {
      mockFetchJson([]);
      const client = new PubTator();
      const result = await client.findEntity('nonexistent');
      expect(result).toEqual([]);
    });

    it('should search for gene entities', async () => {
      mockFetchJson([
        {
          _id: '@GENE_BRCA1',
          biotype: 'gene',
          db_id: '672',
          db: 'ncbi_gene',
          name: 'BRCA1',
          description: '',
          match: '',
        },
      ]);
      const client = new PubTator();
      await client.findEntity('BRCA1', 'gene');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=gene'), expect.anything());
    });

    it('should search for disease entities', async () => {
      mockFetchJson([
        {
          _id: '@DISEASE_breast_cancer',
          biotype: 'disease',
          db_id: 'MESH:D001943',
          db: 'mesh',
          name: 'breast cancer',
          description: '',
          match: '',
        },
      ]);
      const client = new PubTator();
      await client.findEntity('breast cancer', 'disease');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=disease'),
        expect.anything(),
      );
    });

    it('should search for chemical entities', async () => {
      mockFetchJson([
        {
          _id: '@CHEMICAL_aspirin',
          biotype: 'chemical',
          db_id: 'MESH:D001241',
          db: 'mesh',
          name: 'aspirin',
          description: '',
          match: '',
        },
      ]);
      const client = new PubTator();
      await client.findEntity('aspirin', 'chemical');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=chemical'),
        expect.anything(),
      );
    });

    it('should search for variant entities', async () => {
      mockFetchJson([
        {
          _id: '@VARIANT_V600E',
          biotype: 'variant',
          db_id: 'tmVar:p.V600E',
          db: 'litvar',
          name: 'V600E',
          description: '',
          match: '',
        },
      ]);
      const client = new PubTator();
      await client.findEntity('V600E', 'variant');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=variant'),
        expect.anything(),
      );
    });

    it('should search for species entities', async () => {
      mockFetchJson([
        {
          _id: '@SPECIES_human',
          biotype: 'species',
          db_id: '9606',
          db: 'ncbi_taxonomy',
          name: 'human',
          description: '',
          match: '',
        },
      ]);
      const client = new PubTator();
      await client.findEntity('human', 'species');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=species'),
        expect.anything(),
      );
    });

    it('should search for cell_line entities', async () => {
      mockFetchJson([
        {
          _id: '@CELL_LINE_HeLa',
          biotype: 'cell_line',
          db_id: 'CVCL:0030',
          db: 'cellosaurus',
          name: 'HeLa',
          description: '',
          match: '',
        },
      ]);
      const client = new PubTator();
      await client.findEntity('HeLa', 'cell_line');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('type=cell_line'),
        expect.anything(),
      );
    });

    it('should throw on HTTP error', async () => {
      mockFetchError(400, 'Bad Request');
      const client = new PubTator();
      await expect(client.findEntity('BRCA1')).rejects.toThrow('PubTator3 API returned status 400');
    });

    it('should throw on HTTP error with empty body', async () => {
      mockFetchError(401);
      const client = new PubTator();
      await expect(client.findEntity('BRCA1')).rejects.toThrow('PubTator3 API returned status 401');
    });
  });

  describe('search', () => {
    const SEARCH_RESPONSE = {
      count: 42,
      current: 1,
      page_size: 10,
      results: [
        {
          pmid: 12345,
          title: 'BRCA1 and Cancer',
          journal: 'Nature',
          date: '2023-06-15T00:00:00Z',
          authors: ['Smith J', 'Doe A'],
        },
      ],
    };

    it('should search PubTator3 by query', async () => {
      mockFetchJson(SEARCH_RESPONSE);
      const client = new PubTator();
      await client.search('BRCA1');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('text=BRCA1'), expect.anything());
    });

    it('should return total, page, pageSize, results', async () => {
      mockFetchJson(SEARCH_RESPONSE);
      const client = new PubTator();
      const result = await client.search('BRCA1');
      expect(result.total).toBe(42);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
      expect(result.results).toHaveLength(1);
    });

    it('should return results with pmid, title, journal, year, authors', async () => {
      mockFetchJson(SEARCH_RESPONSE);
      const client = new PubTator();
      const result = await client.search('BRCA1');
      expect(result.results[0]).toEqual({
        pmid: '12345',
        title: 'BRCA1 and Cancer',
        journal: 'Nature',
        year: 2023,
        authors: ['Smith J', 'Doe A'],
      });
    });

    it('should support page option', async () => {
      mockFetchJson({ ...SEARCH_RESPONSE, current: 3 });
      const client = new PubTator();
      await client.search('BRCA1', { page: 3 });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('page=3'), expect.anything());
    });

    it('should support pageSize option', async () => {
      mockFetchJson({ ...SEARCH_RESPONSE, page_size: 25 });
      const client = new PubTator();
      await client.search('BRCA1', { pageSize: 25 });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pagesize=25'), expect.anything());
    });

    it('should handle empty results', async () => {
      mockFetchJson({ count: 0, current: 1, page_size: 10, results: [] });
      const client = new PubTator();
      const result = await client.search('nonexistent');
      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });

    it('should default year to 0 when result has no date', async () => {
      mockFetchJson({
        count: 1,
        current: 1,
        page_size: 10,
        results: [
          {
            pmid: 12345,
            title: 'No Date Article',
            journal: 'Nature',
            date: '',
            authors: ['Smith J'],
          },
        ],
      });
      const client = new PubTator();
      const result = await client.search('test');
      expect(result.results[0]?.year).toBe(0);
    });
  });

  describe('export', () => {
    it('should export annotations for PMIDs', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345']);
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('pmids=12345');
    });

    it('should return BioDocument with documents', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      const result = await client.export(['12345']);
      expect(result.documents).toHaveLength(1);
      expect(result.documents[0]?.id).toBe('12345');
    });

    it('should default to json format', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345']);
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('/export/biocjson');
    });

    it('should support xml format', async () => {
      mockFetchText(BIOC_XML);
      const client = new PubTator();
      await client.export(['12345'], { format: 'xml' });
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('/export/biocxml');
    });

    it('should support full text when full is true', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345'], { full: true });
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('full=true');
    });

    it('should export abstract only when full is false', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345'], { full: false });
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('full=false');
    });

    it('should handle multiple PMIDs', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345', '67890']);
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('pmids=12345%2C67890');
    });

    it('should handle non-existent PMID', async () => {
      mockFetchText('  ');
      const client = new PubTator();
      const result = await client.export(['00000']);
      expect(result.documents).toEqual([]);
    });
  });

  describe('annotateByPmid', () => {
    it('should annotate articles by PMID list', async () => {
      mockFetchText('annotation output');
      const client = new PubTator();
      const result = await client.annotateByPmid(['12345']);
      expect(result).toBe('annotation output');
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('pmids=12345');
    });

    it('should support PubTator format', async () => {
      mockFetchText('pubtator format');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { format: 'PubTator' });
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('type=PubTator');
    });

    it('should support BioC format', async () => {
      mockFetchText('bioc format');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { format: 'BioC' });
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('type=BioC');
    });

    it('should support JSON format', async () => {
      mockFetchText('json format');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { format: 'JSON' });
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('type=JSON');
    });

    it('should filter by concept type', async () => {
      mockFetchText('gene annotations');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { concept: 'Gene' });
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('concepts=Gene');
    });

    it('should handle multiple PMIDs', async () => {
      mockFetchText('multi result');
      const client = new PubTator();
      await client.annotateByPmid(['12345', '67890']);
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toContain('pmids=12345%2C67890');
    });
  });

  describe('annotateText', () => {
    it('should annotate custom text', async () => {
      mockFetchText('annotated result');
      const client = new PubTator();
      const result = await client.annotateText('BRCA1 causes breast cancer');
      expect(result).toBe('annotated result');
    });

    it('should filter by concept type', async () => {
      mockFetchText('gene result');
      const client = new PubTator();
      await client.annotateText('BRCA1 protein', { concept: 'Gene' });
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('concepts=Gene'),
        expect.objectContaining({ method: 'POST' }),
      );
    });

    it('should return annotation results as string', async () => {
      mockFetchText('12345\t0\t5\tBRCA1\tGene\t672');
      const client = new PubTator();
      const result = await client.annotateText('BRCA1 causes disease');
      expect(typeof result).toBe('string');
    });

    it('should handle short text', async () => {
      mockFetchText('result');
      const client = new PubTator();
      const result = await client.annotateText('TP53');
      expect(result).toBe('result');
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/annotate/text/'),
        expect.objectContaining({
          method: 'POST',
          body: 'TP53',
        }),
      );
    });

    it('should handle long text', async () => {
      const longText = 'BRCA1 '.repeat(1000);
      mockFetchText('long result');
      const client = new PubTator();
      const result = await client.annotateText(longText);
      expect(result).toBe('long result');
      expect(fetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({ body: longText }),
      );
    });

    it('should throw on HTTP error', async () => {
      mockFetchError(400, 'Bad Request');
      const client = new PubTator();
      await expect(client.annotateText('test')).rejects.toThrow(
        'PubTator3 API returned status 400',
      );
    });

    it('should use base URL without query string when no options', async () => {
      mockFetchText('result');
      const client = new PubTator();
      await client.annotateText('BRCA1');
      const fetchUrl = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchUrl).toBe('https://www.ncbi.nlm.nih.gov/research/pubtator3-api/annotate/text/');
    });
  });
});
