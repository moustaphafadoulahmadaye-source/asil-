const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'server.js');
let code = fs.readFileSync(serverFile, 'utf8');

const startMarker = "// Admin: Statistics & Overview (Legacy & Unified)";
const endMarker = "// Admin Fleet: Vehicles";

const startPos = code.indexOf(startMarker);
const endPos = code.indexOf(endMarker);

if (startPos === -1 || endPos === -1) {
  console.error('Markers not found!');
  process.exit(1);
}

const newBlock = `// Admin: Statistics & Overview (Legacy & Unified)
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
  const rows = db.prepare(\`
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
  \`).all();
  s.json({ ok: 1, customers: rows });
});

// Admin: Individual Customers Directory
app.get('/api/admin/customers/individual', requireRole(['super_admin']), (q, s) => {
  // Query registered individual users first
  const regUsers = db.prepare(\`
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
  \`).all();

  // Also include unregistered historical bookings
  const guestBookings = db.prepare(\`
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
  \`).all();

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
  const regCorps = db.prepare(\`
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
  \`).all();

  // Also include unregistered historical bookings
  const guestCorps = db.prepare(\`
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
  \`).all();

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

    topPages = db.prepare(\`
      SELECT path, COUNT(*) as views, COUNT(DISTINCT visitor_hash) as visitors
      FROM page_views
      GROUP BY path
      ORDER BY views DESC
      LIMIT 10
    \`).all();
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
    return '"' + String(v).replace(/"/g, '""').replace(/\\r?\\n/g, ' ') + '"';
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
  s.setHeader('Content-Disposition', \`attachment; filename="asil-orders-\${new Date().toISOString().slice(0, 10)}.csv"\`);
  s.send(csv.join('\\r\\n'));
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
  s.setHeader('Content-Disposition', \`attachment; filename="asil-shipments-\${new Date().toISOString().slice(0, 10)}.csv"\`);
  s.send(csv.join('\\r\\n'));
});

app.get('/api/admin/export/customers.csv', requireRole(['super_admin']), (q, s) => {
  const rows = db.prepare(\`
    SELECT u.id, u.username, u.full_name, u.company_name, u.customer_type, u.email, u.phone, u.status, u.created,
           COUNT(b.id) as total_bookings
    FROM users u
    LEFT JOIN bookings b ON (b.user_id = u.id OR (b.email = u.email AND u.email != ''))
    WHERE u.role = 'customer'
    GROUP BY u.id
    ORDER BY u.created DESC
  \`).all();
  const headers = ['Customer ID', 'Username', 'Full Name', 'Company Name', 'Customer Type', 'Email', 'Phone', 'Account Status', 'Registration Date', 'Total Orders'];
  const csv = [headers.join(',')];
  for (const r of rows) {
    csv.push(toCsvRow([
      r.id, r.username, r.full_name, r.company_name || '', r.customer_type || 'individual',
      r.email, r.phone, r.status, new Date(r.created).toISOString(), r.total_bookings
    ]));
  }
  s.setHeader('Content-Type', 'text/csv; charset=utf-8');
  s.setHeader('Content-Disposition', \`attachment; filename="asil-customers-\${new Date().toISOString().slice(0, 10)}.csv"\`);
  s.send(csv.join('\\r\\n'));
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
  s.setHeader('Content-Disposition', \`attachment; filename="asil-inquiries-\${new Date().toISOString().slice(0, 10)}.csv"\`);
  s.send(csv.join('\\r\\n'));
});

`;

code = code.slice(0, startPos) + newBlock + code.slice(endPos);
fs.writeFileSync(serverFile, code, 'utf8');
console.log('Successfully updated admin statistics, customers, analytics and export endpoints in server.js!');
