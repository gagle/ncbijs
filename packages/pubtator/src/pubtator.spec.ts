import { afterEach, describe, expect, it, vi } from 'vitest';

import { PubTator } from './pubtator';

function mockFetchJson(body: unknown): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve(body),
    }),
  );
}

function mockFetchText(body: string): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
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
      mockFetchJson([{ id: '672', name: 'BRCA1', type: 'gene', score: 0.95 }]);
      const client = new PubTator();
      const result = await client.findEntity('BRCA1');
      expect(result).toHaveLength(1);
      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/entity/autocomplete/?query=BRCA1'),
      );
    });

    it('should return EntityMatch array with id, name, type, score', async () => {
      mockFetchJson([{ id: '672', name: 'BRCA1', type: 'gene', score: 0.95 }]);
      const client = new PubTator();
      const result = await client.findEntity('BRCA1');
      expect(result[0]).toEqual({
        id: '672',
        name: 'BRCA1',
        type: 'gene',
        score: 0.95,
      });
    });

    it('should filter by entityType when provided', async () => {
      mockFetchJson([]);
      const client = new PubTator();
      await client.findEntity('BRCA1', 'gene');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=gene'));
    });

    it('should handle empty results', async () => {
      mockFetchJson([]);
      const client = new PubTator();
      const result = await client.findEntity('nonexistent');
      expect(result).toEqual([]);
    });

    it('should search for gene entities', async () => {
      mockFetchJson([{ id: '672', name: 'BRCA1', type: 'gene', score: 0.9 }]);
      const client = new PubTator();
      await client.findEntity('BRCA1', 'gene');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=gene'));
    });

    it('should search for disease entities', async () => {
      mockFetchJson([{ id: 'MESH:D001943', name: 'breast cancer', type: 'disease', score: 0.9 }]);
      const client = new PubTator();
      await client.findEntity('breast cancer', 'disease');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=disease'));
    });

    it('should search for chemical entities', async () => {
      mockFetchJson([{ id: 'MESH:D001241', name: 'aspirin', type: 'chemical', score: 0.9 }]);
      const client = new PubTator();
      await client.findEntity('aspirin', 'chemical');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=chemical'));
    });

    it('should search for variant entities', async () => {
      mockFetchJson([{ id: 'tmVar:p.V600E', name: 'V600E', type: 'variant', score: 0.9 }]);
      const client = new PubTator();
      await client.findEntity('V600E', 'variant');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=variant'));
    });

    it('should search for species entities', async () => {
      mockFetchJson([{ id: '9606', name: 'human', type: 'species', score: 0.9 }]);
      const client = new PubTator();
      await client.findEntity('human', 'species');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=species'));
    });

    it('should search for cell_line entities', async () => {
      mockFetchJson([{ id: 'CVCL:0030', name: 'HeLa', type: 'cell_line', score: 0.9 }]);
      const client = new PubTator();
      await client.findEntity('HeLa', 'cell_line');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=cell_line'));
    });

    it('should throw on HTTP error', async () => {
      mockFetchError(500, 'Internal Server Error');
      const client = new PubTator();
      await expect(client.findEntity('BRCA1')).rejects.toThrow(
        'PubTator3 entity search failed: HTTP 500: Internal Server Error',
      );
    });
  });

  describe('findRelations', () => {
    const RELATION_RESPONSE = [
      {
        id: 'MESH:D001943',
        name: 'Breast Neoplasms',
        type: 'disease',
        relation_type: 'associate',
        pmids: ['12345', '67890'],
        score: 0.85,
      },
    ];

    it('should find relations for entity ID', async () => {
      mockFetchJson(RELATION_RESPONSE);
      const client = new PubTator();
      const result = await client.findRelations('672', 'disease', 'associate');
      expect(result).toHaveLength(1);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('e1=672'));
    });

    it('should return RelatedEntity array', async () => {
      mockFetchJson(RELATION_RESPONSE);
      const client = new PubTator();
      const result = await client.findRelations('672', 'disease', 'associate');
      expect(result[0]).toEqual({
        id: 'MESH:D001943',
        name: 'Breast Neoplasms',
        type: 'disease',
        relationType: 'associate',
        pmids: ['12345', '67890'],
        score: 0.85,
      });
    });

    it('should filter by target entity type', async () => {
      mockFetchJson([]);
      const client = new PubTator();
      await client.findRelations('672', 'chemical', 'treat');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=chemical'));
    });

    it('should filter by relation type', async () => {
      mockFetchJson([]);
      const client = new PubTator();
      await client.findRelations('672', 'disease', 'cause');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('relation=cause'));
    });

    it('should return PMIDs for each relation', async () => {
      mockFetchJson(RELATION_RESPONSE);
      const client = new PubTator();
      const result = await client.findRelations('672', 'disease', 'associate');
      expect(result[0]?.pmids).toEqual(['12345', '67890']);
    });

    it('should return score for each relation', async () => {
      mockFetchJson(RELATION_RESPONSE);
      const client = new PubTator();
      const result = await client.findRelations('672', 'disease', 'associate');
      expect(result[0]?.score).toBe(0.85);
    });

    it('should handle all 13 relation types', async () => {
      mockFetchJson([
        { id: '1', name: 'R1', type: 'disease', relation_type: 'treat', pmids: [], score: 0.1 },
      ]);
      const client = new PubTator();
      const result = await client.findRelations('672', 'disease', 'treat');
      expect(result[0]?.relationType).toBe('treat');
    });

    it('should handle empty results', async () => {
      mockFetchJson([]);
      const client = new PubTator();
      const result = await client.findRelations('672', 'disease', 'associate');
      expect(result).toEqual([]);
    });
  });

  describe('search', () => {
    const SEARCH_RESPONSE = {
      total: 42,
      page: 1,
      pagesize: 10,
      results: [
        {
          pmid: '12345',
          title: 'BRCA1 and Cancer',
          journal: 'Nature',
          year: 2023,
          authors: ['Smith J', 'Doe A'],
        },
      ],
    };

    it('should search PubTator3 by query', async () => {
      mockFetchJson(SEARCH_RESPONSE);
      const client = new PubTator();
      await client.search('BRCA1');
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('text=BRCA1'));
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
      mockFetchJson({ ...SEARCH_RESPONSE, page: 3 });
      const client = new PubTator();
      await client.search('BRCA1', { page: 3 });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('page=3'));
    });

    it('should support pageSize option', async () => {
      mockFetchJson({ ...SEARCH_RESPONSE, pagesize: 25 });
      const client = new PubTator();
      await client.search('BRCA1', { pageSize: 25 });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pagesize=25'));
    });

    it('should handle empty results', async () => {
      mockFetchJson({ total: 0, page: 1, pagesize: 10, results: [] });
      const client = new PubTator();
      const result = await client.search('nonexistent');
      expect(result.total).toBe(0);
      expect(result.results).toEqual([]);
    });
  });

  describe('export', () => {
    it('should export annotations for PMIDs', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345']);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pmids=12345'));
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
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/export/biocjson'));
    });

    it('should support xml format', async () => {
      mockFetchText(BIOC_XML);
      const client = new PubTator();
      await client.export(['12345'], { format: 'xml' });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/export/biocxml'));
    });

    it('should support full text when full is true', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345'], { full: true });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('full=true'));
    });

    it('should export abstract only when full is false', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345'], { full: false });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('full=false'));
    });

    it('should handle multiple PMIDs', async () => {
      mockFetchText(BIOC_JSON);
      const client = new PubTator();
      await client.export(['12345', '67890']);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pmids=12345%2C67890'));
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
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pmids=12345'));
    });

    it('should support PubTator format', async () => {
      mockFetchText('pubtator format');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { format: 'PubTator' });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=PubTator'));
    });

    it('should support BioC format', async () => {
      mockFetchText('bioc format');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { format: 'BioC' });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=BioC'));
    });

    it('should support JSON format', async () => {
      mockFetchText('json format');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { format: 'JSON' });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('type=JSON'));
    });

    it('should filter by concept type', async () => {
      mockFetchText('gene annotations');
      const client = new PubTator();
      await client.annotateByPmid(['12345'], { concept: 'Gene' });
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('concepts=Gene'));
    });

    it('should handle multiple PMIDs', async () => {
      mockFetchText('multi result');
      const client = new PubTator();
      await client.annotateByPmid(['12345', '67890']);
      expect(fetch).toHaveBeenCalledWith(expect.stringContaining('pmids=12345%2C67890'));
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
      mockFetchError(429, 'Rate limit exceeded');
      const client = new PubTator();
      await expect(client.annotateText('test')).rejects.toThrow(
        'PubTator3 text annotation failed: HTTP 429: Rate limit exceeded',
      );
    });
  });

  describe('bioc', () => {
    describe('pmc', () => {
      it('should fetch BioC annotations for PMC article', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        const result = await client.bioc.pmc('PMC123456');
        expect(result.documents).toHaveLength(1);
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/publications/pmc/PMC123456/biocjson'),
        );
      });

      it('should support xml format', async () => {
        mockFetchText(BIOC_XML);
        const client = new PubTator();
        await client.bioc.pmc('PMC123456', { format: 'xml' });
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/publications/pmc/PMC123456/biocxml'),
        );
      });

      it('should support json format', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        await client.bioc.pmc('PMC123456', { format: 'json' });
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/publications/pmc/PMC123456/biocjson'),
        );
      });

      it('should support unicode encoding', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        await client.bioc.pmc('PMC123456', { encoding: 'unicode' });
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('encoding=unicode'));
      });

      it('should support ascii encoding', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        await client.bioc.pmc('PMC123456', { encoding: 'ascii' });
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('encoding=ascii'));
      });

      it('should return BioDocument with passages and annotations', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        const result = await client.bioc.pmc('PMC123456');
        const passage = result.documents[0]?.passages[0];
        expect(passage?.type).toBe('title');
        expect(passage?.annotations[0]?.text).toBe('BRCA1');
      });

      it('should handle supplementary materials with _supp suffix', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        await client.bioc.pmc('PMC123456_supp');
        expect(fetch).toHaveBeenCalledWith(
          expect.stringContaining('/publications/pmc/PMC123456_supp/biocjson'),
        );
      });
    });

    describe('pubmed', () => {
      it('should fetch BioC annotations for PubMed article', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        const result = await client.bioc.pubmed('12345');
        expect(result.documents).toHaveLength(1);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/publications/12345/biocjson'));
      });

      it('should support xml format', async () => {
        mockFetchText(BIOC_XML);
        const client = new PubTator();
        await client.bioc.pubmed('12345', { format: 'xml' });
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/publications/12345/biocxml'));
      });

      it('should support json format', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        await client.bioc.pubmed('12345', { format: 'json' });
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/publications/12345/biocjson'));
      });

      it('should return BioDocument with passages and annotations', async () => {
        mockFetchText(BIOC_JSON);
        const client = new PubTator();
        const result = await client.bioc.pubmed('12345');
        expect(result.documents[0]?.id).toBe('12345');
        expect(result.documents[0]?.passages[0]?.annotations[0]?.type).toBe('Gene');
      });
    });
  });
});
