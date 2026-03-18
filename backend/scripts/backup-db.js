/**
 * Phase 4: Backup SQLite database.
 * Usage: node scripts/backup-db.js [backupDir]
 * Copies backend/cashback.db to backupDir (default: backend/backups) with timestamp.
 */

const fs = require('fs');
const path = require('path');

const backendDir = path.join(__dirname, '..');
const dbPath = path.join(backendDir, 'cashback.db');
const defaultBackupDir = path.join(backendDir, 'backups');
const backupDir = process.argv[2] ? path.resolve(process.argv[2]) : defaultBackupDir;

if (!fs.existsSync(dbPath)) {
  console.error('Database not found:', dbPath);
  process.exit(1);
}

if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir, { recursive: true });
}

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupFile = path.join(backupDir, `cashback-${timestamp}.db`);
fs.copyFileSync(dbPath, backupFile);
console.log('Backup created:', backupFile);
