# ASIL Logistics - Google Play Trusted Web Activity (TWA) Package

This directory contains the configuration and build instructions for packaging ASIL Logistics as an Android Trusted Web Activity (TWA) using Google's official **Bubblewrap CLI** (`@bubblewrap/cli`).

---

## Prerequisites

1. **Node.js 18+** installed.
2. **Java Development Kit (JDK 17 or JDK 21)** installed and `JAVA_HOME` configured.
3. **Android SDK Command-Line Tools** (Bubblewrap can automatically install these if prompted).

---

## Step 1: Generate Android Signing Keystore

Run the following command inside this directory to create your production signing keystore:

```bash
keytool -genkeypair -v -keystore android.keystore -alias asillogistics -keyalg RSA -keysize 2048 -validity 10000
```

> [!CAUTION]
> **Store `android.keystore` and your keystore password safely.**
> If lost, you cannot update your app on Google Play. Keep an encrypted backup in a secure vault.

---

## Step 2: Extract SHA-256 Fingerprint for Digital Asset Links

To verify your domain ownership with Android and remove the browser URL bar:

```bash
keytool -list -v -keystore android.keystore -alias asillogistics
```

Locate the `Certificate fingerprints:` section and copy the **SHA256:** line (e.g. `14:6D:E9:01:23:45:...`).

Add this fingerprint and your package ID to your server's `.env` file:

```env
ANDROID_PACKAGE=com.asillogistics.app
ANDROID_SHA256=14:6D:E9:01:23:45:...
```

Restart your ASIL Logistics web server and verify that:
`https://your-domain.sd/.well-known/assetlinks.json` returns HTTP 200 with the matching package and fingerprint.

---

## Step 3: Build Android App Bundle (.aab) with Bubblewrap

Run Bubblewrap build:

```bash
npx @bubblewrap/cli build
```

Bubblewrap will read `twa-manifest.json`, verify your online web manifest and `assetlinks.json`, compile the Android project using Gradle, sign it with `android.keystore`, and produce:

- `app-release-bundle.aab`: The production Android App Bundle to upload to Google Play Console.
- `app-release-signed.apk`: A signed APK suitable for direct side-loading on test devices.

---

## Step 4: Upload to Google Play Console

1. Log in to [Google Play Console](https://play.google.com/console).
2. Select your app: **ASIL Logistics**.
3. Under **Production** $\rightarrow$ **Create new release**:
   - Upload `app-release-bundle.aab`.
   - Enter release notes (e.g. *"Initial release of ASIL Logistics - passenger travel booking, freight tracking, and facility management."*).
4. Complete the **Store Listing**:
   - **App Name**: ASIL Logistics
   - **Short Description**: Premier passenger transport, heavy cargo freight, and facility logistics across Sudan.
   - **Full Description**: ASIL Logistics provides reliable transport, freight haulage, procurement, and facility maintenance across Sudan with real-time consignment tracking.
   - **App Icon**: `public/img/icons/store-icon-1024.png` (512x512 or 1024x1024 PNG).
   - **Feature Graphic**: 1024x500 banner (can be generated from `public/img/hero-logistics.jpg`).
   - **Phone Screenshots**: 4+ screenshots from `public/img/screenshot-mobile.png`.
   - **Tablet Screenshots**: 7-inch and 10-inch screenshots from `public/img/screenshot-desktop.png`.
   - **Privacy Policy URL**: `https://your-domain.sd/privacy`.
5. Under **App Content / Data Safety**:
   - Select that the app collects name, phone, email, and cargo documents for account management and transport fulfillment over secure encrypted HTTPS connections.
