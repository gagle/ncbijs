import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerGeneTools } from './gene-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerGeneTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockStorage: {
    getRecord: ReturnType<typeof vi.fn>;
    searchRecords: ReturnType<typeof vi.fn>;
  };
  let getStorage: () => ReadableStorage;

  beforeEach(() => {
    mockServer = createMockServer();
    mockStorage = {
      getRecord: vi.fn(),
      searchRecords: vi.fn(),
    };
    getStorage = vi.fn().mockReturnValue(mockStorage) as unknown as () => ReadableStorage;
    registerGeneTools(mockServer, getStorage);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('store-lookup-gene');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('store-search-genes');
  });

  describe('store-lookup-gene', () => {
    it('returns a gene by ID', async () => {
      const gene = { geneId: 672, symbol: 'BRCA1' };
      mockStorage.getRecord.mockResolvedValue(gene);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ geneId: '672' });

      expect(mockStorage.getRecord).toHaveBeenCalledWith('genes', '672');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(gene, null, 2) }],
      });
    });

    it('returns not-found message for missing gene', async () => {
      mockStorage.getRecord.mockResolvedValue(undefined);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ geneId: '0' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Gene "0" not found in store' }],
      });
    });
  });

  describe('store-search-genes', () => {
    it('searches genes by symbol', async () => {
      const results = [{ geneId: 7157, symbol: 'TP53' }];
      mockStorage.searchRecords.mockResolvedValue(results);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({
        field: 'symbol',
        value: 'TP53',
        operator: 'eq',
        limit: 20,
      });

      expect(mockStorage.searchRecords).toHaveBeenCalledWith('genes', {
        field: 'symbol',
        value: 'TP53',
        operator: 'eq',
        limit: 20,
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      });
    });

    it('returns no-results message for empty search', async () => {
      mockStorage.searchRecords.mockResolvedValue([]);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({
        field: 'symbol',
        value: 'NONEXISTENT',
        operator: 'eq',
        limit: 20,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No genes matching symbol="NONEXISTENT" in store' }],
      });
    });
  });
});
