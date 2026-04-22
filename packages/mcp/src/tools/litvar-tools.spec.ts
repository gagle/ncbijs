import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockVariant, mockPublications } = vi.hoisted(() => ({
  mockVariant: vi.fn(),
  mockPublications: vi.fn(),
}));

vi.mock('@ncbijs/litvar', () => ({
  variant: mockVariant,
  publications: mockPublications,
}));

import { registerLitVarTools } from './litvar-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerLitVarTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockServer = createMockServer();
    registerLitVarTools(mockServer);
  });

  it('registers one tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('search-litvar');
  });

  describe('search-litvar', () => {
    it('calls variant and publications with the rsid', async () => {
      const variantInfo = { rsid: 'rs328', gene: 'LPL', hgvs: ['NM_000237.3:c.1421C>G'] };
      const pubs = [{ pmid: 12345, title: 'LPL variant study' }];
      mockVariant.mockResolvedValue(variantInfo);
      mockPublications.mockResolvedValue(pubs);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ rsid: 'rs328' });

      expect(mockVariant).toHaveBeenCalledWith('rs328');
      expect(mockPublications).toHaveBeenCalledWith('rs328');
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: JSON.stringify({ variant: variantInfo, publications: pubs }, null, 2),
          },
        ],
      });
    });
  });
});
