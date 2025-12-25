@echo off
echo Building Android App...
call flutter clean
call flutter pub get

echo Generating Launcher Icons...
call dart run flutter_launcher_icons

echo Generating Splash Screen...
call dart run flutter_native_splash:create

echo Building APK (for testing)...
call flutter build apk --release

echo Building App Bundle (for Play Store)...
call flutter build appbundle --release

echo =======================================================
echo Build complete!
echo APK: build\app\outputs\flutter-apk\app-release.apk
echo Bundle: build\app\outputs\bundle\release\app-release.aab
echo =======================================================
pause
