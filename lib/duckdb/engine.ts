import * as duckdb from '@duckdb/duckdb-wasm';
import type { QueryResult } from '@/types';

let db: duckdb.AsyncDuckDB | null = null;

async function getDB(): Promise<duckdb.AsyncDuckDB> {
  if (db) return db;

  const bundles = duckdb.getJsDelivrBundles();
  const bundle = await duckdb.selectBundle(bundles);

  // Blob URL approach works reliably in bundled environments
  const workerUrl = URL.createObjectURL(
    new Blob([`importScripts("${bundle.mainWorker!}");`], { type: 'text/javascript' })
  );

  const worker = new Worker(workerUrl);
  const logger = new duckdb.ConsoleLogger();
  db = new duckdb.AsyncDuckDB(logger, worker);
  await db.instantiate(bundle.mainModule, bundle.pthreadWorker);
  URL.revokeObjectURL(workerUrl);

  return db;
}

export async function registerCsvFile(name: string, content: string): Promise<void> {
  const database = await getDB();
  await database.registerFileText(`${name}.csv`, content);
}

export async function loadCsv(tableName: string, csvContent: string): Promise<void> {
  const database = await getDB();
  const fileName = `${tableName}.csv`;
  await database.registerFileText(fileName, csvContent);
  const conn = await database.connect();
  try {
    await conn.query(
      `CREATE OR REPLACE TABLE ${tableName} AS SELECT * FROM read_csv_auto('${fileName}')`
    );
  } finally {
    await conn.close();
  }
}

export async function runSQL(sql: string): Promise<void> {
  const database = await getDB();
  const conn = await database.connect();
  try {
    await conn.query(sql);
  } finally {
    await conn.close();
  }
}

export async function querySQL(sql: string): Promise<QueryResult> {
  const database = await getDB();
  const conn = await database.connect();
  try {
    const result = await conn.query(sql);
    const fields = result.schema.fields;
    const rows = result.toArray().map(row => {
      const obj: Record<string, unknown> = {};
      for (const field of fields) {
        const val = (row as Record<string, unknown>)[field.name];
        obj[field.name] = val ?? null;
      }
      return obj;
    });
    return { columns: fields.map(f => f.name), rows, rowCount: result.numRows, error: null };
  } catch (e) {
    return { columns: [], rows: [], rowCount: 0, error: String(e) };
  } finally {
    await conn.close();
  }
}
