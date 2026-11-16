# ASIL Logistics - Enterprise Transport & Freight Operations Platform

A complete, production-ready logistics operations system for **ASIL Logistics & Transportation Services Co. Ltd.** Built with Node.js, Express, and high-performance SQLite (`better-sqlite3` in WAL mode). Features role-based access control (RBAC), multi-department workflows, real-time cargo and passenger tracking, encrypted session cookies, scrypt password hashing, and zero external frontend build dependencies.

---

## Table of Contents
1. [Core Operations Lifecycle (Install, Create Admin, Start, Backup, Deploy)](#core-operations-lifecycle)
2. [Local Quickstart](#local-quickstart)
3. [Departmental Pages & URLs](#departmental-pages--urls)
4. [User Roles & RBAC Matrix](#user-roles--rbac-matrix)
5. [Environment Variables Reference](#environment-variables-reference)
6. [First Super Administrator Provisioning](#first-super-administrator-provisioning)
7. [Safe Online Database Backups](#safe-online-database-backups)
8. [Reset Demo Data (Local Copy Only)](#reset-demo-data-local-copy-only)
9. [Automated Test Suite](#automated-test-suite)
10. [Production Deployment Guide](#production-deployment-guide)
11. [Health Monitoring & Graceful Shutdown](#health-monitoring--graceful-shutdown)
12. [Company Branding & Contact Information](#company-branding--contact-information)

---

## Core Operations Lifecycle

| Phase | Command | Description |
| :--- | :--- | :--- |
| **1. Install** | `npm install` | Installs backend dependencies (`better-sqlite3`, `express`, `express-rate-limit`, `multer`). |
| **2. Create Admin** | `npm run create-admin` | Provisions the first Super Administrator account interactively (min 10-char password, scrypt hashed). |
| **3. Start** | `npm start` (or `npm run dev`) | Starts Express HTTP server on the configured `PORT` (default 3000). |
| **4. Backup** | `npm run backup` | Takes a zero-downtime online SQLite snapshot into `./backups/` and auto-prunes older snapshots. |
| **5. Deploy** | Step-by-step production run | Set `NODE_ENV=production`, mount persistent volumes for `./asil.db` and `./uploads_private`, generate secret, and supervise with PM2. |
| *Demo Reset* | `npm run reset-demo` | Deletes bookings, test accounts, and uploaded documents on local machines (blocked in production). |

---

## Overview & Architecture

- **Backend**: Node.js (v18+) with Express 4, native `crypto.scrypt` hashing with constant-time equality comparisons (`crypto.timingSafeEqual`).
- **Database**: Single-file SQLite database via `better-sqlite3` operating with Write-Ahead Logging (`PRAGMA journal_mode = WAL`) for concurrent read/write throughput.
- **Frontend**: Responsive vanilla HTML5, CSS3, and modern JavaScript modules. No bulky Webpack/Vite bundlers or transpilation required; fully rendered and served directly from `./public`.
- **Security**:
  - Role-Based Access Control (RBAC) enforced on every API route and administrative operation.
  - Strict Content-Type enforcement (`application/json` or `multipart/form-data`) blocking cross-site request forgery (CSRF).
  - Rate limiting on authentication (`/api/auth/*`), booking intakes, and public tracking.
  - Secure uploads validation (whitelisted MIME types, extensions, magic bytes check, stored in private `./uploads_private` folder outside web root, served only to authenticated staff or owning customer).
  - Public booking tracker with privacy sanitization (names masked, phone, email, and internal administrative notes stripped).

---

## Departmental Pages & URLs

Every business unit in ASIL Logistics has a dedicated URL and tailored dashboard:

| URL Path | Department / Purpose | Functionality & Key Capabilities |
| :--- | :--- | :--- |
| `/` or `/home` | **Home Page** | Company introduction, service overview, quick tracking widget, inquiry form, WhatsApp click-to-chat. |
| `/transport` | **Transport & Fleet** | Passenger transportation requests (individual & corporate VIP), fleet vehicle selector, driver assignments. |
| `/distribution` | **Distribution & Cargo** | Freight cargo consignments, package dimensions/weight, multi-document dropzone, special handling requirements. |
| `/maintenance` | **Building Maintenance** | Facility asset registry (headquarters, marine port, warehouses), work order logging, technician allocation. |
| `/onboarding` | **Client Onboarding** | Corporate and individual client registration, commercial registration, KYC document compliance review. |
| `/portal` or `/customer` | **Customer Portal** | Self-service client authentication, real-time booking history, shipment progress tracker, account settings. |
| `/admin` | **Central Operations** | Executive control room: overview KPIs, dispatch approval/rejection, fleet CRUD, driver CRUD, audit logs, reports. |
| `/track` | **Consignment Tracking** | Public live telematics tracker by reference (e.g. `TR-001`, `CR-001`). |
| `/privacy` | **Privacy Policy** | Official data governance and client record protection framework. |
| `/terms` | **Terms of Service** | Terms and conditions governing passenger journeys and freight carriage. |
| `/404` | **Custom 404** | Branded not-found error page with direct navigation fallback links. |

---

## User Roles & RBAC Matrix

Authentication uses signed, tamper-proof `HttpOnly; SameSite=Lax` cookies (`asil=...`) encoding `userId`, `role`, and `department`:

| Role Key | Name | Privileges & Access Scope |
| :--- | :--- | :--- |
| `super_admin` | **Super Administrator** | Universal administrative access: view/modify all bookings, fleet vehicles, certified drivers, system audit logs, user management, and settings. |
| `dept_transport` | **Transport Officer** | Manage passenger transportation, allocate executive vehicles and chauffeurs, update journey status. |
| `dept_distribution` | **Freight Manager** | Manage cargo linehaul, allocate heavy flatbeds/reefers, inspect consignment documents, update shipping milestones. |
| `dept_maintenance` | **Facilities Chief** | Manage physical property assets, schedule preventative maintenance, assign certified technicians. |
| `dept_onboarding` | **KYC & Client Relations** | Review new client onboarding requests, verify commercial tax registrations and corporate licenses. |
| `customer` | **Client Account** | Access private customer portal (`/portal`), view personal/corporate booking history and tracking telemetry. |

---

## Local Quickstart

### 1. Prerequisites
- **Node.js**: Version 18.0.0 or higher.
- **npm**: Version 8.0.0 or higher.

### 2. Installation
Clone or navigate to the project directory, then install dependencies:
```bash
cd asil-logistics
npm install
```

### 3. Environment Configuration
Copy the sample environment file:
```bash
# On Linux/macOS
cp .env.example .env

# On Windows (PowerShell)
Copy-Item .env.example .env
```

### 4. Create Your Initial Super Administrator
Run the interactive CLI tool:
```bash
npm run create-admin
```
Follow the prompts to enter your username, email, full name, and a secure password ($\ge 10$ characters).

*(Alternatively, run non-interactively via flags:)*
```bash
npm run create-admin -- --username admin --email admin@asillogistics.sd --password "YourStrongPassword2026!" --name "Chief Operations Officer"
```

### 5. Start the Application
For development:
```bash
npm run dev
```

For standard execution:
```bash
npm start
```
Visit **http://localhost:3000** in your web browser. Access the admin dashboard at **http://localhost:3000/admin**.

---

## Environment Variables Reference

Configure these in `.env` (or via your cloud hosting provider's dashboard):

| Variable | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `PORT` | Number | `3000` | Port on which the HTTP server listens. |
| `NODE_ENV` | String | `development` | Set to `production` when deployed live behind HTTPS. |
| `SESSION_SECRET` | String | *Dev fallback* | **Required in production.** Secret key (min 32 characters) used to sign session cookies with HMAC-SHA256. |
| `DB_PATH` / `DB_FILE`| String | `./asil.db` | Absolute or relative path to the SQLite database file. Useful for persistent mount volumes. |
| `SEED_DEMO` | Boolean | `false` | When set to `true`, pre-populates sample fleet vehicles and certified drivers. Keep `false` in production. |

---

## First Super Administrator Provisioning

Hardcoded `"admin"` accounts and fallback passwords have been completely removed. The first administrative account must be provisioned using the dedicated CLI tool:

```bash
npm run create-admin
```

- **Password Policy**: Passwords must be at least **10 characters** long.
- **Hashing**: Derived using `crypto.scrypt` with a cryptographically secure 16-byte salt, stored in the format `scrypt$salt$hash`.
- **Database Target**: Automatically targets `process.env.DB_PATH` or `./asil.db`.

---

## Safe Online Database Backups

The project includes a native online backup utility using the SQLite Backup API (`db.backup`):

```bash
npm run backup
```

### Key Backup Features:
1. **Zero Downtime**: Takes a non-blocking snapshot even while transactions are occurring in WAL mode.
2. **Timestamped Files**: Backups are written to `./backups/asil-backup-YYYY-MM-DD_HH-mm-ss.db`.
3. **Automated Pruning**: Automatically retains the **14 most recent backups** and removes older snapshots to conserve disk space.

### Production Automated Cron Example
To run automated daily backups at 02:00 AM on a Linux server:
```cron
0 2 * * * cd /opt/asil-logistics && /usr/bin/npm run backup >> /var/log/asil-backup.log 2>&1
```

---

## Reset Demo Data (Local Copy Only)

To clean up all local demo bookings, test user accounts, workflow audit records, and sample file uploads:

```bash
npm run reset-demo
```

### Safety Features:
- **Environment Protection**: Strictly prohibited if `NODE_ENV=production`. Attempting to run this in production exits immediately with an error.
- **Data Cleanup**: Purges bookings, demo workflow entries, test accounts (`deploy_admin`, `officer_samira_*`, `customer_ali`, `customer_nile`), vacuums SQLite database, and cleans `./uploads_private/`.

---

## Automated Test Suite

All tests execute in an isolated environment against a temporary SQLite database and do not mutate production data:

```bash
npm test
```

### Verification Suites Included:
1. **Complete Platform Audit (`test_complete_platform.js`)**: 25 tests covering all 12 core scenarios, authentication, approval/rejection workflows, fleet allocation, file uploads, tamper resistance, SQL injection immunity, CSRF protection, and concurrency benchmarks.
2. **All Departments & Routing (`test_all_departments.js`)**: Verifies dedicated HTTP 200 responses across all department URLs and RBAC permission barriers.
3. **Department APIs & RBAC (`test_departments_api.js`)**: Comprehensive matrix audit ensuring department staff cannot cross-access unauthorized records.
4. **Customer Tracking Portal (`test_tracking_portal.js`)**: Public reference lookups, input sanitization, and strict privacy protection (masked client identity, hidden internal notes).
5. **Cargo & Freight Consignment (`test_cargo_full.js`)**: Multi-part document intake, special handling constraints, weight/dimension validation, and freight dispatch.
6. **Admin Operations & Fleet (`test_admin_endpoints.js`)**: Operational metrics, vehicle dispatch, driver rosters, quarterly analytics, and audit logging.
7. **Admin Views Console (`test_admin_views_full.js`)**: 39-step verification of all 10 administrative console sections and password update security.
8. **Frontend HTML & SEO (`verify_frontend_html.js`)**: Viewport tags, Open Graph meta tags, SVG logos, favicons, and semantic structure.
9. **Frontend Views Simulation (`verify_frontend_views.js`)**: Node.js VM sandbox validation of client-side configuration and dynamic rendering.

---

## Production Deployment Guide

### Deployment Checklist
- [x] Host runs Node.js 18+ (e.g. Render, Railway, DigitalOcean, AWS, Fly.io, Ubuntu VPS).
- [x] Persistent disk mounted for `asil.db` and `./uploads_private`.
- [x] Environment variable `NODE_ENV=production` configured.
- [x] Environment variable `SESSION_SECRET` set to a strong random 32+ character string.
- [x] SSL/TLS HTTPS certificate enabled (via Cloudflare, Let's Encrypt, Caddy, or cloud reverse proxy).
- [x] Run `npm run create-admin` to provision production administrator credentials.
- [x] Configure daily automated backup schedule (`npm run backup`).

### Persistent Storage Configuration
Because SQLite operates from a local file, cloud hosts that use ephemeral filesystems (e.g., Render, Railway, Fly.io) **must have a persistent disk volume attached**.
1. Mount a persistent volume at e.g. `/data`.
2. Configure `.env`:
   ```env
   DB_PATH=/data/asil.db
   NODE_ENV=production
   SESSION_SECRET=your-random-production-session-secret-at-least-32-chars
   PORT=3000
   ```

### Reverse Proxy Configuration (Nginx Example)
```nginx
server {
    listen 80;
    server_name logistics.asillogistics.sd;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name logistics.asillogistics.sd;

    ssl_certificate /etc/letsencrypt/live/logistics.asillogistics.sd/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/logistics.asillogistics.sd/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Process Management with PM2
To ensure automatic restarts and cluster supervision:
```bash
npm install -g pm2
pm2 start server.js --name "asil-logistics"
pm2 save
pm2 startup
```

---

## Health Monitoring & Graceful Shutdown

### Health Check Endpoint
- **URL**: `GET /api/health`
- **Response**: Status `200 OK`
```json
{
  "status": "ok",
  "uptime": 86420,
  "timestamp": "2026-11-14T05:00:00.000Z",
  "database": "connected",
  "version": "1.0.0"
}
```
If the database connection fails or becomes locked, the endpoint returns status `503 Service Unavailable`. Use this endpoint for container liveness/readiness probes and external uptime monitors.

### Graceful Shutdown
The application listens for `SIGTERM` and `SIGINT` signals (sent by Docker, Kubernetes, systemd, or PM2 on shutdown/restart):
1. Stops accepting new incoming HTTP connections (`server.close()`).
2. Waits for active inflight requests to complete.
3. Flushes Write-Ahead Log (WAL) buffers and safely closes the SQLite database connection (`db.close()`).
4. Force exits after a 5-second timeout if connections remain hung.

---

## Company Branding & Contact Information

All public contact details, phone numbers, and addresses across the entire platform are centrally controlled by a single configuration object in `public/js/asil-common.js`:

```javascript
const COMPANY = {
  name: 'ASIL Logistics',
  legalName: 'ASIL Logistics & Transportation Services Co. Ltd.',
  tagline: 'Premier Passenger Transport, Freight Distribution & Logistics Management',
  phone: '', // Real company phone number (leave empty to hide)
  email: '', // Real company email address (leave empty to hide)
  whatsapp: '', // Real WhatsApp hotline (leave empty to hide)
  address: '', // Real headquarters address (leave empty to hide)
  registration: '', // Commercial registration number (leave empty to hide)
  workingHours: '24/7 Operations Desk & Customer Support'
};
```

Any empty field is automatically identified by `isCompanyConfigured()`, preventing unconfigured or placeholder lines from appearing on public pages (empty lines are cleanly hidden).

---

## License & Support
Proprietary software developed for **ASIL Logistics & Transportation Services Co. Ltd.** All rights reserved.
