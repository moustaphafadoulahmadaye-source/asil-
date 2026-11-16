const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const htmlFiles = [
  'index.html',
  'transport.html',
  'distribution.html',
  'maintenance.html',
  'onboarding.html',
  'customer.html',
  'admin.html',
  'privacy.html',
  'terms.html',
  '404.html'
];

const pwaHeadSnippet = `  <meta name="theme-color" content="#0e3b43">
  <meta name="mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-title" content="ASIL">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="manifest" href="/manifest.webmanifest">
  <link rel="apple-touch-icon" href="/img/icons/apple-touch-icon.png">
  <link rel="icon" type="image/png" sizes="32x32" href="/img/icons/favicon-32.png">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap" rel="stylesheet">`;

const lastHeadSnippet = `  <link rel="stylesheet" href="/css/asil-app.css?v=1.0">
  <script src="/js/pwa.js" defer></script>`;

for (const file of htmlFiles) {
  const filePath = path.join(publicDir, file);
  if (!fs.existsSync(filePath)) {
    console.warn(`File not found: ${filePath}`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf8');

  // 1. Update viewport to include viewport-fit=cover
  content = content.replace(
    /<meta\s+name=["']viewport["']\s+content=["']([^"']+)["']\s*\/?>/i,
    (match, val) => {
      if (val.includes('viewport-fit=cover')) return match;
      return `<meta name="viewport" content="${val}, viewport-fit=cover">`;
    }
  );

  // 2. Add PWA meta & font snippet if not already present
  if (!content.includes('manifest.webmanifest')) {
    // Insert after the icon links or after og tags
    if (content.includes('<link rel="alternate icon"')) {
      content = content.replace(
        /(<link rel="alternate icon"[^>]*>)/i,
        `$1\n${pwaHeadSnippet}`
      );
    } else if (content.includes('<link rel="icon"')) {
      content = content.replace(
        /(<link rel="icon"[^>]*>)/i,
        `$1\n${pwaHeadSnippet}`
      );
    } else {
      content = content.replace(
        /(<head[^>]*>)/i,
        `$1\n${pwaHeadSnippet}`
      );
    }
  }

  // 3. Add asil-app.css and pwa.js right before </head>
  if (!content.includes('asil-app.css')) {
    content = content.replace(
      /<\/head>/i,
      `${lastHeadSnippet}\n</head>`
    );
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
