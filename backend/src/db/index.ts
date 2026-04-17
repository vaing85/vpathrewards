/**
 * Database adapter — uses PostgreSQL when DATABASE_URL is set, otherwise SQLite.
 * All queries should use $1/$2/… placeholders (PostgreSQL style).
 * The SQLite shim translates them to ? automatically.
 */

import dotenv from 'dotenv';
dotenv.config();

const USE_PG = !!process.env.DATABASE_URL;

// ─── PostgreSQL ───────────────────────────────────────────────────────────────

let pgPool: import('pg').Pool | null = null;

async function getPgPool(): Promise<import('pg').Pool> {
  if (!pgPool) {
    const { Pool } = await import('pg');
    pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      max: 10,
      idleTimeoutMillis: 30000,
    });
    pgPool.on('error', (err) => console.error('PG pool error:', err));
  }
  return pgPool;
}

// ─── SQLite shim ─────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let sqliteDb: any = null;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSqliteDb(): any {
  if (!sqliteDb) {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const sqlite3 = require('sqlite3').verbose();
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const path = require('path');
    const dbPath = path.join(__dirname, '..', '..', 'cashback.db');
    sqliteDb = new sqlite3.Database(dbPath, (err: Error | null) => {
      if (err) console.error('SQLite open error:', err);
      else console.log('SQLite connected:', dbPath);
    });
  }
  return sqliteDb;
}

/** Translate $1/$2/… → ? for SQLite */
function pgToSqlite(sql: string): string {
  return sql.replace(/\$\d+/g, '?');
}

// ─── Unified query helpers ────────────────────────────────────────────────────

/** Run an INSERT/UPDATE/DELETE; returns { lastID, rowCount } */
export async function dbRun(
  sql: string,
  params: unknown[] = []
): Promise<{ lastID?: number; rowCount?: number }> {
  if (USE_PG) {
    const pool = await getPgPool();
    // Append RETURNING id for INSERT statements so we can surface lastID
    const isInsert = /^\s*INSERT/i.test(sql);
    const finalSql = isInsert && !/RETURNING/i.test(sql) ? `${sql} RETURNING id` : sql;
    const result = await pool.query(finalSql, params);
    return { lastID: result.rows[0]?.id, rowCount: result.rowCount ?? 0 };
  }

  const db = getSqliteDb();
  return new Promise((resolve, reject) => {
    db.run(pgToSqlite(sql), params, function (this: { lastID: number; changes: number }, err: Error | null) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, rowCount: this.changes });
    });
  });
}

/** Return a single row or undefined */
export async function dbGet<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T | undefined> {
  if (USE_PG) {
    const pool = await getPgPool();
    const result = await pool.query(sql, params);
    return result.rows[0] as T | undefined;
  }

  const db = getSqliteDb();
  return new Promise((resolve, reject) => {
    db.get(pgToSqlite(sql), params, (err: Error | null, row: T) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/** Return multiple rows */
export async function dbAll<T = Record<string, unknown>>(
  sql: string,
  params: unknown[] = []
): Promise<T[]> {
  if (USE_PG) {
    const pool = await getPgPool();
    const result = await pool.query(sql, params);
    return result.rows as T[];
  }

  const db = getSqliteDb();
  return new Promise((resolve, reject) => {
    db.all(pgToSqlite(sql), params, (err: Error | null, rows: T[]) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/** Run multiple statements in a transaction */
export async function dbTransaction(
  fn: (q: typeof dbRun) => Promise<void>
): Promise<void> {
  if (USE_PG) {
    const pool = await getPgPool();
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const txRun: typeof dbRun = (sql, params = []) =>
        client.query(sql, params).then((r) => ({ lastID: r.rows[0]?.id, rowCount: r.rowCount ?? 0 }));
      await fn(txRun);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    const db = getSqliteDb();
    await new Promise<void>((resolve, reject) => db.serialize(() => {
      db.run('BEGIN');
      fn(dbRun).then(() => { db.run('COMMIT'); resolve(); })
        .catch((err) => { db.run('ROLLBACK'); reject(err); });
    }));
  }
}

export { USE_PG };
