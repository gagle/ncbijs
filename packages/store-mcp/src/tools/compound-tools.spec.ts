import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerCompoundTools } from './compound-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerCompoundTools', () => {
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
    registerCompoundTools(mockServer, getStorage);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('store-lookup-compound');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('store-search-compounds');
  });

  describe('store-lookup-compound', () => {
    it('returns a compound by CID', async () => {
      const compound = { cid: 2244, canonicalSmiles: 'CC(=O)OC1=CC=CC=C1C(O)=O' };
      mockStorage.getRecord.mockResolvedValue(compound);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ cid: '2244' });

      expect(mockStorage.getRecord).toHaveBeenCalledWith('compounds', '2244');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(compound, null, 2) }],
      });
    });

    it('returns not-found message for missing compound', async () => {
      mockStorage.getRecord.mockResolvedValue(undefined);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ cid: '0' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Compound CID "0" not found in store' }],
      });
    });
  });

  describe('store-search-compounds', () => {
    it('searches compounds by InChI key', async () => {
      const results = [{ cid: 2244, inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N' }];
      mockStorage.searchRecords.mockResolvedValue(results);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({
        field: 'inchiKey',
        value: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        operator: 'eq',
        limit: 20,
      });

      expect(mockStorage.searchRecords).toHaveBeenCalledWith('compounds', {
        field: 'inchiKey',
        value: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
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
        field: 'iupacName',
        value: 'nonexistent',
        operator: 'eq',
        limit: 20,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No compounds matching iupacName="nonexistent" in store' }],
      });
    });
  });
});
