# ASIL Logistics - Complete App Stores & PWA Installation Guide

This definitive guide covers everything needed to distribute **ASIL Logistics**:
1. **Instant Web Installation (PWA)** - No app store account required.
2. **Google Play Store (Android TWA)** - Official Google Trusted Web Activity with Bubblewrap.
3. **Apple App Store (iOS Capacitor)** - Native container passing Apple's Guideline §4.2 (Minimum Functionality).
4. **Action Checklist** - What has been prepared in the code vs. what you must do yourself.

---

## 1. PWA Installation (Ready Out-of-the-Box)

The web application is already fully compliant with the latest Progressive Web App standards (Chromium, Safari, Edge, Firefox).

### Key PWA Assets Configured
- **Web App Manifest**: [manifest.webmanifest](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/manifest.webmanifest) and [manifest.json](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/manifest.json) configured with `id`, `name`, `short_name`, `theme_color`, `background_color`, `display: standalone`, shortcuts, and rich desktop & mobile screenshots.
- **Service Worker**: [sw.js](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/sw.js) caches core UI assets, the self-hosted Inter font ([inter.woff2](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/fonts/inter.woff2)), and falls back to a branded offline screen when disconnected.
- **Offline Fallback Page**: [offline.html](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/offline.html) with CSP-compliant retry mechanism ([offline.js](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/js/offline.js)) that automatically reloads when internet connectivity returns.
- **Install Triggers**:
  - **Automatic Prompt Card**: Appears automatically after 4 seconds on mobile browsers.
  - **On-Demand Install Buttons**: Any element with `data-pwa-install` (e.g. in the footer and mobile menu) invokes the native install dialog directly.
  - **iOS Safari Guide**: Prompts iPhone/iPad users with step-by-step instructions (*"Tap Share $\rightarrow$ Add to Home Screen"*).
- **Icon Suite**: Pre-generated and placed in [public/img/icons/](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/img/icons/):
  - `icon-192.png`: 192x192 PNG (Standard Android launcher)
  - `icon-512.png`: 512x512 PNG (High-density Android launcher)
  - `icon-maskable-512.png`: 512x512 PNG (Adaptive Android icons)
  - `apple-touch-icon.png`: 180x180 PNG (iOS home screen)
  - `favicon-32.png`: 32x32 PNG (Browser tab)
  - `store-icon-1024.png`: 1024x1024 PNG (App Store / Play Store marketing)

---

## 2. Google Play Store (Android TWA via Bubblewrap)

Google officially distributes PWAs using **Trusted Web Activities (TWA)**. This wraps your HTTPS website into an official Android App Bundle (`.aab`) with **zero browser URL bar** and native Play Store updates.

