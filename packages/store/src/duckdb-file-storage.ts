import { DuckDBInstance } from '@duckdb/node-api';
import type { DuckDBConnection, DuckDBValue } from '@duckdb/node-api';
import { DATASET_SCHEMAS } from './dataset-schema';
import { DuckDbSink } from './duckdb-sink';
import type {
  DatasetStats,
  DatasetType,
  FileStorage,
  SearchQuery,
} from './interfaces/storage.interface';

const ALL_DATASET_TYPES: ReadonlyArray<DatasetType> = [
  'mesh',
  'clinvar',
  'genes',
  'taxonomy',
  'compounds',
  'id-mappings',
];

/** DuckDB-backed file storage for NCBI datasets. */
export class DuckDbFileStorage implements FileStorage {
  public readonly path: string;
  private readonly _connection: DuckDBConnection;

  private constructor(path: string, connection: DuckDBConnection) {
    this.path = path;
    this._connection = connection;
  }

  /** Open or create a DuckDB storage at the given path. Use ':memory:' for in-memory storage. */
  public static async open(dbPath: string): Promise<DuckDbFileStorage> {
    const instance = await DuckDBInstance.create(dbPath);
    const connection = await instance.connect();
    const storage = new DuckDbFileStorage(dbPath, connection);
    await storage._initializeSchema();
    return storage;
  }

  /** Write records to a dataset table. Replaces existing records with matching primary keys. */
  public async writeRecords(dataset: DatasetType, records: ReadonlyArray<unknown>): Promise<void> {
    if (records.length === 0) {
      return;
    }

    const schema = DATASET_SCHEMAS[dataset];

    await this._connection.run('BEGIN TRANSACTION');

    try {
      for (const record of records) {
        const params = schema.serialize(record as Record<string, unknown>);
        await this._connection.run(schema.insertSql, params);
      }
      await this._connection.run('COMMIT');
    } catch (error) {
      await this._connection.run('ROLLBACK');
      throw error;
    }
  }

  /** Retrieve a single record by primary key. Returns undefined if not found. */
  public async getRecord<T>(dataset: DatasetType, key: string): Promise<T | undefined> {
    const schema = DATASET_SCHEMAS[dataset];
    const params = schema.keyTransform(key);

    if (params === undefined) {
      return undefined;
    }

    const reader = await this._connection.runAndReadAll(schema.getRecordSql, params);
    const rows = reader.getRowObjectsJS();
    const firstRow = rows[0];

    if (firstRow === undefined) {
      return undefined;
    }

    return schema.deserialize(firstRow as Record<string, unknown>) as T;
  }

  /** Search records by field value with optional operator and limit. */
  public async searchRecords<T>(
    dataset: DatasetType,
    query: SearchQuery,
  ): Promise<ReadonlyArray<T>> {
    const schema = DATASET_SCHEMAS[dataset];
    const columnName = camelToSnake(query.field);
    validateColumnName(columnName);

    const operator = query.operator ?? 'eq';
    let wherePart: string;
    let params: Record<string, DuckDBValue>;

    switch (operator) {
      case 'eq': {
        wherePart = `"${columnName}" = $value`;
        params = { value: query.value };
        break;
      }
      case 'contains': {
        wherePart = `"${columnName}" LIKE $value`;
        params = { value: `%${query.value}%` };
        break;
      }
      case 'starts_with': {
        wherePart = `"${columnName}" LIKE $value`;
        params = { value: `${query.value}%` };
        break;
      }
    }

    let sql = `SELECT * FROM ${schema.tableName} WHERE ${wherePart}`;

    if (query.limit !== undefined) {
      sql += ` LIMIT ${String(query.limit)}`;
    }

    const reader = await this._connection.runAndReadAll(sql, params);
    const rows = reader.getRowObjectsJS();

    return rows.map((row: Record<string, unknown>) => schema.deserialize(row) as T);
  }

  /** Get record counts for all dataset tables. */
  public async getStats(): Promise<ReadonlyArray<DatasetStats>> {
    const stats: Array<DatasetStats> = [];

    for (const dataset of ALL_DATASET_TYPES) {
      const schema = DATASET_SCHEMAS[dataset];
      const reader = await this._connection.runAndReadAll(
        `SELECT COUNT(*) AS record_count FROM ${schema.tableName}`,
      );
      const rows = reader.getRowObjectsJS();
      const firstRow = rows[0];
      const recordCount = firstRow !== undefined ? Number(firstRow['record_count'] ?? 0) : 0;

      stats.push({ dataset, recordCount, sizeBytes: 0 });
    }

    return stats;
  }

  /** Create a sink for writing records to the given dataset via the pipeline API. */
  public createSink(dataset: DatasetType): DuckDbSink {
    return new DuckDbSink(this._connection, DATASET_SCHEMAS[dataset]);
  }

  /** Close the DuckDB connection. */
  public async close(): Promise<void> {
    this._connection.closeSync();
  }

  private async _initializeSchema(): Promise<void> {
    for (const dataset of ALL_DATASET_TYPES) {
      const schema = DATASET_SCHEMAS[dataset];
      await this._connection.run(schema.createTableSql);

      for (const indexSql of schema.createIndexesSql) {
        await this._connection.run(indexSql);
      }
    }
  }
}

function camelToSnake(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function validateColumnName(name: string): void {
  if (!/^[a-z_][a-z0-9_]*$/u.test(name)) {
    throw new Error(`Invalid column name: ${name}`);
  }
}
