import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Blast } from '@ncbijs/blast';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerBlastTools } from './blast-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerBlastTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockBlast: { search: ReturnType<typeof vi.fn> };
  let getBlast: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockBlast = { search: vi.fn() };
    getBlast = vi.fn().mockReturnValue(mockBlast);
    registerBlastTools(mockServer, getBlast as unknown as () => Blast);
  });

  it('registers one tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('blast-search');
  });

  describe('blast-search', () => {
    it('runs a BLAST search with required parameters only', async () => {
      const blastResult = { hits: [{ accession: 'NM_007294.4' }] };
      mockBlast.search.mockResolvedValue(blastResult);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        query: '>seq\nATCGATCG',
        program: 'blastn',
        database: 'nt',
        expect: undefined,
        hitlistSize: undefined,
      });

      expect(getBlast).toHaveBeenCalled();
      expect(mockBlast.search).toHaveBeenCalledWith('>seq\nATCGATCG', 'blastn', 'nt', {});
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(blastResult, null, 2) }],
      });
    });

    it('passes expect option when provided', async () => {
      mockBlast.search.mockResolvedValue({ hits: [] });

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        query: '>seq\nATCG',
        program: 'blastp',
        database: 'nr',
        expect: 0.001,
        hitlistSize: undefined,
      });

      expect(mockBlast.search).toHaveBeenCalledWith('>seq\nATCG', 'blastp', 'nr', {
        expect: 0.001,
      });
    });

    it('passes hitlistSize option when provided', async () => {
      mockBlast.search.mockResolvedValue({ hits: [] });

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        query: '>seq\nATCG',
        program: 'blastx',
        database: 'swissprot',
        expect: undefined,
        hitlistSize: 100,
      });

      expect(mockBlast.search).toHaveBeenCalledWith('>seq\nATCG', 'blastx', 'swissprot', {
        hitlistSize: 100,
      });
    });

    it('passes both expect and hitlistSize when provided', async () => {
      mockBlast.search.mockResolvedValue({ hits: [] });

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        query: '>seq\nATCG',
        program: 'tblastn',
        database: 'nt',
        expect: 1e-10,
        hitlistSize: 25,
      });

      expect(mockBlast.search).toHaveBeenCalledWith('>seq\nATCG', 'tblastn', 'nt', {
        expect: 1e-10,
        hitlistSize: 25,
      });
    });
  });
});
