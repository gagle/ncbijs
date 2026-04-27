import * as duckdb from '@duckdb/duckdb-wasm';

const DB_FILE = 'ncbijs.duckdb';

let db: duckdb.AsyncDuckDB | undefined;
let connection: duckdb.AsyncDuckDBConnection | undefined;

async function getConnection(): Promise<duckdb.AsyncDuckDBConnection> {
  if (connection !== undefined) {
    return connection;
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
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);

  const dbUrl = `${import.meta.env.BASE_URL}data/${DB_FILE}`;
  const response = await fetch(dbUrl);
  if (!response.ok) {
    throw new Error(`Failed to fetch database: ${String(response.status)}`);
  }
  const buffer = new Uint8Array(await response.arrayBuffer());
  await db.registerFileBuffer(DB_FILE, buffer);
  await db.open({ path: DB_FILE });

  connection = await db.connect();
  return connection;
}

export interface LocalResult {
  readonly records: ReadonlyArray<Record<string, unknown>>;
  readonly latencyMs: number;
}

export async function queryLocal(
  sql: string,
  params?: ReadonlyArray<unknown>,
): Promise<LocalResult> {
  const conn = await getConnection();
  const start = performance.now();

  let result: Awaited<ReturnType<typeof conn.query>>;
  if (params !== undefined && params.length > 0) {
    const stmt = await conn.prepare(sql);
    result = await stmt.query(...params);
  } else {
    result = await conn.query(sql);
  }

  const columns = result.schema.fields.map((field) => field.name);
  const records: Array<Record<string, unknown>> = [];

  for (let rowIndex = 0; rowIndex < result.numRows; rowIndex++) {
    const record: Record<string, unknown> = {};
    for (const column of columns) {
      const columnData = result.getChild(column);
      record[column] = columnData?.get(rowIndex) ?? null;
    }
    records.push(record);
  }

  return {
    records,
    latencyMs: performance.now() - start,
  };
}
