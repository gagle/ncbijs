import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ReadableStorage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerStatsTools } from './stats-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerStatsTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockStorage: {
    getStats: ReturnType<typeof vi.fn>;
  };
  let getStorage: () => ReadableStorage;

  beforeEach(() => {
    mockServer = createMockServer();
    mockStorage = {
      getStats: vi.fn(),
    };
    getStorage = vi.fn().mockReturnValue(mockStorage) as unknown as () => ReadableStorage;
    registerStatsTools(mockServer, getStorage);
  });

  it('registers one tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('store-stats');
  });

  describe('store-stats', () => {
    it('returns storage statistics', async () => {
      const stats = [
        { dataset: 'mesh', recordCount: 30000, sizeBytes: 0 },
        { dataset: 'genes', recordCount: 35000000, sizeBytes: 0 },
      ];
      mockStorage.getStats.mockResolvedValue(stats);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({});

      expect(mockStorage.getStats).toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(stats, null, 2) }],
      });
    });
  });
});
