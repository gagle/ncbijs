import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { RxNorm } from '@ncbijs/rxnorm';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerRxNormTools } from './rxnorm-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerRxNormTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockRxNorm: {
    approximateTerm: ReturnType<typeof vi.fn>;
  };
  let getRxNorm: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockRxNorm = {
      approximateTerm: vi.fn(),
    };
    getRxNorm = vi.fn().mockReturnValue(mockRxNorm);
    registerRxNormTools(mockServer, getRxNorm as unknown as () => RxNorm);
  });

  it('registers one tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('drug-lookup');
  });

  describe('drug-lookup', () => {
    it('looks up a drug by name and returns candidates', async () => {
      const candidates = [{ rxcui: '161', name: 'Aspirin', score: 100, rank: 1 }];
      mockRxNorm.approximateTerm.mockResolvedValue(candidates);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ name: 'aspirin', maxResults: 10 });

      expect(getRxNorm).toHaveBeenCalled();
      expect(mockRxNorm.approximateTerm).toHaveBeenCalledWith('aspirin', { maxEntries: 10 });
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(candidates, null, 2) }],
      });
    });
  });
});
