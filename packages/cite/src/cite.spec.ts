import { afterEach, describe, expect, it, vi } from 'vitest';
import { Cite } from './cite';

function mockFetchText(text: string, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      text: () => Promise.resolve(text),
    }),
  );
}

function mockFetchFailure(errorMessage: string): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(errorMessage)));
}

const SAMPLE_CSL = JSON.stringify({
  type: 'article-journal',
  id: '12345',
  title: 'Test Article',
  author: [{ family: 'Smith', given: 'John' }],
  issued: { 'date-parts': [[2024, 1, 15]] },
  'container-title': 'Nature',
  volume: '625',
  issue: '1',
  page: '100-105',
  DOI: '10.1038/test',
  PMID: '12345',
  PMCID: 'PMC9999',
  URL: 'https://example.com',
  abstract: 'Test abstract.',
});

describe('cite', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('format handling', () => {
    it('should fetch citation in RIS format', async () => {
      mockFetchText('TY  - JOUR\nAU  - Smith\nER  -\n');
      const client = new Cite();
      const result = await client.cite('12345', 'ris');
      expect(result).toContain('TY  - JOUR');
    });

    it('should fetch citation in MEDLINE format', async () => {
      mockFetchText('PMID- 12345\nOWN - NLM');
      const client = new Cite();
      const result = await client.cite('12345', 'medline');
      expect(result).toContain('PMID- 12345');
    });

    it('should fetch citation in citation format', async () => {
      const citationJson = JSON.stringify({
        id: '12345',
        ama: { orig: 'Smith J. Test.', format: 'ama' },
        apa: { orig: 'Smith, J. (2024).', format: 'apa' },
        mla: { orig: 'Smith, John.', format: 'mla' },
        nlm: { orig: 'Smith J. Test.', format: 'nlm' },
      });
      mockFetchText(citationJson);
      const client = new Cite();
      const result = await client.cite('12345', 'citation');
      expect(result.id).toBe('12345');
      expect(result.ama.orig).toBe('Smith J. Test.');
      expect(result.apa.orig).toBe('Smith, J. (2024).');
      expect(result.mla.orig).toBe('Smith, John.');
      expect(result.nlm.orig).toBe('Smith J. Test.');
    });

    it('should fetch citation in CSL format', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.type).toBe('article-journal');
      expect(result.title).toBe('Test Article');
    });
  });

  describe('CSL format response', () => {
    it('should return parsed CSLData object', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(typeof result).toBe('object');
    });

    it('should include type, id, title', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.type).toBe('article-journal');
      expect(result.id).toBe('12345');
      expect(result.title).toBe('Test Article');
    });

    it('should include author array with family and given', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.author).toHaveLength(1);
      expect(result.author[0]!.family).toBe('Smith');
      expect(result.author[0]!.given).toBe('John');
    });

    it('should include issued date-parts', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.issued['date-parts'][0]).toEqual([2024, 1, 15]);
    });

    it('should include optional container-title', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result['container-title']).toBe('Nature');
    });

    it('should include optional volume and issue', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.volume).toBe('625');
      expect(result.issue).toBe('1');
    });

    it('should include optional page', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.page).toBe('100-105');
    });

    it('should include optional DOI', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.DOI).toBe('10.1038/test');
    });

    it('should include optional PMID', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.PMID).toBe('12345');
    });

    it('should include optional PMCID', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.PMCID).toBe('PMC9999');
    });

    it('should include optional URL', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.URL).toBe('https://example.com');
    });

    it('should include optional abstract', async () => {
      mockFetchText(SAMPLE_CSL);
      const client = new Cite();
      const result = await client.cite('12345', 'csl');
      expect(result.abstract).toBe('Test abstract.');
    });
  });

  describe('non-CSL format response', () => {
    it('should return string for all non-CSL formats', async () => {
      mockFetchText('TY  - JOUR');
      const client = new Cite();
      const result = await client.cite('12345', 'ris');
      expect(typeof result).toBe('string');
    });

    it('should return raw formatted text', async () => {
      const rawText = 'PMID- 12345\nTI  - Test Title\n';
      mockFetchText(rawText);
      const client = new Cite();
      const result = await client.cite('12345', 'medline');
      expect(result).toBe(rawText);
    });
  });

  describe('source handling', () => {
    it('should default to pubmed source', async () => {
      mockFetchText('TY  - JOUR');
      const client = new Cite();
      await client.cite('12345', 'ris');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('/pubmed/');
    });

    it('should support pubmed source', async () => {
      mockFetchText('TY  - JOUR');
      const client = new Cite();
      await client.cite('12345', 'ris', 'pubmed');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('/pubmed/');
    });

    it('should support pmc source', async () => {
      mockFetchText('TY  - JOUR');
      const client = new Cite();
      await client.cite('PMC12345', 'ris', 'pmc');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('/pmc/');
    });

    it('should support books source', async () => {
      mockFetchText('TY  - BOOK');
      const client = new Cite();
      await client.cite('NBK12345', 'ris', 'books');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('/books/');
    });

    it('should construct correct URL for each source', async () => {
      mockFetchText('TY  - JOUR');
      const client = new Cite();
      await client.cite('12345', 'ris', 'pubmed');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      const url = new URL(fetchCall);
      expect(url.pathname).toContain('/pubmed/');
      expect(url.searchParams.get('format')).toBe('ris');
      expect(url.searchParams.get('id')).toBe('12345');
    });
  });

  describe('error handling', () => {
    it('should throw on invalid ID', async () => {
      const client = new Cite();
      await expect(client.cite('', 'ris')).rejects.toThrow('id must not be empty');
    });

    it('should throw on network error', async () => {
      mockFetchFailure('Failed to fetch');
      const client = new Cite();
      await expect(client.cite('12345', 'ris')).rejects.toThrow('Failed to fetch');
    });

    it('should throw on non-existent article', async () => {
      mockFetchText('Not found', 404);
      const client = new Cite();
      await expect(client.cite('99999999', 'ris')).rejects.toThrow('Article not found');
    });

    it('should throw on malformed CSL JSON response', async () => {
      mockFetchText('not valid json');
      const client = new Cite();
      await expect(client.cite('12345', 'csl')).rejects.toThrow('malformed JSON');
    });

    it('should throw on non-404 HTTP error status', async () => {
      mockFetchText('Server Error', 500);
      const client = new Cite();
      await expect(client.cite('12345', 'ris')).rejects.toThrow(
        'Citation Exporter API returned status 500',
      );
    });

    it('should throw on valid JSON missing required key for CSL format', async () => {
      mockFetchText(JSON.stringify({ irrelevant: 'data' }));
      const client = new Cite();
      await expect(client.cite('12345', 'csl')).rejects.toThrow('malformed JSON');
    });

    it('should throw on valid JSON missing required key for citation format', async () => {
      mockFetchText(JSON.stringify({ irrelevant: 'data' }));
      const client = new Cite();
      await expect(client.cite('12345', 'citation')).rejects.toThrow('malformed JSON');
    });
  });
});

