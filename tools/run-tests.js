#!/usr/bin/env node
/**
 * ASIL Logistics - Automated Test Suite Runner
 * Spawns an isolated test server against a fresh temporary SQLite database,
 * executes all verification suites, and performs automatic cleanup.
 */
const { spawn, fork } = require('child_process');
const path = require('path');
const fs = require('fs');
const http = require('http');

const TEST_PORT = process.env.TEST_PORT || '3899';
const TEMP_DB_NAME = `test_temp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}.db`;
const TEMP_DB_PATH = path.join(__dirname, '..', TEMP_DB_NAME);

const testSuites = [
  { name: 'Complete Platform Audit (12 Scenarios + Security/Uploads)', file: 'test_complete_platform.js' },
  { name: 'All Departments & Dedicated Page Routes', file: 'test_all_departments.js' },
  { name: 'Department APIs & RBAC Access Matrix', file: 'test_departments_api.js' },
  { name: 'Customer Tracking Portal & Public Privacy', file: 'test_tracking_portal.js' },
  { name: 'Cargo & Freight Multi-Part Uploads & Statuses', file: 'test_cargo_full.js' },
  { name: 'Admin Operations & Fleet Endpoints', file: 'test_admin_endpoints.js' },
  { name: 'Admin Views & Management Console', file: 'test_admin_views_full.js' },
  { name: 'Customer Inquiries & Admin Inquiries Management', file: 'test_inquiries.js' },
  { name: 'Business Flow, Quotes, Locations & RBAC Security', file: 'test_booking_flow.js' },
  { name: 'Frontend HTML & SEO Structure', file: 'verify_frontend_html.js' },
  { name: 'Frontend Views VM Sandbox Simulation', file: 'verify_frontend_views.js' }
];

let serverProcess = null;

function cleanup() {
  if (serverProcess) {
    try {
      if (process.platform === 'win32' && serverProcess.pid) {
        try { require('child_process').execSync(`taskkill /pid ${serverProcess.pid} /T /F`, { stdio: 'ignore' }); } catch (_) { }
      } else {
        serverProcess.kill('SIGKILL');
      }
    } catch (_) { }
    serverProcess = null;
  }
  // Remove temporary database files and any test_temp_* remnants
  const rootDir = path.join(__dirname, '..');
  try {
    const files = fs.readdirSync(rootDir);
    for (const f of files) {
      if (f.startsWith('test_temp_') && (f.endsWith('.db') || f.endsWith('.db-wal') || f.endsWith('.db-shm'))) {
        try { fs.unlinkSync(path.join(rootDir, f)); } catch (_) { }
      }
    }
  } catch (_) { }
}

process.on('SIGINT', () => { cleanup(); process.exit(1); });
process.on('SIGTERM', () => { cleanup(); process.exit(1); });
process.on('exit', cleanup);

function waitForServer(port, maxAttempts = 60) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const interval = setInterval(() => {
      attempts++;
      const req = http.get(`http://localhost:${port}/api/health`, (res) => {
        if (res.statusCode === 200) {
          clearInterval(interval);
          resolve();
        }
      });
      req.on('error', (err) => {
        if (attempts >= maxAttempts) {
          clearInterval(interval);
          reject(new Error(`Test server failed to start on port ${port} after ${maxAttempts} attempts: ${err.message}`));
        }
      });
      req.end();
    }, 250);
  });
}

function runScript(scriptPath, env) {
  return new Promise((resolve) => {
    const startTime = Date.now();
    const proc = fork(scriptPath, [], {
      env: { ...process.env, ...env },
      stdio: 'inherit'
    });
    proc.on('exit', (code) => {
      resolve({
        code,
        duration: ((Date.now() - startTime) / 1000).toFixed(2)
      });
    });
    proc.on('error', (err) => {
      console.error(`Error running script ${scriptPath}:`, err);
      resolve({ code: 1, duration: 0 });
    });
  });
}

async function main() {
  console.log('===============================================================');
  console.log('            ASIL LOGISTICS - UNIFIED TEST RUNNER              ');
  console.log('===============================================================');
  console.log(`Temporary Database : ${TEMP_DB_NAME}`);
  console.log(`Isolated Test Port : ${TEST_PORT}\n`);

  const env = {
    NODE_ENV: 'test',
    DB_PATH: TEMP_DB_PATH,
    PORT: TEST_PORT,
    BASE_URL: `http://localhost:${TEST_PORT}`,
    SEED_DEMO: 'true',
    SESSION_SECRET: 'asil-test-secret-suite-key-2026',
    ADMIN_USER: 'admin',
    ADMIN_PASSWORD: 'admin123'
  };

  // 1. Run Migration to populate initial schema & users
  console.log('[1/3] Running initial database schema migration & seeding...');
  const migResult = await runScript(path.join(__dirname, 'run_migration.js'), env);
  if (migResult.code !== 0) {
    console.error('Database migration failed.');
    cleanup();
    process.exit(1);
  }

  // 2. Start Test Server
  console.log('\n[2/3] Starting isolated test server process on port ' + TEST_PORT + '...');
  serverProcess = spawn(process.execPath, [path.join(__dirname, '..', 'server.js')], {
    env: { ...process.env, ...env },
    stdio: 'ignore'
  });

  await waitForServer(TEST_PORT);
  console.log('Test server ready and healthy at http://localhost:' + TEST_PORT);

  // 3. Execute all test suites in sequence
  console.log('\n[3/3] Executing test suites...\n');
  const results = [];
  let allPassed = true;

  for (const suite of testSuites) {
    console.log(`\n---------------------------------------------------------------`);
    console.log(`>>> RUNNING: ${suite.name} (${suite.file})`);
    console.log(`---------------------------------------------------------------`);
    const scriptPath = path.join(__dirname, suite.file);
    const res = await runScript(scriptPath, env);
    const passed = res.code === 0;
    if (!passed) allPassed = false;
    results.push({ name: suite.name, file: suite.file, passed, duration: res.duration });
  }

  // 4. Print Summary
  console.log('\n===============================================================');
  console.log('                     TEST EXECUTION REPORT                     ');
  console.log('===============================================================');
  for (const r of results) {
    const icon = r.passed ? 'PASS' : 'FAIL';
    const fill = ' '.repeat(Math.max(1, 55 - r.name.length));
    console.log(` [${icon}] ${r.name}${fill}(${r.duration}s)`);
  }
  console.log('===============================================================');

  cleanup();

  if (allPassed) {
    console.log(`\nALL ${results.length} TEST SUITES PASSED SUCCESSFULLY! Cleaned up temporary test database.\n`);
    process.exit(0);
  } else {
    console.error(`\nSOME TESTS FAILED! Check logs above.\n`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Fatal test runner error:', err);
  cleanup();
  process.exit(1);
});
