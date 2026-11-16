const fs = require('fs');

function inspectFile(file) {
  const content = fs.readFileSync(file, 'utf8');
  console.log('=== ' + file + ' ===');
  const forms = content.match(/<form[^>]*>/gi) || [];
  console.log('Forms:', forms);
  const buttons = content.match(/<button[^>]*>/gi) || [];
  console.log('Buttons count:', buttons.length);
}

inspectFile('asil-logistics/public/index.html');
inspectFile('asil-logistics/public/order.html');
inspectFile('asil-logistics/public/customer.html');
inspectFile('asil-logistics/public/transport.html');
inspectFile('asil-logistics/public/distribution.html');
