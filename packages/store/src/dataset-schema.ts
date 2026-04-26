import type { DuckDBValue } from '@duckdb/node-api';
import type { DatasetType } from './interfaces/storage.interface';

/** Schema definition for a single dataset table. */
export interface DatasetSchema {
  readonly tableName: string;
  readonly createTableSql: string;
  readonly createIndexesSql: ReadonlyArray<string>;
  readonly insertSql: string;
  readonly getRecordSql: string;
  readonly keyTransform: (key: string) => Record<string, DuckDBValue> | undefined;
  readonly serialize: (record: Record<string, unknown>) => Record<string, DuckDBValue>;
  readonly deserialize: (row: Record<string, unknown>) => Record<string, unknown>;
}

function toRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null) {
    return {};
  }
  return value as Record<string, unknown>;
}

function parseJsonArray(value: unknown): Array<unknown> {
  if (typeof value !== 'string' || value === '') {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed;
  } catch {
    // noop
    return [];
  }
}

function parseJsonObject(value: unknown): Record<string, unknown> {
  if (typeof value !== 'string' || value === '') {
    return {};
  }
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    // noop
    return {};
  }
}

function toNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  return String(value);
}

function toIntegerKey(key: string): Record<string, DuckDBValue> | undefined {
  const numericKey = Number.parseInt(key, 10);
  if (Number.isNaN(numericKey)) {
    return undefined;
  }
  return { key: numericKey };
}

function toStringKey(key: string): Record<string, DuckDBValue> | undefined {
  return { key };
}

