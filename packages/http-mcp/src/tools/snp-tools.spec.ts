import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Snp } from '@ncbijs/snp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerSnpTools } from './snp-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerSnpTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockSnp: { refsnpBatch: ReturnType<typeof vi.fn> };
  let getSnp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockSnp = { refsnpBatch: vi.fn() };
    getSnp = vi.fn().mockReturnValue(mockSnp);
    registerSnpTools(mockServer, getSnp as unknown as () => Snp);
  });

  it('registers one tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('lookup-variant');
  });

  describe('lookup-variant', () => {
    it('looks up SNP variants by RS IDs', async () => {
      const reports = [{ rsId: 7412, alleles: ['C', 'T'] }];
      mockSnp.refsnpBatch.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ rsIds: [7412, 429358] });

      expect(getSnp).toHaveBeenCalled();
      expect(mockSnp.refsnpBatch).toHaveBeenCalledWith([7412, 429358]);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      });
    });
  });
});
