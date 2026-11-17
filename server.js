const express = require('express'), Database = require('better-sqlite3'), crypto = require('crypto');
const path = require('path'), fs = require('fs'), rateLimit = require('express-rate-limit'), multer = require('multer');

// tiny .env loader
try {
  for (const l of fs.readFileSync(path.join(__dirname, '.env'), 'utf8').split(/\r?\n/)) {
    const m = l.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
} catch { }

const PORT = process.env.PORT || 3000;
const DEV_SECRET = 'asil-logistics-dev-session-secret-key-2026';
const DEV_SECRET_ALT = 'asil-logistics-secret-session-key-dev-2026';
const NODE_ENV = process.env.NODE_ENV || 'development';
process.env.NODE_ENV = NODE_ENV;

if (NODE_ENV !== 'development' && NODE_ENV !== 'test') {
  if (!process.env.SESSION_SECRET ||
    process.env.SESSION_SECRET.trim() === '' ||
    process.env.SESSION_SECRET === DEV_SECRET ||
    process.env.SESSION_SECRET === DEV_SECRET_ALT) {
    throw new Error('Fatal: SESSION_SECRET must be set to a strong secret whenever NODE_ENV is not "development".');
  }
}
const SECRET = process.env.SESSION_SECRET || DEV_SECRET;

// Ensure private uploads directory exists
const UPLOADS_PRIVATE_DIR = path.join(__dirname, 'uploads_private', 'cargo');
if (!fs.existsSync(UPLOADS_PRIVATE_DIR)) {
  fs.mkdirSync(UPLOADS_PRIVATE_DIR, { recursive: true });
}

// Multer storage & security configuration pointing to private uploads folder
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_PRIVATE_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeExt = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.txt'].includes(ext) ? ext : '.bin';
    const rand = crypto.randomBytes(8).toString('hex');
    cb(null, `cargo-${Date.now()}-${rand}${safeExt}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 3 }, // 5 MB max per file, up to 3 files
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain'];
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.pdf', '.txt'];
    if (allowedMimes.includes(file.mimetype) && allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only JPG, PNG, WEBP, GIF, PDF, and TXT files are permitted.'));
    }
  }
});

// Magic bytes validator helper for uploaded files
function checkFileMagicBytes(filePath, ext) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, buf, 0, 32, 0);
    fs.closeSync(fd);
    if (bytesRead < 4 && ext !== '.txt') return false;

    switch (ext) {
      case '.pdf':
        return buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46; // %PDF
      case '.png':
        return buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4E && buf[3] === 0x47;
      case '.jpg':
      case '.jpeg':
        return buf[0] === 0xFF && buf[1] === 0xD8 && buf[2] === 0xFF;
      case '.gif':
        return buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x38 &&
          (buf[4] === 0x37 || buf[4] === 0x39) && buf[5] === 0x61; // GIF87a or GIF89a
      case '.webp':
        return buf[0] === 0x52 && buf[1] === 0x49 && buf[2] === 0x46 && buf[3] === 0x46 &&
          buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50; // RIFF....WEBP
      case '.txt':
        for (let i = 0; i < bytesRead; i++) {
          if (buf[i] === 0x00) return false;
        }
        return true;
      default:
        return false;
    }
  } catch (_) {
    return false;
  }
}

const db = new Database(process.env.DB_PATH || process.env.DB_FILE || path.join(__dirname, 'asil.db'));
db.pragma('journal_mode = WAL');
db.exec(`CREATE TABLE IF NOT EXISTS records(
  id TEXT PRIMARY KEY, wf TEXT NOT NULL, title TEXT, client TEXT, a TEXT, b TEXT, t TEXT,
  pri TEXT, due TEXT, step INTEGER DEFAULT 0, created INTEGER, done INTEGER, log TEXT DEFAULT '[]', web INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS counters(wf TEXT PRIMARY KEY, n INTEGER);
  CREATE TABLE IF NOT EXISTS bookings(
    id TEXT PRIMARY KEY, full_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT NOT NULL,
    departure TEXT NOT NULL, destination TEXT NOT NULL, travel_date TEXT NOT NULL,
    departure_time TEXT NOT NULL, passengers INTEGER NOT NULL, vehicle_pref TEXT NOT NULL,
    luggage TEXT, instructions TEXT, created INTEGER NOT NULL,
    status TEXT DEFAULT 'Pending', assigned_vehicle TEXT DEFAULT '',
    assigned_driver TEXT DEFAULT '', internal_notes TEXT DEFAULT '', updated INTEGER,
    user_id TEXT DEFAULT NULL);
  CREATE TABLE IF NOT EXISTS vehicles(
    id TEXT PRIMARY KEY, plate TEXT UNIQUE NOT NULL, model TEXT NOT NULL,
    category TEXT NOT NULL, type TEXT NOT NULL, capacity TEXT NOT NULL,
    status TEXT DEFAULT 'Available', assigned_driver TEXT DEFAULT '', notes TEXT DEFAULT '', created INTEGER);
  CREATE TABLE IF NOT EXISTS drivers(
    id TEXT PRIMARY KEY, name TEXT NOT NULL, phone TEXT NOT NULL, email TEXT DEFAULT '',
    category TEXT NOT NULL, license_type TEXT NOT NULL, status TEXT DEFAULT 'Active',
    assigned_vehicle TEXT DEFAULT '', experience_years INTEGER DEFAULT 5, created INTEGER);
  CREATE TABLE IF NOT EXISTS audit_logs(
    id INTEGER PRIMARY KEY AUTOINCREMENT, action TEXT NOT NULL, target_id TEXT NOT NULL,
    operator TEXT DEFAULT 'Super Administrator', details TEXT, timestamp INTEGER NOT NULL);
  CREATE TABLE IF NOT EXISTS settings(
    key TEXT PRIMARY KEY, val TEXT NOT NULL, updated INTEGER);
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

// Schema migration check for bookings and users tables
try {
  const inqCols = db.prepare("PRAGMA table_info(inquiries)").all().map(c => c.name);
  if (!inqCols.includes('category')) db.exec("ALTER TABLE inquiries ADD COLUMN category TEXT DEFAULT 'contact'");
  db.exec("CREATE INDEX IF NOT EXISTS idx_inquiries_category ON inquiries(category)");

  const bCols = db.prepare("PRAGMA table_info(bookings)").all().map(c => c.name);
  if (!bCols.includes('status')) db.exec("ALTER TABLE bookings ADD COLUMN status TEXT DEFAULT 'Pending'");
  if (!bCols.includes('assigned_vehicle')) db.exec("ALTER TABLE bookings ADD COLUMN assigned_vehicle TEXT DEFAULT ''");
  if (!bCols.includes('assigned_driver')) db.exec("ALTER TABLE bookings ADD COLUMN assigned_driver TEXT DEFAULT ''");
  if (!bCols.includes('internal_notes')) db.exec("ALTER TABLE bookings ADD COLUMN internal_notes TEXT DEFAULT ''");
  if (!bCols.includes('updated')) db.exec("ALTER TABLE bookings ADD COLUMN updated INTEGER");
  if (!bCols.includes('customer_type')) db.exec("ALTER TABLE bookings ADD COLUMN customer_type TEXT DEFAULT 'individual'");
  if (!bCols.includes('company_name')) db.exec("ALTER TABLE bookings ADD COLUMN company_name TEXT DEFAULT ''");
  if (!bCols.includes('contact_person')) db.exec("ALTER TABLE bookings ADD COLUMN contact_person TEXT DEFAULT ''");
  if (!bCols.includes('company_reg')) db.exec("ALTER TABLE bookings ADD COLUMN company_reg TEXT DEFAULT ''");
  if (!bCols.includes('billing_details')) db.exec("ALTER TABLE bookings ADD COLUMN billing_details TEXT DEFAULT ''");
  // Cargo additions
  if (!bCols.includes('booking_category')) db.exec("ALTER TABLE bookings ADD COLUMN booking_category TEXT DEFAULT 'passenger'");
  if (!bCols.includes('cargo_type')) db.exec("ALTER TABLE bookings ADD COLUMN cargo_type TEXT DEFAULT ''");
  if (!bCols.includes('cargo_desc')) db.exec("ALTER TABLE bookings ADD COLUMN cargo_desc TEXT DEFAULT ''");
  if (!bCols.includes('packages_count')) db.exec("ALTER TABLE bookings ADD COLUMN packages_count INTEGER DEFAULT 1");
  if (!bCols.includes('cargo_weight')) db.exec("ALTER TABLE bookings ADD COLUMN cargo_weight TEXT DEFAULT ''");
  if (!bCols.includes('cargo_dimensions')) db.exec("ALTER TABLE bookings ADD COLUMN cargo_dimensions TEXT DEFAULT ''");
  if (!bCols.includes('special_handling')) db.exec("ALTER TABLE bookings ADD COLUMN special_handling TEXT DEFAULT ''");
  if (!bCols.includes('cargo_docs')) db.exec("ALTER TABLE bookings ADD COLUMN cargo_docs TEXT DEFAULT ''");
  if (!bCols.includes('delivery_date')) db.exec("ALTER TABLE bookings ADD COLUMN delivery_date TEXT DEFAULT ''");
  if (!bCols.includes('user_id')) db.exec("ALTER TABLE bookings ADD COLUMN user_id TEXT DEFAULT NULL");
  // Route, Mode, Location & Pricing Additions
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

  const rCols = db.prepare("PRAGMA table_info(records)").all().map(c => c.name);
  if (!rCols.includes('user_id')) db.exec("ALTER TABLE records ADD COLUMN user_id TEXT DEFAULT NULL");

  const uCols = db.prepare("PRAGMA table_info(users)").all().map(c => c.name);
  if (!uCols.includes('session_version')) db.exec("ALTER TABLE users ADD COLUMN session_version INTEGER DEFAULT 1");
  if (!uCols.includes('email_verified')) db.exec("ALTER TABLE users ADD COLUMN email_verified INTEGER DEFAULT 0");
} catch (e) {
  console.error('Migration notice:', e.message);
}

const clean = s => String(s ?? '').replace(/<[^>]*>/g, '').replace(/[<>]/g, '').trim();
const clip = (v, n = 500) => clean(v).slice(0, n);
const PRE = { transport: 'TR', distribution: 'DI', maintenance: 'MT', onboarding: 'ONB', cargo: 'CR' };
const LEN = { transport: 9, distribution: 10, maintenance: 10, onboarding: 12, cargo: 9 };
const out = r => ({ ...r, log: JSON.parse(r.log), web: !!r.web });

function generateSecureRef(wf) {
  const prefix = PRE[wf] || wf.slice(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  let rand = '';
  const bytes = crypto.randomBytes(6);
  for (let i = 0; i < 6; i++) {
    rand += chars[bytes[i] % chars.length];
  }
  return `${prefix}-${year}-${rand}`;
}

const nextId = wf => {
  try {
    db.prepare('INSERT INTO counters(wf,n) VALUES(?,1) ON CONFLICT(wf) DO UPDATE SET n=n+1').run(wf);
  } catch { }
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = generateSecureRef(wf);
    const existing = db.prepare('SELECT id FROM records WHERE id=? UNION SELECT id FROM bookings WHERE id=?').get(candidate, candidate);
    if (!existing) return candidate;
  }
  return generateSecureRef(wf);
};

// Audit logging helper
function logAdminAction(action, targetId, details, operator = 'Super Administrator') {
  try {
    db.prepare('INSERT INTO audit_logs (action, target_id, operator, details, timestamp) VALUES (?, ?, ?, ?, ?)').run(
      clip(action, 100),
      clip(targetId, 50),
      clip(operator, 100),
      clip(details, 1000),
      Date.now()
    );
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

// Initial Seed Data for Fleet & Crew (Only in demo mode when SEED_DEMO=true)
if (process.env.SEED_DEMO === 'true') {
  try {
    const vCount = db.prepare('SELECT COUNT(*) as c FROM vehicles').get().c;
    if (vCount === 0) {
      const seedVehicles = [
        ['VH-001', 'KRT-8921', 'Toyota Land Cruiser V8', 'passenger', 'Executive SUV', '7 Passengers VIP', 'Available', 'Captain Ibrahim Ahmed', 'VIP escort & long-distance desert package', Date.now()],
        ['VH-002', 'KRT-3401', 'Mercedes-Benz E-Class 300', 'passenger', 'Executive Sedan', '4 Passengers VIP', 'Available', 'Captain Walid Nour', 'Diplomatic & airport transfer', Date.now()],
        ['VH-003', 'KRT-5512', 'Toyota HiAce Grand Cabin', 'passenger', 'VIP Passenger Van', '10 Passengers', 'Dispatched', 'Captain Khalid Siddig', 'Corporate delegation transport', Date.now()],
        ['VH-004', 'KRT-1209', 'Toyota Coaster Deluxe Bus', 'passenger', 'Corporate Shuttle', '26 Passengers', 'Available', '', 'Staff & conference transport', Date.now()],
        ['VH-005', 'KRT-7833', 'Hyundai Staria VIP Lounge', 'passenger', 'Executive MPV', '7 Passengers', 'Available', '', 'VIP executive airport transport', Date.now()],
        ['VH-006', 'KRT-9011', 'Mercedes-Benz Actros 3340', 'cargo', 'Heavy Flatbed Truck', '30 Tons Payload', 'Available', 'Captain Osman Babiker', '20ft/40ft containers, structural steel & machinery', Date.now()],
        ['VH-007', 'KRT-4420', 'Isuzu NPR 5-Ton Box Truck', 'cargo', 'Enclosed Box Cargo', '5-7 Tons Payload', 'Dispatched', '', 'Enclosed dry freight & packaged goods', Date.now()],
        ['VH-008', 'KRT-8812', 'Scania R500 40ft Reefer', 'cargo', 'Refrigerated Cold-Chain', '25 Tons Payload', 'Available', 'Captain Mustafa El-Hadi', 'Certified -25°C to +15°C thermo-controlled', Date.now()],
        ['VH-009', 'KRT-6631', 'Volvo FH16 Container Carrier', 'cargo', 'Intermodal Skeletal Carrier', '40ft ISO Container', 'Available', 'Captain Tariq Mansour', 'Port Sudan corridor freight hauler', Date.now()],
        ['VH-010', 'KRT-2190', 'Lowbed Equipment Hauler 60T', 'cargo', 'Heavy Low-Loader', '60 Tons Payload', 'Available', '', 'Oversized plant, transformers & excavators', Date.now()],
        ['VH-011', 'KRT-3310', 'Toyota Hilux 4x4 Express', 'cargo', 'Rapid Express Hauler', '1.5 Tons Payload', 'Available', '', 'Urgent spares & regional rapid delivery', Date.now()]
      ];
      const insV = db.prepare('INSERT INTO vehicles VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const v of seedVehicles) insV.run(...v);
    }

    const dCount = db.prepare('SELECT COUNT(*) as c FROM drivers').get().c;
    if (dCount === 0) {
      const seedDrivers = [
        ['DR-001', 'Captain Ibrahim Ahmed', '+249 912 334455', 'i.ahmed@asillogistics.com', 'both', 'Executive VIP Chauffeur & Hazmat Certified', 'Active', 'Toyota Land Cruiser V8 (Plate KRT-8921)', 12, Date.now()],
        ['DR-002', 'Captain Osman Babiker', '+249 912 445566', 'o.babiker@asillogistics.com', 'cargo', 'Heavy Goods Commercial Class A (Heavy Haul)', 'Active', 'Mercedes-Benz Actros 3340 (Plate KRT-9011)', 15, Date.now()],
        ['DR-003', 'Captain Tariq Mansour', '+249 912 667788', 't.mansour@asillogistics.com', 'cargo', 'Interstate Long-Haul Freight Master', 'Active', 'Volvo FH16 Container Carrier (Plate KRT-6631)', 10, Date.now()],
        ['DR-004', 'Captain Mustafa El-Hadi', '+249 912 889900', 'm.elhadi@asillogistics.com', 'cargo', 'Cold-Chain & Reefer Temperature Specialist', 'Active', 'Scania R500 40ft Reefer (Plate KRT-8812)', 9, Date.now()],
        ['DR-005', 'Captain Walid Nour', '+249 912 556677', 'w.nour@asillogistics.com', 'passenger', 'Executive Diplomatic & VIP Chauffeur', 'Active', 'Mercedes-Benz E-Class 300 (Plate KRT-3401)', 8, Date.now()],
        ['DR-006', 'Captain Khalid Siddig', '+249 912 778899', 'k.siddig@asillogistics.com', 'passenger', 'Corporate Shuttle & VIP Van Captain', 'Active', 'Toyota HiAce Grand Cabin (Plate KRT-5512)', 7, Date.now()]
      ];
      const insD = db.prepare('INSERT INTO drivers VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const d of seedDrivers) insD.run(...d);
    }

    const locCount = db.prepare('SELECT COUNT(*) as c FROM locations').get().c;
    if (locCount === 0) {
      const seedLocations = [
        ['LOC-KRT', 'Khartoum Central Logistics Hub', 'Sudan', 'warehouse', 15.5007, 32.5599, 1],
        ['LOC-PSU-PORT', 'Port Sudan Maritime Terminal', 'Sudan', 'port', 19.6158, 37.2164, 1],
        ['LOC-KRT-AIR', 'Khartoum International Airport', 'Sudan', 'airport', 15.5895, 32.5532, 1],
        ['LOC-JED-PORT', 'Jeddah Islamic Port', 'Saudi Arabia', 'port', 21.4858, 39.1925, 1],
        ['LOC-DXB-AIR', 'Dubai International Airport', 'United Arab Emirates', 'airport', 25.2532, 55.3657, 1]
      ];
      const insLoc = db.prepare('INSERT INTO locations (id, name, country, type, lat, lng, active) VALUES (?, ?, ?, ?, ?, ?, ?)');
      for (const l of seedLocations) insLoc.run(...l);
    }

    const rCount = db.prepare('SELECT COUNT(*) as c FROM routes').get().c;
    if (rCount === 0) {
      const seedRoutes = [
        ['RT-DEMO-ROAD', 'LOC-KRT', 'LOC-PSU-PORT', 'road', 1, 3, 650.0, 'USD', 1, 'Sample demo route: Highway corridor'],
        ['RT-DEMO-SEA', 'LOC-PSU-PORT', 'LOC-JED-PORT', 'sea', 2, 5, 1200.0, 'USD', 1, 'Sample demo route: Red Sea maritime feeder'],
        ['RT-DEMO-AIR', 'LOC-KRT-AIR', 'LOC-DXB-AIR', 'air', 1, 2, 850.0, 'USD', 1, 'Sample demo route: Regional air freight']
      ];
      const insRoute = db.prepare('INSERT INTO routes (id, origin_location_id, destination_location_id, mode, transit_days_min, transit_days_max, price_from, currency, active, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
      for (const r of seedRoutes) insRoute.run(...r);
    }
  } catch (e) {
    console.error('Fleet & Route seed notice:', e.message);
  }
}

try {
  const logCount = db.prepare('SELECT COUNT(*) as c FROM audit_logs').get().c;
  if (logCount === 0) {
    logAdminAction('System Initialization', 'SYSTEM', 'ASIL Logistics Advanced Operations Dashboard initialized successfully.');
  }
} catch (e) { }

function insert(b, web) {
  if (!PRE[b.wf]) throw new Error('bad workflow');
  const r = {
    id: nextId(b.wf), wf: b.wf, title: clip(b.title, 200), client: clip(b.client, 200), a: clip(b.a, 200), b: clip(b.b, 200),
    t: clip(b.t, 2000), pri: b.pri === 'urgent' ? 'urgent' : 'normal',
    due: /^\d{4}-\d\d-\d\d$/.test(b.due) ? b.due : new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10),
    step: 0, created: Date.now(), done: null, log: '[]', web: web ? 1 : 0,
    user_id: b.user_id || null
  };
  db.prepare('INSERT INTO records (id, wf, title, client, a, b, t, pri, due, step, created, done, log, web, user_id) VALUES(@id,@wf,@title,@client,@a,@b,@t,@pri,@due,@step,@created,@done,@log,@web,@user_id)').run(r);
  return r;
}

// Signed session cookie (12 h) with timing-safe comparison, role, department & session_version encoding
const sign = s => crypto.createHmac('sha256', SECRET).update(s).digest('hex');
const mkUserToken = (userId, role, dept = '', sv = 1) => {
  const exp = String(Date.now() + 12 * 36e5);
  const data = `${userId}:${role}:${dept}:${exp}:${sv}`;
  return Buffer.from(data).toString('base64url') + '.' + sign(data);
};

const token = q => ((q.headers.cookie || '').split(';').map(c => c.trim()).find(c => c.startsWith('asil=')) || '').slice(5);

const parseSession = q => {
  const tok = token(q);
  if (!tok) return null;
  const parts = tok.split('.');
  if (parts.length !== 2) return null;
  const [dataPart, sig] = parts;
  if (!sig || sig.length !== 64) return null;

  // Modern base64url format only (userId:role:dept:exp:sv)
  try {
    const dataStr = Buffer.from(dataPart, 'base64url').toString('utf8');
    const [userId, role, dept, exp, tokenSv] = dataStr.split(':');
    if (!userId || !role || !exp || Number(exp) <= Date.now()) return null;
    const bufA = Buffer.from(sig, 'hex');
    const bufB = Buffer.from(sign(dataStr), 'hex');
    if (bufA.length === 32 && bufB.length === 32 && crypto.timingSafeEqual(bufA, bufB)) {
      const u = db.prepare('SELECT id, username, email, full_name, phone, role, department, customer_type, company_name, session_version, email_verified FROM users WHERE id=?').get(userId);
      if (u && u.role === role) {
        if (tokenSv !== undefined && String(u.session_version || 1) !== String(tokenSv)) {
          return null; // session invalidated by session_version bump
        }
        return {
          id: u.id,
          userId: u.id,
          username: u.username,
          email: u.email,
          fullName: u.full_name,
          phone: u.phone,
          role: u.role,
          department: u.department,
          customerType: u.customer_type,
          companyName: u.company_name,
          sessionVersion: u.session_version || 1,
          emailVerified: !!u.email_verified
        };
      }
    }
  } catch (e) { }
  return null;
};

// General authentication middleware
const auth = (q, s, n) => {
  const sess = parseSession(q);
  if (!sess) return s.status(401).json({ error: 'auth' });
  q.session = sess;
  n();
};

// Strict Role-Based Access Control (RBAC) middleware
const requireRole = (allowedRoles, requiredDept = null) => {
  return (q, s, n) => {
    const sess = parseSession(q);
    if (!sess) return s.status(401).json({ error: 'auth' });
    q.session = sess;

    // Super admin has universal access to all departments
    if (sess.role === 'super_admin') return n();

    if (!allowedRoles.includes(sess.role)) {
      return s.status(403).json({ error: 'forbidden: insufficient role permissions' });
    }

    if (requiredDept && sess.department !== requiredDept) {
      return s.status(403).json({ error: `forbidden: access restricted to ${requiredDept} department` });
    }

    n();
  };
};

const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';

// crypto.scrypt password hashing (scrypt$salt$hash) with one-time legacy SHA-256 migration
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(String(password), salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

function verifyPasswordAgainstHash(password, storedHash) {
  if (!storedHash || typeof storedHash !== 'string') return false;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const expectedBuf = Buffer.from(parts[2], 'hex');
    const derivedBuf = crypto.scryptSync(String(password), salt, expectedBuf.length);
    if (expectedBuf.length !== derivedBuf.length) return false;
    return crypto.timingSafeEqual(expectedBuf, derivedBuf);
  }
  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const inputHashHex = crypto.createHash('sha256').update(String(password)).digest('hex');
    const inputBuf = Buffer.from(inputHashHex, 'hex');
    const expectedBuf = Buffer.from(storedHash, 'hex');
    if (inputBuf.length === expectedBuf.length && crypto.timingSafeEqual(inputBuf, expectedBuf)) {
      return 'migrate';
    }
  }
  return false;
}

// Ensure Super Admin accounts exist on launch (local or production Render)
try {
  const superAdminExists = db.prepare("SELECT id FROM users WHERE role='super_admin' LIMIT 1").get();
  if (!superAdminExists) {
    const now = Date.now();
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, phone, role, department, customer_type, company_name, status, created, session_version, email_verified)
      VALUES (?, 'Asil', 'hashim222kings@gmail.com', ?, 'Asil', '+249 912 000000', 'super_admin', 'all', '', '', 'active', ?, 1, 1)
    `).run('USR-339e36e7-70e9-451e-ba3e-6018deb192d9', hashPassword('Asil'), now);
    db.prepare(`
      INSERT OR IGNORE INTO users (id, username, email, password_hash, full_name, phone, role, department, customer_type, company_name, status, created, session_version, email_verified)
      VALUES (?, 'admin', 'admin@asillogistics.sd', ?, 'Super Administrator', '+249 183 770 000', 'super_admin', 'all', '', '', 'active', ?, 1, 1)
    `).run('USR-001', hashPassword('admin123'), now);
    console.log('Auto-seeded initial Super Admin accounts: Asil & admin');
  }
} catch (e) {
  console.error('Error auto-seeding super admin:', e.message);
}

const app = express();
app.disable('x-powered-by'); app.set('trust proxy', 1);
app.use(express.json({ limit: '2mb' }));

// Helmet-style security headers
app.use((q, s, n) => {
  s.setHeader('X-Content-Type-Options', 'nosniff');
  s.setHeader('X-Frame-Options', 'DENY');
  s.setHeader('Referrer-Policy', 'same-origin');

  if (process.env.NODE_ENV === 'production') {
    s.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  const csp = [
    "default-src 'self'",
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self' data:",
    "script-src 'self'",
    "img-src 'self' data: blob: https://*.tile.openstreetmap.org https://tile.openstreetmap.org",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'"
  ].join('; ');
  s.setHeader('Content-Security-Policy', csp);

  if (['POST', 'PATCH', 'DELETE'].includes(q.method)) {
    const ct = q.headers['content-type'] || '';
    const isJson = ct.startsWith('application/json');
    const isUpload = q.path.startsWith('/api/upload') && ct.startsWith('multipart/form-data');
    if (!isJson && !isUpload) return s.status(415).json({ error: 'json or multipart only' }); // blocks CSRF
  }
  n();
});

// Privacy-conscious Website Visitor Analytics Middleware
app.use((q, s, n) => {
  if (q.method === 'GET') {
    const p = q.path.toLowerCase();
    const isPageView = (
      p === '/' || p === '/home' || p === '/index.html' ||
      p === '/transport' || p === '/distribution' || p === '/maintenance' ||
      p === '/onboarding' || p === '/order' || p === '/portal' ||
      p === '/customer' || p === '/track' || p === '/privacy' || p === '/terms'
    );
    if (isPageView) {
      try {
        const ip = q.ip || (q.socket && q.socket.remoteAddress) || '127.0.0.1';
        const ua = q.headers['user-agent'] || '';
        const daySalt = new Date().toISOString().slice(0, 10);
        const visitorHash = crypto.createHash('sha256').update(`${ip}-${ua}-${daySalt}`).digest('hex').slice(0, 16);
        const referrer = clip(q.headers['referer'] || '', 200);
        const cleanPath = (p === '/index.html' || p === '/home') ? '/' : (p === '/customer' ? '/portal' : p);

        process.nextTick(() => {
          try {
            db.prepare('INSERT INTO page_views (path, visitor_hash, is_customer, user_id, referrer, created) VALUES (?, ?, ?, ?, ?, ?)')
              .run(cleanPath, visitorHash, 0, null, referrer, Date.now());
          } catch (_) {}
        });
      } catch (_) {}
    }
  }
  n();
});

// Health check endpoint for uptime monitoring, load balancers and container probes
app.get('/api/health', (q, s) => {
  try {
    const test = db.prepare('SELECT 1 as ok').get();
    if (!test || test.ok !== 1) {
      return s.status(503).json({ status: 'error', database: 'disconnected', error: 'database check failed' });
    }
    s.json({
      status: 'ok',
      uptime: Math.floor(process.uptime()),
      timestamp: new Date().toISOString(),
      database: 'connected',
      version: '1.0.0'
    });
  } catch (err) {
    s.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
  }
});

// ==========================================
// CENTRAL AUTHENTICATION & RBAC ENDPOINTS
// ==========================================

// Rate limit: 10 attempts per 15 minutes per IP, plus 15-minute lockout per username after 5 failures
const userLoginFailures = new Map(); // username -> { count, lockedUntil }

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: (process.env.NODE_ENV === 'production') ? 10 : 2000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts from this IP, please try again in 15 minutes.' }
});

// Universal Login: Admin, Department Staff, or Customer
app.post('/api/auth/login', loginLimiter, (q, s) => {
  const username = clip(q.body.username || q.body.user, 100).toLowerCase();
  const password = String(q.body.password || q.body.pw || '');

  const now = Date.now();
  const lockInfo = userLoginFailures.get(username);
  if (lockInfo && lockInfo.lockedUntil && lockInfo.lockedUntil > now) {
    const remainingMins = Math.ceil((lockInfo.lockedUntil - now) / 60000);
    return s.status(429).json({
      error: `Account temporarily locked due to 5 consecutive failed login attempts. Please try again in ${remainingMins} minutes.`
    });
  }

  // 1. Check in users database
  const u = db.prepare("SELECT * FROM users WHERE (lower(username)=? OR lower(email)=?) AND status='active'").get(username, username);
  if (u) {
    const match = verifyPasswordAgainstHash(password, u.password_hash);
    if (match) {
      userLoginFailures.delete(username);
      if (match === 'migrate') {
        const newHash = hashPassword(password);
        db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(newHash, u.id);
        if (u.id === 'USR-001' || u.role === 'super_admin') {
          try { db.prepare("UPDATE settings SET val=?, updated=? WHERE key='admin_password_hash'").run(newHash, Date.now()); } catch { }
        }
      }
      logAdminAction('User Login', u.id, `User ${u.username} (${u.role}) logged in.`);
      const tok = mkUserToken(u.id, u.role, u.department, u.session_version || 1);
      s.setHeader('Set-Cookie', `asil=${tok}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`);
      return s.json({
        ok: 1,
        user: {
          id: u.id,
          username: u.username,
          email: u.email,
          fullName: u.full_name,
          role: u.role,
          department: u.department,
          customerType: u.customer_type,
          companyName: u.company_name
        }
      });
    }
  }

  const curr = userLoginFailures.get(username) || { count: 0, lockedUntil: 0 };
  curr.count += 1;
  if (curr.count >= 5) {
    curr.lockedUntil = now + 15 * 60 * 1000;
  }
  userLoginFailures.set(username, curr);

  // Security Hardening: Do not write the typed username into the failed-login audit log
  logAdminAction('Failed Login', 'AUTH', `Failed login attempt from IP ${q.ip || 'unknown'}`);
  return s.status(401).json({ error: 'Invalid username or password.' });
});

// Self-service Customer Registration
app.post('/api/auth/register-customer', rateLimit({ windowMs: 3600e3, limit: 30, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  const b = q.body;
  const username = clip(b.username, 50).toLowerCase();
  const email = clip(b.email, 100).toLowerCase();
  const password = String(b.password || '');
  const fullName = clip(b.fullName || b.name, 100);
  const phone = clip(b.phone, 50);
  const customerType = b.customerType === 'company' ? 'company' : 'individual';
  const companyName = customerType === 'company' ? clip(b.companyName, 150) : '';

  if (!username || !email || !password || !fullName || !phone) {
    return s.status(400).json({ error: 'All registration fields are required.' });
  }
  if (password.length < 10) {
    return s.status(400).json({ error: 'Password must be at least 10 characters.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE lower(username)=? OR lower(email)=?').get(username, email);
  if (existing) {
    return s.status(400).json({ error: 'Username or email address is already registered.' });
  }

  const id = 'CUST-' + crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = Date.now();

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, phone, role, department, customer_type, company_name, status, created)
    VALUES (?, ?, ?, ?, ?, ?, 'customer', '', ?, ?, 'active', ?)
  `).run(id, username, email, passwordHash, fullName, phone, customerType, companyName, now);

  const tok = mkUserToken(id, 'customer', '', 1);
  s.setHeader('Set-Cookie', `asil=${tok}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200${secure}`);
  s.status(201).json({
    ok: 1,
    user: { id, username, email, fullName, role: 'customer', customerType, companyName }
  });
});

// Current user profile query
app.get('/api/auth/me', (q, s) => {
  if (!q.headers.cookie || !q.headers.cookie.includes('asil=')) {
    return s.json({ ok: 1, user: null });
  }
  const sess = parseSession(q);
  if (!sess) return s.status(401).json({ error: 'unauthenticated' });
  s.json({ ok: 1, user: sess });
});

// Logout
app.post('/api/auth/logout', (q, s) => {
  s.setHeader('Set-Cookie', `asil=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0${secure}`);
  s.json({ ok: 1 });
});

// Public: client service request from general website form
app.post('/api/requests', rateLimit({ windowMs: 3600e3, limit: 60, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  const b = q.body;
  if (!clip(b.org) || !clip(b.who) || !clip(b.ph)) return s.status(400).json({ error: 'missing fields' });
  try {
    const r = insert({
      wf: b.wf, title: b.svc, client: b.org, pri: b.urg ? 'urgent' : 'normal', due: b.due,
      t: `Contact: ${clip(b.who, 100)} (${clip(b.ph, 100)}). ${clip(b.t, 1500)}`
    }, true);
    s.json({ id: r.id });
  } catch { s.status(400).json({ error: 'bad request' }); }
});

// Dedicated Customer Inquiry Submission (Rate limited, validated, honeypot protected)
const inquiryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many inquiries submitted from this IP. Please try again later.' }
});

app.post('/api/inquiries', inquiryLimiter, (q, s) => {
  const b = q.body || {};

  // Honeypot field inspection (bot protection)
  const hp = b._hp || b._website_hp || b.website || b.company_hp || '';
  if (typeof hp === 'string' && hp.trim().length > 0) {
    return s.status(200).json({ ok: 1, message: 'Inquiry received' });
  }

  const name = clip(b.name || b.fullName, 120);
  const email = clip(b.email, 150).toLowerCase();
  const phone = clip(b.phone, 40);
  const department = clip(b.department || b.dept || 'general', 50);
  const message = clip(b.message || b.msg || b.instructions, 2000);

  if (!name || name.length < 2) {
    return s.status(400).json({ error: 'Valid full name is required (min 2 characters).' });
  }
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return s.status(400).json({ error: 'Valid email address is required.' });
  }
  if (!phone || phone.length < 5) {
    return s.status(400).json({ error: 'Valid contact phone number is required.' });
  }
  if (!message || message.length < 5) {
    return s.status(400).json({ error: 'Inquiry message details must be at least 5 characters long.' });
  }

  const id = 'INQ-' + Date.now().toString(36).toUpperCase() + '-' + crypto.randomBytes(3).toString('hex').toUpperCase();
  const now = Date.now();
  const category = (b.category === 'subscription' || (b.subject && b.subject.toLowerCase().includes('subscription'))) 
    ? 'subscription' 
    : ((b.category === 'quote' || (b.department && b.department.toLowerCase().includes('quote')) || (b.subject && b.subject.toLowerCase().includes('quote'))) ? 'quote' : 'contact');

  try {
    db.prepare(`
      INSERT INTO inquiries (id, name, email, phone, department, message, status, created, updated, category)
      VALUES (?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
    `).run(id, name, email, phone, department, message, now, now, category);

    logAdminAction('New Inquiry', id, `Inquiry from ${name} (${department} - ${category})`);
    return s.status(201).json({ ok: 1, success: true, id, reference: id, category, message: 'Inquiry received successfully' });
  } catch (err) {
    console.error('Inquiry DB Error:', err.message);
    return s.status(500).json({ error: 'Database error saving inquiry.' });
  }
});

// ==========================================
// PUBLIC LOCATIONS & INSTANT QUOTE APIS
// ==========================================

// Public active locations query
app.get('/api/locations', (q, s) => {
  const locations = db.prepare('SELECT id, name, country, type, lat, lng FROM locations WHERE active = 1 ORDER BY country ASC, name ASC').all();
  s.json({ ok: 1, locations });
});

// Public instant quote calculator
app.get('/api/quote', (q, s) => {
  const rawOrigin = String(q.query.origin || '').trim();
  const rawDestination = String(q.query.destination || '').trim();
  const weight = q.query.weight;
  const service = q.query.service;

  if (!rawOrigin || !rawDestination) {
    return s.status(400).json({ error: 'Origin and destination are required for quotation.' });
  }

  function findLoc(val) {
    if (!val) return null;
    let loc = db.prepare('SELECT * FROM locations WHERE id = ? AND active = 1').get(val);
    if (loc) return loc;
    loc = db.prepare('SELECT * FROM locations WHERE lower(name) = lower(?) AND active = 1').get(val);
    if (loc) return loc;
    loc = db.prepare('SELECT * FROM locations WHERE (lower(name) LIKE ? OR lower(country) LIKE ?) AND active = 1').get(`%${val.toLowerCase()}%`, `%${val.toLowerCase()}%`);
    return loc;
  }

  const originLoc = findLoc(rawOrigin);
  const destLoc = findLoc(rawDestination);

  let activeRoutes = [];
  if (originLoc && destLoc) {
    activeRoutes = db.prepare('SELECT * FROM routes WHERE origin_location_id = ? AND destination_location_id = ? AND active = 1').all(originLoc.id, destLoc.id);
  }

  // If no route exists, return mode "on request"
  if (activeRoutes.length === 0) {
    return s.json({
      ok: 1,
      origin: originLoc ? originLoc.name : rawOrigin,
      destination: destLoc ? destLoc.name : rawDestination,
      routes: [],
      quotes: [
        {
          route_id: null,
          mode: 'on request',
          name: 'Custom Logistics Quotation',
          transit_days_min: null,
          transit_days_max: null,
          days_range: 'On Request',
          eta_min_date: null,
          eta_max_date: null,
          price_from: null,
          currency: 'USD',
          badges: ['on_request'],
          notes: 'No standard scheduled route exists between these locations. A tailored quote will be provided upon request.'
        }
      ]
    });
  }

  const minDays = Math.min(...activeRoutes.map(r => r.transit_days_max));
  const validPrices = activeRoutes.filter(r => r.price_from !== null && r.price_from !== undefined).map(r => r.price_from);
  const minPrice = validPrices.length > 0 ? Math.min(...validPrices) : null;

  const today = Date.now();
  const quotes = activeRoutes.map(r => {
    const badges = [];
    if (r.transit_days_max === minDays) badges.push('fastest');
    if (minPrice !== null && r.price_from === minPrice) badges.push('cheapest');

    const etaMinDate = new Date(today + r.transit_days_min * 864e5).toISOString().slice(0, 10);
    const etaMaxDate = new Date(today + r.transit_days_max * 864e5).toISOString().slice(0, 10);

    return {
      route_id: r.id,
      mode: r.mode,
      transit_days_min: r.transit_days_min,
      transit_days_max: r.transit_days_max,
      days_range: `${r.transit_days_min} - ${r.transit_days_max} days`,
      eta_min_date: etaMinDate,
      eta_max_date: etaMaxDate,
      estimated_delivery_dates: { min: etaMinDate, max: etaMaxDate },
      price_from: r.price_from,
      currency: r.currency || 'USD',
      badges,
      notes: r.notes || ''
    };
  });

  s.json({
    ok: 1,
    origin: originLoc.name,
    origin_location_id: originLoc.id,
    destination: destLoc.name,
    destination_location_id: destLoc.id,
    quotes
  });
});

// Authenticated Service Request (Maintenance, Cleaning, Gardening, Procurement, Warehousing)
app.post('/api/service-requests', rateLimit({ windowMs: 3600e3, limit: 60, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  const sess = parseSession(q);
  if (!sess || !sess.id) {
    return s.status(401).json({ error: 'Authentication required. Please sign in or register to submit a service request.' });
  }

  const b = q.body || {};
  const service = clip(b.service || b.serviceType || b.svc || 'general', 100);
  const title = clip(b.title || `${service.charAt(0).toUpperCase() + service.slice(1)} Service Request`, 150);
  const description = clip(b.description || b.notes || b.instructions || b.t || '', 1000);
  const address = clip(b.address || b.location || b.departure || '', 150);
  const preferredDate = /^\d{4}-\d\d-\d\d$/.test(b.preferredDate || b.due || b.date) ? (b.preferredDate || b.due || b.date) : new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
  const priority = b.priority === 'urgent' || b.urg ? 'urgent' : 'normal';

  const id = nextId('maintenance');
  const nowTs = Date.now();

  try {
    db.prepare(`
      INSERT INTO bookings (
        id, full_name, email, phone, departure, destination, travel_date, departure_time,
        passengers, vehicle_pref, luggage, instructions, created, status, assigned_vehicle,
        assigned_driver, internal_notes, updated, customer_type, company_name, contact_person,
        company_reg, billing_details, booking_category, cargo_type, cargo_desc, user_id
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, '09:00',
        1, 'Service Team', '', ?, ?, 'Pending', '',
        '', '', ?, ?, ?, ?,
        '', '', 'service', ?, ?, ?
      )
    `).run(
      id, sess.fullName || sess.username, sess.email, b.phone || sess.phone || '', address || 'Client Facility', address || 'Client Facility', preferredDate,
      description, nowTs, nowTs, sess.customerType || 'individual', sess.companyName || '', sess.fullName || '',
      service, description, sess.id
    );

    const r = {
      id,
      wf: 'maintenance',
      title: `🛠️ ${service}: ${title}`,
      client: sess.fullName || sess.username,
      a: address || 'Client Facility',
      b: address || 'Client Facility',
      t: `Service: ${service} | ${description} | Contact: ${sess.email} (${sess.phone || b.phone || 'N/A'})`,
      pri: priority,
      due: preferredDate,
      step: 0,
      created: nowTs,
      done: null,
      log: JSON.stringify([{ step: 'Request submitted', note: `Service request received for ${service}.`, ts: nowTs }]),
      web: 1,
      user_id: sess.id
    };
    db.prepare('INSERT INTO records (id, wf, title, client, a, b, t, pri, due, step, created, done, log, web, user_id) VALUES(@id,@wf,@title,@client,@a,@b,@t,@pri,@due,@step,@created,@done,@log,@web,@user_id)').run(r);

    logAdminAction('New Service Request', id, `Service request for ${service} submitted by ${sess.username}`);
    s.json({ ok: 1, id, serviceRequest: { id, service, title, status: 'Pending', created: nowTs } });
  } catch (err) {
    console.error('Service request error:', err);
    s.status(500).json({ error: 'Failed to process service request.' });
  }
});

// Secure file upload handler for cargo photographs & supporting documents (Requires Login)
app.post('/api/upload/cargo', auth, rateLimit({ windowMs: 3600e3, limit: 60, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  upload.array('documents', 3)(q, s, err => {
    if (err) {
      return s.status(400).json({ error: err.message || 'File upload failed' });
    }
    const uploadedFiles = q.files || [];
    for (const f of uploadedFiles) {
      const ext = path.extname(f.filename).toLowerCase();
      if (!checkFileMagicBytes(f.path, ext)) {
        for (const uf of uploadedFiles) {
          try { if (fs.existsSync(uf.path)) fs.unlinkSync(uf.path); } catch (_) { }
        }
        return s.status(400).json({ error: `File type mismatch: ${f.originalname} content does not match extension ${ext}.` });
      }
    }

    const files = uploadedFiles.map(f => ({
      name: clip(f.originalname, 150),
      filename: f.filename,
      path: '/uploads_private/cargo/' + f.filename,
      size: f.size,
      mimetype: f.mimetype
    }));
    s.json({ ok: 1, files });
  });
});

// Serve uploaded cargo documents strictly to authorized staff or the owning customer
function servePrivateCargoFile(q, s) {
  const sess = parseSession(q);
  if (!sess) {
    return s.status(401).json({ error: 'Authentication required to access documents.' });
  }

  const rawFilename = path.basename(q.params.filename || '');
  if (!rawFilename || rawFilename.includes('..')) {
    return s.status(400).json({ error: 'Invalid filename' });
  }

  const filePath = path.join(UPLOADS_PRIVATE_DIR, rawFilename);
  if (!fs.existsSync(filePath)) {
    return s.status(404).json({ error: 'Document not found' });
  }

  // Allowed for super_admin or dept_distribution staff
  if (sess.role === 'super_admin' || sess.role === 'dept_distribution' || (sess.role.startsWith('dept_') && sess.department === 'distribution')) {
    return s.sendFile(filePath);
  }

  // Allowed for the customer who owns the booking referencing this document
  const bk = db.prepare('SELECT id, user_id, email FROM bookings WHERE cargo_docs LIKE ?').get(`%${rawFilename}%`);
  if (bk) {
    if ((bk.user_id && bk.user_id === sess.id) || (sess.email && bk.email && bk.email.toLowerCase() === sess.email.toLowerCase())) {
      return s.sendFile(filePath);
    }
  }

  return s.status(403).json({ error: 'Access denied: You do not have permission to view this document.' });
}

app.get('/uploads_private/cargo/:filename', servePrivateCargoFile);
app.get('/uploads/cargo/:filename', servePrivateCargoFile);
app.get('/api/uploads/cargo/:filename', servePrivateCargoFile);

// ==========================================
// ORDERING WORKFLOW & MULTI-MODAL STEPS
// ==========================================
const STEPS_BY_MODE = {
  sea: [
    'Order confirmed',
    'Cargo received',
    'Loaded on vessel',
    'At sea',
    'Arrived at port',
    'Customs clearance',
    'Out for delivery',
    'Delivered'
  ],
  air: [
    'Order confirmed',
    'Cargo received',
    'Departed airport',
    'In flight',
    'Arrived',
    'Customs clearance',
    'Out for delivery',
    'Delivered'
  ],
  road: [
    'Order confirmed',
    'Picked up',
    'In transit',
    'At border/checkpoint (if needed)',
    'Out for delivery',
    'Delivered'
  ],
  service: [
    'Request submitted',
    'Under review',
    'Assigned to specialist',
    'In progress',
    'Completed'
  ]
};

function buildBookingSteps(bk, rc, logs = []) {
  let mode = (bk && bk.transport_mode) ? bk.transport_mode.toLowerCase() : null;
  if (!mode) {
    if (bk && bk.booking_category === 'service') mode = 'service';
    else if (rc && (rc.wf === 'maintenance' || rc.wf === 'onboarding')) mode = 'service';
    else mode = 'road';
  }
  const stepNames = STEPS_BY_MODE[mode] || STEPS_BY_MODE.road;

  const isCompleted = (bk && (bk.status === 'Delivered' || bk.status === 'Completed')) || (rc && rc.done);
  const isRejected = bk && (bk.status === 'Rejected' || bk.status === 'Cancelled');

  let currentIdx = 0;
  if (isCompleted) {
    currentIdx = stepNames.length - 1;
  } else if (rc && typeof rc.step === 'number') {
    currentIdx = Math.min(rc.step, stepNames.length - 1);
  } else if (bk && bk.status) {
    const sLower = bk.status.toLowerCase();
    const foundIdx = stepNames.findIndex(sn => sn.toLowerCase().includes(sLower) || sLower.includes(sn.toLowerCase()));
    if (foundIdx !== -1) currentIdx = foundIdx;
  }

  const createdTs = bk ? bk.created : (rc ? rc.created : Date.now());
  const updatedTs = bk ? (bk.updated || bk.created) : (rc ? rc.created : Date.now());

  return stepNames.map((name, idx) => {
    let status = 'pending';
    let ts = null;

    if (isCompleted) {
      status = 'done';
    } else if (isRejected) {
      status = idx === 0 ? 'done' : 'pending';
    } else {
      if (idx < currentIdx) status = 'done';
      else if (idx === currentIdx) status = 'current';
      else status = 'pending';
    }

    const matchedLog = logs.find(l => l.step && (l.step.toLowerCase().includes(name.toLowerCase()) || name.toLowerCase().includes(l.step.toLowerCase())));
    if (matchedLog && matchedLog.timestamp) {
      ts = matchedLog.timestamp;
    } else if (matchedLog && matchedLog.ts) {
      ts = matchedLog.ts;
    } else if (status === 'done' || status === 'current') {
      ts = idx === 0 ? createdTs : (idx === currentIdx ? updatedTs : createdTs);
    }

    return {
      index: idx,
      name,
      status,
      timestamp: ts
    };
  });
}

function resolveRouteAndETA(b, departureDate) {
  let routeId = clip(b.route_id || b.routeId, 50) || null;
  let originLocationId = clip(b.origin_location_id || b.originLocationId, 50) || null;
  let destinationLocationId = clip(b.destination_location_id || b.destinationLocationId, 50) || null;
  let transportMode = clip(b.transport_mode || b.transportMode || b.mode || '', 20).toLowerCase();
  let goodsOriginCountry = clip(b.goods_origin_country || b.goodsOriginCountry, 100);
  let pickupAddress = clip(b.pickup_address || b.pickupAddress || b.departure || b.pickupLocation || '', 200);
  let deliveryAddress = clip(b.delivery_address || b.deliveryAddress || b.destination || b.deliveryDestination || '', 200);
  let etaMinDate = clip(b.eta_min_date || b.etaMinDate, 30);
  let etaMaxDate = clip(b.eta_max_date || b.etaMaxDate, 30);
  let quotedPrice = (b.quoted_price !== undefined && b.quoted_price !== null && b.quoted_price !== '') ? parseFloat(b.quoted_price) : ((b.quotedPrice !== undefined && b.quotedPrice !== null && b.quotedPrice !== '') ? parseFloat(b.quotedPrice) : null);
  let currency = clip(b.currency || 'USD', 10);

  let route = null;
  if (routeId) {
    route = db.prepare('SELECT * FROM routes WHERE id=? AND active=1').get(routeId);
    if (!route) {
      return { error: 'Selected route was not found or is inactive.' };
    }
  } else if (originLocationId && destinationLocationId) {
    const candidateRoutes = db.prepare('SELECT * FROM routes WHERE origin_location_id=? AND destination_location_id=? AND active=1').all(originLocationId, destinationLocationId);
    if (candidateRoutes.length > 0) {
      if (transportMode) {
        route = candidateRoutes.find(r => r.mode.toLowerCase() === transportMode.toLowerCase());
        if (!route) {
          return { error: `Mode '${transportMode}' does not exist for this route. Available modes: ${candidateRoutes.map(r => r.mode).join(', ')}` };
        }
      } else {
        route = candidateRoutes[0];
      }
    }
  }

  if (route) {
    routeId = route.id;
    originLocationId = route.origin_location_id;
    destinationLocationId = route.destination_location_id;
    if (transportMode && transportMode !== route.mode.toLowerCase()) {
      return { error: `Selected transport mode '${transportMode}' does not match route mode '${route.mode}'.` };
    }
    transportMode = route.mode.toLowerCase();
    const baseTime = /^\d{4}-\d\d-\d\d$/.test(departureDate) ? new Date(departureDate).getTime() : Date.now();
    if (!etaMinDate) {
      etaMinDate = new Date(baseTime + route.transit_days_min * 864e5).toISOString().slice(0, 10);
    }
    if (!etaMaxDate) {
      etaMaxDate = new Date(baseTime + route.transit_days_max * 864e5).toISOString().slice(0, 10);
    }
    if (quotedPrice === null || isNaN(quotedPrice)) {
      quotedPrice = route.price_from;
    }
    currency = route.currency || currency;
  } else {
    if (!transportMode) transportMode = 'road';
    if (!['sea', 'air', 'road'].includes(transportMode)) transportMode = 'road';
  }

  return {
    routeId,
    originLocationId,
    destinationLocationId,
    transportMode,
    goodsOriginCountry,
    pickupAddress,
    deliveryAddress,
    etaMinDate,
    etaMaxDate,
    quotedPrice,
    currency
  };
}

// Helper to process and store cargo & goods bookings
function processCargoBooking(b, s, q) {
  // REQUIRE LOGGED-IN CUSTOMER TO ORDER
  const sess = q ? parseSession(q) : null;
  if (!sess || !sess.id) {
    return s.status(401).json({ error: 'Authentication required. Please sign in or create an account to place an order.' });
  }

  // user_id is ALWAYS taken from the session; name & email come from account, never from request body
  const userId = sess.id;
  const fullName = clip(sess.fullName || sess.username, 100);
  const email = clip(sess.email, 100);

  const customerType = (b.customerType || b.customer_type) === 'company' || sess.customerType === 'company' ? 'company' : 'individual';
  const companyName = sess.companyName || clip(b.companyName || b.company_name, 150);
  const contactPerson = clip(b.contactPerson || b.contact_person, 100);
  const companyReg = clip(b.companyReg || b.company_reg, 100);
  const billingDetails = clip(b.billingDetails || b.billing_details, 200);
  const phone = clip(b.phone || sess.phone, 50);

  // Cargo specs
  const cargoType = clip(b.cargoType || b.cargo_type, 100);
  const cargoDesc = clip(b.cargoDesc || b.cargo_desc, 1000);
  const packagesCount = Math.max(1, parseInt(b.packagesCount || b.packages_count, 10) || 1);
  const cargoWeight = clip(b.cargoWeight || b.cargo_weight, 80);
  const cargoDimensions = clip(b.cargoDimensions || b.cargo_dimensions, 100);
  const specialHandling = clip(b.specialHandling || b.special_handling, 300);

  // Validate cargoDocs: array of at most 3 items {name, path, size}, path inside private uploads, name clipped
  let parsedDocs = [];
  let rawDocs = b.cargoDocs !== undefined ? b.cargoDocs : b.cargo_docs;
  if (typeof rawDocs === 'string' && rawDocs.trim() !== '') {
    try {
      rawDocs = JSON.parse(rawDocs);
    } catch (_) {
      return s.status(400).json({ error: 'cargoDocs must be valid JSON array' });
    }
  }

  if (rawDocs === undefined || rawDocs === null || rawDocs === '') {
    parsedDocs = [];
  } else if (!Array.isArray(rawDocs)) {
    return s.status(400).json({ error: 'cargoDocs must be an array of at most 3 items.' });
  } else {
    if (rawDocs.length > 3) {
      return s.status(400).json({ error: 'cargoDocs must contain at most 3 items.' });
    }
    for (const item of rawDocs) {
      if (!item || typeof item !== 'object') {
        return s.status(400).json({ error: 'Invalid document entry in cargoDocs.' });
      }
      const docName = clip(item.name || '', 150);
      const docPath = String(item.path || '').trim();
      const docSize = Math.max(0, parseInt(item.size, 10) || 0);

      if (!docPath) {
        return s.status(400).json({ error: 'Document path is required in cargoDocs.' });
      }

      const normPath = path.normalize(docPath).replace(/\\/g, '/');
      const filename = path.basename(docPath);
      const isInsidePrivateUploads = (
        (normPath.startsWith('/uploads_private/cargo/') || normPath.startsWith('uploads_private/cargo/') ||
          normPath.startsWith('/uploads/cargo/') || normPath.startsWith('uploads/cargo/')) &&
        !docPath.includes('..') &&
        filename.length > 0
      );

      if (!isInsidePrivateUploads) {
        return s.status(400).json({ error: 'Document path must be inside the private uploads folder.' });
      }

      parsedDocs.push({
        name: docName,
        path: '/uploads_private/cargo/' + filename,
        size: docSize
      });
    }
  }
  const cargoDocs = JSON.stringify(parsedDocs);

  // Transportation route & schedule
  const pickupLocation = clip(b.pickupLocation || b.departure || b.pickup_location, 150);
  const deliveryDestination = clip(b.deliveryDestination || b.destination || b.delivery_destination, 150);
  const pickupDate = /^\d{4}-\d\d-\d\d$/.test(b.pickupDate || b.travelDate || b.pickup_date) ? (b.pickupDate || b.travelDate || b.pickup_date) : '';
  const deliveryDate = /^\d{4}-\d\d-\d\d$/.test(b.deliveryDate || b.delivery_date) ? (b.deliveryDate || b.delivery_date) : pickupDate;
  const vehiclePref = clip(b.vehiclePreference || b.vehicle_pref, 100);
  const instructions = clip(b.instructions || b.additionalInstructions, 1000);

  // Validation
  if (!fullName || !email || !phone) {
    return s.status(400).json({ error: 'Please provide customer name, email address, and phone number.' });
  }
  if (customerType === 'company' && !contactPerson) {
    return s.status(400).json({ error: 'Please specify the company contact person for corporate cargo bookings.' });
  }
  if (!cargoType || !cargoDesc || !cargoWeight) {
    return s.status(400).json({ error: 'Please provide cargo type of goods, description, and estimated weight.' });
  }
  if (!pickupLocation || !deliveryDestination || !pickupDate || !vehiclePref) {
    return s.status(400).json({ error: 'Please provide pickup location, delivery destination, pickup date, and preferred vehicle.' });
  }

  // Route & Mode Validation
  const routeRes = resolveRouteAndETA(b, pickupDate);
  if (routeRes.error) {
    return s.status(400).json({ error: routeRes.error });
  }

  try {
    const id = nextId('cargo');
    const created = Date.now();

    // 1. Save in dedicated bookings table with status 'Pending'
    db.prepare(`
      INSERT INTO bookings (
        id, full_name, email, phone, departure, destination, travel_date, departure_time,
        passengers, vehicle_pref, luggage, instructions, created, status, assigned_vehicle,
        assigned_driver, internal_notes, updated, customer_type, company_name, contact_person,
        company_reg, billing_details, booking_category, cargo_type, cargo_desc, packages_count,
        cargo_weight, cargo_dimensions, special_handling, cargo_docs, delivery_date, user_id,
        origin_location_id, destination_location_id, transport_mode, route_id,
        goods_origin_country, pickup_address, delivery_address, eta_min_date, eta_max_date, quoted_price, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '', '', '', ?, ?, ?, ?, ?, ?, 'cargo', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, fullName, email, phone, pickupLocation, deliveryDestination, pickupDate, '08:00',
      packagesCount, vehiclePref, cargoWeight, instructions, created, created,
      customerType, companyName, contactPerson, companyReg, billingDetails,
      cargoType, cargoDesc, packagesCount, cargoWeight, cargoDimensions, specialHandling, cargoDocs, deliveryDate, userId,
      routeRes.originLocationId, routeRes.destinationLocationId, routeRes.transportMode, routeRes.routeId,
      routeRes.goodsOriginCountry, routeRes.pickupAddress, routeRes.deliveryAddress, routeRes.etaMinDate, routeRes.etaMaxDate, routeRes.quotedPrice, routeRes.currency
    );

    // 2. Save in records table for freight operations tracking
    const clientDisplay = customerType === 'company'
      ? `${companyName || fullName} (Attn: ${contactPerson || fullName})`
      : fullName;
    const corpMeta = customerType === 'company'
      ? ` | Corporate: ${companyName || fullName} | Contact: ${contactPerson}${companyReg ? ' | Reg: ' + companyReg : ''}${billingDetails ? ' | Billing: ' + billingDetails : ''}`
      : ' | Type: Individual Shipper';

    const detailText = `Cargo Transport: ${cargoType} | Mode: ${routeRes.transportMode} | ${packagesCount} pkgs (${cargoWeight}) | ${vehiclePref} | Pickup: ${pickupLocation} | Dest: ${deliveryDestination} | Dates: ${pickupDate} to ${deliveryDate}${routeRes.etaMinDate ? ' | ETA: ' + routeRes.etaMinDate + ' - ' + routeRes.etaMaxDate : ''}${specialHandling ? ' | Handling: ' + specialHandling : ''}${corpMeta} | Contact: ${email} / ${phone} | Instructions: ${instructions || 'None'}`;

    const r = {
      id,
      wf: 'cargo',
      title: `${customerType === 'company' ? '🏢 Corporate Freight' : '📦 Cargo'}: ${cargoType} (${cargoWeight})`,
      client: clientDisplay,
      a: pickupLocation,
      b: deliveryDestination,
      t: clip(detailText, 2000),
      pri: b.priority === 'urgent' ? 'urgent' : 'normal',
      due: deliveryDate || pickupDate,
      step: 0,
      created,
      done: null,
      log: JSON.stringify([{
        step: 'Order confirmed',
        note: `Online cargo shipment registered from ${clientDisplay}. Mode: ${routeRes.transportMode}. Goods: ${cargoType} (${packagesCount} pkgs, ${cargoWeight}). Status: Pending review by freight dispatch.`,
        ts: created
      }]),
      web: 1,
      user_id: sess.id
    };
    db.prepare('INSERT INTO records (id, wf, title, client, a, b, t, pri, due, step, created, done, log, web, user_id) VALUES(@id,@wf,@title,@client,@a,@b,@t,@pri,@due,@step,@created,@done,@log,@web,@user_id)').run(r);

    return s.json({
      ok: 1,
      id,
      booking: {
        id,
        bookingCategory: 'cargo',
        customerType,
        companyName,
        contactPerson,
        companyReg,
        billingDetails,
        fullName,
        email,
        phone,
        cargoType,
        cargoDesc,
        packagesCount,
        cargoWeight,
        cargoDimensions,
        specialHandling,
        cargoDocs: parsedDocs,
        pickupLocation,
        deliveryDestination,
        departure: pickupLocation,
        destination: deliveryDestination,
        origin_location_id: routeRes.originLocationId,
        destination_location_id: routeRes.destinationLocationId,
        transport_mode: routeRes.transportMode,
        mode: routeRes.transportMode,
        route_id: routeRes.routeId,
        goods_origin_country: routeRes.goodsOriginCountry,
        pickup_address: routeRes.pickupAddress,
        delivery_address: routeRes.deliveryAddress,
        eta_min_date: routeRes.etaMinDate,
        eta_max_date: routeRes.etaMaxDate,
        quoted_price: routeRes.quotedPrice,
        currency: routeRes.currency,
        pickupDate,
        deliveryDate,
        vehiclePreference: vehiclePref,
        instructions,
        status: 'Pending',
        assignedVehicle: '',
        assignedDriver: '',
        created
      }
    });
  } catch (err) {
    console.error('Cargo booking save error:', err);
    return s.status(500).json({ error: 'Failed to process cargo booking. Please try again.' });
  }
}

// Dedicated Cargo Booking API
app.post('/api/cargo/bookings', rateLimit({ windowMs: 3600e3, limit: 100, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  processCargoBooking(q.body, s, q);
});

// Dedicated Passenger Transportation booking submission (Individual & Company)
app.post('/api/bookings', rateLimit({ windowMs: 3600e3, limit: 100, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  const b = q.body;
  if (b.bookingCategory === 'cargo' || b.booking_category === 'cargo') {
    return processCargoBooking(b, s, q);
  }

  // REQUIRE LOGGED-IN CUSTOMER TO ORDER
  const sess = parseSession(q);
  if (!sess || !sess.id) {
    return s.status(401).json({ error: 'Authentication required. Please sign in or create an account to place an order.' });
  }

  // user_id is ALWAYS taken from the session; name & email come from account, never from request body
  const userId = sess.id;
  const fullName = clip(sess.fullName || sess.username, 100);
  const email = clip(sess.email, 100);

  const customerType = (b.customerType || b.customer_type) === 'company' || sess.customerType === 'company' ? 'company' : 'individual';
  const companyName = sess.companyName || clip(b.companyName || b.company_name, 150);
  const contactPerson = clip(b.contactPerson || b.contact_person, 100);
  const companyReg = clip(b.companyReg || b.company_reg, 100);
  const billingDetails = clip(b.billingDetails || b.billing_details, 200);
  const phone = clip(b.phone || sess.phone, 50);

  const departure = clip(b.departure, 150);
  const destination = clip(b.destination, 150);
  const travelDate = /^\d{4}-\d\d-\d\d$/.test(b.travelDate || b.travel_date) ? (b.travelDate || b.travel_date) : '';
  const departureTime = clip(b.departureTime || b.departure_time, 30);
  const passengers = Math.max(1, parseInt(b.passengers, 10) || 1);
  const vehiclePref = clip(b.vehiclePreference || b.vehicle_pref, 100);
  const luggage = clip(b.luggage, 200);
  const instructions = clip(b.instructions || b.additionalRequirements, 1000);

  // Validate required fields
  if (!fullName || !email || !phone || !departure || !destination || !travelDate || !departureTime || !vehiclePref) {
    return s.status(400).json({ error: 'Please provide all required passenger transportation details.' });
  }

  if (customerType === 'company' && !contactPerson) {
    return s.status(400).json({ error: 'Please specify the company contact person for corporate bookings.' });
  }

  // Route & Mode Validation
  const routeRes = resolveRouteAndETA(b, travelDate);
  if (routeRes.error) {
    return s.status(400).json({ error: routeRes.error });
  }

  try {
    const id = nextId('transport');
    const created = Date.now();

    // 1. Save in dedicated bookings table with default status 'Pending'
    db.prepare(`
      INSERT INTO bookings (
        id, full_name, email, phone, departure, destination, travel_date, departure_time,
        passengers, vehicle_pref, luggage, instructions, created, status, assigned_vehicle,
        assigned_driver, internal_notes, updated, customer_type, company_name, contact_person,
        company_reg, billing_details, booking_category, user_id,
        origin_location_id, destination_location_id, transport_mode, route_id,
        goods_origin_country, pickup_address, delivery_address, eta_min_date, eta_max_date, quoted_price, currency
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '', '', '', ?, ?, ?, ?, ?, ?, 'passenger', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id, fullName, email, phone, departure, destination, travelDate, departureTime,
      passengers, vehiclePref, luggage, instructions, created, created,
      customerType, companyName, contactPerson, companyReg, billingDetails, userId,
      routeRes.originLocationId, routeRes.destinationLocationId, routeRes.transportMode, routeRes.routeId,
      routeRes.goodsOriginCountry, routeRes.pickupAddress, routeRes.deliveryAddress, routeRes.etaMinDate, routeRes.etaMaxDate, routeRes.quotedPrice, routeRes.currency
    );

    // 2. Save in records table for operations workflow execution
    const clientDisplay = customerType === 'company'
      ? `${companyName || fullName} (Attn: ${contactPerson || fullName})`
      : fullName;
    const corpMeta = customerType === 'company'
      ? ` | Corporate: ${companyName || fullName} | Contact: ${contactPerson}${companyReg ? ' | Reg: ' + companyReg : ''}${billingDetails ? ' | Billing: ' + billingDetails : ''}`
      : ' | Type: Individual';

    const detailText = `Passenger Transportation: ${vehiclePref} | Passengers: ${passengers} | Time: ${departureTime} | Email: ${email} | Phone: ${phone}${corpMeta} | Luggage: ${luggage || 'Standard'} | Instructions: ${instructions || 'None'}`;

    const r = {
      id,
      wf: 'transport',
      title: `${customerType === 'company' ? '🏢 Corporate' : '👤 Passenger'}: ${vehiclePref} (${passengers} pax)`,
      client: clientDisplay,
      a: departure,
      b: destination,
      t: clip(detailText, 2000),
      pri: b.priority === 'urgent' ? 'urgent' : 'normal',
      due: travelDate,
      step: 0,
      created,
      done: null,
      log: JSON.stringify([{
        step: 'Order confirmed',
        note: `Online passenger booking received from ${clientDisplay}. Vehicle: ${vehiclePref}. Status: Pending review by operations desk.`,
        ts: created
      }]),
      web: 1,
      user_id: sess.id
    };
    db.prepare('INSERT INTO records (id, wf, title, client, a, b, t, pri, due, step, created, done, log, web, user_id) VALUES(@id,@wf,@title,@client,@a,@b,@t,@pri,@due,@step,@created,@done,@log,@web,@user_id)').run(r);

    s.json({
      ok: 1,
      id,
      booking: {
        id,
        bookingCategory: 'passenger',
        customerType,
        companyName,
        contactPerson,
        companyReg,
        billingDetails,
        fullName,
        email,
        phone,
        departure,
        destination,
        travelDate,
        departureTime,
        passengers,
        vehiclePreference: vehiclePref,
        luggage,
        instructions,
        origin_location_id: routeRes.originLocationId,
        destination_location_id: routeRes.destinationLocationId,
        transport_mode: routeRes.transportMode,
        mode: routeRes.transportMode,
        route_id: routeRes.routeId,
        goods_origin_country: routeRes.goodsOriginCountry,
        pickup_address: routeRes.pickupAddress,
        delivery_address: routeRes.deliveryAddress,
        eta_min_date: routeRes.etaMinDate,
        eta_max_date: routeRes.etaMaxDate,
        quoted_price: routeRes.quotedPrice,
        currency: routeRes.currency,
        status: 'Pending',
        assignedVehicle: '',
        assignedDriver: '',
        created
      }
    });
  } catch (err) {
    console.error('Booking save error:', err);
    s.status(500).json({ error: 'Failed to process booking. Please try again.' });
  }
});

// Public: check booking / journey / cargo status by reference ID
// STRICT PRIVACY: Masked client names, NO phone numbers, NO emails, NO billing details, NO internal notes.
// Extra field required: phone number's last 4 digits OR booking email.
app.get('/api/bookings/:id', rateLimit({ windowMs: 60e3, limit: 200, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  const genericNotFound = () => s.status(404).json({ error: 'Booking or consignment not found' });

  const rawId = clip(q.params.id, 35).trim();
  if (!/^[A-Za-z0-9\-_]{3,30}$/.test(rawId)) {
    return genericNotFound();
  }

  const id = rawId.toUpperCase();
  const bk = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  const rc = db.prepare('SELECT * FROM records WHERE id=?').get(id);

  if (!bk && !rc) {
    return genericNotFound();
  }

  // Verification check: needs reference number PLUS phone number's last 4 digits OR booking email
  const verifier = String(q.query.verifier || q.query.phone || q.query.email || q.query.code || (q.body && (q.body.verifier || q.body.phone || q.body.email)) || '').trim().toLowerCase();
  const sess = parseSession(q);

  let verified = false;

  // Authenticated super_admin, department staff, or booking owner
  if (sess) {
    if (sess.role === 'super_admin' || sess.role.startsWith('dept_')) {
      verified = true;
    } else if (bk && ((bk.user_id && bk.user_id === sess.id) || (sess.email && bk.email && bk.email.toLowerCase() === sess.email.toLowerCase()))) {
      verified = true;
    }
  }

  // Public verifier verification
  if (!verified) {
    if (!verifier) {
      return genericNotFound();
    }

    let bookingPhoneDigits = '';
    let bookingEmail = '';

    if (bk) {
      bookingPhoneDigits = String(bk.phone || '').replace(/\D/g, '');
      bookingEmail = String(bk.email || '').trim().toLowerCase();
    } else if (rc) {
      const emailMatch = String(rc.t || '').match(/[\w.-]+@[\w.-]+\.[a-zA-Z]{2,}/);
      if (emailMatch) bookingEmail = emailMatch[0].trim().toLowerCase();
      const phoneMatch = String(rc.t || '').match(/\(?\+?\d[\d\s-]{6,}\d/);
      if (phoneMatch) bookingPhoneDigits = phoneMatch[0].replace(/\D/g, '');
    }

    const phoneLast4 = bookingPhoneDigits.slice(-4);
    const verifierDigits = verifier.replace(/\D/g, '');

    const phoneMatches = (phoneLast4.length === 4 && (verifierDigits === phoneLast4 || (verifierDigits.length >= 4 && verifierDigits.endsWith(phoneLast4))));
    const emailMatches = (bookingEmail.length > 0 && verifier === bookingEmail);

    if (phoneMatches || emailMatches) {
      verified = true;
    }
  }

  if (!verified) {
    return genericNotFound();
  }

  const isCargo = (bk && bk.booking_category === 'cargo') || (rc && rc.wf === 'cargo') || id.startsWith('CR-');

  const transportSteps = [
    ['Transport Request', 'Booking request verified & registered in ASIL queue'],
    ['Trip Planning', 'Route, access & security checked'],
    ['Vehicle Assignment', 'Vehicle & dedicated chauffeur allocated'],
    ['Loading & Documentation', 'Boarding checklist & documentation ready'],
    ['Dispatch', 'Chauffeur briefed & vehicle dispatched'],
    ['Transit Monitoring', 'Movement updates sent to client'],
    ['Delivery', 'Arrived safely at destination'],
    ['Proof of Delivery', 'Passenger confirmation & arrival signed'],
    ['Trip Closure & Reporting', 'Trip completed & closed']
  ];

  const cargoSteps = [
    ['Booking Intake & Verification', 'Cargo booking registered and specifications reviewed'],
    ['Booking Approved & Staged', 'Shipment approved, dispatch route cleared & manifest generated'],
    ['Pickup Scheduled & Vehicle Assigned', 'Freight vehicle and certified driver assigned for pickup'],
    ['Cargo Picked Up & Loaded', 'Cargo loaded, secured, weight checked & consignment note signed'],
    ['In Transit (Live Telemetry)', 'Shipment en route with GPS tracking and route monitoring'],
    ['Out for Delivery', 'Shipment arrived at destination hub, out for last-mile delivery'],
    ['Delivery & Inspection', 'Arrived at delivery address, recipient cargo inspection underway'],
    ['Delivered & Signed', 'Cargo safely handed over to recipient, Proof of Delivery (POD) signed'],
    ['Shipment Closed', 'Proof of Delivery archived, trip and billing reconciled']
  ];

  const stepsList = isCargo ? cargoSteps : transportSteps;
  const currentStep = rc ? rc.step : 0;
  const isDone = rc ? rc.step >= (LEN[rc.wf] || 9) : false;
  const isCompleted = isDone || (bk && (bk.status === 'Completed' || bk.status === 'Delivered'));
  const isRejected = bk && bk.status === 'Rejected';
  const isCancelled = bk && bk.status === 'Cancelled';
  const effectiveStep = isCompleted ? (stepsList.length - 1) : currentStep;
  const stepInfo = stepsList[Math.min(currentStep, stepsList.length - 1)] || ['In Progress', 'Processing next checkpoint'];

  // Status prioritizing dedicated booking status
  let displayStatus = bk && bk.status ? bk.status : (isDone ? (isCargo ? 'Delivered' : 'Completed') : (currentStep === 0 ? 'Pending' : 'In Progress'));

  // Mask client name for privacy (e.g. Ali Babiker -> Ali B***; companies retain company name)
  const customerType = bk ? (bk.customer_type || 'individual') : 'individual';
  const rawCompany = bk ? (bk.company_name || '') : '';
  const rawName = bk ? bk.full_name : (rc ? rc.client : 'Client');
  let maskedClient = '';
  if (customerType === 'company' && rawCompany) {
    maskedClient = rawCompany;
  } else if (rawName) {
    const parts = rawName.trim().split(/\s+/);
    maskedClient = parts.map((p, i) => i === 0 ? p : (p[0] + '***')).join(' ');
  } else {
    maskedClient = 'Valued Customer';
  }

  // Assigned vehicle: sanitize to only show vehicle model/type, without internal plate/notes
  let publicAssignedVehicle = '';
  if (bk && bk.assigned_vehicle) {
    publicAssignedVehicle = bk.assigned_vehicle;
  }

  // Status History & Updates (customer-safe, NO administrator notes)
  let statusHistory = [];
  if (rc && rc.log) {
    try {
      const logs = JSON.parse(rc.log);
      statusHistory = logs.map(l => ({
        step: l.step,
        note: l.note ? l.note.replace(/Phone:\s*\+?\d[\d\s-]+/gi, '').replace(/Contact:\s*\S+@\S+/gi, '').trim() : '',
        timestamp: l.ts
      }));
    } catch (e) {
      statusHistory = [];
    }
  }

  // If no logs but booking has created timestamp, provide initial intake milestone
  if (!statusHistory.length && bk && bk.created) {
    statusHistory.push({
      step: isCargo ? 'Booking Intake & Verification' : 'Transport Request',
      note: 'Booking request registered and queued for operations review.',
      timestamp: bk.created
    });
  }

  // PRIVACY: instructions, luggage, driver name, cargoDocs, phone, email, companyReg, billingDetails, contactPerson, internal_notes are NEVER returned.
  const computedType = isCargo ? 'Cargo Transportation' : (rc && rc.wf === 'maintenance' ? 'Building Maintenance' : (rc && rc.wf === 'onboarding' ? 'Client Onboarding' : 'Passenger Transportation'));
  const payload = {
    ok: 1,
    id,
    bookingType: computedType,
    bookingCategory: isCargo ? 'cargo' : (rc && rc.wf === 'maintenance' ? 'maintenance' : (rc && rc.wf === 'onboarding' ? 'onboarding' : 'passenger')),
    status: displayStatus,
    step: effectiveStep,
    totalSteps: stepsList.length,
    stepName: isRejected ? 'Booking Declined' : (isCancelled ? 'Booking Cancelled' : (isCompleted ? (isCargo ? 'Delivered & Completed' : 'Trip Completed & Closed') : stepInfo[0])),
    stepDesc: isRejected ? 'Request was declined by operations desk' : (isCancelled ? 'Request was cancelled' : (isCompleted ? 'All milestones safely completed and verified' : stepInfo[1])),
    done: isCompleted,
    rejected: Boolean(isRejected),
    cancelled: Boolean(isCancelled),
    customerType,
    maskedClient,
    fullName: maskedClient,
    departure: (bk && bk.departure) ? bk.departure : ((rc && rc.a) ? rc.a : 'Port Sudan Maritime Terminal'),
    pickupLocation: (bk && bk.departure) ? bk.departure : ((rc && rc.a) ? rc.a : 'Port Sudan Maritime Terminal'),
    destination: (bk && bk.destination) ? bk.destination : ((rc && rc.b) ? rc.b : 'Khartoum Logistics Hub'),
    deliveryDestination: (bk && bk.destination) ? bk.destination : ((rc && rc.b) ? rc.b : 'Khartoum Logistics Hub'),
    travelDate: (bk && bk.travel_date) ? bk.travel_date : ((rc && rc.due) ? rc.due : '–'),
    pickupDate: (bk && bk.travel_date) ? bk.travel_date : ((rc && rc.due) ? rc.due : '–'),
    deliveryDate: bk ? (bk.delivery_date || bk.travel_date) : ((rc && rc.due) ? rc.due : '–'),
    departureTime: bk ? bk.departure_time : '–',
    passengers: bk ? bk.passengers : 1,
    vehiclePreference: bk ? bk.vehicle_pref : (rc ? rc.title : '–'),
    cargoType: bk ? (bk.cargo_type || '') : '',
    cargoDesc: bk ? (bk.cargo_desc || '') : '',
    packagesCount: bk ? (bk.packages_count || 1) : 1,
    cargoWeight: bk ? (bk.cargo_weight || '') : '',
    cargoDimensions: bk ? (bk.cargo_dimensions || '') : '',
    specialHandling: bk ? (bk.special_handling || '') : '',
    assignedVehicle: publicAssignedVehicle,
    origin: (bk && bk.departure) ? bk.departure : ((rc && rc.a) ? rc.a : '–'),
    destination: (bk && bk.destination) ? bk.destination : ((rc && rc.b) ? rc.b : '–'),
    origin_location_id: bk ? bk.origin_location_id : null,
    destination_location_id: bk ? bk.destination_location_id : null,
    route_id: bk ? bk.route_id : null,
    mode: (bk && bk.transport_mode) ? bk.transport_mode : (isCargo ? 'road' : 'road'),
    transport_mode: (bk && bk.transport_mode) ? bk.transport_mode : (isCargo ? 'road' : 'road'),
    goods_origin_country: (bk && bk.goods_origin_country) ? bk.goods_origin_country : '',
    goodsOriginCountry: (bk && bk.goods_origin_country) ? bk.goods_origin_country : '',
    pickup_address: (bk && bk.pickup_address) ? bk.pickup_address : (bk ? bk.departure : ''),
    delivery_address: (bk && bk.delivery_address) ? bk.delivery_address : (bk ? bk.destination : ''),
    eta_min_date: (bk && bk.eta_min_date) ? bk.eta_min_date : '',
    eta_max_date: (bk && bk.eta_max_date) ? bk.eta_max_date : '',
    eta_range: (bk && bk.eta_min_date && bk.eta_max_date)
      ? { min: bk.eta_min_date, max: bk.eta_max_date, display: `${bk.eta_min_date} to ${bk.eta_max_date}` }
      : (bk && (bk.eta_min_date || bk.eta_max_date) ? { min: bk.eta_min_date || bk.eta_max_date, max: bk.eta_max_date || bk.eta_min_date } : null),
    price_quote: (bk && bk.quoted_price !== null && bk.quoted_price !== undefined) ? bk.quoted_price : null,
    quoted_price: (bk && bk.quoted_price !== null && bk.quoted_price !== undefined) ? bk.quoted_price : null,
    currency: (bk && bk.currency) ? bk.currency : 'USD',
    steps: buildBookingSteps(bk, rc, statusHistory),
    created: bk ? bk.created : (rc ? rc.created : Date.now()),
    updated: bk ? bk.updated : (rc ? rc.created : Date.now()),
    statusHistory,
    log: statusHistory
  };
  payload.booking = Object.assign({}, payload);
  s.json(payload);
});

// ==========================================
// PROTECTED ADMIN API ENDPOINTS (Require auth)
// ==========================================

// Admin: Get all travel and cargo bookings with details & live step
app.get('/api/admin/bookings', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare(`
    SELECT b.*, r.step, r.done, r.log, r.pri, r.wf
    FROM bookings b
    LEFT JOIN records r ON b.id = r.id
    ORDER BY b.created DESC
  `).all().map(r => {
    let parsedDocs = [];
    try { if (r.cargo_docs) parsedDocs = JSON.parse(r.cargo_docs); } catch (e) { parsedDocs = []; }
    return {
      id: r.id,
      bookingCategory: r.booking_category || (r.wf === 'cargo' || r.id.startsWith('CR-') ? 'cargo' : 'passenger'),
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      departure: r.departure,
      destination: r.destination,
      travelDate: r.travel_date,
      departureTime: r.departure_time,
      passengers: r.passengers,
      vehiclePreference: r.vehicle_pref,
      luggage: r.luggage || '',
      instructions: r.instructions || '',
      customerType: r.customer_type || 'individual',
      companyName: r.company_name || '',
      contactPerson: r.contact_person || '',
      companyReg: r.company_reg || '',
      billingDetails: r.billing_details || '',
      cargoType: r.cargo_type || '',
      cargoDesc: r.cargo_desc || '',
      packagesCount: r.packages_count || 1,
      cargoWeight: r.cargo_weight || '',
      cargoDimensions: r.cargo_dimensions || '',
      specialHandling: r.special_handling || '',
      cargoDocs: parsedDocs,
      deliveryDate: r.delivery_date || r.travel_date || '',
      status: r.status || 'Pending',
      assignedVehicle: r.assigned_vehicle || '',
      assignedDriver: r.assigned_driver || '',
      internalNotes: r.internal_notes || '',
      created: r.created,
      updated: r.updated || r.created,
      step: r.step != null ? r.step : 0,
      done: !!r.done,
      log: r.log ? JSON.parse(r.log) : []
    };
  });
  s.json(rows);
});

// Admin: Update booking status (support all 9 cargo statuses + passenger statuses), assign vehicle & driver, add notes
app.patch('/api/admin/bookings/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 25).toUpperCase();
  const bk = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!bk) return s.status(404).json({ error: 'Booking not found' });

  const isCargo = (bk.booking_category === 'cargo') || id.startsWith('CR-');

  const VALID_STATUSES = [
    'Pending', 'Approved', 'Pickup Scheduled', 'Picked Up', 'In Transit',
    'Out for Delivery', 'Delivered', 'Rejected', 'Cancelled', 'Completed'
  ];

  let newStatus = bk.status || 'Pending';
  if (q.body.status && VALID_STATUSES.includes(q.body.status)) {
    newStatus = q.body.status;
  }

  const assignedVehicle = q.body.assignedVehicle !== undefined ? clip(q.body.assignedVehicle, 150) : (bk.assigned_vehicle || '');
  const assignedDriver = q.body.assignedDriver !== undefined ? clip(q.body.assignedDriver, 150) : (bk.assigned_driver || '');
  const internalNotes = q.body.internalNotes !== undefined ? clip(q.body.internalNotes, 2000) : (bk.internal_notes || '');
  const etaMin = (q.body.eta_min_date !== undefined || q.body.etaMinDate !== undefined) ? clip(q.body.eta_min_date || q.body.etaMinDate, 30) : (bk.eta_min_date || '');
  const etaMax = (q.body.eta_max_date !== undefined || q.body.etaMaxDate !== undefined) ? clip(q.body.eta_max_date || q.body.etaMaxDate, 30) : (bk.eta_max_date || '');
  const nowTs = Date.now();

  db.prepare(`
    UPDATE bookings
    SET status = ?, assigned_vehicle = ?, assigned_driver = ?, internal_notes = ?,
        eta_min_date = ?, eta_max_date = ?, updated = ?
    WHERE id = ?
  `).run(newStatus, assignedVehicle, assignedDriver, internalNotes, etaMin, etaMax, nowTs, id);

  // Sync with workflow records table
  const rc = db.prepare('SELECT * FROM records WHERE id=?').get(id);
  let updatedStep = rc ? rc.step : 0;
  if (rc) {
    const log = JSON.parse(rc.log || '[]');
    let step = rc.step;
    let done = rc.done;

    // Admin explicit milestone step update
    if (q.body.step !== undefined) {
      const stepVal = q.body.step;
      const stepNames = STEPS_BY_MODE[bk.transport_mode || 'road'] || STEPS_BY_MODE.road;
      if (typeof stepVal === 'number' || /^\d+$/.test(String(stepVal))) {
        step = Math.min(parseInt(stepVal, 10), stepNames.length - 1);
      } else {
        const foundIdx = stepNames.findIndex(sn => sn.toLowerCase() === String(stepVal).toLowerCase());
        step = foundIdx !== -1 ? foundIdx : step;
      }
      const stepName = stepNames[Math.min(step, stepNames.length - 1)] || `Step ${step}`;
      log.push({ step: stepName, note: q.body.note || `Milestone updated to: ${stepName}`, ts: nowTs });
      if (step >= stepNames.length - 1) {
        done = nowTs;
        newStatus = isCargo ? 'Delivered' : 'Completed';
      }
      updatedStep = step;
    } else if (newStatus !== bk.status) {
      let noteMsg = `Status updated to ${newStatus}.`;
      if (assignedVehicle || assignedDriver) {
        noteMsg += ` Vehicle: ${assignedVehicle || 'None'}, Driver: ${assignedDriver || 'None'}.`;
      }
      log.push({ step: `Admin: ${newStatus}`, note: noteMsg, ts: nowTs });

      if (isCargo) {
        if (newStatus === 'Pending') {
          step = 0;
          done = null;
        } else if (newStatus === 'Approved') {
          step = Math.max(step, 1);
          done = null;
        } else if (newStatus === 'Pickup Scheduled') {
          step = Math.max(step, 2);
          done = null;
        } else if (newStatus === 'Picked Up') {
          step = Math.max(step, 3);
          done = null;
        } else if (newStatus === 'In Transit') {
          step = Math.max(step, 4);
          done = null;
        } else if (newStatus === 'Out for Delivery') {
          step = Math.max(step, 5);
          done = null;
        } else if (newStatus === 'Delivered') {
          step = 8;
          done = nowTs;
        } else if (newStatus === 'Rejected' || newStatus === 'Cancelled') {
          done = null;
        }
      } else {
        // Passenger flow
        if (newStatus === 'Pending') {
          step = 0;
          done = null;
        } else if (newStatus === 'Approved') {
          step = Math.max(step, 1);
          done = null;
        } else if (newStatus === 'Pickup Scheduled') {
          step = Math.max(step, 2);
          done = null;
        } else if (newStatus === 'Picked Up') {
          step = Math.max(step, 3);
          done = null;
        } else if (newStatus === 'In Transit') {
          step = Math.max(step, 4);
          done = null;
        } else if (newStatus === 'Out for Delivery') {
          step = Math.max(step, 5);
          done = null;
        } else if (newStatus === 'Completed') {
          step = LEN[rc.wf] || 9;
          done = nowTs;
        } else if (newStatus === 'Rejected' || newStatus === 'Cancelled') {
          done = null;
        }
      }
      updatedStep = step;
    } else if (assignedVehicle !== bk.assigned_vehicle || assignedDriver !== bk.assigned_driver) {
      log.push({
        step: isCargo ? 'Freight Vehicle & Driver Allocated' : 'Vehicle & Driver Allocated',
        note: `Vehicle: ${assignedVehicle || 'Unassigned'} | Driver: ${assignedDriver || 'Unassigned'}`,
        ts: nowTs
      });
      if (assignedVehicle && assignedDriver && step < 2) {
        step = 2; // Step 3: Vehicle Assignment / Pickup Scheduled
      }
      updatedStep = step;
    }

    if (q.body.newNote) {
      log.push({ step: 'Admin Note', note: clip(q.body.newNote, 500), ts: nowTs });
    }

    db.prepare('UPDATE records SET step=?, done=?, log=? WHERE id=?').run(step, done, JSON.stringify(log), id);
  }

  logAdminAction('Booking Updated', id, `Status: "${newStatus}", Step: ${updatedStep}, ETA: "${etaMin} to ${etaMax}", Vehicle: "${assignedVehicle || 'None'}", Driver: "${assignedDriver || 'None'}"`);

  s.json({
    ok: 1,
    id,
    status: newStatus,
    step: updatedStep,
    eta_min_date: etaMin,
    eta_max_date: etaMax,
    assignedVehicle,
    assignedDriver,
    internalNotes,
    updated: nowTs
  });
});

// ==========================================
// ADMIN LOCATIONS & ROUTES CRUD APIS (Super Admin Only)
// ==========================================

// Locations CRUD
app.get('/api/admin/locations', requireRole(['super_admin']), (q, s) => {
  const locations = db.prepare('SELECT * FROM locations ORDER BY country ASC, name ASC').all();
  s.json({ ok: 1, locations });
});

app.post('/api/admin/locations', requireRole(['super_admin']), (q, s) => {
  const b = q.body || {};
  const name = clip(b.name, 150);
  const country = clip(b.country, 100);
  const type = clip(b.type, 50).toLowerCase();
  const lat = b.lat !== undefined && b.lat !== null && b.lat !== '' ? parseFloat(b.lat) : null;
  const lng = b.lng !== undefined && b.lng !== null && b.lng !== '' ? parseFloat(b.lng) : null;
  const active = b.active === false || b.active === 0 ? 0 : 1;
  let id = clip(b.id, 50);

  if (!name || !country || !type) {
    return s.status(400).json({ error: 'Name, country, and type are required for a location.' });
  }
  const ALLOWED_TYPES = ['city', 'port', 'airport', 'warehouse'];
  if (!ALLOWED_TYPES.includes(type)) {
    return s.status(400).json({ error: `Type must be one of: ${ALLOWED_TYPES.join(', ')}` });
  }

  if (!id) {
    id = 'LOC-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  try {
    db.prepare('INSERT INTO locations (id, name, country, type, lat, lng, active) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, name, country, type, lat, lng, active
    );
    logAdminAction('Create Location', id, `Location '${name}' created (${country}, ${type})`, q.session ? q.session.fullName : 'Super Administrator');
    s.status(201).json({ ok: 1, location: { id, name, country, type, lat, lng, active } });
  } catch (err) {
    s.status(400).json({ error: err.message });
  }
});

app.patch('/api/admin/locations/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 50);
  const loc = db.prepare('SELECT * FROM locations WHERE id=?').get(id);
  if (!loc) return s.status(404).json({ error: 'Location not found' });

  const b = q.body || {};
  const name = b.name !== undefined ? clip(b.name, 150) : loc.name;
  const country = b.country !== undefined ? clip(b.country, 100) : loc.country;
  let type = loc.type;
  if (b.type !== undefined) {
    type = clip(b.type, 50).toLowerCase();
    const ALLOWED_TYPES = ['city', 'port', 'airport', 'warehouse'];
    if (!ALLOWED_TYPES.includes(type)) {
      return s.status(400).json({ error: `Type must be one of: ${ALLOWED_TYPES.join(', ')}` });
    }
  }
  const lat = (b.lat !== undefined && b.lat !== null && b.lat !== '') ? parseFloat(b.lat) : loc.lat;
  const lng = (b.lng !== undefined && b.lng !== null && b.lng !== '') ? parseFloat(b.lng) : loc.lng;
  const active = b.active !== undefined ? (b.active ? 1 : 0) : loc.active;

  db.prepare('UPDATE locations SET name=?, country=?, type=?, lat=?, lng=?, active=? WHERE id=?').run(
    name, country, type, lat, lng, active, id
  );
  logAdminAction('Update Location', id, `Location '${id}' updated: ${name}`, q.session ? q.session.fullName : 'Super Administrator');
  s.json({ ok: 1, location: { id, name, country, type, lat, lng, active } });
});

app.delete('/api/admin/locations/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 50);
  const loc = db.prepare('SELECT * FROM locations WHERE id=?').get(id);
  if (!loc) return s.status(404).json({ error: 'Location not found' });

  db.prepare('DELETE FROM locations WHERE id=?').run(id);
  logAdminAction('Delete Location', id, `Location '${id}' (${loc.name}) deleted`, q.session ? q.session.fullName : 'Super Administrator');
  s.json({ ok: 1, deleted: id });
});

// Routes CRUD
app.get('/api/admin/routes', requireRole(['super_admin']), (q, s) => {
  const routes = db.prepare(`
    SELECT r.*,
           loc_o.name AS origin_name, loc_o.country AS origin_country,
           loc_d.name AS destination_name, loc_d.country AS destination_country
      FROM routes r
      LEFT JOIN locations loc_o ON r.origin_location_id = loc_o.id
      LEFT JOIN locations loc_d ON r.destination_location_id = loc_d.id
      ORDER BY r.mode ASC, loc_o.name ASC
  `).all();
  s.json({ ok: 1, routes });
});

app.post('/api/admin/routes', requireRole(['super_admin']), (q, s) => {
  const b = q.body || {};
  const originLocationId = clip(b.origin_location_id || b.originLocationId, 50);
  const destLocationId = clip(b.destination_location_id || b.destinationLocationId, 50);
  const mode = clip(b.mode, 20).toLowerCase();
  const transitDaysMin = parseInt(b.transit_days_min !== undefined ? b.transit_days_min : b.transitDaysMin, 10);
  const transitDaysMax = parseInt(b.transit_days_max !== undefined ? b.transit_days_max : b.transitDaysMax, 10);
  const priceFrom = (b.price_from !== undefined && b.price_from !== null && b.price_from !== '') ? parseFloat(b.price_from) : ((b.priceFrom !== undefined && b.priceFrom !== null && b.priceFrom !== '') ? parseFloat(b.priceFrom) : null);
  const currency = clip(b.currency || 'USD', 10);
  const active = b.active === false || b.active === 0 ? 0 : 1;
  const notes = clip(b.notes || '', 500);
  let id = clip(b.id, 50);

  if (!originLocationId || !destLocationId || !mode || isNaN(transitDaysMin) || isNaN(transitDaysMax)) {
    return s.status(400).json({ error: 'Origin, destination, mode, transit_days_min, and transit_days_max are required.' });
  }
  const ALLOWED_MODES = ['sea', 'air', 'road'];
  if (!ALLOWED_MODES.includes(mode)) {
    return s.status(400).json({ error: `Mode must be one of: ${ALLOWED_MODES.join(', ')}` });
  }

  if (!id) {
    id = 'RT-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  }

  try {
    db.prepare(`
      INSERT INTO routes (id, origin_location_id, destination_location_id, mode, transit_days_min, transit_days_max, price_from, currency, active, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, originLocationId, destLocationId, mode, transitDaysMin, transitDaysMax, priceFrom, currency, active, notes);

    logAdminAction('Create Route', id, `Route '${id}' created (${mode}: ${originLocationId} -> ${destLocationId})`, q.session ? q.session.fullName : 'Super Administrator');
    s.status(201).json({ ok: 1, route: { id, origin_location_id: originLocationId, destination_location_id: destLocationId, mode, transit_days_min: transitDaysMin, transit_days_max: transitDaysMax, price_from: priceFrom, currency, active, notes } });
  } catch (err) {
    s.status(400).json({ error: err.message });
  }
});

app.patch('/api/admin/routes/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 50);
  const r = db.prepare('SELECT * FROM routes WHERE id=?').get(id);
  if (!r) return s.status(404).json({ error: 'Route not found' });

  const b = q.body || {};
  const originLocationId = b.origin_location_id !== undefined ? clip(b.origin_location_id, 50) : (b.originLocationId !== undefined ? clip(b.originLocationId, 50) : r.origin_location_id);
  const destLocationId = b.destination_location_id !== undefined ? clip(b.destination_location_id, 50) : (b.destinationLocationId !== undefined ? clip(b.destinationLocationId, 50) : r.destination_location_id);
  let mode = r.mode;
  if (b.mode !== undefined) {
    mode = clip(b.mode, 20).toLowerCase();
    const ALLOWED_MODES = ['sea', 'air', 'road'];
    if (!ALLOWED_MODES.includes(mode)) return s.status(400).json({ error: `Mode must be one of: ${ALLOWED_MODES.join(', ')}` });
  }
  const transitDaysMin = (b.transit_days_min !== undefined || b.transitDaysMin !== undefined) ? parseInt(b.transit_days_min ?? b.transitDaysMin, 10) : r.transit_days_min;
  const transitDaysMax = (b.transit_days_max !== undefined || b.transitDaysMax !== undefined) ? parseInt(b.transit_days_max ?? b.transitDaysMax, 10) : r.transit_days_max;
  const priceFrom = (b.price_from !== undefined || b.priceFrom !== undefined) ? ((b.price_from ?? b.priceFrom) !== null && (b.price_from ?? b.priceFrom) !== '' ? parseFloat(b.price_from ?? b.priceFrom) : null) : r.price_from;
  const currency = b.currency !== undefined ? clip(b.currency, 10) : r.currency;
  const active = b.active !== undefined ? (b.active ? 1 : 0) : r.active;
  const notes = b.notes !== undefined ? clip(b.notes, 500) : r.notes;

  db.prepare(`
    UPDATE routes
    SET origin_location_id=?, destination_location_id=?, mode=?, transit_days_min=?, transit_days_max=?, price_from=?, currency=?, active=?, notes=?
    WHERE id=?
  `).run(originLocationId, destLocationId, mode, transitDaysMin, transitDaysMax, priceFrom, currency, active, notes, id);

  logAdminAction('Update Route', id, `Route '${id}' updated`, q.session ? q.session.fullName : 'Super Administrator');
  s.json({ ok: 1, route: { id, origin_location_id: originLocationId, destination_location_id: destLocationId, mode, transit_days_min: transitDaysMin, transit_days_max: transitDaysMax, price_from: priceFrom, currency, active, notes } });
});

app.delete('/api/admin/routes/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 50);
  const r = db.prepare('SELECT * FROM routes WHERE id=?').get(id);
  if (!r) return s.status(404).json({ error: 'Route not found' });

  db.prepare('DELETE FROM routes WHERE id=?').run(id);
  logAdminAction('Delete Route', id, `Route '${id}' deleted`, q.session ? q.session.fullName : 'Super Administrator');
  s.json({ ok: 1, deleted: id });
});

// Admin: Delete a booking explicitly
app.delete('/api/admin/bookings/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 25).toUpperCase();
  db.prepare('DELETE FROM records WHERE id=?').run(id);
  db.prepare('DELETE FROM bookings WHERE id=?').run(id);
  logAdminAction('Booking Deleted', id, `Booking ${id} permanently removed.`);
  s.json({ ok: 1 });
});

// Admin: Statistics & Overview (Legacy & Unified)
function getAdminStatistics() {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const startOfWeek = now - 7 * 864e5;
  const startOfMonth = now - 30 * 864e5;

  // A. CUSTOMER STATISTICS (From real registered customer accounts in users table)
  const totalRegisteredCustomers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer'").get().c;
  const individualCustomers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer' AND (customer_type = 'individual' OR customer_type IS NULL OR customer_type = '')").get().c;
  const corporateCustomers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer' AND customer_type = 'company'").get().c;
  const newRegistrationsToday = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer' AND created >= ?").get(startOfDay).c;
  const newRegistrationsWeek = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer' AND created >= ?").get(startOfWeek).c;
  const newRegistrationsMonth = db.prepare("SELECT COUNT(*) as c FROM users WHERE role = 'customer' AND created >= ?").get(startOfMonth).c;

  // B. CUSTOMER MESSAGES AND INQUIRIES
  const totalInquiries = db.prepare("SELECT COUNT(*) as c FROM inquiries").get().c;
  const newInquiries = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'new'").get().c;
  const readInquiries = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'read'").get().c;
  const repliedInquiries = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE status = 'replied'").get().c;
  const quoteRequests = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE category = 'quote' OR department LIKE '%quote%'").get().c;
  const generalInquiries = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE (category != 'quote' OR category IS NULL) AND (department NOT LIKE '%quote%')").get().c;
  const inquiriesToday = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE created >= ?").get(startOfDay).c;
  const inquiriesMonth = db.prepare("SELECT COUNT(*) as c FROM inquiries WHERE created >= ?").get(startOfMonth).c;

  // C. ORDER STATISTICS
  const totalOrders = db.prepare("SELECT COUNT(*) as c FROM bookings").get().c;
  const passengerOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_category = 'passenger' OR booking_category IS NULL OR booking_category = ''").get().c;
  const cargoOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_category = 'cargo'").get().c;
  const pendingOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'Pending'").get().c;
  const approvedOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'Approved'").get().c;
  const rejectedOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'Rejected'").get().c;
  const cancelledOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status = 'Cancelled'").get().c;
  const inProgressOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status IN ('In Progress', 'Pickup Scheduled', 'Picked Up', 'In Transit', 'Out for Delivery')").get().c;
  const completedOrders = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE status IN ('Completed', 'Delivered')").get().c;

  // D. SHIPMENT STATISTICS (Cargo focus)
  const totalShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE booking_category = 'cargo' OR id LIKE 'CR-%'").get().c;
  const pendingShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE (booking_category = 'cargo' OR id LIKE 'CR-%') AND status = 'Pending'").get().c;
  const approvedShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE (booking_category = 'cargo' OR id LIKE 'CR-%') AND status = 'Approved'").get().c;
  const pickedUpShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE (booking_category = 'cargo' OR id LIKE 'CR-%') AND status IN ('Pickup Scheduled', 'Picked Up')").get().c;
  const inTransitShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE (booking_category = 'cargo' OR id LIKE 'CR-%') AND status = 'In Transit'").get().c;
  const outForDeliveryShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE (booking_category = 'cargo' OR id LIKE 'CR-%') AND status = 'Out for Delivery'").get().c;
  const deliveredShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE (booking_category = 'cargo' OR id LIKE 'CR-%') AND status = 'Delivered'").get().c;
  const cancelledShipments = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE (booking_category = 'cargo' OR id LIKE 'CR-%') AND status IN ('Cancelled', 'Rejected')").get().c;

  // E. BUSINESS PERFORMANCE (Fleet & Drivers)
  const totalVehicles = db.prepare("SELECT COUNT(*) as c FROM vehicles").get().c;
  const availableVehicles = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'Available'").get().c;
  const dispatchedVehicles = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'Dispatched'").get().c;
  const maintenanceVehicles = db.prepare("SELECT COUNT(*) as c FROM vehicles WHERE status = 'Under Maintenance'").get().c;

  const totalDrivers = db.prepare("SELECT COUNT(*) as c FROM drivers").get().c;
  const activeDrivers = db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'Active'").get().c;
  const driversOnTrips = db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'On Trip'").get().c;
  const offDutyDrivers = db.prepare("SELECT COUNT(*) as c FROM drivers WHERE status = 'Off Duty'").get().c;

  // F. WEBSITE VISITOR ANALYTICS
  let totalPageViews = 0, uniqueVisitors = 0, todayViews = 0, todayVisitors = 0;
  try {
    totalPageViews = db.prepare("SELECT COUNT(*) as c FROM page_views").get().c;
    uniqueVisitors = db.prepare("SELECT COUNT(DISTINCT visitor_hash) as c FROM page_views").get().c;
    todayViews = db.prepare("SELECT COUNT(*) as c FROM page_views WHERE created >= ?").get(startOfDay).c;
    todayVisitors = db.prepare("SELECT COUNT(DISTINCT visitor_hash) as c FROM page_views WHERE created >= ?").get(startOfDay).c;
  } catch (_) {}

  return {
    customerStats: {
      totalRegistered: totalRegisteredCustomers,
      individual: individualCustomers,
      corporate: corporateCustomers,
      newToday: newRegistrationsToday,
      newThisWeek: newRegistrationsWeek,
      newThisMonth: newRegistrationsMonth
    },
    inquiryStats: {
      total: totalInquiries,
      new: newInquiries,
      read: readInquiries,
      replied: repliedInquiries,
      quotes: quoteRequests,
      general: generalInquiries,
      today: inquiriesToday,
      thisMonth: inquiriesMonth
    },
    orderStats: {
      total: totalOrders,
      passenger: passengerOrders,
      cargo: cargoOrders,
      pending: pendingOrders,
      approved: approvedOrders,
      inProgress: inProgressOrders,
      completed: completedOrders,
      rejected: rejectedOrders,
      cancelled: cancelledOrders
    },
    shipmentStats: {
      total: totalShipments,
      pending: pendingShipments,
      approved: approvedShipments,
      pickedUp: pickedUpShipments,
      inTransit: inTransitShipments,
      outForDelivery: outForDeliveryShipments,
      delivered: deliveredShipments,
      cancelled: cancelledShipments
    },
    fleetStats: {
      totalVehicles,
      availableVehicles,
      dispatchedVehicles,
      maintenanceVehicles,
      totalDrivers,
      activeDrivers,
      driversOnTrips,
      offDutyDrivers
    },
    visitorStats: {
      totalPageViews,
      uniqueVisitors,
      todayViews,
      todayVisitors
    },
    // Compatibility fields for legacy views & tests
    totalBookings: totalOrders,
    pendingBookings: pendingOrders,
    approvedBookings: approvedOrders,
    inProgressBookings: inProgressOrders,
    completedBookings: completedOrders,
    rejectedBookings: rejectedOrders,
    cancelledBookings: cancelledOrders,
    passengerBookings: passengerOrders,
    cargoBookings: cargoOrders,
    individualBookings: individualCustomers,
    companyBookings: corporateCustomers,
    corporateClients: corporateCustomers,
    totalCustomers: totalRegisteredCustomers,
    webRequests: db.prepare("SELECT COUNT(*) as c FROM records WHERE web = 1").get().c
  };
}

app.get('/api/admin/stats', requireRole(['super_admin']), (q, s) => {
  s.json(getAdminStatistics());
});

// Admin: Advanced Multi-Timeframe Operations Overview
app.get('/api/admin/overview', requireRole(['super_admin']), (q, s) => {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const startOfWeek = now - 7 * 864e5;
  const startOfMonth = now - 30 * 864e5;

  const fullStats = getAdminStatistics();

  function getTimeframeCounts(sinceTs) {
    const total = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ?").get(sinceTs).c;
    const passenger = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND (booking_category = 'passenger' OR booking_category IS NULL OR booking_category = '')").get(sinceTs).c;
    const cargo = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND booking_category = 'cargo'").get(sinceTs).c;
    const pending = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND status = 'Pending'").get(sinceTs).c;
    const approved = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND status = 'Approved'").get(sinceTs).c;
    const completed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND status IN ('Completed', 'Delivered')").get(sinceTs).c;
    return { total, passenger, cargo, pending, approved, completed };
  }

  const daily = getTimeframeCounts(startOfDay);
  const weekly = getTimeframeCounts(startOfWeek);
  const monthly = getTimeframeCounts(startOfMonth);

  // Recent incoming bookings
  const recentBookings = db.prepare('SELECT * FROM bookings ORDER BY created DESC LIMIT 8').all().map(b => ({
    id: b.id,
    bookingCategory: b.booking_category || (b.id.startsWith('CR-') ? 'cargo' : 'passenger'),
    customerType: b.customer_type || 'individual',
    companyName: b.company_name || '',
    contactPerson: b.contact_person || '',
    fullName: b.full_name,
    email: b.email,
    phone: b.phone,
    departure: b.departure,
    destination: b.destination,
    travelDate: b.travel_date,
    departureTime: b.departure_time,
    passengers: b.passengers,
    cargoType: b.cargo_type || '',
    cargoWeight: b.cargo_weight || '',
    vehiclePreference: b.vehicle_pref,
    status: b.status || 'Pending',
    assignedVehicle: b.assigned_vehicle || '',
    assignedDriver: b.assigned_driver || '',
    created: b.created
  }));

  // Recent audit logs
  const recentAuditLogs = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 8').all();

  const vStats = {
    total: fullStats.fleetStats.totalVehicles,
    available: fullStats.fleetStats.availableVehicles,
    dispatched: fullStats.fleetStats.dispatchedVehicles,
    maintenance: fullStats.fleetStats.maintenanceVehicles
  };
  const dStats = {
    total: fullStats.fleetStats.totalDrivers,
    active: fullStats.fleetStats.activeDrivers,
    onTrip: fullStats.fleetStats.driversOnTrips,
    offDuty: fullStats.fleetStats.offDutyDrivers
  };

  s.json({
    stats: {
      ...fullStats,
      totalPassengerBookings: fullStats.orderStats.passenger,
      totalCargoBookings: fullStats.orderStats.cargo,
      individualCustomers: fullStats.customerStats.individual,
      corporateCustomers: fullStats.customerStats.corporate,
      pendingRequests: fullStats.orderStats.pending,
      approvedRequests: fullStats.orderStats.approved,
      completedJourneys: fullStats.orderStats.completed,
      deliveredShipments: fullStats.shipmentStats.delivered,
      inTransitCount: fullStats.orderStats.inProgress,
      rejectedRequests: fullStats.orderStats.rejected + fullStats.orderStats.cancelled,
      totalAll: fullStats.orderStats.total
    },
    timeframes: {
      daily,
      weekly,
      monthly,
      allTime: {
        total: fullStats.orderStats.total,
        passenger: fullStats.orderStats.passenger,
        cargo: fullStats.orderStats.cargo,
        pending: fullStats.orderStats.pending,
        approved: fullStats.orderStats.approved,
        completed: fullStats.orderStats.completed
      }
    },
    recentBookings,
    recentAuditLogs,
    vStats,
    dStats
  });
});

// Admin: Registered Customers Directory (Centralized)
app.get('/api/admin/customers', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare(`
    SELECT
      u.id,
      u.username,
      u.email,
      u.full_name as fullName,
      u.full_name as name,
      u.phone,
      u.role,
      u.customer_type as customerType,
      u.company_name as companyName,
      u.status as accountStatus,
      u.created as registrationDate,
      u.created as created,
      u.email_verified as emailVerified,
      COUNT(b.id) as totalBookings,
      SUM(CASE WHEN b.booking_category='passenger' OR b.id LIKE 'TR-%' THEN 1 ELSE 0 END) as passengerBookings,
      SUM(CASE WHEN b.booking_category='cargo' OR b.id LIKE 'CR-%' THEN 1 ELSE 0 END) as cargoBookings,
      SUM(CASE WHEN b.status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedCount,
      SUM(CASE WHEN b.status = 'Pending' THEN 1 ELSE 0 END) as pendingCount,
      COALESCE(MAX(b.created), u.created) as lastBookingDate
    FROM users u
    LEFT JOIN bookings b ON (b.user_id = u.id OR (b.email = u.email AND u.email != ''))
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY u.created DESC
  `).all();
  s.json({ ok: 1, customers: rows });
});

// Admin: Individual Customers Directory
app.get('/api/admin/customers/individual', requireRole(['super_admin']), (q, s) => {
  // Query registered individual users first
  const regUsers = db.prepare(`
    SELECT
      u.phone,
      u.full_name as fullName,
      u.full_name as name,
      u.email,
      COUNT(b.id) as totalBookings,
      SUM(CASE WHEN b.booking_category = 'passenger' OR b.id LIKE 'TR-%' THEN 1 ELSE 0 END) as passengerBookings,
      SUM(CASE WHEN b.booking_category = 'cargo' OR b.id LIKE 'CR-%' THEN 1 ELSE 0 END) as cargoBookings,
      SUM(CASE WHEN b.status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedCount,
      SUM(CASE WHEN b.status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedJourneys,
      SUM(CASE WHEN b.status = 'Pending' THEN 1 ELSE 0 END) as pendingCount,
      COALESCE(MAX(b.created), u.created) as lastBookingDate,
      COALESCE(MAX(b.departure), '') as latestDeparture,
      COALESCE(MAX(b.destination), '') as latestDestination
    FROM users u
    LEFT JOIN bookings b ON (b.user_id = u.id OR (b.email = u.email AND u.email != ''))
    WHERE u.role = 'customer' AND (u.customer_type = 'individual' OR u.customer_type IS NULL OR u.customer_type = '')
    GROUP BY u.id
    ORDER BY lastBookingDate DESC
  `).all();

  // Also include unregistered historical bookings
  const guestBookings = db.prepare(`
    SELECT
      phone,
      MAX(full_name) as fullName,
      MAX(full_name) as name,
      MAX(email) as email,
      COUNT(*) as totalBookings,
      SUM(CASE WHEN booking_category = 'passenger' OR id LIKE 'TR-%' THEN 1 ELSE 0 END) as passengerBookings,
      SUM(CASE WHEN booking_category = 'cargo' OR id LIKE 'CR-%' THEN 1 ELSE 0 END) as cargoBookings,
      SUM(CASE WHEN status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedCount,
      SUM(CASE WHEN status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedJourneys,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingCount,
      MAX(created) as lastBookingDate,
      MAX(departure) as latestDeparture,
      MAX(destination) as latestDestination
    FROM bookings
    WHERE (user_id IS NULL OR user_id = '') AND (customer_type = 'individual' OR customer_type IS NULL OR customer_type = '')
    GROUP BY phone
    ORDER BY lastBookingDate DESC
  `).all();

  const phoneSet = new Set(regUsers.map(r => r.phone));
  for (const gb of guestBookings) {
    if (gb.phone && !phoneSet.has(gb.phone)) {
      regUsers.push(gb);
      phoneSet.add(gb.phone);
    }
  }

  s.json(regUsers);
});

// Admin: Corporate Customers Directory
app.get('/api/admin/customers/corporate', requireRole(['super_admin']), (q, s) => {
  // Query registered corporate users
  const regCorps = db.prepare(`
    SELECT
      u.company_name as companyName,
      u.full_name as contactPerson,
      '' as companyReg,
      '' as billingDetails,
      u.phone as phone,
      u.email as email,
      COUNT(b.id) as totalBookings,
      SUM(CASE WHEN b.booking_category = 'passenger' OR b.id LIKE 'TR-%' THEN 1 ELSE 0 END) as passengerBookings,
      SUM(CASE WHEN b.booking_category = 'cargo' OR b.id LIKE 'CR-%' THEN 1 ELSE 0 END) as cargoBookings,
      SUM(CASE WHEN b.status IN ('In Progress', 'Pickup Scheduled', 'Picked Up', 'In Transit', 'Out for Delivery') THEN 1 ELSE 0 END) as activeJobs,
      SUM(CASE WHEN b.status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedJobs,
      SUM(CASE WHEN b.status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedDeliveries,
      SUM(CASE WHEN b.status = 'Pending' THEN 1 ELSE 0 END) as pendingJobs,
      COALESCE(MAX(b.created), u.created) as lastBookingDate
    FROM users u
    LEFT JOIN bookings b ON (b.user_id = u.id OR (b.email = u.email AND u.email != ''))
    WHERE u.role = 'customer' AND u.customer_type = 'company'
    GROUP BY u.id
    ORDER BY lastBookingDate DESC
  `).all();

  // Also include unregistered historical bookings
  const guestCorps = db.prepare(`
    SELECT
      company_name as companyName,
      MAX(contact_person) as contactPerson,
      MAX(company_reg) as companyReg,
      MAX(billing_details) as billingDetails,
      MAX(phone) as phone,
      MAX(email) as email,
      COUNT(*) as totalBookings,
      SUM(CASE WHEN booking_category = 'passenger' OR id LIKE 'TR-%' THEN 1 ELSE 0 END) as passengerBookings,
      SUM(CASE WHEN booking_category = 'cargo' OR id LIKE 'CR-%' THEN 1 ELSE 0 END) as cargoBookings,
      SUM(CASE WHEN status IN ('In Progress', 'Pickup Scheduled', 'Picked Up', 'In Transit', 'Out for Delivery') THEN 1 ELSE 0 END) as activeJobs,
      SUM(CASE WHEN status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedJobs,
      SUM(CASE WHEN status IN ('Completed', 'Delivered') THEN 1 ELSE 0 END) as completedDeliveries,
      SUM(CASE WHEN status = 'Pending' THEN 1 ELSE 0 END) as pendingJobs,
      MAX(created) as lastBookingDate
    FROM bookings
    WHERE (user_id IS NULL OR user_id = '') AND (customer_type = 'company' OR (company_name IS NOT NULL AND company_name != ''))
    GROUP BY company_name
    ORDER BY lastBookingDate DESC
  `).all();

  const corpSet = new Set(regCorps.map(r => r.companyName.toLowerCase().trim()));
  for (const gc of guestCorps) {
    if (gc.companyName && !corpSet.has(gc.companyName.toLowerCase().trim())) {
      regCorps.push(gc);
      corpSet.add(gc.companyName.toLowerCase().trim());
    }
  }

  s.json(regCorps);
});

// Admin: Website Visitor Analytics
app.get('/api/admin/analytics', requireRole(['super_admin']), (q, s) => {
  const now = Date.now();
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const startOfMonth = now - 30 * 864e5;

  let totalPageViews = 0, uniqueVisitors = 0, todayViews = 0, todayVisitors = 0, monthViews = 0, monthVisitors = 0;
  let topPages = [];

  try {
    totalPageViews = db.prepare('SELECT COUNT(*) as c FROM page_views').get().c;
    uniqueVisitors = db.prepare('SELECT COUNT(DISTINCT visitor_hash) as c FROM page_views').get().c;
    todayViews = db.prepare('SELECT COUNT(*) as c FROM page_views WHERE created >= ?').get(startOfDay).c;
    todayVisitors = db.prepare('SELECT COUNT(DISTINCT visitor_hash) as c FROM page_views WHERE created >= ?').get(startOfDay).c;
    monthViews = db.prepare('SELECT COUNT(*) as c FROM page_views WHERE created >= ?').get(startOfMonth).c;
    monthVisitors = db.prepare('SELECT COUNT(DISTINCT visitor_hash) as c FROM page_views WHERE created >= ?').get(startOfMonth).c;

    topPages = db.prepare(`
      SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    `).all();
  } catch (_) {}

  const registeredCustomers = db.prepare("SELECT COUNT(*) as c FROM users WHERE role='customer'").get().c;
  const orderingCustomers = db.prepare("SELECT COUNT(DISTINCT user_id) as c FROM bookings WHERE user_id IS NOT NULL").get().c;

  const conversion = {
    uniqueVisitors,
    registeredCustomers,
    orderingCustomers,
    regConversionPct: uniqueVisitors > 0 ? ((registeredCustomers / uniqueVisitors) * 100).toFixed(1) : '0.0',
    orderConversionPct: uniqueVisitors > 0 ? ((orderingCustomers / uniqueVisitors) * 100).toFixed(1) : '0.0'
  };

  s.json({
    ok: 1,
    summary: {
      totalPageViews,
      uniqueVisitors,
      todayViews,
      todayVisitors,
      monthViews,
      monthVisitors
    },
    topPages,
    conversion
  });
});

// CSV Export Helpers and Endpoints
function toCsvRow(arr) {
  return arr.map(v => {
    if (v === null || v === undefined) return '""';
    return '"' + String(v).replace(/"/g, '""').replace(/\r?\n/g, ' ') + '"';
  }).join(',');
}

app.get('/api/admin/export/orders.csv', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare('SELECT * FROM bookings ORDER BY created DESC').all();
  const headers = ['Booking ID', 'Category', 'Customer Name', 'Customer Type', 'Phone', 'Email', 'Origin', 'Destination', 'Transport Mode', 'Travel Date', 'Status', 'Vehicle', 'Driver', 'Price', 'Currency', 'Created At'];
  const csv = [headers.join(',')];
  for (const r of rows) {
    csv.push(toCsvRow([
      r.id, r.booking_category || 'passenger', r.full_name, r.customer_type || 'individual',
      r.phone, r.email, r.departure, r.destination, r.transport_mode || 'road',
      r.travel_date || r.delivery_date, r.status, r.assigned_vehicle || '', r.assigned_driver || '',
      r.quoted_price || '', r.currency || 'USD', new Date(r.created).toISOString()
    ]));
  }
  s.setHeader('Content-Type', 'text/csv; charset=utf-8');
  s.setHeader('Content-Disposition', `attachment; filename="asil-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
  s.send(csv.join('\r\n'));
});

app.get('/api/admin/export/shipments.csv', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare("SELECT * FROM bookings WHERE booking_category='cargo' OR id LIKE 'CR-%' ORDER BY created DESC").all();
  const headers = ['Shipment Reference', 'Cargo Type', 'Cargo Description', 'Weight', 'Packages', 'Origin', 'Destination', 'Transport Mode', 'ETA Min', 'ETA Max', 'Status', 'Vehicle', 'Driver', 'Price', 'Currency', 'Created At'];
  const csv = [headers.join(',')];
  for (const r of rows) {
    csv.push(toCsvRow([
      r.id, r.cargo_type, r.cargo_desc, r.cargo_weight, r.packages_count,
      r.departure, r.destination, r.transport_mode || 'road', r.eta_min_date || '', r.eta_max_date || '',
      r.status, r.assigned_vehicle || '', r.assigned_driver || '', r.quoted_price || '', r.currency || 'USD',
      new Date(r.created).toISOString()
    ]));
  }
  s.setHeader('Content-Type', 'text/csv; charset=utf-8');
  s.setHeader('Content-Disposition', `attachment; filename="asil-shipments-${new Date().toISOString().slice(0, 10)}.csv"`);
  s.send(csv.join('\r\n'));
});

app.get('/api/admin/export/customers.csv', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare(`
    SELECT u.id, u.username, u.full_name, u.company_name, u.customer_type, u.email, u.phone, u.status, u.created,
           COUNT(b.id) as total_bookings
    FROM users u
    LEFT JOIN bookings b ON (b.user_id = u.id OR (b.email = u.email AND u.email != ''))
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY u.created DESC
  `).all();
  const headers = ['Customer ID', 'Username', 'Full Name', 'Company Name', 'Customer Type', 'Email', 'Phone', 'Account Status', 'Registration Date', 'Total Orders'];
  const csv = [headers.join(',')];
  for (const r of rows) {
    csv.push(toCsvRow([
      r.id, r.username, r.full_name, r.company_name || '', r.customer_type || 'individual',
      r.email, r.phone, r.status, new Date(r.created).toISOString(), r.total_bookings
    ]));
  }
  s.setHeader('Content-Type', 'text/csv; charset=utf-8');
  s.setHeader('Content-Disposition', `attachment; filename="asil-customers-${new Date().toISOString().slice(0, 10)}.csv"`);
  s.send(csv.join('\r\n'));
});

app.get('/api/admin/export/inquiries.csv', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare('SELECT * FROM inquiries ORDER BY created DESC').all();
  const headers = ['Inquiry ID', 'Category', 'Sender Name', 'Email', 'Phone', 'Department', 'Message', 'Status', 'Submitted Date'];
  const csv = [headers.join(',')];
  for (const r of rows) {
    csv.push(toCsvRow([
      r.id, r.category || 'contact', r.name, r.email, r.phone, r.department, r.message,
      r.status, new Date(r.created).toISOString()
    ]));
  }
  s.setHeader('Content-Type', 'text/csv; charset=utf-8');
  s.setHeader('Content-Disposition', `attachment; filename="asil-inquiries-${new Date().toISOString().slice(0, 10)}.csv"`);
  s.send(csv.join('\r\n'));
});

// Admin Fleet: Vehicles
app.get('/api/admin/fleet/vehicles', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  s.json(db.prepare('SELECT * FROM vehicles ORDER BY category, model').all());
});

app.post('/api/admin/fleet/vehicles', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  const b = q.body;
  if (!clip(b.plate) || !clip(b.model)) return s.status(400).json({ error: 'Plate and Model are required' });
  const id = clip(b.id) || ('VH-' + String(db.prepare('SELECT COUNT(*) as c FROM vehicles').get().c + 1).padStart(3, '0'));
  const plate = clip(b.plate, 50).toUpperCase();
  const model = clip(b.model, 100);
  const category = ['passenger', 'cargo'].includes(b.category) ? b.category : 'cargo';
  const type = clip(b.type || 'General Fleet', 100);
  const capacity = clip(b.capacity || 'Standard', 100);
  const status = ['Available', 'Dispatched', 'Under Maintenance'].includes(b.status) ? b.status : 'Available';
  const assigned_driver = clip(b.assigned_driver, 100);
  const notes = clip(b.notes, 500);

  db.prepare(`
    INSERT INTO vehicles (id, plate, model, category, type, capacity, status, assigned_driver, notes, created)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(plate) DO UPDATE SET model=excluded.model, category=excluded.category, type=excluded.type,
      capacity=excluded.capacity, status=excluded.status, assigned_driver=excluded.assigned_driver, notes=excluded.notes
  `).run(id, plate, model, category, type, capacity, status, assigned_driver, notes, Date.now());

  logAdminAction('Fleet Update', plate, `Vehicle ${model} (${plate}) registered or updated.`);
  s.status(201).json({ ok: 1, id, plate, model, status });
});

app.patch('/api/admin/fleet/vehicles/:id', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  const id = clip(q.params.id);
  const v = db.prepare('SELECT * FROM vehicles WHERE id=? OR plate=?').get(id, id);
  if (!v) return s.status(404).json({ error: 'Vehicle not found' });
  const status = q.body.status && ['Available', 'Dispatched', 'Under Maintenance'].includes(q.body.status) ? q.body.status : v.status;
  const assigned_driver = q.body.assigned_driver !== undefined ? clip(q.body.assigned_driver, 100) : v.assigned_driver;
  const notes = q.body.notes !== undefined ? clip(q.body.notes, 500) : v.notes;
  db.prepare('UPDATE vehicles SET status=?, assigned_driver=?, notes=? WHERE id=?').run(status, assigned_driver, notes, v.id);
  logAdminAction('Vehicle Status Changed', v.plate, `Status: ${status}, Driver: ${assigned_driver}`);
  s.json({ ok: 1, status });
});

app.delete('/api/admin/fleet/vehicles/:id', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  const id = clip(q.params.id);
  const v = db.prepare('SELECT * FROM vehicles WHERE id=? OR plate=?').get(id, id);
  if (v) {
    db.prepare('DELETE FROM vehicles WHERE id=?').run(v.id);
    logAdminAction('Vehicle Deleted', v.plate, `Vehicle ${v.model} (${v.plate}) removed from fleet.`);
  }
  s.json({ ok: 1, deleted: true });
});

// Admin Fleet: Drivers
app.get('/api/admin/fleet/drivers', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  s.json(db.prepare('SELECT * FROM drivers ORDER BY category, name').all());
});

app.post('/api/admin/fleet/drivers', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  const b = q.body;
  if (!clip(b.name) || !clip(b.phone)) return s.status(400).json({ error: 'Name and Phone are required' });
  const id = clip(b.id) || ('DR-' + String(db.prepare('SELECT COUNT(*) as c FROM drivers').get().c + 1).padStart(3, '0'));
  const name = clip(b.name, 100);
  const phone = clip(b.phone, 50);
  const email = clip(b.email, 100);
  const category = ['passenger', 'cargo', 'both'].includes(b.category) ? b.category : 'both';
  const license_type = clip(b.license_type || 'Professional Commercial License', 100);
  const status = ['Active', 'On Trip', 'Off Duty'].includes(b.status) ? b.status : 'Active';
  const assigned_vehicle = clip(b.assigned_vehicle, 100);
  const experience_years = parseInt(b.experience_years, 10) || 5;

  db.prepare(`
    INSERT INTO drivers (id, name, phone, email, category, license_type, status, assigned_vehicle, experience_years, created)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET name=excluded.name, phone=excluded.phone, email=excluded.email,
      category=excluded.category, license_type=excluded.license_type, status=excluded.status,
      assigned_vehicle=excluded.assigned_vehicle, experience_years=excluded.experience_years
  `).run(id, name, phone, email, category, license_type, status, assigned_vehicle, experience_years, Date.now());

  logAdminAction('Driver Registered', name, `Driver ${name} (${phone}) registered or updated.`);
  s.status(201).json({ ok: 1, id, name, status });
});

app.patch('/api/admin/fleet/drivers/:id', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  const id = clip(q.params.id);
  const d = db.prepare('SELECT * FROM drivers WHERE id=?').get(id);
  if (!d) return s.status(404).json({ error: 'Driver not found' });
  const status = q.body.status && ['Active', 'On Trip', 'Off Duty'].includes(q.body.status) ? q.body.status : d.status;
  const assigned_vehicle = q.body.assigned_vehicle !== undefined ? clip(q.body.assigned_vehicle, 100) : d.assigned_vehicle;
  db.prepare('UPDATE drivers SET status=?, assigned_vehicle=? WHERE id=?').run(status, assigned_vehicle, d.id);
  logAdminAction('Driver Status Changed', d.name, `Status: ${status}, Vehicle: ${assigned_vehicle}`);
  s.json({ ok: 1, status });
});

app.delete('/api/admin/fleet/drivers/:id', requireRole(['super_admin', 'dept_transport']), (q, s) => {
  const id = clip(q.params.id);
  const d = db.prepare('SELECT * FROM drivers WHERE id=?').get(id);
  if (d) {
    db.prepare('DELETE FROM drivers WHERE id=?').run(d.id);
    logAdminAction('Driver Removed', d.name, `Driver ${d.name} removed from registry.`);
  }
  s.json({ ok: 1, deleted: true });
});

// Admin Reports & Analytics
app.get('/api/admin/reports', requireRole(['super_admin']), (q, s) => {
  const period = q.query.period || 'all';
  const now = Date.now();
  let sinceTs = 0;
  if (period === 'day' || period === 'daily') sinceTs = new Date().setHours(0, 0, 0, 0);
  else if (period === 'week' || period === 'weekly') sinceTs = now - 7 * 864e5;
  else if (period === 'month' || period === 'monthly') sinceTs = now - 30 * 864e5;

  const total = db.prepare('SELECT COUNT(*) as c FROM bookings WHERE created >= ?').get(sinceTs).c;
  const completed = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND status IN ('Completed', 'Delivered')").get(sinceTs).c;
  const rejected = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND status IN ('Rejected', 'Cancelled')").get(sinceTs).c;
  const passenger = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND (booking_category = 'passenger' OR booking_category IS NULL OR booking_category = '')").get(sinceTs).c;
  const cargo = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND booking_category = 'cargo'").get(sinceTs).c;
  const individual = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND (customer_type = 'individual' OR customer_type IS NULL OR customer_type = '')").get(sinceTs).c;
  const corporate = db.prepare("SELECT COUNT(*) as c FROM bookings WHERE created >= ? AND customer_type = 'company'").get(sinceTs).c;

  const fulfillmentRate = total > 0 ? Math.round((completed / total) * 100) : 100;
  const rejectionRate = total > 0 ? Math.round((rejected / total) * 100) : 0;

  // Cargo types breakdown
  const cargoTypes = db.prepare(`
    SELECT cargo_type as type, COUNT(*) as count
    FROM bookings
    WHERE created >= ? AND booking_category = 'cargo' AND cargo_type != ''
    GROUP BY cargo_type
    ORDER BY count DESC
    LIMIT 6
  `).all(sinceTs);

  // Preferred Vehicles breakdown
  const vehiclePrefs = db.prepare(`
    SELECT vehicle_pref as type, COUNT(*) as count
    FROM bookings
    WHERE created >= ? AND vehicle_pref != ''
    GROUP BY vehicle_pref
    ORDER BY count DESC
    LIMIT 6
  `).all(sinceTs);

  // Top Routes
  const topRoutes = db.prepare(`
    SELECT departure, destination, COUNT(*) as count
    FROM bookings
    WHERE created >= ?
    GROUP BY departure, destination
    ORDER BY count DESC
    LIMIT 5
  `).all(sinceTs);

  s.json({
    period,
    totalBookings: total,
    total,
    completed,
    fulfilled: completed,
    rejected,
    passengerVolume: passenger,
    passenger,
    cargoVolume: cargo,
    cargo,
    individualClients: individual,
    individual,
    corporateClients: corporate,
    corporate,
    fulfillmentRate,
    rejectionRate,
    cargoTypes,
    cargoBreakdown: cargoTypes.map(c => ({ cargo_type: c.type, count: c.count })),
    vehiclePrefs,
    vehicleBreakdown: vehiclePrefs.map(v => ({ vehicle_preference: v.type, count: v.count })),
    topRoutes: topRoutes.map(r => ({ route: `${r.departure} → ${r.destination}`, count: r.count }))
  });
});

// Admin Settings & Security
app.get('/api/admin/settings', requireRole(['super_admin']), (q, s) => {
  const customPass = db.prepare("SELECT val FROM settings WHERE key='admin_password_hash'").get();
  s.json({
    role: 'Super Administrator / Operations Director',
    privileges: ['Full Read & Write', 'Dispatch Authorization', 'Fleet Management', 'Driver Management', 'Reports Generation', 'Security Controls'],
    timezone: 'Africa/Khartoum (UTC+2 CAT)',
    currency: 'USD / SDG',
    hasCustomPassword: !!(customPass && customPass.val),
    systemVersion: '2.4.0 (Enterprise Integrated Logistics)',
    lastBackup: new Date().toLocaleDateString()
  });
});

app.post('/api/admin/settings/password', requireRole(['super_admin']), (q, s) => {
  const currentPassword = q.body.currentPassword || q.body.oldPassword;
  const newPassword = q.body.newPassword;
  if (!currentPassword || !newPassword) return s.status(400).json({ error: 'Current and new passwords required' });
  if (newPassword.length < 10) return s.status(400).json({ error: 'New password must be at least 10 characters' });

  const uAdmin = db.prepare('SELECT id, password_hash FROM users WHERE id=?').get(q.session.id);
  if (!uAdmin) return s.status(404).json({ error: 'User not found' });
  const isMatch = verifyPasswordAgainstHash(currentPassword, uAdmin.password_hash);
  if (!isMatch) return s.status(401).json({ error: 'Current password is incorrect' });

  const newHash = hashPassword(newPassword);
  db.prepare('UPDATE users SET password_hash=?, session_version=session_version+1 WHERE id=?').run(newHash, uAdmin.id);
  db.prepare("INSERT INTO settings (key, val, updated) VALUES ('admin_password_hash', ?, ?) ON CONFLICT(key) DO UPDATE SET val=excluded.val, updated=excluded.updated").run(newHash, Date.now());

  const updatedUser = db.prepare('SELECT id, role, department, session_version FROM users WHERE id=?').get(uAdmin.id);
  if (updatedUser) {
    const newToken = mkUserToken(updatedUser.id, updatedUser.role, updatedUser.department, updatedUser.session_version);
    const secure = (process.env.NODE_ENV === 'production') ? '; Secure' : '';
    s.setHeader('Set-Cookie', `asil=${newToken}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=86400`);
  }

  logAdminAction('Password Changed', 'SECURITY', `Super Administrator password updated for ${q.session.username || uAdmin.id}.`, q.session.username);
  s.json({ ok: 1, message: 'Password updated successfully' });
});

app.get('/api/admin/audit-logs', requireRole(['super_admin']), (q, s) => {
  s.json(db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 100').all());
});

// Admin Inquiries Management (List, Status Update, Delete)
app.get('/api/admin/inquiries', requireRole(['super_admin']), (q, s) => {
  try {
    let sql = 'SELECT * FROM inquiries WHERE 1=1';
    const params = [];
    if (q.query.category && ['contact', 'quote'].includes(q.query.category)) {
      sql += ' AND category = ?';
      params.push(q.query.category);
    }
    if (q.query.status && ['new', 'read', 'replied'].includes(q.query.status)) {
      sql += ' AND status = ?';
      params.push(q.query.status);
    }
    if (q.query.q) {
      sql += ' AND (name LIKE ? OR email LIKE ? OR phone LIKE ? OR message LIKE ? OR department LIKE ?)';
      const term = `%${clip(q.query.q, 50)}%`;
      params.push(term, term, term, term, term);
    }
    sql += ' ORDER BY created DESC';
    const rows = db.prepare(sql).all(...params);
    return s.json({ ok: 1, inquiries: rows });
  } catch (err) {
    return s.status(500).json({ error: err.message });
  }
});

app.patch('/api/admin/inquiries/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 50).toUpperCase();
  const status = clip(q.body.status, 20).toLowerCase();
  if (!['new', 'read', 'replied'].includes(status)) {
    return s.status(400).json({ error: 'Invalid status. Permitted values: new, read, replied.' });
  }
  try {
    const info = db.prepare('UPDATE inquiries SET status=?, updated=? WHERE id=?').run(status, Date.now(), id);
    if (info.changes === 0) return s.status(404).json({ error: 'Inquiry not found' });
    logAdminAction('Update Inquiry', id, `Inquiry status updated to ${status}`);
    return s.json({ ok: 1, id, status });
  } catch (err) {
    return s.status(500).json({ error: err.message });
  }
});

app.delete('/api/admin/inquiries/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 50).toUpperCase();
  try {
    const info = db.prepare('DELETE FROM inquiries WHERE id=?').run(id);
    if (info.changes === 0) return s.status(404).json({ error: 'Inquiry not found' });
    logAdminAction('Delete Inquiry', id, 'Deleted inquiry record');
    return s.json({ ok: 1, id });
  } catch (err) {
    return s.status(500).json({ error: err.message });
  }
});

// Existing Admin workflow records endpoints
app.get('/api/records', requireRole(['super_admin']), (q, s) => s.json(db.prepare('SELECT * FROM records ORDER BY created DESC').all().map(out)));
app.post('/api/records', requireRole(['super_admin']), (q, s) => {
  if (!clip(q.body.title) || !clip(q.body.client)) return s.status(400).json({ error: 'title and client required' });
  try { s.json(out(insert(q.body, false))); } catch (e) { s.status(400).json({ error: e.message }); }
});
app.patch('/api/records/:id', requireRole(['super_admin']), (q, s) => {
  const r = db.prepare('SELECT * FROM records WHERE id=?').get(q.params.id);
  if (!r) return s.status(404).json({ error: 'not found' });
  const step = Math.min(Math.max(parseInt(q.body.step, 10) || 0, 0), LEN[r.wf]);
  const log = Array.isArray(q.body.log)
    ? q.body.log.slice(0, 50).map(l => ({ step: clip(l.step, 100), note: clip(l.note, 300), ts: Number(l.ts) || Date.now() }))
    : JSON.parse(r.log);
  db.prepare('UPDATE records SET step=?, done=?, log=? WHERE id=?')
    .run(step, step >= LEN[r.wf] ? (Number(q.body.done) || Date.now()) : null, JSON.stringify(log), r.id);
  s.json({ ok: 1 });
});
app.delete('/api/records/:id', requireRole(['super_admin']), (q, s) => {
  db.prepare('DELETE FROM records WHERE id=?').run(q.params.id);
  db.prepare('DELETE FROM bookings WHERE id=?').run(q.params.id);
  s.json({ ok: 1 });
});

// ==========================================
// 1. TRANSPORT & FLEET DEPARTMENT APIS
// ==========================================
app.get('/api/departments/transport/overview', requireRole(['super_admin', 'dept_transport'], 'transport'), (q, s) => {
  const total = db.prepare("SELECT count(*) as c FROM bookings WHERE booking_category='passenger' OR id LIKE 'TR-%'").get().c;
  const pending = db.prepare("SELECT count(*) as c FROM bookings WHERE (booking_category='passenger' OR id LIKE 'TR-%') AND status='Pending'").get().c;
  const approved = db.prepare("SELECT count(*) as c FROM bookings WHERE (booking_category='passenger' OR id LIKE 'TR-%') AND status='Approved'").get().c;
  const completed = db.prepare("SELECT count(*) as c FROM bookings WHERE (booking_category='passenger' OR id LIKE 'TR-%') AND status='Completed'").get().c;
  const vehicles = db.prepare("SELECT count(*) as c FROM vehicles WHERE category='Passenger' OR category='Executive'").get().c;
  const drivers = db.prepare("SELECT count(*) as c FROM drivers WHERE category='Passenger' OR category='Executive'").get().c;
  s.json({ ok: 1, total, pending, approved, completed, vehicles, drivers });
});

app.get('/api/departments/transport/bookings', requireRole(['super_admin', 'dept_transport'], 'transport'), (q, s) => {
  const rows = db.prepare(`
    SELECT b.*, r.step, r.done, r.log, r.pri
    FROM bookings b
    LEFT JOIN records r ON b.id = r.id
    WHERE b.booking_category='passenger' OR b.id LIKE 'TR-%'
    ORDER BY b.created DESC
  `).all().map(r => ({
    id: r.id,
    fullName: r.full_name,
    email: r.email,
    phone: r.phone,
    departure: r.departure,
    destination: r.destination,
    travelDate: r.travel_date,
    departureTime: r.departure_time,
    passengers: r.passengers,
    vehiclePreference: r.vehicle_pref,
    luggage: r.luggage,
    instructions: r.instructions,
    status: r.status,
    assignedVehicle: r.assigned_vehicle,
    assignedDriver: r.assigned_driver,
    internalNotes: r.internal_notes,
    customerType: r.customer_type,
    companyName: r.company_name,
    contactPerson: r.contact_person,
    step: r.step || 0,
    created: r.created
  }));
  s.json(rows);
});

app.patch('/api/departments/transport/bookings/:id', requireRole(['super_admin', 'dept_transport'], 'transport'), (q, s) => {
  const id = clip(q.params.id, 25).toUpperCase();
  const bk = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!bk) return s.status(404).json({ error: 'Passenger booking not found' });

  const status = q.body.status ? clip(q.body.status, 50) : bk.status;
  const assignedVehicle = q.body.assignedVehicle !== undefined ? clip(q.body.assignedVehicle, 150) : bk.assigned_vehicle;
  const assignedDriver = q.body.assignedDriver !== undefined ? clip(q.body.assignedDriver, 150) : bk.assigned_driver;
  const internalNotes = q.body.internalNotes !== undefined ? clip(q.body.internalNotes, 2000) : bk.internal_notes;
  const now = Date.now();

  db.prepare('UPDATE bookings SET status=?, assigned_vehicle=?, assigned_driver=?, internal_notes=?, updated=? WHERE id=?')
    .run(status, assignedVehicle, assignedDriver, internalNotes, now, id);

  // Sync with records workflow
  const rc = db.prepare('SELECT * FROM records WHERE id=?').get(id);
  if (rc) {
    const log = JSON.parse(rc.log || '[]');
    let step = rc.step;
    let done = rc.done;
    if (status === 'Approved') { step = Math.max(step, 1); }
    else if (status === 'In Progress') { step = Math.max(step, 4); }
    else if (status === 'Completed') { step = 9; done = now; }

    if (assignedVehicle || assignedDriver) {
      log.push({ step: 'Vehicle & Chauffeur Assigned', note: `Vehicle: ${assignedVehicle || 'None'}, Chauffeur: ${assignedDriver || 'None'}`, ts: now });
      if (step < 2) step = 2;
    }
    if (status !== bk.status) {
      log.push({ step: `Status: ${status}`, note: `Transport status updated to ${status}.`, ts: now });
    }
    db.prepare('UPDATE records SET step=?, done=?, log=? WHERE id=?').run(step, done, JSON.stringify(log), id);
  }

  logAdminAction('Transport Booking Update', id, `Status: ${status}, Vehicle: ${assignedVehicle}`, q.session.username);
  s.json({ ok: 1, id, status, assignedVehicle, assignedDriver, internalNotes });
});

