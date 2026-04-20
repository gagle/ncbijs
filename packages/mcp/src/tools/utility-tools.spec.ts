import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { mockConvert, mockCite, mockLookupOnline, mockSparql } = vi.hoisted(() => ({
  mockConvert: vi.fn(),
  mockCite: vi.fn(),
  mockLookupOnline: vi.fn(),
  mockSparql: vi.fn(),
}));

vi.mock('@ncbijs/id-converter', () => ({
  convert: mockConvert,
}));

vi.mock('@ncbijs/cite', () => ({
  cite: mockCite,
}));

vi.mock('@ncbijs/mesh', () => {
  const MeSH = function MeSH(this: Record<string, unknown>) {
    this['lookupOnline'] = mockLookupOnline;
    this['sparql'] = mockSparql;
  } as unknown;
  return { MeSH };
});

import { registerUtilityTools } from './utility-tools';

function createMockServer(): McpServer & { registerTool: ReturnType<typeof vi.fn> } {
  return { registerTool: vi.fn() } as unknown as McpServer & {
    registerTool: ReturnType<typeof vi.fn>;
  };
}

describe('registerUtilityTools', () => {
  let mockServer: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockServer = createMockServer();
    registerUtilityTools(mockServer);
  });

  it('registers four tools', () => {
    expect(mockServer.registerTool).toHaveBeenCalledTimes(4);
    expect(mockServer.registerTool.mock.calls[0]![0]).toBe('convert-ids');
    expect(mockServer.registerTool.mock.calls[1]![0]).toBe('get-citation');
    expect(mockServer.registerTool.mock.calls[2]![0]).toBe('mesh-lookup');
    expect(mockServer.registerTool.mock.calls[3]![0]).toBe('mesh-sparql');
  });

  describe('convert-ids', () => {
    it('converts article IDs and returns JSON', async () => {
      const converted = [{ pmid: '12345', pmcid: 'PMC123', doi: '10.1234/test' }];
      mockConvert.mockResolvedValue(converted);

      const handler = mockServer.registerTool.mock.calls[0]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ ids: ['12345', 'PMC123'] });

      expect(mockConvert).toHaveBeenCalledWith(['12345', 'PMC123']);
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(converted, null, 2) }],
      });
    });
  });

  describe('get-citation', () => {
    it('returns CSL-JSON citation', async () => {
      const cslData = { type: 'article-journal', title: 'Test' };
      mockCite.mockResolvedValue(cslData);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: '12345', format: 'csl' });

      expect(mockCite).toHaveBeenCalledWith('12345', 'csl');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(cslData, null, 2) }],
      });
    });

    it('returns citation format as JSON', async () => {
      const citationData = { apa: 'Author (2024). Title.' };
      mockCite.mockResolvedValue(citationData);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: '12345', format: 'citation' });

      expect(mockCite).toHaveBeenCalledWith('12345', 'citation');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(citationData, null, 2) }],
      });
    });

    it('returns RIS format as plain text', async () => {
      const risText = 'TY  - JOUR\nAU  - Author\nER  -';
      mockCite.mockResolvedValue(risText);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: '12345', format: 'ris' });

      expect(mockCite).toHaveBeenCalledWith('12345', 'ris');
      expect(result).toEqual({
        content: [{ type: 'text', text: risText }],
      });
    });

    it('returns MEDLINE format as plain text', async () => {
      const medlineText = 'PMID- 12345\nTI  - Test Title';
      mockCite.mockResolvedValue(medlineText);

      const handler = mockServer.registerTool.mock.calls[1]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ pmid: '12345', format: 'medline' });

      expect(mockCite).toHaveBeenCalledWith('12345', 'medline');
      expect(result).toEqual({
        content: [{ type: 'text', text: medlineText }],
      });
    });
  });

  describe('mesh-lookup', () => {
    it('looks up a MeSH term and returns JSON', async () => {
      const results = [{ descriptorId: 'D009369', name: 'Neoplasms' }];
      mockLookupOnline.mockResolvedValue(results);

      const handler = mockServer.registerTool.mock.calls[2]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ term: 'Neoplasms' });

      expect(mockLookupOnline).toHaveBeenCalledWith('Neoplasms');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(results, null, 2) }],
      });
    });
  });

  describe('mesh-sparql', () => {
    it('executes a SPARQL query and returns JSON', async () => {
      const sparqlResult = { results: { bindings: [{ label: { value: 'Neoplasms' } }] } };
      mockSparql.mockResolvedValue(sparqlResult);

      const handler = mockServer.registerTool.mock.calls[3]![2] as (
        ...args: ReadonlyArray<unknown>
      ) => Promise<unknown>;
      const result = await handler({ query: 'SELECT ?label WHERE { ?d rdfs:label ?label }' });

      expect(mockSparql).toHaveBeenCalledWith('SELECT ?label WHERE { ?d rdfs:label ?label }');
      expect(result).toEqual({
        content: [{ type: 'text', text: JSON.stringify(sparqlResult, null, 2) }],
      });
    });
  });
});
