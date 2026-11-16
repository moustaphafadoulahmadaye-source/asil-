const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const statsIdx = lines.findIndex(l => l.includes("app.get('/api/admin/stats'"));
const fleetIdx = lines.findIndex(l => l.includes("// Admin Fleet: Vehicles"));

console.log('Stats starts at line:', statsIdx + 1);
console.log('Fleet starts at line:', fleetIdx + 1);
console.log('Lines count to replace:', fleetIdx - statsIdx);