/** Schema definitions for all supported dataset types. */
export const DATASET_SCHEMAS: Record<DatasetType, DatasetSchema> = {
  mesh: {
    tableName: 'mesh_descriptors',
    createTableSql: `CREATE TABLE IF NOT EXISTS mesh_descriptors (
      id VARCHAR PRIMARY KEY,
      name VARCHAR NOT NULL,
      tree_numbers VARCHAR,
      qualifiers VARCHAR,
      pharmacological_actions VARCHAR,
      supplementary_concepts VARCHAR
    )`,
    createIndexesSql: ['CREATE INDEX IF NOT EXISTS idx_mesh_name ON mesh_descriptors(name)'],
    insertSql: `INSERT OR REPLACE INTO mesh_descriptors
      (id, name, tree_numbers, qualifiers, pharmacological_actions, supplementary_concepts)
      VALUES ($id, $name, $tree_numbers, $qualifiers, $pharmacological_actions, $supplementary_concepts)`,
    getRecordSql: 'SELECT * FROM mesh_descriptors WHERE id = $key',
    keyTransform: toStringKey,
    serialize: (record) => {
      const r = toRecord(record);
      return {
        id: String(r['id'] ?? ''),
        name: String(r['name'] ?? ''),
        tree_numbers: JSON.stringify(r['treeNumbers'] ?? []),
        qualifiers: JSON.stringify(r['qualifiers'] ?? []),
        pharmacological_actions: JSON.stringify(r['pharmacologicalActions'] ?? []),
        supplementary_concepts: JSON.stringify(r['supplementaryConcepts'] ?? []),
      };
    },
    deserialize: (row) => ({
      id: String(row['id'] ?? ''),
      name: String(row['name'] ?? ''),
      treeNumbers: parseJsonArray(row['tree_numbers']),
      qualifiers: parseJsonArray(row['qualifiers']),
      pharmacologicalActions: parseJsonArray(row['pharmacological_actions']),
      supplementaryConcepts: parseJsonArray(row['supplementary_concepts']),
    }),
  },

  clinvar: {
    tableName: 'clinvar_variants',
    createTableSql: `CREATE TABLE IF NOT EXISTS clinvar_variants (
      uid VARCHAR PRIMARY KEY,
      title VARCHAR,
      object_type VARCHAR,
      accession VARCHAR,
      accession_version VARCHAR,
      clinical_significance VARCHAR,
      genes VARCHAR,
      traits VARCHAR,
      locations VARCHAR,
      supporting_submissions VARCHAR
    )`,
    createIndexesSql: [
      'CREATE INDEX IF NOT EXISTS idx_clinvar_accession ON clinvar_variants(accession)',
      'CREATE INDEX IF NOT EXISTS idx_clinvar_significance ON clinvar_variants(clinical_significance)',
    ],
    insertSql: `INSERT OR REPLACE INTO clinvar_variants
      (uid, title, object_type, accession, accession_version, clinical_significance, genes, traits, locations, supporting_submissions)
      VALUES ($uid, $title, $object_type, $accession, $accession_version, $clinical_significance, $genes, $traits, $locations, $supporting_submissions)`,
    getRecordSql: 'SELECT * FROM clinvar_variants WHERE uid = $key',
    keyTransform: toStringKey,
    serialize: (record) => {
      const r = toRecord(record);
      return {
        uid: String(r['uid'] ?? ''),
        title: String(r['title'] ?? ''),
        object_type: String(r['objectType'] ?? ''),
        accession: String(r['accession'] ?? ''),
        accession_version: String(r['accessionVersion'] ?? ''),
        clinical_significance: String(r['clinicalSignificance'] ?? ''),
        genes: JSON.stringify(r['genes'] ?? []),
        traits: JSON.stringify(r['traits'] ?? []),
        locations: JSON.stringify(r['locations'] ?? []),
        supporting_submissions: JSON.stringify(r['supportingSubmissions'] ?? []),
      };
    },
    deserialize: (row) => ({
      uid: String(row['uid'] ?? ''),
      title: String(row['title'] ?? ''),
      objectType: String(row['object_type'] ?? ''),
      accession: String(row['accession'] ?? ''),
      accessionVersion: String(row['accession_version'] ?? ''),
      clinicalSignificance: String(row['clinical_significance'] ?? ''),
      genes: parseJsonArray(row['genes']),
      traits: parseJsonArray(row['traits']),
      locations: parseJsonArray(row['locations']),
      supportingSubmissions: parseJsonArray(row['supporting_submissions']),
    }),
  },

  genes: {
    tableName: 'genes',
    createTableSql: `CREATE TABLE IF NOT EXISTS genes (
      gene_id INTEGER PRIMARY KEY,
      symbol VARCHAR NOT NULL,
      description VARCHAR,
      tax_id INTEGER NOT NULL,
      tax_name VARCHAR,
      common_name VARCHAR,
      "type" VARCHAR,
      chromosomes VARCHAR,
      synonyms VARCHAR,
      swiss_prot_accessions VARCHAR,
      ensembl_gene_ids VARCHAR,
      omim_ids VARCHAR,
      summary VARCHAR,
      transcript_count INTEGER,
      protein_count INTEGER,
      gene_ontology VARCHAR
    )`,
    createIndexesSql: [
      'CREATE INDEX IF NOT EXISTS idx_genes_symbol ON genes(symbol)',
      'CREATE INDEX IF NOT EXISTS idx_genes_tax_id ON genes(tax_id)',
    ],
    insertSql: `INSERT OR REPLACE INTO genes
      (gene_id, symbol, description, tax_id, tax_name, common_name, "type", chromosomes, synonyms, swiss_prot_accessions, ensembl_gene_ids, omim_ids, summary, transcript_count, protein_count, gene_ontology)
      VALUES ($gene_id, $symbol, $description, $tax_id, $tax_name, $common_name, $type, $chromosomes, $synonyms, $swiss_prot_accessions, $ensembl_gene_ids, $omim_ids, $summary, $transcript_count, $protein_count, $gene_ontology)`,
    getRecordSql: 'SELECT * FROM genes WHERE gene_id = $key',
    keyTransform: toIntegerKey,
    serialize: (record) => {
      const r = toRecord(record);
      return {
        gene_id: Number(r['geneId'] ?? 0),
        symbol: String(r['symbol'] ?? ''),
        description: String(r['description'] ?? ''),
        tax_id: Number(r['taxId'] ?? 0),
        tax_name: String(r['taxName'] ?? ''),
        common_name: String(r['commonName'] ?? ''),
        type: String(r['type'] ?? ''),
        chromosomes: JSON.stringify(r['chromosomes'] ?? []),
        synonyms: JSON.stringify(r['synonyms'] ?? []),
        swiss_prot_accessions: JSON.stringify(r['swissProtAccessions'] ?? []),
        ensembl_gene_ids: JSON.stringify(r['ensemblGeneIds'] ?? []),
        omim_ids: JSON.stringify(r['omimIds'] ?? []),
        summary: String(r['summary'] ?? ''),
        transcript_count: Number(r['transcriptCount'] ?? 0),
        protein_count: Number(r['proteinCount'] ?? 0),
        gene_ontology: JSON.stringify(r['geneOntology'] ?? {}),
      };
    },
    deserialize: (row) => ({
      geneId: Number(row['gene_id'] ?? 0),
      symbol: String(row['symbol'] ?? ''),
      description: String(row['description'] ?? ''),
      taxId: Number(row['tax_id'] ?? 0),
      taxName: String(row['tax_name'] ?? ''),
      commonName: String(row['common_name'] ?? ''),
      type: String(row['type'] ?? ''),
      chromosomes: parseJsonArray(row['chromosomes']),
      synonyms: parseJsonArray(row['synonyms']),
      swissProtAccessions: parseJsonArray(row['swiss_prot_accessions']),
      ensemblGeneIds: parseJsonArray(row['ensembl_gene_ids']),
      omimIds: parseJsonArray(row['omim_ids']),
      summary: String(row['summary'] ?? ''),
      transcriptCount: Number(row['transcript_count'] ?? 0),
      proteinCount: Number(row['protein_count'] ?? 0),
      geneOntology: parseJsonObject(row['gene_ontology']),
    }),
  },

  taxonomy: {
    tableName: 'taxonomy',
    createTableSql: `CREATE TABLE IF NOT EXISTS taxonomy (
      tax_id INTEGER PRIMARY KEY,
      organism_name VARCHAR NOT NULL,
      common_name VARCHAR,
      "rank" VARCHAR,
      lineage VARCHAR,
      children VARCHAR,
      counts VARCHAR
    )`,
    createIndexesSql: ['CREATE INDEX IF NOT EXISTS idx_taxonomy_name ON taxonomy(organism_name)'],
    insertSql: `INSERT OR REPLACE INTO taxonomy
      (tax_id, organism_name, common_name, "rank", lineage, children, counts)
      VALUES ($tax_id, $organism_name, $common_name, $rank, $lineage, $children, $counts)`,
    getRecordSql: 'SELECT * FROM taxonomy WHERE tax_id = $key',
    keyTransform: toIntegerKey,
    serialize: (record) => {
      const r = toRecord(record);
      return {
        tax_id: Number(r['taxId'] ?? 0),
        organism_name: String(r['organismName'] ?? ''),
        common_name: String(r['commonName'] ?? ''),
        rank: String(r['rank'] ?? ''),
        lineage: JSON.stringify(r['lineage'] ?? []),
        children: JSON.stringify(r['children'] ?? []),
        counts: JSON.stringify(r['counts'] ?? []),
      };
    },
    deserialize: (row) => ({
      taxId: Number(row['tax_id'] ?? 0),
      organismName: String(row['organism_name'] ?? ''),
      commonName: String(row['common_name'] ?? ''),
      rank: String(row['rank'] ?? ''),
      lineage: parseJsonArray(row['lineage']),
      children: parseJsonArray(row['children']),
      counts: parseJsonArray(row['counts']),
    }),
  },

  compounds: {
    tableName: 'compounds',
    createTableSql: `CREATE TABLE IF NOT EXISTS compounds (
      cid INTEGER PRIMARY KEY,
      canonical_smiles VARCHAR,
      inchi_key VARCHAR,
      iupac_name VARCHAR
    )`,
    createIndexesSql: ['CREATE INDEX IF NOT EXISTS idx_compounds_inchi ON compounds(inchi_key)'],
    insertSql: `INSERT OR REPLACE INTO compounds
      (cid, canonical_smiles, inchi_key, iupac_name)
      VALUES ($cid, $canonical_smiles, $inchi_key, $iupac_name)`,
    getRecordSql: 'SELECT * FROM compounds WHERE cid = $key',
    keyTransform: toIntegerKey,
    serialize: (record) => {
      const r = toRecord(record);
      return {
        cid: Number(r['cid'] ?? 0),
        canonical_smiles: String(r['canonicalSmiles'] ?? ''),
        inchi_key: String(r['inchiKey'] ?? ''),
        iupac_name: String(r['iupacName'] ?? ''),
      };
    },
    deserialize: (row) => ({
      cid: Number(row['cid'] ?? 0),
      canonicalSmiles: String(row['canonical_smiles'] ?? ''),
      inchiKey: String(row['inchi_key'] ?? ''),
      iupacName: String(row['iupac_name'] ?? ''),
    }),
  },

  'id-mappings': {
    tableName: 'id_mappings',
    createTableSql: `CREATE TABLE IF NOT EXISTS id_mappings (
      pmid VARCHAR,
      pmcid VARCHAR,
      doi VARCHAR,
      mid VARCHAR,
      live BOOLEAN,
      release_date VARCHAR
    )`,
    createIndexesSql: [
      'CREATE INDEX IF NOT EXISTS idx_idmap_pmid ON id_mappings(pmid)',
      'CREATE INDEX IF NOT EXISTS idx_idmap_pmcid ON id_mappings(pmcid)',
      'CREATE INDEX IF NOT EXISTS idx_idmap_doi ON id_mappings(doi)',
    ],
    insertSql: `INSERT INTO id_mappings
      (pmid, pmcid, doi, mid, live, release_date)
      VALUES ($pmid, $pmcid, $doi, $mid, $live, $release_date)`,
    getRecordSql:
      'SELECT * FROM id_mappings WHERE pmcid = $key OR pmid = $key OR doi = $key OR mid = $key LIMIT 1',
    keyTransform: toStringKey,
    serialize: (record) => {
      const r = toRecord(record);
      return {
        pmid: toNullableString(r['pmid']),
        pmcid: toNullableString(r['pmcid']),
        doi: toNullableString(r['doi']),
        mid: toNullableString(r['mid']),
        live: Boolean(r['live'] ?? false),
        release_date: String(r['releaseDate'] ?? ''),
      };
    },
    deserialize: (row) => ({
      pmid: row['pmid'] ?? null,
      pmcid: row['pmcid'] ?? null,
      doi: row['doi'] ?? null,
      mid: row['mid'] ?? null,
      live: Boolean(row['live'] ?? false),
      releaseDate: String(row['release_date'] ?? ''),
    }),
  },
};
