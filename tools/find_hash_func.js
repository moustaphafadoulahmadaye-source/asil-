const fs = require('fs');
const lines = fs.readFileSync('asil-logistics/server.js', 'utf8').split('\n');

const hashIdx = lines.findIndex(l => l.includes('function verifyPasswordAgainstHash') || l.includes('verifyPasswordAgainstHash ='));
console.log('verifyPasswordAgainstHash at line:', hashIdx + 1);
if (hashIdx !== -1) {
  console.log(lines.slice(hashIdx - 5, hashIdx + 30).join('\n'));
}