app.get('/api/departments/transport/vehicles', requireRole(['super_admin', 'dept_transport'], 'transport'), (q, s) => {
  s.json(db.prepare('SELECT * FROM vehicles ORDER BY created DESC').all());
});

app.post('/api/departments/transport/vehicles', requireRole(['super_admin', 'dept_transport'], 'transport'), (q, s) => {
  const b = q.body;
  if (!clip(b.plate) || !clip(b.model)) return s.status(400).json({ error: 'Plate number and model required' });
  const id = 'VEH-' + String(Date.now()).slice(-6);
  db.prepare('INSERT INTO vehicles (id, plate, model, category, type, capacity, status, assigned_driver, notes, created) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, clip(b.plate, 50), clip(b.model, 100), clip(b.category, 50) || 'Passenger', clip(b.type, 50) || 'Sedan', clip(b.capacity, 50) || '4 Seats', clip(b.status, 50) || 'Available', clip(b.assignedDriver, 100), clip(b.notes, 500), Date.now());
  s.status(201).json({ ok: 1, id });
});

app.get('/api/departments/transport/drivers', requireRole(['super_admin', 'dept_transport'], 'transport'), (q, s) => {
  s.json(db.prepare('SELECT * FROM drivers ORDER BY created DESC').all());
});

app.post('/api/departments/transport/drivers', requireRole(['super_admin', 'dept_transport'], 'transport'), (q, s) => {
  const b = q.body;
  if (!clip(b.name) || !clip(b.phone)) return s.status(400).json({ error: 'Driver name and phone number required' });
  const id = 'DRV-' + String(Date.now()).slice(-6);
  db.prepare('INSERT INTO drivers (id, name, phone, email, category, license_type, status, assigned_vehicle, experience_years, created) VALUES (?,?,?,?,?,?,?,?,?,?)')
    .run(id, clip(b.name, 100), clip(b.phone, 50), clip(b.email, 100), clip(b.category, 50) || 'Passenger', clip(b.licenseType, 50) || 'Commercial Class A', clip(b.status, 50) || 'Active', clip(b.assignedVehicle, 100), parseInt(b.experienceYears, 10) || 5, Date.now());
  s.status(201).json({ ok: 1, id });
});

// ==========================================
// 2. DISTRIBUTION & CARGO DEPARTMENT APIS
// ==========================================
app.get('/api/departments/distribution/overview', requireRole(['super_admin', 'dept_distribution'], 'distribution'), (q, s) => {
  const total = db.prepare("SELECT count(*) as c FROM bookings WHERE booking_category='cargo' OR id LIKE 'CR-%'").get().c;
  const pending = db.prepare("SELECT count(*) as c FROM bookings WHERE (booking_category='cargo' OR id LIKE 'CR-%') AND status='Pending'").get().c;
  const inTransit = db.prepare("SELECT count(*) as c FROM bookings WHERE (booking_category='cargo' OR id LIKE 'CR-%') AND (status='In Transit' OR status='Pickup Scheduled' OR status='Picked Up' OR status='Out for Delivery')").get().c;
  const delivered = db.prepare("SELECT count(*) as c FROM bookings WHERE (booking_category='cargo' OR id LIKE 'CR-%') AND status='Delivered'").get().c;
  const carriers = db.prepare("SELECT count(*) as c FROM vehicles WHERE category='Cargo' OR category='Freight'").get().c;
  s.json({ ok: 1, total, pending, inTransit, delivered, carriers });
});

app.get('/api/departments/distribution/cargo', requireRole(['super_admin', 'dept_distribution'], 'distribution'), (q, s) => {
  const rows = db.prepare(`
    SELECT b.*, r.step, r.done, r.log, r.pri
    FROM bookings b
    LEFT JOIN records r ON b.id = r.id
    WHERE b.booking_category='cargo' OR b.id LIKE 'CR-%'
    ORDER BY b.created DESC
  `).all().map(r => {
    let parsedDocs = [];
    try { if (r.cargo_docs) parsedDocs = JSON.parse(r.cargo_docs); } catch (e) { parsedDocs = []; }
    return {
      id: r.id,
      fullName: r.full_name,
      email: r.email,
      phone: r.phone,
      pickupLocation: r.departure,
      deliveryDestination: r.destination,
      pickupDate: r.travel_date,
      deliveryDate: r.delivery_date || r.travel_date,
      cargoType: r.cargo_type,
      cargoDesc: r.cargo_desc,
      packagesCount: r.packages_count,
      cargoWeight: r.cargo_weight,
      cargoDimensions: r.cargo_dimensions,
      specialHandling: r.special_handling,
      cargoDocs: parsedDocs,
      vehiclePreference: r.vehicle_pref,
      status: r.status,
      assignedVehicle: r.assigned_vehicle,
      assignedDriver: r.assigned_driver,
      internalNotes: r.internal_notes,
      customerType: r.customer_type,
      companyName: r.company_name,
      contactPerson: r.contact_person,
      step: r.step || 0,
      created: r.created
    };
  });
  s.json(rows);
});

app.patch('/api/departments/distribution/cargo/:id', requireRole(['super_admin', 'dept_distribution'], 'distribution'), (q, s) => {
  const id = clip(q.params.id, 25).toUpperCase();
  const bk = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!bk) return s.status(404).json({ error: 'Cargo consignment not found' });

  const status = q.body.status ? clip(q.body.status, 50) : bk.status;
  const assignedVehicle = q.body.assignedVehicle !== undefined ? clip(q.body.assignedVehicle, 150) : bk.assigned_vehicle;
  const assignedDriver = q.body.assignedDriver !== undefined ? clip(q.body.assignedDriver, 150) : bk.assigned_driver;
  const internalNotes = q.body.internalNotes !== undefined ? clip(q.body.internalNotes, 2000) : bk.internal_notes;
  const now = Date.now();

  db.prepare('UPDATE bookings SET status=?, assigned_vehicle=?, assigned_driver=?, internal_notes=?, updated=? WHERE id=?')
    .run(status, assignedVehicle, assignedDriver, internalNotes, now, id);

  const rc = db.prepare('SELECT * FROM records WHERE id=?').get(id);
  if (rc) {
    const log = JSON.parse(rc.log || '[]');
    let step = rc.step;
    let done = rc.done;
    if (status === 'Approved') step = Math.max(step, 1);
    else if (status === 'Pickup Scheduled') step = Math.max(step, 2);
    else if (status === 'Picked Up') step = Math.max(step, 3);
    else if (status === 'In Transit') step = Math.max(step, 4);
    else if (status === 'Out for Delivery') step = Math.max(step, 5);
    else if (status === 'Delivered') { step = 8; done = now; }

    if (assignedVehicle || assignedDriver) {
      log.push({ step: 'Freight Carrier Assigned', note: `Carrier: ${assignedVehicle || 'None'}, Driver: ${assignedDriver || 'None'}`, ts: now });
      if (step < 2) step = 2;
    }
    if (status !== bk.status) {
      log.push({ step: `Cargo Status: ${status}`, note: `Shipment status updated to ${status}.`, ts: now });
    }
    db.prepare('UPDATE records SET step=?, done=?, log=? WHERE id=?').run(step, done, JSON.stringify(log), id);
  }

  logAdminAction('Distribution Cargo Update', id, `Status: ${status}`, q.session.username);
  s.json({ ok: 1, id, status, assignedVehicle, assignedDriver, internalNotes });
});

