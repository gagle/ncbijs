import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ICite } from '@ncbijs/icite';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerICiteTools } from './icite-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerICiteTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockICite: {
    publications: ReturnType<typeof vi.fn>;
    citedBy: ReturnType<typeof vi.fn>;
    references: ReturnType<typeof vi.fn>;
  };
  let getICite: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockICite = {
      publications: vi.fn(),
      citedBy: vi.fn(),
      references: vi.fn(),
    };
    getICite = vi.fn().mockReturnValue(mockICite);
    registerICiteTools(mockServer, getICite as unknown as () => ICite);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('citation-metrics');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('citation-graph');
  });

  describe('citation-metrics', () => {
    it('fetches publication metrics and returns JSON', async () => {
      const pubs = [{ pmid: 12345, relativeCitationRatio: 2.5 }];
      mockICite.publications.mockResolvedValue(pubs);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmids: [12345, 67890] });

      expect(getICite).toHaveBeenCalled();
      expect(mockICite.publications).toHaveBeenCalledWith([12345, 67890]);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(pubs, null, 2) }],
      });
    });
  });

  describe('citation-graph', () => {
    it('calls citedBy for cited-by direction', async () => {
      const citers = [{ pmid: 11111, title: 'Citing article' }];
      mockICite.citedBy.mockResolvedValue(citers);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: 12345, direction: 'cited-by' });

      expect(getICite).toHaveBeenCalled();
      expect(mockICite.citedBy).toHaveBeenCalledWith(12345);
      expect(mockICite.references).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(citers, null, 2) }],
      });
    });

    it('calls references for references direction', async () => {
      const refs = [{ pmid: 22222, title: 'Referenced article' }];
      mockICite.references.mockResolvedValue(refs);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: 12345, direction: 'references' });

      expect(getICite).toHaveBeenCalled();
      expect(mockICite.references).toHaveBeenCalledWith(12345);
      expect(mockICite.citedBy).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(refs, null, 2) }],
      });
    });
  });
});
