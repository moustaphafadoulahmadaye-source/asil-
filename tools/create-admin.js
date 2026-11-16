#!/usr/bin/env node
/**
 * ASIL Logistics - First Super Administrator Provisioning CLI
 * Creates or updates the primary super_admin in the SQLite database.
 * Supports both interactive prompt and CLI flags:
 *   --username <user> --email <email> --password <pass> --name <fullname>
 */
const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');
const readline = require('readline');

const DB_PATH = process.env.DB_PATH || process.env.DB_FILE || path.join(__dirname, '..', 'asil.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Ensure users table exists
db.exec(`
  CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT DEFAULT '',
    role TEXT NOT NULL,
    department TEXT DEFAULT '',
    customer_type TEXT DEFAULT '',
    company_name TEXT DEFAULT '',
    status TEXT DEFAULT 'active',
    created INTEGER
  );
  CREATE TABLE IF NOT EXISTS audit_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    action TEXT NOT NULL,
    target_id TEXT NOT NULL,
    operator TEXT DEFAULT 'Super Administrator',
    details TEXT,
    timestamp INTEGER NOT NULL
  );
`);

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

// Parse command line arguments
function parseArgs() {
  const args = process.argv.slice(2);
  const params = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const val = (i + 1 < args.length && !args[i + 1].startsWith('--')) ? args[++i] : 'true';
      params[key] = val;
    }
  }
  return params;
}

const cliArgs = parseArgs();

function askQuestion(rl, query, hidden = false) {
  return new Promise((resolve) => {
    if (hidden && process.stdin.isTTY) {
      process.stdout.write(query);
      const stdin = process.stdin;
      const oldRaw = stdin.isRaw;
      stdin.setRawMode(true);
      stdin.resume();
      let input = '';
      const onData = (char) => {
        char = char + '';
        switch (char) {
          case '\n':
          case '\r':
          case '\u0004':
            stdin.setRawMode(oldRaw);
            stdin.removeListener('data', onData);
            process.stdout.write('\n');
            resolve(input.trim());
            break;
          case '\u0003':
            process.exit(1);
            break;
          case '\u0008':
          case '\x7f':
            if (input.length > 0) {
              input = input.slice(0, -1);
              process.stdout.write('\b \b');
            }
            break;
          default:
            input += char;
            process.stdout.write('*');
            break;
        }
      };
      stdin.on('data', onData);
    } else {
      rl.question(query, (ans) => resolve(ans.trim()));
    }
  });
}

async function main() {
  console.log('====================================================');
  console.log('       ASIL Logistics - Super Admin Provisioning    ');
  console.log('====================================================');
  console.log(`Target Database: ${DB_PATH}\n`);

  let username = cliArgs.username || cliArgs.user || process.env.ADMIN_USERNAME || '';
  let email = cliArgs.email || process.env.ADMIN_EMAIL || '';
  let fullName = cliArgs.name || cliArgs.fullname || process.env.ADMIN_NAME || '';
  let password = cliArgs.password || cliArgs.pass || process.env.ADMIN_PASSWORD || '';
  let phone = cliArgs.phone || process.env.ADMIN_PHONE || '+249 912 000000';

  let rl = null;
  const isInteractive = !username || !email || !password;

  if (isInteractive) {
    rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    if (!username) {
      while (!username) {
        username = await askQuestion(rl, 'Enter Super Admin Username: ');
        if (!username) console.log('Username cannot be empty.');
        else if (!/^[a-zA-Z0-9._-]+$/.test(username)) {
          console.log('Username can only contain letters, numbers, dots, dashes, and underscores.');
          username = '';
        }
      }
    }

    if (!email) {
      while (!email) {
        email = await askQuestion(rl, 'Enter Super Admin Email: ');
        if (!email || !email.includes('@')) {
          console.log('Please enter a valid email address.');
          email = '';
        }
      }
    }

    if (!fullName) {
      fullName = await askQuestion(rl, 'Enter Full Name (e.g. Chief Admin) [Super Administrator]: ');
      if (!fullName) fullName = 'Super Administrator';
    }

    if (!password) {
      while (!password) {
        password = await askQuestion(rl, 'Enter Password (min 10 characters): ', true);
        if (!password || password.length < 10) {
          console.log('Password must be at least 10 characters long.');
          password = '';
        }
      }
    }

    rl.close();
  }

  // Final validation
  if (!username) {
    console.error('Error: Username is required.');
    process.exit(1);
  }
  if (!email || !email.includes('@')) {
    console.error('Error: Valid email is required.');
    process.exit(1);
  }
  if (!password || password.length < 10) {
    console.error('Error: Password must be at least 10 characters long.');
    process.exit(1);
  }
  if (!fullName) fullName = 'Super Administrator';

  username = username.toLowerCase();
  email = email.toLowerCase();

  // Check if username or email already exists
  const existing = db.prepare('SELECT id, username, email, role FROM users WHERE lower(username)=? OR lower(email)=?').get(username, email);
  const now = Date.now();
  const passwordHash = hashPassword(password);

  if (existing) {
    console.log(`\nExisting account found (ID: ${existing.id}, role: ${existing.role}).`);
    console.log(`Updating user '${existing.username}' to super_admin with the new password and details...`);
    db.prepare(`
      UPDATE users
      SET email = ?,
          password_hash = ?,
          full_name = ?,
          phone = ?,
          role = 'super_admin',
          department = 'all',
          status = 'active'
      WHERE id = ?
    `).run(email, passwordHash, fullName, phone, existing.id);

    db.prepare(`
      INSERT INTO audit_logs (action, target_id, operator, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run('Update Super Admin', existing.id, 'CLI Tool', `Updated credentials for super_admin ${username}`, now);

    console.log(`SUCCESS: Super Admin account '${existing.username}' (ID: ${existing.id}) has been updated successfully.`);
  } else {
    const id = 'USR-' + crypto.randomUUID();
    db.prepare(`
      INSERT INTO users (id, username, email, password_hash, full_name, phone, role, department, customer_type, company_name, status, created)
      VALUES (?, ?, ?, ?, ?, ?, 'super_admin', 'all', '', '', 'active', ?)
    `).run(id, username, email, passwordHash, fullName, phone, now);

    db.prepare(`
      INSERT INTO audit_logs (action, target_id, operator, details, timestamp)
      VALUES (?, ?, ?, ?, ?)
    `).run('Create Super Admin', id, 'CLI Tool', `Created initial super_admin ${username}`, now);

    console.log(`SUCCESS: Created Super Admin account '${username}' (ID: ${id}) successfully.`);
  }

  console.log('\nYou can now log in at /admin or /portal with these credentials.');
  process.exit(0);
}

main().catch((err) => {
  console.error('\nFatal Error creating super admin:', err.message);
  process.exit(1);
});
