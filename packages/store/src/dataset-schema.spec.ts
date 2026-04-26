import { DATASET_SCHEMAS } from './dataset-schema';
import type { DatasetType } from './interfaces/storage.interface';

const ALL_DATASETS: ReadonlyArray<DatasetType> = [
  'mesh',
  'clinvar',
  'genes',
  'taxonomy',
  'compounds',
  'id-mappings',
];

describe('DATASET_SCHEMAS', () => {
  it('has a schema for every dataset type', () => {
    for (const dataset of ALL_DATASETS) {
      expect(DATASET_SCHEMAS[dataset]).toBeDefined();
    }
  });

  describe.each(ALL_DATASETS)('%s schema', (dataset) => {
    it('has required SQL statements', () => {
      const schema = DATASET_SCHEMAS[dataset];

      expect(schema.tableName).toBeTruthy();
      expect(schema.createTableSql).toContain('CREATE TABLE');
      expect(schema.insertSql).toContain('INSERT');
      expect(schema.getRecordSql).toContain('SELECT');
    });
  });

  describe('mesh', () => {
    const schema = DATASET_SCHEMAS['mesh'];

    it('serializes and deserializes a full record', () => {
      const record = {
        id: 'D000001',
        name: 'Calcimycin',
        treeNumbers: ['D03.438.221.173'],
        qualifiers: ['adverse effects'],
        pharmacologicalActions: ['Ionophores'],
        supplementaryConcepts: [],
      };

      const serialized = schema.serialize(record);
      expect(serialized['id']).toBe('D000001');
      expect(serialized['name']).toBe('Calcimycin');
      expect(serialized['tree_numbers']).toBe('["D03.438.221.173"]');

      const deserialized = schema.deserialize({
        id: 'D000001',
        name: 'Calcimycin',
        tree_numbers: '["D03.438.221.173"]',
        qualifiers: '["adverse effects"]',
        pharmacological_actions: '["Ionophores"]',
        supplementary_concepts: '[]',
      });

      expect(deserialized['id']).toBe('D000001');
      expect(deserialized['treeNumbers']).toEqual(['D03.438.221.173']);
    });

    it('handles malformed JSON in deserialization', () => {
      const deserialized = schema.deserialize({
        id: 'D000001',
        name: 'Test',
        tree_numbers: '{invalid json',
        qualifiers: '',
        pharmacological_actions: null,
        supplementary_concepts: undefined,
      });

      expect(deserialized['treeNumbers']).toEqual([]);
      expect(deserialized['qualifiers']).toEqual([]);
      expect(deserialized['pharmacologicalActions']).toEqual([]);
      expect(deserialized['supplementaryConcepts']).toEqual([]);
    });

    it('uses string key transform', () => {
      expect(schema.keyTransform('D000001')).toEqual({ key: 'D000001' });
    });
  });

  describe('clinvar', () => {
    const schema = DATASET_SCHEMAS['clinvar'];

    it('round-trips a record through serialize/deserialize', () => {
      const record = {
        uid: '12345',
        title: 'NM_000059.4(BRCA2):c.68-7T>A',
        objectType: 'single nucleotide variant',
        accession: 'VCV000012345',
        accessionVersion: 'VCV000012345.6',
        clinicalSignificance: 'Pathogenic',
        genes: [{ name: 'BRCA2', id: 675 }],
        traits: ['Breast cancer'],
        locations: [],
        supportingSubmissions: ['SCV000001'],
      };

      const serialized = schema.serialize(record);
      expect(serialized['uid']).toBe('12345');
      expect(serialized['clinical_significance']).toBe('Pathogenic');
      expect(typeof serialized['genes']).toBe('string');

      const deserialized = schema.deserialize(serialized);
      expect(deserialized['uid']).toBe('12345');
      expect(deserialized['clinicalSignificance']).toBe('Pathogenic');
      expect(deserialized['genes']).toEqual([{ name: 'BRCA2', id: 675 }]);
    });

    it('uses string key transform', () => {
      expect(schema.keyTransform('VCV000012345')).toEqual({ key: 'VCV000012345' });
    });
  });

  describe('genes', () => {
    const schema = DATASET_SCHEMAS['genes'];

    it('round-trips a record through serialize/deserialize', () => {
      const record = {
        geneId: 7157,
        symbol: 'TP53',
        description: 'tumor protein p53',
        taxId: 9606,
        taxName: 'Homo sapiens',
        commonName: 'human',
        type: 'protein-coding',
        chromosomes: ['17'],
        synonyms: ['p53', 'LFS1'],
        swissProtAccessions: ['P04637'],
        ensemblGeneIds: ['ENSG00000141510'],
        omimIds: ['191170'],
        summary: 'Tumor suppressor gene.',
        transcriptCount: 25,
        proteinCount: 12,
        geneOntology: { terms: ['GO:0005634'] },
      };

      const serialized = schema.serialize(record);
      expect(serialized['gene_id']).toBe(7157);
      expect(serialized['symbol']).toBe('TP53');

      const deserialized = schema.deserialize(serialized);
      expect(deserialized['geneId']).toBe(7157);
      expect(deserialized['symbol']).toBe('TP53');
      expect(deserialized['chromosomes']).toEqual(['17']);
      expect(deserialized['geneOntology']).toEqual({ terms: ['GO:0005634'] });
    });

    it('handles malformed JSON object in geneOntology', () => {
      const deserialized = schema.deserialize({
        gene_id: 1,
        symbol: '',
        description: '',
        tax_id: 0,
        tax_name: '',
        common_name: '',
        type: '',
        chromosomes: '{bad',
        synonyms: '[]',
        swiss_prot_accessions: '[]',
        ensembl_gene_ids: '[]',
        omim_ids: '[]',
        summary: '',
        transcript_count: 0,
        protein_count: 0,
        gene_ontology: 'not-json',
      });

      expect(deserialized['chromosomes']).toEqual([]);
      expect(deserialized['geneOntology']).toEqual({});
    });

    it('handles non-string geneOntology value', () => {
      const deserialized = schema.deserialize({
        gene_id: 1,
        symbol: '',
        description: '',
        tax_id: 0,
        tax_name: '',
        common_name: '',
        type: '',
        chromosomes: '[]',
        synonyms: '[]',
        swiss_prot_accessions: '[]',
        ensembl_gene_ids: '[]',
        omim_ids: '[]',
        summary: '',
        transcript_count: 0,
        protein_count: 0,
        gene_ontology: undefined,
      });

      expect(deserialized['geneOntology']).toEqual({});
    });

    it('uses integer key transform', () => {
      expect(schema.keyTransform('7157')).toEqual({ key: 7157 });
      expect(schema.keyTransform('abc')).toBeUndefined();
    });
  });

  describe('taxonomy', () => {
    const schema = DATASET_SCHEMAS['taxonomy'];

    it('round-trips a record through serialize/deserialize', () => {
      const record = {
        taxId: 9606,
        organismName: 'Homo sapiens',
        commonName: 'human',
        rank: 'species',
        lineage: [131567, 2759, 33154],
        children: [63221, 741158],
        counts: [],
      };

      const serialized = schema.serialize(record);
      expect(serialized['tax_id']).toBe(9606);

      const deserialized = schema.deserialize(serialized);
      expect(deserialized['taxId']).toBe(9606);
      expect(deserialized['organismName']).toBe('Homo sapiens');
      expect(deserialized['lineage']).toEqual([131567, 2759, 33154]);
    });

    it('uses integer key transform', () => {
      expect(schema.keyTransform('9606')).toEqual({ key: 9606 });
      expect(schema.keyTransform('invalid')).toBeUndefined();
    });
  });

  describe('compounds', () => {
    const schema = DATASET_SCHEMAS['compounds'];

    it('round-trips a record through serialize/deserialize', () => {
      const record = {
        cid: 2244,
        canonicalSmiles: 'CC(=O)OC1=CC=CC=C1C(=O)O',
        inchiKey: 'BSYNRYMUTXBXSQ-UHFFFAOYSA-N',
        iupacName: '2-acetyloxybenzoic acid',
      };

      const serialized = schema.serialize(record);
      expect(serialized['cid']).toBe(2244);

      const deserialized = schema.deserialize(serialized);
      expect(deserialized['cid']).toBe(2244);
      expect(deserialized['canonicalSmiles']).toBe('CC(=O)OC1=CC=CC=C1C(=O)O');
    });

    it('uses integer key transform', () => {
      expect(schema.keyTransform('2244')).toEqual({ key: 2244 });
    });
  });

  describe('id-mappings', () => {
    const schema = DATASET_SCHEMAS['id-mappings'];

    it('round-trips a record through serialize/deserialize', () => {
      const record = {
        pmid: '12345678',
        pmcid: 'PMC1234567',
        doi: '10.1234/example',
        mid: null,
        live: true,
        releaseDate: '2025-01-15',
      };

      const serialized = schema.serialize(record);
      expect(serialized['pmid']).toBe('12345678');
      expect(serialized['mid']).toBeNull();
      expect(serialized['live']).toBe(true);

      const deserialized = schema.deserialize(serialized);
      expect(deserialized['pmid']).toBe('12345678');
      expect(deserialized['pmcid']).toBe('PMC1234567');
      expect(deserialized['live']).toBe(true);
    });

    it('serializes null/undefined fields to null', () => {
      const record = {
        pmid: null,
        pmcid: undefined,
        doi: '10.1234/example',
        mid: null,
        live: false,
        releaseDate: '',
      };

      const serialized = schema.serialize(record);
      expect(serialized['pmid']).toBeNull();
      expect(serialized['pmcid']).toBeNull();
    });

    it('uses string key transform', () => {
      expect(schema.keyTransform('PMC1234567')).toEqual({ key: 'PMC1234567' });
    });
  });

  describe('serialization edge cases', () => {
    it('handles empty record input gracefully', () => {
      for (const dataset of ALL_DATASETS) {
        const schema = DATASET_SCHEMAS[dataset];
        expect(() => schema.serialize({})).not.toThrow();
      }
    });

    it('handles non-object input in toRecord', () => {
      for (const dataset of ALL_DATASETS) {
        const schema = DATASET_SCHEMAS[dataset];
        expect(() => schema.serialize(null as never)).not.toThrow();
        expect(() => schema.serialize(undefined as never)).not.toThrow();
      }
    });

    it('deserializes JSON array strings that are not arrays', () => {
      const schema = DATASET_SCHEMAS['mesh'];
      const deserialized = schema.deserialize({
        id: 'D000001',
        name: 'Test',
        tree_numbers: '"not-an-array"',
        qualifiers: '42',
        pharmacological_actions: '{}',
        supplementary_concepts: 'true',
      });

      expect(deserialized['treeNumbers']).toEqual([]);
      expect(deserialized['qualifiers']).toEqual([]);
      expect(deserialized['pharmacologicalActions']).toEqual([]);
      expect(deserialized['supplementaryConcepts']).toEqual([]);
    });

    it('deserializes JSON object strings that are arrays', () => {
      const schema = DATASET_SCHEMAS['genes'];
      const deserialized = schema.deserialize({
        gene_id: 1,
        symbol: '',
        description: '',
        tax_id: 0,
        tax_name: '',
        common_name: '',
        type: '',
        chromosomes: '[]',
        synonyms: '[]',
        swiss_prot_accessions: '[]',
        ensembl_gene_ids: '[]',
        omim_ids: '[]',
        summary: '',
        transcript_count: 0,
        protein_count: 0,
        gene_ontology: '["array-not-object"]',
      });

      expect(deserialized['geneOntology']).toEqual({});
    });
  });
});
