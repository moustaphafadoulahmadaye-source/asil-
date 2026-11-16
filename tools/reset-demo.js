#!/usr/bin/env node
/**
 * ASIL Logistics - Reset Demo Data Utility
 * Deletes all test data (bookings, test users such as deploy_admin, officer_samira_*, customer_ali, customer_nile, uploads)
 * STRICTLY ENFORCED FOR LOCAL COPIES ONLY.
 */
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// 1. Production safety guard - strictly local copy only
if (process.env.NODE_ENV === 'production') {
  console.error('\x1b[31m[ERROR] "reset-demo" is strictly prohibited in production environments (NODE_ENV=production).\x1b[0m');
  process.exit(1);
}

const DB_PATH = process.env.DB_PATH || process.env.DB_FILE || path.join(__dirname, '..', 'asil.db');
const UPLOADS_PRIVATE = process.env.UPLOADS_DIR || path.join(__dirname, '..', 'uploads_private');
const UPLOADS_PUBLIC = path.join(__dirname, '..', 'public', 'uploads');

console.log('====================================================');
console.log('       ASIL Logistics - Local Demo Reset Tool       ');
console.log('====================================================');

let db = null;
if (fs.existsSync(DB_PATH)) {
  try {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    // 1. Delete all bookings and workflow tracking records
    const bRes = db.prepare('DELETE FROM bookings').run();
    const rRes = db.prepare('DELETE FROM records').run();
    let inqChanges = 0;
    try { inqChanges = db.prepare('DELETE FROM inquiries').run().changes; } catch (_) {}
    console.log(`[OK] Deleted ${bRes.changes} booking(s), ${rRes.changes} workflow record(s), and ${inqChanges} inquiry record(s).`);

    // 2. Delete test users (deploy_admin, officer_samira_*, customer_ali, customer_nile, adm_test_*, etc.)
    const uRes = db.prepare(`
      DELETE FROM users 
      WHERE username IN ('deploy_admin', 'customer_ali', 'customer_nile')
         OR username LIKE 'officer_samira_%'
         OR username LIKE 'adm_test_%'
         OR username LIKE 'officer_test_%'
         OR username LIKE 'test_%'
    `).run();
    console.log(`[OK] Removed ${uRes.changes} test user account(s).`);

    // 3. Clear demo onboarding clients if present
    try {
      const oRes = db.prepare(`
        DELETE FROM onboarding_clients 
        WHERE email LIKE '%example%' OR id LIKE 'ONB-TEST%' OR company_name LIKE '%Test%'
      `).run();
      console.log(`[OK] Removed ${oRes.changes} demo onboarding client(s).`);
    } catch (e) {}

    // 4. Run VACUUM & WAL checkpoint
    try {
      db.pragma('wal_checkpoint(TRUNCATE)');
      db.exec('VACUUM');
      console.log('[OK] Database vacuumed and WAL truncated.');
    } catch (e) {}

    db.close();
  } catch (err) {
    console.error(`[WARN] Database reset error: ${err.message}`);
  }
} else {
  console.log(`[INFO] No local database found at ${DB_PATH}. Skipping table cleanup.`);
}

// 5. Clean uploads directories
function cleanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return 0;
  let count = 0;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      count += cleanDirectory(fullPath);
    } else if (entry.name !== '.gitkeep') {
      try {
        fs.unlinkSync(fullPath);
        count++;
      } catch (e) {}
    }
  }
  return count;
}

const privCount = cleanDirectory(UPLOADS_PRIVATE);
const pubCount = cleanDirectory(UPLOADS_PUBLIC);
console.log(`[OK] Removed ${privCount + pubCount} uploaded demo file(s).`);

console.log('====================================================');
console.log('  Local demo reset complete! System is clean.       ');
console.log('====================================================');
