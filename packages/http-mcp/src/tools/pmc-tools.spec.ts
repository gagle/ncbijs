import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { PMC } from '@ncbijs/pmc';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@ncbijs/pmc', () => ({
  pmcToMarkdown: vi.fn(),
  pmcToChunks: vi.fn(),
}));

import { pmcToChunks, pmcToMarkdown } from '@ncbijs/pmc';

import { registerPmcTools } from './pmc-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerPmcTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPmc: { fetch: ReturnType<typeof vi.fn> };
  let getPmc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPmc = { fetch: vi.fn() };
    getPmc = vi.fn().mockReturnValue(mockPmc);
    registerPmcTools(mockServer, getPmc as unknown as () => PMC);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('get-full-text');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('get-full-text-chunks');
  });

  describe('get-full-text', () => {
    it('fetches article and returns markdown with license', async () => {
      const article = { license: 'CC-BY-4.0', body: 'article content' };
      mockPmc.fetch.mockResolvedValue(article);
      vi.mocked(pmcToMarkdown).mockReturnValue('# Heading\n\nBody text');

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmcid: 'PMC7886120' });

      expect(getPmc).toHaveBeenCalled();
      expect(mockPmc.fetch).toHaveBeenCalledWith('PMC7886120');
      expect(pmcToMarkdown).toHaveBeenCalledWith(article);
      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: '# PMC7886120\nLicense: CC-BY-4.0\n\n# Heading\n\nBody text',
          },
        ],
      });
    });

    it('shows "Not specified" when license is falsy', async () => {
      const article = { license: '', body: 'content' };
      mockPmc.fetch.mockResolvedValue(article);
      vi.mocked(pmcToMarkdown).mockReturnValue('content');

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmcid: 'PMC123' });

      expect(result).toEqual({
        content: [{ type: 'text', text: '# PMC123\nLicense: Not specified\n\ncontent' }],
      });
    });
  });

  describe('get-full-text-chunks', () => {
    it('fetches article and returns chunks as JSON', async () => {
      const article = { body: 'article content' };
      const chunks = [{ section: 'Introduction', text: 'intro text', tokenCount: 3, metadata: {} }];
      mockPmc.fetch.mockResolvedValue(article);
      vi.mocked(pmcToChunks).mockReturnValue(chunks);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmcid: 'PMC7886120', maxTokens: 256 });

      expect(mockPmc.fetch).toHaveBeenCalledWith('PMC7886120');
      expect(pmcToChunks).toHaveBeenCalledWith(article, { maxTokens: 256 });
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(chunks, null, 2) }],
      });
    });
  });
});
