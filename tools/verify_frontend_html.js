const http = require('http');

const PORT = process.env.PORT || 3000;

function fetchUrl(pathname) {
  return new Promise((resolve, reject) => {
    http.get(`http://localhost:${PORT}${pathname}`, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, html: data }));
    }).on('error', reject);
  });
}

async function verify() {
  console.log('=== VERIFYING FRONTEND HTML, SEO & BRANDING ACROSS ALL PAGES ===\n');

  const pageChecks = [
    {
      url: '/',
      name: 'Home Page & Universal Tracker',
      patterns: [
        'ASIL Logistics',
        '/img/logo.svg',
        'favicon.svg',
        'quickTrackInput',
        'lookupQuickTrack',
        'site-footer',
        '/transport',
        '/distribution'
      ]
    },
    {
      url: '/transport',
      name: 'Transport & Fleet Department Page',
      patterns: [
        'Passenger Transportation',
        'passenger-form',
        'handlePassengerSubmit',
        'vehiclePreference',
        'fullName',
        'phone',
        '/img/logo.svg'
      ]
    },
    {
      url: '/distribution',
      name: 'Distribution & Freight Cargo Department Page',
      patterns: [
        'Cargo',
        'cargo-form',
        'handleCargoSubmit',
        'cargoDesc',
        'specialHandling',
        'pickupLocation',
        'deliveryDestination',
        '/img/logo.svg'
      ]
    },
    {
      url: '/sea',
      name: 'Maritime & Port Sudan Sea Freight Page',
      patterns: [
        'Port Sudan Sea Logistics',
        'seaQuoteForm',
        'btnSubmitSeaQuote',
        '/img/logo.svg',
        '/js/sea.js'
      ]
    },
    {
      url: '/air',
      name: 'Air Freight & Aviation Cargo Page',
      patterns: [
        'Aviation Cargo',
        'airQuoteForm',
        'btnSubmitAirQuote',
        '/img/logo.svg',
        '/js/air.js'
      ]
    },
    {
      url: '/subscription',
      name: 'Corporate Subscriptions & Logistics Retainers Page',
      patterns: [
        'Logistics Retainers',
        'subscriptionForm',
        'btnSubmitSub',
        '/img/logo.svg',
        '/js/subscription.js'
      ]
    },
    {
      url: '/maintenance',
      name: 'Building Maintenance Department Page',
      patterns: [
        'Building Maintenance',
        'maint-form',
        'handleMaintSubmit',
        'buildingName',
        'serviceType',
        'description',
        '/img/logo.svg'
      ]
    },
    {
      url: '/onboarding',
      name: 'Client Onboarding Page',
      patterns: [
        'Client Onboarding',
        'onboardingForm',
        'submitOnboarding',
        'customerType',
        'companyName',
        'email',
        '/img/logo.svg'
      ]
    },
    {
      url: '/portal',
      name: 'Customer Portal & Login Page',
      patterns: [
        'Customer Portal',
        'customerLoginForm',
        'customerRegisterForm',
        'handleCustomerLogin',
        'handleCustomerRegister',
        '/img/logo.svg'
      ]
    },
    {
      url: '/admin',
      name: 'Administrator Management Console',
      patterns: [
        'Operations Command',
        'adminSignInForm',
        'submitAdminLogin',
        '/img/logo.svg'
      ]
    },
    {
      url: '/privacy',
      name: 'Privacy Policy Page',
      patterns: [
        'Privacy Policy',
        'ASIL Logistics',
        'site-footer',
        '/img/logo.svg'
      ]
    },
    {
      url: '/terms',
      name: 'Terms of Service Page',
      patterns: [
        'Terms of Service',
        'ASIL Logistics',
        'site-footer',
        '/img/logo.svg'
      ]
    }
  ];

  let passed = 0;
  let totalChecks = 0;

  for (const page of pageChecks) {
    const res = await fetchUrl(page.url);
    if (res.status !== 200) {
      console.error(`✕ [FAIL] ${page.name} (${page.url}) returned HTTP ${res.status}`);
      process.exit(1);
    }
    console.log(`✓ [PASS] ${page.name} responded HTTP 200 (${res.html.length} bytes)`);

    for (const pat of page.patterns) {
      totalChecks++;
      if (res.html.includes(pat)) {
        passed++;
      } else {
        console.error(`  ✕ Pattern missing in ${page.url}: "${pat}"`);
      }
    }
  }

  console.log(`\n=== FRONTEND VERIFICATION COMPLETE: ${passed}/${totalChecks} assertions passed ===`);
  if (passed !== totalChecks) {
    process.exit(1);
  }
}

verify().catch(err => {
  console.error('Fatal verification error:', err);
  process.exit(1);
});
