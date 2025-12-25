# OSGHub VTU Mobile App

This is a Flutter project that wraps the [OSGHub VTU website](https://osghubvtu.onrender.com) into a native mobile application for Android and iOS.

## Project Overview

- **Framework:** Flutter
- **Core Package:** `webview_flutter`
- **Features:**
  - Full-screen WebView integration
  - Native Splash Screen
  - Offline/No-Internet handling
  - Deep Linking (Open `https://osghubvtu.onrender.com` links directly in the app)
  - Native Navigation (Back button handling)
  - Loading Indicators
  - Brand Theme Integration

## Prerequisites

- [Flutter SDK](https://docs.flutter.dev/get-started/install) installed and configured.
- **Android:** Android Studio and Android SDK.
- **iOS:** Xcode (Mac only) and CocoaPods (`sudo gem install cocoapods`).

## Getting Started

1. **Navigate to the project directory:**
   ```bash
   cd mobile/webview_app
   ```

2. **Install Dependencies:**
   ```bash
   flutter pub get
   ```

3. **Run the App:**
   - Connect a device or start an emulator.
   - Run:
     ```bash
     flutter run
     ```

## Configuration

### Changing the Website URL
To change the website URL that the app loads:
1. Open `lib/main.dart`.
2. Find the line:
   ```dart
   ..loadRequest(Uri.parse('https://osghubvtu.onrender.com'));
   ```
3. Update the URL to your new address.
4. Also update the Deep Link domain in `android/app/src/main/AndroidManifest.xml`:
   ```xml
   <data android:scheme="https" android:host="osghubvtu.onrender.com" />
   ```
5. And for iOS in `ios/Runner/Runner.entitlements`:
   ```xml
   <string>applinks:osghubvtu.onrender.com</string>
   ```

### Updating App Icon and Splash Screen
The app uses `flutter_launcher_icons` (not currently installed but recommended for updates) or manual asset replacement.
- **Logo Asset:** Located at `assets/logo.png`.
- **Splash Screen:** Configured using `flutter_native_splash`. To update:
  1. Replace `assets/logo.png`.
  2. Run:
     ```bash
     dart run flutter_native_splash:create
     ```

## Building for Release

### Android (APK & App Bundle)
To build the APK for direct installation:
```bash
flutter build apk --release
```
Output: `build/app/outputs/flutter-apk/app-release.apk`

To build the App Bundle (.aab) for Google Play Store:
```bash
flutter build appbundle --release
```
Output: `build/app/outputs/bundle/release/app-release.aab`

**Note:** You can also use the included script `build_android.bat` on Windows.

### iOS (IPA)
**Note:** Building for iOS requires a macOS machine with Xcode.
1. Navigate to the iOS folder and install pods:
   ```bash
   cd ios
   pod install
   cd ..
   ```
2. Build the IPA:
   ```bash
   flutter build ipa --release
   ```
3. Open `ios/Runner.xcworkspace` in Xcode to configure signing and upload to the App Store.

## App Store Compliance Notes

- **Permissions:** The `AndroidManifest.xml` includes the `INTERNET` permission. If you add features like file uploads or geolocation, you must add the respective permissions.
- **Privacy Policy:** Ensure your website has a visible Privacy Policy and Terms of Service. Apple and Google require these to be accessible.
- **Deep Linking:** Deep linking is configured. For it to work fully (App Links/Universal Links), you must also host a `assetlinks.json` (Android) and `apple-app-site-association` (iOS) file on your website server (`.well-known` directory).

## Troubleshooting

- **White Screen on Load:** Ensure the device has internet access. The app attempts to reload if connection fails.
- **Build Errors:** Run `flutter clean` and `flutter pub get` to reset the project cache.
