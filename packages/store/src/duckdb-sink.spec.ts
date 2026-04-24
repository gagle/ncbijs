import { DuckDBInstance } from '@duckdb/node-api';
import type { DuckDBConnection } from '@duckdb/node-api';
import { DATASET_SCHEMAS } from './dataset-schema';
import { DuckDbSink } from './duckdb-sink';

describe('DuckDbSink', () => {
  let connection: DuckDBConnection;

  beforeEach(async () => {
    const instance = await DuckDBInstance.create(':memory:');
    connection = await instance.connect();
    await connection.run(DATASET_SCHEMAS.compounds.createTableSql);

    for (const indexSql of DATASET_SCHEMAS.compounds.createIndexesSql) {
      await connection.run(indexSql);
    }
  });

  afterEach(() => {
    connection.closeSync();
  });

  it('writes records to the dataset table', async () => {
    const sink = new DuckDbSink(connection, DATASET_SCHEMAS.compounds);

    await sink.write([
      { cid: 1, canonicalSmiles: 'C', inchiKey: 'K1', iupacName: 'methane' },
      { cid: 2, canonicalSmiles: 'CC', inchiKey: 'K2', iupacName: 'ethane' },
    ]);

    const reader = await connection.runAndReadAll('SELECT COUNT(*) AS cnt FROM compounds');
    const rows = reader.getRowObjectsJS();
    expect(Number(rows[0]?.['cnt'])).toBe(2);
  });

  it('does nothing for empty records array', async () => {
    const sink = new DuckDbSink(connection, DATASET_SCHEMAS.compounds);

    await sink.write([]);

    const reader = await connection.runAndReadAll('SELECT COUNT(*) AS cnt FROM compounds');
    const rows = reader.getRowObjectsJS();
    expect(Number(rows[0]?.['cnt'])).toBe(0);
  });

  it('writes multiple batches sequentially', async () => {
    const sink = new DuckDbSink(connection, DATASET_SCHEMAS.compounds);

    await sink.write([{ cid: 1, canonicalSmiles: 'C', inchiKey: 'K1', iupacName: 'methane' }]);
    await sink.write([{ cid: 2, canonicalSmiles: 'CC', inchiKey: 'K2', iupacName: 'ethane' }]);

    const reader = await connection.runAndReadAll('SELECT COUNT(*) AS cnt FROM compounds');
    const rows = reader.getRowObjectsJS();
    expect(Number(rows[0]?.['cnt'])).toBe(2);
  });

  it('replaces existing records on primary key conflict', async () => {
    const sink = new DuckDbSink(connection, DATASET_SCHEMAS.compounds);

    await sink.write([{ cid: 1, canonicalSmiles: 'C', inchiKey: 'K1', iupacName: 'methane' }]);
    await sink.write([
      { cid: 1, canonicalSmiles: 'CH4', inchiKey: 'K1-new', iupacName: 'methane-updated' },
    ]);

    const reader = await connection.runAndReadAll('SELECT * FROM compounds WHERE cid = 1');
    const rows = reader.getRowObjectsJS();
    expect(rows).toHaveLength(1);
    expect(String(rows[0]?.['iupac_name'])).toBe('methane-updated');
  });

  it('rolls back transaction on error', async () => {
    const sink = new DuckDbSink(connection, DATASET_SCHEMAS.compounds);

    await sink.write([{ cid: 1, canonicalSmiles: 'C', inchiKey: 'K1', iupacName: 'methane' }]);

    const brokenSchema = {
      ...DATASET_SCHEMAS.compounds,
      insertSql: 'INSERT INTO nonexistent_table VALUES ($cid)',
      serialize: (record: Record<string, unknown>) => ({ cid: Number(record['cid'] ?? 0) }),
    };
    const brokenSink = new DuckDbSink(connection, brokenSchema);

    await expect(brokenSink.write([{ cid: 99 }])).rejects.toThrow();

    const reader = await connection.runAndReadAll('SELECT COUNT(*) AS cnt FROM compounds');
    const rows = reader.getRowObjectsJS();
    expect(Number(rows[0]?.['cnt'])).toBe(1);
  });
});

describe('DuckDbFileStorage.createSink', () => {
  it('creates a sink via DuckDbFileStorage convenience method', async () => {
    const { DuckDbFileStorage } = await import('./duckdb-file-storage');
    const storage = await DuckDbFileStorage.open(':memory:');

    const sink = storage.createSink('mesh');

    await sink.write([
      {
        id: 'D000001',
        name: 'Calcimycin',
        treeNumbers: [],
        qualifiers: [],
        pharmacologicalActions: [],
        supplementaryConcepts: [],
      },
    ]);

    const result = await storage.getRecord<Record<string, unknown>>('mesh', 'D000001');
    expect(result?.['name']).toBe('Calcimycin');

    await storage.close();
  });
});
