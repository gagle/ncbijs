import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockFindEntity, mockAnnotateText, mockExport } = vi.hoisted(() => ({
  mockFindEntity: vi.fn(),
  mockAnnotateText: vi.fn(),
  mockExport: vi.fn(),
}));

vi.mock('@ncbijs/pubtator', () => {
  const PubTator = function PubTator(this: Record<string, unknown>) {
    this['findEntity'] = mockFindEntity;
    this['annotateText'] = mockAnnotateText;
    this['export'] = mockExport;
  } as unknown;
  return { PubTator };
});

import { registerPubtatorTools } from './pubtator-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerPubtatorTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockServer = createMockServer();
    registerPubtatorTools(mockServer);
  });

  it('registers three tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('find-entity');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('annotate-text');
    expect(mockServer.registerTool.mock.calls[2]![0]).toBe('export-annotations');
  });

  describe('find-entity', () => {
    it('searches entities without entity type filter', async () => {
      const matches = [{ id: 'MESH:D009369', name: 'Neoplasms' }];
      mockFindEntity.mockResolvedValue(matches);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ query: 'cancer', entityType: undefined });

      expect(mockFindEntity).toHaveBeenCalledWith('cancer', undefined);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }],
      });
    });

    it('searches entities with entity type filter', async () => {
      const matches = [{ id: '672', name: 'BRCA1' }];
      mockFindEntity.mockResolvedValue(matches);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ query: 'BRCA1', entityType: 'gene' });

      expect(mockFindEntity).toHaveBeenCalledWith('BRCA1', 'gene');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(matches, null, 2) }],
      });
    });
  });

  describe('annotate-text', () => {
    it('annotates text without concept filter', async () => {
      const annotated = 'annotated bioc text';
      mockAnnotateText.mockResolvedValue(annotated);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        text: 'BRCA1 is associated with breast cancer',
        concept: undefined,
      });

      expect(mockAnnotateText).toHaveBeenCalledWith(
        'BRCA1 is associated with breast cancer',
        undefined,
      );
      expect(result).toEqual({
        content: [{ type: 'text', text: 'annotated bioc text' }],
      });
    });

    it('annotates text with concept filter', async () => {
      const annotated = 'filtered annotations';
      mockAnnotateText.mockResolvedValue(annotated);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        text: 'TP53 mutations in cancer',
        concept: 'Gene',
      });

      expect(mockAnnotateText).toHaveBeenCalledWith('TP53 mutations in cancer', {
        concept: 'Gene',
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: 'filtered annotations' }],
      });
    });
  });

  describe('export-annotations', () => {
    it('exports annotations for given PMIDs', async () => {
      const bioc = { documents: [{ pmid: '12345' }] };
      mockExport.mockResolvedValue(bioc);

      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmids: ['12345', '67890'] });

      expect(mockExport).toHaveBeenCalledWith(['12345', '67890']);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(bioc, null, 2) }],
      });
    });
  });
});
