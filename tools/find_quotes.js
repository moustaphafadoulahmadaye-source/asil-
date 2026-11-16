const fs = require('fs');
const html = fs.readFileSync('asil-logistics/public/index.html', 'utf8');

const matches = [];
const lines = html.split('\n');
lines.forEach((l, idx) => {
  if (/quote|quotation|quoteForm/i.test(l)) {
    matches.push(`${idx + 1}: ${l.trim()}`);
  }
});
console.log('Matches for quote in index.html:\n' + matches.join('\n'));
