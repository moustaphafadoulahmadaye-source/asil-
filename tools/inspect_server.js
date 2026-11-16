const fs = require('fs');
const content = fs.readFileSync('asil-logistics/server.js', 'utf8');

const regex = /app\.(get|post|put|delete|patch)\(['"]([^'"]+)['"]/g;
const endpoints = [];
let match;
while ((match = regex.exec(content)) !== null) {
  endpoints.push(`${match[1].toUpperCase()} ${match[2]}`);
}

console.log('Total endpoints:', endpoints.length);
console.log(endpoints.join('\n'));
