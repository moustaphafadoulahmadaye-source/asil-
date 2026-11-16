const Database = require('better-sqlite3');
const crypto = require('crypto');
const path = require('path');

const DB_PATH = process.env.DB_PATH || process.env.DB_FILE || path.join(__dirname, '..', 'asil.db');
const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users(
    id TEXT PRIMARY KEY, username TEXT UNIQUE NOT NULL, email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL, full_name TEXT NOT NULL, phone TEXT DEFAULT '',
    role TEXT NOT NULL, department TEXT DEFAULT '', customer_type TEXT DEFAULT '',
    company_name TEXT DEFAULT '', status TEXT DEFAULT 'active', created INTEGER,
    session_version INTEGER DEFAULT 1, email_verified INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS facility_assets(
    id TEXT PRIMARY KEY, building_name TEXT NOT NULL, location TEXT NOT NULL,
    zone TEXT NOT NULL, facility_type TEXT NOT NULL, status TEXT DEFAULT 'Operational',
    notes TEXT DEFAULT '', created INTEGER);
  CREATE TABLE IF NOT EXISTS technicians(
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL,
    specialty TEXT NOT NULL, status TEXT DEFAULT 'Available',
    experience_years INTEGER DEFAULT 5, created INTEGER);
  CREATE TABLE IF NOT EXISTS onboarding_clients(
    id TEXT PRIMARY KEY, customer_type TEXT NOT NULL, full_name TEXT NOT NULL,
    company_name TEXT DEFAULT '', email TEXT NOT NULL, phone TEXT NOT NULL,
    contact_person TEXT DEFAULT '', company_reg TEXT DEFAULT '', tax_id TEXT DEFAULT '',
    billing_address TEXT DEFAULT '', status TEXT DEFAULT 'Pending',
    docs TEXT DEFAULT '[]', internal_notes TEXT DEFAULT '', created INTEGER, updated INTEGER);
  CREATE TABLE IF NOT EXISTS bookings(
    id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
    departure TEXT NOT NULL, destination TEXT NOT NULL, travel_date TEXT NOT NULL,
    departure_time TEXT NOT NULL, passengers INTEGER NOT NULL, vehicle_pref TEXT NOT NULL,
    luggage TEXT, instructions TEXT, created INTEGER NOT NULL,
    status TEXT DEFAULT 'Pending', assigned_vehicle TEXT DEFAULT '',
    assigned_driver TEXT DEFAULT '', internal_notes TEXT DEFAULT '', updated INTEGER,
    customer_type TEXT DEFAULT 'individual', company_name TEXT DEFAULT '',
    contact_person TEXT DEFAULT '', company_reg TEXT DEFAULT '', billing_details TEXT DEFAULT '',
    booking_category TEXT DEFAULT 'passenger', cargo_type TEXT DEFAULT '',
    cargo_desc TEXT DEFAULT '', packages_count INTEGER DEFAULT 1, cargo_weight TEXT DEFAULT '',
    cargo_dimensions TEXT DEFAULT '', special_handling TEXT DEFAULT '', cargo_docs TEXT DEFAULT '',
    delivery_date TEXT DEFAULT '', user_id TEXT DEFAULT NULL);
  CREATE TABLE IF NOT EXISTS inquiries(
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
    department TEXT DEFAULT 'general', message TEXT NOT NULL, status TEXT DEFAULT 'new',
    created INTEGER NOT NULL, updated INTEGER, category TEXT DEFAULT 'contact');
  CREATE TABLE IF NOT EXISTS page_views(
    id INTEGER PRIMARY KEY AUTOINCREMENT, path TEXT NOT NULL, visitor_hash TEXT NOT NULL,
    is_customer INTEGER DEFAULT 0, user_id TEXT DEFAULT NULL, referrer TEXT DEFAULT '',
    created INTEGER NOT NULL);
  CREATE INDEX IF NOT EXISTS idx_page_views_created ON page_views(created);
  CREATE INDEX IF NOT EXISTS idx_page_views_path ON page_views(path);
  CREATE INDEX IF NOT EXISTS idx_page_views_hash ON page_views(visitor_hash);
  CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON bookings(user_id);
  CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
  CREATE INDEX IF NOT EXISTS idx_bookings_created ON bookings(created);
  CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
  CREATE INDEX IF NOT EXISTS idx_inquiries_status ON inquiries(status);
  CREATE TABLE IF NOT EXISTS locations(
    id TEXT PRIMARY KEY, name TEXT NOT NULL, country TEXT NOT NULL,
    type TEXT NOT NULL, lat REAL, lng REAL, active INTEGER DEFAULT 1);
  CREATE TABLE IF NOT EXISTS routes(
    id TEXT PRIMARY KEY, origin_location_id TEXT NOT NULL, destination_location_id TEXT NOT NULL,
    mode TEXT NOT NULL, transit_days_min INTEGER NOT NULL, transit_days_max INTEGER NOT NULL,
    price_from REAL DEFAULT NULL, currency TEXT DEFAULT 'USD', active INTEGER DEFAULT 1,
    notes TEXT DEFAULT '',
    FOREIGN KEY(origin_location_id) REFERENCES locations(id),
    FOREIGN KEY(destination_location_id) REFERENCES locations(id));
`);

// Column migrations for bookings
try {
  const bCols = db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name);
  if (!bCols.includes('origin_location_id')) db.exec("ALTER TABLE bookings ADD COLUMN origin_location_id TEXT DEFAULT NULL");
  if (!bCols.includes('destination_location_id')) db.exec("ALTER TABLE bookings ADD COLUMN destination_location_id TEXT DEFAULT NULL");
  if (!bCols.includes('transport_mode')) db.exec("ALTER TABLE bookings ADD COLUMN transport_mode TEXT DEFAULT NULL");
  if (!bCols.includes('route_id')) db.exec("ALTER TABLE bookings ADD COLUMN route_id TEXT DEFAULT NULL");
  if (!bCols.includes('goods_origin_country')) db.exec("ALTER TABLE bookings ADD COLUMN goods_origin_country TEXT DEFAULT ''");
  if (!bCols.includes('pickup_address')) db.exec("ALTER TABLE bookings ADD COLUMN pickup_address TEXT DEFAULT ''");
  if (!bCols.includes('delivery_address')) db.exec("ALTER TABLE bookings ADD COLUMN delivery_address TEXT DEFAULT ''");
  if (!bCols.includes('eta_min_date')) db.exec("ALTER TABLE bookings ADD COLUMN eta_min_date TEXT DEFAULT ''");
  if (!bCols.includes('eta_max_date')) db.exec("ALTER TABLE bookings ADD COLUMN eta_max_date TEXT DEFAULT ''");
  if (!bCols.includes('quoted_price')) db.exec("ALTER TABLE bookings ADD COLUMN quoted_price REAL DEFAULT NULL");
  if (!bCols.includes('currency')) db.exec("ALTER TABLE bookings ADD COLUMN currency TEXT DEFAULT 'USD'");

  const inqCols = db.prepare("PRAGMA table_info(inquiries)").all().map(c => c.name);
  if (!inqCols.includes('category')) db.exec("ALTER TABLE inquiries ADD COLUMN category TEXT DEFAULT 'contact'");
  db.exec("CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries(category)");
} catch (e) {
  console.error('Migration column notice:', e.message);
}

function hashPw(pw) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(pw), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}
const now = Date.now();

// 1. Seed users if empty
const uCount = db.prepare('SELECT count(*) as c FROM users').get().c;
if (uCount === 0) {
  const insertU = db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, phone, role, department, customer_type, company_name, status, created, session_version, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, 1, 1)
  `);
  insertU.run('USR-001', 'admin', 'admin@asillogistics.sd', hashPw('admin123'), 'Super Administrator', '+249 183 770 000', 'super_admin', 'all', '', 'ASIL Logistics Head Office', now);
  insertU.run('USR-002', 'officer_transport', 'transport@asillogistics.sd', hashPw('transport123'), 'Tariq Mansoor (Fleet Dispatcher)', '+249 912 301 001', 'dept_transport', 'transport', '', '', now);
  insertU.run('USR-003', 'officer_distribution', 'cargo@asillogistics.sd', hashPw('distrib123'), 'Ibrahim Khalil (Freight Manager)', '+249 912 301 002', 'dept_distribution', 'distribution', '', '', now);
  insertU.run('USR-004', 'officer_maintenance', 'maintenance@asillogistics.sd', hashPw('maint123'), 'Eng. Kamal Idris (Facilities Chief)', '+249 912 301 003', 'dept_maintenance', 'maintenance', '', '', now);
  insertU.run('USR-005', 'officer_onboarding', 'onboarding@asillogistics.sd', hashPw('onboard123'), 'Sara Al-Mahdi (Client Relations)', '+249 912 301 004', 'dept_onboarding', 'onboarding', '', '', now);
  insertU.run('CUST-001', 'customer_ali', 'ali.babiker@example.sd', hashPw('customer123'), 'Ali Babiker', '+249 912 990 011', 'customer', '', 'individual', '', now);
  insertU.run('CUST-002', 'customer_nile', 'supplychain@nileagro.sd', hashPw('customer123'), 'Eng. Mariam El-Sayed', '+249 183 998 877', 'customer', '', 'company', 'Nile Agro Industries Ltd', now);
  console.log('Seeded users table successfully!');
}

