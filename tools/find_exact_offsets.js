const fs = require('fs');
const code = fs.readFileSync('asil-logistics/server.js', 'utf8');

const startMarker = "// Admin: Statistics & Overview (Legacy & Unified)";
const endMarker = "// Admin Fleet: Vehicles";

const startPos = code.indexOf(startMarker);
const endPos = code.indexOf(endMarker);

console.log('startPos:', startPos, 'endPos:', endPos);
console.log('Length:', endPos - startPos);
