/**
 * Phase 4: Run database migrations.
 * Usage: node run-migrations.js
 * Run from backend directory. Uses backend/cashback.db by default.
 */

const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'cashback.db');
const migrationsDir = path.join(__dirname, 'migrations');

if (!fs.existsSync(dbPath)) {
  console.error('Database not found at', dbPath);
  console.error('Start the server once to create the database, then run migrations.');
  process.exit(1);
}

const db = new sqlite3.Database(dbPath);

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
}

function get(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

async function ensureMigrationsTable() {
  await run(
    'CREATE TABLE IF NOT EXISTS schema_migrations (version INTEGER PRIMARY KEY, name TEXT NOT NULL, applied_at DATETIME DEFAULT CURRENT_TIMESTAMP)'
  );
}

async function getAppliedVersions() {
  try {
    const rows = await new Promise((resolve, reject) => {
      db.all('SELECT version FROM schema_migrations ORDER BY version', [], (err, rows) => {
        if (err) reject(err);
        else resolve(rows || []);
      });
    });
    return new Set(rows.map((r) => r.version));
  } catch (e) {
    return new Set();
  }
}

async function main() {
  await ensureMigrationsTable();
  const files = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const applied = await getAppliedVersions();
  let runCount = 0;
  for (const file of files) {
    const match = file.match(/^(\d+)_(.+)\.sql$/);
    if (!match) continue;
    const version = parseInt(match[1], 10);
    const name = match[2];
    if (applied.has(version)) continue;
    const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    const statements = sql.split(';').map((s) => s.trim()).filter(Boolean);
    for (const statement of statements) {
      if (statement) await run(statement + ';');
    }
    await run('INSERT OR IGNORE INTO schema_migrations (version, name) VALUES (?, ?)', [version, name]);
    console.log('Applied migration:', file);
    runCount++;
  }
  if (runCount === 0) console.log('No new migrations to run.');
  db.close();
}

main()
  .catch((err) => {
    console.error('Migration failed:', err);
    db.close();
    process.exit(1);
  });
