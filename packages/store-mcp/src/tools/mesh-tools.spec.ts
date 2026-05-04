import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerMeshTools } from './mesh-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerMeshTools', () => {
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
    registerMeshTools(mockServer, getStorage);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('store-lookup-mesh');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('store-search-mesh');
  });

  describe('store-lookup-mesh', () => {
    it('returns a MeSH descriptor by ID', async () => {
      const descriptor = { id: 'D000001', name: 'Calcimycin' };
      mockStorage.getRecord.mockResolvedValue(descriptor);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ id: 'D000001' });

      expect(mockStorage.getRecord).toHaveBeenCalledWith('mesh', 'D000001');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(descriptor, null, 2) }],
      });
    });

    it('returns not-found message for missing descriptor', async () => {
      mockStorage.getRecord.mockResolvedValue(undefined);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ id: 'D999999' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'MeSH descriptor "D999999" not found in store' }],
      });
    });
  });

  describe('store-search-mesh', () => {
    it('searches MeSH descriptors by name', async () => {
      const results = [{ id: 'D001241', name: 'Aspirin' }];
      mockStorage.searchRecords.mockResolvedValue(results);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ name: 'Aspirin', operator: 'starts_with', limit: 20 });

      expect(mockStorage.searchRecords).toHaveBeenCalledWith('mesh', {
        field: 'name',
        value: 'Aspirin',
        operator: 'starts_with',
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
      const result = await handler({ name: 'Nonexistent', operator: 'eq', limit: 20 });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'No MeSH descriptors matching "Nonexistent" in store' }],
      });
    });
  });
});
