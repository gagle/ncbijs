import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import type { Datasets } from '@ncbijs/datasets';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { registerDatasetsTools } from './datasets-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerDatasetsTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;
  let mockDatasets: {
    geneById: ReturnType<typeof vi.fn>;
    geneBySymbol: ReturnType<typeof vi.fn>;
    taxonomy: ReturnType<typeof vi.fn>;
    genomeByAccession: ReturnType<typeof vi.fn>;
    genomeByTaxon: ReturnType<typeof vi.fn>;
  };
  let getDatasets: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockServer = createMockServer();
    mockDatasets = {
      geneById: vi.fn(),
      geneBySymbol: vi.fn(),
      taxonomy: vi.fn(),
      genomeByAccession: vi.fn(),
      genomeByTaxon: vi.fn(),
    };
    getDatasets = vi.fn().mockReturnValue(mockDatasets);
    registerDatasetsTools(mockServer, getDatasets as unknown as () => Datasets);
  });

  it('registers three tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(3);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('search-gene');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('lookup-taxonomy');
    expect(mockServer.registerTool.mock.calls[2]![0]).toBe('search-genome');
  });

  describe('search-gene', () => {
    it('searches by gene IDs when geneIds provided', async () => {
      const reports = [{ geneId: 672, symbol: 'BRCA1' }];
      mockDatasets.geneById.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        geneIds: [672, 7157],
        symbols: undefined,
        taxon: undefined,
      });

      expect(mockDatasets.geneById).toHaveBeenCalledWith([672, 7157]);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      });
    });

    it('searches by gene symbols when symbols and taxon provided', async () => {
      const reports = [{ geneId: 672, symbol: 'BRCA1' }];
      mockDatasets.geneBySymbol.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        geneIds: undefined,
        symbols: ['BRCA1', 'TP53'],
        taxon: 9606,
      });

      expect(mockDatasets.geneBySymbol).toHaveBeenCalledWith(['BRCA1', 'TP53'], 9606);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      });
    });

    it('returns error when symbols provided without taxon', async () => {
      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        geneIds: undefined,
        symbols: ['BRCA1'],
        taxon: undefined,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: taxon is required when searching by symbol' }],
        isError: true,
      });
    });

    it('returns error when neither geneIds nor symbols provided', async () => {
      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        geneIds: undefined,
        symbols: undefined,
        taxon: undefined,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: provide either geneIds or symbols + taxon' }],
        isError: true,
      });
    });

    it('returns error when geneIds is an empty array and symbols is undefined', async () => {
      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        geneIds: [],
        symbols: undefined,
        taxon: undefined,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: provide either geneIds or symbols + taxon' }],
        isError: true,
      });
    });

    it('returns error when both geneIds and symbols are empty arrays', async () => {
      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        geneIds: [],
        symbols: [],
        taxon: 9606,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: provide either geneIds or symbols + taxon' }],
        isError: true,
      });
    });

    it('prefers geneIds when both geneIds and symbols are provided', async () => {
      const reports = [{ geneId: 672 }];
      mockDatasets.geneById.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        geneIds: [672],
        symbols: ['BRCA1'],
        taxon: 9606,
      });

      expect(mockDatasets.geneById).toHaveBeenCalledWith([672]);
      expect(mockDatasets.geneBySymbol).not.toHaveBeenCalled();
    });
  });

  describe('lookup-taxonomy', () => {
    it('looks up taxonomy and returns JSON', async () => {
      const reports = [{ taxId: 9606, organismName: 'Homo sapiens' }];
      mockDatasets.taxonomy.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ taxons: [9606, 'mouse'] });

      expect(mockDatasets.taxonomy).toHaveBeenCalledWith([9606, 'mouse']);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      });
    });
  });

  describe('search-genome', () => {
    it('searches by accessions when provided', async () => {
      const reports = [{ accession: 'GCF_000001405.40' }];
      mockDatasets.genomeByAccession.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        accessions: ['GCF_000001405.40'],
        taxon: undefined,
      });

      expect(mockDatasets.genomeByAccession).toHaveBeenCalledWith(['GCF_000001405.40']);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      });
    });

    it('searches by taxon when accessions not provided', async () => {
      const reports = [{ accession: 'GCF_000001405.40' }];
      mockDatasets.genomeByTaxon.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        accessions: undefined,
        taxon: 9606,
      });

      expect(mockDatasets.genomeByTaxon).toHaveBeenCalledWith(9606);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(reports, null, 2) }],
      });
    });

    it('returns error when neither accessions nor taxon provided', async () => {
      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        accessions: undefined,
        taxon: undefined,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: provide either accessions or taxon' }],
        isError: true,
      });
    });

    it('returns error when accessions is an empty array and taxon is undefined', async () => {
      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({
        accessions: [],
        taxon: undefined,
      });

      expect(result).toEqual({
        content: [{ type: 'text', text: 'Error: provide either accessions or taxon' }],
        isError: true,
      });
    });

    it('prefers accessions when both accessions and taxon are provided', async () => {
      const reports = [{ accession: 'GCF_000001405.40' }];
      mockDatasets.genomeByAccession.mockResolvedValue(reports);

      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      await handler({
        accessions: ['GCF_000001405.40'],
        taxon: 9606,
      });

      expect(mockDatasets.genomeByAccession).toHaveBeenCalledWith(['GCF_000001405.40']);
      expect(mockDatasets.genomeByTaxon).not.toHaveBeenCalled();
    });
  });
});
