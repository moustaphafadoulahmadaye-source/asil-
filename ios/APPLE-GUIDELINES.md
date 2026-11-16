# ASIL Logistics - Apple App Store Preparation & Guideline §4.2 Compliance

This document details how to package ASIL Logistics for iOS using **Capacitor** and outlines the exact criteria required to pass Apple App Store review, specifically complying with **App Review Guideline 4.2: Minimum Functionality**.

---

## 1. Prerequisites for iOS Publishing

1. **Apple Developer Program Account**:
   - $99/year membership at [developer.apple.com](https://developer.apple.com).
   - An Organization or Individual account.
2. **Mac Computer running macOS Sonoma or Sequoia**:
   - Xcode 15+ or 16+ installed via the Mac App Store.
   - Command Line Tools installed (`xcode-select --install`).
   - CocoaPods installed (`sudo gem install cocoapods` or Homebrew).

---

## 2. Setting Up Capacitor iOS

From the `asil-logistics` project directory on your Mac:

```bash
# 1. Install Capacitor core and iOS dependencies
npm install @capacitor/core @capacitor/ios @capacitor/splash-screen @capacitor/status-bar @capacitor/push-notifications @capacitor/camera

# 2. Add the native iOS platform project
npx cap add ios

# 3. Generate all required iOS App Icons and Launch Screens automatically
npx @capacitor/assets generate --ios

# 4. Sync configuration and public web assets to the native Xcode project
npx cap sync ios

# 5. Open the project in Xcode
npx cap open ios
```

---

## 3. Passing Apple Guideline §4.2: "Minimum Functionality"

> [!IMPORTANT]
> **Why Apple Rejects Web Wrappers:**
> Guideline 4.2 states: *"Your app should include features, content, and UI that elevate it beyond a repackaged website. If your app is not particularly useful, unique, or 'app-like,' it doesn't belong on the App Store."*
>
> To ensure guaranteed approval and prevent a "wrapper rejection", ASIL Logistics integrates the following native capabilities:

### Pillar 1: Native Hardware Camera & Document Intake
- **Feature**: Direct device camera capture for physical waybills, driver licenses, and cargo inspection photos.
- **In-App Implementation**: Uses `@capacitor/camera` to invoke native camera viewfinders instead of generic desktop file pickers.
- **Info.plist Requirement**: Add descriptive permission strings:
  ```xml
  <key>NSCameraUsageDescription</key>
  <string>ASIL Logistics requires camera access to photograph cargo manifests, package conditions, and proof of delivery waybills.</string>
  <key>NSPhotoLibraryUsageDescription</key>
  <string>ASIL Logistics allows you to attach shipment waybills and consignment documentation from your photo library.</string>
  ```

### Pillar 2: Offline Resilience & Graceful Fallback
- **Feature**: Pre-cached app shell and instant branded offline screen (`offline.html`).
- **In-App Implementation**: When transit network drops in rural or cross-state transit corridors, the app does not show a blank white screen or Safari connection error. It preserves cached waybills, offline tracking references, and auto-reconnects when cellular signal returns.

### Pillar 3: Native App Shell & UI Ergonomics
- **Feature**: Elimination of browser navigation artifacts.
- **In-App Implementation**:
  - No browser URL bar, refresh button, or Safari bottom toolbar.
  - Native iOS Status Bar (`@capacitor/status-bar`) styled in brand deep-teal (`#0e3b43`) with white text.
  - Native bottom tab bar (`.mobile-tab-bar`) with haptic touch feel.
  - Standalone splash screen (`assets/splash.png`) with smooth fade-out.

### Pillar 4: Push Notifications & Live Milestone Alerts
- **Feature**: Real-time push updates for journey milestones.
- **In-App Implementation**: Uses `@capacitor/push-notifications` (APNs) so passengers and freight consignors receive instant notification when a vehicle is assigned, cargo departs the hub, or arrival is confirmed.

---

## 4. App Store Connect Review Preparation

When submitting your build for review in App Store Connect:

### A. Provide Working Demo Credentials (CRITICAL)
Apple reviewers **will reject your app** if they cannot log in and test account management:
- **Sign-In Required**: Check "Yes"
- **Username / Email**: `customer_ali`
- **Password**: `customer123`
- **Role**: Verified Corporate & Individual Account

### B. App Review Notes (Copy & Paste)
Include this note in the "Notes for Reviewer" field:
```text
ASIL Logistics is an enterprise transportation, freight cargo distribution, and facility management platform operating across Sudan.

Native Integrations:
1. Camera Integration (NSCameraUsageDescription): Users capture real-time waybill manifests and cargo inspection photos during shipment intake.
2. Push Notifications: Real-time APNs alerts for booking confirmations, vehicle dispatches, and milestone updates.
3. Offline Availability: Full offline caching via Service Worker and native storage ensuring logistics manifests are readable during inter-state highway transit with intermittent network.
4. Demo account provided above allows immediate testing of tracking, transport reservations, and consignment manifests.
```

### C. Required Screenshot Sizes for App Store Connect
Upload high-resolution screenshots (can be captured from Simulator or device):
- **6.7" iPhone Display** (iPhone 15 Pro Max / 14 Pro Max): `1290 x 2796` pixels.
- **6.5" iPhone Display** (iPhone 11 Pro Max / XS Max): `1242 x 2688` pixels.
- **5.5" iPhone Display** (iPhone 8 Plus): `1242 x 2208` pixels.
- **12.9" iPad Pro Display** (6th generation): `2048 x 2732` pixels.

### D. Privacy Policy & Support URLs
- **Privacy Policy URL**: `https://your-domain.sd/privacy`
- **Support URL**: `https://your-domain.sd/#contact`
- **Marketing URL**: `https://your-domain.sd`
