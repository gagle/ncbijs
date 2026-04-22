import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Storage } from '@ncbijs/store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerClinVarTools } from './clinvar-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerClinVarTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockStorage: {
    getRecord: ReturnType<typeof vi.fn>;
    searchRecords: ReturnType<typeof vi.fn>;
  };
  let getStorage: () => Storage;

  beforeEach(() => {
    mockServer = createMockServer();
    mockStorage = {
      getRecord: vi.fn(),
      searchRecords: vi.fn(),
    };
    getStorage = vi.fn().mockReturnValue(mockStorage) as unknown as () => Storage;
    registerClinVarTools(mockServer, getStorage);
  });

  it('registers two tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(2);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('store-lookup-variant');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('store-search-variants');
  });

  describe('store-lookup-variant', () => {
    it('returns a ClinVar variant by UID', async () => {
      const variant = { uid: '242587', title: 'NM_000059.4:c.68_69del' };
      mockStorage.getRecord.mockResolvedValue(variant);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ uid: '242587' });

      expect(mockStorage.getRecord).toHaveBeenCalledWith('clinvar', '242587');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(variant, null, 2) }],
      });
    });

    it('returns not-found message for missing variant', async () => {
      mockStorage.getRecord.mockResolvedValue(undefined);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({ uid: '999999' });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'ClinVar variant "999999" not found in store' }],
      });
    });
  });

  describe('store-search-variants', () => {
    it('searches ClinVar variants by field', async () => {
      const results = [{ uid: '1', clinicalSignificance: 'Pathogenic' }];
      mockStorage.searchRecords.mockResolvedValue(results);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({
        field: 'clinicalSignificance',
        value: 'Pathogenic',
        operator: 'eq',
        limit: 20,
      });

      expect(mockStorage.searchRecords).toHaveBeenCalledWith('clinvar', {
        field: 'clinicalSignificance',
        value: 'Pathogenic',
        operator: 'eq',
        limit: 20,
      });
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      });
    });

    it('returns no-results message for empty search', async () => {
      mockStorage.searchRecords.mockResolvedValue([]);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        args: Record<string, unknown>,
      ) => Promise<unknown>;
      const result = await handler({
        field: 'title',
        value: 'nonexistent',
        operator: 'eq',
        limit: 20,
      });

      expect(result).toEqual({
        content: [
          {
            type: 'text',
            text: 'No ClinVar variants matching title="nonexistent" in store',
          },
        ],
      });
    });
  });
});
