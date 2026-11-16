const http = require('http');

function req(path, cookie) {
  return new Promise((resolve, reject) => {
    const opts = {
      hostname: 'localhost',
      port: 3000,
      path,
      method: 'GET',
      headers: cookie ? { 'Cookie': cookie } : {}
    };
    http.get(opts, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, data, headers: res.headers });
      });
    }).on('error', reject);
  });
}

function login() {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username: 'admin', password: 'admin123' });
    const req = http.request({
      hostname: 'localhost',
      port: 3000,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        const cookie = res.headers['set-cookie'] ? res.headers['set-cookie'][0].split(';')[0] : '';
        resolve(cookie);
      });
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function run() {
  const cookie = await login();
  console.log('Logged in with cookie:', cookie ? 'YES' : 'NO');

  const stats = await req('/api/admin/stats', cookie);
  console.log('Stats status:', stats.status);
  const parsedStats = JSON.parse(stats.data);
  console.log('Customer Stats:', parsedStats.customerStats);
  console.log('Inquiry Stats:', parsedStats.inquiryStats);
  console.log('Order Stats:', parsedStats.orderStats);
  console.log('Shipment Stats:', parsedStats.shipmentStats);
  console.log('Fleet Stats:', parsedStats.fleetStats);
  console.log('Visitor Stats:', parsedStats.visitorStats);

  const custs = await req('/api/admin/customers', cookie);
  console.log('\nCustomers API status:', custs.status);
  const parsedCusts = JSON.parse(custs.data);
  console.log('Customers count:', parsedCusts.customers.length);
  console.log('Sample customer:', parsedCusts.customers[0]);

  const analytics = await req('/api/admin/analytics', cookie);
  console.log('\nAnalytics API status:', analytics.status);
  console.log('Analytics data:', JSON.parse(analytics.data));

  const exportOrders = await req('/api/admin/export/orders.csv', cookie);
  console.log('\nExport Orders CSV status:', exportOrders.status, 'Content-Type:', exportOrders.headers['content-type']);
  console.log('First 2 lines of CSV:\n' + exportOrders.data.split('\r\n').slice(0, 2).join('\n'));
}

run().catch(console.error);