### Accounts & Fees Required
- **Google Play Console Account**: One-time **$25 USD** registration fee at [play.google.com/console](https://play.google.com/console).
- Requires a Google Account and verification with government ID or business registration.

### Pre-Configured Files Provided
- [android/twa-manifest.json](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/android/twa-manifest.json): Pre-configured with package name `com.asillogistics.app`, colors (`#0e3b43` / `#071f24`), shortcuts, and manifest bindings.
- [android/README.md](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/android/README.md): Detailed CLI commands.
- `GET /.well-known/assetlinks.json`: Pre-built dynamic route in [server.js](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/server.js) that reads `ANDROID_PACKAGE` and `ANDROID_SHA256` from `.env`.

### Step-by-Step Build Instructions (What You Must Do)

1. **Deploy to your production HTTPS domain**:
   - Ensure `https://your-domain.sd` is live with valid SSL.

2. **Generate your Android Release Keystore**:
   Open a terminal in the `android/` directory and run:
   ```bash
   keytool -genkeypair -v -keystore android.keystore -alias asillogistics -keyalg RSA -keysize 2048 -validity 10000
   ```
   *(Keep this keystore file and its password in a secure, backed-up location!)*

3. **Extract your SHA-256 Certificate Fingerprint**:
   ```bash
   keytool -list -v -keystore android.keystore -alias asillogistics
   ```
   Copy the `SHA256:` fingerprint (format: `14:6D:E9:...`).

4. **Connect Digital Asset Links on your Server**:
   Add these values to your production `.env`:
   ```env
   ANDROID_PACKAGE=com.asillogistics.app
   ANDROID_SHA256=14:6D:E9:...
   ```
   Restart the server and visit `https://your-domain.sd/.well-known/assetlinks.json`. Confirm it returns HTTP 200 with your package and fingerprint.

5. **Build the Android App Bundle (.aab)**:
   In the `android/` folder, run:
   ```bash
   npx @bubblewrap/cli build
   ```
   Bubblewrap will generate `app-release-bundle.aab`.

6. **Upload to Google Play Console**:
   - Create app: **ASIL Logistics** (Category: *Business / Logistics*).
   - Upload `app-release-bundle.aab` to Production or Closed Testing track.
   - Provide Store Listing assets:
     - **App Icon**: 512x512 PNG ([store-icon-1024.png](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/img/icons/store-icon-1024.png) scaled to 512x512).
     - **Feature Graphic**: 1024x500 PNG.
     - **Phone Screenshots**: 1080x2400 (or 1080x1920) - minimum 2, recommend 4+.
     - **7" & 10" Tablet Screenshots**: 1200x1920 and 1920x1200.
     - **Privacy Policy URL**: `https://your-domain.sd/privacy`.
     - **Data Safety Form**: Declare that customer name, phone, email, and shipment details are collected over encrypted HTTPS for account operations.

---

## 3. Apple App Store (iOS via Capacitor)

Apple requires native compilation and strictly enforces **App Store Review Guideline §4.2: Minimum Functionality**. Pure web links or basic wrappers without device-level capabilities are rejected.

### Accounts & Fees Required
- **Apple Developer Program**: **$99 USD / year** at [developer.apple.com](https://developer.apple.com).
- A Mac computer running macOS Sonoma or Sequoia with **Xcode 15+** installed.

### Pre-Configured Files Provided
- [capacitor.config.json](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/capacitor.config.json): Pre-configured with app ID `com.asillogistics.app`, app name `ASIL Logistics`, status bar styling, and splash screen delays.
- [assets/icon.png](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/assets/icon.png): 1024x1024 master icon for automated iOS asset generation.
- [assets/splash.png](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/assets/splash.png): Master splash screen for iOS launch screens.
- [ios/APPLE-GUIDELINES.md](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/ios/APPLE-GUIDELINES.md): Complete guide on passing Apple review.

### How ASIL Logistics Passes Apple Guideline §4.2

| Criterion | Implementation in ASIL Logistics |
|---|---|
| **Camera & Hardware Integration** | Direct camera capture for cargo manifests, waybills, and condition photos via `@capacitor/camera` (`NSCameraUsageDescription`). |
| **Offline Resilience** | Built-in Service Worker and native cache guarantee that the app never displays a blank white screen or Safari connection error. |
| **Push Notifications** | Real-time APNs notifications for booking confirmations and journey milestones via `@capacitor/push-notifications`. |
| **Native Ergonomics** | Status bar styled in deep-teal (`#0e3b43`), fixed bottom tab bar navigation (`Home`, `Book`, `Cargo`, `Track`, `Account`), and no browser chrome. |
| **Reviewer Credentials** | Demo credentials provided in App Store Connect review notes (`customer_ali` / `customer123`). |

### Step-by-Step Build Instructions (What You Must Do)

1. **On your Mac**, clone or copy the project and run:
   ```bash
   cd asil-logistics
   npm install @capacitor/core @capacitor/ios @capacitor/splash-screen @capacitor/status-bar @capacitor/camera @capacitor/push-notifications
   npx cap add ios
   ```

2. **Generate Native iOS App Icons & Splash Screens**:
   ```bash
   npx @capacitor/assets generate --ios
   ```
   This automatically populates all required sizes inside `ios/App/App/Assets.xcassets`.

3. **Sync Web Assets & Plugins**:
   ```bash
   npx cap sync ios
   ```

4. **Open in Xcode**:
   ```bash
   npx cap open ios
   ```
   - In Xcode, select the **App** target $\rightarrow$ **Signing & Capabilities**.
   - Select your **Apple Developer Team**.
   - Ensure the Bundle Identifier is `com.asillogistics.app`.
   - In `Info.plist`, ensure camera descriptions are present:
     - `NSCameraUsageDescription`: *"ASIL Logistics requires camera access to photograph cargo manifests, package conditions, and proof of delivery waybills."*
     - `NSPhotoLibraryUsageDescription`: *"ASIL Logistics allows you to attach shipment waybills and consignment documentation from your photo library."*

5. **Archive & Upload to App Store Connect**:
   - In Xcode menu, select **Product** $\rightarrow$ **Destination** $\rightarrow$ **Any iOS Device (arm64)**.
   - Select **Product** $\rightarrow$ **Archive**.
   - When the Organizer opens, click **Distribute App** $\rightarrow$ **App Store Connect** $\rightarrow$ **Upload**.

6. **Submit for Review in App Store Connect**:
   - **Privacy Policy URL**: `https://your-domain.sd/privacy`
   - **Support URL**: `https://your-domain.sd/#contact`
   - **Marketing URL**: `https://your-domain.sd`
   - **Sign-In Required**: Yes (Username: `customer_ali`, Password: `customer123`)
   - **Reviewer Notes**: Mention that the app integrates camera capture for waybill manifests, APNs push alerts for dispatch milestones, and offline manifest caching for highway transit corridors.

---

## 4. Screenshot Sizes Reference

Store review teams require specific aspect ratios for product pages:

### Google Play Store
| Device Type | Required Dimensions | Format | Notes |
|---|---|---|---|
| **Phone** | `1080 x 2400` or `1080 x 1920` | PNG / JPEG (24-bit) | Min 2, Max 8 screenshots |
| **7-Inch Tablet** | `1200 x 1920` | PNG / JPEG | Min 1 screenshot |
| **10-Inch Tablet** | `1920 x 1200` or `1600 x 2560` | PNG / JPEG | Min 1 screenshot |
| **App Icon** | `512 x 512` | 32-bit PNG (up to 1MB) | Square, no alpha transparency |
| **Feature Graphic** | `1024 x 500` | 24-bit PNG / JPEG | Landscape banner |

### Apple App Store
| Device Screen | Required Dimensions | Required / Optional |
|---|---|---|
| **6.7" Super Retina XDR** (iPhone 15 Pro Max, 14 Pro Max) | `1290 x 2796` or `2796 x 1290` | **Mandatory** |
| **6.5" Super Retina** (iPhone 11 Pro Max, XS Max) | `1242 x 2688` or `2688 x 1242` | **Mandatory** |
| **5.5" Retina** (iPhone 8 Plus, 7 Plus) | `1242 x 2208` or `2208 x 1242` | Optional (recommended) |
| **12.9" iPad Pro (6th Gen)** | `2048 x 2732` or `2732 x 2048` | Mandatory if iPad supported |

> [!TIP]
> Use Xcode Simulator to capture pixel-perfect iOS screenshots: Run the app on the required simulator (e.g. *iPhone 15 Pro Max*), press `Cmd + S` in the Simulator, and upload the captured screenshot directly to App Store Connect.

---

## 5. Summary Checklist: What Has Been Done vs. What You Must Do

### Already Completed & Prepared in Your Repository
- [x] **PWA Manifest & Icons**: Validated `manifest.webmanifest`, `manifest.json`, and all icon resolutions (192, 512, maskable, apple-touch, 1024).
- [x] **Service Worker**: Cache-first for core assets, network-first for pages, pre-cached `/fonts/inter.woff2`, and offline fallback.
- [x] **Offline Page**: Branded [offline.html](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/public/offline.html) with CSP-compliant reconnection script.
- [x] **Install Prompt Triggers**: Auto-card prompt, iOS tip, and global `[data-pwa-install]` button in the footer.
- [x] **Digital Asset Links Route**: `GET /.well-known/assetlinks.json` active and wired to `.env`.
- [x] **Android TWA Config**: [android/twa-manifest.json](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/android/twa-manifest.json) configured for Bubblewrap build.
- [x] **Capacitor Config**: [capacitor.config.json](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/capacitor.config.json) configured for iOS packaging.
- [x] **App Assets**: 1024x1024 master icon and splash prepared in `assets/`.
- [x] **Apple Review Notes & Guidance**: [ios/APPLE-GUIDELINES.md](file:///c:/Users/Moustapha/Downloads/asil-logistics-project/asil-logistics/ios/APPLE-GUIDELINES.md) created.

### What You Must Do Yourself
1. **Purchase Store Accounts**:
   - Google Play Developer Console ($25 one-time).
   - Apple Developer Program ($99/year).
2. **Deploy Website to HTTPS Domain**:
   - Deploy ASIL Logistics to your persistent server with SSL (e.g. `https://asillogistics.sd`).
3. **Generate Android Keystore & Set .env**:
   - Run `keytool` to create `android.keystore`, extract SHA-256 fingerprint, and add `ANDROID_PACKAGE` and `ANDROID_SHA256` to `.env`.
4. **Compile Builds**:
   - Android: Run `npx @bubblewrap/cli build` in `android/` to get `app-release-bundle.aab`.
   - iOS: Run `npx cap sync ios` and archive in Xcode on a Mac.
5. **Upload & Submit on Store Consoles**:
   - Upload `.aab` to Google Play Console and Xcode Archive to App Store Connect.
   - Fill in store descriptions, upload screenshots, set Privacy Policy URL (`/privacy`), and paste the provided demo credentials (`customer_ali` / `customer123`).