// 2. Seed facility assets
const fCount = db.prepare('SELECT count(*) as c FROM facility_assets').get().c;
if (fCount === 0) {
  const insertF = db.prepare(`INSERT INTO facility_assets (id, building_name, location, zone, facility_type, status, notes, created) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
  insertF.run('FAC-001', 'ASIL Headquarters Complex', 'Al-Riyadh, Nile Avenue, Khartoum', 'Zone A - Executive', 'Corporate Headquarters & Logistics Operations Room', 'Operational', 'Backup generator and fiber telecom links fully operational.', now);
  insertF.run('FAC-002', 'Port Sudan Marine Logistics Terminal', 'Free Zone Berth 7, Port Sudan Maritime Port', 'Zone B - Maritime Free Zone', 'Heavy Cargo Freight Terminal & Container Yard', 'Operational', 'Continuous bonded customs clearance and weighbridge station.', now);
  insertF.run('FAC-003', 'Khartoum North Cold-Chain Warehouse', 'Industrial Area Sector 3, North Khartoum', 'Zone C - Temperature Controlled', 'Pharmaceutical & Food Cold Storage (-25°C to +15°C)', 'Operational', 'Dual refrigeration chillers with automated IoT temperature telemetry.', now);
  insertF.run('FAC-004', 'Al-Gezira Agro Processing Facility', 'Agricultural Corridor, Wad Madani', 'Zone D - Agricultural', 'Bulk Grains & Sesame Seed Packaging Plant', 'Maintenance Due', 'Quarterly conveyor belt servicing and dust suppression scheduled.', now);
  console.log('Seeded facility_assets table successfully!');
}

// 3. Seed technicians
const tCount = db.prepare('SELECT count(*) as c FROM technicians').get().c;
if (tCount === 0) {
  const insertT = db.prepare(`INSERT INTO technicians (id, name, phone, specialty, status, experience_years, created) VALUES (?, ?, ?, ?, ?, ?, ?)`);
  insertT.run('TECH-001', 'Eng. Kamal Mansoor', '+249 912 300 111', 'Industrial HVAC & Cold Storage Refrigeration', 'Available', 11, now);
  insertT.run('TECH-002', 'Omer Al-Hassan', '+249 922 400 222', 'Commercial High-Voltage & Heavy Backup Generators', 'Available', 8, now);
  insertT.run('TECH-003', 'Ibrahim Suliman', '+249 915 500 333', 'Hydraulics, Plumbing & Fire Suppression Systems', 'On Duty', 6, now);
  insertT.run('TECH-004', 'Tariq Idris', '+249 918 600 444', 'Structural Civil Works & Automated Gates/Security', 'Available', 7, now);
  console.log('Seeded technicians table successfully!');
}

// 4. Seed onboarding clients
const oCount = db.prepare('SELECT count(*) as c FROM onboarding_clients').get().c;
if (oCount === 0) {
  const insertO = db.prepare(`INSERT INTO onboarding_clients (id, customer_type, full_name, company_name, email, phone, contact_person, company_reg, tax_id, billing_address, status, docs, internal_notes, created, updated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
  insertO.run('ONB-001', 'company', 'Sudan Heavy Industries Ltd', 'Sudan Heavy Industries Ltd', 'corp@shi.sd', '+249 183 445566', 'Eng. Mona Hassan', 'CR-KRT-99881', 'TAX-88902', 'Khartoum North Industrial Area Gate 2', 'Approved', '[]', 'Verified corporate trade license and tax clearance certificate.', now, now);
  insertO.run('ONB-002', 'individual', 'Dr. Yousif Al-Nur', '', 'yousif.alnur@gmail.com', '+249 912 345678', '', '', '', 'Residence 14, Al-Riyadh, Khartoum', 'Approved', '[]', 'National ID verified for VIP executive transport.', now, now);
  insertO.run('ONB-003', 'company', 'Nile Grains & Agricultural Exports Ltd', 'Nile Grains & Agricultural Exports Ltd', 'logistics@nilegrains.sd', '+249 183 998877', 'Dr. Fatima Abdelrahman', 'CR-AGRO-773910', 'TAX-77401', 'Al-Gadarif Central Silos & Agricultural Depot', 'Pending', '[]', 'Awaiting Port Sudan phytosanitary export registration upload.', now, now);
  console.log('Seeded onboarding_clients table successfully!');
}

// 5. Seed sample bookings if empty (TR-001, CR-001, CR-002)
const bCount = db.prepare('SELECT count(*) as c FROM bookings').get().c;
if (bCount === 0) {
  const insertB = db.prepare(`
    INSERT INTO bookings (
      id, full_name, email, phone, departure, destination, travel_date, departure_time,
      passengers, vehicle_pref, luggage, instructions, created, status, assigned_vehicle,
      assigned_driver, internal_notes, updated, customer_type, company_name, contact_person,
      company_reg, billing_details, booking_category, cargo_type, cargo_desc, packages_count,
      cargo_weight, cargo_dimensions, special_handling, cargo_docs, delivery_date, user_id
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?
    )
  `);
  insertB.run(
    'TR-001', 'Ali Babiker', 'ali@example.com', '+249 912 000 001', 'Khartoum International Airport', 'Corinthia Hotel, Khartoum', '2026-11-20', '10:00 AM',
    2, 'Executive SUV (Toyota Land Cruiser V8)', '2 Suitcases', 'VIP flight arrival pick-up', now, 'Approved', 'Toyota Land Cruiser V8 (Plate KRT-8921)',
    'Captain Ibrahim Ahmed', 'Airport clearance badge confirmed', now, 'individual', '', '',
    '', '', 'passenger', '', '', 1,
    '', '', '', '[]', '', 'CUST-001'
  );
  insertB.run(
    'CR-001', 'Hassan Omer', 'hassan@example.com', '+249 912 000 002', 'Khartoum Industrial Area', 'Port Sudan Maritime Port', '2026-11-21', '08:00 AM',
    1, 'Flatbed Heavy Truck (20-40 Ton)', '', 'Secure strapping required', now, 'In Transit', 'Mercedes-Benz Actros 3340 (Plate KRT-9011)',
    'Captain Osman Babiker', 'Loaded at Gate 3 weighbridge', now, 'individual', '', '',
    '', '', 'cargo', 'Industrial Machinery & Equipment', 'Heavy spare parts and generator assembly', 4,
    '18.5 Tons', '4.2m x 2.1m x 2.0m', 'Requires heavy crane unloading at Port Sudan', '[]', '2026-11-23', 'CUST-001'
  );
  insertB.run(
    'CR-002', 'Eng. Mariam El-Sayed', 'supplychain@nileagro.sd', '+249 183 998 877', 'Wad Madani Logistics Hub', 'Port Sudan Container Terminal', '2026-11-22', '06:00 AM',
    1, 'Refrigerated Cold-Chain Reefer (-25°C to +15°C)', '', 'Continuous -18°C telemetry recording', now, 'Approved', 'Scania R500 40ft Reefer (Plate KRT-8812)',
    'Captain Mustafa El-Hadi', 'Reefer pre-cooled to -20°C prior to cargo loading', now, 'company', 'Nile Agro Industries Ltd', 'Dr. Fatima Abdelrahman',
    'CR-AGRO-773910', 'Direct Corporate Invoice Net-30', 'cargo', 'Agricultural Products & Perishables', 'Fresh chilled agricultural produce for export', 850,
    '22 Tons', 'Standard 40ft Reefer container load', 'Perishable / Keep Frozen -18°C', '[]', '2026-11-24', 'CUST-002'
  );
  console.log('Seeded bookings table successfully!');

  // Sync records table for operations
  db.exec(`
    CREATE TABLE IF NOT EXISTS records(
      id TEXT PRIMARY KEY, wf TEXT NOT NULL, title TEXT, client TEXT, a TEXT, b TEXT, t TEXT,
      pri TEXT, due TEXT, step INTEGER DEFAULT 0, created INTEGER, done INTEGER, log TEXT DEFAULT '[]', web INTEGER DEFAULT 0);
    CREATE TABLE IF NOT EXISTS counters(wf TEXT PRIMARY KEY, n INTEGER);
  `);
  const insRec = db.prepare('INSERT OR IGNORE INTO records (id, wf, title, client, a, b, t, pri, due, step, created, done, log, web) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insRec.run('TR-001', 'transport', '👤 Passenger: Executive SUV (2 pax)', 'Ali Babiker', 'Khartoum International Airport', 'Corinthia Hotel, Khartoum', 'Airport Pickup', 'normal', '2026-11-20', 1, now, null, '[]', 1);
  insRec.run('CR-001', 'cargo', '📦 Cargo: Flatbed Heavy Truck', 'Hassan Omer', 'Khartoum Industrial Area', 'Port Sudan Maritime Port', 'Industrial Machinery', 'normal', '2026-11-21', 4, now, null, '[]', 1);
  insRec.run('CR-002', 'cargo', '🏢 Cargo: Refrigerated Cold-Chain', 'Nile Agro Industries Ltd', 'Wad Madani Logistics Hub', 'Port Sudan Container Terminal', 'Agricultural Products', 'urgent', '2026-11-22', 1, now, null, '[]', 1);

  db.prepare("INSERT INTO counters(wf, n) VALUES('transport', 1) ON CONFLICT(wf) DO UPDATE SET n=MAX(n, 1)").run();
  db.prepare("INSERT INTO counters(wf, n) VALUES('cargo', 2) ON CONFLICT(wf) DO UPDATE SET n=MAX(n, 2)").run();
}

// 6. Seed locations if empty
const locCount = db.prepare('SELECT count(*) as c FROM locations').get().c;
if (locCount === 0) {
  const insLoc = db.prepare('INSERT INTO locations (id, name, country, type, lat, lng, active) VALUES (?, ?, ?, ?, ?, ?, ?)');
  insLoc.run('LOC-KRT', 'Khartoum Central Logistics Hub', 'Sudan', 'warehouse', 15.5007, 32.5599, 1);
  insLoc.run('LOC-PSU-PORT', 'Port Sudan Maritime Terminal', 'Sudan', 'port', 19.6158, 37.2164, 1);
  insLoc.run('LOC-KRT-AIR', 'Khartoum International Airport', 'Sudan', 'airport', 15.5895, 32.5532, 1);
  insLoc.run('LOC-JED-PORT', 'Jeddah Islamic Port', 'Saudi Arabia', 'port', 21.4858, 39.1925, 1);
  insLoc.run('LOC-DXB-AIR', 'Dubai International Airport', 'United Arab Emirates', 'airport', 25.2532, 55.3657, 1);
  console.log('Seeded locations table successfully!');
}

// 7. Seed routes if empty
const rCount = db.prepare('SELECT count(*) as c FROM routes').get().c;
if (rCount === 0) {
  const insRoute = db.prepare('INSERT INTO routes (id, origin_location_id, destination_location_id, mode, transit_days_min, transit_days_max, price_from, currency, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
  insRoute.run('RT-DEMO-ROAD', 'LOC-KRT', 'LOC-PSU-PORT', 'road', 1, 3, 650.0, 'USD', 1, 'Demo Sample Route: National Highway Corridor');
  insRoute.run('RT-DEMO-SEA', 'LOC-PSU-PORT', 'LOC-JED-PORT', 'sea', 2, 5, 1200.0, 'USD', 1, 'Demo Sample Route: Red Sea Maritime Feeder');
  insRoute.run('RT-DEMO-AIR', 'LOC-KRT-AIR', 'LOC-DXB-AIR', 'air', 1, 2, 850.0, 'USD', 1, 'Demo Sample Route: Regional Air Cargo Express');
  console.log('Seeded routes table successfully!');
}

console.log('Migration completed 100%!');
