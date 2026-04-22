import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { ClinVar } from '@ncbijs/clinvar';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerClinVarTools } from './clinvar-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerClinVarTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockClinVar: {
    search: ReturnType<typeof vi.fn>;
    fetch: ReturnType<typeof vi.fn>;
    refsnp: ReturnType<typeof vi.fn>;
    frequency: ReturnType<typeof vi.fn>;
  };
  let getClinVar: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockClinVar = {
      search: vi.fn(),
      fetch: vi.fn(),
      refsnp: vi.fn(),
      frequency: vi.fn(),
    };
    getClinVar = vi.fn().mockReturnValue(mockClinVar);
    registerClinVarTools(mockServer, getClinVar as unknown as () => ClinVar);
  });

  it('registers three tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('search-clinvar');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('lookup-refsnp');
    expect(mockServer.registerTool.mock.calls[2]![0]).toBe('lookup-frequency');
  });

  describe('search-clinvar', () => {
    it('searches and fetches ClinVar results', async () => {
      const searchResult = { ids: ['12345', '67890'] };
      const reports = [{ uid: '12345', title: 'BRCA1 variant' }];
      mockClinVar.search.mockResolvedValue(searchResult);
      mockClinVar.fetch.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ term: 'BRCA1', retmax: 20 });

      expect(getClinVar).toHaveBeenCalled();
      expect(mockClinVar.search).toHaveBeenCalledWith('BRCA1', { retmax: 20 });
      expect(mockClinVar.fetch).toHaveBeenCalledWith(['12345', '67890']);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      });
    });

    it('returns message when no results found', async () => {
      mockClinVar.search.mockResolvedValue({ ids: [] });

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ term: 'nonexistent-variant', retmax: undefined });

      expect(mockClinVar.search).toHaveBeenCalledWith('nonexistent-variant', {});
      expect(mockClinVar.fetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: 'text', text: 'No ClinVar results found for "nonexistent-variant"' }],
      });
    });

    it('passes retmax option when provided', async () => {
      mockClinVar.search.mockResolvedValue({ ids: ['111'] });
      mockClinVar.fetch.mockResolvedValue([{ uid: '111' }]);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({ term: 'TP53', retmax: 50 });

      expect(mockClinVar.search).toHaveBeenCalledWith('TP53', { retmax: 50 });
    });
  });

  describe('lookup-refsnp', () => {
    it('looks up a RefSNP variant and returns JSON', async () => {
      const report = { refsnpId: '7412', variantType: 'snv' };
      mockClinVar.refsnp.mockResolvedValue(report);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ rsid: 7412 });

      expect(getClinVar).toHaveBeenCalled();
      expect(mockClinVar.refsnp).toHaveBeenCalledWith(7412);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
      });
    });
  });

  describe('lookup-frequency', () => {
    it('looks up variant frequency and returns JSON', async () => {
      const report = { rsid: '7412', results: [{ study: 'ALFA', frequency: 0.25 }] };
      mockClinVar.frequency.mockResolvedValue(report);

      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ rsid: 7412 });

      expect(getClinVar).toHaveBeenCalled();
      expect(mockClinVar.frequency).toHaveBeenCalledWith(7412);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(report, null, 2) }],
      });
    });
  });
});
