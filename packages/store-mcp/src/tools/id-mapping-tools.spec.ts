import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerIdMappingTools } from './id-mapping-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerIdMappingTools', () => {
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
    registerIdMappingTools(mockServer, getStorage);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('store-convert-ids');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('store-search-ids');
  });

  describe('store-convert-ids', () => {
    it('returns an ID mapping', async () => {
      const mapping = { pmcid: 'PMC123', pmid: '456', doi: '10.1234/test' };
      mockStorage.getRecord.mockResolvedValue(mapping);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ id: '456' });

      expect(mockStorage.getRecord).toHaveBeenCalledWith('id-mappings', '456');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(mapping, null, 2) }],
      });
    });

    it('returns not-found message for missing ID', async () => {
      mockStorage.getRecord.mockResolvedValue(undefined);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ id: 'NOTFOUND' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No ID mapping found for "NOTFOUND" in store' }],
      });
    });
  });

  describe('store-search-ids', () => {
    it('searches ID mappings by PMID', async () => {
      const results = [{ pmcid: 'PMC123', pmid: '456' }];
      mockStorage.searchRecords.mockResolvedValue(results);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ field: 'pmid', value: '456', limit: 20 });

      expect(mockStorage.searchRecords).toHaveBeenCalledWith('id-mappings', {
        field: 'pmid',
        value: '456',
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
      const result = await handler({ field: 'doi', value: '10.0000/none', limit: 20 });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No ID mappings matching doi="10.0000/none" in store' }],
      });
    });
  });
});
