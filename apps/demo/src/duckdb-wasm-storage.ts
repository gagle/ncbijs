import * as duckdb from '@duckdb/duckdb-wasm';

const DB_FILE = 'ncbijs.duckdb';

interface QueryResult {
  readonly numRows: number;
  readonly schema: { readonly fields: ReadonlyArray<{ readonly name: string }> };
  readonly getChild: (name: string) => { readonly get: (index: number) => unknown } | null;
}

interface DatasetSchema {
  readonly tableName: string;
  readonly keyColumn: string;
  readonly keyType: 'string' | 'integer';
  readonly multiKeyColumns?: ReadonlyArray<string>;
  readonly deserialize: (row: Record<string, unknown>) => Record<string, unknown>;
}

function parseJsonArray(value: unknown): Array<unknown> {
  if (typeof value !== 'string' || value === '') {
    return [];
  }
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
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

const SCHEMAS: Record<string, DatasetSchema> = {
  mesh: {
    tableName: 'mesh_descriptors',
    keyColumn: 'id',
    keyType: 'string',
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
    keyColumn: 'uid',
    keyType: 'string',
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
    keyColumn: 'gene_id',
    keyType: 'integer',
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
    keyColumn: 'tax_id',
    keyType: 'integer',
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
    keyColumn: 'cid',
    keyType: 'integer',
    deserialize: (row) => ({
      cid: Number(row['cid'] ?? 0),
      canonicalSmiles: String(row['canonical_smiles'] ?? ''),
      inchiKey: String(row['inchi_key'] ?? ''),
      iupacName: String(row['iupac_name'] ?? ''),
    }),
  },

  'id-mappings': {
    tableName: 'id_mappings',
    keyColumn: 'pmid',
    keyType: 'string',
    multiKeyColumns: ['pmid', 'pmcid', 'doi', 'mid'],
    deserialize: (row) => {
      const mid = row['mid'];
      return {
        pmid: row['pmid'] ?? null,
        pmcid: row['pmcid'] ?? null,
        doi: row['doi'] ?? null,
        ...(mid !== null && mid !== undefined && mid !== '' ? { mid: String(mid) } : {}),
      };
    },
  },
};

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function rowToObject(
  result: QueryResult,
  columns: ReadonlyArray<string>,
  rowIndex: number,
): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  for (const column of columns) {
    const columnData = result.getChild(column);
    record[column] = columnData?.get(rowIndex) ?? null;
  }
  return record;
}

export class DuckDbWasmStorage {
  private _connection: duckdb.AsyncDuckDBConnection | undefined;
  private _db: duckdb.AsyncDuckDB | undefined;

  public async getRecord<T>(dataset: string, key: string): Promise<T | undefined> {
    const connection = await this._getConnection();
    const schema = SCHEMAS[dataset];
    if (schema === undefined) {
      return undefined;
    }

    let sql: string;
    if (schema.multiKeyColumns !== undefined) {
      const conditions = schema.multiKeyColumns.map((col) => `${col} = '${escapeValue(key)}'`);
      sql = `SELECT * FROM ${schema.tableName} WHERE ${conditions.join(' OR ')} LIMIT 1`;
    } else if (schema.keyType === 'integer') {
      const numericKey = Number.parseInt(key, 10);
      if (Number.isNaN(numericKey)) {
        return undefined;
      }
      sql = `SELECT * FROM ${schema.tableName} WHERE ${schema.keyColumn} = ${numericKey}`;
    } else {
      sql = `SELECT * FROM ${schema.tableName} WHERE ${schema.keyColumn} = '${escapeValue(key)}'`;
    }

    const result = await connection.query(sql);
    if (result.numRows === 0) {
      return undefined;
    }

    const columns = result.schema.fields.map((field) => field.name);
    const row = rowToObject(result, columns, 0);
    return schema.deserialize(row) as T;
  }

  public async searchRecords<T>(
    dataset: string,
    query: {
      readonly field: string;
      readonly value: string;
      readonly operator?: 'eq' | 'contains' | 'starts_with';
      readonly limit?: number;
    },
  ): Promise<ReadonlyArray<T>> {
    const connection = await this._getConnection();
    const schema = SCHEMAS[dataset];
    if (schema === undefined) {
      return [];
    }

    const columnName = camelToSnake(query.field);
    const operator = query.operator ?? 'eq';
    const escapedValue = escapeValue(query.value);
    let wherePart: string;

    switch (operator) {
      case 'eq': {
        wherePart = `"${columnName}" = '${escapedValue}'`;
        break;
      }
      case 'contains': {
        wherePart = `"${columnName}" ILIKE '%${escapedValue}%'`;
        break;
      }
      case 'starts_with': {
        wherePart = `"${columnName}" LIKE '${escapedValue}%'`;
        break;
      }
    }

    let sql = `SELECT * FROM ${schema.tableName} WHERE ${wherePart}`;
    if (query.limit !== undefined) {
      sql += ` LIMIT ${query.limit}`;
    }

    const result = await connection.query(sql);
    const columns = result.schema.fields.map((field) => field.name);
    const records: Array<T> = [];

    for (let rowIndex = 0; rowIndex < result.numRows; rowIndex++) {
      const row = rowToObject(result, columns, rowIndex);
      records.push(schema.deserialize(row) as T);
    }

    return records;
  }

  private async _getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
    if (this._connection !== undefined) {
      return this._connection;
    }

    const bundles = duckdb.getJsDelivrBundles();
    const bundle = await duckdb.selectBundle(bundles);

    if (bundle.mainWorker === null) {
      throw new Error('DuckDB-Wasm: no suitable worker bundle found');
    }
    const workerResponse = await fetch(bundle.mainWorker);
    const workerBlob = await workerResponse.blob();
    const workerUrl = URL.createObjectURL(workerBlob);
    const worker = new Worker(workerUrl);
    const logger = new duckdb.ConsoleLogger();
    this._db = new duckdb.AsyncDuckDB(logger, worker);
    await this._db.instantiate(bundle.mainModule, bundle.pthreadWorker);

    const dbUrl = `${import.meta.env.BASE_URL}data/${DB_FILE}`;
    const response = await fetch(dbUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch database: ${String(response.status)}`);
    }
    const buffer = new Uint8Array(await response.arrayBuffer());
    await this._db.registerFileBuffer(DB_FILE, buffer);
    await this._db.open({ path: DB_FILE });

    this._connection = await this._db.connect();
    return this._connection;
  }
}

function escapeValue(value: string): string {
  return value.replace(/'/g, "''");
}
