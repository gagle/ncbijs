import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { PubChem } from '@ncbijs/pubchem';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerPubChemTools } from './pubchem-tools';

interface ToolResult {
  readonly content: ReadonlyArray<{ readonly type: string; readonly text: string }>;
  readonly isError?: boolean;
}

type ToolHandler = (...args: ReadonlyArray<unknown>) => Promise<ToolResult>;

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerPubChemTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockPubChem: {
    compoundByCid: ReturnType<typeof vi.fn>;
    compoundByName: ReturnType<typeof vi.fn>;
    synonyms: ReturnType<typeof vi.fn>;
    description: ReturnType<typeof vi.fn>;
  };
  let getPubChem: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockPubChem = {
      compoundByCid: vi.fn(),
      compoundByName: vi.fn(),
      synonyms: vi.fn(),
      description: vi.fn(),
    };
    getPubChem = vi.fn().mockReturnValue(mockPubChem);
    registerPubChemTools(mockServer, getPubChem as unknown as () => PubChem);
  });

  it('registers one tool', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(1);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('search-compound');
  });

  describe('search-compound', () => {
    it('searches by CID with parallel data fetching', async () => {
      const properties = { cid: 2244, molecularFormula: 'C9H8O4' };
      const synonyms = { synonyms: ['aspirin', 'acetylsalicylic acid', ...Array(25).fill('syn')] };
      const description = { description: 'A salicylate drug' };
      mockPubChem.compoundByCid.mockResolvedValue(properties);
      mockPubChem.synonyms.mockResolvedValue(synonyms);
      mockPubChem.description.mockResolvedValue(description);

      const handler = mockServer.registerTool.mock.calls[0]![2] as ToolHandler;
      const result = await handler({ name: undefined, cid: 2244 });

      expect(getPubChem).toHaveBeenCalled();
      expect(mockPubChem.compoundByCid).toHaveBeenCalledWith(2244);
      expect(mockPubChem.synonyms).toHaveBeenCalledWith(2244);
      expect(mockPubChem.description).toHaveBeenCalledWith(2244);
      expect(mockPubChem.compoundByName).not.toHaveBeenCalled();

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.properties).toEqual(properties);
      expect(parsed.synonyms).toHaveLength(20);
      expect(parsed.description).toBe('A salicylate drug');
    });

    it('searches by name then fetches synonyms and description', async () => {
      const properties = { cid: 2519, molecularFormula: 'C8H10N4O2' };
      const synonyms = { synonyms: ['caffeine', '58-08-2'] };
      const description = { description: 'A methylxanthine alkaloid' };
      mockPubChem.compoundByName.mockResolvedValue(properties);
      mockPubChem.synonyms.mockResolvedValue(synonyms);
      mockPubChem.description.mockResolvedValue(description);

      const handler = mockServer.registerTool.mock.calls[0]![2] as ToolHandler;
      const result = await handler({ name: 'caffeine', cid: undefined });

      expect(mockPubChem.compoundByName).toHaveBeenCalledWith('caffeine');
      expect(mockPubChem.synonyms).toHaveBeenCalledWith(2519);
      expect(mockPubChem.description).toHaveBeenCalledWith(2519);
      expect(mockPubChem.compoundByCid).not.toHaveBeenCalled();

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.properties).toEqual(properties);
      expect(parsed.synonyms).toEqual(['caffeine', '58-08-2']);
      expect(parsed.description).toBe('A methylxanthine alkaloid');
    });

    it('returns error when neither name nor cid provided', async () => {
      const handler = mockServer.registerTool.mock.calls[0]![2] as ToolHandler;
      const result = await handler({ name: undefined, cid: undefined });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: provide either name or cid' }],
        isError: true,
      });
    });

    it('prefers CID when both name and cid are provided', async () => {
      const properties = { cid: 2244, molecularFormula: 'C9H8O4' };
      const synonyms = { synonyms: ['aspirin'] };
      const description = { description: 'A salicylate drug' };
      mockPubChem.compoundByCid.mockResolvedValue(properties);
      mockPubChem.synonyms.mockResolvedValue(synonyms);
      mockPubChem.description.mockResolvedValue(description);

      const handler = mockServer.registerTool.mock.calls[0]![2] as ToolHandler;
      await handler({ name: 'aspirin', cid: 2244 });

      expect(mockPubChem.compoundByCid).toHaveBeenCalledWith(2244);
      expect(mockPubChem.compoundByName).not.toHaveBeenCalled();
    });

    it('truncates synonyms to 20 entries when searching by name', async () => {
      const allSynonyms = Array.from({ length: 30 }, (_, index) => `syn-${index}`);
      mockPubChem.compoundByName.mockResolvedValue({ cid: 100 });
      mockPubChem.synonyms.mockResolvedValue({ synonyms: allSynonyms });
      mockPubChem.description.mockResolvedValue({ description: 'desc' });

      const handler = mockServer.registerTool.mock.calls[0]![2] as ToolHandler;
      const result = await handler({ name: 'test-compound', cid: undefined });

      const parsed = JSON.parse(result.content[0]!.text);
      expect(parsed.synonyms).toHaveLength(20);
      expect(parsed.synonyms[0]).toBe('syn-0');
      expect(parsed.synonyms[19]).toBe('syn-19');
    });
  });
});