// ==========================================
// 3. BUILDING MAINTENANCE DEPARTMENT APIS
// ==========================================

// Public Maintenance Request Submission
app.post('/api/maintenance/requests', rateLimit({ windowMs: 3600e3, limit: 60, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  const b = q.body;
  const buildingName = clip(b.buildingName || b.building_name, 150);
  const location = clip(b.location || b.address, 150);
  const clientName = clip(b.fullName || b.client || b.name, 100);
  const email = clip(b.email, 100);
  const phone = clip(b.phone, 50);
  const serviceType = clip(b.serviceType || b.facilityType, 100);
  const issueDescription = clip(b.description || b.issueDescription, 1500);
  const priority = b.priority === 'urgent' ? 'urgent' : 'normal';

  if (!buildingName || !clientName || !phone || !serviceType || !issueDescription) {
    return s.status(400).json({ error: 'Please provide building name, contact name, phone, service type, and issue description.' });
  }

  const id = nextId('maintenance');
  const now = Date.now();
  const detail = `Facility: ${buildingName} | Service: ${serviceType} | Location: ${location} | Contact: ${clientName} (${phone} / ${email}) | Issue: ${issueDescription}`;

  const r = {
    id,
    wf: 'maintenance',
    title: `🔧 Maintenance: ${serviceType} (${buildingName})`,
    client: clientName,
    a: buildingName,
    b: location || 'On-site Facility',
    t: detail,
    pri: priority,
    due: new Date(now + 3 * 864e5).toISOString().slice(0, 10),
    step: 0,
    created: now,
    done: null,
    log: JSON.stringify([{ step: 'Request Received', note: `Maintenance order registered for ${buildingName}. Issue: ${issueDescription}`, ts: now }]),
    web: 1,
    user_id: null
  };

  db.prepare('INSERT INTO records (id, wf, title, client, a, b, t, pri, due, step, created, done, log, web, user_id) VALUES(@id,@wf,@title,@client,@a,@b,@t,@pri,@due,@step,@created,@done,@log,@web,@user_id)').run(r);
  logAdminAction('New Maintenance Order', id, `Public maintenance request from ${clientName}`);
  s.status(201).json({ ok: 1, id, message: 'Maintenance request registered successfully' });
});

// Maintenance Department Overview & Management
app.get('/api/departments/maintenance/overview', requireRole(['super_admin', 'dept_maintenance'], 'maintenance'), (q, s) => {
  const total = db.prepare("SELECT count(*) as c FROM records WHERE wf='maintenance'").get().c;
  const pending = db.prepare("SELECT count(*) as c FROM records WHERE wf='maintenance' AND step=0").get().c;
  const inProgress = db.prepare("SELECT count(*) as c FROM records WHERE wf='maintenance' AND step > 0 AND done IS NULL").get().c;
  const completed = db.prepare("SELECT count(*) as c FROM records WHERE wf='maintenance' AND done IS NOT NULL").get().c;
  const facilities = db.prepare("SELECT count(*) as c FROM facility_assets").get().c;
  const technicians = db.prepare("SELECT count(*) as c FROM technicians").get().c;
  s.json({ ok: 1, total, pending, inProgress, completed, facilities, technicians });
});

app.get('/api/departments/maintenance/requests', requireRole(['super_admin', 'dept_maintenance'], 'maintenance'), (q, s) => {
  const rows = db.prepare("SELECT * FROM records WHERE wf='maintenance' ORDER BY created DESC").all().map(out);
  s.json(rows);
});

app.patch('/api/departments/maintenance/requests/:id', requireRole(['super_admin', 'dept_maintenance'], 'maintenance'), (q, s) => {
  const id = clip(q.params.id, 25).toUpperCase();
  const r = db.prepare("SELECT * FROM records WHERE id=? AND wf='maintenance'").get(id);
  if (!r) return s.status(404).json({ error: 'Maintenance order not found' });

  const now = Date.now();
  let step = q.body.step !== undefined ? Math.min(Math.max(parseInt(q.body.step, 10), 0), 10) : r.step;
  let done = r.done;
  if (step >= 10 || q.body.status === 'Completed') {
    step = 10;
    done = now;
  }
  const log = JSON.parse(r.log || '[]');
  if (q.body.note) {
    log.push({ step: q.body.stepName || 'Work Order Update', note: clip(q.body.note, 500), ts: now });
  }
  if (q.body.technician) {
    log.push({ step: 'Technician Assigned', note: `Assigned technician: ${clip(q.body.technician, 100)}`, ts: now });
    if (step < 2) step = 2;
  }

  db.prepare('UPDATE records SET step=?, done=?, log=? WHERE id=?').run(step, done, JSON.stringify(log), id);
  logAdminAction('Maintenance Order Update', id, `Step: ${step}, Done: ${!!done}`, q.session.username);
  s.json({ ok: 1, id, step, done });
});

app.get('/api/departments/maintenance/facilities', requireRole(['super_admin', 'dept_maintenance'], 'maintenance'), (q, s) => {
  s.json(db.prepare('SELECT * FROM facility_assets ORDER BY created DESC').all());
});

app.post('/api/departments/maintenance/facilities', requireRole(['super_admin', 'dept_maintenance'], 'maintenance'), (q, s) => {
  const b = q.body;
  if (!clip(b.buildingName) || !clip(b.location)) return s.status(400).json({ error: 'Building name and location required' });
  const id = 'FAC-' + String(Date.now()).slice(-6);
  db.prepare('INSERT INTO facility_assets (id, building_name, location, zone, facility_type, status, notes, created) VALUES (?,?,?,?,?,?,?,?)')
    .run(id, clip(b.buildingName, 150), clip(b.location, 150), clip(b.zone, 100) || 'General Zone', clip(b.facilityType, 100) || 'Commercial', clip(b.status, 50) || 'Operational', clip(b.notes, 500), Date.now());
  s.status(201).json({ ok: 1, id });
});

app.get('/api/departments/maintenance/technicians', requireRole(['super_admin', 'dept_maintenance'], 'maintenance'), (q, s) => {
  s.json(db.prepare('SELECT * FROM technicians ORDER BY created DESC').all());
});

app.post('/api/departments/maintenance/technicians', requireRole(['super_admin', 'dept_maintenance'], 'maintenance'), (q, s) => {
  const b = q.body;
  if (!clip(b.name) || !clip(b.phone)) return s.status(400).json({ error: 'Technician name and phone required' });
  const id = 'TECH-' + String(Date.now()).slice(-6);
  db.prepare('INSERT INTO technicians (id, name, phone, specialty, status, experience_years, created) VALUES (?,?,?,?,?,?,?)')
    .run(id, clip(b.name, 100), clip(b.phone, 50), clip(b.specialty, 100) || 'General Maintenance', clip(b.status, 50) || 'Available', parseInt(b.experienceYears, 10) || 5, Date.now());
  s.status(201).json({ ok: 1, id });
});

// ==========================================
// 4. CLIENT ONBOARDING DEPARTMENT APIS
// ==========================================

// Public Client Onboarding Application
app.post('/api/onboarding/apply', rateLimit({ windowMs: 3600e3, limit: 30, standardHeaders: true, legacyHeaders: false }), (q, s) => {
  const b = q.body;
  const customerType = b.customerType === 'company' ? 'company' : 'individual';
  const fullName = clip(b.fullName || b.name, 100);
  const companyName = customerType === 'company' ? clip(b.companyName, 150) : '';
  const email = clip(b.email, 100);
  const phone = clip(b.phone, 50);
  const contactPerson = customerType === 'company' ? clip(b.contactPerson, 100) : '';
  const companyReg = clip(b.companyReg, 100);
  const taxId = clip(b.taxId, 100);
  const billingAddress = clip(b.billingAddress || b.address, 200);

  if (!fullName || !email || !phone) {
    return s.status(400).json({ error: 'Please provide full name, email address, and telephone number.' });
  }
  if (customerType === 'company' && !companyName) {
    return s.status(400).json({ error: 'Company legal entity name is required for corporate onboarding.' });
  }

  const id = nextId('onboarding');
  const now = Date.now();

  db.prepare(`
    INSERT INTO onboarding_clients (id, customer_type, full_name, company_name, email, phone, contact_person, company_reg, tax_id, billing_address, status, docs, internal_notes, created, updated)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', '[]', '', ?, ?)
  `).run(id, customerType, fullName, companyName, email, phone, contactPerson, companyReg, taxId, billingAddress, now, now);

  // Sync with workflow records
  const clientTitle = customerType === 'company' ? `🏢 Corporate: ${companyName}` : `👤 Individual: ${fullName}`;
  const r = {
    id,
    wf: 'onboarding',
    title: `Client Onboarding: ${clientTitle}`,
    client: customerType === 'company' ? `${companyName} (Attn: ${contactPerson || fullName})` : fullName,
    a: billingAddress || 'Khartoum',
    b: 'Corporate Onboarding Office',
    t: `Client Onboarding Application: ${clientTitle} | Email: ${email} | Phone: ${phone}${companyReg ? ' | Reg: ' + companyReg : ''}${taxId ? ' | Tax ID: ' + taxId : ''}`,
    pri: 'normal',
    due: new Date(now + 5 * 864e5).toISOString().slice(0, 10),
    step: 0,
    created: now,
    done: null,
    log: JSON.stringify([{ step: 'Application Submitted', note: `Onboarding application registered for ${clientTitle}. Pending compliance review.`, ts: now }]),
    web: 1,
    user_id: null
  };
  db.prepare('INSERT INTO records (id, wf, title, client, a, b, t, pri, due, step, created, done, log, web, user_id) VALUES(@id,@wf,@title,@client,@a,@b,@t,@pri,@due,@step,@created,@done,@log,@web,@user_id)').run(r);

  logAdminAction('Onboarding Application', id, `New ${customerType} application from ${fullName}`);
  s.status(201).json({ ok: 1, id, message: 'Onboarding application registered successfully' });
});

// Onboarding Department Overview & Management
app.get('/api/departments/onboarding/overview', requireRole(['super_admin', 'dept_onboarding'], 'onboarding'), (q, s) => {
  const total = db.prepare('SELECT count(*) as c FROM onboarding_clients').get().c;
  const pending = db.prepare("SELECT count(*) as c FROM onboarding_clients WHERE status='Pending'").get().c;
  const approved = db.prepare("SELECT count(*) as c FROM onboarding_clients WHERE status='Approved'").get().c;
  const corporate = db.prepare("SELECT count(*) as c FROM onboarding_clients WHERE customer_type='company'").get().c;
  const individual = db.prepare("SELECT count(*) as c FROM onboarding_clients WHERE customer_type='individual'").get().c;
  s.json({ ok: 1, total, pending, approved, corporate, individual });
});

app.get('/api/departments/onboarding/clients', requireRole(['super_admin', 'dept_onboarding'], 'onboarding'), (q, s) => {
  s.json(db.prepare('SELECT * FROM onboarding_clients ORDER BY created DESC').all());
});

app.patch('/api/departments/onboarding/clients/:id', requireRole(['super_admin', 'dept_onboarding'], 'onboarding'), (q, s) => {
  const id = clip(q.params.id, 25).toUpperCase();
  const c = db.prepare('SELECT * FROM onboarding_clients WHERE id=?').get(id);
  if (!c) return s.status(404).json({ error: 'Onboarding client not found' });

  const status = q.body.status ? clip(q.body.status, 50) : c.status;
  const notes = q.body.notes !== undefined ? clip(q.body.notes, 1000) : c.internal_notes;
  const now = Date.now();

  db.prepare('UPDATE onboarding_clients SET status=?, internal_notes=?, updated=? WHERE id=?').run(status, notes, now, id);

  const rc = db.prepare("SELECT * FROM records WHERE id=? AND wf='onboarding'").get(id);
  if (rc) {
    const log = JSON.parse(rc.log || '[]');
    let step = rc.step;
    let done = rc.done;
    if (status === 'Approved') { step = 12; done = now; }
    else if (status === 'In Review') { step = Math.max(step, 3); }
    log.push({ step: `Compliance: ${status}`, note: `Onboarding status set to ${status}. Note: ${notes || 'None'}`, ts: now });
    db.prepare('UPDATE records SET step=?, done=?, log=? WHERE id=?').run(step, done, JSON.stringify(log), id);
  }

  logAdminAction('Onboarding Client Update', id, `Status: ${status}`, q.session.username);
  s.json({ ok: 1, id, status, notes });
});

// ==========================================
// 5. CUSTOMER PORTAL APIS
// ==========================================
app.get('/api/customer/profile', requireRole(['super_admin', 'customer']), (q, s) => {
  const u = db.prepare('SELECT id, username, email, full_name, phone, role, customer_type, company_name, email_verified, created FROM users WHERE id=?').get(q.session.id);
  if (!u) return s.status(404).json({ error: 'Customer not found' });
  s.json({ ok: 1, customer: u });
});

app.patch('/api/customer/profile', requireRole(['super_admin', 'customer']), (q, s) => {
  const u = db.prepare('SELECT * FROM users WHERE id=?').get(q.session.id);
  if (!u) return s.status(404).json({ error: 'Customer not found' });

  const b = q.body || {};
  const fullName = b.full_name !== undefined ? clip(b.full_name, 120) : u.full_name;
  const phone = b.phone !== undefined ? clip(b.phone, 40) : u.phone;
  const companyName = b.company_name !== undefined ? clip(b.company_name, 150) : u.company_name;

  if (fullName && fullName.length < 2) {
    return s.status(400).json({ error: 'Full name must be at least 2 characters.' });
  }

  if (b.newPassword) {
    const curPass = b.currentPassword || '';
    if (!curPass) {
      return s.status(400).json({ error: 'Current password is required to change password.' });
    }
    const match = verifyPasswordAgainstHash(curPass, u.password_hash);
    if (!match) {
      return s.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (b.newPassword.length < 10) {
      return s.status(400).json({ error: 'New password must be at least 10 characters long.' });
    }
    const newHash = hashPassword(b.newPassword);
    db.prepare('UPDATE users SET password_hash=?, session_version=session_version+1, full_name=?, phone=?, company_name=? WHERE id=?')
      .run(newHash, fullName, phone, companyName, u.id);

    const newToken = mkUserToken(u.id, u.role, u.department, (u.session_version || 1) + 1);
    const secure = (process.env.NODE_ENV === 'production') ? '; Secure' : '';
    s.setHeader('Set-Cookie', `asil=${newToken}; HttpOnly; Path=/; SameSite=Lax${secure}; Max-Age=86400`);
  } else {
    db.prepare('UPDATE users SET full_name=?, phone=?, company_name=? WHERE id=?')
      .run(fullName, phone, companyName, u.id);
  }

  const updated = db.prepare('SELECT id, username, email, full_name, phone, role, customer_type, company_name, email_verified, created FROM users WHERE id=?').get(u.id);
  logAdminAction('Profile Updated', u.id, `Customer ${u.username} updated profile.`, u.username);
  return s.json({ ok: 1, customer: updated, message: 'Profile updated successfully.' });
});

app.post(['/api/customer/verify-email', '/api/auth/verify-email'], auth, (q, s) => {
  db.prepare('UPDATE users SET email_verified=1 WHERE id=?').run(q.session.id);
  logAdminAction('Email Verified', q.session.id, `Customer ${q.session.username} email verified.`);
  s.json({ ok: 1, emailVerified: true });
});

app.get('/api/customer/bookings', requireRole(['super_admin', 'customer']), (q, s) => {
  const u = db.prepare('SELECT id, email, email_verified FROM users WHERE id=?').get(q.session.id);
  if (!u) return s.status(404).json({ error: 'Customer account not found' });

  // STRICT SECURITY & PRIVACY:
  // 1. Stop matching by company name. Match only on the logged-in user's id.
  // 2. Email verification allows seeing historical bookings made before the account existed (user_id IS NULL).
  let rawList = [];
  if (u.email_verified == 1) {
    rawList = db.prepare(`
      SELECT * FROM bookings
      WHERE user_id = ? OR (user_id IS NULL AND lower(email) = lower(?))
      ORDER BY created DESC
    `).all(u.id, u.email);
  } else {
    rawList = db.prepare(`
      SELECT * FROM bookings
      WHERE user_id = ?
      ORDER BY created DESC
    `).all(u.id);
  }

  // Return ONLY safe fields. NEVER return internal_notes, billing_details, or company_reg to customers.
  const safeBookings = rawList.map(b => {
    let parsedDocs = [];
    try { if (b.cargo_docs) parsedDocs = JSON.parse(b.cargo_docs); } catch (_) { parsedDocs = []; }
    return {
      id: b.id,
      bookingCategory: b.booking_category || (b.id.startsWith('CR-') ? 'cargo' : 'passenger'),
      booking_category: b.booking_category || (b.id.startsWith('CR-') ? 'cargo' : 'passenger'),
      bookingType: (b.booking_category === 'cargo' || b.id.startsWith('CR-')) ? 'Cargo Transportation' : 'Passenger Transportation',
      customerType: b.customer_type || 'individual',
      customer_type: b.customer_type || 'individual',
      companyName: b.company_name || '',
      company_name: b.company_name || '',
      contactPerson: b.contact_person || '',
      contact_person: b.contact_person || '',
      fullName: b.full_name,
      full_name: b.full_name,
      email: b.email,
      phone: b.phone,
      departure: b.departure,
      destination: b.destination,
      travelDate: b.travel_date,
      travel_date: b.travel_date,
      departureTime: b.departure_time,
      departure_time: b.departure_time,
      deliveryDate: b.delivery_date || b.travel_date || '',
      delivery_date: b.delivery_date || b.travel_date || '',
      passengers: b.passengers || 1,
      vehiclePreference: b.vehicle_pref,
      vehicle_pref: b.vehicle_pref,
      luggage: b.luggage || '',
      instructions: b.instructions || '',
      cargoType: b.cargo_type || '',
      cargo_type: b.cargo_type || '',
      cargoDesc: b.cargo_desc || '',
      cargo_desc: b.cargo_desc || '',
      packagesCount: b.packages_count || 1,
      packages_count: b.packages_count || 1,
      cargoWeight: b.cargo_weight || '',
      cargo_weight: b.cargo_weight || '',
      cargoDimensions: b.cargo_dimensions || '',
      cargo_dimensions: b.cargo_dimensions || '',
      specialHandling: b.special_handling || '',
      special_handling: b.special_handling || '',
      cargoDocs: parsedDocs,
      origin: b.departure,
      destination: b.destination,
      origin_location_id: b.origin_location_id || null,
      destination_location_id: b.destination_location_id || null,
      transport_mode: b.transport_mode || 'road',
      mode: b.transport_mode || 'road',
      goods_origin_country: b.goods_origin_country || '',
      pickup_address: b.pickup_address || b.departure || '',
      delivery_address: b.delivery_address || b.destination || '',
      eta_min_date: b.eta_min_date || '',
      eta_max_date: b.eta_max_date || '',
      eta_range: (b.eta_min_date && b.eta_max_date) ? { min: b.eta_min_date, max: b.eta_max_date, display: `${b.eta_min_date} to ${b.eta_max_date}` } : null,
      price_quote: (b.quoted_price !== null && b.quoted_price !== undefined) ? b.quoted_price : null,
      quoted_price: (b.quoted_price !== null && b.quoted_price !== undefined) ? b.quoted_price : null,
      currency: b.currency || 'USD',
      status: b.status || 'Pending',
      assignedVehicle: b.assigned_vehicle || '',
      assigned_vehicle: b.assigned_vehicle || '',
      assignedDriver: b.assigned_driver || '',
      assigned_driver: b.assigned_driver || '',
      created: b.created,
      updated: b.updated || b.created
    };
  });

  s.json({ ok: 1, bookings: safeBookings });
});

// Authenticated Customer: View individual order detail (Protected by strict ownership RBAC)
app.get('/api/customer/bookings/:id', requireRole(['super_admin', 'customer']), (q, s) => {
  const id = clip(q.params.id, 35).toUpperCase();
  const bk = db.prepare('SELECT * FROM bookings WHERE id=?').get(id);
  if (!bk) {
    return s.status(404).json({ error: 'Order not found' });
  }

  // Strict RBAC: Customer cannot see another customer's order
  if (q.session.role !== 'super_admin' && bk.user_id !== q.session.id) {
    return s.status(403).json({ error: 'Access denied: You cannot view another customer’s order.' });
  }

  const rc = db.prepare('SELECT * FROM records WHERE id=?').get(id);
  let statusHistory = [];
  if (rc && rc.log) {
    try {
      statusHistory = JSON.parse(rc.log).map(l => ({ step: l.step, note: l.note || '', timestamp: l.ts }));
    } catch (_) { }
  }
  if (statusHistory.length === 0 && bk.created) {
    statusHistory.push({ step: 'Order confirmed', note: 'Order registered in ASIL operations system.', timestamp: bk.created });
  }

  let originName = bk.departure || '';
  if (bk.origin_location_id) {
    const oLoc = db.prepare('SELECT name FROM locations WHERE id=?').get(bk.origin_location_id);
    if (oLoc) originName = oLoc.name;
  }
  let destName = bk.destination || '';
  if (bk.destination_location_id) {
    const dLoc = db.prepare('SELECT name FROM locations WHERE id=?').get(bk.destination_location_id);
    if (dLoc) destName = dLoc.name;
  }

  const steps = buildBookingSteps(bk, rc, statusHistory);
  const etaRange = (bk.eta_min_date && bk.eta_max_date)
    ? { min: bk.eta_min_date, max: bk.eta_max_date, display: `${bk.eta_min_date} to ${bk.eta_max_date}` }
    : (bk.eta_min_date || bk.eta_max_date ? { min: bk.eta_min_date || bk.eta_max_date, max: bk.eta_max_date || bk.eta_min_date } : null);

  let parsedDocs = [];
  try { if (bk.cargo_docs) parsedDocs = JSON.parse(bk.cargo_docs); } catch (_) { }

  const details = {
    id: bk.id,
    bookingCategory: bk.booking_category || (bk.id.startsWith('CR-') ? 'cargo' : 'passenger'),
    bookingType: (bk.booking_category === 'cargo' || bk.id.startsWith('CR-')) ? 'Cargo Transportation' : (bk.booking_category === 'service' ? 'Service Request' : 'Passenger Transportation'),
    customerType: bk.customer_type || 'individual',
    companyName: bk.company_name || '',
    contactPerson: bk.contact_person || '',
    fullName: bk.full_name,
    email: bk.email,
    phone: bk.phone,
    origin: originName,
    destination: destName,
    departure: bk.departure,
    pickupLocation: bk.departure,
    deliveryDestination: bk.destination,
    origin_location_id: bk.origin_location_id,
    destination_location_id: bk.destination_location_id,
    route_id: bk.route_id,
    mode: bk.transport_mode || 'road',
    transport_mode: bk.transport_mode || 'road',
    goods_origin_country: bk.goods_origin_country || '',
    goodsOriginCountry: bk.goods_origin_country || '',
    pickup_address: bk.pickup_address || '',
    delivery_address: bk.delivery_address || '',
    eta_min_date: bk.eta_min_date || '',
    eta_max_date: bk.eta_max_date || '',
    eta_range: etaRange,
    price_quote: (bk.quoted_price !== null && bk.quoted_price !== undefined) ? bk.quoted_price : null,
    quoted_price: (bk.quoted_price !== null && bk.quoted_price !== undefined) ? bk.quoted_price : null,
    currency: bk.currency || 'USD',
    travelDate: bk.travel_date,
    deliveryDate: bk.delivery_date || bk.travel_date || '',
    departureTime: bk.departure_time || '08:00',
    passengers: bk.passengers || 1,
    vehiclePreference: bk.vehicle_pref,
    luggage: bk.luggage || '',
    instructions: bk.instructions || '',
    cargoType: bk.cargo_type || '',
    cargoDesc: bk.cargo_desc || '',
    packagesCount: bk.packages_count || 1,
    cargoWeight: bk.cargo_weight || '',
    cargoDimensions: bk.cargo_dimensions || '',
    specialHandling: bk.special_handling || '',
    cargoDocs: parsedDocs,
    status: bk.status || 'Pending',
    assignedVehicle: bk.assigned_vehicle || '',
    assignedDriver: bk.assigned_driver || '',
    steps,
    status_history: statusHistory,
    log: statusHistory,
    created: bk.created,
    updated: bk.updated || bk.created
  };

  s.json({ ok: 1, booking: details });
});

// ==========================================
// 6. ADMIN DASHBOARD USER & RBAC APIS
// ==========================================
app.get('/api/admin/users', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare('SELECT id, username, email, full_name, phone, role, department, customer_type, company_name, status, created FROM users ORDER BY created DESC').all();
  s.json(rows);
});

app.post('/api/admin/users', requireRole(['super_admin']), (q, s) => {
  const b = q.body;
  const username = clip(b.username, 50).toLowerCase();
  const email = clip(b.email, 100).toLowerCase();
  const password = String(b.password || '');
  const fullName = clip(b.fullName || b.name, 100);
  const role = clip(b.role, 50);
  const department = clip(b.department, 50) || '';
  const phone = clip(b.phone, 50);

  if (!username || !email || !password || !fullName || !role) {
    return s.status(400).json({ error: 'Username, email, password, full name, and role are required' });
  }

  // Role whitelist
  const ALLOWED_ROLES = [
    'super_admin',
    'dept_transport',
    'dept_distribution',
    'dept_maintenance',
    'dept_onboarding',
    'customer'
  ];
  if (!ALLOWED_ROLES.includes(role)) {
    return s.status(400).json({ error: 'Invalid role. Role must be one of: ' + ALLOWED_ROLES.join(', ') });
  }

  // Require matching department for dept_* roles
  const DEPT_ROLE_MAP = {
    dept_transport: 'transport',
    dept_distribution: 'distribution',
    dept_maintenance: 'maintenance',
    dept_onboarding: 'onboarding'
  };
  if (role.startsWith('dept_')) {
    const expectedDept = DEPT_ROLE_MAP[role];
    if (department !== expectedDept) {
      return s.status(400).json({ error: `Role "${role}" requires matching department "${expectedDept}".` });
    }
  }

  if (password.length < 10) {
    return s.status(400).json({ error: 'Password must be at least 10 characters' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE lower(username)=? OR lower(email)=?').get(username, email);
  if (existing) {
    return s.status(400).json({ error: 'Username or email already exists' });
  }

  const id = 'USR-' + crypto.randomUUID();
  const passwordHash = hashPassword(password);
  const now = Date.now();

  db.prepare(`
    INSERT INTO users (id, username, email, password_hash, full_name, phone, role, department, customer_type, company_name, status, created, session_version, email_verified)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, '', '', 'active', ?, 1, 1)
  `).run(id, username, email, passwordHash, fullName, phone, role, department, now);

  logAdminAction('Create User', id, `Created user ${username} with role ${role}`, q.session.username);
  s.status(201).json({ ok: 1, id });
});

app.delete('/api/admin/users/:id', requireRole(['super_admin']), (q, s) => {
  const id = clip(q.params.id, 60);
  if (id === q.session.id) {
    return s.status(400).json({ error: 'Cannot delete your own account' });
  }
  const targetUser = db.prepare('SELECT role FROM users WHERE id=?').get(id);
  if (!targetUser) {
    return s.status(404).json({ error: 'User not found' });
  }
  if (targetUser.role === 'super_admin') {
    const superAdminCount = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role='super_admin' AND status='active'").get().c;
    if (superAdminCount <= 1) {
      return s.status(400).json({ error: 'Cannot delete the only remaining active super administrator account' });
    }
  }
  db.prepare('DELETE FROM users WHERE id=?').run(id);
  logAdminAction('Delete User', id, `Deleted user ${id}`, q.session.username);
  s.json({ ok: 1 });
});

// ==========================================
// DEDICATED PAGE ROUTING FOR DEPARTMENTS
// ==========================================
app.get(['/', '/home'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get(['/sea', '/freight-sea', '/maritime'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'sea.html')));
app.get(['/air', '/freight-air', '/aviation'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'air.html')));
app.get(['/transport', '/travel', '/car', '/cars', '/fleet'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'transport.html')));
app.get(['/subscription', '/subscriptions', '/retainer'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'subscription.html')));
app.get(['/order', '/booking', '/bookings'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'order.html')));
app.get(['/distribution', '/cargo'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'distribution.html')));
app.get('/maintenance', (q, s) => s.sendFile(path.join(__dirname, 'public', 'maintenance.html')));
app.get('/onboarding', (q, s) => s.sendFile(path.join(__dirname, 'public', 'onboarding.html')));
app.get(['/portal', '/customer'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'customer.html')));
app.get('/admin', (q, s) => s.sendFile(path.join(__dirname, 'public', 'admin.html')));
app.get('/track', (q, s) => s.sendFile(path.join(__dirname, 'public', 'index.html')));

