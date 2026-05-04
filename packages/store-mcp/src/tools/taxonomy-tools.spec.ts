import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerTaxonomyTools } from './taxonomy-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerTaxonomyTools', () => {
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
    registerTaxonomyTools(mockServer, getStorage);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('store-lookup-taxonomy');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('store-search-taxonomy');
  });

  describe('store-lookup-taxonomy', () => {
    it('returns a taxonomy node by tax ID', async () => {
      const taxon = { taxId: 9606, organismName: 'Homo sapiens', rank: 'species' };
      mockStorage.getRecord.mockResolvedValue(taxon);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ taxId: '9606' });

      expect(mockStorage.getRecord).toHaveBeenCalledWith('taxonomy', '9606');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(taxon, null, 2) }],
      });
    });

    it('returns not-found message for missing taxon', async () => {
      mockStorage.getRecord.mockResolvedValue(undefined);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ taxId: '0' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Taxonomy node "0" not found in store' }],
      });
    });
  });

  describe('store-search-taxonomy', () => {
    it('searches taxonomy by organism name', async () => {
      const results = [{ taxId: 9606, organismName: 'Homo sapiens' }];
      mockStorage.searchRecords.mockResolvedValue(results);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({
        field: 'organismName',
        value: 'Homo sapiens',
        operator: 'eq',
        limit: 20,
      });

      expect(mockStorage.searchRecords).toHaveBeenCalledWith('taxonomy', {
        field: 'organismName',
        value: 'Homo sapiens',
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
        field: 'organismName',
        value: 'Nonexistent',
        operator: 'eq',
        limit: 20,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No taxonomy nodes matching organismName="Nonexistent" in store',
          },
        ],
      });
    });
  });
});
