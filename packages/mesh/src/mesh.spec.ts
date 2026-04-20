import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeSH } from './mesh.js';
import type { MeshTreeData, SparqlResult } from './interfaces/mesh.interface.js';

function mockFetchJson(data: unknown, status = 200): void {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      json: () => Promise.resolve(data),
    }),
  );
}

function mockFetchFailure(errorMessage: string): void {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(errorMessage)));
}

const TREE_DATA: MeshTreeData = {
  descriptors: [
    {
      id: 'D001829',
      name: 'Body Regions',
      treeNumbers: ['A01'],
      qualifiers: [{ name: 'anatomy & histology', abbreviation: 'AH' }],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D006257',
      name: 'Head',
      treeNumbers: ['A01.236'],
      qualifiers: [
        { name: 'anatomy & histology', abbreviation: 'AH' },
        { name: 'blood supply', abbreviation: 'BS' },
      ],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D004423',
      name: 'Ear',
      treeNumbers: ['A01.236.249'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D005145',
      name: 'Face',
      treeNumbers: ['A01.236.500', 'A17.360'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D008046',
      name: 'Lip',
      treeNumbers: ['A01.236.500.330'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D008047',
      name: 'Mouth',
      treeNumbers: ['A01.236.500.530'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D014059',
      name: 'Tongue',
      treeNumbers: ['A01.236.500.530.860'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D005121',
      name: 'Extremities',
      treeNumbers: ['A01.378'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D017953',
      name: 'Integumentary System',
      treeNumbers: ['A17'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D000090',
      name: 'Facial Muscles',
      treeNumbers: ['A17.360.200'],
      qualifiers: [],
      pharmacologicalActions: [],
      supplementaryConcepts: [],
    },
    {
      id: 'D001241',
      name: 'Aspirin',
      treeNumbers: ['D02.065.199.092'],
      qualifiers: [],
      pharmacologicalActions: [
        'Anti-Inflammatory Agents, Non-Steroidal',
        'Platelet Aggregation Inhibitors',
      ],
      supplementaryConcepts: ['aspirin-dipyridamole'],
    },
  ],
};

const SAMPLE_SPARQL_RESULT: SparqlResult = {
  head: { vars: ['descriptor', 'label'] },
  results: {
    bindings: [
      {
        descriptor: { type: 'uri', value: 'http://id.nlm.nih.gov/mesh/D006257' },
        label: { type: 'literal', value: 'Head', 'xml:lang': 'en' },
      },
    ],
  },
};

const SAMPLE_LOOKUP_RESPONSE = [
  { resource: 'http://id.nlm.nih.gov/mesh/D001241', label: 'Aspirin' },
  {
    resource: 'http://id.nlm.nih.gov/mesh/D000068579',
    label: 'Aspirin, Dipyridamole Drug Combination',
  },
];

describe('MeSH', () => {
  let mesh: MeSH;

  beforeEach(() => {
    mesh = new MeSH(TREE_DATA);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('constructor', () => {
    it('should create instance and load tree data', () => {
      expect(mesh).toBeInstanceOf(MeSH);
    });
  });

  describe('lookup', () => {
    it('should find descriptor by ID', () => {
      const result = mesh.lookup('D006257');
      expect(result?.name).toBe('Head');
    });

    it('should find descriptor by name', () => {
      const result = mesh.lookup('Head');
      expect(result?.id).toBe('D006257');
    });

    it('should return null for unknown descriptor', () => {
      expect(mesh.lookup('Unknown')).toBeNull();
    });

    it('should return full MeshDescriptor with treeNumbers', () => {
      const result = mesh.lookup('Head');
      expect(result?.treeNumbers).toEqual(['A01.236']);
    });

    it('should return qualifiers for descriptor', () => {
      const result = mesh.lookup('Head');
      expect(result?.qualifiers).toEqual([
        { name: 'anatomy & histology', abbreviation: 'AH' },
        { name: 'blood supply', abbreviation: 'BS' },
      ]);
    });

    it('should return pharmacologicalActions', () => {
      const result = mesh.lookup('Aspirin');
      expect(result?.pharmacologicalActions).toEqual([
        'Anti-Inflammatory Agents, Non-Steroidal',
        'Platelet Aggregation Inhibitors',
      ]);
    });

    it('should return supplementaryConcepts', () => {
      const result = mesh.lookup('Aspirin');
      expect(result?.supplementaryConcepts).toEqual(['aspirin-dipyridamole']);
    });

    it('should be case-insensitive for name lookup', () => {
      const result = mesh.lookup('head');
      expect(result?.id).toBe('D006257');
    });
  });

  describe('expand', () => {
    it('should return all descendants of a term', () => {
      const result = mesh.expand('Head');
      expect(result).toContain('Ear');
      expect(result).toContain('Face');
      expect(result).toContain('Lip');
      expect(result).toContain('Mouth');
      expect(result).toContain('Tongue');
    });

    it('should include the term itself', () => {
      const result = mesh.expand('Head');
      expect(result).toContain('Head');
    });

    it('should expand across multiple tree numbers', () => {
      const result = mesh.expand('Face');
      expect(result).toContain('Lip');
      expect(result).toContain('Facial Muscles');
    });

    it('should handle leaf node with no descendants', () => {
      const result = mesh.expand('Ear');
      expect(result).toEqual(['Ear']);
    });

    it('should throw on unknown term', () => {
      expect(() => mesh.expand('Unknown')).toThrow('Unknown MeSH term');
    });
  });

  describe('ancestors', () => {
    it('should return all ancestors from leaf to root', () => {
      const result = mesh.ancestors('Ear');
      expect(result).toContain('Head');
      expect(result).toContain('Body Regions');
    });

    it('should handle root-level term', () => {
      const result = mesh.ancestors('Body Regions');
      expect(result).toHaveLength(0);
    });

    it('should return ancestors for all tree numbers', () => {
      const result = mesh.ancestors('Face');
      expect(result).toContain('Body Regions');
      expect(result).toContain('Head');
      expect(result).toContain('Integumentary System');
    });

    it('should throw on unknown term', () => {
      expect(() => mesh.ancestors('Unknown')).toThrow('Unknown MeSH term');
    });
  });

  describe('children', () => {
    it('should return direct children only', () => {
      const result = mesh.children('Head');
      expect(result).toContain('Ear');
      expect(result).toContain('Face');
    });

    it('should not include grandchildren', () => {
      const result = mesh.children('Head');
      expect(result).not.toContain('Lip');
      expect(result).not.toContain('Tongue');
    });

    it('should handle leaf node with no children', () => {
      const result = mesh.children('Ear');
      expect(result).toHaveLength(0);
    });

    it('should throw on unknown term', () => {
      expect(() => mesh.children('Unknown')).toThrow('Unknown MeSH term');
    });
  });

  describe('treePath', () => {
    it('should return ordered path from root to term', () => {
      const result = mesh.treePath('Ear');
      expect(result).toEqual(['Body Regions', 'Head', 'Ear']);
    });

    it('should return paths for all tree numbers', () => {
      const result = mesh.treePath('Face');
      expect(result).toContain('Body Regions');
      expect(result).toContain('Head');
      expect(result).toContain('Integumentary System');
    });

    it('should throw on unknown term', () => {
      expect(() => mesh.treePath('Unknown')).toThrow('Unknown MeSH term');
    });
  });

  describe('toQuery', () => {
    it('should generate PubMed-compatible MeSH query', () => {
      expect(mesh.toQuery('Head')).toBe('"Head"[Mesh]');
    });

    it('should include explosion brackets [Mesh]', () => {
      const result = mesh.toQuery('Ear');
      expect(result).toContain('[Mesh]');
    });

    it('should handle term with subheadings', () => {
      expect(mesh.toQuery('Head/AH')).toBe('"Head/anatomy & histology"[Mesh]');
    });

    it('should throw on unknown term', () => {
      expect(() => mesh.toQuery('Unknown')).toThrow('Unknown MeSH term');
    });
  });

  describe('sparql', () => {
    it('should send SPARQL query to MeSH endpoint', async () => {
      mockFetchJson(SAMPLE_SPARQL_RESULT);
      await mesh.sparql('SELECT ?d WHERE { ?d a meshv:Descriptor }');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('id.nlm.nih.gov/mesh/sparql');
    });

    it('should return SparqlResult with head and results', async () => {
      mockFetchJson(SAMPLE_SPARQL_RESULT);
      const result = await mesh.sparql('SELECT ?d WHERE { ?d a meshv:Descriptor }');
      expect(result.head.vars).toEqual(['descriptor', 'label']);
      expect(result.results.bindings).toHaveLength(1);
    });

    it('should parse bindings with type and value', async () => {
      mockFetchJson(SAMPLE_SPARQL_RESULT);
      const result = await mesh.sparql('SELECT ?d WHERE { ?d a meshv:Descriptor }');
      const binding = result.results.bindings[0]!;
      expect(binding['descriptor']!.type).toBe('uri');
      expect(binding['descriptor']!.value).toContain('D006257');
    });

    it('should handle xml:lang on bindings', async () => {
      mockFetchJson(SAMPLE_SPARQL_RESULT);
      const result = await mesh.sparql('SELECT ?d WHERE { ?d a meshv:Descriptor }');
      const binding = result.results.bindings[0]!;
      expect(binding['label']!['xml:lang']).toBe('en');
    });

    it('should throw on invalid SPARQL', async () => {
      mockFetchJson({ error: 'Parse error' }, 400);
      await expect(mesh.sparql('INVALID')).rejects.toThrow('status 400');
    });

    it('should throw on network error', async () => {
      mockFetchFailure('Failed to fetch');
      await expect(mesh.sparql('SELECT ?d')).rejects.toThrow('Failed to fetch');
    });
  });

  describe('lookupOnline', () => {
    it('should query MeSH REST Lookup API', async () => {
      mockFetchJson(SAMPLE_LOOKUP_RESPONSE);
      await mesh.lookupOnline('Aspirin');
      const fetchCall = vi.mocked(fetch).mock.calls[0]![0] as string;
      expect(fetchCall).toContain('id.nlm.nih.gov/mesh/lookup/descriptor');
    });

    it('should return MeshDescriptor array', async () => {
      mockFetchJson(SAMPLE_LOOKUP_RESPONSE);
      const result = await mesh.lookupOnline('Aspirin');
      expect(result).toHaveLength(2);
      expect(result[0]!.id).toBe('D001241');
      expect(result[0]!.name).toBe('Aspirin');
    });

    it('should handle empty results', async () => {
      mockFetchJson([]);
      const result = await mesh.lookupOnline('xyznonexistent');
      expect(result).toHaveLength(0);
    });

    it('should throw on HTTP error', async () => {
      mockFetchJson({ error: 'Internal error' }, 500);
      await expect(mesh.lookupOnline('test')).rejects.toThrow('status 500');
    });

    it('should throw on network error', async () => {
      mockFetchFailure('Failed to fetch');
      await expect(mesh.lookupOnline('test')).rejects.toThrow('Failed to fetch');
    });
  });
});