describe('citeMany', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('should yield citation for each ID', async () => {
    mockFetchText('TY  - JOUR');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    const results: Array<{ id: string }> = [];
    for await (const result of client.citeMany(['111', '222'], 'ris')) {
      results.push(result);
    }
    expect(results).toHaveLength(2);
  });

  it('should include id and citation in each yielded value', async () => {
    mockFetchText('TY  - JOUR');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    const results: Array<{ id: string; citation: unknown }> = [];
    for await (const result of client.citeMany(['111'], 'ris')) {
      results.push(result);
    }
    expect(results[0]!.id).toBe('111');
    expect(results[0]!.citation).toBe('TY  - JOUR');
  });

  it('should return CSLData for csl format', async () => {
    mockFetchText(SAMPLE_CSL);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    const results: Array<{ citation: unknown }> = [];
    for await (const result of client.citeMany(['12345'], 'csl')) {
      results.push(result);
    }
    expect(typeof results[0]!.citation).toBe('object');
  });

  it('should return string for non-csl formats', async () => {
    mockFetchText('TY  - JOUR');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    const results: Array<{ citation: unknown }> = [];
    for await (const result of client.citeMany(['12345'], 'ris')) {
      results.push(result);
    }
    expect(typeof results[0]!.citation).toBe('string');
  });

  it('should respect rate limiting between requests', async () => {
    mockFetchText('TY  - JOUR');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    const start = Date.now();
    const results: Array<unknown> = [];
    for await (const result of client.citeMany(['111', '222', '333'], 'ris')) {
      results.push(result);
    }
    const elapsed = Date.now() - start;
    expect(elapsed).toBeGreaterThanOrEqual(600);
  });

  it('should handle single ID', async () => {
    mockFetchText('TY  - JOUR');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    const results: Array<unknown> = [];
    for await (const result of client.citeMany(['111'], 'ris')) {
      results.push(result);
    }
    expect(results).toHaveLength(1);
  });

  it('should handle empty IDs array', async () => {
    const client = new Cite();
    const results: Array<unknown> = [];
    for await (const result of client.citeMany([], 'ris')) {
      results.push(result);
    }
    expect(results).toHaveLength(0);
  });

  it('should propagate errors for individual IDs', async () => {
    mockFetchText('Not found', 404);
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    await expect(async () => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      for await (const _result of client.citeMany(['bad-id'], 'ris')) {
        // noop
      }
    }).rejects.toThrow('Article not found');
  });

  it('should support source option', async () => {
    mockFetchText('TY  - JOUR');
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const client = new Cite();
    const results: Array<unknown> = [];
    for await (const result of client.citeMany(['PMC12345'], 'ris', 'pmc')) {
      results.push(result);
    }
    const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
    expect(fetchCall).toContain('/pmc/');
    expect(results).toHaveLength(1);
  });
});