app.get(['/privacy', '/privacy-policy'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get(['/terms', '/terms-of-service'], (q, s) => s.sendFile(path.join(__dirname, 'public', 'terms.html')));
app.get('/404', (q, s) => s.status(404).sendFile(path.join(__dirname, 'public', '404.html')));

// ==========================================
// PWA & PROGRESSIVE WEB APP INFRASTRUCTURE
// ==========================================
app.get('/sw.js', (q, s) => {
  s.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  s.setHeader('Service-Worker-Allowed', '/');
  s.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  s.sendFile(path.join(__dirname, 'public', 'sw.js'));
});

app.get(['/manifest.webmanifest', '/manifest.json'], (q, s) => {
  s.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  s.sendFile(path.join(__dirname, 'public', 'manifest.webmanifest'));
});

app.get('/.well-known/assetlinks.json', (q, s) => {
  const pkg = process.env.ANDROID_PACKAGE;
  const sha = process.env.ANDROID_SHA256;
  if (!pkg || !sha) {
    return s.status(404).json({ error: 'Android assetlinks not configured' });
  }
  const fingerprints = sha.split(',').map(f => f.trim()).filter(Boolean);
  const assetlinks = [
    {
      relation: [
        'delegate_permission/common.handle_all_urls',
        'delegate_permission/common.get_login_creds'
      ],
      target: {
        namespace: 'android_app',
        package_name: pkg.trim(),
        sha256_cert_fingerprints: fingerprints
      }
    }
  ];
  s.setHeader('Content-Type', 'application/json; charset=utf-8');
  s.json(assetlinks);
});

app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    if (filePath && filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

// 404 handler for unknown routes
app.use((q, s) => {
  if (q.path.startsWith('/api/')) {
    return s.status(404).json({ error: 'Endpoint not found' });
  }
  s.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
});
app.use((e, q, s, n) => {
  console.error('SERVER UNCAUGHT ERROR:', e);
  s.status(400).json({ error: e.message || 'bad request' });
});

let server;
if (require.main === module) {
  server = app.listen(PORT, () => console.log('ASIL running on http://localhost:' + PORT));
}

function gracefulShutdown(signal) {
  console.log(`\nReceived ${signal}. Starting graceful shutdown...`);
  if (server) {
    server.close(() => {
      console.log('HTTP server closed.');
      try {
        db.close();
        console.log('SQLite database connection closed.');
      } catch (e) {
        console.error('Error closing database:', e.message);
      }
      process.exit(0);
    });
    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 5000).unref();
  } else {
    try { db.close(); } catch (_) { }
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = { app, db, get server() { return server; } };
