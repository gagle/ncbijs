import type { DuckDBConnection } from '@duckdb/node-api';
import type { DatasetSchema } from './dataset-schema';

/** DuckDB-backed sink that writes records to a dataset table. Structurally compatible with @ncbijs/pipeline Sink<T> for any object type. */
export class DuckDbSink {
  private readonly _connection: DuckDBConnection;
  private readonly _schema: DatasetSchema;

  constructor(connection: DuckDBConnection, schema: DatasetSchema) {
    this._connection = connection;
    this._schema = schema;
  }

  public async write(records: ReadonlyArray<object>): Promise<void> {
    if (records.length === 0) {
      return;
    }

    await this._connection.run('BEGIN TRANSACTION');

    try {
      for (const record of records) {
        const params = this._schema.serialize(record as Record<string, unknown>);
        await this._connection.run(this._schema.insertSql, params);
      }
      await this._connection.run('COMMIT');
    } catch (error) {
      await this._connection.run('ROLLBACK');
      throw error;
    }
  }
}
