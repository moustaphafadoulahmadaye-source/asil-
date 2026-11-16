#!/usr/bin/env node
/**
 * ASIL Logistics - SQLite Safe Database Backup
 * Uses better-sqlite3 native online backup API (db.backup) to snapshot
 * without blocking active WAL readers/writers.
 * Stores backups in ./backups with timestamps and retains the 14 most recent.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DB_PATH = process.env.DB_PATH || process.env.DB_FILE || path.join(__dirname, '..', 'asil.db');
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(__dirname, '..', 'backups');
const MAX_BACKUPS = 14;

async function runBackup() {
  console.log('====================================================');
  console.log('         ASIL Logistics - Database Backup Tool      ');
  console.log('====================================================');
  console.log(`Source Database: ${DB_PATH}`);

  if (!fs.existsSync(DB_PATH)) {
    console.error(`Error: Source database does not exist at ${DB_PATH}`);
    process.exit(1);
  }

  // Ensure destination directory exists
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
    console.log(`Created backup directory: ${BACKUP_DIR}`);
  }

  // Format timestamp: YYYY-MM-DD_HH-mm-ss
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  const backupFileName = `asil-backup-${timestamp}.db`;
  const backupFilePath = path.join(BACKUP_DIR, backupFileName);

  console.log(`Target Backup File: ${backupFileName}`);

  // Connect to source database in read-only mode to perform safe online snapshot
  let db;
  try {
    db = new Database(DB_PATH, { fileMustExist: true });
    
    // Check WAL checkpoint or run backup API
    console.log('Initiating online SQLite backup...');
    let lastProgress = 0;
    await db.backup(backupFilePath, {
      progress({ totalPages, remainingPages }) {
        const percent = Math.round(((totalPages - remainingPages) / totalPages) * 100);
        if (percent >= lastProgress + 25 || percent === 100) {
          console.log(`Backup progress: ${percent}% (${totalPages - remainingPages}/${totalPages} pages)`);
          lastProgress = percent;
        }
      }
    });

    const stats = fs.statSync(backupFilePath);
    const sizeKB = (stats.size / 1024).toFixed(2);
    console.log(`Backup completed successfully! (${sizeKB} KB)`);
  } catch (err) {
    console.error('Backup failed:', err.message);
    if (fs.existsSync(backupFilePath)) {
      try { fs.unlinkSync(backupFilePath); } catch (_) {}
    }
    process.exit(1);
  } finally {
    if (db) {
      try { db.close(); } catch (_) {}
    }
  }

  // Pruning: keep only the last MAX_BACKUPS (14)
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter((f) => f.startsWith('asil-backup-') && f.endsWith('.db'))
      .map((f) => {
        const fp = path.join(BACKUP_DIR, f);
        return { name: f, path: fp, time: fs.statSync(fp).mtimeMs };
      })
      .sort((a, b) => b.time - a.time); // newest first

    console.log(`\nTotal backups currently in storage: ${files.length} (Max retained: ${MAX_BACKUPS})`);

    if (files.length > MAX_BACKUPS) {
      const toDelete = files.slice(MAX_BACKUPS);
      console.log(`Pruning ${toDelete.length} older backup(s)...`);
      for (const item of toDelete) {
        fs.unlinkSync(item.path);
        console.log(` - Removed old backup: ${item.name}`);
      }
    }

    console.log('Backup routine finished clean.');
  } catch (pruneErr) {
    console.error('Warning during backup pruning:', pruneErr.message);
  }
}

runBackup().catch((e) => {
  console.error('Fatal backup error:', e);
  process.exit(1);
});
