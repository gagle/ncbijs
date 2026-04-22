import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { PubMed } from '@ncbijs/pubmed';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerPubmedTools } from './pubmed-tools';

interface MockBuilder {
  sort: ReturnType<typeof vi.fn>;
  limit: ReturnType<typeof vi.fn>;
  dateRange: ReturnType<typeof vi.fn>;
  fetchAll: ReturnType<typeof vi.fn>;
}

function createMockBuilder(articles: ReadonlyArray<unknown> = []): MockBuilder {
  const builder: MockBuilder = {
    sort: vi.fn(),
    limit: vi.fn(),
    dateRange: vi.fn(),
    fetchAll: vi.fn().mockResolvedValue(articles),
  };
  builder.sort.mockReturnValue(builder);
  builder.limit.mockReturnValue(builder);
  builder.dateRange.mockReturnValue(builder);
  return builder;
}

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerPubmedTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPubmed: {
    search: ReturnType<typeof vi.fn>;
    related: ReturnType<typeof vi.fn>;
    references: ReturnType<typeof vi.fn>;
    citedBy: ReturnType<typeof vi.fn>;
  };
  let getPubmed: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPubmed = {
      search: vi.fn(),
      related: vi.fn(),
      references: vi.fn(),
      citedBy: vi.fn(),
    };
    getPubmed = vi.fn().mockReturnValue(mockPubmed);
    registerPubmedTools(mockServer, getPubmed as unknown as () => PubMed);
  });

  it('registers four tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(4);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('search-pubmed');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('search-related');
    expect(mockServer.registerTool.mock.calls[2]![0]).toBe('get-references');
    expect(mockServer.registerTool.mock.calls[3]![0]).toBe('get-cited-by');
  });

  describe('search-pubmed', () => {
    it('searches with default parameters and returns JSON articles', async () => {
      const articles = [{ pmid: '12345', title: 'Test Article' }];
      const builder = createMockBuilder(articles);
      mockPubmed.search.mockReturnValue(builder);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        query: 'cancer',
        maxResults: 10,
        sort: 'relevance',
        dateFrom: undefined,
        dateTo: undefined,
      });

      expect(getPubmed).toHaveBeenCalled();
      expect(mockPubmed.search).toHaveBeenCalledWith('cancer');
      expect(builder.sort).toHaveBeenCalledWith('relevance');
      expect(builder.limit).toHaveBeenCalledWith(10);
      expect(builder.dateRange).not.toHaveBeenCalled();
      expect(builder.fetchAll).toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(articles, null, 2) }],
      });
    });

    it('applies date range when both dateFrom and dateTo are provided', async () => {
      const builder = createMockBuilder([]);
      mockPubmed.search.mockReturnValue(builder);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        query: 'BRCA1',
        maxResults: 5,
        sort: 'pub_date',
        dateFrom: '2020/01/01',
        dateTo: '2023/12/31',
      });

      expect(builder.dateRange).toHaveBeenCalledWith('2020/01/01', '2023/12/31');
    });

    it('does not apply date range when only dateFrom is provided', async () => {
      const builder = createMockBuilder([]);
      mockPubmed.search.mockReturnValue(builder);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        query: 'BRCA1',
        maxResults: 5,
        sort: 'relevance',
        dateFrom: '2020/01/01',
        dateTo: undefined,
      });

      expect(builder.dateRange).not.toHaveBeenCalled();
    });

    it('does not apply date range when only dateTo is provided', async () => {
      const builder = createMockBuilder([]);
      mockPubmed.search.mockReturnValue(builder);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        query: 'BRCA1',
        maxResults: 5,
        sort: 'relevance',
        dateFrom: undefined,
        dateTo: '2023/12/31',
      });

      expect(builder.dateRange).not.toHaveBeenCalled();
    });
  });

  describe('search-related', () => {
    it('returns related articles as JSON', async () => {
      const related = [{ pmid: '67890', score: 95 }];
      mockPubmed.related.mockResolvedValue(related);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: '12345' });

      expect(mockPubmed.related).toHaveBeenCalledWith('12345');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(related, null, 2) }],
      });
    });
  });

  describe('get-references', () => {
    it('returns references as JSON', async () => {
      const references = [{ pmid: '11111' }];
      mockPubmed.references.mockResolvedValue(references);

      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: '12345' });

      expect(mockPubmed.references).toHaveBeenCalledWith('12345');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(references, null, 2) }],
      });
    });
  });

  describe('get-cited-by', () => {
    it('returns citing articles as JSON', async () => {
      const citingArticles = [{ pmid: '22222' }];
      mockPubmed.citedBy.mockResolvedValue(citingArticles);

      const handler = mockServer.registerTool.mock.calls[3]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: '12345' });

      expect(mockPubmed.citedBy).toHaveBeenCalledWith('12345');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(citingArticles, null, 2) }],
      });
    });
  });
});
